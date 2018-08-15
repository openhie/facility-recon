# Ansible (CentOS only)

To use Ansible, your SSH public key should be in `.ssh/authorized_keys` on the remote host and you must also create an /etc/ansible/hosts or similar with the IP address or hostname of the remote host. An `ansible/hosts` file that has an entry for localhost and one server would be:

```sh
[local]
localhost ansible_connection=local

[servers]
172.16.174.137
```
The above example includes a working example for localhost configuration.

## Installation

Prerequisites (designed for CentoOS only):
```sh
ansible-playbook -i /usr/local/etc/ansible/hosts prep_centos.yaml
```

Install the backend, frontend, and prepare the DHIS2 web application (in-progress):
```sh
ansible-playbook --ask-become-pass -i /usr/local/etc/ansible/hosts install.yaml
```

