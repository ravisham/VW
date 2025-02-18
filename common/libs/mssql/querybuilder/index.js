require("clarify");

var _ = require("underscore"),
    colors = require('colors'),
    Helprs = require("helprs"),
    debug = require("libs/buglog"),
    Exectimer = require("libs/helpers/exectimer"),
    dbStructure = require('libs/mssql/structure'),
    SqlString = require('sqlstring'),
    log = debug("libs", "mssql:querybuilder"),
    logMessage = {};

/**
 * Query Builder for MS SQL
 * @exports QBObj
 */
var QBObj = {
  /**
   *
   */
  addLogColumnRequirements: function (columnName, requirements) {
    var requirementsString = ""

    if (_.isString(requirements)) requirementsString = requirements
    else if (_.isArray(requirements)) {
      var numOfReqs = requirements.length

      requirements.forEach(function (str, i) {
        if (i === 0) requirementsString = str
        else if (i + 1 === numOfReqs) requirementsString += "and " + str
        else requirementsString += ", " + str
      })
    }

    columnName = columnName.replace(/(\[|\])/g, "").trim()

    if (!_.has(logMessage, "QueryRequirements")) logMessage.QueryRequirements = {}

    if (!_.has(logMessage.QueryRequirements, columnName)) logMessage.QueryRequirements[columnName] = []

    logMessage.QueryRequirements[columnName].push({
      RequirementValues: requirementsString,
      RequirementDescription: "Must Equal to the following values"
    })
  },
  /**
   *
   */
  create: function (options) {
    Exectimer.time("create()")
    var qry = ""
    options = options || {}
    if (options.type) {
      switch (options.type) {
        case "items":
          qry = __buildItemQuery()
          break
        case "inventory":
          qry = __buildInventoryQuery()
          break
        case "salesheader":
          qry = __buildSalesHeaderQuery()
          break
        case "salesheaderbypo":
          qry = __buildSalesHeaderByPONumQuery(options)
          break
        case "salesheaderstatusbypo":
          qry = __buildSalesHeaderByPONumStatusQuery(options)
          break

        case "salesinvoiceheader":
          qry = __buildSalesInvoiceHeaderQuery(options)
          break
        case "salesinvoiceheaderbypo":
          qry = __buildSalesInvoiceHeaderByPONumQuery(options)
          break
        case "pricing":
          qry = __buildPricingQuery(options)
          break
        case "publishpo":
          qry = __buildPublishPOQuery(options)
          break
        case "assignpo":
          qry = __buildOrderQuery(options)
          break
        case "getorder":
          qry = __getOrder(options)
          break
        case "crossreference":
          qry = __buildCrossReferenceQuery(options)
          break
        case "infoschema":
          qry = __buildInfoSchemaQuery(options)
          break
        case "search":
          qry = __buildSearchQuery(options)
          break
      }
    }

    // logMessage.DatabaseName = dbStructure.dbName();
    // logMessage.SchemaName = dbStructure.schemaName();
    // logMessage.QueryBuilt = qry;
    // logMessage.ExecutionTime = new Date().toLocaleString();
    // log(logMessage);

    log("Query Built: %s", colors.green(qry))
    logMessage = {}
    log(Exectimer.timeEnd("create()"))

    return qry
  }
}

module.exports = QBObj

/**
 * @memberOf module:QBObj
 * @private
 */
function __buildItemQuery() {
  var qry = "SELECT"

  qry +=
    " * FROM " +
    __sqlNC(dbStructure.dbName(), {
      spacing: false
    })

  qry +=
    "." +
    __sqlNC(dbStructure.schemaName(), {
      spacing: false
    })

  qry +=
    "." +
    __sqlNC(dbStructure.itemTableName(), {
      spacing: false
    })

  return qry
}

/**
 * @memberOf module:QBObj
 * @private
 */
