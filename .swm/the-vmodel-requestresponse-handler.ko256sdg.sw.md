---
title: The VModel Request/Response Handler
---
# Introduction

This document will walk you through the VModel Request/Response Handler implementation. The VModel serves as a central module to manage various operations related to user interactions, product management, and order processing within the application. The design decisions and questions addressed in this document include:

1. Why is the VModel structured as a single module?
2. How does the VModel handle asynchronous operations?
3. What are the key functionalities provided by the VModel?

# Centralized module structure

<SwmSnippet path="/common/models/index.js" line="49">

---

The VModel is designed as a centralized module to streamline access to various methods across the application. This approach minimizes the need for multiple imports and promotes a cleaner, more maintainable codebase. The VModel acts as a single point of interaction for different controllers and models, encapsulating the logic and providing a unified interface.

```
let cache = new NodeCache({ stdTTL: 100 });

require("clarify");
let start;

/**
 * The `VWModelObject` containing the module logic and public accessible methods.
 * This is what being exported as the module logic. Any methods inside this object
 * are accessible externally. Any methods/functions outside of this object are meant to
 * be accessible internally.
 * @exports VWModel
 */
let VWModelObject = {
  /**
   *
   */
  getAccessToken: (id) => {
    let deferred = Q.defer()
    Oauth2.getAccessToken(id).then(function (response) {
      deferred.resolve(response)
      console.log("GET TOKEN RESPONSE", response)
    })
    return deferred.promise
  },
  getClient: (clientId, clientSecret) => {
    let deferred = Q.defer()
    Oauth2.getClient(clientId, clientSecret).then(function (response) {
      deferred.resolve(response)
      console.log("GET TOKEN RESPONSE", response)
    })
```

---

</SwmSnippet>

# Asynchronous operations handling

<SwmSnippet path="/common/models/index.js" line="79">

---

The VModel extensively uses promises to handle asynchronous operations. This is crucial for managing operations that involve database interactions, API calls, and other time-consuming tasks. By using promises, the VModel ensures that operations are executed in a non-blocking manner, allowing the application to remain responsive.

```
    return deferred.promise
  },
  getRefreshToken: (bearerToken) => {
    let deferred = Q.defer()
    Oauth2.getRefreshToken(bearerToken).then(function (response) {
      deferred.resolve(response)
      console.log("GET TOKEN RESPONSE", response)
    })
    return deferred.promise
  },
```

---

</SwmSnippet>

# Key functionalities

## OAuth2 token management

<SwmSnippet path="/common/models/index.js" line="99">

---

The VModel provides methods for managing OAuth2 tokens, including retrieving access tokens, refresh tokens, and saving tokens. These methods are essential for handling user authentication and authorization within the application.

```
  saveAccessToken: (token, client, user) => {
    let deferred = Q.defer()
    Oauth2.saveAccessToken(token, client, user).then(function (response) {
      deferred.resolve(response)
      console.log("GET TOKEN RESPONSE: ", response)
    })
    return deferred.promise
  },
```

---

</SwmSnippet>

## Cart management

<SwmSnippet path="/common/models/index.js" line="144">

---

The VModel includes methods for managing the shopping cart, such as adding items, removing items, updating quantities, and retrieving cart details. These methods interact with the <SwmToken path="/common/models/checkout/controller.js" pos="9:2:2" line-data="class CheckoutController {">`CheckoutController`</SwmToken> to perform the necessary operations and ensure that the cart state is accurately maintained.

```
  /**
   *
   */
  addToCart: function (parameters, options) {
    let deferred = Q.defer()
    let appSettings = parameters.appSettings
    let body = parameters.body
    let user = parameters.user
    let Checkout = new CheckoutController({
      appSettings: appSettings,
      user: user
    })
    Exectimer.time("addToCart()")
    Checkout.addToCart({
      id: body.id,
      locations: body.locations
    })
      .then(function (response) {
        log(
          Exectimer.timeEnd("addToCart()", {
            methodSuccess: true
          })
        )
        deferred.resolve(response)
      })
      .catch(function (error) {
        log(
          Exectimer.timeEnd("addToCart()", {
            methodSuccess: false
          })
        )
```

---

</SwmSnippet>

## Dealer and product management

<SwmSnippet path="/common/models/index.js" line="432">

---

The VModel offers functionalities for managing dealers and products, including retrieving dealer items, getting product details, and handling product specifications. These methods facilitate the interaction between the application and the underlying data models, ensuring that the necessary information is available for processing user requests.

```
   *
   */
  getDealerProductsAndSpecifications: function (parameters) {
    let deferred = Q.defer()
    let that = this
    let nav_customer_id = parameters.nav_customer_id
    let part_number = parameters.part_number
    let cacheKey = `${nav_customer_id}_ProductsAndSpecifications`
    let multiplier = parameters.multiplier || 1
    //if ( multiplier !== 1 ) console.log('models/index.js - getDealerProductsAndSpecifications - price multiplied by : ', multiplier);
```

---

</SwmSnippet>

## Order processing

<SwmSnippet path="/common/models/index.js" line="786">

---

The VModel handles order processing through methods like submitting purchase orders and retrieving order details. These methods coordinate with the <SwmToken path="/common/models/checkout/controller.js" pos="9:2:2" line-data="class CheckoutController {">`CheckoutController`</SwmToken> and other components to ensure that orders are processed correctly and efficiently.

```
  /**
   * @see models/checkout Repository.submitPurchaseOrder (calls)
   */
  submitPurchaseOrder: function (parameters, options) {
    let deferred = Q.defer()
    let appSettings = parameters.appSettings
    let body = parameters.body
    let user = parameters.user
    const dealer = parameters.dealer
    //   console.log('body param',parameters);
    //  console.log("~~~~~ User ~~~~~~~", user)
    //  console.log("~~~~~ User Cart ~~~~~~~", user.cart)
    let po_number = body.po_number
    //  console.log("~~~~~ po_number ~~~~~~~",po_number);
    let shipping = body.shipping
    // console.log("~~~~~ shipping ~~~~~~~",shipping);
    let token = body.token
    //  console.log("~~~~~ token ~~~~~~~",token);
    let warehouses = body.warehouses
    //  console.log("~~~~~ warehouses ~~~~~~~",warehouses);
    let totals = body.totals
    const vehicleInfo = body.vehicleInfo
```

---

</SwmSnippet>

# Conclusion

The VModel Request/Response Handler is a critical component of the application, providing a centralized interface for managing various operations related to user interactions, product management, and order processing. By structuring the VModel as a single module and leveraging promises for asynchronous operations, the implementation ensures a clean, maintainable, and responsive codebase.

<SwmMeta version="3.0.0" repo-id="Z2l0aHViJTNBJTNBVlclM0ElM0FyYXZpc2hhbQ==" repo-name="VW"><sup>Powered by [Swimm](https://app.swimm.io/)</sup></SwmMeta>
