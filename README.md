Running Locally:

* Install Docker Desktop
* Make sure local port 8080 is clear
* In project root, run shell command $ sh dev.sh
* Site should load at localhost:8080

For API Work

* API Route Documentation: https://docs.google.com/spreadsheets/d/1jT7US8FoUUBUYwjlPlbvaUinNol4_UJxR0A9jRq2UJc/edit#gid=0
* API users correspond to location code in common/config/settings/apiusers.js. These correspond to the 'BillingLocation" field.
* API routes and logic are in site/server/routes/api.js

Oauth2

* Based off this example: https://github.com/oauthjs/express-oauth-server/tree/master/examples/postgresql
* Test routes: 
* POST http://localhost:8080/api/v2/oauth/token?grant_type=client_credentials&scope=datacapture.external.vendor&client_id=dummy-client-id&client_secret=dummy-client-secret
* 


DataBases

* Postgres creds:
    username: "postgres_admin",
	password: "pCZJlJFCz3",
	host: "visionwheel.c9cwsjkyspvd.us-east-1.rds.amazonaws.com"
* DB config file for dev build is in common/config/env/qa.js
* Remove '_qa' from end of database name to access production data
* Web order nnumbers made from dev env will go into postgress but never to msql NAV db (ERP) as they begin with a 2. Real Prod web order numbers begin with a 1.

Admin Console:

* https://shop.visionwheel.com:8443/
* Test orders can be removed here

Deploy Process

+ Done in jenkins installed on our AWS
+  Build 'vw-aws-VisionWheel' project to deploy from our master branch.

Docker commands for local Admin console (http://localhost:8443)

+ docker build -f admin/Dockerfile.qa -t visionwheel-admin-site .
+ docker run -it -e NODE_ENV=qa -p 8443:8443 visionwheel-admin-site

Docker commands for local taskrunner (execution visible in console):

+ docker build -f taskrunner/Dockerfile -t visionwheel-taskrunner .
+ docker run -it -e NODE_ENV=qa -p 8080:8080 visionwheel-taskrunner


