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
	*  routes.js handles the http requests
	**/
	
var initFunctions = require('../config/functions');		
var passwordHash = require('password-hash'),
	cookieParser = require('cookie-parser');
	
var multer = require('multer');
var GridFsStorage = require('multer-gridfs-storage');
var Grid = require('gridfs-stream');
var jwt = require('jwt-simple');

const fs = require('fs');

module.exports = function(init, app,db){
var mongodb=init.mongodb;
var gfs = Grid(db, mongodb);
 
//call defined admin tables array which are independent of system table
var definedAdminTablesArr= init.adminTablesArr;

var accessFilePath=init.backendDirectoryName+"/";
var backendDirectoryPath=init.backendDirectoryPath;

//sign in page
app.get(backendDirectoryPath+'/sign-in', system_preferences, function(req, res) {
	res.render(accessFilePath+'sign-in', {
      	 queryStr : req.query,
      	 system_preferences :  req.system_preferences
    });   
})

//reset password
app.get(backendDirectoryPath+'/reset_password', system_preferences, function(req, res) {
	res.render(accessFilePath+'reset_password', {
      	 queryStr : req.query,
      	 system_preferences :  req.system_preferences
    });   
})

/** Setting up storage using multer-gridfs-storage */
var storage = GridFsStorage({
	gfs : gfs,
	filename: function (req, file, cb) {
		var datetimestamp = Date.now();
		cb(null, file.fieldname + '-' + datetimestamp + '.' + file.originalname.split('.')[file.originalname.split('.').length -1]);
	},
	/** With gridfs we can store aditional meta-data along with the file */
	metadata: function(req, file, cb) {
		cb(null, { uuid_system: req.authenticatedUser.active_system_uuid.toString(), uuid: req.body.uuid, originalname: file.originalname, related_collection: req.body.related_collection, collection_id: req.body.collection_id, type: req.body.type, tags: req.body.tags });
	}
});

var upload = multer({ //multer settings for single upload
    storage: storage
}).single('file');

/** API path that will upload the files */
app.post(backendDirectoryPath+'/upload', requireLogin, function(req, res) {
	var myObj = new Object();
	
	if(req.authenticationBool){
		var requested_Object=req;
		initFunctions.create_file_on_disk_to_extract_content(db, requested_Object, function(resultObject) {
			if(resultObject.path && resultObject.path!=""){
				fs.unlinkSync(resultObject.path);
			}
			if(resultObject.extracted_data && resultObject.extracted_data!="" && resultObject.fields && resultObject.fields.related_collection && resultObject.fields.related_collection=="job_applications"){
				myObj["cv_content"]=resultObject.extracted_data;
				myObj["postcode"]=initFunctions.extract_uk_postcode(resultObject.extracted_data);
			}
		});
		//upload file in database
     	upload(req,res,function(err){
			if(err){
				myObj["error"]=err;
				res.send(myObj);
			} else	{
				//set the timeout to hold the response to get extracted cv_content for job_applications
				if(req.file.metadata && req.file.metadata.related_collection && req.file.metadata.related_collection=="job_applications"){
					setTimeout(function() {
						myObj["_id"]=req.file.id;
						myObj["mimetype"]=req.file.mimetype;
						myObj["success"]="Uploaded successfully!";
						res.send(myObj);
					}, 3000);
				}else{
					myObj["_id"]=req.file.id;
					myObj["mimetype"]=req.file.mimetype;
					myObj["success"]="Uploaded successfully!";
					res.send(myObj);
				}
			}
		});
	}else{
  		myObj["error"]   = "Sorry you are not authorized to add note!";
		res.send(myObj);
  	}
});

//download file
app.get(backendDirectoryPath+'/download/:uuid', requireLogin, function(req, res) {
    gfs.files.findOne({'metadata.uuid': req.params.uuid}, function(err, file) {
		if (err) {
			return res.status(400).send(err);
    	}    else if (!file) {
        	return res.status(404).send('Error on the database looking for the file.');
   		}
   		var fileNameStr= file.filename;
   		
		if(file.metadata && file.metadata['originalname'] && file.metadata['originalname']!=""){
			fileNameStr=file.metadata['originalname'];
		}

    	res.set('Content-Type', file.contentType);
    	res.set('mode', 'w');
    	res.set('Content-Disposition', 'attachment; filename="' + fileNameStr + '"');
		
		var readstream = gfs.createReadStream({
      		_id: file._id
    	});
		readstream.on("error", function(err) { 
       		res.end();
    	});
    	readstream.pipe(res);
    });
});

//find and remove file
app.post(backendDirectoryPath+'/find_remove_file', requireLogin, function(req, res) {
    var outputObj = new Object();
	gfs.files.findOne({'metadata.uuid': req.body.uuid}, function(err, files) {
		if(files && files._id!=""){
        	gfs.remove({'_id': files._id});
            outputObj["success"]   = "OK";
			res.send(outputObj);
		} else if(err){
        	outputObj["error"]   = "Sorry, error occurred, please try after sometime!";
			res.send(outputObj);
        } else{
        	outputObj["success"]   = "OK";
            res.send(outputObj);
        }
    });
});

//fetch uploaded file content
app.get(backendDirectoryPath+'/file/:filename', function(req, res){
        /** First check if file exists */
        gfs.files.find({'metadata.uuid': req.params.filename}).toArray(function(err, files){
            if(!files || files.length === 0){
                return res.status(404).json({
                    responseCode: 1,
                    responseMessage: "error"
                });
            }

            /** create read stream */
            var readstream = gfs.createReadStream({
            	filename: files[0].filename
            });

            /** set the proper content type */
            res.set('Content-Type', files[0].contentType)                                                                                                                      

            /** return response */
            return readstream.pipe(res);
        });
});

//download invoice by process pdf template
app.get(backendDirectoryPath+'/invoice/:id', requireLogin, function(req, res) {
	var sendResponse = res;
	if(req.authenticationBool){
		initFunctions.generate_invoice_order_pdf(db, "invoices", req.params.id, req.authenticatedUser.active_system_uuid.toString(), function(resultObject) {
			if(resultObject.success && resultObject.success !=""){
				sendResponse.download(resultObject.success , function (err) {
       				if (err) {
           				res.send("Sorry, error occurred while generating pdf!");
       				}
  				});
			}else if(resultObject.error && resultObject.error !=""){
				res.send(resultObject.error);
			} else {
				res.send("Sorry, error occurred while generating pdf!");
			}
		});
	}else{
  		res.send("Sorry you are not authorized for this action!");
  	}
});    
 
//download order by process pdf template
app.get(backendDirectoryPath+'/order/:id', requireLogin, function(req, res) {
	var sendResponse = res;
	if(req.authenticationBool){
		initFunctions.generate_invoice_order_pdf(db, "orders", req.params.id, req.authenticatedUser.active_system_uuid.toString(), function(resultObject) {
			if(resultObject.success && resultObject.success !=""){
				sendResponse.download(resultObject.success , function (err) {
       				if (err) {
           				res.send("Sorry, error occurred while generating pdf!");
       				}
  				});
			}else if(resultObject.error && resultObject.error !=""){
				res.send(resultObject.error);
			} else {
				res.send("Sorry, error occurred while generating pdf!");
			}
		});
	}else{
  		res.send("Sorry you are not authorized for this action!");
  	}
});     

//post action for save notes
app.post(backendDirectoryPath+'/savenotes', requireLogin, (req, res) => {
	var myObj = new Object();
	if(req.authenticationBool){
	var tableID= req.body.uuid;
	var insertNote=new Object();
	insertNote["note"]=req.body.note;
	insertNote["user_uuid"]=req.body.added_by;
	insertNote["user_name"]=req.body.user_name;
	insertNote["modified"]=initFunctions.currentTimestamp();
	insertNote["created"]=initFunctions.currentTimestamp();
	insertNote["uuid"]=initFunctions.guid();
	
	if(tableID!=""){
		var mongoIDField= new mongodb.ObjectID(tableID);
		var table_nameStr=req.body.table;
		if(req.body.action=="create"){
			initFunctions.returnFindOneByMongoID(db, table_nameStr, tableID, function(resultObject) {
				if(resultObject.aaData){
					db.collection(table_nameStr).update({_id:mongoIDField}, { $push: { "notes": insertNote } }, (err, result) => {
    					if(result){
    						myObj["success"]   = "Note added successfully!";
							res.send(myObj);
    					}else{
    						myObj["error"]   = "Error posting comment. Please try again later!!!";
							res.send(myObj);
    					}
    				});
				}else{
					myObj["error"]   = "Error adding note. Please try again later!!!";
					res.send(myObj);
				}	
  			});	
  		}else if(req.body.action=="update"){
			initFunctions.returnFindOneByMongoID(db, table_nameStr, tableID, function(resultObject) {
				if(resultObject.aaData){
					db.collection(table_nameStr).update({_id:mongoIDField}, { $pull: { "notes": { "uuid": req.body.note_uuid } } }, (err, result) => {
    					if(result){
    						insertNote["uuid"]=req.body.note_uuid;
    						
    						db.collection(table_nameStr).update({_id:mongoIDField}, { $push: { "notes": insertNote } }, (err, result) => {
    							if(result){
    								myObj["success"]   = "Note updated successfully!";
									res.send(myObj);
    							}else{
    								myObj["error"]   = "Error posting comment. Please try again later!!!";
									res.send(myObj);
    							}
    						});
    					}else{
    						myObj["error"]   = "Error in update note. Please try again later!!!";
							res.send(myObj);
    					}
    				});
				}else{
					myObj["error"]   = "Error adding note. Please try again later!!!";
					res.send(myObj);
				}	
  			});	
  		}else if(req.body.action=="delete"){
  			initFunctions.returnFindOneByMongoID(db, table_nameStr, tableID, function(resultObject) {
  				if(resultObject.aaData){
  					db.collection(table_nameStr).update({_id:mongoIDField}, { $pull: { "notes": { "uuid": req.body.note_uuid } } }, (err, result) => {
    					if(result){
    						myObj["success"]   = "Note deleted successfully!";
							res.send(myObj);
    					}else{
    						myObj["error"]   = "Error in deleting note. Please try again later!!!";
							res.send(myObj);
    					}
    				});
  				}else{
  					myObj["error"]   = "Error in deleting note. Please try again later!!!";
					res.send(myObj);
  				}
  			});
  		}
  	}
  	}else{
  		myObj["error"]   = "Sorry you are not authorized to add note!";
		res.send(myObj);
  	}
});

//post action to addComments for user and notify user
app.post(backendDirectoryPath+'/addCommentForUser', requireLogin, (req, res) => {
	var myObj = new Object();
	if(req.authenticationBool){
		var tableID= req.body.id;
		var insertNote=new Object();
		insertNote["comment"]=req.body.comment;
		insertNote["added_by"]=req.authenticatedUser._id.toString();
		insertNote["added_by_name"]=req.authenticatedUser.firstname+" "+req.authenticatedUser.lastname;
		insertNote["created"]=initFunctions.currentTimestamp();
		insertNote["uuid"]=initFunctions.guid();
		insertNote["read_status"]=0;
		
		var mongoIDField= new mongodb.ObjectID(tableID);
		var table_nameStr='availability';
		
			initFunctions.returnFindOneByMongoID(db, table_nameStr, tableID, function(resultObject) {
				if(resultObject.aaData){
					db.collection(table_nameStr).update({_id:mongoIDField}, { $push: { "comments": insertNote } }, (err, result) => {
    					if(result){
    						initFunctions.send_notification(db, null, resultObject.aaData.user_mongo_id, 'comment', null, 0, table_nameStr, tableID, function(notificationResult) {
    							myObj["success"]   = "Comment added successfully!";
								res.send(myObj);
							});
    					}else{
    						myObj["error"]   = "Error posting comment. Please try again later!!!";
							res.send(myObj);
    					}
    				});
				}else{
					myObj["error"]   = "Error adding comment. Please try again later!!!";
					res.send(myObj);
				}	
  			});	
  		
  	} else{
  		myObj["error"]   = "Sorry you are not authorized to add comment!";
		res.send(myObj);
  	}
});

//post action for save players
app.post(backendDirectoryPath+'/saveplayers', (req, res) => {
	var myObj = new Object();
	var postContent= req.body;
	var table_nameStr="teams", tableID="", actionStr="", subObject;
	
	if(postContent.id){
		tableID=postContent.id;
		delete postContent['id']; 
	}
		
	if(postContent.action){
		actionStr=postContent.action;
		delete postContent['action']; 
	}
	
	if(postContent.aaData){
		subObject=JSON.parse(postContent.aaData);
		delete postContent['aaData']; 
	}
		
	if(tableID!=""){
		var mongoIDField= new mongodb.ObjectID(tableID);
		
		if(actionStr=="create"){
			initFunctions.returnFindOneByMongoID(db, table_nameStr, tableID, function(resultObject) {
				if(resultObject.aaData){
					var teamsData=resultObject.aaData;
					var playersArr=teamsData.players;
					
					var playersUUIDArr= new Array();
					var sortOrderNum=0;
					
					if(playersArr.length>0){
						for(var i=0; i<playersArr.length; i++){
							playersUUIDArr.push(playersArr[i].user_mongo_id);
							if(playersArr[i].batting_order >= sortOrderNum){
								sortOrderNum=parseInt(playersArr[i].batting_order);
							}
						}
					}
					
					if(subObject.length>0){
						for(var i=0; i<subObject.length; i++){
							var userUUIDSTR=subObject[i].user_mongo_id;
							if(playersUUIDArr.indexOf(userUUIDSTR)!==-1){
								//console.log('update');
							} else{
								subObject[i].batting_order=sortOrderNum+1;
								sortOrderNum++;
								playersArr.push(subObject[i]);
							}
						}
						
						db.collection(table_nameStr).update({_id:mongoIDField}, { $set: { "players": playersArr } }, (err, result) => {
    						if(result){
    							myObj["success"]   = "Players added successfully!";
								res.send(myObj);
    						}else{
    							myObj["error"]   = "Error while adding players, please try again later!!!";
								res.send(myObj);
    						}
    					});
					}else{
						myObj["error"]   = "Error occured, please try again later!!!";
						res.send(myObj);
					}
				}
				else{
					myObj["error"]   = "Error occured, please try again later!!!";
					res.send(myObj);
				}
	 		});
	 	}
  		else if(actionStr=="update"){
			myObj["error"]   = "Work in progress";
			res.send(myObj);
  		}
  		else if(actionStr=="delete"){
  			myObj["error"]   = "Work in progress";
			res.send(myObj);
  		}
  	}
});

//post action of reset password
app.post(backendDirectoryPath+'/reset_password', (req, res) => {
	var postJson=req.body;
	var mongoIDField= new mongodb.ObjectID(postJson.token);
	
	initFunctions.returnFindOneByMongoID(db, 'authentication_token', mongoIDField, function(result) {
		if (result.aaData) {
			var document=result.aaData;
			if(document.status==true){
				if (typeof postJson.password !== 'undefined' && postJson.password !== null && postJson.password != "") {
      				postJson['password'] = passwordHash.generate(postJson.password);
      			}
				db.collection('users').findAndModify({_id:document.user_id}, [['_id','asc']], { $set: {"password" : postJson.password} }, {}, function(err, result) {
					db.collection('authentication_token').remove({"_id":mongoIDField},function(err,result){
    					res.redirect(backendDirectoryPath+'/sign-in?success=reset');
    				});
				});
			}else{
				res.redirect(backendDirectoryPath+'/reset_password?error=invalid');
			}
      	} else {
      		res.redirect(backendDirectoryPath+'/reset_password?error=invalid');
        }
    });
})

//forgot password
app.get(backendDirectoryPath+'/forgot_password', system_preferences, function(req, res) {
	res.render(accessFilePath+'forgot_password', {
      	 queryStr : req.query,
      	 system_preferences :  req.system_preferences
    });   
})

//index page
app.get(backendDirectoryPath+'/', requireLogin, system_preferences, function(req, res) {
	if(req.authenticationBool){
		res.render(accessFilePath+'index', {
      		 authenticatedUser : req.authenticatedUser,
      		 system_preferences :  req.system_preferences
   		});
    }else{
		res.redirect(backendDirectoryPath+'/sign-in');
	}
}); 

//index
app.get(backendDirectoryPath+'/index', requireLogin, system_preferences, function(req, res) {
	if(req.authenticationBool){
		res.render(accessFilePath+'index', {
      		 authenticatedUser : req.authenticatedUser,
      		 system_preferences :  req.system_preferences
   		});
    }else{
		res.redirect(backendDirectoryPath+'/sign-in');
	}
}); 

//403 : forbidden page
app.get(backendDirectoryPath+'/403', requireLogin, system_preferences, function(req, res) {
	if(req.authenticationBool){
 		res.render(accessFilePath+'403', {
      		 authenticatedUser : req.authenticatedUser,
      		 system_preferences :  req.system_preferences
   		});
    }else{
		res.redirect(backendDirectoryPath+'/sign-in');
	}
}); 

//launchpad
app.get(backendDirectoryPath+'/launchpad', requireLogin, system_preferences, function(req, res) {
	if(req.authenticationBool){
		var filesArr= new Array(), i=0;
		fs.readdirSync('views/'+init.backendDirectoryName).forEach(file => {
 			filesArr[i]=file;
 			i++;
 		});
 		initFunctions.save_activity_log(db, 'Launchpad', req.url, req.authenticatedUser._id, req.authenticatedUser.active_system_uuid.toString(), function(result) {	
			res.render(accessFilePath+'launchpad', {
 				directory_files : filesArr,
      			authenticatedUser : req.authenticatedUser,
      			system_preferences :  req.system_preferences
   			});
   		});
    }else{
		res.redirect(backendDirectoryPath+'/sign-in');
	}
}); 

//logout
app.get(backendDirectoryPath+'/logout', function(req, res) {
	if(req.cookies[init.cookieName] != null && req.cookies[init.cookieName] != 'undefined' && req.cookies[init.cookieName]!=""){
		var mongoIDField= new mongodb.ObjectID(req.cookies[init.cookieName]);
		res.clearCookie(init.cookieName);
		db.collection('sessions').remove({"_id":mongoIDField},function(err,result){
    		res.redirect(backendDirectoryPath+'/sign-in');
    	});
   	}else{
   		res.redirect(backendDirectoryPath+'/sign-in');
   	}	
}); 

//forgot password post
app.post(backendDirectoryPath+'/forgot_password', (req, res) => {
	var postJson=req.body;
	var checkForExistence= '{"email": \''+postJson.email+'\', "status": { $in: [ 1, "1" ] }}';
	
	initFunctions.crudOpertions(db, 'users', 'findOne', null, null, null, checkForExistence, function(result) {
		if (result.aaData) {
			var document= result.aaData, addAuthToken=new Object();
			addAuthToken["user_id"]=document._id;
			addAuthToken["status"]=true;
				
			initFunctions.crudOpertions(db, 'authentication_token', 'create', addAuthToken, null, null, null,function(result) {
				var subjectStr='Reset your '+init.system_name+' password';
				var nameStr=document.firstname;
				if(document.lastname){
					nameStr+=' '+document.lastname;
				}
				var urlStr= init.appUrl+'/reset_password?token='+result._id
				db.collection('email_templates').findOne({"code": "reset-password", status : { $in: [ 1, "1" ] } }, function(err, templateResponse) {
					if(templateResponse){
						var bodyStr= templateResponse.template_content;
						bodyStr = bodyStr.replace("{fullname}", nameStr);
						bodyStr = bodyStr.replace(/{url}/g, urlStr);
					}else{
						var bodyStr ='Hi '+nameStr+',<br>Please click on the below link to reset your password:<br><a href="'+urlStr+'" target="_blank">'+urlStr+'</a>';
					}	
							
					// send email
					initFunctions.send_email(db, init.recipientStr, nameStr, postJson.email, subjectStr, bodyStr, bodyStr, function(email_response) {
						if(email_response.error){
							res.redirect(backendDirectoryPath+'/forgot_password?error=email');
						}else{
							res.redirect(backendDirectoryPath+'/forgot_password?success=OK');
						}
					});
				});
			});
      	} else {
      		res.redirect(backendDirectoryPath+'/forgot_password?error=not_exist');
        }
    });
})

//validate user
app.post(backendDirectoryPath+'/validlogin', (req, res) => {
	var postJson=req.body;
	var checkForExistence= '{"email": \''+postJson.email+'\', "status": { $in: [ 1, "1" ] }}';
	initFunctions.crudOpertions(db, 'users', 'findOne', null, null, null, checkForExistence, function(result) {
		if (result.aaData) {
			var document= result.aaData;
			if(passwordHash.verify(postJson.password, document.password)){
				initFunctions.saveSessionBeforeLogin(db, document._id, document.uuid_default_system, function(result) {
					if (result.success){
      					res.cookie(init.cookieName , result.cookie)
      					res.redirect(backendDirectoryPath+result.link);
      				}else{
      					res.redirect(backendDirectoryPath+'/sign-in?error=no');
    				}
  				});
			}else{
      			res.redirect(backendDirectoryPath+'/sign-in?error=password');
      		}
      	} else {
      		// search user by username
      		var checkForExistence= '{"username": \''+postJson.email+'\', "status": { $in: [ 1, "1" ] }}';
      		initFunctions.crudOpertions(db, 'users', 'findOne', null, null, null, checkForExistence, function(result) {
				if (result.aaData) {
					var document= result.aaData;
					
					if(passwordHash.verify(postJson.password, document.password)){
						initFunctions.saveSessionBeforeLogin(db, document._id, document.uuid_default_system, function(result) {
							if (result.success){
      								res.cookie(init.cookieName , result.cookie)
      								res.redirect(backendDirectoryPath+result.link);
      						}else{
      							res.redirect(backendDirectoryPath+'/sign-in?error=no');
    						}
  						});
					}else{
      					res.redirect(backendDirectoryPath+'/sign-in?error=password');
      				}
      			} else {
      				res.redirect(backendDirectoryPath+'/sign-in?error=no');
      		  	}
    		});
        }
    });
})

//change notification status
app.get(backendDirectoryPath+'/change_notifications', requireLogin, function(req, res) {
	var redirectURLStr="/";
	var collectionStr="notifications";
		
	var myObj = new Object();
	if(req.authenticationBool){
		var mongoIDField = req.query.id;
		
		initFunctions.returnFindOneByMongoID(db, collectionStr, mongoIDField, function(result) {
			if(result.aaData){
				var tableData=result.aaData;
				if(tableData.read_status==1 || tableData.read_status=="1"){
					var linkStr="";
    				if(tableData.message_type=="comment" || tableData.message_type=="availability")	{
    					initFunctions.returnFindOneByMongoID(db, tableData.collection_linked, tableData.collection_link_id, function(ava_result) {
    						if(ava_result.aaData){
    							linkStr=backendDirectoryPath+"/user?_id="+ava_result.aaData.user_mongo_id;
    							res.redirect(linkStr);
    						}else{
    							res.redirect(backendDirectoryPath+'/notifications?token='+tableData._id);
    						}
    					});
    				}else{
    					if(tableData.collection_linked && tableData.collection_linked!="" && tableData.collection_link_id && tableData.collection_link_id!=""){
    						var tempLinkStr=tableData.collection_linked.slice(0,-1);
    						res.redirect(backendDirectoryPath+"/"+tempLinkStr+"?_id="+tableData.collection_link_id);
    					}else{
    						res.redirect(backendDirectoryPath+'/notifications?token='+tableData._id);
    					}
    				}
				}else{
				db.collection(collectionStr).update({_id : new mongodb.ObjectID(mongoIDField)}, { $set: {"read_status" : 1 } }, (err, response) => {
    				var linkStr="";
    				if(tableData.message_type=="comment" || tableData.message_type=="availability")	{
    					initFunctions.returnFindOneByMongoID(db, tableData.collection_linked, tableData.collection_link_id, function(ava_result) {
    						if(ava_result.aaData){
    							linkStr=backendDirectoryPath+"/user?_id="+ava_result.aaData.user_mongo_id;
    							res.redirect(linkStr);
    						}else{
    							res.redirect(backendDirectoryPath+'/notifications?token='+tableData._id);
    						}
    					});
    				}else{
    					if(tableData.collection_linked && tableData.collection_linked!="" && tableData.collection_link_id && tableData.collection_link_id!=""){
    						var tempLinkStr=tableData.collection_linked.slice(0,-1);
    						res.redirect(backendDirectoryPath+"/"+tempLinkStr+"?_id="+tableData.collection_link_id);
    					}else{
    						res.redirect(backendDirectoryPath+'/notifications?token='+tableData._id);
    					}
    				}
    			});
    			}
  			} else{
  				res.redirect(backendDirectoryPath+'/notifications');
  			}
    	});
	} else	{
		res.redirect(backendDirectoryPath+'/sign-in');
	}
});

//count results of passed collection user notification
app.get(backendDirectoryPath+'/api_get_count', requireLogin, function(req, res) {
	var myObj = new Object();
	if(req.authenticationBool){
		if(req.query.collection && req.query.collection!=""){
			var collectionStr= req.query.collection;
			var activeSystemsStr=req.authenticatedUser.active_system_uuid.toString();
			var query="{";
			if (typeof activeSystemsStr !== 'undefined' && activeSystemsStr !== null && activeSystemsStr!="") {
				if(definedAdminTablesArr.indexOf(collectionStr)==-1){
					query+=" $or: [ { 'uuid_system' : { $in: ['"+activeSystemsStr+"'] } }, { 'shared_systems': { $in: ['"+activeSystemsStr+"'] } } ] ";
				}
			}
			if(req.query.collection=="players"){
				collectionStr="users";
				if(query!="{"){
					query += ",";
				}
				query += "'user_type': 'member'";
			}
			
			query += "}";
			eval('var queryObj='+query);
			db.collection(collectionStr).find(queryObj).count(function (e, count) {
      			myObj["total"]   = count;
      			res.send(myObj);
     		});
		} else {
			myObj["error"]   = 'You are not authorized to check the content!';
			myObj["total"]   = 0;
			res.send(myObj);
		}
	} else	{
		myObj["error"]   = 'You are not authorized to check the content!';
		res.send(myObj);
	}
});

//fetch user notification
app.get(backendDirectoryPath+'/load_notifications', requireLogin, function(req, res) {
	var collectionStr="notifications";
	var itemsPerPage = 5, pageNum=1;
	
	if(req.query.start){
		pageNum=parseInt(req.query.start);
	}
	if(req.query.limit){
		itemsPerPage=parseInt(req.query.limit);
	}
	if(pageNum==0){
		pageNum=1;
	}
	
	var myObj = new Object();
	if(req.authenticationBool){
		if(req.query.token && req.query.token!==""){
			db.collection(collectionStr).findOne({ 'notify_to': req.authenticatedUser._id, '_id' : new mongodb.ObjectID(req.query.token) }, function(err, document) {
				if (document && document!="") {
      				myObj["total"]   = 1;
      				myObj["aaData"]   = new Array(document);
					res.send(myObj);
				}else{
					myObj["total"]   = 0;
					myObj["error"]   = 'Sorry, no notification found for you!';
					res.send(myObj);
				}
			});
		}else{
			db.collection(collectionStr).find({ 'notify_to': req.authenticatedUser._id }).sort({created: -1}).skip(pageNum-1).limit(itemsPerPage).toArray(function(err, documents) {
				if (documents&& documents.length>0) {
					db.collection(collectionStr).find({ 'notify_to': req.authenticatedUser._id, read_status : { $in: [ 0, "0" ] } }).count(function (e, count) {
      					myObj["total"]   = count;
      					myObj["aaData"]   = documents;
						res.send(myObj);
     				});
				}else{
					myObj["total"]   = 0;
					myObj["error"]   = 'Sorry, no notifications found for you!';
					res.send(myObj);
				}
    		});
    	}
	} else	{
		myObj["error"]   = 'You are not authorized to check the content!';
		res.send(myObj);
	}
});

// task scheduler
app.get(backendDirectoryPath+'/task_scheduler', (req, res) => {
	var schedulerFrom = req.query.schedulerFrom, schedulerTo=req.query.schedulerTo, collectionStr=req.query.collection, outputObj = new Object();
	
	db.collection(collectionStr).find({ $and:[ { timestamp_start: { $gte: schedulerFrom } },  { timestamp_start: { $lte: schedulerTo } } ] }).sort({modified: 1}).toArray(function(err, items) {
		if (err) {
			outputObj["error"]   = 'no records found';
			res.send(outputObj);
      	} else if (items) {
      		outputObj["aaData"]   = items;
			res.send(outputObj);
     	}
	});
	
});

//post request to save task scheduler
app.get(backendDirectoryPath+'/save_task_scheduler', (req, res) => {
	var getJson=req.query;
	var outputObj = new Object();
	var table_nameStr='calendar-events';
	
	if(getJson.action=="create"){
		initFunctions.returnFindOneByMongoID(db, 'tasks', getJson.task_id, function(resultObject) {
			if(resultObject.aaData){
				var contentObj=resultObject.aaData;
				var startTimeStr=parseInt(getJson.datetimestart);
				var addHours=1;
				if(contentObj.task_estimated_hours && contentObj.task_estimated_hours!=null){
					addHours=parseInt(contentObj.task_estimated_hours);
				}
				
				var endTimeStr=parseInt(startTimeStr+(addHours*60*60*1000));
				db.collection(table_nameStr).save({"title": contentObj.name, "reported_by": contentObj.reported_by, "assigned_to": contentObj.assigned_to, "description": contentObj.description, "task_id": getJson.task_id, "employee_id" : getJson.emp_id, "timestamp_start" : getJson.datetimestart, "timestamp_end" : endTimeStr}, (err, result) => {
					if(err){
						outputObj["errormessage"]   = 'Timeslip can\'t be added';
						res.send(outputObj);
					}	else if (result){
      					outputObj["success"] ="OK";
      					outputObj["aaData"] =result["ops"];
      					res.send(outputObj);
      				}
  				});
			}else if(resultObject.error){
				outputObj["errormessage"]   = resultObject.error;
				res.send(outputObj);
			}
			
		});	
	}else if(getJson.action=="update"){
		if(getJson.timeslip_id){
			var timeslipMongoID= new mongodb.ObjectID(getJson.timeslip_id);
			db.collection(table_nameStr).findAndModify({_id:timeslipMongoID}, [['_id','asc']], { $set: {"employee_id" : getJson.emp_id, "timestamp_start" : getJson.datetimestart, "timestamp_end" : getJson.datetimeend} }, {}, function(err, result) {
				if(err){
					outputObj["errormessage"]   = 'Timeslip can\'t be updated';
					res.send(outputObj);
				}	else if (result){
					if(result.lastErrorObject.updatedExisting){
						outputObj["success"] ="OK";
      				}else{
      					outputObj["errormessage"]   = 'Timeslip can\'t be updated';
					}
      				res.send(outputObj);
      			}
  			});
  		}else{
  			outputObj["errormessage"]   = 'Invalid timeslip passed';
			res.send(outputObj);
  		}
	}else if(getJson.action=="delete"){
		if(getJson.timeslip_id){
			var timeslipMongoID= new mongodb.ObjectID(getJson.timeslip_id);
			db.collection(table_nameStr).remove({_id:timeslipMongoID}, function(err, result){
				if(err){
					outputObj["errormessage"]   = 'Timeslip can\'t be deleted';
					res.send(outputObj);
				}	else if (result){
					outputObj["success"] ="OK";
      				res.send(outputObj);
      			}
  			});
  		}else{
  			outputObj["errormessage"]   = 'Invalid timeslip passed';
			res.send(outputObj);
  		}
	}
})

//notify user one user : this is called from user entry form
app.post(backendDirectoryPath+'/notifyUser/', requireLogin, function(req, res) {
	var outputObj = new Object();
	
	if(req.authenticationBool){
		var postContent=req.body;
		initFunctions.send_notification(db, null, postContent.user_id, postContent.notification_type, null, 0, postContent.collection, postContent.collection_id, function(notificationResult) {
    		res.send(notificationResult);
		});
	}else{
		outputObj["error"]   = "Authorization error!";
		res.send(outputObj);
	}
	
}); 

//team selection notification
app.post(backendDirectoryPath+'/team_selection_notification/', requireLogin, function(req, res) {
	var outputObj = new Object();
	
	if(req.authenticationBool){
		var postContent=req.body;
		if(postContent.team_name && postContent.selected_players  && postContent.team_name!="" && postContent.selected_players!=""){
			
			var emailPlainText='Hi {fullname},<br><br>You have been selected for '+postContent.team_name+'<br>{fixtureDetails}<br>{teamDetails}<br><a href="{available_link}" style=" color: #fff; background-color: #263973; padding: 10px 40px 10px 40px; text-decoration:none; "> Yes I can play </a><br><a href="{unavailable_link}" style=" color: #fff; background-color: #263973; padding: 10px 40px 10px 40px; text-decoration:none; "> No, I am unavailable </a><br>By,<br>{sender_name}';
			var emailFixtureDetails='', emailTeamDetails='';
			db.collection('email_templates').findOne({"code": "team-selection",  status : { $in: [ 1, "1" ] } }, function(err, templateResponse) {
				if(templateResponse){
  					if(templateResponse.template_content && templateResponse.template_content!=""){
						emailPlainText= templateResponse.template_content;
					}
  				}
  			
  			
  			var subjectStr='You have been selected for '+postContent.team_name;
  			  			
			var selected_playersArr=postContent.selected_players;
			if(typeof(postContent.selected_players)!=="array" && typeof(postContent.selected_players)!=="object"){
				selected_playersArr = JSON.parse(postContent.selected_players);
			}
			
			var notificationMsgStr= "", check_availability='', senderName='', date_timeStr='', oppositionTeamStr='', venueStr='';
			if(req.authenticatedUser){
				senderName += req.authenticatedUser.firstname;
				if(req.authenticatedUser.lastname){
					senderName +=" "+req.authenticatedUser.lastname;
				}
			}
			if(postContent.team_name){
				notificationMsgStr += "Team : "+postContent.team_name;
			}
			if(postContent.fixture_info && postContent.fixture_info!=""){
				date_timeStr=postContent.fixture_info;
				notificationMsgStr += "<br>Date : "+postContent.fixture_info;
			}
			if(postContent.fixture && postContent.fixture!=""){
				var fixtureDetails= postContent.fixture;
				if(typeof(postContent.fixture)!=="array" && typeof(postContent.fixture)!=="object"){
					fixtureDetails = JSON.parse(postContent.fixture);
				}
				var passedTimestamp = new Date(fixtureDetails.date_time * 1000);
     			var s_timestamp= passedTimestamp.setHours(0,0,0,0);
     			check_availability = parseInt(s_timestamp)/1000;
				
				notificationMsgStr += "<br>Match Details : "+fixtureDetails.home_team_name+" vs "+fixtureDetails.away_team_name;
				if(fixtureDetails.venue_name && fixtureDetails.venue_name!=""){
					notificationMsgStr += "at "+fixtureDetails.venue_name;
					venueStr='<a href="'+init.websiteUrl+'/venue?id='+fixtureDetails.venue_uuid+'" target="_blank">'+fixtureDetails.venue_name+'</a>';
				}
				if(postContent.team_name==fixtureDetails.home_team_name){
					oppositionTeamStr= fixtureDetails.away_team_name;
				} else {
					oppositionTeamStr= fixtureDetails.home_team_name;
				}
				emailFixtureDetails='<TABLE WIDTH="100%" BORDER="0" CELLSPACING="0" CELLPADDING="0"><tbody>';
				emailFixtureDetails+='<tr><TD STYLE="border:1px solid #ddd; padding:6px; background-color: #263973; color: #fff; border-bottom:none; border-right:none;">Date</td><TD STYLE="border:1px solid #ddd; padding:6px; border-bottom:none; ">'+date_timeStr+'</td></tr>';
				emailFixtureDetails+='<tr><TD STYLE="border:1px solid #ddd; padding:6px; background-color: #263973; color: #fff; border-bottom:none; border-right:none;">Team</td><TD STYLE="border:1px solid #ddd; padding:6px; border-bottom:none; ">'+postContent.team_name+'</td></tr>';
				emailFixtureDetails+='<tr><TD STYLE="border:1px solid #ddd; padding:6px; background-color: #263973; color: #fff; border-bottom:none; border-right:none;">Opposition</td><TD STYLE="border:1px solid #ddd; padding:6px; border-bottom:none; ">'+oppositionTeamStr+'</td></tr>';
				emailFixtureDetails+='<tr><TD STYLE="border:1px solid #ddd; padding:6px; background-color: #263973; color: #fff; border-bottom:none; border-right:none;">Venue</td><TD STYLE="border:1px solid #ddd; padding:6px;">'+venueStr+'</td></tr>';
				emailFixtureDetails+='</tbody></table><br>';
			}
			
			
			//to do entry for notifications
			var notificationbulk = db.collection('notifications').initializeUnorderedBulkOp();
			emailTeamDetails+='<TABLE WIDTH="100%" BORDER="0" CELLSPACING="0" CELLPADDING="0"><tbody>';
			var totalUsers=selected_playersArr.length;
  			for(var i=0; i < selected_playersArr.length; i++){
  				var j=i+1;
  				var postContentArr={};
  				emailTeamDetails+='<tr><TD STYLE="border:1px solid #ddd; padding:6px; background-color: #263973; color: #fff; border-bottom:none; border-right:none;">'+j+'</td><TD STYLE="border:1px solid #ddd; padding:6px;';
  				if(totalUsers!=i){
					emailTeamDetails+='border-bottom:none; ">'+selected_playersArr[i].fullname;
				}
  				if(selected_playersArr[i].roles && selected_playersArr[i].roles!=""){
  					notificationMsgStr += "<br>Role : "+selected_playersArr[i].roles+"";
  					emailTeamDetails+=' ('+selected_playersArr[i].roles+')';
  				}
  				emailTeamDetails+='</td></tr>';
  				postContentArr["message_type"]= 'message';
  				postContentArr["read_status"]= 0;
  				postContentArr["subject"]= subjectStr;
  				postContentArr["check_availability"]= check_availability;
  				postContentArr["message"]= notificationMsgStr+"<br>By,<br>"+senderName;
  				postContentArr["collection_link_id"]= '';
  				postContentArr["collection_linked"]= 'notifications';
  				postContentArr["created"]= initFunctions.currentTimestamp();
  				postContentArr["notify_to"]= new mongodb.ObjectID(selected_playersArr[i].user_mongo_id);
  				notificationbulk.insert( postContentArr );
  				if(postContentArr._id)	{
  					delete postContentArr._id;
  				}
  			}
  			emailTeamDetails+='</tbody></table><br>';
  			notificationbulk.execute();
  			
  			//to save email_queue
  			var tokensGuidArr= new Array();
  			var saveBulkEmail = db.collection('email_queue').initializeUnorderedBulkOp();
			var data_to_Save_bool=false;
  			for(var i=0; i < selected_playersArr.length; i++){
  				if( selected_playersArr[i].send_notifications && selected_playersArr[i].send_notifications=="on"){
  					data_to_Save_bool=true;
  					var guidStr= initFunctions.guid();
  								 
  					var plaintext = emailPlainText.replace("{fullname}", selected_playersArr[i].fullname);
					plaintext = plaintext.replace(/{fixtureDetails}/g, emailFixtureDetails);
					plaintext = plaintext.replace(/{teamDetails}/g, emailTeamDetails);
					plaintext = plaintext.replace(/{sender_name}/g, senderName);
					if(check_availability!=""){
						var avaLink=init.websiteUrl+'/can_play?id='+guidStr;
						plaintext = plaintext.replace(/{available_link}/g, avaLink+'&availability=Available');
						plaintext = plaintext.replace(/{unavailable_link}/g, avaLink+'&availability=Unavailable');
					}	else {
						plaintext = plaintext.replace(/{available_link}/g, '');
						plaintext = plaintext.replace(/{unavailable_link}/g, '');
					}				
				
					var insertEmail=new Object();
					insertEmail["sender_name"]=selected_playersArr[i].fullname;
					insertEmail["sender_email"]=selected_playersArr[i].user_email;
					insertEmail["subject"]=subjectStr;
					insertEmail["body"]=plaintext;
					insertEmail["created"]=initFunctions.currentTimestamp();
					insertEmail["modified"]=initFunctions.currentTimestamp();
					insertEmail["recipient"]=init.recipientStr; // we can change with change in SMTP details
					insertEmail["status"]=0;
  					tokensGuidArr.push({'action' : 'availability', 'value': check_availability, 'uuid' : guidStr, 'user_id' : new mongodb.ObjectID(selected_playersArr[i].user_mongo_id)});
  					saveBulkEmail.insert( insertEmail );
  					if(insertEmail._id)	{
  						delete insertEmail._id;
  					}
  				}
  			}
  			
  			if(data_to_Save_bool){
  				saveBulkEmail.execute();
  				if(tokensGuidArr.length>0){
  					var saveBulkTokens = db.collection('authentication_token').initializeUnorderedBulkOp();
  					for(var i=0; i < tokensGuidArr.length; i++){
  						saveBulkTokens.insert( tokensGuidArr[i] );
  						if(insertEmail._id)	{
  							delete insertToken._id;
  						}
  					}
  					saveBulkTokens.execute();
  				}  			
  			}
  			outputObj["success"]   = "Notification sent successfully!";
  			res.send(outputObj);
  			
  			});
		} else {
			outputObj["error"]   = "Please pass all the required fields!";
			res.send(outputObj);
		}
	}else{
		outputObj["error"]   = "Authorization error!";
		res.send(outputObj);
	}	
}); 

//batch notification
app.post(backendDirectoryPath+'/batch_notification/', requireLogin, function(req, res) {
	var outputObj = new Object();
	
	if(req.authenticationBool){
		var postContent=req.body;
		if(postContent.subject && postContent.message  && postContent.message!="" && postContent.notify_to && postContent.notify_to!=""){
			
			var emailPlainText='Hello {fullname},<br><br>Please click on the following link to view your notification :<br><a href="{linkStr}" target="_blank">{linkStr}</a>';
  			var emailSubjectStr='You have a new notification';
  			db.collection('email_templates').findOne({"code": "notifications",  status : { $in: [ 1, "1" ] } }, function(err, templateResponse) {
				if(templateResponse){
  					if(templateResponse.template_content && templateResponse.template_content!=""){
						emailPlainText= templateResponse.template_content;
  					}
  				}
  			});
  			
  			
			var notifyToArr=postContent.notify_to;
			if(typeof(postContent.notify_to)!=="array" && typeof(postContent.notify_to)!=="object"){
				notifyToArr = JSON.parse(postContent.notify_to);
			}
						
			var msgStr= "", check_availability='';
			if(postContent.fixture){
				msgStr += "Match Details :"+postContent.fixture+"<br>";
			}
			if(postContent.team_name){
				msgStr += "Team : "+postContent.team_name+"<br>";
			}
			if(postContent.check_availability && postContent.check_availability!=""){
				check_availability = parseInt(postContent.check_availability);
			}
			msgStr += postContent.message;
			
			if(req.authenticatedUser){
				msgStr += "<br>By,<br>"+req.authenticatedUser.firstname;
				if(req.authenticatedUser.lastname){
					msgStr +=" "+req.authenticatedUser.lastname;
				}
			}
			var guidArr= new Array();
  			var bulk = db.collection('notifications').initializeUnorderedBulkOp();
  			for(var i=0; i < notifyToArr.length; i++){
  				var postContentArr={};
  				var guidStr= initFunctions.guid();
  				postContentArr["message_type"]= 'message';
  				postContentArr["read_status"]= 0;
  				postContentArr["subject"]= postContent.subject;
  				postContentArr["check_availability"]= check_availability;
  				postContentArr["message"]= msgStr;
  				postContentArr["collection_link_id"]= '';
  				postContentArr["collection_linked"]= 'notifications';
  				postContentArr["created"]= initFunctions.currentTimestamp();
  				postContentArr["notify_to"]= new mongodb.ObjectID(notifyToArr[i]);
  				postContentArr["uuid"]= guidStr;
  				guidArr.push(guidStr);
   				bulk.insert( postContentArr );
  				if(postContentArr._id)	{
  					delete postContentArr._id;
  				}
  			}
  			bulk.execute();
  			
  			db.collection('notifications').aggregate([
   				{
      				$lookup:
        				{
          					from: "users",
          					localField: "notify_to",
          					foreignField: "_id",
          					as: "users_data"
        				}
  					},
  					{ $match : { uuid : { '$in': guidArr } } } 
				]).toArray(function(err, notificationsArr) {
					var saveBulkEmail = db.collection('email_queue').initializeUnorderedBulkOp();
					var data_to_Save_bool=false;
					
					for(var i=0; i<notificationsArr.length; i++) {
						var userArr=notificationsArr[i].users_data;
						if(userArr[0].send_notifications=="on"){
							data_to_Save_bool=true;
							var urlStr= init.appUrl;
							if(userArr[0].allow_web_access && (userArr[0].allow_web_access==1 || userArr[0].allow_web_access=="1"))	{
								urlStr= init.websiteUrl;
							}
							var hrefStr= urlStr+'/notification?token='+notificationsArr[i]._id;
							var plaintext = emailPlainText.replace("{fullname}", userArr[0].firstname);
							plaintext = plaintext.replace(/{linkStr}/g, hrefStr);		
							
							var insertEmail=new Object();
							insertEmail["sender_name"]=userArr[0].firstname;
							insertEmail["sender_email"]=userArr[0].email;
							insertEmail["subject"]=emailSubjectStr;
							insertEmail["body"]=plaintext;
							insertEmail["created"]=initFunctions.currentTimestamp();
							insertEmail["modified"]=initFunctions.currentTimestamp();
							insertEmail["recipient"]=init.recipientStr; // we can change with change in SMTP details
							//insertEmail["recipient"]=req.authenticatedUser.email;
							insertEmail["status"]=0;
  							saveBulkEmail.insert( insertEmail );
  							if(insertEmail._id)	{
  								delete insertEmail._id;
  							}
  						}
  					}
  					if(data_to_Save_bool){
  						saveBulkEmail.execute();
  					}
  					outputObj["success"]   = "Notification sent successfully!";
  					res.send(outputObj);
				});	
		} else {
			outputObj["error"]   = "Please pass all the required fields!";
			res.send(outputObj);
		}
	}else{
		outputObj["error"]   = "Authorization error!";
		res.send(outputObj);
	}	
}); 

//push_team_to_history
app.post(backendDirectoryPath+'/push_team_to_history/', requireLogin, function(req, res) {
	var outputObj = new Object();
	
	if(req.authenticationBool){
		var postContent=req.body;
		if(postContent.team && postContent.team!=""){
			initFunctions.returnFindOneByMongoID(db, 'teams', postContent.team, function(resultObject) {
				if(resultObject.aaData){
					var teamDetailObj= resultObject.aaData;
					var teamArr = new Array(teamDetailObj._id);
					
					var historyObj= new Object();
					historyObj['date_time'] = initFunctions.currentTimestamp();
					historyObj['created'] = initFunctions.currentTimestamp();
					historyObj['modified'] = initFunctions.currentTimestamp();
					historyObj['home_team_name'] = teamDetailObj.name;
					historyObj['away_team_name'] = '';
					historyObj['home_team_uuid'] = teamDetailObj._id.toString();
					historyObj['away_team_uuid'] = '';
					historyObj['venue_name'] = '';
					historyObj['venue_uuid'] = '';
					historyObj['publish_on_web'] = false;
					historyObj['fixture_event_uuid'] = "";
					historyObj['type'] = "team_details";
					
					historyObj['away_team_details'] = new Object();
					delete teamDetailObj._id;
   					historyObj['home_team_details'] = teamDetailObj;
   					
   					initFunctions.create_fixtures_history(db, historyObj, teamArr, function(result) {
						res.send(result);
					});
				}	else	{
					outputObj["error"]   = "Sorry, no such team found in database!";
					res.send(outputObj);
				}
			});
		} else {
			outputObj["error"]   = "Please pass the valid parameter!";
			res.send(outputObj);
		}
	}else{
		outputObj["error"]   = "Authorization error!";
		res.send(outputObj);
	}	
}); 

//pull_team_from_history
app.post(backendDirectoryPath+'/pull_team_from_history/', requireLogin, function(req, res) {
	var outputObj = new Object();
	
	if(req.authenticationBool){
		var postContent=req.body;
		if(postContent.team && postContent.team!="" && postContent.history_id && postContent.history_id!=""){
			initFunctions.returnFindOneByMongoID(db, 'fixtures_history', postContent.history_id, function(resultObject) {
				if(resultObject.aaData){
					var historyDetails = resultObject.aaData, teamPlayersArr=new Array();
      				if(historyDetails.home_team_uuid == postContent.team && historyDetails.home_team_details  && historyDetails.home_team_details.players){
      					teamPlayersArr = historyDetails.home_team_details.players;
      				}
      				if(historyDetails.away_team_uuid == postContent.team && historyDetails.away_team_details  && historyDetails.away_team_details.players){
      					teamPlayersArr = historyDetails.away_team_details.players;
      				}
					if(teamPlayersArr.length>0){
      					db.collection("teams").update({_id : new mongodb.ObjectId(postContent.team) }, {'$set' : {"players" : teamPlayersArr }}, (err1, response1) => {
      						outputObj["success"]   = "Successfully reset the team from history!";
      						res.send(outputObj);
      					});
      				}else{
      					outputObj["error"]   = "Sorry, no players found in this team!";
						res.send(outputObj);
      				}
				}	else	{
					outputObj["error"]   = "Sorry, no such team found in database!";
					res.send(outputObj);
				}
			});
		} else {
			outputObj["error"]   = "Please pass the valid parameter!";
			res.send(outputObj);
		}
	}else{
		outputObj["error"]   = "Authorization error!";
		res.send(outputObj);
	}	
}); 

//post api of change status
app.post(backendDirectoryPath+'/api_change_status/', requireLogin, function(req, res) {
	var selected_values_str="", statusNum="", collectionStr="", fieldNameStr='';
	var outputObj = new Object();
	
	if(req.authenticationBool){
		if(req.body.collection){
			collectionStr=req.body.collection;
		}
	
		if(req.body.selected_values){
			selected_values_str=req.body.selected_values;
		}
	
		if(req.body.status){
			statusNum=parseInt(req.body.status);
		}
		if(req.body.status_field){
			fieldNameStr= req.body.status_field;
		}
		
		if(collectionStr!="" && selected_values_str!="" && fieldNameStr!=""){
			var selectedArr = selected_values_str.split(',');
			
			if(selectedArr && selectedArr.length>0)	{
				var definedRowIdArr=new Array();
			
				//loop and convert in mongo object id
				for (var i=0; i < selectedArr.length; i++) {
					var tempID=new mongodb.ObjectID(selectedArr[i]);
					definedRowIdArr.push(tempID);
				}
				var updateQueryStr = "{'$set' : {"+fieldNameStr+" : "+statusNum+" }}";
				eval('var updateQuery='+updateQueryStr);
    			db.collection(collectionStr).update({_id : { $in: definedRowIdArr } }, updateQuery, { multi: true }, (err1, response1) => {
      				if(err1){
      					outputObj["error"]   = "Error while updating status!";
      				}else{
      					outputObj["success"]   = "Successfully changed the status of selected items!";
      				}
      				res.send(outputObj);
      			});
      		} else {
      			outputObj["error"]   = "Please select some items before performing action!";
				res.send(outputObj);
      		}	
		}else{
			outputObj["error"]   = "Please pass all the required parameters!";
			res.send(outputObj);
		}
	}else{
		outputObj["error"]   = "Authorization error!";
		res.send(outputObj);
	}
}); 

// post api to delete records
app.post(backendDirectoryPath+'/delete/', requireLogin, function(req, res) {
	var selected_values_str="", collectionStr="", outputObj = new Object();
	
	if(req.authenticationBool){
		if(req.body.collection){
			collectionStr=req.body.collection;
		}
	
		if(req.body.selected_values){
			selected_values_str=req.body.selected_values;
		}
		
		if(collectionStr!="" && selected_values_str!=""){
			var selectedArr = selected_values_str.split(',');
			
			if(selectedArr && selectedArr.length>0)	{
				var definedRowIdArr=new Array();
			
				//loop and convert in mongo object id
				for (var i=0; i < selectedArr.length; i++) {
					var tempID=new mongodb.ObjectID(selectedArr[i]);
					definedRowIdArr.push(tempID);
				}
				db.collection(collectionStr).remove({_id : { $in: definedRowIdArr } }, (err, result) => {
      				if(err){
      					outputObj["error"]   = "Error while deleting data!";
      				}else{
      					outputObj["success"]   = "Successfully deleted the selected items!";
      				}
      				res.send(outputObj);
      			});
      		} else {
      			outputObj["error"]   = "Please select some items to delete!";
				res.send(outputObj);
      		}	
		}else{
			outputObj["error"]   = "Please pass all the required parameters!";
			res.send(outputObj);
		}
	}else{
		outputObj["error"]   = "Authorization error!";
		res.send(outputObj);
	}
}); 

//post api of CRUD
app.post(backendDirectoryPath+'/api_crud_post/', requireLogin, function(req, res) {
	var uniqueFieldNameStr = "", uniqueFieldValueStr="", actionStr="", collectionStr="";
	var outputObj = new Object();
	
	if(req.authenticationBool){
		var postContent=req.body;
		
		if(req.body.collection){
			collectionStr=req.body.collection;
			delete postContent['collection']; 
		}
	
		if(req.body.action){
			actionStr=req.body.action;
			delete postContent['action']; 
		}
	
		if(req.body.fieldName){
			uniqueFieldNameStr=req.body.fieldName;
			delete postContent['fieldName']; 
		}
	
		if(req.body.fieldValue){
			uniqueFieldValueStr=req.body.fieldValue;
			delete postContent['fieldValue']; 
		}
		
		if(collectionStr!=""){
			initFunctions.crudOpertions(db, collectionStr, actionStr, postContent, uniqueFieldNameStr, uniqueFieldValueStr, null, function(result) {
				res.send(result);
			});	
		}else{
			outputObj["error"]   = "Please pass the collection name!";
			res.send(outputObj);
		}
	}else{
		outputObj["error"]   = "Authorization error!";
		res.send(outputObj);
	}
}); 

//get api of CRUD
app.get(backendDirectoryPath+'/api_crud_get/', requireLogin, function(req, res) {
	var uniqueFieldNameStr = "", uniqueFieldValueStr="", actionStr="", collectionStr="";
	var outputObj = new Object();
	
	if(req.authenticationBool){
		var getContent=req.query;
		
		if(req.query.collection){
			collectionStr=req.query.collection;
			delete getContent['collection']; 
		}
	
		if(req.query.action){
			actionStr=req.query.action;
			delete getContent['action']; 
		}
	
		if(req.query.fieldName){
			uniqueFieldNameStr=req.query.fieldName;
			delete getContent['fieldName']; 
		}
	
		if(req.query.fieldValue){
			uniqueFieldValueStr=req.query.fieldValue;
			delete getContent['fieldValue']; 
		}
		
		if(collectionStr!=""){
			/**if(uniqueFieldNameStr=="_id" && actionStr=="findOne"){
				initFunctions.returnFindOneByMongoID(db, collectionStr, uniqueFieldValueStr, function(resultObject) {
					res.send(resultObject);
				});
			}	else	{**/
				initFunctions.crudOpertions(db, collectionStr, actionStr, getContent, uniqueFieldNameStr, uniqueFieldValueStr, null, function(result) {
					res.send(result);
				});	
			//}
		}else{
			outputObj["error"]   = "Please pass the collection name!";
			res.send(outputObj);
		}
	}else{
		outputObj["error"]   = "Authorization error!";
		res.send(outputObj);
	}
}); 

//api to fetch all collection names
app.get(backendDirectoryPath+'/api_fetch_collections/', requireLogin, function(req, res) {
	var outputObj = new Object();
	
	if(req.authenticationBool){
		initFunctions.returnAllCollections(db, function(result) {	
			res.send(result);
		});
	}else{
		outputObj["error"]   = "Authorization error!";
		res.send(outputObj);
	}
}); 

//change session for user selected system
app.get(backendDirectoryPath+'/swtich_user_system/', requireLogin, function(req, res) {
	var outputObj = new Object();
	
	if(req.authenticationBool){
		var tempID=req.query.id;
		tempID=new mongodb.ObjectID(tempID);
		
		db.collection("sessions").update({_id: req.authenticatedUser.auth_id, 'user_id':req.authenticatedUser._id, 'active_system_uuid':req.authenticatedUser.active_system_uuid}, {'$set' : {"active_system_uuid" : tempID}}, (err, result) => {
			if(result){
    			outputObj["success"]   = "OK";
				res.send(outputObj);
    		}else{
    			outputObj["error"]   = "Error occurred while switch!";
				res.send(outputObj);
			}
    	});
	}else{
		outputObj["error"]   = "You are not authorizied!";
		res.send(outputObj);
	}
});

//api_next_sequence_number
app.get(backendDirectoryPath+'/api_next_sequence_number/', requireLogin, function(req, res) {
	var resultObj = new Object();
	
	if(req.authenticationBool){
		if(req.query.table && req.query.table!=""){
			if(definedAdminTablesArr.indexOf(req.query.table)==-1){
				var query = { 'uuid_system' : req.authenticatedUser.active_system_uuid.toString() };
			} else {
				var query = {};
			}
			
			db.collection(req.query.table).find(query).count(function (e, count) {
				if(count){
					resultObj["seq_num"] = count+1;
				} else {
					resultObj["seq_num"] = 1;
				}
				res.send(resultObj);
			});
    	}else{
    		resultObj["seq_num"] = 1;
			res.send(resultObj);
    	}
	}else{
		resultObj["seq_num"] = 1;
		res.send(resultObj);
	}
});

//api_unique_username
app.get(backendDirectoryPath+'/api_unique_username/', requireLogin, function(req, res) {
	var resultObj = new Object();
	
	if(req.authenticationBool){
		if(req.query.firstname && req.query.firstname!=""){
			var temp_name=req.query.firstname;
			if(req.query.lastname && req.query.lastname!=""){
				temp_name+="."+req.query.lastname;
			}
			temp_name=temp_name.toLowerCase();
			db.collection('users').findOne({ 'username': temp_name }, function(err, document) {
				if (document && document!="") {
					var tempNameArr = new Array();
					tempNameArr.push(temp_name+Math.floor(100 + Math.random() * 900));
					tempNameArr.push(temp_name+Math.floor(100 + Math.random() * 900));
					db.collection('users').find({'username' : { $in: tempNameArr } }, {"username" : 1}).toArray(function(err, documents) {
      					if(documents && documents.length>0)	{
      						var returnUserNameStr= '';
      						for(var i=0; i< documents.length; i++){
								if(tempNameArr.indexOf(documents[i].username)>-1){
									var posNum= tempNameArr.indexOf(documents[i].username);
									if (posNum > -1) {
    									tempNameArr.splice(posNum, 1);
									}
								}
							}
							if(tempNameArr.length>0)	{
								resultObj["success"]   = tempNameArr[0];
							} else	{
								resultObj["success"]   = temp_name+Math.floor(100 + Math.random() * 900);
							}	
      					}	else	{
      						resultObj["success"]   = temp_name+Math.floor(100 + Math.random() * 900);
						}
      					res.send(resultObj);
      				});
				}else{
					resultObj["success"]   = temp_name;
					res.send(resultObj);
				}
			});
    	}else{
    		resultObj["error"]   = 'Please pass the name!';
			res.send(resultObj);
    	}
	}else{
		outputObj["error"]   = "You are not authorizied!";
		res.send(resultObj);
	}
});

//get logged in user systems
app.get(backendDirectoryPath+'/fetch_user_systems/', requireLogin, function(req, res) {
	var outputObj = new Object();
	
	if(req.authenticationBool){
		if(req.authenticatedUser.shared_systems!=""){
			var userSysArr= req.authenticatedUser.shared_systems;
			if(userSysArr!="" && typeof(userSysArr)!="undefined" && typeof(userSysArr)!="null" && typeof(userSysArr)!=="array" && typeof(userSysArr)!=="object"){
				userSysArr = JSON.parse(userSysArr);
			}
		}else if(req.authenticatedUser.active_system_uuid && req.authenticatedUser.active_system_uuid!=""){
			var userSysArr= new Array(req.authenticatedUser.active_system_uuid);
		}
		
		if(userSysArr && userSysArr.length>0)	{
		
			var definedSystemArr=new Array();
			//loop and convert in mongo object id
			for (var i=0; i < userSysArr.length; i++) {
				var tempID=new mongodb.ObjectID(userSysArr[i]);
				definedSystemArr.push(tempID);
			}
			outputObj["active_system"]  =req.authenticatedUser.active_system_uuid;
		
			db.collection('systems').find({_id : { '$in': definedSystemArr }}, {'name' :1, 'logo_path' : 1}).sort({name: 1}).toArray(function(err, items) {
				if (err) {
					outputObj["error"]   = 'not found';
					res.send(outputObj);
      			} else if (items) {
      				outputObj["aaData"]   = items;
      				res.send(outputObj);
      			}
			});
		}else{
			outputObj["error"]   = 'not found';
			res.send(outputObj);
		}
	}else{
		outputObj["error"]   = "You are not authorizied!";
		res.send(outputObj);
	}
});

//load navigator
app.get(backendDirectoryPath+'/load_navigator/', requireLogin, function(req, res) {
	var collectionStr="modules";
	var outputObj = new Object();
		
	if(req.authenticationBool){
		var loggedInUser = req.authenticatedUser;
		returnUserAssignedModules (loggedInUser._id, req, function(data) {
			res.send(data);
		});
	}else{
		outputObj["error"]   = "Authorization error!";
		res.send(outputObj);
	}
});

//api to fetch groups in which logged in user
app.get(backendDirectoryPath+'/api_fetch_user_groups/', requireLogin, function(req, res) {
	var outputObj= new Object();
	if(req.authenticationBool){
		if(req.query._id && req.query._id!=""){
		db.collection('groups').find({"users_list": { $in: new Array(req.query._id.toString()) }, "status": { $in: [ 1, "1" ] }}, {"name" : 1}).toArray(function(g_err, g_details) {
			if(g_details && g_details.length>0){
				outputObj["aaData"]   = g_details;
			}	else {
				outputObj["error"]   = "Sorry, user is not present in any group";
			}
			res.send(outputObj);
		});
		}else{
			outputObj["error"]   = "Please pass the required parameters!";
			res.send(outputObj);
		}
	}else{
		outputObj["error"]   = "Authorization error!";
		res.send(outputObj);
	}
});

//GENERIC: fetch listing depending upon collection or template passed
app.get(backendDirectoryPath+'/api_fetch_applications/', requireLogin, function(req, res) {
	var itemsPerPage = 10, pageNum=1, collectionStr="job_applications", outputObj = new Object();
	
	if(req.query.collection){
		collectionStr=req.query.collection;
	}
	if(req.query.start){
		pageNum=parseInt(req.query.start);
	}
	if(req.query.limit){
		itemsPerPage=parseInt(req.query.limit);
	}
	if(pageNum==0){
		pageNum=1;
	}
	
	if(req.authenticationBool){
		var activeSystemsStr=req.authenticatedUser.active_system_uuid.toString();
		if(collectionStr!=""){
			var total_records=0;
			var coll= db.collection(collectionStr);
				
			var query="";
			if (typeof activeSystemsStr !== 'undefined' && activeSystemsStr !== null && activeSystemsStr!="") {
				query+=" $or: [ { 'uuid_system' : { $in: ['"+activeSystemsStr+"'] } }, { 'shared_systems': { $in: ['"+activeSystemsStr+"'] } } ] ";
			}
			//search by criteria passed
			if(req.query.s){
				//create text index
     			coll.createIndex({ "$**": "text" },{ name: "TextIndex" });
     			if(query!=""){
     				query+=",";
     			}
     			query+=" '$text': { '$search': '"+req.query.s+"' } ";
     		}
     		if(req.query.location && req.query.location!==""){
				if(req.query.radius && req.query.radius!==""){
     				db.collection('uk_towns_cities').findOne({_id: new mongodb.ObjectID(req.query.location)}, function(landmarkErr, landmark) {
						if(landmark && landmark.postcode && landmark.postcode!=""){
							var radiusSearchQueryStr = {
    							"loc" : {
        							$geoWithin : {	$centerSphere : [landmark.loc.coordinates, initFunctions.milesToRadian(req.query.radius) ]	}
    							}
							};
							db.collection('uk_towns_cities').find(radiusSearchQueryStr, {postcode :1 }).toArray(function(landmark_err, landmark_items) {
								if(landmark_items && landmark_items.length>0){
									var postCodeStr= new Array();
									for(var j=0; j<landmark_items.length; j++)	{
										if(postCodeStr!=""){
											postCodeStr+=",";
										}
      									postCodeStr+="'"+landmark_items[j].postcode+"'";
      								}
      								if(query!=""){
     									query+=",";
     								}
     								query+=" 'postcode': { $in: ["+postCodeStr+"]} ";
     								eval('var queryObj='+"{"+query+"}");
     								coll.find(queryObj).count(function (e, count) {
      									total_records= count;
      								});
									coll.find(queryObj).sort({modified: -1}).skip(pageNum-1).limit(itemsPerPage).toArray(function(err, items) {
										if (err) {
											outputObj["total"]   = 0;
											outputObj["iTotalRecordsReturned"]   = 0;
      										outputObj["error"]   = 'not found';
      									} else if (items) {
      										outputObj["total"]   = total_records;
      										outputObj["iTotalRecordsReturned"]   = items.length;
      										outputObj["aaData"]   = items;
										}
										res.send(outputObj);
									});
								}else{
									outputObj["total"]   = 0;
									outputObj["iTotalRecordsReturned"]   = 0;
      								outputObj["error"]   = 'not found';
								}								
							});
						}
					});
     			}   else {
					db.collection('uk_towns_cities').findOne({_id: new mongodb.ObjectID(req.query.location)}, function(landmarkErr, landmark) {
						if(landmark && landmark.postcode && landmark.postcode!=""){
							if(query!=""){
     							query+=",";
     						}
     						query+=" 'postcode': '"+landmark.postcode+"' ";
						}
						eval('var queryObj='+"{"+query+"}");
						coll.find(queryObj).count(function (e, count) {
      						total_records= count;
      					});
						coll.find(queryObj).sort({modified: -1}).skip(pageNum-1).limit(itemsPerPage).toArray(function(err, items) {
							if (err) {
								outputObj["total"]   = 0;
								outputObj["iTotalRecordsReturned"]   = 0;
      							outputObj["error"]   = 'not found';
      						} else if (items) {
      							outputObj["total"]   = total_records;
      							outputObj["iTotalRecordsReturned"]   = items.length;
      							outputObj["aaData"]   = items;
							}
							res.send(outputObj);
						});
					});
     			}
			} else {
     			eval('var queryObj='+"{"+query+"}");
     			coll.find(queryObj).count(function (e, count) {
      				total_records= count;
      			});
				coll.find(queryObj).sort({modified: -1}).skip(pageNum-1).limit(itemsPerPage).toArray(function(err, items) {
					if (err) {
						outputObj["total"]   = 0;
						outputObj["iTotalRecordsReturned"]   = 0;
      					outputObj["error"]   = 'not found';
						res.send(outputObj);
      				} else if (items) {
      					outputObj["total"]   = total_records;
      					outputObj["iTotalRecordsReturned"]   = items.length;
      					outputObj["aaData"]   = items;
						res.send(outputObj);
     				}
				});
			}
		}else{
			outputObj["total"]   = 0;
			outputObj["iTotalRecordsReturned"]   = 0;
      		outputObj["error"]   = "No such page exists!";
			res.send(outputObj);
		}
	}else{
		outputObj["total"]   = 0;
		outputObj["iTotalRecordsReturned"]   = 0;
      	outputObj["error"]   = "Authorization error!";
		res.send(outputObj);
	}
}); 

//fetch uploaded files for a particular collection and its id
app.get(backendDirectoryPath+'/api_fetch_uploads/', requireLogin, function(req, res) {
	var itemsPerPage = 10, pageNum=1, collectionStr="", collectionID="", outputObj = new Object();
	
	if(req.query.collection){
		collectionStr=req.query.collection;
	}
	if(req.query.id){
		collectionID=req.query.id;
	}
	if(req.query.start){
		pageNum=parseInt(req.query.start);
	}
	if(req.query.limit){
		itemsPerPage=parseInt(req.query.limit);
	}
	
	if(pageNum==0){
		pageNum=1;
	}
	
	if(req.authenticationBool){
		var activeSystemsStr=req.authenticatedUser.active_system_uuid.toString();
			
			if(collectionStr!="" && collectionID!=""){
				var query="{ 'metadata.uuid_system': { $in: ['"+activeSystemsStr+"'] }, 'metadata.related_collection' : '"+collectionStr+"',  'metadata.collection_id' : '"+collectionID+"' }";
				
				var total_records=0;
				var coll= db.collection('fs.files');
				eval('var queryObj='+query);
     			coll.find(queryObj).count(function (e, count) {
      				total_records= count;
      			});
				coll.find(queryObj).sort({modified: -1}).skip(pageNum-1).limit(itemsPerPage).toArray(function(err, items) {
					if (err) {
						outputObj["error"]   = 'not found';
						res.send(outputObj);
      				} else if (items) {
      					outputObj["total"]   = total_records;
      					outputObj["iTotalRecordsReturned"]   = items.length;
      					outputObj["aaData"]   = items;
						res.send(outputObj);
     				}
				});
			}else{
      			outputObj["error"]   = "Please pass the required parameters";
				res.send(outputObj);
			}
	}else{
      	outputObj["error"]   = "Authorization error!";
		res.send(outputObj);
	}
}); 

//GENERIC: fetch listing depending upon collection or template passed
app.get(backendDirectoryPath+'/api_fetch_list/', requireLogin, function(req, res) {
	var itemsPerPage = 10, pageNum=1, templateStr="", collectionStr="", returnAllResults="", findFieldNameStr="", findFieldValueStr="";
	var outputObj = new Object();
	if(req.query.templateStr){
		templateStr=req.query.templateStr;
	}
	if(req.query.collection){
		collectionStr=req.query.collection;
	}
	if(req.query.start){
		pageNum=parseInt(req.query.start);
	}
	if(req.query.limit){
		if(parseInt(req.query.limit)!=="NaN"){
			itemsPerPage=parseInt(req.query.limit);
		}else{
			returnAllResults="all";
		}
	}
	
	if(pageNum==0){
		pageNum=1;
	}
	if(req.query.findFieldName){
		findFieldNameStr=req.query.findFieldName;
	}
	if(req.query.findFieldValue){
		findFieldValueStr=req.query.findFieldValue;
	}
	
	if(req.authenticationBool){
		var activeSystemsStr=req.authenticatedUser.active_system_uuid.toString();
			
			if(templateStr!=""){
				initFunctions.templateSearch(db, templateStr, activeSystemsStr, req, function(resultObject) {
					res.send(resultObject);
				});
			}else if(collectionStr!=""){
				var query="{";
				
				if (typeof activeSystemsStr !== 'undefined' && activeSystemsStr !== null && activeSystemsStr!="") {
					if(definedAdminTablesArr.indexOf(collectionStr)==-1){
						if(collectionStr=="fs.files"){
							query+=" 'metadata.uuid_system': { $in: ['"+activeSystemsStr+"'] }, 'contentType' : new RegExp('^image') ";
						}else{
							query+=" $or: [ { 'uuid_system' : { $in: ['"+activeSystemsStr+"'] } }, { 'shared_systems': { $in: ['"+activeSystemsStr+"'] } } ] ";
						}
					}
				}
				if(collectionStr=="activity_log"){
					if(query!="{"){
     					query+=",";
     				}
     				query+=" 'user_mongo_id': '"+req.authenticatedUser._id+"' ";
				}
				//search by criteria passed
				if(findFieldValueStr!="" && findFieldNameStr!=""){
					if(query!="{"){
     					query+=",";
     				}
     				
     				if(parseInt(findFieldValueStr)!=="NaN"){
						query+=" '"+findFieldNameStr+"': { $in: ["+parseInt(findFieldValueStr)+", '"+findFieldValueStr+"'] } ";
					}else{
						query+=" '"+findFieldNameStr+"': { $in: ['"+findFieldValueStr+"'] } ";
					}
				}
				
				var total_records=0;
				var coll= db.collection(collectionStr);
				if(req.query.s){
					//create text index
     				coll.createIndex({ "$**": "text" },{ name: "TextIndex" });
     				if(query!="{"){
     					query+=",";
     				}
     				query+=" '$text': { '$search': '"+req.query.s+"' } ";
     			}
     			query+= "}";
     			eval('var queryObj='+query);
     			coll.find(queryObj).count(function (e, count) {
      				total_records= count;
      			});
      			if(returnAllResults=="all"){
      				coll.find(queryObj).sort({modified: -1}).toArray(function(err, items) {
						if (err) {
							outputObj["total"]   = 0;
							outputObj["iTotalRecordsReturned"]   = 0;
      						outputObj["error"]   = 'not found';
							res.send(outputObj);
      					} else if (items) {
      						outputObj["total"]   = total_records;
							outputObj["iTotalRecordsReturned"]   = items.length;
      						outputObj["aaData"]   = items;
							res.send(outputObj);
     					}
					});
      			}else{
				coll.find(queryObj).sort({modified: -1}).skip(pageNum-1).limit(itemsPerPage).toArray(function(err, items) {
					if (err) {
						outputObj["total"]   = 0;
						outputObj["iTotalRecordsReturned"]   = 0;
      					outputObj["error"]   = 'not found';
						res.send(outputObj);
      				} else if (items) {
      					outputObj["total"]   = total_records;
      					outputObj["iTotalRecordsReturned"]   = items.length;
      					outputObj["aaData"]   = items;
						res.send(outputObj);
     				}
				});
				}
			}else{
				outputObj["total"]   = 0;
				outputObj["iTotalRecordsReturned"]   = 0;
      			outputObj["error"]   = "No such page exists!";
				res.send(outputObj);
			}
		
	}else{
		outputObj["total"]   = 0;
		outputObj["iTotalRecordsReturned"]   = 0;
      	outputObj["error"]   = "Authorization error!";
		res.send(outputObj);
	}
}); 

//fetch collection rows depending upon timestamp passed
app.get(backendDirectoryPath+'/api_fetch_timestamp_based_list/', requireLogin, function(req, res) {
	var collectionStr="", s_timestamp=0, e_timestamp=0;
	var outputObj = new Object();
	if(req.query.collection){
		collectionStr=req.query.collection;
	}
	if(req.query.start_timestamp){
		s_timestamp=req.query.start_timestamp;
	}
	if(req.query.end_timestamp){
		e_timestamp=req.query.end_timestamp;
	}
	
	if(req.authenticationBool){
		var activeSystemsStr=req.authenticatedUser.active_system_uuid.toString();
			
			if(collectionStr!="" && s_timestamp!==0 && e_timestamp!==0){
				var query="{";
				
				if (typeof activeSystemsStr !== 'undefined' && activeSystemsStr !== null && activeSystemsStr!="") {
					if(definedAdminTablesArr.indexOf(collectionStr)==-1){
						query+=" 'uuid_system' : { $in: ['"+activeSystemsStr+"'] } ";
					}
				}
				
				if(s_timestamp!==0 && e_timestamp!==0){
					if(query!="{"){
     					query+=",";
     				}
     				query+=" $and: [ { 'start_timestamp' : { $gte: '"+s_timestamp+"' } }, { 'end_timestamp': { $lte: '"+e_timestamp+"' } } ] ";
				}
				
				var coll= db.collection(collectionStr);
				
     			query+= "}";
     			//console.log(query);
     			eval('var queryObj='+query);
     			
      			coll.find(queryObj).toArray(function(err, items) {
					if (err) {
						outputObj["iTotalRecordsReturned"]   = 0;
      					outputObj["error"]   = 'not found';
						res.send(outputObj);
      				} else if (items) {
      					outputObj["iTotalRecordsReturned"]   = items.length;
      					outputObj["aaData"]   = items;
						res.send(outputObj);
     				}
				});
			}else{
				outputObj["iTotalRecordsReturned"]   = 0;
      			outputObj["error"]   = "Please pass the required parameters!";
				res.send(outputObj);
			}
		
	}else{
		outputObj["iTotalRecordsReturned"]   = 0;
      	outputObj["error"]   = "Authorization error!";
		res.send(outputObj);
	}
}); 

//fetch history listing depending upon collection
app.get(backendDirectoryPath+'/api_fetch_history/', requireLogin, function(req, res) {
	var itemsPerPage = 10, pageNum=1, collectionStr="", findFieldValueStr="";
	var outputObj = new Object();
	
	if(req.query.collection){
		collectionStr=req.query.collection;
	}
	if(req.query.start){
		pageNum=parseInt(req.query.start);
	}
	if(req.query.limit){
		itemsPerPage=parseInt(req.query.limit);
	}
	
	if(pageNum==0){
		pageNum=1;
	}
	if(req.query.id){
		findFieldValueStr=req.query.id;
	}
	if(req.authenticationBool){
		if(collectionStr!=""){
			init.MongoClient.connect('mongodb://localhost:27017/'+init.historyDatabaseName, function (connErr, historyDB) {
				if (connErr) {
    				outputObj["error"]  = 'Unable to connect to the mongoDB server.';	cb(outputObj);
  				} else {
					historyDB.collection(collectionStr).find({'history_row_id': new mongodb.ObjectID(findFieldValueStr)}).sort({history_created_timestamp: -1}).skip(pageNum-1).limit(itemsPerPage).toArray(function(err, items) {
						if (err) {
							outputObj["error"]   = 'Sorry, no history found!';
						} else if (items) {
      						outputObj["aaData"]   = items;
						}
						historyDB.close();
     					res.send(outputObj);
					});
				}
			});
		}else{
			outputObj["error"]   = "Please pass the table name!";
			res.send(outputObj);
		}
	}else{
		outputObj["error"]   = "Authorization error!";
		res.send(outputObj);
	}
}); 

//api_fixture_history
app.get(backendDirectoryPath+'/api_fixture_history/', requireLogin, function(req, res) {
	var itemsPerPage = 10, pageNum=1, collectionStr="fixtures_history", selectedTeamUUIDStr="", total_records=0;
	var outputObj = new Object();
	
	if(req.query.start){
		pageNum=parseInt(req.query.start);
	}
	if(req.query.limit){
		itemsPerPage=parseInt(req.query.limit);
	}
	if(req.query.id){
		selectedTeamUUIDStr=req.query.id;
	}
	if(pageNum==0){
		pageNum=1;
	}
	
	
	if(req.authenticationBool){
		db.collection(collectionStr).find({$or: [ { 'home_team_uuid' : selectedTeamUUIDStr }, { 'away_team_uuid': selectedTeamUUIDStr } ]}).count(function (e, count) {
      		total_records= count;
      	});
     	db.collection(collectionStr).find({$or: [ { 'home_team_uuid' : selectedTeamUUIDStr }, { 'away_team_uuid': selectedTeamUUIDStr } ]}).sort({date_time: 1}).skip(pageNum-1).limit(itemsPerPage).toArray(function(err, items) {
			outputObj["total"]   = total_records;
			if (items) {
				var playersArr=new Array();
      			outputObj["aaData"]   = items;
      			for(var i=0; i<items.length; i++){
      				var subItemObj =items[i], teamPlayersArr=new Array();
      				if(subItemObj.home_team_uuid == selectedTeamUUIDStr && subItemObj.home_team_details  && subItemObj.home_team_details.players){
      					teamPlayersArr = subItemObj.home_team_details.players;
      				}
      				if(subItemObj.away_team_uuid == selectedTeamUUIDStr && subItemObj.away_team_details  && subItemObj.away_team_details.players){
      					teamPlayersArr = subItemObj.away_team_details.players;
      				}
      				
      				if(teamPlayersArr.length>0)	{
      					for(var j=0; j<teamPlayersArr.length; j++)	{
      						playersArr.push(new mongodb.ObjectID(teamPlayersArr[j].user_mongo_id));
      					}
      				}
      				
      			}
      			if(playersArr.length>0)	{
      				db.collection('users').find({_id : { '$in': playersArr }}, {firstname :1, lastname : 1, email :1}).sort({firstname: -1}).toArray(function(usererr, useritems) {
						if(useritems){
							outputObj["player_details"]=useritems;
						}
						res.send(outputObj);
					});
      			}	else {
					res.send(outputObj);
				}
     		}	else {
     			outputObj["error"]   = 'Sorry, no information found!';
				res.send(outputObj);
     		}
		});
	}else{
		outputObj["total"]   = 0;
      	outputObj["error"]   = "Authorization error!";
		res.send(outputObj);
	}
}); 

// fetch record detail api
app.get(backendDirectoryPath+'/collection_details/', requireLogin, function(req, res) {
	var templateStr="", collectionStr="", search_id="";
	var outputObj = new Object();
	if(req.query.templateStr){
		templateStr=req.query.templateStr;
	}
	if(req.query.collection){
		collectionStr=req.query.collection;
	}
	if(req.query.id){
		search_id=req.query.id;
	}
	if(req.authenticationBool){
		if(templateStr!=""){
			var checkForExistence= '{"code": \''+templateStr+'\', "status": { $in: [ 1, "1" ] }}';
			initFunctions.crudOpertions(db, 'system_templates', 'findOne', null, null, null, checkForExistence, function(result) {
				//db.collection('system_templates').findOne({"code": templateStr , "status": { $in: [ 1, "1" ] } }, function(err, templateResponse) {
				if(result.error){
					outputObj["error"]   = "No such page exists!";
					res.send(outputObj);
				}
				if(result.aaData){
					var templateResponse= result.aaData;
					 var collectionStr= templateResponse.table ;
					 initFunctions.returnFindOneByMongoID(db, collectionStr, search_id, function(resultObject) {
						res.send(resultObject);
					 });
				}
			});
		}else if(collectionStr!=""){
			initFunctions.returnFindOneByMongoID(db, collectionStr, search_id, function(resultObject) {
				res.send(resultObject);
			 });
		}else{
			outputObj["total"]   = 0;
      		outputObj["error"]   = "No results found!";
			res.send(outputObj);
		}
	}else{
		outputObj["error"]   = "Authorization error!";
		res.send(outputObj);
	}
}); 

//players list View
app.get(backendDirectoryPath+'/players', requireLogin, system_preferences, function(req, res) {
	if(req.authenticationBool){
		var queryString= req.query;
		var keywordStr="";
	
		if(queryString.keyword){
			keywordStr=queryString.keyword;
		}
		
 		initFunctions.save_activity_log(db, 'Players', req.url, req.authenticatedUser._id, req.authenticatedUser.active_system_uuid.toString(), function(result) {
			res.render(accessFilePath+'players', {
       			currentTemplate : '',
        		searched_keyword : keywordStr,
        		authenticatedUser : req.authenticatedUser,
        		system_preferences :  req.system_preferences
    		});
    	});
    }else{
		res.redirect(backendDirectoryPath+'/sign-in');
	}
});

//images gallery
app.get(backendDirectoryPath+'/image_gallery', requireLogin, system_preferences, function(req, res) {
	if(req.authenticationBool){
		var queryString= req.query;
		var keywordStr="";
	
		if(queryString.keyword){
			keywordStr=queryString.keyword;
		}
		initFunctions.save_activity_log(db, 'Image Gallery', req.url, req.authenticatedUser._id, req.authenticatedUser.active_system_uuid.toString(), function(result) {
			res.render(accessFilePath+'image_gallery', {
       			currentTemplate : '',
        		searched_keyword : keywordStr,
        		authenticatedUser : req.authenticatedUser,
        		system_preferences :  req.system_preferences
    		});
    	});
    }else{
		res.redirect(backendDirectoryPath+'/sign-in');
	}
});

//separate listing api for players to search by various other options
app.get(backendDirectoryPath+'/api_fetch_players/', requireLogin, function(req, res) {
	var itemsPerPage = 10, pageNum=1, collectionStr="users";
	var outputObj = new Object();
	if(req.query.start){
		pageNum=parseInt(req.query.start);
	}
	if(req.query.limit){
		itemsPerPage=parseInt(req.query.limit);
	}
	
	if(pageNum==0){
		pageNum=1;
	}
	if(req.authenticationBool){
			
			if(collectionStr!=""){
				var coll= db.collection(collectionStr);    			
     			if(req.query.team){
     				initFunctions.returnFindOneByMongoID(db, 'teams', req.query.team, function(result) {
     					
     					if(result.aaData)	{
     						var teamsData=result.aaData;
     						var usersListArr=teamsData.players;
     						
     						if(usersListArr.length>0){
     							var userMongoID=new Array(), useridAsString=new Array(), playersAvailabilityArr=new Array();
								
     							for(var i=0; i<usersListArr.length; i++){
     								var tempID=new mongodb.ObjectID(usersListArr[i].user_mongo_id);
     								userMongoID.push(tempID);
     								useridAsString.push(usersListArr[i].user_mongo_id);
     							}
     							var player_type_uuid="", searchTermStr="";
     							if(req.query.player_type_uuid){
									player_type_uuid= req.query.player_type_uuid;
     							}
     			
								if(req.query.s){
     								searchTermStr=req.query.s;	
     							}
     							if(req.query.timestamp){
     								var passedTimestamp = new Date(req.query.timestamp * 1000);
     								var s_timestamp= passedTimestamp.setHours(0,0,0,0);
     								s_timestamp= parseInt(s_timestamp)/1000;
     								var e_timestamp= passedTimestamp.setHours(23,59,59,0);
     								e_timestamp= parseInt(e_timestamp)/1000;
									
     								db.collection('availability').find({ $and: [ { timestamp: { $gte: s_timestamp } }, { timestamp: { $lte: e_timestamp } } ], user_mongo_id : { '$in': useridAsString }}, {user_mongo_id : 1, available :1 }).toArray(function(err, ava_users) {
     									if(ava_users)	{
     										playersAvailabilityArr= ava_users;
     										outputObj["playersAvailability"]   = ava_users;
     									}
     								});
     							}
     							
     							if(player_type_uuid!="" && searchTermStr==""){
     								coll.find({_id : { '$in': userMongoID }, user_type: 'member', player_type_uuid : req.query.player_type_uuid, 'uuid_system' : req.authenticatedUser.active_system_uuid.toString()}).count(function (e, count) {
     									if(count){
      										outputObj["total"]   = count;
      									} else {
      										outputObj["total"]   = 0;
      									}
      								});
     								coll.find({_id : { '$in': userMongoID }, user_type: 'member', player_type_uuid : req.query.player_type_uuid, 'uuid_system' : req.authenticatedUser.active_system_uuid.toString() }).sort({firstname: 1}).skip(pageNum-1).limit(itemsPerPage).toArray(function(err, items) {
     									if (err) {
											outputObj["error"]   = 'not found';
										} else if (items) {
											outputObj["iTotalRecordsReturned"]   = items.length;
      										outputObj["aaData"]   = items;
										}
     									res.send(outputObj);
									});
     							}
     							else if(player_type_uuid=="" && searchTermStr!=""){
     								coll.find({_id : { '$in': userMongoID }, user_type: 'member', $text: { '$search': searchTermStr }, 'uuid_system' : req.authenticatedUser.active_system_uuid.toString() }).count(function (e, count) {
     									if(count){
      										outputObj["total"]   = count;
      									} else {
      										outputObj["total"]   = 0;
      									}
      								});
     								coll.find({_id : { '$in': userMongoID }, user_type: 'member', $text: { '$search': searchTermStr }, 'uuid_system' : req.authenticatedUser.active_system_uuid.toString() }).sort({firstname: 1}).skip(pageNum-1).limit(itemsPerPage).toArray(function(err, items) {
     									if (err) {
      										outputObj["error"]   = 'not found';
										} else if (items) {
											outputObj["iTotalRecordsReturned"]   = items.length;
      										outputObj["aaData"]   = items;
										}
     									res.send(outputObj);
									});
     							}
     							else if(player_type_uuid!="" && searchTermStr!=""){
     								coll.find({_id : { '$in': userMongoID }, user_type: 'member', player_type_uuid : req.query.player_type_uuid, $text: { '$search': searchTermStr },  'uuid_system' : req.authenticatedUser.active_system_uuid.toString() }).count(function (e, count) {
     									if(count){
      										outputObj["total"]   = count;
      									} else {
      										outputObj["total"]   = 0;
      									}
      								});
     								coll.find({_id : { '$in': userMongoID }, user_type: 'member', player_type_uuid : req.query.player_type_uuid, $text: { '$search': searchTermStr }, 'uuid_system' : req.authenticatedUser.active_system_uuid.toString() }).sort({firstname: 1}).skip(pageNum-1).limit(itemsPerPage).toArray(function(err, items) {
     									if (err) {
											outputObj["error"]   = 'not found';
      									} else if (items) {
      										outputObj["iTotalRecordsReturned"]   = items.length;
      										outputObj["aaData"]   = items;
										}
     									res.send(outputObj);
									});
								
								}else{
									coll.find({_id : { '$in': userMongoID }, user_type: 'member',  'uuid_system' : req.authenticatedUser.active_system_uuid.toString()}).count(function (e, count) {
     									if(count){
      										outputObj["total"]   = count;
      									} else {
      										outputObj["total"]   = 0;
      									}
      								});
									coll.find({_id : { '$in': userMongoID }, user_type: 'member',  'uuid_system' : req.authenticatedUser.active_system_uuid.toString()}).sort({firstname: 1}).skip(pageNum-1).limit(itemsPerPage).toArray(function(err, items) {
     									if (err) {
											outputObj["error"]   = 'not found';
										} else if (items) {
											outputObj["iTotalRecordsReturned"]   = items.length;
      										outputObj["aaData"]   = items;
										}
										res.send(outputObj);
     								});
								}
							}else{
								outputObj["total"]   = 0;
      							outputObj["error"]   = 'not found';
								res.send(outputObj);
							}
     					}	else	{
     						outputObj["total"]   = 0;
      						outputObj["error"]   = 'not found';
							res.send(outputObj);
     					}
     				});
     			}	else if(req.query.availability && req.query.availability!="")	{
     				
     				var passedTimestamp = new Date(req.query.timestamp * 1000);
     				var s_timestamp= passedTimestamp.setHours(0,0,0,0);
     				s_timestamp= parseInt(s_timestamp)/1000;
     				var e_timestamp= passedTimestamp.setHours(23,59,59,0);
     				e_timestamp= parseInt(e_timestamp)/1000;
																	
     				db.collection('availability').find({ $and: [ { timestamp: { $gte: s_timestamp } }, { timestamp: { $lte: e_timestamp } } ], available : req.query.availability}, {user_mongo_id : 1, available :1 }).toArray(function(avaerr, ava_users) {
     					if(ava_users)	{
     						playersAvailabilityArr= ava_users;
     						outputObj["playersAvailability"]   = ava_users;
     						var userMongoID=new Array();
								
							for(var i=0; i<ava_users.length; i++){
     							var tempID=new mongodb.ObjectID(ava_users[i].user_mongo_id);
     							userMongoID.push(tempID);
     						}
     						if(req.query.s && req.query.s!=""){
     							coll.find({_id : { '$in': userMongoID }, user_type: 'member', $text: { '$search': req.query.s }, 'uuid_system' : req.authenticatedUser.active_system_uuid.toString()}).count(function (e, count) {
     								if(count){
      									outputObj["total"]   = count;
      								} else {
      									outputObj["total"]   = 0;
      								}
      							});		
     							coll.find({_id : { '$in': userMongoID }, user_type: 'member', $text: { '$search': req.query.s }, 'uuid_system' : req.authenticatedUser.active_system_uuid.toString() }).sort({firstname: 1}).skip(pageNum-1).limit(itemsPerPage).toArray(function(err, items) {
     								if (items) {
     									outputObj["iTotalRecordsReturned"]   = items.length;
      									outputObj["aaData"]   = items;
									} else {
										outputObj["error"]   = 'Sorry, no players available on selected date!';
									}
     								res.send(outputObj);
								});
							} else {
								coll.find({_id : { '$in': userMongoID }, user_type: 'member',  'uuid_system' : req.authenticatedUser.active_system_uuid.toString()}).count(function (e, count) {
     								if(count){
      									outputObj["total"]   = count;
      								} else {
      									outputObj["total"]   = 0;
      								}
      							});	
								coll.find({_id : { '$in': userMongoID }, user_type: 'member',  'uuid_system' : req.authenticatedUser.active_system_uuid.toString()}).sort({firstname: 1}).skip(pageNum-1).limit(itemsPerPage).toArray(function(err, items) {
     								if (items) {
      									outputObj["iTotalRecordsReturned"]   = items.length;
      									outputObj["aaData"]   = items;
									} else {
										outputObj["total"]   = 0;
      									outputObj["error"]   = 'Sorry, no players available on selected date!';
									}
     								res.send(outputObj);
								});
							}
     					} else {
     						outputObj["total"]   = 0;
      						outputObj["error"]   = 'Sorry, no players available on selected date!';
     						res.send(outputObj);
     					}
     				});
     			}	else	{
     				var query="{";
					query+=" 'user_type': 'member' ";
					
					if(req.query.player_type_uuid){
						if(query!="{"){
     						query+=",";
     					}
     					query+=" 'player_type_uuid' : '"+req.query.player_type_uuid+"' ";
     				}
     				
					if(req.query.s){
     					//create text index
     					coll.createIndex({ "$**": "text" },{ name: "TextIndex" });
     					if(query!="{"){
     						query+=",";
     					}
     					query+=" '$text': { '$search': '"+req.query.s+"' } ";
     				}
     				if (typeof req.authenticatedUser.active_system_uuid !== 'undefined' && req.authenticatedUser.active_system_uuid !== null && req.authenticatedUser.active_system_uuid!="") {
     					if(query!="{"){
     						query+=",";
     					}
						query+=" 'uuid_system': { $in: ['"+req.authenticatedUser.active_system_uuid.toString()+"'] } ";
					}
     				query+= "}";
     				eval('var queryObj='+query);
     				
     				coll.find(queryObj).count(function (e, count) {
     					if(count){
      						outputObj["total"]   = count;
      					} else {
      						outputObj["total"]   = 0;
      					}
      				});	
					coll.find(queryObj).sort({firstname: 1}).skip(pageNum-1).limit(itemsPerPage).toArray(function(err, items) {
						if (err) {
							outputObj["error"]   = 'not found';
							res.send(outputObj);
      					} else if (items) {
      						outputObj["iTotalRecordsReturned"]   = items.length;
      						outputObj["aaData"]   = items;
									
      						if(req.query.timestamp){
      							var useridAsString=new Array();
								for(var i=0; i<items.length; i++){
     								useridAsString.push(items[i]._id.toString());
     							}
      							
     							var passedTimestamp = new Date(req.query.timestamp * 1000);
     							var s_timestamp= passedTimestamp.setHours(0,0,0,0);
     							s_timestamp= parseInt(s_timestamp)/1000;
     							var e_timestamp= passedTimestamp.setHours(23,59,59,0);
     							e_timestamp= parseInt(e_timestamp)/1000;
																	
     							db.collection('availability').find({ $and: [ { timestamp: { $gte: s_timestamp } }, { timestamp: { $lte: e_timestamp } } ], user_mongo_id : { '$in': useridAsString }}, {user_mongo_id : 1, available :1 }).toArray(function(err, ava_users) {
     								if(ava_users)	{
     									playersAvailabilityArr= ava_users;
     									outputObj["playersAvailability"]   = ava_users;
     								}
     								res.send(outputObj);
     							});
     						}	else {
     							outputObj["iTotalRecordsReturned"]   = items.length;
      							outputObj["aaData"]   = items;
								res.send(outputObj);
							}
     					}
					});
				}
			}else{
				outputObj["total"]   = 0;
      			outputObj["error"]   = "No such page exists!";
				res.send(outputObj);
			}
			
	}else{
		outputObj["total"]   = 0;
      	outputObj["error"]   = "Authorization error!";
		res.send(outputObj);
	}
}); 

// api update players status
app.get(backendDirectoryPath+'/update_user_status', requireLogin, (req, res) => {
	var outputObj = new Object();
	if(req.authenticationBool){
		var search_id = req.query.id;
		var allow_web_access = req.query.allow_web_access;
	
		if(search_id!="" && allow_web_access!=""){
			db.collection('users').findAndModify({_id:new mongodb.ObjectID(search_id)}, [['_id','asc']], { $set: {"allow_web_access" : parseInt(allow_web_access)} }, {}, function(err, result) {
				if(err){
					outputObj["error"]   = "No such player found!";
					res.send(outputObj);
				}	else if (result){
					if(result.lastErrorObject.updatedExisting){
						outputObj["success"] ="OK";
      				}else{
      					outputObj["error"]   = 'Sorry, can\'t update player info, please try again!';
					}
      				res.send(outputObj);
      			}
  			});
		}else{
			outputObj["error"]   = "Please pass the required fields!";
			res.send(outputObj);
		}
	}else{
		outputObj["error"]   = "Authorization error!";
		res.send(outputObj);
	}
});

// api fetch fixture events
app.get(backendDirectoryPath+'/api_fetch_fixtures/', requireLogin, function(req, res) {
	var outputObj = new Object();
	
	if(req.authenticationBool){
		var collectionStr="fixtures", search_id="", endNum = 10, startNum=0, startTimestamp="", endTimestamp="", selectedTeamStr="", team_id='';
		if(req.query.start){
			startNum=parseInt(req.query.start);
		}
		if(req.query.end){
			endNum=parseInt(req.query.end);
		}
		if(req.query.startTimestamp && req.query.startTimestamp!=""){
			startTimestamp=parseInt(req.query.startTimestamp);
		}
		if(req.query.endTimestamp && req.query.endTimestamp!=""){
			endTimestamp=parseInt(req.query.endTimestamp);
		}
		if(req.query.id && req.query.id!=""){
			search_id=req.query.id;
		}
		if(req.query.team_id && req.query.team_id!=""){
			team_id=req.query.team_id;
		}
		if(req.query.selected_team && req.query.selected_team!="null" && req.query.selected_team!="undefined" && req.query.selected_team!="") {
			selectedTeamStr=req.query.selected_team;
			//save in session selected team
    		db.collection("sessions").update({'_id':req.authenticatedUser.auth_id, 'user_id':req.authenticatedUser._id, 'status' : true }, {'$set' : {"fixture_page_selected_team" : selectedTeamStr}});
		}
		if(search_id!= ""){
			if(selectedTeamStr=="" && req.authenticatedUser.fixture_page_selected_team && req.authenticatedUser.fixture_page_selected_team!="null" && req.authenticatedUser.fixture_page_selected_team!=""){
				outputObj["selected_team"]   = req.authenticatedUser.fixture_page_selected_team;
				selectedTeamStr = req.authenticatedUser.fixture_page_selected_team;
			}
			initFunctions.returnFindOneByMongoID(db, collectionStr, search_id, function(resultObject) {
				if(resultObject.aaData){
					var resultData=resultObject.aaData;
					if(resultData.events && resultData.events.length>0){
						outputObj["total"]   = resultData.events.length;
						var returnMatchesObj= new Array();
						if(resultData.events && resultData.events.length>0){
							var matchesDetails =resultData.events;
							for(var i=0; i<matchesDetails.length; i++){
								var pushSubObjectBool=true, currentRowTimestamp=matchesDetails[i].date_time;
								
								
    							if(startTimestamp!="" || endTimestamp!=""){
    								pushSubObjectBool=false;
									if(startTimestamp!="" && endTimestamp!="" && startTimestamp<=currentRowTimestamp && endTimestamp>=currentRowTimestamp){
										pushSubObjectBool=true;
									} else if(startTimestamp!="" && endTimestamp=="" && startTimestamp<=currentRowTimestamp){
										pushSubObjectBool=true;
									} else if(startTimestamp=="" && endTimestamp!="" && endTimestamp>=currentRowTimestamp){
										pushSubObjectBool=true;
									}
								}
								if(pushSubObjectBool && selectedTeamStr!="" && selectedTeamStr!="null" && selectedTeamStr!=null && selectedTeamStr!="undefined"){
									if(selectedTeamStr==matchesDetails[i].home_team_uuid || selectedTeamStr==matchesDetails[i].away_team_uuid){
    									pushSubObjectBool =true;
    								} else{
    									pushSubObjectBool =false;
    								}
    							}
    							if(pushSubObjectBool && req.query.event_uuid && req.query.event_uuid!=""){
									if(req.query.event_uuid==matchesDetails[i].uuid){
    									pushSubObjectBool =true;
    								} else{
    									pushSubObjectBool =false;
    								}
    							}
								if(pushSubObjectBool){
									returnMatchesObj.push(matchesDetails[i]);
								}
								
							}
						}
						if(returnMatchesObj.length>0){
							var newreturnMatchesObj= new Array();
						
							for(var i=0; i<returnMatchesObj.length; i++){
								if(i>=startNum)	{
									newreturnMatchesObj.push(returnMatchesObj[i]);
								}
								if(i==endNum){
									break;
								}
							}
							if(newreturnMatchesObj.length>0){
								outputObj["iTotalDisplayRecords"]   = returnMatchesObj.length;
								outputObj["aaData"]   = newreturnMatchesObj;
							}else{
								outputObj["error"]   = "Sorry, no matches found!";
							}
						}else{
							outputObj["error"]   = "Sorry, no matches found!";
						}						
					}else{
						outputObj["error"]   = "Sorry, no matches defined yet!";
					}
				}else{
					outputObj["error"]   = "No such fixture found!";
				}
				res.send(outputObj);
			});
		}	
		else if(team_id!=""){
			var timeStampNum= new Date();
			var s_timeStampNum= (timeStampNum.setHours(0,0,0,0))/1000; 
			db.collection('fixtures').find({ $or: [ { 'events.home_team_uuid' : { $in: new Array(team_id) } }, { 'events.away_team_uuid': { $in: new Array(team_id) } } ], 'uuid_system' : req.authenticatedUser.active_system_uuid.toString(), 'status' : { $in: [ 1, "1" ] } }).sort({'events.date_time': 1}).toArray(function(err, fixturesObj) {
      			if (fixturesObj && fixturesObj.length>0){
      				var returnMatchesObj= new Array();
      				for(var j=0; j<fixturesObj.length; j++){
							var matchesDetails =fixturesObj[j].events;
							for(var i=0; i<matchesDetails.length; i++){
								var pushSubObjectBool=false, currentRowTimestamp=matchesDetails[i].date_time;
								
								//if(s_timeStampNum!="" && s_timeStampNum<=currentRowTimestamp){
									pushSubObjectBool=true;
								//}
								
								if(pushSubObjectBool && team_id!="" && team_id!="null" && team_id!=null && team_id!="undefined"){
									if(team_id==matchesDetails[i].home_team_uuid || team_id==matchesDetails[i].away_team_uuid){
    									pushSubObjectBool =true;
    								} else{
    									pushSubObjectBool =false;
    								}
    							}
								if(pushSubObjectBool){
									matchesDetails[i]['fixture_name']=fixturesObj[j].name;
									returnMatchesObj.push(matchesDetails[i]);
								}
							}
					}	
					if(returnMatchesObj.length>0){
						outputObj["iTotalDisplayRecords"]   = returnMatchesObj.length;
						outputObj["aaData"]   = returnMatchesObj;
					}else{
						outputObj["error"]   = "Sorry, no matches found!";
					}
					res.send(outputObj);
      			}else	{
					outputObj["error"]   = "No such fixture found!";
					res.send(outputObj);
				}
      		});			
		}else	{
			outputObj["error"]   = "No such fixture found!";
			res.send(outputObj);
		}
	}else{
		outputObj["error"]   = "Authorization error!";
		res.send(outputObj);
	}
}); 

// listing pages ui
app.get(backendDirectoryPath+'/list/:id', requireLogin, system_preferences, function(req, res) {
	if(req.authenticationBool){
		var pageRequested = req.params.id, loggedInUser = req.authenticatedUser, queryString= req.query, keywordStr="";
		if(queryString.keyword){
			keywordStr=queryString.keyword;
		}
		req.sendModuleLinks = true;
		returnUserAssignedModules (loggedInUser._id, req, function(allowedNavigationData) {
			var assignedModuleBool= false, requestedPageStr= "/list/"+pageRequested, module_label_str=pageRequested.toUpperCase();		
				
			if(allowedNavigationData && allowedNavigationData.modules && allowedNavigationData.modules.length>0)	{
				for (var i = 0; i < allowedNavigationData.modules.length; i++) {
					if(allowedNavigationData.modules[i].link==requestedPageStr){
						assignedModuleBool= true;
						module_label_str = allowedNavigationData.modules[i].label;
						break;
					}
				}
			}
			if(allowedNavigationData && allowedNavigationData.admin_user && allowedNavigationData.admin_user==true)	{
				initFunctions.save_activity_log(db, module_label_str, req.url, req.authenticatedUser._id, req.authenticatedUser.active_system_uuid.toString(), function(result) {	
					res.render(accessFilePath+'standard_listing', {
       	 				currentTemplate : pageRequested,
        				searched_keyword : keywordStr,
        				authenticatedUser : req.authenticatedUser,
        				system_preferences :  req.system_preferences
    				});
   				});
   			}else{
				if(assignedModuleBool)	{
					initFunctions.save_activity_log(db, module_label_str, req.url, req.authenticatedUser._id, req.authenticatedUser.active_system_uuid.toString(), function(result) {	
						res.render(accessFilePath+'standard_listing', {
   	 						currentTemplate : pageRequested,
       						searched_keyword : keywordStr,
       						authenticatedUser : req.authenticatedUser,
       						system_preferences :  req.system_preferences
   						});
   					});
   				}else{
   					res.redirect(backendDirectoryPath+'/403');
   				}
			}
		});
	}else{
		res.redirect(backendDirectoryPath+'/sign-in');
	}
})

//api fetch Table fields
app.get(backendDirectoryPath+'/fetchTableColumns', requireLogin, function(req, res) {
	if(req.authenticationBool){
		initFunctions.fetchTableColumns(db, req.query.e, function(result) {	
			res.send(result);
		});
	}else{
		var outputObj = new Object();
		outputObj["error"]   = "Authorization error!";
		res.send(outputObj);
	}
});

// render pages
app.get(backendDirectoryPath+'/:id', requireLogin, system_preferences, function(req, res) {
	if(req.authenticationBool){
		var pageRequested = req.params.id;
		var requestedPageStr="/"+pageRequested;
		
		if(req.query._id && req.query._id!=""){
			editFieldName="_id";
			editFieldVal=req.query._id;
		} else if(req.query.uuid && req.query.uuid!=""){
			editFieldName="uuid";
			editFieldVal=req.query.uuid;
		} else{
			var queryString= req.url, removeUrl=backendDirectoryPath+'/'+req.params.id+'?';
			queryString= queryString.substr(removeUrl.length);
			if(queryString.indexOf("&")>-1){
				queryString= queryString.substr(0,queryString.indexOf("&"));
			}
	
			var editFieldName="", editFieldVal="";
	
			if(queryString.indexOf("=")>-1){
				editFieldName=queryString.substr(0,queryString.indexOf("="));
				editFieldVal=queryString.substr(queryString.indexOf("=")+1);
			}
		}
		var contentObj= "";
		var table_name =initFunctions.fetchTableName(pageRequested);
	
		pageRequested=accessFilePath+pageRequested;
	
		req.sendModuleLinks = true;
		returnUserAssignedModules (req.authenticatedUser._id, req, function(allowedNavigationData) {
			var assignedModuleBool= false, module_label_str=req.params.id;		
			if(allowedNavigationData && allowedNavigationData.modules && allowedNavigationData.modules.length>0)	{
				for (var i = 0; i < allowedNavigationData.modules.length; i++) {
					if(allowedNavigationData.modules[i].link==requestedPageStr){
						assignedModuleBool= true;
						module_label_str = allowedNavigationData.modules[i].label;
						break;
					}
				}
			}
			if(allowedNavigationData && allowedNavigationData.admin_user && allowedNavigationData.admin_user==true)	{
				assignedModuleBool= true;
			}		
			if(assignedModuleBool){
				if(table_name==""){
					initFunctions.save_activity_log(db, module_label_str, req.url, req.authenticatedUser._id, req.authenticatedUser.active_system_uuid.toString(), function(result) {	
						res.render(pageRequested, {
      						queryStr : req.query,
       						contentObj : contentObj,
       						authenticatedUser : req.authenticatedUser,
       						system_preferences :  req.system_preferences
    					});
    				});
				}else{
					if (typeof editFieldVal !== 'undefined' && editFieldVal !== null) {
						if(editFieldName=="_id"){
							initFunctions.returnFindOneByMongoID(db, table_name, editFieldVal, function(resultObject) {
					 			if (resultObject.aaData) {
      								contentObj=resultObject.aaData;      						
      								module_label_str=table_name+' details';
      								for(var key in contentObj) {
										if(key=="name" || key=="label" || key=="Document" || key=="username"){	
											module_label_str = contentObj[key];
											break;
										}
									}
									if(table_name=="users"){
										module_label_str +=": user detail's"; 
									}
      							}
      							initFunctions.save_activity_log(db, module_label_str, req.url, req.authenticatedUser._id, req.authenticatedUser.active_system_uuid.toString(), function(result) {	
      								res.render(pageRequested, {
      	 								editorField : editFieldName,
      	 								editorValue : editFieldVal,
       									queryStr : req.query,
       									contentObj : contentObj,
       									authenticatedUser : req.authenticatedUser,
       									system_preferences :  req.system_preferences
    								});
    							});
    						}); 
						}else{
							var queryStr="{'"+editFieldName+"': '"+editFieldVal+"'}";
							initFunctions.crudOpertions(db, table_name, 'findOne', null, editFieldName, editFieldVal, queryStr, function(result) {
								if (result.aaData) {
      								contentObj=resultObject.aaData;      						
      								module_label_str=table_name+' details';
      								for(var key in contentObj) {
										if(key=="name" || key=="label" || key=="Document" || key=="username"){	
											module_label_str = contentObj[key];
											break;
										}
									}	
									if(table_name=="users"){
										module_label_str +=": user detail's"; 
									}
      							} 
      							initFunctions.save_activity_log(db, module_label_str, req.url, req.authenticatedUser._id, req.authenticatedUser.active_system_uuid.toString(), function(result) {	
      								res.render(pageRequested, {
      	 								editorField : editFieldName,
      	 								editorValue : editFieldVal,
       									queryStr : req.query,
       									contentObj : contentObj,
       									authenticatedUser : req.authenticatedUser,
       									system_preferences :  req.system_preferences
    								});
    							});
    						});
    					} 
					}else{
						initFunctions.save_activity_log(db, module_label_str, req.url, req.authenticatedUser._id, req.authenticatedUser.active_system_uuid.toString(), function(result) {	
	      					res.render(pageRequested, {
			      				queryStr : req.query,
       							contentObj : contentObj,
       							authenticatedUser : req.authenticatedUser,
       							system_preferences :  req.system_preferences
    						});
    					});
    				}
    			}
    		}else{
    			res.redirect(backendDirectoryPath+'/403');
    		}
    	});
  	}else {
    	res.redirect(backendDirectoryPath+'/sign-in');
    }	
}); 

//api save default system for admin
app.post(backendDirectoryPath+'/default_system', requireLogin, (req, res) => {
	if(req.authenticationBool){
	var postJson=req.body;
	
	var contentJson = JSON.parse(req.body.data);
	
	var idField="", editorFieldName="", editorFieldVal="", checkForExistence="";
	
	var table_nameStr=postJson.table_name;
	var unique_fieldStr=postJson.unique_field;
	if(unique_fieldStr=="_id"){
		unique_fieldStr="id";
	}
	var unique_fieldVal="";
	var link =backendDirectoryPath+"/"+req.params.id;
	
	for(var key in contentJson) {
		if(key==unique_fieldStr){
			unique_fieldVal= contentJson[key];
   		}
	}
	
	if(unique_fieldVal==""){
		for(var key in postJson) {
			if(key==unique_fieldStr){
				unique_fieldVal= postJson[key];
   			}
		}
	}
	if (typeof postJson.editorField !== 'undefined' && postJson.editorField !== null && postJson.editorField !== "") { 
		editorFieldName=postJson.editorField;
	}
	
	if (typeof postJson.editorValue !== 'undefined' && postJson.editorValue !== null && postJson.editorValue !== null) { 
		editorFieldVal=postJson.editorValue;
	}
	if(postJson.id){
		idField=postJson.id;
		var mongoIDField= new mongodb.ObjectID(idField);
		if(editorFieldName=="" && editorFieldVal==""){
    		editorFieldName="id";
    		editorFieldVal=idField;
    	}
	}
	
		initFunctions.crudOpertions(db, table_nameStr, 'create', contentJson, unique_fieldStr, unique_fieldVal, null,function(result) {
    		if(result.success){
    			var default_system_id=result._id;
    			db.collection("users").update({_id:req.authenticatedUser._id}, {'$set' : {"uuid_default_system" : default_system_id.toString(), "shared_systems" : new Array(default_system_id)}}, (err1	, result) => {
    				db.collection("modules").update({'active':1}, {'$set' : {"uuid_system" : default_system_id}}, { multi: true });
    				db.collection("session").update({'user_id':req.authenticatedUser._id}, {'$set' : {"active_system_uuid" : default_system_id}}, (err2	, result2) => {
    					res.redirect(backendDirectoryPath+'/default_system?success=Saved the basic details successfully!');
    				});
  				});
    		}
  		});

	}else{
		res.redirect('/sign-in');
	}
})

//api post action for saveMatchDetails
app.post(backendDirectoryPath+'/saveMatchDetails', requireLogin, (req, res) => {
 var myObj = new Object();
 if(req.authenticationBool){
	
	if(req.body.fixture_id && req.body.fixture_id!="" && req.body.uuid && req.body.uuid!=""){
		var table_nameStr='fixtures';
		var tableID= req.body.fixture_id;
	
		var fixtureIDField= new mongodb.ObjectID(tableID);
		initFunctions.returnFindOneByMongoID(db, table_nameStr, fixtureIDField, function(resultObject) {
			if (resultObject.aaData) {
      			if(req.body.action=="save"){
      				var insertNote=new Object(), resultsObj=new Object();
					insertNote["uuid"]=req.body.uuid;
					insertNote["date_time"]=parseInt(req.body.date_time);
					insertNote["venue_name"]=req.body.venue_name;
					insertNote["venue_uuid"]=req.body.venue_uuid;
					insertNote["publish_on_web"]=req.body.publish_on_web;
					if(req.body.fixture_type){
						insertNote["fixture_type"]=req.body.fixture_type;
					}
					if(req.body.fixture_type_id){
						insertNote["fixture_type_id"]=req.body.fixture_type_id;
					}
					if(req.body.total_overs){
						insertNote["total_overs"]=req.body.total_overs;
					}				
					insertNote["home_team_name"]=req.body.home_team_name;
					insertNote["away_team_name"]=req.body.away_team_name;
					insertNote["home_team_uuid"]=req.body.home_team_uuid;
					insertNote["away_team_uuid"]=req.body.away_team_uuid;
					
					var fixtureDetails=	resultObject.aaData;
					var existingEventsObj = fixtureDetails.events;
					var updateBool=false;
					if(existingEventsObj && existingEventsObj.length>0){
						for(var i=0; i<existingEventsObj.length; i++){
							if(req.body.uuid==existingEventsObj[i].uuid){
     							updateBool=true;
     						}
     					}
					}
					
					if(updateBool){
						//update existing event
						db.collection(table_nameStr).update({_id:fixtureIDField}, { $pull: { "events": { "uuid": req.body.uuid } } }, (err, result) => {
    						if(result){
    							db.collection(table_nameStr).update({_id:fixtureIDField}, { $push: { "events": insertNote } }, (err, result) => {
    								if(result){
    									myObj["success"]   = "Match details updated successfully!";
										if(req.body.save_scores && (req.body.save_scores==true || req.body.save_scores=="true")){
											resultsObj = insertNote;
											resultsObj["event_uuid"]=resultsObj.uuid;
											resultsObj["fixture_id"]=fixtureIDField;
											if(req.body.winner_team){
												resultsObj["winner_team"]=req.body.winner_team;
											}
											if(req.body.match_status){
												resultsObj["match_status"]=req.body.match_status;
											}
											if(req.body.toss_won_by){
												resultsObj["toss_won_by"]=req.body.toss_won_by;
											}
											delete resultsObj.home_team_name;
											delete resultsObj.uuid;
											delete resultsObj.away_team_name;
											delete resultsObj.home_team_uuid;
											delete resultsObj.away_team_uuid;
											
											if(req.body.home_team_results){
    											resultsObj["home_team"]=JSON.parse(req.body.home_team_results);
    										}
    										if(req.body.away_team_results){
    											resultsObj["away_team"]=JSON.parse(req.body.away_team_results);
    										}
    										resultsObj['uuid_system'] = req.authenticatedUser.active_system_uuid.toString();
											
											initFunctions.save_scores(db, resultsObj, function(save_results_response) {
												res.send(myObj);
											});
    									}else{
    										res.send(myObj);
										}
    								}else{
    									myObj["error"]   = "Error in posting match details. Please try again later!!!";
										res.send(myObj);
    								}
    							});
    						}else{
    							myObj["error"]   = "Error in update match details. Please try again later!!!";
								res.send(myObj);
    						}
    					});
					}else{
						//insert event
						db.collection(table_nameStr).update({_id:fixtureIDField}, { $push: { "events": insertNote } }, (err, result) => {
    						if(result){
    							myObj["success"]   = "Match added successfully!";
								res.send(myObj);
    						}else{
    							myObj["error"]   = "Error in saving match. Please try again later!!!";
								res.send(myObj);
    						}
    					});
					}
      			} else if(req.body.action=="delete"){
  					db.collection(table_nameStr).update({_id:fixtureIDField}, { $pull: { "events": { "uuid": req.body.uuid } } }, (err, result) => {
    					if(result){
    						myObj["success"]   = "Note deleted successfully!";
							res.send(myObj);
    					}else{
    						myObj["error"]   = "Error in deleting note. Please try again later!!!";
							res.send(myObj);
    					}
    				});
				}
      		}	else{
      			myObj["error"]   = "Sorry, no such fixture found!";
				res.send(myObj);
      		}
    	});
  	}else{
  		myObj["error"]   = "Sorry, no such fixture found!";
		res.send(myObj);
  	}
  }else{
  	myObj["error"]   = "Sorry you are not authorized to add match!";
	res.send(myObj);
  }
});

/** this api save all forms content
required parameters are listed below : 
table_name (collection name), unique_field (update collection row based on specified field), id (in case of already existing row, pass the mongoDb _id)
editorField (field name passed in url), editorValue (field value passed in url in case of update), data (contain all the form fields)
**/
app.post(backendDirectoryPath+'/save/:id', requireLogin, (req, res) => {
	if(req.authenticationBool){
	var postJson=req.body;
	
	var contentJson = JSON.parse(req.body.data);	//all form content will be posted in field name="data"

	var idField="", editorFieldName="", editorFieldVal="", checkForExistence="";
	
	var table_nameStr=postJson.table_name;
	var unique_fieldStr=postJson.unique_field;
	if(unique_fieldStr=="_id"){
		unique_fieldStr="id";
	}
	var unique_fieldVal="";
	var link =backendDirectoryPath+"/"+req.params.id;
	
	for(var key in contentJson) {
		if(key==unique_fieldStr){
			unique_fieldVal= contentJson[key];
   		}
	}
	
	if(unique_fieldVal==""){
		for(var key in postJson) {
			if(key==unique_fieldStr){
				unique_fieldVal= postJson[key];
   			}
		}
	}
	if (typeof postJson.editorField !== 'undefined' && postJson.editorField !== null && postJson.editorField !== "") { 
		editorFieldName=postJson.editorField;
	}
	
	if (typeof postJson.editorValue !== 'undefined' && postJson.editorValue !== null && postJson.editorValue !== null) { 
		editorFieldVal=postJson.editorValue;
	}
	if(postJson.id){
		idField=postJson.id;
		var mongoIDField= new mongodb.ObjectID(idField);
		if(editorFieldName=="" && editorFieldVal==""){
    		editorFieldName="id";
    		editorFieldVal=idField;
    	}
	}
	
	var callMongoQueriesBool=true; // set true to save in db after this if-else condition
	
	if(definedAdminTablesArr.indexOf(table_nameStr)==-1){
		contentJson['uuid_system'] = req.authenticatedUser.active_system_uuid.toString();
	}
	if(table_nameStr=="bookmarks"){
		checkForExistence= '{\''+unique_fieldStr +'\': \''+unique_fieldVal+'\', "categories": \''+req.body.categories+'\', "uuid_system" : \''+req.authenticatedUser.active_system_uuid.toString()+'\'}';
	}
	else if(table_nameStr=="email_queue"){
		callMongoQueriesBool=true; 
	}else if(table_nameStr=="users" || table_nameStr=="fixtures"){
		callMongoQueriesBool=false; 
		if (table_nameStr=='users' && typeof contentJson.password !== 'undefined' && contentJson.password !== null && contentJson.password != "") {
      		contentJson['password'] = passwordHash.generate(contentJson.password);
      	}
      	
      	checkForExistence= '{\''+unique_fieldStr +'\': \''+unique_fieldVal+'\'}';
      	
		initFunctions.crudOpertions(db, table_nameStr, 'findOne', null, null, null, checkForExistence, function(result) {
			if (result.success=="OK") {
      			var document=result.aaData;
      			
      			if(mongoIDField!="" && mongoIDField!="undefined" && mongoIDField!=null){
      				initFunctions.returnFindOneByMongoID(db, table_nameStr, mongoIDField, function(existingDoc) {
      					if (existingDoc.aaData) {
      						var existingDocument=existingDoc.aaData;
      						if(existingDocument.created){
								contentJson["created"]=existingDocument.created;
							}else{
								contentJson['created']=initFunctions.currentTimestamp();
							}
      						var updateContentObj = new Object();
					 		/**for(var key in contentJson) {
					 			updateContentObj[key]=contentJson[key];
							}**/
							for(var key in contentJson) {
								if(contentJson[key]!="" && contentJson[key]!="null" && contentJson[key]!="undefined")	{
									var contentStr=contentJson[key].toString();
									if(contentStr.charAt(0)=="["){
										try{
        									updateContentObj[key]=JSON.parse(contentStr);
        								}
    									catch (error){
       										updateContentObj[key]=contentJson[key];
    									}
									}	else{
										updateContentObj[key]=contentJson[key];
									}
								}	else {
									updateContentObj[key]=contentJson[key];
								}		
							}
							db.collection(table_nameStr).update({_id:mongoIDField}, { $set: updateContentObj }, (err, result) => {
								if (err) {
    								link+="?error_msg=Error occurred while saving  please try after some time!";
								}
								if(editorFieldName!="" && editorFieldVal!=""){
    								link+="?"+editorFieldName+"="+editorFieldVal;
    							}
    							if(result){
    								link+="&success_msg=Saved successfully!";
    							}
    							res.redirect(link);
  							});
      					}else{
      						link+="?error_msg=This "+req.params.id+" already exists!"
      						res.redirect(link);
      					}
      				});
      			}	else	{
      				link+="?error_msg=The entry with same name already exists!"
      				res.redirect(link);
      			}
      		} else {
      			contentJson.created=initFunctions.currentTimestamp();
      			
      			initFunctions.returnFindOneByMongoID(db, table_nameStr, mongoIDField, function(existingDoc) {
      				if (existingDoc.aaData) {
      					var existingDocument=existingDoc.aaData;
      					if(existingDocument.created){
							contentJson["created"]=existingDocument.created;
						}else{
							contentJson['created']=initFunctions.currentTimestamp();
						}
      				
      					var updateContentObj = new Object();
					 		for(var key in contentJson) {
								var contentStr=contentJson[key].toString();
								if(contentStr.charAt(0)=="["){
									try{
        								updateContentObj[key]=JSON.parse(contentStr);
        							}
    								catch (error){
       									updateContentObj[key]=contentJson[key];
    								}
								}else{
									updateContentObj[key]=contentJson[key];
								}			
							}
					 
						db.collection(table_nameStr).update({_id:mongoIDField}, { $set: updateContentObj }, (err, result) => {
    						if (err) {
    							link+="?error_msg=Error occurred while saving, please try after some time!";
							}
							if(editorFieldName!="" && editorFieldVal!=""){
    							link+="?"+editorFieldName+"="+editorFieldVal;
    						}
    						if(result){
    							link+="&success_msg=Saved successfully!";
    						}
    						res.redirect(link)
  						});
      				}else{
      					db.collection(table_nameStr).save(contentJson, (err, result) => {
      						if (err) link+="?error_msg=Error occurred while saving, please try after some time!";
    						link+="?_id="+result["ops"][0]["_id"]+"&success_msg=Saved successfully!";
    						res.redirect(link)
  						});
      				}
      			});
      			
      		}
      	});
	}
	
	if(callMongoQueriesBool){
		var loggedInUserNameStr='';
		if(req.authenticatedUser.firstname && req.authenticatedUser.firstname!="")	{
			loggedInUserNameStr += req.authenticatedUser.firstname;
		}
		if(req.authenticatedUser.lastname && req.authenticatedUser.lastname!="")	{
			loggedInUserNameStr += ' '+req.authenticatedUser.lastname;
		}
		initFunctions.saveEntry(db, table_nameStr, checkForExistence, contentJson, req.params.id, mongoIDField, unique_fieldStr, unique_fieldVal, loggedInUserNameStr, function(result) {
			
			var tempLink="";
			if(editorFieldName!="" && editorFieldVal!=""){
    			tempLink+="?"+editorFieldName+"="+editorFieldVal;
    			link+=tempLink;		
    		}
    		if(result){
    			if(table_nameStr=="system_templates" && contentJson!=""){
    				if(contentJson.index_columns){
    					initFunctions.createIndexes(db, contentJson.table, contentJson.index_columns);
    				}
    			}
    			if(tempLink!=""){
    				link+="&"+result;
    			}else{
    				link+="?"+result;
    			}
    		}
    		res.redirect(link);
  		});
  	}
	}else{
		res.redirect('/sign-in');
	}
})

function returnUserAssignedModules (auth_user_id, req, cb) {
	var outputObj= new Object();
	if(auth_user_id != null && auth_user_id != 'undefined' && auth_user_id !=""){
		db.collection('groups').find({"users_list": { $in: new Array(auth_user_id.toString()) }, "status": { $in: [ 1, "1" ] }}).toArray(function(g_err, g_details) {
			if(g_err){
				outputObj["error"]   = "no record found!";
				res.send(outputObj);
			}	else	{
				var modulesStrArr = new Array();
				var modulesArr = new Array();
				var isUserAdmin= false;
				
				for (var count=0; count < g_details.length; count++) {
					if(g_details[count].code=="admin"){
						isUserAdmin=true;
					}
					var assigned_modulesArr =g_details[count].assigned_modules;
 					if(assigned_modulesArr.length>0){
 						for (var i=0; i < assigned_modulesArr.length; i++) {
 							modulesStrArr.push("'"+assigned_modulesArr[i]+"'");
 							modulesArr.push(assigned_modulesArr[i]);
 						}
 					}
 				}
 				var uniqueModuleArr = modulesStrArr.filter(function(item, i, ar){ return ar.indexOf(item) === i; });
 				var modulesArr = modulesArr.filter(function(item, i, ar){ return ar.indexOf(item) === i; });
 				
 				var coll= db.collection('modules');
				var query="{ 'active': { $in: [ 1, '1' ] }";
				if(!isUserAdmin){
					query+=", 'module_items.uuid' : {$in: ["+uniqueModuleArr+"]}";
				}
				if(req.query.s){
     				//create text index
     				coll.createIndex({ "$**": "text" },{ name: "TextIndex" });
     				query+=", '$text': { '$search': '"+req.query.s+"' } ";
     			}
     			query+=" } ";
     			eval('var queryObj='+query);
				
				coll.find(queryObj).sort({sort_order: -1}).toArray(function(err, items) {
					if (err) {
						outputObj["error"]   = 'not found';
						return cb(outputObj);
      				} else if (items) {
      					var outputLinksOnlyArr= new Array();
      					if(isUserAdmin){
      						outputObj["aaData"]   = items;
      						if(req.sendModuleLinks && req.sendModuleLinks==true){
      							for (var j=0; j < items.length; j++) {
      								if(items[j] && items[j].module_items && items[j].module_items.length>0){
      									var module_items_arr=items[j].module_items;
      									for (var i=0; i < module_items_arr.length; i++) {
      										outputLinksOnlyArr.push({'link':module_items_arr[i].link, 'label':module_items_arr[i].label});
      									}
      								}
								}
							}
      					}else{
      						var outputContentJson=new Array();
      						for (var j=0; j < items.length; j++) {
      							var moduleObj={};
      							var moduleContentArr=items[j];
								for(var key in moduleContentArr) {
									if(key=="module_items"){
										var moduleItemsArr = new Array();
										if(moduleContentArr[key].length>0){
											var addInArrayNum=0;
 											for (var i=0; i < moduleContentArr[key].length; i++) {
 												var existingModuleItemsArr=moduleContentArr[key][i];
 												if(modulesArr.indexOf(existingModuleItemsArr.uuid)!==-1){
 													moduleItemsArr[addInArrayNum] = existingModuleItemsArr;
 													outputLinksOnlyArr.push({'link':existingModuleItemsArr.link, 'label':existingModuleItemsArr.label});
 													addInArrayNum++;
 												}
 											}
 										}
 									
 										if(moduleItemsArr.length>0){
 											moduleObj[key] = moduleItemsArr;
 										}
   									} else	{
   										moduleObj[key] = moduleContentArr[key];
   									}
								}
								outputContentJson[j]=moduleObj;
							}
							outputObj["aaData"]   = outputContentJson;
						}
						if(req.sendModuleLinks && req.sendModuleLinks==true){
							var outputObjNew = new Object();
							outputObjNew["admin_user"]   = isUserAdmin;
							outputObjNew["modules"]   = outputLinksOnlyArr;
							return cb(outputObjNew);
						} else {
							return cb(outputObj);
						}
 					}
				});
			}
		});
   	}else{
		outputObj["error"]   = "Authorization error!";
   		return cb(outputObj);
   	}
}
function requireLogin (req, res, next) {
	if(req.cookies[init.cookieName] != null && req.cookies[init.cookieName] != 'undefined' && req.cookies[init.cookieName]!=""){
		var session_id= req.cookies[init.cookieName];
		
   		authenticatedUser(session_id, function(user) {
   			if(user === null){
   				req.authenticationBool=false;
   				next();
   			}else{
   				req.authenticationBool=true;
				req.authenticatedUser = user;
				next();
			}
		});
	}else if(req.headers['token'] != null && req.headers['token'] != 'undefined' && req.headers['token']!=""){
		initFunctions.crudOpertions(db, 'tokens', 'findOne', null, 'code', 'jwttokensecret', null, function(tokenResult) {
			if(tokenResult.aaData){
				var secretKeyValue=tokenResult.aaData.token_content;
				var decodedToken = jwt.decode(req.headers['token'], secretKeyValue);
				var checkForExistence= '{"email": \''+decodedToken.email+'\', "status": { $in: [ 1, "1" ] }}';
				
				initFunctions.crudOpertions(db, 'users', 'findOne', null, null, null, checkForExistence, function(result) {
					if (result.aaData) {
						var returnUserDetsils= result.aaData;
						if(passwordHash.verify(decodedToken.password, returnUserDetsils.password)){
	   						returnUserDetsils['active_system_uuid']=returnUserDetsils.uuid_default_system;
							req.authenticationBool=true;
							req.authenticatedUser = returnUserDetsils;
							next();	
						}else{
							req.authenticationBool=false;
							next();	
		   				}
    	  			} else {
      					// search user by username
      					var checkForExistence= '{"username": \''+decodedToken.email+'\', "status": { $in: [ 1, "1" ] }}';
	      				initFunctions.crudOpertions(db, 'users', 'findOne', null, null, null, checkForExistence, function(result) {
							if (result.aaData) {
								var returnUserDetsils= result.aaData;
								if(passwordHash.verify(decodedToken.password, returnUserDetsils.password)){
									returnUserDetsils['active_system_uuid']=returnUserDetsils.uuid_default_system;
									req.authenticationBool=true;
									req.authenticatedUser = returnUserDetsils;
									next();	
								}else{
      								req.authenticationBool=false;
									next();
      							}
      						} else {
      							req.authenticationBool=false;
								next();
    	  		  			}
    					});
        			}
    			});
    		}else{
    			req.authenticationBool=false;
				next();
    		}
    	});
	}else{
		req.authenticationBool=false;
		next();
   	}
}
function system_preferences (req, res, next) {
	initFunctions.crudOpertions(db, 'system_preferences', 'findOne', null, "type", "default", "", function(result) {
		if (result.aaData) {
			req.system_preferences=result.aaData;
		}
		next();
	});
}

var authenticatedUser =function (auth_session_id, cb) {
	if(auth_session_id != null && auth_session_id != 'undefined' && auth_session_id !=""){
		var mongoIDField= new mongodb.ObjectID(auth_session_id);
		
		initFunctions.returnFindOneByMongoID(db, 'sessions', mongoIDField, function(result) {
			if(result.error) {
				return cb(null);	
			}else if(result.aaData) {
				var session_result= result.aaData;
				if(session_result.status==true || session_result.status=="true"){
				var returnUserDetsils = new Array();
				initFunctions.returnFindOneByMongoID(db, 'users', session_result.user_id, function(userDetails) {
					if(userDetails.error) return cb(null);
					if(userDetails.aaData){
						returnUserDetsils=userDetails.aaData;
						returnUserDetsils['auth_id']=session_result._id;
						var activeSystemID="";
						if(session_result.active_system_uuid && (session_result.active_system_uuid!=null || session_result.active_system_uuid!="null")){
							activeSystemID=session_result.active_system_uuid;
							returnUserDetsils['active_system_uuid']=session_result.active_system_uuid;
						}else{
							activeSystemID=returnUserDetsils.uuid_default_system;
							returnUserDetsils['active_system_uuid']=returnUserDetsils.uuid_default_system;	
						}
						if(session_result.fixture_page_selected_team && (session_result.fixture_page_selected_team!=null || session_result.fixture_page_selected_team!="null" || session_result.fixture_page_selected_team!="")){
							returnUserDetsils['fixture_page_selected_team']=session_result.fixture_page_selected_team;
						}
						return cb(returnUserDetsils);
					}
				});
				}else{
					return cb(null);
				}
			}else{
				return cb(null);
			}
		});
   	}else{
   		return cb(null);
   	}
}
}