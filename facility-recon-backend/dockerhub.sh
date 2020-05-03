#!/usr/bin/env bash
set -ex

# automate tagging with the short commit hash
docker build --no-cache -t intrahealth/facility-registry:$(git rev-parse --short HEAD) .
docker tag intrahealth/facility-registry:$(git rev-parse --short HEAD) intrahealth/facility-registry
docker push intrahealth/facility-registry:$(git rev-parse --short HEAD)
docker push intrahealth/facility-registry:latest