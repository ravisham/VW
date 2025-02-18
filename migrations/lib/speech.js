var greetings = ["Hello ", "Whatz Up ", "Hey ", "What do you want "];

module.exports = {
    greeting: function(parameters) {
        var firstName = parameters.firstName || null;

        // Get a random index into the arrays
        i = Math.floor(Math.random() * greetings.length);

        var statement = greetings[i];
        if (firstName)
            statement += firstName;

        return statement;
    }
};