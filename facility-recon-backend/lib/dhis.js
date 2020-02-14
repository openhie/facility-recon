/* eslint-disable func-names */
require('./init');
const winston = require('winston');
const request = require('request');
const async = require('async');
const URI = require('urijs');
const http = require('http');
const https = require('https');
const url = require('url');
const isJSON = require('is-json');
const redis = require('redis');
const mixin = require('./mixin')();
const config = require('./config');

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || '127.0.0.1',
});

const credentials = {
  dhis2URL: '',
  username: '',
  password: '',
  name: '',
  sourceOwner: '',
};

module.exports = function () {
  return {
    sync(host, username, password, name, sourceOwner, clientId, topOrgId, topOrgName, reset, full, dousers, doservices) {
      const dhis2URL = url.parse(host);
      const auth = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
      credentials.dhis2URL = dhis2URL;
      credentials.clientId = clientId;
      credentials.auth = auth;
      credentials.name = name;
      credentials.sourceOwner = sourceOwner;
      credentials.topOrgId = topOrgId;
      credentials.topOrgName = topOrgName;

      if (reset) {
        winston.info(`Attempting to reset time on ${host}\n`);

        const req = (dhis2URL.protocol == 'https:' ? https : http).request({
          hostname: dhis2URL.hostname,
          port: dhis2URL.port,
          path: `${dhis2URL.path}api/dataStore/CSD-Loader-Last-Export/${mixin.toTitleCase(name)}`,
          headers: {
            Authorization: auth,
          },
          method: 'DELETE',
        }, (res) => {
          winston.info(`Reset request returned with code ${res.statusCode}`);
          res.on('end', () => {});
          res.on('error', (e) => {
            console.log(`ERROR: ${e.message}`);
          });
        }).end();
      } else {
        this.processMetaData(full, dousers, doservices);
      }
    },
    getLastUpdate(name, dhis2URL, auth, callback) {
      winston.info('getting lastupdated time');
      if (dhis2URL.port < 0 || dhis2URL.port >= 65536) {
        winston.error('port number is out of range');
        return callback(false);
      }
      const req = (dhis2URL.protocol == 'https:' ? https : http).request({
        hostname: dhis2URL.hostname,
        port: dhis2URL.port,
        path: `${dhis2URL.path}api/dataStore/CSD-Loader-Last-Export/${mixin.toTitleCase(name)}`,
        headers: {
          Authorization: auth,
        },
        method: 'GET',
      });
      req.on('response', (res) => {
        winston.info(`Request to get lastupdated time has responded with code ${res.statusCode}`);
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          let dataStore;
          try {
            dataStore = JSON.parse(body);
          } catch (error) {
            return callback(false);
          }
          if (!dataStore.hasOwnProperty('value')) {
            return callback(false);
          }
          return callback(dataStore.value);
        });
        res.on('error', (e) => {
          winston.error(`ERROR: ${e.message}`);
          return callback(false);
        });
      });
      req.on('error', (err) => {
        winston.error(err);
        return callback(false);
      });
      req.end();
    },
    processMetaData(full, dousers, doservices) {
      const {
        clientId,
      } = credentials;
      let dhisSyncRequestId = `dhisSyncRequest${clientId}`;
      let dhisSyncRequest = JSON.stringify({
        status: '1/2 - Loading all DHIS2 data from host',
        error: null,
        percent: null,
      });
      redisClient.set(dhisSyncRequestId, dhisSyncRequest);

      // const hasKey = true // await checkLoaderDataStore();
      /* let lastUpdate = false;
      if (!full && hasKey) {
        lastUpdate = await getLastUpdate(credentials.name, credentials.dhis2URL, credentials.auth);
        // Convert to yyyy-mm-dd format (dropping time as it is ignored by DHIS2)
        lastUpdate = new Date(Date.parse(lastUpdate)).toISOString().substr(0, 10);
      } */
      const database = credentials.name + credentials.sourceOwner;
      this.getLastUpdate(database, credentials.dhis2URL, credentials.auth, (lastUpdate) => {
        if (!full && lastUpdate) {
          lastUpdate = new Date(Date.parse(lastUpdate)).toISOString().substr(0, 10);
        }
        let uflag = 'false';
        if (dousers) {
          uflag = 'true';
        }
        let sflag = 'false';
        if (doservices) {
          sflag = 'true';
        }

        const metadataOpts = [
          'assumeTrue=false',
          'organisationUnits=true',
          'organisationUnitGroups=true',
          'organisationUnitLevels=true',
          'organisationUnitGroupSets=true',
          `categoryOptions=${sflag}`,
          `optionSets=${sflag}`,
          `dataElementGroupSets=${sflag}`,
          `categoryOptionGroupSets=${sflag}`,
          `categoryCombos=${sflag}`,
          `options=${sflag}`,
          `categoryOptionCombos=${sflag}`,
          `dataSets=${sflag}`,
          `dataElementGroups=${sflag}`,
          `dataElements=${sflag}`,
          `categoryOptionGroups=${sflag}`,
          `categories=${sflag}`,
          `users=${uflag}`,
          `userGroups=${uflag}`,
          `userRoles=${uflag}`,
        ];

        if (!full && lastUpdate) {
          metadataOpts.push(`filter=lastUpdated:gt:${lastUpdate}`);
        }
        const {
          dhis2URL,
        } = credentials;
        const {
          auth,
        } = credentials;
        winston.info(`GETTING ${dhis2URL.protocol}//${dhis2URL.hostname}:${dhis2URL.port}${dhis2URL.path}api/metadata.json?${metadataOpts.join('&')}`);
        const req = (dhis2URL.protocol == 'https:' ? https : http).request({
          hostname: dhis2URL.hostname,
          port: dhis2URL.port,
          path: `${dhis2URL.path}api/metadata.json?${metadataOpts.join('&')}`,
          headers: {
            Authorization: auth,
          },
          timeout: 300000,
          method: 'GET',
        }, (res) => {
          winston.info(`Request to get Metadata responded with code ${res.statusCode}`);
          let body = '';
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            if (!isJSON(body)) {
              winston.error(body);
              winston.error('Non JSON response received while getting DHIS2 data');
              dhisSyncRequestId = `dhisSyncRequest${clientId}`;
              dhisSyncRequest = JSON.stringify({
                status: '1/2 - Getting DHIS2 Data',
                error: `Invalid response with code ${res.statusCode} received while getting DHIS2 data,cross check the host name,username and password`,
                percent: null,
              });
              redisClient.set(dhisSyncRequestId, dhisSyncRequest);
            } else {
              let metadata;
              try {
                metadata = JSON.parse(body);
              } catch (error) {
                winston.error(error);
                winston.error(body);
                winston.error('An error occured while parsing response from DHIS2 server');
              }

              if (!metadata.hasOwnProperty('organisationUnits')) {
                winston.info('No organization unit found in metadata');
                dhisSyncRequestId = `dhisSyncRequest${clientId}`;
                dhisSyncRequest = JSON.stringify({
                  status: 'Done',
                  error: null,
                  percent: 100,
                });
                redisClient.set(dhisSyncRequestId, dhisSyncRequest);
                const thisRunTime = new Date().toISOString();
                setLastUpdate(lastUpdate, thisRunTime);
              } else {
                processOrgUnit(metadata, lastUpdate);
              }
            }
          });
          res.on('error', (e) => {
            winston.error(`ERROR: ${e.message}`);
          });
        }).end();
      });
    },
  };
};

