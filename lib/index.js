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

app.post('/reconcile', (req,res)=>{
	var expectedHeaders = config.getConf("CSVHeaders")
	if(!Array.isArray(expectedHeaders)){
		winston.error("Invalid config data for key uploadHeaders")
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
	validateCSV(fileName,(valid,diff)=>{
		if(!valid){
			res.status(401).json({"MissingHeaders": diff})
			res.end()
			return
		}

		var convertedTomCSD = new Promise((resolve,reject)=>{
				mcsd.CSVTomCSD(req.files[fileName].path,(mcsdMOH)=>{
					resolve(mcsdMOH)
				})
			})

		convertedTomCSD.then((mcsdMOH)=>{
			mcsd.getLocations("DATIM",(err,mcsdDATIM)=>{
				scores.getScores(mcsdMOH,mcsdDATIM,(err,scoreResults)=>{
					res.set('Access-Control-Allow-Origin','*')
					res.status(200).json(scoreResults)
				})
			})
			mcsd.saveLocations(mcsdMOH,(err,body)=>{
				mcsd.createTree(mcsdMOH,'MOH',(err,res)=>{

				})
			})
		})

	})
	

	function validateCSV(fileName,callback){
		csv
		 .fromPath(req.files[fileName].path,{ignoreEmpty: true,headers : true})
		 .validate((data,next)=>{
	 			var headers = Object.keys(data)
		    var diff = expectedHeaders.filter(x=>!headers.includes(x))
		    if(diff.length > 0){
		    	return callback(false,diff)
		    }
		    else
		    	return callback(true,[])
		 })
	}
})

app.post('/test',  (req,res)=>{
	res.send("Authorised")
})
 
app.use(app.oauth.errorHandler());
 
var server = app.listen(config.getConf('server:port'));
winston.info("Server is running and listening on port " + server.address().port)
