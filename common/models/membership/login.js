let Q = require("q"),
    _ = require("underscore"),
    Helprs = require("helprs"),
    db = require("libs/db");

/**
 * @module Login
 */
module.exports = {
    /**
     * Performs a find, using Massive, on the membership.login table within Postgres
     * @see https://dmfay.github.io/massive-js/queries.html#find
     *
     * @returns {Promise}
     * @param {object} params The fields for Massive
     * @param {object} options The config options for Massive
     */
    find: function(params, options) {
        let deferred = Q.defer();
        params = params || {};
        options = options || {};
        db.membership.login.find(params, options, function(err, doc) {
            if (err)
                deferred.reject(err);
            else
                deferred.resolve(doc);
        });
        return deferred.promise;
    },

    /**
     * Performs a findOne, using Massive, on the membership.login table within Postgres
     * @see https://dmfay.github.io/massive-js/queries.html#findOne
     *
     * @returns {Promise}
     * @param {object} params The fields for Massive
     * @param {object} options The config options for Massive
     */
    findOne: function(params, options) {
        return new Promise(function(resolve, reject) {
            db.membership.login.findOne(params, options, (err, record) => {
                if (err) {
                    log('Error in /common/models/membership/login.js findOne');
                    log(err);
                    return reject(err);
                } else if (_.isEmpty(record)) {
                    log('/common/models/membership/login.js findOne: login not found');
                    return reject(new Error('Record Not Found'));
                }
                resolve(record);
            });
        });
    },

    /**
     * Performs a find, using Massive, on the membership.login table within Postgres
     * @see https://dmfay.github.io/massive-js/queries.html#findOne
     *
     * @returns {Promise}
     * @param {string} hash The value to look for in the hashed_reset_id column of membership.login
     */
    findByHashReset: function(hash) {
        return new Promise(function(resolve, reject) {
            db.membership.login.findOne({hashed_reset_id: hash}, (err, record) => {
                if (err) return reject(err);
                else if (_.isEmpty(record)) return reject(new Error('Record Not Found'));
                resolve(record);
            });
        });
    },

    /**
     * Performs a save, using Massive, on the membership.login table within Postgres
     * @see https://dmfay.github.io/massive-js/persistence.html#save
     *
     * @returns {Promise}
     * @param {object} data The value to save.
     */
    save: function(data) {
        return new Promise((resolve, reject) => {
            data.created = data.last_accessed = new Date();
            db.membership.login.save(data, (err, record) => {
                if (err) return reject(err);
                resolve(record);
            });
        });
    },

    /**
     * Performs a cross field search, using Massive, on the membership.login table within Postgres
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

        db.membership.login.search(params, function(err, docs) {
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
     * Performs an update, using Massive, on the membership.login table within Postgres
     * @see https://dmfay.github.io/massive-js/persistence.html#update
     *
     * @returns {Promise}
     * @param {object} data The value to save.
     */
    update: function(data) {
        return new Promise((resolve, reject) => {
            data.last_accessed = new Date();
            db.membership.login.save(data, (err, record) => {
                if (err) return reject(err);
                resolve(record);
            });
        });
    },

    /**
     * Performs a destroy, using Massive, on the membership.login table within Postgres
     * @see https://dmfay.github.io/massive-js/persistence.html#destroy
     *
     * @returns {Promise}
     * @param {object} data The value to save.
     */
    destroy: function(params, options) {
        let deferred = Q.defer();
        db.membership.login.destroy(params, function(err, dealer) {
            if (err)
                deferred.reject(err);
            else {
                deferred.resolve(dealer);
            }
        });
        return deferred.promise;
    }
};