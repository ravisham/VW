docker build -f ./site/Dockerfile.tc.prod -t vwdev . && docker run  -it -e NODE_ENV=production --env-file .env -p 8080:8080 -v "`pwd`"/common/config:/usr/src/app/common/config -v "`pwd`"/common/controllers:/usr/src/app/common/controllers -v "`pwd`"/common/libs:/usr/src/app/common/libs -v "`pwd`"/common/models:/usr/src/app/common/models -v "`pwd`"/site/server:/usr/src/app/site/server vwdev