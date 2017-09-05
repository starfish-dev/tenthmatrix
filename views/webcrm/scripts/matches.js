var initialSize=0, pageSize=9, totalItemsNum=0;
var start=0, end=pageSize, xhrStatus;

function refreshDatePicker(){
	start=initialSize, end=pageSize;
	$('#table-breakpoint').basictable('destroy');
	
	$('#documents_data').html('');
	$('#start_date').val('');
	$('#end_date').val('');
	loadFixtureEvents();
}

function load_more(){
	$('.combobox').combobox("destroy"); 
	$('#table-breakpoint').basictable('destroy');
	$('#display_more_btn').hide();
	$('#img_loading_div').show();
	var temp_start= end;
	start=end+1;
	end=temp_start+pageSize;
	loadFixtureEvents();
}
function refreshSearchTeams(e){
	var jsonRow=backendDirectory+"/collection_details?collection=teams&id="+e;
		
		$.getJSON(jsonRow,function(html){
			if(html.aaData){
				var searchTeamStr="<option value='"+html.aaData._id+"' selected>"+html.aaData.name+"</option>";
				$("#search_by_team").html(searchTeamStr);
				$('#search_by_team').combobox('destroy');	
				$('#search_by_team').combobox();			
			}
		});
}
function loadFixtureEvents(){
	$('#img_loading_div').show();
	
	var contentHTML="";
	var jsonRow=backendDirectory+"/api_fetch_fixtures?id="+$('#id').val();
	if($('#start_date').val() && $('#start_date').val()!=""){
		var startTimestamp = getTimestampFromDate($('#start_date').val(), 'start');
		jsonRow+="&startTimestamp="+startTimestamp;
	}
	if($('#end_date').val() && $('#end_date').val()!=""){
		endTimestamp= getTimestampFromDate($('#end_date').val());
		jsonRow+="&endTimestamp="+getTimestampFromDate($('#end_date').val(), 'end');
	}
	if($('#search_by_team').val() && $('#search_by_team').val()!=""){
		selectedTeamStr= $('#search_by_team').val();
		jsonRow+="&selected_team="+$('#search_by_team').val();
	}
	
	jsonRow+="&start="+start+"&end="+end;

	if(xhrStatus) xhrStatus.abort();
	xhrStatus=$.getJSON(jsonRow,function(html){
		if(html.selected_team){
			refreshSearchTeams(html.selected_team);
		}
		if(html.iTotalDisplayRecords){
			totalItemsNum=html.iTotalDisplayRecords;
		}
		if(html.aaData){
			var events_items =html.aaData;
			if(events_items.length>0){
				events_items.sort(dynamicSort("date_time"));
				for(var i=0; i< events_items.length; i++){
					var eventsHTML="", oversNum=0, fixture_type_id='', fixture_type='';
					eventsHTML+='<tr class="teamsTRClass" id="tr_'+events_items[i].uuid+'" >';
    				if(events_items[i].total_overs){
    					oversNum=events_items[i].total_overs;
    				}
    				if(events_items[i].fixture_type){
    					fixture_type=events_items[i].fixture_type;
    				}
    				if(events_items[i].fixture_type_id){
    					fixture_type_id=events_items[i].fixture_type_id;
    				}
    				eventsHTML+='<td><input onChange="rowDataChange(\''+events_items[i].uuid+'\')" type="text" id="date_time" value="'+datetime_picker_format(events_items[i].date_time)+'" class="form-control form_datetime"><input type="hidden" id="uuid" value="'+events_items[i].uuid+'"></td>';
					eventsHTML+='<td><div class="ui-widget"><select id="home_team" class="form-control combobox "><option value="'+events_items[i].home_team_uuid+'">'+events_items[i].home_team_name+'<option></select><a target="_blank" href="'+backendDirectory+'/team?_id='+events_items[i].home_team_uuid+'&fixture='+events_items[i].uuid+'" title="Check players availability" style="position:relative;"><i class="fa fa-link"></i></a></div></td>';
					eventsHTML+='<td><div class="ui-widget"><select id="away_team" class="form-control combobox "><option value="'+events_items[i].away_team_uuid+'">'+events_items[i].away_team_name+'<option></select><a target="_blank" href="'+backendDirectory+'/team?_id='+events_items[i].away_team_uuid+'&fixture='+events_items[i].uuid+'" title="Check players availability" style="position:relative;"><i class="fa fa-link"></i></a></div></td>';
					eventsHTML+='<td><div class="ui-widget"><select id="venue" class="form-control combobox"><option value="'+events_items[i].venue_uuid+'">'+events_items[i].venue_name+'<option></select></div></td>';
					eventsHTML+='<td><input id="publish_on_web" type="checkbox" ';
					if(events_items[i].publish_on_web==true || events_items[i].publish_on_web=="true"){ 
						eventsHTML+='checked';
					}
					eventsHTML+=' class="toggleCheckbox" onChange="rowDataChange(\''+events_items[i].uuid+'\')"></td>';
					eventsHTML+='<td>';
					eventsHTML+='<input type="hidden" id="total_overs" value="'+oversNum+'" ><input type="hidden" id="fixture_type" value="'+fixture_type+'" ><input type="hidden" id="fixture_type_id" value="'+fixture_type_id+'" >';
					
					eventsHTML+='<a id="detail_'+events_items[i].uuid+'" target="_blank" title="Match details" href="match?fixture_id='+$('#id').val()+'&uuid='+events_items[i].uuid+'" style="margin-right:10px;"><i class="fa fa-link"></i></a>';
					eventsHTML+='<a href="javascript:void(0)" class="savelink" title="Save the changes" onclick="saveItem(this,\''+events_items[i].uuid+'\')"><i class="fa fa-save"></i></a>';
					eventsHTML+='<a href="javascript:void(0)" class="removelink" title="Remove" onclick="removeItem(\''+events_items[i].uuid+'\')" style="margin-left:10px;"><i class="fa fa-trash"></i></a></td>';
					eventsHTML+='</tr>';
					
					/**if(selectedTeamStr!="" && selectedTeamStr!="null" && selectedTeamStr!=null && selectedTeamStr!="undefined"){
						if(selectedTeamStr==events_items[i].home_team_uuid || selectedTeamStr==events_items[i].away_team_uuid){
    						contentHTML+=eventsHTML;
    					}
    				}else {
    					contentHTML+=eventsHTML;
    				}**/
    				contentHTML+=eventsHTML;
    			}
    			$('#documents_data').append(contentHTML);
			}
			if(totalItemsNum>end)	{
    	 		$('#display_more_btn').show();
    	 	}
		}
		$('#img_loading_div').hide();
    
   		//initialize table
		$('#table-breakpoint').basictable({
  			breakpoint: 751
		});				
		basicInitialisations();		
	});
}

