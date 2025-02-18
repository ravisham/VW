var path = require('path'),
	Q = require('q'),
	_ = require("underscore"),
	express = require('express'),
	bodyParser = require('body-parser'),
	methodOverride = require('method-override'),
	session = require('express-session'),
	colors = require('colors'),
	Moment = require('moment'),
	program = require('commander'),
	passport = require('passport'),
	LocalStrategy = require('passport-local').Strategy,
	router = require('./router'),
	config = require('config'),
	database = require("libs/db"),
	Crypt = require("libs/crypt"),
    AWS = require("libs/aws"),
	Cache = require("libs/helpers/cache"),
	mssql = require("libs/mssql"),
	clientRootPath = path.resolve(__dirname, "..", "release"),
	app = express();


/** ------------ Setup Steps ----------------- */
var settings = {},
	VWModel, Controllers, Products, Items, Users, Dealers;


readEnvironment();
database(settings.database, function(error, db) {
	/** @type {Object} The actual database instance is assigned. */
	database = db;
	/**
	 * The `VWModel` AFTER the DB has been instantiated, because the
	 * DB instance coming back from the Async connection is a dependency.
	 * @type  {Object}
	 */
	VWModel = require('models');
	//Controllers = require('controllers');
	setupEnvironment();
	listen();
});

function readEnvironment() {
	var configEnv = config.settings('config/env');
	settings = config.mergeSettingsDefault(configEnv, program);
	settings.environment = app.get('env');
	console.log('>>> Node Server: Running Environment: ' + colors.green(settings.environment));
	if (settings.environment === "development") {
		Error.stackTraceLimit = settings.stackTraceLimit;
		console.log(">>> Node Server: Increased Stack Trace Limit to: " + colors.green(settings.stackTraceLimit));
	}
	global.settings = settings;
	Cache.set("TaxRatesAPI", settings.taxRatesAPI);
	Cache.set("Warehouses", settings.warehouses);
	console.log('Settings:');
	console.log(JSON.stringify(settings, null, 4));
}

function setupEnvironment() {
	console.log('>>> Node Server: Setting Up Environment');
	app.set('port', process.env.PORT||settings.port);

	/** Set View Engine */
	app.set("view engine", "pug");
	app.set("views", path.resolve(__dirname, "views"));

	app.use(bodyParser.urlencoded({
		extended: false
	}));
	app.use(bodyParser.json());
	app.use(methodOverride());
	/**
	 * Load up the settings now, and make them available at all the routes.
	 * This way we dont load them multiple times in each route.
	 */
	app.use(function(req, res, next) {
		req.appSettings = settings;
		req.VWModel = VWModel;
		if (settings.environment === "development")
			req.Controllers = Controllers;
		next();
	});

	/** Request Logger Middleware */
	app.use("*", function(req, res, next) {
		var log = `${ req.protocol }://${ req.method }: ${ req.get( "host" ) }${ req.originalUrl }`;
		console.log(log);
		next();
	});

	/** Handle Static Routes before Session/Passport as there is no need for auth */
	app.use(express.static(clientRootPath));

	app.use(session({
		secret: 'your secret sauce',
		saveUninitialized: true,
		resave: true
	}));

	/** Initialize Passport */
	app.use(passport.initialize());
	app.use(passport.session());

	/** Configure Passport */
	configurePassport();
	/** Configure MSSQL Connection */
	/** Establish a MSSQL DB Connection to VW's NAV data. */
	mssql.initialize(settings);
	/** Initialize the Controllers */
	//Controllers.initialize(settings);
    /** Initialize AWS */
    AWS.initialize(settings.aws);

	router.route(app);
	console.log('>>> Node Server: Environment ' + colors.green(settings.environment) + ' Was Set Successfully!');

	process.on('uncaughtException', function(err) {
		console.error(">>> Node Server: Uncaught Exeption");
		console.error(err);
	});

	process.on("exit", function(code) {
		console.log(">>> Node Server: Closing with Code " + code);
	});
}

function configurePassport() {
	/**
	 * passport session setup
	 * required for persistent login sessions
	 * passport needs ability to serialize and unserialize users out of session
	 */

	passport.use(new LocalStrategy({
		/** by default, local strategy uses username and password, we will override with email */
		usernameField: "email",
		passwordField: 'password',
		/** allows us to pass back the entire request to the callback */
		passReqToCallback: true
	}, function(req, email, password, done) {
		console.log(">>> Node Server: passport.authenticate.");

		let user = {id: 1, name: "Admin", pass: "1234"}
		if (email == user.name && password === user.pass) {
			return done(null, user);
		}
		return done({err:true, msg:"Admin User Not Defined"}, null);

	}));

	/** used to serialize the user for the session */
	passport.serializeUser(function(user, done) {
		console.log(">>> Node Server: passport.serializeUser.", user);
		done(null, user.id);
	});

	/** used to deserialize the user */
	passport.deserializeUser(function(id, done) {
		console.log(">>> Node Server: passport.deserializeUser.");
		let user = {id: 1, name: "Admin", pass: "1234"}
		done(null, user);
	});
}

function listen() {
	var appPort = app.get('port');
	app.listen(appPort, function() {
		console.log(">>> Node Started On Port: " + colors.green(appPort));
		console.log(">>> Node Process ID (pid): " + colors.green(process.pid));
		/** Print the current directory. */
		console.log(">>> Current Directory: " + process.cwd());
		/** Print the process version. */
		console.log(">>> Node Version: " + process.version);
	});
}

module.exports = app;