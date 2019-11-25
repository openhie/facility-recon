/* eslint-disable no-restricted-syntax */
require('./init');
const request = require('request');
const URI = require('urijs');
const uuid5 = require('uuid/v5');
const uuid4 = require('uuid/v4');
const winston = require('winston');
const async = require('async');
const csv = require('fast-csv');
const isJSON = require('is-json');
const levenshtein = require('fast-levenshtein');
const geodist = require('geodist');
const redis = require('redis');
const cache = require('memory-cache');
const mongo = require('./mongo')();
const mixin = require('./mixin')();

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || '127.0.0.1',
});
const config = require('./config');

module.exports = () => ({
  getLocations(database, callback) {
    const baseUrl = URI(config.getConf('mCSD:url')).segment(database).segment('fhir').segment('Location')
      .toString();
    let url = `${baseUrl}?_count=37000`;
    let locations;
    redisClient.get(`url_${baseUrl}`, (error, results) => {
      if (results) {
        try {
          locations = JSON.parse(results);
        } catch (error) {
          winston.error(error);
        }
      }
      if (locations) {
        winston.info(`Getting ${baseUrl} from cache`);
        return callback(locations);
      }
      locations = {
        entry: [],
      };

      const started = cache.get(`started_${baseUrl}`);
      if (started) {
        winston.info(`getLocations is in progress will try again in 10 seconds.${baseUrl}`);
        setTimeout(() => {
          this.getLocations(database, callback);
        }, 10000);
        return;
      }
      redisClient.set(`started_${baseUrl}`, '', 'EX', 600);
      winston.info(`Getting ${baseUrl} from server`);
      async.doWhilst(
        (callback) => {
          const options = {
            url,
          };
          url = false;
          request.get(options, (err, res, body) => {
            if (!isJSON(body)) {
              cache.del(`started_${baseUrl}`);
              return callback(false, false);
            }
            body = JSON.parse(body);
            if (!body.hasOwnProperty('entry')) {
              winston.error('Non mCSD data returned');
              cache.del(`started_${baseUrl}`);
              return callback(false, false);
            }
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
          if (locations.entry.length > 1) {
            winston.info(`Saving ${baseUrl} to cache`);
            redisClient.set(`url_${baseUrl}`, JSON.stringify(locations), 'EX', config.getConf('mCSD:cacheTime'));
          } else {
            winston.info(`Not more than 1 entry for ${baseUrl} so not caching.`);
          }
          cache.del(`started_${baseUrl}`);
          return callback(locations);
        },
      );
    });
  },

  getLocationByID(database, id, getCached, callback) {
    let url;
    if (id) {
      url = `${URI(config.getConf('mCSD:url')).segment(database).segment('fhir').segment('Location')}?_id=${id.toString()}`;
    } else {
      url = URI(config.getConf('mCSD:url')).segment(database).segment('fhir').segment('Location')
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
        request.get(options, (err, res, body) => {
          if (!isJSON(body)) {
            return callback(false, false);
          }
          const mcsd = JSON.parse(body);
          const next = mcsd.link.find(link => link.relation == 'next');
          if (next) {
            url = next.url;
          }
          locations.entry = locations.entry.concat(mcsd.entry);
          return callback(false, url);
        });
      },
      () => url != false,
      () => {
        callback(locations);
      },
    );
  },
  getLocationByIdentifier(database, identifier, callback) {
    const locations = {};
    locations.entry = [];
    if (identifier) {
      var url = `${URI(config.getConf('mCSD:url')).segment(database).segment('fhir').segment('Location')}?identifier=${identifier}`.toString();
    } else {
      return callback(locations);
    }
    async.doWhilst(
      (callback) => {
        const options = {
          url,
        };
        url = false;
        request.get(options, (err, res, body) => {
          if (!isJSON(body)) {
            return callback(false, false);
          }
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

  getLocationChildren(database, topOrgId, callback) {
    if (!topOrgId) {
      topOrgId = '';
    }
    const urlPrefix = URI(config.getConf('mCSD:url')).segment(database).segment('fhir').segment('Location');
    const url = urlPrefix.segment(topOrgId).segment('$hierarchy').toString();
    redisClient.get(`url_${urlPrefix.toString()}`, (error, results) => {
      let locations;
      if (results) {
        try {
          locations = JSON.parse(results);
        } catch (error) {
          winston.error(error);
        }
      }
      if (locations) {
        winston.info(`Getting ${url} from cache`);
        return callback(locations);
      }

      const started = cache.get(`started_${url}`);
      if (started) {
        winston.info('getLocationChildren is in progress will try again in 10 seconds.');
        setTimeout(this.getLocationChildren, 10000, database, topOrgId, callback);
        return;
      }
      redisClient.set(`started_${urlPrefix}`, '', 'EX', 600);
      winston.info(`Getting ${url} from server`);

      const options = {
        url,
      };
      request.get(options, (err, res, body) => {
        if (!isJSON(body)) {
          const mcsd = {};
          mcsd.entry = [];
          cache.del(`started_${url}`);
          return callback(mcsd);
        }
        body = JSON.parse(body);
        if (body.entry.length > 1) {
          winston.info(`Saving ${urlPrefix} to cache`);
          redisClient.set(`url_${urlPrefix}`, JSON.stringify(body), 'EX', config.getConf('mCSD:cacheTime'));
        } else {
          winston.info(`Not more than 1 entry for ${url} so not caching.`);
        }
        cache.del(`started_${url}`);
        callback(body);
      });
    });
  },

  getImmediateChildren(database, id, callback) {
    let url = `${URI(config.getConf('mCSD:url')).segment(database).segment('fhir').segment('Location')}?partof=${id.toString()}`;
    const locations = {};
    locations.entry = [];
    async.doWhilst(
      (callback) => {
        const options = {
          url,
        };
        url = false;
        request.get(options, (err, res, body) => {
          if (!isJSON(body)) {
            return callback(false, false);
          }
          const mcsd = JSON.parse(body);
          const next = mcsd.link.find(link => link.relation == 'next');
          if (next) {
            url = next.url;
          }
          locations.entry = locations.entry.concat(mcsd.entry);
          return callback(false, url);
        });
      },
      () => url != false,
      () => {
        callback(false, locations);
      },
    );
  },

  getLocationParentsFromDB(database, entityParent, topOrg, details, callback) {
    const parents = [];
    if (entityParent == null
      || entityParent == false
      || entityParent == undefined
      || !topOrg
      || !database
    ) {
      return callback(parents);
    }
    const sourceEntityID = entityParent;
    const me = this;

    function getPar(entityParent, callback) {
      if (entityParent == null || entityParent == false || entityParent == undefined) {
        return callback(parents);
      }

      const splParent = entityParent.split('/');
      entityParent = splParent[(splParent.length - 1)];
      const locationID = entityParent;
      const url = `${URI(config.getConf('mCSD:url')).segment(database).segment('fhir').segment('Location')}?_id=${entityParent.toString()}`;

      const options = {
        url,
      };

      request.get(options, (err, res, body) => {
        if (!isJSON(body)) {
          return callback(parents);
        }
        body = JSON.parse(body);
        if (!body.entry || body.entry.length === 0) {
          winston.error(`Organization Unit with ID ${locationID} not found`);
          return callback(parents);
        }
        let long = null;
        let lat = null;
        if (body.entry[0].resource.hasOwnProperty('position')) {
          long = body.entry[0].resource.position.longitude;
          lat = body.entry[0].resource.position.latitude;
        }
        let entityParent = null;
        if (body.entry[0].resource.hasOwnProperty('partOf')) {
          entityParent = body.entry[0].resource.partOf.reference;
        }
        if (details == 'all') {
          parents.push({
            text: body.entry[0].resource.name,
            id: body.entry[0].resource.id,
            lat,
            long,
          });
        } else if (details == 'id') {
          parents.push(body.entry[0].resource.id);
        } else if (details == 'names') {
          parents.push(body.entry[0].resource.name);
        } else {
          winston.error('parent details (either id,names or all) to be returned not specified');
        }

        // stop after we reach the topOrg which is the country
        const entityID = body.entry[0].resource.id;
        // if this is a topOrg then end here,we dont need to fetch the upper org which is continent i.e Africa
        if (entityParent && topOrg && entityParent.endsWith(topOrg)) {
          me.getLocationByID(database, topOrg, false, (loc) => {
            if (details == 'all') {
              parents.push({
                text: loc.entry[0].resource.name,
                id: topOrg,
                lat,
                long,
              });
            } else if (details == 'id') {
              parents.push(loc.entry[0].resource.id);
            } else if (details == 'names') {
              parents.push(loc.entry[0].resource.name);
            }
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
          entityParent = body.entry[0].resource.partOf.reference;
          getPar(entityParent, (parents) => {
            callback(parents);
          });
        } else callback(parents);
      });
    }
    getPar(entityParent, parents => callback(parents));
  },

  /*
  This function finds parents of an entity from passed mCSD data
  */
  getLocationParentsFromData(entityParent, mcsd, details, callback) {
    if (mcsd.hasOwnProperty('parentCache') && mcsd.parentCache.id === entityParent && mcsd.parentCache.details === details) {
      // return a copy
      return callback(mcsd.parentCache.parents.slice());
    }
    const parents = [];
    if (!mcsd.hasOwnProperty('entry') || !entityParent) {
      return callback(parents);
    }
    if (mcsd.entry.length === 0) {
      return callback(parents);
    }

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
        var entityParent = null;
        if (entry.resource.hasOwnProperty('partOf')) {
          entityParent = entry.resource.partOf.reference;
        }

        if (details == 'all' || !details) {
          parents.push({
            text: entry.resource.name,
            id: entry.resource.id,
            lat,
            long,
          });
        } else if (details == 'id') {
          parents.push(entry.resource.id);
        } else if (details == 'names') {
          parents.push(entry.resource.name);
        } else {
          winston.error('parent details (either id,names or all) to be returned not specified');
        }

        if (entry.resource.hasOwnProperty('partOf')
          && entry.resource.partOf.reference != false
          && entry.resource.partOf.reference != null
          && entry.resource.partOf.reference != undefined) {
          entityParent = entry.resource.partOf.reference;
          filter(entityParent, parents => callback(parents));
        } else {
          return callback(parents);
        }
      } else {
        return callback(parents);
      }
    }

    filter(entityParent, (parents) => {
      mcsd.parentCache = {};
      mcsd.parentCache.id = entityParent;
      mcsd.parentCache.details = details;
      mcsd.parentCache.parents = parents;
      // return a copy
      callback(parents.slice());
    });
  },
  getBuildings(mcsd, callback) {
    const buildings = [];
    mcsd.entry.map((entry) => {
      const found = entry.resource.physicalType.coding.find(coding => coding.code == 'bu');
      if (found) {
        buildings.push(entry);
      }
    });
    return callback(buildings);
  },

  filterLocations(mcsd, topOrgId, levelNumber, callback) {
    const mcsdLevelNumber = {};
    mcsdLevelNumber.entry = [];
    if (!mcsd.hasOwnProperty('entry') || mcsd.entry.length == 0 || !topOrgId) {
      return callback(mcsdLevelNumber);
    }
    const entry = mcsd.entry.find(entry => entry.resource.id == topOrgId);
    if (!entry) {
      return callback(mcsdLevelNumber);
    }
    if (levelNumber == 1) {
      mcsdLevelNumber.entry = mcsdLevelNumber.entry.concat(entry);
      return callback(mcsdLevelNumber);
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
    totalLoops = levelNumber;
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
            if (levelNumber == loop + 1) {
              mcsdLevelNumber.entry = mcsdLevelNumber.entry.concat(res);
            }
            totalElements++;
            resolve();
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
      callback(mcsdLevelNumber);
    });
  },

  countLevels(db, topOrgId, callback) {
    function constructURL(id, callback) {
      const url = `${URI(config.getConf('mCSD:url'))
        .segment(db)
        .segment('fhir')
        .segment('Location')}?partof=Location/${id.toString()}`;
      return callback(url);
    }

    let totalLevels = 1;
    let prev_entry = {};

    function cntLvls(url, callback) {
      const options = {
        url,
      };
      request.get(options, (err, res, body) => {
        if (!isJSON(body)) {
          return callback(0);
        }
        if (res.statusCode < 200 || res.statusCode > 299) {
          return callback(totalLevels);
        }
        body = JSON.parse(body);
        let entry;
        if (body.entry.length === 0 && prev_entry.length > 0) {
          entry = prev_entry.shift();
        } else if (body.entry.length === 0 && Object.keys(prev_entry).length === 0) {
          return callback(totalLevels);
        } else {
          prev_entry = [];
          prev_entry = body.entry.slice();
          entry = prev_entry.shift();
          totalLevels++;
        }
        const reference = entry.resource.id;
        constructURL(reference, (url) => {
          cntLvls(url, totalLevels => callback(totalLevels));
        });
      });
    }
    constructURL(topOrgId, (url) => {
      cntLvls(url, totalLevels => callback(false, totalLevels));
    });
  },
  editLocation(id, name, parent, db, callback) {
    this.getLocationByID(db, id, false, (location) => {
      location.entry[0].resource.name = name;
      const promise = new Promise((resolve, reject) => {
        if (parent) {
          this.getLocationByID(db, parent, false, (locationParent) => {
            location.entry[0].resource.partOf = {
              display: locationParent.entry[0].resource.name,
              reference: `Location/${locationParent.entry[0].resource.id}`,
            };
            resolve();
          });
        } else {
          delete location.entry[0].resource.partOf;
          resolve();
        }
      });
      promise.then(() => {
        const fhir = {};
        fhir.entry = [];
        fhir.type = 'document';
        fhir.entry = fhir.entry.concat(location.entry[0]);
        this.saveLocations(fhir, db, (err, res) => {
          if (err) {
            winston.error(err);
          }
          callback(err);
        });
      });
    });
  },

  deleteLocation(id, sourceId, sourceName, sourceOwner, userID, callback) {
    mongo.getMappingDBs(sourceId, (dbs) => {
      async.parallel({
        deleteFromSrcDB: (callback1) => {
          const db = mixin.toTitleCase(sourceName) + sourceOwner;
          const url_prefix = URI(config.getConf('mCSD:url'))
            .segment(db)
            .segment('fhir')
            .segment('Location');
          const url = URI(url_prefix).segment(id).toString();
          const options = {
            url,
          };
          request.delete(options, (err, res, body) => {
            this.cleanCache(`url_${url_prefix.toString()}`, true);
            return callback1(false);
          });
        },
        deleteFromMappingDB: (callback2) => {
          async.each(dbs, (db, nxtDB) => {
            const sourceDB = mixin.toTitleCase(sourceName) + sourceOwner;
            const identifier = URI(config.getConf('mCSD:url'))
              .segment(sourceDB)
              .segment('fhir')
              .segment('Location')
              .segment(id)
              .toString();
            this.getLocationByIdentifier(db.db, identifier, (mapped) => {
              if (mapped.entry.length > 0) {
                async.each(mapped.entry, (entry, nxtEntry) => {
                  const url_prefix = URI(config.getConf('mCSD:url'))
                    .segment(db.db)
                    .segment('fhir')
                    .segment('Location');
                  const url = URI(url_prefix).segment(entry.resource.id).toString();
                  const options = {
                    url,
                  };
                  request.delete(options, (err, res, body) => {
                    this.cleanCache(`url_${url_prefix.toString()}`, true);
                    return nxtEntry();
                  });
                }, () => nxtDB());
              } else {
                return nxtDB();
              }
            });
          }, () => callback2(false));
        },
      }, () => {
        callback(false, false);
      });
    });
  },

  saveLocations(mCSD, database, callback) {
    const url = URI(config.getConf('mCSD:url')).segment(database).segment('fhir').toString();
    const options = {
      url,
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
      this.cleanCache(`url_${url}/Location`, true);
      callback(err, body);
    });
  },
  cleanCache(key, isPrefix) {
    if (isPrefix) {
      redisClient.keys(`${key}*`, (err, keys) => {
        for (const key of keys) {
          redisClient.del(key, () => {
            winston.info(`DELETING ${key} from cache because something was modified.`);
          });
        }
      });
    } else {
      redisClient.del(key, () => {
        winston.info(`DELETING ${key} from cache because something was modified.`);
      });
    }
  },
  saveMatch(source1Id, source2Id, source1DB, source2DB, mappingDB, recoLevel, totalLevels, type, autoMatch, flagComment, callback) {
    const flagCode = config.getConf('mapping:flagCode');
    const autoMatchedCode = config.getConf('mapping:autoMatchedCode');
    const manualllyMatchedCode = config.getConf('mapping:manualllyMatchedCode');
    const matchCommentsCode = config.getConf('mapping:matchCommentsCode');
    const flagCommentCode = config.getConf('mapping:flagCommentCode');
    const fakeOrgId = config.getConf('mCSD:fakeOrgId');
    const source1System = 'https://digitalhealth.intrahealth.org/source1';
    const source2System = 'https://digitalhealth.intrahealth.org/source2';
    // check if its already mapped and ignore

    const me = this;
    async.parallel({
      source2Mapped(callback) {
        const source2Identifier = URI(config.getConf('mCSD:url'))
          .segment(source2DB)
          .segment('fhir')
          .segment('Location')
          .segment(source2Id)
          .toString();
        me.getLocationByIdentifier(mappingDB, source2Identifier, (mapped) => {
          if (mapped.entry.length > 0) {
            winston.error('Attempting to map already mapped location');
            return callback(null, 'This location was already mapped, recalculate scores to update the level you are working on');
          }
          return callback(null, null);
        });
      },
      source1Mapped(callback) {
        me.getLocationByID(mappingDB, source1Id, false, (mapped) => {
          if (mapped.entry.length > 0) {
            winston.error('Attempting to map already mapped location');
            return callback(null, 'This location was already mapped, recalculate scores to update the level you are working on');
          }
          return callback(null, null);
        });
      },
      source1mCSD(callback) {
        me.getLocationByID(source1DB, source1Id, false, mcsd => callback(null, mcsd));
      },
      source2mCSD(callback) {
        me.getLocationByID(source2DB, source2Id, false, mcsd => callback(null, mcsd));
      },
      source1Parents(callback) {
        me.getLocationParentsFromDB(source1DB, source1Id, fakeOrgId, 'id', parents => callback(null, parents));
      },
      source2Parents(callback) {
        me.getLocationParentsFromDB(source2DB, source2Id, fakeOrgId, 'id', parents => callback(null, parents));
      },
    }, (err, res) => {
      if (!res.source2mCSD || !res.source2mCSD.entry || res.source2mCSD.entry.length === 0) {
        return callback(true, false);
      }
      if (!res.source1mCSD || !res.source1mCSD.entry || res.source1mCSD.entry.length === 0) {
        return callback(true, false);
      }
      if (res.source1Mapped !== null) {
        return callback(res.source1Mapped);
      }
      if (res.source2Mapped !== null) {
        return callback(res.source2Mapped);
      }

      if (Array.isArray(res.source1Parents)) {
        res.source1Parents.splice(0, 1);
      }
      if (Array.isArray(res.source2Parents)) {
        res.source2Parents.splice(0, 1);
      }

      this.getLocationByID(mappingDB, res.source1Parents[0], false, (mapped1) => {
        if (!isJSON(JSON.stringify(mapped1))) {
          winston.error(`Non JSON results returned ${JSON.stringify(mapped1)}`);
          return callback(true, false);
        }
        if (mapped1.entry.length > 0) {
          res.source1Parents[0] = mixin.getIdFromIdentifiers(mapped1.entry[0].resource.identifier, 'https://digitalhealth.intrahealth.org/source2');
        }
        // Handle match comments
        const matchComments = [];
        if (!res.source2Parents.includes(res.source1Parents[0])) {
          matchComments.push('Parents differ');
        }
        const source1Name = res.source2mCSD.entry[0].resource.name;
        const source2Name = res.source1mCSD.entry[0].resource.name;
        const lev = levenshtein.get(source2Name.toLowerCase(), source1Name.toLowerCase());
        if (lev !== 0) {
          matchComments.push('Names differ');
        }
        if (recoLevel == totalLevels) {
          const idEqual = mixin.haveIdInCommon(res.source1mCSD.entry[0].resource.identifier, res.source2mCSD.entry[0].resource.identifier);
          if (!idEqual) {
            matchComments.push('ID differ');
          }
          let source2Latitude = null;
          let source2Longitude = null;
          let source1Latitude = null;
          let source1Longitude = null;
          if (res.source1mCSD.entry[0].resource.hasOwnProperty('position')) {
            source2Latitude = res.source1mCSD.entry[0].resource.position.latitude;
            source2Longitude = res.source1mCSD.entry[0].resource.position.longitude;
          }
          if (res.source2mCSD.entry[0].resource.hasOwnProperty('position')) {
            source1Latitude = res.source2mCSD.entry[0].resource.position.latitude;
            source1Longitude = res.source2mCSD.entry[0].resource.position.longitude;
          }
          if (source2Latitude && source2Longitude) {
            const dist = geodist({
              source2Latitude,
              source2Longitude,
            }, {
              source1Latitude,
              source1Longitude,
            }, {
              exact: false,
              unit: 'miles',
            });
            if (dist !== 0) {
              matchComments.push('Coordinates differ');
            }
          } else {
            matchComments.push('Coordinates missing');
          }
        }
        // End of handling match comments

        const fhir = {};
        fhir.entry = [];
        fhir.type = 'document';
        const entry = [];
        const resource = {};
        resource.resourceType = 'Location';
        resource.name = res.source1mCSD.entry[0].resource.name; // take source 2 name
        resource.alias = res.source2mCSD.entry[0].resource.name; // take source1 name
        resource.id = source1Id;
        resource.identifier = [];
        const source2URL = URI(config.getConf('mCSD:url')).segment(source2DB).segment('fhir').segment('Location')
          .segment(source2Id)
          .toString();
        const source1URL = URI(config.getConf('mCSD:url')).segment(source1DB).segment('fhir').segment('Location')
          .segment(source1Id)
          .toString();
        resource.identifier.push({
          system: source2System,
          value: source2URL,
        });
        resource.identifier.push({
          system: source1System,
          value: source1URL,
        });

        if (res.source1mCSD.entry[0].resource.hasOwnProperty('partOf')) {
          if (!res.source1mCSD.entry[0].resource.partOf.reference.includes(fakeOrgId)) {
            resource.partOf = {
              display: res.source1mCSD.entry[0].resource.partOf.display,
              reference: res.source1mCSD.entry[0].resource.partOf.reference,
            };
          }
        }
        if (recoLevel == totalLevels) {
          var typeCode = 'bu';
          var typeName = 'building';
        } else {
          var typeCode = 'jdn';
          var typeName = 'Jurisdiction';
        }
        resource.physicalType = {
          coding: [{
            code: typeCode,
            display: typeName,
            system: 'http://hl7.org/fhir/location-physical-type',
          }],
        };
        if (matchComments.length > 0) {
          if (!resource.hasOwnProperty('tag')) {
            resource.tag = [];
          }
          resource.tag.push({
            system: source2System,
            code: matchCommentsCode,
            display: matchComments,
          });
        }
        if (type == 'flag') {
          if (!resource.hasOwnProperty('tag')) {
            resource.tag = [];
          }
          if (flagComment) {
            resource.tag.push({
              system: source2System,
              code: flagCommentCode,
              display: flagComment,
            });
          }
          resource.tag.push({
            system: source2System,
            code: flagCode,
            display: 'To be reviewed',
          });
        }
        if (autoMatch) {
          if (!resource.hasOwnProperty('tag')) {
            resource.tag = [];
          }
          resource.tag.push({
            system: source2System,
            code: autoMatchedCode,
            display: 'Automatically Matched',
          });
        } else {
          if (!resource.hasOwnProperty('tag')) {
            resource.tag = [];
          }
          resource.tag.push({
            system: source2System,
            code: manualllyMatchedCode,
            display: 'Manually Matched',
          });
        }
        entry.push({
          resource,
        });
        fhir.entry = fhir.entry.concat(entry);
        me.saveLocations(fhir, mappingDB, (err, res) => {
          if (err) {
            winston.error(err);
          }
          callback(err, matchComments);
        });
      });
    });
  },
  acceptFlag(source1Id, mappingDB, callback) {
    this.getLocationByID(mappingDB, source1Id, false, (flagged) => {
      delete flagged.resourceType;
      delete flagged.id;
      delete flagged.meta;
      delete flagged.total;
      delete flagged.link;
      const flagCode = config.getConf('mapping:flagCode');
      const flagCommentCode = config.getConf('mapping:flagCommentCode');
      // remove the flag tag
      for (const k in flagged.entry[0].resource.tag) {
        const tag = flagged.entry[0].resource.tag[k];
        if (tag.code === flagCode) {
          flagged.entry[0].resource.tag.splice(k, 1);
        }
      }

      for (const k in flagged.entry[0].resource.tag) {
        const tag = flagged.entry[0].resource.tag[k];
        if (tag.code === flagCommentCode) {
          flagged.entry[0].resource.tag.splice(k, 1);
        }
      }
      flagged.type = 'document';

      // deleting existing location
      const url_prefix = URI(config.getConf('mCSD:url')).segment(mappingDB).segment('fhir').segment('Location');
      const url = URI(url_prefix).segment(source1Id).toString();
      const options = {
        url,
      };
      request.delete(options, (err, res, body) => {
        this.cleanCache(`url_${url_prefix.toString()}`, true);
        if (err) {
          winston.error(err);
          return callback(err);
        }
        // saving new
        this.saveLocations(flagged, mappingDB, (err, res) => {
          if (err) {
            winston.error(err);
          }
          return callback(err);
        });
      });
    });
  },
  saveNoMatch(source1Id, source1DB, source2DB, mappingDB, recoLevel, totalLevels, type, callback) {
    const source1System = 'https://digitalhealth.intrahealth.org/source1';
    const noMatchCode = config.getConf('mapping:noMatchCode');
    const ignoreCode = config.getConf('mapping:ignoreCode');

    const me = this;
    async.parallel({
      source1Mapped(callback) {
        me.getLocationByID(mappingDB, source1Id, false, (mapped) => {
          if (mapped.entry.length > 0) {
            winston.error('Attempting to mark an already mapped location as no match');
            return callback(null, 'This location was already mapped, recalculate scores to update the level you are working on');
          }
          return callback(null, null);
        });
      },
    },
    (err, res) => {
      if (res.source1Mapped !== null) {
        return callback(res.source1Mapped);
      }
      me.getLocationByID(source1DB, source1Id, false, (mcsd) => {
        const fhir = {};
        fhir.entry = [];
        fhir.type = 'document';
        const entry = [];
        const resource = {};
        resource.resourceType = 'Location';
        resource.name = mcsd.entry[0].resource.name;
        resource.id = source1Id;

        if (mcsd.entry[0].resource.hasOwnProperty('partOf')) {
          resource.partOf = {
            display: mcsd.entry[0].resource.partOf.display,
            reference: mcsd.entry[0].resource.partOf.reference,
          };
        }
        if (recoLevel == totalLevels) {
          var typeCode = 'bu';
          var typeName = 'building';
        } else {
          var typeCode = 'jdn';
          var typeName = 'Jurisdiction';
        }
        resource.physicalType = {
          coding: [{
            code: typeCode,
            display: typeName,
            system: 'http://hl7.org/fhir/location-physical-type',
          }],
        };
        resource.identifier = [];
        const source1URL = URI(config.getConf('mCSD:url')).segment(source1DB).segment('fhir').segment('Location')
          .segment(source1Id)
          .toString();
        resource.identifier.push({
          system: source1System,
          value: source1URL,
        });

        resource.tag = [];
        if (type == 'nomatch') {
          resource.tag.push({
            system: source1System,
            code: noMatchCode,
            display: 'No Match',
          });
        } else if (type == 'ignore') {
          resource.tag.push({
            system: source1System,
            code: ignoreCode,
            display: 'Ignore',
          });
        }
        entry.push({
          resource,
        });
        fhir.entry = fhir.entry.concat(entry);
        me.saveLocations(fhir, mappingDB, (err, res) => {
          if (err) {
            winston.error(err);
          }
          callback(err);
        });
      });
    });
  },
  breakMatch(source1Id, mappingDB, source1DB, callback) {
    if (!source1Id) {
      return callback(true, false);
    }
    const url_prefix = URI(config.getConf('mCSD:url'))
      .segment(mappingDB)
      .segment('fhir')
      .segment('Location');
    const source1UrlPrefix = URI(config.getConf('mCSD:url'))
      .segment(source1DB)
      .segment('fhir')
      .segment('Location');
    const url = URI(url_prefix).segment(source1Id).toString();
    const options = {
      url,
    };
    this.getLocationByID(source1DB, source1Id, false, (location) => {
      if (location.entry.length === 0) {
        return callback(true, null);
      }
      request.delete(options, (err, res, body) => {
        this.cleanCache(`url_${url_prefix.toString()}`, true);
        this.cleanCache(`url_${source1UrlPrefix.toString()}`, true);
        if (err) {
          winston.error(err);
        }
        callback(err, null);
      });
      delete location.resourceType;
      delete location.id;
      delete location.meta;
      delete location.total;
      delete location.link;
      const matchBrokenCode = config.getConf('mapping:matchBrokenCode');
      // remove the flag tag
      let found = false;
      async.eachSeries(location.entry[0].resource.tag, (tag, nxtTag) => {
        if (tag.code === matchBrokenCode) {
          found = true;
        }
        return nxtTag();
      }, () => {
        location.type = 'document';
        if (!found) {
          if (!location.entry[0].resource.hasOwnProperty('tag')) {
            location.entry[0].resource.tag = [];
          }
          const source1System = 'https://digitalhealth.intrahealth.org/source1';
          location.entry[0].resource.tag.push({
            system: source1System,
            code: matchBrokenCode,
            display: 'Match Broken',
          });
          this.saveLocations(location, source1DB, (err, res) => {});
        }
      });
    });
  },
  breakNoMatch(source1Id, mappingDB, callback) {
    const url_prefix = URI(config.getConf('mCSD:url'))
      .segment(mappingDB)
      .segment('fhir')
      .segment('Location');
    const url = URI(url_prefix)
      .segment(source1Id)
      .toString();
    const options = {
      url,
    };
    request.delete(options, (err, res, body) => {
      this.cleanCache(`url_${url_prefix.toString()}`, true);
      if (err) {
        winston.error(err);
      }
      callback(err);
    });
  },
  CSVTomCSD(filePath, headerMapping, database, clientId, callback) {
    const uploadRequestId = `uploadProgress${clientId}`;
    const namespace = config.getConf('UUID:namespace');
    const levels = config.getConf('levels');
    const topOrgId = config.getConf('mCSD:fakeOrgId');
    const orgname = config.getConf('mCSD:fakeOrgName');
    const countryUUID = topOrgId;

    const promises = [];
    const processed = [];
    let countRow = 0;

    let totalRows = 0;

    let recordCount = 0;
    let saveBundle = {
      id: uuid4(),
      resourceType: 'Bundle',
      type: 'batch',
      entry: [],
    };

    const invalidIDChars = [/\//g, /\s/g];
    csv
      .fromPath(filePath, {
        headers: true,
      })
      .on('data', (data) => {
        const jurisdictions = [];
        if (data[headerMapping.facility] == '') {
          countRow++;
          const percent = parseFloat((countRow * 100 / totalRows).toFixed(2));
          const uploadReqPro = JSON.stringify({
            status: '3/3 Writing Uploaded data into server',
            error: null,
            percent,
          });
          redisClient.set(uploadRequestId, uploadReqPro);
          winston.error(`Skipped ${JSON.stringify(data)}`);
          return;
        }
        for (const invalidChar of invalidIDChars) {
          data[headerMapping.code] = data[headerMapping.code].replace(invalidChar, '-');
        }
        levels.sort();
        levels.reverse();
        let facilityParent = null;
        let facilityParentUUID = null;
        async.eachSeries(levels, (level, nxtLevel) => {
          if (data[headerMapping[level]] != null
            && data[headerMapping[level]] != undefined
            && data[headerMapping[level]] != false
            && data[headerMapping[level]] != ''
          ) {
            let name = data[headerMapping[level]].trim();
            name = mixin.toTitleCaseSpace(name);
            const nameForID = name.toLowerCase();
            const levelNumber = parseInt(level.replace('level', ''));
            let mergedParents = '';

            // merge parents of this location
            for (let k = levelNumber - 1; k >= 1; k--) {
              let parent = data[headerMapping[`level${k}`]].trim();
              parent = mixin.toTitleCaseSpace(parent);
              parent = parent.toLowerCase();
              mergedParents += parent;
            }
            if (levelNumber.toString().length < 2) {
              var namespaceMod = `${namespace}00${levelNumber}`;
            } else {
              var namespaceMod = `${namespace}0${levelNumber}`;
            }

            const UUID = uuid5(nameForID + mergedParents, namespaceMod);
            const topLevels = [...new Array(levelNumber)].map(Function.call, Number);
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
              if (data[headerMapping[topLevelName]] && parentFound == false) {
                let mergedGrandParents = '';
                for (let k = topLevel - 1; k >= 1; k--) {
                  mergedGrandParents += data[headerMapping[`level${k}`]];
                }
                parent = data[headerMapping[topLevelName]].trim();
                if (topLevel.toString().length < 2) {
                  var namespaceMod = `${namespace}00${topLevel}`;
                } else {
                  var namespaceMod = `${namespace}0${topLevel}`;
                }
                parentUUID = uuid5(parent + mergedGrandParents, namespaceMod);
                parentFound = true;
              }
              nxtTopLevel();
            }, () => {
              if (!processed.includes(UUID)) {
                jurisdictions.push({
                  name,
                  parent,
                  uuid: UUID,
                  parentUUID,
                });
                processed.push(UUID);
              }
              nxtLevel();
            });
          } else {
            nxtLevel();
          }
        }, () => {
          if (!processed.includes(countryUUID)) {
            jurisdictions.push({
              name: orgname,
              parent: null,
              uuid: countryUUID,
              parentUUID: null,
            });
            processed.push(countryUUID);
          }
          recordCount += jurisdictions.length;
          this.buildJurisdiction(jurisdictions, saveBundle);
          const facilityName = data[headerMapping.facility].trim();
          const UUID = uuid5(data[headerMapping.code], `${namespace}100`);
          if (!facilityParent || !facilityParentUUID) {
            facilityParent = orgname;
            facilityParentUUID = countryUUID;
          }
          const building = {
            uuid: UUID,
            id: data[headerMapping.code],
            name: facilityName,
            lat: data[headerMapping.lat],
            long: data[headerMapping.long],
            parent: facilityParent,
            parentUUID: facilityParentUUID,
          };
          recordCount++;
          this.buildBuilding(building, saveBundle);
          if (recordCount >= 250) {
            const tmpBundle = {
              ...saveBundle,
            };
            saveBundle = {
              id: uuid4(),
              resourceType: 'Bundle',
              type: 'batch',
              entry: [],
            };
            recordCount = 0;
            totalRows += tmpBundle.entry.length;
            promises.push(new Promise((resolve, reject) => {
              this.saveLocations(tmpBundle, database, () => {
                countRow += tmpBundle.entry.length;
                const percent = parseFloat((countRow * 100 / totalRows).toFixed(2));
                const uploadReqPro = JSON.stringify({
                  status: '3/3 Writing Uploaded data into server',
                  error: null,
                  percent,
                });
                redisClient.set(uploadRequestId, uploadReqPro);

                resolve();
              });
            }));
          }
        });
      }).on('end', () => {
        this.saveLocations(saveBundle, database, () => {
          Promise.all(promises).then(() => {
            const uploadRequestId = `uploadProgress${clientId}`;
            const uploadReqPro = JSON.stringify({
              status: 'Done',
              error: null,
              percent: 100,
            });
            redisClient.set(uploadRequestId, uploadReqPro);
            callback();
          });
        });
      });
  },

  buildJurisdiction(jurisdictions, bundle) {
    jurisdictions.forEach((jurisdiction) => {
      const resource = {};
      resource.resourceType = 'Location';
      resource.name = jurisdiction.name;
      resource.status = 'active';
      resource.mode = 'instance';
      resource.id = jurisdiction.uuid;
      resource.identifier = [];
      resource.identifier.push({
        system: 'https://digitalhealth.intrahealth.org/source1',
        value: jurisdiction.uuid,
      });
      if (jurisdiction.parentUUID) {
        resource.partOf = {
          display: jurisdiction.parent,
          reference: `Location/${jurisdiction.parentUUID}`,
        };
      }
      resource.physicalType = {
        coding: [{
          code: 'jdn',
          display: 'Jurisdiction',
          system: 'http://hl7.org/fhir/location-physical-type',
        }],
      };
      bundle.entry.push({
        resource,
        request: {
          method: 'PUT',
          url: `Location/${resource.id}`,
        },
      });
    });
  },

  buildBuilding(building, bundle) {
    const resource = {};
    resource.resourceType = 'Location';
    resource.status = 'active';
    resource.mode = 'instance';
    resource.name = building.name;
    resource.id = building.id;
    resource.identifier = [];
    resource.identifier.push({
      system: 'https://digitalhealth.intrahealth.org/source1',
      value: building.id,
    });
    resource.partOf = {
      display: building.parent,
      reference: `Location/${building.parentUUID}`,
    };
    resource.physicalType = {
      coding: [{
        code: 'bu',
        display: 'Building',
        system: 'http://hl7.org/fhir/location-physical-type',
      }],
    };
    resource.position = {
      longitude: building.long,
      latitude: building.lat,
    };
    bundle.entry.push({
      resource,
      request: {
        method: 'PUT',
        url: `Location/${resource.id}`,
      },
    });
  },

  createGrid(id, topOrgId, buildings, mcsdAll, start, count, callback) {
    const grid = [];
    let allCounter = 1;
    let totalBuildings = 0;
    async.each(buildings, (building, callback) => {
      let lat = null;
      let long = null;
      if (building.resource.hasOwnProperty('position')) {
        lat = building.resource.position.latitude;
        long = building.resource.position.longitude;
      }
      const row = {};
      // if no parent filter is applied then stop in here of all the conditions are satisfied
      if (id === topOrgId) {
        if (allCounter < start) {
          totalBuildings++;
          allCounter++;
          return callback();
        }
        // if no filter is applied then return in here if the grid length is satisfied
        if (grid.length >= count) {
          totalBuildings++;
          return callback();
        }
      }
      if (building.resource.hasOwnProperty('partOf')) {
        this.getLocationParentsFromData(building.resource.partOf.reference, mcsdAll, 'all', (parents) => {
          if (id !== topOrgId) {
            const parentFound = parents.find(parent => parent.id === id);
            if (!parentFound) {
              return callback();
            }
          }
          parents.reverse();
          row.facility = building.resource.name;
          row.id = building.resource.id;
          row.latitude = lat;
          row.longitude = long;
          let level = 1;
          async.eachSeries(parents, (parent, nxtParent) => {
            row[`level${level}`] = parent.text;
            row[`level${level}id`] = parent.id;
            level++;
            return nxtParent();
          }, () => {
            totalBuildings++;
            if (allCounter < start) {
              allCounter++;
              return callback();
            }
            if (grid.length < count) {
              grid.push(row);
            }
            return callback();
          });
        });
      } else if (id !== topOrgId) { // if the filter by parent is applied then dont return buildings that has no parents
        totalBuildings++;
        return callback();
      } else {
        row.facility = building.resource.name;
        row.id = building.resource.id;
        row.latitude = lat;
        row.longitude = long;
        totalBuildings++;
        if (grid.length < count) {
          grid.push(row);
        }
      }
    }, () => callback(grid, totalBuildings));
  },

  createTree(mcsd, topOrg, callback) {
    const tree = [];
    const lookup = [];
    const addLater = {};
    async.each(mcsd.entry, (entry, callback1) => {
      const found = entry.resource.physicalType.coding.find(coding => coding.code == 'bu');
      if (found) {
        return callback1();
      }

      const id = entry.resource.id;
      const item = {
        text: entry.resource.name,
        id,
        children: [],
      };
      lookup[id] = item;
      if (id === topOrg || !entry.resource.hasOwnProperty('partOf')) {
        tree.push(item);
      } else {
        const parent = entry.resource.partOf.reference.substring(9);
        if (lookup[parent]) {
          lookup[parent].children.push(item);
        } else if (addLater[parent]) {
          addLater[parent].push(item);
        } else {
          addLater[parent] = [item];
        }
      }
      callback1();
    }, () => {
      if (Object.keys(addLater).length > 0) {
        for (id in addLater) {
          if (lookup[id]) {
            lookup[id].children.push(...addLater[id]);
          } else {
            winston.error(`Couldn't find ${id} in tree.`);
          }
        }
      }
      const sortKids = (a, b) => a.text.localeCompare(b.text);
      const runSort = (arr) => {
        arr.sort(sortKids);
        for (item of arr) {
          if (item.children.length > 0) {
            runSort(item.children);
          }
        }
      };
      runSort(tree);
      if (tree.hasOwnProperty(0)) {
        // return children of fake topOrgId,skip the fake topOrgId
        return callback(tree[0].children);
      }
      return callback(tree);
    });
  },
});
