'use strict'
require('./init')

const express = require('express')
const bodyParser = require('body-parser')
const oauthserver = require('node-oauth2-server')
const csv = require('fast-csv')

const formidable = require('express-formidable')
const winston = require('winston')
const config = require('./config')
const mcsd = require('./mcsd')()
const scores = require('./scores')()
const oAuthModel = require('./oauth/model')()

const app = express(); 
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(formidable())

// socket config - large documents can cause machine to max files open
const https = require('https')
const http = require('http')
https.globalAgent.maxSockets = 16
http.globalAgent.maxSockets = 16

app.oauth = oauthserver({
  model: oAuthModel,
  grants: ['password'],
  accessTokenLifetime:config.getConf('oauth:accessTokenLifetime'),
  debug: config.getConf('oauth:debug')
});
 
//get access token
app.all('/oauth/token', app.oauth.grant());

//register user
app.post('/oauth/registerUser',  function (req, res) {
	oAuthModel.saveUsers(req.body.firstname,req.body.lastname,req.body.username,req.body.password,req.body.email,(err)=>{
		if(err) {
			res.status(401).send(err)
		}
		else {
			res.send('User Created');
		}
	})
})

app.get('/countLevels/:orgid',(req,res)=>{
	if(!req.params.orgid){
		winston.error({"error":"Missing Orgid"})
		res.set('Access-Control-Allow-Origin','*')
		res.status(401).json({"error":"Missing Orgid"})
	}
	else {
		var orgid = req.params.orgid
		mcsd.countLevels('DATIM',orgid,(err,totalLevels)=>{
			res.set('Access-Control-Allow-Origin','*')
			if(err){
				winston.error(err)
				res.status(401).json({"error":"Missing Orgid"})
			}
			else{
				res.status(200).json({totalLevels:totalLevels})
			}
		})
	}
})

app.get('/hierarchy/:source/:orgid',(req,res)=>{
	if(!req.params.orgid || !req.params.source){
		winston.error({"error":"Missing Orgid or source"})
		res.set('Access-Control-Allow-Origin','*')
		res.status(401).json({"error":"Missing Orgid or source"})
	}
	else {
		var orgid = req.params.orgid
		var source = req.params.source.toUpperCase()
		if(source == "DATIM")
			var database = config.getConf("mCSD:database")
		else if(source == "MOH")
			var database = orgid

		winston.info(`Fetching ${source} Locations For ${orgid}`)
		mcsd.getLocations(source,orgid,5,1,(mcsdData)=>{
			winston.info(`Done Fetching ${source} Locations`)
			winston.info(`Creating ${source} Tree`)
			mcsd.createTree(mcsdData,source,database,orgid,(tree)=>{
				winston.info(`Done Creating ${source} Tree`)
				res.set('Access-Control-Allow-Origin','*')
				res.status(200).json(tree)
			})
		})
	}
})
app.post('/reconcile/:orgid', (req,res)=>{
	if(!req.params.orgid || !req.params.source){
		winston.error({"error":"Missing Orgid or source"})
		res.set('Access-Control-Allow-Origin','*')
		res.status(401).json({"error":"Missing Orgid or source"})
	}
	else {
		var orgid = req.params.orgid
		var source = req.params.source.toUpperCase()
		if(source == "DATIM")
			var database = config.getConf("mCSD:database")
		else if(source == "MOH")
			var database = orgid
		winston.info("Getting DATIM Locations for this orgid")
		mcsd.getLocations("DATIM",orgid,totalLevels,(mcsdDATIM)=>{
			mcsd.getLocations("MOH",orgid,totalLevels,(mcsdMOH)=>{
				winston.info("Received DATIM Locations for this orgid")
				winston.info("Getting Scores")
				scores.getScores(mcsdMOH,mcsdDATIM,orgid,database,orgid,(scoreResults)=>{
					winston.error(JSON.stringify(scoreResults,null,2))
					winston.info("Done calculating scores")
					res.set('Access-Control-Allow-Origin','*')
					res.status(200).json(scoreResults)
				})
			})
		})
	}
})

