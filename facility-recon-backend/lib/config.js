/**
 * Copyright (c) 2017-present, Jembi Health Systems NPC.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */


const path = require('path');
const stdio = require('stdio');
const nconf = require('nconf');

nconf.env({
  separator: '__',
});

const ops = stdio.getopt({
  conf: {
    key: 'c',
    args: 1,
    description: 'The backend configuration to use. See config/default.json for an example.',
  },
  createIndexes: {
    description: 'Boolean to create mongo indexes on server startup',
  },
});

if (ops && ops.conf) {
  nconf.file(ops.conf);
} else {
  const environment = nconf.get('NODE_ENV') || 'development';
  nconf.file('environment', path.resolve(`${global.appRoot}/config`, `${environment}.json`));
  nconf.file('default', path.resolve(`${global.appRoot}/config`, 'default.json'));
  // nconf.file('custom', path.resolve(`${global.appRoot}/config`, 'default_multiple_instances.json'))
}

if (ops && ops.createIndexes) {
  nconf.set('createIndexes', true);
}

function getConf(key) {
  return nconf.get(key);
}

function setConf(key, value) {
  nconf.set(key, value);
}

setConf('DB_HOST', process.env.DB_HOST || 'localhost');
setConf('DB_NAME', process.env.DB_NAME || 'GOFR_NEW1');
setConf('DB_USER', process.env.DB_USER || '');
setConf('DB_PASSWORD', process.env.DB_PASSWORD || '');
setConf('DB_PORT', process.env.DB_PORT || '27017');
setConf('REDIS_HOST', process.env.REDIS_HOST || '127.0.0.1');
setConf('mCSD:url', process.env.HEARTH_URL || 'http://localhost:8081');
setConf('server:port', process.env.GOFR_PORT || getConf('server:port'));

exports.getConf = getConf;
exports.setConf = setConf;