function basicInitialisations(){
	//toggle checkbox button
	$('.toggleCheckbox').bootstrapToggle({
      	on: 'Yes',
      	off: 'No'
    });
    
    //combobox
    $('.combobox').combobox();			
	
	//date time picker 
	$('.form_datetime').datetimepicker({
		weekStart: 1,
        todayBtn:  1,
		autoclose: 1,
		todayHighlight: 1,
		startView: 2,
		forceParse: 0,
		pickerPosition: "bottom-left",		
        showMeridian: 1,
		pickTime: 0
	});
}

var teamsHtmlStr='<option value=""></option>';
var venueHtmlStr='<option value=""></option>';

function addNewFixture(){
	var newuuid=guid();
	var addNewRowHtml= "<tr class='teamsTRClass newRowClass' id='tr_"+newuuid+"'>";
	addNewRowHtml+= '<td><input type="text" id="date_time" value="" class="form-control form_datetime"><input type="hidden" id="uuid" value="'+newuuid+'"></td>';
	addNewRowHtml+= '<td><div class="ui-widget"><select id="home_team" class="form-control combobox">'+teamsHtmlStr+'</select></div></td>';
	addNewRowHtml+= '<td><div class="ui-widget"><select id="away_team" class="form-control combobox">'+teamsHtmlStr+'</select></div></td>';
	addNewRowHtml+= '<td><div class="ui-widget"><select id="venue" class="form-control combobox">'+venueHtmlStr+'</select></div></td>';
	addNewRowHtml+= '<td><input id="publish_on_web" type="checkbox" class="toggleCheckbox"></td>';
						
	addNewRowHtml+= '<td>';
	addNewRowHtml+='<input type="hidden" id="total_overs" value="0" ><input type="hidden" id="fixture_type" value="" ><input type="hidden" id="fixture_type_id" value="" >';
	addNewRowHtml+= '<a id="detail_'+newuuid+'" target="_blank" title="Match details" href="match?fixture_id='+$('#id').val()+'&uuid='+newuuid+'" style="margin-right:10px;display:none;"><i class="fa fa-link"></i></a>';
	addNewRowHtml+= '<a href="javascript:void(0)" class="savelink" title="Save" onClick="saveItem(this, \''+newuuid+'\')"><i CLASS="fa fa-save"></i></a>';
	addNewRowHtml+= '<a href="javascript:void(0)" class="cancellink" title="Cancel" onClick="removeItem(\''+newuuid+'\')" style="margin-left:10px;"><i CLASS="fa fa-remove"></i></a>';
	addNewRowHtml+= '</td>';
	addNewRowHtml+= "</tr>";
	
	$("#documents_data").prepend(addNewRowHtml);
	
	basicInitialisations();
}

