// Helper for collection methods to determine whether a collection
// should be iterated as an array or as an object
// Related: http://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength
// Avoids a very nasty iOS 8 JIT bug on ARM-64. #2094
const MAX_ARRAY_INDEX = Math.pow(2, 53) - 1;
const nativeIsArray = Array.isArray;
const toString = Object.prototype.toString;
let isTypeMethods = {};

// Internal function that returns an efficient (for current engines) version
// of the passed-in callback, to be repeatedly applied in other Underscore
// functions.
const optimizeCb = (func, context, argCount) => {
	if (context === void 0) return func;
	switch (argCount == null ? 3 : argCount) {
		case 1:
			return (value) => func.call(context, value);
		case 2:
			return (value, other) => func.call(context, value, other);
		case 3:
			return (value, index, collection) => func.call(context, value, index, collection);
		case 4:
			return (accumulator, value, index, collection) => func.call(context, accumulator, value, index, collection);
	}
	return () => func.apply(context, arguments);
};
const property = key => {
	return (obj) => {
		return obj == null ? void 0 : obj[key];
	};
};
let getLength = property('length');
let isArrayLike = (collection) => {
	let length = getLength(collection);
	return typeof length == 'number' && length >= 0 && length <= MAX_ARRAY_INDEX;
};
// Collection Functions
// --------------------

// The cornerstone, an `each` implementation, aka `forEach`.
// Handles raw objects in addition to array-likes. Treats all
// sparse array-likes as if they were dense.
let forEach = (obj, iteratee, context) => {
	iteratee = optimizeCb(iteratee, context);
	let i, length;
	if (isArrayLike(obj)) {
		for (i = 0, length = obj.length; i < length; i++)
			iteratee(obj[i], i, obj);
	} else {
		let keys = _.keys(obj);
		for (i = 0, length = keys.length; i < length; i++)
			iteratee(obj[keys[i]], keys[i], obj);
	}
	return obj;
};
// Is a given value an array?
// Delegates to ECMA5's native Array.isArray
let isArray = nativeIsArray;
if (!isArray) isArray = obj => toString.call(obj) === '[object Array]';
// Add some isType methods: isArguments, isFunction, isString, isDate, isRegExp, isError.
forEach(['Arguments', 'Function', 'String', 'Date', 'RegExp', 'Error'], (name) => {
	let methodName = 'is' + name;
	isTypeMethods[methodName] = obj => toString.call(obj) === '[object ' + name + ']';
	Reflect.set(exports, isTypeMethods[methodName]);
});
// Define a fallback version of the method in browsers (ahem, IE < 9), where
// there isn't any inspectable "Arguments" type.
if (!isTypeMethods.isArguments(arguments)) {
	isTypeMethods.isArguments = obj => Reflect.has(obj, 'callee');
	Reflect.set(exports, isTypeMethods.isArguments);
}
let isNumber = value => typeof value === 'number' && !Number.isNaN(value);
// Is a given array, string, or object empty?
// An "empty" object has no enumerable own-properties.
let isEmpty = obj => {
	if (obj == null) return true;
	if (isArrayLike(obj) && (isArray(obj) || isTypeMethods.isString(obj) || isTypeMethods.isArguments(obj))) return obj.length === 0;
	return Reflect.ownKeys(obj).length === 0;
};
let isObject = obj => typeof obj === 'function' || typeof obj === 'object' && !!obj;
let isFunction = obj => typeof obj == 'function' || false;
// Internal recursive comparison function for `isEqual`.
let eq = (a, b, aStack, bStack) => {
	// Identical objects are equal. `0 === -0`, but they aren't identical.
	// See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
	if (a === b) return a !== 0 || 1 / a === 1 / b;
	// A strict comparison is necessary because `null == undefined`.
	if (a == null || b == null) return a === b;
	// Compare `[[Class]]` names.
	let className = toString.call(a);
	if (className !== toString.call(b)) return false;
	switch (className) {
		// Strings, numbers, regular expressions, dates, and booleans are compared by value.
		case '[object RegExp]':
			// RegExps are coerced to strings for comparison (Note: '' + /a/i === '/a/i')
		case '[object String]':
			// Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
			// equivalent to `new String("5")`.
			return '' + a === '' + b;
		case '[object Number]':
			// `NaN`s are equivalent, but non-reflexive.
			// Object(NaN) is equivalent to NaN
			if (+a !== +a) return +b !== +b;
			// An `egal` comparison is performed for other numeric values.
			return +a === 0 ? 1 / +a === 1 / b : +a === +b;
		case '[object Date]':
		case '[object Boolean]':
			// Coerce dates and booleans to numeric primitive values. Dates are compared by their
			// millisecond representations. Note that invalid dates with millisecond representations
			// of `NaN` are not equivalent.
			return +a === +b;
	}

	let areArrays = className === '[object Array]';
	if (!areArrays) {
		if (typeof a != 'object' || typeof b != 'object') return false;

		// Objects with different constructors are not equivalent, but `Object`s or `Array`s
		// from different frames are.
		let aCtor = a.constructor,
			bCtor = b.constructor;
		if (aCtor !== bCtor && !(isFunction(aCtor) && aCtor instanceof aCtor &&
				isFunction(bCtor) && bCtor instanceof bCtor) &&
			('constructor' in a && 'constructor' in b)) {
			return false;
		}
	}
	// Assume equality for cyclic structures. The algorithm for detecting cyclic
	// structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.

	// Initializing stack of traversed objects.
	// It's done here since we only need them for objects and arrays comparison.
	aStack = aStack || [];
	bStack = bStack || [];
	let length = aStack.length;
	while (length--) {
		// Linear search. Performance is inversely proportional to the number of
		// unique nested structures.
		if (aStack[length] === a) return bStack[length] === b;
	}

	// Add the first object to the stack of traversed objects.
	aStack.push(a);
	bStack.push(b);

	// Recursively compare objects and arrays.
	if (areArrays) {
		// Compare array lengths to determine if a deep comparison is necessary.
		length = a.length;
		if (length !== b.length) return false;
		// Deep compare the contents, ignoring non-numeric properties.
		while (length--) {
			if (!eq(a[length], b[length], aStack, bStack)) return false;
		}
	} else {
		// Deep compare objects.
		let keys = Reflect.ownKeys(a);
		let key = null;
		length = keys.length;
		// Ensure that both objects contain the same number of properties before comparing deep equality.
		if (Reflect.ownKeys(b).length !== length) return false;
		while (length--) {
			// Deep compare each member
			key = keys[length];
			if (!(Reflect.has(b, key) && eq(a[key], b[key], aStack, bStack))) return false;
		}
	}
	// Remove the first object from the stack of traversed objects.
	aStack.pop();
	bStack.pop();
	return true;
};

let validateEmail = email => {
	if (email.length == 0)
		return false;
	var re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
	return re.test(email);
};

exports.isEmpty = isEmpty;
exports.isNumber = isNumber;
exports.forEach = forEach;
exports.isObject = isObject;
exports.validateEmail = validateEmail;
exports.isEqual = (a, b) => eq(a, b);