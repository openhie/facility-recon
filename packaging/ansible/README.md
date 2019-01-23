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

A example playbook is provided to show how to create a `fr` user with sudo permissions using Ansible to be used with VM. See `/packaging` for Terraform (Digital Ocean) and Vagrant (CentOS 7 and Ubuntu 18) for working examples.

Create a VM. Make sure to include a public ssh key for the user who will install prerequisites.

Create the `fr` user and gives it sudo access:
```sh
ansible-playbook -i /usr/local/etc/ansible/hosts user.yaml
```

As necessary, add additional ssh keys to the user `fr`. (Ensure that the user's public key is available on github, ie. https://github.com/citizenrich.keys):
```
ansible-playbook -i /usr/local/etc/ansible/hosts keys.yaml
```

## Installation

Prerequisites: git, redis, mongo, nodejs, native build pkgs for node:
```sh 
# for centos
ansible-playbook -i /usr/local/etc/ansible/hosts prep_centos.yaml
# for ubuntu
ansible-playbook -i /usr/local/etc/ansible/hosts prep_ubuntu.yaml
```

Install the services and load and start them in systemd:
```
# prepare hearth and the app
ansible-playbook -i /usr/local/etc/ansible/hosts install.yaml
# install into systemd and begin the hearth and backend services
ansible-playbook -i /usr/local/etc/ansible/hosts services.yaml
```

## Troubleshooting

Check that all processes are running and see the latest status for hearth and the backend:
```
ansible-playbook -i /usr/local/etc/ansible/hosts troubleshoot.yaml
```

## Upgrades

Rerunning the `install` playbook updates intrahealth/hearth and app repos on the remote server. Rerunning the `services.yaml` playbook updates services. Services are restarted (not just reloaded).

The `install.yaml` playbook uses:
* `git pull` to get the latest updates to the master branch.
* `npm install` to update packages.


#### Basic status
```
# on centos, use `mongod`
systemctl status mongod.service
# on ubuntu,use `mongodb`
systemctl status mongodb.service
systemctl status redis.service
systemctl status facility-recon.service
systemctl status hearth.service
```

#### Logs
```
# on centos, use `mongod`
journalctl -u mongod.service -b
# on ubuntu,use `mongodb`
journalctl -u mongodb.service -b
journalctl -u facility-recon.service -b
journalctl -u hearth.service -b
journalctl -u redis.service -b
```

#### Restart services
```
sudo systemctl restart facility-recon.service
sudo systemctl restart hearth.service
```

#### Restart databases
```
# on centos, use `mongod`
sudo systemctl restart mongod.service
# on ubuntu,use `mongodb`
sudo systemctl restart mongodb.service
sudo systemctl restart redis.service
```

### Networking

Ensure processes are listening on the correct ports:
See https://serverfault.com/questions/725262/what-causes-the-connection-refused-message
```
# gui: 8080, backend: 3000, hearth: 3447, mongo: 27017, redis: 6379
sudo netstat -tnlp | grep :8080
sudo netstat -tnlp | grep :3000
sudo netstat -tnlp | grep :3447
sudo netstat -tnlp | grep :27017
sudo netstat -tnlp | grep :6379
```

Check for firewall blocks. Rerun the gui and:
```
sudo tcpdump -n icmp 
```