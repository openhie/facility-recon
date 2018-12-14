# FAQ

### Is there an API?

The tool uses a FHIR server, [Hearth](https://github.com/jembi/hearth) for persistent storage. Hearth uses MongoDB for its storage layer. 

To obtain data sources and reconciled sources a user with access to the underlying stack can make queries to MongoDB or to the FHIR-based REST API for Hearth. There is no authentication for the raw access in this manner.