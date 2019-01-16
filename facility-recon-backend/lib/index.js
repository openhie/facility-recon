require('./init');
const cluster = require('cluster');
const express = require('express');
const path = require('path')
const bodyParser = require('body-parser');
const formidable = require('formidable');
const winston = require('winston');
const https = require('https');
const http = require('http');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const redis = require('redis');
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || '127.0.0.1'
});
const json2csv = require('json2csv').parse;
const csv = require('fast-csv');
const url = require('url');
const async = require('async');
const mongoose = require('mongoose');
const models = require('./models')
const mixin = require('./mixin')()
const mongo = require('./mongo')();
const config = require('./config');
const mcsd = require('./mcsd')();
const dhis = require('./dhis')();
const fhir = require('./fhir')();
const scores = require('./scores')();

const app = express();
const server = require('http').createServer(app);

let cleanReqPath = function (req, res, next) {
  let modified_url = req.url.replace("/gofr",'')
  if (modified_url) {
    req.url = req.url.replace('/gofr', '')
  }
  return next()
}

let jwtValidator = function(req, res, next) {
  if (req.method == "OPTIONS" || 
  req.path == "/authenticate/" || 
  req.path == "/gofr" || 
  req.path.startsWith("/static/js") ||
  req.path.startsWith("/static/css")
  ) {
    return next()
  }
  if (!req.headers.authorization || req.headers.authorization.split(' ').length !== 2) {
    winston.error("Token is missing")
    res.set('Access-Control-Allow-Origin', '*')
    res.set('WWW-Authenticate', 'Bearer realm="Token is required"')
    res.set('charset', 'utf - 8')
    res.status(401).json({error: 'Token is missing'})
  } else {
    tokenArray = req.headers.authorization.split(' ')
    let token = req.headers.authorization = tokenArray[1]
    jwt.verify(token, config.getConf('auth:secret'), (err, decoded) => {
      if(err) {
        winston.warn("Token expired")
        res.set('Access-Control-Allow-Origin', '*')
        res.set('WWW-Authenticate', 'Bearer realm="Token expired"')
        res.set('charset', 'utf - 8')
        res.status(401).json({error: 'Token expired'})
      } else {
        winston.info("token is valid")
        if(req.path == "/isTokenActive/") {
          res.set('Access-Control-Allow-Origin', '*')
          res.status(200).send(true)
        } else {
          return next()
        }
      }
    })
  }
}

app.use(cleanReqPath)
app.use(jwtValidator)
app.use(express.static(__dirname + '/../gui'));
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

