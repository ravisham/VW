/*
 * A Note on Rounds
 * When you are hashing your data the module will go through a series of rounds to give you a secure hash.
 * The value you submit there is not just the number of rounds that the module will go through to hash your data.
 * The module will use the value you enter and go through 2^rounds iterations of processing.
 *
 * On a 2GHz core you can roughly expect:
 * ```js
 * rounds=8 : ~40 hashes/sec
 * rounds=9 : ~20 hashes/sec
 * rounds=10: ~10 hashes/sec
 * rounds=11: ~5  hashes/sec
 * rounds=12: 2-3 hashes/sec
 * rounds=13: ~1 sec/hash
 * rounds=14: ~1.5 sec/hash
 * rounds=15: ~3 sec/hash
 * rounds=25: ~1 hour/hash
 * rounds=31: 2-3 days/hash
 * ```
 *
 * Hash Info
 * The characters that comprise the resultant hash are:
 * ```js
 * ./ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789$.
 * ```
 * Resultant hashes will be 60 characters long.
 * @type  {Object}
 */
var Q       = require('q'),
    hasher  = require('./hasher'),
    debug = require("libs/buglog"),
    log = debug("libs", "crypt");

/*
 * @link http://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-132.pdf
 */
var enc = {
        algorithm: 'aes-256-cbc',
        keylen: 32,
        saltSize: 16, // In bytes, needs to fit the keylen bits
        saltRounds: 10,
        /** Changing ANY of thes password, iterations or fileNameSepartor will result in the currently encrypted files not working. */
        password: 'S0m3R34le3c)mp13x5trlN6',
        iterations: 4096,
        fileNameSeparator: ':::enc:::',
        hashAlgorithm: 'sha1',
        tokenSecret: '5h0odBUn3KpRyo0$r'
    },
    cryptoSupport = true,
    crypto, bcrypt;


try {
    crypto = require('crypto');
} catch (err) {
    console.log('crypto support is disabled!');
    cryptoSupport = false;
    bcrypt = require('bcrypt');
}

/**
 * Crypt Module Lib
 * Responsible for strictly encrypting, decrypting and comparing text(strings) with encrypted text.
 * @exports CryptObj
 */
var CryptObj = {
    /**
     * @param   {String}  text          [REQUIRED] - data to compare.
     * @param   {String}  encrypted     [REQUIRED] - data to be compared to.
     *
     * @return  {Boolean}             returning a resolving boolean once the data has been compared. uses eio making it asynchronous.
     */
    compare: function(text, encrypted) {
        var decode = this.decode(encrypted);
        if (text === decode.password)
            return true;
        return false;
    },

    /**
     *
     */
    decode: function(encode, type) {
        type = type || 'jwt';
        if (type === 'hmac')
            return hasher.getDecodeHmac(encode, enc.tokenSecret);
        return hasher.getDecode(encode, enc.tokenSecret);
    },

    /**
     *
     */
    encode: function(text) {
        var payload = {
            password: text
        };
        return hasher.createEncode(enc.hashAlgorithm, payload, enc.tokenSecret);
    },
    /**
     * @param   {String}  data  [REQUIRED] - the data to be encrypted.
     * @param   {Number}  salt  [REQUIRED] - the salt to be used to hash the password.
     *                          If specified as a number then a salt will be generated with the
     *                          specified number of rounds and used (see example under Usage).
     *
     * @return  {String}        returning a resolving an encrypted form once the data has been encrypted. uses eio making it asynchronous.
     */
    hash: function(data, salt) {
        salt = salt || enc.saltRounds;
        if (cryptoSupport)
            return __cryptoHash(data, salt);
        return __bcryptHash(data, salt);
    },
    /**
     * @param   {String}        data    [REQUIRED] - the data to be encrypted.
     * @param   {Number=} [10]   salt    the salt to be used to hash the password.
     *                                  If specified as a number then a salt will be generated with the
     *                                  specified number of rounds and used (see example under Usage).
     *
     * @return  {String}                returning an encrypted form once the data has been encrypted.
     */
    hashSync: function(data, salt) {
        salt = salt || enc.saltRounds;
        if (cryptoSupport)
            return __cryptoHashSync(data, salt);
        return bcrypt.hashSync(data, salt);
    },

    /**
     *
     */
    hmac: function(text) {
        return hasher.createHmac(enc.hashAlgorithm, text, enc.tokenSecret);
    }
};

module.exports = CryptObj;


/**
 * @memberOf module:CryptObj
 * @private
 */
function __bcryptCompare(text, encrypted) {
    var deferred = Q.defer();
    bcrypt.compare(text, encrypted, function(err, res) {
        if (err)
            deferred.reject(err);
        else
            deferred.resolve(res);
    });
    return deferred.promise;
}

/**
 * @memberOf module:CryptObj
 * @private
 */
function __bcryptHash(data, salt) {
    var deferred = Q.defer();
    bcrypt.hash(data, salt, function(err, hash) {
        if (err)
            deferred.reject(err);
        else
            deferred.resolve(hash);
    });
    return deferred.promise;
}

/**
 * @memberOf module:CryptObj
 * @private
 */
function __cryptoHash(text, salt) {
    var deferred = Q.defer();
    __cryptoHashSync(text, salt, function(hash) {
        deferred.resolve(hash);
    });
    return deferred.promise;
}

/**
 * @memberOf module:CryptObj
 * @private
 */
function __cryptoHashSync(text, salt, callback) {
    var hash = hasher.createHashAndSalt(enc.hashAlgorithm, text, enc.saltSize);
    if (callback)
        return callback(hash);
    return hash;
}