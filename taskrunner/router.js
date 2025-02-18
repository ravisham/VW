/** Configuring the master routes for the site. */
const update = require('./routes/update');
const hooks = require('./routes/hooks');
const status = require('./routes/status');

module.exports = {
	route: function(app) {
		app.use('/', status.Router);
		app.use('/taskrunner/update', update.Router);
		app.use('/taskrunner/hooks', hooks.Router);
	}
};