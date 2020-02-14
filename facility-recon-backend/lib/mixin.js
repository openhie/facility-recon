/* eslint-disable no-restricted-syntax */
/* eslint-disable func-names */
require('./init');
const winston = require('winston');
const csv = require('fast-csv');
const async = require('async');
const moment = require('moment');
const config = require('./config');

module.exports = function () {
  return {
    /**
     *
     * @param {Array} tasks
     */
    getRoleByTasks(tasks, callback) {

    },
    getLatestFacilityRequest(extensions, type, username) {
      const facilityUpdateRequestURI = this.getCodesysteURI('facilityUpdateRequest');
      const facilityAddRequestURI = this.getCodesysteURI('facilityAddRequest');
      let requestURI;
      if (type === 'add') {
        requestURI = facilityAddRequestURI.uri;
      } else if (type === 'update') {
        requestURI = facilityUpdateRequestURI.uri;
      }
      let latestExt;
      let latestDate;
      for (const extension of extensions) {
        if (extension.url === requestURI) {
          let statusDate = extension.extension.find(ext => ext.url === 'statusDate');
          const userFound = extension.extension.find(ext => ext.url === 'username' && ext.valueString === username);
          if (username && !userFound) {
            statusDate = null;
          }
          if (!latestExt && statusDate) {
            latestExt = extension.extension;
            latestDate = statusDate.valueDate;
          } else if (statusDate) {
            statusDate = moment(statusDate.valueDate).format('Y-M-DTHH:mm:ssZ');
            latestDate = moment(latestDate).format('Y-M-DTHH:mm:ssZ');
            if (statusDate > latestDate) {
              latestExt = extension.extension;
              latestDate = statusDate.valueDate;
            }
          }
        }
      }
      return latestExt;
    },
    createCodeableConcept(codes, system) {
      const codeableConcept = [];
      codes.forEach((code) => {
        let codeSystem = system;
        if (code.system) {
          codeSystem = code.system;
        }
        const coding = [{
          system: codeSystem,
          code: code.code,
          display: code.display,
        }];
        codeableConcept.push({
          coding,
          text: code.display,
        });
      });
      return codeableConcept;
    },
    getCodesysteURI(codeSystemType) {
      const codeSystems = config.getConf('codeSystems');
      const codeSyst = codeSystems.find(code => code.name === codeSystemType);
      return codeSyst;
    },
    toTitleCase(str) {
      if (!str) {
        return str;
      }
      str = str.toLowerCase().split(' ').map(word => word.replace(word[0], word[0].toUpperCase())).join('');
      return str.toLowerCase();
    },
    toTitleCaseSpace(str) {
      if (!str) {
        return str;
      }
      str = str.toLowerCase();
      return str.replace(/[^\s]+/g, word => word.replace(/^./, first => first.toUpperCase()));
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

    validateCSV(filePath, headerMapping, callback) {
      const invalid = [];
      const ids = [];
      const levels = config.getConf('levels');
      levels.sort();
      levels.reverse();
      csv
        .fromPath(filePath, {
          headers: true,
        })
        .on('data', (data) => {
          let rowMarkedInvalid = false;
          let index = 0;
          async.eachSeries(levels, (level, nxtLevel) => {
            if (headerMapping[level] === null ||
              headerMapping[level] === 'null' ||
              headerMapping[level] === undefined ||
              !headerMapping[level]) {
              return nxtLevel();
            }
            if (data[headerMapping.code] == '') {
              populateData(headerMapping, data, 'Missing Facility ID', invalid);
              rowMarkedInvalid = true;
            }
            if (index === 0) {
              index += 1;
              if (ids.length == 0) {
                ids.push(data[headerMapping.code]);
              } else {
                const idExist = ids.find(id => id === data[headerMapping.code]);
                if (idExist) {
                  rowMarkedInvalid = true;
                  const reason = 'Duplicate ID';
                  populateData(headerMapping, data, reason, invalid);
                } else {
                  ids.push(data[headerMapping.code]);
                }
              }
            }
            if (!rowMarkedInvalid) {
              if (data[headerMapping[level]] === null ||
                data[headerMapping[level]] === undefined ||
                data[headerMapping[level]] === false ||
                !data[headerMapping[level]] ||
                data[headerMapping[level]] === '' ||
                !isNaN(headerMapping[level]) ||
                data[headerMapping[level]] == 0) {
                const reason = `${headerMapping[level]} is blank`;
                populateData(headerMapping, data, reason, invalid);
              } else {
                return nxtLevel();
              }
            }
          }, () => {
            if (data[headerMapping.facility] === null ||
              data[headerMapping.facility] === undefined ||
              data[headerMapping.facility] === false ||
              data[headerMapping.facility] === '' ||
              data[headerMapping.facility] == 0) {
              const reason = `${headerMapping.facility} is blank`;
              populateData(headerMapping, data, reason, invalid);
            }
          });
        })
        .on('end', () => callback(true, invalid));

      function populateData(headerMapping, data, reason, invalid) {
        const row = {};
        async.each(headerMapping, (header, nxtHeader) => {
          if (header == 'null') {
            return nxtHeader();
          }
          if (!data.hasOwnProperty(header)) {
            return nxtHeader();
          }
          row[header] = data[header];
          return nxtHeader();
        }, () => {
          invalid.push({
            data: row,
            reason,
          });
        });
      }
    },
  };
};