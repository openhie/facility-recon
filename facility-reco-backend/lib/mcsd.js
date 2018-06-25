'use strict'
require('./init')
const config = require('./config')
const request = require('request')
const URI = require('urijs')
const urlTool = require('url')
const uuid5 = require('uuid/v5')
const winston = require('winston')
const async = require('async')
const csv = require('fast-csv')
var cache = require('memory-cache');

module.exports = function () {
  return{
    getLocationByID:function(database,id,callback){
      var url = URI(config.getConf("mCSD:url")).segment(database).segment('fhir').segment('Location') + "?_id=" + id.toString()
      var options = {
        url: url
      }
      let cachedData = cache.get('getLocationByID' + url)
      if(cachedData){
        return callback(cachedData)
      }
      request.get(options, (err, res, body) => {
        var cacheData = JSON.parse(body)
        cache.put('getLocationByID' + url,cacheData,120*1000)
        return callback(cacheData)
      })
    },

    getLocationChildren(database,topOrgId,callback){
      var url = URI(config.getConf("mCSD:url")).segment(database).segment('fhir').segment('Location').segment(topOrgId).segment('$hierarchy').toString()
      var options = {
        url: url
      }
      request.get(options, (err, res, body1) => {
        var url = URI(config.getConf("mCSD:url")).segment(database).segment('fhir').segment('Location') + "?_id=" + topOrgId.toString()
        var options = {
          url: url
        }
        request.get(options, (err, res, body2) => {
          body1 = JSON.parse(body1)
          body2 = JSON.parse(body2)
          body1.entry = body1.entry.concat(body2.entry)
          callback(body1)
        })
      })
    },
    /*
      This function finds parents of an entity by fetching data from DB
    */
    getLocationParentsFromDB:function(source,database,entityParent,topOrg,details,callback) {
      var sourceEntityID = entityParent
      const parents = []
      var me = this
      function getPar(entityParent,callback){
        if(entityParent == null || entityParent == false || entityParent == undefined){
          winston.error("Error " + entityParent)
          winston.error(JSON.stringify(mcsdEntry))
          return callback(parents)
        }

        var splParent = entityParent.split("/")
        entityParent = splParent[(splParent.length-1)]
        var url = URI(config.getConf("mCSD:url")).segment(database).segment('fhir').segment('Location') + "?_id=" + entityParent.toString()

        var options = {
          url: url
        }

        let cachedData = cache.get(url)
        if(cachedData) {
          var entityParent = cachedData.entityParent
          if(details == "all")
            parents.push({text:cachedData.text,id:cachedData.id,lat:cachedData.lat,long:cachedData.long})
          else if(details == "id")
            parents.push(cachedData.id)
          else if(details == "names")
            parents.push(cachedData.text)
          else
            winston.error("parent details (either id,names or all) to be returned not specified")

          //if this is a topOrg then end here,we dont need to fetch the upper org which is continent i.e Africa
          if(entityParent && topOrg && entityParent.endsWith(topOrg)){
            me.getLocationByID(database,topOrg,(loc)=>{
              if(details == "all")
                parents.push({text:loc.entry[0].resource.name,id:topOrg,lat:cachedData.lat,long:cachedData.long})
              else if(details == "id")
                parents.push(loc.entry[0].resource.id)
              else if(details == "names")
                parents.push(loc.entry[0].resource.name)
              return callback(parents)
            })
          }
          //if this is a topOrg then end here,we dont need to fetch the upper org which is continent i.e Africa
          else if(topOrg && sourceEntityID.endsWith(topOrg)){
            return callback(parents) 
          }
          else {
            if(entityParent){
            getPar(entityParent,(parents)=>{
              callback(parents)
            })
          }
          else
            return callback(parents)
          }
        }
        else{
          request.get(options, (err, res, body) => {
            body = JSON.parse(body)
            var long = null
            var lat = null
            if(body.entry[0].resource.hasOwnProperty('position')){
              long = body.entry[0].resource.position.longitude
              lat = body.entry[0].resource.position.latitude
            }
            var entityParent = null
            if(body.entry[0].resource.hasOwnProperty("partOf"))
              entityParent = body.entry[0].resource.partOf.reference

            var cacheData = {text:body.entry[0].resource.name,id:body.entry[0].resource.id,lat:lat,long:long,entityParent:entityParent}
            cache.put(url,cacheData,120*1000)
            if(details == "all")
              parents.push({text:body.entry[0].resource.name,id:body.entry[0].resource.id,lat:lat,long:long})
            else if(details == "id")
              parents.push(body.entry[0].resource.id)
            else if(details == "names")
              parents.push(body.entry[0].resource.name)
            else
              winston.error("parent details (either id,names or all) to be returned not specified")

            //stop after we reach the topOrg which is the country
            var entityID = body.entry[0].resource.id
            //if this is a topOrg then end here,we dont need to fetch the upper org which is continent i.e Africa
            if(entityParent && topOrg && entityParent.endsWith(topOrg)){
              me.getLocationByID(database,topOrg,(loc)=>{
                if(details == "all")
                  parents.push({text:loc.entry[0].resource.name,id:topOrg,lat:lat,long:long})
                else if(details == "id")
                  parents.push(loc.entry[0].resource.id)
                else if(details == "names")
                  parents.push(loc.entry[0].resource.name)
                return callback(parents)
              })
            }

            //if this is a topOrg then end here,we dont need to fetch the upper org which is continent i.e Africa
            else if(topOrg && sourceEntityID.endsWith(topOrg)){
              return callback(parents) 
            }

            else {
              if(body.entry[0].resource.hasOwnProperty("partOf") && 
                body.entry[0].resource.partOf.reference != false &&
                body.entry[0].resource.partOf.reference != null &&
                body.entry[0].resource.partOf.reference != undefined){
                var entityParent = body.entry[0].resource.partOf.reference
                getPar(entityParent,(parents)=>{
                  callback(parents)
                })
              }
              else
                callback(parents)
            }
          })
        }
      }
      getPar(entityParent,(parents)=>{
        return callback(parents)
      })
    },

    /*
    This function finds parents of an entity from passed mCSD data
    */
    getLocationParentsFromData:function(entityParent,mcsd,details,callback){
      const parents = []
      function filter(entityParent,callback){
        var splParent = entityParent.split("/")
        entityParent = splParent[(splParent.length-1)]

        var entry = mcsd.entry.find((entry)=>{
          return entry.resource.id == entityParent
        })
        
        if(entry){
          var long = null
          var lat = null
          if(entry.resource.hasOwnProperty('position')){
            long = entry.resource.position.longitude
            lat = entry.resource.position.latitude
          }
          var oldEntityParent = entityParent
          var entityParent = null
          if(entry.resource.hasOwnProperty("partOf"))
            entityParent = entry.resource.partOf.reference

          if(details == "all")
          parents.push({text:entry.resource.name,id:entry.resource.id,lat:lat,long:long})
          else if(details == "id")
            parents.push(entry.resource.id)
          else if(details == "names")
            parents.push(entry.resource.name)
          else
            winston.error("parent details (either id,names or all) to be returned not specified")

          if(entry.resource.hasOwnProperty("partOf") && 
            entry.resource.partOf.reference != false &&
            entry.resource.partOf.reference != null &&
            entry.resource.partOf.reference != undefined){
            entityParent = entry.resource.partOf.reference
            filter(entityParent,(parents)=>{
              return callback(parents)
            })
          }
          else
            return callback(parents)
        }
        else
          return callback(parents)
      }

      filter(entityParent,(parents)=>{
        return callback(parents)
      })
    },

    /*
    if totalLevels is set then this functions returns all locations from level 1 to level totalLevels
    if levelNumber is set then it returns locations at level levelNumber only
    if buildings is set then it returns all buildings
    buildings argument accepts a building level
    */
    filterLocations:function(mcsd,topOrgId,totalLevels,levelNumber,buildings,callback){
      //holds all entities for a maximum of x Levels defined by the variable totalLevels i.e all entities at level 1,2 and 3
      var mcsdTotalLevels = {}
      //holds all entities for just one level,specified by variable levelNumber i.e all entities at level 1 or at level 2
      var mcsdlevelNumber = {}
      //holds buildings only
      var mcsdBuildings = {}
      mcsdTotalLevels.entry = []
      mcsdlevelNumber.entry = []
      mcsdBuildings.entry = []
      if(!mcsd.hasOwnProperty('entry') || mcsd.entry.length == 0){
        return callback(mcsdTotalLevels,mcsdlevelNumber,mcsdBuildings)
      }
      var entry = mcsd.entry.find((entry)=>{
          return entry.resource.id == topOrgId
      })
      if(levelNumber == 1){
        mcsdlevelNumber.entry = mcsdlevelNumber.entry.concat(entry)
      }
      if(totalLevels){
        mcsdTotalLevels.entry = mcsdTotalLevels.entry.concat(entry)
      }

      var building = entry.resource.physicalType.coding.find((coding)=>{
        return coding.code == 'building'
      })

      if(building){
        mcsdBuildings.entry = mcsdBuildings.entry.concat(entry)
      }

      function filter(id,callback){
        var res =  mcsd.entry.filter((entry)=>{
            if(entry.resource.hasOwnProperty('partOf')){
              return entry.resource.partOf.reference.endsWith(id)
            }
          })
        return callback(res)
      }

      var totalLoops = 0
      if(totalLevels >= levelNumber && totalLevels >= buildings){
        totalLoops = totalLevels
      }
      else if(levelNumber >= totalLevels && levelNumber >= buildings){
        totalLoops = levelNumber
      }
      else if(buildings >= totalLevels && buildings >= levelNumber){
        totalLoops = buildings
      }

      var tmpArr = []
      tmpArr.push(entry)
      totalLoops = Array.from(new Array(totalLoops-1),(val,index)=>index+1)
      async.eachSeries(totalLoops,(loop,nxtLoop)=>{
        var totalElements = 0
        const promises = []
        tmpArr.forEach((arr)=>{
          promises.push(new Promise((resolve,reject)=>{
            filter(arr.resource.id,(res)=>{
              tmpArr = tmpArr.concat(res)
              if(totalLevels){
                mcsdTotalLevels.entry = mcsdTotalLevels.entry.concat(res)
              }
              if(levelNumber == loop+1){
                mcsdlevelNumber.entry = mcsdlevelNumber.entry.concat(res)
              }
              const promises1 = []
              for(var k in res){
                promises1.push(new Promise((resolve1,reject1)=>{
                  var building = res[k].resource.physicalType.coding.find((coding)=>{
                    if(building){
                      mcsdBuildings.entry = mcsdBuildings.entry.concat(entry)
                    }
                  })
                  resolve1()
                }))
              }
              Promise.all(promises1).then(()=>{
                totalElements++
                resolve()
              }).catch((err)=>{
                winston.error(err)
              })
            })
          }))
        })
        Promise.all(promises).then(()=>{
          tmpArr.splice(0,totalElements)
          return nxtLoop()
        }).catch((err)=>{
          winston.error(err)
        })
      },function(){
        callback(mcsdTotalLevels,mcsdlevelNumber,mcsdBuildings)
      })
    },

    countLevels:function(source,topOrgId,callback){
      const database = config.getConf("mCSD:database")
      if(source == "MOH")
        var url = URI(config.getConf("mCSD:url")).segment(topOrgId).segment('fhir').segment('Location') + "?partof=Location/" + topOrgId.toString()
      else if(source == "DATIM")
        var url = URI(config.getConf("mCSD:url")).segment(database).segment('fhir').segment('Location') + "?partof=Location/" + topOrgId.toString()

      var totalLevels = 1
      function cntLvls(url,callback) {
        var options = {
          url: url
        }
        request.get(options, (err, res, body) => {
          body = JSON.parse(body)
          if(body.total == 0)
            return callback(totalLevels)
          var counter = 0
          async.eachSeries(body.entry,(entry,nxtEntry)=>{
            if(entry.resource.name.startsWith('_') || counter > 0){
              return nxtEntry()
            }
            totalLevels++
            counter++
            if(entry.resource.hasOwnProperty("id") && 
              entry.resource.id != false &&
              entry.resource.id != null &&
              entry.resource.id != undefined){
              var reference = entry.resource.id

              if(source == "MOH")
                var url = URI(config.getConf("mCSD:url")).segment(topOrgId).segment('fhir').segment('Location') + "?partof=Location/" + reference.toString()
              else if(source == "DATIM")
                var url = URI(config.getConf("mCSD:url")).segment(database).segment('fhir').segment('Location') + "?partof=Location/" + reference.toString()
              cntLvls(url,(totalLevels)=>{
                return callback(totalLevels)
              })
            }
            else
              return callback(totalLevels)
          },function(){
            return callback(totalLevels)
          })
        })
      }
      cntLvls(url,(totalLevels)=>{
        return callback(false,totalLevels)
      })
    },
    saveLocations:function(mCSD,orgid,callback){
      let url = URI(config.getConf("mCSD:url")).segment(orgid).segment('fhir').toString()
      var options = {
        url: url.toString(),
        headers: {
          'Content-Type': 'application/json'
        },
        json:mCSD
      }
      request.post(options, function (err, res, body) {
        if(err){
          winston.error(err)
          return callback(err)
        }
        winston.info("Data saved successfully")
        callback(err,body)
      })
    },
    CSVTomCSD: function(filePath,headerMapping,callback){
      var namespace = config.getConf("UUID:namespace")
      var levels = config.getConf("levels")
      var orgid = headerMapping.orgid
      var orgname = headerMapping.orgname
      var countryUUID = uuid5(orgid,namespace+'000')
      var fhir = {}
      fhir.type = "document"
      fhir.entry = []
      var processed = []
      csv
        .fromPath(filePath,{ignoreEmpty: true,headers : true})
        .on("data",(data)=>{
          var jurisdictions = []

          const promises = []
          levels.sort()
          levels.reverse()
          var facilityParent = null
          var facilityParentUUID = null
          async.eachSeries(levels,(level,nxtLevel)=>{
            if(data[headerMapping[level]] != null && data[headerMapping[level]] != undefined && data[headerMapping[level]] != false) {
              var name = data[headerMapping[level]]
              var levelNumber = level.replace('level','')
              if(levelNumber.toString().length < 2){
                var namespaceMod = namespace + '00' + levelNumber
              }
              else{
                var namespaceMod = namespace + '0' + levelNumber
              }
              var UUID = uuid5(name,namespaceMod)
              var topLevels = Array.apply(null, {length: levelNumber}).map(Number.call, Number)
              //removing zero as levels starts from 1
              topLevels.splice(0,1)
              topLevels.reverse()
              var parentFound = false
              var parentUUID = null
              var parent = null
              if(levelNumber == 1){
                parent = orgname
                parentUUID = countryUUID
              }

              if(!facilityParent){
                facilityParent = name
                facilityParentUUID = UUID
              }
              async.eachSeries(topLevels,(topLevel,nxtTopLevel)=>{
                var topLevelName = 'level' + topLevel
                if(data[headerMapping[topLevelName]] != "" && parentFound == false){
                  parent = data[headerMapping[topLevelName]]
                  if(topLevel.toString().length < 2){
                    var namespaceMod = namespace + '00' + topLevel
                  }
                  else{
                    var namespaceMod = namespace + '0' + topLevel
                  }
                  parentUUID = uuid5(parent,namespaceMod)
                  parentFound = true
                }
                nxtTopLevel()
              },()=>{
                if(!processed.includes(UUID)){
                  jurisdictions.push({name:name,parent:parent,uuid:UUID,parentUUID:parentUUID})
                  processed.push(UUID)
                }
                nxtLevel()
              })
            }
            else {
              nxtLevel()
            }
          },()=>{
            jurisdictions.push({name:orgname,parent:null,uuid:countryUUID,parentUUID:null})
            this.translateToJurisdiction(jurisdictions,(resources)=>{
              fhir.entry = fhir.entry.concat(resources)
            })
          })

          var facilityName = data[headerMapping.facility]
          var UUID = uuid5(data[headerMapping.code],namespace+'100')
          var building = {
            uuid:UUID,
            id:data[headerMapping.code],
            name:facilityName,
            lat:data[headerMapping.lat],
            long:data[headerMapping.long],
            parent:facilityParent,
            parentUUID:facilityParentUUID
          }
          this.translateToBuilding(building,(resources)=>{
            fhir.entry = fhir.entry.concat(resources)
          })          
        })
        .on("end",()=>{
            return callback(fhir)
        })
    },

    translateToJurisdiction:function(jurisdictions,callback){
      const promises = []
      var entry = []
      jurisdictions.forEach((jurisdiction)=>{
        promises.push(new Promise((resolve,reject)=>{
          var resource = {}
          resource.resourceType = "Location"
          resource.name = jurisdiction.name
          resource.status = "active"
          resource.mode = "instance"
          resource.id = jurisdiction.uuid
          resource.identifier = []
          resource.identifier.push({"system":"gofr.org","value":jurisdiction.uuid})
          if(jurisdiction.parentUUID)
            resource.partOf = {"display":jurisdiction.parent,"reference":"Location/" + jurisdiction.parentUUID}
          resource.physicalType = {
            "coding":[
                        {
                          "code": "jdn",
                          "display": "Jurisdiction",
                          "system": "http://hl7.org/fhir/location-physical-type"
                        }
                      ]
          }
          entry.push({"resource":resource})
          resolve()
        }))
      })

      Promise.all(promises).then(()=>{
        return callback(entry)
      }).catch((reason)=>{
        winston.error(reason)
      })
    },

    translateToBuilding:function(building,callback){
      var entry = []
      var resource = {}
      resource.resourceType = "Location"
      resource.status = "active"
      resource.mode = "instance"
      resource.name = building.name
      resource.id = building.uuid
      resource.identifier = []
      resource.identifier.push({"system":"gofr.org","value":building.id})
      resource.partOf = {"display":building.parent,"reference":"Location/" + building.parentUUID}
      resource.physicalType = {
        "coding":[
                    {
                      "code": "bu",
                      "display": "Building",
                      "system": "http://hl7.org/fhir/location-physical-type"
                    }
                  ]
      }
      resource.position = {
        "longitude":building.long,
        "latitude":building.lat
      }
      entry.push({"resource":resource})
      return callback(entry)
    },

    createTree: function(mcsd,source,database,topOrg,callback){
      const datimPromises = []
      let tree = []
      async.eachSeries(mcsd.entry,(mcsdEntry,nxtMCSDEntry)=>{
        var long = null
        var lat = null
        if(mcsdEntry.resource.hasOwnProperty('position')){
          long = mcsdEntry.resource.position.longitude
          lat = mcsdEntry.resource.position.latitude
        }
        if(mcsdEntry.resource.id == topOrg){
          return nxtMCSDEntry()
        }
        if(!mcsdEntry.resource.hasOwnProperty('partOf')){
          var parent = {text:mcsdEntry.resource.name,id:mcsdEntry.resource.id,lat:lat,long:long,children:[]}

          this.inTree(tree,parent,(exist)=>{
            if(!exist){
              tree.push(parent)
            }
            return nxtMCSDEntry()
          })
        }
        else {
          var reference = mcsdEntry.resource.partOf.reference
          var currentItem = {text:mcsdEntry.resource.name,id:mcsdEntry.resource.id,lat:lat,long:long,children:[]}
          this.getLocationParentsFromData(reference,mcsd,'all',(parents)=>{
            parents.reverse()
            //push the current element on top of the list
            parents.push(currentItem)
            async.eachOfSeries(parents,(parent,key,nextParent)=>{
              this.inTree(tree,parent,(exist)=>{
                //if not saved and has no parent i.e key = 0
                parent.children = []
                if(!exist && key == 0) {
                  tree.push(parent)
                  return nextParent()
                }
                else if(!exist) {
                  var grandParent = parents[key-1]
                  this.addToTree(tree,parent,grandParent)
                  return nextParent()
                }
                else
                  return nextParent()
              })
            },()=>{
              return nxtMCSDEntry()
            })
          })
        }
      },function(){
        return callback(tree)
      })
    },
    addToTree:function(tree,item,parent){
      tree.forEach((treeElements)=>{
        if(treeElements.id == parent.id){
          treeElements.children.push(item)
          return
        }
        else
          this.addToTree(treeElements.children,item,parent)
      })
    },
    inTree:function(tree,item,callback){
      if(Object.keys(tree).length == 0){
        return callback(false)
      }
      async.eachSeries(tree,(element,nxtEl)=>{
        if(element.id == item.id){
          return callback(true)
        }
        else {
          this.inTree(element.children,item,(found)=>{
            if(found)
              return callback(true)
            else
              return nxtEl()
          })
        }
      },()=>{
        return callback(false)
      })
    }
  }
}