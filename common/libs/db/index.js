var path = require("path"),
	Q = require("q"),
	_ = require("underscore"),
	Helprs = require("helprs"),
	Massive = require("massive"),
	colors = require('libs/colors'),
	debug = require("libs/buglog"),
	log = debug("libs", "db");

var Database;

/**
 * @memberOf module:db
 * @private
 * @description Initializes the Massive connection.
 */
var init = function(settings, callback) {
	var connectionOptions = {
		connectionString: buildConnection(settings),
		scripts: path.resolve(__dirname, "scripts"),
		enhancedFunctions: true, // Enable return type honoring
		defaults: settings.defaults
	};

	if (_.isObject(connectionOptions.connectionString) && connectionOptions.connectionString.statusCode === 500) {
		if (callback)
			callback(connectionOptions.connectionString);
		else {
			log("Connection String Error: %s", connectionOptions.connectionString.message);
			throw connectionOptions.connectionString;
		}
	}

	Massive.connect(connectionOptions, function(err, db) {
		if (err) {
			log(err);
			if (callback) {
				callback(err);
			} else {
				throw err;
			}
		} else {
			log("\t\tInitialized");
			db.host = settings.host;
			Database = module.exports = db;
			if (callback) {
				callback(null, db);
			}
		}
	});
};

/**
 * @memberOf module:db
 * @private
 * @description
 * Sets up the connection string for the Massive connection.
 */
function buildConnection(settings) {
	/** Here we will add additionally functionality to handle multi DB Instances */
	var connectionString = "",
		isError = false;
	var err = {
		statusCode: 500,
		message: "DBConnection Error Message:"
	};

	if (typeof settings !== 'object') {
		if (!isError) {
			isError = true;
		}
		console.log('ERROR /common/libs/db/index.js - buildConnection - Environment settings object was blank');
		err.message += " Environment settings object was blank";
	}

	if ((!settings) || (!settings.client)) {
		if (!isError) {
			isError = true;
		}
		console.log('ERROR /common/libs/db/index.js - buildConnection - Missing DB Client');
		err.message += " Missing DB Client";
	} else {
		connectionString = settings.client;
	}

	if ((!settings) || (!settings.username)) {
		if (!isError) {
			isError = true;
			err.message += " Missing DB Username";
		} else {
			err.message += ", Missing DB Username";
		}
		console.log('ERROR /common/libs/db/index.js - buildConnection - Missing DB Username');
	} else {
		connectionString += "://" + settings.username;
	}

	if ((!settings) || (!settings.password)) {
		if (!isError) {
			isError = true;
			err.message += " Missing DB Password";
		} else {
			err.message += ", Missing DB Password";
		}
		console.log('ERROR /common/libs/db/index.js - buildConnection - Missing DB Password');
	} else {
		connectionString += ":" + settings.password;
	}

	if ((!settings) || (!settings.host)) {
		if (!isError) {
			isError = true;
			err.message += " Missing DB Host";
		} else {
			err.message += ", Missing DB Host";
		}
		console.log('ERROR /common/libs/db/index.js - buildConnection - Missing DB Host');
	} else {
		connectionString += "@" + settings.host;
	}

	if ((!settings) || (!settings.port)) {
		if (!isError) {
			isError = true;
			err.message += " Missing DB Port";
		} else {
			err.message += ", Missing DB Port";
		}
		console.log('ERROR /common/libs/db/index.js - buildConnection - Missing DB Port');
	} else {
		connectionString += ":" + settings.port;
	}

	if ((!settings) || (!settings.name)) {
		if (!isError) {
			isError = true;
			err.message += " Missing DB Name";
		} else {
			err.message += ", Missing DB Name";
		}
		console.log('ERROR /common/libs/db/index.js - buildConnection - Missing DB Name');
	} else {
		connectionString += "/" + settings.name;
	}

	if (isError) {
		/** Clearly this will result in a DB Connection Error. This is a Potential Bug! */
		return Helprs.err(err.message, err);
	} else {
		return connectionString;
	}
}

/** 
 * @module db
 * @description
 * Everything with a db. prefix uses the Massive Postrgres database connection.
 * @see https://dmfay.github.io/massive-js/
 */
module.exports = function(settings, callback) {
	if (typeof settings !== 'object') {
		console.log('ERROR /common/libs/db/index.js - exports - settings is not an object');
	}
	if (Database) {
		return Database;
	} else {
		init(settings, callback);
	}
};