/* eslint-disable func-names */
require('./init');
const winston = require('winston');
const crypto = require('crypto');
const fsFinder = require('fs-finder');
const fs = require('fs-extra');
const tar = require('tar');
const tmp = require('tmp');
const exec = require('child_process');
const moment = require('moment');
const async = require('async');

const models = require('./models');
const mixin = require('./mixin')();
const config = require('./config');

const database = config.getConf('DB_NAME');
const mongoUser = config.getConf('DB_USER');
const mongoPasswd = config.getConf('DB_PASSWORD');
const mongoHost = config.getConf('DB_HOST');
const mongoPort = config.getConf('DB_PORT');

if (mongoUser && mongoPasswd) {
  var uri = `mongodb://${mongoUser}:${mongoPasswd}@${mongoHost}:${mongoPort}/${database}`;
} else {
  var uri = `mongodb://${mongoHost}:${mongoPort}/${database}`;
}

module.exports = function () {
  return {
    saveLevelMapping(levelData, database, callback) {
      winston.info('saving level data');
      const levels = Object.keys(levelData);
      const dbLevel = {};
      async.each(levels, (level, nxtLevel) => {
        if (level.startsWith('level') && levelData[level]) {
          dbLevel[level] = levelData[level];
          return nxtLevel();
        }
        return nxtLevel();
      });
      dbLevel.code = levelData.code;
      dbLevel.facility = levelData.facility;
      const mongoose = require('mongoose');
      if (mongoUser && mongoPasswd) {
        var uri = `mongodb://${mongoUser}:${mongoPasswd}@${mongoHost}:${mongoPort}/${database}`;
      } else {
        var uri = `mongodb://${mongoHost}:${mongoPort}/${database}`;
      }
      mongoose.connect(uri, {}, () => {
        models.MetaDataModel.findOne({}, (err, data) => {
          if (!data) {
            const MetaData = new models.MetaDataModel({
              levelMapping: dbLevel,
            });
            MetaData.save((err, data) => {
              if (err) {
                winston.error(err);
                winston.error('Failed to save level data');
                return callback(err, '');
              }
              winston.info('Level data saved successfully');
              return callback(err, 'successful');
            });
          } else {
            models.MetaDataModel.findByIdAndUpdate(data.id, {
              levelMapping: dbLevel,
            }, (err, data) => {
              if (err) {
                winston.error(err);
                winston.error('Failed to save level data');
                return callback(err, '');
              }
              winston.info('Level data saved successfully');
              return callback(err, 'successful');
            });
          }
        });
      });
    },
    getLevelMapping(database, callback) {
      const mongoose = require('mongoose');
      if (mongoUser && mongoPasswd) {
        var uri = `mongodb://${mongoUser}:${mongoPasswd}@${mongoHost}:${mongoPort}/${database}`;
      } else {
        var uri = `mongodb://${mongoHost}:${mongoPort}/${database}`;
      }
      mongoose.connect(uri, {}, () => {
        models.MetaDataModel.findOne({}, (err, data) => {
          if (data && data.levelMapping) {
            return callback(data.levelMapping);
          }
          winston.info(`No level mapping data for ${database}`);
          return callback(false);
        });
      });
    },
    addDataSource(fields, callback) {
      const mongoose = require('mongoose');
      let password = '';
      mongoose.connect(uri, {}, () => {
        models.DataSourcesModel.findOne({
          $and: [{
            name: fields.name,
          }, {
            userID: fields.userID,
          }],
        }, (err, data) => {
          if (err) {
            winston.error(err);
            winston.error('Unexpected error occured,please retry');
            return callback('Unexpected error occured,please retry', null);
          }
          if (!data) {
            if (fields.password) {
              password = this.encrypt(fields.password);
            }
            const syncServer = new models.DataSourcesModel({
              name: fields.name,
              host: fields.host,
              sourceType: fields.sourceType,
              source: fields.source,
              username: fields.username,
              password,
              userID: fields.userID,
              'owner.id': fields.userID,
              'owner.orgId': fields.orgId,
              shareToSameOrgid: fields.shareToSameOrgid,
              'shareToAll.activated': fields.shareToAll,
              'shareToAll.limitByUserLocation': fields.limitByUserLocation,
            });
            syncServer.save((err, data) => {
              if (err) {
                winston.error(err);
                winston.error('Unexpected error occured,please retry');
                return callback('Unexpected error occured,please retry', null);
              }
              return callback(false, password);
            });
          } else {
            if (fields.password != data.password) {
              password = this.encrypt(fields.password);
            } else {
              password = data.password;
            }
            models.DataSourcesModel.findByIdAndUpdate(data.id, {
              name: fields.name,
              host: fields.host,
              sourceType: fields.sourceType,
              source: fields.source,
              username: fields.username,
              password,
              'shareToAll.activated': fields.shareToAll,
              'shareToAll.limitByUserLocation': fields.limitByUserLocation,
            }, (err, data) => {
              if (err) {
                winston.error(err);
                winston.error('Unexpected error occured,please retry');
                return callback('Unexpected error occured,please retry');
              }
              return callback(false, password);
            });
          }
        });
      });
    },
    editDataSource(fields, callback) {
      const mongoose = require('mongoose');
      const password = this.encrypt(fields.password);
      mongoose.connect(uri, {}, () => {
        models.DataSourcesModel.findByIdAndUpdate(fields.id, {
          name: fields.name,
          host: fields.host,
          sourceType: fields.sourceType,
          source: fields.source,
          username: fields.username,
          password,
        }, (err, data) => {
          if (err) {
            winston.error(err);
            return callback('Unexpected error occured,please retry');
          }
          return callback(false, password);
        });
      });
    },

    updateDatasetAutosync(id, state, callback) {
      const mongoose = require('mongoose');
      mongoose.connect(uri, {}, () => {
        models.DataSourcesModel.findByIdAndUpdate(id, {
          enableAutosync: state,
        }, (err, data) => {
          if (err) {
            winston.error(err);
            return callback('Unexpected error occured,please retry');
          }
          return callback(false, data);
        });
      });
    },

    getServer(userID, name, callback) {
      const mongoose = require('mongoose');
      mongoose.connect(uri, {}, () => {
        models.DataSourcesModel.findOne({
          $and: [{
            name,
          }, {
            userID,
          }],
        }, (err, data) => callback(err, data));
      });
    },

    changeAccountStatus(status, id, callback) {
      const mongoose = require('mongoose');
      mongoose.connect(uri, {}, () => {
        models.UsersModel.findByIdAndUpdate(id, {
          status,
        }, (err, data) => {
          if (err) {
            return callback(err);
          }
          return callback(false, data);
        });
      });
    },

    resetPassword(id, password, callback) {
      const mongoose = require('mongoose');
      mongoose.connect(uri, {}, () => {
        models.UsersModel.findByIdAndUpdate(id, {
          password,
        }, (err, data) => {
          if (err) {
            return callback(err);
          }
          return callback(false, data);
        });
      });
    },

    getMappingDBs(name, userID, callback) {
      const mongoose = require('mongoose');
      mongoose.connect(uri);
      const db = mongoose.connection;
      const mappingDBs = [];
      db.on('error', console.error.bind(console, 'connection error:'));
      db.once('open', () => {
        mongoose.connection.db.admin().command({
          listDatabases: 1,
        }, (error, results) => {
          async.eachSeries(results.databases, (database, nxtDB) => {
            let dbName1 = database.name;
            if (dbName1.includes(name) && dbName1.includes(userID)) {
              dbName1 = dbName1.replace(name, '');
              const splitedDB = dbName1.split(userID);
              if (!splitedDB[0] == '' && !splitedDB[1] == '') {
                return nxtDB();
              }
              dbName1 = dbName1.replace(userID, '');
              const db = results.databases.find(db => db.name === dbName1 + userID);
              if (dbName1 && db) {
                mappingDBs.push(database.name);
                return nxtDB();
              }
              return nxtDB();
            }
            return nxtDB();
          }, () => callback(mappingDBs));
        });
      });
    },

    deleteDataSource(id, name, sourceOwner, userID, callback) {
      const requestedDB = name + sourceOwner;
      let deleteDB = [];
      deleteDB.push(requestedDB);
      const mongoose = require('mongoose');
      this.getMappingDBs(name, userID, (mappingDBs) => {
        deleteDB = deleteDB.concat(mappingDBs);
        async.eachSeries(deleteDB, (db, nxtDB) => {
          this.deleteDB(db, error => nxtDB());
        }, () => {
          mongoose.connect(uri, {}, () => {
            models.DataSourcesModel.deleteOne({
              _id: id,
            }, (err, data) => {
              models.DataSourcePairModel.deleteMany({
                $or: [{
                  source1: id,
                }, {
                  source2: id,
                }],
              }, (err, data) => {
                const filter = function (stat, path) {
                  if (path.includes(`${sourceOwner}+${name}+`)) {
                    return true;
                  }
                  return false;
                };
                fsFinder.from(`${__dirname}/csvUploads/`).filter(filter).findFiles((files) => {
                  this.deleteFile(files, () => callback(err, data));
                });
              });
            });
          });
        });
      });
    },

    deleteSourcePair(pairId, dbName, callback) {
      const mongoose = require('mongoose');
      mongoose.connect(uri, {}, () => {
        models.DataSourcePairModel.deleteOne({
          _id: pairId,
        }, (err, data) => {
          if (data) {
            this.deleteDB(dbName, (err) => {
              callback(err, data);
            });
          }
        });
      });
    },

    deleteFile(path, callback) {
      async.each(path, (file, nxtFile) => {
        fs.unlink(file, (err) => {
          if (err) {
            winston.error(err);
          }
          return nxtFile();
        });
      }, () => callback());
    },

    getDataSources(userID, role, orgId, callback) {
      const mongoose = require('mongoose');
      if (!orgId) {
        orgId = 'undefined';
      }
      let filters;
      if (role == 'Admin') {
        filters = {};
      } else {
        filters = {
          $or: [{
            userID,
          },
          {
            'shared.users': userID,
          },
          {
            'shareToAll.activated': true,
          },
          {
            $and: [{
              shareToSameOrgid: true,
            }, {
              'owner.orgId': orgId,
            }],
          },
          ],
        };
      }
      mongoose.connect(uri, {}, () => {
        models.DataSourcesModel.find(filters).populate('shared.users', 'userName').populate('userID', 'userName').lean()
          .exec({}, (err, sources) => {
            async.eachOfSeries(sources, (source, key, nxtSrc) => {
              // converting _bsontype property into normal property
              source = JSON.parse(JSON.stringify(source));
              models.SharedDataSourceLocationsModel.find({
                dataSource: source._id,
              }, {
                user: 1,
                location: 1,
                _id: 0,
              }, (err, data) => {
                sources[key].sharedLocation = data;
                return nxtSrc();
              });
            }, () => {
              if (err) {
                winston.error(err);
                return callback('Unexpected error occured,please retry');
              }
              callback(err, sources);
            });
          });
      });
    },

    getDataPairs(userID, callback) {
      const mongoose = require('mongoose');
      mongoose.connect(uri, {}, () => {
        models.DataSourcePairModel.find({
          userID,
        }).populate('source1').populate('source2').populate('shared')
          .populate('userID')
          .lean()
          .exec({}, (err, data) => {
            if (err) {
              winston.error(err);
              return callback('Unexpected error occured,please retry');
            }
            callback(err, data);
          });
      });
    },

    addDataSourcePair(sources, callback) {
      const mongoose = require('mongoose');
      mongoose.connect(uri, {}, () => {
        let createPair = true;
        let errMsg;
        this.getDataSourcePair(sources.userID, sources.orgId, (err, sourcePair) => {
          if (sourcePair.length > 0 && sources.singlePair) {
            errMsg = 'Single pair limit is active and a pair already exists, cant create more pairs';
            createPair = false;
          }
          async.parallel({
            deactivateShared: (callback) => {
              if (sources.activePairID && createPair) {
                this.deActivateSharedPair(sources.activePairID, sources.userID, (err, data) => callback(err, data));
              } else {
                return callback(false, false);
              }
            },

            deactivatePairs: (callback) => {
              if (createPair) {
                this.deActivatePairs(sources.userID, (err, data) => callback(err, data));
              } else {
                return callback(false, false);
              }
            },
          }, (error, results) => {
            if (error) {
              return callback(true, false, false);
            }
            add(sources, createPair, (err, res) => {
              if (!createPair) {
                return callback(true, errMsg, res);
              }
              return callback(err, errMsg, res);
            });
          });
        });
      });

      function add(sources, createPair, callback) {
        const source1 = JSON.parse(sources.source1);
        const source2 = JSON.parse(sources.source2);
        models.DataSourcePairModel.findOneAndUpdate({
          source1: source1._id,
          source2: source2._id,
          userID: sources.userID,
        }, {
          source1: source1._id,
          source2: source2._id,
          orgId: sources.orgId,
          status: 'active',
        }, (err, data) => {
          if (err) {
            return callback(err, false);
          }
          if (!data && createPair) {
            const dataSourcePair = new models.DataSourcePairModel({
              source1: source1._id,
              source2: source2._id,
              status: 'active',
              userID: sources.userID,
              'owner.id': sources.userID,
              'owner.orgId': sources.orgId,
            });
            dataSourcePair.save((err, data) => {
              if (err) {
                winston.error(err);
                return callback(true, false);
              }
              return callback(false, true);
            });
          } else {
            return callback(false, true);
          }
        });
      }
    },

    activateSharedPair(pairID, userID, callback) {
      const mongoose = require('mongoose');
      mongoose.connect(uri, {}, () => {
        models.DataSourcePairModel.find({
          status: 'active',
          userID,
        }).lean().exec({}, (err, data) => {
          if (data) {
            async.each(data, (dt, nxtDt) => {
              models.DataSourcePairModel.findByIdAndUpdate(dt._id, {
                status: 'inactive',
              }, (err, data) => nxtDt());
            }, () => {
              models.DataSourcePairModel.findByIdAndUpdate(pairID, {
                $push: {
                  'shared.activeUsers': userID,
                },
              }, (err, data) => callback(err, data));
            });
          } else {
            models.DataSourcePairModel.findByIdAndUpdate(pairID, {
              $push: {
                'shared.activeUsers': userID,
              },
            }, (err, data) => callback(err, data));
          }
        });
      });
    },

    deActivateSharedPair(pairId, userID, callback) {
      models.DataSourcePairModel.findByIdAndUpdate(pairId, {
        $pull: {
          'shared.activeUsers': userID,
        },
      }, (err, data) => callback(err, data));
    },

    deActivatePairs(userID, callback) {
      models.DataSourcePairModel.find({
        status: 'active',
        userID,
      }).lean().exec({}, (err, data) => {
        if (data) {
          async.each(data, (dt, nxtDt) => {
            models.DataSourcePairModel.findByIdAndUpdate(dt._id, {
              status: 'inactive',
            }, (errs, data) => {
              err = errs;
              if (errs) {
                err = errs;
              }
              return nxtDt();
            });
          }, () => callback(err, data));
        } else {
          return callback(err, data);
        }
      });
    },

    shareSourcePair(sharePair, users, callback) {
      const mongoose = require('mongoose');
      mongoose.connect(uri, {}, () => {
        models.DataSourcePairModel.findByIdAndUpdate(sharePair, {
          'shared.users': users,
        }, (err, data) => callback(err, data));
      });
    },

    shareDataSource(shareSource, users, limitLocationId, callback) {
      const mongoose = require('mongoose');
      mongoose.connect(uri, {}, () => {
        models.DataSourcesModel.findByIdAndUpdate(shareSource, {
          'shared.users': users,
        }, (err, data) => {
          async.eachSeries(users, (user, nxtUser) => {
            models.SharedDataSourceLocationsModel.update({
              dataSource: shareSource,
              user,
            }, {
              dataSource: shareSource,
              user,
              location: limitLocationId,
            }, {
              upsert: true,
            },
            (err, data) => nxtUser());
          }, () => callback(err, data));
        });
      });
    },

    resetDataSourcePair(userID, callback) {
      const mongoose = require('mongoose');
      mongoose.connect(uri, {}, () => {
        models.DataSourcePairModel.update({
          status: 'active',
          userID,
        }, {
          status: 'inactive',
        }, {
          multi: true,
        }, (err, data) => callback(err, data));
      });
    },
    getDataSourcePair(userID, orgId, callback) {
      const mongoose = require('mongoose');
      // need to do it this way
      if (!orgId) {
        orgId = 'undefined';
      }
      mongoose.connect(uri, {}, () => {
        models.DataSourcePairModel.find({
          $or: [{
            userID,
          },
          {
            'shared.users': userID,
          },
          {
            'owner.orgId': orgId,
          },
          ],
        }).populate('source1', 'name userID').populate('source2', 'name userID').populate('userID', 'userName')
          .populate('shared.users', 'userName')
          .lean()
          .exec({}, (err, data) => callback(err, data));
      });
    },
    getGeneralConfig(callback) {
      const database = config.getConf('DB_NAME');
      const mongoose = require('mongoose');
      let uri;
      if (mongoUser && mongoPasswd) {
        uri = `mongodb://${mongoUser}:${mongoPasswd}@${mongoHost}:${mongoPort}/${database}`;
      } else {
        uri = `mongodb://${mongoHost}:${mongoPort}/${database}`;
      }
      mongoose.connect(uri, {}, () => {
        models.MetaDataModel.findOne({}, {
          'config.generalConfig': 1,
        }, (err, resData) => callback(err, resData));
      });
    },
    deleteDB(db, callback) {
      const mongoose = require('mongoose');
      mongoose.connect(`mongodb://localhost/${db}`);
      mongoose.connection.once('open', () => {
        mongoose.connection.db.dropDatabase((err) => {
          mongoose.connection.close();
          if (err) {
            winston.error(err);
            error = err;
            throw err;
          } else {
            winston.info(`${db} Dropped`);
          }
          return callback();
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
        if (fs.existsSync(`${tmpDir.name}/${db}`)) {
          tar.c({
            file: `${dir}/${name}.tar`,
            cwd: tmpDir.name,
            sync: true,
          }, [db]);
        } else {
          winston.info(`No archive created because no database exists: ${db}`);
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
      const algorithm = config.getConf('encryption:algorithm');
      const secret = config.getConf('encryption:secret');
      const cipher = crypto.createCipher(algorithm, secret);
      let crypted = cipher.update(text, 'utf8', 'hex');
      crypted += cipher.final('hex');
      return crypted;
    },
    decrypt(text) {
      const algorithm = config.getConf('encryption:algorithm');
      const secret = config.getConf('encryption:secret');
      const decipher = crypto.createDecipher(algorithm, secret);
      let dec = decipher.update(text, 'hex', 'utf8');
      dec += decipher.final('utf8');
      return dec;
    },
  };
};
