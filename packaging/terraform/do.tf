variable "fingerprint" { }

variable "image" { }

variable "region" { }

variable "name" { }

variable "size" { }


resource "digitalocean_droplet" "web" {
  image    = "${var.image}"
  name     = "${var.name}"
  region   = "${var.region}"
  size     = "${var.size}"
  ssh_keys = ["${var.fingerprint}"]

connection {
    user = "root"
    type = "ssh"
    private_key = "${file("~/.ssh/id_rsa")}"
    timeout = "4m"
}

# must have python for ansible
provisioner "remote-exec" {
    inline = [
      "sudo apt-get -qq update",
      "sudo apt-get -qq -y install python"
    ]
}
}

output "web" {
  value = "${digitalocean_droplet.web.ipv4_address}"
}

