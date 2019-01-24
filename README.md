# Facility Reconciliation Tool

https://facility-recon.readthedocs.io/en/latest/

This tool enables matching of facility lists between different sources. It has a pluggable architecture to enable a myriad of data sources and matching algorithms.

## Features
* CSV, DHIS2, and FHIR servers as data sources.
* Both automatic and manual matching, including monitoring the status of existing matches.
* Supports nested lists, ie. facilities that are administrative hierarchies like state->county->hospital.
* An API and backend engine that use [FHIR](https://www.hl7.org/fhir/location.html)) Location resources based on the [mCSD](http://wiki.ihe.net/index.php/Mobile_Care_Services_Discovery_(mCSD)) profile.
* Modular system to extend algorithms for matching.

## Contributing and Community
* Please do not hesitate to open a GitHub issue! 
* Please join the OpenHIE [Facility Registry Community](https://wiki.ohie.org/display/SUB/Facility+Registry+Community) for open monthly discussions and the Facility Registry [Google Group](https://groups.google.com/forum/#!forum/facility-registry) for announcements and discussions.

## License
The Facility Reconciliation Tool is distributed under the Apache 2.0 license.