function processOrgUnit(metadata, hasKey) {
  winston.info('Now writting org units into the database');
  const {
    name,
    clientId,
  } = credentials;

  const database = mixin.toTitleCase(name) + credentials.sourceOwner;
  let counter = 0;
  const max = metadata.organisationUnits.length;
  // adding the fake orgid as the top orgid
  const fhir = {
    resourceType: 'Location',
    id: credentials.topOrgId,
    status: 'active',
    mode: 'instance',
  };
  fhir.identifier = [{
    system: 'https://digitalhealth.intrahealth.org/source1',
    value: credentials.topOrgId,
  }];
  fhir.physicalType = {
    coding: [{
      system: 'http://hl7.org/fhir/location-physical-type',
      code: 'jdn',
      display: 'Jurisdiction',
    }],
    text: 'Jurisdiction',
  };
  let hostURL = URI(config.getConf('mCSD:url')).segment(database)
    .segment('fhir')
    .segment('Location')
    .segment(fhir.id)
    .toString();
  let options = {
    url: hostURL.toString(),
    headers: {
      'Content-Type': 'application/fhir+json',
    },
    json: fhir,
  };
  request.put(options, (err, res, body) => {
    if (err) {
      winston.error('An error occured while saving the top org of hierarchy, this will cause issues with reconciliation');
    }
  });

  let i = 0;
  async.eachSeries(metadata.organisationUnits, (org, nxtOrg) => {
    winston.info(`Processing (${++i}/${max}) ${org.id}`);
    const fhir = {
      resourceType: 'Location',
      id: org.id,
      status: 'active',
      mode: 'instance',
    };
    fhir.identifier = [{
        system: 'http://dhis2.org/code',
        value: org.code,
      },
      {
        system: 'http://dhis2.org/id',
        value: org.id,
      },
    ];
    fhir.meta = {
      lastUpdated: org.lastUpdated,
    };
    const path = org.path.split('/');
    let level;
    if (metadata.hasOwnProperty('organisationUnitLevels')) {
      level = metadata.organisationUnitLevels.find(x => x.level == path.length - 1);
    }
    if (level) {
      fhir.meta.tag = [{
        system: 'https://digitalhealth.intrahealth.org/organistionUnitLevels',
        code: level.id,
        display: level.name,
      }];
    }
    fhir.name = org.name;
    fhir.alias = [org.shortName];
    if (metadata.organisationUnits.find(x => x.parent && x.parent.id && x.parent.id == org.id)) {
      fhir.physicalType = {
        coding: [{
          system: 'http://hl7.org/fhir/location-physical-type',
          code: 'area',
          display: 'Area',
        }],
        text: 'Administrative Area',
      };
    } else {
      fhir.physicalType = {
        coding: [{
          system: 'http://hl7.org/fhir/location-physical-type',
          code: 'bu',
          display: 'Building',
        }],
        text: 'Facility',
      };
    }

    if (org.featureType == 'POINT' && org.coordinates) {
      try {
        const coords = JSON.parse(org.coordinates);
        fhir.position = {
          longitude: coords[0],
          latitude: coords[1],
        };
      } catch (e) {
        winston.error(`Failed to load coordinates. ${e.message}`);
      }
    }
    if (org.hasOwnProperty('parent') && org.parent.id) {
      fhir.partOf = {
        reference: `Location/${org.parent.id}`,
      };
    } else {
      fhir.partOf = {
        reference: `Location/${credentials.topOrgId}`,
        display: credentials.topOrgName,
      };
    }
    if (org.attributeValues) {
      for (const attr of org.attributeValues) {
        if (attr.attribute.id == 'XxZsKNpu4nB') {
          fhir.identifier.push({
            system: 'http://dhis2.org/id',
            value: attr.value,
          });
        }
        if (attr.attribute.id == 'Ed6SCy0OXfx') {
          fhir.identifier.push({
            system: 'http://dhis2.org/code',
            value: attr.value,
          });
        }
      }
    }

    hostURL = URI(config.getConf('mCSD:url')).segment(database)
      .segment('fhir')
      .segment('Location')
      .segment(fhir.id)
      .toString();
    options = {
      url: hostURL.toString(),
      headers: {
        'Content-Type': 'application/fhir+json',
      },
      json: fhir,
    };
    request.put(options, (err, res, body) => {
      counter += 1;
      const percent = parseFloat((counter * 100 / max).toFixed(2));
      let status = '2/2 - Saving DHIS2 locations into FHIR server';
      if (counter === max) {
        status = 'Done';
      }
      const dhisSyncRequestId = `dhisSyncRequest${clientId}`;
      const dhisSyncRequest = JSON.stringify({
        status,
        error: null,
        percent,
      });
      redisClient.set(dhisSyncRequestId, dhisSyncRequest);
      if (err) {
        winston.error(err);
      } else {
        winston.info(body);
      }
      return nxtOrg();
    });
  }, () => {
    const thisRunTime = new Date().toISOString();
    setLastUpdate(hasKey, thisRunTime);
  });
}

