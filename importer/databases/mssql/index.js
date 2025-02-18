/**
 * @module libs/mssql
 * @type {Object}
 * @fileOverview  This Module will be responsible for making sure a proper connection has been established.
 */
/*

Okay so we need to update this so that a) its not a mess. b) it runs efficently

This query will replace all of the data stock importer

select [Item No_], [11], [50], [60], [61], [02], [04], [H10], [H20], [H30]
from 
( SELECT [Item No_], [Nav Qty On Hand], [Location Code] FROM [NAV-Ecomsub].[dbo].[Vision Wheel, Inc_$Location Inventory] ) as SourceTable 
pivot (
	MAX([Nav Qty On Hand]) FOR [Location Code] in ([11], [50], [60], [61], [02], [04], [H10], [H20], [H30])
) as PivotTable
order by [Item No_]

*/



const sql = require('mssql');
const debug = require('debug')('importer:mssql');
const ReadableStrm = require('readable-stream');
const dbStructure = require('./structure');
const qryBuilder = require('./querybuilder');
const ContentStream = require('./content-stream');
const Utility = require('./../../helpers/utility');

let connectionSettings = null;
let connectionPool = null;
let sqlsettings = null;

const mssql = {
	pool: null,
	connected: false,

	/**
	 * Iitialize the MS SQL database connection.
	 *
	 * @alias module:mssql.getStock
	 * @returns {Promise}
	 * @param {object} settings
	 */
	initialize(settings) {
		let config = {
			user: settings.username,
			password: settings.password,
			server: settings.host,
			database: settings.name,
			port: settings.port,
			connectionTimeout: settings.connectionTimeout || 15000,
			requestTimeout: settings.requestTimeout || 15000
		};
		sqlsettings = settings;
		return new Promise(function( resolve, reject ) {
			if( !mssql.pool ) {
				// console.log( "!mssql.pool" );
				new sql.ConnectionPool( config ).connect().then(function( pool ) {
					pool.on('error', errorHandler);
					mssql.pool = pool;
					mssql.connected = true;
					debug('NAV SQL Connected');
					resolve();
				}).catch(function( error ) {
					reject( error );
				});
				// sql.connect(config, function( error ) {
				// 	console.log( "CONNECT Error" );
				// 	console.log( error );
				// 	mssql.pool = new sql.ConnectionPool( config );
				// 	if( !e ) {
				// 		resolve();
				// 	}
				// 	else {
				// 		reject( error );
				// 	}
				// });
			}
			else {
				// console.log( "mssql.pool" );
				// console.log( mssql.pool );
				resolve();
			}
		});
	},

	/**
	 * Close the MS SQL database connection.
	 *
	 * @alias module:mssql.end
	 */
	end() {
		sql.close();
		debug('NAV SQL Connection Closed');
	},

	/**
	 *
	 * @alias module:mssql.getItem
	 *
	 * @see {@link module:Controller.testFetchItem} (called by) (as fetchItems)
	 * @see {@link module:QueryBuilder.buildItemQuery} (calls)
	 */
	getItem() {
		return new Promise((resolve, reject) => {
			let sqlSource = [];
			const request = new sql.Request(mssql.pool);
			request.query(qryBuilder.buildItemQuery(), (err, result) => {
				if (err) return reject(err);
				resolve(result);
			});
		});
	},

	/**
	 * Return a promise to deliver all of the items data.
	 *
	 * @alias module:mssql.getItems
	 *
	 * @see {@link module:Controller.importItems} (called by) (as fetchItems)
	 * @see {@link module:QueryBuilder.buildItemsQuery} (calls)
	 */
	getItems() {
		return new Promise((resolve, reject) => {
			let sqlSource = [];
			let request = new sql.Request(mssql.pool);
			request.stream = true;
			request.query(qryBuilder.buildItemsQuery());
			request.on('row', row => sqlSource.push(row));
			request.on('error', err => reject(err));
			request.on('done', affected => resolve(sqlSource));
		});
	},

	/**
	 * Return a promise to deliver the stock data from MS SQL.
	 *
	 * The stock data will be an object where the key is the item number (Item No_ in the MS SQL database)
	 * and the value is an object consisting of part_number (again the item number)
	 * and an inventory object that pairs state codes with their inventory levels.
	 *
	 * Even though MS SQL returns a separate row per item/location combination,
	 * the result will merge them with one key per item and then 
	 * that will contain all inventory levels, for all locatios, within it.
	 *
	 * @alias module:mssql.getStock
	 * @returns {Promise}
	 *
	 * @see {@link module:Controller.importStock} (called by) (as fetchStock)
	 * @see {@link module:QueryBuilder.buildStockQuery} (calls)
	 */
	getStock() {
		return new Promise((resolve, reject) => {
			let invRecCount = 0;
			let parsedRowData = {};
			let invTable = dbStructure.getInvTable();
			let locationCodes = dbStructure.getLocationCodes();
			let tableColumns = invTable.columns;

			let request = new sql.Request(mssql.pool);
			request.stream = true;

			let rst = new ReadableStrm();
			rst.wrap(request);

			let WritableStream = ContentStream.createWriteStream({
				objectMode: true
			});

			// When the stream completes,
			// resolve with the parsed array of data
			// or reject with a No Records Found error
			WritableStream.then(content => {
				debug('Writable Stream Retrieved %d Records Total', invRecCount);
				if (!Utility.isEmpty(parsedRowData)) {
					let parsedArrData = [];
					let keys = Reflect.ownKeys(parsedRowData);
					for (key of keys)
						parsedArrData.push(parsedRowData[key]);
					resolve(parsedArrData);
				} else {
					reject(new Error('No Records Found'));
				}
			}).catch(err => {
				debug('Writable Stream Error: %O', err);
				reject(err);
			});

			// Set up the query
			let qry = qryBuilder.buildStockQuery();

			console.log("end qry", qry);
			// Send the query to the stream
			request.pipe(WritableStream);
			request.query(qry);
			// Handle any errors
			request.on('error', err => debug('Request Content Error: %O', err));
			// Process each row as it's received
			request.on('row', row => {
				invRecCount++;
				let ready = WritableStream.write(row);
				if (ready === false) {
					// Handle the stream not being ready, pausing it until it's drained
					debug('Writable Stream Needs time to catch up!');
					request.pause();
					WritableStream.once('drain', () => request.resume());
				} else {
					// Get the location code value
					// And if it doesn't exist inside locationCodes,
					// return with a debug message
					let rowCode = row[tableColumns.locCode.name];
					if (!Reflect.has(locationCodes, rowCode)) {
						return debug('Unsupported Location Code: %s', rowCode);
					}
					// Set rowNumber to the item number
					let rowNumber = row[tableColumns.itemNum.name];
					// Create a rowdata object
					let rowdata = {
						part_number: rowNumber,
						inventory: {}
					};
					// If we haven't already got an entry for the item in the parsedRowData
					// Store the row data at a key based on the item number
					if (!Reflect.has(parsedRowData, rowNumber)) {
						parsedRowData[rowNumber] = rowdata;
					}
					// Get the quantity on hand
					let locQty = row[tableColumns.onHandQty.name] || 0;
					// Get the state code (i.e. "TX"), which Postgres and the site uses
					// from the 2-3 digit alphanumeric locastion code (i.e. 10) that MS SQL and VisionWheel use
					let locState = locationCodes[rowCode];
					// If we DON'T already have inventory levels for the item/location
					if (!Reflect.has(parsedRowData[rowNumber].inventory, locState)) {
						// Store the item/location inventory level
						parsedRowData[rowNumber].inventory[locState] = locQty;
					}
					else {
						// Otherwise, add to it
						parsedRowData[rowNumber].inventory[locState] += locQty;
					}
				}
			});
			request.on('done', affected => WritableStream.end());
		});
	},

	/**
	 *
	 * @alias module:mssql.getItemTable
	 */
	getItemTable() {
		return dbStructure.get({
			from: "tables.items"
		});
	},

	/**
	 *
	 * @alias module:mssql.getTracking
	 */
	 getTracking() {
		console.log('tracking instance');
		// copy of inventory taskrunner code, replace with tracking number import process
		return new Promise((resolve, reject) => {
			let trackRecCount = 0;
			let parsedRowData = {};
			//let invTable = dbStructure.getInvTable();
			//let locationCodes = dbStructure.getLocationCodes();
			let trackTable = dbStructure.getTrackTable();
			let tableColumns = trackTable.columns;
			console.log('tracking columns',tableColumns);
			let request = new sql.Request(mssql.pool);
			request.stream = true;

			let rst = new ReadableStrm();
			rst.wrap(request);

			let WritableStream = ContentStream.createWriteStream({
				objectMode: true
			});

			// When the stream completes,
			// resolve with the parsed array of data
			// or reject with a No Records Found error
			WritableStream.then(content => {
				console.log('tracking stream');
			//	debug('Writable Stream Retrieved %d Records Total', invRecCount);
				if (!Utility.isEmpty(parsedRowData)) {
					let parsedArrData = [];
					let keys = Reflect.ownKeys(parsedRowData);
					for (key of keys)
						parsedArrData.push(parsedRowData[key]);
					resolve(parsedArrData);
				} else {
					reject(new Error('No Records Found'));
				}
			}).catch(err => {
				debug('Writable Stream Error: %O', err);
				reject(err);
			});

			// Set up the query
			let qry = qryBuilder.buildTrackQuery();
			
			console.log("end qry", qry);
			// Send the query to the stream
			request.pipe(WritableStream);
			request.query(qry);
			// Handle any errors
			request.on('error', err => debug('Request Content Error: %O', err));
			// Process each row as it's received
			request.on('row', row => {
				trackRecCount++;
				let ready = WritableStream.write(row);
				if (ready === false) {
					// Handle the stream not being ready, pausing it until it's drained
					debug('Writable Stream Needs time to catch up!');
					request.pause();
					WritableStream.once('drain', () => request.resume());
				} else {
					// Get the location code value
					// And if it doesn't exist inside locationCodes,
					// return with a debug message
					let rowCode = row[tableColumns.trackingNum.name];
					let rowAgent = row[tableColumns.shippingAgent.name];

				//	if (!Reflect.has(locationCodes, rowCode)) {
				//		return debug('Unsupported Location Code: %s', rowCode);
				//	}
					// Set rowNumber to the item number
					let rowNumber = row[tableColumns.docNum.name];
					// Create a rowdata object
					let rowdata = {
						doc_number: rowNumber,
						tracking_num: rowCode,
						ship_agent: rowAgent
					};
				//	console.log('row data',rowdata);
					// If we haven't already got an entry for the item in the parsedRowData
					// Store the row data at a key based on the item number
					if (!Reflect.has(parsedRowData, rowNumber)) {
						parsedRowData[rowNumber] = rowdata;
					}
					// Get the quantity on hand
				//	let locQty = row[tableColumns.onHandQty.name] || 0;
					// Get the state code (i.e. "TX"), which Postgres and the site uses
					// from the 2-3 digit alphanumeric locastion code (i.e. 10) that MS SQL and VisionWheel use
				//	let locState = locationCodes[rowCode];
					// If we DON'T already have inventory levels for the item/location
				//	if (!Reflect.has(parsedRowData[rowNumber].inventory, locState)) {
						// Store the item/location inventory level
				//		parsedRowData[rowNumber].inventory[locState] = locQty;
				//	}
				//	else {
						// Otherwise, add to it
				//		parsedRowData[rowNumber].inventory[locState] += locQty;
				//	}
				
				}
			
			}); 
			request.on('done', affected => WritableStream.end());
		}); 
	}
};

/**
 * @module mssql
 */
module.exports = mssql;

/**
 *
 * @inner
 */
function errorHandler(err) {
	console.log( "errorHandler" );
	console.log( err );
	if (err.message === 'Global connection already exists') {
		mssql.end();
		return mssql.initialize(sqlsettings);
	}
	throw err;
}