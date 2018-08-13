const winston = require('winston');
const async = require('async');
const request = require('request');
const URI = require('urijs');
const levenshtein = require('fast-levenshtein');
const redis = require('redis')
const redisClient = redis.createClient()
const geodist = require('geodist');
const _ = require('underscore');
const config = require('./config');
const mcsd = require('./mcsd')();

module.exports = function () {
  return {
    getJurisdictionScore(mcsdMOH, mcsdDATIM, mcsdMapped, mcsdDatimAll, mcsdMohAll, mohDB, datimDB, mohTopId, datimTopId, recoLevel, totalLevels, clientId, callback) {
      const scoreRequestId = `scoreResults${datimTopId}${clientId}`
      const scoreResults = [];
      const mapped = [];
      const matchBrokenCode = config.getConf('mapping:matchBrokenCode');
      const maxSuggestions = config.getConf('matchResults:maxSuggestions');
      if (mcsdDATIM.total == 0) {
        winston.error('No DATIM data found for this orgunit');
        return callback();
      }
      if (mcsdMOH.total == 0) {
        winston.error('No MOH data found');
        return callback();
      }
      let count = 0;
      var ignore = []
      var datimParentNames = {}
      var datimMappedParentIds = {}
      winston.info('Populating parents')
      var totalRecords = mcsdDATIM.entry.length
      for ( entry of mcsdDATIM.entry ) {
        if (entry.resource.hasOwnProperty('partOf')) {
          datimParentNames[entry.resource.id] = [];
          datimMappedParentIds[entry.resource.id] = [];
          var entityParent = entry.resource.partOf.reference;
          mcsd.getLocationParentsFromData(entityParent, mcsdDatimAll, 'all', (parents) => {
            // lets make sure that we use the mapped parent for comparing against MOH
            async.each(parents,(parent,parentCallback)=>{
              this.matchStatus(mcsdMapped, parent.id, (mapped) => {
                if (mapped) {
                  mapped.resource.identifier.find((identifier) => {
                    if (identifier.system == 'http://geoalign.datim.org/MOH') {
                      const mohParId = identifier.value.split('/').pop();
                      datimMappedParentIds[entry.resource.id].push(mohParId);
                    }
                  });
                  datimParentNames[entry.resource.id].push(parent.text);
                }
                else {
                  if(parent.id == datimTopId) {
                    datimMappedParentIds[entry.resource.id].push(mohTopId);
                  }
                  else {
                    datimMappedParentIds[entry.resource.id].push(parent.id);
                  }
                  datimParentNames[entry.resource.id].push(parent.text);
                }
                parentCallback()
              });
            },()=>{
              count++
              let percent = parseFloat((count*100/totalRecords).toFixed(2))
              const scoreRequestId = `scoreResults${datimTopId}${clientId}`
              scoreResData = JSON.stringify({status: '2/3 - Scanning DATIM Location Parents', error: null, percent: percent})
              redisClient.set(scoreRequestId,scoreResData)
              if(count === mcsdDATIM.entry.length) {
                winston.info('Done populating parents')
              }
            })
          });
        }
      }
      mcsdDatimAll = {}
      winston.info('Calculating scores now')
      count = 0
      var totalRecords = mcsdMOH.entry.length
      async.eachSeries(mcsdMOH.entry, (mohEntry, mohCallback) => {
        const database = config.getConf('mapping:dbPrefix') + datimTopId;
        // check if this MOH Orgid is mapped
        const mohId = mohEntry.resource.id;
        const mohIdentifier = URI(config.getConf('mCSD:url')).segment(datimTopId).segment('fhir').segment('Location').segment(mohId)
          .toString();
        var matchBroken = false
        if(mohEntry.resource.hasOwnProperty('tag')) {
          var matchBrokenTag = mohEntry.resource.tag.find((tag)=>{
          return tag.code == matchBrokenCode
          })
          if(matchBrokenTag) {
            matchBroken = true
          }
        }
        this.matchStatus(mcsdMapped, mohIdentifier, (match) => {
          // if this MOH Org is already mapped
          if (match) {
            const noMatchCode = config.getConf('mapping:noMatchCode');
            var entityParent = null;
            if (mohEntry.resource.hasOwnProperty('partOf')) {
              entityParent = mohEntry.resource.partOf.reference;
            }
            mcsd.getLocationParentsFromData(entityParent, mcsdMohAll, 'names', (mohParents) => {
            // mcsd.getLocationParentsFromDB('MOH',mohDB,entityParent,mohTopId,"names",(mohParents)=>{
              const thisRanking = {};
              thisRanking.moh = {
                name: mohEntry.resource.name,
                parents: mohParents,
                id: mohEntry.resource.id,
              };
              thisRanking.potentialMatches = {};
              thisRanking.exactMatch = {};
              let noMatch = null;
              if (match.resource.hasOwnProperty('tag')) {
                noMatch = match.resource.tag.find(tag => tag.code == noMatchCode);
              }
              // in case this is marked as no match then process next MOH
              if (noMatch) {
                thisRanking.moh.tag = 'noMatch';
                scoreResults.push(thisRanking);
                count++;
                let percent = parseFloat((count*100/totalRecords).toFixed(2))
                scoreResData = JSON.stringify({status: '3/3 - Running Automatching', error: null, percent: percent})
                redisClient.set(scoreRequestId,scoreResData)
                return mohCallback();
              }
              // if no macth then this is already marked as a match

              const flagCode = config.getConf('mapping:flagCode');
              if (match.resource.hasOwnProperty('tag')) {
                const flag = match.resource.tag.find(tag => tag.code == flagCode);
                if (flag) {
                  thisRanking.moh.tag = 'flagged';
                }
              }
              var matchInDatim = mcsdDATIM.entry.find((entry)=>{
                return entry.resource.id == match.resource.id
              })
              thisRanking.exactMatch = {
                name: matchInDatim.resource.name,
                parents: datimParentNames[match.resource.id],
                id: match.resource.id,
              };
              scoreResults.push(thisRanking);
              count++
              let percent = parseFloat((count*100/totalRecords).toFixed(2))
              scoreResData = JSON.stringify({status: '3/3 - Running Automatching', error: null, percent: percent})
              redisClient.set(scoreRequestId,scoreResData)
              return mohCallback();
            });
          } else { // if not mapped
            const mohName = mohEntry.resource.name;
            let mohParents = [];
            const mohParentNames = [];
            const mohParentIds = [];
            if (mohEntry.resource.hasOwnProperty('partOf')) {
              var entityParent = mohEntry.resource.partOf.reference;
              var mohParentReceived = new Promise((resolve, reject) => {
                mcsd.getLocationParentsFromData(entityParent, mcsdMohAll, 'all', (parents) => {
                  // mcsd.getLocationParentsFromDB('MOH',mohDB,entityParent,mohTopId,"all",(parents)=>{
                  mohParents = parents;
                  async.eachSeries(parents, (parent, nxtParent) => {
                    mohParentNames.push(
                      parent.text,
                    );
                    mohParentIds.push(
                      parent.id,
                    );
                    return nxtParent();
                  }, () => {
                    resolve();
                  });
                });
              });
            } else {
              var mohParentReceived = Promise.resolve([]);
            }

            mohParentReceived.then(() => {
              const thisRanking = {};
              thisRanking.moh = {
                name: mohName,
                parents: mohParentNames,
                id: mohEntry.resource.id,
              };
              thisRanking.potentialMatches = {};
              thisRanking.exactMatch = {};
              const datimPromises = [];
              var datimFiltered = mcsdDATIM.entry.filter((entry)=>{
                return datimMappedParentIds[entry.resource.id].includes(mohParentIds[0])
              })
              async.each(datimFiltered, (datimEntry, datimCallback) => {
                const id = datimEntry.resource.id;
                const database = config.getConf('mapping:dbPrefix') + datimTopId;
                var ignoreThis = ignore.find((toIgnore)=>{
                  return toIgnore == id
                })
                if(ignoreThis) {
                  return datimCallback()
                }
                // check if this is already mapped
                this.matchStatus(mcsdMapped, id, (mapped) => {
                  if (mapped) {
                    ignore.push(datimEntry.resource.id)
                    return datimCallback();
                  }
                  const datimName = datimEntry.resource.name;
                  const datimId = datimEntry.resource.id

                  lev = levenshtein.get(datimName.toLowerCase(), mohName.toLowerCase());
                  if (lev == 0 && !matchBroken) {
                    ignore.push(datimEntry.resource.id)
                    thisRanking.exactMatch = {
                      name: datimName,
                      parents: datimParentNames[datimId],
                      id: datimEntry.resource.id,
                    };
                    thisRanking.potentialMatches = {};
                    mcsd.saveMatch(mohId, datimEntry.resource.id, datimTopId, recoLevel, totalLevels, 'match', () => {

                    });
                    // we will need to break here and start processing nxt MOH
                    return datimCallback();
                  }
                  if (lev == 0 && matchBroken) {
                    thisRanking.potentialMatches = {'0': [{
                      name: datimName,
                      parents: datimParentNames[datimId],
                      id: datimEntry.resource.id,
                    }]};
                    return datimCallback();
                  }
                  if (Object.keys(thisRanking.exactMatch).length == 0) {
                    if (thisRanking.potentialMatches.hasOwnProperty(lev) || Object.keys(thisRanking.potentialMatches).length < maxSuggestions) {
                      if (!thisRanking.potentialMatches.hasOwnProperty(lev)) {
                        thisRanking.potentialMatches[lev] = [];
                      }
                      thisRanking.potentialMatches[lev].push({
                        name: datimName,
                        parents: datimParentNames[datimId],
                        id: datimEntry.resource.id,
                      });
                    } else {
                      const existingLev = Object.keys(thisRanking.potentialMatches);
                      const max = _.max(existingLev);
                      if (lev < max) {
                        delete thisRanking.potentialMatches[max];
                        thisRanking.potentialMatches[lev] = [];
                        thisRanking.potentialMatches[lev].push({
                          name: datimName,
                          parents: datimParentNames[datimId],
                          id: datimEntry.resource.id,
                        });
                      }
                    }
                  }
                  return datimCallback();
                });
              }, () => {
                scoreResults.push(thisRanking);
                count++
                let percent = parseFloat((count*100/totalRecords).toFixed(2))
                scoreResData = JSON.stringify({status: '3/3 - Running Automatching', error: null, percent: percent})
                redisClient.set(scoreRequestId,scoreResData)
                winston.info(`${count}/${mcsdMOH.entry.length}`);
                return mohCallback();
              });
            }).catch((err) => {
              winston.error(err);
            });
          }
        });
      }, () => {
        scoreResData = JSON.stringify({status: 'Done', error: null, percent: 100})
        redisClient.set(scoreRequestId,scoreResData)
        callback(scoreResults)
      });
    },

    getBuildingsScores(mcsdMOH, mcsdDATIM, mcsdMapped, mcsdDatimAll, mcsdMohAll, mohDB, datimDB, mohTopId, datimTopId, recoLevel, totalLevels, clientId, callback) {
      const scoreRequestId = `scoreResults${datimTopId}${clientId}`
      var scoreResults = [];
      var mapped = [];
      const matchBrokenCode = config.getConf('mapping:matchBrokenCode');
      var maxSuggestions = config.getConf('matchResults:maxSuggestions');
      if (mcsdDATIM.total == 0) {
        winston.error('No DATIM data found for this orgunit');
        return callback();
      }
      if (mcsdMOH.total == 0) {
        winston.error('No MOH data found');
        return callback();
      }
      var counter = 0;
      var ignore = []
      var promises = [];
      var count = 0;
      var mohPromises = [];
      var datimParentNames = {}
      var datimMappedParentIds = {}
      const datimLevelMappingStatus = {}
      var count = 0
      winston.info('Populating parents')
      var totalRecords = mcsdDATIM.entry.length
      for ( entry of mcsdDATIM.entry ) {
        datimLevelMappingStatus[entry.resource.id] = []
        this.matchStatus(mcsdMapped, entry.resource.id, (mapped) => {
          if (mapped) {
            datimLevelMappingStatus[entry.resource.id] = true
          }
          else {
            datimLevelMappingStatus[entry.resource.id] = false
          }
        })
        if (entry.resource.hasOwnProperty('partOf')) {
          datimParentNames[entry.resource.id] = [];
          datimMappedParentIds[entry.resource.id] = [];
          var entityParent = entry.resource.partOf.reference;
          mcsd.getLocationParentsFromData(entityParent, mcsdDatimAll, 'all', (parents) => {
            // lets make sure that we use the mapped parent for comparing against MOH
            async.each(parents,(parent,parentCallback)=>{
              this.matchStatus(mcsdMapped, parent.id, (mapped) => {
                if (mapped) {
                  const mappedPar = mapped.resource.identifier.find((identifier) => {
                    if (identifier.system == 'http://geoalign.datim.org/MOH') {
                      const mohParId = identifier.value.split('/').pop();
                      datimMappedParentIds[entry.resource.id].push(mohParId);
                    }
                  });
                  datimParentNames[entry.resource.id].push(parent.text);
                }
                else {
                  datimMappedParentIds[entry.resource.id].push(parent.id);
                  datimParentNames[entry.resource.id].push(parent.text);
                }
                parentCallback()
              })
            },()=>{
              count++
              const scoreRequestId = `scoreResults${datimTopId}${clientId}`
              let percent = parseFloat((count*100/totalRecords).toFixed(2))
              scoreResData = JSON.stringify({status: '2/3 - Scanning DATIM Location Parents', error: null, percent: percent})
              redisClient.set(scoreRequestId,scoreResData)
              if(count === mcsdDATIM.entry.length) {
                winston.info('Done populating parents')
              }
            })
          })
        }
      }
      //clear mcsdDatimAll
      mcsdDatimAll = {}
      winston.info('Calculating scores now')
      count = 0
      var totalRecords = mcsdMOH.entry.length
      async.eachSeries(mcsdMOH.entry, (mohEntry, mohCallback) => {
        const database = config.getConf('mapping:dbPrefix') + datimTopId;
        // check if this MOH Orgid is mapped
        const mohId = mohEntry.resource.id;
        const mohIdentifiers = mohEntry.resource.identifier;
        let mohLatitude = null;
        let mohLongitude = null;
        if (mohEntry.resource.hasOwnProperty('position')) {
          mohLatitude = mohEntry.resource.position.latitude;
          mohLongitude = mohEntry.resource.position.longitude;
        }
        const mohIdentifier = URI(config.getConf('mCSD:url')).segment(datimTopId).segment('fhir').segment('Location').segment(mohId)
          .toString();

        var matchBroken = false
        if(mohEntry.resource.hasOwnProperty('tag')) {
          var matchBrokenTag = mohEntry.resource.tag.find((tag)=>{
          return tag.code == matchBrokenCode
          })
          if(matchBrokenTag) {
            matchBroken = true
          }
        }
        this.matchStatus(mcsdMapped, mohIdentifier, (match) => {
          // if this MOH Org is already mapped
          const thisRanking = {};
          if (match) {
            const noMatchCode = config.getConf('mapping:noMatchCode');
            var entityParent = null;
            if (mohEntry.resource.hasOwnProperty('partOf')) {
              entityParent = mohEntry.resource.partOf.reference;
            }
            mcsd.getLocationParentsFromData(entityParent, mcsdMohAll, 'names', (mohParents) => {
              const ident = mohEntry.resource.identifier.find(identifier => identifier.system == 'http://geoalign.datim.org/MOH');

              let mohBuildingId = null;
              if (ident) {
                mohBuildingId = ident.value;
              }
              thisRanking.moh = {
                name: mohEntry.resource.name,
                parents: mohParents,
                lat: mohLatitude,
                long: mohLongitude,
                id: mohBuildingId,
              };
              thisRanking.potentialMatches = {};
              thisRanking.exactMatch = {};
              let noMatch = null;
              if (match.resource.hasOwnProperty('tag')) {
                noMatch = match.resource.tag.find(tag => tag.code == noMatchCode);
              }
              // in case this is marked as no match then process next MOH
              if (noMatch) {
                thisRanking.moh.tag = 'noMatch';
                scoreResults.push(thisRanking);
                count++
                let percent = parseFloat((count*100/totalRecords).toFixed(2))
                scoreResData = JSON.stringify({status: '3/3 - Running Automatching', error: null, percent: percent})
                redisClient.set(scoreRequestId,scoreResData)
                return mohCallback();
              }

              //if this is flagged then process next MOH
              const flagCode = config.getConf('mapping:flagCode');
              if (match.resource.hasOwnProperty('tag')) {
                const flag = match.resource.tag.find(tag => tag.code == flagCode);
                if (flag) {
                  thisRanking.moh.tag = 'flagged';
                }
              }

              var matchInDatim = mcsdDATIM.entry.find((entry) => {
                return entry.resource.id == match.resource.id
              })

              thisRanking.exactMatch = {
                name: matchInDatim.resource.name,
                parents: datimParentNames[match.resource.id],
                id: match.resource.id,
              };
              scoreResults.push(thisRanking);
              count++
              let percent = parseFloat((count*100/totalRecords).toFixed(2))
              scoreResData = JSON.stringify({status: '3/3 - Running Automatching', error: null, percent: percent})
              redisClient.set(scoreRequestId,scoreResData)
              return mohCallback();
            });
        } else { // if not mapped
            const mohName = mohEntry.resource.name;
            let mohParents = [];
            const mohParentNames = [];
            const mohParentIds = [];
            if (mohEntry.resource.hasOwnProperty('partOf')) {
              var entityParent = mohEntry.resource.partOf.reference;
              var mohParentReceived = new Promise((resolve, reject) => {
                mcsd.getLocationParentsFromData(entityParent, mcsdMohAll, 'all', (parents) => {
                  mohParents = parents;
                  async.eachSeries(parents, (parent, nxtParent) => {
                    mohParentNames.push(
                      parent.text,
                    );
                    mohParentIds.push(
                      parent.id
                    )
                    return nxtParent();
                  }, () => {
                    resolve();
                  });
                });
              });
            } else {
              var mohParentReceived = Promise.resolve([]);
            }
            mohParentReceived.then(() => {
              const thisRanking = {};
              let mohBuildingId = null;
              const ident = mohEntry.resource.identifier.find(identifier => identifier.system == 'http://geoalign.datim.org/MOH');
              if (ident) {
                mohBuildingId = ident.value;
              }
              thisRanking.moh = {
                name: mohName,
                parents: mohParentNames,
                lat: mohLatitude,
                long: mohLongitude,
                id: mohBuildingId,
              };
              thisRanking.potentialMatches = {};
              thisRanking.exactMatch = {};
              const datimPromises = [];
              var datimFiltered = mcsdDATIM.entry.filter((entry)=>{
                //return mohParentIds[0] == datimMappedParentIds[entry.resource.id][0]
                // in case there are different levels of parents (only DATIM can have more levels due to import)
                return datimMappedParentIds[entry.resource.id].includes(mohParentIds[0])
              })
              async.each(datimFiltered, (datimEntry, datimCallback) => {
                const database = config.getConf('mapping:dbPrefix') + datimTopId;
                const id = datimEntry.resource.id;
                const datimIdentifiers = datimEntry.resource.identifier;
                //if this datim is already mapped then skip it
                var ignoreThis = ignore.find((toIgnore)=>{
                  return toIgnore == id
                })
                if(ignoreThis) {
                  return datimCallback()
                }
                //if this is already mapped then ignore
                if (datimLevelMappingStatus[id]) {
                  return datimCallback();
                }
                
                const datimName = datimEntry.resource.name;
                let datimLatitude = null;
                let datimLongitude = null;
                if (datimEntry.resource.hasOwnProperty('position')) {
                  datimLatitude = datimEntry.resource.position.latitude;
                  datimLongitude = datimEntry.resource.position.longitude;
                }
                if (datimLatitude && datimLongitude) {
                  var dist = geodist({ datimLatitude, datimLongitude }, { mohLatitude, mohLongitude }, { exact: false, unit: 'miles' });
                }
                datimIdPromises = [];

                // check if IDS are the same and mark as exact match
                const matchingIdent = datimIdentifiers.find(datIdent => mohIdentifiers.find(mohIdent => datIdent.value == mohIdent.value));
                if (matchingIdent && !matchBroken) {
                  ignore.push(datimEntry.resource.id)
                  thisRanking.exactMatch = {
                    name: datimName,
                    parents: datimParentNames[datimEntry.resource.id],
                    lat: datimLatitude,
                    long: datimLongitude,
                    geoDistance: dist,
                    id: datimEntry.resource.id,
                  };
                  thisRanking.potentialMatches = {};
                  mcsd.saveMatch(mohId, datimEntry.resource.id, datimTopId, recoLevel, totalLevels, 'match', () => {

                  });
                  return datimCallback();
                }
                else if (matchingIdent && matchBroken) {
                  thisRanking.potentialMatches = {'0': [{
                    name: datimName,
                    parents: datimParentNames[datimEntry.resource.id],
                    lat: datimLatitude,
                    long: datimLongitude,
                    geoDistance: dist,
                    id: datimEntry.resource.id,
                  }]};
                  return datimCallback();
                }

                if (!matchBroken) {
                  const dictionary = config.getConf("dictionary")
                  for (let abbr in dictionary) {
                    const replaced = mohName.replace(abbr, dictionary[abbr])
                    if (replaced.toLowerCase() === datimName.toLowerCase()) {
                      ignore.push(datimEntry.resource.id)
                      thisRanking.exactMatch = {
                        name: datimName,
                        parents: datimParentNames[datimEntry.resource.id],
                        lat: datimLatitude,
                        long: datimLongitude,
                        geoDistance: dist,
                        id: datimEntry.resource.id,
                      };
                      thisRanking.potentialMatches = {};
                      mcsd.saveMatch(mohId, datimEntry.resource.id, datimTopId, recoLevel, totalLevels, 'match', () => {
                      });
                      return datimCallback();
                    }
                  }
                }

                lev = levenshtein.get(datimName.toLowerCase(), mohName.toLowerCase());
                if (lev == 0 && !matchBroken) {
                  ignore.push(datimEntry.resource.id)
                  thisRanking.exactMatch = {
                    name: datimName,
                    parents: datimParentNames[datimEntry.resource.id],
                    lat: datimLatitude,
                    long: datimLongitude,
                    geoDistance: dist,
                    id: datimEntry.resource.id,
                  };
                  thisRanking.potentialMatches = {};
                  mcsd.saveMatch(mohId, datimEntry.resource.id, datimTopId, recoLevel, totalLevels, 'match', () => {

                  });
                  return datimCallback();
                }
                else if (lev == 0 && matchBroken) {
                  thisRanking.potentialMatches = {'0': [{
                    name: datimName,
                    parents: datimParentNames[datimEntry.resource.id],
                    lat: datimLatitude,
                    long: datimLongitude,
                    geoDistance: dist,
                    id: datimEntry.resource.id,
                  }]};
                  return datimCallback();
                }
                if (Object.keys(thisRanking.exactMatch).length == 0) {
                  if (thisRanking.potentialMatches.hasOwnProperty(lev) || Object.keys(thisRanking.potentialMatches).length < maxSuggestions) {
                    if (!thisRanking.potentialMatches.hasOwnProperty(lev)) {
                      thisRanking.potentialMatches[lev] = [];
                    }
                    thisRanking.potentialMatches[lev].push({
                      name: datimName,
                      parents: datimParentNames[datimEntry.resource.id],
                      lat: datimLatitude,
                      long: datimLongitude,
                      geoDistance: dist,
                      id: datimEntry.resource.id,
                    });
                  } else {
                    const existingLev = Object.keys(thisRanking.potentialMatches);
                    const max = _.max(existingLev);
                    if (lev < max) {
                      delete thisRanking.potentialMatches[max];
                      thisRanking.potentialMatches[lev] = [];
                      thisRanking.potentialMatches[lev].push({
                        name: datimName,
                        parents: datimParentNames[datimEntry.resource.id],
                        lat: datimLatitude,
                        long: datimLongitude,
                        geoDistance: dist,
                        id: datimEntry.resource.id,
                      });
                    }
                  }
                }
                return datimCallback();
              }, () => {
                scoreResults.push(thisRanking);
                count++;
                let percent = parseFloat((count*100/totalRecords).toFixed(2))
                scoreResData = JSON.stringify({status: '3/3 - Running Automatching', error: null, percent: percent})
                redisClient.set(scoreRequestId,scoreResData)
                return mohCallback();
              });
            }).catch((err) => {
              winston.error(err);
            });
          }
        });
      }, () => {
        scoreResData = JSON.stringify({status: 'Done', error: null, percent: 100})
        redisClient.set(scoreRequestId,scoreResData)
        callback(scoreResults)
      });
    },
    matchStatus(mcsdMapped, id, callback) {
      if (mcsdMapped.length === 0 || !mcsdMapped) {
        return callback();
      }
      const status = mcsdMapped.entry.find(entry => entry.resource.id === id || (entry.resource.hasOwnProperty('identifier') && entry.resource.identifier.find(identifier => identifier.value === id)));
      return callback(status);
    },
    getUnmatched(mcsdDatimAll, mcsdDatim, topOrgId, callback) {
      const database = config.getConf('mapping:dbPrefix') + topOrgId;
      const unmatched = [];
      mcsd.getLocations(database, (locations) => {
        let parentCache = {}
        async.each(mcsdDatim.entry, (datimEntry, datimCallback) => {
          if (locations.entry.find( entry => entry.resource.id === datimEntry.resource.id ) === undefined) {
            const name = datimEntry.resource.name;
            const id = datimEntry.resource.id;
            let entityParent = null;
            if (datimEntry.resource.hasOwnProperty('partOf')) {
              entityParent = datimEntry.resource.partOf.reference;
            }
            if ( !parentCache[entityParent] ) {
              parentCache[entityParent] = []
              mcsd.getLocationParentsFromData(entityParent, mcsdDatimAll, 'names', (datimParents) => {
                parentCache[entityParent] = datimParents
                unmatched.push({
                  id,
                  name,
                  parents: parentCache[entityParent]
                });
                return datimCallback();
              });
            } else {
              unmatched.push({
                id,
                name,
                parents: parentCache[entityParent]
              });
              return datimCallback();
            }
          } else {
            return datimCallback();
          }
        }, () => {
          callback(unmatched);
        });
      })
    },
    getMappingStatus (mohLocations,datimLocations,mappedLocations,datimTopId,clientId,callback) {
      const noMatchCode = config.getConf('mapping:noMatchCode');
      const flagCode = config.getConf('mapping:flagCode');
      var mappingStatus = {}
      mappingStatus.mapped = []
      mappingStatus.notMapped = []
      mappingStatus.flagged = []
      mappingStatus.noMatch = []
      let count = 0
      async.each(mohLocations.entry,(entry,mohCallback)=>{
        const ident = entry.resource.identifier.find(identifier => identifier.system == 'http://geoalign.datim.org/MOH');
        let mohUploadedId = null;
        if (ident) {
          mohUploadedId = ident.value;
        }
        const mohId = entry.resource.id;
        const mohIdentifier = URI(config.getConf('mCSD:url')).segment(datimTopId).segment('fhir').segment('Location').segment(mohId).toString()
        this.matchStatus(mappedLocations, mohIdentifier, (mapped) => {
          if (mapped) {
            var datimEntry = datimLocations.entry.find((datimEntry)=>{
              return datimEntry.resource.id === mapped.resource.id
            })
            let nomatch,flagged
            if (mapped.resource.hasOwnProperty('tag')) {
              nomatch = mapped.resource.tag.find((tag)=>{
                return tag.code === noMatchCode
              })
            }
            if (mapped.resource.hasOwnProperty('tag')) {
              flagged = mapped.resource.tag.find((tag)=>{
                return tag.code === flagCode
              })
            }
            if (flagged) {
              mappingStatus.flagged.push({
                mohName: entry.resource.name,
                mohId: mohUploadedId,
                datimName: datimEntry.resource.name,
                datimId: datimEntry.resource.id
              })
            } else if (nomatch) {
              mappingStatus.noMatch.push({
                mohName: entry.resource.name,
                mohId: mohUploadedId
              })
            } else {
              mappingStatus.mapped.push({
                mohName: entry.resource.name,
                mohId: mohUploadedId,
                datimName: datimEntry.resource.name,
                datimId: datimEntry.resource.id
              })
            }
            count++
            let statusRequestId = `mappingStatus${datimTopId}${clientId}`
            let percent = parseFloat((count * 100 / mohLocations.entry.length).toFixed(2))
            statusResData = JSON.stringify({status: '2/2 - Loading DATIM and MOH Data', error: null, percent: percent})
            redisClient.set(statusRequestId,statusResData)
            mohCallback()
          }
          else {
            mappingStatus.notMapped.push({
              mohName: entry.resource.name,
              mohId: mohUploadedId
            })
            count++
            let statusRequestId = `mappingStatus${datimTopId}${clientId}`
            let percent = parseFloat((count * 100 / mohLocations.entry.length).toFixed(2))
            statusResData = JSON.stringify({status: '2/2 - Loading DATIM and MOH Data', error: null, percent: percent})
            redisClient.set(statusRequestId,statusResData)
            mohCallback()
          }
        })
      },()=>{
        let statusRequestId = `mappingStatus${datimTopId}${clientId}`
        statusResData = JSON.stringify({status: 'Done', error: null, percent: 100})
        redisClient.set(statusRequestId,statusResData)
        return callback(mappingStatus)
      })
    }

  };
};
