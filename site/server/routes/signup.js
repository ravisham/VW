const _ = require('underscore');
const express = require('express');
const debug = require('libs/buglog');
const log = debug('routes', 'signup');
const Router = express.Router();

function fetchSalesReps(req, res, err) {
	if (err) log('Dealer Signup Error: %O', err);
	req.VWModel.findSalesreps()
	.then(salesreps => resHandler(req, res, null, salesreps))
	.catch(err => resHandler(req, res, err, []));
}

function resHandler(req, res, err, record) {
	let data = {currentEnv: req.appSettings.environment};
	if (err) {
		data.err = err;
		data.salesreps = record;
	} else if (_.isArray(record)) {
		data.salesreps = record;
	} else {
		data.success = true;
		data.user = record;
	}
	log('Sending Data: %O', data);
	res.render('signup', data);
}

Router.route('/')
	.get((req, res) => fetchSalesReps(req, res, null))
	.post((req, res) => {
		req.VWModel.dealerSignup(req.body, req.appSettings)
		.then(user => resHandler(req, res, null, user))
		.catch(err => fetchSalesReps(req, res, err));
	});

module.exports = { Router }
