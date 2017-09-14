	/**********************************************************************
	*  Author: Neha Kapoor (neha@rootcrm.org)
	*  Project Lead: Balinder WALIA (bwalia@rootcrm.org)
	*  Project Lead Web...: https://twitter.com/balinderwalia
	*  Name..: ROOTCRM
	*  Desc..: Root CRM (part of RootCrm Suite of Apps)
	*  Web: http://rootcrm.org
	*  License: http://rootcrm.org/LICENSE.txt
	**/

	/**********************************************************************
	*  create_indexes.js handles the whole app
	**/
	
'use strict';
/**
 * Module dependencies.
 */
var init = require('./config/init');
var initFunctions = require('./config/functions');	

//db connection
var db;
init.MongoClient.connect(init.mongoConnUrl, function (err, database) {
	db=database;
  	if (err) {
    	console.log('Unable to connect to the mongoDB server. Error:', err);
  	} else {
   		console.log('Connection established to', init.mongoConnUrl);
   		
   		// compound index on session's table
   		db.collection('session').createIndex(  { "user_id": 1, "status" : 1, "allow_web_access" : 1 } );
   		
   		// index on users's table
   		db.collection('users').createIndex(  { "access_right": 1, "status" : 1 } );
   		db.collection('users').createIndex(  { "email": 1 } );
   		db.collection('users').createIndex(  { "username" : 1 } );
   		//db.collection('users').createIndex(  { "user_type" : 1 } );
   		db.collection('users').createIndex(  { "username": 1, "allow_web_access" : 1 } );
   		db.collection('users').createIndex(  { "players.user_mongo_id": 1, "status" : 1, "players.roles" : 1 } );
   		
   		// index on session's table
   		/**db.collection('availability').createIndex(  { "user_mongo_id": 1, "start_timestamp" : 1 } );
   		db.collection('availability').createIndex(  { "available": 1 } );
   		db.collection('availability').createIndex(  { "user_mongo_id": 1, "fixture_event_uuid" : 1 } );
   		
   		// compound index on teams's table
   		db.collection('teams').createIndex(  {"players.user_mongo_id": 1, "status": 1} );  		
   		*/
   		// index on notifications's table
   		db.collection('notifications').createIndex(  { "notify_to" : 1 } );
   		
   		// index on fixtures's table
   		db.collection('fixtures').createIndex(  { "uuid_system" : 1 } );
   	  	
   	  	db.collection('bookmarks').createIndex({"tags":"text"});
   	  	
   	  	db.collection('tokens').createIndex({ "$**": "text" },{ name: "TextIndex" });
   	  	db.collection('tokens').createIndex(  { "code": 1, "status" : 1 } );
   	  	
   	  	db.collection('templates').createIndex({ "$**": "text" },{ name: "TextIndex" });
   	  	db.collection('templates').createIndex(  { "code": 1, "uuid_system" : 1, "status" : 1 } );
   	  	
   	  	//documents table
   	  	db.collection('documents').createIndex(  { "Code": 1, "uuid_system" : 1 } );
   	  	db.collection('documents').createIndex({ "$**": "text" },{ name: "TextIndex" });
   	  	
   	  	db.collection('mailing_preferences').createIndex(  { "email_address": 1, "uuid_system" : 1, "uuid" : 1 } );
   	  	db.collection('system_lists').createIndex(  { "code": 1 } );
   	  	
   	  	db.collection('fs.files').createIndex(  { "metadata.uuid": 1 } );
   	  	
		db.collection('uk_towns_cities').ensureIndex({
    		loc : "2dsphere"
		});
		db.collection('uk_towns_cities').createIndex({"tags":"text"});
   	  	console.log('created indexes and now terminating this process');
   	  	
   	  	process.exit();	
  	}
});
