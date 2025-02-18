#!/bin/sh
docker build -t vision-wheel-dealers -f site/Dockerfile.prod . && docker run -it -e NODE_ENV=production -p 8080:8080 vision-wheel-dealers