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

module.exports = function () {
  return{
    getLocations:function(source,parentOrgid,callback){
      if(source == "MOH")
        var url = URI(config.getConf("mCSDMOH:url")).segment('Location') + "?partof=Location/" + parentOrgid.toString()
      else if(source == "DATIM")
        var url = URI(config.getConf("mCSDDATIM:url")).segment('Location') + "?partof=Location/" + parentOrgid.toString()
      var mcsd = {}
      mcsd.entry = []
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
              if(entry.resource.hasOwnProperty("id") && 
                entry.resource.id != false &&
                entry.resource.id != null &&
                entry.resource.id != undefined){
                var reference = entry.resource.id
                if(source == "MOH")
                  var url = URI(config.getConf("mCSDMOH:url")).segment('Location') + "?partof=" + reference.toString()
                else if(source == "DATIM")
                  var url = URI(config.getConf("mCSDDATIM:url")).segment('Location') + "?partof=" + reference.toString()
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
        if(source == "MOH")
          var url = URI(config.getConf("mCSDMOH:url")).segment('Location') + "?_id=" + parentOrgid.toString()
        else if(source == "DATIM")
          var url = URI(config.getConf("mCSDDATIM:url")).segment('Location') + "?_id=" + parentOrgid.toString()
        var options = {
          url: url
        }
        request.get(options, (err, res, body) => {
          body = JSON.parse(body)
          mcsd.entry = mcsd.entry.concat(body.entry)
          callback(mcsd)
        })
      })
    },
    getLocations_old:function(source,parentOrgid,callback){
      if(source == "MOH")
        var sourceURL = URI(config.getConf("mCSDMOH:url")).segment('Location').toString()
      else if(source == "DATIM")
        var sourceURL = URI(config.getConf("mCSDDATIM:url")).segment('Location').toString()

      sourceURL = urlTool.parse(sourceURL)
      var url = sourceURL
      var mcsd = {}
      mcsd.entry = []
      function getLoc(url,sourceURL,mcsd,callback) {
        counter++
        var options = {
          //uncomment below line to get all facilities
          //url: url.protocol + '//' + url.host + url.path
          url: "http://localhost:3448/fhir/Location?_getpagesoffset=0&_count=2000"
        }
        request.get(options, (err, res, body) => {
          body = JSON.parse(body)
          mcsd.entry = mcsd.entry.concat(body.entry)
          winston.error(Object.keys(mcsd.entry).length)
          //delete below line to get all facilities
          return callback(mcsd)
          var next = body.link.find((link)=>{
            return link.relation == 'next'
          })
          if(next) {
            url = next.url
            url = urlTool.parse(url)
            url.port = sourceURL.port
            url.host = sourceURL.host
            getLoc(url,sourceURL,mcsd,(storage)=>{
              return callback(storage)
            })
          }
          else
            return callback(mcsd)
        })
      }
      
      getLoc(url,sourceURL,mcsd,(children)=>{
        this.getChildren(source,mcsd,parentOrgid,(mcsd)=>{
          winston.error(Object.keys(mcsd.entry).length)
          return callback(mcsd)
        })
      })

      
    },
    saveLocations:function(mCSD,callback){
      let url = URI(config.getConf("mCSDMOH:url")).toString()
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
        winston.error("Data saved successfully")
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

    createTree: function(mcsd,source,callback){
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
          this.getParents(reference,mcsd,'all',(parents)=>{
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
    getParents:function(reference,mcsd,details,callback){
      const parents = []
      function getPar(parents,reference,callback){
        if(reference == null || reference == false || reference == undefined){
          winston.error("Error " + reference)
          winston.error(JSON.stringify(mcsdEntry))
          return callback(parents)
        }

        var splParent = reference.split("/")
        reference = splParent[(splParent.length-1)]
        //winston.error(reference)
        const promises = []
        mcsd.entry.forEach((entry)=>{
          promises.push(new Promise((resolve,reject)=>{
            var long = null
            var lat = null
            if(entry.resource.hasOwnProperty('position')){
              long = entry.resource.position.longitude
              lat = entry.resource.position.latitude
            }
            if(entry.resource.id == reference) {
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
                reference = entry.resource.partOf.reference
                getPar(parents,reference,(parents)=>{
                  return callback(parents)
                })
              }
              else
                return callback(parents)
            }
            else if(entry.resource.hasOwnProperty(identifier) && Object.keys(entry.resource.identifier).length>0){
              var identifier = entry.resource.identifier.find((identifier)=>{
                if(identifier.value == reference || identifier.value == "Location/" + reference)
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
                  reference = entry.resource.partOf.reference
                  getPar(parents,reference,(parents)=>{
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
        })
      }
      getPar(parents,reference,(parents)=>{
        return callback(parents)
      })
    },
    //this function is deprecated
    getChildren:function(source,mcsd,orgid,callback){
      var children = {}
      children.resourceType = mcsd.resourceType
      children.id = mcsd.id
      children.meta = mcsd.meta
      children.type = mcsd.type
      children.entry = []
      const promises = []
      const globalParents = []
      var count = 0
      mcsd.entry.forEach((mcsdEntry)=>{
        promises.push(new Promise((resolve,reject)=>{
          if(mcsdEntry.resource.hasOwnProperty('partOf'))
            var reference = mcsdEntry.resource.partOf.reference
          if(reference != false && 
            reference != null &&
            reference != undefined &&
            mcsdEntry.resource.id == orgid){
            children.entry.push(mcsdEntry)
            resolve()
            return
          }
          else if(reference != false && 
                  reference != null &&
                  reference != undefined
          ){
            this.getParents(reference,mcsd,'id',(parents)=>{
              if(parents.includes(orgid)){
                if(!children.entry.includes(mcsdEntry))
                children.entry.push(mcsdEntry)
              }
              resolve()
            })
          }
          else
            resolve()
        }))
      })

      Promise.all(promises).then(()=>{
        return callback(children)
      }).catch((err)=>{
        winston.error(err)
      })
    }
  }
}