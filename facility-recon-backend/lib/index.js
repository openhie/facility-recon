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
const csv = require('fast-csv');
const URI = require('urijs');
const url = require('url');
const async = require('async');
const mongoose = require('mongoose');
const mixin = require('./mixin')()
const mongo = require('./mongo')();
const config = require('./config');
const mcsd = require('./mcsd')();
const dhis = require('./dhis')();
const fhir = require('./fhir')();
const scores = require('./scores')();

var redis = require("redis"),
  client = redis.createClient({
    host: process.env.REDIS_HOST || '127.0.0.1'
  });

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

const topOrgId = config.getConf('mCSD:fakeOrgId')
const topOrgName = config.getConf('mCSD:fakeOrgName')
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
    winston.info('Received a request to check Source1 Locations that are double mapped')
    let source1DB = req.params.db
    let mappingDB = config.getConf('mapping:dbPrefix') + req.params.db
    async.parallel({
      source1Data: function (callback) {
        mcsd.getLocations(source1DB, (data) => {
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
      let url = 'http://localhost:3447/' + source1DB + '/fhir/Location/'
      async.each(results.source1Data.entry, (source1Entry, nxtSource1) => {
        source1id = source1Entry.resource.id
        let checkDup = []
        async.each(results.mappingData.entry, (mappingEntry, nxtMap) => {
          var isMapped = mappingEntry.resource.identifier.find((ident) => {
            return ident.system === 'http://geoalign.source2.org/Source1' && ident.value === url + source1id
          })
          if (isMapped) {
            checkDup.push({
              source1Name: source1Entry.resource.name,
              source1ID: source1Entry.resource.id,
              source2Name: mappingEntry.resource.name,
              source2ID: mappingEntry.resource.id
            })
          }
          return nxtMap()
        }, () => {
          if (checkDup.length > 1) {
            dupplicated.push(checkDup)
          }
          return nxtSource1()
        })
      }, () => {
        winston.info('Found ' + dupplicated.length + ' Source1 Locations with Double Matching')
        res.send(dupplicated)
      })
    })
  })

  app.get('/countLevels/:source1/:source2', (req, res) => {
    winston.info(`Received a request to get total levels`);
    let source1 = req.params.source1
    let source2 = req.params.source2
    async.parallel({
      Source1Levels: function (callback) {
        mcsd.countLevels(source1, topOrgId, (err, source1TotalLevels) => {
          winston.info(`Received total source1 levels of ${source1TotalLevels}`);
          return callback(err, source1TotalLevels)
        })
      },
      Source2Levels: function (callback) {
        mcsd.countLevels(source2, topOrgId, (err, source2TotalLevels) => {
          winston.info(`Received total source2 levels of ${source2TotalLevels}`);
          return callback(err, source2TotalLevels)
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
          totalSource1Levels: results.Source1Levels,
          totalSource2Levels: results.Source2Levels,
          recoLevel
        });
      }
    })
  });

  app.get('/uploadAvailable/:source1/:source2', (req, res) => {

    if (!req.params.source1 || !req.params.source2) {
      winston.error({
        error: 'Missing Orgid'
      });
      res.set('Access-Control-Allow-Origin', '*');
      res.status(401).json({
        error: 'Missing Orgid'
      });
    } else {
      const source1 = req.params.source1;
      const source2 = req.params.source2;
      winston.info(`Checking if data available for ${source1} and ${source2}`);
      async.parallel({
        source1Availability: function (callback) {
          mcsd.getLocations(source1, (source1Data) => {
            if (source1Data.hasOwnProperty('entry') && source1Data.entry.length > 0) {
              return callback(false, true)
            } else {
              return callback(false, false)
            }
          })
        },
        source2Availability: function (callback) {
          mcsd.getLocations(source2, (source2Data) => {
            if (source2Data.hasOwnProperty('entry') && source2Data.entry.length > 0) {
              return callback(false, true)
            } else {
              return callback(false, false)
            }
          })
        }
      },(error,results) => {
        if (results.source1Availability && results.source2Availability) {
          res.status(200).json({
            dataUploaded: true
          });
        } else {
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

  app.get('/hierarchy', (req, res) => {
    let source = req.query.source
    let start = req.query.start
    let count = req.query.count
    let id = req.query.id
    if (!id) {
      id = topOrgId
    }
    if (!source) {
      winston.error({
        error: 'Missing Source'
      });
      res.set('Access-Control-Allow-Origin', '*');
      res.status(401).json({
        error: 'Missing Source'
      });
    } else {
      winston.info(`Fetching Locations For ${source}`);
      var locationReceived = new Promise((resolve, reject) => {
        mcsd.getLocations(source, (mcsdData) => {
          mcsd.getBuildings(mcsdData, (buildings) => {
            resolve({
              buildings,
              mcsdData
            })
            winston.info(`Done Fetching ${source} Locations`);
          });
        })
      })

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
    if (!req.params.source) {
      winston.error({
        error: 'Missing Data Source',
      });
      res.set('Access-Control-Allow-Origin', '*');
      res.status(401).json({
        error: 'Missing Data Source',
      });
    } else {
      const source = req.params.source

      winston.info(`Fetching Locations For ${source}`);
      var locationReceived = new Promise((resolve, reject) => {
        mcsd.getLocations(source, (mcsdData) => {
          winston.info(`Done Fetching Locations For ${source}`);
          resolve(mcsdData);
        });
      });

      locationReceived.then((mcsdData) => {
        winston.info(`Creating ${source} Tree`);
        mcsd.createTree(mcsdData, topOrgId, (tree) => {
          winston.info(`Done Creating Tree for ${source}`);
          res.set('Access-Control-Allow-Origin', '*');
          res.status(200).json(tree);
        });
      }).catch((err) => {
        winston.error(err);
      });
    }
  });

  app.get('/mappingStatus/:source1/:source2/:level/:totalSource2Levels/:totalSource1Levels/:clientId', (req, res) => {
    winston.info('Getting mapping status');
    const source1DB = req.params.source1
    const source2DB = req.params.source2
    const recoLevel = req.params.level;
    const totalSource2Levels = req.params.totalSource2Levels;
    const totalSource1Levels = req.params.totalSource1Levels;
    const clientId = req.params.clientId;

    let statusRequestId = `mappingStatus${clientId}`
    statusResData = JSON.stringify({
      status: '1/2 - Loading Source2 and Source1 Data',
      error: null,
      percent: null
    })
    redisClient.set(statusRequestId, statusResData)

    const source2LocationReceived = new Promise((resolve, reject) => {
      mcsd.getLocations(source2DB, (mcsdSource2) => {
        mcsdSource2All = mcsdSource2;
        let level
        if (recoLevel === totalSource1Levels) {
          level = totalSource2Levels
        } else {
          level = recoLevel
        }
        if (levelMaps[source2DB] && levelMaps[source2DB][recoLevel]) {
          level = levelMaps[source2DB][recoLevel];
        }
        mcsd.filterLocations(mcsdSource2, topOrgId, level, (mcsdSource2Level) => {
          resolve(mcsdSource2Level);
        });
      });
    });
    const source1LocationReceived = new Promise((resolve, reject) => {
      mcsd.getLocations(source1DB, (mcsdSource1) => {
        mcsd.filterLocations(mcsdSource1, topOrgId, recoLevel, (mcsdSource1Level) => {
          resolve(mcsdSource1Level);
        });
      });
    });
    const mappingDB = source1DB + source2DB
    const mappingLocationReceived = new Promise((resolve, reject) => {
      mcsd.getLocations(mappingDB, (mcsdMapped) => {
        resolve(mcsdMapped);
      });
    });
    Promise.all([source2LocationReceived, source1LocationReceived, mappingLocationReceived]).then((locations) => {
      var source2Locations = locations[0]
      var source1Locations = locations[1]
      var mappedLocations = locations[2]
      scores.getMappingStatus(source1Locations, source2Locations, mappedLocations, source1DB, clientId, (mappingStatus) => {
        res.set('Access-Control-Allow-Origin', '*');
        res.status(200).json(mappingStatus)
      })
    })
  })

  app.get('/reconcile/:source1/:source2/:totalSource1Levels/:totalSource2Levels/:recoLevel/:clientId', (req, res) => {
    if (!req.params.source1 || !req.params.source2 || !req.params.recoLevel) {
      winston.error({
        error: 'Missing source1 or source2 or reconciliation Level'
      });
      res.set('Access-Control-Allow-Origin', '*');
      res.status(401).json({
        error: 'Missing source1 or source2 or reconciliation Level'
      });
    } else {
      winston.info('Getting scores');
      const orgid = req.params.orgid;
      const recoLevel = req.params.recoLevel;
      const totalSource1Levels = req.params.totalSource1Levels;
      const totalSource2Levels = req.params.totalSource2Levels;
      const source1 = req.params.source1;
      const source2 = req.params.source2;
      const clientId = req.params.clientId;
      let mcsdSource2All = null;
      let mcsdSource1All = null;

      let scoreRequestId = `scoreResults${clientId}`
      scoreResData = JSON.stringify({
        status: '1/3 - Loading Source2 and Source1 Data',
        error: null,
        percent: null
      })
      redisClient.set(scoreRequestId, scoreResData)
      async.parallel({
        source2Locations: function (callback) {
          mcsd.getLocations(source2, (mcsdSource2) => {
            mcsdSource2All = mcsdSource2;
            let level
            if (recoLevel === totalSource1Levels) {
              level = totalSource2Levels
            } else {
              level = recoLevel
            }

            if (levelMaps[orgid] && levelMaps[orgid][recoLevel]) {
              level = levelMaps[orgid][recoLevel];
            }
            mcsd.filterLocations(mcsdSource2, topOrgId, level, (mcsdSource2Level) => {
              return callback(false, mcsdSource2Level)
            });
          });
        },
        source1Loations: function (callback) {
          mcsd.getLocations(source1, (mcsdSource1) => {
            mcsdSource1All = mcsdSource1;
            mcsd.filterLocations(mcsdSource1, topOrgId, recoLevel, (mcsdSource1Level) => {
              return callback(false, mcsdSource1Level);
            });
          });
        },
        mappingData: function (callback) {
          const mappingDB = source1 + source2
          mcsd.getLocationByID(mappingDB, false, false, (mcsdMapped) => {
            return callback(false, mcsdMapped);
          });
        }
      }, (error, results) => {
        if (recoLevel == totalSource1Levels) {
          scores.getBuildingsScores(
            results.source1Loations,
            results.source2Locations,
            results.mappingData,
            mcsdSource2All,
            mcsdSource1All,
            source1,
            source2,
            recoLevel,
            totalSource1Levels,
            clientId, (scoreResults) => {
            res.set('Access-Control-Allow-Origin', '*');
            recoStatus(source1, source2, (totalAllMapped, totalAllNoMatch, totalAllFlagged) => {
              scoreResData = JSON.stringify({
                status: 'Done',
                error: null,
                percent: 100
              })
              redisClient.set(scoreRequestId, scoreResData)
              var source1TotalAllNotMapped = (mcsdSource1All.entry.length - 1) - totalAllMapped
              res.status(200).json({
                scoreResults,
                recoLevel,
                source2TotalRecords: results.source2Locations.entry.length,
                source2TotalAllRecords: mcsdSource2All.entry.length,
                totalAllMapped: totalAllMapped,
                totalAllFlagged: totalAllFlagged,
                totalAllNoMatch: totalAllNoMatch,
                source1TotalAllNotMapped: source1TotalAllNotMapped,
                source1TotalAllRecords: mcsdSource1All.entry.length - 1
              });
              winston.info('Score results sent back');
            })
          });
        } else {
          scores.getJurisdictionScore(
            results.source1Loations, 
            results.source2Locations, 
            results.mappingData, 
            mcsdSource2All, 
            mcsdSource1All, 
            source1,
            source2, 
            recoLevel, 
            totalSource1Levels, 
            clientId, (scoreResults) => {
            res.set('Access-Control-Allow-Origin', '*');
            recoStatus(source1, source2, (totalAllMapped, totalAllNoMatch, totalAllFlagged) => {
              var source1TotalAllNotMapped = (mcsdSource1All.entry.length - 1) - totalAllMapped
              res.status(200).json({
                scoreResults,
                recoLevel,
                source2TotalRecords: results.source2Locations.entry.length,
                source2TotalAllRecords: mcsdSource2All.entry.length,
                totalAllMapped: totalAllMapped,
                totalAllFlagged: totalAllFlagged,
                totalAllNoMatch: totalAllNoMatch,
                source1TotalAllNotMapped: source1TotalAllNotMapped,
                source1TotalAllRecords: mcsdSource1All.entry.length - 1
              });
              winston.info('Score results sent back');
            })
          });
        }
      })
    }

    function recoStatus(source1, source2, callback) {
      //getting total Mapped
      var database = source1 + source2;
      var url = URI(config.getConf('mCSD:url')).segment(database).segment('fhir').segment('Location')
        .toString();
      const options = {
        url,
      };
      var totalAllMapped = 0
      var totalAllNoMatch = 0
      var totalAllFlagged = 0
      var source1TotalAllNotMapped = 0
      const noMatchCode = config.getConf('mapping:noMatchCode');
      const flagCode = config.getConf('mapping:flagCode');
      setTimeout(() => {
        mcsd.getLocations(database, (body) => {
          if (!body.hasOwnProperty('entry') || body.length === 0) {
            totalAllNoMatch = 0
            totalAllMapped = 0
            return callback(totalAllMapped, source1TotalAllNotMapped, totalAllNoMatch, totalAllFlagged)
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

  app.get('/getUnmatched/:source1/:source2/:recoLevel', (req, res) => {
    winston.info(`Getting Source2 Unmatched Orgs for ${req.params.source1}`);
    if (!req.params.source1 || !req.params.source2) {
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
    const source1 = req.params.source1
    const source2 = req.params.source2
    let recoLevel = req.params.recoLevel;
    if (levelMaps[orgid] && levelMaps[orgid][recoLevel]) {
      recoLevel = levelMaps[orgid][recoLevel];
    }
    mcsd.getLocations(source2, (locations) => {
      mcsd.filterLocations(locations, topOrgId, recoLevel, (mcsdLevel) => {
        scores.getUnmatched(locations, mcsdLevel, source1, source2, (unmatched) => {
          winston.info(`sending back Source2 unmatched Orgs for ${req.params.source1}`);
          res.set('Access-Control-Allow-Origin', '*');
          res.status(200).json(unmatched);
        });
      });
    });
  });

  app.post('/match/:type', (req, res) => {
    winston.info('Received data for matching');
    const type = req.params.type;
    const form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
      if (!fields.source1DB || !fields.source2DB) {
        winston.error({
          error: 'Missing Source1 or Source2'
        });
        res.set('Access-Control-Allow-Origin', '*');
        res.status(401).json({
          error: 'Missing Source1 or Source2'
        });
        return;
      }
      let source1Id = fields.source1Id;
      let source1DB = fields.source1DB
      let source2DB = fields.source2DB
      const source2Id = fields.source2Id;
      const recoLevel = fields.recoLevel;
      const totalLevels = fields.totalLevels;
      if (!source1Id || !source2Id) {
        winston.error({
          error: 'Missing either Source1ID or Source2ID or both'
        });
        res.set('Access-Control-Allow-Origin', '*');
        res.status(401).json({
          error: 'Missing either Source1ID or Source2ID or both'
        });
        return;
      }
      if (recoLevel == totalLevels) {
        const namespace = config.getConf('UUID:namespace');
        source1Id = uuid5(source1Id, `${namespace}100`);
      }
      mcsd.saveMatch(source1Id, source2Id, source1DB, source2DB, recoLevel, totalLevels, type, (err) => {
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

  app.post('/acceptFlag/:source1/:source2', (req, res) => {
    winston.info('Received data for marking flag as a match');
    if (!req.params.source1 || !req.params.source2) {
      winston.error({
        error: 'Missing Source1 or Source2'
      });
      res.set('Access-Control-Allow-Origin', '*');
      res.status(401).json({
        error: 'Missing Source1 or Source2'
      });
      return;
    }
    const source1 = req.params.source1;
    const source2 = req.params.source2;
    const form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
      const source2Id = fields.source2Id;
      const recoLevel = fields.recoLevel;
      const totalLevels = fields.totalLevels;
      if (!source2Id) {
        winston.error({
          error: 'Missing Source2ID'
        });
        res.set('Access-Control-Allow-Origin', '*');
        res.status(401).json({
          error: 'Missing Source2ID'
        });
        return;
      }
      if (recoLevel == totalLevels) {
        const namespace = config.getConf('UUID:namespace');
        source1Id = uuid5(orgid, `${namespace}100`);
      }
      mcsd.acceptFlag(source2Id, source1, source2, (err) => {
        winston.info('Done marking flag as a match');
        res.set('Access-Control-Allow-Origin', '*');
        if (err) res.status(401).send({
          error: err
        });
        else res.status(200).send();
      });
    });
  });

  app.post('/noMatch/:source1/:source2', (req, res) => {
    winston.info('Received data for matching');
    if (!req.params.source1 || !req.params.source2) {
      winston.error({
        error: 'Missing Source1 or Source2'
      });
      res.set('Access-Control-Allow-Origin', '*');
      res.status(401).json({
        error: 'Missing Source1 or Source2'
      });
      return;
    }
    const source1 = req.params.source1;
    const source2 = req.params.source2;
    const form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
      let source1Id = fields.source1Id;
      const recoLevel = fields.recoLevel;
      const totalLevels = fields.totalLevels;
      if (!source1Id) {
        winston.error({
          error: 'Missing either Source1ID'
        });
        res.set('Access-Control-Allow-Origin', '*');
        res.status(401).json({
          error: 'Missing either Source1ID'
        });
        return;
      }
      if (recoLevel == totalLevels) {
        const namespace = config.getConf('UUID:namespace');
        source1Id = uuid5(source1Id, `${namespace}100`);
      }
      mcsd.saveNoMatch(source1Id, source1, source2, recoLevel, totalLevels, (err) => {
        winston.info('Done matching');
        res.set('Access-Control-Allow-Origin', '*');
        if (err) res.status(401).send({
          error: err
        });
        else res.status(200).send();
      });
    });
  });

  app.post('/breakMatch/:source1/:source2', (req, res) => {
    if (!req.params.source1) {
      winston.error({
        error: 'Missing Source1'
      });
      res.set('Access-Control-Allow-Origin', '*');
      res.status(401).json({
        error: 'Missing Source1'
      });
      return;
    }
    let source1 = req.params.source1
    let source2 = req.params.source2
    const form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
      winston.info(`Received break match request for ${fields.source2Id}`);
      const source2Id = fields.source2Id;
      const database = source1 + source2;
      mcsd.breakMatch(source2Id, database, source1, (err, results) => {
        winston.info(`break match done for ${fields.source2Id}`);
        res.set('Access-Control-Allow-Origin', '*');
        res.status(200).send(err);
      });
    });
  });

  app.post('/breakNoMatch/:source1/:source2', (req, res) => {
    if (!req.params.source1 || !req.params.source2) {
      winston.error({
        error: 'Missing Source1'
      });
      res.set('Access-Control-Allow-Origin', '*');
      res.status(401).json({
        error: 'Missing Source1'
      });
      return;
    }
    const form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
      winston.info(`Received break no match request for ${fields.source1Id}`);
      var source1Id = fields.source1Id;
      if (!source1Id) {
        winston.error({
          'error': 'Missing Source1 ID'
        })
        res.set('Access-Control-Allow-Origin', '*');
        res.status(401).json({
          error: 'Missing Source1 ID'
        });
        return
      }
      let source1 = req.params.source1
      let source2 = req.params.source2
      const recoLevel = fields.recoLevel;
      const totalLevels = fields.totalLevels;
      const mappingDB = source1 + source2;
      if (recoLevel == totalLevels) {
        const namespace = config.getConf('UUID:namespace');
        source1Id = uuid5(source1Id, `${namespace}100`);
      }
      mcsd.breakNoMatch(source1Id, mappingDB, (err) => {
        winston.info(`break no match done for ${fields.source1Id}`);
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

  app.get('/uploadProgress/:clientId', (req, res) => {
    const clientId = req.params.clientId
    redisClient.get(`uploadProgress${clientId}`, (error, results) => {
      results = JSON.parse(results)
      res.set('Access-Control-Allow-Origin', '*');
      res.status(200).json(results)
      //reset progress
      if (results && (results.error !== null || results.status === 'Done')) {
        var uploadRequestId = `uploadProgress${clientId}`
        let uploadReqPro = JSON.stringify({
          status: null,
          error: null,
          percent: null
        })
        redisClient.set(uploadRequestId, uploadReqPro)
      }
    })
  });

  app.get('/mappingStatusProgress/:clientId', (req, res) => {
    const clientId = req.params.clientId
    redisClient.get(`mappingStatus${clientId}`, (error, results) => {
      results = JSON.parse(results)
      res.set('Access-Control-Allow-Origin', '*');
      res.status(200).json(results)
      //reset progress
      if (results && (results.error !== null || results.status === 'Done')) {
        var statusRequestId = `mappingStatus${clientId}`
        let statusResData = JSON.stringify({
          status: null,
          error: null,
          percent: null
        })
        redisClient.set(statusRequestId, statusResData)
      }
    })
  });

  app.get('/scoreProgress/:clientId', (req, res) => {
    const clientId = req.params.clientId
    redisClient.get(`scoreResults${clientId}`, (error, results) => {
      results = JSON.parse(results)
      res.set('Access-Control-Allow-Origin', '*');
      res.status(200).json(results)
      //reset progress
      if (results && (results.error !== null || results.status === 'Done')) {
        const scoreRequestId = `scoreResults${clientId}`
        let uploadReqPro = JSON.stringify({
          status: null,
          error: null,
          percent: null
        })
        redisClient.set(scoreRequestId, uploadReqPro)
      }
    })
  });

  app.post('/addDataSource', (req, res) => {
    const form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
      winston.info('Received a request to add a new data source');
      mongo.addDataSource(fields, (err, response) => {
        if (err) {
          res.set('Access-Control-Allow-Origin', '*');
          res.status(500).json({
            error: 'Unexpected error occured,please retry',
          });
        } else {
          winston.info('Data source saved successfully');
          res.set('Access-Control-Allow-Origin', '*');
          res.status(200).json({
            status: 'done',
            password: response
          });
        }
      });
    });
  });
  app.post('/editDataSource', (req, res) => {
    const form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
      winston.info('Received a request to edit a data source');
      mongo.editServer(fields, (err, response) => {
        if (err) {
          res.set('Access-Control-Allow-Origin', '*');
          res.status(500).json({
            error: 'Unexpected error occured,please retry',
          });
        } else {
          winston.info('Data source edited sucessfully');
          res.set('Access-Control-Allow-Origin', '*');
          res.status(200).json({
            status: 'done',
            password: response
          });
        }
      });
    });
  });

  app.get('/deleteDataSource/:_id/:name', (req, res) => {
    const id = req.params._id;
    winston.info('Received request to delete data source with id ' + id)
    mongo.deleteDataSource(id, (err, response) => {
      if (err) {
        res.status(500).json({
          error: 'Unexpected error occured while deleting data source,please retry',
        });
      } else {
        winston.error(req.params.name)
        let database = mixin.toTitleCase(req.params.name)
        mcsd.deleteDB(database,(error) => {
          if (error) {
            winston.error(error)
            res.status(500).json({
              error: 'Unexpected error occured while deleting database',
            });
          } else {
            winston.info('Data source with id ' + id + ' deleted')
            res.status(200).json({
              status: 'done',
            });
          }
        })
      }
    });
  });

  app.get('/getDataSources', (req, res) => {
    winston.info('received request to get data sources');
    mongo.getDataSources((err, servers) => {
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
          } else if (server.sourceType === 'DHIS2') {
            let password = ''
            if (server.password) {
              password = mongo.decrypt(server.password)
            }
            const auth = `Basic ${Buffer.from(`${server.username}:${password}`).toString('base64')}`
            const dhis2URL = url.parse(server.host)
            dhis.getLastUpdate(server.name, dhis2URL, auth, (lastUpdate) => {
              if (lastUpdate) {
                lastUpdate = lastUpdate.split('.').shift()
                servers[key]["lastUpdate"] = lastUpdate
              }
              return nxtServer()
            })
          } else {
            return nxtServer()
          }
        },() => {
          winston.info('returning list of data sources ' + JSON.stringify(servers))
          res.set('Access-Control-Allow-Origin', '*')
          res.status(200).json({
            servers,
          })
        })
      }
    })
  })

  app.post('/addDataSourcePair', (req,res) => {
    winston.info('Received a request to save data source pairs')
    const form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
      mongo.addDataSourcePair(fields, (error, results) => {
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

  app.get('/resetDataSourcePair', (req,res) => {
    mongo.resetDataSourcePair((error, response) => {
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

  app.get('/getDataSourcePair', (req, res) => {
    mongo.getDataSourcePair((err, sources) => {
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
      winston.info(`Received Source1 Data with fields Mapping ${JSON.stringify(fields)}`);
      if (!fields.csvName) {
        winston.error({
          error: 'Missing CSV Name'
        });
        res.set('Access-Control-Allow-Origin', '*');
        res.status(401).json({
          error: 'Missing CSV Name'
        });
        return;
      }
      const database = mixin.toTitleCase(fields.csvName);
      const expectedLevels = config.getConf('levels');
      const clientId = fields.clientId
      var uploadRequestId = `uploadProgress${clientId}`
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
        mcsd.archiveDB(database, (err) => {
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
          mcsd.cleanArchives(database, () => {})
          //delete existing db
          winston.info('Deleting DB ' + database)
          mcsd.deleteDB(database, (err) => {
            if (!err) {
              winston.info(`Uploading data for ${database} now`)
              let uploadReqPro = JSON.stringify({
                status: '5/5 Uploading of DB started',
                error: null,
                percent: null
              })
              redisClient.set(uploadRequestId, uploadReqPro)
              mcsd.CSVTomCSD(files[fileName].path, fields, database, clientId, () => {
                winston.info(`Data upload for ${database} is done`)
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