function __buildOrderQuery(options) {
  var orderTable = dbStructure.get({
    from: "tables.orderHeader"
  })
  var qry = "WITH UpdateOrder AS ("

  qry += __getOrder(options)

  qry += ")"

  qry += " update UpdateOrder "

  // transaction type
  qry += "set " + __sqlNC(orderTable.columns.transactionType.name, { spacing: false }) + " = 2"

  //po number
  qry +=
    ", " +
    __sqlNC(orderTable.columns.externalDocNum.name, { spacing: false }) +
    " = '" +
    options.update.po_number +
    "'"

  // ship to name
  qry +=
    ", " +
    __sqlNC(orderTable.columns.shipToName.name, { spacing: false }) +
    " = '" +
    options.update.ship_to_info.customer_name +
    "'"

  // ship to address
  qry +=
    ", " +
    __sqlNC(orderTable.columns.shipToAddress.name, { spacing: false }) +
    " = '" +
    options.update.ship_to_info.address_1 +
    "'"

  // ship to address 2
  if (options.update.ship_to_info.address_2.length > 0) {
    qry +=
      ", " +
      __sqlNC(orderTable.columns.shipToAddress2.name, { spacing: false }) +
      " = '" +
      options.update.ship_to_info.address_2 +
      "'"
  }

  // ship to city
  qry +=
    ", " +
    __sqlNC(orderTable.columns.shipToCity.name, { spacing: false }) +
    " = '" +
    options.update.ship_to_info.city +
    "'"

  // ship to state
  qry +=
    ", " +
    __sqlNC(orderTable.columns.shipToCounty.name, { spacing: false }) +
    " = '" +
    options.update.ship_to_info.state +
    "'"

  // ship to zip
  qry +=
    ", " +
    __sqlNC(orderTable.columns.shipToPostCode.name, { spacing: false }) +
    " = '" +
    options.update.ship_to_info.zip +
    "'"

  // shipping agent
  qry +=
    ", " +
    __sqlNC(orderTable.columns.shippingAgent.name, { spacing: false }) +
    " = '" +
    options.update.shipping_options.shipping_agent +
    "'"

  // shipping eservice method
  qry +=
    ", " +
    __sqlNC(orderTable.columns.eShipAgentService.name, { spacing: false }) +
    " = '" +
    options.update.shipping_options.eship_agent_service_code +
    "'"

  // shipping method
  qry +=
    ", " + __sqlNC(orderTable.columns.shipmentMethod.name, { spacing: false }) + " = '" + "STANDARD" + "'"

  // console.log("Built Build Order Query");
  // console.log(qry);

  return qry
}

function __getOrder(options) {
  var orderTable = dbStructure.get({
    from: "tables.orderHeader"
  })
  var webOrderNum = options.update.webOrderNum

  var qry = "SELECT TOP 1 * FROM "

  qry += __sqlNC(dbStructure.dbName(), {
    spacing: false
  })

  qry +=
    "." +
    __sqlNC(dbStructure.schemaName(), {
      spacing: false
    })

  qry +=
    "." +
    __sqlNC(orderTable.name, {
      spacing: false
    })

  qry += " WHERE "

  qry += __sqlNC(orderTable.columns.webmasterOrderNum.name, {
    spacing: false
  })

  qry += " = '" + webOrderNum + "'"

  qry += " ORDER BY " + __sqlNC(orderTable.columns.orderDate.name, { spacing: false }) + " DESC"

  //  console.log("Built Get Order Query");
  //  console.log(qry);

  return qry
}

/**
 * @memberOf module:QBObj
 * @private
 */
