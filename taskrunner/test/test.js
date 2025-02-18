const assert = require('assert');
const Tasks = require('./../libs/tasks');
const Slack = require('./../libs/slack');

describe('Taskrunner Unit Tests', function() {
	let taskOptions, slackOptions, slackWebhookPost;

	describe('Tasks', function() {
		describe('Options', function() {
			before(function() {
				taskOptions = Tasks.getOptions();
			});
			it('item updates should be set on a 24 hr interval at 2:00AM', function() {
				assert.equal('* * * 9', taskOptions.itemupdates);
			});
			it('inventory updates should be set on a 15 min interval', function() {
				assert.equal('* * * * /15', taskOptions.inventory);
			});
		});
	});

	describe('Slack', function() {
		describe('Options', function() {
			before(function() {
				slackOptions = Slack.getOptions();
			});
			it('should have a protocol property', function() {
				assert.ok(Reflect.has(slackOptions, 'protocol'));
			});
			it('should have a host property', function() {
				assert.ok(Reflect.has(slackOptions, 'host'));
			});
			it('should have a channel property', function() {
				assert.ok(Reflect.has(slackOptions, 'channel'));
			});
			it('should have a username property', function() {
				assert.ok(Reflect.has(slackOptions, 'username'));
			});
			it('should have an api property', function() {
				assert.ok(Reflect.has(slackOptions, 'api'));
			});
			it('options.api should have a outgoing property', function() {
				assert.ok(Reflect.has(slackOptions.api, 'outgoing'));
			});
			it('options.api.outgoing should have a token property', function() {
				assert.ok(Reflect.has(slackOptions.api.outgoing, 'token'));
			});
			it('options.api.outgoing.token property should be a string', function() {
				assert.ok(typeof slackOptions.api.outgoing.token === 'string');
			});
			it('options.api should have a path property', function() {
				assert.ok(Reflect.has(slackOptions.api, 'path'));
			});
			it('options.api.path property should be a string', function() {
				assert.ok(typeof slackOptions.api.path === 'string');
			});
		});
		describe('Webhook Handling', function() {
			slackWebhookPost = {
				token: 'kQiVeuTK4DeTI6AS3eCXuUBI',
				team_id: 'T0001',
				team_domain: 'example',
				channel_id: 'C2147483705',
				channel_name: 'test',
				timestamp: '1355517523.000005',
				user_id: 'U2147483697',
				user_name: 'Steve',
				text: 'googlebot: What is the air-speed velocity of an unladen swallow?',
				trigger_word: 'googlebot:'
			};
			it('should generate a response object for slack api', function() {
				Slack.respond(slackWebhookPost, function(hook) {
					assert.ok(typeof hook === 'object');
				});
			});
		});
	});
});