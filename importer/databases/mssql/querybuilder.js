const _ = require('underscore');
const path = require('path');
const config = require('config');
const sql = require('mssql');
const debug = require('debug')('importer:mssql:querybuilder');
const dbStructure = require('./structure');

/**
 * @module QueryBuilder
 */
module.exports = {
    /**
     *
     * @alias module:QueryBuilder.buildItemQuery
     * @see {@link module:QueryBuilder~generateItemsQuery} (calls)
     */
    buildItemQuery () {
        return generateItemsQuery('SELECT TOP 1');
    },

    /**
     *
     * @alias module:QueryBuilder.buildItemsQuery
     * @see {@link module:QueryBuilder~generateItemsQuery} (calls)
     */
    buildItemsQuery () {
        return generateItemsQuery();
    },

    /**
     * Create an MS SQL query string
     * That SELECTs *, itemNum, itemUnitCost, onHandQty, locCode
     * FROM dnName.schemaName.inventoryTable
     * WHERE locCodeColumnName is a known location code
     *
     * @alias module:QueryBuilder.buildStockQuery
     * @returns {string}
     * @see {@link module:Structure.get} (calls)
     * @see {@link module:QueryBuilder.buildItemQuery} (calls)
     * @see {@link module:QueryBuilder~sqlNC} (calls)
     * @see {@link module:QueryBuilder~addLocationCodesQuery} (calls)
     */
    buildStockQuery () {
        let inventoryTable = dbStructure.get({
            from: "tables.inventory"
        });
        let qry = "SELECT";
        let selection = " *";
        selection = " " + sqlNC(inventoryTable.columns.itemNum.name, {
            spacing: false
        });
        selection += ", " + sqlNC(inventoryTable.columns.itemUnitCost.name, {
            spacing: false
        });
        selection += ", " + sqlNC(inventoryTable.columns.onHandQty.name, {
            spacing: false
        });
        selection += ", " + sqlNC(inventoryTable.columns.locCode.name, {
            spacing: false
        });
        /** Append the SELECTION values to the query */
        qry += selection;
        qry += " FROM " + sqlNC(dbStructure.dbName(), {
            spacing: false
        });
        qry += "." + sqlNC(dbStructure.schemaName(), {
            spacing: false
        });
        qry += "." + sqlNC(inventoryTable.name, {
            spacing: false
        });
        /** Now we add a WHERE clause so we ONLY query inventory Items with lcation codes that we know. */
        return addLocationCodesQuery(qry, inventoryTable.columns.locCode.name);
    },


/**
     * Create an MS SQL query string
     * That SELECTs *, itemNum, itemUnitCost, onHandQty, locCode
     * FROM dnName.schemaName.inventoryTable
     * WHERE locCodeColumnName is a known location code
     *
     * @alias module:QueryBuilder.buildTrackQuery
     * @returns {string}
     * @see {@link module:Structure.get} (calls)
     * @see {@link module:QueryBuilder~sqlNC} (calls)
     */
    buildTrackQuery () {
        let trackTable = dbStructure.get({
            from: "tables.tracking"
        });
         let qry = "SELECT";
    let selection = " *";
    //console.log('qry',qry);
   
    selection = " " + sqlNC(trackTable.columns.extDocNum.name, {
        spacing: false
    }); 
    selection += ", " + sqlNC(trackTable.columns.docNum.name, {
        spacing: false
    });
    selection += ", " + sqlNC(trackTable.columns.trackingNum.name, {
        spacing: false
    });
    selection += ", " + sqlNC(trackTable.columns.shippingAgent.name, {
        spacing: false
    });
    /** Append the SELECTION values to the query */
    qry += selection;
    qry += " FROM " + sqlNC(dbStructure.dbName(), {
        spacing: false
    });
    qry += "." + sqlNC(dbStructure.schemaName(), {
        spacing: false
    });
    qry += "." + sqlNC(trackTable.name, {
        spacing: false
    });
    qry += " WHERE " + sqlNC(trackTable.columns.postDate.name, {
        spacing: false
    })+ " BETWEEN GETDATE()-7 AND GETDATE()";
    //console.log('qry',qry);
    /** Now we add a WHERE clause so we ONLY query inventory Items with lcation codes that we know. */
    return qry;
    }
};

