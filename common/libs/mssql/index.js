/**
 * @module libs/mssql
 * @type {Object}
 * @fileOverview  This Module will be responsible for making sure a proper connection has been established.
 */

var util = require('util'),
	Q = require('q'),
	_ = require('underscore'),
	Helprs = require('helprs'),
	sql = require('mssql'),
	ReadableStrm = require('readable-stream'),
	colors = require('libs/colors'),
	debug = require('libs/buglog'),
	log = debug('libs', 'mssql'),
	SqlEvtObj = require('libs/helpers/evtTarget'),
	contentStream = require('libs/helpers/content-stream'),
	Exectimer = require('libs/helpers/exectimer'),
	dbStructure = require('./structure'),
	qryBuilder = require('./querybuilder');

require('clarify');

sql.Promise = Q;

var invRecCount = 0;
var connectionSettings = null;
var sqlConnection = null;
var connectionState = 'closed';

var connectStatus = new SqlEvtObj();

/**
 * Handle MS SQL (NAV) connections.
 * @exports MS
 */
var mssqlObject = {
  /**
   * @returns {Promise}
   */
  getDealerItems: function (parameters) {
    var start = new Date().getTime()
    console.log("MSSQL.getDealerItems - initializing")
    var deferred = Q.defer()
    var nav_customer_id = parameters.nav_customer_id
    var part_number = parameters.part_number
    __getDealerItems({
      nav_customer_id: nav_customer_id,
      part_number: part_number
    })
      .then(function (items) {
        console.log("MSSQL.getDealerItems - then after " + (new Date().getTime() - start) + "ms")
        deferred.resolve(
          items.map(function (itm, index, array) {
            return {
              part_number: itm["Item No_"],
              price: itm["Unit Price"],
              xref: itm["Item Xref1"]
            }
          })
        )
      })
      .fail(function (error) {
        console.log("MSSQL.getDealerItems ERROR - fail after " + (new Date().getTime() - start) + "ms")
        deferred.reject(error)
      })
      .done(function () {
        console.log("MSSQL.getDealerItems done after " + (new Date().getTime() - start) + "ms")
      })
    return deferred.promise
  },

  /**
   * @property {boolean}
   */
  hasInitialized: false,

  /**
   * Method to cross reference Part numbers in NAV.
   * The method will query table `[Vision Wheel, Inc_$E-Comm Cust Sales Price]`
   * with the provided part number for existence.
   * @param   {Object}  parameters    Parameters containing what to search for
   * @example <caption>Example Usage of the Parameters Object</caption>
   * {
   *     partNumber: "58M5665MBMF38"
   * }
   * @param   {Object}  options       Options properties have not yet been applied.
   * @return  {Object|Array}                Results from the query.
   */
  crossReference: function (parameters, options) {
    var deferred = Q.defer()
    parameters = parameters || {}
    options = options || {}

    if (!parameters.part_number && !parameters.privateLabel) {
      var hint = "No Part Number was Provided."
      hint += "\nNo Private Label was Provided."
      hint += "\nIf no Part Number is provided then a Private Label MUST be provided."
      var err = Helprs.err("Bad Parameters Provided.", {
        statusCode: 1002,
        parameters: parameters,
        hint: hint
      })
      deferred.reject(err)
    } else {
      __crossReference(parameters, options)
        .then(function (response) {
          deferred.resolve(response)
        })
        .fail(function (err) {
          deferred.reject(err)
        })
        .done()
    }

    return deferred.promise
  },

  /**
   *
   */
  initialize: function (settings, callback) {
    var buildCfg
    console.log("MSSQL initialize: Starting.")
    if (!connectionSettings && settings) {
      if (settings.mssqlDatabase) connectionSettings = settings.mssqlDatabase
    }

    if (!settings && connectionSettings) settings = connectionSettings

    if (!settings.environment) {
      settings.environment = "development"
      settings.debug = true
    } else if (settings.environment === "development") settings.debug = true

    if (settings.mssqlDatabase) settings = settings.mssqlDatabase

    dbStructure.initialize(settings)

    // Prepare a connection pool
    // ConnectionPool was called Connection prior to v4
    buildCfg = __buildConfig(settings)
    console.log("MSSQL initialize: connecting with the build config", JSON.stringify(buildCfg))
    sqlConnection = new sql.Connection(buildCfg)

    // Attempt to open a connection
    console.log("MSSQL initialize: Connecting.")
    sqlConnection.connect(function (err) {
      // Report any errors
      if (err) {
        console.log("MSSQL initialize: Database Connection Failed!")
        if (err.ConnectionError) {
          switch (err.ConnectionError) {
            case "ELOGIN":
              console.log("MSSQL initialize: Login Failed!\n")
              break
            case "ETIMEOUT":
              console.log("MSSQL initialize: Connection timeout!\n")
              break
            case "EALREADYCONNECTED":
              console.log("MSSQL initialize: Database is already connected!\n")
              break
            case "EALREADYCONNECTING":
              console.log("MSSQL initialize: Already connecting to database!\n")
              break
            case "EINSTLOOKUP":
              console.log("MSSQL initialize: Instance lookup failed!\n")
              break
            case "ESOCKET":
              console.log("MSSQL initialize: Socket error!\n")
              break
          }
        }
        console.log(err)
        if (callback) return callback(err)
        throw err
      } else {
        // If successful
        console.log("MSSQL initialize: Initialized")
        // Trigger the open event on connectStatus
        connectStatus.open()
        // Track that the mssqlObject has initialized
        mssqlObject.hasInitialized = true
        // Fire any callback
        if (callback) return callback(null, _.extend(connectionSettings, sqlConnection))
      }
    })
  },

  /**
   *
   */
  testConnection: function (settings, callback) {
    if (!connectionSettings && settings) {
      if (settings.mssqlDatabase) connectionSettings = settings.mssqlDatabase
    }

    if (!settings && connectionSettings) settings = connectionSettings

    if (settings.mssqlDatabase) settings = settings.mssqlDatabase

    sqlConnection = new sql.Connection(__buildConfig(settings))

    sqlConnection.connect(function (err) {
      if (err) {
        if (callback) return callback(err)
        else throw err
      } else {
        sqlConnection.close()
        if (callback) return callback(null, _.extend(connectionSettings, sqlConnection))
      }
    })
  },

  /**
   *
   */
  getNavInventory: function () {
    var deferred = Q.defer()

    Exectimer.time("getNavInventory()")

    __getLocationInventoryData()
      .then(function (inventory) {
        log("Writable Stream Retrieved (%s) Records Total", colors.green(invRecCount))

        //var parsedInventory = __parseLocInventory(inventory);

        if (!_.isEmpty(inventory)) {
          log(Exectimer.timeEnd("getNavInventory()"))
          deferred.resolve(inventory)
        } else {
          log(Exectimer.timeEnd("getNavInventory()"))
          deferred.reject(
            Helprs.err("No Records Found", {
              statusCode: 1003
            })
          )
        }
      })
      .fail(function (err) {
        deferred.reject(err)
      })
      .done()

    return deferred.promise
  },
  /**
   *
   */
  getSalesOrderNums: function () {
    var deferred = Q.defer()
    console.log("get orders sql lib")
    Exectimer.time("getSalesOrderNums()")

    __getSalesHeaderData()
      .then(function (inventory) {
        log("Writable Stream Retrieved (%s) Records Total", colors.green(invRecCount))

        //var parsedInventory = __parseLocInventory(inventory);

        if (!_.isEmpty(inventory)) {
          log(Exectimer.timeEnd("getSalesOrderNums()"))
          deferred.resolve(inventory)
        } else {
          log(Exectimer.timeEnd("getSalesOrderNums()"))
          deferred.reject(
            Helprs.err("No Records Found", {
              statusCode: 1003
            })
          )
        }
      })
      .fail(function (err) {
        console.log("get orders sql lib fail")

        deferred.reject(err)
      })
      .done()

    return deferred.promise
  },

  getSalesOrderByPONum: function (options, getCount) {
    var deferred = Q.defer()
    console.log("get order by po sql lib")
    Exectimer.time("getSalesOrderNums()")

    __getSalesOrderByPONum(options, getCount)
      .then(function (inventory) {
        log("Writable Stream Retrieved (%s) Records Total", colors.green(invRecCount))

        //var parsedInventory = __parseLocInventory(inventory);

        if (!_.isEmpty(inventory)) {
          log(Exectimer.timeEnd("getSalesOrderNums()"))
          deferred.resolve(inventory)
        } else {
          log(Exectimer.timeEnd("getSalesOrderNums()"))
          deferred.reject(
            Helprs.err("No Records Found", {
              statusCode: 1003
            })
          )
        }
      })
      .fail(function (err) {
        console.log("get orders sql lib fail")

        deferred.reject(err)
      })
      .done()

    return deferred.promise
  },
  /**
   *
   */
  getSalesInvoiceOrderNums: function (options, getCount) {
    var deferred = Q.defer()
    Exectimer.time("getSalesOrderNums()")

    __getSalesInvoiceHeaderData(options, getCount)
      .then(function (inventory) {
        log("Writable Stream Retrieved (%s) Records Total", colors.green(invRecCount))

        //var parsedInventory = __parseLocInventory(inventory);

        if (!_.isEmpty(inventory)) {
          log(Exectimer.timeEnd("getSalesInvoiceOrderNums()"))
          deferred.resolve(inventory)
        } else {
          log(Exectimer.timeEnd("getSalesInvoiceOrderNums()"))
          deferred.reject(
            Helprs.err("No Records Found", {
              statusCode: 1003
            })
          )
        }
      })
      .fail(function (err) {
        console.log("get invoice orders sql lib fail")

        deferred.reject(err)
      })
      .done()

    return deferred.promise
  },
  /**
   *
   */
  getSalesInvoiceOrderByPONum: function (options, getCount = false) {
    var deferred = Q.defer()
    Exectimer.time("getSalesOrderNums()")

    __getSalesInvoiceOrderByPONum(options, getCount)
      .then(function (inventory) {
        log("Writable Stream Retrieved (%s) Records Total", colors.green(invRecCount))

        //var parsedInventory = __parseLocInventory(inventory);

        if (!_.isEmpty(inventory)) {
          log(Exectimer.timeEnd("getSalesInvoiceOrderNums()"))
          deferred.resolve(inventory)
        } else {
          log(Exectimer.timeEnd("getSalesInvoiceOrderNums()"))
          deferred.reject(
            Helprs.err("No Records Found", {
              statusCode: 1003
            })
          )
        }
      })
      .fail(function (err) {
        console.log("get invoice orders sql lib fail")

        deferred.reject(err)
      })
      .done()

    return deferred.promise
  },
  /**
   *
   */
  getItemPricing: function (parameters, options) {
    var deferred = Q.defer()

    parameters = parameters || {}
    options = options || {}

    __getItemPricingData(
      {
        items: parameters.items,
        user: parameters.user
      },
      options
    )
      .then(function (pricedItems) {
        deferred.resolve(pricedItems)
      })
      .fail(function (err) {
        deferred.reject(err)
      })
      .done()

    return deferred.promise
  },

  /**
   *
   */
  getItems: function (options) {
    var deferred = Q.defer()
    options = options || {}
    options.type = "items"

    __getItemData(options)
      .then(function (items) {
        deferred.resolve(items)
      })
      .fail(function (err) {
        deferred.reject(err)
      })
      .done()

    return deferred.promise
  },

  /**
   *
   */
  getItemTable: function () {
    var itemTable = dbStructure.get({
      from: "tables.items"
    })
    return itemTable
  },

  /**
   *
   */
  getTableProperties: function () {
    return __validateConnection().then(__infoSchemaTables)
  },

  /**
   * @see models/checkout repository.publishPurchaseOrder (called by)
   */
  publishPurchaseOrder: function (parameters) {
    var deferred = Q.defer()
    var purchaseOrder = parameters.purchaseOrder
    var shippingRates = parameters.shippingRates
    var warehouses = parameters.warehouses
    var user = parameters.user
    const vehicleInfo = parameters.vehicleInfo

    __publishPO({
      purchaseOrder: purchaseOrder,
      shippingRates: shippingRates,
      warehouses: warehouses,
      user: user,
      vehicleInfo: vehicleInfo
    })
      .then(function (response) {
        console.log(colors.green("publishPurchaseOrder success", JSON.stringify(response)))
        deferred.resolve(response)
      })
      .catch(function (err) {
        console.log(colors.red("publishPurchaseOrder err", JSON.stringify(err)))
        deferred.reject(err)
      })
      .done()

    return deferred.promise
  },

  assignPO: function (update) {
    var deferred = Q.defer()

    __assignPO(update)
      .then(function (items) {
        deferred.resolve(items)
      })
      .fail(function (err) {
        deferred.reject(err)
      })
      .done()

    return deferred.promise
  },

  /**
   *
   */
  searchXRefs: function (parameters, options) {
    return __validateConnection().then(function () {
      return __searchXRefs(parameters, options)
    })
  }
}

