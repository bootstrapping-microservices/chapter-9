terraform {
    # Uncomment this to get it running in the CD pipeline.
    # backend "azurerm" {
    #     resource_group_name  = "terraform"
    #     storage_account_name = "terraform"
    #     container_name       = "terraform"
    #     key                  = "terraform.tfstate"
    # }
}