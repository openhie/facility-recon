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

> Create a droplet. Make sure to include a public ssh key before creation. You should be able to ssh as root if the public key was set correctly (this is the default of DO). See the folder `terraform` for a working example to programmatically launch a server instance.

Create the facility-recon user and gives it sudo access:
```sh
ansible-playbook -i /usr/local/etc/ansible/hosts user.yaml
```

As necessary, add additional ssh keys to the user facility-recon:
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
# prepare hearth, backend, frontend, and check for a prepared DHIS2 web application
ansible-playbook -i /usr/local/etc/ansible/hosts install.yaml
# install into systemd and begin the hearth and backend services
ansible-playbook -i /usr/local/etc/ansible/hosts services.yaml
```

## Standalone

> Note that the GUI must be built with the knowledge of the IP address of the backend server. Static sites cannot interpret dynamic variables. So, the GUI must be statically built with the backend IP or domain, it is not detected at runtime. The static IP address of the host is replaced in the ansible script.

To run the GUI in standalone mode (not through DHIS2):
```
ansible-playbook -i /usr/local/etc/ansible/hosts standalone.yaml
```

## Upgrades

Rerunning the `install` playbook updates intrahealth/hearth, the backend, and frontend repos on the remote server. Rerunning the `services.yaml` playbook updates services. Services are restarted (not just reloaded).

The `install.yaml` playbook uses:
* `git pull` to get the latest updates to the master branch.
* `npm install` to update packages.

The gui is rebuilt in the `standalone.yaml` playbook when it is rerun.

## Troubleshooting

Check that all processes are running and see the latest status for hearth and the backend:
```
ansible-playbook -i /usr/local/etc/ansible/hosts troubleshoot.yaml
```

#### Basic status
```
# on centos, use `mongod`
systemctl status mongod.service
# on ubuntu,use `mongodb`
systemctl status mongodb.service
systemctl status redis.service
systemctl status facility-recon-backend.service
systemctl status facility-recon-hearth.service
# standalone
systemctl status facility-recon-gui.service
```

#### Logs
```
journalctl -u facility-recon-backend.service -b
journalctl -u facility-recon-hearth.service -b
# standalone
journalctl -u facility-recon-gui.service -b
# on centos, use `mongod`
journalctl -u mongod.service -b
# on ubuntu,use `mongodb`
journalctl -u mongodb.service -b
journalctl -u redis.service -b
```

#### Restart services
```
systemctl restart facility-recon-backend.service
systemctl restart facility-recon-hearth.service
# standalone
systemctl restart facility-recon-gui.service
```

#### Restart databases
```
# on centos, use `mongod`
systemctl restart mongod.service
# on ubuntu,use `mongodb`
systemctl restart mongodb.service
systemctl restart redis.service
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