/**
 * @inner
 * @description
 * Convert a string according to SQL Naming Convention.
 *
 * If options.spacig, include a space around the outside of the return string.
 * If options.excludeBrackets, do not wrap [ ] around the return string.
 * If options.includeSingleQuotes (and options.excludeBrackets is true), wrap single quotes around the return string.
 *
 * @example
 * sqlNC("test", {spacing: false, excludeBrackets: false, includeSingleQuotes: false})
 * returns "[test]"
 *
 * @example
 * sqlNC("test", {spacing: false, excludeBrackets: false, includeSingleQuotes: true})
 * returns "[test]" // includeSingleQuotes does nothing if excludeBrackets is false
 *
 * @example
 * sqlNC("test", {spacing: false, excludeBrackets: true, includeSingleQuotes: false})
 * returns "test"
 *
 * @example
 * sqlNC("test", {spacing: false, excludeBrackets: true, includeSingleQuotes: true})
 * returns "'test'"
 *
 * @example
 * sqlNC("test", {spacing: true, excludeBrackets: false, includeSingleQuotes: false})
 * returns " [test] "
 *
 * @example
 * sqlNC("test", {spacing: true, excludeBrackets: false, includeSingleQuotes: true})
 * returns " [test] " // includeSingleQuotes does nothing if excludeBrackets is false
 *
 * @example
 * sqlNC("test", {spacing: true, excludeBrackets: true, includeSingleQuotes: false})
 * returns " test "
 *
 * @example
 * sqlNC("test", {spacing: true, excludeBrackets: true, includeSingleQuotes: true})
 * returns " 'test' "
 *
 * @param   {String}  sourcename                    The string to convert.
 * @param   {Object}  options                       Properties controlling the type of conversion
 * @param   {boolean} options.spacing               Should a space be wrapped around the outside
 * @param   {boolean} options.excludeBrackets       Should square brackets NOT be added around the sourcename
 * @param   {boolean} options.includeSingleQuotes   If excludeBrackets is false, should single quotes be wrapped instead
 * @return  {String}              
 */
function sqlNC(sourcename, options) {
    options = options || {
        spacing: true,
        excludeBrackets: false,
        includeSingleQuotes: false
    };

    if (!options.spacing) {
        if (options.excludeBrackets) {
            if (options.includeSingleQuotes)
                return "'" + sourcename + "'";
            return sourcename;
        }
        return "[" + sourcename + "]";
    }

    if (options.excludeBrackets)
        if (options.includeSingleQuotes)
            return " '" + sourcename + "' ";
        return " " + sourcename + " ";
    return " [" + sourcename + "] ";
}

/**
 * @inner
 * @description
 * When passed the name of the location code colum (locCodeColumnName),
 * append to the passed qry
 *
 * " WHERE [locCodeColumnName] = 'CODE1' OR 'CODE2' OR 'CODE3' ... OR 'CODEN'"
 *
 * The set of possible codes are pulled from dbStructure.getLocationCodes()
 * which is in the fule /importer/databases/mssql/querybuilder.js
 *
 * This means a query (qry), modified by this function, will only pull known location codes,
 * where "known" is defined by dbStructure.getLocationCodes()
 *
 * @returns {string}
 * @param {string} qry The MS SQL query to modify with a WHERE clause
 * @param {string} locCodeColumnName The name of the location column
 *
 * @see {@link module:QueryBuilder.buildStockQuery} (called by)
 * @see {@link module:QueryBuilder~sqlNC} (calls)
 */
function addLocationCodesQuery(qry, locCodeColumnName) {
    let columnQryString = sqlNC(locCodeColumnName, {
        spacing: false
    });
    qry += " WHERE " + columnQryString;
    let locCodesObj = dbStructure.getLocationCodes();
    let locationCodes = _.allKeys(locCodesObj);
    let qryOpts = {
        spacing: false,
        excludeBrackets: true,
        includeSingleQuotes: true
    };
    for (let c = 0; c < locationCodes.length; c++) {
        let code = locationCodes[c];
        let appendToQry;
        let qryEnd = ' = ' + sqlNC(code, qryOpts);
        if (c === 0)
            appendToQry = qryEnd;
        if (c > 0) {
            appendToQry = ' OR ' + columnQryString;
            appendToQry += qryEnd;
        }
        qry += appendToQry;
    }
    return qry;
}

