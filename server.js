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
	*  server.js initiate the app
	**/
	
'use strict';
/**
 * Module dependencies.
 */
var init = require('./config/init');

/**
 * Main application entry file.
 * Please note that the order of loading is important.
 */
 
// Init the express application
var app = require('./config/express')(init);

// Start the app by listening on <port>
app.listen(init.port);

//db connection
var db;
init.MongoClient.connect(init.mongoConnUrl, function (err, database) {
	db=database;
  	if (err) {
    	console.log('Unable to connect to the mongoDB server. Error:', err);
  	} else {
   		console.log('Connection established to', init.mongoConnUrl);
   		require('./controller/routes')(init, app,db);
   		require('./controller/cron_process')(init,db);
  	}
});

// Logging initialization
console.log('rootcms application started on port ' + init.port);

app.locals.backendDirectory = init.backendDirectoryPath;

app.locals.dateTimeFromUnix = function(UNIX_timestamp, showTimeBool) {
	if (typeof showTimeBool === "undefined") { 
		showTimeBool = true;
	}
	
	if (!isNaN(UNIX_timestamp)) {
  	var a = new Date(UNIX_timestamp * 1000);
  
  	var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  	var year = a.getFullYear();
  	var month = months[a.getMonth()];
  	var date = a.getDate();
  
  	var time = month + ' ' + date + ' ' + year;
 	if(showTimeBool){
 	 	var hour = a.getHours();
  		var timeStr="am";
  		if(hour>12){
  			timeStr="pm";
  			hour= hour-12;
  		} 
  		var min = a.getMinutes().toString();
  		if(min.length==1)	{
  			min = "0"+min;
  		}
  		time += ', '+ hour + ':' + min + " " + timeStr ;
  	}
  	} else {
  		time= UNIX_timestamp;
  	}
  	return time;
}

app.locals.dynamicSort = function(property) {
    var sortOrder = 1;
    if(property[0] === "-") {
        sortOrder = -1;
        property = property.substr(1);
    }
    return function (a,b) {
        var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
        return result * sortOrder;
    }
}