require('./init')
const request = require('request')
const URI = require('urijs')
const uuid4 = require('uuid/v4')
const async = require('async')
const winston = require('winston')
const redis = require('redis')
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || '127.0.0.1'
});
const moment = require('moment')
const mongoose = require('mongoose')
const mcsd = require('./mcsd')()
const mixin = require('./mixin')()
const models = require('./models')
const config = require('./config')

module.exports = function () {
  return {
    sync(host, username, password, mode, name, sourceOwner, clientId, topOrgId, topOrgName) {
      const fhirSyncRequestId = `fhirSyncRequest${clientId}`;
      const fhirSyncRequest = JSON.stringify({
        status: '1/2 - Loading all data from the FHIR Server specified',
        error: null,
        percent: null,
      });
      redisClient.set(fhirSyncRequestId, fhirSyncRequest);

      const database = mixin.toTitleCase(name) + sourceOwner
      let saveBundle = {
        id: uuid4(),
        resourceType: 'Bundle',
        type: 'batch',
        entry: []
      }
      this.getLastUpdate(database, (lastUpdated) => {
        let url
        let baseURL = URI(host).segment('Location').segment('_history').toString()
        if (mode === 'update') {
          url = baseURL + '?_since=' + lastUpdated
        } else {
          url = baseURL
        }

        lastUpdated = moment().format("YYYY-MM-DDTHH:mm:ss")
        var auth = "Basic " + new Buffer(username + ":" + password).toString("base64");
        let locations = {
          entry: []
        }
        async.doWhilst(
          (callback) => {
            var options = {
              url: url,
              headers: {
                Authorization: auth
              }
            }
            url = false
            request.get(options, (err, res, body) => {
              try {
                body = JSON.parse(body)
              } catch (error) {
                winston.error(error)
                return callback(false, false)
              }
              locations.entry = locations.entry.concat(body.entry)
              const next = body.link.find(link => link.relation == 'next')
              if (next) {
                url = next.url
              }
              return callback(false, url)
            })
          },
          () => url != false,
          () => {
            let countSaved = 0;
            let totalRows = locations.entry.length
            let count = 0

            //adding the fake orgid as the top orgid
            let fhir = {
              resourceType: 'Location',
              id: topOrgId,
              status: 'active',
              mode: 'instance',
            };
            fhir.identifier = [{
              system: 'https://digitalhealth.intrahealth.org/source1',
              value: topOrgId,
            }, ];
            fhir.physicalType = {
              coding: [{
                system: 'http://hl7.org/fhir/location-physical-type',
                code: 'jdn',
                display: 'Jurisdiction',
              }],
              text: 'Jurisdiction',
            };
            const url = URI(config.getConf('mCSD:url')).segment(database)
              .segment('fhir')
              .segment('Location')
              .segment(fhir.id)
              .toString();
            const options = {
              url: url.toString(),
              headers: {
                'Content-Type': 'application/fhir+json',
              },
              json: fhir,
            };
            request.put(options, (err, res, body) => {
              if (err) {
                winston.error("An error occured while saving the top org of hierarchy, this will cause issues with reconciliation")
              }
            })
            async.each(locations.entry, (entry, nxtEntry) => {
              if (!entry.resource.hasOwnProperty('partOf') || !entry.resource.partOf.reference) {
                entry.resource.partOf = {
                  reference: `Location/${topOrgId}`,
                  display: topOrgName
                }
              }
              count++
              saveBundle.entry.push(entry)
              if (saveBundle.entry.length >= 250 || totalRows === count) {
                const tmpBundle = {
                  ...saveBundle
                }
                saveBundle = {
                  id: uuid4(),
                  resourceType: 'Bundle',
                  type: 'batch',
                  entry: []
                }
                mcsd.saveLocations(tmpBundle, database, () => {
                  countSaved += tmpBundle.entry.length
                  const percent = parseFloat((countSaved * 100 / totalRows).toFixed(2));
                  const fhirSyncRequest = JSON.stringify({
                    status: '2/2 Writing Data Into Server',
                    error: null,
                    percent,
                  });
                  redisClient.set(fhirSyncRequestId, fhirSyncRequest);
                  return nxtEntry()
                })
              } else {
                return nxtEntry()
              }
            }, () => {
              winston.info('Done syncing FHIR Server ' + host)
              setLastUpdated(lastUpdated, database)
              const fhirSyncRequest = JSON.stringify({
                status: 'Done',
                error: null,
                percent: 100,
              });
              redisClient.set(fhirSyncRequestId, fhirSyncRequest);
            })
          }
        )
      })
    },
    getLastUpdate(database, callback) {
      const mongoUser = config.getConf("DB_USER")
      const mongoPasswd = config.getConf("DB_PASSWORD")
      const mongoHost = config.getConf("DB_HOST")
      const mongoPort = config.getConf("DB_PORT")
      if (mongoUser && mongoPasswd) {
        var uri = `mongodb://${mongoUser}:${mongoPasswd}@${mongoHost}:${mongoPort}/${database}`;
      } else {
        var uri = `mongodb://${mongoHost}:${mongoPort}/${database}`;
      }
      mongoose.connect(uri);
      let db = mongoose.connection
      db.on("error", console.error.bind(console, "connection error:"))
      db.once("open", () => {
        models.MetaDataModel.findOne({}, (err, data) => {
          if (data && data.lastUpdated) {
            return callback(data.lastUpdated)
          } else {
            winston.info("Last updated details not found for " + database)
            return callback(false)
          }
        })
      })
    }
  }
}

function setLastUpdated(lastUpdated, database) {
  const mongoUser = config.getConf("DB_USER")
  const mongoPasswd = config.getConf("DB_PASSWORD")
  const mongoHost = config.getConf("DB_HOST")
  const mongoPort = config.getConf("DB_PORT")
  if (mongoUser && mongoPasswd) {
    var uri = `mongodb://${mongoUser}:${mongoPasswd}@${mongoHost}:${mongoPort}/${database}`;
  } else {
    var uri = `mongodb://${mongoHost}:${mongoPort}/${database}`;
  }
  mongoose.connect(uri)
  let db = mongoose.connection
  db.on("error", console.error.bind(console, "connection error:"))
  db.once("open", function callback() {
    models.MetaDataModel.findOne({}, (err, data) => {
      if (!data) {
        const MetaData = new models.MetaDataModel({
          lastUpdated: lastUpdated
        });
        MetaData.save((err, data) => {
          if (err) {
            winston.error(err)
            winston.error("Failed to add lastUpdated")
          } else {
            winston.info("Last Updated time added successfully")
          }
        })
      } else {
        models.MetaDataModel.findByIdAndUpdate(data.id, {
          lastUpdated: lastUpdated
        }, (err, data) => {
          if (err) {
            winston.error(err)
            winston.error("Failed to update lastUpdated")
          } else {
            winston.info("Last Updated time for " + database + " updated successfully to " + lastUpdated)
          }
        })
      }
    })
  })
}