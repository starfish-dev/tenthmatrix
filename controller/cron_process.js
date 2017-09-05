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
	*  cron_process.js handles the http requests
	**/
	
var cron = require('node-cron');
var nodemailer = require('nodemailer');
var initFunctions = require('../config/functions');	

module.exports = function(init, db){
	var mongodb=init.mongodb;
	
	//send pending emails
	var send_email = function (db, db_id, from_addr, to_addr, subjectStr, bodyStr, cb){
		db.collection('system_lists').findOne({code: "aws-email-details"}, function(err, listDetails) {
			var outputObj = new Object();
			var emailApiUsername = process.env.emailApiUsername;
  			var emailApiHost = process.env.emailApiHost;
  		  	
  		  	if(listDetails && listDetails.list && listDetails.list.length>0){
				var listArr = listDetails.list;
				for(var i=0; i<listArr.length; i++){
					if(listArr[i].label=="Username")	{
						emailApiUsername = listArr[i].value;
					} else if(listArr[i].label=="Host"){
						emailApiHost = listArr[i].value;
					}
				}
			}
  		      
			var emailLinkStr= 'smtps://'+emailApiUsername+':'+emailApiHost;
		
			// create reusable transporter object using the default SMTP transport 
			var transporter = nodemailer.createTransport(emailLinkStr);		
				
			// setup e-mail data with unicode symbols 
			var mailOptions = {
				from: from_addr, // sender address 
    			to: to_addr, // list of receivers 
    			subject: subjectStr, // Subject line 
   				html: bodyStr // plaintext body
			};
		
 			// send mail with defined transport object 
			transporter.sendMail(mailOptions, function(error, info){
				if(error){
					outputObj["error"]   = error;
        			db.collection('email_queue').update({_id : new mongodb.ObjectID(db_id)}, { $inc: { status: 1 } }, (err, response) => {
						if (response){
							return cb(outputObj);
      					}
  					});
    			}	else	{
    				outputObj["success"]   = info.response;
    			
    				db.collection('email_queue').update({_id : new mongodb.ObjectID(db_id)}, { $set: {"status" : -1 } }, (err, response) => {
						if (response){
							return cb(outputObj);
      					}
  					});
    			}
    		});
		});
	}
	 
	function send_pending_emails (db){
  		db.collection('email_queue').find({$or: [ { 'status' : { $gt: -1 } }, { 'status': { $gt: '-1' } } ]}).sort({created: 1}).toArray(function(err, email_queue_arr) {
			if (email_queue_arr &&  email_queue_arr.length>0) {
				var emailSentArr = new Array(), emailFailArr= new Array();
				for(var i=0; i<email_queue_arr.length; i++) {
					send_email(db, email_queue_arr[i]._id, email_queue_arr[i].recipient, email_queue_arr[i].sender_email, email_queue_arr[i].subject, email_queue_arr[i].body,  function(returnedData){
						//console.log(returnedData)
					});
				}
				
      		}
		});
	}
		
	function maintain_fixture_history (db){
		var todayStr = new Date();
		var yesterdayStr = new Date(todayStr);
		yesterdayStr.setDate(todayStr.getDate() - 1);
		var yesterdayTimstampNum= Math.round(yesterdayStr.getTime()/1000);
		
		db.collection('fixtures').find({}).sort({'events.date_time': 1}).toArray(function(err, fixtures_arr) {
			if (fixtures_arr &&  fixtures_arr.length>0) {
				for(var i=0; i<fixtures_arr.length; i++){
					var fixtureDetails= fixtures_arr[i];
					if(fixtureDetails.events && fixtureDetails.events.length>0){
					
						var fixtureEvents=fixtureDetails.events;
						for(var j=0; j<fixtureEvents.length; j++){
							var fixtureEventDetails = fixtureEvents[j];
							if(fixtureEventDetails.date_time<=yesterdayTimstampNum){	// to check matches in past from last day
								fixtureEventDetails['fixture_event_uuid']=fixtureEventDetails.uuid;
								fixtureEventDetails['type']='fixture_details';
								delete fixtureEventDetails['uuid'];
								
								initFunctions.form_fixtures_history_obj(db, fixtureEventDetails, function(result) {
									//console.log(result);
								});
							}
						}
						
					}	
				}
      		}
		});
	}
	
	function pending_notifications_emailqueue (db){
		var emailPlainText='Hello {fullname},<br><br>Please click on the following link to view your notification :<br><a href="{linkStr}" target="_blank">{linkStr}</a>';
  		db.collection('email_templates').findOne({"code": "notifications",  status : { $in: [ 1, "1" ] } }, function(err, templateResponse) {
			if(templateResponse){
  				if(templateResponse.template_content && templateResponse.template_content!=""){
					emailPlainText= templateResponse.template_content;
  				}
  			}
  		});
  			
		db.collection('notifications').distinct('notify_to',{ 'read_status' : { $in: [ 0, "0" ] }},function(notifyErr, notifyUsers) {
    		if(notifyUsers) {
    			db.collection('users').find({ '_id' : { $in: notifyUsers }}, {firstname : 1, lastname : 1, allow_web_access: 1, email: 1, send_notifications: 1, access_right : 1 }).toArray(function(err, userObj) {
    				if(userObj){
						var saveBulkEmail = db.collection('email_queue').initializeUnorderedBulkOp();
						var data_to_Save_bool=false;
								
						for(var i=0; i<userObj.length; i++) {
							var userArr=userObj[i];
							if(userArr.send_notifications=="on" && userArr.access_right && (userArr.access_right==11 || userArr.access_right=="11")){ //to send email to admin users only
								data_to_Save_bool=true;
								var urlStr= init.appUrl;
								if(userArr.allow_web_access && (userArr.allow_web_access==1 || userArr.allow_web_access=="1"))	{
									urlStr= init.websiteUrl;
								}
								var hrefStr= urlStr+'/notifications';
								var plaintext = emailPlainText.replace("{fullname}", userArr.firstname);
								plaintext = plaintext.replace(/{linkStr}/g, hrefStr);
								
								var insertEmail=new Object();
								insertEmail["sender_name"]=userArr.firstname;
								insertEmail["sender_email"]=userArr.email;
								insertEmail["subject"]='You have some unread notifications';
								insertEmail["body"]=plaintext;
								insertEmail["created"]=initFunctions.currentTimestamp();
								insertEmail["modified"]=initFunctions.currentTimestamp();
								insertEmail["recipient"]=init.recipientStr;
								insertEmail["status"]=0; // to send email
							
  								saveBulkEmail.insert( insertEmail );
  								if(insertEmail._id)	{
  									delete insertEmail._id;
  								}
  							}
  						}
  						if(data_to_Save_bool){
  							saveBulkEmail.execute();
  						}
  					}						
    			});	
    		}
		});
	}
	
	cron.schedule('15 * * * *', function(){
		send_pending_emails(db);
  		maintain_fixture_history(db);
	});
	
	cron.schedule('2 17 * * *', function(){
  		pending_notifications_emailqueue(db);
	});
}