'use strict'
require('./init')
const config = require('./config')
const request = require('request')
const URI = require('urijs')
const uuid5 = require('uuid/v5')
const winston = require('winston')
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
    }
  }
}