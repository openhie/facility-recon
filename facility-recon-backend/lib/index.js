
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
const redis = require('redis')
const request = require('request');
const URI = require('urijs');
const isJSON = require('is-json')
const async = require('async')
const mongoose = require('mongoose')
const redisClient = redis.createClient()
const config = require('./config');
const mcsd = require('./mcsd')();
const scores = require('./scores')();

const app = express();
var server = require('http').createServer(app);

app.use(bodyParser.urlencoded({ extended: true }));
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

if(cluster.isMaster) {
    var numWorkers = require('os').cpus().length;
    console.log('Master cluster setting up ' + numWorkers + ' workers...');

    for(var i = 0; i < numWorkers; i++) {
        cluster.fork();
    }

    cluster.on('online', function(worker) {
        console.log('Worker ' + worker.process.pid + ' is online');
    });

    cluster.on('exit', function(worker, code, signal) {
        console.log('Worker ' + worker.process.pid + ' died with code: ' + code + ', and signal: ' + signal);
        console.log('Starting a new worker');
        cluster.fork();
    });
} else {
app.get('/countLevels/:orgid', (req, res) => {
  if (!req.params.orgid) {
    winston.error({ error: 'Missing Orgid' });
    res.set('Access-Control-Allow-Origin', '*');
    res.status(401).json({ error: 'Missing Orgid' });
  } else {
    const orgid = req.params.orgid;
    winston.info(`Getting total levels for ${orgid}`);
    mcsd.countLevels('DATIM', orgid, (err, totalLevels) => {
      res.set('Access-Control-Allow-Origin', '*');
      if (err) {
        winston.error(err);
        res.status(401).json({ error: 'Missing Orgid' });
      } else {
        const recoLevel = 2;
        winston.info(`Received total levels of ${totalLevels} for ${orgid}`);
        res.status(200).json({ totalLevels, recoLevel });
      }
    });
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
    mcsd.getLocations (orgid, (mohData)=>{
      if (mohData.hasOwnProperty('entry') && mohData.entry.length > 0) {
        res.set('Access-Control-Allow-Origin', '*');
        res.status(200).json({
          dataUploaded: true
        });
      }
      else {
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
    winston.error({ error: 'Missing Orgid' });
    res.set('Access-Control-Allow-Origin', '*');
    res.status(401).json({ error: 'Missing Orgid' });
  } else {
    const orgid = req.params.orgid;
    winston.info(`Getting archived DB for ${orgid}`);
    mcsd.getArchives(orgid,(err,archives)=>{
      res.set('Access-Control-Allow-Origin', '*');
      if(err) {
        winston.error({ error: 'Unexpected error has occured' });
        res.status(400).json({ error: 'Unexpected error'});
        return
      }
      res.status(200).json(archives)
    })
  }
});

app.post('/restoreArchive/:orgid', (req,res) => {
  if (!req.params.orgid) {
    winston.error({ error: 'Missing Orgid' });
    res.set('Access-Control-Allow-Origin', '*');
    res.status(401).json({ error: 'Missing Orgid' });
  } else {
    const orgid = req.params.orgid;
    winston.info(`Restoring archive DB for ${orgid}`);
    const form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
      mcsd.restoreDB(fields.archive,orgid,(err) => {
        res.set('Access-Control-Allow-Origin', '*');
        if(err) {
          winston.error(err)
          res.status(401).json({ error: 'Unexpected error occured while restoring the database,please retry' });
        }
        res.status(200).send();
      })
    })
  }
});

app.get('/hierarchy/:source', (req, res) => {
  if (!req.query.OrgId || !req.query.OrgName || !req.params.source) {
    winston.error({ error: 'Missing Orgid or source' });
    res.set('Access-Control-Allow-Origin', '*');
    res.status(401).json({ error: 'Missing Orgid or source' });
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
      var locationReceived = new Promise((resolve,reject)=>{
        mcsd.getLocations(database,(mcsdData)=>{
          winston.info(`Done Fetching ${source} Locations`);
          resolve(mcsdData)
        })
      })
    } else if (source == 'DATIM') {
      var id = orgid;
      var database = config.getConf('mCSD:database');
      var locationReceived = new Promise((resolve,reject)=>{
        mcsd.getLocationChildren(database, id, (mcsdData) => {
          winston.info(`Done Fetching ${source} Locations`);
          resolve(mcsdData)
        })
      })
    }

    locationReceived.then((mcsdData)=>{
      winston.info(`Creating ${source} Tree`);
      mcsd.createTree(mcsdData, source, database, orgid, (tree) => {
        winston.info(`Done Creating ${source} Tree`);
        res.set('Access-Control-Allow-Origin', '*');
        res.status(200).json(tree);
      });
    }).catch((err)=>{
      winston.error(err)
    })
  }
});

app.get('/mappingStatus/:orgid/:level/:clientId', (req,res)=>{
  winston.info('Getting mapping status');
  const orgid = req.params.orgid;
  const mohDB = orgid;
  const datimTopId = orgid;
  const datimDB = config.getConf('mCSD:database');
  const recoLevel = req.params.level;
  const namespace = config.getConf('UUID:namespace');
  const mohTopId = uuid5(orgid, `${namespace}000`);
  const clientId = req.params.clientId;

  let statusRequestId = `mappingStatus${datimTopId}${clientId}`
  statusResData = JSON.stringify({status: '1/2 - Loading DATIM and MOH Data', error: null, percent: null})
  redisClient.set(statusRequestId,statusResData)

  const datimLocationReceived = new Promise((resolve, reject) => {
    mcsd.getLocationChildren(datimDB, datimTopId, (mcsdDATIM) => {
      mcsdDatimAll = mcsdDATIM;
      mcsd.filterLocations(mcsdDATIM, datimTopId, 0, recoLevel, 0, (mcsdDatimTotalLevels, mcsdDatimLevel, mcsdDatimBuildings) => {
        resolve(mcsdDatimLevel);
      });
    });
  });
  const mohLocationReceived = new Promise((resolve, reject) => {
    mcsd.getLocations(mohDB, (mcsdMOH) => {
      mcsd.filterLocations(mcsdMOH, mohTopId, 0, recoLevel, 0, (mcsdMohTotalLevels, mcsdMohLevel, mcsdMohBuildings) => {
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
    scores.getMappingStatus(mohLocations,datimLocations,mappedLocations,datimTopId,clientId,(mappingStatus)=>{
      res.set('Access-Control-Allow-Origin', '*');
      res.status(200).json(mappingStatus)
    })
  })
})

app.get('/reconcile/:orgid/:totalLevels/:recoLevel/:clientId', (req, res) => {
  if (!req.params.orgid || !req.params.recoLevel) {
    winston.error({ error: 'Missing Orgid or reconciliation Level' });
    res.set('Access-Control-Allow-Origin', '*');
    res.status(401).json({ error: 'Missing Orgid or reconciliation Level' });
  } else {
    winston.info('Getting scores');
    const orgid = req.params.orgid;
    const recoLevel = req.params.recoLevel;
    const totalLevels = req.params.totalLevels;
    const clientId = req.params.clientId;
    const datimDB = config.getConf('mCSD:database');
    const mohDB = orgid;
    const namespace = config.getConf('UUID:namespace');
    const mohTopId = uuid5(orgid, `${namespace}000`);
    const datimTopId = orgid;
    let mcsdDatimAll = null;
    let mcsdMohAll = null;

    let scoreRequestId = `scoreResults${datimTopId}${clientId}`
    scoreResData = JSON.stringify({status: '1/3 - Loading DATIM and MOH Data', error: null, percent: null})
    redisClient.set(scoreRequestId,scoreResData)
    const datimLocationReceived = new Promise((resolve, reject) => {
      mcsd.getLocationChildren(datimDB, datimTopId, (mcsdDATIM) => {
        mcsdDatimAll = mcsdDATIM;
        mcsd.filterLocations(mcsdDATIM, datimTopId, 0, recoLevel, 0, (mcsdDatimTotalLevels, mcsdDatimLevel, mcsdDatimBuildings) => {
          resolve(mcsdDatimLevel);
        });
      });
    });

    const mohLocationReceived = new Promise((resolve, reject) => {
      mcsd.getLocations(mohDB, (mcsdMOH) => {
        mcsdMohAll = mcsdMOH;
        mcsd.filterLocations(mcsdMOH, mohTopId, 0, recoLevel, 0, (mcsdMohTotalLevels, mcsdMohLevel, mcsdMohBuildings) => {
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
      if (recoLevel == totalLevels) {
        scores.getBuildingsScores(locations[1], locations[0], locations[2], mcsdDatimAll, mcsdMohAll, mohDB, datimDB, mohTopId, datimTopId, recoLevel, totalLevels, clientId, (scoreResults) => {
          res.set('Access-Control-Allow-Origin', '*');
          recoStatus (orgid,(totalAllMapped,totalAllNoMatch,totalAllFlagged)=>{
            var mohTotalAllNotMapped = (mcsdMohAll.entry.length - 1) - totalAllMapped
            res.status(200).json({ scoreResults, 
                                  recoLevel, 
                                  datimTotalRecords: locations[0].entry.length,
                                  datimTotalAllRecords: mcsdDatimAll.entry.length,
                                  totalAllMapped: totalAllMapped,
                                  totalAllFlagged: totalAllFlagged,
                                  totalAllNoMatch: totalAllNoMatch,
                                  mohTotalAllNotMapped: mohTotalAllNotMapped,
                                  mohTotalAllRecords: mcsdMohAll.entry.length-1
                                });
            winston.info('Score results sent back');
          })
        });
      } else {
        scores.getJurisdictionScore(locations[1], locations[0], locations[2], mcsdDatimAll, mcsdMohAll,mohDB, datimDB, mohTopId, datimTopId, recoLevel, totalLevels, clientId, (scoreResults) => {
          res.set('Access-Control-Allow-Origin', '*');
          recoStatus (orgid,(totalAllMapped,totalAllNoMatch,totalAllFlagged)=>{
            var mohTotalAllNotMapped = (mcsdMohAll.entry.length - 1) - totalAllMapped
            res.status(200).json({ scoreResults, 
                                  recoLevel, 
                                  datimTotalRecords: locations[0].entry.length,
                                  datimTotalAllRecords: mcsdDatimAll.entry.length,
                                  totalAllMapped: totalAllMapped,
                                  totalAllFlagged: totalAllFlagged,
                                  totalAllNoMatch: totalAllNoMatch,
                                  mohTotalAllNotMapped: mohTotalAllNotMapped,
                                  mohTotalAllRecords: mcsdMohAll.entry.length-1
                                });
            winston.info('Score results sent back');
          })
        });
      }
    }).catch((err)=>{
      winston.error(err)
    });
  }

  function recoStatus (orgid,callback) {
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
    setTimeout(()=>{
    mcsd.getLocations(database, (body) => {
      if (!body.hasOwnProperty('entry') || body.length === 0) {
        totalAllNoMatch = 0
        totalAllMapped = 0
        return callback (totalAllMapped,mohTotalAllNotMapped,totalAllNoMatch,totalAllFlagged)
      }
      async.each(body.entry,(entry,nxtEntry)=>{
        if (entry.resource.hasOwnProperty('tag')) {
          var nomatch = entry.resource.tag.find((tag)=>{
            return tag.code === noMatchCode
          })
          var flagged = entry.resource.tag.find((tag)=>{
            return tag.code === flagCode
          })
          if (nomatch) {
            totalAllNoMatch++
          }
          if (flagged) {
            totalAllFlagged++
          }
          return nxtEntry ()
        }
        else {
          return nxtEntry()
        }
      },()=>{
        totalAllMapped = body.entry.length - totalAllNoMatch - totalAllFlagged
        return callback (totalAllMapped,totalAllNoMatch,totalAllFlagged)
        //res.set('Access-Control-Allow-Origin', '*');
        //res.status(200).json({totalAllMapped,totalAllNoMatch,totalAllFlagged})
      })
    })
  },1000)
  }

});

app.get('/getUnmatched/:orgid/:source/:recoLevel', (req, res) => {
  winston.info(`Getting DATIM Unmatched Orgs for ${req.params.orgid}`);
  if (!req.params.orgid || !req.params.source) {
    winston.error({ error: 'Missing Orgid or Source' });
    res.set('Access-Control-Allow-Origin', '*');
    res.status(401).json({ error: 'Missing Orgid or Source' });
    return;
  }
  const orgid = req.params.orgid;
  const source = req.params.source.toUpperCase();
  const recoLevel = req.params.recoLevel;
  const datimDB = config.getConf('mCSD:database');
  mcsd.getLocationChildren(datimDB, orgid, (locations) => {
    mcsd.filterLocations(locations, orgid, 0, recoLevel, 0, (mcsdLevels, mcsdLevel, mcsdBuildings) => {
      scores.getUnmatched(locations,mcsdLevel, orgid, (unmatched) => {
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
    winston.error({ error: 'Missing Orgid' });
    res.set('Access-Control-Allow-Origin', '*');
    res.status(401).json({ error: 'Missing Orgid' });
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
      winston.error({ error: 'Missing either MOHID or DATIMID or both' });
      res.set('Access-Control-Allow-Origin', '*');
      res.status(401).json({ error: 'Missing either MOHID or DATIMID or both' });
      return;
    }
    if (recoLevel == totalLevels) {
      const namespace = config.getConf('UUID:namespace');
      mohId = uuid5(mohId, `${namespace}100`);
    }
    mcsd.saveMatch(mohId, datimId, orgid, recoLevel, totalLevels, type, (err) => {
      winston.info('Done matching');
      res.set('Access-Control-Allow-Origin', '*');
      if (err) res.status(401).send({ error: err });
      else res.status(200).send();
    });
  });
});

app.post('/acceptFlag/:orgid', (req, res) => {
  winston.info('Received data for marking flag as a match');
  if (!req.params.orgid) {
    winston.error({ error: 'Missing Orgid' });
    res.set('Access-Control-Allow-Origin', '*');
    res.status(401).json({ error: 'Missing Orgid' });
    return;
  }
  const orgid = req.params.orgid;
  const form = new formidable.IncomingForm();
  form.parse(req, (err, fields, files) => {
    const datimId = fields.datimId;
    const recoLevel = fields.recoLevel;
    const totalLevels = fields.totalLevels;
    if (!datimId) {
      winston.error({ error: 'Missing DATIMID' });
      res.set('Access-Control-Allow-Origin', '*');
      res.status(401).json({ error: 'Missing DATIMID' });
      return;
    }
    if (recoLevel == totalLevels) {
      const namespace = config.getConf('UUID:namespace');
      mohId = uuid5(orgid, `${namespace}100`);
    }
    mcsd.acceptFlag(datimId, orgid, (err) => {
      winston.info('Done marking flag as a match');
      res.set('Access-Control-Allow-Origin', '*');
      if (err) res.status(401).send({ error: err });
      else res.status(200).send();
    });
  });
});

app.post('/noMatch/:orgid', (req, res) => {
  winston.info('Received data for matching');
  if (!req.params.orgid) {
    winston.error({ error: 'Missing Orgid' });
    res.set('Access-Control-Allow-Origin', '*');
    res.status(401).json({ error: 'Missing Orgid' });
    return;
  }
  const orgid = req.params.orgid;
  const form = new formidable.IncomingForm();
  form.parse(req, (err, fields, files) => {
    let mohId = fields.mohId;
    const recoLevel = fields.recoLevel;
    const totalLevels = fields.totalLevels;
    if (!mohId) {
      winston.error({ error: 'Missing either MOHID' });
      res.set('Access-Control-Allow-Origin', '*');
      res.status(401).json({ error: 'Missing either MOHID' });
      return;
    }
    if (recoLevel == totalLevels) {
      const namespace = config.getConf('UUID:namespace');
      mohId = uuid5(mohId, `${namespace}100`);
    }
    mcsd.saveNoMatch(mohId, orgid, recoLevel, totalLevels, (err) => {
      winston.info('Done matching');
      res.set('Access-Control-Allow-Origin', '*');
      if (err) res.status(401).send({ error: err });
      else res.status(200).send();
    });
  });
});

app.post('/breakMatch/:orgid', (req, res) => {
  if (!req.params.orgid) {
    winston.error({ error: 'Missing Orgid' });
    res.set('Access-Control-Allow-Origin', '*');
    res.status(401).json({ error: 'Missing Orgid' });
    return;
  }
  const form = new formidable.IncomingForm();
  form.parse(req, (err, fields, files) => {
    winston.info(`Received break match request for ${fields.datimId}`);
    const datimId = fields.datimId;
    const database = config.getConf('mapping:dbPrefix') + req.params.orgid;
    mcsd.breakMatch(datimId, database, req.params.orgid, (err,results) => {
      winston.info(`break match done for ${fields.datimId}`);
      res.set('Access-Control-Allow-Origin', '*');
      res.status(200).send(err);
    });
  });
});

app.post('/breakNoMatch/:orgid', (req, res) => {
  if (!req.params.orgid) {
    winston.error({ error: 'Missing Orgid' });
    res.set('Access-Control-Allow-Origin', '*');
    res.status(401).json({ error: 'Missing Orgid' });
    return;
  }
  const form = new formidable.IncomingForm();
  form.parse(req, (err, fields, files) => {
    winston.info(`Received break no match request for ${fields.mohId}`);
    var mohId = fields.mohId;
    if (!mohId) {
    	winston.error({'error': 'Missing MOH ID'})
    	res.set('Access-Control-Allow-Origin', '*');
    	res.status(401).json({ error: 'Missing MOH ID' });
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

app.get('/markRecoUnDone/:orgid',(req,res)=>{
  winston.info (`received a request to mark reconciliation for ${req.params.orgid} as undone`)
  const mongoUser = config.getConf('mCSD:databaseUser')
  const mongoPasswd = config.getConf('mCSD:databasePassword')
  const mongoHost = config.getConf('mCSD:databaseHost')
  const mongoPort = config.getConf('mCSD:databasePort')
  const orgid = req.params.orgid
  const database = config.getConf('mapping:dbPrefix') + orgid
  if(mongoUser && mongoPasswd) {
    var uri = `mongodb://${mongoUser}:${mongoPasswd}@${mongoHost}:${mongoPort}/${database}`
  }
  else {
   var uri = `mongodb://${mongoHost}:${mongoPort}/${database}`
  }
  mongoose.connect(uri)
  const Schema = mongoose.Schema
  let ReconciliationStatusModel
  try {
    ReconciliationStatusModel = mongoose.model('ReconciliationStatus')
  } catch(e) {
    mongoose.model('ReconciliationStatus', new Schema({
      status: { type: Object }
    }))
    ReconciliationStatusModel = mongoose.model('ReconciliationStatus')
  }
  
  const recoStatusCode = config.getConf('mapping:recoStatusCode');
  const query = {status: {code: recoStatusCode,text: 'Done'}}
  const update = {status: {code: recoStatusCode,text: 'on-progress'}}
  ReconciliationStatusModel.findOneAndUpdate(query,update,(err,data)=>{
    res.set('Access-Control-Allow-Origin', '*');
    if(err) {
      res.status(500).json({error: 'An error occured while processing request'});
    }
    else {
      res.status(200).json({status: 'on-progresss'});
    }
  })
})

app.get('/markRecoDone/:orgid',(req,res)=>{
  winston.info (`received a request to mark reconciliation for ${req.params.orgid} as done`)
  const mongoUser = config.getConf('mCSD:databaseUser')
  const mongoPasswd = config.getConf('mCSD:databasePassword')
  const mongoHost = config.getConf('mCSD:databaseHost')
  const mongoPort = config.getConf('mCSD:databasePort')
  const orgid = req.params.orgid
  const database = config.getConf('mapping:dbPrefix') + orgid
  if(mongoUser && mongoPasswd) {
    var uri = `mongodb://${mongoUser}:${mongoPasswd}@${mongoHost}:${mongoPort}/${database}`
  }
  else {
   var uri = `mongodb://${mongoHost}:${mongoPort}/${database}`
  }
  mongoose.connect(uri)
  const Schema = mongoose.Schema
  let ReconciliationStatusModel
  try {
    ReconciliationStatusModel = mongoose.model('ReconciliationStatus')
  } catch(e) {
    mongoose.model('ReconciliationStatus', new Schema({
      status: { type: Object }
    }))
    ReconciliationStatusModel = mongoose.model('ReconciliationStatus')
  }
  
  const recoStatusCode = config.getConf('mapping:recoStatusCode');

  ReconciliationStatusModel.findOne({status: {code: recoStatusCode,text: 'on-progress'}},(err,data)=>{
    if (err) {
      winston.error('Unexpected error occured,please retry')
      res.status(500).json({error: 'Unexpected error occured,please retry'});
      return
    }
    if (!data) {
      var recoStatus = new ReconciliationStatusModel({
        status: {code: recoStatusCode, text: 'Done'}
      })
      recoStatus.save(function(err,data){
        if (err) {
          winston.error('Unexpected error occured,please retry')
          res.set('Access-Control-Allow-Origin', '*');
          res.status(500).json({error: 'Unexpected error occured,please retry'});
        }
        winston.info(`${orgid} marked as done with reconciliation`)
        res.set('Access-Control-Allow-Origin', '*');
        res.status(200).json({status: 'done'});
      })
    }
    else {
      ReconciliationStatusModel.findByIdAndUpdate(data.id,{status: {code: recoStatusCode, text: 'Done'}},(err,data)=>{
        if(err) {
          winston.error('Unexpected error occured,please retry')
          res.set('Access-Control-Allow-Origin', '*');
          res.status(500).json({error: 'Unexpected error occured,please retry'});
          return
        }
        winston.info(`${orgid} already marked as done with reconciliation`)
        res.set('Access-Control-Allow-Origin', '*');
        res.status(200).json({status: 'done'});
      })
    }
  })
})

app.get('/recoStatus/:orgid',(req,res)=>{
  const mongoUser = config.getConf('mCSD:databaseUser')
  const mongoPasswd = config.getConf('mCSD:databasePassword')
  const mongoHost = config.getConf('mCSD:databaseHost')
  const mongoPort = config.getConf('mCSD:databasePort')
  const orgid = req.params.orgid
  const database = config.getConf('mapping:dbPrefix') + orgid
  if(mongoUser && mongoPasswd) {
    var uri = `mongodb://${mongoUser}:${mongoPasswd}@${mongoHost}:${mongoPort}/${database}`
  }
  else {
   var uri = `mongodb://${mongoHost}:${mongoPort}/${database}`
  }
  mongoose.connect(uri)
  const Schema = mongoose.Schema
  
  const recoStatusCode = config.getConf('mapping:recoStatusCode');
  let ReconciliationStatusModel
  try {
    ReconciliationStatusModel = mongoose.model('ReconciliationStatus')
  } catch(e) {
    mongoose.model('ReconciliationStatus', new Schema({
      status: { type: Object }
    }))
    ReconciliationStatusModel = mongoose.model('ReconciliationStatus')
  }

  res.set('Access-Control-Allow-Origin', '*');
  ReconciliationStatusModel.findOne({status: {code: recoStatusCode,text: 'Done'}},(err,data)=>{
    if (err) {
      res.status(500).json({error: 'Unexpected error occured,please retry'});
      return
    }
    if (data) {
      res.status(200).json({status: 'done'});
    }
    else {
      res.status(200).json({status: 'on-progress'});
    }
  })

})

app.get('/uploadProgress/:orgid/:clientId', (req,res)=>{
  const orgid = req.params.orgid
  const clientId = req.params.clientId
  redisClient.get(`uploadProgress${orgid}${clientId}`,(error,results)=>{
    results = JSON.parse(results)
    //reset progress
    if (results && (results.error !== null || results.status === 'Done')) {
      var uploadRequestId = `uploadProgress${orgid}${clientId}`
      let uploadReqPro = JSON.stringify({status:null, error: null, percent: null})
      redisClient.set(uploadRequestId,uploadReqPro)
    }
    res.set('Access-Control-Allow-Origin', '*');
    res.status(200).json(results)
  })
});

app.get('/mappingStatusProgress/:orgid/:clientId', (req,res)=>{
  const orgid = req.params.orgid
  const clientId = req.params.clientId
  redisClient.get(`mappingStatus${orgid}${clientId}`,(error,results)=>{
    results = JSON.parse(results)
    //reset progress
    if (results && (results.error !== null || results.status === 'Done')) {
      var statusRequestId = `mappingStatus${orgid}${clientId}`
      let statusResData = JSON.stringify({status:null, error: null, percent: null})
      redisClient.set(statusRequestId,statusResData)
    }
    res.set('Access-Control-Allow-Origin', '*');
    res.status(200).json(results)
  })
});

app.get('/scoreProgress/:orgid/:clientId', (req,res)=>{
  const orgid = req.params.orgid
  const clientId = req.params.clientId
  redisClient.get(`scoreResults${orgid}${clientId}`,(error,results)=>{
    results = JSON.parse(results)
    //reset progress
    if (results && (results.error !== null || results.status === 'Done')) {
      const scoreRequestId = `scoreResults${orgid}${clientId}`
      let uploadReqPro = JSON.stringify({status:null, error: null, percent: null})
      redisClient.set(scoreRequestId,uploadReqPro)
    }
    res.set('Access-Control-Allow-Origin', '*');
    res.status(200).json(results)
  })
});

app.post('/uploadCSV', (req, res) => {
  const form = new formidable.IncomingForm();
  form.parse(req, (err, fields, files) => {
    winston.info(`Received MOH Data with fields Mapping ${JSON.stringify(fields)}`);
    if (!fields.orgid) {
      winston.error({ error: 'Missing Orgid' });
      res.set('Access-Control-Allow-Origin', '*');
      res.status(401).json({ error: 'Missing Orgid' });
      return;
    }
    const orgid = fields.orgid;
    const orgname = fields.orgname;
    const database = config.getConf('mCSD:database');
    const expectedLevels = config.getConf('levels');
    const clientId = fields.clientId
    var uploadRequestId = `uploadProgress${orgid}${clientId}`
    let uploadReqPro = JSON.stringify({status:'Request received by server', error: null, percent: null})
    redisClient.set(uploadRequestId,uploadReqPro)
    if (!Array.isArray(expectedLevels)) {
      winston.error('Invalid config data for key Levels ');
      res.set('Access-Control-Allow-Origin', '*');
      res.status(401).json({ error: 'Un expected error occured while processing this request' });
      res.end();
      return;
    }
    if (Object.keys(files).length == 0) {
      winston.error('No file submitted for reconciliation');
      res.status(401).json({ error: 'Please submit CSV file for facility reconciliation' });
      res.end();
      return;
    }
    const fileName = Object.keys(files)[0];
    winston.info('validating CSV File');
    validateCSV(fields, (valid, missing) => {
      if (!valid) {
        winston.error({ MissingHeaders: missing });
        res.set('Access-Control-Allow-Origin', '*');
        res.status(401).json({ error: 'Some Headers are Missing' });
        res.end();
        return;
      }
      else {
        res.set('Access-Control-Allow-Origin', '*');
        res.status(200).end();
      }
      winston.info('CSV File Passed Validation');
      //archive existing DB first
      let uploadReqPro = JSON.stringify({status:'2/4 Archiving Old DB', error: null, percent: null})
      redisClient.set(uploadRequestId,uploadReqPro)
      mcsd.archiveDB(orgid,(err)=>{
        if(err) {
          let uploadReqPro = JSON.stringify({status:'1/3 Archiving Old DB',error: 'An error occured while archiving Database,retry', percent: null})
          redisClient.set(uploadRequestId,uploadReqPro)
          winston.error('An error occured while Archiving existing DB,Upload of new dataset was stopped')
          return
        }
        //ensure old archives are deleted
        let uploadReqPro = JSON.stringify({status:'3/4 Deleting Old DB', error: null, percent: null})
        redisClient.set(uploadRequestId,uploadReqPro)
        mcsd.cleanArchives(orgid,()=>{})
        //delete existing db
        mcsd.deleteDB(orgid,(err)=>{
          if(!err){
            winston.info(`Uploading data for ${orgid} now`)
            let uploadReqPro = JSON.stringify({status:'4/4 Uploading of DB started', error: null, percent: null})
            redisClient.set(uploadRequestId,uploadReqPro)
            mcsd.CSVTomCSD(files[fileName].path, fields, orgid, clientId, () => {
              winston.info(`Data upload for ${orgid} is done`)
              let uploadReqPro = JSON.stringify({status:'Done', error: null, percent: 100})
              redisClient.set(uploadRequestId,uploadReqPro)
            });
          }
          else {
            winston.error('An error occured while dropping existing DB,Upload of new dataset was stopped')
            let uploadReqPro = JSON.stringify({status:'3/4 Deleting Old DB',error: 'An error occured while dropping existing Database,retry', percent: null})
            redisClient.set(uploadRequestId,uploadReqPro)
          }
        })
      })
    });
  });

  function validateCSV(cols, callback) {
    const missing = [];
    if (!cols.hasOwnProperty('facility') || cols.facility === null || cols.facility === undefined || cols.facility === false) {
      missing.push('facility');
    }
    if (!cols.hasOwnProperty('code') || cols.code === null || cols.code === undefined || cols.code === false) {
      missing.push('code');
    }
    if (!cols.hasOwnProperty('lat') || cols.lat === null || cols.lat === undefined || cols.lat === false) {
      missing.push('lat');
    }
    if (!cols.hasOwnProperty('long') || cols.long === null || cols.long === undefined || cols.long === false) {
      missing.push('long');
    }
    if (!cols.hasOwnProperty('level1') || cols.level1 === null || cols.level1 === undefined || cols.facility === false) {
      missing.push('level1');
    }
    if (!cols.hasOwnProperty('level2') || cols.level2 === null || cols.level2 === undefined || cols.level2 === false) {
      missing.push('level2');
    }
    if (!cols.hasOwnProperty('level3') || cols.level3 === null || cols.level3 === undefined || cols.level3 === false) {
      missing.push('level3');
    }
    if (!cols.hasOwnProperty('level4') || cols.level4 === null || cols.level4 === undefined || cols.level4 === false) {
      missing.push('level4');
    }
    if (missing.length > 0) {
      return callback(false, missing);
    } return callback(true, missing);
  }
});

server.listen(config.getConf('server:port'));
winston.info(`Server is running and listening on port ${config.getConf('server:port')}`);
}