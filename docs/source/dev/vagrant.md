# Vagrant

## Install

This an example using Vagrant for an Ubuntu or CentOS VM for end-to-end testing of facility recon.

To use just change directory into the OS (CentOS or Ubuntu) you want to use and fire it up.
```sh
cd ubuntu
vagrant up
```

## Troubleshooting

* For cleaning up, note that Vagrant boxes are stored in `~/.vagrant.d/boxes`.
* [macOS] If there is a port conflict error for ssh, then clear out port forwarding entry for 2222 in `/Library/Preferences/VMware\ Fusion/networking` and `/Library/Preferences/VMware\ Fusion/vmnet8/nat.conf`