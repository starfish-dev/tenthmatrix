var tiny_options=new Array();
tiny_options['selector']= "textarea#Body";
tiny_options['theme']= "modern";
tiny_options['plugins']= "advlist autolink link image lists charmap print preview hr anchor pagebreak searchreplace wordcount visualblocks visualchars code fullscreen insertdatetime media nonbreaking save table contextmenu directionality emoticons template paste textcolor moxiemanager";
tiny_options['theme_advanced_buttons1']= "save,newdocument,|,bold,italic,underline,strikethrough,|,justifyleft,justifycenter,justifyright,justifyfull,|,styleselect,formatselect,fontselect,fontsizeselect";
tiny_options['theme_advanced_buttons2']= "cut,copy,paste,pastetext,pasteword,|,search,replace,|,bullist,numlist,|,outdent,indent,blockquote,|,undo,redo,|,link,unlink,anchor,image,cleanup,help,code,|,insertdate,inserttime,preview,|,forecolor,backcolor";
tiny_options['theme_advanced_buttons3']= "tablecontrols,|,hr,removeformat,visualaid,|,sub,sup,|,charmap,emotions,iespell,media,advhr,|,print,|,ltr,rtl,|,fullscreen";
tiny_options['theme_advanced_buttons4']= "insertlayer,moveforward,movebackward,absolute,|,styleprops,|,cite,abbr,acronym,del,ins,attribs,|,visualchars,nonbreaking,template,pagebreak";
tiny_options['theme_advanced_toolbar_location']= "top";
tiny_options['theme_advanced_toolbar_align']= "left";
tiny_options['theme_advanced_statusbar_location']= "bottom";
tiny_options['theme_advanced_resizing']= true;
tiny_options['setup'] = function(ed){
            ed.on('blur', function() {
                $("textarea#Body").html( tinyMCE.activeEditor.getContent() );
            });
            ed.on('change', function() {
               	$('#maintain_history').val(true);
            });
        }
tinymce.init(tiny_options);

//init chosen
var configDropDown = {
	'.chosen-select'           : {},
	'.chosen-select-deselect'  : {allow_single_deselect:true},
	'.chosen-select-no-single' : {disable_search_threshold:10},
	'.chosen-select-no-results': {no_results_text:'Oops, nothing found!'},
	'.chosen-select-width'     : {width:"95%"}
}

function addNewObject(){
	var newUUIDStr=guid();
	var htmlStr='<div class="row ObjectContentClass" style="background-color: aliceblue; padding: 20px; margin: 5px 5px 20px; border-radius: 5px;">';
	htmlStr+='<div class="col-sm-10  col-md-12 col-lg-7">';
    htmlStr+='<input type="hidden" class="span10" id="object_uuid" value="'+newUUIDStr+'" />';
	htmlStr+='<div class="form-group">';
    htmlStr+='<label for="" class="col-sm-2 control-label">Object Heading<sup class="required">*</sup></label>';
    htmlStr+='<div class="col-sm-9">';
    htmlStr+='<input type="text" class="form-control" id="obj_heading_'+newUUIDStr+'" value="" onblur="generate_manual_code(\'obj_chk_manual_'+newUUIDStr+'\',\'obj_heading_'+newUUIDStr+'\',\'obj_code_'+newUUIDStr+'\')" onkeyup="generate_manual_code(\'obj_chk_manual_'+newUUIDStr+'\',\'obj_heading_'+newUUIDStr+'\',\'obj_code_'+newUUIDStr+'\')">';
    htmlStr+='</div>';
    htmlStr+='</div>';
    htmlStr+='<div class="form-group">';
    htmlStr+='<label for="" class="col-sm-2 control-label">Code<sup class="required">*</sup></label>';
    htmlStr+='<div class="col-sm-9">';
    htmlStr+='<input type="text" class="form-control" id="obj_code_'+newUUIDStr+'" placeholder="" readonly value="">';
	htmlStr+='<span class="help-block" STYLE="font-size:12px;">';
	htmlStr+='<input id="obj_chk_manual_'+newUUIDStr+'" value="0" onChange="generate_manual_code(\'obj_chk_manual_'+newUUIDStr+'\',\'obj_heading_'+newUUIDStr+'\',\'obj_code_'+newUUIDStr+'\')" type="checkbox">';
	htmlStr+=' I want to manually enter code</span>';
    htmlStr+='</div>';
    htmlStr+='</div>';
    htmlStr+='<div class="form-group"><label for="" class="col-sm-2 control-label">Object Content</label><div class="col-sm-9">';
    htmlStr+='<TEXTAREA CLASS="form-control" STYLE="height:220px;" id="obj_content__'+newUUIDStr+'" ></TEXTAREA>';
	htmlStr+='</div></div>';
    htmlStr+='</div>';
    htmlStr+='<div class="col-lg-5">';
    htmlStr+='<div class="form-group"><label for="" class="col-sm-2 control-label">Order By<sup class="required">*</sup></label><div class="col-sm-9">';
    htmlStr+='<input type="text" class="form-control num" id="obj_order__'+newUUIDStr+'" placeholder="" value="0">';
    htmlStr+='</div></div>';
    htmlStr+='<div class="form-group"><label for="" class="col-sm-2 control-label"></label>';
    htmlStr+='<div class="col-sm-9" style="margin-top:6px;">';
	htmlStr+='<div STYLE="float:left; margin-right:10px;display:inline-block;">';
    htmlStr+='<label> <input type="checkbox" id="obj_status__'+newUUIDStr+'" value="1" checked> <strong style="font-weight:600">Active</strong></label>';
    htmlStr+='</div>';
	htmlStr+='</div>';
	htmlStr+='</div>';
    htmlStr+='</div>';		
	htmlStr+='</div>';
	$("#tab3Content").prepend(htmlStr);
}

