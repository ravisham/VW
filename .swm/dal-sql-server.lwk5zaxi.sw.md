---
title: DAL - SQL Server
---
# Introduction

This document will walk you through the implementation of the Data Access Layer (DAL) for SQL Server in our application. The purpose of this module is to manage connections and interactions with the SQL Server database, specifically for handling data related to dealer items, sales orders, and inventory.

We will cover:

1. How connections to the SQL Server are managed and validated.
2. The approach for querying and processing data from the database.
3. The design of methods for specific data operations, such as retrieving dealer items and publishing purchase orders.

# Managing SQL Server connections

<SwmSnippet path="/common/libs/mssql/index.js" line="22">

---

The module begins by setting up the connection environment and managing the connection state. This is crucial for ensuring that database operations can be performed reliably.

```
require('clarify');

sql.Promise = Q;

var invRecCount = 0;
var connectionSettings = null;
var sqlConnection = null;
var connectionState = 'closed';
```

---

</SwmSnippet>

<SwmSnippet path="/common/libs/mssql/index.js" line="31">

---

We use an event-driven approach to handle connection status changes, which allows us to react to connection events such as opening or closing.

```
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
```

---

</SwmSnippet>

# Querying and processing data

The module provides several methods for querying the database and processing the results. These methods use promises to handle asynchronous operations, ensuring that data is retrieved and processed efficiently.

<SwmSnippet path="/common/libs/mssql/index.js" line="31">

---

For example, the <SwmToken path="/common/libs/mssql/index.js" pos="41:1:1" line-data="  getDealerItems: function (parameters) {">`getDealerItems`</SwmToken> method retrieves dealer-specific items from the database. It uses a promise to manage the asynchronous nature of the database query and processes the results to extract relevant item details.

```
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
```

---

</SwmSnippet>

<SwmSnippet path="/common/libs/mssql/index.js" line="63">

---

Error handling is integrated into the promise chain to manage any issues that arise during data retrieval.

```
      .fail(function (error) {
        console.log("MSSQL.getDealerItems ERROR - fail after " + (new Date().getTime() - start) + "ms")
        deferred.reject(error)
      })
      .done(function () {
        console.log("MSSQL.getDealerItems done after " + (new Date().getTime() - start) + "ms")
      })
```

---

</SwmSnippet>

# Specific data operations

The module includes methods for specific data operations, such as cross-referencing part numbers and publishing purchase orders. These methods are designed to interact with specific tables and perform complex operations involving multiple steps.

<SwmSnippet path="/common/libs/mssql/index.js" line="78">

---

The <SwmToken path="/common/libs/mssql/index.js" pos="90:1:1" line-data="  crossReference: function (parameters, options) {">`crossReference`</SwmToken> method, for instance, checks for the existence of part numbers in a specific table and handles both successful and unsuccessful queries.

```
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
```

---

</SwmSnippet>

<SwmSnippet path="/common/libs/mssql/index.js" line="448">

---

The <SwmToken path="/common/libs/mssql/index.js" pos="449:12:12" line-data="   * @see models/checkout repository.publishPurchaseOrder (called by)">`publishPurchaseOrder`</SwmToken> method is responsible for creating and saving order headers and lines in the database. It involves multiple steps, including validating the connection, preparing data, and executing queries.

```
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
```

---

</SwmSnippet>

# Conclusion

This module is designed to provide a robust and flexible interface for interacting with the SQL Server database. By managing connections effectively and providing methods for specific data operations, it ensures that our application can handle complex data interactions efficiently.

<SwmMeta version="3.0.0" repo-id="Z2l0aHViJTNBJTNBVlclM0ElM0FyYXZpc2hhbQ==" repo-name="VW"><sup>Powered by [Swimm](https://app.swimm.io/)</sup></SwmMeta>
