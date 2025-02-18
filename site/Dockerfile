FROM node:10.24.1

MAINTAINER OneMagnify Developers <developer@onemagnify.com>

RUN mkdir -p /usr/src/app/site /usr/src/app/common
WORKDIR /usr/src/app/common

# Install common dependencies

COPY /common/package.json /usr/src/app/common

RUN npm install -g
RUN npm install webpack -g

WORKDIR /usr/src/app/site

# Install site dependencies
COPY /site/package.json /usr/src/app/site/
COPY /site/webpack.config.js /usr/src/app/site/

RUN npm install -g
RUN npm rebuild node-sass


# Expose port
ENV PORT=8080
EXPOSE ${PORT}

CMD ["/usr/local/bin/npm", "run", "docker-developer-mode"]

