#!/usr/bin/env bash
set -ex

# automate tagging with the short commit hash
docker build --no-cache -t openhie/facility-recon:$(git rev-parse --short HEAD) .
docker tag openhie/facility-recon:$(git rev-parse --short HEAD) openhie/facility-recon
docker push openhie/facility-recon:$(git rev-parse --short HEAD)
docker push openhie/facility-recon:latest