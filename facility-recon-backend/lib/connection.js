const mongoose = require('mongoose');
const config = require('./config');

const database = config.getConf('mCSD:database');
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
/* mongoose.connect(uri, {
  useNewUrlParser: true
});
*/