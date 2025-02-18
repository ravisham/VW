let express = require("express"),
	debug = require("libs/buglog"),
	log = debug("routes", "cart"),
	request = require("superagent"),
	parseString = require('xml2js').parseString,
	router = express.Router();


const apiPath = 'http://www.plussizingguide.com/xml/plusguidexmlip.php';

/// ?selectYear=2009&selectMake=FORD&selectModel=MUSTANG%20GT

router.get("/years", ( req, res ) =>
{
    const MAX_TIME = 20;
    console.log('/site/server/routes/fitmentguide - route /years - requesting', apiPath);
    var timer = setTimeout(function () {
        console.log('/site/server/routes/fitmentguide - route /years - TIMED OUT');
    }, MAX_TIME * 1000);
	request.get(apiPath).end((err, result) => {
        clearTimeout(timer);
		if (err) {
            console.log('/site/server/routes/fitmentguide - route /years - ERROR');
            console.log(err);
            return;
        }
        console.log('/site/server/routes/fitmentguide - route /years - success');

        let parsed;
        parseString(result.text, (error, parseResult) => {
            parsed = parseResult;
        });

		res.json({ result:parsed });
	});

    // Get the IP address the server is running on - useful for helping debug whitelist issues with the client
    var timer2 = setTimeout(function () {
        console.log('/site/server/routes/fitmentguide - Server IP Address - TIMED OUT');
    }, MAX_TIME * 1000);
    request.get('https://api.ipify.org?format=json').end((err, result) => {
        clearTimeout(timer2);
        if (err) {
            console.log('/site/server/routes/fitmentguide - ERROR getting Server IP Address', err);
        } else if (result) {
            console.log('/site/server/routes/fitmentguide - Server IP Address', result.body);
        }
    });
});

router.get("/makes", function( req, res )
{
	let year = req.query["year"];
	request.get( `${apiPath}?selectYear=${year}` ).end(( err, result ) =>
	{
		if( err ) {
            return console.log( err );
        }

        let parsed;
        parseString( result.text, ( error, parseResult ) =>
        {
            parsed = parseResult;
        });

        res.json({ result:parsed });
	});
});

router.get("/models", function( req, res )
{
    let year = req.query["year"];
    let make = req.query["make"];
    request.get( `${apiPath}?selectYear=${year}&selectMake=${make}` ).end(( err, result ) =>
    {
        if( err ) return console.log( err );

        let parsed;
        parseString( result.text, ( error, parseResult ) =>
        {
            parsed = parseResult;
        });

        res.json({ result:parsed });
    });
});

router.get("/wheelData", function( req, res )
{
    let year = req.query["year"];
    let make = req.query["make"];
    let model = req.query["model"];
    request.get( `${apiPath}?selectYear=${year}&selectMake=${make}&selectModel=${model}` ).end(( err, result ) =>
    {
        if( err ) return console.log( err );

        let parsed;
        parseString( result.text, ( error, parseResult ) =>
        {
            parsed = parseResult;
        });

        res.json({ result:parsed });
    });
});

module.exports = {
	Router: router
};