/** Configuring the master routes for the site. */
var debugRte = require("./routes/debug"),
	/** Common Libs */
	colors = require("libs/colors"),
	debug = require("libs/buglog"),
	log = debug("routes");

module.exports = {
	route: function(app) {
		/** Request Logger Middleware */
		app.use("*", function(req, res, next) {
			log("\tDispatching: %s", __detectionLog(req));
			next();
		});
		/** For Debugging */
		app.use("/debug", debugRte.Router);
	}
};

function __detectionLog(req) {
	var dispatch = req.protocol + "://";
	return dispatch += " " + req.method + " " + req.get("host") + " " + req.originalUrl;
}