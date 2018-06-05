const winston = require('winston')
const async = require('async')
const request = require('request')
const URI = require('urijs')
const levenshtein = require('fast-levenshtein')
const geodist = require('geodist')
const _ = require('underscore')
const config = require('./config')
const mcsd = require("./mcsd")
module.exports = function(){
	return {
		getScores:function(mcsdMOH,mcsdDATIM,callback){
			const scoreResults = []
			const maxSuggestions = config.getConf("matchResults:maxSuggestions")
			mcsdDATIM = JSON.parse(mcsdDATIM)
			if(mcsdDATIM.total == 0){
				winston.error("No DATIM data found for this orgunit")
				return callback()
			}
			if(mcsdMOH.total == 0){
				winston.error("No MOH data found")
				return callback()	
			}

			const mohPromises = []
			mcsdMOH.entry.forEach((mohEntry)=>{
				if(mohEntry.resource.physicalType.coding[0].code != "bu"){
					return
				}
				mohPromises.push(new Promise((resolveMoh,rejectMoh)=>{
					var mohIdentifiers = mohEntry.resource.identifier
					var mohName = mohEntry.resource.name
					var mohLatitude = mohEntry.resource.position.latitude
					var mohLongitude = mohEntry.resource.position.longitude
					if(mohEntry.resource.hasOwnProperty("partOf")){
						var reference = mohEntry.resource.partOf.reference
						var mohParentReceived = new Promise((resolve,reject)=>{
							this.getParents(reference,"MOH",(mohParents)=>{
								resolve(mohParents)
							})
						})
					}
					else{
						var mohParentReceived = Promise.resolve([])
					}

					mohParentReceived.then((mohParents)=>{
						var thisRanking = {}
						var datimPromises = []
						thisRanking.moh = {
							name:mohName,
							parents:mohParents,
							lat:mohLatitude,
							long:mohLongitude,
							id:mohIdentifiers
						}
						thisRanking.potentialMatches = {}
						thisRanking.exactMatch = {}
						mcsdDATIM.entry.forEach((datimEntry)=>{
							datimPromises.push(new Promise((datimResolve,datimReject)=>{

								if(datimEntry.resource.physicalType.coding[0].code != "bu"){
									datimResolve()
									return
								}
								var datimName = datimEntry.resource.name
								var datimIdentifiers = datimEntry.resource.identifier
								var datimLatitude = datimEntry.resource.position.latitude
								var datimLongitude = datimEntry.resource.position.longitude
								if(datimEntry.resource.hasOwnProperty("partOf")){
									var reference = datimEntry.resource.partOf.reference
									var datimParentReceived = new Promise((resolve,reject)=>{
										this.getParents(reference,"DATIM",(datimParents)=>{
											resolve(datimParents)
										})
									})
								}
								else{
									var datimParentReceived = Promise.resolve([])
								}
								datimParentReceived.then((datimParents)=>{
									//get distance between the coordinates
									var dist = geodist({datimLatitude,datimLongitude},{mohLatitude,mohLongitude},{exact:true,unit:"miles"})
									//check if IDS are the same
									var me = this
									datimIdPromises = []
									datimIdentifiers.forEach((datimIdentifier)=>{
										datimIdPromises.push(new Promise((datIdResolve,datIdReject)=>{
											const mohIdPromises = []
											mohIdentifiers.forEach((mohIdentifier)=>{
												mohIdPromises.push(new Promise((mohIdResolve,mohIdReject)=>{
													//in case of the same ID then this is an exact match
													if(datimIdentifier.value == mohIdentifier.value){
														thisRanking.exactMatch = {
															name:datimName,
															parents:datimParents,
															lat:datimLatitude,
															long:datimLongitude,
															geoDistance:dist,
															id:datimIdentifiers
														}
														thisRanking.potentialMatches = {}
													}
													mohIdResolve()
												}))
											})
											Promise.all(mohIdPromises).then(()=>{
												datIdResolve()
											}).catch((reason)=>{
												winston.error(reason)
											})
										}))
									})
									Promise.all(datimIdPromises).then(()=>{
										lev = levenshtein.get(datimName,mohName)
										//if names mathes exactly and the two has same parents then this is an exact match
										if(lev == 0){
											if(Object.keys(datimParents).length == Object.keys(mohParents).length && datimParents[0] == mohParents[0]){
												thisRanking.exactMatch = {
													name:datimName,
													parents:datimParents,
													lat:datimLatitude,
													long:datimLongitude,
													geoDistance:dist,
													id:datimIdentifiers
												}
												thisRanking.potentialMatches = {}
											}
										}
										if(Object.keys(thisRanking.exactMatch).length == 0){
											if(thisRanking.potentialMatches.hasOwnProperty(lev) || Object.keys(thisRanking.potentialMatches).length <= maxSuggestions){
												if(!thisRanking.potentialMatches.hasOwnProperty(lev)){
													thisRanking.potentialMatches[lev] = []
												}
											}
											else{
												var existingLev = Object.keys(thisRanking.potentialMatches)
												var max = _.max(existingLev)
												if(lev<max){
													delete thisRanking.potentialMatches[max]
													thisRanking.potentialMatches[lev] = []
												}
											}
											thisRanking.potentialMatches[lev].push({
												name:datimName,
												parents:datimParents,
												lat:datimLatitude,
												long:datimLongitude,
												geoDistance:dist,
												id:datimIdentifiers
											})
										}
										datimResolve()
									}).catch((reason)=>{
						        winston.error(reason)
						      })
								}).catch((reason)=>{
						        winston.error(reason)
						      })
							}))
						})

						Promise.all(datimPromises).then(()=>{
							scoreResults.push(thisRanking)
							resolveMoh()
						}).catch((reason)=>{
			        winston.error(reason)
			      })
					})
				}))
			})

			Promise.all(mohPromises).then(()=>{
				return callback(false,scoreResults)
			}).catch((reason)=>{
        winston.error(reason)
      })
		},

		getParents:function(reference,source,callback){
			const parents = []
			var nextParent = false
			async.doWhilst(
				function(callback){
					var splParent = reference.split("/")
					reference = splParent[(splParent.length-1)]
					if(source == "MOH")
		        var url = URI(config.getConf("mCSDMOH:url")).segment('Location')
		      else if(source == "DATIM")
		        var url = URI(config.getConf("mCSDDATIM:url")).segment('Location')
		      var options = {
		        url: url + '?_id=' + reference.toString()
		      }

		      request.get(options, (err, res, body) => {
		      	body = JSON.parse(body)
		        if(body.total == 0){
		        	var options = {
				        url: url + '?identifier=' + reference.toString()
				      }
				      request.get(options,(err,res,body)=>{
				      	body = JSON.parse(body)
				      	if(body.total == 1)
				      		parents.push(body.entry[0].resource.name)
				      	if(body.total = 1 && body.entry.length>0 && body.entry[0].resource.hasOwnProperty("partOf") && body.entry[0].resource.partOf.display != ""){
				      		reference = body.entry[0].resource.partOf.reference
				      		nextParent = true
				      	}
				      	else{
				      		nextParent = false
				      	}
				      	return callback(null,nextParent)
				      })
		        }

		        else if(body.total == 1){
			      	parents.push(body.entry[0].resource.name)

			      	if(body.entry[0].resource.hasOwnProperty("partOf") && body.entry[0].resource.partOf.display != ""){
			      		reference = body.entry[0].resource.partOf.reference
			      		nextParent = true
			      	}
			      	else{
			      		nextParent = false
			      	}
			      	return callback(null,nextParent)
		        }
		      })
				},
				function(){
					return nextParent!=false
				},
				function(){
					return callback(parents)
				}
			)
		}

	}
}