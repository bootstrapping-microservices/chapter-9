
resource "tls_private_key" "key" {
    algorithm = "RSA"
}

output "cluster_private_key" {
  value = tls_private_key.key.private_key_pem
}

output "cluster_public_key" {
  value = tls_private_key.key.public_key_pem
}
