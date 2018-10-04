const nconf = require('nconf')
const http = require('http')
const https = require('https')
const url = require('url')

http.globalAgent.maxSockets = 32
https.globalAgent.maxSockets = 32

function usage() {
    process.stdout.write("Usage " + process.argv[0] + " " + process.argv[1] + " [--help] [--config <FILE>] [--reset-time] [--full]\n")
    process.stdout.write("       --help            Display this message and exit.\n")
    process.stdout.write("       --config <FILE>   Load from given configuration file.\n")
    process.stdout.write("       --reset-time      Reset last exported time and exit.\n")
    process.stdout.write("       --full            Ignore the last exported time.\n")
    process.exit(0)
}

nconf.argv().file( { file: (nconf.get("config") ? nconf.get("config") : './loadDHIS2MetadataConfig.json' ) } )


if ( nconf.get("help") ) {
    usage();
}

const dhis2URL = url.parse( nconf.get('dhis2:url') )
const auth = 'Basic ' + Buffer.from( nconf.get('dhis2:user') + ':' + nconf.get('dhis2:pass') ).toString('base64')

var thisRunTime = new Date().toISOString()

if ( nconf.get("reset-time") ) {

    process.stdout.write("Attempting to reset time on " + nconf.get("dhis2:url") + "\n")

    let req = (dhis2URL.protocol == 'https:' ? https : http).request({
        hostname: dhis2URL.hostname,
        port: dhis2URL.port,
        path: dhis2URL.path + '/api/dataStore/CSD-Loader-Last-Export/' + nconf.get("ilr:doc"),
        headers: {
            Authorization: auth
        },
        method: 'DELETE'
    }, (res) => {
        console.log('STATUS: '+res.statusCode)
        console.log('HEADERS: ' +JSON.stringify(res.headers,null,2))
        res.on('end', () => {
        })
        res.on('error', (e) => {
            console.log('ERROR: ' +e.message)
        })
    }).end()

} else {

    processMetaData();
    
}

async function processMetaData() {

    let hasKey = await checkLoaderDataStore()
    let lastUpdate = false
    if ( !nconf.get("full") && hasKey ) {
        lastUpdate = await getLastUpdate()
        // Convert to yyyy-mm-dd format (dropping time as it is ignored by DHIS2)
        try {
            lastUpdate = new Date(Date.parse(lastUpdate)).toISOString().substr(0, 10)
        } catch(err) {
            console.log(err)
        };
    }

    let uflag = 'false'
    if ( nconf.get('dhis2:dousers') ) {
        uflag = 'true'
    }
    let sflag = 'false'
    if ( nconf.get('dhis2:doservices') ) {
        sflag = 'true'
    }

    const metadataOpts = [
        'assumeTrue=false',
        'organisationUnits=true',
        'organisationUnitGroups=true',
        'organisationUnitLevels=true',
        'organisationUnitGroupSets=true',
        "categoryOptions="+sflag,
        "optionSets="+sflag,
        "dataElementGroupSets="+sflag,
        "categoryOptionGroupSets="+sflag,
        "categoryCombos="+sflag,
        "options="+sflag,
        "categoryOptionCombos="+sflag,
        "dataSets="+sflag,
        "dataElementGroups="+sflag,
        "dataElements="+sflag,
        "categoryOptionGroups="+sflag,
        "categories="+sflag,
        "users="+uflag,
        "userGroups="+uflag,
        "userRoles="+uflag,
    ]

    if ( lastUpdate ) {
        metadataOpts.push( "filter=lastUpdated:gt:"+lastUpdate )
    }

    console.log( "GETTING "+dhis2URL.protocol+"//"+dhis2URL.hostname+":"+dhis2URL.port+dhis2URL.path+"/api/metadata.json?" 
        +metadataOpts.join('&') )
    let req = (dhis2URL.protocol == 'https:' ? https : http).request({
        hostname: dhis2URL.hostname,
        port: dhis2URL.port,
        path: dhis2URL.path + '/api/metadata.json?' + metadataOpts.join('&'),
        headers: {
            Authorization: auth
        },
        method: 'GET'
    }, (res) => {
        console.log('STATUS: '+res.statusCode)
        console.log('HEADERS: ' +JSON.stringify(res.headers,null,2))
        var body = ''
        res.on('data', (chunk) => {
            body += chunk
        })
        res.on('end', () => {
            let metadata = JSON.parse(body);
            processOrgUnit( metadata, 0, metadata.organisationUnits.length, hasKey )
        })
        res.on('error', (e) => {
            console.log('ERROR: ' +e.message)
        })
    }).end()
}