function generateObjectsJson(){
	var createArr=new Array();
	var i=0;
	$('.ObjectContentClass').each(function(){
		var uuid=$(this).find('#object_uuid').val();
  		if($(this).find('#obj_code_'+uuid).val()!=""){
  			var createObject={};
  			createObject['uuid']=uuid;
  			createObject['name']=$(this).find('#obj_heading_'+uuid).val();
  			createObject['code']=$(this).find('#obj_code_'+uuid).val();
  			createObject['content']=$(this).find('#obj_content__'+uuid).val();
  			createObject['order_by']=$(this).find('#obj_order__'+uuid).val();
  			var checkManualNum=$(this).find('#obj_chk_manual_'+uuid).val();
  		
  			if(checkManualNum=="" || checkManualNum==null || checkManualNum === 'undefined'){
  				checkManualNum=0;
  			}
  			createObject['chk_manual']=checkManualNum;
  		
  			var statusNum=0;
  			if($(this).find('#obj_status__'+uuid).is(":checked")){
  				statusNum=1;
  			}
  			if(statusNum=="" || statusNum==null || statusNum === 'undefined'){
  				statusNum=0;
  			}
  			createObject['status']=statusNum;
  			createArr[i]=createObject;
  			i++;
  		}
  	});
  	$("#Objects").val(JSON.stringify(createArr));
}

function generateBlogJson(){
	var createArr=new Array();
	var i=0;
	$('.blogCommentsClass').each(function(){
		var createObject={};
		var uuid=$(this).find('#blog_uuid').val();
  		createObject['uuid']=uuid;
  		createObject['name']=$(this).find('#blog_name_'+uuid).val();
  		createObject['email']=$(this).find('#blog_email_'+uuid).val();
  		createObject['comment']=$(this).find('#blog_comment_'+uuid).val();
  		createObject['website']=$(this).find('#blog_website_'+uuid).val();
  		var statusNum=$(this).find('#blog_status__'+uuid).val();
  		
  		if($(this).find('#blog_status__'+uuid).is(":checked")){
  			statusNum=1;
  		}
  		if(statusNum=="" || statusNum==null || statusNum === 'undefined'){
  			statusNum=0;
  		}
  		createObject['status']=statusNum;
  		createArr[i]=createObject;
  		i++;
  	});
  	$("#BlogComments").val(JSON.stringify(createArr));
}

