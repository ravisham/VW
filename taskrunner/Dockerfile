FROM node:10.24.1

MAINTAINER Traffic Digital Agency <developer@trafficdigitalagency.com>

RUN mkdir -p /usr/src/app/taskrunner /usr/src/app/importer

WORKDIR /usr/src/app/importer

# Install importer dependencies
COPY /importer/package.json /usr/src/app/importer
RUN npm install -g

COPY /importer/. /usr/src/app/importer

WORKDIR /usr/src/app/taskrunner

# Install admin dependencies
COPY /taskrunner/package.json /usr/src/app/taskrunner/
RUN npm install -g

# Bundle app source
COPY /taskrunner/. /usr/src/app/taskrunner

ENV PORT=8080

# Expose port
EXPOSE ${PORT}

CMD ["/usr/local/bin/npm", "run", "start:qa"]