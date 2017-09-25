var menuxhr, allDefaultTagsArr= new Array();;
function __alertModalBox(msg){
	$("#globalMessage").html(msg);
	$('#globalPrompt').modal('show');
}

function generate_code(name,code){
	var val=document.getElementById(name).value;
	var patt=/[^A-Za-z0-9_-]/g;
	var result=val.replace(patt,' ');
	result=result.replace(/-/g, ' ');
	result=result.replace(/\s+/g, ' ');
	result = result.replace(/^\s+|\s+$/g,'');
	result=result.replace(/\s/g, '-');
	result=result.toLowerCase();
	document.getElementById(code).value=result;
}

function dateTimeFromUnix(UNIX_timestamp, showTimeBool){
	if (typeof showTimeBool === "undefined") { 
		showTimeBool = true;
	}
	var a = new Date(UNIX_timestamp * 1000);
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
	var year = a.getFullYear();
	var month = months[a.getMonth()];
	var dateNum = a.getDate();
	
	var time = month + ' ' + dateNum + ' ' + year;
	
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
	return time;
}

function return_datetimepicker_from_timestamp(UNIX_timestamp,showDateBool,showTimeBool){
	if (typeof showDateBool === "undefined") { 
		showDateBool = true;
	}
	if (typeof showTimeBool === "undefined") { 
		showTimeBool = true;
	}
	var a = new Date(UNIX_timestamp * 1000), time='';
    if(showDateBool){
		var time = a.getMonth()+1 + '/' + a.getDate() + '/' + a.getFullYear();
	}
	if(showDateBool && showTimeBool){
		time += ' ';
	}
	if(showTimeBool){
		var hour = a.getHours();
		var timeStr="AM";
  		if(hour>12){
  			timeStr="PM";
  			hour= hour-12;
  		} 
  		var min = a.getMinutes().toString();
  		if(min.length==1)	{
  			min = "0"+min;
  		}
  		time += hour + ':' + min + " " + timeStr ;
  	}
	return time;
}

function datetime_picker_format(UNIX_timestamp){
	var a = new Date(UNIX_timestamp * 1000);
    
	var year = a.getFullYear();
	var month = a.getMonth()+1;
	var dateNum = a.getDate();
	var hour = a.getHours();
	var min = a.getMinutes();
	var sec = a.getSeconds();
	var time = year + '-' + month + '-' + dateNum + ' ' + hour + ':' + min ;

	return time;
}

function date_picker_format(UNIX_timestamp){
	var a = new Date(UNIX_timestamp * 1000);
    
	var year = a.getFullYear();
	var month = a.getMonth()+1;
	var dateNum = a.getDate();
	var time = dateNum + '/' + month + '/' + year;

	return time;
}

function getTimestampFromDate(dateString, dateFrom){
	if (typeof dateFrom === "undefined") { 
		dateFrom = '';
	}
	var dateParts = dateString.split('/'),	date;
	var newDate=dateParts[1]+"/"+dateParts[0]+"/"+dateParts[2];
	date = new Date(newDate);
	
	if(dateFrom == 'start'){
		date.setHours(0,0,0,0);
	} else if(dateFrom == 'end'){
		date.setHours(23,59,59,0);
	}
	
	date= date.getTime();
	date= parseInt(date)/1000;
	return date;
}

