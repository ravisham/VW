FROM node:10.24.1

MAINTAINER OneMagnify Developers <developer@onemagnify.com>

RUN mkdir -p /usr/src/app/admin /usr/src/app/common

WORKDIR /usr/src/app/common

# Install common dependencies
COPY /common/package.json /usr/src/app/common
RUN npm install -g
RUN npm install webpack -g

COPY /common/. /usr/src/app/common

WORKDIR /usr/src/app/admin

# Install admin dependencies
COPY /admin/package.json /usr/src/app/admin/
RUN npm install -g
RUN npm rebuild node-sass

# Bundle app source
COPY /admin/. /usr/src/app/admin

# Run build in /usr/src/app/admin
RUN npm run build

ENV PORT=8080

# Expose port
EXPOSE ${PORT}	

CMD ["/usr/local/bin/npm", "run", "start"]