function generate_manual_code(chkd,name,code){
	var status=document.getElementById(chkd).checked;
	if(status!=true){
		generate_code(name,code);
	}else{
		document.getElementById(code).value="";
		$('#'+code).prop("readonly",false);
	}
}
function removeEmptyStrings(tempMetaTags){
	var returnMetaTags= tempMetaTags != "";
	return returnMetaTags;
}

function stopWords(tempMetaTags){
	var FORGETABLE_WORDS = ',the,of,an,and,that,which,is,was,';
	for(var i = 0, word; word = tempMetaTags[i++]; ) {
		if (FORGETABLE_WORDS.indexOf(',' + word + ',') > -1 || word.length <= 3) {
			tempMetaTags[i-1] = "";
    	}
	}
	tempMetaTags = tempMetaTags.filter(removeEmptyStrings);
	return tempMetaTags;
}

function generate_metaTags(){
	var doc=$("#Document").val();
	var Title=$("#Title").val();
	var Body=$("#Body").val();
	if($("#PageTitle").val()==""){
		$("#PageTitle").val(Title);
	}
	Body=Body.replace(/<\/?[^>]+(>|$)/g, "");
	if(Body.length>=250){
		var metaDescription=Body.substr(0, 250);
		$("#MetaTagDescription").val(metaDescription);
	}	
	
	var tempMetaTags=doc+" "+Title+" "+Body;
	tempMetaTags=tempMetaTags.split(" ");
	tempMetaTags=stopWords(tempMetaTags);
	
	$.unique(tempMetaTags);
	$("#MetaTagKeywords").val(tempMetaTags);
}

$(document).ready(function(){
	drawTagsUi();	// call this method to initialise tags
	
	load_systems();
	load_uploaded_image();
	fetch_history();
	/**
	loadImagesGallery();
	
	$("#search_here").change(function()	{
		loadImagesGallery();
	});	
	$('#search_here').keypress(function (e) {
  		if (e.which == 13) {
    		loadImagesGallery();
  		}
	});
	$("#searchBtn").click(function()	{
		loadImagesGallery();
	});**/
	
	$('form input').change(function() {
    	if(this.id == "Document" || this.id == "Title" || this.id == "Body" || this.id == "Code"){
     		$(this).change(function() {
     			$('#maintain_history').val(true);
     		});
    		$(this).blur(function() {
    			$('#maintain_history').val(true);
     		});
     	}
	});
	
	$("#type").change(function(){
		if($(this).val()=="blog"){
			$(".blogComments").show();
		}else{
			$(".blogComments").hide();
		}
	});
	
	$("#chk_manual").click(function(){
		if(document.getElementById('chk_manual').checked) {
			$('#Code').prop("readonly",false);
			$('#Code').val("");
		}else{
			$('#Code').prop("readonly",true);
			$('#Code').val("");
			generate_manual_code('chk_manual','Document','Code');
		}
	});
	
	$("#chk_manual_metatags").click(function(){
		if(document.getElementById('chk_manual_metatags').checked) {
			$('#PageTitle').prop("readonly",false);
			$('#MetaTagDescription').prop("readonly",false);
			$('#MetaTagKeywords').prop("readonly",false);
			$('#PageTitle').val("");
			$('#MetaTagDescription').val("");
			$('#MetaTagKeywords').val("");
		}else{
			$('#PageTitle').prop("readonly",true);
			$('#MetaTagDescription').prop("readonly",true);
			$('#MetaTagKeywords').prop("readonly",true);
			$('#PageTitle').val("");
			$('#MetaTagDescription').val("");
			$('#MetaTagKeywords').val("");
			generate_metaTags();
		}
	});
	
	if($("#Published_timestamp").val()!=""){
		var tempDisplayDate=return_datetimepicker_from_timestamp($("#Published_timestamp").val());
		$("#published_date").val(tempDisplayDate)
	}
	$('#datetime_picker').datetimepicker({
		defaultDate:new Date()
	});
		
	// validate form on keyup and submit
		$("#contentForm").validate({
			ignore: '',
			onkeyup: false,
			errorClass: 'error',
			validClass: 'valid',
			errorElement: "em",
			errorPlacement: function(error, element) {
				if (element.attr("id") == "published_date" ) {
					$('#datetime_picker').after(error);
            	}else{
					$(element).closest('div').append(error);
				}
			},
			onfocusout: false,
			invalidHandler: function(form, validator) {
				var errors = validator.numberOfInvalids();
				if (errors) {                    
					validator.errorList[0].element.focus();
				}
			},
			rules: {
				Document: { required: true },
				Body: { required: true },
				Code: { required: true },
				published_date: { required: true }
			},
			submitHandler: function(form) {
				var tempTags =$("#tags").val();
				if(tempTags!=""){
					$("#tags").val(JSON.stringify(tempTags.split(',')));
				}
				
				var userSystemsStr= $('#select_systems').val();  
				if(userSystemsStr!="" && userSystemsStr!=null && userSystemsStr!="undefined"){
					var	userSystemsArr=userSystemsStr.toString().split(",");
					var selectedSystemsStr= JSON.stringify(userSystemsArr);
					
					$('#shared_systems').val(selectedSystemsStr);
					$('#select_systems').remove();
				}
				if($("#type").val()=="blog" || $("#Type").val()=="blog"){
					generateBlogJson();
				}
				generateObjectsJson();
				var bodyContent=tinyMCE.get('Body').getContent();
				$("#Body").val(bodyContent);
				
				var publishedDateNum=return_timestamp_from_datetimepicker($("#published_date").val());
				$("#Published_timestamp").val(publishedDateNum);
				
				upload_single_file(form);	
 			}
		});	
});
function load_systems(){
	$("#select_systems").html("");
	var jsonRow=backendDirectory+"/api_fetch_list?limit=all&collection=systems";
	$.getJSON(jsonRow,function(response){
		if(response.aaData){
		var contentHtml="";
		if(response.aaData.length>0){
			$.each(response.aaData, function(i,row){
				if(defaultAssignedSystemVal!="" && defaultAssignedSystemVal!=row._id){
					var tempcontentHtml="<option value='"+row._id+"' ";
					if(selectedSharedSystemArr.length>0){
						if($.inArray( row._id, selectedSharedSystemArr)!==-1){
							tempcontentHtml+="selected";
						}
					}
					tempcontentHtml+=" >"+row.name+"</option>";
					contentHtml+=tempcontentHtml;
				}
			});
     	}
     	$("#select_systems").html(contentHtml);
     	
     	for (var selector in configDropDown) {
      		$(selector).chosen(configDropDown[selector]);
   		}
   		$("#select_systems").trigger("chosen:updated");
   		}
	});
}

