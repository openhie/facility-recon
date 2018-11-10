#!/usr/bin/env bash
set -ex

# this only works for vagrant ubuntu instances (localhost)
# --forks 1 to stop hosts checking on first run: https://github.com/ansible/ansible/issues/25068
ansible-playbook -i /usr/local/etc/ansible/hosts user.yaml --forks 1
ansible-playbook -i /usr/local/etc/ansible/hosts prep_ubuntu.yaml -e user=facility-recon
ansible-playbook -i /usr/local/etc/ansible/hosts install.yaml -e user=facility-recon
ansible-playbook -i /usr/local/etc/ansible/hosts services.yaml -e user=facility-recon
ansible-playbook -i /usr/local/etc/ansible/hosts standalone.yaml -e user=facility-recon
ansible-playbook -i /usr/local/etc/ansible/hosts troubleshoot.yaml -e user=facility-recon
