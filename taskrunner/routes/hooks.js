/**
 * This Route Module is here ONLY for debugging purposes.
 * This router helpus us trigger POST/GET requests to test the VWModel response.
 */
const express = require('express');
const debug = require('debug')('taskrunner:routes:hooks');
const Tasks = require('./../libs/tasks');
const Slack = require('./../libs/slack');
const Router = express.Router();

function handleSlackWebhook(req, res) {
	debug('Slack Webhook Received: %O', req.body);
	var reply = Slack.respond(req.body);
    res.status(200).json(reply);
}

Router.route('/slack')
	.post(handleSlackWebhook);

module.exports = { Router }