require('./init');
const winston = require('winston')
const crypto = require('crypto')
const models = require('./models')

const async = require('async')
const mixin = require('./mixin')()
const config = require('./config')

const database = config.getConf('mCSD:database')
const mongoUser = config.getConf('mCSD:databaseUser')
const mongoPasswd = config.getConf('mCSD:databasePassword')
const mongoHost = config.getConf('mCSD:databaseHost')
const mongoPort = config.getConf('mCSD:databasePort')
if (mongoUser && mongoPasswd) {
  var uri = `mongodb://${mongoUser}:${mongoPasswd}@${mongoHost}:${mongoPort}/${database}`;
} else {
  var uri = `mongodb://${mongoHost}:${mongoPort}/${database}`;
}

module.exports = function () {
  return {
    addDataSource(fields, callback) {
      const mongoose = require('mongoose')
      let password = ''
      if (fields.password) {
        password = this.encrypt(fields.password)
      }
      mongoose.connect(uri);
      let db = mongoose.connection
      db.on("error", console.error.bind(console, "connection error:"))
      db.once("open", () => {
        models.DataSourcesSchema.findOne({
          host: fields.name,
        }, (err, data) => {
          if (err) {
            winston.error(err)
            winston.error('Unexpected error occured,please retry');
            return callback('Unexpected error occured,please retry', null);
          }
          if (!data) {
            const syncServer = new models.DataSourcesSchema({
              name: fields.name,
              host: fields.host,
              sourceType: fields.sourceType,
              source: fields.source,
              username: fields.username,
              password: password,
            });
            syncServer.save((err, data) => {
              if (err) {
                winston.error(err)
                winston.error('Unexpected error occured,please retry')
                return callback('Unexpected error occured,please retry', null)
              }
              return callback(false, password)

            });
          } else {
            models.DataSourcesSchema.findByIdAndUpdate(data.id, {
              name: fields.name,
              host: fields.host,
              sourceType: fields.sourceType,
              source: fields.source,
              username: fields.username,
              password: password,
            }, (err, data) => {
              if (err) {
                winston.error(err)
                winston.error('Unexpected error occured,please retry');
                return callback('Unexpected error occured,please retry');
              }
              return callback(false, password)
            });
          }
        });
      })
    },
    editDataSource(fields, callback) {
      const mongoose = require('mongoose')
      let password = this.encrypt(fields.password)
      mongoose.connect(uri);
      let db = mongoose.connection
      db.on("error", console.error.bind(console, "connection error:"))
      db.once("open", () => {
        models.DataSourcesSchema.findByIdAndUpdate(fields.id, {
          name: fields.name,
          host: fields.host,
          sourceType: fields.sourceType,
          source: fields.source,
          username: fields.username,
          password: password,
        }, (err, data) => {
          if (err) {
            winston.error(err);
            return callback('Unexpected error occured,please retry');
          }
          return callback(false, password)
        });
      })
    },

    deleteDataSource(id, name, callback) {
      let deleteDB = []
      const mongoose = require('mongoose')
      mongoose.connect(uri);
      let db = mongoose.connection
      db.on("error", console.error.bind(console, "connection error:"))
      db.once("open", () => {
        mongoose.connection.db.admin().command({listDatabases:1},(error, results) => {
          async.eachSeries(results.databases, (database,nxtDB) => {
            let dbName1 = database.name
            if (dbName1.includes(name)) {
              dbName1 = dbName1.replace(name,'')
              if (dbName1) {
                var searchName = new RegExp(["^", dbName1, "$"].join(""), "i");
                models.DataSourcesSchema.find({name: searchName}).lean().exec({}, (err,data) => {
                  if (data.hasOwnProperty(0)) {
                    let dbName2 = mixin.toTitleCase(data[0].name)
                    if (dbName1 === dbName2) {
                      deleteDB.push(database.name)
                      return nxtDB()
                      /*this.deleteDB(database.name, (error) => {
                        return nxtDB()
                      })*/
                    } else {
                      return nxtDB()
                    }
                  } else {
                    return nxtDB()
                  }
                })
              } else {
                return nxtDB()
              }
            } else {
              return nxtDB()
            }
          }, () => {
            async.eachSeries(deleteDB,(db,nxtDB) => {
              this.deleteDB(db, (error) => {
                return nxtDB()
              })
            },() => {
              mongoose.connect(uri);
              let db = mongoose.connection
              db.on("error", console.error.bind(console, "connection error:"))
              db.once("open", () => {
                models.DataSourcesSchema.deleteOne({
                  _id: id
                }, (err, data) => {
                  return callback(err, data);
                });
              })
            })
          })
        })
      })
    },

    getDataSources(callback) {
      const mongoose = require('mongoose')
      mongoose.connect(uri);
      let db = mongoose.connection
      db.on("error", console.error.bind(console, "connection error:"))
      db.once("open", () => {
        models.DataSourcesSchema.find({}).lean().exec({}, (err, data) => {
          if (err) {
            winston.error(err);
            return callback('Unexpected error occured,please retry');
          }
          callback(err, data)
        });
      })
    },
    addDataSourcePair(sources, callback) {
      const mongoose = require('mongoose')
      mongoose.connect(uri);
      let db = mongoose.connection
      db.on("error", console.error.bind(console, "connection error:"))
      db.once("open", () => {
        models.DataSourcePairSchema.find({'status': 'active'}).lean().exec({}, (err, data) => {
          if (data) {
            async.each(data, (dt, nxtDt) => {
              models.DataSourcePairSchema.findByIdAndUpdate(dt._id, {'status': 'inactive'}, (err, data) => {
                return nxtDt()
              })
            }, () => {
              add(sources, (err, res) => {
                return callback(err, res)
              })
            })
          } else {
            add(sources, (err, res) => {
              return callback(err, res)
            })
          }
        })
      })

      function add(sources, callback) {
        let source1 = JSON.parse(sources.source1)
        let source2 = JSON.parse(sources.source2)
        models.DataSourcePairSchema.findOneAndUpdate({
          'source1': source1._id,
          'source2': source2._id
        }, {
          source1: source1._id,
          source2: source2._id,
          status: 'active'
        }, (err, data) => {
          if (err) {
            return callback(err,false)
          }
          if (!data) {
            const dataSourcePair = new models.DataSourcePairSchema({
              source1: source1._id,
              source2: source2._id,
              status: 'active'
            })
            dataSourcePair.save()
            return callback(false,true)
          }
          return callback(false, true)
        })
      }
    },
    resetDataSourcePair(callback) {
      const mongoose = require('mongoose')
      mongoose.connect(uri);
      let db = mongoose.connection
      db.on("error", console.error.bind(console, "connection error:"))
      db.once("open", () => {
        models.DataSourcePairSchema.update({'status': 'active'}, {'status': 'inactive'}, {'multi': true}, (err, data) => {
          return callback(err,data)
        })
      })
    },
    getDataSourcePair(callback) {
      const mongoose = require('mongoose')
      mongoose.connect(uri);
      let db = mongoose.connection
      db.on("error", console.error.bind(console, "connection error:"))
      db.once("open", () => {
        models.DataSourcePairSchema.find({'status': 'active'}).lean().exec({}, (err, data) => {
          return callback(err, data)
        })
      })
    },
    deleteDB(db, callback) {
      const mongoose = require('mongoose')
      mongoose.connect(`mongodb://localhost/${db}`);
      mongoose.connection.once('open', () => {
        mongoose.connection.db.dropDatabase((err) => {
          mongoose.connection.close()
          if (err) {
            winston.error(err);
            error = err;
            throw err;
          } else {
            winston.info(`${db} Dropped`);
          }
          return callback()
        });
      });
    },
    encrypt(text) {
      let algorithm = config.getConf('encryption:algorithm');
      let secret = config.getConf('encryption:secret');
      var cipher = crypto.createCipher(algorithm, secret)
      var crypted = cipher.update(text, 'utf8', 'hex')
      crypted += cipher.final('hex');
      return crypted;
    },
    decrypt(text) {
      let algorithm = config.getConf('encryption:algorithm');
      let secret = config.getConf('encryption:secret');
      var decipher = crypto.createDecipher(algorithm, secret)
      var dec = decipher.update(text, 'hex', 'utf8')
      dec += decipher.final('utf8');
      return dec;
    }
  };
};
