const debug = require('debug')('taskrunner:libs:slack');
const greetings = require('./greetings');
let Slack = require('node-slack');

let Client = Slack;
let slackOptions = {
    protocol: 'https',
    host: 'hooks.slack.com',
    api: {
        outgoing: {
            token: '8k0wHKRj5e5841WnygNBp3SC'
        },
        path: '/services/T02J2LAEG/B2BAKQWQP/G1UFBL30k302el5Kd3amg6NV'
    },
    channel: '#vision-wheel-qa',
    username: 'VWBot'
};
let connectionOptions = null;
let hookURL= null;

function initialize(app, settings = slackOptions) {
	app.set('slackSettings', settings);

	connectionOptions = getSlackChannel(settings);
	app.set('slackConnectionOptions', connectionOptions);

	let hookURL = settings.protocol + '://' + settings.host + settings.api.path;
	debug('Hook URL: %s', hookURL);
	app.set('slackHookURL', hookURL);

	Client = Slack = new Slack(hookURL);
	app.set('slackClient', Slack);

	debug('Initialized');
}

function notify(options) {
    let connectOpts = getConnectionOptions();
	Object.assign(connectOpts, options);
    debug('Notification Options: %O', connectOpts);
	Slack.send(connectOpts);
}

function respond(parameters, callback) {
	let connectOpts = getConnectionOptions();
	let obj = {};

	obj.token = parameters.token;
	obj.team_id = parameters.team_id;
	obj.channel_id = parameters.channel_id;
	obj.channel_name = parameters.channel_name;
	obj.timestamp = new Date(parameters.timestamp);
	obj.user_id = parameters.user_id;
	obj.user_name = parameters.user_name;
	obj.text = parameters.text;
	obj.trigger_word = parameters.trigger_word;
	obj.botname = connectOpts.username;
	obj.response_type = 'in_channel';
	obj.greeting = getGreeting(parameters.user_name);
	obj.attachments = getAttachments();

	if (callback) return callback.call(null, obj);
	return {
		text: ''
	};
}

function getOptions() {
	return slackOptions;
}

module.exports = { Client, notify, respond, initialize, getOptions }

function getSlackChannel(settings = slackOptions) {
	return {
		channel: settings.channel,
		username: settings.username
	};
}

function getConnectionOptions() {
	if (!connectionOptions)
		connectionOptions = getSlackChannel();
	return connectionOptions;
}

function getGreeting(name) {
    var loc = greetings[Math.floor(Math.random() * greetings.length)];
    var greet = loc.greeting + ', ' + name +'!';
    greet += ' What can I help you with?';
    return greet;
}

function getAttachments() {
    var attachments = [{
    	color: '#3AA3E3',
    	attachment_type: 'default',
    	callback_id: 'task_selection',
    	actions: [{
    		name: 'task_list',
    		text: 'Pick a Task...',
    		type: 'select',
    		options: [{
    			text: 'Run Database Sync',
    			value: 'run database sync'
    		}, {
    			text: 'Generate Report',
    			value: 'generate report'
    		}, {
    			text: 'Get Total Votes',
    			value: 'get total votes'
    		}]
    	}]
    }];
    return attachments;
}