/**
 * @file Rewriting many of the functions in the underscore.js library.
 * One particular skill related to this project is functional programming,
 * which is a declarative programming paradigm where the output of any
 * function depends only upon the arguments that are passed into the function.
 *
 * @author Joaquin Briceno <joaquin.briceno@mirumagency.com>
 */

function _each(collection, iterator) {
	if (collection.constructor === Array) {
		for (var i = 0; i < collection.length; i++) {
			var index = i;
			iterator(collection[i], index, collection);
		}
	}
	if (collection.constructor === Object) {
		for (var key in collection) {
			iterator(collection[key], key, collection);
		}
	}
}

module.exports.each = _each;

module.exports.extend = function(obj) {
	_each(arguments, function(argObject) {
		_each(argObject, function(value, key) {
			obj[key] = value;
		});
	});
	return obj;
};