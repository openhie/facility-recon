# Roadmap

Proposed features are managed in a publicly-viewable [Google Doc](https://docs.google.com/document/d/1_sBI9CMfK-K5t80cwnWLkv0iHrR0IKN987qOtOFP-d4/edit?usp=sharing) and managed in [GitHub issues](https://github.com/openhie/facility-recon/issues).

## Version: 0.1.0 

Timeline: February 2018 to July 2018, Status: Completed

### Features:
* Matching based on one uploaded data source.
* Other data source is one customized DHIS2 instance (GeoAlign).
* Preliminary DHIS2 authentication.
* Preliminary exports of matched and unmatched facilities.

## Version: 0.2.0 

Timeline: August 2018 to October 2018, Status: Completed

### Features:
* User-configurable to any data pair.
* Any DHIS2 instance for which the user has access.

**Note: Version 0.2.0 was extensively production-tested on ~80K facilities.**

## Version: 0.3.0

Timeline: November 2018 to December 2018, Status: Completed

### Features:
* User interface overhaul.

## Version: 0.4.0

Timeline: January 2019 to February 2019, Status: Completed

### Features:
* Containerization.
* Hosting scripts and utilities.

**Note: Version 0.3.0 was tested in user-centered design workshops using a cloud-hosted instance.**

## Version: 0.5.0

Timeline: March 2019 to April 2019, Status: Completed

### Features:
* Documentation on facility-recon.readthedocs.org.
* Enhanced export to show all matched and unmatched records.
* Matching enabled on Facility IDs and Geo Coordinates.

## Version: 0.6.0

Timeline: May 2019 to June 2019, Status: Completed

### Features:
* Options for external authentication (DHIS2, iHRIS)
* DHIS2 data source sharing.
* DHIS2 pair sharing.
* Easily-installable DHIS2 app.
* Configurable matching - matching based on parent constraint can be turned off

## Version: 0.7.0

Timeline: TBD, Status: In-progress

### Features:
* Preparation for 1.0 release.
* Extensive end-to-end testing.
* Bugs resolved.
* Updated FHIR version.
* Consider moving to HAPI FHIR.