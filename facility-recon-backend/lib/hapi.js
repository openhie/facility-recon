/* eslint-disable no-use-before-define */
/* eslint-disable no-shadow */
require('./init');
const {
  Pool,
} = require('pg');
const fs = require('fs');
const os = require('os');
const {
  exec,
} = require('child_process');
const request = require('request');
const URI = require('urijs');
const xml2js = require('xml2js');
const url = require('url');
const PropertiesReader = require('properties-reader');
const async = require('async');
const winston = require('winston');
const config = require('./config');

const pgUser = config.getConf('pg:user');
const pgPassword = config.getConf('pg:password');

const pool = new Pool({
  user: pgUser,
  password: pgPassword,
  database: 'testingdb1',
  host: 'localhost',
  port: 5432,
});
const tomcatDir = config.getConf('hapi:tomcatPath');

function createServer(database, callback) {
  const hapiUser = config.getConf('hapi:DBUser');
  const hapiPassword = config.getConf('hapi:DBPassword');
  const createUserQuesry = `DO $$
    BEGIN
      create user ${hapiUser} with encrypted password '${hapiPassword}';
      EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'not creating role ${hapiUser} -- it already exists';
    END
    $$`;
  const grantUserPerm = `grant all privileges on database ${database} to ${hapiUser}`;

  async.series({
    createDB: (callback) => {
      winston.info(`Creating DB ${database}`);
      pool.query(`drop database IF EXISTS ${database}`, (err, response) => {
        if (err) {
          winston.warn(err);
        }
        pool.query(`create database ${database}`, (err, response) => {
          if (err) {
            winston.error(err);
            return callback(err);
          }
          return callback(null, response);
        });
      });
    },
    createUser: (callback) => {
      winston.info(`Creating user ${hapiUser} if not exist`);
      pool.query(createUserQuesry, (err, response) => {
        if (err) {
          winston.error(err);
          return callback(err);
        }
        return callback(null, response);
      });
    },
    grantPermission: (callback) => {
      winston.info(`Grant permission user ${hapiUser} to database ${database}`);
      pool.query(grantUserPerm, (err, response) => {
        if (err) {
          winston.error(err);
          return callback(err);
        }
        return callback(null, response);
      });
    },
  }, (err, response) => {
    if (err) {
      winston.error('An error has occured while creating DB and granting user permission');
      return callback(err);
    }
    const hapiServerDir = config.getConf('hapi:serverStarterPath');
    const pomFile = `${hapiServerDir}/pom.xml`;
    const hapiPropertiesFile = `${hapiServerDir}/src/main/resources/hapi.properties`;
    async.parallel({
      writePOM: (callback) => {
        fs.readFile(pomFile, 'utf-8', (err, pomData) => {
          if (err) {
            winston.error(err);
            winston.error('An error has occured while opening pom.xml file');
            return callback(err);
          }
          const parseString = xml2js.parseString;
          parseString(pomData, (err, result) => {
            if (err) {
              winston.error(err);
              winston.error('An error has occured while parsing pmo.xml to JSON');
              return callback(err);
            }
            result.project.build[0].finalName[0] = database;
            const builder = new xml2js.Builder();
            const xml = builder.buildObject(result);

            fs.writeFile(pomFile, xml, (err, data) => {
              if (err) {
                winston.error(err);
                winston.error('An error has occured while saving pom.xml file, please check permission of the hapi repository');
                return callback(err);
              }
              winston.info('Successfully updated pom.xml file');
              return callback(null, data);
            });
          });
        });
      },
      editHAPIProperties: (callback) => {
        const properties = PropertiesReader(hapiPropertiesFile);
        let serverAddress = properties.get('server_address');
        const serverAddressObj = url.parse(serverAddress);
        serverAddress = `${serverAddressObj.protocol}//${serverAddressObj.hostname}:${serverAddressObj.port}/${database}/fhir`;
        properties.set('server_address', serverAddress);

        let datasourceURL = properties.get('datasource.url');
        const datasourceURLArr = datasourceURL.split('/');
        datasourceURLArr[datasourceURLArr.length - 1] = database;
        datasourceURL = datasourceURLArr.join('/');
        properties.set('datasource.url', datasourceURL);
        let newProperties = '';
        async.eachOfSeries(properties._properties, (prop, propKey, nxtProp) => {
          newProperties += `${propKey}=${prop}${os.EOL}`;
          return nxtProp();
        }, () => {
          fs.writeFile(hapiPropertiesFile, newProperties, (err, data) => {
            if (err) {
              winston.error(err);
              winston.error('An error has occured while saving pom.xml file, please check permission of the hapi repository');
              return callback(err);
            }
            winston.info('Successfully updated hapi.properties file');
            return callback(null, data);
          });
        });
      },
    }, (err, response) => {
      if (err) {
        winston.error(err);
        winston.error('An error has occured while editing HAPI config files');
        return callback(err);
      }
      winston.info(`Creating ${database} WAR file`);
      exec(`cd ${hapiServerDir} && mvn clean install -DskipTests`, (err, stdout, stderr) => {
        winston.info(stdout);
        if (err || stderr) {
          if (err) {
            winston.warn(err);
          }
          if (stderr) {
            winston.warn(stderr);
          }
        }
        winston.info(`Deploying ${database} WAR file into tomcat`);
        exec(`cp ${hapiServerDir}/target/${database}.war ${tomcatDir}/webapps`, (err, stdout, stderr) => {
          if (err || stderr) {
            if (err) {
              winston.error(err);
            }
            if (stderr) {
              winston.error(stderr);
            }
            winston.error('An error has occured while deploying WAR file to tomcat');
            return callback(err + stderr);
          }
          // check if tomcat has finished initializing server before returning
          const timeoutObj = setTimeout(() => {
            clearInterval(intervalObj);
            winston.error(`Deployment of ${database} is taking longer than usual, deployment cancelled`);
            return callback(true);
          }, 120000);
          const intervalObj = setInterval(() => {
            serverExist(database, (exists) => {
              if (exists) {
                clearTimeout(timeoutObj);
                clearInterval(intervalObj);
                return callback(false);
              }
            });
          }, 3000);
        });
      });
    });
  });
}

function serverExist(database, callback) {
  const url = URI(config.getConf('mCSD:url'))
    .segment(database)
    .segment('fhir')
    .segment('Location')
    .toString();
  const options = {
    url,
  };
  request.get(options, (err, res, body) => {
    winston.error(res.statusCode);
    if (res.statusCode === 404) {
      return callback(false);
    }
    return callback(true);
  });
}

function deleteServer(database, callback) {
  async.series({
    deleteWAR: (callback) => {
      winston.info(`Deleting WAR file for ${database}`);
      exec(`rm ${tomcatDir}/webapps/${database}.war && rm -r ${tomcatDir}/webapps/${database}`, (err, stderr, stdout) => {
        if (err || stderr) {
          if (err) {
            winston.error(err);
          }
          if (stderr) {
            winston.error(stderr);
          }
          winston.error('An error has occured while deleting WAR file in tomcat');
          callback(err + stderr);
        }
        winston.info(`${database}.war deleted successfully`);
        callback(null);
      });
    },
    deleteDB: (callback) => {
      winston.info(`Dropping DB ${database}`);
      pool.query(`drop database ${database}`, (err, response) => {
        if (err) {
          winston.error(err);
          return callback(err);
        }
        winston.info(`DB ${database} deleted successfully`);
        return callback(null, response);
      });
    },
  }, (err, response) => callback(err, response));
}

module.exports = {
  createServer,
  deleteServer,
};
