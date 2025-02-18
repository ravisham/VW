/** jshint esversion:6 */

var path = require('path'),
	assert = require('assert'),
	dotenv = require('dotenv'),
	Helprs = require('helprs'),
	DBMigrate = require('db-migrate'),
	_ = require('underscore'),
	CLI = require('clui'),
	chalk = require('chalk'),
    clear = require('clear'),
    figlet = require('figlet'),
	Moment = require('moment'),
	inquirer = require('inquirer'),
	pkginfo = require('./package.json'), // jshint ignore:line
	config = require('./database.json'),
	logger = require('./lib/logger'),
	userInfo = require('./lib/userinfo'),
	speech = require('./lib/speech'),
	prompter = require('./lib/prompter');

var dbmigrate = DBMigrate.getInstance(true),
	Spinner = CLI.Spinner,
	exitCode = 7,
	defs = {
		action: "up",
		env: "test",
		configFile: "database.json",
		migrationLoc: "vwd-migrations"
	},
	settings = {
		action: defs.action,
		configs: config,
		configFileLoc: path.resolve(__dirname, defs.configFile),
		database: config[defs.env].database,
		environment: defs.env,
		logger: {
			enabled: false,
			directory: null
		},
		migrationsPath: path.resolve(__dirname, defs.migrationLoc),
		pkginfo: pkginfo
	};

function commenceIntroduction() {
	/** Initialize the OS User Information */
    userInfo.initialize();

    clear();
    var firstName = userInfo.getFirstnameSync();
    console.log(
        chalk.yellow(
            figlet.textSync('migrations', {
                horizontalLayout: 'full'
            })
        )
    );
    console.log(speech.greeting({firstName: firstName}));
}

function promptQuestions(callback) {
    var questions = prompter.getInitialQuestions();

    inquirer.prompt(questions).then(function(answers) {

    	if (answers.envOptions === "exit" || answers.migrationOptions === "exit") {
    		return callback(null, {
                toExit: true
            });
    	}

    	loadConfig(answers);
		/** Set all Migration Settings */
		setMigrationConfigs();

		var mvrsn = getMigrationVersion(answers);
		var spinnerMessage = "Commencing: ";

		var status = new Spinner("Running Migration: " + mvrsn.newVersion + ".....");
        status.start();

		initializeMigrations(mvrsn, answers).then(() => {
			status.stop();
			callback(null, "success");
		}).catch((err) => {
			callback(err);
		});

    });
}

function loadConfig(answers) {
	if (!_.isUndefined(answers.logConfirmation)) {
		settings.logger.enabled = answers.logConfirmation;
		settings.logger.directory = answers.logDirectory;
	}
	if (answers.envOptions !== settings.environment) {
		settings.environment = answers.envOptions;
		settings.database = config[settings.environment].database;
	}
	if (settings.logger.directory && !fs.existsSync(settings.logger.directory))
		fs.mkdirSync(settings.logger.directory);
}

function setMigrationConfigs() {
	dbmigrate.setConfigParam("migrations-dir", settings.migrationsPath);
	dbmigrate.setConfigParam("config", settings.configs);
	dbmigrate.setConfigParam("env", settings.environment);
	/** Initialize the Logger */
    if (settings.logger.enabled)
	    logger.initialize(settings.logger);
}

function initializeMigrations(mvrsn, answers) {
	var action = mvrsn.action, promise;

	switch (action) {
		case "create":
			return dbmigrate.create(mvrsn.title, mvrsn.scope).then(() => { // jshint ignore:line
				console.log("Created Migration Version: %s", mvrsn.newVersion);
				return;
			});
			break;
		case "up":
			if (answers.migrationCount)
				promise = dbmigrate.up(answers.migrationCount, mvrsn.scope);
			else
				promise = dbmigrate.up(mvrsn.scope);
			return promise.then(() => { // jshint ignore:line
				console.log("Successfully Migrated Up");
				return;
			});
			break;
		case "down":
			if (answers.migrationCount)
				promise = dbmigrate.down(answers.migrationCount, mvrsn.scope);
			else
				promise = dbmigrate.down(mvrsn.scope);
			return promise.then(() => { // jshint ignore:line
				console.log("Successfully Migrated Down");
				return;
			});
			break;
		case "reset":
			return dbmigrate.reset(mvrsn.scope).then(() => { // jshint ignore:line
				console.log("Successfully Resetted all Migrations");
				return;
			});
			break;
	}
}

function answersCallback(err, res) {
    if (err) {
        console.log('An error has occured');
        console.error(err);
    } else {
        var msg = 'All done!';
        if (res.message)
            msg = res.message;
        console.log(chalk.green(msg));
    }
    if (res && res.toExit)
        process.exit(0);
    else
        promptQuestions(answersCallback);
}

function getPreferences(callback) {
    var prefs = new Preferences('importer');

    if (prefs.fullname) {
        return callback(null, prefs.fullname);
    }
}

/** Get the Migration Versions By Levels */
function getMigrationVersion(answers) {
	var action = answers.migrationOptions || settings.action;
	var scope = settings.environment;
	var version = settings.pkginfo.version;
	var lVersion = version.split(".");
	var currentMjr = parseInt(lVersion[0]);
	var currentMnr = parseInt(lVersion[1]);
	var currentPth = parseInt(lVersion[2]);
	var stV = null;

	var mVersions = {
		action: action,
		title: null,
		scope: scope,
		newVersion: null,
		current: {
			major: currentMjr,
			minor: currentMnr,
			patch: currentPth
		}
	};

	mVersions.up = mVersions.down = mVersions.current;
	stV = mVersions.up;

	if (action === "create") {
		if (scope === "test")
			mVersions.up.patch++;
		else if (scope === "development")
			mVersions.up.minor++;
		else if (scope === "production")
			mVersions.up.major++;
	}

	var migrantTitle = "";
	if (answers.createMigrationName)
		migrantTitle = answers.createMigrationName;

	mVersions.newVersion = "v" + stV.major;
	mVersions.newVersion += "." + stV.minor;
	mVersions.newVersion += "." + stV.patch;

	if (!_.isEmpty(migrantTitle))
		mVersions.title = migrantTitle;

	return mVersions;
}

commenceIntroduction();
promptQuestions(answersCallback);