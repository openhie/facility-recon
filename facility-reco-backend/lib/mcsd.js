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
    getLocations:function(source,topOrgId,totalLevels,callback){
      //if its MOH,fetch everything
      if(source == "MOH") {
        var mcsd = {}
        mcsd.entry = []
        var url = URI(config.getConf("mCSD:url")).segment(topOrgId).segment('fhir').segment('Location') + '?_count=500'.toString()
        async.doWhilst(
          function(callback){
            var options = {
              url: url
            }
            url = false
            request.get(options, (err, res, body) => {
              body = JSON.parse(body)
              mcsd.entry = mcsd.entry.concat(body.entry)
              var link = body.link.find((link)=>{
                return link.relation == "next"
              })
              if(link)
              url = link.url
              return callback(false,url)
            })
          },
          function(){
            return (url!=false)
          },
          function(){
            return callback(mcsd)
          }
        )
      }
      else{
        const database = config.getConf("mCSD:database")
        var url = URI(config.getConf("mCSD:url")).segment(database).segment('fhir').segment('Location') + "?partof=Location/" + topOrgId.toString()
        var mcsd = {}
        mcsd.entry = []
        var hierarchy = [topOrgId]
        function getLoc(url,mcsd,callback) {
          var options = {
            url: url
          }
          request.get(options, (err, res, body) => {
            body = JSON.parse(body)
            mcsd.entry = mcsd.entry.concat(body.entry)

            const promises = []
            if(body.total == 0)
              return callback(mcsd)
            body.entry.forEach((entry)=>{
              promises.push(new Promise((resolve,reject)=>{
                var parent = entry.resource.partOf.reference
                var element = hierarchy.find((element)=>{
                  if(element.toString().endsWith(parent.replace('Location/',''))){
                    return element
                  }
                })
                var newElement = element + "=>" + entry.resource.id
                hierarchy.push(newElement)
                if(newElement.split("=>").length == totalLevels){
                  return resolve()
                }
                if(entry.resource.hasOwnProperty("id") && 
                  entry.resource.id != false &&
                  entry.resource.id != null &&
                  entry.resource.id != undefined){
                  var entityID = entry.resource.id
                  var url = URI(config.getConf("mCSD:url")).segment(database).segment('fhir').segment('Location') + "?partof=Location/" + entityID.toString()
                  getLoc(url,mcsd,(storage)=>{
                    resolve()
                  })
                }
                else
                  resolve()
              }))
            })
            
            Promise.all(promises).then(()=>{
              return callback(mcsd)
            }).catch((err)=>{
              winston.error(err)
            })
          })
        }

        getLoc(url,mcsd,(mcsd)=>{
          var url = URI(config.getConf("mCSD:url")).segment(database).segment('fhir').segment('Location') + "?_id=" + topOrgId.toString()
          var options = {
            url: url
          }
          request.get(options, (err, res, body) => {
            body = JSON.parse(body)
            mcsd.entry = mcsd.entry.concat(body.entry)
            callback(mcsd)
          })
        })
      }
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
              var UUID = uuid5(name,namespace+level)

              var topLevels = Array.apply(null, {length: levelNumber}).map(Number.call, Number)
              //removing zero as levels starts from 1
              topLevels.splice(0,1)
              topLevels.reverse()
              var parentFound = false
              var parentUUID = null
              var parent = null
              if(!facilityParent){
                facilityParent = name
                facilityParentUUID = UUID
              }
              async.eachSeries(topLevels,(topLevel,nxtTopLevel)=>{
                var topLevel = 'level' + topLevel
                if(data[headerMapping[topLevel]] != "" && parentFound == false){
                  parent = data[headerMapping[topLevel]]
                  parentUUID = uuid5(parent,namespace+topLevel)
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
            this.translateToJurisdiction(jurisdictions,(resources)=>{
              fhir.entry = fhir.entry.concat(resources)
            })
          })

          var facilityName = data[headerMapping.facility]
          var UUID = uuid5(data[headerMapping.code],namespace+'ID')
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
      var me = this
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
          this.getParentsFromDB(source,database,reference,topOrg,'all',(parents)=>{
          //this.getParentsFromData(reference,mcsd,'all',(parents)=>{
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
        if(treeElements.text == parent.text){
          treeElements.children.push(item)
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
        if(element.text == item.text){
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
    },

    /*
      This function finds parents of an entity by fetching data from DB
    */
    getParentsFromDB:function(source,database,entityParent,topOrg,details,callback) {
      var sourceEntityID = entityParent
      const parents = []
      function getPar(entityParent,callback){
        if(entityParent == null || entityParent == false || entityParent == undefined){
          winston.error("Error " + entityParent)
          winston.error(JSON.stringify(mcsdEntry))
          return callback(parents)
        }

        var splParent = entityParent.split("/")
        entityParent = splParent[(splParent.length-1)]
        var url = URI(config.getConf("mCSD:url")).segment(database).segment('fhir').segment('Location') + "?_id=" + entityParent.toString()
        /*
        if(source == "MOH")
          var url = URI(config.getConf("mCSDMOH:url")).segment('Location') + "?_id=" + entityParent.toString()
        else if(source == "DATIM")
          var url = URI(config.getConf("mCSDDATIM:url")).segment('Location') + "?_id=" + entityParent.toString()
        */

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
            return callback(parents)
          }
          //if this is a topOrg then end here,we dont need to fetch the upper org which is continent i.e Africa
          if(topOrg && sourceEntityID.endsWith(topOrg)){
            return callback(parents) 
          }

          if(entityParent){
            getPar(entityParent,(parents)=>{
              callback(parents)
            })
          }
          else
            return callback(parents)
        }
        else{
        request.get(options, (err, res, body) => {
          try {
            body = JSON.parse(body)  
          } catch(e) {
            winston.error(e)
            winston.error(JSON.stringify(parents))
            return callback(parents)
          }
          
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
            return callback(parents)
          }

          //if this is a topOrg then end here,we dont need to fetch the upper org which is continent i.e Africa
          if(topOrg && sourceEntityID.endsWith(topOrg)){
            return callback(parents) 
          }

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
    getParentsFromData:function(entityParent,mcsd,details,callback){
      const parents = []
      function getPar(parents,entityParent,callback){
        if(entityParent == null || entityParent == false || entityParent == undefined){
          winston.error("Error " + entityParent)
          winston.error(JSON.stringify(mcsdEntry))
          return callback(parents)
        }

        var splParent = entityParent.split("/")
        entityParent = splParent[(splParent.length-1)]
        const promises = []
        mcsd.entry.forEach((entry)=>{
          promises.push(new Promise((resolve,reject)=>{
            var long = null
            var lat = null
            if(entry.resource.hasOwnProperty('position')){
              long = entry.resource.position.longitude
              lat = entry.resource.position.latitude
            }
            if(entry.resource.id == entityParent) {
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
                getPar(parents,entityParent,(parents)=>{
                  return callback(parents)
                })
              }
              else
                return callback(parents)
            }
            else if(entry.resource.hasOwnProperty(identifier) && Object.keys(entry.resource.identifier).length>0){
              var identifier = entry.resource.identifier.find((identifier)=>{
                if(identifier.value == entityParent || identifier.value == "Location/" + entityParent)
                  return true
                else return false
              })
              if(identifier) {
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
                  getPar(parents,entityParent,(parents)=>{
                    return callback(parents)
                  })
                }
                else
                  return callback(parents)
              }
              else {
                //return callback(parents)
                resolve()
              }
            }
            else {
              return resolve()
            }
          }))
        })

        Promise.all(promises).then(()=>{
          return callback(parents)
        }).catch((err)=>{
          winston.error(err)
        })
      }
      getPar(parents,entityParent,(parents)=>{
        return callback(parents)
      })
    }
  }
}