function roll_back(btnID, btnsClass, uniqueIDStr, replaceIDStr, fieldName){
	$("."+btnsClass+"_"+uniqueIDStr).hide();
	$("#"+btnID+"_"+uniqueIDStr).show();
	$('#maintain_history').val(true);
	var replaceStr = $("#"+replaceIDStr+"_"+uniqueIDStr).val();
	if(fieldName=="Body"){
		tinyMCE.activeEditor.setContent(replaceStr);
	}else{
		$("#"+fieldName).val(replaceStr);
	}
}

function fetch_history(){
	$('.historyClass').hide();
	if($("#id").val()!=""){
		var jsonRow=backendDirectory+"/api_fetch_history?collection="+$('#table_name').val()+"&id="+$("#id").val();
		$.getJSON(jsonRow,function(response){
			if(response.aaData && response.aaData.length>0){
				var contentHtml="", documentStr=$('#Document').val(), titleStr=$('#Title').val(), bodyStr=$('#Body').val(), codeStr=$('#Code').val();
				
				$.each(response.aaData, function(i,row){
					var tempContentHTMLStr='';
					
					if(documentStr!==row.Document){
						tempContentHTMLStr+='<div class="col-sm-6 col-md-6" style="margin-top:10px;">Heading : <input type="hidden" id="d_rollback_val_'+row.history_created_uuid+'" value="'+row.Document+'"><button id="d_rollback_'+row.history_created_uuid+'" class="btn btn-danger btn-sm d_btns_'+row.history_created_uuid+'" onClick="roll_back(\'d_cancel\', \'d_btns\', \''+row.history_created_uuid+'\', \'d_rollback_val\', \'Document\'); return false;">Rollback</button><input type="hidden" id="d_original_val_'+row.history_created_uuid+'" value="'+documentStr+'"><button id="d_cancel_'+row.history_created_uuid+'" class="btn btn-primary btn-sm d_btns_'+row.history_created_uuid+'" style="display:none;" onClick="roll_back(\'d_rollback\', \'d_btns\', \''+row.history_created_uuid+'\', \'d_original_val\', \'Document\'); return false;">Cancel</button></div>';
					}
					if(titleStr!==row.Title){
						tempContentHTMLStr+='<div class="col-sm-6 col-md-6" style="margin-top:10px;">Title : <input type="hidden" id="t_rollback_val_'+row.history_created_uuid+'" value="'+row.Title+'"><button id="t_rollback_'+row.history_created_uuid+'" class="btn btn-danger btn-sm t_btns_'+row.history_created_uuid+'" onClick="roll_back(\'t_cancel\', \'t_btns\', \''+row.history_created_uuid+'\', \'t_rollback_val\', \'Title\'); return false;">Rollback</button><input type="hidden" id="t_original_val_'+row.history_created_uuid+'" value="'+titleStr+'"><button id="t_cancel_'+row.history_created_uuid+'" class="btn btn-primary btn-sm t_btns_'+row.history_created_uuid+'" style="display:none;" onClick="roll_back(\'t_rollback\', \'t_btns\', \''+row.history_created_uuid+'\', \'t_original_val\', \'Title\'); return false;">Cancel</button></div>';
					}
					if(codeStr!==row.Code){
						tempContentHTMLStr+='<div class="col-sm-6 col-md-6" style="margin-top:10px;">Code : <input type="hidden" id="c_rollback_val_'+row.history_created_uuid+'" value="'+row.Code+'"><button id="c_rollback_'+row.history_created_uuid+'" class="btn btn-danger btn-sm c_btns_'+row.history_created_uuid+'" onClick="roll_back(\'c_cancel\', \'c_btns\', \''+row.history_created_uuid+'\', \'c_rollback_val\', \'Code\'); return false;">Rollback</button><input type="hidden" id="c_original_val_'+row.history_created_uuid+'" value="'+codeStr+'"><button id="c_cancel_'+row.history_created_uuid+'" class="btn btn-primary btn-sm c_btns_'+row.history_created_uuid+'" style="display:none;" onClick="roll_back(\'c_rollback\', \'c_btns\', \''+row.history_created_uuid+'\', \'c_original_val\', \'Code\'); return false;">Cancel</button></div>';
					}
					if(bodyStr!==row.Body){
						tempContentHTMLStr+='<div class="col-sm-6 col-md-6" style="margin-top:10px;">Content : <textarea style="display:none;" id="b_rollback_val_'+row.history_created_uuid+'">'+row.Body+'</textarea><button id="b_rollback_'+row.history_created_uuid+'" class="btn btn-danger btn-sm b_btns_'+row.history_created_uuid+'" onClick="roll_back(\'b_cancel\', \'b_btns\', \''+row.history_created_uuid+'\', \'b_rollback_val\', \'Body\'); return false;">Rollback</button><textarea style="display:none;" id="b_original_val_'+row.history_created_uuid+'">'+bodyStr+'</textarea><button id="b_cancel_'+row.history_created_uuid+'" class="btn btn-primary btn-sm b_btns_'+row.history_created_uuid+'" style="display:none;" onClick="roll_back(\'b_rollback\', \'b_btns\', \''+row.history_created_uuid+'\', \'b_original_val\', \'Body\'); return false;">Cancel</button></div>';
					}
					if(tempContentHTMLStr!=""){
						contentHtml+='<div class="col-md-12 col-sm-12" style="padding-left:0px;"><h5 style="font-weight:bold;">'+row.modified_by_user+' ('+return_datetimepicker_from_timestamp(row.history_created_timestamp)+')</h5>'+tempContentHTMLStr+'</div>';
					}
					
				});
				$('.historyClass').show();
     			$("#history_content").html(contentHtml);
     		}
		});
	}
}

