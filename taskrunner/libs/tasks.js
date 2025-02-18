const debug = require('debug')('taskrunner:tasks');
const timexe = require('timexe');
const Importer = require('./../../importer/server');

let environment = 'development';
let errProps = {
	message: 'Task is Actively Running',
	hint: 'Taskrunner recently executed the task you are attempting to run, therefore will not execute it again to avoid a disrupting the current task.',
	statusCode: 423
};
/* Configure the frequency of update types. Using the timexe format. */
let timer = {
	/**
	 * Daily Item Updates will be ran every morning @ 2:00AM
	 * Since the server is configured to UTC,
	 * 0900 turns into 2:00AM.
     * See https://www.npmjs.com/package/timexe for syntax
	 */
	itemupdates: '* * * 9',
	/** Inventory data pulling will run every 5 minutes (was every 15 before Ryan's change on 8/30/2017). */
	inventory: '* * * * /5',
    tracking: '* * * * /5'
};
let activeRun = false;
let updateTrackingTimer = null;
let updateStockTimer = null;
let updateItemsTimer = null;

/**
 * Initialize the timers for inventory and item updates.
 *
 * @returns {undefined}
 * @param {object} app The express app.
 *
 * @see {@link executeTask} (calls)
 */
function startTimers(app) {
    // Get the environment from the app
	environment = app.get('env');
    
    // If we're on development
    // Increase the frequency of the timers
    if (environment === 'development') {
        timer.inventory = '* * * * /2';
        timer.tracking = '* * * * /2';
        timer.itemupdates = '* * * * /4';
    }
    if (environment === 'qa') {
        timer.tracking = '* * * * /2';
        timer.itemupdates = '* * * * /2';

    }
    debug('Timexe Setting: %O', timer);

    // Set the stock timer to execute import-stock
    updateStockTimer = timexe(timer.inventory, function() {
        debug( "===== updateStockTimer =====" );
        executeTask('import-stock', false);
    });
    // Set the tracking timer to execute import-tracking
    updateTrackingTimer = timexe(timer.tracking, function() {
        debug( "===== updateTrackingTimer =====" );
        executeTask('import-tracking', false);
    });
    // Set the items timer to execute import-items
    updateItemsTimer = timexe(timer.itemupdates, function() {
        debug( "===== updateItemsTimer =====" );
        executeTask('import-items', false);
    });
}

/**
 * Manually call executeTask for "import-stock"
 *
 * @returns {undefined}
 * @param {function} callback Callback function to fire upon completion.
 *
 * @see {@link executeTask} (calls)
 */
function updateInventory(callback) {
    executeTask('import-stock', true, callback);
}

/**
 * Manually call executeTask for "import-tracking"
 *
 * @returns {undefined}
 * @param {function} callback Callback function to fire upon completion.
 *
 * @see {@link executeTask} (calls)
 */
 function updateTracking(callback) {
    executeTask('import-tracking', true, callback);
}

/**
 * Manually call executeTask for "import-items"
 *
 * @returns {undefined}
 * @param {function} callback Callback function to fire upon completion.
 *
 * @see {@link executeTask} (calls)
 */
function updateItemData(callback) {
    executeTask('import-items', true, callback);
}

function getOptions() {
    return timer;
}

module.exports = { startTimers, updateInventory, updateTracking, updateItemData, getOptions }

/**
 * Call a Importer.execute on a given action.
 *
 * @param {string} action The action to perform. "import-stock" or "import-items"
 * @param {boolean} manual Doesn't appear to do anything other than log whether the method was automatically called or fired manually.
 * @param {function} callback Callback function to fire upon completion.
 *
 * @see {@link startTimers} (called by)
 * @see {@link updateTracking} (called by)
 * @see {@link updateInventory} (called by)
 * @see {@link updateItemData} (called by)
 */
function executeTask(action, manual, callback) {
    console.log( "Execute Task: " + action );

    debug('Task Details: %O', { action, manual });

    Importer.execute(action)
        .then(function() {
            if( callback ) {
                callback();
            }
        })
        .catch(function( err ) {
            // activeRun = false;
            if( callback ) {
                callback( err );
            }
            else {
                debug('Task Execution Error: %s', (err.name || 'Unable to execute task'));
                debug('\tError Message: %s', err.message);
                debug('\tError Code: %s', err.code);
                if (Reflect.has(err, 'originalError')) {
                    debug('\tRoot Error: %O', err.originalError);
                }
            }
        });
        // .then(Importer.killConnection)
        // .then(function() {
        //     activeRun = false;
        // })
}