function rowDataChange(e){
	$("#tr_"+e).addClass('newRowClass');
}

function saveItem(e, uuid){
	var row = $(e).parents('.teamsTRClass');
	var publish_on_webFlag=false;
  	if(row.find('#publish_on_web').is(":checked")){
  		publish_on_webFlag=true;
  	}
  	
  	if(row.find('#home_team').val()!="" && row.find('#away_team option:selected').val()!="" && row.find('#date_time').val()!=""){
		var postContentURL=backendDirectory+"/saveMatchDetails";
   		$.ajax({
			type: "POST",
			dataType: "json",
			url: postContentURL,
			data: {"action": "save", "fixture_id" : $('#id').val(), "uuid" : row.find('#uuid').val(), "date_time" : getTimestampFromDateTime(row.find('#date_time').val()), "home_team_name" :row.find('#home_team option:selected').text(),
			 "away_team_name" : row.find('#away_team option:selected').text(), "home_team_uuid": row.find('#home_team option:selected').val(), "away_team_uuid" : row.find('#away_team option:selected').val(), "venue_name" : row.find('#venue option:selected').text(),
			 "venue_uuid" : row.find('#venue').val(), "total_overs" : row.find('#total_overs').val(), "fixture_type" : row.find('#fixture_type').val(), "fixture_type_id" : row.find('#fixture_type_id').val(), "publish_on_web" : publish_on_webFlag},
			success: function(response){
				if(response.success){
					$("#detail_"+row.find('#uuid').val()).show();
					$("#tr_"+row.find('#uuid').val()).removeClass('newRowClass');
				}else if(response.error){
					rowDataChange(row.find('#uuid').val());
					__alertModalBox(response.error);
				}
			}
		});
	}else{
		__alertModalBox('Please select date, home & away team!');
	}
}
function removeItem(e){
	
	if(e!=""){
		var postContentURL=backendDirectory+"/saveMatchDetails";
   		$.ajax({
			type: "POST",
			dataType: "json",
			url: postContentURL,
			data: {"action": "delete", "fixture_id" : $('#id').val(), "uuid" : e},
			success: function(response){
				if(response.success){
					$("#tr_"+e).remove();
					//$('#table-breakpoint').basictable('destroy');
					//loadFixtureEvents();
				}else if(response.error){
					rowDataChange(e);
					__alertModalBox(response.error);
				}
			}
		});
	}else{
		__alertModalBox('Please select date, home & away team!');
	}
}

