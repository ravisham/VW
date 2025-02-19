---
title: Tire Connect API
---
# Introduction

This document will walk you through the implementation of the Tire Connect API. The API is designed to handle various operations related to tire inventory, order processing, and shipping. The main components include authentication, error handling, and specific routes for different functionalities.

We will cover:

1. How authentication is managed.
2. The role of error handling in the API.
3. The structure and purpose of key routes.

# Authentication management

<SwmSnippet path="/site/server/routes/api.v2.js" line="1941">

---

Authentication is a critical part of the API to ensure secure access. The <SwmToken path="/site/server/routes/api.v2.js" pos="617:9:9" line-data="    let request = new OAuth2Server.Request(req)">`OAuth2Server`</SwmToken> is used to handle authentication requests. The <SwmToken path="/site/server/routes/api.v2.js" pos="1942:2:2" line-data="      .authenticate(request, response)">`authenticate`</SwmToken> method is invoked to verify the token and set necessary headers for further processing.

```
    const authentication = oauth
      .authenticate(request, response)
      .then(function (token, response) {
        const { headers } = req
        console.log("Authentication Step: Received token")
        console.log("Authentication Step: Requesting Headers", headers)
```

---

</SwmSnippet>

# Error handling

<SwmSnippet path="/site/server/routes/api.v2.js" line="1871">

---

Error handling is centralized to provide consistent responses and logging. The <SwmToken path="/site/server/routes/api.v2.js" pos="1882:3:3" line-data="      const errorHandler = (error) =&gt; {">`errorHandler`</SwmToken> and <SwmToken path="/site/server/routes/api.v2.js" pos="1871:3:3" line-data="      const errorInNestedHandler = (error, additionalMessage = null) =&gt; {">`errorInNestedHandler`</SwmToken> functions are used to throw and manage errors, respectively. These functions utilize predefined error codes and messages to standardize error responses.

```
      const errorInNestedHandler = (error, additionalMessage = null) => {
        console.log(error, "NESTED ERROR")
        console.log(additionalMessage, "ADDITIONAL INFO FOR ERROR")
        res.setHeader("message", ErrorCodes[error].MESSAGE)
        res.status(ErrorCodes[error].CODE).json({
          message: error,
          description: ErrorCodes[error].MESSAGE,
          additionalMessage: additionalMessage === null ? "" : additionalMessage[0]
        })
        return
      }
      const errorHandler = (error) => {
        console.log(error, "HERE IS THE ERROR")
        throw {
          message: error,
          code: ErrorCodes[error].CODE,
          description: ErrorCodes[error].MESSAGE
        }
      }
```

---

</SwmSnippet>

# Key routes

## Token generation

<SwmSnippet path="/site/server/routes/api.v2.js" line="616">

---

The <SwmToken path="/site/server/routes/api.v2.js" pos="616:6:9" line-data="  router.post(&quot;/oauth/token&quot;, function (req, res) {">`/oauth/token`</SwmToken> route is responsible for generating access tokens. It processes the request and response objects through the <SwmToken path="/site/server/routes/api.v2.js" pos="617:9:9" line-data="    let request = new OAuth2Server.Request(req)">`OAuth2Server`</SwmToken> to issue a token, which is then returned in the response.

```
  router.post("/oauth/token", function (req, res) {
    let request = new OAuth2Server.Request(req)
    let response = new OAuth2Server.Response(res)
    console.log("headers", req.headers)
```

---

</SwmSnippet>

## Inventory check

<SwmSnippet path="/site/server/routes/api.v2.js" line="688">

---

The <SwmToken path="/site/server/routes/api.v2.js" pos="688:6:7" line-data="  router.post(&quot;/checkInventory&quot;, function (req, res) {">`/checkInventory`</SwmToken> route checks the availability of parts in the inventory. It validates the site and part numbers, ensuring they are recognized by the system. If any validation fails, appropriate error messages are returned.

```
  router.post("/checkInventory", function (req, res) {
    checkMemoryStatistics()
    let request = new OAuth2Server.Request(req)
    let response = new OAuth2Server.Response(res)
```

---

</SwmSnippet>

## Order creation

<SwmSnippet path="/site/server/routes/api.v2.js" line="1009">

---

The <SwmToken path="/site/server/routes/api.v2.js" pos="1009:6:7" line-data="  router.post(&quot;/createOrder&quot;, function (req, res) {">`/createOrder`</SwmToken> route handles the creation of new orders. It validates customer and dealer information, checks inventory, and calculates shipping rates before finalizing the order. The process involves multiple validation steps to ensure data integrity.

