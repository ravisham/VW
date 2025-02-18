"use strict";
var path            = require('path'),
	express         = require('express'),
	bodyParser      = require('body-parser'),
	request 		= require('superagent'),
	app             = express(),
	router      = express.Router(),
	parse = require('csv-parse/lib/sync'),
	fs = require('fs');
// look into this:
// https://www.npmjs.com/package/node-lambda


let environment = app.get('env');
app.set('port', process.env.PORT | 3000);
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(bodyParser.json());
app.use( "*", function( req, res, next ) {
	if (req.originalUrl === '/favicon.ico') 
	    return res.type('image/x-icon').status(200).end(); //ignore the stupid favicon
    //var log = `${ req.protocol }://${ req.method }: ${ req.get( "host" ) }${ req.originalUrl }`;
    next();
});

app.use( "/", function(req, res) {
	request.post("https://q4ck4tmdth.execute-api.us-east-1.amazonaws.com/prod/VWShippingCalculator")
	.send([{"from":"IN", "to":"90232", "items": [{"type":"wheel","size":15,"qty":4}, {"type":"wheel","size":22,"qty":4} ] }, {"from":"CA", "to":"90232", "items": [{"type":"wheel","size":20,"qty":8}, {"type":"wheel","size":22,"qty":2} ] }])
	.end((err, response)=>{
		// if (err)
		// 	return res.json(err);	
		res.json(response);	
	});
	
});



app.listen(app.get('port'), function() {
    console.log(">>> Node Started On Port: " + app.get('port'));
    console.log(">>> Node Process ID (pid): " + process.pid);
    /** Print the current directory. */
    console.log(">>> Current Directory: " + process.cwd());
    /** Print the process version. */
    console.log(">>> Node Version: " + process.version);
});