//used to draw autocomplete dropdown on load
function fetch_collection_autocomplete_list(collectionStr, fieldID, sVal, searchFieldName, searchFieldValue){
	$("#"+fieldID).html("");
	if (typeof searchFieldName === "undefined") { 
		searchFieldName = '';
	}
	if (typeof searchFieldValue === "undefined") { 
		searchFieldValue = '';
	}
	if (typeof sVal === "undefined") { 
		sVal = '';
	}
	if(sVal!=""){
		var jsonRow=backendDirectory+"/collection_details?id="+sVal+"&collection="+collectionStr;
		$.getJSON(jsonRow,function(html){
			var contentHtml="<option value=''></option>";
			var contentObj=html.aaData;
			if(contentObj){
				contentHtml+="<option value='"+contentObj._id+"' ";
				if(sVal==contentObj._id){
					contentHtml+="selected";
				}
					var nameStr='';
					if(collectionStr=='users' || collectionStr=='employees'){
						if(contentObj.firstname){
							nameStr+=contentObj.firstname;
						}
						if(contentObj.lastname){
							nameStr+=" "+contentObj.lastname;
						}
					} else{
						nameStr=contentObj.name;
					}
				contentHtml+=" >"+nameStr+"</option>";
     		}
			$("#"+fieldID).html(contentHtml);
			$("#"+fieldID).combobox();
		});
	}else{
		var jsonRow=backendDirectory+"/api_fetch_list?start=0&limit=20&collection="+collectionStr;
		if(searchFieldName!='' && searchFieldValue!=''){
			jsonRow+='&findFieldName='+searchFieldName+'&findFieldValue='+searchFieldValue;
		}
		$.getJSON(jsonRow,function(html){
			var contentHtml="<option value=''></option>";
			if(html.aaData.length>0){
					$.each(html.aaData, function(i,row){
						contentHtml+="<option value='"+row._id+"' ";
						if(sVal==row._id){
							contentHtml+="selected";
						}
						var nameStr='';
						if(collectionStr=='users' || collectionStr=='employees'){
							if(row.firstname){
								nameStr+=row.firstname;
							}
							if(row.lastname){
								nameStr+=" "+row.lastname;
							}
						} else{
							nameStr=row.name;
						}
						contentHtml+=" >"+nameStr+"</option>";
					});
     		}
			$("#"+fieldID).html(contentHtml);
			$("#"+fieldID).combobox();
		});
	}	
}

function return_timestamp_from_datetimepicker(dateString, getTimeBool, dateFrom){
	if (typeof dateFrom === "undefined") { 
		dateFrom = '';
	}
	if (typeof getTimeBool === "undefined") { 
		getTimeBool = true;
	}
	
	var date;
	if(dateString!=""){
	if(getTimeBool){
		var dateTimeParts = dateString.split(' '),
		timeParts = dateTimeParts[1].split(':'),
		dateParts = dateTimeParts[0].split('/'),
		timeFormat = dateTimeParts[2],
		hoursNum = parseInt(timeParts[0]);
	
		if(timeFormat=="PM"){
			if(hoursNum == 12) {
          	  hoursNum =hoursNum;
        	} else {
           	 hoursNum = parseInt(hoursNum) + 12;
        	}
		}
		date = new Date(dateParts[2], parseInt(dateParts[0])-1, dateParts[1], hoursNum, timeParts[1]);
	} else	{
		var dateParts = dateString.split('/'),	date;
		date = new Date(dateParts[2], parseInt(dateParts[0])-1, dateParts[1]);
	}
	//console.log(dateFrom);
	if(dateFrom == 'start'){
		date.setHours(0,0,0,0);
	} else if(dateFrom == 'end'){
		date.setHours(23,59,59,0);
	}
	date= date.getTime();
	date= parseInt(date)/1000;
	}
	return date;
}

function getTimestampFromDateTime(dateString){
	var dateTimeParts = dateString.split(' '),
	timeParts = dateTimeParts[1].split(':'),
	dateParts = dateTimeParts[0].split('-'),
	date;

	date = new Date(dateParts[0], parseInt(dateParts[1], 10) - 1, dateParts[2], timeParts[0], timeParts[1]);
	date= date.getTime();
	date= parseInt(date)/1000;
	return date;
}

function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}

