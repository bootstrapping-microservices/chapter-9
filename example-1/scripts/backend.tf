terraform {
    # Uncomment this to get it running in the CD pipeline.
    # backend "azurerm" {
    #     resource_group_name  = "<your-resource-group>"
    #     storage_account_name = "<your-storage-acount>"
    #     container_name       = "terraform"
    #     key                  = "terraform.tfstate"
    # }
}