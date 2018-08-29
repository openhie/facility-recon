# Provision on Digital Ocean

> This process is not yet suitable for production.

* Manually create a droplet. Make sure to include a public ssh key before creation. You should be able to ssh as root if they public key was set correctly (this is the default of DO).

* Run the playbook. It creates the user for facility-recon and gives it sudo access.
```sh
ansible-playbook -i /usr/local/etc/ansible/hosts user.yaml
```



