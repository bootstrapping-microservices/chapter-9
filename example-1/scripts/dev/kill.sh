docker-compose kill
docker rm -vf $(docker ps -aq)
docker rmi $(docker images | grep "^<none>" | awk "{print $3}")
