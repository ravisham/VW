'use strict';

const toString = Object.prototype.toString;
const nano = (time) => {
	if (!Array.isArray(time) || time.length !== 2) {
		throw new TypeError('expected an array from process.hrtime()');
	}
	return ((+time[0]) * 1e9) + (+time[1]);
};
const isBuffer = (obj) => {
    return obj != null && (isBufferCheck(obj) || isSlowBuffer(obj) || !!obj._isBuffer)
};

let isBufferCheck = (obj) => {
    return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
};
/** For Node v0.10 support. Remove this eventually. */
let isSlowBuffer = (obj) => {
    return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isBufferCheck(obj.slice(0, 0))
};
/**
 * Get the native `typeof` a value.
 *
 * @param  {*} `val`
 * @return {*} Native javascript type
 */
let kindOf = (val) => {
    if (typeof val === 'undefined')
        return 'undefined';
    if (val === null)
        return 'null';
    if (val === true || val === false || val instanceof Boolean)
        return 'boolean';
    if (typeof val === 'string' || val instanceof String)
        return 'string';
    if (typeof val === 'number' || val instanceof Number)
        return 'number';
    if (typeof val === 'function' || val instanceof Function)
        return 'function';
    if (typeof Array.isArray !== 'undefined' && Array.isArray(val))
        return 'array';
    if (val instanceof RegExp)
        return 'regexp';
    if (val instanceof Date)
        return 'date';

    let type = toString.call(val);
    if (type === '[object RegExp]')
        return 'regexp';
    if (type === '[object Date]')
        return 'date';
    if (type === '[object Arguments]')
        return 'arguments';
    if (type === '[object Error]')
        return 'error';
    if (isBuffer(val))
        return 'buffer';
    if (type === '[object Set]')
        return 'set';
    if (type === '[object WeakSet]')
        return 'weakset';
    if (type === '[object Map]')
        return 'map';
    if (type === '[object WeakMap]')
        return 'weakmap';
    if (type === '[object Symbol]')
        return 'symbol';
    if (type === '[object Int8Array]')
        return 'int8array';
    if (type === '[object Uint8Array]')
        return 'uint8array';
    if (type === '[object Uint8ClampedArray]')
        return 'uint8clampedarray';
    if (type === '[object Int16Array]')
        return 'int16array';
    if (type === '[object Uint16Array]')
        return 'uint16array';
    if (type === '[object Int32Array]')
        return 'int32array';
    if (type === '[object Uint32Array]')
        return 'uint32array';
    if (type === '[object Float32Array]')
        return 'float32array';
    if (type === '[object Float64Array]')
        return 'float64array';
    return 'object';
};
let isNumber = (num) => {
	var type = kindOf(num);

	if (type === 'string') {
		if (!num.trim()) return false;
	} else if (type !== 'number') {
		return false;
	}

	return (num - num + 1) >= 0;
};
let scale = {
    'w': 6048e11,
    'd': 864e11,
    'h': 36e11,
    'm': 6e10,
    's': 1e9,
    'ms': 1e6,
    'μs': 1e3,
    'ns': 1,
};
let utils = {
    regex: {
        'w': /^(w((ee)?k)?s?)$/,
        'd': /^(d(ay)?s?)$/,
        'h': /^(h((ou)?r)?s?)$/,
        'm': /^(min(ute)?s?|m)$/,
        's': /^((sec(ond)?)s?|s)$/,
        'ms': /^(milli(second)?s?|ms)$/,
        'μs': /^(micro(second)?s?|μs)$/,
        'ns': /^(nano(second)?s?|ns?)$/,
    },
    isSmallest (uom, unit) {
        return this.regex[uom].test(unit);
    },
    round (num, digits) {
        num = Math.abs(num);
        if (isNumber(digits))
            return num.toFixed(digits);
        return Math.round(num);
    }
};

module.exports = (time, smallest, digits) => {
	if (!isNumber(time) && !Array.isArray(time))
		throw new TypeError('expected an array or number in nanoseconds');
	if (Array.isArray(time) && time.length !== 2)
		throw new TypeError('expected an array from process.hrtime()');

	if (isNumber(smallest)) {
		digits = smallest;
		smallest = null;
	}

	let num = isNumber(time) ? time : nano(time);
	let res = '';
	let prev;

	for (let uom in scale) {
		let step = scale[uom];
		let inc = num / step;

		if (smallest && utils.isSmallest(uom, smallest)) {
			inc = utils.round(inc, digits);
			if (prev && (inc === (prev / step))) --inc;
			res += inc + uom;
			return res.trim();
		}

		if (inc < 1) continue;
		if (!smallest) {
			inc = utils.round(inc, digits);
			res += inc + uom;
			return res;
		}

		prev = step;

		inc = Math.floor(inc);
		num -= (inc * step);
		res += inc + uom + ' ';
	}
	return res.trim();
};