require('./init');
const cluster = require('cluster');
const express = require('express');
const bodyParser = require('body-parser');
// const oauthserver = require('node-oauth2-server')
// const oAuthModel = require('./oauth/model')()
const uuid5 = require('uuid/v5');
const formidable = require('formidable');
const winston = require('winston');
const https = require('https');
const http = require('http');
const cors = require('cors');
const redis = require('redis');
const redisClient = redis.createClient();
const csv = require('fast-csv');
const URI = require('urijs');
const url = require('url');
const async = require('async');
const mongoose = require('mongoose');
const models = require('./models')
const mongo = require('./mongo')();
const config = require('./config');
const mcsd = require('./mcsd')();
const dhis = require('./dhis')();
const fhir = require('./fhir')();
const scores = require('./scores')();

const app = express();
const server = require('http').createServer(app);

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(bodyParser.urlencoded({
  extended: true,
}));
app.use(bodyParser.json());
// socket config - large documents can cause machine to max files open

https.globalAgent.maxSockets = 32;
http.globalAgent.maxSockets = 32;

// app.use(app.oauth.errorHandler());
/* app.oauth = oauthserver({
  model: oAuthModel,
  grants: ['password'],
  accessTokenLifetime:config.getConf('oauth:accessTokenLifetime'),
  debug: config.getConf('oauth:debug')
});

// get access token
// app.all('/oauth/token', app.oauth.grant());

// register user
app.post('/oauth/registerUser', (req, res) => {
  oAuthModel.saveUsers(req.body.firstname, req.body.lastname, req.body.username, req.body.password, req.body.email, (err) => {
    if (err) {
      res.status(401).send(err);
    } else {
      res.send('User Created');
    }
  });
});
*/

