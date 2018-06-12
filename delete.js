var resource = {}
resource.identifier = []
resource.identifier.push({"system":"gofr.org","value":"Wow"})
partOf = {"helo":"ww"}
resource.physicalType = {
    "coding":[
                {
                  "code": "jdn",
                  "display": "Jurisdiction",
                  "system": "http://hl7.org/fhir/location-physical-type"
                }
              ]
  }
console.log(JSON.stringify(resource))
