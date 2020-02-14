const path = require('path');

global.appRoot = path.join(path.resolve(__dirname), '..');

const winston = require('winston');
const config = require('./config');

winston.remove(winston.transports.Console);
winston.add(winston.transports.Console, {
  colorize: true,
  timestamp: true,
  level: config.getConf('logger:level'),
});