module.exports = mssqlObject

/**
 * @memberOf module:MS
 * @private
 */
function __calculateTime(dateObj) {
  // var offset = "-06";
  var offset = "-05"
  // convert to msec
  // add local time zone offset
  // get UTC time in msec
  // console.log()
  var utc = dateObj.getTime() + dateObj.getTimezoneOffset() * 60000
  // create new Date object for different city
  // using supplied offset
  return new Date(utc + 1 /* milliseconds */ * 1000 /* seconds */ * 60 /* minutes */ * 60 /* hour */ * offset)
}

/**
 * @memberOf module:MS
 * @private
 */
function __logRequestError(err) {
  var time = new Date().toLocaleString()
  log("\n================ " + time + " ===================\n")

  if (err.stack) {
    log(">>> WARNING: Long Stack Traces <<<")
    log(err.stack)
  }

  log("\n" + err.code + " - " + err.name + ": " + err.message + "\n")
  log("\n================ " + time + " ===================\n")
}

/**
 * @memberOf module:MS
 * @private
 */
function __validateConnection() {
  var deferred = Q.defer()
  var MAX_TIME = 20
  var timer = setTimeout(function () {
    deferred.reject(
      new Error(
        "MSSQL __validateConnection ERROR TIMEOUT - took more than " + MAX_TIME + " seconds. Rejecting."
      )
    )
  }, MAX_TIME * 1000)
  Exectimer.time("__validateConnection()")

  console.log("MSSQL __validateConnection: Validating...")
  // If no sqlConnection has been established yet
  if (sqlConnection === null) {
    console.log("MSSQL __validateConnection: No sqlConnection. Initializing.")
    // Initialize a new connection
    mssqlObject.initialize()
    // When the connection is open, resolve with the connection
    connectStatus.on("open", function () {
      console.log("MSSQL __validateConnection: Connection opened.")
      connectionState = "opened"
      log(Exectimer.timeEnd("__validateConnection()"))
      clearTimeout(timer)
      deferred.resolve(sqlConnection)
    })
  } else {
    // If there was a connection
    console.log("MSSQL __validateConnection: Had sqlConnection.")
    // If it is already connected
    if (sqlConnection.connected) {
      console.log("MSSQL __validateConnection: Already connected. Resolving")
      log(Exectimer.timeEnd("__validateConnection()"))
      clearTimeout(timer)
      // Resolve with the connection
      deferred.resolve(sqlConnection)
    } else if (sqlConnection.connecting) {
      console.log("MSSQL __validateConnection: Not connected. Initializing.")
      // Otherwise, wait for it to finish connecting, resolve with the connection
      connectStatus.on("open", function () {
        console.log("MSSQL __validateConnection: Connection opened.")
        connectionState = "opened"
        log(Exectimer.timeEnd("__validateConnection()"))
        clearTimeout(timer)
        deferred.resolve(sqlConnection)
      })
    }
  }

  return deferred.promise
}

/**
 * @memberOf module:MS
 * @private
 */
function __buildConfig(settings) {
  var config = {
    user: settings.username,
    password: settings.password,
    server: settings.host,
    database: settings.name,
    port: settings.port,
    connectionTimeout: settings.connectionTimeout || 15000,
    requestTimeout: settings.requestTimeout || 15000
  }

  return config
}