```
  router.post("/createOrder", function (req, res) {
    // FULL POST REQUEST FORMAT

    //   {
    //     "user": {
    //       "email": "qa@visionwheel.com",
    //         "nav_customer_id":"VISIONWHEEL"
    //     },
    //   "supplierName": "Vision Wheel",
    //   "supplierLocation": "50",
    //   "warehouse":"TX",
    //   "site": "{{vision_test_site_id}}",
    //   "purchaseOrderNumber": "1234567892-ds",
    //   "shipping": {
    //       "type": "DELIVERY",
    //       "carrier": "FEDEX",
    //       "method": "90",
    //       "name": "HIGHLANDS RANCH (COD 14)",
    //       "addressLine1": "12345 N 3oth St",
    //       "addressLine2": "Suite 12",
    //       "city": "Scottsdale",
    //       "state": "AZ",
    //       "zip": {
    //           "base": "80126",
    //           "extension": "2437",
    //           "completeZipCode": "80126-2437"
    //       }
    //   },
    //   "product": [
    //       {
```

---

</SwmSnippet>

## Return order processing

<SwmSnippet path="/site/server/routes/api.v2.js" line="1970">

---

The <SwmToken path="/site/server/routes/api.v2.js" pos="1970:6:7" line-data="  router.post(&quot;/returnOrder&quot;, function (req, res) {">`/returnOrder`</SwmToken> route manages the return of orders. It validates the return order number and original order number, ensuring they meet the required criteria. The route also handles the logistics of returning items to the warehouse.

```
  router.post("/returnOrder", function (req, res) {
    let request = new OAuth2Server.Request(req)
    let response = new OAuth2Server.Response(res)
    let warehouseList = require("config/settings/warehouses")
```

---

</SwmSnippet>

## Order status retrieval

<SwmSnippet path="/site/server/routes/api.v2.js" line="2353">

---

The <SwmToken path="/site/server/routes/api.v2.js" pos="2353:6:11" line-data="  router.get(&quot;/orderStatus/:site/:po&quot;, function (req, res) {">`/orderStatus/:site/:po`</SwmToken> route retrieves the status of an order based on the site and purchase order number. It validates the customer information and checks the order status in the database, returning detailed status information.

```
  router.get("/orderStatus/:site/:po", function (req, res) {
    let request = new OAuth2Server.Request(req)
    let response = new OAuth2Server.Response(res)
    const os = require("os")
```

---

</SwmSnippet>

## Part search

<SwmSnippet path="/site/server/routes/api.v2.js" line="2737">

---

The <SwmToken path="/site/server/routes/api.v2.js" pos="2737:6:7" line-data="  router.post(&quot;/searchParts&quot;, function (req, res) {">`/searchParts`</SwmToken> route allows searching for parts based on various parameters. It validates customer credentials and searches the inventory for matching parts, returning the results in a structured format.

```
  router.post("/searchParts", function (req, res) {
    checkMemoryStatistics()
    let request = new OAuth2Server.Request(req)
    let response = new OAuth2Server.Response(res)
```

---

</SwmSnippet>

## Delivery options

<SwmSnippet path="/site/server/routes/api.v2.js" line="3214">

---

The <SwmToken path="/site/server/routes/api.v2.js" pos="3214:6:7" line-data="  router.post(&quot;/getDeliveryOptions&quot;, function (req, res) {">`/getDeliveryOptions`</SwmToken> route provides available shipping options for a given order. It validates customer and part information, retrieves warehouse data, and calculates shipping options based on the dealer's payment preferences.

```
  router.post("/getDeliveryOptions", function (req, res) {
    // REQUEST EXAMPLE

    // {
    //   "user": {
    //     "email": "qa@visionwheel.com",
    //       "nav_customer_id":"VISIONWHEEL"
    //   },
    //   "brand": "Wheel Brand",
    //   "part_number": "141H7861GM0",
    //   "supplierLocation": "02",
    //   "quantity": 4
    // }
```

---

</SwmSnippet>

## Dealer locations

<SwmSnippet path="/site/server/routes/api.v2.js" line="3612">

---

The <SwmToken path="/site/server/routes/api.v2.js" pos="3614:5:6" line-data="router.post(&quot;/getDealerLocations&quot;, function (req, res) {">`/getDealerLocations`</SwmToken> route returns available dealer locations based on the user's locale. It validates the customer and retrieves warehouse information, ensuring the locations are live and match the user's locale.

```
    return authentication
  })
router.post("/getDealerLocations", function (req, res) {
```

---

</SwmSnippet>

# Conclusion

The Tire Connect API is structured to handle various operations related to tire inventory and order management. Authentication and error handling are integral parts of the API, ensuring secure and reliable operations. Each route is designed to perform specific tasks, with validations and error handling to maintain data integrity and provide meaningful responses.

<SwmMeta version="3.0.0" repo-id="Z2l0aHViJTNBJTNBVlclM0ElM0FyYXZpc2hhbQ==" repo-name="VW"><sup>Powered by [Swimm](https://app.swimm.io/)</sup></SwmMeta>
