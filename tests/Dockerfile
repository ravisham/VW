FROM nodesource/trusty:6.2.1

MAINTAINER Troy Conrad <troy.conrad@mirumagency.com>

RUN mkdir -p /usr/src/app/common /usr/src/app/tests

WORKDIR /usr/src/app/common

# Install common dependencies
COPY /common/package.json /usr/src/app/common/
RUN npm install
COPY /common/. /usr/src/app/common

WORKDIR /usr/src/app/tests

# Install tests dependencies
COPY /tests/package.json /usr/src/app/tests/
RUN npm install
COPY /tests/. /usr/src/app/tests

CMD ["/usr/bin/npm", "start"]