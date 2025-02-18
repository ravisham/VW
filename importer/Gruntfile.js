module.exports = (grunt) => {
	require('load-grunt-tasks')(grunt);

	grunt.initConfig({
		jsdoc: {
			common: {
				src: [
					'./server.js',
					'./controller.js',
					'./model.js',
					'./databases/**/*.js'
				],
				options: {
					destination: 'jsdocs',
					template : 'node_modules/ink-docstrap/template',
					configure: 'jsdoc.conf.json'
				}
			}
		},

		watch: {
			files: ['./**/*.js'],
			tasks: ['jsdoc']
		}
	});

	grunt.registerTask('default', ['jsdoc']);
}