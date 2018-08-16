require('./init');
const config = require('./config');
const winston = require('winston');
const http = require('http')
const https = require('https')
const url = require('url')
const isJSON = require('is-json')
const redis = require('redis')
const redisClient = redis.createClient()

var thisRunTime = new Date().toISOString()
var credentials = {
  dhis2URL: '',
  username: '',
  password: '',
  name: ''
}

module.exports = function () {
  return {
    sync(host, username, password, name, clientId, reset, full, dousers, doservices) {
      const dhis2URL = url.parse(host)
      const auth = 'Basic ' + Buffer.from(username + ':' + password).toString('base64')
      credentials.dhis2URL = dhis2URL
      credentials.clientId = clientId
      credentials.auth = auth
      credentials.name = name

      if (reset) {

        process.stdout.write("Attempting to reset time on " + host + "\n")

        let req = (dhis2URL.protocol == 'https:' ? https : http).request({
          hostname: dhis2URL.hostname,
          port: dhis2URL.port,
          path: dhis2URL.path + '/api/dataStore/CSD-Loader-Last-Export/' + toTitleCase(name),
          headers: {
            Authorization: auth
          },
          method: 'DELETE'
        }, (res) => {
          console.log('STATUS: ' + res.statusCode)
          console.log('HEADERS: ' + JSON.stringify(res.headers, null, 2))
          res.on('end', () => {})
          res.on('error', (e) => {
            console.log('ERROR: ' + e.message)
          })
        }).end()

      } else {

        processMetaData(full, dousers, doservices);

      }
    }
  }
}

async function processMetaData(full, dousers, doservices) {
  var clientId = credentials.clientId
  var dhisSyncRequestId = `dhisSyncRequest${clientId}`
  dhisSyncRequest = JSON.stringify({
    status: `1/2 - Loading all DHIS2 data from host`,
    error: null,
    percent: null
  })
  redisClient.set(dhisSyncRequestId, dhisSyncRequest)

  let hasKey = await checkLoaderDataStore()
  let lastUpdate = false
  if (full && hasKey) {
    lastUpdate = await getLastUpdate()
    // Convert to yyyy-mm-dd format (dropping time as it is ignored by DHIS2)
    lastUpdate = new Date(Date.parse(lastUpdate)).toISOString().substr(0, 10)
  }

  let uflag = 'false'
  if (dousers) {
    uflag = 'true'
  }
  let sflag = 'false'
  if (doservices) {
    sflag = 'true'
  }

  const metadataOpts = [
    'assumeTrue=false',
    'organisationUnits=true',
    'organisationUnitGroups=true',
    'organisationUnitLevels=true',
    'organisationUnitGroupSets=true',
    "categoryOptions=" + sflag,
    "optionSets=" + sflag,
    "dataElementGroupSets=" + sflag,
    "categoryOptionGroupSets=" + sflag,
    "categoryCombos=" + sflag,
    "options=" + sflag,
    "categoryOptionCombos=" + sflag,
    "dataSets=" + sflag,
    "dataElementGroups=" + sflag,
    "dataElements=" + sflag,
    "categoryOptionGroups=" + sflag,
    "categories=" + sflag,
    "users=" + uflag,
    "userGroups=" + uflag,
    "userRoles=" + uflag,
  ]

  if (lastUpdate) {
    metadataOpts.push("filter=lastUpdated:gt:" + lastUpdate)
  }
  const dhis2URL = credentials.dhis2URL
  const auth = credentials.auth
  console.log("GETTING " + dhis2URL.protocol + "//" + dhis2URL.hostname + ":" + dhis2URL.port + dhis2URL.path + "/api/metadata.json?" +
    metadataOpts.join('&'))
  let req = (dhis2URL.protocol == 'https:' ? https : http).request({
    hostname: dhis2URL.hostname,
    port: dhis2URL.port,
    path: dhis2URL.path + '/api/metadata.json?' + metadataOpts.join('&'),
    headers: {
      Authorization: auth
    },
    method: 'GET'
  }, (res) => {
    console.log('STATUS: ' + res.statusCode)
    console.log('HEADERS: ' + JSON.stringify(res.headers, null, 2))
    var body = ''
    res.on('data', (chunk) => {
      body += chunk
    })
    res.on('end', () => {
      if (!isJSON(body)) {
        winston.error('Non JSON response received while getting DHIS2 data')
        var dhisSyncRequestId = `dhisSyncRequest${clientId}`
        dhisSyncRequest = JSON.stringify({
          status: '1/2 - Getting DHIS2 Data',
          error: 'Invalid response received while getting DHIS2 data,cross check the host name,username and password',
          percent: null
        })
        redisClient.set(dhisSyncRequestId, dhisSyncRequest)
      }
      let metadata = JSON.parse(body);
      processOrgUnit(metadata, 0, metadata.organisationUnits.length - 1, hasKey)
    })
    res.on('error', (e) => {
      winston.error('ERROR: ' + e.message)
    })
  }).end()
}