/**
 * @memberOf module:MS
 * @private
 */
function __getLocationInventoryData() {
  var deferred = Q.defer()

  Q.when(
    __validateConnection(),
    function (cntState) {
      var invTable = dbStructure.getInvTable()
      var locationCodes = dbStructure.getLocationCodes()
      var tableColumns = invTable.columns
      var parsedRowData = {}

      var request = new sql.Request(sqlConnection)
      request.stream = true

      var rst = new ReadableStrm()
      rst.wrap(request)

      var writableStream = contentStream.createWriteStream({
        objectMode: true
      })

      writableStream
        .then(function (content) {
          // content = "[" + content.replace(/(\}\{)/g, "},{") + "]";
          // deferred.resolve(JSON.parse(content));
          deferred.resolve(parsedRowData)
        })
        .catch(function (err) {
          log("Writable Stream Error: %O", err)
          deferred.reject(err)
        })

      invRecCount = 0
      request.pipe(writableStream)
      request.query(
        qryBuilder.create({
          type: "inventory"
        })
      )

      request.on("info", function (info) {
        log("Request Info: %O", info)
      })

      request.on("error", function (err) {
        log("Request Content Error: %O", err)
      })

      request.on("row", function (row) {
        invRecCount++
        var ready = writableStream.write(row)
        if (ready === false) {
          log("Writable Stream Needs time to catch up!")
          request.pause()
          writableStream.once("drain", function () {
            log("Writable Stream is Drained!")
            request.resume()
          })
        } else {
          var rowCode = row[tableColumns.locCode.name]

          if (!_.has(locationCodes, rowCode))
            return log("Unsupported Location Code: %s", colors.cyan(rowCode))

          var rowNumber = row[tableColumns.itemNum.name]
          if (!_.has(parsedRowData, rowNumber)) {
            parsedRowData[rowNumber] = {
              part_number: rowNumber,
              inventory: {}
            }
          }

          var locQty = row[tableColumns.onHandQty.name] || 0
          var locState = locationCodes[rowCode]
          if (!_.has(parsedRowData[rowNumber].inventory, locState))
            parsedRowData[rowNumber].inventory[locState] = locQty
          else parsedRowData[rowNumber].inventory[locState] += locQty
        }
      })

      request.on("done", function (affected) {
        writableStream.end()
      })
    },
    function (err) {
      deferred.reject(err)
    }
  )

  return deferred.promise
}
/**
 * @memberOf module:MS
 * @private
 */
function __getSalesHeaderData() {
  var deferred = Q.defer()
  Q.when(
    __validateConnection(),
    function (cntState) {
      var salesHeaderTable = dbStructure.getSalesTable()

      var tableColumns = salesHeaderTable.columns
      var parsedRowData = {}

      var request = new sql.Request(sqlConnection)
      request.stream = true

      var rst = new ReadableStrm()
      rst.wrap(request)

      var writableStream = contentStream.createWriteStream({
        objectMode: true
      })
      writableStream
        .then(function (content) {
          // content = "[" + content.replace(/(\}\{)/g, "},{") + "]";
          // deferred.resolve(JSON.parse(content));
          deferred.resolve(parsedRowData)
        })
        .catch(function (err) {
          log("Writable Stream Error: %O", err)
          deferred.reject(err)
        })

      var salesRecCount = 0
      request.pipe(writableStream)
      request.query(
        qryBuilder.create({
          type: "salesheader"
        })
      )

      request.on("info", function (info) {
        log("Request Info: %O", info)
      })

      request.on("error", function (err) {
        log("Request Content Error: %O", err)
      })

      request.on("row", function (row) {
        salesRecCount++
        var ready = writableStream.write(row)
        if (ready === false) {
          log("Writable Stream Needs time to catch up!")
          request.pause()
          writableStream.once("drain", function () {
            log("Writable Stream is Drained!")
            request.resume()
          })
        } else {
          parsedRowData[salesRecCount] = {
            docNum: row[tableColumns.docNum.name],
            docType: row[tableColumns.docType.name]
          }
        }
      })

      request.on("done", function (affected) {
        writableStream.end()
      })
    },
    function (err) {
      deferred.reject(err)
    }
  )

  return deferred.promise
}
/**
 * @memberOf module:MS
 * @private
 */
function __getSalesInvoiceHeaderData() {
  var deferred = Q.defer()
  Q.when(
    __validateConnection(),
    function (cntState) {
      console.log("before get invoice table")
      var salesInvoiceHeaderTable = dbStructure.getSalesInvoiceTable()
      var tableColumns = salesInvoiceHeaderTable.columns
      //	console.log('after get invoice table columns',tableColumns);
      var parsedRowData = {}

      var request = new sql.Request(sqlConnection)
      request.stream = true

      var rst = new ReadableStrm()
      rst.wrap(request)

      var writableStream = contentStream.createWriteStream({
        objectMode: true
      })
      writableStream
        .then(function (content) {
          // content = "[" + content.replace(/(\}\{)/g, "},{") + "]";
          // deferred.resolve(JSON.parse(content));
          deferred.resolve(parsedRowData)
        })
        .catch(function (err) {
          log("Writable Stream Error: %O", err)
          deferred.reject(err)
        })

      var salesRecCount = 0
      request.pipe(writableStream)
      request.query(
        qryBuilder.create({
          type: "salesinvoiceheader"
        })
      )
      request.on("info", function (info) {
        log("Request Info: %O", info)
      })
      request.on("error", function (err) {
        log("Request Content Error: %O", err)
      })

      request.on("row", function (row) {
        salesRecCount++
        var ready = writableStream.write(row)
        if (ready === false) {
          log("Writable Stream Needs time to catch up!")
          request.pause()
          writableStream.once("drain", function () {
            log("Writable Stream is Drained!")
            request.resume()
          })
        } else {
          parsedRowData[salesRecCount] = {
            docNum: row[tableColumns.docNum.name],
            locCode: row[tableColumns.locCode.name],
            orderNum: row[tableColumns.orderNum.name],
            postingDate: row[tableColumns.postingDate.name],
            agentCode: row[tableColumns.agentCode.name],
            trackingNum: row[tableColumns.trackingNum.name]
          }
        }
      })

      request.on("done", function (affected) {
        writableStream.end()
      })
    },
    function (err) {
      deferred.reject(err)
    }
  )

  return deferred.promise
}
/**
 * @memberOf module:MS
 * @private
 */
function __getSalesOrderByPONum(options, getCount) {
  var deferred = Q.defer()
  console.log("get po num ms sql", options)
  Q.when(
    __validateConnection(),
    function (cntState) {
      var salesHeaderTable = dbStructure.getSalesTable()

      var tableColumns = salesHeaderTable.columns
      var parsedRowData = {}

      var request = new sql.Request(sqlConnection)
      request.stream = true

      var rst = new ReadableStrm()
      rst.wrap(request)

      var writableStream = contentStream.createWriteStream({
        objectMode: true
      })
      writableStream
        .then(function (content) {
          // content = "[" + content.replace(/(\}\{)/g, "},{") + "]";
          // deferred.resolve(JSON.parse(content));
          deferred.resolve(parsedRowData)
        })
        .catch(function (err) {
          log("Writable Stream Error: %O", err)
          deferred.reject(err)
        })

      var salesRecCount = 0
      request.pipe(writableStream)
      request.query(
        qryBuilder.create({
          type: getCount === true ? "salesheaderbypo" : "salesheaderstatusbypo",
          options: options
        })
      )

      request.on("info", function (info) {
        log("Request Info: %O", info)
      })

      request.on("error", function (err) {
        log("Request Content Error: %O", err)
      })

      request.on("row", function (row) {
        console.log("get po num ms sql row", row)
        /*salesRecCount++;
			var ready = writableStream.write(row);
			if (ready === false) {
				log("Writable Stream Needs time to catch up!");
				request.pause();
				writableStream.once('drain', function () {
					log("Writable Stream is Drained!");
					request.resume();
				});
			} else {

				
				parsedRowData[salesRecCount] = {
					docNum: row[tableColumns.docNum.name],
					docType: row[tableColumns.docType.name]
				};
				
			} */
        parsedRowData = row
      })

      request.on("done", function (affected) {
        writableStream.end()
      })
    },
    function (err) {
      deferred.reject(err)
    }
  )
  return deferred.promise
}
/**
 * @memberOf module:MS
 * @private
 */
