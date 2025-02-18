/**
 * This Route Module is here ONLY for debugging purposes.
 * This router helpus us trigger POST/GET requests to test the VWModel response.
 */
const express = require('express');
const debug = require('debug')('taskrunner:routes:status');
const Tasks = require('./../libs/tasks');
const Router = express.Router();
const fs = require('fs');
const touch = require('touch');

function handleStatusRoute(req, res) {
    let itemUpdateStats = {};
    let itemLastUpdate = 0;
    let itemLastUpdateDurationInHours = 'unable to calculate';
    try {
        itemUpdateStats = fs.statSync('/item-update.txt');
        console.log('Stats', JSON.stringify(itemUpdateStats, null, 4));
        itemLastUpdate = new Date(itemUpdateStats.mtime);
        console.log('itemLastUpdate', itemLastUpdate);
        itemLastUpdateDurationInHours = Math.round((new Date().getTime() - itemLastUpdate.getTime()) / 360000) / 10;
    } catch (e) {
        console.log('Error in /taskrunner/routes/status.js');
        console.log(e);
        console.log('itemUpdateStats', itemUpdateStats);
        console.log('itemLastUpdate', itemLastUpdate);
        console.log('itemLastUpdateDurationInHours', itemLastUpdateDurationInHours);
        // Usually caused by item-update.txt not existing so create it
        touch('/item-update.txt');
    }

	let object = {
        ip:req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        useragent:req.headers['user-agent'],
        currentEnv: process.env.NODE_ENV || 'development',
        signedIn: Boolean(req.user),
        build: process.env.JENKINS_BUILD || 'none',
        itemUpdate: itemLastUpdateDurationInHours + ' hours ago'
    }

    debug('Status Check', object);
    res.status(200).json(object);
}

Router.route('/status')
	.get(handleStatusRoute)
	.post(handleStatusRoute);

module.exports = { Router }