function processOrgUnit( metadata, i, max, hasKey ) {
    org = metadata.organisationUnits[i]
    console.log("Processing ("+i+"/"+max+") "+org.id)
    let fhir = {
        resourceType: 'Location',
        id: org.id,
        status: "active",
        mode: "instance"
    }
    fhir.identifier = [
        { system: "http://dhis2.org/code",
            value: org.code },
        { system: "http://dhis2.org/id",
            value: org.id }
    ]
    fhir.meta = { 
        lastUpdated: org.lastUpdated
    }
    let path = org.path.split('/')
    let level = metadata.organisationUnitLevels.find( x => x.level == path.length-1 )
    fhir.meta.tag = [
        { 
            system: "http://test.geoalign.datim.org/organistionUnitLevels",
            code: level.id,
            display: level.name
        }
    ]
    fhir.name = org.name
    fhir.alias = [ org.shortName ]
    if ( metadata.organisationUnits.find( x => x.parent && x.parent.id && x.parent.id == org.id ) ) {
        fhir.physicalType = {
            coding: [
                { system: "http://hl7.org/fhir/location-physical-type",
                    code: "area",
                    display: "Area",
                }
            ],
            text: "Administrative Area"
        }
    } else {
        fhir.physicalType = {
            coding: [
                { system: "http://hl7.org/fhir/location-physical-type",
                    code: "bu",
                    display: "Building",
                }
            ],
            text: "Facility"
        }
    }

    if ( org.featureType == 'POINT' && org.coordinates ) {
        try {
            coords = JSON.parse( org.coordinates )
            fhir.position = {
                longitude: coords[1],
                latitude: coords[0]
            }
        } catch( e ) {
            console.log("Failed to load coordinates. "+e.message)
        }
    }
    if ( org.parent ) {
        fhir.partOf = { reference: "Location/" + org.parent.id }
    }
    if ( org.attributeValues ) {
        for( let attr of org.attributeValues ) {
            if ( attr.attribute.id == 'XxZsKNpu4nB' ) {
                fhir.identifier.push( {
                    system: "http://dhis2.org/mohid",
                    value: attr.value
                } )
            }
            if ( attr.attribute.id == 'Ed6SCy0OXfx' ) {
                fhir.identifier.push( {
                    system: "http://dhis2.org/mohcode",
                    value: attr.value
                } )
            }
        }
    }

    const ilrURL = url.parse( nconf.get('ilr:url') )
    const ilrAuth = 'Basic ' + Buffer.from( nconf.get('ilr:user') + ':' + nconf.get('ilr:pass') ).toString('base64')

    console.log("Sending FHIR to " +ilrURL.hostname+" "+ilrURL.port+" "+ilrURL.path+"/Location/"+fhir.id)
    let req = (ilrURL.protocol == 'https:' ? https : http).request({
        hostname: ilrURL.hostname,
        port: ilrURL.port,
        path: ilrURL.path + '/Location/'+ fhir.id,
        headers: {
            'Content-Type': 'application/fhir+json'
            //Authorization: ilrAuth
        },
        method: 'PUT'
    }, (res) => {
        console.log('STATUS: '+res.statusCode)
        console.log('HEADERS: '+JSON.stringify(res.headers))
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
        console.log("REQ ERROR: "+e.message)
    })
    req.write(JSON.stringify(fhir))
    req.end()

    if ( ++i < max ) {
        // Had to do it this way to free up the event loop
        // so the request can go out before the entire
        // data set is processed.
        setTimeout( () => { processOrgUnit( metadata, i, max, hasKey ) }, 0 )
    } else {
        setLastUpdate( hasKey, thisRunTime )
    }

}


function checkLoaderDataStore() {
    return new Promise( (resolve,reject) => {
        let req = (dhis2URL.protocol == 'https:' ? https : http).request({
            hostname: dhis2URL.hostname,
            port: dhis2URL.port,
            path: dhis2URL.path + '/api/dataStore/CSD-Loader-Last-Export/' + nconf.get("ilr:doc"),
            headers: {
                Authorization: auth
            },
            method: 'GET'
        })
        req.on('response', (res) => {
            console.log('STATUS: '+res.statusCode)
            console.log('HEADERS: ' +JSON.stringify(res.headers,null,2))
            if ( res.statusCode == 200 || res.statusCode == 201 ) {
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
    return new Promise( (resolve,reject) => {
        let req = (dhis2URL.protocol == 'https:' ? https : http).request({
            hostname: dhis2URL.hostname,
            port: dhis2URL.port,
            path: dhis2URL.path + '/api/dataStore/CSD-Loader-Last-Export/' + nconf.get("ilr:doc"),
            headers: {
                Authorization: auth
            },
            method: 'GET'
        })
        req.on('response', (res) => {
            console.log('STATUS: '+res.statusCode)
            console.log('HEADERS: ' +JSON.stringify(res.headers,null,2))
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
                console.log('ERROR: ' +e.message)
                reject(e)
            })
        })
        req.on('error', (err) => {
            reject(err)
        })
        req.end()
    })
}

function setLastUpdate( hasKey, lastUpdate ) {
    let req = (dhis2URL.protocol == 'https:' ? https : http).request({
        hostname: dhis2URL.hostname,
        port: dhis2URL.port,
        path: dhis2URL.path + '/api/dataStore/CSD-Loader-Last-Export/' + nconf.get("ilr:doc"),
        headers: {
            Authorization: auth,
            "Content-Type": "application/json"
        },
        method: (hasKey ? 'PUT' : 'POST')
    }, (res) => {
        console.log('STATUS: '+res.statusCode)
        console.log('HEADERS: ' +JSON.stringify(res.headers,null,2))
        if ( res.statusCode == 200 || res.statusCode == 201 ) {
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
            console.log('ERROR: ' +e.message)
        })
    })
    let payload = { value: lastUpdate }
    req.write(JSON.stringify(payload)) 
    req.end()
}


