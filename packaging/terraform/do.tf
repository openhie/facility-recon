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
}

output "web" {
  value = "${digitalocean_droplet.web.ipv4_address}"
}
