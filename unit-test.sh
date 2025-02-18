#!/bin/sh

docker build -t visionwheel-qa-tests -f tests/Dockerfile . && docker run -it -e NODE_ENV=qa -p 8080:8080 visionwheel-qa-tests

# docker build -t visionwheel-tests -f tests/Dockerfile . && docker run -it -e NODE_ENV=production -p 8080:8080 visionwheel-tests

# docker build -t importer-unit-tests -f tests/Dockerfile.importer . && docker run -it -e NODE_ENV=qa -p 8080:8080 importer-unit-tests

# docker build -t importer-unit-tests -f tests/Dockerfile.importer . && docker run -it -e NODE_ENV=production -p 8080:8080 importer-unit-tests