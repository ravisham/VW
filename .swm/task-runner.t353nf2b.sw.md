---
title: Task Runner
---
# Introduction

This document will walk you through the implementation of the "Task Runner" feature. The Task Runner is responsible for scheduling and executing various tasks at specified intervals. It is designed to handle tasks like importing stock, tracking, and item data updates.

We will cover:

1. How task scheduling is configured and why different environments have different settings.
2. How tasks are executed both automatically and manually.
3. How errors are handled during task execution.

# Task scheduling configuration

<SwmSnippet path="/taskrunner/libs/tasks.js" line="1">

---

The task scheduling is configured using the <SwmToken path="/taskrunner/libs/tasks.js" pos="2:2:2" line-data="const timexe = require(&#39;timexe&#39;);">`timexe`</SwmToken> library, which allows us to specify the frequency of task execution in a cron-like format. The initial configuration sets up different timers for item updates, inventory, and tracking tasks.

```
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
```

---

</SwmSnippet>

# Environment-specific timer adjustments

<SwmSnippet path="/taskrunner/libs/tasks.js" line="41">

---

The timers are adjusted based on the environment. In development, tasks run more frequently to facilitate testing, while in QA, some tasks are also sped up for more frequent checks.

```
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
```

---

</SwmSnippet>

# Timer initialization and task execution

<SwmSnippet path="/taskrunner/libs/tasks.js" line="55">

---

Timers are initialized to automatically execute tasks at the specified intervals. Each timer is associated with a specific task, such as importing stock, tracking, or item data.

```
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
```

---

</SwmSnippet>

# Manual task execution

<SwmSnippet path="/taskrunner/libs/tasks.js" line="72">

---

In addition to automatic execution, tasks can be manually triggered. This is useful for immediate updates or testing purposes. Each task has a corresponding function to manually invoke it.

```
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
```

---

</SwmSnippet>

# Task execution and error handling

<SwmSnippet path="/taskrunner/libs/tasks.js" line="108">

---

The <SwmToken path="/taskrunner/libs/tasks.js" pos="35:10:10" line-data=" * @see {@link executeTask} (calls)">`executeTask`</SwmToken> function is the core of task execution. It logs the task details and calls the <SwmToken path="/taskrunner/libs/tasks.js" pos="115:7:9" line-data=" * Call a Importer.execute on a given action.">`Importer.execute`</SwmToken> method. Errors during execution are caught and logged, providing detailed information for debugging.

```
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
```

---

</SwmSnippet>

This setup ensures that tasks are executed at the right time and frequency, with flexibility for different environments and manual overrides when necessary.

<SwmMeta version="3.0.0" repo-id="Z2l0aHViJTNBJTNBVlclM0ElM0FyYXZpc2hhbQ==" repo-name="VW"><sup>Powered by [Swimm](https://app.swimm.io/)</sup></SwmMeta>