function __getSalesInvoiceOrderByPONum(options, getCount) {
  var deferred = Q.defer()
  console.log("get po num invoice ms sql", options)
  Q.when(
    __validateConnection(),
    function (cntState) {
      console.log("before get invoice table")
      var salesInvoiceHeaderTable = dbStructure.getSalesInvoiceTable()
      var tableColumns = salesInvoiceHeaderTable.columns
      //	console.log('after get invoice table columns',tableColumns);
      var parsedRowData = {}

      var request = new sql.Request(sqlConnection)
      request.stream = true

      var rst = new ReadableStrm()
      rst.wrap(request)

      var writableStream = contentStream.createWriteStream({
        objectMode: true
      })
      writableStream
        .then(function (content) {
          // content = "[" + content.replace(/(\}\{)/g, "},{") + "]";
          // deferred.resolve(JSON.parse(content));
          deferred.resolve(parsedRowData)
        })
        .catch(function (err) {
          log("Writable Stream Error: %O", err)
          deferred.reject(err)
        })

      var salesRecCount = 0
      request.pipe(writableStream)
      request.query(
        qryBuilder.create({
          type: getCount === true ? "salesinvoiceheaderbypo" : "salesinvoiceheader",
          options: options
        })
      )
      request.on("info", function (info) {
        log("Request Info: %O", info)
      })
      request.on("error", function (err) {
        log("Request Content Error: %O", err)
      })

      request.on("row", function (row) {
        //salesRecCount++;
        console.log("invoice row", row)
        parsedRowData = row

        /*var ready = writableStream.write(row);
			if (ready === false) {
				log("Writable Stream Needs time to catch up!");
				request.pause();
				writableStream.once('drain', function () {
					log("Writable Stream is Drained!");
					request.resume();
				});
			} else {
			
				parsedRowData[salesRecCount] = {
					docNum: row[tableColumns.docNum.name],
					locCode: row[tableColumns.locCode.name],
					orderNum: row[tableColumns.orderNum.name],
					postingDate: row[tableColumns.postingDate.name],
					agentCode: row[tableColumns.agentCode.name],
					trackingNum: row[tableColumns.trackingNum.name]
					
				};
				
			} */
      })

      request.on("done", function (affected) {
        writableStream.end()
      })
    },
    function (err) {
      deferred.reject(err)
    }
  )
  return deferred.promise
}
/**
 * @memberOf module:MS
 * @private
 * @description
 * Function that is privately used by `publishPurchaseOrder`.
 * Used to publish a PO to NAV.
 * By the time this function resolves the following steps have successfully executed:
 *     1.)  A new `Order Header` has been created on NAV.
 *     2.)  All sale items pertaining to the new created sale have been saved
 *             and created on the `Vision Wheel, Inc_$Website Inbound Order Line` table in NAV.
 * @param   {Object}  parameters  [description]
 * @param   {Object}  options     [description]
 * @return  {Object}              [description]
 */
function __publishPO(parameters) {
  var deferred = Q.defer()

  var user = parameters.user
  var purchaseOrder = parameters.purchaseOrder
  var shippingRates = parameters.shippingRates
  var warehouses = parameters.warehouses
  const vehicleInfo = parameters.vehicleInfo
  // console.log('publish po',purchaseOrder);
  // console.log('publish po wh',warehouses);

  var p = Q.when(
    __validateConnection(),
    function (cntState) {
      /**
       * First, we must Publish all PO headers
       * at NAV Table `Vision Wheel, Inc_$Website Inbound Order Header`
       */

      console.log("__publishPO")
      var publishedPO = {
        header: null,
        lines: null
      }
      try {
        console.log("try loc")
        var locationHeaders = __parseLocationHeaders({
          purchaseOrder: purchaseOrder,
          shippingRates: shippingRates,
          warehouses: warehouses,
          user: user,
          vehicleInfo: vehicleInfo
        })
      } catch (e) {
        console.log("__parseLocationHeaders err", e)
        deferred.reject(e)
      }

      //console.dir("locationHeaders");
      //console.dir(locationHeaders);

      console.log("__publishPOHeaders start")
      console.log(colors.red("Location Headers", JSON.stringify(locationHeaders)))
      //console.log('po',purchaseOrder);

      // console.log('loc headers',locationHeaders);
      //deferred.resolve({});
      __publishPOHeaders({
        locationHeaders: locationHeaders,
        purchaseOrder: purchaseOrder
      })
        .then(function (publishedHeaders) {
          console.log("__publishPOHeaders end")
          publishedPO.header = publishedHeaders
          /**
           * Next, we must publish all PO lines
           * at NAV Table `Vision Wheel, Inc_$Website Inbound Order Line`
           */

          console.log("__publishPOLines start")
          __publishPOLines({
            locationHeaders: locationHeaders,
            publishedPO: publishedPO,
            purchaseOrder: purchaseOrder
          })
            .then(function (publishedLines) {
              console.log("__publishPOLines done - MSSQL has accepted the order")
              publishedPO.lines = publishedLines
              deferred.resolve(publishedPO)
            })
            .fail(function (err) {
              deferred.reject(err)
            })
            .done()
        })
        .catch((err) => {
          console.log("publish po err 1", err)
          deferred.reject(err)
        })
        .fail(function (err) {
          console.log("publish po err 2", err)
          deferred.reject(err)
        })
        .done()
    },
    function (err) {
      console.log("__publishPO err", err)
      deferred.reject(err)
    }
  )

  console.log("testing Q.when", p)

  return deferred.promise
}

/**
 * @memberOf module:MS
 * @private
 */
function __assignPO(update) {
  var deferred = Q.defer()
  //	console.log('ms sql assign',update);
  Q.when(
    __validateConnection(),
    function (cntState) {
      var sqlSource = []
      var request = new sql.Request(sqlConnection)
      request.stream = true

      console.log("Before Query")

      request.query(
        qryBuilder.create({
          type: update.test ? "getorder" : "assignpo",
          update: update
        })
      )
      console.log("After Query")

      //	console.log(JSON.stringify(request));

      request.on("row", function (row) {
        sqlSource.push(row)
      })

      //console.log("SQL SOURCE", sqlSource);

      request.on("error", function (err) {
        console.log("ERROR", err)
        deferred.reject(err)
      })

      request.on("done", function (affected) {
        console.log("DONE")
        deferred.resolve(sqlSource)
      })
    },
    function (err) {
      deferred.reject(err)
    }
  )
  return deferred.promise
}

/**
 * @memberOf module:MS
 * @private
 */
function __getItemData() {
  var deferred = Q.defer()

  Q.when(
    __validateConnection(),
    function (cntState) {
      var sqlSource = []
      var request = new sql.Request(sqlConnection)
      request.stream = true

      request.query(
        qryBuilder.create({
          type: "items"
        })
      )

      request.on("row", function (row) {
        sqlSource.push(row)
      })

      request.on("error", function (err) {
        deferred.reject(err)
      })

      request.on("done", function (affected) {
        deferred.resolve(sqlSource)
      })
    },
    function (err) {
      deferred.reject(err)
    }
  )

  return deferred.promise
}

/**
 * @memberOf module:MS
 * @private
 */