function processOrgUnit(metadata, i, max, hasKey) {
  var name = credentials.name
  const clientId = credentials.clientId
  var database = toTitleCase(name)
  org = metadata.organisationUnits[i]
  let percent = parseFloat((i * 100 / max).toFixed(2))
  winston.error(percent)
  var status = '2/2 - Saving DHIS2 locations into FHIR server'
  if (i == max) {
    status = 'Done'
  }
  const dhisSyncRequestId = `dhisSyncRequest${clientId}`
  dhisSyncRequest = JSON.stringify({
    status: status,
    error: null,
    percent: percent
  })
  redisClient.set(dhisSyncRequestId, dhisSyncRequest)

  console.log("Processing (" + i + "/" + max + ") " + org.id)
  let fhir = {
    resourceType: 'Location',
    id: org.id,
    status: "active",
    mode: "instance"
  }
  fhir.identifier = [{
      system: "http://dhis2.org/code",
      value: org.code
    },
    {
      system: "http://dhis2.org/id",
      value: org.id
    }
  ]
  fhir.meta = {
    lastUpdated: org.lastUpdated
  }
  let path = org.path.split('/')
  let level = metadata.organisationUnitLevels.find(x => x.level == path.length - 1)
  fhir.meta.tag = [{
    system: "http://test.geoalign.datim.org/organistionUnitLevels",
    code: level.id,
    display: level.name
  }]
  fhir.name = org.name
  fhir.alias = [org.shortName]
  if (metadata.organisationUnits.find(x => x.parent && x.parent.id && x.parent.id == org.id)) {
    fhir.physicalType = {
      coding: [{
        system: "http://hl7.org/fhir/location-physical-type",
        code: "area",
        display: "Area",
      }],
      text: "Administrative Area"
    }
  } else {
    fhir.physicalType = {
      coding: [{
        system: "http://hl7.org/fhir/location-physical-type",
        code: "bu",
        display: "Building",
      }],
      text: "Facility"
    }
  }

  if (org.featureType == 'POINT' && org.coordinates) {
    try {
      coords = JSON.parse(org.coordinates)
      fhir.position = {
        longitude: coords[1],
        latitude: coords[0]
      }
    } catch (e) {
      console.log("Failed to load coordinates. " + e.message)
    }
  }
  if (org.parent) {
    fhir.partOf = {
      reference: "Location/" + org.parent.id
    }
  }
  if (org.attributeValues) {
    for (let attr of org.attributeValues) {
      if (attr.attribute.id == 'XxZsKNpu4nB') {
        fhir.identifier.push({
          system: `http://dhis2.org/id`,
          value: attr.value
        })
      }
      if (attr.attribute.id == 'Ed6SCy0OXfx') {
        fhir.identifier.push({
          system: "http://dhis2.org/code",
          value: attr.value
        })
      }
    }
  }

  const ilrURL = url.parse(config.getConf('mCSD:url'))
  const ilrAuth = 'Basic ' + Buffer.from(config.getConf('ilr:username') + ':' + config.getConf('ilr:password')).toString('base64')

  console.log("Sending FHIR to " + ilrURL.hostname + " " + ilrURL.port + " " + ilrURL.path + `/${database}/fhir/Location/` + fhir.id)
  let req = (ilrURL.protocol == 'https:' ? https : http).request({
    hostname: ilrURL.hostname,
    port: ilrURL.port,
    path: ilrURL.path + `${database}/fhir/Location/` + fhir.id,
    headers: {
      'Content-Type': 'application/fhir+json'
      //Authorization: ilrAuth
    },
    method: 'PUT'
  }, (res) => {
    console.log('STATUS: ' + res.statusCode)
    console.log('HEADERS: ' + JSON.stringify(res.headers))
    var body = ''
    res.on('data', (chunk) => {
      body += chunk
    })
    res.on('end', () => {
      console.log(body)
    })
    res.on('error', (e) => {
      console.log('ERROR: ' + e.message)
    })
  })
  req.on('error', (e) => {
    console.log("REQ ERROR: " + e.message)
  })
  req.write(JSON.stringify(fhir))
  req.end()

  if (++i <= max) {
    // Had to do it this way to free up the event loop
    // so the request can go out before the entire
    // data set is processed.
    setTimeout(() => {
      processOrgUnit(metadata, i, max, hasKey)
    }, 0)
  } else {
    setLastUpdate(hasKey, thisRunTime)
  }

}


