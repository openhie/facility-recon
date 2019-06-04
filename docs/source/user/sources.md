# Data Sources

*Note that there is a quick start in this documentation on how to upload CSV.*

The tool supports CSV as a file source, as well as remote connections to DHIS2 and FHIR servers.

Data Fields | Required | Optional | Notes |
--- | --- | --- | --- |
*CSV* | facility name, ID | administrative levels, longitude and latitude | Column names in the first row, UTF-8 encoding |
*FHIR server* | location name, ID | `partOf` locations (administrative levels) | |
*DHIS2 instance* | org unit name, ID | org units (administrative levels) | |

## Upload CSV

The CSV file should have columns names in the first row of the file. Empty lines should be removed. The CSV file should be encoded as Unicode (utf-8) as that is what is used internally in the backend. If some entities are encoded in another format then matches that appear to be the same may not match as expected.

Latitude and longitude are optional columns. If they are included they will be used to facilitate manual matching but they are not used or required for automatic matching.

Once uploaded, in the View tab, CSV entries can be edited. Any edits do not modify the original data source but the edits will be exported after reconciliation.

## Select Levels

The user may choose any levels in their hierarchy to include but they must be ordered with the top most level first. 

It is also possible to select no levels to match on a flat list with no hierarchy. To do so, don't select levels.

## Remote Servers -- DHIS2 or FHIR

The tool supports remote sources. Any DHIS2 or FHIR server can be used as a source if the user has credentials to access it.

Extensive compatibility testing has not been performed but DHIS2 versions >=2.22 should be supported. Please contact the maintainers if there is an issue.

FHIR is supported for STU3 and R4 support is anticipated. Other FHIR servers may be added in future versions of the tool, such as the HAPI FHIR server.