function __getDealerItems(parameters) {
  var start = new Date().getTime()
  console.log("MSSQL __getDealerItems - initializing")
  var deferred = Q.defer()
  var nav_customer_id = parameters.nav_customer_id
  var part_number = parameters.part_number

  Q.when(
    __validateConnection(),
    function (cntState) {
      console.log("MSSQL __getDealerItems when")
      var ps = new sql.PreparedStatement(cntState)

      var queryresult = qryBuilder.create({
        category: "dealer",
        nav_customer_id: nav_customer_id,
        part_number: part_number,
        type: "pricing"
      })

      var params = {}
      params.nav_customer_id = nav_customer_id
      ps.input("nav_customer_id", sql.VarChar(32))
      if (part_number && Array.isArray(part_number) && part_number.length) {
        part_number.forEach(function (partNumber, index, array) {
          console.log(partNumber.partNumber, "PART NUMBER TO GET TO NEEDED NUMBEr")
          console.log(partNumber, "PART NUMBER TO GET TO NEEDED NUMBEr WITHOUT .partNumber")
          if (partNumber.partNumber) {
            params[`part_number_${index + 1}`] = partNumber.partNumber
          } else {
            params[`part_number_${index + 1}`] = partNumber
          }

          ps.input(`part_number_${index + 1}`, sql.VarChar(64))
        })
      }
      console.log("MSSQL __getDealerItems - preparing after " + (new Date().getTime() - start) + "ms")
      ps.prepare(queryresult, function (err) {
        if (!err) {
          console.log("MSSQL __getDealerItems - executing after " + (new Date().getTime() - start) + "ms")
          ps.execute(params, function (err, result) {
            var execErr = err
            console.log("MSSQL __getDealerItems - unpreparing after " + (new Date().getTime() - start) + "ms")
            ps.unprepare(function (err) {
              if (!execErr && !err) {
                console.log(
                  "MSSQL __getDealerItems - resolving after " + (new Date().getTime() - start) + "ms"
                )
                deferred.resolve(result)
              } else {
                var error = {
                  execute: execErr,
                  unprepare: err
                }
                console.log(
                  "MSSQL __getDealerItems ERROR - threw and error, unpreparing after " +
                    (new Date().getTime() - start) +
                    "ms"
                )
                deferred.reject(error)
              }
            })
          })
        } else {
          console.log(
            "MSSQL __getDealerItems ERROR - threw an error, preparing after " +
              (new Date().getTime() - start) +
              "ms"
          )
          deferred.reject(err)
        }
      })
      // request.query(queryresult, function(err, recordsets) {
      // 	if (err) {
      // 		deferred.reject(err);
      // 	}
      // 	else {
      // 		var collectedRecordsets = {};
      // 		for (var c = 0; c < recordsets.length; c++) {
      // 			var recordset = recordsets[c];
      // 			var recordsetItemNum = recordset["Item No_"];
      // 			var recordsetItemPrice = recordset["Unit Price"];

      // 			if (!_.has(collectedRecordsets, recordsetItemNum))
      // 				collectedRecordsets[recordsetItemNum] = recordsetItemPrice;
      // 		}
      // 		if( part_number.length === recordsets.length ) {
      // 			deferred.resolve(collectedRecordsets);
      // 		}
      // 		else {
      // 			var missingItems = [];
      // 			part_number.forEach(function( partNumber, index, array ) {
      // 				if( !collectedRecordsets[partNumber] ) {
      // 					missingItems.push( partNumber );
      // 				}
      // 			});
      // 			deferred.reject(Helprs.err("All Records Could Not Be Found", {
      // 				hint: "Query executed successfully, but it resulted in missing Records",
      // 				items: items,
      // 				missingItems: missingItems,
      // 				options: options,
      // 				statusCode: 1001
      // 			}));
      // 		}
      // 	}
      // });
    },
    function (err) {
      deferred.reject(err)
    }
  )

  return deferred.promise
}

/**
 * @memberOf module:MS
 * @private
 */
function __getItemPricingData(parameters, options) {
  var deferred = Q.defer()

  var items = parameters.items
  var user = parameters.user

  // This is required, why is it an option?
  // Not even being used in this function.
  // var category = options.category;
  var promises = []
  var collectedRecordsets = {}

  Q.when(
    __validateConnection(),
    function (cntState) {
      var itemPartNumbers = []
      for (var u = 0; u < items.length; u++) {
        var item = items[u]
        var part_number = item.part_number
        var promise = __getPerItemPricingData(
          {
            item: item,
            user: user
          },
          options
        )
        log("\tItem Pricing for Part Number: ", part_number)
        itemPartNumbers.push(part_number)
        promises.push(promise)
      }

      Q.allSettled(promises)
        .then(function (results) {
          var fulfilledValues = []
          var errorResults = []
          var hasErrors = false

          results.forEach(function (result) {
            if (result.state !== "fulfilled") {
              hasErrors = true
              errorResults.push(result)
            }
          })

          if (hasErrors) {
            deferred.reject(errorResults)
          } else {
            results.forEach(function (result) {
              var recordsets = result.value
              if (recordsets.length) {
                for (var c = 0; c < recordsets.length; c++) {
                  var recordset = recordsets[c]
                  var recordsetItemNum = recordset["Item No_"]
                  var recordsetItemPrice = recordset["Unit Price"]

                  if (!_.has(collectedRecordsets, recordsetItemNum))
                    collectedRecordsets[recordsetItemNum] = recordsetItemPrice
                }
              }
            })

            if (!_.isEmpty(collectedRecordsets)) {
              /**
               * If `collectedRecordsets` is not empty, ths means we successfully,
               * obtained records from NAV. If its empty, then no records were found.
               */
              var collectedRecordsetsIds = _.allKeys(collectedRecordsets)
              if (collectedRecordsetsIds.length === itemPartNumbers.length) {
                deferred.resolve(collectedRecordsets)
              } else {
                /**
                 * Successfully obtained records from NAV, however results count does not match
                 * the number of items that need pricing.
                 */
                deferred.reject(
                  Helprs.err("All Records Could Not Be Found", {
                    hint: "Query executed successfully, but it resulted in missing Records",
                    items: items,
                    options: options,
                    statusCode: 1001
                  })
                )
              }
            } else {
              /**
               * No Records Founds in NAV.
               * This means we will reject the promise.
               */
              deferred.reject(
                Helprs.err("No Records Found", {
                  hint: "Query executed successfully, but it resulted in 0 Records",
                  items: items,
                  options: options,
                  statusCode: 1001
                })
              )
            }
          }
        })
        .done()
    },
    function (err) {
      deferred.reject(err)
    }
  )

  return deferred.promise
}

/**
 * @memberOf module:MS
 * @private
 */
function __getPerItemPricingData(parameters, options) {
  var deferred = Q.defer()

  var item = parameters.item
  var user = parameters.user
  var dealer = user.dealer || null
  var category = dealer ? "dealer" : "retail"

  var request = new sql.Request(sqlConnection)

  // request.connectionTimeout = 60000;

  var queryresult = qryBuilder.create({
    dealer: dealer,
    type: "pricing",
    category: category,
    item: item
  })

  request.query(queryresult, function (err, recordset) {
    if (err) deferred.reject(err)
    else deferred.resolve(recordset)
  })

  return deferred.promise
}

/**
 * @memberOf module:MS
 * @private
 */
function __parseLocInventory(inventory) {
  Exectimer.time("__parseLocInventory()")

  var parsedRowData = {}
  var invCount = invRecCount
  var invTable = dbStructure.getInvTable()
  var locationCodes = dbStructure.getLocationCodes()
  var tableColumns = invTable.columns

  for (var f = 0; f < invCount; f++) {
    var row = inventory[f]
    var rowCode = row[tableColumns.locCode.name]

    if (!_.has(locationCodes, rowCode)) continue

    var rowNumber = row[tableColumns.itemNum.name]
    if (!_.has(parsedRowData, rowNumber)) {
      parsedRowData[rowNumber] = {
        part_number: rowNumber,
        inventory: {}
      }
    }

    var locQty = row[tableColumns.onHandQty.name] || 0
    var locState = locationCodes[rowCode]
    if (!_.has(parsedRowData[rowNumber].inventory, locState))
      parsedRowData[rowNumber].inventory[locState] = locQty
    else parsedRowData[rowNumber].inventory[locState] += locQty
  }

  log(Exectimer.timeEnd("__parseLocInventory()"))
  return parsedRowData
}
/**
 * @memberOf module:MS
 * @private
 */