function checkLoaderDataStore() {
  var name = credentials.name
  const dhis2URL = credentials.dhis2URL
  const auth = credentials.auth
  return new Promise((resolve, reject) => {
    let req = (dhis2URL.protocol == 'https:' ? https : http).request({
      hostname: dhis2URL.hostname,
      port: dhis2URL.port,
      path: dhis2URL.path + '/api/dataStore/CSD-Loader-Last-Export/' + toTitleCase(name),
      headers: {
        Authorization: auth
      },
      method: 'GET'
    })
    req.on('response', (res) => {
      console.log('STATUS: ' + res.statusCode)
      console.log('HEADERS: ' + JSON.stringify(res.headers, null, 2))
      if (res.statusCode == 200 || res.statusCode == 201) {
        resolve(true)
      } else {
        resolve(false)
      }
    })
    req.on('error', (err) => {
      reject(err)
    })
    req.end()
  })
}

function getLastUpdate() {
  var name = credentials.name
  var dhis2URL = credentials.dhis2URL
  const auth = credentials.auth
  return new Promise((resolve, reject) => {
    let req = (dhis2URL.protocol == 'https:' ? https : http).request({
      hostname: dhis2URL.hostname,
      port: dhis2URL.port,
      path: dhis2URL.path + '/api/dataStore/CSD-Loader-Last-Export/' + toTitleCase(name),
      headers: {
        Authorization: auth
      },
      method: 'GET'
    })
    req.on('response', (res) => {
      console.log('STATUS: ' + res.statusCode)
      console.log('HEADERS: ' + JSON.stringify(res.headers, null, 2))
      let body = ''
      res.on('data', (chunk) => {
        body += chunk
      })
      res.on('end', () => {
        let dataStore = JSON.parse(body);
        console.log(dataStore)
        resolve(dataStore.value)
      })
      res.on('error', (e) => {
        console.log('ERROR: ' + e.message)
        reject(e)
      })
    })
    req.on('error', (err) => {
      reject(err)
    })
    req.end()
  })
}

function setLastUpdate(hasKey, lastUpdate) {
  var name = credentials.name
  const auth = credentials.auth
  //const dhis2URL = credentials.dhis2URL
  let req = (dhis2URL.protocol == 'https:' ? https : http).request({
    hostname: dhis2URL.hostname,
    port: dhis2URL.port,
    path: dhis2URL.path + '/api/dataStore/CSD-Loader-Last-Export/' + toTitleCase(name),
    headers: {
      Authorization: auth,
      "Content-Type": "application/json"
    },
    method: (hasKey ? 'PUT' : 'POST')
  }, (res) => {
    console.log('STATUS: ' + res.statusCode)
    console.log('HEADERS: ' + JSON.stringify(res.headers, null, 2))
    if (res.statusCode == 200 || res.statusCode == 201) {
      console.log("Last update dataStore set.")
    } else {
      console.log("Last update dataStore FAILED.")
    }
    let body = ''
    res.on('data', (chunk) => {
      body += chunk
    })
    res.on('end', () => {
      let dataStore = JSON.parse(body);
      console.log(dataStore)
    })
    res.on('error', (e) => {
      console.log('ERROR: ' + e.message)
    })
  })
  let payload = {
    value: lastUpdate
  }
  req.write(JSON.stringify(payload))
  req.end()
}

function toTitleCase(str) {
  return str.toLowerCase().split(' ').map(function (word) {
    return word.replace(word[0], word[0].toUpperCase());
  }).join('');
}