app.post('/uploadCSV/:orgid', (req,res)=>{
	winston.info("Received MOH Data with fields Mapping " + JSON.stringify(req.fields))
	if(!req.params.orgid){
		winston.error({"error":"Missing Orgid"})
		res.set('Access-Control-Allow-Origin','*')
		res.status(401).json({"error":"Missing Orgid"})
	}
	var orgid = req.params.orgid
	const database = config.getConf("mCSD:database")
	var expectedLevels = config.getConf("levels")
	if(!Array.isArray(expectedLevels)){
		winston.error("Invalid config data for key Levels ")
		res.set('Access-Control-Allow-Origin','*')
		res.status(401).json({"error":"Un expected error occured while processing this request"})
		res.end()
		return
	}
	if(Object.keys(req.files).length == 0) {
		winston.error("No file submitted for reconciliation")
		res.status(401).json({"error":"Please submit CSV file for facility reconciliation"})
		res.end()
		return
	}
	var fileName = Object.keys(req.files)[0]
	winston.info("validating CSV File")
	validateCSV(req.fields,(valid,missing)=>{
		if(!valid){
			winston.error({"MissingHeaders": missing})
			res.set('Access-Control-Allow-Origin','*')
			res.status(401).json({"MissingHeaders": missing})
			res.end()
			return
		}
		winston.info("CSV File Passed Validation")
		winston.info("Converting CSV to mCSD")
		var convertedTomCSD = new Promise((resolve,reject)=>{
			mcsd.CSVTomCSD(req.files[fileName].path,req.fields,(mcsdMOH)=>{
				resolve(mcsdMOH)
			})
		})
		
		convertedTomCSD.then((mcsdMOH)=>{
			winston.info("Creating MOH Tree")
			mcsd.createTree(mcsdMOH,'MOH',orgid,orgid,(tree)=>{
				winston.info(`Done Creating MOH Tree`)
				res.set('Access-Control-Allow-Origin','*')
				res.status(200).json(tree)
			})
			winston.info("CSV Converted to mCSD")
			winston.info("Saving MOH CSV into database")
			mcsd.saveLocations(mcsdMOH,orgid,(err,body)=>{
				winston.info("MOH mCSD Saved")
			})	
		}).catch((err)=>{
			winston.error(err)
		})

	})
	
	function validateCSV(cols,callback) {
		var missing = []
		if(!cols.hasOwnProperty("facility") || cols.facility == null || cols.facility == undefined || cols.facility == false){
			missing.push("facility")
		}
		if(!cols.hasOwnProperty("code") || cols.code == null || cols.code == undefined || cols.code == false){
			missing.push("code")
		}
		if(!cols.hasOwnProperty("lat") || cols.lat == null || cols.lat == undefined || cols.lat == false){
			missing.push("lat")
		}
		if(!cols.hasOwnProperty("long") || cols.long == null || cols.long == undefined || cols.long == false){
			missing.push("long")
		}
		if(!cols.hasOwnProperty("level1") || cols.level1 == null || cols.level1 == undefined || cols.facility == false){
			missing.push("level1")
		}
		if(!cols.hasOwnProperty("level2") || cols.level2 == null || cols.level2 == undefined || cols.level2 == false){
			missing.push("level2")
		}
		if(!cols.hasOwnProperty("level3") || cols.level3 == null || cols.level3 == undefined || cols.level3 == false){
			missing.push("level3")
		}
		if(!cols.hasOwnProperty("level4") || cols.level4 == null || cols.level4 == undefined || cols.level4 == false){
			missing.push("level4")
		}
		if(missing.length > 0){
			return callback(false,missing)
		}
		else
			return callback(true,missing)
	}
})

app.post('/test',  (req,res)=>{
	res.send("Authorised")
})
 
app.use(app.oauth.errorHandler());
 
var server = app.listen(config.getConf('server:port'));
winston.info("Server is running and listening on port " + server.address().port)