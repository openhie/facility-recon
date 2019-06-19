# About

The tool was built by the international development community for the initial use case of supporing a monitoring and evaluation platform for multiple countries. The tool was first created in the .NET framework.

This version of the tool was created in an open framework in order to create a larger community around it and ensure long-term contributions from the community as well as to add new features.

The initial use cases have been centered on the health sector. It is built using the emerging [FHIR](https://www.hl7.org/fhir/overview.html) standard based on the [mCSD](https://wiki.ihe.net/index.php/Mobile_Care_Services_Discovery_(mCSD)) IHE profile. The backend is a FHIR server which means that a FHIR-compliant API is available from server for operations. All data sources are converted to FHIR [Location Resources](https://www.hl7.org/fhir/location.html). This means that ordinary FHIR REST API queries can be pursued against the backend server.

In the future, the tool may easily support any hierarchical or flat data, both in and outside of the health sector. Matching algorithms, new data sources, and export formats can be created to meet a variety of use cases as the community requires.