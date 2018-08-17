require('./init');
const config = require('./config');
const mongoose = require('mongoose');
const winston = require('winston');

module.exports = function () {
  return {
    addServer(fields, callback) {
      const database = config.getConf('mCSD:database')
      const mongoUser = config.getConf('mCSD:databaseUser');
      const mongoPasswd = config.getConf('mCSD:databasePassword');
      const mongoHost = config.getConf('mCSD:databaseHost');
      const mongoPort = config.getConf('mCSD:databasePort');
      if (mongoUser && mongoPasswd) {
        var uri = `mongodb://${mongoUser}:${mongoPasswd}@${mongoHost}:${mongoPort}/${database}`;
      } else {
        var uri = `mongodb://${mongoHost}:${mongoPort}/${database}`;
      }
      mongoose.connect(uri);
      const Schema = mongoose.Schema;
      let SyncServersModel;
      try {
        SyncServersModel = mongoose.model('SyncServers');
      } catch (e) {
        mongoose.model('SyncServers', new Schema({
          name: {
            type: String
          },
          host: {
            type: String
          },
          username: {
            type: String
          },
          password: {
            type: String
          },
        }));
        SyncServersModel = mongoose.model('SyncServers');
      }

      SyncServersModel.findOne({
        host: fields.host
      }, (err, data) => {
        if (err) {
          winston.error('Unexpected error occured,please retry');
          return callback('Unexpected error occured,please retry', null)
        }
        if (!data) {
          let syncServer = new SyncServersModel({
            name: fields.name,
            host: fields.host,
            username: fields.username,
            password: fields.password
          });
          syncServer.save((err, data) => {
            if (err) {
              winston.error('Unexpected error occured,please retry')
              return callback('Unexpected error occured,please retry', null)
            } else {
              return callback(false, true)
            }
          });
        } else {
          SyncServersModel.findByIdAndUpdate(data.id, {
            name: fields.name,
            host: fields.host,
            username: fields.username,
            password: fields.password
          }, (err, data) => {
            if (err) {
              winston.error('Unexpected error occured,please retry');
              return callback('Unexpected error occured,please retry');
            } else {

            }
            return callback(false, true)
          });
        }
      });
    },
    editServer(fields, callback) {
      const database = config.getConf('mCSD:database')
      const mongoUser = config.getConf('mCSD:databaseUser');
      const mongoPasswd = config.getConf('mCSD:databasePassword');
      const mongoHost = config.getConf('mCSD:databaseHost');
      const mongoPort = config.getConf('mCSD:databasePort');
      if (mongoUser && mongoPasswd) {
        var uri = `mongodb://${mongoUser}:${mongoPasswd}@${mongoHost}:${mongoPort}/${database}`;
      } else {
        var uri = `mongodb://${mongoHost}:${mongoPort}/${database}`;
      }
      mongoose.connect(uri);
      const Schema = mongoose.Schema;
      let SyncServersModel;
      try {
        SyncServersModel = mongoose.model('SyncServers');
      } catch (e) {
        mongoose.model('SyncServers', new Schema({
          name: {
            type: String
          },
          host: {
            type: String
          },
          username: {
            type: String
          },
          password: {
            type: String
          },
        }));
        SyncServersModel = mongoose.model('SyncServers');
      }
      SyncServersModel.findByIdAndUpdate(fields.id, {
        name: fields.name,
        host: fields.host,
        username: fields.username,
        password: fields.password
      }, (err, data) => {
        if (err) {
          winston.error(err);
          return callback('Unexpected error occured,please retry');
        } else {
          return callback(false, true)
        }
      });
    },

    deleteServer(id, callback) {
      const database = config.getConf('mCSD:database')
      const mongoUser = config.getConf('mCSD:databaseUser');
      const mongoPasswd = config.getConf('mCSD:databasePassword');
      const mongoHost = config.getConf('mCSD:databaseHost');
      const mongoPort = config.getConf('mCSD:databasePort');
      if (mongoUser && mongoPasswd) {
        var uri = `mongodb://${mongoUser}:${mongoPasswd}@${mongoHost}:${mongoPort}/${database}`;
      } else {
        var uri = `mongodb://${mongoHost}:${mongoPort}/${database}`;
      }
      mongoose.connect(uri);
      const Schema = mongoose.Schema;
      let SyncServersModel;
      try {
        SyncServersModel = mongoose.model('SyncServers');
      } catch (e) {
        mongoose.model('SyncServers', new Schema({
          name: {
            type: String
          },
          host: {
            type: String
          },
          username: {
            type: String
          },
          password: {
            type: String
          },
        }));
        SyncServersModel = mongoose.model('SyncServers');
      }

      SyncServersModel.deleteOne({
        _id: id
      }, (err, data) => {
        winston.error(JSON.stringify(data))
        return callback(err, data)
      })
    },

    getServers(callback) {
      const database = config.getConf('mCSD:database')
      const mongoUser = config.getConf('mCSD:databaseUser');
      const mongoPasswd = config.getConf('mCSD:databasePassword');
      const mongoHost = config.getConf('mCSD:databaseHost');
      const mongoPort = config.getConf('mCSD:databasePort');
      if (mongoUser && mongoPasswd) {
        var uri = `mongodb://${mongoUser}:${mongoPasswd}@${mongoHost}:${mongoPort}/${database}`;
      } else {
        var uri = `mongodb://${mongoHost}:${mongoPort}/${database}`;
      }
      mongoose.connect(uri);
      const Schema = mongoose.Schema;
      let SyncServersModel;
      try {
        SyncServersModel = mongoose.model('SyncServers');
      } catch (e) {
        mongoose.model('SyncServers', new Schema({
          name: {
            type: String
          },
          host: {
            type: String
          },
          username: {
            type: String
          },
          password: {
            type: String
          },
        }));
        SyncServersModel = mongoose.model('SyncServers');
      }

      SyncServersModel.find({}, (err, data) => {
        winston.error(JSON.stringify(data))
        return callback(err, data)
      })
    }
  }
}