var _ = require('underscore');
var exitCode = 7;

module.exports = {
	getInitialQuestions: function() {
		var qtns = [this.getEnvOptions(), this.getMigrationOptions()];
		qtns = _.union(qtns, this.getConfirmations());
		return qtns;
	},
	getConfirmations: function() {
		var confirmations = [
			this.getConfirmSQLFiles(),
			this.getSlackConfirmation(),
		{
        	name: 'logConfirmation',
	        type: 'confirm',
	        message: 'Enable Log Output?',
	        default: false,
	        when: nonExitSelected
        }, {
        	name: 'logDirectory',
	        type: 'input',
	        message: 'Enter Log Dir',
	        default: 'logs',
	        when: function (answers) {
	            return answers.logConfirmation === true;
	        },
	        validate: function(value) {
				var pass = value.match(/^(\d{1,2}|\d{8})$/i);
				if (pass)
					return true;
	        	return 'Please enter a valid Migration Count OR Date Format (YYYYMMDD)';
	        }
        }, {
        	name: 'createMigrationName',
	        type: 'input',
	        message: 'Enter Migration Name',
	        default: "Create-Migration",
	        when: function (answers) {
	            return answers.migrationOptions === "create";
	        }
        }, {
        	name: 'migrationCount',
	        type: 'input',
	        message: 'Enter Migration Count',
	        filter: Number,
	        when: function (answers) {
	            if (answers.migrationOptions === "up" || answers.migrationOptions === "down")
	            	return true;
	            return false;
	        },
	        validate: function(value) {
	        	if (!value)
	        		return true;
				var pass = value.match(/^(\d{1,2}|\d{8})$/i);
				if (pass)
					return true;
	        	return 'Please enter a valid Migration Count OR Date Format (YYYYMMDD)';
	        }
        }];
        return confirmations;
	},
    getEnvOptions: function() {
        return {
	        name: 'envOptions',
	        type: 'list',
	        message: 'Choose an Environment',
	        choices: [{
	            name: "Test",
	            value: "test"
	        }, {
	            name: "Development",
	            value: "development"
	        }, {
	            name: "Production",
	            value: "production"
	        }, {
	            name: "Exit",
	            value: "exit"
	        }],
	        default: "test"
	    };
    },
    getMigrationOptions: function() {
    	return {
	        name: 'migrationOptions',
	        type: 'list',
	        message: 'Migration Purpose',
	        choices: ["Create", "Up", "Down", "Reset", "Exit"],
			filter: function(val) {
				return val.toLowerCase();
			},
			when: function (answers) {
	            return answers.envOptions !== "exit";
	        }
	    };
    },
    getConfirmSQLFiles: function() {
    	return {
	        name: 'sqlFilesConfirmation',
	        type: 'confirm',
	        message: 'Include SQL (.sql) Files?',
	        default: true,
	        when: nonExitSelected
	    };
    },
    getSlackConfirmation: function() {
    	return {
	        name: 'notifySlack',
	        type: 'confirm',
	        message: 'Want Results to be sent to Slack?',
	        default: false,
	        when: nonExitSelected
	    };
    }
};

function nonExitSelected(answers) {
	return (answers.envOptions !== "exit" && answers.migrationOptions !== "exit");
}