function setdefaultsettingsdatepicker(source, target, setParameter)	{
	var arrDate= $('#'+source).val().split('/');
	var dateText = new Date(arrDate[1]+'/'+arrDate[0]+'/'+arrDate[2]);
	$('#'+target).datepicker(setParameter, dateText);
}

	function load_teams(){
		var jsonRow=backendDirectory+"/api_fetch_list?start=0&limit=20&collection=teams";
		
		$.getJSON(jsonRow,function(html){
			if(html.error){
				
			}else{
				if(html.aaData.length>0){
					$.each(html.aaData, function(i,row){
						teamsHtmlStr+="<option value='"+row._id+"'>"+row.name+"</option>";
					});
					$("#search_by_team").html(teamsHtmlStr);
     			}
			}
		});
	}
	
	function load_venue(){
		var jsonRow=backendDirectory+"/api_fetch_list?start=0&limit=20&collection=venue";
		
		$.getJSON(jsonRow,function(html){
			if(html.error){
				
			}else{
				if(html.aaData.length>0){
					$.each(html.aaData, function(i,row){
						venueHtmlStr+="<option value='"+row._id+"'>"+row.name+"</option>";
					});
					
					if(eventDetailForm)	{
						$("#venue_uuid").html(eventDetailForm);
					}
     			}
			}
		});
	}
	
	function load_fixture_type(){
		var jsonRow=backendDirectory+"/api_fetch_list?start=0&limit=20&collection=fixture_types";
		
		$.getJSON(jsonRow,function(html){
			if(html.error){
				
			}else{
				var fixtureTypeStr="<option value=''>--Select--</option>";
				if(html.aaData.length>0){
					$.each(html.aaData, function(i,row){
						fixtureTypeStr+="<option value='"+row._id+"'>"+row.name+"</option>";
					});
					$("#event_type").html(fixtureTypeStr);
				}
			}
		});
	}
	function load_fixture_type_details(e, divID){
		var jsonRow=backendDirectory+"/collection_details?collection=fixture_types&id="+e;
		
		$.getJSON(jsonRow,function(html){
			if(html.error){
				
			}else{
				if(html.aaData){
					$("#"+divID).val(html.aaData.overs);
				}
			}
		});
	}
