/**
 * @namespace
 * @property {Object}  colors               - The default color values for the logs.
 * @property {String}  colors.error       	- The default color values for the error logs.
 * @property {String}  colors.warn         	- The default color values for the warn logs.
 * @property {String}  colors.info      	- The default color values for the info logs.
 * @property {String}  colors.verbose 		- The default color values for the verbose logs.
 * @property {String}  colors.debug 		- The default color values for the debug logs.
 */
var override = {
	colors: {
		error: 'red',
		warn: 'yellow',
		info: 'green',
		verbose: 'blue',
		debug: 'white'
	},
	enableColors: true,
	filename: "logger",
	levels: {
		error: 0,
		warn: 1,
		info: 2,
		verbose: 3,
		debug: 4
	}
};

module.exports = override;