/**
 * @inner
 * @description
 * Returns a query that selects everything from the items table
 *
 * @see {@link module:QueryBuilder.buildItemQuery} (called by)
 * @see {@link module:QueryBuilder.buildItemsQuery} (called by)
 * @see {@link module:QueryBuilder~sqlNC} (calls)
 */
function generateItemsQuery(query = 'SELECT') {
    query += " * FROM " + sqlNC(dbStructure.dbName(), {
        spacing: false
    });
    query += "." + sqlNC(dbStructure.schemaName(), {
        spacing: false
    });
    query += "." + sqlNC(dbStructure.itemTableName(), {
        spacing: false
    });
    return query;
}

/**
 * @inner
 * @description
 * Can't find anything that actually calls it.
 * Seems abandonned.
 *
 * @see {@link module:QueryBuilder~__sqlNC} (calls)
 */
function __buildPricingQuery(options) {
    var qry = "SELECT ";

    qry += "* FROM " + __sqlNC(dbStructure.dbName(), {
        spacing: false
    });

    qry += "." + __sqlNC(dbStructure.schemaName(), {
        spacing: false
    });

    var pricingTable = dbStructure.get({
        from: "tables.pricing"
    });

    qry += "." + __sqlNC(pricingTable.name, {
        spacing: false
    });

    // if (options.part_number) {
        // Location Code to match any of the known location codes
        qry = __addDealerItemPricingQuery(qry, pricingTable, options);
    // }

    return qry;
}

/**
 * @inner
 * @description
 * Can't find anything that actually calls it.
 * Seems abandonned.
 *
 * @see {@link module:QueryBuilder~__sqlNC} (calls)
 */
function __buildPublishPOQuery(options) {
    var orderTable = null;

    switch (options.category) {
        case "header":
            orderTable = options.orderTable = dbStructure.get({
                from: "tables.orderHeader"
            });
            break;
        case "line":
            orderTable = options.orderTable = dbStructure.get({
                from: "tables.orderLine"
            });
            break;
    }

    var qry = "INSERT INTO ";

    qry += __sqlNC(dbStructure.dbName(), {
        spacing: false
    });

    qry += "." + __sqlNC(dbStructure.schemaName(), {
        spacing: false
    });

    qry += "." + __sqlNC(orderTable.name, {
        spacing: false
    });

    qry = __addPublishPOValuesQuery(qry, options);

    return qry;
}

/**
 * @inner
 * @description
 * Can't find anything that actually calls it.
 * Seems abandonned.
 *
 * @see {@link module:QueryBuilder~__sqlNC} (calls)
 */
function __buildCrossReferenceQuery(options) {
    var pricingTable = dbStructure.get({
        from: "tables.pricing"
    });
    var qry = "SELECT ";

    qry += "* FROM " + __sqlNC(dbStructure.dbName(), {
        spacing: false
    });

    qry += "." + __sqlNC(dbStructure.schemaName(), {
        spacing: false
    });

    qry += "." + __sqlNC(pricingTable.name, {
        spacing: false
    });

    qry = __addCrossRefPartNumQuery(qry, pricingTable, options);

    return qry;
}

/**
 * @inner
 * @description
 * Can't find anything that actually calls it.
 * Seems abandonned.
 *
 * @see {@link module:QueryBuilder~__sqlNC} (calls)
 */
function __buildInfoSchemaQuery(options) {
    var qry = "USE ";

    qry += __sqlNC(dbStructure.dbName(), {
        spacing: false
    });

    switch (options.category) {
        case "tables":
            qry += " SELECT * FROM [INFORMATION_SCHEMA].[TABLES]";
            break;
    }

    return qry;
}

/**
 * @inner
 * @description
 * Can't find anything that actually calls it.
 * Seems abandonned.
 *
 * @see {@link module:QueryBuilder~__sqlNC} (calls)
 */