//function to do sorting depending upon field name passed
function dynamicSort(property) {
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

//called from every entry form to pass all values as json to save request
function dataAsJson(name, form){
	var x = $("#"+name).serializeArray();
	var outputObj = new Object();
    $.each(x, function(i, field){
    	if(field.name!="id" && field.name!="table_name" && field.name!="unique_field" && field.name!="editorField" && field.name!="editorValue" && field.name!="data"){
    		$("input[name="+field.name+"]").removeAttr('name');
        	outputObj[field.name]   = field.value;
     	}
    });
    $("#data").val(JSON.stringify(outputObj));
	form.submit();
}

//call api to swtich in between systems 
function switchInSystems(id){
	var jsonRow = backendDirectory+'/swtich_user_system?id='+id;
	$.getJSON(jsonRow,function(result){
		if(result.success){
			window.location.href=backendDirectory+"/index";
		}
	});
}

//to fetch logged in user accessed sites 
function fetch_users_sites(){
	$("#swtich_sites").html('');
	var jsonRow = backendDirectory+'/fetch_user_systems';
	$("#loggedInUserSystems").hide();
	$.getJSON(jsonRow,function(result){
		var activeSystemStr="", logoPathStr="", activeSystemNameStr="";
		if(result.active_system){
			activeSystemStr=result.active_system;
		}
		if(result.aaData){
			var contentHtmlStr="", countUserSystems=0;
			$.each(result.aaData, function(i,item){
				countUserSystems++;
				contentHtmlStr+='<li class="';
				if(item._id==activeSystemStr){
					activeSystemNameStr=item.name;
					contentHtmlStr+='active2';
					
				}
				contentHtmlStr+='"><a href="javascript:void(0)" onClick="switchInSystems(\''+item._id+'\'); return false;">'+item.name+'</a></li>';     
			});
			if(countUserSystems>=1){
				$("#loggedInUserSystems").show();
				$(".totalLoggedInUserSystems").html(countUserSystems);
				$("#swtich_sites").append(contentHtmlStr);
			}
		}
		/**if(logoPathStr!=""){
			$("#root_logo").attr("src", logoPathStr);
		}**/
		if(activeSystemNameStr!=""){
			document.title = activeSystemNameStr;
			$('#activeSystemNameID').show();
			$('#activeSystemNameID').html('<a href="javascript:void(0)">'+activeSystemNameStr+'</a>');
		}
	});
}

//to draw sidebar navigation saved
function load_navigation_data(){
	$("#dashboard-menu").html('');
	var jsonRow = backendDirectory+'/load_navigator';
	var keyword= $("#menuSearchBox").val();
	if(keyword!='' && keyword!='undefined'){
		jsonRow +='?s='+keyword;
	}
	
	if(menuxhr) menuxhr.abort();
	menuxhr=$.getJSON(jsonRow,function(result){
		if(result.aaData){
			var urlStr = window.location.pathname;
			var findStr=backendDirectory;
			if(urlStr.indexOf(findStr)!==-1){
				var openedFileNameStr = urlStr.substring(findStr.length);
			}else{
				var openedFileNameStr = urlStr;
			}
			var table_html='<li class="treeview';
			
			if(openedFileNameStr=="index" || openedFileNameStr=="" || openedFileNameStr=="/"){
				table_html+=' active ';
			}	
			table_html+='"><a href="'+backendDirectory+'/"><i class="fa fa-dashboard"></i> <span>Dashboard</span><span class="pull-right-container"><i class="fa fa-angle-left pull-right"></i></span></a></li>';
			
			$.each(result.aaData, function(i,item){
				if(item.active==1){
					var activeMenuFlag=false;
					if(item.module_items){
						if(item.module_items!=""){
							try{
								var module_items = JSON.parse(item.module_items); 
        					}	catch (error){
       							var module_items =  item.module_items; 
    						}
						
							module_items.sort(dynamicSort("item_sort_order"));
							
							var iconNameStr='';
							if(item.icon_class!=""){
								iconNameStr='<i class="'+item.icon_class+'"></i>';
							}
							if(item.icon_path!=""){
								iconNameStr='<img width="24" height="24" src="'+item.icon_path+'" alt="">';
							}
														
							var subTableHtmlStr="";	
							$.each(module_items, function(i,row){
								var linkStr=row.link;
								if(openedFileNameStr==row.link){
									activeMenuFlag=true;
									subTableHtmlStr+='<li class="active">';
								}else{
									subTableHtmlStr+='<li>';
								}
								subTableHtmlStr+='<a href="'+backendDirectory+row.link+'" ';
								if(row.target==0){
									subTableHtmlStr+=' target="_blank" ';
								}
								subTableHtmlStr+='><i class="fa fa-circle-o"></i> '+row.label+'</a></li>';
							});
									
							if(activeMenuFlag){
								table_html+='<li class="active treeview">';
							}else{
								table_html+='<li class="treeview">';
							}
							table_html+='<a href="#">'+iconNameStr+' <span>'+item.name+'</span><span class="pull-right-container"><i class="fa fa-angle-left pull-right"></i></span></a>';
							table_html+='<ul class="treeview-menu">'+subTableHtmlStr+'</ul>';
						}
					}   
				}             
			});
			$("#dashboard-menu").append(table_html);
		}
	});
}

//uppercase first letter of string
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

//to fetch logged in user's activity
function fetch_activity_log(){
	var jsonRow=backendDirectory+"/api_fetch_list?limit=8&collection=activity_log";
	$.getJSON(jsonRow,function(html){
		if(html.aaData && html.aaData.length>0){
			var contentHtml='';
			$.each(html.aaData, function(i,row){
				var labelStr=row.label;
				if(labelStr.length>25){
					labelStr = labelStr.substr(0, 25);+'...';
				}
				contentHtml+='<p><a HREF="'+row.last_clicked_link+'"><i CLASS="fa fa-dot-circle-o"></i> '+capitalizeFirstLetter(labelStr)+'</a></p>';
			});
			if(contentHtml!=""){
				$('.lastClickedLinkCss').html(contentHtml);
				$("#lastClickedListID").show();
			}
     	}
	});
}

//to load notoifications of logged in user
function load_notifications(){
	var jsonRow=backendDirectory+"/load_notifications?start=0&limit=10";
	$.getJSON(jsonRow,function(html){
		if(html.error){
				
		}else{
			if(html.total){
				$(".notificationCount").html(html.total);
			}
			var contentHtml="";
			$.each(html.aaData, function(i,row){
				var msgStr="", iconClass='fa fa-folder text-yellow', activeClass='text-red';
				
				if(row.read_status=="1" || row.read_status==1)	{
					activeClass="text-aqua";
					iconClass='fa fa-folder-open';
				}
				
				if(row.message_type=="comment")	{
					msgStr="A new message";
					iconClass="fa fa-envelope-o";
				}
				if(row.subject && row.subject!="") {
					msgStr=row.subject;
				}else if(row.message && row.messgae!="")	{
					msgStr=row.message;
				}
				if(msgStr.length>50){
					msgStr = msgStr.substr(0, 50)+"...";
				}
						
				contentHtml+='<li><a href="'+backendDirectory+'/change_notifications?id='+row._id+'"  data-ajax="false"><i class="'+iconClass+' '+activeClass+'"></i><span style="font-size:11px;">'+dateTimeFromUnix(row.created, false)+'</span>: '+msgStr+'</a></li>';
			});
			$("#notificationsUl").html(contentHtml);
		}
	});
}

//to fetch all the saved tags
function fetch_saved_tags(val){
	var jsonRow=backendDirectory+"/api_fetch_list?limit=all&collection=tags";
	$.getJSON(jsonRow,function(html){
		if(html.aaData && html.aaData.length>0){
			$.each(html.aaData, function(i,row){
				allDefaultTagsArr.push(row.name);
			});
     	}
	});
}

//to draw tags ui on form and also draw dropdown of saved tags in system
function drawTagsUi(){
	fetch_saved_tags();
	
	$('#tags').keypress(function(event){
		if(event.keyCode == 13) {
      		event.preventDefault();
      		return false;
   		}
  	});
  	
  	var existingTagsStr=$("#default_tags").val();
  	  	
  	var existingTagsArr = existingTagsStr.split(',');
  	$('#tags').tagEditor({
		initialTags: existingTagsArr,
		delimiter: ',',
		placeholder: 'Enter tags ...',
  		autocomplete: {
        	delay: 0, // show suggestions immediately
       		position: { collision: 'flip' }, // automatic menu position up/down
        	source: allDefaultTagsArr
   		},
   		forceLowercase: false,
    	placeholder: 'Add Tags',
    	beforeTagSave: function(field, editor, tags, tag, val) {
    		if($.inArray( val, allDefaultTagsArr)==-1){
    			generate_default_tags(val);
        	}
    	}
	});
}

//to fetch detail from "system_lists" table depending upon code
function fetch_default_list(codeStr, sVal, drawDivID){
	var jsonRow=backendDirectory+"/api_fetch_list?collection=system_lists&findFieldName=code&findFieldValue="+codeStr;
	$.getJSON(jsonRow,function(result){
		var contentHtml="<option value=''>--Select--</option>";
		
		if(result.iTotalRecordsReturned>0){
			$.each(result.aaData, function(i,row){
				var iconsData= row;
				if(iconsData.list && iconsData.list.length>0)	{
					var iconsListArr= iconsData.list;
					iconsListArr.sort(dynamicSort("item_sort_order"));
				
					$.each(iconsListArr, function(j,rowData){
						var tempValStr=rowData.label;
						if(rowData.value && rowData.value!=""){
							tempValStr=rowData.value;
						}
						contentHtml+="<option value='"+tempValStr+"' ";
						if(sVal==tempValStr){
							contentHtml+="selected";
						}
						contentHtml+=" >"+rowData.label+"</option>";
					});
				}
			});
     	}
		$("#"+drawDivID).html(contentHtml);
	});
}

//to call api to save new tags defined in a separate table
function generate_default_tags(val){
	var codeStr=val;
    var postContentURL=backendDirectory+"/api_crud_post";
   	$.ajax({
		type: "POST",
		dataType: "json",
		url: postContentURL,
		data: {"collection" : "tags", "action" : "create", "fieldName" : "name", "fieldValue" : val, "name" : val},
		success: function(response){
			console.log(response);
		}
	});
}
 function populate_bootstrap_datepicker(inputId, outputId)	{
 	if($('#'+inputId).val()!="" && $('#'+inputId).val()!="NaN")	{
 		var convertStr=return_datetimepicker_from_timestamp($('#'+inputId).val(),true,false);
 		$('#'+outputId).val(convertStr);
 	}
 }
 
//to get age from timestamp passed
function getAge(date) {
	var now = new Date();
  	var birthDate = new Date(date * 1000);
	
	function isLeap(year) {
		return year % 4 == 0 && (year % 100 != 0 || year % 400 == 0);
  	}

  	// days since the birthdate    
  	var days = Math.floor((now.getTime() - birthDate)/1000/60/60/24);
  	var age = 0;
  	// iterate the years
  	for (var y = birthDate.getFullYear(); y <= now.getFullYear(); y++){
    	var daysInYear = isLeap(y) ? 366 : 365;
    	if (days >= daysInYear){
      	days -= daysInYear;
      	age++;
      	// increment the age only if there are available enough days for the year.
    	}
  	}
  	return age;
}

//to check entered digit is number
	function checknumber(e)	{
		var k = e.which;
		/* numeric inputs can come from the keypad or the numeric row at the top */
		 if ((k<48 || k>57) && (k!=46) && (k!=8) && (k!=0)) {
			e.preventDefault();
			//alert("Allowed characters are 0-9, +, -, (, )");
			return false;
		}
	}
$(function () {
	$('#menuSearchBox').keypress(function (e) {
  		if (e.which == 13) {
    		load_navigation_data();
  		}
	});
	$('.num').keypress(function(e){
		checknumber(e);	
	}); 
    load_navigation_data();
    fetch_users_sites();
    load_notifications();
	fetch_activity_log();
});

//function to fetch pdf templates and draw as dropdown
function fetch_display_pdf_templates (){
	var jsonRow=backendDirectory+"/api_fetch_list?limit=all&collection=templates&findFieldName=type&findFieldValue=pdf_template";
		
		$.getJSON(jsonRow,function(html){
			var contentHtml="<option value=''>--Select--</option>";
			if(html.aaData.length>0){
				$.each(html.aaData, function(i,row){
					contentHtml+="<option value='"+row.code+"' ";
					if($("#selected_template").val()==row._id){
						contentHtml+="selected";
					}
					contentHtml+=" >"+row.name+"</option>";
				});
     		}
			$("#template").html(contentHtml);
		});
}