function __parseSalesHeaders() {
  Exectimer.time("__parseSalesHeaders()")

  var parsedRowData = {}
  var salesHeaderTable = dbStructure.getSalesHeaderTable()
  var tableColumns = salesHeaderTable.columns
  var salesCount = salesRecCount

  for (var f = 0; f < salesCount; f++) {
    /*	var row = inventory[f];
		var rowCode = row[tableColumns.locCode.name];

		if (!_.has(locationCodes, rowCode))
			continue;

		var rowNumber = row[tableColumns.itemNum.name];
		if (!_.has(parsedRowData, rowNumber)) {
			parsedRowData[rowNumber] = {
				part_number: rowNumber,
				inventory: {}
			};
		}

		var locQty = row[tableColumns.onHandQty.name] || 0;
		var locState = locationCodes[rowCode];
		if (!_.has(parsedRowData[rowNumber].inventory, locState))
			parsedRowData[rowNumber].inventory[locState] = locQty;
		else
			parsedRowData[rowNumber].inventory[locState] += locQty;
*/
  }

  log(Exectimer.timeEnd("__parseSalesHeaders()"))
  return parsedRowData
}

/**
 * @memberOf module:MS
 * @private
 */
function __parseItemPricing(pricing) {
  if (typeof pricing !== "string") pricing = pricing.toString()
  pricing = parseFloat(Math.round(pricing * 100) / 100).toFixed(2)

  return pricing
}

/**
 * Appears to (I didn't build this)...
 * Take each of the warehouse locations in the order
 * and build a location header for each of them,
 * returning an array of objects, each representing a location.
 *
 * @memberOf module:MS
 * @private
 * @returns {array.object}
 * @param {object} parameters
 */
