#!/usr/bin/env bash
set -ex

# this only works for vagrant ubuntu instances (localhost)
# --forks 1 to stop hosts checking on first run: https://github.com/ansible/ansible/issues/25068
ansible-playbook -i /usr/local/etc/ansible/hosts -e ansible_python_interpreter=python3 user.yaml --forks 1
ansible-playbook -i /usr/local/etc/ansible/hosts -e ansible_python_interpreter=python3 prep_ubuntu.yaml -e user=fr
ansible-playbook -i /usr/local/etc/ansible/hosts -e ansible_python_interpreter=python3 install.yaml -e user=fr
ansible-playbook -i /usr/local/etc/ansible/hosts -e ansible_python_interpreter=python3 services.yaml -e user=fr
ansible-playbook -i /usr/local/etc/ansible/hosts -e ansible_python_interpreter=python3 troubleshoot.yaml -e user=fr
