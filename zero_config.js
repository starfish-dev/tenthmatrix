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
	var createTableEntries =function (tableStr, codeStr, insertDataObj, cb) {
		initFunctions.crudOpertions(db, tableStr, 'findOne', null, 'code', codeStr, null, function(result) {
			if(result.aaData){
				console.log("'"+tableStr+"' code '"+codeStr+"' already exists!");
			}else{
				db.collection(tableStr).save(insertDataObj, (err, result) => {
      				if (err) console.log(err);
      				if(result){
      					console.log("Created '"+codeStr+"' for table '"+tableStr+"' successfully ");
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
  				var addModuleObj= [{ "name" : "Modules", "code" : "modules",  "icon_class" : "fa fa-file-text",  "icon_path" : "", "table" : "modules",  "displayOnDashboard" : "0", "sort_order" : "1", "active" : "1", "module_items" : [ { "uuid" : moduleIDArr[0], "label" : "List", "link" : "/list/modules", "item_sort_order" : "0", "status" : "Active", "target" : "1" }, { "uuid" : moduleIDArr[1], "label" : "Add new", "link" : "/module", "item_sort_order" : "1", "status" : "Active", "target" : "1" }]},
				{ "name" : "Web pages", "code" : "web-pages",  "icon_class" : "fa fa-file-o",  "icon_path" : "", "table" : "documents",  "displayOnDashboard" : "1", "sort_order" : "2", "active" : "1", "module_items" : [ { "uuid" : moduleIDArr[0], "label" : "List", "link" : "/list/documents", "item_sort_order" : "0", "status" : "Active", "target" : "1" }, { "uuid" : moduleIDArr[1], "label" : "Add new", "link" : "/document", "item_sort_order" : "1", "status" : "Active", "target" : "1" }]},
				{ "name" : "Categories", "code" : "categories",  "icon_class" : "fa fa-list-alt",  "icon_path" : "", "table" : "categories",  "displayOnDashboard" : "1", "sort_order" : "3", "active" : "1", "module_items" : [ { "uuid" : moduleIDArr[0], "label" : "List", "link" : "/list/categories", "item_sort_order" : "0", "status" : "Active", "target" : "1" }, { "uuid" : moduleIDArr[1], "label" : "Add new", "link" : "/category", "item_sort_order" : "1", "status" : "Active", "target" : "1" }]},
				{ "name" : "Bookmarks", "code" : "bookmarks",  "icon_class" : "fa fa-list",  "icon_path" : "", "table" : "bookmarks",  "displayOnDashboard" : "1", "sort_order" : "5", "active" : "1", "module_items" : [ { "uuid" : moduleIDArr[0], "label" : "List", "link" : "/list/bookmarks", "item_sort_order" : "0", "status" : "Active", "target" : "1" }, { "uuid" : moduleIDArr[1], "label" : "Add new", "link" : "/bookmark", "item_sort_order" : "1", "status" : "Active", "target" : "1" }]},
				{ "name" : "Users", "code" : "users",  "icon_class" : "fa fa-user",  "icon_path" : "", "table" : "users",  "displayOnDashboard" : "1", "sort_order" : "7", "active" : "1", "module_items" : [ { "uuid" : moduleIDArr[0], "label" : "List", "link" : "/list/users", "item_sort_order" : "0", "status" : "Active", "target" : "1" }, { "uuid" : moduleIDArr[1], "label" : "Add new", "link" : "/user", "item_sort_order" : "1", "status" : "Active", "target" : "1" }]},
				{ "name" : "Groups", "code" : "groups",  "icon_class" : "fa fa-group",  "icon_path" : "", "table" : "groups",  "displayOnDashboard" : "0", "sort_order" : "6", "active" : "1", "module_items" : [ { "uuid" : moduleIDArr[0], "label" : "List", "link" : "/list/groups", "item_sort_order" : "0", "status" : "Active", "target" : "1" }, { "uuid" : moduleIDArr[1], "label" : "Add new", "link" : "/group", "item_sort_order" : "1", "status" : "Active", "target" : "1" }]},
				{ "name" : "Admin Templates", "code" : "admin-templates",  "icon_class" : "fa fa-slack",  "icon_path" : "", "table" : "system_templates",  "displayOnDashboard" : "0", "sort_order" : "9", "active" : "1", "module_items" : [ { "uuid" : moduleIDArr[0], "label" : "List", "link" : "/list/system_templates", "item_sort_order" : "0", "status" : "Active", "target" : "1" }, { "uuid" : moduleIDArr[1], "label" : "Add new", "link" : "/system_template", "item_sort_order" : "1", "status" : "Active", "target" : "1" }]},
				{ "name" : "Website Templates", "code" : "website-templates",  "icon_class" : "fa fa-list",  "icon_path" : "", "table" : "templates",  "displayOnDashboard" : "0", "sort_order" : "8", "active" : "1", "module_items" : [ { "uuid" : moduleIDArr[0], "label" : "List", "link" : "/list/templates", "item_sort_order" : "0", "status" : "Active", "target" : "1" }, { "uuid" : moduleIDArr[1], "label" : "Add new", "link" : "/template", "item_sort_order" : "1", "status" : "Active", "target" : "1" }]},
				{ "name" : "Businesses", "code" : "groups",  "icon_class" : "fa fa-bank",  "icon_path" : "", "table" : "systems",  "displayOnDashboard" : "0", "sort_order" : "4", "active" : "1", "module_items" : [ { "uuid" : moduleIDArr[0], "label" : "List", "link" : "/list/systems", "item_sort_order" : "0", "status" : "Active", "target" : "1" }, { "uuid" : moduleIDArr[1], "label" : "Add new", "link" : "/system", "item_sort_order" : "1", "status" : "Active", "target" : "1" }]},
				{ "name" : "Default Lists", "code" : "default-list",  "icon_class" : "fa fa-tasks",  "icon_path" : "", "table" : "system_lists",  "displayOnDashboard" : "0", "sort_order" : "0", "active" : "1", "module_items" : [ { "uuid" : moduleIDArr[0], "label" : "List", "link" : "/list/system_lists", "item_sort_order" : "0", "status" : "Active", "target" : "1" }, { "uuid" : moduleIDArr[1], "label" : "Add new", "link" : "/system_list", "item_sort_order" : "1", "status" : "Active", "target" : "1" }]},
				{ "name" : "Launchpad", "code" : "launchpad",  "icon_class" : "fa fa-certificate",  "icon_path" : "", "table" : "systems",  "displayOnDashboard" : "0", "sort_order" : "10", "active" : "1", "module_items" : [ { "uuid" : moduleIDArr[0], "label" : "Show Launchpad", "link" : "/launchpad", "item_sort_order" : "1", "status" : "Active", "target" : "1" }]}
				];

				for(var i=0; i < addModuleObj.length; i++){
					var tempModuleObj = addModuleObj[i];
					createTableEntries('modules', tempModuleObj['code'], tempModuleObj, function(g_response) {
      					console.log(g_response);
      				});
				}
				var addDefaultListsObj= [{ "name" : "Icons list", "code" : "icons-list", "status" : "1", "list" : [ { "uuid" : "92d572e4-c2b3-ad9d-2973-8c780566458d", "label" : "fa fa-list", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "8c5570ab-e7b5-ebc6-80eb-638c808f9c68", "label" : "fa fa-slack", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "76f96d4d-b532-dd69-78e8-e81e78cb87f2", "label" : "fa fa-file-text", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "49f36954-202e-4ff8-11c6-61168368a6df", "label" : "fa fa-reorder", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "e4e55ca6-8d0e-539f-f58f-e84c18439dc5", "label" : "fa fa-address-book", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "95512fd0-aa3d-7bae-75b4-abf892d231df", "label" : "fa fa-handshake-o", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "710636a1-c8e0-33d3-1818-68784fabb586", "label" : "fa fa-telegram", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "ecb0f2d7-70ca-4dda-dc0a-af1c348903f0", "label" : "fa fa-times-rectangle", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "378d798b-b4b0-d433-9c00-0add3538af6f", "label" : "fa fa-user-circle-o", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "dc431097-b03a-d737-f811-ba6bb98825de", "label" : "fa fa-user-o", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "56015f5c-83b7-7c80-9fce-0138cbee3b19", "label" : "fa fa-area-chart", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "fcc4e8cc-c9bf-afbd-9f62-b5c97a4254bf", "label" : "fa fa-bank", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "33d0a7ec-f6e6-315f-9a7b-fe52831b0aab", "label" : "fa fa-bar-chart-o", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "51091aa8-d5a3-8439-f4e5-cbe27a8c166f", "label" : "fa fa-battery", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "055f4054-8d57-e9f5-c19e-a550d32e7906", "label" : "fa fa-bell", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "1e4335ed-d9bb-a52a-c5f7-7e644102ba6e", "label" : "fa fa-calculator", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "0600e167-a84c-9e00-e74b-835e71035d0b", "label" : "fa fa-calendar", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "0cd9422c-f47a-4f3a-5845-da4e5396ef2c", "label" : "fa fa-certificate", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "eaa7cdd0-d900-7ef9-58df-267f9aaff076", "label" : "fa fa-check-circle", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "f97679ca-6ecc-6e7c-c979-de8f790af822", "label" : "fa fa-check", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "61b667a4-2f5b-734d-30cf-0a62550a2af9", "label" : "fa fa-clone", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "e3791951-2e45-4664-761d-6cad3552e81b", "label" : "fa fa-comment", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "8de4f665-aba3-a82e-76c0-8a900d184312", "label" : "fa fa-cubes", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "de74491f-abe6-6130-1df2-006cb4ef43f6", "label" : "fa fa-database", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "f52aa380-dffa-0783-5c99-e77377b2765a", "label" : "fa fa-desktop", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "ff26cdbe-bed5-1c96-4e64-751fae05bca7", "label" : "fa fa-diamond", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "6f73fb4d-495f-0d2f-bf22-707e12cea544", "label" : "fa fa-download", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "d18a6ae4-a326-631b-5e74-82c705ba04fa", "label" : "fa fa-edit", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "63ecbc50-4f5a-9236-ac3e-92770b224ba3", "label" : "fa fa-envelope", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "11a3b385-f1da-023d-0544-648c8bc7b549", "label" : "fa fa-exchange", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "1206a1e6-80f2-6b18-e135-b285ef21a0c7", "label" : "fa fa-file-pdf-o", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "81e5556e-4198-f417-3aad-d96a9269dad5", "label" : "fa fa-filter", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "39ef3de8-6f59-2fe2-3d4f-e650655ab6d1", "label" : "fa fa-folder-open", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "222c661d-0230-8aed-b88f-4766b5c35fa1", "label" : "fa fa-gears", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "4816795b-4f89-6145-b8bb-ab1377d7821c", "label" : "fa fa-globe", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "a41ec340-a4ce-a44b-590a-5f2d8230cc7b", "label" : "fa fa-heart", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "8dddb77a-21e4-62f3-5f09-6eec0e86d8a4", "label" : "fa fa-home", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "7a141262-6755-70e1-1b58-c2cd3746bf09", "label" : "fa fa-image", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "fdfaab78-cd47-695d-9edd-5961d8a30963", "label" : "fa fa-info-circle", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "af0c34c6-19f5-fc44-3b44-1e309261ac29", "label" : "fa fa-line-chart", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "a6e04839-b70b-3d74-d3cf-7edfed23cca2", "label" : "fa fa-location-arrow", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "0ec2d925-dbaf-5898-162f-92fde980a1b8", "label" : "fa fa-mail-forward", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "a663f699-f2a3-35ba-695c-bb8f0619ee5c", "label" : "fa fa-mail-reply", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "1f85bb70-15b0-81ea-dec5-9be00000e2e6", "label" : "fa fa-minus-circle", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "7e9d347a-9a3e-b776-1324-6e6d6ebcc841", "label" : "fa fa-pencil-square", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "dbc6c904-a4df-8217-e9e1-f7770f122f6a", "label" : "fa fa-phone-square", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "7b171cae-1341-7074-9092-7019aaedc84d", "label" : "fa fa-pie-chart", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "d4f794b7-7707-1fe7-35d3-7686a15a4a3c", "label" : "fa fa-print", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "8cf4b1bf-eb3c-0618-da87-06a78d736e31", "label" : "fa fa-question", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "5f82a7bf-e399-e3a5-5a0f-b1f255576c5a", "label" : "fa fa-retweet", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "2538ccff-fb72-0c80-cdb4-ceaa3d8f7cb7", "label" : "fa fa-signal", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "bf01c8cc-45e2-14a3-0788-921d89121d5a", "label" : "fa fa-star-o", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "e32fb2cf-6f91-99b1-c279-44d75d71741c", "label" : "fa fa-support", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "1d1941c9-1568-b30e-c684-6b2f378a44f2", "label" : "fa fa-tasks", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "f6f0ff61-389d-1bf1-9024-a43533a9a0f9", "label" : "fa fa-thumbs-down", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "75801b2d-49e5-416e-8116-7248552bce3d", "label" : "fa fa-thumbs-up", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "1eab9e3f-4fbc-a008-660c-d5d1d2946afe", "label" : "fa fa-trophy", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "dc2a98bc-a44d-c8df-8c9b-c85b54e06585", "label" : "fa fa-trash", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "654bf019-421d-91a9-53f0-b85c1a311f7b", "label" : "fa fa-user-plus", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "035fd713-1f94-5fbd-373a-d3e412b7f5d1", "label" : "fa fa-users", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "a7ec2afb-4962-0386-1e09-76927752c8c8", "label" : "fa fa-file", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "f6cacfa9-e38d-e3f9-795d-4a3803a6a97b", "label" : "fa fa-file-pdf-o", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "4a898093-bc4d-c1af-cd0f-789be3f63776", "label" : "fa fa-refresh", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "15c06149-0523-da6f-90ce-35e32f56cdfa", "label" : "fa fa-gear", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "d2059b7e-0390-ddb2-0cc7-48f074071781", "label" : "fa fa-cut", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "b78bcc29-e43d-8bef-8327-97da090e11e7", "label" : "fa fa-paste", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "6b20124e-4b3b-3110-c2e5-eaf8d2e6f0e1", "label" : "fa fa-arrow-circle-right", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "c6d5ca74-5896-d88c-6a31-dddeeaec1fc3", "label" : "fa fa-arrow-circle-down", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "6af3fd1c-39d6-b537-7f55-87029dcfdbda", "label" : "fa fa-arrow-circle-up", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "04093a07-4bfd-0bba-5fe0-4137257ee973", "label" : "fa fa-facebook-square", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "798b76a8-ed00-fb2c-c254-c37d8b05b61d", "label" : "fa fa-google-plus-square", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "8bb58649-b4bc-b2a9-a4e5-8c10ea30f3a5", "label" : "fa fa-linkedin-square", "value" : "", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "86185927-ef45-1f56-9928-55e13cb0f245", "label" : "fa fa-youtube-square", "value" : "", "item_sort_order" : "0", "status" : "Active" } ], "modified" : 1499325193, "created" : 1498132129, "uuid" : "5c3a9620-f4af-13fb-e8e1-3c3de90ad93f" },
				{ "name" : "AWS Email Details", "code" : "aws-email-details", "status" : "1", "list" : [ { "uuid" : "c52d8c7e-27f9-a722-1361-6c615b116499", "label" : "Username", "value" : "Add Username", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "34d8d6f8-2b60-8e5e-4b37-8ceee873422a", "label" : "Host", "value" : "Add host here", "item_sort_order" : "0", "status" : "Active" } ], "modified" : 1499323190, "created" : 1499323190, "uuid" : "81ef4212-2c19-9083-49f9-b7a487dd9793" },
				{ "name" : "Currency List", "code" : "currency-list", "status" : "1", "list" : [ { "uuid" : "517235aa-6c96-6892-eb87-1232f5e7ed6c", "label" : "GBP", "value" : "GBP", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "422777b7-a7d9-a545-a0a8-f2e9b01e604c", "label" : "USD", "value" : "USD", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "02ccf4a0-9016-d176-f90c-1c6da0af7881", "label" : "EUR", "value" : "EUR", "item_sort_order" : "0", "status" : "Active" } ], "modified" : 1502284191, "created" : 1502284191, "uuid" : "9e9c59f5-003a-b566-46fc-7066bd53c4bc" },
				{ "name" : "Tasks status", "code" : "tasks-status", "status" : "1", "list" : [ { "uuid" : "73134ccb-78d1-9efb-dcf6-c31a7b3a6a82", "label" : "Acknowledged", "value" : "acknowledged", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "531580ad-7a8e-63bc-4358-19da3a167053", "label" : "Assigned", "value" : "assigned", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "09131ca6-72e8-da32-2c06-3d5d4eae0e4a", "label" : "Closed", "value" : "closed", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "a2f8df89-49c8-ff18-08b9-a7911cf7c5f6", "label" : "Confirmed", "value" : "confirmed", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "4a8a1175-dfcc-0461-54ac-1acef6c17fc6", "label" : "Feedback", "value" : "feedback", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "c49728ef-1eec-4432-fba1-66a103c522c0", "label" : "Resolved", "value" : "resolved", "item_sort_order" : "0", "status" : "Active" } ], "modified" : 1502284280, "created" : 1502284280, "uuid" : "1854accb-e051-da4d-ae16-08ced30d52b9" },
				{ "name" : "Billing Status", "code" : "billing-status", "status" : "1", "list" : [ { "uuid" : "6ecdc2cc-0dac-8dbc-9ade-768842abba60", "label" : "Non Chargeable", "value" : "non-chargeable", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "7a65fa9c-42a2-9c0e-98fa-186ce8067de6", "label" : "Chargeable", "value" : "chargeable", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "bfedde99-aca5-0f79-6646-2296d7ff404e", "label" : "Billed", "value" : "billed", "item_sort_order" : "0", "status" : "Active" } ], "modified" : 1502284326, "created" : 1502284326, "uuid" : "1fdefb81-c58e-22d3-d984-e7b5dc941536" },
				{ "name" : "Job types", "code" : "job-types", "status" : "1", "list" : [ { "uuid" : "fb47ceeb-c395-5694-86f3-4ebeaa5050ca", "label" : "Temporary", "value" : "temporary", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "fd438a9e-2698-29fb-9d16-2608db3baa5b", "label" : "Permanent", "value" : "permanent", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "5bf5e498-c07e-9e1b-f99d-628f7b3ab053", "label" : "Contract", "value" : "contract", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "a743f735-b8b0-b73d-0c1a-6a4e045a6de5", "label" : "Freelance", "value" : "freelance", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "6855d54a-f80f-e7bd-77ea-108b1f22421f", "label" : "Part time", "value" : "part-time", "item_sort_order" : "0", "status" : "Active" } ], "modified" : 1502453779, "created" : 1502453779, "uuid" : "64aac5a3-16b8-2c31-5e3d-f612e5130739" },
				{ "name" : "Salary durations", "code" : "salary-durations", "status" : "1", "list" : [ { "uuid" : "34069c03-f15f-e989-c138-d8d0e61495b0", "label" : "Per Annum", "value" : "per-annum", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "89000757-7abc-45b5-8708-49e276a5775b", "label" : "Per Month", "value" : "per-month", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "ab2800c6-c055-0e49-d387-1cbc167c5b2e", "label" : "Per Week", "value" : "per-week", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "d3bf8c67-7539-3c28-210b-712f370a11ed", "label" : "Per Day", "value" : "per-day", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "b0531fce-8611-a62e-be23-8771068f1c50", "label" : "Per Hour", "value" : "per-hour", "item_sort_order" : "0", "status" : "Active" } ], "modified" : 1502453855, "created" : 1502453855, "uuid" : "b77c824f-5eb1-78b5-5992-4b62712157fa" },
				{ "name" : "Invoice Terms", "code" : "invoice-terms", "status" : "1", "list" : [ { "uuid" : "25878aa9-4b8a-1e8a-e7eb-be1ec7b7e94e", "label" : "Net 15", "value" : "Net 15", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "873eb384-e4fb-0486-4944-09772ad7d81e", "label" : "Net 20", "value" : "Net 20", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "3338037f-4129-b7a3-ed0e-375cc031a33f", "label" : "Net 30", "value" : "Net 30", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "27bae5c8-de39-fe82-baf9-f296f31ce8ec", "label" : "Upon receipt", "value" : "Upon receipt", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "2834687b-d8a5-baca-3098-fee575abd606", "label" : "Due On Receipt", "value" : "Due On Receipt", "item_sort_order" : "0", "status" : "Active" } ], "modified" : 1505906839, "created" : 1505826072, "uuid" : "057a4ab5-d77c-8052-1dd6-212120119510" },
				{ "name" : "Tax Code", "code" : "tax-code", "status" : "1", "list" : [ { "uuid" : "7aee3f50-9aee-8533-c907-bd5eb0edb8d8", "label" : "UK", "value" : "UK", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "c2ac09a9-dfaf-749c-288b-b72eb34e1c59", "label" : "US", "value" : "US", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "3e49db18-5254-cf98-b274-7716975b3a95", "label" : "EU", "value" : "EU", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "5bd54639-1a7a-f070-7db1-f86365ef81a8", "label" : "Rest of the world", "value" : "Rest of the world", "item_sort_order" : "0", "status" : "Active" } ], "modified" : 1505826138, "created" : 1505826138, "uuid" : "6a05699d-34ef-9dfd-ae68-b5c4bf506f75" },
				{ "name" : "Invoice Status", "code" : "invoice-status", "status" : "1", "list" : [ { "uuid" : "a77d4b99-3ac9-767e-e5c4-9d9ce4f1ae55", "label" : "Invoiced", "value" : "Invoiced", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "06f175a4-b6fb-35f7-efb0-89e5fae85713", "label" : "Paid", "value" : "Paid", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "98f806ce-18fb-84ef-9267-91b1d8f96d5b", "label" : "Bad debt", "value" : "Bad debt", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "61aaf6fc-cc80-e2fa-9ff2-69c116675c78", "label" : "Needs chasing", "value" : "Needs chasing", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "3c1e15fc-b1ba-d650-e215-fe2a8327f523", "label" : "Credit", "value" : "Credit", "item_sort_order" : "0", "status" : "Active" } ], "modified" : 1505906796, "created" : 1505826591, "uuid" : "9174b4ea-2498-2fa7-7627-195c2bdec746" },
				{ "name" : "Order status", "code" : "order-status", "status" : "1", "list" : [ { "uuid" : "62c35195-67bd-fd1a-da1c-a94c266761ba", "label" : "Estimate", "value" : "Estimate", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "e5b977bc-8e8d-0855-203c-3877b71309c9", "label" : "Quote", "value" : "Quote", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "0a712f64-9a39-7818-d3c1-3754f40b9b7e", "label" : "Ordered", "value" : "Ordered", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "efb6618f-d652-67aa-98bb-1eb311f4ecfd", "label" : "Acknowledged", "value" : "Acknowledged", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "00296818-c071-1758-4cb7-026094289fd6", "label" : "Authorised", "value" : "Authorised", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "2d972b6e-b051-b744-aa8b-cb8194aed1c3", "label" : "Delivered", "value" : "Delivered", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "2da0d0f4-9bca-7491-df6f-867b8441478d", "label" : "Completed", "value" : "Completed", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "5c46cd2b-c8b9-8d39-4bc8-b3d5641c9add", "label" : "Proforma Invoice ", "value" : "Proforma Invoice ", "item_sort_order" : "0", "status" : "Active" } ], "modified" : 1505906459, "created" : 1505906459, "uuid" : "26c02a33-7823-7500-19c1-e8c7c2c5c892" },
				{ "name" : "Type of accounts", "code" : "type-of-accounts", "status" : "1", "list" : [ { "uuid" : "8db4c12a-dcf4-9c92-ee18-502dcd61fa5a", "label" : " Profit and loss", "value" : " Profit and loss", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "ea00c07d-df81-01ee-aab1-e68f6f81744a", "label" : "Balance sheet", "value" : "Balance sheet", "item_sort_order" : "0", "status" : "Active" } ], "modified" : 1505906716, "created" : 1505906716, "uuid" : "bd9e7b26-c6c8-11eb-fa4e-fe0ef45a5cab" },
				{ "name" : "Employee types", "code" : "employee-types", "status" : "1", "list" : [ { "uuid" : "68f08d78-6ecb-7e5f-4d60-6d8438da8591", "label" : "Administrator", "value" : "Administrator", "item_sort_order" : "0", "status" : "Active" }, { "uuid" : "74e5a0db-b57d-6310-48be-985270a9a479", "label" : "Bookkeeper", "value" : "Bookkeeper", "item_sort_order" : "1", "status" : "Active" }, { "uuid" : "b112e811-96eb-d7c7-e805-677fc1c9494e", "label" : "Customer Relationship Manager", "value" : "Customer Relationship Manager", "item_sort_order" : "2", "status" : "Active" }, { "uuid" : "db424362-d8a3-d3b9-ef63-de07d8194691", "label" : "Designer", "value" : "Designer", "item_sort_order" : "3", "status" : "Active" }, { "uuid" : "37772023-5c13-1a5c-8493-f6dbbade5c53", "label" : "Developer", "value" : "Developer", "item_sort_order" : "4", "status" : "Active" }, { "uuid" : "03de97fc-5720-75e6-c731-5d488d72e5e2", "label" : "Manager", "value" : "Manager", "item_sort_order" : "5", "status" : "Active" }, { "uuid" : "d1407099-6aa2-e556-30db-891c5b09f7ca", "label" : "Shareholder", "value" : "Shareholder", "item_sort_order" : "6", "status" : "Active" }, { "uuid" : "cd6a9922-15e1-d76b-f77e-c464209b2696", "label" : "Support", "value" : "Support", "item_sort_order" : "7", "status" : "Active" }, { "uuid" : "62959131-a01d-7772-c78d-3b3fd60b45a8", "label" : "Technical", "value" : "Technical", "item_sort_order" : "8", "status" : "Active" } ], "modified" : 1503302467, "created" : 1503302467, "uuid" : "39e56ed2-750c-102e-c020-cd1e7a158316" }
				];
				
				for(var i=0; i < addDefaultListsObj.length; i++){
					var tempObj = addDefaultListsObj[i];
					createTableEntries('system_lists', tempObj['code'], tempObj, function(g_response) {
      					console.log(g_response);
      				});
				}
				
				var addSystemListsObj= [{	"code": "system_templates",	"table": "system_templates", "status": "1",	"template_type": "list_view",	"editor_filename": "system_template",	"enable_editor": "1",	"editor_field": "_id",	"search_columns": [{ "code": "contains"	}, { "table": "contains" }], "index_columns": [ "code",	"table"	], "listing_columns": "code,table,modified", "search_condition": "or", "modified": 1499240915, "created": 1499240387,"uuid": "9b1f25b9-dc80-3862-0187-1942ad2d1e7f" },
				{	"code" : "modules", "table" : "modules", "status" : "1", "template_type" : "list_view", "editor_filename" : "module", "enable_editor" : "1", "editor_field" : "_id", "search_columns" : [ { "name" : "contains" }, { "table" : "contains" }, {  "module_items" : "contains" }], "index_columns" : [ "name", "table", "module_items"], "listing_columns" : "name,table,displayOnDashboard,sort_order,active",  "search_condition" : "or", "modified" : 1499241017, "created" : 1499241017,"uuid" : "385ee279-07a8-a370-6734-7112088a2a5c" },
				{	"code" : "users",  "table" : "users", "template_type" : "list_view", "status" : "1", "editor_filename" : "user", "enable_editor" : "1", "editor_field" : "_id", "search_columns" : [ { "firstname" : "contains" }, { "lastname" : "contains" }, { "email" : "contains" } ], "index_columns" : [ "firstname", "lastname", "email" ], "listing_columns" : "firstname,lastname,email,access_right,status", "search_condition" : "or", "modified" : 1500362100, "created" : 1500362100, "uuid" : "d0e4f804-37e3-27d0-d1bb-95660acda8df" }];
				
				for(var i=0; i < addSystemListsObj.length; i++){
					var tempObj = addSystemListsObj[i];
					createTableEntries('system_templates', tempObj['code'], tempObj, function(g_response) {
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
   				var tempPassword = "admin";
				var hashPasswordStr=passwordHash.generate(tempPassword);
   				db.collection("users").save({"username" : "admin", "firstname" : "Webmaster", "lastname" : "", "gender" : "m", "email" : "", "password" : hashPasswordStr,  "access_right" : "11", "status" : "1", "created" : initFunctions.currentTimestamp()}, (err, result) => {
      				if (err) console.log(err);
      				if(result){
      					console.log("Created admin user successfully with username : admin and password : "+tempPassword);
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
