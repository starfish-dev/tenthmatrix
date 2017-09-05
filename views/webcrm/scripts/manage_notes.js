var collectionStr=$("#table_name").val();
function save_note() {
	$(".note_msg_class").remove();
	
	var row = $(this).parents('.item-row');
	var noteUUID=$('.noteUUID').val();
	var noteField=row.find('.noteField').val();
	
	if(noteUUID!='' && noteField!=''){
		save_note_method(noteUUID, 'update', noteField);
	}else{
		$("#noteAlertMsgDiv").before('<div class="alert alert-danger note_msg_class">Please enter note!</div>');
		row.find('.noteField').focus();
	}
}
function destroy_basic_table(){
	$('#table-breakpoint').basictable('destroy');
}
function edit_note() {
	var row = $(this).parents('.item-row');
	row.find('.noteSpan').hide();
	row.find('.noteField').show();
	row.find('.savelink').show();
	row.find('.editlink').hide();
	row.find('.cancellink').show();
	row.find('.removelink').hide();
	
	row.find('.noteField').focus();
}
	
function cancel_note() {
	var row = $(this).parents('.item-row');
	var noteUUIDStr=row.find('.noteUUID').val();
	if(noteUUIDStr!=''){
		row.find('.noteSpan').show();
		row.find('.noteField').hide();
		row.find('.savelink').hide();
		row.find('.editlink').show();
		row.find('.cancellink').hide();
		row.find('.removelink').show();
	}else{
		row.hide();
	}
}
	
function remove_note() {
	$(".note_msg_class").remove();
	
	var row = $(this).parents('.item-row');
	var noteUUIDStr=row.find('.noteUUID').val();
	
	var dataString = 'note_uuid='+noteUUIDStr+'&action=delete&uuid='+table_row_id+'&table='+collectionStr;
	$.ajax({
		type: "POST",
		dataType: "json",
		url: backendDirectory+"/savenotes",
		data: dataString,
		cache: false,
		success: function(html){
			row.hide();
 			bind_notes();
		}
	});
}	

function bind_notes() {
	$(".savelink").unbind();
	$(".editlink").unbind();
  	$(".cancellink").unbind();
  	$(".removelink").unbind();
 
  	$(".savelink").click(save_note);
  	$(".editlink").click(edit_note);
  	$(".cancellink").click(cancel_note);
  	$(".removelink").click(remove_note);
}

function fetchNotes(){
	$("#notesTable").html("");
	var jsonRow=backendDirectory+"/collection_details?id="+table_row_id+"&collection="+collectionStr;
	$.getJSON(jsonRow,function(html){
			var contentHtml="";
			if(html.aaData){
				var notesArr=html.aaData.notes;
					$.each(notesArr, function(i,row){
						var added_by="Admin";
						if(row.user_name){
							added_by=row.user_name;
						}
						contentHtml+="<tr class='item-row'><td>"+added_by+"</td>";
						contentHtml+="<td>"+dateTimeFromUnix(row.modified)+"<input type='hidden' class='noteUUID form-control' value='"+row.uuid+"' ></td>";
						contentHtml+="<td><span class='noteSpan'>"+row.note+"</span><input type='text' class='noteField form-control' style='display:none;' value='"+row.note+"' ></td>";
						contentHtml+='<td class="hidden-xs">';
						if(row.user_uuid==auth_user_id){
							contentHtml+='<a href="javascript:void(0)" class="editlink"><i class="fa fa-pencil"></i></a><a href="javascript:void(0)" class="savelink" style="display:none;"><i class="fa fa-save"></i></a>';
							contentHtml+='<a href="javascript:void(0)" class="removelink" style="margin-left:10px;"><i class="fa fa-trash"></i></a><a href="javascript:void(0)" class="cancellink" style="display:none; margin-left:10px;"><i class="fa fa-remove"></i></a>';
						}else{
							contentHtml+='No action available';
						}
						contentHtml+="</td></tr>";
					});
     		}
			$("#notesTable").html(contentHtml);
			bind_notes();
			$('#table-breakpoint').basictable({
    				breakpoint: 751
   			});	
	});
}

function addNewNote(){
	$(".note_msg_class").remove();
		
	var noteStr= $("#add_note").val();
	
	if(noteStr!=''){
		save_note_method('','create', noteStr);
	}else{
		$("#add_note").before('<div class="alert alert-danger note_msg_class">Please enter note!</div>');
		$('#add_note').focus();
	}
}

function save_note_method(uuid,actionStr, note){
	$(".note_msg_class").remove();
	
	var dataString = 'note_uuid='+uuid+'&uuid='+table_row_id+'&table='+collectionStr+'&action='+actionStr+'&added_by='+auth_user_id+'&note='+note+'&user_name='+auth_user_name;
	$.ajax({
		type: "POST",
		url: backendDirectory+"/savenotes",
		data: dataString,
		dataType: 'json',
		cache: false,
		success: function(html){
			if(html.success){
				destroy_basic_table();
				fetchNotes();
				$("#noteAlertMsgDiv").before('<div class="alert alert-success note_msg_class">'+html.success+'</div>');
			} else if(html.error){
				$("#noteAlertMsgDiv").before('<div class="alert alert-danger note_msg_class">'+html.error+'</div>');
				$('#addNote').modal('hide');
			}
		}
	});
	$('#addNote').modal('hide');
	$('#add_note').val('');
}
$(function () {
	fetchNotes();
});