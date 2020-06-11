locals {
    login_server = azurerm_container_registry.container_registry.login_server
    username = azurerm_container_registry.container_registry.admin_username
    password = azurerm_container_registry.container_registry.admin_password
    rabbit = "amqp://guest:guest@rabbit:5672"
    database = "mongodb://db:27017"
}

module "gateway-microservice" {
    source ="./modules/microservice"
    service_name = "gateway"
    service_type = "LoadBalancer"
    session_affinity = "ClientIP"
    login_server = local.login_server
    username = local.username
    password = local.password
    app_version = var.app_version
    env = {
        RABBIT: local.rabbit
    }
}

module "video-streaming-microservice" {
    source ="./modules/microservice"
    service_name = "video-streaming"
    login_server = local.login_server
    username = local.username
    password = local.password
    app_version = var.app_version
    env = {
        RABBIT: local.rabbit
    }
}

module "video-upload-microservice" {
    source ="./modules/microservice"
    service_name = "video-upload"
    login_server = local.login_server
    username = local.username
    password = local.password
    app_version = var.app_version
    env = {
        RABBIT: local.rabbit
    }
}

module "azure-storage-microservice" {
    source ="./modules/microservice"
    service_name = "azure-storage"
    dns_name = "video-storage"
    login_server = local.login_server
    username = local.username
    password = local.password
    app_version = var.app_version
    env = {
        STORAGE_ACCOUNT_NAME = "bootstrapmicroservice"
        STORAGE_ACCESS_KEY = "KJgXtq1IfIaIRuDa23iX0MOGflQkkbg+Md3dgQrgUQ3ZKPeo/Bd7M5GTJb1uv32llUgPj/z6chMHaAO3Hg+DUQ=="
    }
}

module "history-microservice" {
    source ="./modules/microservice"
    service_name = "history"
    login_server = local.login_server
    username = local.username
    password = local.password
    app_version = var.app_version
    env = {
        RABBIT: local.rabbit
        DBHOST: local.database
        DBNAME: "history"
    }
}

module "metadata-microservice" {
    source ="./modules/microservice"
    service_name = "metadata"
    login_server = local.login_server
    username = local.username
    password = local.password
    app_version = var.app_version
    env = {
        RABBIT: local.rabbit
        DBHOST: local.database
        DBNAME: "metadata"
    }
}

