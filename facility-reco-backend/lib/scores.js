const winston = require('winston')
const async = require('async')
const request = require('request')
const URI = require('urijs')
const levenshtein = require('fast-levenshtein')
const geodist = require('geodist')
const _ = require('underscore')
const config = require('./config')
const mcsd = require("./mcsd")()
module.exports = function(){
	return {
		getJurisdictionScore:function(mcsdMOH,mcsdDATIM,mohDB,datimDB,mohTopId,datimTopId,recoLevel,totalLevels,callback){
			const scoreResults = []
			const mapped = []
			const maxSuggestions = config.getConf("matchResults:maxSuggestions")
			if(mcsdDATIM.total == 0){
				winston.error("No DATIM data found for this orgunit")
				return callback()
			}
			if(mcsdMOH.total == 0){
				winston.error("No MOH data found")
				return callback()	
			}

			async.eachSeries(mcsdMOH.entry,(mohEntry,nxtMohEntry)=>{
				var database = "MOHDATIM" + datimTopId
				//check if this MOH Orgid is mapped
				var mohId = mohEntry.resource.id
				var mohIdentifier = URI(config.getConf("mCSD:url")).segment(datimTopId).segment('fhir').segment(mohId).toString()
				var url = URI(config.getConf("mCSD:url")).segment(database).segment('fhir').segment('Location') + "?identifier=" + mohIdentifier.toString()
				var options = {
	        url: url
	      }
	      request.get(options, (err, res, body) => {
	      	body = JSON.parse(body)
	      	//if this MOH Org is already mapped
	      	if(body.total == 1) {
	      		var entityParent = null
	      		if(mohEntry.resource.hasOwnProperty("partOf")){
	      			entityParent = mohEntry.resource.partOf.reference
	      		}
	      		mcsd.getLocationParentsFromDB('MOH',mohDB,entityParent,mohTopId,"names",(mohParents)=>{
	      			if(body.entry[0].resource.hasOwnProperty("partOf")){
								entityParent = body.entry[0].resource.partOf.reference
							}
	      			mcsd.getLocationParentsFromDB('DATIM',datimDB,entityParent,datimTopId,"names",(datimParents)=>{
								var thisRanking = {}
								thisRanking.moh = {
									name:mohEntry.resource.name,
									parents:mohParents,
									id:mohEntry.resource.id
								}
								thisRanking.potentialMatches = {}
								thisRanking.exactMatch = {}
								thisRanking.exactMatch = {
									name:body.entry[0].resource.name,
									parents:datimParents,
									id:body.entry[0].resource.id
								}
								scoreResults.push(thisRanking)
								return nxtMohEntry()
							})
						})
	      	}
	      	//if not mapped
	      	else{
						var mohName = mohEntry.resource.name
						if(mohEntry.resource.hasOwnProperty("partOf")){
							var entityParent = mohEntry.resource.partOf.reference
							var mohParentReceived = new Promise((resolve,reject)=>{
								mcsd.getLocationParentsFromDB('MOH',mohDB,entityParent,mohTopId,"names",(mohParents)=>{
									resolve(mohParents)
								})
							})
						}
						else{
							var mohParentReceived = Promise.resolve([])
						}

						mohParentReceived.then((mohParents)=>{
							var thisRanking = {}
							thisRanking.moh = {
								name:mohName,
								parents:mohParents,
								id:mohEntry.resource.id
							}
							thisRanking.potentialMatches = {}
							thisRanking.exactMatch = {}
							const datimPromises = []
							async.eachSeries(mcsdDATIM.entry,(datimEntry,nxtDatimEntry)=>{
								var database = "MOHDATIM" + datimTopId
								var id = datimEntry.resource.id
								//check if this is already mapped
								mcsd.getLocationByID(database,id,false,(locations)=>{
									if(locations.total == 1){
										return nxtDatimEntry()
									}
									var datimName = datimEntry.resource.name
									if(datimEntry.resource.hasOwnProperty("partOf")){
										var entityParent = datimEntry.resource.partOf.reference
										var datimParentReceived = new Promise((resolve,reject)=>{
											mcsd.getLocationParentsFromDB('DATIM',datimDB,entityParent,datimTopId,"names",(datimParents)=>{
												resolve(datimParents)
											})
										})
									}
									else{
										var datimParentReceived = Promise.resolve([])
									}
									datimParentReceived.then((datimParents)=>{
										lev = levenshtein.get(datimName,mohName)
										//if names mathes exactly and the two has same parents then this is an exact match
										//var parentsEquals = mohParents.length == datimParents.length &&  datimParents.every((v,i)=>mohParents.includes(v))
										var parentsEquals = false
										if(mohParents.length >0 && datimParents.length > 0){
											parentsEquals = mohParents[0] == datimParents[0]
										}
										if(lev == 0 && parentsEquals){
											if(Object.keys(datimParents).length == Object.keys(mohParents).length && datimParents[0] == mohParents[0]){
												thisRanking.exactMatch = {
													name:datimName,
													parents:datimParents,
													id:datimEntry.resource.id
												}
												thisRanking.potentialMatches = {}
											}
											mapped.push(datimEntry.resource.id)
											mcsd.saveMatch(mohId,datimEntry.resource.id,datimTopId,recoLevel,totalLevels,()=>{

											})
											scoreResults.push(thisRanking)
											return nxtMohEntry()
										}
										if(Object.keys(thisRanking.exactMatch).length == 0){
											if(thisRanking.potentialMatches.hasOwnProperty(lev) || Object.keys(thisRanking.potentialMatches).length < maxSuggestions){
												if(!thisRanking.potentialMatches.hasOwnProperty(lev)){
													thisRanking.potentialMatches[lev] = []
												}
												thisRanking.potentialMatches[lev].push({
													name:datimName,
													parents:datimParents,
													id:datimEntry.resource.id
												})
											}
											else{
												var existingLev = Object.keys(thisRanking.potentialMatches)
												var max = _.max(existingLev)
												if(lev<max){
													delete thisRanking.potentialMatches[max]
													thisRanking.potentialMatches[lev] = []
													thisRanking.potentialMatches[lev].push({
														name:datimName,
														parents:datimParents,
														id:datimEntry.resource.id
													})
												}
											}
										}
										return nxtDatimEntry()
									}).catch((err)=>{
										winston.error(err)
									})
								})
							},()=>{
								scoreResults.push(thisRanking)
								return nxtMohEntry()
							})
						}).catch((err)=>{
								winston.error(err)
							})
					}
				})
			},()=>{
				return callback(scoreResults)
			})
		},

		getBuildingsScores:function(mcsdMOH,mcsdDATIM,mohDB,datimDB,mohTopId,datimTopId,recoLevel,totalLevels,callback){
			const scoreResults = []
			const mapped = []
			const maxSuggestions = config.getConf("matchResults:maxSuggestions")
			if(mcsdDATIM.total == 0){
				winston.error("No DATIM data found for this orgunit")
				return callback()
			}
			if(mcsdMOH.total == 0){
				winston.error("No MOH data found")
				return callback()	
			}
			var counter = 0
			async.eachSeries(mcsdMOH.entry,(mohEntry,nxtMohEntry)=>{
				var database = "MOHDATIM" + datimTopId
				//check if this MOH Orgid is mapped
				var mohId = mohEntry.resource.id
				var mohIdentifiers = mohEntry.resource.identifier
				var mohLatitude = null
				var mohLongitude = null
				if(mohEntry.resource.hasOwnProperty('position')){
					mohLatitude = mohEntry.resource.position.latitude
					mohLongitude = mohEntry.resource.position.longitude
				}
				var mohIdentifier = URI(config.getConf("mCSD:url")).segment(datimTopId).segment('fhir').segment(mohId).toString()
				var url = URI(config.getConf("mCSD:url")).segment(database).segment('fhir').segment('Location') + "?identifier=" + mohIdentifier.toString()
				var options = {
	        url: url
	      }
	      request.get(options, (err, res, body) => {
	      	body = JSON.parse(body)
	      	//if this MOH Org is already mapped
	      	if(body.total == 1) {
	      		var entityParent = null
	      		if(mohEntry.resource.hasOwnProperty("partOf")){
	      			entityParent = mohEntry.resource.partOf.reference
	      		}
	      		mcsd.getLocationParentsFromDB('MOH',mohDB,entityParent,mohTopId,"names",(mohParents)=>{
	      			if(body.entry[0].resource.hasOwnProperty("partOf")){
								entityParent = body.entry[0].resource.partOf.reference
							}
	      			mcsd.getLocationParentsFromDB('DATIM',datimDB,entityParent,datimTopId,"names",(datimParents)=>{
								var thisRanking = {}
								thisRanking.moh = {
									name:mohEntry.resource.name,
									parents:mohParents,
									lat:mohLatitude,
									long:mohLongitude,
									id:mohEntry.resource.id
								}
								thisRanking.potentialMatches = {}
								thisRanking.exactMatch = {}
								thisRanking.exactMatch = {
									name:body.entry[0].resource.name,
									parents:datimParents,
									id:body.entry[0].resource.id
								}
								scoreResults.push(thisRanking)
								return nxtMohEntry()
							})
						})
	      	}
	      	//if not mapped
	      	else{
						var mohName = mohEntry.resource.name
						if(mohEntry.resource.hasOwnProperty("partOf")){
							var entityParent = mohEntry.resource.partOf.reference
							var mohParentReceived = new Promise((resolve,reject)=>{
								mcsd.getLocationParentsFromDB('MOH',mohDB,entityParent,mohTopId,"names",(mohParents)=>{
									resolve(mohParents)
								})
							})
						}
						else{
							var mohParentReceived = Promise.resolve([])
						}

						mohParentReceived.then((mohParents)=>{
							var thisRanking = {}
							thisRanking.moh = {
								name:mohName,
								parents:mohParents,
								lat:mohLatitude,
								long:mohLongitude,
								id:mohEntry.resource.id
							}
							thisRanking.potentialMatches = {}
							thisRanking.exactMatch = {}
							const datimPromises = []
							var counts = 0
							async.eachSeries(mcsdDATIM.entry,(datimEntry,nxtDatimEntry)=>{
								var database = "MOHDATIM" + datimTopId
								var id = datimEntry.resource.id
								var datimIdentifiers = datimEntry.resource.identifier
								//check if this is already mapped
								//this.isMapped(mcsdMapped,id,(mapped)=>{
								mcsd.getLocationByID(database,id,true,(locations)=>{
									/*if(locations.total == 1){
										return nxtDatimEntry()
									}*/
									if(mapped){
										return nxtDatimEntry()
									}
									var datimName = datimEntry.resource.name
									var datimLatitude = null
									var datimLongitude = null
									if(datimEntry.resource.hasOwnProperty('position')){
										datimLatitude = datimEntry.resource.position.latitude
										datimLongitude = datimEntry.resource.position.longitude
									}
									if(datimEntry.resource.hasOwnProperty("partOf")){
										var entityParent = datimEntry.resource.partOf.reference
										var datimParentReceived = new Promise((resolve,reject)=>{
											mcsd.getLocationParentsFromDB('DATIM',datimDB,entityParent,datimTopId,"names",(datimParents)=>{
												resolve(datimParents)
											})
										})
									}
									else{
										var datimParentReceived = Promise.resolve([])
									}
									datimParentReceived.then((datimParents)=>{
										//get distance between the coordinates
										if(datimLatitude && datimLongitude)
											var dist = geodist({datimLatitude,datimLongitude},{mohLatitude,mohLongitude},{exact:true,unit:"miles"})
										datimIdPromises = []

										//check if IDS are the same and mark as exact match
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
																id:datimEntry.resource.id
															}
															thisRanking.potentialMatches = {}
															mcsd.saveMatch(mohId,datimEntry.resource.id,datimTopId,recoLevel,totalLevels,()=>{

															})
															scoreResults.push(thisRanking)
															return nxtMohEntry()
															mohIdResolve()
														}
														else{
															mohIdResolve()
														}
														
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
											//var parentsEquals = mohParents.length == datimParents.length &&  datimParents.every((v,i)=>mohParents.includes(v))
											var parentsEquals = false
											if(mohParents.length >0 && datimParents.length > 0){
												parentsEquals = mohParents[0] == datimParents[0]
											}
											if(lev == 0 && parentsEquals){
												if(Object.keys(datimParents).length == Object.keys(mohParents).length && datimParents[0] == mohParents[0]){
													thisRanking.exactMatch = {
														name:datimName,
														parents:datimParents,
														lat:datimLatitude,
														long:datimLongitude,
														geoDistance:dist,
														id:datimEntry.resource.id
													}
													thisRanking.potentialMatches = {}
												}
												mcsd.saveMatch(mohId,datimEntry.resource.id,datimTopId,recoLevel,totalLevels,()=>{

												})
												scoreResults.push(thisRanking)
												return nxtMohEntry()
											}
											if(Object.keys(thisRanking.exactMatch).length == 0){
												if(thisRanking.potentialMatches.hasOwnProperty(lev) || Object.keys(thisRanking.potentialMatches).length < maxSuggestions){
													if(!thisRanking.potentialMatches.hasOwnProperty(lev)){
														thisRanking.potentialMatches[lev] = []
													}
													thisRanking.potentialMatches[lev].push({
														name:datimName,
														parents:datimParents,
														lat:datimLatitude,
														long:datimLongitude,
														geoDistance:dist,
														id:datimEntry.resource.id
													})
												}
												else{
													var existingLev = Object.keys(thisRanking.potentialMatches)
													var max = _.max(existingLev)
													if(lev<max){
														delete thisRanking.potentialMatches[max]
														thisRanking.potentialMatches[lev] = []
														thisRanking.potentialMatches[lev].push({
															name:datimName,
															parents:datimParents,
															lat:datimLatitude,
															long:datimLongitude,
															geoDistance:dist,
															id:datimEntry.resource.id
														})
													}
												}
											}
											return nxtDatimEntry()
										}).catch((err)=>{
											winston.error(err)
										})
									}).catch((err)=>{
										winston.error(err)
									})
								})
							},()=>{
								scoreResults.push(thisRanking)
								return nxtMohEntry()
							})
						}).catch((err)=>{
								winston.error(err)
							})
					}
				})
			},()=>{
				return callback(scoreResults)
			})
		},

		getScoresa:function(mcsdMOH,mcsdDATIM,callback){
			const scoreResults = []
			const maxSuggestions = config.getConf("matchResults:maxSuggestions")
			if(mcsdDATIM.total == 0){
				winston.error("No DATIM data found for this orgunit")
				return callback()
			}
			if(mcsdMOH.total == 0){
				winston.error("No MOH data found")
				return callback()	
			}

			const mohPromises = []
			var counter = 0
			mcsdMOH.entry.forEach((mohEntry)=>{
				if(mohEntry.resource.physicalType.coding[0].code != "bu"){
					return
				}
				mohPromises.push(new Promise((resolveMoh,rejectMoh)=>{
					var id = mohEntry.resource.id
					var mohIdentifiers = mohEntry.resource.identifier
					var mohName = mohEntry.resource.name
					var mohLatitude = mohEntry.resource.position.latitude
					var mohLongitude = mohEntry.resource.position.longitude
					if(mohEntry.resource.hasOwnProperty("partOf")){
						var reference = mohEntry.resource.partOf.reference
						var mohParentReceived = new Promise((resolve,reject)=>{
							mcsd.getParentsNew('lZsCb6y0KDX','MOH',reference,id,"names",(mohParents)=>{
							//mcsd.getParents(reference,mcsdMOH,"names",(mohParents)=>{
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
								var id = datimEntry.resource.id
								var datimName = datimEntry.resource.name
								var datimIdentifiers = datimEntry.resource.identifier
								if(datimEntry.resource.hasOwnProperty('position')){
									var datimLatitude = datimEntry.resource.position.latitude
									var datimLongitude = datimEntry.resource.position.longitude
								}
								if(datimEntry.resource.hasOwnProperty("partOf")){
									var reference = datimEntry.resource.partOf.reference
									var datimParentReceived = new Promise((resolve,reject)=>{
										mcsd.getParentsNew('GeoAlign','DATIM',reference,id,"names",(datimParents)=>{
										//mcsd.getParents(reference,mcsdDATIM,"names",(datimParents)=>{
											resolve(datimParents)
										})
									})
								}
								else{
									var datimParentReceived = Promise.resolve([])
								}
								datimParentReceived.then((datimParents)=>{
									counter++
									//get distance between the coordinates
									if(datimLatitude && datimLongitude)
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
												thisRanking.potentialMatches[lev].push({
													name:datimName,
													parents:datimParents,
													lat:datimLatitude,
													long:datimLongitude,
													geoDistance:dist,
													id:datimIdentifiers
												})
											}
											else{
												var existingLev = Object.keys(thisRanking.potentialMatches)
												var max = _.max(existingLev)
												if(lev<max){
													delete thisRanking.potentialMatches[max]
													thisRanking.potentialMatches[lev] = []
													thisRanking.potentialMatches[lev].push({
														name:datimName,
														parents:datimParents,
														lat:datimLatitude,
														long:datimLongitude,
														geoDistance:dist,
														id:datimIdentifiers
													})
												}
											}
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
					}).catch((err)=>{
						winston.error(err)
					})
				}))
			})

			Promise.all(mohPromises).then(()=>{
				return callback(false,scoreResults)
			}).catch((reason)=>{
        winston.error(reason)
      })
		},
		isMapped(mcsdMapped,id,callback){
			var mapped = mcsdMapped.entry.find((entry)=>{
				return entry.resource.id == id
			})
			return callback(mapped)
		},
		getUnmatched:function(mcsdDatim,topOrgId,callback){
			var database = "MOHDATIM" + topOrgId
			var unmatched = []
			async.eachSeries(mcsdDatim.entry,(datimEntry,nxtEntry)=>{
				mcsd.getLocationByID(database,datimEntry.resource.id,false,(location)=>{
					if(location.total == 0){
						var name = datimEntry.resource.name
						var id = datimEntry.resource.id
						var parents = 
						unmatched.push({
							id: id,
							name: name,
							parents: null
						})
						return nxtEntry()
					}
					else{
						return nxtEntry()
					}
				})
			},()=>{
				callback(unmatched)
			})
		}

	}
}