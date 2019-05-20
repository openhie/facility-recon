require('./init')
const winston = require('winston')
const crypto = require('crypto')
const fsFinder = require('fs-finder')
const fs = require('fs-extra')
const tar = require('tar')
const tmp = require('tmp')
const exec = require('child_process')
const moment = require('moment')
const async = require('async')

const models = require('./models')
const mixin = require('./mixin')()
const config = require('./config')

const database = config.getConf("DB_NAME")
const mongoUser = config.getConf("DB_USER")
const mongoPasswd = config.getConf("DB_PASSWORD")
const mongoHost = config.getConf("DB_HOST")
const mongoPort = config.getConf("DB_PORT")

if (mongoUser && mongoPasswd) {
  var uri = `mongodb://${mongoUser}:${mongoPasswd}@${mongoHost}:${mongoPort}/${database}`;
} else {
  var uri = `mongodb://${mongoHost}:${mongoPort}/${database}`;
}

module.exports = function () {
  return {
    saveLevelMapping (levelData, database, callback) {
      winston.info('saving level data')
      let levels = Object.keys(levelData)
      let dbLevel = {}
      async.each(levels, (level, nxtLevel) => {
        if(level.startsWith('level') && levelData[level]) {
          dbLevel[level] = levelData[level]
          return nxtLevel()
        } else {
          return nxtLevel()
        }
      })
      dbLevel['code'] = levelData['code']
      dbLevel['facility'] = levelData['facility']
      const mongoose = require('mongoose')
      if (mongoUser && mongoPasswd) {
        var uri = `mongodb://${mongoUser}:${mongoPasswd}@${mongoHost}:${mongoPort}/${database}`;
      } else {
        var uri = `mongodb://${mongoHost}:${mongoPort}/${database}`;
      }
      mongoose.connect(uri, {}, () => {
        models.MetaDataModel.findOne({}, (err, data) => {
          if (!data) {
            const MetaData = new models.MetaDataModel({
              levelMapping: dbLevel
            });
            MetaData.save((err, data) => {
              if (err) {
                winston.error(err)
                winston.error("Failed to save level data")
                return callback(err, '')
              } else {
                winston.info("Level data saved successfully")
                return callback(err, 'successful')
              }
            })
          } else {
            models.MetaDataModel.findByIdAndUpdate(data.id, {
              levelMapping: dbLevel
            }, (err, data) => {
              if (err) {
                winston.error(err)
                winston.error("Failed to save level data")
                return callback(err, '')
              } else {
                winston.info("Level data saved successfully")
                return callback(err, 'successful')
              }
            })
          }
        })
      })
    },
    getLevelMapping (database, callback) {
      const mongoose = require('mongoose')
      if (mongoUser && mongoPasswd) {
        var uri = `mongodb://${mongoUser}:${mongoPasswd}@${mongoHost}:${mongoPort}/${database}`;
      } else {
        var uri = `mongodb://${mongoHost}:${mongoPort}/${database}`;
      }
      mongoose.connect(uri, {}, () => {
        models.MetaDataModel.findOne({}, (err, data) => {
          if (data && data.levelMapping) {
            return callback(data.levelMapping)
          } else {
            winston.info("No level mapping data for " + database)
            return callback(false)
          }
        })
      })
    },
    addDataSource(fields, callback) {
      const mongoose = require('mongoose')
      let password = ''
      mongoose.connect(uri, {}, () => {
        models.DataSourcesModel.findOne({
          $and:[{name: fields.name}, {userID: fields.userID}]
        }, (err, data) => {
          if (err) {
            winston.error(err)
            winston.error('Unexpected error occured,please retry');
            return callback('Unexpected error occured,please retry', null);
          }
          if (!data) {
            if (fields.password) {
              password = this.encrypt(fields.password)
            }
            const syncServer = new models.DataSourcesModel({
              name: fields.name,
              host: fields.host,
              sourceType: fields.sourceType,
              source: fields.source,
              username: fields.username,
              password: password,
              userID: fields.userID,
              'owner.id': fields.userID,
              'owner.orgId': fields.orgId,
              'shareToSameOrgid': fields.shareToSameOrgid,
              'shareToAll.activated': fields.shareToAll,
              'shareToAll.limitByUserLocation': fields.limitByUserLocation
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
            if(fields.password != data.password) {
              password = this.encrypt(fields.password)
            } else {
              password = data.password
            }
            models.DataSourcesModel.findByIdAndUpdate(data.id, {
              name: fields.name,
              host: fields.host,
              sourceType: fields.sourceType,
              source: fields.source,
              username: fields.username,
              password: password,
              'shareToAll.activated': fields.shareToAll,
              'shareToAll.limitByUserLocation': fields.limitByUserLocation
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
      mongoose.connect(uri, {}, () => {
        models.DataSourcesModel.findByIdAndUpdate(fields.id, {
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

    getServer (userID, name, callback) {
      const mongoose = require('mongoose')
      mongoose.connect(uri, {}, () => {
        models.DataSourcesModel.findOne({
          $and:[{name: name}, {userID: userID}]
        }, (err, data) => {
          return callback(err, data)
        })
      })
    },

    changeAccountStatus(status, id, callback) {
      const mongoose = require('mongoose')
      mongoose.connect(uri, {}, () => {
        models.UsersModel.findByIdAndUpdate(id, {
          status: status
        }, (err, data) => {
          if (err) {
            return callback(err);
          }
          return callback(false, data)
        });
      })
    },

    resetPassword(id, password, callback) {
      const mongoose = require('mongoose')
      mongoose.connect(uri, {}, () => {
        models.UsersModel.findByIdAndUpdate(id, {
          password: password
        }, (err, data) => {
          if (err) {
            return callback(err);
          }
          return callback(false, data)
        });
      })
    },

    getMappingDBs(name, userID, callback) {
      const mongoose = require('mongoose')
      mongoose.connect(uri);
      let db = mongoose.connection
      let mappingDBs = []
      db.on("error", console.error.bind(console, "connection error:"))
      db.once("open", () => {
        mongoose.connection.db.admin().command({listDatabases: 1}, (error, results) => {
          async.eachSeries(results.databases, (database, nxtDB) => {
            let dbName1 = database.name
            if (dbName1.includes(name) && dbName1.includes(userID)) {
              dbName1 = dbName1.replace(name, '')
              let splitedDB = dbName1.split(userID)
              if (!splitedDB[0] == "" && !splitedDB[1] == "") {
                return nxtDB()
              }
              dbName1 = dbName1.replace(userID, '')
              let db = results.databases.find((db) => {
                return db.name === dbName1 + userID
              })
              if (dbName1 && db) {
                mappingDBs.push(database.name)
                return nxtDB()
              } else {
                return nxtDB()
              }
            } else {
              return nxtDB()
            }
          }, () => {
            return callback(mappingDBs)
          })
        })
      })
    },

    deleteDataSource(id, name, sourceOwner, userID, callback) {
      let requestedDB = name + sourceOwner
      let deleteDB = []
      deleteDB.push(requestedDB)
      const mongoose = require('mongoose')
      this.getMappingDBs(name, userID, (mappingDBs) => {
        deleteDB = deleteDB.concat(mappingDBs)
        async.eachSeries(deleteDB, (db, nxtDB) => {
          this.deleteDB(db, (error) => {
            return nxtDB()
          })
        }, () => {
          mongoose.connect(uri, {}, () => {
            models.DataSourcesModel.deleteOne({_id: id}, (err, data) => {
              models.DataSourcePairModel.deleteMany({$or: [{source1: id}, {source2: id}]}, (err, data) => {
                const filter = function (stat, path) {
                  if (path.includes(`${sourceOwner}+${name}+`)) {
                    return true;
                  } else {
                    return false;
                  }
                };
                fsFinder.from(`${__dirname}/csvUploads/`).filter(filter).findFiles((files) => {
                  this.deleteFile(files, () => {
                    return callback(err, data);
                  })
                })
              });
            });
          })
        })
      })
    },

    deleteFile(path, callback) {
      async.each(path, (file, nxtFile) => {
        fs.unlink(file, (err) => {
          if (err) {
            winston.error(err);
          }
          return nxtFile()
        });
      }, () => {
        return callback()
      })
    },

    getDataSources(userID, orgId, callback) {
      const mongoose = require('mongoose')
      mongoose.connect(uri, {}, () => {
        models.DataSourcesModel.find({ 
          $or: [
            {'userID': userID}, 
            {'shared.users': userID}, 
            {'shareToAll.activated': true},
            {$and: [{'shareToSameOrgid': true}, {'owner.orgId': orgId}]}
          ]
        }).populate("shared.users", "userName").populate("userID", "userName").lean().exec({}, (err, sources) => {
          async.eachOfSeries(sources, (source, key, nxtSrc) => {
            // converting _bsontype property into normal property
            source = JSON.parse(JSON.stringify(source))
            models.SharedDataSourceLocationsModel.find({dataSource: source._id},{user: 1, location: 1, _id: 0}, (err, data) => {
              sources[key].sharedLocation = data
              return nxtSrc()
            })
          }, () => {
            if (err) {
              winston.error(err);
              return callback('Unexpected error occured,please retry');
            }
            callback(err, sources)
          })
        });
      })
    },

    getDataPairs(userID, callback) {
      const mongoose = require('mongoose')
      mongoose.connect(uri, {}, () => {
        models.DataSourcePairModel.find({
          userID: userID
        }).populate("source1").populate("source2").populate("shared").populate("userID").lean().exec({}, (err, data) => {
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
      mongoose.connect(uri, {}, () => {
        winston.error(sources.activePairID)
        winston.error(sources.userID)
        if(sources.activePairID) {
          models.DataSourcePairModel.findByIdAndUpdate(sources.activePairID, {$pull: {'shared.activeUsers': sources.userID}}, (err, data) => {

          })
        }
        models.DataSourcePairModel.find({'status': 'active', 'userID': sources.userID}).lean().exec({}, (err, data) => {
          if (data) {
            async.each(data, (dt, nxtDt) => {
              models.DataSourcePairModel.findByIdAndUpdate(dt._id, {'status': 'inactive'}, (err, data) => {
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
        models.DataSourcePairModel.findOneAndUpdate({
          'source1': source1._id,
          'source2': source2._id,
          'userID': sources.userID
        }, {
          source1: source1._id,
          source2: source2._id,
          status: 'active'
        }, (err, data) => {
          if (err) {
            return callback(err,false)
          }
          if (!data) {
            const dataSourcePair = new models.DataSourcePairModel({
              source1: source1._id,
              source2: source2._id,
              status: 'active',
              userID: sources.userID
            })
            dataSourcePair.save((err, data) =>{
              if(err) {
                winston.error(err)
                return callback(true, false)
              }
              return callback(false, true)
            })
          } else {
            return callback(false, true)
          }
        })
      }
    },

    activateSharedPair(pairID, userID, callback) {
      const mongoose = require('mongoose')
      mongoose.connect(uri, {}, () => {
        models.DataSourcePairModel.find({'status': 'active', 'userID': userID}).lean().exec({}, (err, data) => {
          if (data) {
            async.each(data, (dt, nxtDt) => {
              models.DataSourcePairModel.findByIdAndUpdate(dt._id, {'status': 'inactive'}, (err, data) => {
                return nxtDt()
              })
            }, () => {
              models.DataSourcePairModel.findByIdAndUpdate(pairID, {$push: {'shared.activeUsers': userID}}, (err, data) => {
                return callback(err, data)
              })
            })
          } else {
            models.DataSourcePairModel.findByIdAndUpdate(pairID, {$push: {'shared.activeUsers': userID}}, (err, data) => {
              return callback(err, data)
            })
          }
        })
      })
    },

    shareSourcePair(sharePair, users, callback) {
      const mongoose = require('mongoose')
      mongoose.connect(uri, {}, () => {
        models.DataSourcePairModel.findByIdAndUpdate(sharePair, {'shared.users': users}, (err, data) => {
          return callback(err, data)
        })
      })
    },

    shareDataSource(shareSource, users, limitLocationId, callback) {
      const mongoose = require('mongoose')
      mongoose.connect(uri, {}, () => {
        models.DataSourcesModel.findByIdAndUpdate(shareSource, {'shared.users': users}, (err, data) => {
          async.eachSeries(users, (user, nxtUser) => {
            models.SharedDataSourceLocationsModel.update(
              {dataSource: shareSource, user: user}, 
              {dataSource: shareSource, user: user, location: limitLocationId}, 
              {upsert: true}, 
              (err, data) =>{
              return nxtUser()
            })
          }, () => {
            return callback(err, data)
          })
        })
      })
    },

    resetDataSourcePair(userID, callback) {
      const mongoose = require('mongoose')
      mongoose.connect(uri, {}, () => {
        models.DataSourcePairModel.update({'status': 'active', 'userID': userID}, {'status': 'inactive'}, {'multi': true}, (err, data) => {
          return callback(err,data)
        })
      })
    },
    getDataSourcePair(userID, callback) {
      let mongoose = require('mongoose')
      mongoose.connect(uri, {}, () => {
        models.DataSourcePairModel.find({ $or: [{'userID': userID}, {'shared.users': userID}]
          
        }).populate("source1", "name userID").populate("source2", "name userID").populate("userID", "userName").populate("shared.users", "userName").lean().exec({}, (err, data) => {
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
    restoreDB(archive, db, callback) {
      winston.info(`Archiving ${db}`);
      this.archiveDB(db, (err) => {
        winston.info(`Deleting ${db}`);
        this.deleteDB(db, (err) => {
          if (err) {
            return callback(err);
          }
          winston.info('Restoring now ....');
          const dbList = [];
          dbList.push({
            archive: `${conficonfig.getConf('mapping:dbPrefix')}${db}_${archive}.tar`,
            db: `${config.getConf('mapping:dbPrefix')}${db}`,
          });
          dbList.push({
            archive: `${db}_${archive}.tar`,
            db,
          });
          const error = false;
          async.eachSeries(dbList, (list, nxtList) => {
            db = list.db;
            archive = list.archive;
            if (mongoUser && mongoPasswd) {
              var uri = `mongodb://${mongoUser}:${mongoPasswd}@${mongoHost}:${mongoPort}/${db}`;
            } else {
              var uri = `mongodb://${mongoHost}:${mongoPort}/${db}`;
            }
            const me = this;

            const tmpDir = tmp.dirSync();
            tar.x({
              file: `${__dirname}/dbArchives/${archive}`,
              cwd: tmpDir.name,
              sync: true,
            });
            exec.execSync(`mongorestore --uri='${uri}' --drop --dir=${tmpDir.name}`, {
              cwd: tmpDir.name,
            });
            fs.removeSync(tmpDir.name);
            nxtList();
          }, () => {
            callback(error);
          });
        });
      });
    },
    archiveDB(db, callback) {
      const name = `${db}_${moment().format()}`;
      const dbList = [];
      dbList.push({
        name,
        db,
      });
      dbList.push({
        name: `${config.getConf('mapping:dbPrefix')}_${name}`,
        db: `${config.getConf('mapping:dbPrefix')}${db}`,
      });
      const error = false;
      async.eachSeries(dbList, (list, nxtList) => {
        const db = list.db;
        const name = list.name;
        winston.info(`Archiving DB ${db}`);
        if (mongoUser && mongoPasswd) {
          var uri = `mongodb://${mongoUser}:${mongoPasswd}@${mongoHost}:${mongoPort}/${db}`;
        } else {
          var uri = `mongodb://${mongoHost}:${mongoPort}/${db}`;
        }
        const me = this;
        const dir = `${__dirname}/dbArchives`;

        const tmpDir = tmp.dirSync();
        exec.execSync(`mongodump --uri=${uri} -o ${tmpDir.name}`, {
          cwd: tmpDir.name,
        });
        if (fs.existsSync(tmpDir.name + "/" + db)) {
          tar.c({
            file: `${dir}/${name}.tar`,
            cwd: tmpDir.name,
            sync: true,
          }, [db]);
        } else {
          winston.info(`No archive created because no database exists: ${db}`)
        }
        fs.removeSync(tmpDir.name);
        nxtList();

      }, () => {
        callback(error);
      });
    },
    getArchives(db, callback) {
      const filter = function (stat, path) {
        if (path.includes(db) && !path.includes(config.getConf('mapping:dbPrefix'))) {
          return true;
        }
        return false;
      };

      const archives = [];
      const files = fsFinder.from(`${__dirname}/dbArchives`).filter(filter).findFiles((files) => {
        async.eachSeries(files, (file, nxtFile) => {
          file = file.split('/').pop().replace('.tar', '').replace(`${db}_`, '');
          archives.push(file);
          return nxtFile();
        }, () => callback(false, archives));
      });
    },
    cleanArchives(db, callback) {
      const maxArchives = config.getConf('dbArchives:maxArchives');
      const filter = function (stat, path) {
        if (path.includes(db) && !path.includes(config.getConf('mapping:dbPrefix'))) {
          return true;
        }
        return false;
      };

      const files = fsFinder.from(`${__dirname}/dbArchives`).filter(filter).findFiles((files) => {
        if (files.length > maxArchives) {
          const totalDelete = files.length - maxArchives;
          filesDelete = [];
          async.eachSeries(files, (file, nxtFile) => {
            // if max archive files not reached then add to the delete list
            if (filesDelete.length < totalDelete) {
              filesDelete.push(file);
              return nxtFile();
            }
            const replaceDel = filesDelete.find((fDelete) => {
              fDelete = fDelete.replace(`${__dirname}/dbArchives/${db}_`, '').replace('.tar', '');
              fDelete = moment(fDelete);
              searchFile = file.replace(`${__dirname}/dbArchives/${db}_`, '').replace('.tar', '');
              searchFile = moment(searchFile);
              return fDelete > searchFile;
            });
            if (replaceDel) {
              const index = filesDelete.indexOf(replaceDel);
              filesDelete.splice(index, 1);
              filesDelete.push(file);
            }
            return nxtFile();
          }, () => {
            filesDelete.forEach((fileDelete) => {
              fs.unlink(fileDelete, (err) => {
                if (err) {
                  winston.error(err);
                }
              });
              const dl = fileDelete.split(db);
              fileDelete = `${dl[0]}${config.getConf('mapping:dbPrefix')}_${db}${dl[1]}`;
              fs.unlink(fileDelete, (err) => {
                if (err) {
                  winston.error(err);
                }
              });
            });
            callback();
          });
        } else {
          callback();
        }
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
