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
    createIdHierarchy(mcsdSource, parentId) {
      const sourceEntry = mcsdSource.entry.find(entry => entry.resource.id === parentId);
      const idHierarchy = {
        id: parentId,
        name: parentId,
        children: [],
      };
      if (sourceEntry) {
        for (const identifier of sourceEntry.resource.identifier) {
          if (identifier.value === parentId) {
            continue;
          }
          idHierarchy.children.push({
            id: identifier.value,
            name: identifier.value,
          });
        }
      }
      return [idHierarchy];
    },
    haveIdInCommon(identifiers1, identifiers2) {
      if (!Array.isArray(identifiers1) || !Array.isArray(identifiers2)) {
        return false;
      }
      const commonID = identifiers1.find(identifier1 => identifiers2.find(identifier2 => identifier2.value === identifier1.value));
      if (commonID) {
        return true;
      }
      return false;
    },
  };
};