/**
var xhrStatus;
function loadImagesGallery(){
	var jsonRow=backendDirectory+"/api_fetch_list?start=0&limit=20&collection=fs.files";
	if($("#search_here").val()!=""){
		jsonRow+="&s="+$("#search_here").val();
	}
	if(xhrStatus) xhrStatus.abort();
	xhrStatus = $.getJSON(jsonRow,function(html){
		var contentHtml="";
		if(html.aaData.length>0){
			var noImageStr= backendDirectory+'/images/no_image.png';
			$.each(html.aaData, function(i,row){
				contentHtml+='<div><img src="'+backendDirectory+"/file/"+row.metadata.uuid+'?'+$.now()+'" class="img-responsive" style="border-radius: 0 0 3px 3px; border: 1px solid #ddd;" onerror="this.src=\''+noImageStr+'\'"/></div>';
			});
     	}
		$("#imageLibraryDiv").html(contentHtml);
	});
}**/
function load_uploaded_image(){
	var noImageStr= backendDirectory+'/images/no_image.png';
	if($("#uploaded_file_uuid").val()!="")	{
		$('.div_imagetranscrits').html('<img src="'+backendDirectory+"/file/"+$("#uploaded_file_uuid").val()+'?'+$.now()+'" class="img-responsive" style="border-radius: 0 0 3px 3px; border: 1px solid #ddd;" onerror="this.src=\''+noImageStr+'\'"/>')
		$('#displayImage').show();
	}
}

