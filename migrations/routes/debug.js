/**
 * This Route Module is here ONLY for debugging purposes.
 * This router helpus us trigger POST/GET requests to test the VWModel response.
 */
var express = require("express"),
	colors = require('libs/colors'),
	debug = require("libs/buglog"),
	log = debug("cron"),
	router = express.Router();

router.post("/triggercron/updateinventory", function(req, res) {
	log("Debugging Route: " + colors.yellow("Cron.triggerCron();"));
	var Cron = req.Cron;
	Cron.triggerInventory("updateInventory");
	res.status(500).json({
		message: "Triggered Inventory Updates"
	});
});

module.exports = {
	Router: router
};