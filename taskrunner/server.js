const debug = require('debug')('taskrunner');
const express = require('express');
const bodyParser = require('body-parser');
const compression = require('compression');
const methodOverride = require('method-override');
const router = require('./router');
const Tasks = require('./libs/tasks');
const Slack = require('./libs/slack');
const app = express();

function initialize() {
	// Listen on port 8080
	app.set('port', 8080);

	app.use(compression());
	app.use(bodyParser.urlencoded({
		extended: false
	}));
	app.use(bodyParser.json());
	app.use(methodOverride());

	// Set up the timers (equivalent of CRON)
	Tasks.startTimers(app);

	// Initialize Slack for logging (though it's no longer used)
	Slack.initialize(app);

	router.route(app);

	/** catch 404 and forward to error handler */
	app.use((req, res, next) => {
		if (req.originalUrl === '/')
			res.sendStatus(200);
		else
			next();
	});

	listen();
}

function listen() {
	app.listen(app.get('port'), () => {
		debug('\t-------- Node Configurations ---------');
		debug('\tNode Environment: %s', app.get('env'));
		debug('\tNode Started On Port: %d', app.get('port'));
		debug('\tNode Process ID (pid): %d', process.pid);
		debug('\tNode Version: %s', process.version);
	});
}

process.title = 'taskrunner';
process.on('uncaughtException', err => debug('\nUncaught Exeption: %O', err));

initialize();