function __buildSearchQuery(options) {
    var itemTable = dbStructure.get({
        from: "tables.items"
    });
    var qry = __buildItemQuery();

    qry += " WHERE ";

    qry += __sqlNC(itemTable.columns.itemNum.name, {
        spacing: false
    });

    qry += " LIKE " + __sqlNC(options.term, {
        spacing: false,
        excludeBrackets: true,
        includeSingleQuotes: true
    });

    switch (options.category) {
        case "xrefs":
            qry += " AND ";
            qry += "[Private Label Customer 1] = " + __sqlNC(options.dealer.nav_customer_id, {
                spacing: false,
                excludeBrackets: true,
                includeSingleQuotes: true
            });
            break;
    }

    return qry;
}

/**
 * @inner
 * @description
 * Seems abandonned. The methods that call it don't, themselves, get called from anywhere.
 *
 * @see {@link module:QueryBuilder~__buildPricingQuery} (called by)
 * @see {@link module:QueryBuilder~__sqlNC} (calls)
 */
function __addDealerItemPricingQuery(qry, pricingTable, options) {
    var itemColumnName = pricingTable.columns.itemNum.name;
    var custColumnName = pricingTable.columns.customerNum.name;

    itemColumnName = __sqlNC(itemColumnName, {
        spacing: false
    });

    custColumnName = __sqlNC(custColumnName, {
        spacing: false
    });

    qry += " WHERE " + custColumnName;
    qry += " = @nav_customer_id";
    // QBObj.addLogColumnRequirements(custColumnName, options.nav_customer_id);

    if( options.part_number && Array.isArray( options.part_number ) && options.part_number.length ) {
        qry += " AND " + itemColumnName + " IN ( ";
        qry += options.part_number.map(function( partNumber, index, array ) {
            return `@part_number_${ index + 1 }`;
        }).join( ", " );
        qry += " )";
        // QBObj.addLogColumnRequirements(itemColumnName, options.part_number.join( ", " ));
    }

    var qryOpts = {
        spacing: false,
        excludeBrackets: true
    };

    return qry;
}

/**
 * @inner
 * @description
 * Seems abandonned. The methods that call it don't, themselves, get called from anywhere.
 *
 * @see {@link module:QueryBuilder~__buildPublishPOQuery} (called by)
 * @see {@link module:QueryBuilder~__generatePOValues} (calls)
 */
function __addPublishPOValuesQuery(qry, options) {
    var valuesQuery = "";
    var valuesQueryObj = __generatePOValues(options);

    valuesQuery += valuesQueryObj.columnsQuery;
    /** Tells the query to return the Inserted Record */
    valuesQuery += " OUTPUT INSERTED.*";
    valuesQuery += " VALUES ";
    valuesQuery += valuesQueryObj.valuesQuery;

    qry += valuesQuery;

    return qry;
}

/**
 * @inner
 * @description
 * Seems abandonned. The methods that call it don't, themselves, get called from anywhere.
 *
 * @see {@link module:QueryBuilder~__buildCrossReferenceQuery} (called by)
 * @see {@link module:QueryBuilder~__sqlNC} (calls)
 */
function __addCrossRefPartNumQuery(qry, pricingTable, options) {
    var partNumber = options.part_number || null;
    var privateLabel = options.privateLabel || null;
    var itemColumnName = pricingTable.columns.itemNum.name;
    var custColumnName = pricingTable.columns.customerNum.name;

    itemColumnName = __sqlNC(itemColumnName, {
        spacing: false
    });

    custColumnName = __sqlNC(custColumnName, {
        spacing: false
    });

    if (partNumber) {
        QBObj.addLogColumnRequirements(itemColumnName, partNumber);
        qry += " WHERE " + itemColumnName;
        qry += " = '" + partNumber + "'";
    }

    /**
     * If `privateLabel` is passed make sure the "Customer No_" equals
     * the `privateLabel` value.
     *
     * This is commented out at the moment, since VisionWheel did state that
     * it doesn't matter if one dealer has the Referencing Item number from another
     * dealer. However if that changes, all we have to do, is uncomment the code below.
     */
    if (privateLabel) {
        QBObj.addLogColumnRequirements(custColumnName, privateLabel);
        if (partNumber)
            qry += " AND " + custColumnName;
        else
            qry += " WHERE " + custColumnName;
        qry += " = '" + privateLabel + "'";
    }

    return qry;
}

/**
 * @inner
 * @description
 * Seems abandonned. The methods that call it don't, themselves, get called from anywhere.
 *
 * @see {@link module:QueryBuilder~__addPublishPOValuesQuery} (called by)
 * @see {@link module:QueryBuilder~__getPOValuesObject} (calls)
 * @see {@link module:QueryBuilder~__sqlNC} (calls)
 */