function __buildInventoryQuery() {
  var inventoryTable = dbStructure.get({
    from: "tables.inventory"
  })
  var qry = "SELECT",
    selection = " *"

  /**
   * To SELECT Minimal.
   * If you want this query to select all
   * simply comment out the following code.
   */
  selection =
    " " +
    __sqlNC(inventoryTable.columns.itemNum.name, {
      spacing: false
    })
  selection +=
    ", " +
    __sqlNC(inventoryTable.columns.itemUnitCost.name, {
      spacing: false
    })
  selection +=
    ", " +
    __sqlNC(inventoryTable.columns.onHandQty.name, {
      spacing: false
    })
  selection +=
    ", " +
    __sqlNC(inventoryTable.columns.locCode.name, {
      spacing: false
    })

  /** Append the SELECTION values to the query */
  qry += selection

  qry +=
    " FROM " +
    __sqlNC(dbStructure.dbName(), {
      spacing: false
    })

  qry +=
    "." +
    __sqlNC(dbStructure.schemaName(), {
      spacing: false
    })

  qry +=
    "." +
    __sqlNC(inventoryTable.name, {
      spacing: false
    })

  /** Now we add a WHERE clause so we ONLY query inventory Items with lcation codes that we know. */
  qry = __addLocationCodesQuery(qry, inventoryTable.columns.locCode.name)

  return qry
}

/**
 * @memberOf module:QBObj
 * @private
 */
function __buildSalesHeaderQuery() {
  var salesHeaderTable = dbStructure.get({
    from: "tables.salesHeader"
  })
  var qry = "SELECT",
    selection = " *"
  /**
   * To SELECT Minimal.
   * If you want this query to select all
   * simply comment out the following code.
   */
  selection =
    " " +
    __sqlNC(salesHeaderTable.columns.timeStamp.name, {
      spacing: false
    })
  selection +=
    ", " +
    __sqlNC(salesHeaderTable.columns.docType.name, {
      spacing: false
    })
  selection +=
    ", " +
    __sqlNC(salesHeaderTable.columns.salesNum.name, {
      spacing: false
    })
  selection +=
    ", " +
    __sqlNC(salesHeaderTable.columns.customerNum.name, {
      spacing: false
    })
  selection +=
    ", " +
    __sqlNC(salesHeaderTable.columns.docNum.name, {
      spacing: false
    })
  selection +=
    ", " +
    __sqlNC(salesHeaderTable.columns.trackingNum.name, {
      spacing: false
    })
  /** Append the SELECTION values to the query */
  qry += selection

  qry +=
    " FROM " +
    __sqlNC(dbStructure.dbName(), {
      spacing: false
    })

  qry +=
    "." +
    __sqlNC(dbStructure.schemaName(), {
      spacing: false
    })

  qry +=
    "." +
    __sqlNC(salesHeaderTable.name, {
      spacing: false
    })

  //qry = __addLocationCodesQuery(qry, inventoryTable.columns.locCode.name);
  return qry
}
function __buildSalesHeaderByPONumQuery(options) {
  var docNum = options.options.docNum
  console.log("qry build docnum", docNum)
  console.log("qry build options", options)

  var salesHeaderTable = dbStructure.get({
    from: "tables.salesHeader"
  })
  var qry = "SELECT",
    selection = " COUNT(*)"
  /**
   * To SELECT Minimal.
   * If you want this query to select all
   * simply comment out the following code.
   */

  qry += selection

  qry +=
    " FROM " +
    __sqlNC(dbStructure.dbName(), {
      spacing: false
    })

  qry +=
    "." +
    __sqlNC(dbStructure.schemaName(), {
      spacing: false
    })

  qry +=
    "." +
    __sqlNC(salesHeaderTable.name, {
      spacing: false
    })

  // WHERE doc num = po num:
  qry += " WHERE "

  qry += __sqlNC(salesHeaderTable.columns.docNum.name, {
    //change from table definition
    spacing: false
  })

  qry += " = '" + docNum + "'" //change from option params

  return qry
}
function __buildSalesHeaderByPONumStatusQuery(options) {
  console.log("qry build")
  var docNum = options.options.docNum

  console.log("options", options)

  console.log("qry build TABLE 1 docnum", docNum)

  var salesInvoiceHeaderTable = dbStructure.get({
    from: "tables.salesHeader"
  })
  var qry = "SELECT",
    selection = " *"

  /** Append the SELECTION values to the query */
  qry += selection

  qry +=
    " FROM " +
    __sqlNC(dbStructure.dbName(), {
      spacing: false
    })

  qry +=
    "." +
    __sqlNC(dbStructure.schemaName(), {
      spacing: false
    })

  qry +=
    "." +
    __sqlNC(salesInvoiceHeaderTable.name, {
      spacing: false
    })
  // WHERE doc num = po num:
  qry += " WHERE "

  qry += __sqlNC(salesInvoiceHeaderTable.columns.docNum.name, {
    //change from table definition
    spacing: false
  })

  qry += " = '" + docNum + "'" //change from option params
  // console.log('after qry build',qry);
  //qry = __addLocationCodesQuery(qry, inventoryTable.columns.locCode.name);
  console.log(qry, "TABLE 1 QUERY")

  return qry
}
/**
 * @memberOf module:QBObj
 * @private
 */
