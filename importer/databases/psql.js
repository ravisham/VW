const path = require('path');
const config = require('config');
const Massive = require('massive');
const debug = require('debug')('importer:psql');

let Database = null;
let initDatabase = () => {
	let settings = config.get('database');
	Database = Massive.connectSync({
		connectionString: settings.client+'://'+settings.username+':'+settings.password+'@'+settings.host+':'+settings.port+'/'+settings.name
	});
};

initDatabase();

module.exports = Database;
