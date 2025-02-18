/**
 * This Route Module is here ONLY for debugging purposes.
 * This router helpus us trigger POST/GET requests to test the VWModel response.
 */
const express = require('express');
const debug = require('debug')('taskrunner:routes:update');
const Tasks = require('./../libs/tasks');
const Router = express.Router();

function handleItemStockRoute(req, res) {
	debug('Update Inventory Request');
	Tasks.updateInventory((err) => {
		if (err) {
			debug('Update Inventory Request Error: %O', err);
			res.status(err.statusCode || err.code || 400).send(err);
		} else {
			res.status(200).json({
				message: 'Triggered Inventory Updates'
			});
		}
	});
}

function handleItemDataRoute(req, res) {
	debug('Update Item Data Request');
	Tasks.updateItemData((err) => {
		if (err) {
			debug('Update Item Data Request Error: %O', err);
			res.status(err.statusCode || err.code || 400).send(err);
		} else {
			res.status(200).json({
				message: 'Triggered Item Data Updates'
			});
		}
	});
}

function handleTrackingRoute(req, res) {
	debug('Update Tracking Request');
	Tasks.updateTracking((err) => {
		if (err) {
			debug('Update Tracking Request Error: %O', err);
			res.status(err.statusCode || err.code || 400).send(err);
		} else {
			res.status(200).json({
				message: 'Triggered Tracking Updates'
			});
		}
	});
}
Router.route('/inventory')
	.get(handleItemStockRoute)
	.post(handleItemStockRoute);

Router.route('/itemdata')
	.get(handleItemDataRoute)
	.post(handleItemDataRoute);

Router.route('/tracking')
	.get(handleTrackingRoute)
	.post(handleTrackingRoute);	

module.exports = { Router }