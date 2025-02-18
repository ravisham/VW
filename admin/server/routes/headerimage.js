const express = require('express');
const router = express.Router();
const AWS = require('aws-sdk');
const config = require('config');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const program = require('commander');

// Read the config variables out of common
const configEnv = config.settings('config/env');
const settings = config.mergeSettingsDefault(configEnv, program);
settings.environment = express().get('env');
const awsConfig = settings.aws.s3.config;

// Tell AWS about the config settings
AWS.config.update({
	accessKeyId: awsConfig.accessKeyId,
	secretAccessKey: awsConfig.secretAccessKey,
	region: "us-east-1",
	ACL: 'public-read'
});

const upload = multer({ dest: 'uploads/' });

router.post("/", upload.single('headerimg'), function (req, res) {
	const finalPath = "uploads/headerimage.jpg";

	// Delete anything that's not a .jpg
	if (path.extname(req.file.originalname).toLowerCase() !== ".jpg") {
		fs.unlinkSync(req.file.path);
		res.render("headerimage", {message: "Only .jpg images may be uploaded."});
		return;
	}

	// Delete anything over 500k (512,000 bytes)
	if (req.file.size > 512000) {
		fs.unlinkSync(req.file.path);
		res.render("headerimage", {message: "Maximum file size of 500k. Anything large will slow your site."});	
		return;
	}

	// Delete anything that is not mime image/jpeg
	if (req.file.mimetype !== "image/jpeg") {
		fs.unlinkSync(req.file.path);
		res.render("headerimage", {message: "Files must be image/jpeg."});	
		return;
	}
	
	// Rename the file so we only ever keep on file, with a known path, on the system
	fs.renameSync(req.file.path, finalPath);

	const s3 = new AWS.S3();

	// Load the file from disk
	fs.readFile(finalPath, function (err, data) {
		if (err) {
			res.render("headerimage", {message: err});
			return;
		}
		// Write it to the S3 bucket
		s3.putObject({
			Bucket: awsConfig.bucket,
			Key: 	'headerimage.jpg',
		    Body: 	data,
		    ACL: 	'public-read'
		}, function (response) {
			res.render("headerimage", {message: "File successfully uploaded."});
		});
	});
});

router.get("/", function (req, res) {
	res.render("headerimage", {});
});


module.exports = {
	Router: router
};