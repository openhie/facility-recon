/* eslint-disable func-names */
require('./init');
const winston = require('winston');

module.exports = function () {
  return {
    toTitleCase(str) {
      return str.toLowerCase().split(' ').map(word => word.replace(word[0], word[0].toUpperCase())).join('');
    },
    getIdFromIdentifiers(identifier, system) {
      if (!Array.isArray(identifier)) {
        winston.error('Identifier submitted is not an array');
        return false;
      }
      const matchedIdentifier = identifier.find(identifier => identifier.system === system);
      let matchedId;
      if (matchedIdentifier) {
        matchedId = matchedIdentifier.value.split('/').pop();
      }
      return matchedId;
    },
  };
};