function upload_single_file(form){
$(".uploadFile").remove();
if( $('#file').length )	{
	if($('#file').val().length>0)	{
		$('#processingPrompt').modal('show');
		var guidStr=$("#uploaded_file_uuid").val();
		if(guidStr==""){
			guidStr= guid();
		}
		var data = new FormData();
		data.append('related_collection', $("#table_name").val());
		data.append('uuid', guidStr);
		data.append('collection_id', $("#id").val());
		data.append('type', $("#table_name").val());
		
		var filesize=Number($('#file')[0].files[0].size)/(1024*1024);
		
		if(filesize>5){
			$('#contentForm').before('<div class="alert alert-error alert-dismissable uploadFile"><button aria-hidden="true" data-dismiss="alert" class="close" type="button">×</button>The file size larger than 5MB is not allowed</div>');
			$('#file').focus();
		}else{
			var files= $('#file')[0].files;
			var fileNameStr =files[0].name;
				$.each(files, function(key, value){
					data.append('file', value);
				});
			
				$.ajax({
					url: backendDirectory+'/find_remove_file',
					type: 'POST',
					data: {'uuid' : guidStr},
					dataType: 'json',
					success: function(response){
						if(response.success){
							$.ajax({
								url: backendDirectory+'/upload',
								type: 'POST',
								data: data,
								dataType: 'json',
								contentType: false,
								enctype: 'multipart/form-data',
								cache: false,
								processData: false, // Don't process the files
								success: function(response){	
									$('#processingPrompt').modal('hide');
									if(response.success && response._id && response._id!=""){
										$("#uploaded_file_uuid").val(guidStr);
										$("#uploaded_file_name").val(fileNameStr);
										
										$("#file").prop('disabled', true);	//disable the file field
										dataAsJson('contentForm', form);
									} else if(response.error) {
										$('#contentForm').before('<div class="alert alert-error alert-dismissable uploadFile"><button aria-hidden="true" data-dismiss="alert" class="close" type="button">×</button>'+response.error+'</div>');
									}else {
										$('#contentForm').before('<div class="alert alert-error alert-dismissable uploadFile"><button aria-hidden="true" data-dismiss="alert" class="close" type="button">×</button>Sorry, error in uploading file!</div>');
									}
								}
							});
						}else {
							$('#contentForm').before('<div class="alert alert-error alert-dismissable uploadFile"><button aria-hidden="true" data-dismiss="alert" class="close" type="button">×</button>Sorry, error in uploading file!</div>');
						}
					}
				});
		}
	}	else {
		dataAsJson('contentForm', form);
	}
}	else {
	dataAsJson('contentForm', form);
}
}