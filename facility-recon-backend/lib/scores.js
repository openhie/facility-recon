const winston = require('winston')
const async = require('async')
const request = require('request')
const URI = require('urijs')
const levenshtein = require('fast-levenshtein')
const geodist = require('geodist')
const _ = require('underscore')
//const save = require('child_process').fork('save.js')
const config = require('./config')
const mcsd = require("./mcsd")()
module.exports = function(){
	return {
		getJurisdictionScore:function(mcsdMOH,mcsdDATIM,mcsdMapped,mcsdDatimAll,mcsdMohAll,mohDB,datimDB,mohTopId,datimTopId,recoLevel,totalLevels,callback){
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

			async.each(mcsdMOH.entry,(mohEntry,mohCallback)=>{
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
	      		mcsd.getLocationParentsFromData(entityParent,mcsdMohAll,"names",(mohParents)=>{
	      		//mcsd.getLocationParentsFromDB('MOH',mohDB,entityParent,mohTopId,"names",(mohParents)=>{
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
								return mohCallback()
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
								mcsd.getLocationParentsFromData(entityParent,mcsdDatimAll,"names",(datimParents)=>{
								//mcsd.getLocationParentsFromDB('DATIM',datimDB,entityParent,datimTopId,"names",(datimParents)=>{
									thisRanking.exactMatch = {
										name: match.resource.name,
										parents: datimParents,
										id: match.resource.id
									}
									scoreResults.push(thisRanking)
									return mohCallback()
								})
							}
						})
	      	}
	      	//if not mapped
	      	else{
						var mohName = mohEntry.resource.name
						var mohParents = []
						var mohParentNames = []
						if(mohEntry.resource.hasOwnProperty("partOf")){
							var entityParent = mohEntry.resource.partOf.reference
							var mohParentReceived = new Promise((resolve,reject)=>{
								mcsd.getLocationParentsFromData(entityParent,mcsdMohAll,"all",(parents)=>{
								//mcsd.getLocationParentsFromDB('MOH',mohDB,entityParent,mohTopId,"all",(parents)=>{
									mohParents = parents
									async.eachSeries(parents,(parent,nxtParent)=>{
										mohParentNames.push(
											parent.text
										)
										return nxtParent()
									},()=>{
										resolve()
									})
								})
							})
						}
						else{
							var mohParentReceived = Promise.resolve([])
						}

						mohParentReceived.then(()=>{
							var thisRanking = {}
							thisRanking.moh = {
								name:mohName,
								parents:mohParentNames,
								id:mohEntry.resource.id
							}
							thisRanking.potentialMatches = {}
							thisRanking.exactMatch = {}
							const datimPromises = []
							async.each(mcsdDATIM.entry,(datimEntry,datimCallback) => {
								var database = config.getConf("mapping:dbPrefix") + datimTopId
								var id = datimEntry.resource.id
								//check if this is already mapped
								this.matchStatus(mcsdMapped,id,(mapped)=>{
									if(mapped){
										return datimCallback()
									}
									var datimName = datimEntry.resource.name
									if(datimEntry.resource.hasOwnProperty("partOf")){
										var datimParents = []
										var datimParentNames = []
										var datimMappedParentNames = []
										var entityParent = datimEntry.resource.partOf.reference
										var datimParentReceived = new Promise((resolve,reject)=>{
											mcsd.getLocationParentsFromData(entityParent,mcsdDatimAll,"all",(parents)=>{
												datimParents = parents
												//lets make sure that we use the mapped parent for comparing against MOH
												async.eachSeries(datimParents,(parent,nxtParent)=>{
													this.matchStatus(mcsdMapped,parent.id,(mapped)=>{
														if(mapped) {
															var mappedPar = mapped.resource.identifier.find((identifier)=>{
																if (identifier.system == 'http://geoalign.datim.org/MOH') {
																	var mohParId = identifier.value.split('/').pop()
																	var found = mohParents.find((parent)=>{
																		if(parent.id === mohParId){
																			datimMappedParentNames.push(parent.text)
																			return parent.text
																		}
																	})
																}
																return found
															})
															datimParentNames.push(parent.text)
															return nxtParent()
														}
														else {
															datimMappedParentNames.push(parent.text)
															datimParentNames.push(parent.text)
															return nxtParent()
														}
													})
												},()=>{
													resolve()
												})
											})
										})
									}
									else{
										var datimParentReceived = Promise.resolve([])
									}
									datimParentReceived.then(()=>{
										if (mohParentNames[0] != datimMappedParentNames[0]) {
											return datimCallback()
										}
										lev = levenshtein.get(datimName,mohName)
										//if names mathes exactly and the two has same parents then this is an exact match
										//var parentsEquals = mohParents.length == datimParents.length &&  datimParents.every((v,i)=>mohParents.includes(v))
										var parentsEquals = false
										if(mohParentNames.length >0 && datimMappedParentNames.length > 0){
											parentsEquals = mohParentNames[0] == datimMappedParentNames[0]
										}
										if(lev == 0 && parentsEquals){
											if(Object.keys(datimMappedParentNames).length == Object.keys(mohParents).length && datimMappedParentNames[0] == mohParentNames[0]){
												thisRanking.exactMatch = {
													name:datimName,
													parents:datimParentNames,
													id:datimEntry.resource.id
												}
												thisRanking.potentialMatches = {}
											}
											mcsd.saveMatch(mohId,datimEntry.resource.id,datimTopId,recoLevel,totalLevels,'match',()=>{

											})
											//we will need to break here and start processing nxt MOH
											return datimCallback()
										}
										if(Object.keys(thisRanking.exactMatch).length == 0){
											if(thisRanking.potentialMatches.hasOwnProperty(lev) || Object.keys(thisRanking.potentialMatches).length < maxSuggestions){
												if(!thisRanking.potentialMatches.hasOwnProperty(lev)){
													thisRanking.potentialMatches[lev] = []
												}
												thisRanking.potentialMatches[lev].push({
													name:datimName,
													parents:datimParentNames,
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
														parents:datimParentNames,
														id:datimEntry.resource.id
													})
												}
											}
										}
										return datimCallback()
									}).catch((err)=>{
										winston.error(err)
									})
								})
							},()=>{
								scoreResults.push(thisRanking)
								return mohCallback()
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

		getBuildingsScores:function(mcsdMOH,mcsdDATIM,mcsdMapped,mcsdDatimAll,mcsdMohAll,mohDB,datimDB,mohTopId,datimTopId,recoLevel,totalLevels,callback){
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
			const mohPromises = []
			async.each(mcsdMOH.entry,(mohEntry,mohCallback)=>{
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
	      		mcsd.getLocationParentsFromData(entityParent,mcsdMohAll,"names",(mohParents)=>{
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
								return mohCallback()
							}
							else {
								if(match.resource.hasOwnProperty("partOf")){
									entityParent = match.resource.partOf.reference
								}

								mcsd.getLocationParentsFromData(entityParent,mcsdDatimAll,"names",(datimParents)=>{
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
									return mohCallback()
								})
							}
						})
	      	}
	      	//if not mapped
	      	else{
						var mohName = mohEntry.resource.name
						var mohParents = []
						var mohParentNames = []
						if(mohEntry.resource.hasOwnProperty("partOf")){
							var entityParent = mohEntry.resource.partOf.reference
							var mohParentReceived = new Promise((resolve,reject)=>{
								mcsd.getLocationParentsFromData(entityParent,mcsdMohAll,"all",(parents)=>{
									mohParents = parents
									async.eachSeries(parents,(parent,nxtParent)=>{
										mohParentNames.push(
											parent.text
										)
										return nxtParent()
									},()=>{
										resolve()
									})
								})
							})
						}
						else{
							var mohParentReceived = Promise.resolve([])
						}

						mohParentReceived.then(()=>{
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
								parents:mohParentNames,
								lat:mohLatitude,
								long:mohLongitude,
								id:mohBuildingId
							}
							thisRanking.potentialMatches = {}
							thisRanking.exactMatch = {}
							const datimPromises = []
							async.each(mcsdDATIM.entry,(datimEntry,datimCallback)=>{
								var database = config.getConf("mapping:dbPrefix") + datimTopId
								var id = datimEntry.resource.id
								var datimIdentifiers = datimEntry.resource.identifier
								//check if this is already mapped
								this.matchStatus(mcsdMapped,id,(mapped)=>{
									if(mapped){
										return datimCallback()
									}
									var datimName = datimEntry.resource.name
									var datimLatitude = null
									var datimLongitude = null
									if(datimEntry.resource.hasOwnProperty('position')){
										datimLatitude = datimEntry.resource.position.latitude
										datimLongitude = datimEntry.resource.position.longitude
									}
									var datimParents = []
									var datimParentNames = []
									var datimMappedParentNames = []
									var entityParent = null
									var me = this
									function modifyParents (parents,callback) {
										datimParents = parents
										//lets make sure that we use the mapped parent for comparing against MOH
										async.eachSeries(parents,(parent,nxtParent)=>{
											me.matchStatus(mcsdMapped,parent.id,(mapped)=>{
												if(mapped) {
													var mappedPar = mapped.resource.identifier.find((identifier)=>{
														if (identifier.system == 'http://geoalign.datim.org/MOH') {
															var mohParId = identifier.value.split('/').pop()
															var found = mohParents.find((parent)=>{
																if(parent.id === mohParId){
																	datimMappedParentNames.push(parent.text)
																	return parent.text
																}
															})
														}
														return found
													})
													datimParentNames.push(parent.text)
													return nxtParent()
												}
												else {
													datimMappedParentNames.push(parent.text)
													datimParentNames.push(parent.text)
													return nxtParent()
												}
											})
										},()=>{
											return callback()
										})
									}
									if(datimEntry.resource.hasOwnProperty("partOf")){
										entityParent = datimEntry.resource.partOf.reference
									}
									
									mcsd.getLocationParentsFromData(entityParent,mcsdDatimAll,"all",(parents)=>{
										modifyParents(parents,()=>{
										if (mohParentNames[0] != datimMappedParentNames[0]) {
											return datimCallback()
										}
										//get distance between the coordinates
										if(datimLatitude && datimLongitude){
											var dist = geodist({datimLatitude,datimLongitude},{mohLatitude,mohLongitude},{exact:false,unit:"miles"})
										}
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
												parents:datimParentNames,
												lat:datimLatitude,
												long:datimLongitude,
												geoDistance:dist,
												id:datimEntry.resource.id
											}
											thisRanking.potentialMatches = {}
											//msg = {mohId,datimId:datimEntry.resource.id,topOrgId:datimTopId,recoLevel,totalLevels,type:'match'}
											//save.send(msg)
											mcsd.saveMatch(mohId,datimEntry.resource.id,datimTopId,recoLevel,totalLevels,'match',()=>{

											})
											return datimCallback()
										}
										else {
											lev = levenshtein.get(datimName,mohName)
											//if names mathes exactly and the two has same parents then this is an exact match
											var parentsEquals = false
											if(mohParentNames.length >0 && datimMappedParentNames.length > 0){
												parentsEquals = mohParentNames[0] == datimMappedParentNames[0]
											}
											if(lev == 0 && parentsEquals){
												thisRanking.exactMatch = {
													name:datimName,
													parents:datimParentNames,
													lat:datimLatitude,
													long:datimLongitude,
													geoDistance:dist,
													id:datimEntry.resource.id
												}
												thisRanking.potentialMatches = {}
												//msg = {mohId,datimId:datimEntry.resource.id,topOrgId:datimTopId,recoLevel,totalLevels,type:'match'}
											  //save.send(msg)
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
														parents:datimParentNames,
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
															parents:datimParentNames,
															lat:datimLatitude,
															long:datimLongitude,
															geoDistance:dist,
															id:datimEntry.resource.id
														})
													}
												}
											}
											return datimCallback()
										}
										})
									})
								})
							},()=>{
								scoreResults.push(thisRanking)
								return mohCallback()
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
			if(mcsdMapped.length === 0 || !mcsdMapped) {
				return callback()
			}
			var status = mcsdMapped.entry.find((entry)=>{
				return entry.resource.id == id || (entry.resource.hasOwnProperty('identifier') && entry.resource.identifier.find((identifier)=>{
					return identifier.value == id
				}))
			})
			return callback(status)
		},
		getUnmatched:function(mcsdDatimAll,mcsdDatim,topOrgId,callback){
			var database = config.getConf("mapping:dbPrefix") + topOrgId
			var unmatched = []
			async.each(mcsdDatim.entry,(datimEntry,datimCallback)=>{
				mcsd.getLocationByID(database,datimEntry.resource.id,false,(location)=>{
					if(location.entry.length == 0){
						var name = datimEntry.resource.name
						var id = datimEntry.resource.id
						var entityParent = null
						if(datimEntry.resource.hasOwnProperty('partOf')){
							entityParent = datimEntry.resource.partOf.reference
						}
						mcsd.getLocationParentsFromData(entityParent,mcsdDatimAll,"names",(datimParents)=>{
							unmatched.push({
								id: id,
								name: name,
								parents: datimParents
							})
							return datimCallback()
						})
					}
					else{
						return datimCallback()
					}
				})
			},()=>{
				callback(unmatched)
			})
		}

	}
}