function __parseLocationHeaders(parameters) {
  var user = parameters.user
  var dealer = user.dealer
  var purchaseOrder = parameters.purchaseOrder
  let freightPrice = purchaseOrder.savedSale.freight_total
  var warehouses = parameters.warehouses
  const vehicleInfo = parameters.vehicleInfo

  const freightTotal = freightPrice.replace(/\$/g, "")

  // var order = parameters.order;
  // var options = parameters.options;
  // var warehouses = options.warehouses;
  // var savedSale = options.savedPurchaseOrder.savedSale;
  // var savedSaleItems = options.savedPurchaseOrder.savedSaleItems;
  // var shippingTotalsPerLocation = options.shippingTotalsPerLocation;

  var savedSale = purchaseOrder.savedSale
  var savedSaleItems = purchaseOrder.savedSaleItems
  console.log("parse loc warehouses", warehouses)
  console.log("parse loc warehouse items", warehouses.items)

  //console.dir("purchaseOrder");
  //console.dir(purchaseOrder);
  //console.log("TRANSACTION TYPE",savedSale.transaction_type);
  //console.log('saved sale',savedSale);
  //console.log('saved sale items',savedSaleItems);
  var created = savedSale.created
  var customerId = savedSale.customer_id
  var customer_info = savedSale.customer_info
  var customer_billing_info = savedSale.customer_billing_info
  var discounttotal = savedSale.total_discount_amount
  var payment = savedSale.payment
  var poNumber = savedSale.po_number
  var ship_to_info = savedSale.ship_to_info
  var taxtotal = savedSale.tax_amount
  var total = savedSale.total_invoice_amount
  var web_order_number = savedSale.web_order_number
  var web_master_order_number = web_order_number
  var transaction_type = savedSale.transaction_type
  //console.log('transaction',transaction_type);
  if (web_master_order_number && web_master_order_number.includes("-"))
    web_master_order_number = web_master_order_number.replace(/-/g, "").trim()

  var locations = []
  var line_num_counter = 0
  var toDecimalRegex = /[^0-9\.]+/g
  var posubmissiontracker = {
    headers: 0,
    lineitems: 0
  }
  var CCDetails = {
    ccStatus: null,
    ccAuthCode: null,
    ccAuthDate: null
  }

  // Try to get the ship to country from the user if it isn't set
  // and use US if nothing can be found
  if (typeof ship_to_info.country === "undefined") {
    console.log("MSSQL.__parseLocationHeaders - adding ship_to_info.country as it was missing")
    if (user && user.country) {
      console.log("Added", user.country, "from user.country")
      ship_to_info.country = user.country
    } else {
      // This really shouldn't get called but is a fallback to ensure NULL doesn't get sent
      console.log("Added US as no user.country could be found.")
      ship_to_info.country = "US"
    }
  }

  // It's pretty ugly validation but convert the most common variants
  // to their country codes
  if (typeof ship_to_info.country === "string") {
    switch (ship_to_info.country.toLowerCase()) {
      case "united states of america":
      case "united states":
      case "usa":
      case "us":
        ship_to_info.country = "US"
        break
      case "canada":
      case "can":
      case "ca":
        ship_to_info.country = "CA"
        break
    }
  }

  /**
   * Correct UTC Created Time from Postgres
   * http://stackoverflow.com/questions/10797720/postgresql-how-to-render-date-in-different-time-zone
   * var cstCreated = Moment( created ).utcOffset( "-06:00:00" );
   */
  // var userOffset = created.getTimezoneOffset() * 60 * 1000; // offset time
  // var centralOffset = 6 * 60 * 60 * 1000; // 6 for central time
  // created = new Date( created.getTime() - centralOffset ); // redefine variable

  // var orderDate = created.getDate() + "-" + (created.getMonth() + 1) + "-" + created.getFullYear()
  // log( "Created Date in CST: Date: %s, Time: %s", orderDate );
  var createdCST = __calculateTime(created) //asdf
  console.log("Datetime: %s", createdCST.toLocaleString())
  console.log("Datetime: %s", createdCST.toUTCString())
  console.log("Datetime: %s", createdCST.toString())
  console.log("Datetime: %s", createdCST)
  console.log(createdCST)

  /** Check if the PO was payable and a Stripe Transaction took place */
  if (payment.payment_method === "CREDIT CAR") {
    /** ONLY log this during 'development' environment */
    console.log("Verified Stripe CC Transaction")
    /** If so, add all CC Information to submit to NAV */
    CCDetails.ccStatus = payment.CCStatus
    CCDetails.ccAuthCode = payment.CCAuthCode
    /**
     * @type {Number|Timestamp}
     * @description Convert the CCAuthDate from timestamp to formatted
     */
    // CCDetails.ccAuthDate = Moment( payment.CCAuthDate * 1000 ).format( "DD-MM-YYYY" );
    var date = createdCST.getDate().toString()
    var month = (createdCST.getMonth() + 1).toString()
    var year = createdCST.getFullYear().toString()
    date = date.length === 1 ? "0" + date : date
    month = month.length === 1 ? "0" + month : month
    CCDetails.ccAuthDate = [date, month, year].join("-")
    console.log("These CC details will be added to the Headers: %o", CCDetails)
  }

  var isDTCUser = customerId.includes("DISCOUNTTIRE")

  for (var state in warehouses) {
    var warehouse = warehouses[state]
    var whDetails = warehouse.details
    var whItems = warehouse.items
    var whLocationCode = 0
    //if (!(_.isEmpty(whDetails)))
    if (typeof whDetails !== "undefined") whLocationCode = whDetails.locationCode

    // let shippingtotal
    console.log("wh details", whDetails)
    console.log("loc code", whLocationCode)
    // Not calculating shipping totals yet
    // if( shippingRates ) {
    // 	var rate = shippingRates.filter(function( wh ) {
    // 		return wh.from === state;
    // 	})[0];
    // 	shippingtotal = rate?rate.shippingtotal:null;
    // }

    // shippingtotal = shippingtotal ? shippingtotal : 0
    // console.log("Shipping Total for %s is %d", state, shippingtotal)

    var locationPO = {
      header: null,
      lines: []
    }

    console.log(parameters.purchaseOrder.savedSale, "PARAMS THAT HAVE THE SHIPPING INFO")
    var shipping_method = ""
    var shipping_agent = ""
    var eship_agent_service_code = ""
    if (warehouse.method == "truck") {
      shipping_method = "TRKROUTE"
      shipping_agent = "HARRIS"
      eship_agent_service_code = "HARRIS"
    } else {
      shipping_method = parameters.purchaseOrder.savedSale.method
      shipping_agent = parameters.purchaseOrder.savedSale.shipping_agent
      eship_agent_service_code = parameters.purchaseOrder.savedSale.eship_agent_service_code
    }
    // var shipping_agent = "fedex";
    // var shipping_method = warehouse.method;
    // var eship_agent_service_code = "ground";
    // if( warehouse.option ) {
    // 	if( warehouse.option === "2 day" ) {
    // 		warehouse.option = "2nd day";
    // 		eship_agent_service_code = warehouse.option;
    // 	}
    // 	if( warehouse.option === "2nd day" || "overnight" ) {
    // 		shipping_method = "expedited";
    // 	}
    // }
    // if( shipping_method === "ltl" ) {
    // 	shipping_agent = "ltl";
    // }
    // else if( shipping_method === "pickup" ) {
    // 	eship_agent_service_code = shipping_agent = "cpu";
    // 	shipping_method = "pickup cpu";
    // }

    // We don't get a flag that says "The user updated their shipping address"
    // so we have to work out whether they appear to have changed it as best we can...

    // Set values that will be intentionally left blank if not used
    var newShipToName
    var newShipToName2
    // Only make shipToName changes for non DTC users
    if (isDTCUser === false) {
      try {
        // The old ship to name should have been the USER's first and last names combined.
        var oldShipToName = user.first_name + " " + user.last_name
        // If there is a CUSTOMER_INFO name that's non blank and it's different to the old ship to name from the USER variable
        // CUSTOMER_INFO are the fields that get updated when the shipping address form gets changed
        if (
          typeof customer_info.customer_name === "string" &&
          customer_info.customer_name.length > 0 &&
          customer_info.customer_name !== oldShipToName
        ) {
          // Use that instead
          newShipToName = customer_info.customer_name
          // And update shipToName2 if there's a username set
          if (typeof user === "object" && typeof user.username === "string") {
            newShipToName2 = user.username
          }
        } else {
          console.log(
            'Non DTC user customer name did not change from "' + oldShipToName + '", not updating shipToName'
          )
        }
        console.log(
          'Non DTC user customer name changed from "' +
            oldShipToName +
            '" to "' +
            newShipToName +
            '" in the shipping address screen'
        )
      } catch (e) {
        console.log("Error in /common/libs/mssql/index.js - __parseLocationHeaders")
        console.log(e)
      }
    }

    let convertedTotal = 0

    if (freightTotal.includes(",")) {
      convertedTotal = freightTotal.replace(/,/, "")
    }

    //random 3 digit number to prevent duplicate docNums
    // var randExt = Math.floor(1000 + Math.random() * 9000);
    var location = {
      docNum: `${web_order_number}${whLocationCode}`,
      docType: 0,
      orderDate: createdCST.getDate() + "-" + (createdCST.getMonth() + 1) + "-" + createdCST.getFullYear(),
      externalDocNum: poNumber,
      locationCode: whLocationCode,
      customerNum: customerId,
      /* 
				shipToName will first use any new ship to name that came from the ship to form updating
				if that doesn't appear to have changed, it will use the dealer's company name
				if that wasn't set, it will use the customer's company name
				and, finally, it will use the customer's customer_name
			 */
      shipToName:
        newShipToName ||
        dealer.company_name_1 ||
        customer_billing_info.company_name ||
        customer_billing_info.customer_name,
      /* shipToName2 is only set if the shipToName is also updated, otherwise it's null */
      shipToName2: newShipToName2 || null,
      shipToAddress: ship_to_info.address_1,
      shipToAddress2: ship_to_info.address_2,
      shipToPostCode: ship_to_info.zip,
      shipToCity: ship_to_info.city,
      shipToCounty: ship_to_info.state,
      shipToCountryCode: ship_to_info.country,
      shipToCode: ship_to_info.store_number,
      addShipToCodeToNAV: 0,
      shipmentMethod: shipping_method,
      shippingAgent: shipping_agent,
      eShipAgentService: eship_agent_service_code,
      paymentMethod: payment.payment_method,
      freightTotal: convertedTotal > 0 ? Number(convertedTotal) : freightTotal ? Number(freightTotal) : 0,
      totalDiscountAmount: discounttotal ? Number(discounttotal.replace(toDecimalRegex, "")) : 0,
      taxAmount: 0, //taxtotal ? Number( taxtotal.replace( toDecimalRegex, "" ) ) : 0,
      totalInvoiceAmount: total ? Number(total.replace(toDecimalRegex, "")) : 0,
      websiteUserEmailAddress: customer_info.email,
      customerPhone: customer_info.phone,
      storeNo: ship_to_info.store_number,
      webmasterOrderNum: web_master_order_number,
      transactionType: transaction_type,
      commentLine1:
        vehicleInfo !== undefined && vehicleInfo.vehicleYear !== undefined ? vehicleInfo.vehicleYear : null,
      commentLine2:
        vehicleInfo !== undefined && vehicleInfo.vehicleMake !== undefined ? vehicleInfo.vehicleMake : null,
      commentLine3:
        vehicleInfo !== undefined && vehicleInfo.vehicleModel !== undefined ? vehicleInfo.vehicleModel : null,
      commentLine4:
        vehicleInfo !== undefined && vehicleInfo.vehicleTrim !== undefined ? vehicleInfo.vehicleTrim : null,
      commentLine5: vehicleInfo !== undefined && vehicleInfo.VIN !== undefined ? vehicleInfo.VIN : null
    }

    if (savedSale.is_api_order == true) {
      console.log("api order")
      location.shippingAgent = savedSale.ship_agent
      location.shipmentMethod = savedSale.method
      location.eShipAgentService = savedSale.eship_agent_service_code
    }
    // adjustments for returns:
    if (web_order_number.startsWith("WR") || web_order_number.startsWith("VR")) {
      location.docNum = web_order_number
      location.docType = 2
      location.shippingAgent = savedSale.ship_agent
      location.yourReference = savedSale.original_order_num
    }

    /** Extend with the CC Details */
    if (location.paymentMethod === "CREDIT CAR") {
      // location = _.extend( location, CCDetails );
      for (var key in CCDetails) {
        location[key] = CCDetails[key]
      }
    }

    locationPO.header = location
    posubmissiontracker.headers++

    for (var z = 0; z < whItems.length; z++) {
      var whItem = whItems[z]
      var savedSaleItem = null

      for (var q = 0; q < savedSaleItems.length; q++) {
        savedSaleItem = savedSaleItems[q]
        if (savedSaleItem.applied) {
          continue
        }
        if (savedSaleItem.item_no === whItem.item.part_number) {
          savedSaleItem.applied = true
          break
        }
      }
      line_num_counter++
      //console.log('saved item',savedSaleItem);
      var line_item = {
        docNum: location.docNum,
        docType: 0,
        lineNum: line_num_counter,
        itemNum: savedSaleItem.item_no,
        qty: savedSaleItem.qty,
        unitPrice: Number(savedSaleItem.unit_price.replace(/[^0-9\.]+/g, "")),
        taxAmount: Number(savedSaleItem.tax_amount.replace(/[^0-9\.]+/g, "")),
        totalLineAmount: Number(savedSaleItem.total_line_amount.replace(/[^0-9\.]+/g, "")),
        eCommLineType: 0
      }
      if (web_order_number.startsWith("WR") || web_order_number.startsWith("VR")) {
        location.docNum = web_order_number
        line_item.docType = 2
      }
      locationPO.lines.push(line_item)
      posubmissiontracker.lineitems++
    }

    locations.push(locationPO)
  }

  console.log("Total PO Submission Count: %o", posubmissiontracker)
  return locations
}

/**
 * Generates a __publishPOHeader call for each parameters.locationHeaders.
 * When they're complete, it collects any errors then either rejects or resolves.
 *
 * @memberOf module:MS
 * @private
 * @returns {Promise}
 * @param {object} parameters
 */
