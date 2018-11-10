# Vagrant

This an in-progress creation of a base box for end-to-end testing of facility recon using Vagrant and Ansible. It is not complete.

The CentOS version is copied and modified from the BAO Systems DHIS2-CentOS [Vagrantfile](https://github.com/baosystems/dhis2-centos).

To use just change directory into the OS (CentOS or Ubuntu) you want to use and fire it up.
```sh
cd ubuntu
vagrant up
```


## Troubleshooting

* For cleaning up, note that Vagrant boxes are stored in `~/.vagrant.d/boxes`.
* [macOS] If there is a port conflict error for ssh, then clear out port forwarding entry for 2222 in `/Library/Preferences/VMware Fusion/networking` and `/Library/Preferences/VMware Fusion/vmnet8/nat.conf`