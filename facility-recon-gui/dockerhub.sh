#!/usr/bin/env bash
set -ex

# assuming a git pull already done
# need to update packages and build. 
npm install
node build/build.js

# automate tagging with the short commit hash
docker build -f Dockerfile-http-server --no-cache -t openhie/facility-recon-gui:$(git rev-parse --short HEAD) .
docker tag openhie/facility-recon-gui:$(git rev-parse --short HEAD) openhie/facility-recon-gui
docker push openhie/facility-recon-gui:$(git rev-parse --short HEAD)
docker push openhie/facility-recon-gui:latest