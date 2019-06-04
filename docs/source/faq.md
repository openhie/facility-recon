# FAQ

### Is there an API?

The tool uses a FHIR server, [Hearth](https://github.com/jembi/hearth) for persistent storage. Hearth uses MongoDB for its storage layer. 

To obtain data sources and reconciled sources a user with access to the underlying stack can make queries to MongoDB or to the FHIR-based REST API for Hearth. There is no authentication for the raw access in this manner.

### Can this tool be used in education or agriculture?

Yes! The tool was first created for the health sector and uses the [FHIR](https://www.hl7.org/fhir/overview.html) standard based on the [mCSD](https://wiki.ihe.net/index.php/Mobile_Care_Services_Discovery_(mCSD)) IHE profile.

Any hierarchical location list can potentially be supported. The backend representation can be exported in CSV and others may be added as use cases dictate.

### Does the tool clean the source data?

No. The tool takes a pair of sources and uses automatic and manual methods to identify matches. If there are corrections needed, the tool can export a CSV or FHIR representation of what was and was not matched. The data sources have to be cleaned outside of the tool.

If this is a feature for your use case, please get in touch.

### Can I run the tool on my own PC?

The tool is comprised of four components: the app itself, Redis as an in-memory database for performance, the Hearth FHIR server, and MongoDB which is used by both Hearth for storing resources and the app for managing state.

The tool is designed to be hosted on a server, either locally or in the cloud. The tool supports user management and is meant to be available for many users to collaborate on matching facility lists. Server installation is the recommended way to deploy the tool.

Docker is not recommended as by default it will not persist the data, meaning that when you stop Docker you lose your data. This can be changed by mounting a volume to store data. But, the tool is meant as a platform for multiple users to collaborate on matching. It can be deployed on a server using Docker but the administrator should be careful to mount a volume to ensure data persistence.

Developers may install the stack directly but this is not for production.



