
resource "kubernetes_deployment" "rabbit" {
  metadata {
    name = "rabbit"

    labels = {
      pod = "rabbit"
    }
  }

  spec {
    replicas = 1

    selector {
      match_labels = {
        pod = "rabbit"
      }
    }

    template {
      metadata {
        labels = {
          pod = "rabbit"
        }
      }

      spec {
        container {
          image = "rabbitmq:3.8.1-management"
          name  = "rabbit"

          port {
            container_port = 5672
          }
        }
      }
    }
  }
}

resource "kubernetes_service" "rabbit" {
    metadata {
        name = "rabbit"
    }

    spec {
        selector = {
            pod = kubernetes_deployment.rabbit.metadata[0].labels.pod
        }   

        port {
            port        = 5672
            target_port = 5672
        }
    }
}