function __publishPOHeaders(parameters) {
	console.log("__publishPOHeaders");
	var deferred = Q.defer();

	var locationHeaders = parameters.locationHeaders;
	var purchaseOrder = parameters.purchaseOrder;

	var promises = [];
	// var locationHeaders = options.perLocationPurchaseOrders;
	console.log("trying to collect PO headers");
	try {
		for (var u = 0; u < locationHeaders.length; u++) {
			var locationHeader = locationHeaders[u];
			var promise = __publishPOHeader(locationHeader.header, purchaseOrder);

			promises.push(promise);
		}	
	} catch(e) {
		console.log("error collecting", e);
	}
	
	console.log("trying to publish PO headers");

	Q.allSettled(promises).then(function (results) {
		var publishedHeaders = [];
		var errorResults = [];
		var hasErrors = false;

		results.forEach(function (result) {
			if (result.state !== 'fulfilled') {
				hasErrors = true;
				errorResults.push(result);
			} else {
				if (_.isArray(result.value))
					result.value = result.value[0];
				publishedHeaders.push(result.value);
			}
		});

		if (hasErrors) {
			deferred.reject(errorResults);
		} else {
			deferred.resolve(publishedHeaders);
		}
	}).catch(e => {
		console.log("publish header error", e);
	}).done();

	return deferred.promise;
}

/**
 * Builds the query for a given locationHeader/purchaseOrder using qryBuilder.create.
 * Attempts to submit it to the database.
 * Returns a promise.
 *
 * Called by __publishPOHeaders
 *
 * @memberOf module:MS
 * @private
 * @returns Promise
 * @param {object} locationHeader
 * @param {object} purchaseOrder
 */
function __publishPOHeader(locationHeader, purchaseOrder) {
	console.log("__publishPOHeader");
	var deferred = Q.defer();

	var request = new sql.Request(sqlConnection);

	var queryresult = qryBuilder.create({
		type: "publishpo",
		category: "header",
		locationHeader: locationHeader,
		savedWebOrder: purchaseOrder
	});

	request.query(queryresult, function (err, recordset) {
		if (err) {
			log(err);
			log(err.RequestError || "Bad Query Response.");
			deferred.reject(err);
		} else {
			if (!recordset || _.isEmpty(recordset))
				recordset = queryresult;
			deferred.resolve(recordset);
		}
	});

	return deferred.promise;
}

/**
 * @memberOf module:MS
 * @private
 */
function __publishPOLines(parameters) {
	console.log("__publishPOLines")
	var deferred = Q.defer();

	var locationHeaders = parameters.locationHeaders;
	var publishedPO = parameters.publishedPO;
	var purchaseOrder = parameters.purchaseOrder;

	var promises = [];
	// var locationHeaders = options.perLocationPurchaseOrders;

	for (var e = 0; e < locationHeaders.length; e++) {
		var locationLines = locationHeaders[e].lines;

		for (var u = 0; u < locationLines.length; u++) {
			var locationLine = locationLines[u];
			// var promise = __publishPOLineItem(locationLine, parameters, options);
			var promise = __publishPOLineItem({
				locationLine: locationLine,
				publishedPO: publishedPO,
				purchaseOrder: purchaseOrder
			});

			promises.push(promise);
		}
	}

	Q.allSettled(promises).then(function (results) {
		var errorResult;
		var isError = false;
		var fulfilledValues = [];

		results.forEach(function (result) {
			if (result.state !== 'fulfilled') {
				isError = true;
				errorResult = result;
			} else {
				if (_.isArray(result.value))
					result.value = result.value[0];
				fulfilledValues.push(result.value);
			}
		});

		if (isError) {
			log(errorResult.reason);
			errorResult.message = errorResult.reason;
			deferred.reject(errorResult);
		} else {
			deferred.resolve(fulfilledValues);
		}
	}).done();

	return deferred.promise;
}

/**
 * @memberOf module:MS
 * @private
 */
function __publishPOLineItem(parameters) {
	console.log("__publishPOLineItem")
	var deferred = Q.defer();

	var locationLine = parameters.locationLine;
	var publishedPO = parameters.publishedPO;
	var purchaseOrder = parameters.purchaseOrder;

	var request = new sql.Request(sqlConnection);

	var queryresult = qryBuilder.create({
		type: "publishpo",
		category: "line",
		savedWebOrder: purchaseOrder,
		locationLine: locationLine,
		publishedPO: publishedPO
	});

	request.query(queryresult, function (err, recordset) {
		if (err) {
			log(err.RequestError || "Bad Query Response.");
			deferred.reject(err);
		} else {
			if (!recordset || _.isEmpty(recordset))
				recordset = queryresult;
			deferred.resolve(recordset);
		}
	});

	return deferred.promise;
}

/**
 * @memberOf module:MS
 * @private
 */
function __getItemCrossRefData(parameters, options) {
	var deferred = Q.defer();

	Q.when(__validateConnection(), function (cntState) {
		var sqlSource = [];
		var request = new sql.Request(sqlConnection);
		request.stream = true;

		request.query(qryBuilder.create({
			type: "crossreference",
			part_number: null, // parameters.part_number || null,
			privateLabel: parameters.privateLabel || null
		}));

		request.on('row', function (row) {
			sqlSource.push(row);
		});

		request.on('error', function (err) {
			deferred.reject(err);
		});

		request.on('done', function (affected) {
			deferred.resolve(sqlSource);
		});
	}, function (err) {
		deferred.reject(err);
	});

	return deferred.promise;
}

/**
 * @memberOf module:MS
 * @private
 */
function __crossReference(parameters, options) {
	var deferred = Q.defer();

	__getItemCrossRefData(parameters, options).then(function (items) {
		/** If matches to the Part number are found, check the Cross Reference Fields */
		var searchingPrivateLabel = parameters.privateLabel || null;
		var searchingPartNumber = parameters.part_number;
		var matchingReference = null;
		var crossRefColumnNames = dbStructure.getCrossReferenceColumns();

		for (var t = 0; t < items.length; t++) {
			var item = items[t];
			var itemNumber = item["Item No_"] || null;

			for (var h = 0; h < crossRefColumnNames.length; h++) {
				var crossRefColumnName = crossRefColumnNames[h];
				var crossRefColumnValue = item[crossRefColumnName] || null;

				if (!crossRefColumnValue)
					continue;

				if (crossRefColumnValue === searchingPartNumber) {
					matchingReference = item;
					matchingReference.crossReference = {
						columnOfReferenceFound: crossRefColumnName,
						referencedItemNumber: itemNumber,
						customerPrivateLabel: searchingPrivateLabel,
						searchedPartNumber: searchingPartNumber
					};
					break;
				}
			}
		}

		if (matchingReference)
			deferred.resolve(matchingReference);
		else {
			var errMsg = "No Cross Reference Found for Part Number: " + searchingPartNumber;
			var errRes = Helprs.err(errMsg, {
				statusCode: 1002,
				parameters: parameters
			});
			console.log(colors.red(errMsg));
			deferred.reject(errRes);
		}
	}).fail(function (err) {
		deferred.reject(err);
	}).done();

	return deferred.promise;
}

/**
 * @memberOf module:MS
 * @private
 */
function __infoSchemaTables(cntState) {
	var deferred = Q.defer();

	var request = new sql.Request(sqlConnection);

	var queryresult = qryBuilder.create({
		type: "infoschema",
		category: "tables"
	});

	request.query(queryresult, function (err, recordset) {
		if (err) {
			log(err.RequestError || "Bad Query Response.");
			deferred.reject(err);
		} else {
			deferred.resolve(recordset);
		}
	});

	return deferred.promise;
}

/**
 * @memberOf module:MS
 * @private
 */
function __searchXRefs(parameters, options) {
	var deferred = Q.defer();

	var request = new sql.Request(sqlConnection);

	var queryresult = qryBuilder.create({
		type: "search",
		category: "xrefs",
		dealer: options.dealer,
		term: parameters.term
	});

	request.query(queryresult, function (err, recordset) {
		if (err) {
			log(err.RequestError || "Bad Query Response.");
			deferred.reject(err);
		} else {
			log("Successful XREF NAV Search");
			deferred.resolve(recordset);
		}
	});

	return deferred.promise;
}