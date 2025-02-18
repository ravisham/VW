const nodemailer = require('nodemailer');

// create reusable transporter object using the default SMTP transport
let transporter = nodemailer.createTransport({
    host: 'smtp.office365.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: account.user, // generated ethereal user
        pass: account.pass // generated ethereal password
    }
});

// Set up the default values
const mailOptions = {
    from: '"Vision Wheel Taskrunner" <vision.wheel.taskrunner@mirumagency.com>', // sender address
    to: 'visionwheel-alerts@mirumagency.com', // list of receivers
    subject: 'Vision Wheel Taskrunner', // Subject line
    text: '', // plain text body
    html: '' // html body
};

/**
 * Really simple implementation of nodemailer.
 * Just pass an options object with a text property.
 * It will take care of the rest.
 *
 * If you need to set from, to, subject, text, html, you can override them by setting them in the object too.
 *
 * @returns {undefined}
 * @param {object} options The mailOptions you want to set for nodemailer. Will use the defaults set above otherwise.
 */
sendEmail(options) {
	let opts = {};
	// Copy in the defaults
	for (key in mailOptions) {
		if (mailOptions.hasOwnProperty(key)) {
			opts[key] = mailOptions[key];
		}
	}
	// Override with passed values
	for (key in options) {
		if (options.hasOwnProperty(key)) {
			opts[key] = options[key];
		}
	}

	if ((opts.html === '') && (opts.text !== '')) {
		opts.html = opts.text.replace('\n', '<br />\n');
	}

	// send mail with defined transport object
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
        	console.log("Error in /importer/helpers/nodemailer.js");
            console.log(error);
        }
        console.log('/importer/helpers/nodemailer.js message sent: %s', info.messageId);
   });
}

module.exports = sendEmail;