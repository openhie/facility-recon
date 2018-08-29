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
```

Stop here and `cd $HOME/hearth && npm install` through ssh:
```sh
cd $HOME/hearth && npm install
```

Continue:
```
# install into systemd and begin the hearth, frontend and backend services
ansible-playbook -i /usr/local/etc/ansible/hosts services.yaml
# double-check all processes are running
ansible-playbook -i /usr/local/etc/ansible/hosts troubleshoot.yaml
```

### Troubeshooting

* Restart services

```
systemctl restart facility-recon-backend.service
systemctl restart facility-recon-frontend.service
systemctl restart facility-recon-hearth.service
```

* Restart databases
```
systemctl restart mongod.service
systemctl restart redis.service
```

* Logs: for systemd, the mongo service role is in: `/usr/lib/systemd/system`. The redis service is in `/etc/systemd/system`.

```
# basic messages
systemctl status service-name
# current boot only
journalctl -u service-name.service -b
```