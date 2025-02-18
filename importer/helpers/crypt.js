/**
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
const hasher  = require('./hasher');
/**
 * @link http://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-132.pdf
 * @type  {Object}
 */
let enc = {
    saltSize: 16, // In bytes, needs to fit the keylen bits
    saltRounds: 10,
    hashAlgorithm: 'sha1',
    tokenSecret: '5h0odBUn3KpRyo0$r'
};

function compare(text, encrypted) {
    let decode = decode(encrypted);
    if (text === decode.password)
        return true;
    return false;
}

function decode(encode, type) {
    type = type || 'jwt';
    if (type === 'hmac')
        return hasher.getDecodeHmac(encode, enc.tokenSecret);
    return hasher.getDecode(encode, enc.tokenSecret);
}

function encode(text) {
    let payload = {
        password: text
    };
    return hasher.createEncode(enc.hashAlgorithm, payload, enc.tokenSecret);
}

function hash(data, salt) {
    salt = salt || enc.saltRounds;
    return cryptoHash(data, salt);
}

function hashSync(data, salt) {
    salt = salt || enc.saltRounds;
    return cryptoHashSync(data, salt);
}

function hmac(text) {
    return hasher.createHmac(enc.hashAlgorithm, text, enc.tokenSecret);
}

module.exports = { compare, decode, encode, hash, hashSync, hmac }

function cryptoHash(text, salt) {
    return new Promise((resolve, reject) => {
        cryptoHashSync(text, salt, function(hash) {
            resolve(hash);
        });
    });
}

function cryptoHashSync(text, salt, callback) {
    let hash = hasher.createHashAndSalt(enc.hashAlgorithm, text, enc.saltSize);
    if (callback)
        return callback(hash);
    return hash;
}