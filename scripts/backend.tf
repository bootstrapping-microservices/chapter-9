terraform {
    backend "azurerm" {
        resource_group_name  = "terraform"
        storage_account_name = "terraform"
        container_name       = "terraform"
        key                  = "terraform.tfstate"
    }
}