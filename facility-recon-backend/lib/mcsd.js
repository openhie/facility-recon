/* eslint-disable radix */
/* eslint-disable no-restricted-syntax */
/* eslint-disable guard-for-in */
/* eslint-disable no-param-reassign */
/* eslint-disable consistent-return */
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
const moment = require('moment');
const lodash = require('lodash');
const mongo = require('./mongo')();
const mixin = require('./mixin')();
const config = require('./config');
const codesystem = require('../terminologies/gofr-codesystem.json');

const topOrgId = config.getConf('mCSD:fakeOrgId');
const topOrgName = config.getConf('mCSD:fakeOrgName');

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || '127.0.0.1',
});

module.exports = () => ({
  getTerminologyCode(code) {
    return codesystem.concept.find(concept => concept.code === code);
  },

  getCodeSystem({
    codeSystemURI,
    code,
    database,
  }, callback) {
    if (!database) {
      database = config.getConf('hapi:defaultDBName');
    }
    let url = URI(config.getConf('mCSD:url'));
    if (database) {
      url = url.segment(database);
    }
    url = url.segment('fhir').segment('CodeSystem');
    if (codeSystemURI) {
      url.addQuery('url', codeSystemURI);
    }
    if (code) {
      url.addQuery('code', code);
    }
    url = url.toString();
    const codeSystems = {};
    codeSystems.entry = [];
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
          if (mcsd.total > 0 && mcsd.entry && mcsd.entry.length > 0) {
            codeSystems.entry = codeSystems.entry.concat(mcsd.entry);
          }
          return callback(false, url);
        });
      },
      () => url != false,
      () => {
        callback(codeSystems);
      },
    );
  },

  getCodeSystemFromCodesMinimal({
    codes,
    codeSystemName,
  }, callback) {
    const codeSystemURI = mixin.getCodesysteURI(codeSystemName);
    let concepts = [];
    if (Array.isArray(codes) && codes.length > 0) {
      this.getCodeSystem({
        codeSystemURI: codeSystemURI.uri,
      }, (codeSystems) => {
        async.each(codeSystems.entry, (codeSystem, nxtSyst) => {
          const codeConcept = codeSystem.resource.concept.filter(concept => codes.includes(concept.code));
          concepts = concepts.concat(codeConcept);
          return nxtSyst();
        }, () => callback(concepts));
      });
    } else {
      return callback(null);
    }
  },

  getOrganizationByID({
    database,
    id,
  }, callback) {
    if (!database) {
      database = config.getConf('hapi:defaultDBName');
    }
    let url = URI(config.getConf('mCSD:url'));
    if (database) {
      url = url.segment(database);
    }
    url = url.segment('fhir').segment('Organization');
    if (id) {
      url = `${url}?_id=${id.toString()}`;
    } else {
      url = url.toString();
    }
    const organizations = {};
    organizations.entry = [];
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
          if (mcsd.total > 0 && mcsd.entry && mcsd.entry.length > 0) {
            organizations.entry = organizations.entry.concat(mcsd.entry);
          }
          return callback(false, url);
        });
      },
      () => url != false,
      () => {
        callback(organizations);
      },
    );
  },

  getServices({
    database,
    id,
  }, callback) {
    if (!database) {
      database = config.getConf('hapi:defaultDBName');
    }
    const baseUrl = URI(config.getConf('mCSD:url')).segment(database).segment('fhir').segment('HealthcareService');
    let url = baseUrl;
    baseUrl.toString();
    if (id) {
      url.addQuery('_id', id);
    }
    url = url.toString();
    let services;
    services = cache.get(`url_${baseUrl}`);
    if (services) {
      winston.info(`Getting ${baseUrl} from cache`);
      return callback(services);
    }
    services = {
      entry: [],
    };

    const started = cache.get(`started_${baseUrl}`);
    if (started) {
      winston.info(`getServices is in progress will try again in 10 seconds.${baseUrl}`);
      setTimeout(() => {
        this.getLocations({
          database,
          id,
        }, callback);
      }, 10000);
      return;
    }
    cache.put(`started_${baseUrl}`, true);
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
          if (body.total == 0 && body.entry && body.entry.length > 0) {
            winston.error('Non mCSD data returned');
            cache.del(`started_${baseUrl}`);
            return callback(false, false);
          }
          const next = body.link.find(link => link.relation == 'next');
          if (next) {
            url = next.url;
          }
          if (body.total > 0 && body.entry && body.entry.length > 0) {
            services.entry = services.entry.concat(body.entry);
          }
          return callback(false, url);
        });
      },
      () => url != false,
      () => {
        if (services.entry.length > 1) {
          winston.info(`Saving ${baseUrl} to cache`);
          cache.put(`url_${baseUrl}`, services, config.getConf('mCSD:cacheTime'));
        } else {
          winston.info(`Not more than 1 entry for ${baseUrl} so not caching.`);
        }
        cache.del(`started_${baseUrl}`);
        return callback(services);
      },
    );
  },

  getLocations(database, callback) {
    const baseUrl = URI(config.getConf('mCSD:url')).segment(database).segment('fhir').segment('Location')
      .toString();
    let url = `${baseUrl}?_count=37000`;
    let locations;
    locations = cache.get(`url_${baseUrl}`);
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
    cache.put(`started_${baseUrl}`, true);
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
          if (body.total == 0 && body.entry && body.entry.length > 0) {
            winston.error('Non mCSD data returned');
            cache.del(`started_${baseUrl}`);
            return callback(false, false);
          }
          const next = body.link.find(link => link.relation == 'next');
          if (next) {
            url = next.url;
          }
          if (body.total > 0 && body.entry && body.entry.length > 0) {
            locations.entry = locations.entry.concat(body.entry);
          }
          return callback(false, url);
        });
      },
      () => url != false,
      () => {
        if (locations.entry.length > 1) {
          winston.info(`Saving ${baseUrl} to cache`);
          cache.put(`url_${baseUrl}`, locations, config.getConf('mCSD:cacheTime'));
        } else {
          winston.info(`Not more than 1 entry for ${baseUrl} so not caching.`);
        }
        cache.del(`started_${baseUrl}`);
        return callback(locations);
      },
    );
  },

  getLocationByID(database, id, includeFacilityOrganization, callback) {
    if (!database) {
      database = config.getConf('hapi:defaultDBName');
    }
    let url = URI(config.getConf('mCSD:url'));
    if (database) {
      url = url.segment(database);
    }
    url = url.segment('fhir').segment('Location');
    if (id) {
      url.addQuery('_id', id);
    }
    if (includeFacilityOrganization) {
      url.addQuery('_include', 'Location:organization');
    }
    url = url.toString();

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
          if (mcsd.total > 0 && mcsd.entry && mcsd.entry.length > 0) {
            locations.entry = locations.entry.concat(mcsd.entry);
          }
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
          if (body.total > 0 && body.entry && body.entry.length > 0) {
            locations.entry = locations.entry.concat(body.entry);
          }
          return callback(false, url);
        });
      },
      () => url != false,
      () => {
        callback(locations);
      },
    );
  },

  getLocationChildren({
    database,
    parent,
  }, callback) {
    if (!database) {
      database = config.getConf('hapi:defaultDBName');
    }
    if (!parent) {
      parent = '';
    }
    let baseUrl = URI(config.getConf('mCSD:url'));
    if (database) {
      baseUrl = baseUrl.segment(database);
    }
    baseUrl = baseUrl.segment('fhir').segment('Location').toString();
    let url = baseUrl;
    if (parent) {
      url += `?_id=${parent}&_revinclude:recurse=Location:partof`;
    }
    url = url.toString();
    const locations = {
      entry: [],
    };
    winston.info(`Getting ${url} from server`);
    async.doWhilst(
      (doCallback) => {
        const options = {
          url,
        };
        url = false;
        request.get(options, (err, res, body) => {
          if (!isJSON(body)) {
            return doCallback(false, false);
          }
          body = JSON.parse(body);
          if (body.total == 0 && body.entry && body.entry.length > 0) {
            winston.error('Non mCSD data returned');
            return doCallback(false, false);
          }
          if (!body.entry || body.entry.length === 0) {
            return doCallback(false, false);
          }
          const next = body.link.find(link => link.relation == 'next');
          if (next) {
            url = next.url;
          }
          locations.entry = locations.entry.concat(body.entry);
          return doCallback(false, url);
        });
      },
      () => url != false,
      () => callback(locations),
    );
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
          if (mcsd.total > 0 && mcsd.entry && mcsd.entry.length > 0) {
            locations.entry = locations.entry.concat(mcsd.entry);
          }
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
    if (entityParent == null ||
      entityParent == false ||
      entityParent == undefined ||
      !topOrg ||
      !database
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
      const url = `${URI(config.getConf('mCSD:url')).segment(database).segment('fhir').segment('Location')}?_id=${entityParent.toString()}`;

      const options = {
        url,
      };

      const cachedData = cache.get(url);
      if (cachedData) {
        var entityParent = cachedData.entityParent;
        if (details == 'all') {
          parents.push({
            text: cachedData.text,
            id: cachedData.id,
            lat: cachedData.lat,
            long: cachedData.long,
          });
        } else if (details == 'id') {
          parents.push(cachedData.id);
        } else if (details == 'names') {
          parents.push(cachedData.text);
        } else {
          winston.error('parent details (either id,names or all) to be returned not specified');
        }

        // if this is a topOrg then end here,we dont need to fetch the upper org which is continent i.e Africa
        if (entityParent && topOrg && entityParent.endsWith(topOrg)) {
          me.getLocationByID(database, topOrg, false, (loc) => {
            if (details == 'all') {
              parents.push({
                text: loc.entry[0].resource.name,
                id: topOrg,
                lat: cachedData.lat,
                long: cachedData.long,
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
        } else if (entityParent) {
          getPar(entityParent, (parents) => {
            callback(parents);
          });
        } else return callback(parents);
      } else {
        request.get(options, (err, res, body) => {
          if (!isJSON(body)) {
            return callback(parents);
          }
          body = JSON.parse(body);
          let long = null;
          let lat = null;
          if (body.total === 0 && body.entry && body.entry.length > 0) {
            winston.error('Empty mcsd data received, this wasnt expected');
            return callback(parents);
          }
          if (body.entry[0].resource.hasOwnProperty('position')) {
            long = body.entry[0].resource.position.longitude;
            lat = body.entry[0].resource.position.latitude;
          }
          var entityParent = null;
          if (body.entry[0].resource.hasOwnProperty('partOf')) {
            entityParent = body.entry[0].resource.partOf.reference;
          }

          const cacheData = {
            text: body.entry[0].resource.name,
            id: body.entry[0].resource.id,
            lat,
            long,
            entityParent,
          };
          cache.put(url, cacheData, 120 * 1000);
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
          } else if (body.entry[0].resource.hasOwnProperty('partOf') &&
            body.entry[0].resource.partOf.reference != false &&
            body.entry[0].resource.partOf.reference != null &&
            body.entry[0].resource.partOf.reference != undefined) {
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

        if (entry.resource.hasOwnProperty('partOf') &&
          entry.resource.partOf.reference != false &&
          entry.resource.partOf.reference != null &&
          entry.resource.partOf.reference != undefined) {
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

  getBuildingsFromData(mcsd, callback) {
    const buildings = [];
    mcsd.entry.map((entry) => {
      if (!entry.resource || !entry.resource.physicalType || !entry.resource.physicalType.coding || !Array.isArray(entry.resource.physicalType.coding)) {
        return;
      }
      const found = entry.resource.physicalType.coding.find(coding => coding.code === 'bu');
      if (found) {
        buildings.push(entry);
      }
    });
    return callback(buildings);
  },

  getBuildings(filters, callback) {
    this.getLocationChildren(filters, (locations) => {
      this.getBuildingsFromData(locations, buildings => callback(false, buildings));
    });
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
        if ((body.total === 0 || (body.entry && body.entry.length === 0)) && prev_entry.length > 0) {
          entry = prev_entry.shift();
        } else if ((body.total === 0 || (body.entry && body.entry.length === 0)) && Object.keys(prev_entry).length === 0) {
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
        fhir.type = 'batch';
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

  addJurisdiction({
    database,
    name,
    code,
    id,
    parent,
  }, callback) {
    const resource = {};
    resource.resourceType = 'Location';
    resource.meta = {};
    resource.meta.profile = [];
    resource.meta.profile.push('http://ihe.net/fhir/StructureDefinition/IHE_mCSD_Location');
    resource.name = name;
    if (id) {
      resource.id = id;
    } else {
      resource.id = uuid4();
    }
    if (parent) {
      resource.partOf = {
        reference: `Location/${parent}`,
      };
    } else {
      resource.partOf = {
        reference: `Location/${topOrgId}`,
        display: topOrgName,
      };
    }
    if (code) {
      resource.identifier = [{
        system: 'https://digitalhealth.intrahealth.org/code',
        value: code,
      }];
    }
    resource.physicalType = {
      coding: [{
        system: 'http://hl7.org/fhir/location-physical-type',
        code: 'jdn',
        display: 'Jurisdiction',
      }],
      text: 'Jurisdiction',
    };
    const fhir = {};
    fhir.entry = [];
    fhir.type = 'batch';
    fhir.resourceType = 'Bundle';
    fhir.entry.push({
      resource,
      request: {
        method: 'PUT',
        url: `Location/${resource.id}`,
      },
    });
    this.saveLocations(fhir, database, (err, res) => {
      if (err) {
        winston.error(err);
      }
      callback(err, resource.id);
    });
  },
  addService(fields, callback) {
    async.series({
      type: (callback) => {
        const types = JSON.parse(fields.type);
        this.getCodeSystemFromCodesMinimal({
          codes: types,
          codeSystemName: 'serviceTypes',
        }, concepts => callback(null, concepts));
      },
      category: (callback) => {
        const categories = JSON.parse(fields.category);
        this.getCodeSystemFromCodesMinimal({
          codes: categories,
          codeSystemName: 'serviceCategories',
        }, concepts => callback(null, concepts));
      },
      characteristic: (callback) => {
        let characteristics;
        try {
          characteristics = JSON.parse(fields.characteristic);
        } catch (error) {
          return callback(null, null);
        }
        this.getCodeSystemFromCodesMinimal({
          codes: characteristics,
          codeSystemName: 'serviceCharacteristics',
        }, concepts => callback(null, concepts));
      },
      serviceProvisionCode: (callback) => {
        let serviceProvisionConditions;
        try {
          serviceProvisionConditions = JSON.parse(fields.serviceProvisionCode);
        } catch (error) {
          return callback(null, null);
        }
        this.getCodeSystemFromCodesMinimal({
          codes: serviceProvisionConditions,
          codeSystemName: 'serviceProvisionConditions',
        }, concepts => callback(null, concepts));
      },
      program: (callback) => {
        let programs;
        try {
          programs = JSON.parse(fields.program);
        } catch (error) {
          return callback(null, null);
        }
        this.getCodeSystemFromCodesMinimal({
          codes: programs,
          codeSystemName: 'programs',
        }, concepts => callback(null, concepts));
      },
      specialty: (callback) => {
        const specialties = JSON.parse(fields.specialty);
        this.getCodeSystemFromCodesMinimal({
          codes: specialties,
          codeSystemName: 'specialties',
        }, concepts => callback(null, concepts));
      },
      eligibility: (callback) => {
        const eligibilities = JSON.parse(fields.eligibility);
        this.getCodeSystemFromCodesMinimal({
          codes: eligibilities,
          codeSystemName: 'serviceEligibilities',
        }, concepts => callback(null, concepts));
      },
      language: (callback) => {
        const languages = JSON.parse(fields.communication);
        this.getCodeSystemFromCodesMinimal({
          codes: languages,
          codeSystemName: 'languages',
        }, concepts => callback(null, concepts));
      },
      referralMethod: (callback) => {
        const referralMethods = JSON.parse(fields.referralMethod);
        this.getCodeSystemFromCodesMinimal({
          codes: referralMethods,
          codeSystemName: 'referralMethods',
        }, concepts => callback(null, concepts));
      },
      location: (callback) => {
        const locations = JSON.parse(fields.location);
        if (Array.isArray(locations) && locations.length > 0) {
          const locationRef = locations.map(location => ({
            reference: `Location/${location}`,
          }));
          return callback(null, locationRef);
        }
        return callback(null);
      },
    }, (err, response) => {
      const resource = {};
      resource.resourceType = 'HealthcareService';
      if (fields.id) {
        resource.id = fields.id;
      } else {
        resource.id = uuid4();
      }
      resource.name = fields.name;
      if (fields.code) {
        resource.identifier = [{
          system: 'https://digitalhealth.intrahealth.org/code',
          value: fields.code,
        }];
      }
      resource.active = JSON.parse(fields.active);
      resource.appointmentRequired = JSON.parse(fields.appointmentRequired);
      if (JSON.parse(fields.category).length > 0) {
        const codeSystemURI = mixin.getCodesysteURI('serviceCategories');
        const codeableConcept = mixin.createCodeableConcept(response.category, codeSystemURI.uri);
        resource.category = codeableConcept;
      }
      if (JSON.parse(fields.type).length > 0) {
        const codeSystemURI = mixin.getCodesysteURI('serviceTypes');
        const codeableConcept = mixin.createCodeableConcept(response.type, codeSystemURI.uri);
        resource.type = codeableConcept;
      }
      if (JSON.parse(fields.characteristic).length > 0) {
        const codeSystemURI = mixin.getCodesysteURI('serviceCharacteristics');
        const codeableConcept = mixin.createCodeableConcept(response.characteristic, codeSystemURI.uri);
        resource.characteristic = codeableConcept;
      }
      if (JSON.parse(fields.program).length > 0) {
        const codeSystemURI = mixin.getCodesysteURI('programs');
        const codeableConcept = mixin.createCodeableConcept(response.program, codeSystemURI.uri);
        resource.program = codeableConcept;
      }
      if (JSON.parse(fields.specialty).length > 0) {
        const codeSystemURI = mixin.getCodesysteURI('specialties');
        const codeableConcept = mixin.createCodeableConcept(response.specialty, codeSystemURI.uri);
        resource.specialty = codeableConcept;
      }
      if (JSON.parse(fields.eligibility).length > 0) {
        resource.eligibility = [];
        const codeSystemURI = mixin.getCodesysteURI('serviceEligibilities');
        const codeableConcept = mixin.createCodeableConcept(response.eligibility, codeSystemURI.uri);
        codeableConcept.forEach((codeable) => {
          resource.eligibility.push({
            code: codeable,
          });
        });
      }
      if (JSON.parse(fields.communication).length > 0) {
        const codeSystemURI = mixin.getCodesysteURI('languages');
        const codeableConcept = mixin.createCodeableConcept(response.language, codeSystemURI.uri);
        resource.communication = codeableConcept;
      }
      if (JSON.parse(fields.referralMethod).length > 0) {
        const codeSystemURI = mixin.getCodesysteURI('referralMethods');
        const codeableConcept = mixin.createCodeableConcept(response.referralMethod, codeSystemURI.uri);
        resource.referralMethod = codeableConcept;
      }
      if (JSON.parse(fields.serviceProvisionCode).length > 0) {
        const codeSystemURI = mixin.getCodesysteURI('serviceProvisionConditions');
        const codeableConcept = mixin.createCodeableConcept(response.serviceProvisionCode, codeSystemURI.uri);
        resource.serviceProvisionCode = codeableConcept;
      }
      if (JSON.parse(fields.location).length > 0) {
        resource.location = response.location;
      }
      if (fields.comment) {
        resource.comment = fields.comment;
      }
      if (fields.extraDetails) {
        resource.extraDetails = fields.extraDetails;
      }
      if (fields.photo) {
        resource.photo = fields.photo;
      }
      try {
        const telecom = JSON.parse(fields.telecom);
        resource.telecom = [];
        if (telecom.phone) {
          resource.telecom.push({
            system: 'phone',
            value: telecom.phone,
          });
        }
        if (telecom.email) {
          resource.telecom.push({
            system: 'email',
            value: telecom.email,
          });
        }
        if (telecom.fax) {
          resource.telecom.push({
            system: 'fax',
            value: telecom.fax,
          });
        }
        if (telecom.website) {
          resource.telecom.push({
            system: 'url',
            value: telecom.website,
          });
        }
      } catch (error) {
        winston.error(error);
      }
      if (resource.telecom.length === 0) {
        delete resource.telecom;
      }
      const availableTime = JSON.parse(fields.availableTime);
      resource.availableTime = [];
      availableTime.forEach((avTime) => {
        const time = {};
        let addThis = false;
        if (avTime.mainFields.daysOfWeek.length > 0) {
          time.daysOfWeek = avTime.mainFields.daysOfWeek;
          addThis = true;
        }
        time.allDay = avTime.mainFields.allDay;
        if (avTime.mainFields.availableStartTime && !avTime.mainFields.allDay) {
          time.availableStartTime = avTime.mainFields.availableStartTime;
          addThis = true;
        }
        if (avTime.mainFields.availableEndTime && !avTime.mainFields.allDay) {
          time.availableEndTime = avTime.mainFields.availableEndTime;
          addThis = true;
        }
        if (addThis) {
          resource.availableTime.push(time);
        }
      });
      if (resource.availableTime.length === 0) {
        delete resource.availableTime;
      }
      const notAvailable = JSON.parse(fields.notAvailable);
      resource.notAvailable = [];
      notAvailable.forEach((notAv) => {
        const notAvDet = {};
        notAvDet.description = notAv.mainFields.description;
        if (notAvDet.description) {
          if (notAv.mainFields.during && notAv.mainFields.during.start) {
            notAvDet.during = {};
            notAvDet.during.start = notAv.mainFields.during.start;
          }
          if (notAv.mainFields.during && notAv.mainFields.during.end) {
            notAvDet.during.end = notAv.mainFields.during.end;
          }
          resource.notAvailable.push(notAvDet);
        }
      });
      const fhir = {};
      fhir.entry = [];
      fhir.type = 'batch';
      fhir.resourceType = 'Bundle';
      fhir.entry.push({
        resource,
        request: {
          method: 'PUT',
          url: `HealthcareService/${resource.id}`,
        },
      });
      this.saveLocations(fhir, '', (err, res) => {
        if (err) {
          winston.error(err);
        }
        callback(err);
      });
    });
  },
  addBuilding(fields, callback) {
    let database = '';
    if (fields.action && fields.action === 'request') {
      database = config.getConf('hapi:requestsDBName');
    }
    async.series([
      (callback) => {
        if (fields.id) {
          this.getLocationByID('', fields.id, true, location => callback(null, location));
        } else {
          return callback(null);
        }
      },
    ], (error, response) => {
      if (error) {
        winston.error('An error has occured while trying to get a resource ID');
        return callback(error);
      }
      if (!response || !Array.isArray(response) || (response[0] && (!response[0].entry || !Array.isArray(response[0].entry)))) {
        winston.error('invalid response received');
        return callback('invalid response received');
      }
      let LocationResource;
      let OrganizationResource;
      if (response[0]) {
        LocationResource = response[0].entry.find(entry => entry.resource.resourceType === 'Location');
        OrganizationResource = response[0].entry.find(entry => entry.resource.resourceType === 'Organization');
      }
      if (LocationResource) {
        LocationResource = LocationResource.resource;
      } else {
        LocationResource = {};
      }
      if (OrganizationResource) {
        OrganizationResource = OrganizationResource.resource;
      } else {
        OrganizationResource = {};
      }
      if (!LocationResource.id) {
        LocationResource.id = uuid4();
        LocationResource.resourceType = 'Location';
        LocationResource.meta = {};
        LocationResource.meta.profile = [];
        LocationResource.meta.profile.push('http://ihe.net/fhir/StructureDefinition/IHE_mCSD_Location');
        LocationResource.meta.profile.push('http://ihe.net/fhir/StructureDefinition/IHE_mCSD_FacilityLocation');
      }
      if (fields.name) {
        LocationResource.name = fields.name;
      }
      if (fields.alt_name) {
        if (!LocationResource.alias) {
          LocationResource.alias = [];
          LocationResource.alias.push(fields.alt_name);
        } else {
          const aliasIndex = LocationResource.alias.indexOf(fields.alt_name);
          if (aliasIndex === -1) {
            LocationResource.alias.push(fields.alt_name);
          } else {
            LocationResource.alias[aliasIndex] = fields.alt_name;
          }
        }
      } else {
        LocationResource.alias = [];
      }
      if (fields.code) {
        if (!LocationResource.identifier) {
          LocationResource.identifier = [{
            system: 'https://digitalhealth.intrahealth.org/code',
            value: fields.code,
          }];
        } else {
          const codeIndex = LocationResource.identifier.findIndex(identifier => identifier.system === 'https://digitalhealth.intrahealth.org/code');
          if (codeIndex === -1) {
            LocationResource.identifier.push({
              system: 'https://digitalhealth.intrahealth.org/code',
              value: fields.code,
            });
          } else {
            LocationResource.identifier[codeIndex] = {
              system: 'https://digitalhealth.intrahealth.org/code',
              value: fields.code,
            };
          }
        }
      } else {
        const codeIndex = LocationResource.identifier && LocationResource.identifier.findIndex(identifier => identifier.system === 'https://digitalhealth.intrahealth.org/code');
        if (codeIndex !== -1 && LocationResource.identifier) {
          LocationResource.identifier.splice(codeIndex, 1);
        }
      }

      if (!LocationResource.type) {
        LocationResource.type = [];
        const coding = [];
        coding.push({
          system: 'urn:ietf:rfc:3986',
          code: 'urn:ihe:iti:mcsd:2019:facility',
          display: 'Facility',
          userSelected: false,
        });
        LocationResource.type.push({
          coding,
        });
      }
      if (fields.type) {
        const typeConcept = this.getTerminologyCode(fields.type);
        if (typeConcept) {
          const type = {};
          type.text = typeConcept.display;
          type.coding = [{
            system: 'https://digitalhealth.intrahealth.org/locType',
            code: typeConcept.code,
            display: typeConcept.display,
          }];
          const typeIndex = LocationResource.type.findIndex((type) => {
            const coding = type.coding.find(coding => coding.system === 'https://digitalhealth.intrahealth.org/locType');
            return coding;
          });
          if (typeIndex === -1) {
            LocationResource.type.push(type);
          } else {
            LocationResource.type[typeIndex] = type;
          }
        }
      } else {
        const typeIndex = LocationResource.type.findIndex((type) => {
          const coding = type.coding.find(coding => coding.system === 'https://digitalhealth.intrahealth.org/locType');
          return coding;
        });
        if (typeIndex !== -1) {
          LocationResource.type.splice(typeIndex, 1);
        }
      }
      if (fields.status) {
        LocationResource.status = fields.status;
      } else {
        LocationResource.status = 'active';
      }
      if (fields.lat || fields.long) {
        if (!LocationResource.position) {
          LocationResource.position = {};
        }
        if (fields.lat) {
          LocationResource.position.latitude = fields.lat;
        } else {
          delete LocationResource.position.latitude;
        }
        if (fields.long) {
          LocationResource.position.longitude = fields.long;
        } else {
          delete LocationResource.position.longitude;
        }
      } else {
        delete LocationResource.position;
      }
      try {
        fields.contact = JSON.parse(fields.contact);
        if (!LocationResource.telecom) {
          LocationResource.telecom = [];
        }
        if (fields.contact.phone) {
          const phoneIndex = LocationResource.telecom.findIndex(telecom => telecom.system === 'phone');
          if (phoneIndex === -1) {
            LocationResource.telecom.push({
              system: 'phone',
              value: fields.contact.phone,
            });
          } else {
            LocationResource.telecom[phoneIndex] = {
              system: 'phone',
              value: fields.contact.phone,
            };
          }
        } else {
          const phoneIndex = LocationResource.telecom.findIndex(telecom => telecom.system === 'phone');
          if (phoneIndex !== -1) {
            LocationResource.telecom.splice(phoneIndex, 1);
          }
        }
        if (fields.contact.email) {
          const emailIndex = LocationResource.telecom.findIndex(telecom => telecom.system === 'email');
          if (emailIndex === -1) {
            LocationResource.telecom.push({
              system: 'email',
              value: fields.contact.email,
            });
          } else {
            LocationResource.telecom[emailIndex] = {
              system: 'email',
              value: fields.contact.email,
            };
          }
        } else {
          const emailIndex = LocationResource.telecom.findIndex(telecom => telecom.system === 'email');
          if (emailIndex !== -1) {
            LocationResource.telecom.splice(emailIndex, 1);
          }
        }
        if (fields.contact.fax) {
          const faxIndex = LocationResource.telecom.findIndex(telecom => telecom.system === 'fax');
          if (faxIndex === -1) {
            LocationResource.telecom.push({
              system: 'fax',
              value: fields.contact.fax,
            });
          } else {
            LocationResource.telecom[faxIndex] = {
              system: 'fax',
              value: fields.contact.fax,
            };
          }
        } else {
          const faxIndex = LocationResource.telecom.findIndex(telecom => telecom.system === 'fax');
          if (faxIndex !== -1) {
            LocationResource.telecom.splice(faxIndex, 1);
          }
        }
        if (fields.contact.website) {
          const urlIndex = LocationResource.telecom.findIndex(telecom => telecom.system === 'url');
          if (urlIndex === -1) {
            LocationResource.telecom.push({
              system: 'url',
              value: fields.contact.website,
            });
          } else {
            LocationResource.telecom[urlIndex] = {
              system: 'url',
              value: fields.contact.website,
            };
          }
        } else {
          const urlIndex = LocationResource.telecom.findIndex(telecom => telecom.system === 'url');
          if (urlIndex !== -1) {
            LocationResource.telecom.splice(urlIndex, 1);
          }
        }
      } catch (error) {
        winston.error(error);
      }
      if (fields.description) {
        LocationResource.description = fields.description;
      } else {
        LocationResource.description = '';
      }
      if (fields.parent) {
        LocationResource.partOf = {
          reference: `Location/${fields.parent}`,
        };
      }
      LocationResource.physicalType = {
        coding: [{
          system: 'http://hl7.org/fhir/location-physical-type',
          code: 'bu',
          display: 'Building',
        }],
        text: 'Building',
      };
      if (fields.action === 'request' && fields.requestCategory !== 'requestsList') {
        const facilityUpdateRequestURI = mixin.getCodesysteURI('facilityUpdateRequest');
        const facilityAddRequestURI = mixin.getCodesysteURI('facilityAddRequest');
        if (!LocationResource.meta) {
          LocationResource.meta = {};
        }
        if (!LocationResource.meta.tag) {
          LocationResource.meta.tag = [];
        }
        let requestURI;
        let requestDescription;
        if (fields.requestType === 'add') {
          requestURI = facilityAddRequestURI.uri;
          requestDescription = 'Request to add new facility';
        } else if (fields.requestType === 'update') {
          requestURI = facilityUpdateRequestURI.uri;
          requestDescription = 'Request to update facility details';
        }
        const extension = [{
          url: 'status',
          valueString: 'pending',
        }, {
          url: 'description',
          valueString: requestDescription,
        }, {
          url: 'username',
          valueString: fields.username,
        }, {
          url: 'statusDate',
          valueDate: moment().format('Y-M-DTHH:mm:ssZ'),
        }];
        if (!LocationResource.extension) {
          LocationResource.extension = [];
        }
        LocationResource.extension.push({
          url: requestURI,
          extension,
        });
      }

      if (!OrganizationResource.id) {
        OrganizationResource.id = uuid4();
        OrganizationResource.resourceType = 'Organization';
        OrganizationResource.meta = {};
        OrganizationResource.meta.profile = [];
        OrganizationResource.meta.profile.push('http://ihe.net/fhir/StructureDefinition/IHE_mCSD_Organization');
        OrganizationResource.meta.profile.push('http://ihe.net/fhir/StructureDefinition/IHE_mCSD_FacilityOrganization');
      }
      OrganizationResource.name = fields.name;
      LocationResource.managingOrganization = {
        reference: `Organization/${OrganizationResource.id}`,
      };
      if (fields.ownership) {
        const ownershipConcept = this.getTerminologyCode(fields.ownership);
        if (ownershipConcept) {
          if (!OrganizationResource.type) {
            OrganizationResource.type = [];
          }
          const type = {};
          type.text = ownershipConcept.display;
          type.coding = [{
            system: 'https://digitalhealth.intrahealth.org/orgType',
            code: ownershipConcept.code,
            display: ownershipConcept.display,
          }];
          const typeIndex = OrganizationResource.type.findIndex((type) => {
            const coding = type.coding.find(coding => coding.system === 'https://digitalhealth.intrahealth.org/orgType');
            return coding;
          });
          if (typeIndex === -1) {
            OrganizationResource.type.push(type);
          } else {
            OrganizationResource.type[typeIndex] = type;
          }
        }
      } else {
        const typeIndex = OrganizationResource.type && OrganizationResource.type.findIndex((type) => {
          const coding = type.coding.find(coding => coding.system === 'https://digitalhealth.intrahealth.org/orgType');
          return coding;
        });
        if (typeIndex !== -1 && OrganizationResource.type) {
          OrganizationResource.type.splice(typeIndex, 1);
        }
      }
      const fhir = {};
      fhir.entry = [];
      fhir.type = 'batch';
      fhir.resourceType = 'Bundle';
      if (OrganizationResource) {
        fhir.entry.push({
          resource: OrganizationResource,
          request: {
            method: 'PUT',
            url: `Organization/${OrganizationResource.id}`,
          },
        });
      }
      fhir.entry.push({
        resource: LocationResource,
        request: {
          method: 'PUT',
          url: `Location/${LocationResource.id}`,
        },
      });
      this.saveLocations(fhir, database, (err, res) => {
        if (err) {
          winston.error(err);
        }
        callback(err);
      });
    });
  },

  changeBuildingRequestStatus({
    id,
    status,
    requestType,
  }, callback) {
    let database = config.getConf('hapi:requestsDBName');
    const requestIdURI = mixin.getCodesysteURI('originalRequestId');
    this.getLocationByID(database, id, true, (location) => {
      if (!location || !location.entry || location.entry.length === 0) {
        winston.error(`No location with id ${id} found`);
        return callback(`No location with id ${id} found`);
      }
      const locationResource = location.entry.find(entry => entry.resource.resourceType === 'Location');
      const organizationResource = location.entry.find(entry => entry.resource.resourceType === 'Organization');
      if (!locationResource) {
        winston.error(`No location resource with id ${id} found`);
        return callback(`No location resource with id ${id} found`);
      }
      const requestExtension = mixin.getLatestFacilityRequest(locationResource.resource.extension, requestType);
      if (!requestExtension || !Array.isArray(requestExtension)) {
        winston.error('Request extension cant be found, stop changing status');
        return callback(true);
      }
      for (const i in requestExtension) {
        if (requestExtension[i].url === 'status') {
          requestExtension[i].valueString = status;
        }
      }

      async.series([
        (callback) => {
          this.deleteResource({
            resource: 'Location',
            id: locationResource.resource.id,
            database,
          }, (err) => {
            if (err) {
              return callback(err);
            }
            if (organizationResource) {
              this.deleteResource({
                resource: 'Organization',
                id: organizationResource.resource.id,
                database,
              }, (err) => {
                if (err) {
                  return callback(err);
                }
                callback(null);
              });
            } else {
              return callback(null);
            }
          });
        }, (callback) => {
          // save original id into extension then generate a new id for both org and location resource
          const newLocationResource = lodash.cloneDeep(locationResource);
          const newOrganizationResource = lodash.cloneDeep(organizationResource);
          newLocationResource.resource.extension.push({
            url: requestIdURI.uri,
            valueString: newLocationResource.resource.id,
          });
          newLocationResource.resource.id = uuid4();
          if (newOrganizationResource) {
            if (!newOrganizationResource.resource.extension) {
              newOrganizationResource.resource.extension = [];
            }
            newOrganizationResource.resource.extension.push({
              url: requestIdURI.uri,
              valueString: newOrganizationResource.resource.id,
            });
            newOrganizationResource.resource.id = uuid4();
            newLocationResource.resource.managingOrganization = {
              reference: `Organization/${newOrganizationResource.resource.id}`,
            };
          }
          const fhir = {};
          fhir.entry = [];
          fhir.type = 'batch';
          fhir.resourceType = 'Bundle';
          if (newOrganizationResource) {
            fhir.entry.push({
              resource: newOrganizationResource.resource,
              request: {
                method: 'PUT',
                url: `Organization/${newOrganizationResource.resource.id}`,
              },
            });
          }
          fhir.entry.push({
            resource: newLocationResource.resource,
            request: {
              method: 'PUT',
              url: `Location/${newLocationResource.resource.id}`,
            },
          });
          this.saveLocations(fhir, database, (err, res) => {
            if (err) {
              winston.error(err);
              return callback('An error has occured while changing request status');
            }
            return callback(null);
          });
        },
      ], (err, response) => {
        if (status === 'approved') {
          const facilityUpdateRequestURI = mixin.getCodesysteURI('facilityUpdateRequest');
          const facilityAddRequestURI = mixin.getCodesysteURI('facilityAddRequest');
          let requestURI;
          if (requestType === 'add') {
            requestURI = facilityAddRequestURI.uri;
          } else if (requestType === 'update') {
            requestURI = facilityUpdateRequestURI.uri;
          }
          for (const i in locationResource.resource.extension) {
            if (locationResource.resource.extension[i].url === requestURI) {
              locationResource.resource.extension.splice(i, 1);
            }
          }
          const fhir = {};
          fhir.entry = [];
          fhir.type = 'batch';
          fhir.resourceType = 'Bundle';
          if (organizationResource) {
            fhir.entry.push({
              resource: organizationResource.resource,
              request: {
                method: 'PUT',
                url: `Organization/${organizationResource.resource.id}`,
              },
            });
          }
          fhir.entry.push({
            resource: locationResource.resource,
            request: {
              method: 'PUT',
              url: `Location/${locationResource.resource.id}`,
            },
          });
          database = '';
          this.saveLocations(fhir, database, (err, res) => {
            if (err) {
              winston.error(err);
              return callback(err);
            }
            return callback();
          });
        } else {
          return callback();
        }
      });
    });
  },

  addCodeSystem({
    name,
    text,
    code,
    codeSystemType,
  }, callback) {
    const codeSyst = mixin.getCodesysteURI(codeSystemType);
    if (!codeSyst) {
      winston.error(`Code system type ${codeSystemType} not found on the config file`);
      return callback(true);
    }
    const codeSystemURI = codeSyst.uri;
    this.getCodeSystem({
      codeSystemURI,
    }, (codeSystem) => {
      let codeSystemResource = {};
      if (codeSystem.entry.length > 0) {
        codeSystemResource = codeSystem.entry[0].resource;
        codeSystemResource.date = moment().format('YYYY-MM-DDTHH:mm:ssZ');
        codeSystemResource.concept.push({
          code,
          display: name,
        });
      } else {
        codeSystemResource.resourceType = 'CodeSystem';
        codeSystemResource.id = uuid4();
        codeSystemResource.url = codeSystemURI;
        codeSystemResource.status = 'active';
        codeSystemResource.content = 'complete';
        codeSystemResource.caseSensitive = true;
        codeSystemResource.date = moment().format('YYYY-MM-DDTHH:mm:ssZ');
        codeSystemResource.version = '1.0.0';
        codeSystemResource.concept = [];
        codeSystemResource.concept.push({
          code,
          display: name,
        });
      }
      const fhir = {};
      fhir.entry = [];
      fhir.type = 'batch';
      fhir.resourceType = 'Bundle';
      fhir.entry.push({
        resource: codeSystemResource,
        request: {
          method: 'PUT',
          url: `CodeSystem/${codeSystemResource.id}`,
        },
      });
      this.saveLocations(fhir, '', (err, res) => {
        if (err) {
          winston.error(err);
        }
        callback(err);
      });
    });
  },

  deleteResource({
    database,
    resource,
    id,
  }, callback) {
    if (!database) {
      database = config.getConf('hapi:defaultDBName');
    }
    const urlPrefix = URI(config.getConf('mCSD:url'))
      .segment(database)
      .segment('fhir')
      .segment(resource);
    const url = URI(urlPrefix).segment(id).toString();
    const options = {
      url,
    };
    request.delete(options, (err, res, body) => {
      if (err) {
        winston.error(err);
        return callback(err);
      }
      this.cleanCache(urlPrefix.toString());
      return callback();
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
            this.cleanCache(url_prefix.toString());
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
                    this.cleanCache(url_prefix.toString());
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
    if (!database) {
      database = config.getConf('hapi:defaultDBName');
    }
    let url = URI(config.getConf('mCSD:url'));
    if (database) {
      url = url.segment(database);
    }
    url = url.segment('fhir').toString();
    const options = {
      url,
      headers: {
        'Content-Type': 'application/json',
      },
      json: mCSD,
    };
    request.post(options, (err, res, body) => {
      if (res.statusCode === 404) {
        winston.error(body);
        winston.error('Looks like the mapping DB does not exist, cant save this location');
        return callback('Failed to save', null);
      }
      if (err) {
        winston.error(err);
        return callback(err);
      }
      this.cleanCache(`${url}/Location`);
      callback(err, body);
    });
  },
  cleanCache(url, selfOnly) {
    for (const key of cache.keys()) {
      if (key.substring(0, url.length + 4) === `url_${url}`) {
        winston.info(`DELETING ${key} from cache because something was modified.`);
        cache.del(key);
      }
    }
    // clean the other workers caches
    if (!selfOnly && process.hasOwnProperty('send')) {
      process.send({
        content: 'clean',
        url,
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
        if (res.source2mCSD.entry.length === 0) {
          winston.error('source2 mcsd has returned empty results, cant save match');
          return callback(true);
        }
        if (res.source1mCSD.entry.length === 0) {
          winston.error('source1 mcsd has returned empty results, cant save match');
          return callback(true);
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
        fhir.type = 'batch';
        fhir.resourceType = 'Bundle';
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
        if (!resource.meta) {
          resource.meta = {};
        }
        if (!resource.meta.tag) {
          resource.meta.tag = [];
        }
        if (matchComments.length > 0) {
          resource.meta.tag.push({
            system: source2System,
            code: matchCommentsCode,
            display: matchComments,
          });
        }
        if (type == 'flag') {
          if (flagComment) {
            resource.meta.tag.push({
              system: source2System,
              code: flagCommentCode,
              display: flagComment,
            });
          }
          resource.meta.tag.push({
            system: source2System,
            code: flagCode,
            display: 'To be reviewed',
          });
        }
        if (autoMatch) {
          resource.meta.tag.push({
            system: source2System,
            code: autoMatchedCode,
            display: 'Automatically Matched',
          });
        } else {
          resource.meta.tag.push({
            system: source2System,
            code: manualllyMatchedCode,
            display: 'Manually Matched',
          });
        }
        entry.push({
          resource,
          request: {
            method: 'PUT',
            url: `Location/${resource.id}`,
          },
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
      delete flagged.id;
      delete flagged.meta;
      delete flagged.total;
      delete flagged.link;
      const flagCode = config.getConf('mapping:flagCode');
      const flagCommentCode = config.getConf('mapping:flagCommentCode');
      // remove the flag tag
      for (const k in flagged.entry[0].resource.meta.tag) {
        const tag = flagged.entry[0].resource.meta.tag[k];
        if (tag.code === flagCode) {
          flagged.entry[0].resource.meta.tag.splice(k, 1);
        }
      }

      for (const k in flagged.entry[0].resource.meta.tag) {
        const tag = flagged.entry[0].resource.meta.tag[k];
        if (tag.code === flagCommentCode) {
          flagged.entry[0].resource.meta.tag.splice(k, 1);
        }
      }
      flagged.entry[0].request = {};
      flagged.entry[0].request.method = 'PUT';
      flagged.entry[0].request.url = `Location/${flagged.entry[0].resource.id}`;
      flagged.resourceType = 'Bundle';
      flagged.type = 'batch';

      // deleting existing location
      const url_prefix = URI(config.getConf('mCSD:url')).segment(mappingDB).segment('fhir').segment('Location');
      const url = URI(url_prefix).segment(source1Id).toString();
      const options = {
        url,
      };
      request.delete(options, (err, res, body) => {
        this.cleanCache(url_prefix.toString());
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
          if (mcsd.entry.length === 0) {
            winston.error(`Location with ID ${source1Id} not found on the mCSD DB, this isnt expected, please cross check`);
            return callback(true);
          }
          const fhir = {};
          fhir.entry = [];
          fhir.type = 'batch';
          fhir.resourceType = 'Bundle';
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
          let typeCode;
          let typeName;
          if (recoLevel == totalLevels) {
            typeCode = 'bu';
            typeName = 'building';
          } else {
            typeCode = 'jdn';
            typeName = 'Jurisdiction';
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
          resource.meta = {};
          resource.meta.tag = [];
          if (type == 'nomatch') {
            resource.meta.tag.push({
              system: source1System,
              code: noMatchCode,
              display: 'No Match',
            });
          } else if (type == 'ignore') {
            resource.meta.tag.push({
              system: source1System,
              code: ignoreCode,
              display: 'Ignore',
            });
          }
          entry.push({
            resource,
            request: {
              method: 'PUT',
              url: `Location/${resource.id}`,
            },
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
    const url = URI(url_prefix).segment(source1Id).toString();
    const options = {
      url,
    };
    this.getLocationByID(source1DB, source1Id, false, (location) => {
      if (location.entry.length === 0) {
        return callback(true, null);
      }
      request.delete(options, (err, res, body) => {
        this.cleanCache(url_prefix.toString());
        if (res.statusCode === 409) {
          return callback('Can not break this match as there are other matches that are child of this', null);
        }
        if (err) {
          return callback('Un expected error has occured, match was not broken', null);
        }
        delete location.resourceType;
        delete location.id;
        delete location.meta;
        delete location.total;
        delete location.link;
        const matchBrokenCode = config.getConf('mapping:matchBrokenCode');
        // remove the flag tag
        let found = false;
        async.eachSeries(location.entry[0].resource.meta.tag, (tag, nxtTag) => {
          if (tag.code === matchBrokenCode) {
            found = true;
          }
          return nxtTag();
        }, () => {
          location.resourceType = 'Bundle';
          location.type = 'batch';
          if (!found) {
            const source1System = 'https://digitalhealth.intrahealth.org/source1';
            if (!location.entry[0].resource.meta) {
              location.entry[0].resource.meta = {};
            }
            if (!location.entry[0].resource.meta.tag) {
              location.entry[0].resource.meta.tag = [];
            }
            location.entry[0].resource.meta.tag.push({
              system: source1System,
              code: matchBrokenCode,
              display: 'Match Broken',
            });
            location.entry[0].request = {};
            location.entry[0].request.method = 'PUT';
            location.entry[0].request.url = `Location/${location.entry[0].resource.id}`;
            this.saveLocations(location, source1DB, (err, res) => {
              callback(err, null);
            });
          } else {
            callback(err, null);
          }
        });
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
      this.cleanCache(url_prefix.toString());
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
        data[headerMapping.code] = data[headerMapping.code].replace(/\s/g, '-');
        levels.sort();
        levels.reverse();
        let facilityParent = null;
        let facilityParentUUID = null;
        async.eachSeries(levels, (level, nxtLevel) => {
          if (data[headerMapping[level]] != null &&
            data[headerMapping[level]] != undefined &&
            data[headerMapping[level]] != false &&
            data[headerMapping[level]] != ''
          ) {
            let name = data[headerMapping[level]].trim();
            name = mixin.toTitleCaseSpace(name);
            const levelNumber = parseInt(level.replace('level', ''));
            let mergedParents = '';

            // merge parents of this location
            for (let k = levelNumber - 1; k >= 1; k--) {
              mergedParents += data[headerMapping[`level${k}`]];
            }
            if (levelNumber.toString().length < 2) {
              var namespaceMod = `${namespace}00${levelNumber}`;
            } else {
              var namespaceMod = `${namespace}0${levelNumber}`;
            }

            const UUID = uuid5(name + mergedParents, namespaceMod);
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
    resource.id = building.uuid;
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

  createTree(mcsd, topOrg, includeBuilding, callback) {
    const tree = [];
    const lookup = [];
    const addLater = {};
    async.each(mcsd.entry, (entry, callback1) => {
      const found = entry.resource.physicalType && entry.resource.physicalType.coding.find(coding => coding.code === 'bu');
      if (found && !includeBuilding) {
        return callback1();
      }
      let locType;
      if (found) {
        locType = 'bu';
      } else {
        locType = 'ju';
      }
      const {
        id,
      } = entry.resource;
      const item = {
        text: entry.resource.name,
        id,
        data: {
          locType,
        },
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