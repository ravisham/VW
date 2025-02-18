/**
 * @file A multi-transport async logging library for node.js.
 *       "CHILL WINSTON! ... I put it in the logs."
 *
 * @author Joaquin Briceno <joaquin.briceno@mirumagency.com>
 */

var fs = require('fs'),
	winston = require('winston'),
	dailyRotateFile = require('winston-daily-rotate-file'),
	_ = require("./helpers"),
	defaultSettings = require("./settings");

/**
 * As specified exactly in RFC5424 the syslog levels are prioritized from 0 to 7 (highest to lowest).
 * {
 * 		emerg: 0,
 * 		alert: 1,
 * 		crit: 2,
 * 		error: 3,
 * 		warning: 4,
 * 		notice: 5,
 * 		info: 6,
 * 		debug: 7
 * 	}
 */

var logger = null;
var config = null;

module.exports = {
	initialize: function(parameters) {
		parameters = parameters || {};
		config = _.extend(defaultSettings, parameters);

		if (config.path) {
			if (!fs.existsSync(config.path)) {
				fs.mkdirSync(config.path);
			}
		}

		// var logger = new(winston.Logger)({
		// 	transports: [
		// 		// only logs errors to the console
		// 		new(winston.transports.Console)({
		// 			level: "error"
		// 		}),
		// 		// all logs will be saved to this app.log file
		// 		new(winston.transports.File)({
		// 			filename: path.resolve(__dirname, "../logs/app.log")
		// 		}),
		// 		// only errors will be saved to errors.log, and we can examine
		// 		// to app.log for more context and details if needed.
		// 		new(winston.transports.File)({
		// 			level: "error",
		// 			filename: path.resolve(__dirname, "../logs/errors.log")
		// 		})
		// 	]
		// });

		// var logger = new(winston.Logger)({
		// 	transports: [
		// 		new(winston.transports.File)({
		// 			name: 'info-file',
		// 			filename: 'filelog-info.log',
		// 			level: 'info'
		// 		}),
		// 		new(winston.transports.File)({
		// 			name: 'error-file',
		// 			filename: 'filelog-error.log',
		// 			level: 'error'
		// 		})
		// 	]
		// });

		var winstonOpts = {
			filename: config.path + '/' + config.filename + '.log',
			datePattern: '.dd-MM-yyyy'
		};

		if (config.enableColors)
			winstonOpts.colorize = config.enableColors;
		if (config.maxFiles)
			winstonOpts.maxFiles = config.maxFiles;
		if (config.tailable)
			winstonOpts.tailable = config.tailable;
		if (config.zippedArchive)
			winstonOpts.zippedArchive = config.zippedArchive;

		/** Winston Additions */
		winston.add(dailyRotateFile, winstonOpts);

		/** Winston Removals */
		winston.remove(winston.transports.Console);
	},
	dualLog: function(message, conLog, isError) {
		message = __message(message);
		if (isError)
			winston.error(message);
		else
			winston.info(message);
		if (conLog)
			console.log(message);
	},
	info: function(message, conLog) {
		message = __message(message);
		winston.info(message);

		if (conLog) {
			console.log(message);
		}
	},
	error: function(message, conLog) {
		message = __message(message);
		winston.error(message);

		if (conLog) {
			console.log(message);
		}
	}
};

function __message(message) {
	var introMSG = "\n--- Importer Log: ";
	message = introMSG + message;
	return message;
}