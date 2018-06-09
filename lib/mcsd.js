'use strict'
require('./init')
const config = require('./config')
const request = require('request')
const URI = require('urijs')
const uuid5 = require('uuid/v5')
const winston = require('winston')
const async = require('async')
const csv = require('fast-csv')

module.exports = function () {
  return{
    getLocations:function(source,callback){
      if(source == "MOH")
        var url = URI(config.getConf("mCSDMOH:url")).segment('Location').toString()
      else if(source == "DATIM")
        var url = URI(config.getConf("mCSDDATIM:url")).segment('Location').toString()
      var options = {
        url: url.toString()
      }
      request.get(options, (err, res, body) => {
        return callback(err,body)
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
    CSVTomCSD: function(filePath,callback){
      var namespace = config.getConf("UUID:namespace")
      var fhir = {}
      fhir.resourceType = "Bundle"
      fhir.type = "document"
      fhir.entry = []
      var processed = []
      csv
        .fromPath(filePath,{ignoreEmpty: true,headers : true})
        .on("data",(data)=>{
          var jurisdictions = []
          if(data.District != ""){
            var districtName = data.District
            var districtParent = null
            var parentType = null
            if(data.Zone != ""){
              districtParent = data.Zone
              parentType = "zone"
            }
            else{
              districtParent = data.Region
              parentType = "region"
            }

            var UUID = uuid5(districtName,namespace+"district")
            var parentUUID = null
            if(districtParent !="")
              parentUUID = uuid5(districtParent,namespace+parentType)

            if(!processed.includes(UUID)){
              jurisdictions.push({name:districtName,parent:districtParent,uuid:UUID,parentUUID:parentUUID})
              processed.push(UUID)
            }
          }

          if(data.Zone != ""){
            var zoneName = data.Zone
            var zoneParent = null
            zoneParent = data.Region
            var UUID = uuid5(zoneName,namespace+"zone")
            var parentUUID = null
            if(zoneParent !="")
              parentUUID = uuid5(zoneParent,namespace+"region")

            if(!processed.includes(UUID)){
              jurisdictions.push({name:zoneName,parent:zoneParent,uuid:UUID,parentUUID:parentUUID})
              processed.push(UUID)
            }
          }

          if(data.Region != ""){
            var regionName = data.Region
            var UUID = uuid5(regionName,namespace+"region")
            if(!processed.includes(UUID)){
              jurisdictions.push({name:regionName,uuid:UUID})
              processed.push(UUID)
            }
          }

          var facilityParent = null
          if(data.District != ""){
            facilityParent = data.District
            parentType = "district"
          }
          else if(data.Zone != ""){
            facilityParent = data.Zone
            parentType = "zone"
          }
          else{
            facilityParent = data.Region
            parentType = "region"
          }
          var parentUUID = uuid5(facilityParent,namespace+parentType)
          var building = {
                          id:data.MOH_Facility_ID,
                          name:data.Site_name,
                          lat:data.Latitude,
                          long:data.Longitude,
                          parent:facilityParent,
                          parentUUID:parentUUID
                        }

          this.translateToJurisdiction(jurisdictions,(resources)=>{
            fhir.entry = fhir.entry.concat(resources)
          })
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
      resource.name = building.name
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

    createTree: function(mcsd,source){
      winston.error(JSON.stringify(mcsd,null,2))
      const datimPromises = []
      let tree = []
      async.eachSeries(mcsd.entry,(mcsdEntry,nxtMCSDEntry)=>{
        var identifier = null
        if(mcsdEntry.resource.hasOwnProperty('identifier') && Object.keys(mcsdEntry.resource.identifier).length > 0)
          identifier = mcsdEntry.resource.identifier[0].value
        if(!mcsdEntry.resource.hasOwnProperty('partOf')){
          var parent = {text:mcsdEntry.resource.name,id:identifier,children:[]}

          this.inTree(tree,parent,(exist)=>{
            if(!exist){
              tree.push(parent)
            }
            return nxtMCSDEntry()
          })
        }
        else {
          var reference = mcsdEntry.resource.partOf.reference
          var currentItem = {text:mcsdEntry.resource.name,id:identifier,children:[]}
          this.getParents(reference,source,(parents)=>{
            parents.reverse()
            //push the current element on top of the list
            parents.push(currentItem)
            async.eachOfSeries(parents,(parent,key,nextParent)=>{
              this.inTree(tree,parent,(exist)=>{
                //if not saved and has no parent i.e key = 0
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
        winston.error(JSON.stringify(tree,null,2))
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
                if(body.total == 1){
                  var identifier = null
                  if(body.entry[0].resource.hasOwnProperty('identifier') && Object.keys(body.entry[0].resource.identifier).length > 0)
                    identifier = body.entry[0].resource.identifier[0].value
                  parents.push({text:body.entry[0].resource.name,id:identifier,children:[]})
                }
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
              var identifier = null
              if(body.entry[0].resource.hasOwnProperty('identifier') && Object.keys(body.entry[0].resource.identifier).length > 0)
                identifier = body.entry[0].resource.identifier[0].value
              parents.push({text:body.entry[0].resource.name,id:identifier})

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

    /*
    getParents:function(reference,data,callback){
      const parents = []
      var nextParent = false
      async.doWhilst(
        function(callback){
          var splParent = reference.split("/")
          reference = splParent[(splParent.length-1)]

          var found = false
          async.eachSeries(data.entry,(entry,nextEntry)=>{
            if(entry.id == reference){
              found = true
              parents.push({text:entry.resource.name,id:entry.id})
              if(entry.hasOwnProperty('partOf') && entry.resource.partOf.reference != ''){
                reference = entry.resource.partOf.reference
                nextParent = true
                return callback(null,nextParent)
              }
              else{
                nextParent = false
                return callback(null,nextParent)
              }
            }
            else {
              async.eachSeries(entry.identifier,(otherid,nxtID)=>{
                if(otherid == reference){
                  found = true
                  parents.push({text:entry.resource.name,id:entry.id})
                  if(entry.hasOwnProperty('partOf') && entry.resource.partOf.reference != ''){
                    reference = entry.resource.partOf.reference
                    nextParent = true
                    return callback(null,nextParent)
                  }
                  else{
                    nextParent = false
                    return callback(null,nextParent)
                  }

                }
              })
            }
            if(found == false){
              return nextEntry()
            }
          },function(){
            if(found == false)
              nextParent = false
            else
              nextParent = true
            return callback(null,nextParent)
          })
        },
        function(){
          return nextParent!=false
        },
        function(){
          winston.error(parents)
          //return callback(parents)
        }
      )
    }
    */
  }
}