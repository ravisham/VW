let Q = require("q"),
    _ = require("underscore"),
    Helprs = require("helprs"),
    db = require("libs/db"),
    debug = require("libs/buglog"),
    Cache = require("libs/helpers/cache"),
    log = debug("models", "salesrep");

/**
 * @module SalesRep
 */
module.exports = {
    get: function(params, options) {
        let deferred = Q.defer();
        params = params || {};
        options = options || {};
        let that = this;
        db.sales.salesrep.findDoc(params, options, function(err, doc) {
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
    find: function(params, options) {
        return new Promise((resolve, reject) => {

            db.sales.salesrep.find(params, options, (err, results) => {
                if (err) return reject(err);
                if (_.isEmpty(params)) Cache.set('AllSalesreps', results, {maxMinutes: 5});
                resolve(results);
            });
        });
    },
    findOne: function(params, options) {
        let deferred = Q.defer();
        let guid = null;
        options = options || {};
        if (options.guid) {
            guid = options.guid;
            delete options.guid;
        }

        db.sales.salesrep.findOne(params, options, function(err, record) {
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
    save: function(data) {
        let deferred = Q.defer();
        db.sales.salesrep.save(data, function(err, salerep) {
            if (err)
                deferred.reject(err);
            else {
                deferred.resolve(salerep);
            }
        });
        return deferred.promise;
    },
    search: function(params, options, returnOptions) {
        let deferred = Q.defer();
        let toReturn = false;
        if (returnOptions !== undefined)
            toReturn = returnOptions;
        options = options || {};

        db.sales.salesrep.search(params, function(err, docs) {
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
    update: function(data) {
        let deferred = Q.defer();
        db.sales.salesrep.save(data, function(err, salerep) {
            if (err)
                deferred.reject(err);
            else {
                deferred.resolve(salerep);
            }
        });
        return deferred.promise;
    },
    destroy: function(params, options) {
        let deferred = Q.defer();
        db.sales.salesrep.destroy(params, function(err, dealer) {
            if (err)
                deferred.reject(err);
            else {
                deferred.resolve(dealer);
            }
        });
        return deferred.promise;
    }
};