const mongoose = require('mongoose');
const config = require('./config');

const mongoUser = config.getConf('DB_USER');
const mongoPasswd = config.getConf('DB_PASSWORD');
const mongoHost = config.getConf('DB_HOST');
const mongoPort = config.getConf('DB_PORT');
const database = config.getConf('DB_NAME');

const options = {
  useNewUrlParser: true,
  keepAlive: true,
  autoReconnect: true,
  reconnectTries: Number.MAX_VALUE,
  poolSize: 10,
};
let uri;
if (mongoUser && mongoPasswd) {
  uri = `mongodb://${mongoUser}:${mongoPasswd}@${mongoHost}:${mongoPort}/${database}`;
} else {
  uri = `mongodb://${mongoHost}:${mongoPort}/${database}`;
}
mongoose.connect(uri, options);
mongoose.set('useCreateIndex', true);
mongoose.set('useFindAndModify', false);