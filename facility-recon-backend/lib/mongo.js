require('./init');
const winston = require('winston');
const crypto = require('crypto')
const models = require('./models')
const config = require('./config');

require('./connection')

module.exports = function () {
  return {
    addServer(fields, callback) {
      let password = this.encrypt(fields.password)
      models.SyncServers.findOne({
        host: fields.host,
      }, (err, data) => {
        if (err) {
          winston.error('Unexpected error occured,please retry');
          return callback('Unexpected error occured,please retry', null);
        }
        if (!data) {
          const syncServer = new models.SyncServers({
            name: fields.name,
            host: fields.host,
            sourceType: fields.sourceType,
            username: fields.username,
            password: password,
          });
          syncServer.save((err, data) => {
            if (err) {
              winston.error('Unexpected error occured,please retry')
              return callback('Unexpected error occured,please retry', null)
            } 
              return callback(false, password)
            
          });
        } else {
          models.SyncServers.findByIdAndUpdate(data.id, {
            name: fields.name,
            host: fields.host,
            sourceType: fields.sourceType,
            username: fields.username,
            password: password,
          }, (err, data) => {
            if (err) {
              winston.error('Unexpected error occured,please retry');
              return callback('Unexpected error occured,please retry');
            }
            return callback(false, password)
          });
        }
      });
    },
    editServer(fields, callback) {
      let password = this.encrypt(fields.password)
      models.SyncServers.findByIdAndUpdate(fields.id, {
        name: fields.name,
        host: fields.host,
        sourceType: fields.sourceType,
        username: fields.username,
        password: password,
      }, (err, data) => {
        if (err) {
          winston.error(err);
          return callback('Unexpected error occured,please retry');
        }
          return callback(false, password)
      });
    },

    deleteServer(id, callback) {
      models.SyncServers.deleteOne({
        _id: id,
      }, (err, data) => {
        return callback(err, data);
      });
    },

    getServers(callback) {
      models.SyncServers.find({}, (err, data) => {
        if (err) {
          winston.error(err);
          return callback('Unexpected error occured,please retry');
        }
        callback(err, data)
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
