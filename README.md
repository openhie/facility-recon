# Facility Reconciliation Tool
This tool enables matching of facility lists including nested lists and with a pluggable architecture to enable a myriad of data sources and matching algorithms.

## Features
* Both automatic and manual matching, including monitoring the status of existing matches.
* Backend engine using [FHIR](https://www.hl7.org/fhir/location.html)) Location resources based on the [mCSD](http://wiki.ihe.net/index.php/Mobile_Care_Services_Discovery_(mCSD)) profile.
* Modular system to extend algorithms for matching.
* CSV and mCSD as data sources with others to be supported in the near future.
* User management through DHIS2.

## Quickstart
### Frontend
```sh
cd facility-recon-gui
npm install
npm run dev
```
### Backen
```sh
cd facility-recon-backend
npm install
node lib/index.js
```
```
---
```

## Contributing and Community
* Please do not hesitate to open a GitHub issue! 
* Please join the OpenHIE [Facility Registry Community](https://wiki.ohie.org/display/SUB/Facility+Registry+Community) for open monthly discussions and the Facility Registry [Google Group](https://groups.google.com/forum/#!forum/facility-registry) for announcements and discussions.

## License
The Facility Reconciliation Tool is distributed under the Apache 2.0 license.