function __buildSalesInvoiceHeaderByPONumQuery(options) {
  console.log("qry build")
  var docNum = options.options.docNum

  console.log("options", options)

  console.log("qry build docnum", docNum)

  var salesInvoiceHeaderTable = dbStructure.get({
    from: "tables.salesInvoiceHeader"
  })
  var qry = "SELECT",
    selection = " COUNT(*)"

  /** Append the SELECTION values to the query */
  qry += selection

  qry +=
    " FROM " +
    __sqlNC(dbStructure.dbName(), {
      spacing: false
    })

  qry +=
    "." +
    __sqlNC(dbStructure.schemaName(), {
      spacing: false
    })

  qry +=
    "." +
    __sqlNC(salesInvoiceHeaderTable.name, {
      spacing: false
    })
  // WHERE doc num = po num:
  qry += " WHERE "

  qry += __sqlNC(salesInvoiceHeaderTable.columns.docNum.name, {
    //change from table definition
    spacing: false
  })

  qry += " = '" + docNum + "'" //change from option params
  // console.log('after qry build',qry);
  //qry = __addLocationCodesQuery(qry, inventoryTable.columns.locCode.name);
  return qry
}

/**
 * @memberOf module:QBObj
 * @private
 */
function __buildSalesInvoiceHeaderQuery(options) {
  console.log("qry build TABLE 2")
  let docNum = options.options.docNum

  console.log("options", options)

  console.log("qry build TABLE 2 docnum", docNum)
  var salesInvoiceHeaderTable = dbStructure.get({
    from: "tables.salesInvoiceHeader"
  })
  var qry = "SELECT",
    selection = " *"
  /**
   * To SELECT Minimal.
   * If you want this query to select all
   * simply comment out the following code.
   */
  selection =
    " " +
    __sqlNC(salesInvoiceHeaderTable.columns.timeStamp.name, {
      spacing: false
    })
  selection +=
    ", " +
    __sqlNC(salesInvoiceHeaderTable.columns.salesNum.name, {
      spacing: false
    })
  selection +=
    ", " +
    __sqlNC(salesInvoiceHeaderTable.columns.customerNum.name, {
      spacing: false
    })
  selection +=
    ", " +
    __sqlNC(salesInvoiceHeaderTable.columns.locCode.name, {
      spacing: false
    })
  selection +=
    ", " +
    __sqlNC(salesInvoiceHeaderTable.columns.orderNum.name, {
      spacing: false
    })
  selection +=
    ", " +
    __sqlNC(salesInvoiceHeaderTable.columns.docNum.name, {
      spacing: false
    })
  selection +=
    ", " +
    __sqlNC(salesInvoiceHeaderTable.columns.postingDate.name, {
      spacing: false
    })
  selection +=
    ", " +
    __sqlNC(salesInvoiceHeaderTable.columns.agentCode.name, {
      spacing: false
    })
  selection +=
    ", " +
    __sqlNC(salesInvoiceHeaderTable.columns.trackingNum.name, {
      spacing: false
    })
  /** Append the SELECTION values to the query */
  qry += selection

  qry +=
    " FROM " +
    __sqlNC(dbStructure.dbName(), {
      spacing: false
    })

  qry +=
    "." +
    __sqlNC(dbStructure.schemaName(), {
      spacing: false
    })

  qry +=
    "." +
    __sqlNC(salesInvoiceHeaderTable.name, {
      spacing: false
    })
  // WHERE doc num = po num:
  qry += " WHERE "

  qry += __sqlNC(salesInvoiceHeaderTable.columns.docNum.name, {
    //change from table definition
    spacing: false
  })

  qry += " = '" + docNum + "'"
  //change from option params
  console.log("after qry build", qry)
  //qry = __addLocationCodesQuery(qry, inventoryTable.columns.locCode.name);
  console.log(qry, "TABLE 2 QUERY")
  return qry
}
  