function __generatePOValues(options) {
    var columnValues = __getPOValuesObject(options);
    var columnValuesQuery = {}, columnsQuery = "", valuesQuery = "";
    var columnValuesKeys = _.allKeys(columnValues);
    var numOfKeys = columnValuesKeys.length;
    var numOfCurrentCol = 0;

    for (var key in columnValues) {
        if (columnValues.hasOwnProperty(key)) {
            var columnValue = columnValues[key];
            var columnKey = __sqlNC(key, {
                spacing: false
            });

            if (numOfCurrentCol === 0) {
                columnsQuery = "(" + columnKey + ",";
                valuesQuery = "(" + columnValue + ",";
            } else if ((numOfCurrentCol + 1) === numOfKeys) {
                columnsQuery += columnKey + ")";
                valuesQuery += columnValue + ")";
            } else {
                columnsQuery += columnKey + ",";
                valuesQuery += columnValue + ",";
            }

            numOfCurrentCol++;
        }
    }

    columnValuesQuery.columnsQuery = columnsQuery;
    columnValuesQuery.valuesQuery = valuesQuery;

    return columnValuesQuery;
}

/**
 * @inner
 * @description
 * Seems abandonned. The methods that call it don't, themselves, get called from anywhere.
 *
 * @see {@link module:QueryBuilder~__generatePOValues} (called by)
 */
function __getPOValuesObject(options) {
    var orderTable = options.orderTable;
    var tableColumns = orderTable.columns;
    var columnValues = {};
    var locObj = null;

    switch (options.category) {
        case "header":
            locObj = options.locationHeader;
            break;
        case "line":
            locObj = options.locationLine;
            break;
    }

    for (var columnName in locObj) {
        if (locObj.hasOwnProperty(columnName)) {
            var colvalue = locObj[columnName];
            var datatype = tableColumns[columnName].datatype;

            if (_.has(tableColumns[columnName], 'capitalize') && datatype === "varchar")
                colvalue = colvalue.toUpperCase();

            if (datatype === "varchar")
                columnValues[tableColumns[columnName].name] = "'" + colvalue + "'";
            else if (datatype === "datetime") {
                colvalue = "'" + colvalue + "'";
                columnValues[tableColumns[columnName].name] = "convert(datetime, " + colvalue + ", 105)";
            } else
                columnValues[tableColumns[columnName].name] = colvalue;
        }
    }

    return columnValues;
}

/**
 * @inner
 * @description
 * Convert Date string into a Unix Timestamp.
 * From 2016-12-27 to 135895961313
 * @param   {String}  datestring  Date
 * @return  {Number}              Unix Timestamp of the date
 */
function __dateToTimestamp(datestime) {
    var datestring = datestime.toLocaleString();
    var newDate = datestring[1] + "/" + datestring[2] + "/" + datestring[0];
    return new Date(newDate).getTime();
}

/**
 * @inner
 * @description
 * When calling .getMonth() you need to add +1 to display the correct month.
 * Javascript count always starts at 0 (look here to check why), so calling .getMonth() in may will return 4 and not 5.
 *
 * So in your code we can use currentdate.getMonth()+1 to output the correct value. In addition:
 *     .getDate() returns the day of the month <- this is the one you want
 *     .getDay() is a separate method of the Date object which will return an integer representing
 *         the current day of the week (0-6) 0 == Sunday etc
 * @param   {String}  datestring  Date
 * @return  {String}              Date Time of the date string.
 */
function __dateToDateTime(datetime) {
    datestring = datestring.split("-");
    /**
     * Rearrange so that JavaScripts Native Date method understands the date.
     * From 2016-12-27 to 12-27-2016
     * @type  {String}
     */
    var newDate = datestring[1] + "/" + datestring[2] + "/" + datestring[0];
    newDate = new Date(newDate);

    var datetime = currentdate.getDate();
    datetime += "/" + (currentdate.getMonth()+1);
    datetime += "/" + currentdate.getFullYear();
    datetime += " @ " + currentdate.getHours();
    datetime += ":" + currentdate.getMinutes();
    datetime += ":" + currentdate.getSeconds();

    return datetime;
}