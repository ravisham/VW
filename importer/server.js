const config = require('config');
const debug = require('debug')('importer');
const immutable = require('immutable');
const print = require('./helpers/print-time');
const db = require('./databases/psql');
const sql = require('./databases/mssql');
const Controller = require('./controller');

/**
 *
 * @alias module:Server.confirmConnection
 */
function confirmConnection() {
	return new Promise(function( resolve, reject ) {
		if (!db || !db.connectionString) {
			throw new Error('DB Connection');
		}
		sql.initialize(config.get('mssql')).then(function() {
			resolve();
		}).catch(function( error ) {
			reject( error );
		});
	});
}

/**
 *
 * @alias module:Server.killConnection
 */
function killConnection() {
	db.end();
	sql.end();
}

/**
 * @alias module:Server.disconnect
 */
function disconnect(code = 0) {
	killConnection();
	process.exit(code);
}

/**
 * Call the appropriate importer/fetch method based on the action.
 *
 * @alias module:Server.executeNodeAction
 *
 * @return {Promise}
 *
 * @see {@link module:Server.execute} (called by)
 * @see {@link module:Server.executeTest} (called by)
 * @see {@link module:MSSQL.fetchItems} (calls)
 * @see {@link module:MSSQL.fetchStock} (calls)
 * @see {@link module:MSSQL.fetchTracking} (calls)
 * @see {@link module:Controller.fetchUsers} (calls)
 * @see {@link module:Controller.importItems} (calls)
 * @see {@link module:Controller.importStock} (calls)
 * @see {@link module:Controller.importTracking} (calls)
 * @see {@link module:Controller.importUsers} (calls)
 * @see {@link module:Controller.testParser} (calls)
 * @see {@link module:Controller.testFetchItem} (calls)
 */
function executeNodeAction(action = config.get('action'), data) {
	debug('NODE_ACTION: %s', action);
	switch (action) {
		case 'fetch-items':
			return Controller.fetchItems()
				.then(res => `Successfully Fetched ${res.length} Items from NAV SQL`);
			break;
		case 'fetch-stock':
			return Controller.fetchStock()
				.then(res => 'Successfully Fetched Stock from NAV SQL');
			break;
		case 'fetch-tracking':
			return Controller.fetchTracking()
				.then(res => 'Successfully Fetched Tracking from NAV SQL');
			break;	
		case 'fetch-dtc-users':
			return Controller.fetchUsers(true)
				.then(res => 'Successfully Fetched DTC Users from Source');
			break;
		case 'import-items':
			return Controller.importItems(action)
				.then(res => 'Successfully Imported All Items');
			break;
		case 'import-stock':
			return Controller.importStock(action)
				.then(res => 'Successfully Imported All Inventory');
			break;
		case 'import-tracking':
			return Controller.importTracking(action)
				.then(res => 'Successfully Imported Tracking Numbers');
			break;
		case 'import-dtc-users':
			return Controller.importUsers(action)
				.then(res => 'Successfully Imported All DTC Users');
			break;
		case 'test-parser':
			return Controller.testParser(action, data);
			break;
		case 'test-fetch-item':
			return Controller.testFetchItem()
				.then(res => {
					debug('Successfully Test Fetched Item');
					return res;
				});
			break;
	}
}

console.log("Config DB!!", config.get('database').name);

/**
 *
 * @alias module:Server.execute
 */
function execute(action = config.get('action')) {
	if (process.env.NODE_ENV ==='development') {
		const installDevTools = require('immutable-devtools');
		installDevTools(immutable);
	}
	return confirmConnection()
		.then(() => executeNodeAction(action))
		.then(res => debug(res));
}

/**
 *
 * @alias module:Server.executeTest
 */
function executeTest(action = config.get('action'), data) {
	return confirmConnection()
		.then(() => executeNodeAction(action, data));
}

if (process.env.NODE_ACTION) {
	let start = process.hrtime();
	process.title = config.get('importer').title;
	process.on('uncaughtException', err => debug('\nUncaught Exeption: %O', err));
	process.on('exit', code => debug('\nExecution time: %s', print(process.hrtime(start), 's')));

	execute()
		.then(res => disconnect())
		.catch(err => {
			debug(err);
			disconnect(1);
		});
}

/**
 * @module Server
 */
module.exports = { execute, executeTest, disconnect, killConnection, executeNodeAction }