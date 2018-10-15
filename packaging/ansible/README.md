# Ansible

> These steps are for installing on a server OS directly and require experience with remote configuration.

To use Ansible, your SSH public key should be in `.ssh/authorized_keys` on the remote host and you must also create an /etc/ansible/hosts or similar with the IP address or hostname of the remote host. An `ansible/hosts` file that has an entry for localhost and one server would be:

```sh
[local]
localhost ansible_connection=local

[servers]
172.16.174.137
```

## SSH setup

A example playbook is provided to show how to create a facility-recon user with sudo permissions using Ansible to be used with an instance like a digitalocean droplet. 

* Create a droplet. Make sure to include a public ssh key before creation. You should be able to ssh as root if the public key was set correctly (this is the default of DO).

> See the folder `terraform` for a working example to programmatically launch a server instance.

* Create the facility-recon user and gives it sudo access.
```sh
ansible-playbook -i /usr/local/etc/ansible/hosts user.yaml
```

* As necessary, add additional ssh keys to the user facility-recon:
```
ansible-playbook -i /usr/local/etc/ansible/hosts keys.yaml
```


## Installation

```sh
# prerequisites: git, redis, mongo, node, native build pkgs for node
# for centos
ansible-playbook -i /usr/local/etc/ansible/hosts prep_centos.yaml
# for ubuntu
ansible-playbook -i /usr/local/etc/ansible/hosts prep_ubuntu.yaml
```

```
# prepare hearth, backend, frontend, and prepare the DHIS2 web application
ansible-playbook -i /usr/local/etc/ansible/hosts install.yaml
# install into systemd and begin the hearth and backend services
ansible-playbook -i /usr/local/etc/ansible/hosts services.yaml
```

### Troubleshooting

* Check that all processes are running
```
ansible-playbook -i /usr/local/etc/ansible/hosts troubleshoot.yaml
```

* Basic status
```
# on centos, use `mongod`
systemctl status mongod.service
# on ubuntu,use `mongodb`
systemctl status mongodb.service
systemctl status redis.service
systemctl status facility-recon-backend.service
systemctl status facility-recon-hearth.service
```

* Logs
```
journalctl -u facility-recon-backend.service -b
journalctl -u facility-recon-hearth.service -b
# on centos, use `mongod`
journalctl -u mongod.service -b
# on ubuntu,use `mongodb`
journalctl -u mongodb.service -b
journalctl -u redis.service -b
```

* Restart services
```
systemctl restart facility-recon-backend.service
systemctl restart facility-recon-hearth.service
```

* Restart databases
```
# on centos, use `mongod`
systemctl restart mongod.service
# on ubuntu,use `mongodb`
systemctl restart mongodb.service
systemctl restart redis.service
```

