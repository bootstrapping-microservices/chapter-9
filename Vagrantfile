# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|
  config.vm.box = "ubuntu/xenial64"

  config.vm.network "forwarded_port", guest: 4000, host: 4000 # For the gateway / front-end.
  config.vm.network "forwarded_port", guest: 8001, host: 8001 # For the Kubernetes dashboard.

  config.vm.provision "shell", path: "provision-dev-vm.sh"
end
