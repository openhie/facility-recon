
require('./init');
const request = require('request');
const URI = require('urijs');
const urlTool = require('url');
const uuid5 = require('uuid/v5');
const winston = require('winston');
const async = require('async');
const csv = require('fast-csv');
const mongoBackup = require('mongodb-backup')
const mongoRestore = require('mongodb-restore')
const mongoose = require('mongoose')
const fsFinder = require('fs-finder')
const fs = require('fs');
const moment = require('moment')
const cache = require('memory-cache');
const config = require('./config');

module.exports = function () {
  return {
    getLocations(database, callback) {
      var url = URI(config.getConf('mCSD:url')).segment(database).segment('fhir').segment('Location') + '?_count=37000'
        .toString();
      const locations = {};
      locations.entry = [];
      async.doWhilst(
        (callback) => {
          const options = {
            url,
          };
          url = false;
          request.get(options, (err, res, body) => {
            //winston.error('responded')
            body = JSON.parse(body);
            const next = body.link.find(link => link.relation == 'next');
            if (next) {
              url = next.url;
            }
            locations.entry = locations.entry.concat(body.entry);
            return callback(false, url);
          });
        },
        () => url != false,
        () => {
          callback(locations);
        },
      );
    },

    getLocationByID(database, id, getCached, callback) {
      if (id) var url = `${URI(config.getConf('mCSD:url')).segment(database).segment('fhir').segment('Location')}?_id=${id.toString()}`;
      else {
        var url = URI(config.getConf('mCSD:url')).segment(database).segment('fhir').segment('Location')
          .toString();
      }
      const locations = {};
      locations.entry = [];
      async.doWhilst(
        (callback) => {
          const options = {
            url,
          };
          url = false;
          const cachedData = cache.get(`getLocationByID${url}`);
          if (cachedData && getCached) {
            return callback(cachedData);
          }
          request.get(options, (err, res, body) => {
            const cacheData = JSON.parse(body);
            const next = cacheData.link.find(link => link.relation == 'next');
            if (next) {
              url = next.url;
            }
            cache.put(`getLocationByID${url}`, cacheData, 120 * 1000);
            locations.entry = locations.entry.concat(cacheData.entry);
            return callback(false, url);
          });
        },
        () => url != false,
        () => {
          callback(locations);
        },
      );
    },

    getLocationChildren(database, topOrgId, callback) {
      const url = URI(config.getConf('mCSD:url')).segment(database).segment('fhir').segment('Location')
        .segment(topOrgId)
        .segment('$hierarchy')
        + '?_count=100'
        .toString();
      var url_old = url
      const options = {
        url,
      };
      request.get(options, (err, res, body1) => {
        const url = `${URI(config.getConf('mCSD:url')).segment(database).segment('fhir').segment('Location')}?_id=${topOrgId.toString()}`;
        const options = {
          url,
        };
        request.get(options, (err, res, body2) => {
          body1 = JSON.parse(body1);
          body2 = JSON.parse(body2);
          body1.entry = body1.entry.concat(body2.entry);
          callback(body1);
        });
      });
    },

    getLocationParentsFromDB(source, database, entityParent, topOrg, details, callback) {
      const parents = [];
      if (entityParent == null
        || entityParent == false
        || entityParent == undefined
      ) {
        return callback(parents);
      }
      const sourceEntityID = entityParent;
      const me = this;
      function getPar(entityParent, callback) {
        if (entityParent == null || entityParent == false || entityParent == undefined) {
          winston.error(`Error ${entityParent}`);
          winston.error(JSON.stringify(mcsdEntry));
          return callback(parents);
        }

        const splParent = entityParent.split('/');
        entityParent = splParent[(splParent.length - 1)];
        const url = `${URI(config.getConf('mCSD:url')).segment(database).segment('fhir').segment('Location')}?_id=${entityParent.toString()}`;

        const options = {
          url,
        };

        const cachedData = cache.get(url);
        if (cachedData) {
          var entityParent = cachedData.entityParent;
          if (details == 'all') {
            parents.push({
              text: cachedData.text, id: cachedData.id, lat: cachedData.lat, long: cachedData.long,
            });
          } else if (details == 'id') parents.push(cachedData.id);
          else if (details == 'names') parents.push(cachedData.text);
          else winston.error('parent details (either id,names or all) to be returned not specified');

          // if this is a topOrg then end here,we dont need to fetch the upper org which is continent i.e Africa
          if (entityParent && topOrg && entityParent.endsWith(topOrg)) {
            me.getLocationByID(database, topOrg, false, (loc) => {
              if (details == 'all') {
                parents.push({
                  text: loc.entry[0].resource.name, id: topOrg, lat: cachedData.lat, long: cachedData.long,
                });
              } else if (details == 'id') parents.push(loc.entry[0].resource.id);
              else if (details == 'names') parents.push(loc.entry[0].resource.name);
              return callback(parents);
            });
          }
          // if this is a topOrg then end here,we dont need to fetch the upper org which is continent i.e Africa
          else if (topOrg && sourceEntityID.endsWith(topOrg)) {
            return callback(parents);
          } else if (entityParent) {
            getPar(entityParent, (parents) => {
              callback(parents);
            });
          } else return callback(parents);
        } else {
          request.get(options, (err, res, body) => {
            body = JSON.parse(body);
            let long = null;
            let lat = null;
            if (body.entry[0].resource.hasOwnProperty('position')) {
              long = body.entry[0].resource.position.longitude;
              lat = body.entry[0].resource.position.latitude;
            }
            var entityParent = null;
            if (body.entry[0].resource.hasOwnProperty('partOf')) entityParent = body.entry[0].resource.partOf.reference;

            const cacheData = {
              text: body.entry[0].resource.name, id: body.entry[0].resource.id, lat, long, entityParent,
            };
            cache.put(url, cacheData, 120 * 1000);
            if (details == 'all') {
              parents.push({
                text: body.entry[0].resource.name, id: body.entry[0].resource.id, lat, long,
              });
            } else if (details == 'id') parents.push(body.entry[0].resource.id);
            else if (details == 'names') parents.push(body.entry[0].resource.name);
            else winston.error('parent details (either id,names or all) to be returned not specified');

            // stop after we reach the topOrg which is the country
            const entityID = body.entry[0].resource.id;
            // if this is a topOrg then end here,we dont need to fetch the upper org which is continent i.e Africa
            if (entityParent && topOrg && entityParent.endsWith(topOrg)) {
              me.getLocationByID(database, topOrg, false, (loc) => {
                if (details == 'all') {
                  parents.push({
                    text: loc.entry[0].resource.name, id: topOrg, lat, long,
                  });
                } else if (details == 'id') parents.push(loc.entry[0].resource.id);
                else if (details == 'names') parents.push(loc.entry[0].resource.name);
                return callback(parents);
              });
            }

            // if this is a topOrg then end here,we dont need to fetch the upper org which is continent i.e Africa
            else if (topOrg && sourceEntityID.endsWith(topOrg)) {
              return callback(parents);
            } else if (body.entry[0].resource.hasOwnProperty('partOf')
                && body.entry[0].resource.partOf.reference != false
                && body.entry[0].resource.partOf.reference != null
                && body.entry[0].resource.partOf.reference != undefined) {
              var entityParent = body.entry[0].resource.partOf.reference;
              getPar(entityParent, (parents) => {
                callback(parents);
              });
            } else callback(parents);
          });
        }
      }
      getPar(entityParent, parents => callback(parents));
    },

    /*
    This function finds parents of an entity from passed mCSD data
    */
    getLocationParentsFromData(entityParent, mcsd, details, callback) {
      const parents = [];
      function filter(entityParent, callback) {
        const splParent = entityParent.split('/');
        entityParent = splParent[(splParent.length - 1)];

        const entry = mcsd.entry.find(entry => entry.resource.id == entityParent);

        if (entry) {
          let long = null;
          let lat = null;
          if (entry.resource.hasOwnProperty('position')) {
            long = entry.resource.position.longitude;
            lat = entry.resource.position.latitude;
          }
          const oldEntityParent = entityParent;
          var entityParent = null;
          if (entry.resource.hasOwnProperty('partOf')) entityParent = entry.resource.partOf.reference;

          if (details == 'all') {
            parents.push({
              text: entry.resource.name, id: entry.resource.id, lat, long,
            });
          } else if (details == 'id') parents.push(entry.resource.id);
          else if (details == 'names') parents.push(entry.resource.name);
          else winston.error('parent details (either id,names or all) to be returned not specified');

          if (entry.resource.hasOwnProperty('partOf')
            && entry.resource.partOf.reference != false
            && entry.resource.partOf.reference != null
            && entry.resource.partOf.reference != undefined) {
            entityParent = entry.resource.partOf.reference;
            filter(entityParent, parents => callback(parents));
          } else return callback(parents);
        } else return callback(parents);
      }

      filter(entityParent, parents => callback(parents));
    },

    /*
    if totalLevels is set then this functions returns all locations from level 1 to level totalLevels
    if levelNumber is set then it returns locations at level levelNumber only
    if buildings is set then it returns all buildings
    buildings argument accepts a building level
    */
    filterLocations(mcsd, topOrgId, totalLevels, levelNumber, buildings, callback) {
      // holds all entities for a maximum of x Levels defined by the variable totalLevels i.e all entities at level 1,2 and 3
      const mcsdTotalLevels = {};
      // holds all entities for just one level,specified by variable levelNumber i.e all entities at level 1 or at level 2
      const mcsdlevelNumber = {};
      // holds buildings only
      const mcsdBuildings = {};
      mcsdTotalLevels.entry = [];
      mcsdlevelNumber.entry = [];
      mcsdBuildings.entry = [];
      if (!mcsd.hasOwnProperty('entry') || mcsd.entry.length == 0) {
        return callback(mcsdTotalLevels, mcsdlevelNumber, mcsdBuildings);
      }
      const entry = mcsd.entry.find(entry => entry.resource.id == topOrgId);
      if(!entry) {
        return callback(mcsdTotalLevels, mcsdlevelNumber, mcsdBuildings);
      }
      if (levelNumber == 1) {
        mcsdlevelNumber.entry = mcsdlevelNumber.entry.concat(entry);
      }
      if (totalLevels) {
        mcsdTotalLevels.entry = mcsdTotalLevels.entry.concat(entry);
      }
      const building = entry.resource.physicalType.coding.find(coding => coding.code == 'building');

      if (building) {
        mcsdBuildings.entry = mcsdBuildings.entry.concat(entry);
      }

      function filter(id, callback) {
        const res = mcsd.entry.filter((entry) => {
          if (entry.resource.hasOwnProperty('partOf')) {
            return entry.resource.partOf.reference.endsWith(id);
          }
        });
        return callback(res);
      }

      let totalLoops = 0;
      if (totalLevels >= levelNumber && totalLevels >= buildings) {
        totalLoops = totalLevels;
      } else if (levelNumber >= totalLevels && levelNumber >= buildings) {
        totalLoops = levelNumber;
      } else if (buildings >= totalLevels && buildings >= levelNumber) {
        totalLoops = buildings;
      }

      let tmpArr = [];
      tmpArr.push(entry);
      totalLoops = Array.from(new Array(totalLoops - 1), (val, index) => index + 1);
      async.eachSeries(totalLoops, (loop, nxtLoop) => {
        let totalElements = 0;
        const promises = [];
        tmpArr.forEach((arr) => {
          promises.push(new Promise((resolve, reject) => {
            filter(arr.resource.id, (res) => {
              tmpArr = tmpArr.concat(res);
              if (totalLevels) {
                mcsdTotalLevels.entry = mcsdTotalLevels.entry.concat(res);
              }
              if (levelNumber == loop + 1) {
                mcsdlevelNumber.entry = mcsdlevelNumber.entry.concat(res);
              }
              const promises1 = [];
              for (var k in res) {
                promises1.push(new Promise((resolve1, reject1) => {
                  var building = res[k].resource.physicalType.coding.find((coding) => {
                    if (building) {
                      mcsdBuildings.entry = mcsdBuildings.entry.concat(entry);
                    }
                  });
                  resolve1();
                }));
              }
              Promise.all(promises1).then(() => {
                totalElements++;
                resolve();
              }).catch((err) => {
                winston.error(err);
              });
            });
          }));
        });
        Promise.all(promises).then(() => {
          tmpArr.splice(0, totalElements);
          return nxtLoop();
        }).catch((err) => {
          winston.error(err);
        });
      }, () => {
        callback(mcsdTotalLevels, mcsdlevelNumber, mcsdBuildings);
      });
    },

    countLevels(source, topOrgId, callback) {
      const database = config.getConf('mCSD:database');
      if (source == 'MOH') var url = `${URI(config.getConf('mCSD:url')).segment(topOrgId).segment('fhir').segment('Location')}?partof=Location/${topOrgId.toString()}`;
      else if (source == 'DATIM') var url = `${URI(config.getConf('mCSD:url')).segment(database).segment('fhir').segment('Location')}?partof=Location/${topOrgId.toString()}`;

      let totalLevels = 1;
      function cntLvls(url, callback) {
        const options = {
          url,
        };
        request.get(options, (err, res, body) => {
          body = JSON.parse(body);
          if (body.total == 0) return callback(totalLevels);
          let counter = 0;
          async.eachSeries(body.entry, (entry, nxtEntry) => {
            if (entry.resource.name.startsWith('_') || counter > 0) {
              return nxtEntry();
            }
            totalLevels++;
            counter++;
            if (entry.resource.hasOwnProperty('id')
              && entry.resource.id != false
              && entry.resource.id != null
              && entry.resource.id != undefined) {
              const reference = entry.resource.id;

              if (source == 'MOH') {
                var url = `${URI(config.getConf('mCSD:url')).segment(topOrgId).segment('fhir').segment('Location')}?partof=Location/${reference.toString()}`;
              }
              else if (source == 'DATIM') {
                var url = `${URI(config.getConf('mCSD:url')).segment(database).segment('fhir').segment('Location')}?partof=Location/${reference.toString()}`;
              }
              cntLvls(url, totalLevels => callback(totalLevels));
            } else return callback(totalLevels);
          }, () => callback(totalLevels));
        });
      }
      cntLvls(url, totalLevels => callback(false, totalLevels));
    },
    saveLocations(mCSD, database, callback) {
      const url = URI(config.getConf('mCSD:url')).segment(database).segment('fhir').toString();
      const options = {
        url: url.toString(),
        headers: {
          'Content-Type': 'application/json',
        },
        json: mCSD,
      };
      request.post(options, (err, res, body) => {
        if (err) {
          winston.error(err);
          return callback(err);
        }
        //winston.info('Data saved successfully');
        callback(err, body);
      });
    },
    saveMatch(mohId, datimId, topOrgId, recoLevel, totalLevels, type, callback) {
      const database = config.getConf('mCSD:database');
      const flagCode = config.getConf('mapping:flagCode');
      const namespace = config.getConf('UUID:namespace');
      const mohSystem = 'http://geoalign.datim.org/MOH';
      const datimSystem = 'http://geoalign.datim.org/DATIM';
      this.getLocationByID(database, datimId, false, (mcsd) => {
        const fhir = {};
        fhir.entry = [];
        fhir.type = 'document';
        const entry = [];
        const resource = {};
        resource.resourceType = 'Location';
        resource.name = mcsd.entry[0].resource.name;
        resource.id = datimId;
        resource.identifier = [];
        const datimURL = URI(config.getConf('mCSD:url')).segment(database).segment('fhir').segment(datimId)
          .toString();
        const mohURL = URI(config.getConf('mCSD:url')).segment(topOrgId).segment('fhir').segment(mohId)
          .toString();
        resource.identifier.push({ system: datimSystem, value: datimURL });
        resource.identifier.push({ system: mohSystem, value: mohURL });

        if (mcsd.entry[0].resource.hasOwnProperty('partOf')) {
          resource.partOf = { display: mcsd.entry[0].resource.partOf.display, reference: mcsd.entry[0].resource.partOf.reference };
        }
        if (recoLevel == totalLevels) {
          var typeCode = 'bu';
          var typeCode = 'building';
        } else {
          var typeCode = 'jdn';
          var typeName = 'Jurisdiction';
        }
        resource.physicalType = {
          coding: [
            {
              code: typeCode,
              display: typeName,
              system: 'http://hl7.org/fhir/location-physical-type',
            },
          ],
        };
        if (type == 'flag') {
          resource.tag = [];
          resource.tag.push({
            system: mohSystem,
            code: flagCode,
            display: 'To be reviewed',
          });
        }
        entry.push({ resource });
        fhir.entry = fhir.entry.concat(entry);
        const mappingDB = config.getConf('mapping:dbPrefix') + topOrgId;
        this.saveLocations(fhir, mappingDB, (err, res) => {
          if (err) {
            winston.error(err);
          }
          callback(err);
        });
      });
    },
    acceptFlag (datimId,topOrgId,callback) {
      const database = config.getConf('mapping:dbPrefix') + topOrgId;
      this.getLocationByID(database, datimId, false, (flagged) => {
        delete flagged.resourceType
        delete flagged.id
        delete flagged.meta
        delete flagged.total
        delete flagged.link
        const flagCode = config.getConf('mapping:flagCode');
        //remove the flag tag
        //winston.error(JSON.stringify(flagged.entry.fullurl))
        for (var k in flagged.entry[0].resource.tag) {
          var tag = flagged.entry[0].resource.tag[k]
          if (tag.code === flagCode) {
            flagged.entry[0].resource.tag.splice(k, 1)
          }
        }
        flagged.type = 'document'

        //deleting existing location
        const url = URI(config.getConf('mCSD:url')).segment(database).segment('fhir').segment('Location')
        .segment(datimId)
        .toString();
        const options = {
          url,
        };
        request.delete(options, (err, res, body) => {
          if (err) {
            winston.error(err);
            return callback(err)
          }
          //saving new
          this.saveLocations(flagged, database, (err, res) => {
            if (err) {
              winston.error(err);
            }
            return callback(err);
          });
        });
      })
    },
    saveNoMatch (mohId, topOrgId, recoLevel, totalLevels, callback) {
      const database = topOrgId;
      const namespace = config.getConf('UUID:namespace');
      const mohSystem = 'http://geoalign.datim.org/MOH';
      const noMatchCode = config.getConf('mapping:noMatchCode');
      this.getLocationByID(database, mohId, false, (mcsd) => {
        const fhir = {};
        fhir.entry = [];
        fhir.type = 'document';
        const entry = [];
        const resource = {};
        resource.resourceType = 'Location';
        resource.name = mcsd.entry[0].resource.name;
        resource.id = mohId;

        if (mcsd.entry[0].resource.hasOwnProperty('partOf')) {
          resource.partOf = { display: mcsd.entry[0].resource.partOf.display, reference: mcsd.entry[0].resource.partOf.reference };
        }
        if (recoLevel == totalLevels) {
          var typeCode = 'bu';
          var typeCode = 'building';
        } else {
          var typeCode = 'jdn';
          var typeName = 'Jurisdiction';
        }
        resource.physicalType = {
          coding: [
            {
              code: typeCode,
              display: typeName,
              system: 'http://hl7.org/fhir/location-physical-type',
            },
          ],
        };
        resource.identifier = [];
        const mohURL = URI(config.getConf('mCSD:url')).segment(topOrgId).segment('fhir').segment(mohId)
          .toString();
        resource.identifier.push({ system: mohSystem, value: mohURL });

        resource.tag = [];
        resource.tag.push({
          system: mohSystem,
          code: noMatchCode,
          display: 'No Match',
        });
        entry.push({ resource });
        fhir.entry = fhir.entry.concat(entry);
        const mappingDB = config.getConf('mapping:dbPrefix') + topOrgId;
        this.saveLocations(fhir, mappingDB, (err, res) => {
          if (err) {
            winston.error(err);
          }
          callback(err);
        });
      });
    },
    breakMatch(id, database, callback) {
      const url = URI(config.getConf('mCSD:url')).segment(database).segment('fhir').segment('Location')
        .segment(id)
        .toString();
      const options = {
        url,
      };
      request.delete(options, (err, res, body) => {
        if (err) {
          winston.error(err);
        }
        callback(err);
      });
    },
    breakNoMatch(id, database, callback) {
      const url = URI(config.getConf('mCSD:url')).segment(database).segment('fhir').segment('Location')
        .segment(id)
        .toString();
      const options = {
        url,
      };
      const cachedData = cache.get(`getLocationByID${url}`);
      if (cachedData) {
        return callback(cachedData);
      }
      request.delete(options, (err, res, body) => {
        if (err) {
          winston.error(err);
        }
        callback(err);
      });
    },
    CSVTomCSD(filePath, headerMapping, orgid, callback) {
      const namespace = config.getConf('UUID:namespace');
      const levels = config.getConf('levels');
      var orgid = headerMapping.orgid;
      const orgname = headerMapping.orgname;
      const countryUUID = uuid5(orgid, `${namespace}000`);
      const fhir = {};
      fhir.type = 'document';
      fhir.entry = [];
      const processed = [];
      csv
        .fromPath(filePath, { ignoreEmpty: true, headers: true })
        .on('data', (data) => {
          const jurisdictions = [];

          const promises = [];
          levels.sort();
          levels.reverse();
          let facilityParent = null;
          let facilityParentUUID = null;
          async.eachSeries(levels, (level, nxtLevel) => {
            if (data[headerMapping[level]] != null && data[headerMapping[level]] != undefined && data[headerMapping[level]] != false) {
              const name = data[headerMapping[level]];
              const levelNumber = level.replace('level', '');
              if (levelNumber.toString().length < 2) {
                var namespaceMod = `${namespace}00${levelNumber}`;
              } else {
                var namespaceMod = `${namespace}0${levelNumber}`;
              }

              const UUID = uuid5(name, namespaceMod);
              const topLevels = Array.apply(null,{ length: levelNumber }).map(Number.call, Number);
              // removing zero as levels starts from 1
              topLevels.splice(0, 1);
              topLevels.reverse();
              let parentFound = false;
              let parentUUID = null;
              let parent = null;
              if (levelNumber == 1) {
                parent = orgname;
                parentUUID = countryUUID;
              }

              if (!facilityParent) {
                facilityParent = name;
                facilityParentUUID = UUID;
              }
              async.eachSeries(topLevels, (topLevel, nxtTopLevel) => {
                const topLevelName = `level${topLevel}`;
                if (data[headerMapping[topLevelName]] != '' && parentFound == false) {
                  parent = data[headerMapping[topLevelName]];
                  if (topLevel.toString().length < 2) {
                    var namespaceMod = `${namespace}00${topLevel}`;
                  } else {
                    var namespaceMod = `${namespace}0${topLevel}`;
                  }
                  parentUUID = uuid5(parent, namespaceMod);
                  parentFound = true;
                }
                nxtTopLevel();
              }, () => {
                if (!processed.includes(UUID)) {
                  jurisdictions.push({
                    name, parent, uuid: UUID, parentUUID,
                  });
                  processed.push(UUID);
                }
                nxtLevel();
              });
            } else {
              nxtLevel();
            }
          }, () => {
            jurisdictions.push({
              name: orgname, parent: null, uuid: countryUUID, parentUUID: null,
            });
            this.saveJurisdiction(jurisdictions, orgid, () => {

            });
          });

          const facilityName = data[headerMapping.facility];
          const UUID = uuid5(data[headerMapping.code], `${namespace}100`);
          const building = {
            uuid: UUID,
            id: data[headerMapping.code],
            name: facilityName,
            lat: data[headerMapping.lat],
            long: data[headerMapping.long],
            parent: facilityParent,
            parentUUID: facilityParentUUID,
          };
          this.saveBuilding(building, orgid, () => {

          });
        })
        .on('end', () => callback(fhir));
    },

    saveJurisdiction(jurisdictions, orgid, callback) {
      const promises = [];
      jurisdictions.forEach((jurisdiction) => {
        promises.push(new Promise((resolve, reject) => {
          const resource = {};
          resource.resourceType = 'Location';
          resource.name = jurisdiction.name;
          resource.status = 'active';
          resource.mode = 'instance';
          resource.id = jurisdiction.uuid;
          resource.identifier = [];
          resource.identifier.push({ system: 'http://geoalign.datim.org/MOH', value: jurisdiction.uuid });
          if (jurisdiction.parentUUID) resource.partOf = { display: jurisdiction.parent, reference: `Location/${jurisdiction.parentUUID}` };
          resource.physicalType = {
            coding: [
              {
                code: 'jdn',
                display: 'Jurisdiction',
                system: 'http://hl7.org/fhir/location-physical-type',
              },
            ],
          };
          const mcsd = { type: 'document', entry: [{ resource }] };
          this.saveLocations(mcsd, orgid, () => {});
          resolve();
        }));
      });

      Promise.all(promises).then(() => callback()).catch((reason) => {
        winston.error(reason);
      });
    },

    saveBuilding(building, orgid, callback) {
      const resource = {};
      resource.resourceType = 'Location';
      resource.status = 'active';
      resource.mode = 'instance';
      resource.name = building.name;
      resource.id = building.uuid;
      resource.identifier = [];
      resource.identifier.push({ system: 'http://geoalign.datim.org/MOH', value: building.id });
      resource.partOf = { display: building.parent, reference: `Location/${building.parentUUID}` };
      resource.physicalType = {
        coding: [
          {
            code: 'bu',
            display: 'Building',
            system: 'http://hl7.org/fhir/location-physical-type',
          },
        ],
      };
      resource.position = {
        longitude: building.long,
        latitude: building.lat,
      };
      const mcsd = { type: 'document', entry: [{ resource }] };
      this.saveLocations(mcsd, orgid, () => {});
      return callback();
    },

    createTree(mcsd, source, database, topOrg, callback) {
      const datimPromises = [];
      const tree = [];
      async.each(mcsd.entry, (mcsdEntry, callback1) => {
        let long = null;
        let lat = null;
        if (mcsdEntry.resource.hasOwnProperty('position')) {
          long = mcsdEntry.resource.position.longitude;
          lat = mcsdEntry.resource.position.latitude;
        }
        if (mcsdEntry.resource.id == topOrg) {
          //return nxtMCSDEntry();
          return callback1()
        }
        if (!mcsdEntry.resource.hasOwnProperty('partOf')) {
          const parent = {
            text: mcsdEntry.resource.name, id: mcsdEntry.resource.id, lat, long, children: [],
          };

          this.inTree(tree, parent, (exist) => {
            if (!exist) {
              tree.push(parent);
            }
            //return nxtMCSDEntry();
            return callback1()
          });
        } else {
          const reference = mcsdEntry.resource.partOf.reference;
          const currentItem = {
            text: mcsdEntry.resource.name, id: mcsdEntry.resource.id, lat, long, children: [],
          };
          this.getLocationParentsFromData(reference, mcsd, 'all', (parents) => {
            parents.reverse();
            // push the current element on top of the list
            parents.push(currentItem);
            async.eachOfSeries(parents, (parent, key, nextParent) => {
              this.inTree(tree, parent, (exist) => {
                // if not saved and has no parent i.e key = 0
                parent.children = [];
                if (!exist && key == 0) {
                  tree.push(parent);
                  return nextParent();
                } if (!exist) {
                  const grandParent = parents[key - 1];
                  this.addToTree(tree, parent, grandParent);
                  return nextParent();
                } return nextParent();
              });
            }, () => {
              return callback1()
            })
          });
        }
      }, () => callback(tree));
    },
    addToTree(tree, item, parent) {
      tree.forEach((treeElements) => {
        if (treeElements.id == parent.id) {
          treeElements.children.push(item);
        } else this.addToTree(treeElements.children, item, parent);
      });
    },
    inTree(tree, item, callback) {
      if (Object.keys(tree).length == 0) {
        return callback(false);
      }
      async.eachSeries(tree, (element, nxtEl) => {
        if (element.id == item.id) {
          return callback(true);
        }
        this.inTree(element.children, item, (found) => {
          if (found) return callback(true);
          return nxtEl();
        });
      }, () => callback(false));
    },
    cleanArchives (db,callback) {
      var maxArchives = config.getConf('dbArchives:maxArchives')
      var filter = function(stat, path) {
        if(path.includes(db)){
          return true
        }
        else{
          return false
        }
      }

      var files = fsFinder.from(`${__dirname}/dbArhives`).filter(filter).findFiles((files)=>{
        if(files.length > maxArchives) {
          var totalDelete = files.length - maxArchives
          filesDelete = []
          async.eachSeries(files,(file,nxtFile)=>{
            //if max archive files not reached then add to the delete list
            if(filesDelete.length < totalDelete) {
              filesDelete.push(file)
              return nxtFile()
            }
            else {
              var replaceDel = filesDelete.find((fDelete)=>{
                fDelete = fDelete.replace(`${__dirname}/dbArhives/${db}_`,'').replace('.tar','')
                fDelete = moment(fDelete)
                searchFile = file.replace(`${__dirname}/dbArhives/${db}_`,'').replace('.tar','')
                searchFile = moment(searchFile)
                return fDelete > searchFile
              })
              if(replaceDel) {
                var index = filesDelete.indexOf(replaceDel)
                filesDelete.splice(index,1)
                filesDelete.push(file)
              }
              return nxtFile()
            }
          },()=>{
            filesDelete.forEach((fileDelete)=>{
              fs.unlink(fileDelete,(err)=>{
                if(err) {
                  winston.error(err)
                }
              })
            })
            callback()
          })
        }
      });
    },
    archiveDB (db,callback) {
      winston.info('Archiving DB ' + db)
      var mongoUser = config.getConf('mCSD:databaseUser')
      var mongoPasswd = config.getConf('mCSD:databasePassword')
      var mongoHost = config.getConf('mCSD:databaseHost')
      var mongoPort = config.getConf('mCSD:databasePort')
      var name = db + '_' + moment().format()
      if(mongoUser && mongoPasswd) {
        var uri = `mongodb://${mongoUser}:${mongoPasswd}@${mongoHost}:${mongoPort}/${db}`
      }
      else {
       var uri = `mongodb://${mongoHost}:${mongoPort}/${db}`
      }
      var me = this
      mongoBackup ({
        uri: uri,
        root: `${__dirname}/dbArhives`,
        tar: `${name}.tar`,
        callback: (err) => {
          if (err) {
            winston.error(err);
          } else {
            winston.info(db + ' backed up successfully');
          }
          callback(err)
        }
      })
    },
    restoreDB (archive,db,callback) {
      var mongoUser = config.getConf('mCSD:databaseUser')
      var mongoPasswd = config.getConf('mCSD:databasePassword')
      var mongoHost = config.getConf('mCSD:databaseHost')
      var mongoPort = config.getConf('mCSD:databasePort')
      if(mongoUser && mongoPasswd) {
        var uri = `mongodb://${mongoUser}:${mongoPasswd}@${mongoHost}:${mongoPort}/${db}`
      }
      else {
       var uri = `mongodb://${mongoHost}:${mongoPort}/${db}`
      }
      var me = this
      this.archiveDB(db,(err)=>{
        this.deleteDB(db,(err)=>{
          mongoRestore ({
            uri: uri,
            root: `${__dirname}/dbArhives`,
            tar: `${db}_${archive}.tar`,
            callback: (err) => {
              if (err) {
                winston.error(err);
              } else {
                winston.info(archive + ' restored successfully');
              }
              me.cleanArchives(db,()=>{})
              callback(err)
            }
          })
        })
      })
    },
    deleteDB (db,callback) {
      mongoose.connect(`mongodb://localhost/${db}`);
      mongoose.connection.on('open',() => {
        mongoose.connection.db.dropDatabase( (err) => {
          if(err) {
            winston.error(err)
          }
          else {
            winston.info('db Dropped')
          }
          callback(err)
        });
      })
    },
    getArchives (db,callback) {
      var filter = function(stat, path) {
        if(path.includes(db)){
          return true
        }
        else{
          return false
        }
      }

      var archives = []
      var files = fsFinder.from(`${__dirname}/dbArhives`).filter(filter).findFiles((files)=>{
        async.eachSeries(files,(file,nxtFile)=>{
          file = file.split('/').pop().replace('.tar','').replace(`${db}_`,'')
          archives.push(file)
          return nxtFile()
        },()=>{
          return callback(false,archives)
        })
      })
    }
  };
};
