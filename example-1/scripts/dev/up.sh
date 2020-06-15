mkdir logs
docker-compose up --build  --no-color 2>&1 | tee run.log