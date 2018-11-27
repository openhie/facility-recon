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
    sync(host, username, password, mode, name, userID, clientId) {
      const fhirSyncRequestId = `fhirSyncRequest${clientId}`;
      const fhirSyncRequest = JSON.stringify({
        status: '1/2 - Loading all data from the FHIR Server specified',
        error: null,
        percent: null,
      });
      redisClient.set(fhirSyncRequestId, fhirSyncRequest);

      const database = mixin.toTitleCase(name) + userID
      let saveBundle = {
            id: uuid4(),
            resourceType: 'Bundle',
            type: 'batch',
            entry: []
          }
      this.getLastUpdate(database,(lastUpdated) => {
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
            async.each(locations.entry, (entry, nxtEntry) => {
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
    getLastUpdate(database,callback) {
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
        models.MetaDataSchema.findOne({}, (err, data) => {
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
    models.MetaDataSchema.findOne({}, (err, data) => {
      if (!data) {
        const MetaData = new models.MetaDataSchema({
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
        models.MetaDataSchema.findByIdAndUpdate(data.id, {
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