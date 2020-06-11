variable "app_version" {}
variable "service_name" {}

variable "dns_name" {
    default = ""
}

variable "login_server" {}
variable "username" {}
variable "password" {}

variable "service_type" {
    default = "ClusterIP"
}

variable "session_affinity" {
    default = ""
}

variable "env" {
    default = {}
    type = map(string)
}

locals {
    image_tag = "${var.login_server}/${var.service_name}:${var.app_version}"
}

resource "null_resource" "docker_build" {

    triggers = {
        always_run = timestamp()
    }

    provisioner "local-exec" {
        command = "docker build -t ${local.image_tag} --file ../${var.service_name}/Dockerfile-prod ../${var.service_name}"
    }
}

resource "null_resource" "docker_login" {

    depends_on = [ null_resource.docker_build ]

    triggers = {
        always_run = timestamp()
    }

    provisioner "local-exec" {
        command = "docker login ${var.login_server} --username ${var.username} --password ${var.password}"
    }
}

resource "null_resource" "docker_push" {

    depends_on = [ null_resource.docker_login ]

    triggers = {
        always_run = timestamp()
    }

    provisioner "local-exec" {
        command = "docker push ${local.image_tag}"
    }
}

locals {
    dockercreds = {
        auths = {
            "${var.login_server}" = {
                auth = base64encode("${var.username}:${var.password}")
            }
        }
    }
}

resource "kubernetes_secret" "docker_credentials" {
    metadata {
        name = "${var.service_name}-docker-credentials"
    }

    data = {
        ".dockerconfigjson" = jsonencode(local.dockercreds)
    }

    type = "kubernetes.io/dockerconfigjson"
}

resource "kubernetes_deployment" "service_deployment" {

    depends_on = [ null_resource.docker_push ]

    metadata {
        name = var.service_name

    labels = {
            pod = var.service_name
        }
    }

    spec {
        replicas = 1

        selector {
            match_labels = {
                pod = var.service_name
            }
        }

        template {
            metadata {
                labels = {
                    pod = var.service_name
                }
            }

            spec {
                container {
                    image = local.image_tag
                    name  = var.service_name

                    env {
                        name = "PORT"
                        value = "80"
                    }

                    dynamic "env" {
                        for_each = var.env
                        content {
                          name = env.key
                          value = env.value
                        }
                    }
               }

                image_pull_secrets {
                    name = kubernetes_secret.docker_credentials.metadata[0].name
                }
            }
        }
    }
}

resource "kubernetes_service" "service" {
    metadata {
        name = var.dns_name != "" ? var.dns_name : var.service_name
    }

    spec {
        selector = {
            pod = kubernetes_deployment.service_deployment.metadata[0].labels.pod
        }   

        session_affinity = var.session_affinity

        port {
            port        = 80
            target_port = 80
        }

        type             = var.service_type
    }
}