if (cluster.isMaster) {
  var workers = {};

  var numWorkers = require('os').cpus().length;
  console.log('Master cluster setting up ' + numWorkers + ' workers...');

  for (var i = 0; i < numWorkers; i++) {
    const worker = cluster.fork();
    workers[worker.process.pid] = worker;
  }

  cluster.on('online', function (worker) {
    console.log('Worker ' + worker.process.pid + ' is online');
  });

  cluster.on('exit', function (worker, code, signal) {
    console.log('Worker ' + worker.process.pid + ' died with code: ' + code + ', and signal: ' + signal);
    delete(workers[worker.process.pid]);
    console.log('Starting a new worker');
    const newworker = cluster.fork();
    workers[newworker.process.pid] = newworker;
  });
  cluster.on('message', (worker, message) => {
    winston.info('Master received message from ' + worker.process.pid);
    if (message.content === 'clean') {
      for (let i in workers) {
        if (workers[i].process.pid !== worker.process.pid) {
          workers[i].send(message);
        } else {
          winston.info("Not sending clean message to self: " + i);
        }
      }
    }
  });
} else {
  process.on('message', (message) => {
    if (message.content === 'clean') {
      winston.info(process.pid + " received clean message from master.")
      mcsd.cleanCache(message.url, true)
    }
  })
  const levelMaps = {
    'ds0ADyc9UCU': { // Cote D'Ivoire
      4: 5,
    }
  }

  app.get('/doubleMapping/:db', (req, res) => {
    winston.info('Received a request to check MOH Locations that are double mapped')
    let mohDB = req.params.db
    let mappingDB = "MOHDATIM" + req.params.db
    async.parallel({
      mohData: function (callback) {
        mcsd.getLocations(mohDB, (data) => {
          return callback(false, data)
        })
      },
      mappingData: function (callback) {
        mcsd.getLocations(mappingDB, (data) => {
          return callback(false, data)
        })
      }
    }, (err, results) => {
      let dupplicated = []
      let url = 'http://localhost:3447/' + mohDB + '/fhir/Location/'
      async.each(results.mohData.entry, (mohEntry, nxtMoh) => {
        mohid = mohEntry.resource.id
        let checkDup = []
        async.each(results.mappingData.entry, (mappingEntry, nxtMap) => {
          var isMapped = mappingEntry.resource.identifier.find((ident) => {
            return ident.system === 'http://geoalign.datim.org/MOH' && ident.value === url + mohid
          })
          if (isMapped) {
            checkDup.push({
              mohName: mohEntry.resource.name,
              mohID: mohEntry.resource.id,
              datimName: mappingEntry.resource.name,
              datimID: mappingEntry.resource.id
            })
          }
          return nxtMap()
        }, () => {
          if (checkDup.length > 1) {
            dupplicated.push(checkDup)
          }
          return nxtMoh()
        })
      }, () => {
        winston.info('Found ' + dupplicated.length + ' MOH Locations with Double Matching')
        res.send(dupplicated)
      })
    })
  })

  app.get('/countLevels/:orgid', (req, res) => {
    if (!req.params.orgid) {
      winston.error({
        error: 'Missing Orgid'
      });
      res.set('Access-Control-Allow-Origin', '*');
      res.status(401).json({
        error: 'Missing Orgid'
      });
    } else {
      const orgid = req.params.orgid;
      const namespace = config.getConf('UUID:namespace');
      const mohTopId = uuid5(orgid, `${namespace}000`);
      winston.info(`Getting total levels for ${orgid}`);
      const db = config.getConf('mCSD:database');

      async.parallel({
        MOHLevels: function (callback) {
          mcsd.countLevels('MOH', orgid, mohTopId, (err, mohTotalLevels) => {
            winston.info(`Received total MOH levels of ${mohTotalLevels} for ${orgid}`);
            return callback(err, mohTotalLevels)
          })
        },
        DATIMLevels: function (callback) {
          mcsd.countLevels('DATIM', db, orgid, (err, datimTotalLevels) => {
            winston.info(`Received total DATIM levels of ${datimTotalLevels} for ${orgid}`);
            return callback(err, datimTotalLevels)
          })
        }
      }, (err, results) => {
        res.set('Access-Control-Allow-Origin', '*');
        if (err) {
          winston.error(err);
          res.status(401).json({
            error: err
          });
        } else {
          const recoLevel = 2;
          res.status(200).json({
            totalMOHLevels: results.MOHLevels,
            totalDATIMLevels: results.DATIMLevels,
            recoLevel
          });
        }
      })
    }
  });

  app.get('/uploadAvailable/:orgid', (req, res) => {
    if (!req.params.orgid) {
      winston.error({
        error: 'Missing Orgid'
      });
      res.set('Access-Control-Allow-Origin', '*');
      res.status(401).json({
        error: 'Missing Orgid'
      });
    } else {
      const orgid = req.params.orgid;
      winston.info(`Checking if data uploaded ${orgid}`);
      mcsd.getLocations(orgid, (mohData) => {
        if (mohData.hasOwnProperty('entry') && mohData.entry.length > 0) {
          res.set('Access-Control-Allow-Origin', '*');
          res.status(200).json({
            dataUploaded: true
          });
        } else {
          res.set('Access-Control-Allow-Origin', '*');
          res.status(200).json({
            dataUploaded: false
          });
        }
      })
    }
  });

  app.get('/getArchives/:orgid', (req, res) => {
    if (!req.params.orgid) {
      winston.error({
        error: 'Missing Orgid'
      });
      res.set('Access-Control-Allow-Origin', '*');
      res.status(401).json({
        error: 'Missing Orgid'
      });
    } else {
      const orgid = req.params.orgid;
      winston.info(`Getting archived DB for ${orgid}`);
      mcsd.getArchives(orgid, (err, archives) => {
        res.set('Access-Control-Allow-Origin', '*');
        if (err) {
          winston.error({
            error: 'Unexpected error has occured'
          });
          res.status(400).json({
            error: 'Unexpected error'
          });
          return
        }
        res.status(200).json(archives)
      })
    }
  });

  app.post('/restoreArchive/:orgid', (req, res) => {
    if (!req.params.orgid) {
      winston.error({
        error: 'Missing Orgid'
      });
      res.set('Access-Control-Allow-Origin', '*');
      res.status(401).json({
        error: 'Missing Orgid'
      });
    } else {
      const orgid = req.params.orgid;
      winston.info(`Restoring archive DB for ${orgid}`);
      const form = new formidable.IncomingForm();
      form.parse(req, (err, fields, files) => {
        mcsd.restoreDB(fields.archive, orgid, (err) => {
          res.set('Access-Control-Allow-Origin', '*');
          if (err) {
            winston.error(err)
            res.status(401).json({
              error: 'Unexpected error occured while restoring the database,please retry'
            });
          }
          res.status(200).send();
        })
      })
    }
  });

  app.post('/dhisSync', (req, res) => {
    winston.info('received request to sync DHIS2 data');
    const form = new formidable.IncomingForm();
    res.set('Access-Control-Allow-Origin', '*');
    res.status(200).end();
    form.parse(req, (err, fields, files) => {
      const host = fields.host;
      const username = fields.username;
      const password = mongo.decrypt(fields.password);
      const name = fields.name;
      const clientId = fields.clientId;
      const mode = fields.mode;
      let full = true;
      if (mode === 'update') {
        full = false;
      }
      dhis.sync(host, username, password, name, clientId, false, full, false, true);
    });
  });

  app.post('/fhirSync', (req,res) => {
    res.status(200).end()
    const form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
      winston.info('Received a request to sync FHIR server ' + fields.host)
      fhir.sync(fields.host, fields.username, fields.password, fields.mode, fields.name, fields.clientId)
    })
  })

  app.get('/hierarchy/:source/:id/:start/:count', (req, res) => {
    if (!req.query.OrgId || !req.query.OrgName || !req.params.source) {
      winston.error({
        error: 'Missing Orgid or source'
      });
      res.set('Access-Control-Allow-Origin', '*');
      res.status(401).json({
        error: 'Missing Orgid or source'
      });
    } else {
      const topOrgId = req.query.OrgId;
      const count = req.params.count
      const start = req.params.start
      const id = req.params.id
      const source = req.params.source.toUpperCase();
      if (source == 'DATIM') {
        var database = config.getConf('mCSD:database');
      } else if (source == 'MOH') {
        var database = topOrgId;
      }
      winston.info(`Fetching ${source} Locations For ${topOrgId}`);
      if (source == 'MOH') {
        var database = topOrgId;
        var locationReceived = new Promise((resolve, reject) => {
          mcsd.getLocations(database, (mcsdData) => {
            mcsd.getBuildings(mcsdData, (buildings) => {
              resolve({
                buildings,
                mcsdData
              })
              winston.info(`Done Fetching ${source} Locations`);
            });
          })
        })
      } else if (source == 'DATIM') {
        var database = config.getConf('mCSD:database');
        var locationReceived = new Promise((resolve, reject) => {
          mcsd.getLocationChildren(database, topOrgId, (mcsdData) => {
            mcsd.getBuildings(mcsdData, (buildings) => {
              resolve({
                buildings,
                mcsdData
              })
              winston.info(`Done Fetching ${source} Locations`);
            });
          })
        })
      }

      locationReceived.then((data) => {
        winston.info(`Creating ${source} Grid`);
        mcsd.createGrid(id, topOrgId, data.buildings, data.mcsdData, start, count, (grid, total) => {
          winston.info(`Done Creating ${source} Grid`);
          res.set('Access-Control-Allow-Origin', '*');
          res.status(200).json({
            grid,
            total
          });
        })
      }).catch((err) => {
        winston.error(err)
      })
    }
  });

  app.get('/getTree/:source', (req, res) => {
    if (!req.query.OrgId || !req.query.OrgName || !req.params.source) {
      winston.error({
        error: 'Missing Orgid or source',
      });
      res.set('Access-Control-Allow-Origin', '*');
      res.status(401).json({
        error: 'Missing Orgid or source',
      });
    } else {
      const orgid = req.query.OrgId;
      const source = req.params.source.toUpperCase();
      if (source == 'DATIM') var database = config.getConf('mCSD:database');
      else if (source == 'MOH') var database = orgid;

      winston.info(`Fetching ${source} Locations For ${orgid}`);
      if (source == 'MOH') {
        var database = orgid;
        const namespace = config.getConf('UUID:namespace');
        var id = uuid5(orgid, `${namespace}000`);
        var locationReceived = new Promise((resolve, reject) => {
          mcsd.getLocations(database, (mcsdData) => {
            winston.info(`Done Fetching ${source} Locations`);
            resolve(mcsdData);
          });
        });
      } else if (source == 'DATIM') {
        var id = orgid;
        var database = config.getConf('mCSD:database');
        var locationReceived = new Promise((resolve, reject) => {
          mcsd.getLocationChildren(database, id, (mcsdData) => {
            winston.info(`Done Fetching ${source} Locations`);
            resolve(mcsdData);
          });
        });
      }

      locationReceived.then((mcsdData) => {
        winston.info(`Creating ${source} Tree`);
        mcsd.createTree(mcsdData, source, database, orgid, (tree) => {
          winston.info(`Done Creating ${source} Tree`);
          res.set('Access-Control-Allow-Origin', '*');
          res.status(200).json(tree);
        });
      }).catch((err) => {
        winston.error(err);
      });
    }
  });

  app.get('/mappingStatus/:orgid/:level/:totalDATIMLevels/:totalMOHLevels/:clientId', (req, res) => {
    winston.info('Getting mapping status');
    const orgid = req.params.orgid;
    const mohDB = orgid;
    const datimTopId = orgid;
    const datimDB = config.getConf('mCSD:database');
    const recoLevel = req.params.level;
    const totalDATIMLevels = req.params.totalDATIMLevels;
    const totalMOHLevels = req.params.totalMOHLevels;
    const namespace = config.getConf('UUID:namespace');
    const mohTopId = uuid5(orgid, `${namespace}000`);
    const clientId = req.params.clientId;

    let statusRequestId = `mappingStatus${datimTopId}${clientId}`
    statusResData = JSON.stringify({
      status: '1/2 - Loading DATIM and MOH Data',
      error: null,
      percent: null
    })
    redisClient.set(statusRequestId, statusResData)

    const datimLocationReceived = new Promise((resolve, reject) => {
      mcsd.getLocationChildren(datimDB, datimTopId, (mcsdDATIM) => {
        mcsdDatimAll = mcsdDATIM;
        let level
        if (recoLevel === totalMOHLevels) {
          level = totalDATIMLevels
        } else {
          level = recoLevel
        }
        if (levelMaps[orgid] && levelMaps[orgid][recoLevel]) {
          level = levelMaps[orgid][recoLevel];
        }
        mcsd.filterLocations(mcsdDATIM, datimTopId, level, (mcsdDatimLevel) => {
          resolve(mcsdDatimLevel);
        });
      });
    });
    const mohLocationReceived = new Promise((resolve, reject) => {
      mcsd.getLocations(mohDB, (mcsdMOH) => {
        mcsd.filterLocations(mcsdMOH, mohTopId, recoLevel, (mcsdMohLevel) => {
          resolve(mcsdMohLevel);
        });
      });
    });
    const mappingDB = config.getConf('mapping:dbPrefix') + orgid;
    const mappingLocationReceived = new Promise((resolve, reject) => {
      mcsd.getLocationByID(mappingDB, false, false, (mcsdMapped) => {
        resolve(mcsdMapped);
      });
    });
    Promise.all([datimLocationReceived, mohLocationReceived, mappingLocationReceived]).then((locations) => {
      var datimLocations = locations[0]
      var mohLocations = locations[1]
      var mappedLocations = locations[2]
      scores.getMappingStatus(mohLocations, datimLocations, mappedLocations, datimTopId, clientId, (mappingStatus) => {
        res.set('Access-Control-Allow-Origin', '*');
        res.status(200).json(mappingStatus)
      })
    })
  })

  app.get('/reconcile/:orgid/:totalLevels/:totalDATIMLevels/:recoLevel/:clientId', (req, res) => {
    if (!req.params.orgid || !req.params.recoLevel) {
      winston.error({
        error: 'Missing Orgid or reconciliation Level'
      });
      res.set('Access-Control-Allow-Origin', '*');
      res.status(401).json({
        error: 'Missing Orgid or reconciliation Level'
      });
    } else {
      winston.info('Getting scores');
      const orgid = req.params.orgid;
      const recoLevel = req.params.recoLevel;
      const totalLevels = req.params.totalLevels;
      const totalDATIMLevels = req.params.totalDATIMLevels;
      const clientId = req.params.clientId;
      const datimDB = config.getConf('mCSD:database');
      const mohDB = orgid;
      const namespace = config.getConf('UUID:namespace');
      const mohTopId = uuid5(orgid, `${namespace}000`);
      const datimTopId = orgid;
      let mcsdDatimAll = null;
      let mcsdMohAll = null;

      let scoreRequestId = `scoreResults${datimTopId}${clientId}`
      scoreResData = JSON.stringify({
        status: '1/3 - Loading DATIM and MOH Data',
        error: null,
        percent: null
      })
      redisClient.set(scoreRequestId, scoreResData)
      async.parallel({
        datimLocations: function (callback) {
          mcsd.getLocationChildren(datimDB, datimTopId, (mcsdDATIM) => {
            mcsdDatimAll = mcsdDATIM;
            let level
            if (recoLevel === totalLevels) {
              level = totalDATIMLevels
            } else {
              level = recoLevel
            }

            if (levelMaps[orgid] && levelMaps[orgid][recoLevel]) {
              level = levelMaps[orgid][recoLevel];
            }
            mcsd.filterLocations(mcsdDATIM, datimTopId, level, (mcsdDatimLevel) => {
              return callback(false, mcsdDatimLevel)
            });
          });
        },
        mohLoations: function (callback) {
          mcsd.getLocations(mohDB, (mcsdMOH) => {
            mcsdMohAll = mcsdMOH;
            mcsd.filterLocations(mcsdMOH, mohTopId, recoLevel, (mcsdMohLevel) => {
              return callback(false, mcsdMohLevel);
            });
          });
        },
        mappingData: function (callback) {
          const mappingDB = config.getConf('mapping:dbPrefix') + orgid;
          mcsd.getLocationByID(mappingDB, false, false, (mcsdMapped) => {
            return callback(false, mcsdMapped);
          });
        }
      }, (error, results) => {
        if (recoLevel == totalLevels) {
          scores.getBuildingsScores(results.mohLoations, results.datimLocations, results.mappingData, mcsdDatimAll, mcsdMohAll, mohDB, datimDB, mohTopId, datimTopId, recoLevel, totalLevels, clientId, (scoreResults) => {
            res.set('Access-Control-Allow-Origin', '*');
            recoStatus(orgid, (totalAllMapped, totalAllNoMatch, totalAllFlagged) => {
              scoreResData = JSON.stringify({
                status: 'Done',
                error: null,
                percent: 100
              })
              redisClient.set(scoreRequestId, scoreResData)
              var mohTotalAllNotMapped = (mcsdMohAll.entry.length - 1) - totalAllMapped
              res.status(200).json({
                scoreResults,
                recoLevel,
                datimTotalRecords: results.datimLocations.entry.length,
                datimTotalAllRecords: mcsdDatimAll.entry.length,
                totalAllMapped: totalAllMapped,
                totalAllFlagged: totalAllFlagged,
                totalAllNoMatch: totalAllNoMatch,
                mohTotalAllNotMapped: mohTotalAllNotMapped,
                mohTotalAllRecords: mcsdMohAll.entry.length - 1
              });
              winston.info('Score results sent back');
            })
          });
        } else {
          scores.getJurisdictionScore(results.mohLoations, results.datimLocations, results.mappingData, mcsdDatimAll, mcsdMohAll, mohDB, datimDB, mohTopId, datimTopId, recoLevel, totalLevels, clientId, (scoreResults) => {
            res.set('Access-Control-Allow-Origin', '*');
            recoStatus(orgid, (totalAllMapped, totalAllNoMatch, totalAllFlagged) => {
              var mohTotalAllNotMapped = (mcsdMohAll.entry.length - 1) - totalAllMapped
              res.status(200).json({
                scoreResults,
                recoLevel,
                datimTotalRecords: results.datimLocations.entry.length,
                datimTotalAllRecords: mcsdDatimAll.entry.length,
                totalAllMapped: totalAllMapped,
                totalAllFlagged: totalAllFlagged,
                totalAllNoMatch: totalAllNoMatch,
                mohTotalAllNotMapped: mohTotalAllNotMapped,
                mohTotalAllRecords: mcsdMohAll.entry.length - 1
              });
              winston.info('Score results sent back');
            })
          });
        }
      })
    }

    function recoStatus(orgid, callback) {
      //getting total Mapped
      var database = config.getConf('mapping:dbPrefix') + orgid;
      var url = URI(config.getConf('mCSD:url')).segment(database).segment('fhir').segment('Location')
        .toString();
      const options = {
        url,
      };
      var totalAllMapped = 0
      var totalAllNoMatch = 0
      var totalAllFlagged = 0
      var mohTotalAllNotMapped = 0
      const noMatchCode = config.getConf('mapping:noMatchCode');
      const flagCode = config.getConf('mapping:flagCode');
      setTimeout(() => {
        mcsd.getLocations(database, (body) => {
          if (!body.hasOwnProperty('entry') || body.length === 0) {
            totalAllNoMatch = 0
            totalAllMapped = 0
            return callback(totalAllMapped, mohTotalAllNotMapped, totalAllNoMatch, totalAllFlagged)
          }
          async.each(body.entry, (entry, nxtEntry) => {
            if (entry.resource.hasOwnProperty('tag')) {
              var nomatch = entry.resource.tag.find((tag) => {
                return tag.code === noMatchCode
              })
              var flagged = entry.resource.tag.find((tag) => {
                return tag.code === flagCode
              })
              if (nomatch) {
                totalAllNoMatch++
              }
              if (flagged) {
                totalAllFlagged++
              }
              return nxtEntry()
            } else {
              return nxtEntry()
            }
          }, () => {
            totalAllMapped = body.entry.length - totalAllNoMatch - totalAllFlagged
            return callback(totalAllMapped, totalAllNoMatch, totalAllFlagged)
            //res.set('Access-Control-Allow-Origin', '*');
            //res.status(200).json({totalAllMapped,totalAllNoMatch,totalAllFlagged})
          })
        })
      }, 1000)
    }

  });

  app.get('/getUnmatched/:orgid/:source/:recoLevel', (req, res) => {
    winston.info(`Getting DATIM Unmatched Orgs for ${req.params.orgid}`);
    if (!req.params.orgid || !req.params.source) {
      winston.error({
        error: 'Missing Orgid or Source'
      });
      res.set('Access-Control-Allow-Origin', '*');
      res.status(401).json({
        error: 'Missing Orgid or Source'
      });
      return;
    }
    const orgid = req.params.orgid;
    const source = req.params.source.toUpperCase();
    let recoLevel = req.params.recoLevel;
    if (levelMaps[orgid] && levelMaps[orgid][recoLevel]) {
      recoLevel = levelMaps[orgid][recoLevel];
    }
    const datimDB = config.getConf('mCSD:database');
    mcsd.getLocationChildren(datimDB, orgid, (locations) => {
      mcsd.filterLocations(locations, orgid, recoLevel, (mcsdLevel) => {
        scores.getUnmatched(locations, mcsdLevel, orgid, (unmatched) => {
          winston.info(`sending back DATIM unmatched Orgs for ${req.params.orgid}`);
          res.set('Access-Control-Allow-Origin', '*');
          res.status(200).json(unmatched);
        });
      });
    });
  });

  app.post('/match/:type/:orgid', (req, res) => {
    winston.info('Received data for matching');
    if (!req.params.orgid) {
      winston.error({
        error: 'Missing Orgid'
      });
      res.set('Access-Control-Allow-Origin', '*');
      res.status(401).json({
        error: 'Missing Orgid'
      });
      return;
    }
    const orgid = req.params.orgid;
    const type = req.params.type;
    const form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
      let mohId = fields.mohId;
      const datimId = fields.datimId;
      const recoLevel = fields.recoLevel;
      const totalLevels = fields.totalLevels;
      if (!mohId || !datimId) {
        winston.error({
          error: 'Missing either MOHID or DATIMID or both'
        });
        res.set('Access-Control-Allow-Origin', '*');
        res.status(401).json({
          error: 'Missing either MOHID or DATIMID or both'
        });
        return;
      }
      if (recoLevel == totalLevels) {
        const namespace = config.getConf('UUID:namespace');
        mohId = uuid5(mohId, `${namespace}100`);
      }
      mcsd.saveMatch(mohId, datimId, orgid, recoLevel, totalLevels, type, (err) => {
        winston.info('Done matching');
        res.set('Access-Control-Allow-Origin', '*');
        if (err) {
          res.status(401).send({
            error: err
          });
        } else {
          res.status(200).send();
        }
      });
    });
  });

  app.post('/acceptFlag/:orgid', (req, res) => {
    winston.info('Received data for marking flag as a match');
    if (!req.params.orgid) {
      winston.error({
        error: 'Missing Orgid'
      });
      res.set('Access-Control-Allow-Origin', '*');
      res.status(401).json({
        error: 'Missing Orgid'
      });
      return;
    }
    const orgid = req.params.orgid;
    const form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
      const datimId = fields.datimId;
      const recoLevel = fields.recoLevel;
      const totalLevels = fields.totalLevels;
      if (!datimId) {
        winston.error({
          error: 'Missing DATIMID'
        });
        res.set('Access-Control-Allow-Origin', '*');
        res.status(401).json({
          error: 'Missing DATIMID'
        });
        return;
      }
      if (recoLevel == totalLevels) {
        const namespace = config.getConf('UUID:namespace');
        mohId = uuid5(orgid, `${namespace}100`);
      }
      mcsd.acceptFlag(datimId, orgid, (err) => {
        winston.info('Done marking flag as a match');
        res.set('Access-Control-Allow-Origin', '*');
        if (err) res.status(401).send({
          error: err
        });
        else res.status(200).send();
      });
    });
  });

  app.post('/noMatch/:orgid', (req, res) => {
    winston.info('Received data for matching');
    if (!req.params.orgid) {
      winston.error({
        error: 'Missing Orgid'
      });
      res.set('Access-Control-Allow-Origin', '*');
      res.status(401).json({
        error: 'Missing Orgid'
      });
      return;
    }
    const orgid = req.params.orgid;
    const form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
      let mohId = fields.mohId;
      const recoLevel = fields.recoLevel;
      const totalLevels = fields.totalLevels;
      if (!mohId) {
        winston.error({
          error: 'Missing either MOHID'
        });
        res.set('Access-Control-Allow-Origin', '*');
        res.status(401).json({
          error: 'Missing either MOHID'
        });
        return;
      }
      if (recoLevel == totalLevels) {
        const namespace = config.getConf('UUID:namespace');
        mohId = uuid5(mohId, `${namespace}100`);
      }
      mcsd.saveNoMatch(mohId, orgid, recoLevel, totalLevels, (err) => {
        winston.info('Done matching');
        res.set('Access-Control-Allow-Origin', '*');
        if (err) res.status(401).send({
          error: err
        });
        else res.status(200).send();
      });
    });
  });

  app.post('/breakMatch/:orgid', (req, res) => {
    if (!req.params.orgid) {
      winston.error({
        error: 'Missing Orgid'
      });
      res.set('Access-Control-Allow-Origin', '*');
      res.status(401).json({
        error: 'Missing Orgid'
      });
      return;
    }
    const form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
      winston.info(`Received break match request for ${fields.datimId}`);
      const datimId = fields.datimId;
      const database = config.getConf('mapping:dbPrefix') + req.params.orgid;
      mcsd.breakMatch(datimId, database, req.params.orgid, (err, results) => {
        winston.info(`break match done for ${fields.datimId}`);
        res.set('Access-Control-Allow-Origin', '*');
        res.status(200).send(err);
      });
    });
  });

  app.post('/breakNoMatch/:orgid', (req, res) => {
    if (!req.params.orgid) {
      winston.error({
        error: 'Missing Orgid'
      });
      res.set('Access-Control-Allow-Origin', '*');
      res.status(401).json({
        error: 'Missing Orgid'
      });
      return;
    }
    const form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
      winston.info(`Received break no match request for ${fields.mohId}`);
      var mohId = fields.mohId;
      if (!mohId) {
        winston.error({
          'error': 'Missing MOH ID'
        })
        res.set('Access-Control-Allow-Origin', '*');
        res.status(401).json({
          error: 'Missing MOH ID'
        });
        return
      }
      const recoLevel = fields.recoLevel;
      const totalLevels = fields.totalLevels;
      const database = config.getConf('mapping:dbPrefix') + req.params.orgid;
      if (recoLevel == totalLevels) {
        const namespace = config.getConf('UUID:namespace');
        mohId = uuid5(mohId, `${namespace}100`);
      }
      mcsd.breakNoMatch(mohId, database, (err) => {
        winston.info(`break no match done for ${fields.mohId}`);
        res.set('Access-Control-Allow-Origin', '*');
        res.status(200).send(err);
      });
    });
  });

  app.get('/markRecoUnDone/:orgid', (req, res) => {
    winston.info(`received a request to mark reconciliation for ${req.params.orgid} as undone`)
    const mongoUser = config.getConf('mCSD:databaseUser')
    const mongoPasswd = config.getConf('mCSD:databasePassword')
    const mongoHost = config.getConf('mCSD:databaseHost')
    const mongoPort = config.getConf('mCSD:databasePort')
    const orgid = req.params.orgid
    const database = config.getConf('mapping:dbPrefix') + orgid
    if (mongoUser && mongoPasswd) {
      var uri = `mongodb://${mongoUser}:${mongoPasswd}@${mongoHost}:${mongoPort}/${database}`
    } else {
      var uri = `mongodb://${mongoHost}:${mongoPort}/${database}`
    }
    mongoose.connect(uri)
    const Schema = mongoose.Schema
    let ReconciliationStatusModel
    try {
      ReconciliationStatusModel = mongoose.model('ReconciliationStatus')
    } catch (e) {
      mongoose.model('ReconciliationStatus', new Schema({
        status: {
          type: Object
        }
      }))
      ReconciliationStatusModel = mongoose.model('ReconciliationStatus')
    }

    const recoStatusCode = config.getConf('mapping:recoStatusCode');
    const query = {
      status: {
        code: recoStatusCode,
        text: 'Done'
      }
    }
    const update = {
      status: {
        code: recoStatusCode,
        text: 'on-progress'
      }
    }
    ReconciliationStatusModel.findOneAndUpdate(query, update, (err, data) => {
      res.set('Access-Control-Allow-Origin', '*');
      if (err) {
        res.status(500).json({
          error: 'An error occured while processing request'
        });
      } else {
        res.status(200).json({
          status: 'on-progresss'
        });
      }
    })
  })

  app.get('/markRecoDone/:orgid', (req, res) => {
    winston.info(`received a request to mark reconciliation for ${req.params.orgid} as done`)
    const mongoUser = config.getConf('mCSD:databaseUser')
    const mongoPasswd = config.getConf('mCSD:databasePassword')
    const mongoHost = config.getConf('mCSD:databaseHost')
    const mongoPort = config.getConf('mCSD:databasePort')
    const orgid = req.params.orgid
    const database = config.getConf('mapping:dbPrefix') + orgid
    if (mongoUser && mongoPasswd) {
      var uri = `mongodb://${mongoUser}:${mongoPasswd}@${mongoHost}:${mongoPort}/${database}`
    } else {
      var uri = `mongodb://${mongoHost}:${mongoPort}/${database}`
    }
    mongoose.connect(uri)
    const Schema = mongoose.Schema
    let ReconciliationStatusModel
    try {
      ReconciliationStatusModel = mongoose.model('ReconciliationStatus')
    } catch (e) {
      mongoose.model('ReconciliationStatus', new Schema({
        status: {
          type: Object
        }
      }))
      ReconciliationStatusModel = mongoose.model('ReconciliationStatus')
    }

    const recoStatusCode = config.getConf('mapping:recoStatusCode');

    ReconciliationStatusModel.findOne({
      status: {
        code: recoStatusCode,
        text: 'on-progress'
      }
    }, (err, data) => {
      if (err) {
        winston.error('Unexpected error occured,please retry')
        res.status(500).json({
          error: 'Unexpected error occured,please retry'
        });
        return
      }
      if (!data) {
        var recoStatus = new ReconciliationStatusModel({
          status: {
            code: recoStatusCode,
            text: 'Done'
          }
        })
        recoStatus.save(function (err, data) {
          if (err) {
            winston.error('Unexpected error occured,please retry')
            res.set('Access-Control-Allow-Origin', '*');
            res.status(500).json({
              error: 'Unexpected error occured,please retry'
            });
          }
          winston.info(`${orgid} marked as done with reconciliation`)
          res.set('Access-Control-Allow-Origin', '*');
          res.status(200).json({
            status: 'done'
          });
        })
      } else {
        ReconciliationStatusModel.findByIdAndUpdate(data.id, {
          status: {
            code: recoStatusCode,
            text: 'Done'
          }
        }, (err, data) => {
          if (err) {
            winston.error('Unexpected error occured,please retry')
            res.set('Access-Control-Allow-Origin', '*');
            res.status(500).json({
              error: 'Unexpected error occured,please retry'
            });
            return
          }
          winston.info(`${orgid} already marked as done with reconciliation`)
          res.set('Access-Control-Allow-Origin', '*');
          res.status(200).json({
            status: 'done'
          });
        })
      }
    })
  })

  app.get('/recoStatus/:orgid', (req, res) => {
    const mongoUser = config.getConf('mCSD:databaseUser')
    const mongoPasswd = config.getConf('mCSD:databasePassword')
    const mongoHost = config.getConf('mCSD:databaseHost')
    const mongoPort = config.getConf('mCSD:databasePort')
    const orgid = req.params.orgid
    const database = config.getConf('mapping:dbPrefix') + orgid
    if (mongoUser && mongoPasswd) {
      var uri = `mongodb://${mongoUser}:${mongoPasswd}@${mongoHost}:${mongoPort}/${database}`
    } else {
      var uri = `mongodb://${mongoHost}:${mongoPort}/${database}`
    }
    mongoose.connect(uri)
    const Schema = mongoose.Schema

    const recoStatusCode = config.getConf('mapping:recoStatusCode');
    let ReconciliationStatusModel
    try {
      ReconciliationStatusModel = mongoose.model('ReconciliationStatus')
    } catch (e) {
      mongoose.model('ReconciliationStatus', new Schema({
        status: {
          type: Object
        }
      }))
      ReconciliationStatusModel = mongoose.model('ReconciliationStatus')
    }

    res.set('Access-Control-Allow-Origin', '*');
    ReconciliationStatusModel.findOne({
      status: {
        code: recoStatusCode,
        text: 'Done'
      }
    }, (err, data) => {
      if (err) {
        res.status(500).json({
          error: 'Unexpected error occured,please retry'
        });
        return
      }
      if (data) {
        res.status(200).json({
          status: 'done'
        });
      } else {
        res.status(200).json({
          status: 'on-progress'
        });
      }
    })
  })

  app.get('/progress/:type/:clientId', (req, res) => {
    const clientId = req.params.clientId;
    const type = req.params.type;
    const progressRequestId = `${type}${clientId}`;
    redisClient.get(progressRequestId, (error, results) => {
      results = JSON.parse(results);
      // reset progress
      if (results && (results.error !== null || results.status === 'Done')) {
        const uploadReqRes = JSON.stringify({
          status: null,
          error: null,
          percent: null,
        });
        redisClient.set(progressRequestId, uploadReqRes);
      }
      res.set('Access-Control-Allow-Origin', '*');
      res.status(200).json(results);
    });
  });

  app.get('/uploadProgress/:orgid/:clientId', (req, res) => {
    const orgid = req.params.orgid
    const clientId = req.params.clientId
    redisClient.get(`uploadProgress${orgid}${clientId}`, (error, results) => {
      results = JSON.parse(results)
      res.set('Access-Control-Allow-Origin', '*');
      res.status(200).json(results)
      //reset progress
      if (results && (results.error !== null || results.status === 'Done')) {
        var uploadRequestId = `uploadProgress${orgid}${clientId}`
        let uploadReqPro = JSON.stringify({
          status: null,
          error: null,
          percent: null
        })
        redisClient.set(uploadRequestId, uploadReqPro)
      }
    })
  });

  app.get('/mappingStatusProgress/:orgid/:clientId', (req, res) => {
    const orgid = req.params.orgid
    const clientId = req.params.clientId
    redisClient.get(`mappingStatus${orgid}${clientId}`, (error, results) => {
      results = JSON.parse(results)
      res.set('Access-Control-Allow-Origin', '*');
      res.status(200).json(results)
      //reset progress
      if (results && (results.error !== null || results.status === 'Done')) {
        var statusRequestId = `mappingStatus${orgid}${clientId}`
        let statusResData = JSON.stringify({
          status: null,
          error: null,
          percent: null
        })
        redisClient.set(statusRequestId, statusResData)
      }
    })
  });

  app.get('/scoreProgress/:orgid/:clientId', (req, res) => {
    const orgid = req.params.orgid
    const clientId = req.params.clientId
    redisClient.get(`scoreResults${orgid}${clientId}`, (error, results) => {
      results = JSON.parse(results)
      res.set('Access-Control-Allow-Origin', '*');
      res.status(200).json(results)
      //reset progress
      if (results && (results.error !== null || results.status === 'Done')) {
        const scoreRequestId = `scoreResults${orgid}${clientId}`
        let uploadReqPro = JSON.stringify({
          status: null,
          error: null,
          percent: null
        })
        redisClient.set(scoreRequestId, uploadReqPro)
      }
    })
  });

  app.post('/addServer', (req, res) => {
    const form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
      winston.info('Received a request to add a new server');
      mongo.addServer(fields, (err, response) => {
        if (err) {
          res.set('Access-Control-Allow-Origin', '*');
          res.status(500).json({
            error: 'Unexpected error occured,please retry',
          });
        } else {
          winston.info('server saved successfully');
          res.set('Access-Control-Allow-Origin', '*');
          res.status(200).json({
            status: 'done',
            password: response
          });
        }
      });
    });
  });
  app.post('/editServer', (req, res) => {
    const form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
      winston.info('Received a request to edit a server');
      mongo.editServer(fields, (err, response) => {
        if (err) {
          res.set('Access-Control-Allow-Origin', '*');
          res.status(500).json({
            error: 'Unexpected error occured,please retry',
          });
        } else {
          winston.info('Server edited sucessfully');
          res.set('Access-Control-Allow-Origin', '*');
          res.status(200).json({
            status: 'done',
            password: response
          });
        }
      });
    });
  });

  app.get('/deleteServer/:_id', (req, res) => {
    const id = req.params._id;
    winston.info('Received request to delete server with id ' + id)
    mongo.deleteServer(id, (err, response) => {
      if (err) {
        res.set('Access-Control-Allow-Origin', '*');
        res.status(500).json({
          error: 'Unexpected error occured while deleting server,please retry',
        });
      } else {
        res.set('Access-Control-Allow-Origin', '*');
        winston.info('Server with id ' + id + ' deleted')
        res.status(200).json({
          status: 'done',
        });
      }
    });
  });

  app.get('/getServers', (req, res) => {
    winston.info('received request to get servers');
    mongo.getServers((err, servers) => {
      if (err) {
        res.set('Access-Control-Allow-Origin', '*');
        res.status(500).json({
          error: 'Unexpected error occured,please retry',
        });
      } else {
        async.eachOfSeries(servers, (server, key, nxtServer) => {
          if (server.sourceType === 'FHIR') {
            fhir.getLastUpdate(server.name, (lastUpdate) => {
              if (lastUpdate) {
                servers[key]["lastUpdate"] = lastUpdate
              }
              return nxtServer()
            })
          } else {
            let password = mongo.decrypt(server.password)
            const auth = `Basic ${Buffer.from(`${server.username}:${password}`).toString('base64')}`
            const dhis2URL = url.parse(server.host)
            dhis.getLastUpdate(server.name, dhis2URL, auth, (lastUpdate) => {
              if (lastUpdate) {
                lastUpdate = lastUpdate.split('.').shift()
                servers[key]["lastUpdate"] = lastUpdate
              }
              return nxtServer()
            })
          }
        },() => {
          winston.info('returning list of servers ' + JSON.stringify(servers))
          res.set('Access-Control-Allow-Origin', '*')
          res.status(200).json({
            servers,
          })
        })
      }
    })
  })

  app.post('/addDataSource', (req,res) => {
    winston.info('Received a request to save data source pairs')
    const form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
      mongo.addDataSource(fields, (error, results) => {
        if (error) {
          winston.error(error)
          res.status(401).json({
            error: 'Unexpected error occured while saving'
          })
        } else {
          res.status(200).send()
        }
      })
    })
  })

  app.get('/resetDataSources', (req,res) => {
    mongo.resetDataSources((error,response) => {
      if (error) {
        winston.error(error)
        res.status(401).json({
          error: 'Unexpected error occured while saving'
        })
      } else {
        res.status(200).send()
      }
    })
  })

  app.get('/getDataSources', (req,res) => {
    mongo.getDataSources((err,sources) => {
      if (err) {
        res.status(401).json({
          error: 'Unexpected error occured while saving'
        })
      } else {
        if (sources.length > 0) {
          res.status(200).json(sources[0])
        } else {
          res.status(200).send(false)
        }
      }
    })
  })

  app.post('/uploadCSV', (req, res) => {
    const form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
      winston.info(`Received MOH Data with fields Mapping ${JSON.stringify(fields)}`);
      if (!fields.orgid) {
        winston.error({
          error: 'Missing Orgid'
        });
        res.set('Access-Control-Allow-Origin', '*');
        res.status(401).json({
          error: 'Missing Orgid'
        });
        return;
      }
      const orgid = fields.orgid;
      const orgname = fields.orgname;
      const database = config.getConf('mCSD:database');
      const expectedLevels = config.getConf('levels');
      const clientId = fields.clientId
      var uploadRequestId = `uploadProgress${orgid}${clientId}`
      let uploadReqPro = JSON.stringify({
        status: 'Request received by server',
        error: null,
        percent: null
      })
      redisClient.set(uploadRequestId, uploadReqPro)
      if (!Array.isArray(expectedLevels)) {
        winston.error('Invalid config data for key Levels ');
        res.set('Access-Control-Allow-Origin', '*');
        res.status(401).json({
          error: 'Un expected error occured while processing this request'
        });
        res.end();
        return;
      }
      if (Object.keys(files).length == 0) {
        winston.error('No file submitted for reconciliation');
        res.status(401).json({
          error: 'Please submit CSV file for facility reconciliation'
        });
        res.end();
        return;
      }
      const fileName = Object.keys(files)[0];
      winston.info('validating CSV File');
      uploadReqPro = JSON.stringify({
        status: '2/5 Validating CSV Data',
        error: null,
        percent: null
      })
      redisClient.set(uploadRequestId, uploadReqPro)
      validateCSV(files[fileName].path, fields, (valid, invalid) => {
        if (invalid.length > 0) {
          winston.error("Uploaded CSV is invalid (has either duplicated IDs or empty levels/facility),execution stopped");
          res.set('Access-Control-Allow-Origin', '*');
          res.status(401).json({
            error: invalid
          });
          res.end();
          return;
        } else {
          res.set('Access-Control-Allow-Origin', '*');
          res.status(200).end();
        }
        winston.info('CSV File Passed Validation');
        //archive existing DB first
        let uploadReqPro = JSON.stringify({
          status: '3/5 Archiving Old DB',
          error: null,
          percent: null
        })
        redisClient.set(uploadRequestId, uploadReqPro)
        mcsd.archiveDB(orgid, (err) => {
          if (err) {
            let uploadReqPro = JSON.stringify({
              status: '3/5 Archiving Old DB',
              error: 'An error occured while archiving Database,retry',
              percent: null
            })
            redisClient.set(uploadRequestId, uploadReqPro)
            winston.error('An error occured while Archiving existing DB,Upload of new dataset was stopped')
            return
          }
          //ensure old archives are deleted
          let uploadReqPro = JSON.stringify({
            status: '4/5 Deleting Old DB',
            error: null,
            percent: null
          })
          redisClient.set(uploadRequestId, uploadReqPro)
          mcsd.cleanArchives(orgid, () => {})
          //delete existing db
          winston.info('Deleting DB ' + orgid)
          mcsd.deleteDB(orgid, (err) => {
            if (!err) {
              winston.info(`Uploading data for ${orgid} now`)
              let uploadReqPro = JSON.stringify({
                status: '5/5 Uploading of DB started',
                error: null,
                percent: null
              })
              redisClient.set(uploadRequestId, uploadReqPro)
              mcsd.CSVTomCSD(files[fileName].path, fields, orgid, clientId, () => {
                winston.info(`Data upload for ${orgid} is done`)
                let uploadReqPro = JSON.stringify({
                  status: 'Done',
                  error: null,
                  percent: 100
                })
                redisClient.set(uploadRequestId, uploadReqPro)
              });
            } else {
              winston.error('An error occured while dropping existing DB,Upload of new dataset was stopped')
              let uploadReqPro = JSON.stringify({
                status: '3/4 Deleting Old DB',
                error: 'An error occured while dropping existing Database,retry',
                percent: null
              })
              redisClient.set(uploadRequestId, uploadReqPro)
            }
          })
        })
      });
    });
    function validateCSV(filePath, headerMapping, callback) {
      let invalid = []
      let ids = []
      const levels = config.getConf('levels');
      levels.sort();
      levels.reverse();
      csv
        .fromPath(filePath, {
          headers: true,
        })
        .on('data', (data) => {
          let rowMarkedInvalid = false
          let index = 0
          async.eachSeries(levels, (level, nxtLevel) => {
            if (headerMapping[level] === null ||
              headerMapping[level] === 'null' ||
              headerMapping[level] === undefined ||
              !headerMapping[level]) {
              return nxtLevel()
            }
            if (index === 0) {
              index++
              if (ids.length == 0) {
                ids.push(data[headerMapping.code])
              } else {
                let idExist = ids.find((id) => {
                  return id === data[headerMapping.code]
                })
                if (idExist) {
                  rowMarkedInvalid = true
                  let reason = 'Duplicate ID'
                  populateData(headerMapping, data, reason, invalid)
                } else {
                  ids.push(data[headerMapping.code])
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
                let reason = headerMapping[level] + ' is blank'
                populateData(headerMapping, data, reason, invalid)
              } else {
                return nxtLevel()
              }
            }
          }, () => {
            if (data[headerMapping.facility] === null ||
              data[headerMapping.facility] === undefined ||
              data[headerMapping.facility] === false ||
              data[headerMapping.facility] === '' ||
              data[headerMapping.facility] == 0) {
              let reason = headerMapping.facility + ' is blank'
              populateData(headerMapping, data, reason, invalid)

            }
          })
        })
        .on('end', () => {
          return callback(true, invalid);
        })

      function populateData(headerMapping, data, reason, invalid) {
        let row = {}
        async.each(headerMapping, (header, nxtHeader) => {
          if (header == 'null') {
            return nxtHeader()
          }
          if (!data.hasOwnProperty(header)) {
            return nxtHeader()
          }
          row[header] = data[header]
          return nxtHeader()
        }, () => {
          invalid.push({
            data: row,
            reason
          })
        })
      }
    }
  });

  server.listen(config.getConf('server:port'));
  winston.info(`Server is running and listening on port ${config.getConf('server:port')}`);
}
