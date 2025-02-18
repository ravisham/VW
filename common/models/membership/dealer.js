let Q = require("q"),
    _ = require("underscore"),
    Helprs = require("helprs"),
    db = require("libs/db"),
    Item = require("models/public/item");

require("clarify");

/**
 * @module Dealer
 */
module.exports = {
    /**
     * @returns {Promise}
     * @param {object} parameters
     * @param {object} options
     */
    get: function(params, options) {
        let deferred = Q.defer();
        params = params || {};
        options = options || {};
        let that = this;

        db.membership.dealer.findDoc(params, options, function(err, doc) {
            if (err) {
                deferred.reject(err);
            } else {
                if (options.addMethods) {
                    if (doc[0]) {
                        doc = doc[0];
                    }
                    that.__addMethods(doc).then(function(methodDoc) {
                        deferred.resolve(methodDoc);
                    }).fail(function(err) {
                        deferred.reject(err);
                    }).done();
                } else {
                    deferred.resolve(doc);
                }
            }
        });
        return deferred.promise;
    },

    /**
     * @returns {Promise}
     * @param {object} parameters
     * @param {object} options
     */
    getPricing: function(parameters, options) {
        let deferred = Q.defer();
        parameters = parameters || {};
        options = options || {};

        this.__getPricing(parameters, options).then(function(response) {
            deferred.resolve(response);
        }).fail(function(err) {
            deferred.reject(err);
        }).done();

        return deferred.promise;
    },
    /**
     * Method to get Dealer Specific Pricing for the specified Item.
     *
     * @param   {Object}  parameters  Object Containing the Dealer's ID and Item ID.
     * @example <caption>Example Usage of the Parameters Object</caption>
     * {
     *     id: 123,
     *     item: 465456
     * }
     * @param   {Object}  options     Additional Options that may be defined later in dev.
     *
     * @return  {String}              The Actual Dollar Amount
     */
    getPricingPerItem: function(parameters, options) {
        let deferred = Q.defer();
        parameters = parameters || {};
        options = options || {};

        this.__getPricingPerItem(parameters, options).then(function(response) {
            deferred.resolve(response);
        }).fail(function(err) {
            deferred.reject(err);
        }).done();

        return deferred.promise;
    },

    /**
     * Performs a find, using Massive, on the membership.dealer table within Postgres
     * @see https://dmfay.github.io/massive-js/queries.html#find
     *
     * @returns {Promise}
     * @param {object} params The fields for Massive
     * @param {object} options The config options for Massive
     */
    find: function(params, options) {
        let deferred = Q.defer();
        let guid = null;
        options = options || {};
        if (options.guid) {
            guid = options.guid;
            delete options.guid;
        }

        db.membership.dealer.find(params, options, function(err, result) {
            if (err)
                deferred.reject(err);
            else {
                if (guid) {
                    result.guid = guid;
                }
                deferred.resolve(result);
            }
        });

        return deferred.promise;
    },

    /**
     * Performs a findOne, using Massive, on the membership.dealer table within Postgres
     * @see https://dmfay.github.io/massive-js/queries.html#findOne
     *
     * @returns {Promise}
     * @param {object} params The fields for Massive
     * @param {object} options The config options for Massive
     */
    findOne: function(params, options) {
        let deferred = Q.defer();
        let guid = null;
        options = options || {};
        if (options.guid) {
            guid = options.guid;
            delete options.guid;
        }

        db.membership.dealer.findOne(params, options, function(err, record) {
            if (err)
                deferred.reject(err);
            else {
                if (!record) {
                    let errOpts = {
                        errorCode: 1000,
                        statusCode: 401
                    };
                    if (guid) {
                        errOpts.guid = guid;
                    }
                    deferred.reject(Helprs.err("Record Not Found", errOpts));
                } else {
                    if (guid) {
                        record.guid = guid;
                    }
                    deferred.resolve(record);
                }
            }
        });

        return deferred.promise;
    },

    /**
     * Performs a findOne, using Massive, on the membership.login table within Postgres
     * @see https://dmfay.github.io/massive-js/queries.html#findOne
     *
     * @returns {Promise}
     * @param {object} params The fields for Massive
     */
    findDealer: function(params) {
        return new Promise((resolve, reject) => {
            db.membership.dealer.findOne(params, (err, dealer) => {
                if (err) return reject(err);
                else if (!dealer) return reject(new Error('Dealer Not Found'));
                resolve(dealer);
            });
        });
    },

    /**
     * Performs a save, using Massive, on the membership.dealer table within Postgres
     * @see https://dmfay.github.io/massive-js/persistence.html#save
     *
     * @returns {Promise}
     * @param {object} data The value to save.
     */
    save: function(data) {
        let deferred = Q.defer();
        data.created = data.updated = new Date();
        db.membership.dealer.save(data, function(err, dealer) {
            if (err)
                deferred.reject(err);
            else {
                deferred.resolve(dealer);
            }
        });
        return deferred.promise;
    },

    /**
     * Performs a cross field search, using Massive, on the membership.dealer table within Postgres
     * @see https://dmfay.github.io/massive-js/queries.html#search
     *
     * @returns {Promise}
     * @param {object} data The value to save.
     */
    search: function(params, options, returnOptions) {
        let deferred = Q.defer();
        let toReturn = false;
        if (returnOptions !== undefined)
            toReturn = returnOptions;
        options = options || {};

        db.membership.dealer.search(params, function(err, docs) {
            if (err)
                deferred.reject(err);
            else {
                if (toReturn) {
                    let resObj = _.extend({}, options);
                    resObj.docs = docs;
                    deferred.resolve(resObj);
                } else {
                    deferred.resolve(docs);
                }
            }
        });
        return deferred.promise;
    },

    /**
     * Performs an update, using Massive, on the membership.dealer table within Postgres
     * @see https://dmfay.github.io/massive-js/persistence.html#update
     *
     * @returns {Promise}
     * @param {object} data The value to save.
     */
    update: function(data) {
        let deferred = Q.defer();
        data.updated = new Date();
        db.membership.dealer.save(data, function(err, dealer) {
            if (err)
                deferred.reject(err);
            else {
                deferred.resolve(dealer);
            }
        });
        return deferred.promise;
    },

    /**
     * Performs a destroy, using Massive, on the membership.dealer table within Postgres
     * @see https://dmfay.github.io/massive-js/persistence.html#destroy
     *
     * @returns {Promise}
     * @param {object} data The value to save.
     */
    destroy: function(params, options) {
        let deferred = Q.defer();
        db.membership.dealer.destroy(params, function(err, dealer) {
            if (err)
                deferred.reject(err);
            else {
                deferred.resolve(dealer);
            }
        });
        return deferred.promise;
    },

    /**
     * Effectively an alias for __validateDealerPricing, just wrapping it in a promise.
     *
     * @returns {Promise}
     * @param {object} parameters
     * @param {object} options
     */
    __getPricing: function(parameters, options) {
        let deferred = Q.defer();

        this.__validateDealerPricing(parameters, options, function(err, items) {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve(items);
            }
        });

        return deferred.promise;
    },

    /**
     * Mock. Waits a second and a half then resolves with a price of $350.
     *
     * @returns {Promise}
     * @param {object} parameters
     * @param {object} options
     */
    __getPricingPerItem: function(parameters, options) {
        let deferred = Q.defer();

        /** We are mocking data for now. */
        Q.delay(1500).done(function() {
            deferred.resolve(Helprs.dollar({max: 350}));
        });

        return deferred.promise;
    },

    /**
     * Calls __getDealerPricingPerItem for all of the items in parameters.items.
     * Upon successful completion of all promises, it fires the callback.
     * If it had errors, they're passed as the first argument to the callback.
     * If it was successful, the result is passed as the second argument to the callback.
     *
     * @returns {undefined}
     * @param {object} parameters
     * @param {object} options
     * @param {function} callback
     */
    __validateDealerPricing: function(parameters, options, callback) {
        let that = this;
        /**
         * First, check if `parameters.items` is defined. If so, we get dealer pricing
         * on each of the `parameters.items` in question. If `parameters.items` is not
         * defined (undefined or empty array) we reject the promise.
         */
        if (!parameters.items || parameters.items.length === 0) {
            let err = Helprs.err("No Items Provided for Dealer Pricing", {
                statusCode: 401
            });
            callback(err);
        } else {
            let dealerID = parameters.id;
            let pricingItems = parameters.items;
            if (!_.isArray(pricingItems)) {
                pricingItems = _.allKeys(pricingItems);
            }

            let priceOptions = {
                items: parameters.items,
                price: Helprs.dollar({min: 50, max: 350})
            };
            let items = [], promises = [];
            for (let f = 0; f < pricingItems.length; f++) {
                let promise = this.__getDealerPricingPerItem({dealer_id: dealerID, item_id: pricingItems[f]}, priceOptions).then(function(item) {
                    items.push(item);
                });
                promises.push(promise);
            }

            Q.allSettled(promises).then(function(results) {
                let isError = false,
                    errorResult;
                results.forEach(function(result) {
                    if (result.state !== 'fulfilled') {
                        isError = true;
                        errorResult = result;
                    }
                });

                if (isError) {
                    console.log(colors.red("!!! " + errorResult.reason));
                    errorResult.message = errorResult.reason;
                    return callback(errorResult);
                }

                callback(null, items);
            }).done();
        }
    },

    /**
     * Gets dealer pricing per item and returns a promise.
     *
     * @returns {Promise}
     * @param {object} parameters
     * @param {object} options
     */
    __getDealerPricingPerItem: function(parameters, options) {
        let deferred = Q.defer();
        this.getPricingPerItem({id: parameters.dealer_id, item: parameters.item_id}).then(function(price) {
            let item = {};

            if (!_.isArray(items)) {
                item = items[parameters.item_id];
            }

            if (!item.id) {
                item.id = parameters.item_id;
            }

            if (!item.price) {
                item.price = {};
            }

            item.price.dealer = price;

            deferred.resolve(item);
        }).fail(function(err) {
            deferred.reject(err);
        }).done();
        return deferred.promise;
    }
};