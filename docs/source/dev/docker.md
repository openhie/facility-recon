# Quickstart with Docker

The fastest way to get started is to use Docker Compose which runs all components: app, Redis, MongoDB, and the Hearth FHIR server.

Clone the repo and start the docker apps.
```
git clone https://github.com/openhie/facility-recon.git
cd facility-recon
docker-compose up
```

Visit: http://localhost:3000

The default admin user is `root@gofr.org` and pass is `gofr`. A different admin users should immediately be created, the default deleted, and ordinary users added as well.