/**
 * @memberOf module:QBObj
 * @private
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
 * Build the query for inserting either a Purchase Order Header or Purchase Order Line.
 * @memberOf module:QBObj
 * @private
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

   // console.log("Built Publish PO Query:");
   // console.log(qry);

    return qry;
}

/**
 * @memberOf module:QBObj
 * @private
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
 * @memberOf module:QBObj
 * @private
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
 * @memberOf module:QBObj
 * @private
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
 * @memberOf module:QBObj
 * @private
 * @description
 * SQL Naming Convention.
 * @param   {String}  sourcename  [description]
 * @param   {Object}  options     [description]
 * @return  {String}              [description]
 */
function __sqlNC(sourcename, options) {
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
 * @memberOf module:QBObj
 * @private
 */
function __addLocationCodesQuery(qry, locCodeColumnName) {
    var columnQryString = __sqlNC(locCodeColumnName, {
        spacing: false
    });

    qry += " WHERE " + columnQryString;

    var locCodesObj = dbStructure.getLocationCodes();
    var locationCodes = _.allKeys(locCodesObj);
    var qryOpts = {
        spacing: false,
        excludeBrackets: true,
        includeSingleQuotes: true
    };

    for (var c = 0; c < locationCodes.length; c++) {
        var code = locationCodes[c];
        var appendToQry;

        var qryEnd = ' = ' + __sqlNC(code, qryOpts);

        // if first or last
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
 * @memberOf module:QBObj
 * @private
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
    console.log('@nav_customer_id', options.nav_customer_id);
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
 * Append the part of the query for purchase orders that
 * lists the columns to insert into and the values to insert into them.
 * @memberOf module:QBObj
 * @private
 * @returns {string}
 * @param {string} qry The query as it's been built so far.
 * @param {object} options The values to insert.
 */
function __addPublishPOValuesQuery(qry, options) {
    var valuesQuery = "";
   
    var valuesQueryObj = __generatePOValues(options);
    // console.log('add options',options);
    valuesQuery += valuesQueryObj.columnsQuery;
    /** Tells the query to return the Inserted Record */
    valuesQuery += " OUTPUT INSERTED.*";
    valuesQuery += " VALUES ";
    valuesQuery += valuesQueryObj.valuesQuery;

    qry += valuesQuery;

    return qry;
}

/**
 * @memberOf module:QBObj
 * @private
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
 * Generate an object with columnsQuery and valuesQuery properties
 * that represent the SQL statement to list the columns and their values when inserting.
 * @memberOf module:QBObj
 * @private
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
 * Get all of the Purchase Order values,
 * wrapping as needed for their respective SQL types
 * @memberOf module:QBObj
 * @private
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
    console.log('loc obj',locObj);
    for (var columnName in locObj) {
        if (locObj.hasOwnProperty(columnName)) {
            var colvalue = locObj[columnName];
            var datatype = tableColumns[columnName].datatype;
            var notnull = false;
            if (tableColumns[columnName].notnull === true) {
                notnull = true;
            }
            var maxlength;

            if (_.has(tableColumns[columnName], 'capitalize') && datatype === "varchar")
                if ( colvalue ) colvalue = colvalue.toUpperCase();

            if (datatype === "varchar") {
                // For type varchar
                 if (typeof colvalue === 'string') {
                    var beforeEscaping = colvalue;
                    // Escape single quotes to two single quotes
                    colvalue = colvalue.replace(/\'/g, '\'\'');
                    // If it changed, log the change
                    if (beforeEscaping !== colvalue) {
                        console.log('Escaped ' + beforeEscaping + ' to ' + colvalue);
                    }

                    // Truncate too long strings
                    if (typeof tableColumns[columnName].maxlength === 'number') {
                        maxlength = tableColumns[columnName].maxlength;
                        if (colvalue.length > maxlength) {
                            console.log('WARNING: __getPOValuesObject in /common/libs/mssql/querybuilder/index.js - truncating colvalue due to varchar length');
                            console.log('For column ' + columnName);
                            console.log('Truncating ' + colvalue);
                            colvalue = colvalue.substring(0, maxlength);
                            // Remove any trailing single quotes that were left after two single quotes got split
                            if ((colvalue.lastIndexOf('\'') === maxlength - 1) && (colvalue.lastIndexOf('\'\'') !== maxlength - 2)) {
                                colvalue = colvalue.substring(0, maxlength - 1);
                            }
                            console.log('To ' + colvalue);
                        }
                    }
                } else if (notnull) {
                    console.log('WARNING: __getPOValuesObject in /common/libs/mssql/querybuilder/index.js - forcing non string colvalue to string due to varchar not null');
                    console.log('For column ' + columnName);
                   // Force not null values to be their string representation
                    // It may send some garbage over but at least it won't break the query
                    colvalue = colvalue.toString();
               }
                columnValues[tableColumns[columnName].name] = "'" + colvalue + "'";
            } else if (datatype === "datetime") {
                // For type datetime
                colvalue = "'" + colvalue + "'";
                columnValues[tableColumns[columnName].name] = "convert(datetime, " + colvalue + ", 105)";
            } else if (datatype === "decimal") {
                // Attempt to convert strings to numbers
                if (typeof colvalue === 'string') {
                    try {
                        colvalue = parseFloat(colvalue, 10);
                    } catch (e) {
                        colvalue = null;
                    }
                }
                // Force NOT NULL values to 0 if not a number
                if (notnull) {
                    if (typeof colvalue !== 'number') {
                        console.log('WARNING: __getPOValuesObject in /common/libs/mssql/querybuilder/index.js - forcing non number colvalue to 0 due to decimal not null');
                      
                        colvalue = 0;
                    }
                }
                columnValues[tableColumns[columnName].name] = colvalue;
            } else {
                // For all other types
                columnValues[tableColumns[columnName].name] = colvalue;
            }
        }
    }

    return columnValues;
}

/**
 * Convert Date string into a Unix Timestamp.
 * From 2016-12-27 to 135895961313
 * @memberOf module:QBObj
 * @private
 * @param   {String}  datestring  Date
 * @return  {Number}              Unix Timestamp of the date
 */
function __dateToTimestamp(datestime) {
    var datestring = datestime.toLocaleString();
    var newDate = datestring[1] + "/" + datestring[2] + "/" + datestring[0];
    return new Date(newDate).getTime();
}

/**
 * When calling .getMonth() you need to add +1 to display the correct month.
 * Javascript count always starts at 0 (look here to check why), so calling .getMonth() in may will return 4 and not 5.
 *
 * So in your code we can use currentdate.getMonth()+1 to output the correct value. In addition:
 *     .getDate() returns the day of the month <- this is the one you want
 *     .getDay() is a separate method of the Date object which will return an integer representing
 *         the current day of the week (0-6) 0 == Sunday etc
 * @memberOf module:QBObj
 * @private
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