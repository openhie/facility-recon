# Facility Reconciliation Tool
This tool enables matching of facility lists including nested lists and with a pluggable architecture to enable a myriad of data sources and matching algorithms.

## Features
* Both automatic and manual matching, including monitoring the status of existing matches.
* Backend engine using [FHIR](https://www.hl7.org/fhir/location.html)) Location resources based on the [mCSD](http://wiki.ihe.net/index.php/Mobile_Care_Services_Discovery_(mCSD)) profile.
* Modular system to extend algorithms for matching.
* CSV, DHIS2, and FHIR servers as data sources.

## Quickstart using Docker

The fastest way to get started is to run the GUI directly and use Docker for the other components (backend, Redis, MongoDB, Hearth FHIR server).

> The GUI and backend are separate apps. The GUI is a statically built site in the current version, so substituting values in environment variables for the backend is not possible. See the Ansible scripts for ways to install directly on remote servers that modify the backend host for the static site.

Clone the repo and start the docker apps.
```
git clone https://github.com/openhie/facility-recon.git
cd facility-recon
docker-compose up
```
Build and run the frontend.
```sh
cd facility-recon/facility-recon-gui
npm run dev
```

Visit: http://localhost:8080

The default user is `root@gofr.org` and pass is `gofr`

## Developer Instructions

### Hearth (FHIR Server) Installation

> Make sure mongo 3.6 or above is installed and running before proceeding with below instructions

```sh
git clone https://github.com/intrahealth/hearth.git
cd hearth
npm install
```
Open the config file located under config/default.json and disable authentication by setting authentication type to disabled i.e "authentication": { "type": "disabled"}

Start hearth
```sh
npm run dev:start
```


### Backend

Download the repo.
```sh
git clone https://github.com/openhie/facility-recon.git
```

```sh
cd facility-recon/facility-recon-backend
npm install
```

Install and run Redis
```
wget http://download.redis.io/redis-stable.tar.gz
tar xvzf redis-stable.tar.gz
cd redis-stable
make
redis-server
```

Run the backend
```
cd ~/facility-recon/facility-recon-backend
node lib/index.js
```

### Frontend
```sh
cd facility-recon/facility-recon-gui
npm install
npm run build
```

### DHIS2 App (Optional)
> Note that the DHIS2 app is not required for running the tool as it can be run standalone from the GUI.

* Copy the frontend build contents from facility-recon/facility-recon-gui/dist into facility-recon/dhis2App/ and then zip the content of of dhis2App
```sh
cp -r facility-recon/facility-recon-gui/dist/* facility-reco/dhis2App/
cd facility-recon/dhis2App
rm GOFR.zip
zip GOFR.zip ./*
```
Login to DHIS2 and install the zipped file (GOFR.zip)

## Contributing and Community
* Please do not hesitate to open a GitHub issue! 
* Please join the OpenHIE [Facility Registry Community](https://wiki.ohie.org/display/SUB/Facility+Registry+Community) for open monthly discussions and the Facility Registry [Google Group](https://groups.google.com/forum/#!forum/facility-registry) for announcements and discussions.

## License
The Facility Reconciliation Tool is distributed under the Apache 2.0 license.
