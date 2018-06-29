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
		getJurisdictionScore:function(mcsdMOH,mcsdDATIM,mcsdMapped,mohDB,datimDB,mohTopId,datimTopId,recoLevel,totalLevels,callback){
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
				var database = config.getConf("mapping:dbPrefix") + datimTopId
				//check if this MOH Orgid is mapped
				var mohId = mohEntry.resource.id
				var mohIdentifier = URI(config.getConf("mCSD:url")).segment(datimTopId).segment('fhir').segment(mohId).toString()
	      this.matchStatus(mcsdMapped,mohIdentifier,(match)=>{
	      	//if this MOH Org is already mapped
	      	if(match) {
	      		const noMatchCode = config.getConf("mapping:noMatchCode")
	      		var entityParent = null
	      		if(mohEntry.resource.hasOwnProperty("partOf")){
	      			entityParent = mohEntry.resource.partOf.reference
	      		}
	      		mcsd.getLocationParentsFromDB('MOH',mohDB,entityParent,mohTopId,"names",(mohParents)=>{
	      			var thisRanking = {}
							thisRanking.moh = {
								name:mohEntry.resource.name,
								parents:mohParents,
								id:mohEntry.resource.id
							}
							thisRanking.potentialMatches = {}
							thisRanking.exactMatch = {}
							var noMatch = null
							if(match.resource.hasOwnProperty('tag')){
								noMatch = match.resource.tag.find((tag)=>{
									return tag.code == noMatchCode
								})
							}
							//in case this is marked as no match then process next MOH
							if(noMatch){
								thisRanking.moh.tag = 'noMatch'
								scoreResults.push(thisRanking)
								return nxtMohEntry()
							}
							//if no macth then this is already marked as a match
							else {
								const flagCode = config.getConf("mapping:flagCode")
								if(match.resource.hasOwnProperty('tag')){
									var flag = match.resource.tag.find((tag)=>{
									return tag.code == flagCode
									})
									if(flag) {
										thisRanking.moh.tag = 'flagged'
									}
								}
								if(match.resource.hasOwnProperty("partOf")){
									entityParent = match.resource.partOf.reference
								}
								mcsd.getLocationParentsFromDB('DATIM',datimDB,entityParent,datimTopId,"names",(datimParents)=>{
									thisRanking.exactMatch = {
										name: match.resource.name,
										parents: datimParents,
										id: match.resource.id
									}
									scoreResults.push(thisRanking)
									return nxtMohEntry()
								})
							}
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
							//async.eachSeries(mcsdDATIM.entry,(datimEntry,nxtDatimEntry)=>{
							const datimPromises = []
							for(var k in mcsdDATIM.entry) {
								datimPromises.push(new Promise((datimResolve,datimReject)=>{
									var datimEntry = mcsdDATIM.entry[k]
									var database = config.getConf("mapping:dbPrefix") + datimTopId
									var id = datimEntry.resource.id
									//check if this is already mapped
									this.matchStatus(mcsdMapped,id,(mapped)=>{
									//mcsd.getLocationByID(database,id,false,(locations)=>{
										if(mapped){
											return datimResolve()
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
												mcsd.saveMatch(mohId,datimEntry.resource.id,datimTopId,recoLevel,totalLevels,'match',()=>{

												})
												//we will need to break here and start processing nxt MOH
												return datimResolve()
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
											return datimResolve()
										}).catch((err)=>{
											winston.error(err)
										})
									})
								}))
							}
							Promise.all(datimPromises).then(()=>{
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

		getBuildingsScores:function(mcsdMOH,mcsdDATIM,mcsdMapped,mcsdWhole,mohDB,datimDB,mohTopId,datimTopId,recoLevel,totalLevels,callback){
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
			const promises = []
			var count = 0
			//mcsdMOH.entry.forEach((mohEntry)=>{
			async.eachSeries(mcsdMOH.entry,(mohEntry,nxtMohEntry)=>{
				count++
				winston.error(count)
				var database = config.getConf("mapping:dbPrefix") + datimTopId
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
	      this.matchStatus(mcsdMapped,mohIdentifier,(match)=>{
	      	//if this MOH Org is already mapped
	      	var thisRanking = {}
	      	if(match) {
	      		const noMatchCode = config.getConf("mapping:noMatchCode")
	      		var entityParent = null
	      		if(mohEntry.resource.hasOwnProperty("partOf")){
	      			entityParent = mohEntry.resource.partOf.reference
	      		}
	      		mcsd.getLocationParentsFromDB('MOH',mohDB,entityParent,mohTopId,"names",(mohParents)=>{
	      			var ident = mohEntry.resource.identifier.find((identifier)=>{
								return identifier.system == "http://geoalign.datim.org/MOH"
							})

							var mohBuildingId = null
							if(ident){
								mohBuildingId = ident.value
							}
							thisRanking.moh = {
								name:mohEntry.resource.name,
								parents:mohParents,
								lat:mohLatitude,
								long:mohLongitude,
								id:mohBuildingId
							}
							thisRanking.potentialMatches = {}
							thisRanking.exactMatch = {}
							var noMatch = null
							if(match.resource.hasOwnProperty('tag')){
								noMatch = match.resource.tag.find((tag)=>{
									return tag.code == noMatchCode
								})
							}
							//in case this is marked as no match then process next MOH
							if(noMatch){
								thisRanking.moh.tag = 'noMatch'
								scoreResults.push(thisRanking)
								return nxtMohEntry()
							}
							else {
								if(match.resource.hasOwnProperty("partOf")){
									entityParent = match.resource.partOf.reference
								}

		      			mcsd.getLocationParentsFromDB('DATIM',datimDB,entityParent,datimTopId,"names",(datimParents)=>{
									var ident = mohEntry.resource.identifier.find((identifier)=>{
										return identifier.system == "http://geoalign.datim.org/MOH"
									})

									var mohBuildingId = null
									if(ident){
										mohBuildingId = ident.value
									}
									thisRanking.exactMatch = {
										name: match.resource.name,
										parents: datimParents,
										id: match.resource.id
									}
									scoreResults.push(thisRanking)
									return nxtMohEntry()
								})
							}
						})
	      	}
	      	//if not mapped
	      	else{
						var mohName = mohEntry.resource.name
						if(mohEntry.resource.hasOwnProperty("partOf")){
							var entityParent = mohEntry.resource.partOf.reference
							var mohParentReceived = new Promise((resolve1,reject1)=>{
								mcsd.getLocationParentsFromDB('MOH',mohDB,entityParent,mohTopId,"names",(mohParents)=>{
									resolve1(mohParents)
								})
							})
						}
						else{
							var mohParentReceived = Promise.resolve([])
						}

						mohParentReceived.then((mohParents)=>{
							var thisRanking = {}
							var mohBuildingId = null
							var ident = mohEntry.resource.identifier.find((identifier)=>{
								return identifier.system == 'http://geoalign.datim.org/MOH'
							})
							if(ident){
								mohBuildingId = ident.value
							}
							thisRanking.moh = {
								name:mohName,
								parents:mohParents,
								lat:mohLatitude,
								long:mohLongitude,
								id:mohBuildingId
							}
							thisRanking.potentialMatches = {}
							thisRanking.exactMatch = {}
							//async.eachSeries(mcsdDATIM.entry,(datimEntry,nxtDatimEntry)=>{
							const datimPromises = []
							mcsdDATIM.entry.forEach((datimEntry)=>{
								datimPromises.push(new Promise((datimresolve,datimreject)=>{
									var database = config.getConf("mapping:dbPrefix") + datimTopId
									var id = datimEntry.resource.id
									var datimIdentifiers = datimEntry.resource.identifier
									//check if this is already mapped
									this.matchStatus(mcsdMapped,id,(mapped)=>{
										if(mapped){
											return datimresolve()
										}
										var datimName = datimEntry.resource.name
										var datimLatitude = null
										var datimLongitude = null
										if(datimEntry.resource.hasOwnProperty('position')){
											datimLatitude = datimEntry.resource.position.latitude
											datimLongitude = datimEntry.resource.position.longitude
										}
										var entityParent = null
										if(datimEntry.resource.hasOwnProperty("partOf")){
											entityParent = datimEntry.resource.partOf.reference
										}
										//mcsd.getLocationParentsFromDB('DATIM',datimDB,entityParent,datimTopId,"names",(datimParents)=>{
										mcsd.getLocationParentsFromData(entityParent,mcsdWhole,"names",(datimParents)=>{
											//get distance between the coordinates
											if(datimLatitude && datimLongitude)
												var dist = geodist({datimLatitude,datimLongitude},{mohLatitude,mohLongitude},{exact:true,unit:"miles"})
											datimIdPromises = []

											//check if IDS are the same and mark as exact match
											var matchingIdent = datimIdentifiers.find((datIdent)=>{
												return mohIdentifiers.find((mohIdent)=>{
													return datIdent.value == mohIdent.value
												})
											})
											if(matchingIdent) {
												thisRanking.exactMatch = {
													name:datimName,
													parents:datimParents,
													lat:datimLatitude,
													long:datimLongitude,
													geoDistance:dist,
													id:datimEntry.resource.id
												}
												thisRanking.potentialMatches = {}
												mcsd.saveMatch(mohId,datimEntry.resource.id,datimTopId,recoLevel,totalLevels,'match',()=>{

												})
												datimresolve()
											}
											else {
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
													winston.error(mohId + " " + datimEntry.resource.id)
													mcsd.saveMatch(mohId,datimEntry.resource.id,datimTopId,recoLevel,totalLevels,'match',()=>{

													})
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
												datimresolve()
											}
										})
									})
							  }))
							})
							Promise.all(datimPromises).then(()=>{
								scoreResults.push(thisRanking)
								return nxtMohEntry()
							}).catch((err)=>{
								winston.error(err)
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
		matchStatus(mcsdMapped,id,callback){
			var status = mcsdMapped.entry.find((entry)=>{
				return entry.resource.id == id || (entry.resource.hasOwnProperty('identifier') && entry.resource.identifier.find((identifier)=>{
					return identifier.value == id
				}))
			})
			/*else if(type == 'identifier'){
				var status =	entry.resource.identifier.find((identifier)=>{
					return identifier.value == id
				})*/
			return callback(status)
		},
		getUnmatched:function(mcsdDatim,topOrgId,callback){
			var database = config.getConf("mapping:dbPrefix") + topOrgId
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