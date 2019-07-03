import cron from 'node-cron';

require('./init');

const winston = require('winston');
const async = require('async');
const uuid4 = require('uuid/v4');
const mongo = require('./mongo')();
const models = require('./models');
const config = require('./config');
const dhis = require('./dhis')();
const fhir = require('./fhir')();

const topOrgId = config.getConf('mCSD:fakeOrgId');
const topOrgName = config.getConf('mCSD:fakeOrgName');

function getCrontime(callback) {
  mongo.getGeneralConfig((err, resData) => {
    if (err) {
      winston.error(err);
      return callback();
    }
    const data = JSON.parse(JSON.stringify(resData));
    if (data) {
      if (data.config.generalConfig.datasetsAutosyncTime) {
        callback(data.config.generalConfig.datasetsAutosyncTime);
      } else {
        return callback();
      }
    } else {
      return callback();
    }
  });
}

getCrontime((time) => {
  if (!time) {
    time = '*/15 * * * *';
  }
  cron.schedule(time, () => {
    models.DataSourcesModel.find({}, (err, data) => {
      const dataSources = JSON.parse(JSON.stringify(data));
      async.eachSeries(dataSources, (dtSrc, nxtDtSrc) => {
        if (dtSrc.enableAutosync && dtSrc.source === 'syncServer') {
          const {
            name,
            host,
            username,
            password,
          } = dtSrc;
          password = mongo.decrypt(password);
          const sourceOwner = dtSrc.userID._id;
          const clientId = uuid4();
          if (dtSrc.sourceType === 'DHIS2') {
            dhis.sync(
              host,
              username,
              password,
              name,
              sourceOwner,
              clientId,
              topOrgId,
              topOrgName,
              false,
              false,
              false,
              false,
            );
          } else if (dtSrc.sourceType === 'FHIR') {
            fhir.sync(
              host,
              username,
              password,
              'update',
              name,
              sourceOwner,
              clientId,
              topOrgId,
              topOrgName,
            );
          }
        }
      });
    });
  });
});
