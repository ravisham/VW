const fs = require('fs');
const path = require('path');
const config = require('config');
const parse = require('csv-parse/lib/sync');
const debug = require('debug')('importer:controller');
const Model = require('./model');
const sql = require('./databases/mssql');
const settings = config.get('importer');
const fetchItem = sql.getItem;
const fetchItems = sql.getItems;
const fetchStock = sql.getStock;
const fetchTracking = sql.getTracking;

/** make promise version of fs.readFile() */
fs.readFileAsync = filename => {
    return new Promise(function(resolve, reject) {
        fs.readFile(filename, function(err, data){
            if (err) return reject(err);
            resolve(data);
        });
    });
};

/**
 *
 * @alias module:Controller.fetchUsers
 * @see {@link module:Controller.importUsers} (called by)
 */
function fetchUsers(dtc) {
    let srcdata = config.get('parser.srcdata');
    let userfile = dtc ? srcdata.users.dtc : srcdata.users.generic;
    return fs.readFileAsync(path.resolve(__dirname, srcdata.dir, userfile))
        .then(data => parse(data, {columns:true}));
}

/**
 * Fetch all of the items from SQL Server and then handle their contents.
 * 
 * @alias module:Controller.importItems
 * @returns {Promise}
 * @param {string} action Should always be "import-items" in this case.
 * 
 * @see {@link module:Server.executeNodeAction} (called by)
 * @see {@link module:mssql.getItems} (calls) (as fetchItems)
 * @see {@link module:Controller~handleDataContents} (calls)
 */
function importItems(action) {
    return fetchItems()
        .then(records => handleDataContents(records, action));
}

/**
 * Fetch all of the stock levels from SQL Server and then handle their contents.
 * 
 * @alias module:Controller.importStock
 * @returns {Promise}
 * @param {string} action Should always be "import-stock" in this case.
 * 
 * @see {@link module:Server.executeNodeAction} (called by)
 * @see {@link module:mssql.getStock} (calls) (as fetchStock)
 * @see {@link module:Controller~handleDataContents} (calls)
 */
function importStock(action) {
    return fetchStock()
        .then(records => handleDataContents(records, action));
}
/**
 * Fetch tracking information from SQL Server.
 * 
 * @alias module:Controller.importTracking
 * @returns {Promise}
 * @param {string} action Should always be "import-tracking" in this case.
 * 
 * @see {@link module:Server.executeNodeAction} (called by)
 * @see {@link module:mssql.getTracking} (calls) (as fetchTracking)
 * @see {@link module:Controller~handleDataContents} (calls)
 */
function importTracking(action) { console.log('import tracking');
    return fetchTracking()
        .then(records => handleDataContents(records, action));
}
/**
 * Fetch all of the users from SQL Server and then handle their contents.
 * 
 * @alias module:Controller.importUsers
 * @returns {Promise}
 * @param {string} action Should always be "import-items" in this case.
 * 
 * @see {@link module:Server.executeNodeAction} (called by)
 * @see {@link module:Controller.fetchUsers} (calls)
 * @see {@link module:Controller~handleDataContents} (calls)
 */
function importUsers(action) {
    return fetchUsers(action.includes('dtc-users') ? true : false)
        .then(records => handleDataContents(records, action));
}

/**
 *
 * @alias module:Controller.testParser
 * @see {@link module:Server.executeNodeAction} (called by)
 * @see {@link module:Controller~handleDataContents} (calls)
 */
function testParser(action, record) {
    return handleDataContents(record, action);
}

/**
 *
 * @alias module:Controller.testFetchItem
 * @see {@link module:Server.executeNodeAction} (called by)
 * @see {@link module:mssql.getItem} (calls) (as fetchItem)
 */
function testFetchItem() {
    return fetchItem()
        .then(record => record.recordset[0])
        .catch(err => {throw err});
}

/**
 * @module Controller
 */
module.exports = {
	fetchItems,
	fetchStock,
	fetchTracking,
	importItems,
	importStock,
    importTracking,
    importUsers,
    testParser,
    testFetchItem
}

/**
 * Create an actionType object with a set of different actions.
 * Scan the action param and set each member of actionType to true or false accordingly.
 * Then call importDataContents.
 *
 * @inner
 * @see {@link module:Controller.importItems} (called by)
 * @see {@link module:Controller.importStock} (called by)
 * @see {@link module:Controller.importTracking} (called by)
 * @see {@link module:Controller.importUsers} (called by)
 * @see {@link module:Controller~parseDataContents} (calls)
 * @see {@link module:Controller~importDataContents} (calls)
 */
function handleDataContents(records, action) {
	let parser = config.get('parser');
    let actiontype = {
        stock: action === 'import-stock' ? true : false,
        tracking: action === 'import-tracking' ? true : false,
        users: action.includes('users') ? true : false,
        dtc: action.includes('dtc') ? true : false,
        test: action.includes('test-parser') ? true : false
    };

    if (actiontype.test)
        return parseDataContents(records, actiontype, parser);
    return importDataContents(records, actiontype, parser);
}

/**
 *
 * @inner
 */
function parseDataContents(record, actiontype, parser) {
    debug('\nNow Parsing....');
    return Model.parseItem(record, parser, actiontype);
}

/**
 * Taking a set of records, use Model's parseImportItems
 * to clean them up and then add to/modify the database if appropriate.
 *
 * @inner
 * @returns {Promise}
 * @param {array} records The set of results from the SQL Server database.
 * @param {object} actionType The object listing which types of action to perform.
 * @param {object} parser The contents of /importer/config/default.yaml
 *
 * @see {@link module:Controller~handleDataContents} (called by)
 * @see {@link module:Model.parseImportItems} (calls)
 */
function importDataContents(records, actiontype, parser) {
    debug('\nNow Importing....');
    console.log('records',records);
    console.log('action type',actiontype);
    console.log('parser',parser);
    let recordsImported = 0;
    let totalRecords = records.length;
    let report = {
        updated: new Set(),
        unchanged: new Set()
    };
    let statusReported = new Set();

    return Model.parseImportItems( records, parser, actiontype ).then(function( updateObj ) {
        if (updateObj.keep.length)
           console.log( "updateObj.keep.length: " + updateObj.keep.length );
        if (updateObj.save.length)
           console.log( "updateObj.save.length: " + updateObj.save.length );
        if (updateObj.update.length)   
           console.log( "updateObj.update.length: " + updateObj.update.length );
    }).catch(function( error ) {
        console.log( "Error in /importer/controller.js:" );
        console.dir( error );
        /*
        EmailController.sendCriticalError('Error in /importer/controller.js', {
            'error': error,
            'records': records
        });
        */
    });
}
