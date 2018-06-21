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
        var sourceURL = URI(config.getConf("mCSDMOH:url")).segment('Location').toString()
      else if(source == "DATIM")
        var sourceURL = URI(config.getConf("mCSDDATIM:url")).segment('Location').toString()

      sourceURL = urlTool.parse(sourceURL)
      var url = sourceURL
      var mcsd = {}
      mcsd.entry = []
      var count = 0
      var me = this
      async.doWhilst(
        function(callback){
          count++
          var options = {
            url: url.protocol + '//' + url.host + url.path
          }
          request.get(options, (err, res, body) => {
            body = JSON.parse(body)
            mcsd.entry = mcsd.entry.concat(body.entry)
            console.log(Object.keys(mcsd.entry).length)
            const promises = []
            body.link.forEach((link)=>{
              promises.push(new Promise((resolve,reject)=>{
                if(link.relation == 'next'){
                  url = link.url
                  url = urlTool.parse(url)
                  url.port = sourceURL.port
                  url.host = sourceURL.host
                  if(count == 3)
                    url = false
                  return callback(false,url)
                }
                else
                  resolve(false)
              }))
            })

            Promise.all(promises).then((urls)=>{
              url = false
              return callback(false,url)
            }).catch((err)=>{
              console.log(err)
            })
          })
        },
        function(){
          return (url!=false)
        },
        function(){
          me.getChildren(source,mcsd,parentOrgid,(mcsdDATIM)=>{
            return callback(err,mcsd)
          })
        }
      )
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
          var UUID = uuid5(data.MOH_Facility_ID,namespace+"ID")
          var building = {
                          id:UUID,
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
      resource.id = building.id
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
      const datimPromises = []
      let tree = []
      var me = this
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
          mcsd.getParents(reference,source,'all',(parents)=>{
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
    getParents:function(reference,source,details,callback){
      const parents = []
      var nextParent = false
      async.doWhilst(
        function(callback){
          winston.error(reference)
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
                  if(details == "all")
                    parents.push({text:body.entry[0].resource.name,id:body.entry[0].resource.id})
                  else if(details == "id")
                    parents.push(body.entry[0].resource.id)
                  else if(details == "names")
                    parents.push(body.entry[0].resource.name)
                  else
                    winston.error("parent details (either id,names or all) to be returned not specified")
                }
                if(body.total == 1 && body.entry[0].length>0 && body.entry[0].resource.hasOwnProperty("partOf") && body.entry[0].resource.partOf.display != ""){
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
              if(details == "all")
                parents.push({text:body.entry[0].resource.name,id:body.entry[0].resource.id})
              else if(details == "id")
                parents.push(body.entry[0].resource.id)
              else if(details == "names")
                parents.push(body.entry[0].resource.name)
              else
                winston.error("parent details (either id,names or all) to be returned not specified")
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
    },
    getChildren:function(source,mcsd,orgid,callback){
      var children = {}
      children.resourceType = mcsd.resourceType
      children.id = mcsd.id
      children.meta = mcsd.meta
      children.type = mcsd.type
      children.entry = []
      const promises = []
      mcsd.entry.forEach((mcsdEntry)=>{
        promises.push(new Promise((resolve,reject)=>{
          if(mcsdEntry.resource.hasOwnProperty('partOf'))
            var reference = mcsdEntry.resource.partOf.reference
          if(!reference && mcsdEntry.resource.id == orgid){
            children.entry.push(mcsdEntry)
            resolve()
            return
          }
          this.getParents(reference,'DATIM','id',(parents)=>{
            if(parents.includes(orgid))
              children.entry.push(mcsdEntry)
            resolve()
          })
        }))
      })

      Promise.all(promises).then(()=>{
        winston.error(JSON.stringify(children,null,2))
      }).catch((err)=>{
        winston.error(err)
      })
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