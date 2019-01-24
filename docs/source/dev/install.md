# Install Locally

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