var xhr;
(function( $ ) {
	$.widget( "custom.combobox", {
		_create: function() {
				this.wrapper = $( "<span>" )
				.addClass( "custom-combobox" )
				.insertAfter( this.element );

				this.element.hide();
				this._createAutocomplete();
				this._createShowAllButton();
				},

				_createAutocomplete: function() {
				var ele_select= this.element;
				var selected = this.element.children( ":selected" ),
				value = selected.val() ? selected.text() : "";

				this.input = $( "<input>" )
				.appendTo( this.wrapper )
				.val( value )
				.attr( "title", "" )
				.addClass( "custom-combobox-input ui-widget ui-widget-content ui-state-default ui-corner-left" )
				.autocomplete({
				delay: 0,
				minLength: 0,
				source: $.proxy( this, "_source" )
				})
				.tooltip({
				tooltipClass: "ui-state-highlight"
				});

				this._on( this.input, {
				autocompleteselect: function( event, ui ) {
				//alert("show all");
				ui.item.option.selected = true;

				this._trigger( "select", event, {
				  item: ui.item.option
				});
				
				ele_select.trigger('change');
				ele_select.parents('.teamsTRClass').addClass('newRowClass');
					if(ele_select.attr('id')=='search_by_team'){
						start=initialSize, end=pageSize;
		
						$('#documents_data').html('');
						$('#table-breakpoint').basictable('destroy');
						loadFixtureEvents();
					}
				},

				autocompletechange: "_removeIfInvalid"
				});
				},

				_createShowAllButton: function() {
				var input = this.input,
				wasOpen = false;

				$( "<a>" )
				.attr( "tabIndex", -1 )
				.attr( "title", "Show All Items" )
				.tooltip()
				.appendTo( this.wrapper )
				.button({
				icons: {
				  primary: "ui-icon-triangle-1-s"
				},
				text: false
				})
				.removeClass( "ui-corner-all" )
				.addClass( "custom-combobox-toggle ui-corner-right" )
				.mousedown(function() {
				wasOpen = input.autocomplete( "widget" ).is( ":visible" );
				})
				.click(function() {
				input.focus();

				// Close if already visible
				if ( wasOpen ) {
				  return;
				}

				// Pass last search string as value to search for, displaying last results
				input.autocomplete( "search", 'SHOWALL' );
				});
				},

				_source: function( request, response ) {
				//var matcher = new RegExp( $.ui.autocomplete.escapeRegex(request.term), "i" );
				var ele_select= this.element;
				if(request.term=='SHOWALL'){
				response(ele_select.children( "option" ).map(function() {
				var text = $( this ).text();
				var value= $( this ).val();
				//if ( this.value && ( !request.term || matcher.test(text) ) )
				return {
				  label: text,
				  value: text,
				  option: this
				};
				}) );

				}
				else
				{
				
				var jsonRow = backendDirectory+'/api_fetch_list?start=0&limit=20';
				if(ele_select.attr('id')=='venue'){
					jsonRow += '&collection=venue';
				}else if(ele_select.attr('id')=='away_team' || ele_select.attr('id')=='home_team' || ele_select.attr('id')=='search_by_team'){
					jsonRow += '&collection=teams';
				}
				jsonRow += '&s='+request.term;
				
				if(xhr) xhr.abort();
				xhr=$.getJSON(jsonRow,function(result){
					
				if(result.error){
					var html='<option value=""></option>';
					ele_select.html(html);
					response(ele_select.children( "option" ).map(function() {
					var text = $( this ).text();
					var value= $( this ).val();
					//if ( this.value && ( !request.term || matcher.test(text) ) )
					return {
				  		label: text,
				  		value: text,
				  		option: this
					};
					}) );
				}else{
					var html='<option value=""></option>';
					if(result.aaData.length>=1){
						$.each(result.aaData, function(i,row){
							html+='<option value="'+row._id+'">'+row.name+'</option>';
						});
					}
					
					ele_select.html(html);
					
					
					response(ele_select.children( "option" ).map(function() {
				var text = $( this ).text();
				var value= $( this ).val();
				//if ( this.value && ( !request.term || matcher.test(text) ) )
				return {
				  label: text,
				  value: text,
				  option: this
				};
				}) );
					
					
				}
				});

				} 

				},

				_removeIfInvalid: function( event, ui ) {

					// Selected an item, nothing to do
					if ( ui.item ) {

					return;
					}

					// Search for a match (case-insensitive)
					var value = this.input.val(),
					valueLowerCase = value.toLowerCase(),
					valid = false;
					var ele_select= this.element;
					this.element.children( "option" ).each(function() {
					if ( $( this ).text().toLowerCase() === valueLowerCase ) {
						this.selected = valid = true;	
						
						if(ele_select.attr('id')=='search_by_team'){
							start=initialSize, end=pageSize;
							$('#documents_data').html('');
							$('#table-breakpoint').basictable('destroy');
							loadFixtureEvents();
						}
						ele_select.trigger('change');
						ele_select.parents('.teamsTRClass').addClass('newRowClass');
						return false;
					}
					});

					// Found a match, nothing to do
					if ( valid ) {
					return;
					}

					// Remove invalid value
					this.input
					.val( "" )
					.attr( "title", value + " didn't match any item" )
					.tooltip( "open" );
					this.element.val( "" );
					this._delay(function() {
					this.input.tooltip( "close" ).attr( "title", "" );
					}, 2500 );
					this.input.data( "ui-autocomplete" ).term = "";
				},

				_destroy: function() {
					this.wrapper.remove();
					this.element.show();
				}
			});
			})( jQuery );
