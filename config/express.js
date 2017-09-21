	/**********************************************************************
	*  Author: Neha Kapoor (erkapoor.neha@gmail.com)
	*  Project Lead: Balinder WALIA (balinder.walia@gmail.com)
	*  Project Lead Web...: https://twitter.com/balinderwalia
	*  Name..: WEBCRM
	*  Desc..: WEB CRM (part of WebCrm Suite of Apps)
	*  Web: http://webcrm.io
	*  License: http://webcrm.io/LICENSE.txt
	**/

	/**********************************************************************
	*  express.js
	**/
	
	'use strict';

/**
 * Module dependencies.
 */
var express = require('express'),
	bodyParser = require('body-parser'),
	passwordHash = require('password-hash'),
	cookieParser = require('cookie-parser'),
	path = require('path');

module.exports = function(init) {
	// Initialize express app
	var app = express();

	app.use(cookieParser());
		
	// Set view engine
	app.set('view engine', 'ejs')
		
	// Request body parsing middleware should be above methodOverride
	app.use(bodyParser.urlencoded({extended: true}))
	
	//we need this for pm2
	app.set('views',__dirname + '/../views')
	
	// CookieParser should be above session
	app.use(cookieParser());
	
	/// Setting the app router and static folder
	
	app.use('/'+init.backendDirectoryName, express.static(path.resolve('./views'+init.backendDirectoryPath)));
	app.use(init.backendDirectoryPath+'/list', express.static(path.resolve('./views'+init.backendDirectoryPath)));
	
	/** Seting up server to accept cross-origin browser requests */
    app.use(function(req, res, next) { //allow cross origin requests
        res.setHeader("Access-Control-Allow-Methods", "POST, PUT, OPTIONS, DELETE, GET");
        res.header("Access-Control-Allow-Origin", "http://localhost:3000");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        res.header("Access-Control-Allow-Credentials", true);
        next();
    });
    
	// Return Express server instance
	return app;
};