# DHIS2sync script

The script can be run with these options:
 
```
Usage: node loadDHIS2Metadata.js [--help] [--config <FILE>] [--reset-time] [--full]
       --help            Display this message and exit.
       --config <FILE>   Load from given configuration file.
       --reset-time      Reset last exported time and exit.
       --full            Ignore the last exported time.
```
A sample configuration file is in loadDHIS2MetadataConfig.json:
 
```json
{
  "ilr": {
    "url": "http://localhost:3447/fhir",
    "user": "",
    "pass": "",
    "doc": ""
  },
  "dhis2": {
    "url": "https://play.dhis2.org/2.30",
    "user": "admin",
    "pass": "district",
    "dousers": false,
    "doservices": true
  }
}
```

The script can be invoked with:
```sh
node loadDHIS2Metadata.js
```

This will get all locations in the DHIS2 demo system for version 2.30, and put them into the FHIR server. To confirm:
```
curl http://localhost:3447/fhir/Location
```

The ilr:doc is the name used for the datastore in DHIS2 to manage the timestamp.