if (cluster.isMaster) {
  var workers = {};
  const database = config.getConf("DB_NAME")
  const mongoUser = config.getConf("DB_USER")
  const mongoPasswd = config.getConf("DB_PASSWORD")
  const mongoHost = config.getConf("DB_HOST")
  const mongoPort = config.getConf("DB_PORT")
  if (mongoUser && mongoPasswd) {
    var uri = `mongodb://${mongoUser}:${mongoPasswd}@${mongoHost}:${mongoPort}/${database}`;
  } else {
    var uri = `mongodb://${mongoHost}:${mongoPort}/${database}`;
  }
  mongoose.connect(uri);
  let db = mongoose.connection
  db.on("error", console.error.bind(console, "connection error:"))
  db.once("open", () => {
    models.UsersSchema.find({ userName: "root@gofr.org" }).lean().exec((err, data) => {
      if (data.length == 0) {
        winston.info("Default user not found, adding now ...")
        let roles = [{
            "name": "Admin"
          },
          {
            "name": "Data Manager"
          }
        ]
        models.RolesSchema.collection.insertMany(roles, (err, data) => {
          models.RolesSchema.find({name: "Admin"}, (err, data) => {
            let User = new models.UsersSchema({
              firstName: "Root",
              surname: "Root",
              userName: "root@gofr.org",
              role: data[0]._id,
              password: bcrypt.hashSync("gofr", 8)
            })
            User.save((err, data) => {
              if (err) {
                winston.error(err)
                winston.error('Unexpected error occured,please retry')
              } else {
                winston.info('Admin User added successfully')
              }
            })
          })
        })
      }
    })
  })
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
            return ident.system === 'https://digitalhealth.intrahealth.org/source1' && ident.value === url + source1id
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

  app.post('/authenticate', (req, res) => {
    const form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
      winston.info('Authenticating user ' + fields.username)
      const database = config.getConf("DB_NAME")
      const mongoUser = config.getConf("DB_USER")
      const mongoPasswd = config.getConf("DB_PASSWORD")
      const mongoHost = config.getConf("DB_HOST")
      const mongoPort = config.getConf("DB_PORT")

      if (mongoUser && mongoPasswd) {
        var uri = `mongodb://${mongoUser}:${mongoPasswd}@${mongoHost}:${mongoPort}/${database}`;
      } else {
        var uri = `mongodb://${mongoHost}:${mongoPort}/${database}`;
      }
      mongoose.connect(uri);
      let db = mongoose.connection
      db.on("error", console.error.bind(console, "connection error:"))
      db.once("open", () => {
        models.UsersSchema.find({
          userName: fields.username
        }).lean().exec((err, data) => {
          if (data.length === 1) {
            let userID = data[0]._id.toString()
            let passwordMatch = bcrypt.compareSync(fields.password, data[0].password);
            if (passwordMatch) {
              let tokenDuration = config.getConf('auth:tokenDuration')
              let secret = config.getConf('auth:secret')
              let token = jwt.sign({
                id: data[0]._id.toString()
              }, secret, {
                expiresIn: tokenDuration
              })
              // get role name
              models.RolesSchema.find({
                _id: data[0].role
              }).lean().exec((err, roles) => {
                let role = null
                if (roles.length === 1) {
                  role = roles[0].name
                }
                winston.info('Successfully Authenticated user ' + fields.username)
                res.status(200).json({
                  token,
                  role,
                  userID
                })
              })
            } else {
              winston.info('Failed Authenticating user ' + fields.username)
              res.status(200).json({
                token: null,
                role: null,
                userID: null
              })
            }
          } else {
            winston.info('Failed Authenticating user ' + fields.username)
            res.status(200).json({
              token: null,
              role: null,
              userID: null
            })
          }
        })
      })
    })
  })

  app.post('/addUser', (req, res) => {
    winston.info("Received a request to add a new user")
    const form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
      const database = config.getConf("DB_NAME")
      const mongoUser = config.getConf("DB_USER")
      const mongoPasswd = config.getConf("DB_PASSWORD")
      const mongoHost = config.getConf("DB_HOST")
      const mongoPort = config.getConf("DB_PORT")

      if (mongoUser && mongoPasswd) {
        var uri = `mongodb://${mongoUser}:${mongoPasswd}@${mongoHost}:${mongoPort}/${database}`;
      } else {
        var uri = `mongodb://${mongoHost}:${mongoPort}/${database}`;
      }
      mongoose.connect(uri);
      let db = mongoose.connection
      db.on("error", console.error.bind(console, "connection error:"))
      db.once("open", () => {
        let User = new models.UsersSchema({
          _id: new mongoose.Types.ObjectId(),
          role: fields.role,
          firstName: fields.firstname,
          otherName: fields.othername,
          surname: fields.surname,
          password: bcrypt.hashSync(fields.password, 8),
          userName: fields.username
        })
        User.save((err, data) => {
          if (err) {
            winston.error(err)
            winston.error('Unexpected error occured,please retry')
            res.status(400).send()
          } else {
            winston.info('User added successfully')
            res.status(200).send()
          }
        })
      })
    })
  })

  app.get('/getUsers', (req, res) => {
    winston.info("received a request to get users lists")
    const database = config.getConf("DB_NAME")
    const mongoUser = config.getConf("DB_USER")
    const mongoPasswd = config.getConf("DB_PASSWORD")
    const mongoHost = config.getConf("DB_HOST")
    const mongoPort = config.getConf("DB_PORT")

    if (mongoUser && mongoPasswd) {
      var uri = `mongodb://${mongoUser}:${mongoPasswd}@${mongoHost}:${mongoPort}/${database}`;
    } else {
      var uri = `mongodb://${mongoHost}:${mongoPort}/${database}`;
    }
    mongoose.connect(uri);
    let db = mongoose.connection
    db.on("error", console.error.bind(console, "connection error:"))
    db.once("open", () => {
      models.UsersSchema.find({}).lean().exec((err, users) => {
        winston.info(`sending back a list of ${users.length} users`)
        res.status(200).json(users)
      })
    })
  })

  app.post('/shareSourcePair', (req, res) => {
    winston.info("Received a request to share data source pair")
    const form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
      fields.users = JSON.parse(fields.users)
      mongo.shareSourcePair(fields.sharePair, fields.users, (err, response) => {
        if(err) {
          winston.error(err)
          winston.error("An error occured while sharing data source pair")
          res.status(500).send("An error occured while sharing data source pair")
        } else {
          winston.info("Data source pair shared successfully")
          mongo.getDataSourcePair(fields.userID, (err, pairs) => {
            if(err) {
              winston.error(err)
              winston.error("An error has occured while getting data source pairs")
              res.status(500).send("An error has occured while getting data source pairs")
              return
            }
            res.status(200).json(pairs)
          })
        }
      })
    })
  })

  app.get('/getRoles/:id?', (req, res) => {
    winston.info("Received a request to get roles")
    const database = config.getConf("DB_NAME")
    const mongoUser = config.getConf("DB_USER")
    const mongoPasswd = config.getConf("DB_PASSWORD")
    const mongoHost = config.getConf("DB_HOST")
    const mongoPort = config.getConf("DB_PORT")

    if (mongoUser && mongoPasswd) {
      var uri = `mongodb://${mongoUser}:${mongoPasswd}@${mongoHost}:${mongoPort}/${database}`;
    } else {
      var uri = `mongodb://${mongoHost}:${mongoPort}/${database}`;
    }
    mongoose.connect(uri);
    let db = mongoose.connection
    db.on("error", console.error.bind(console, "connection error:"))
    db.once("open", () => {
      let idFilter
      if (req.params.id) {
        idFilter = {_id: req.params.id}
      } else {
        idFilter = {}
      }
      models.RolesSchema.find(idFilter).lean().exec((err, roles) => {
        winston.info(`sending back a list of ${roles.length} roles`)
        res.status(200).json(roles)
      })
    })
  })

  app.get('/countLevels/:source1/:source2/:userID', (req, res) => {
    winston.info(`Received a request to get total levels`);
    let userID = req.params.userID
    let source1 = req.params.source1 + userID
    let source2 = req.params.source2 + userID
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
        res.status(400).json({
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

  app.get('/getLevelData/:source/:userID/:level', (req, res) => {
    let userID = req.params.userID
    let db = req.params.source + userID;
    let level = req.params.level
    let levelData = []
    mcsd.getLocations(db, (mcsdData) => {
      mcsd.filterLocations(mcsdData, topOrgId, level, (mcsdLevelData) => {
        async.each(mcsdLevelData.entry, (data, nxtData) => {
          levelData.push({
            text: data.resource.name,
            value: data.resource.id
          })
          return nxtData()
        }, () => {
          res.status(200).json(levelData)
        })
      });
    });
  })

  app.post('/editLocation', (req, res) => {
    const form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
      let db = fields.source + fields.userID
      let id = fields.locationId
      let name = fields.locationName
      let parent = fields.locationParent
      mcsd.editLocation(id, name, parent, db, (resp, err) => {
        if(err) {
          res.status(400).send(err)
        } else {
          res.status(200).send()
        }
      })
    })
  })

  app.get('/uploadAvailable/:source1/:source2/:userID', (req, res) => {

    if (!req.params.source1 || !req.params.source2) {
      winston.error({
        error: 'Missing Orgid'
      });
      res.set('Access-Control-Allow-Origin', '*');
      res.status(400).json({
        error: 'Missing Orgid'
      });
    } else {
      let userID = req.params.userID
      const source1 = req.params.source1 + userID;
      const source2 = req.params.source2 + userID;
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
      res.status(400).json({
        error: 'Missing Orgid'
      });
    } else {
      const orgid = req.params.orgid;
      winston.info(`Getting archived DB for ${orgid}`);
      mongo.getArchives(orgid, (err, archives) => {
        res.set('Access-Control-Allow-Origin', '*');
        if (err) {
          winston.error(err)
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
      res.status(400).json({
        error: 'Missing Orgid'
      });
    } else {
      const orgid = req.params.orgid;
      winston.info(`Restoring archive DB for ${orgid}`);
      const form = new formidable.IncomingForm();
      form.parse(req, (err, fields, files) => {
        mongo.restoreDB(fields.archive, orgid, (err) => {
          res.set('Access-Control-Allow-Origin', '*');
          if (err) {
            winston.error(err)
            res.status(400).json({
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
      const userID = fields.userID;
      const clientId = fields.clientId;
      const mode = fields.mode;
      let full = true;
      if (mode === 'update') {
        full = false;
      }
      dhis.sync(host, username, password, name, userID, clientId, topOrgId, topOrgName, false, full, false, true);
    });
  });

  app.post('/fhirSync', (req,res) => {
    res.status(200).end()
    const form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
      winston.info('Received a request to sync FHIR server ' + fields.host)
      fhir.sync(fields.host, fields.username, fields.password, fields.mode, fields.name, fields.userID, fields.clientId, topOrgId, topOrgName)
    })
  })

  app.get('/hierarchy', (req, res) => {
    let source = req.query.source
    let userID = req.query.userID
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
      res.status(400).json({
        error: 'Missing Source'
      });
    } else {
      winston.info(`Fetching Locations For ${source}`);
      let db = source + userID
      var locationReceived = new Promise((resolve, reject) => {
        mcsd.getLocations(db, (mcsdData) => {
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

  app.get('/getTree/:source/:userID', (req, res) => {
    if (!req.params.source) {
      winston.error({
        error: 'Missing Data Source',
      });
      res.set('Access-Control-Allow-Origin', '*');
      res.status(400).json({
        error: 'Missing Data Source',
      });
    } else {
      const source = req.params.source
      let userID = req.params.userID
      let db = source + userID
      winston.info(`Fetching Locations For ${source}`);
      var locationReceived = new Promise((resolve, reject) => {
        mcsd.getLocations(db, (mcsdData) => {
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

  app.get('/mappingStatus/:source1/:source2/:level/:totalSource2Levels/:totalSource1Levels/:clientId/:userID', (req, res) => {
    winston.info('Getting mapping status');
    const userID = req.params.userID
    const source1DB = req.params.source1 + userID
    const source2DB = req.params.source2 + userID
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
    const mappingDB = req.params.source1 + userID + req.params.source2
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

  app.get('/reconcile', (req, res) => {
    let totalSource1Levels = req.query.totalSource1Levels
    let totalSource2Levels = req.query.totalSource2Levels
    let recoLevel = req.query.recoLevel
    let clientId = req.query.clientId
    let userID = req.query.userID
    let source1 = req.query.source1
    let source2 = req.query.source2
    if (!source1 || !source2 || !recoLevel || !userID) {
      winston.error({
        error: 'Missing source1 or source2 or reconciliation Level or userID'
      });
      res.set('Access-Control-Allow-Origin', '*');
      res.status(400).json({
        error: 'Missing source1 or source2 or reconciliation Level or userID'
      });
    } else {
      winston.info('Getting scores');
      const orgid = req.query.orgid;
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
          let dbSource2 = source2 + userID
          mcsd.getLocations(dbSource2, (mcsdSource2) => {
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
          let dbSource1 = source1 + userID
          mcsd.getLocations(dbSource1, (mcsdSource1) => {
            mcsdSource1All = mcsdSource1;
            mcsd.filterLocations(mcsdSource1, topOrgId, recoLevel, (mcsdSource1Level) => {
              return callback(false, mcsdSource1Level);
            });
          });
        },
        mappingData: function (callback) {
          const mappingDB = source1 + userID + source2
          mcsd.getLocations(mappingDB, (mcsdMapped) => {
            return callback(false, mcsdMapped);
          });
        }
      }, (error, results) => {
        let source1DB = source1 + userID
        let source2DB = source2 + userID
        let mappingDB = source1 + userID + source2
        if (recoLevel == totalSource1Levels) {
          scores.getBuildingsScores(
            results.source1Loations,
            results.source2Locations,
            results.mappingData,
            mcsdSource2All,
            mcsdSource1All,
            source1DB,
            source2DB,
            mappingDB,
            recoLevel,
            totalSource1Levels,
            clientId, (scoreResults) => {
            res.set('Access-Control-Allow-Origin', '*');
            recoStatus(source1, source2, userID, (totalAllMapped, totalAllNoMatch, totalAllFlagged) => {
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
                source2TotalAllRecords: mcsdSource2All.entry.length-1,
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
            source1DB,
            source2DB,
            mappingDB,
            recoLevel, 
            totalSource1Levels, 
            clientId, (scoreResults) => {
            res.set('Access-Control-Allow-Origin', '*');
            recoStatus(source1, source2, userID, (totalAllMapped, totalAllNoMatch, totalAllFlagged) => {
              var source1TotalAllNotMapped = (mcsdSource1All.entry.length - 1) - totalAllMapped
              res.status(200).json({
                scoreResults,
                recoLevel,
                source2TotalRecords: results.source2Locations.entry.length,
                source2TotalAllRecords: mcsdSource2All.entry.length-1,
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

    function recoStatus(source1, source2, userID, callback) {
      //getting total Mapped
      var database = source1 + userID + source2;
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
          })
        })
      }, 1000)
    }

  });
  app.get('/matchedLocations/:source1/:source2/:type/:userID', (req, res) => {
    winston.info(`Received a request to return matched Locations in ${req.params.type} format for ${req.params.source1}${req.params.source2}`);
    if (!req.params.source1 || !req.params.source2) {
      winston.error({
        error: 'Missing Source1 or Source2'
      });
      res.set('Access-Control-Allow-Origin', '*');
      res.status(400).json({
        error: 'Missing Source1 or Source2'
      });
      return;
    }
    let source1 = req.params.source1
    let source2 = req.params.source2
    let type = req.params.type
    let userID = req.params.userID
    let mappingDB = source1 + userID + source2
    let matched = []
    let fields = ['source 1 name','source 1 ID','source 2 name','source 2 ID']
    mcsd.getLocations(mappingDB, (mapped) => {
      if (type === 'FHIR') {
        winston.info('Sending back matched locations in FHIR specification')
        let mappedmCSD = {
          "resourceType": "Bundle",
          "type": "document",
          "entry": []
        }
        mappedmCSD.entry = mappedmCSD.entry.concat(mapped.entry)
        return res.status(200).json(mappedmCSD)
      }
      async.each(mapped.entry, (entry,nxtmCSD) => {
        let source1ID = entry.resource.identifier.find((id) => {
          return id.system === 'https://digitalhealth.intrahealth.org/source1'
        })
        if (source1ID) {
          source1ID = source1ID.value.split('/').pop()
        } else {
          source1ID = ''
        }
        matched.push({
          'source 1 name' : entry.resource.alias,
          'source 1 ID' : source1ID,
          'source 2 name' : entry.resource.name,
          'source 2 ID' : entry.resource.id
        })
        return nxtmCSD()
      },() => {
        winston.info('Sending back matched locations in CSV format')
        let csv
        try {
          csv = json2csv(matched, {
            fields
          });
        } catch (err) {
          winston.error(err);
        }
        return res.status(200).send(csv)
      })
    })
  })

  app.get('/getCSV', (req,res) => {
    let locations = []
    let fields = ['ID', 'Facility', 'Chiefdom', 'District', 'Country']
    mcsd.getLocations("Dhis2OnlineDemoServer5c09e731a455b7490508e3c9", (mcsdData) => {
      mcsd.filterLocations(mcsdData, topOrgId, 5, (mcsdLevel) => {
        async.eachSeries(mcsdLevel.entry, (dt, nxt) => {
          let entityParent = dt.resource.partOf.reference
          mcsd.getLocationParentsFromData(entityParent, mcsdData, "names", (parents) => {
            if (parents.length == 4) {
              locations.push({
                "ID": dt.resource.id,
                "Facility": dt.resource.name,
                "Chiefdom": parents[0],
                "District": parents[1],
                "Country": parents[2]
              })
            }
            return nxt()
          })
        }, () => {
          let csvdata = json2csv(locations, {
            fields
          });
          res.send(csvdata)
        })
      })
    })
  })

  app.get('/unmatchedLocations/:source1/:source2/:type/:userID', (req, res) => {
    let source1DB = req.params.source1
    let source2DB = req.params.source2
    let type = req.params.type
    let userID = req.params.userID
    let fields = ["id", "name", "parentString"]
    async.parallel({
      source1mCSD: function (callback) {
        mcsd.getLocations (source1DB, (mcsd) => {
          return callback (null,mcsd)
        })
      },
      source2mCSD: function (callback) {
        mcsd.getLocations(source2DB, (mcsd) => {
          return callback(null, mcsd)
        })
      },
    }, (error,response) => {
      let mappingDB = req.params.source1 + userID + req.params.source2
      async.parallel({
        source1Unmatched: function (callback) {
          scores.getUnmatched(response.source1mCSD, response.source1mCSD, mappingDB, true, (unmatched, mcsdUnmatched) => {
            return callback(null, {
              unmatched,
              mcsdUnmatched
            })
          })
        },
        source2Unmatched: function (callback) {
          scores.getUnmatched(response.source2mCSD, response.source2mCSD, mappingDB, true, (unmatched, mcsdUnmatched) => {
            return callback(null, {
              unmatched,
              mcsdUnmatched
            })
          })
        }
      },(error, response) => {
        if (type === 'FHIR') {
          return res.status(200).json({
            unmatchedSource1mCSD: response.source1Unmatched.mcsdUnmatched,
            unmatchedSource2mCSD: response.source2Unmatched.mcsdUnmatched
          })
        }
        let unmatchedSource1CSV, unmatchedSource2CSV
        try {
          unmatchedSource1CSV = json2csv(response.source1Unmatched.unmatched, {
            fields
          });
        } catch (err) {
          winston.error(err);
        }
        try {
          unmatchedSource2CSV = json2csv(response.source2Unmatched.unmatched, {
            fields
          });
        } catch (err) {
          winston.error(err);
        }
        return res.status(200).send({
          unmatchedSource1CSV,
          unmatchedSource2CSV
        })
      })
    })
  })

  app.get('/getUnmatched/:source1/:source2/:recoLevel/:userID', (req, res) => {
    winston.info(`Getting Source2 Unmatched Orgs for ${req.params.source1}`);
    if (!req.params.source1 || !req.params.source2) {
      winston.error({
        error: 'Missing Source1 or Source2'
      });
      res.set('Access-Control-Allow-Origin', '*');
      res.status(400).json({
        error: 'Missing Source1 or Source2'
      });
      return;
    }
    let userID = req.params.userID
    let source2DB = req.params.source2 + userID
    let mappingDB = req.params.source1 + userID + req.params.source2
    let recoLevel = req.params.recoLevel;
    if (levelMaps[source2DB] && levelMaps[source2D][recoLevel]) {
      recoLevel = levelMaps[orgid][recoLevel];
    }
    mcsd.getLocations(source2DB, (locations) => {
      mcsd.filterLocations(locations, topOrgId, recoLevel, (mcsdLevel) => {
        scores.getUnmatched(locations, mcsdLevel, mappingDB, false, (unmatched) => {
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
        res.status(400).json({
          error: 'Missing Source1 or Source2'
        });
        return;
      }
      let source1Id = fields.source1Id;
      const source2Id = fields.source2Id;
      const recoLevel = fields.recoLevel;
      const totalLevels = fields.totalLevels;
      const userID = fields.userID;
      let source1DB = fields.source1DB + userID
      let source2DB = fields.source2DB + userID
      let mappingDB = fields.source1DB + userID + fields.source2DB
      if (!source1Id || !source2Id) {
        winston.error({
          error: 'Missing either Source1ID or Source2ID or both'
        });
        res.set('Access-Control-Allow-Origin', '*');
        res.status(400).json({
          error: 'Missing either Source1ID or Source2ID or both'
        });
        return;
      }
      mcsd.saveMatch(source1Id, source2Id, source1DB, source2DB, mappingDB, recoLevel, totalLevels, type, (err) => {
        winston.info('Done matching');
        res.set('Access-Control-Allow-Origin', '*');
        if (err) {
          winston.error(err)
          res.status(400).send({
            error: err
          });
        } else {
          res.status(200).send();
        }
      });
    });
  });

  app.post('/acceptFlag/:source1/:source2/:userID', (req, res) => {
    winston.info('Received data for marking flag as a match');
    if (!req.params.source1 || !req.params.source2) {
      winston.error({
        error: 'Missing Source1 or Source2'
      });
      res.set('Access-Control-Allow-Origin', '*');
      res.status(400).json({
        error: 'Missing Source1 or Source2'
      });
      return;
    }
    const userID = req.params.userID;
    let mappingDB = req.params.source1 + userID + req.params.source2
    const form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
      const source2Id = fields.source2Id;
      if (!source2Id) {
        winston.error({
          error: 'Missing Source2ID'
        });
        res.set('Access-Control-Allow-Origin', '*');
        res.status(400).json({
          error: 'Missing Source2ID'
        });
        return;
      }
      mcsd.acceptFlag(source2Id, mappingDB, (err) => {
        winston.info('Done marking flag as a match');
        res.set('Access-Control-Allow-Origin', '*');
        if (err) res.status(400).send({
          error: err
        });
        else res.status(200).send();
      });
    });
  });

  app.post('/noMatch/:source1/:source2/:userID', (req, res) => {
    winston.info('Received data for matching');
    if (!req.params.source1 || !req.params.source2) {
      winston.error({
        error: 'Missing Source1 or Source2'
      });
      res.set('Access-Control-Allow-Origin', '*');
      res.status(400).json({
        error: 'Missing Source1 or Source2'
      });
      return;
    }
    const userID = req.params.userID;
    const source1DB = req.params.source1 + userID;
    const source2DB = req.params.source2 + userID;
    const mappingDB = req.params.source1 + userID + req.params.source2
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
        res.status(400).json({
          error: 'Missing either Source1ID'
        });
        return;
      }
      mcsd.saveNoMatch(source1Id, source1DB, source2DB, mappingDB, recoLevel, totalLevels, (err) => {
        winston.info('Done matching');
        res.set('Access-Control-Allow-Origin', '*');
        if (err) res.status(400).send({
          error: err
        });
        else res.status(200).send();
      });
    });
  });

  app.post('/breakMatch/:source1/:source2/:userID', (req, res) => {
    if (!req.params.source1) {
      winston.error({
        error: 'Missing Source1'
      });
      res.set('Access-Control-Allow-Origin', '*');
      res.status(400).json({
        error: 'Missing Source1'
      });
      return;
    }
    const userID = req.params.userID;
    const source1DB = req.params.source1 + userID;
    const mappingDB = req.params.source1 + userID + req.params.source2
    const form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
      winston.info(`Received break match request for ${fields.source2Id}`);
      const source2Id = fields.source2Id;
      mcsd.breakMatch(source2Id, mappingDB, source1DB, (err, results) => {
        winston.info(`break match done for ${fields.source2Id}`);
        res.set('Access-Control-Allow-Origin', '*');
        res.status(200).send(err);
      });
    });
  });

  app.post('/breakNoMatch/:source1/:source2/:userID', (req, res) => {
    if (!req.params.source1 || !req.params.source2) {
      winston.error({
        error: 'Missing Source1'
      });
      res.set('Access-Control-Allow-Origin', '*');
      res.status(400).json({
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
        res.status(400).json({
          error: 'Missing Source1 ID'
        });
        return
      }
      const userID = req.params.userID;
      const mappingDB = req.params.source1 + userID + req.params.source2
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

  app.get('/recoStatus/:source1/:source2', (req, res) => {
    const mongoUser = config.getConf("DB_USER")
    const mongoPasswd = config.getConf("DB_PASSWORD")
    const mongoHost = config.getConf("DB_HOST")
    const mongoPort = config.getConf("DB_PORT")

    const source1 = req.params.source1
    const source2 = req.params.source2
    const database = source1 + source2
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
          winston.error(err)
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
      mongo.editDataSource(fields, (err, response) => {
        if (err) {
          res.set('Access-Control-Allow-Origin', '*');
          res.status(500).json({
            error: 'Unexpected error occured,please retry',
          });
          winston.error(err)
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

  app.get('/deleteDataSource/:_id/:name/:userID', (req, res) => {
    const id = req.params._id;
    let userID = req.params.userID
    const name = mixin.toTitleCase(req.params.name)
    winston.info('Received request to delete data source with id ' + id)
    mongo.deleteDataSource(id, name, userID, (err, response) => {
      if (err) {
        res.status(500).json({
          error: 'Unexpected error occured while deleting data source,please retry',
        });
        winston.error(err)
      } else {
        res.status(200).json({
          status: 'done',
        });
      }
    });
  });

  app.get('/getDataSources/:userID', (req, res) => {
    winston.info('received request to get data sources');
    mongo.getDataSources(req.params.userID, (err, servers) => {
      if (err) {
        res.set('Access-Control-Allow-Origin', '*');
        res.status(500).json({
          error: 'Unexpected error occured,please retry',
        });
        winston.error(err)
      } else {
        async.eachOfSeries(servers, (server, key, nxtServer) => {
          if (server.sourceType === 'FHIR') {
            let database = mixin.toTitleCase(server.name) + req.params.userID
            fhir.getLastUpdate(database, (lastUpdate) => {
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
            let database = mixin.toTitleCase(server.name) + req.params.userID
            dhis.getLastUpdate(database, dhis2URL, auth, (lastUpdate) => {
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

  app.get('/getDataPairs/:userID', (req, res) => {
    winston.info('received request to get data sources');
    mongo.getDataPairs(req.params.userID, (err, pairs) => {
      if (err) {
        res.status(500).json({
          error: 'Unexpected error occured,please retry',
        });
        winston.error(err)
      } else {
        res.status(200).json(pairs)
      }
    })
  })

  app.post('/addDataSourcePair', (req, res) => {
    winston.info('Received a request to save data source pairs')
    const form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
      mongo.addDataSourcePair(fields, (error, results) => {
        if (error) {
          winston.error(error)
          res.status(400).json({
            error: 'Unexpected error occured while saving'
          })
        } else {
          winston.info('Data source pair saved successfully')
          res.status(200).send()
        }
      })
    })
  })

  app.post('/activateSharedPair', (req, res) => {
    winston.info('Received a request to activate shared data source pair')
    const form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
      mongo.activateSharedPair(fields.pairID, fields.userID, (error, results) => {
        if (error) {
          winston.error(error)
          res.status(400).json({
            error: 'Unexpected error occured while activating shared data source pair'
          })
        } else {
          winston.info('Shared data source pair activated successfully')
          res.status(200).send()
        }
      })
    })
  })

  app.get('/resetDataSourcePair/:userID', (req,res) => {
    winston.info('Received a request to reset data source pair')
    mongo.resetDataSourcePair(req.params.userID, (error, response) => {
      if (error) {
        winston.error(error)
        res.status(400).json({
          error: 'Unexpected error occured while saving'
        })
      } else {
        winston.info('Data source pair reseted successfully')
        res.status(200).send()
      }
    })
  })

  app.get('/getDataSourcePair/:userID', (req, res) => {
    mongo.getDataSourcePair(req.params.userID, (err, sources) => {
      if (err) {
        winston.error(err)
        res.status(400).json({
          error: 'Unexpected error occured while saving'
        })
      } else {
        winston.info("Returning list of data source pairs")
        res.status(200).json(sources)
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
        res.status(400).json({
          error: 'Missing CSV Name'
        });
        return;
      }
      const database = mixin.toTitleCase(fields.csvName) + fields.userID;
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
        res.status(400).json({
          error: 'Un expected error occured while processing this request'
        });
        res.end();
        return;
      }
      if (Object.keys(files).length == 0) {
        winston.error('No file submitted for reconciliation');
        res.status(400).json({
          error: 'Please submit CSV file for facility reconciliation'
        });
        res.end();
        return;
      }
      const fileName = Object.keys(files)[0];
      winston.info('validating CSV File');
      uploadReqPro = JSON.stringify({
        status: '2/3 Validating CSV Data',
        error: null,
        percent: null
      })
      redisClient.set(uploadRequestId, uploadReqPro)
      validateCSV(files[fileName].path, fields, (valid, invalid) => {
        if (invalid.length > 0) {
          winston.error("Uploaded CSV is invalid (has either duplicated IDs or empty levels/facility),execution stopped");
          res.set('Access-Control-Allow-Origin', '*');
          res.status(400).json({
            error: invalid
          });
          res.end();
          return;
        } else {
          res.set('Access-Control-Allow-Origin', '*');
          res.status(200).end();
        }
        winston.info('CSV File Passed Validation');
        winston.info(`Uploading data for ${database} now`)
        let uploadReqPro = JSON.stringify({
          status: '3/3 Uploading of DB started',
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

  app.get('/gofr', function (req, res) {
    res.sendFile(path.join(__dirname + '/../gui/index.html'));
  });
  app.get('/static/js/:file', function (req, res) {
    res.sendFile(path.join(__dirname + '/../gui/static/js/' + req.params.file));
  });
  app.get('/static/css/:file', function (req, res) {
    res.sendFile(path.join(__dirname + '/../gui/static/css/' + req.params.file));
  });

  server.listen(config.getConf('server:port'));
  winston.info(`Server is running and listening on port ${config.getConf('server:port')}`);
}
