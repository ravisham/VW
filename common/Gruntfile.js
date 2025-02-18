module.exports = (grunt) => {
	require('load-grunt-tasks')(grunt);

	grunt.initConfig({
		jsdoc: {
			common: {
				src: [
					'./controllers/**/*.js',
					'./libs/**/*.js',
					'!./libs/helpers/device/**/*.js',
					'!./libs/logger/**/*.js',
					'./models/**/*.js'
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