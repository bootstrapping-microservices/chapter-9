# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|
  config.vm.box = "ubuntu/xenial64"

  config.vm.network "forwarded_port", guest: 4000, host: 4000   # For the gateway / front-end.
  config.vm.network "forwarded_port", guest: 8001, host: 8001   # For the Kubernetes dashboard.
  config.vm.network "forwarded_port", guest: 27017, host: 5000  # For the MongoDB database.
  config.vm.network "forwarded_port", guest: 9000, host: 9000   # For DB fixtures REST API.

  config.vm.provision "shell", path: "./scripts/provision-dev-vm.sh"

  config.vm.provider "virtualbox" do |vb|
    vb.memory = 1024 * 4
    vb.cpus = 2
  end
end
