# Ansible (CentOS only)

To use Ansible, your SSH public key should be in `.ssh/authorized_keys` on the remote host and you must also create an /etc/ansible/hosts or similar with the IP address or hostname of the remote host. An `ansible/hosts` file that has an entry for localhost and one server would be:

```sh
[local]
localhost ansible_connection=local

[servers]
172.16.174.137
```

## Installation

> Note: Prerequisites and app installation via Ansible is currently only available for CentOS.

```sh
# prerequisites: redis, mongo, and node
ansible-playbook -i /usr/local/etc/ansible/hosts prep_centos.yaml
# prepare hearth, backend, frontend, and prepare the DHIS2 web application
ansible-playbook -i /usr/local/etc/ansible/hosts install_centos.yaml
# install into systemd and begin the hearth and backend services
ansible-playbook -i /usr/local/etc/ansible/hosts services.yaml
```

### Troubeshooting

* Check that all processes are running
```
ansible-playbook -i /usr/local/etc/ansible/hosts troubleshoot.yaml
```

* Basic status
```
systemctl status mongod.service
systemctl status redis.service
systemctl status facility-recon-backend.service
systemctl status facility-recon-hearth.service
```

* Logs
```
journalctl -u facility-recon-backend.service -b
journalctl -u facility-recon-hearth.service -b
journalctl -u mongod.service -b
journalctl -u redis.service -b
```

* Restart services
```
systemctl restart facility-recon-backend.service
systemctl restart facility-recon-hearth.service
```

* Restart databases
```
systemctl restart mongod.service
systemctl restart redis.service
```

