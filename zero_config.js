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
	*  server.js handles the whole app
	**/
	
'use strict';
/**
 * Module dependencies.
 */
var init = require('./config/init');
var initFunctions = require('./config/functions');	
var passwordHash = require('password-hash');
/**
 * Main application entry file.
 * Please note that the order of loading is important.
 */

//db connection
var db;
init.MongoClient.connect(init.mongoConnUrl, function (err, database) {
	db=database;
  	if (err) {
    	console.log('Unable to connect to the mongoDB server. Error:', err);
  	} else {
   		console.log('Connection established to', init.mongoConnUrl);

	//defined functions
	//create module
	var createModule =function (codeStr, insertDataObj, cb) {
		initFunctions.crudOpertions(db, 'modules', 'findOne', null, 'code', codeStr, null, function(result) {
			if(result.aaData){
				console.log("Modules "+codeStr+" already exists!");
			}else{
				db.collection("modules").save(insertDataObj, (err, result) => {
      				if (err) console.log(err);
      				if(result){
      					console.log("Created "+codeStr+" module successfully ");
    				}
  				});				
			}
		});
	}  	  		
	//create admin group
	var createAdminGroup =function (createdMongoID, cb) {
		createdMongoID= createdMongoID.toString();
		initFunctions.crudOpertions(db, 'groups', 'findOne', null, 'code', 'admin', null, function(result) {
   			if(result.aaData){
   				var groupDetails=result.aaData;
   				var usersArr=groupDetails.users_list;
   				var alreadyExistsBool=false;
   			
   				for(var key in usersArr) {
   					if(usersArr[key]==createdMongoID){
						alreadyExistsBool=true;
						break;
   					}
				}
				if(alreadyExistsBool){
					console.log("User already exists in admin group");
				} else{
					db.collection("groups").update({_id:groupDetails._id}, { $push: { "users_list": createdMongoID } }, (err, result) => {
   						console.log("Created admin user successfully!");
   					});
				}
   			
   			}	else	{
				db.collection("groups").save({"name" : "Admin", "code" : "admin", "status" : 1, "users_list" : new Array(createdMongoID), "assigned_modules" : moduleIDArr, "modified" : initFunctions.currentTimestamp(), "created" : initFunctions.currentTimestamp()}, (err, result) => {
      				if(result){
    					console.log("Created admin user successfully!"+ result["ops"][0]["_id"]);
    				}
  				});
    		}
  		});
	}  		
 		
   		var moduleIDArr=new Array(initFunctions.guid(), initFunctions.guid());
   		
   		//add basic modules first & assign to admin user
   		console.log("Basic modules: ");
  				var addModuleObj= [{ "name" : "Modules", "code" : "modules",  "icon_class" : "fa fa-file-text",  "icon_path" : "", "table" : "modules",  "displayOnDashboard" : "1", "sort_order" : "1", "active" : "1", "module_items" : [ { "uuid" : moduleIDArr[0], "label" : "List", "link" : "/list/modules", "item_sort_order" : "0", "status" : "Active", "target" : "1" }, { "uuid" : moduleIDArr[2], "label" : "Add new", "link" : "/module", "item_sort_order" : "1", "status" : "Active", "target" : "1" }]},
				{ "name" : "Web pages", "code" : "web-pages",  "icon_class" : "fa fa-file-o",  "icon_path" : "", "table" : "documents",  "displayOnDashboard" : "1", "sort_order" : "2", "active" : "1", "module_items" : [ { "uuid" : moduleIDArr[0], "label" : "List", "link" : "/list/documents", "item_sort_order" : "0", "status" : "Active", "target" : "1" }, { "uuid" : moduleIDArr[2], "label" : "Add new", "link" : "/document", "item_sort_order" : "1", "status" : "Active", "target" : "1" }]},
				{ "name" : "Categories", "code" : "categories",  "icon_class" : "fa fa-list-alt",  "icon_path" : "", "table" : "categories",  "displayOnDashboard" : "1", "sort_order" : "3", "active" : "1", "module_items" : [ { "uuid" : moduleIDArr[0], "label" : "List", "link" : "/list/categories", "item_sort_order" : "0", "status" : "Active", "target" : "1" }, { "uuid" : moduleIDArr[2], "label" : "Add new", "link" : "/category", "item_sort_order" : "1", "status" : "Active", "target" : "1" }]},
				{ "name" : "Bookmarks", "code" : "bookmarks",  "icon_class" : "fa fa-list",  "icon_path" : "", "table" : "bookmarks",  "displayOnDashboard" : "1", "sort_order" : "5", "active" : "1", "module_items" : [ { "uuid" : moduleIDArr[0], "label" : "List", "link" : "/list/bookmarks", "item_sort_order" : "0", "status" : "Active", "target" : "1" }, { "uuid" : moduleIDArr[2], "label" : "Add new", "link" : "/bookmark", "item_sort_order" : "1", "status" : "Active", "target" : "1" }]}
				];

				for(var i=0; i < addModuleObj.length; i++){
					var tempModuleObj = addModuleObj[i];
					createModule(tempModuleObj['code'], tempModuleObj, function(g_response) {
      					console.log(g_response);
      				});
				}
				
   		//create admin user
   		initFunctions.crudOpertions(db, 'users', 'findOne', null, 'username', 'admin', null, function(result) {
   			if(result.aaData){
   				console.log("Amin user already exists!");
   				var userDetails=result.aaData;
   				var generatedUSerID=userDetails._id;
   				createAdminGroup(generatedUSerID, moduleIDArr, function(g_response) {
      				console.log(g_response);
      			});
   			}	else	{
				var hashPasswordStr=passwordHash.generate('admin');
   				db.collection("users").save({"username" : "admin", "firstname" : "Webmaster", "lastname" : "", "gender" : "m", "email" : "nehak189@gmail.com", "password" : hashPasswordStr,  "access_right" : "11", "status" : "1", "created" : initFunctions.currentTimestamp()}, (err, result) => {
      				if (err) console.log(err);
      				if(result){
      					console.log("Created admin user successfully with _id : "+result["ops"][0]["_id"]);
      					var generatedUSerID=result["ops"][0]["_id"];
      					createAdminGroup(generatedUSerID, moduleIDArr, function(g_response) {
      						console.log(g_response);
      					});
    				}
  				});
  			}
  		});  		
  	}
});
