'use strict'

const path = require('path')
global.appRoot = path.join(path.resolve(__dirname), '..')

const config = require('./config')

const winston = require('winston')
winston.remove(winston.transports.Console)
winston.add(winston.transports.Console, {
  colorize: true,
  timestamp: true,
  level: config.getConf('logger:level')
})