function checkLoaderDataStore() {
  const name = credentials.name;
  const dhis2URL = credentials.dhis2URL;
  const auth = credentials.auth;
  winston.info('Checking loader datastore');
  return new Promise((resolve, reject) => {
    const req = (dhis2URL.protocol == 'https:' ? https : http).request({
      hostname: dhis2URL.hostname,
      port: dhis2URL.port,
      path: `${dhis2URL.path}api/dataStore/CSD-Loader-Last-Export/${mixin.toTitleCase(name)}`,
      headers: {
        Authorization: auth,
      },
      method: 'GET',
    });
    req.on('response', (res) => {
      winston.info(`Loader datastore responded with code ${res.statusCode}`);
      if (res.statusCode == 200 || res.statusCode == 201) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
    req.on('error', (err) => {
      reject(err);
    });
    req.end();
  });
}

function setLastUpdate(hasKey, lastUpdate) {
  const {
    name,
    auth,
    dhis2URL,
  } = credentials;
  const userID = credentials.sourceOwner;
  const database = mixin.toTitleCase(name) + userID;
  winston.info('setting lastupdated time');
  const req = (dhis2URL.protocol == 'https:' ? https : http).request({
    hostname: dhis2URL.hostname,
    port: dhis2URL.port,
    path: `${dhis2URL.path}api/dataStore/CSD-Loader-Last-Export/${database}`,
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
    },
    method: (hasKey ? 'PUT' : 'POST'),
  }, (res) => {
    winston.info(`request to set lastupdated time has responded with code ${res.statusCode}`);
    if (res.statusCode == 200 || res.statusCode == 201) {
      winston.info('Last update dataStore set.');
    } else {
      winston.error('Last update dataStore FAILED.');
    }
    let body = '';
    res.on('data', (chunk) => {
      body += chunk;
    });
    res.on('end', () => {
      const dataStore = JSON.parse(body);
      winston.info(dataStore);
    });
    res.on('error', (e) => {
      winston.error(`ERROR: ${e.message}`);
    });
  });
  const payload = {
    value: lastUpdate,
  };
  req.write(JSON.stringify(payload));
  req.end();
}