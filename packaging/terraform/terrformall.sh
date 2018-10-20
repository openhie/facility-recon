#!/usr/bin/env bash
set -ex

# this only works for ubuntu instances in do
terraform destroy -force || true
terraform init
terraform apply --auto-approve

