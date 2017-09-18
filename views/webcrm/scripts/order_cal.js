	function applyTaxEntered(){
		$("tax_message").remove();
		if($('#dlg_tax_rate').val()!=null && $('#dlg_tax_rate').val()!=""){
			$('#tax_rate').val($('#dlg_tax_rate').val());
			$('#addTaxRate').modal('hide');
			$('#dlg_tax_rate').val('');
			update_total();
		}	else {
			$('#taxmessageId').before('<span id="tax_message" style="color:#CC0000;">* Please enter Tax Rate.</span>');
			$('#dlg_tax_rate').focus();
		}
	}
function roundNumber(number,decimals) {
  var newString;// The new rounded number
  decimals = Number(decimals);
  if (decimals < 1) {
    newString = (Math.round(number)).toString();
  } else {
    var numString = number.toString();
    if (numString.lastIndexOf(".") == -1) {// If there is no decimal point
      numString += ".";// give it one at the end
    }
    var cutoff = numString.lastIndexOf(".") + decimals;// The point at which to truncate the number
    var d1 = Number(numString.substring(cutoff,cutoff+1));// The value of the last decimal place that we'll end up with
    var d2 = Number(numString.substring(cutoff+1,cutoff+2));// The next decimal, after the last one we want
    if (d2 >= 5) {// Do we need to round up at all? If not, the string will just be truncated
      if (d1 == 9 && cutoff > 0) {// If the last digit is 9, find a new cutoff point
        while (cutoff > 0 && (d1 == 9 || isNaN(d1))) {
          if (d1 != ".") {
            cutoff -= 1;
            d1 = Number(numString.substring(cutoff,cutoff+1));
          } else {
            cutoff -= 1;
          }
        }
      }
      d1 += 1;
    } 
    if (d1 == 10) {
      numString = numString.substring(0, numString.lastIndexOf("."));
      var roundedNum = Number(numString) + 1;
      newString = roundedNum.toString() + '.';
    } else {
      newString = numString.substring(0,cutoff) + d1.toString();
    }
  }
  if (newString.lastIndexOf(".") == -1) {// Do this again, to the new string
    newString += ".";
  }
  var decs = (newString.substring(newString.lastIndexOf(".")+1)).length;
  for(var i=0;i<decimals-decs;i++) newString += "0";
  //var newNumber = Number(newString);// make it a number if you like
  return newString; // Output the result to the form field (change for your purposes)
}
function update_total() {
	var sub_total = 0, tot_rate = 0, tot_hour = 0, total_with_tax = 0, total_due_without_tax = 0, hour=0, discount_perc=0, discount=0;
	$('.hours').each(function(i){
    	hour = $(this).val();
		if (!isNaN(hour)) tot_hour += Number(hour);
  	});
  	
  	$('.price').each(function(i){
		price = $(this).val();
    	if (!isNaN(price)) sub_total += Number(price);
  	});
  
	tot_hour = roundNumber(tot_hour,2);
	sub_total = roundNumber(sub_total,2);
  	
	//discount applied if any
	discount_perc= $("#discount_applied").val();
	if(discount_perc >=0){
		discount = roundNumber(sub_total*discount_perc/100,2);
	}
	total_due_without_tax = roundNumber(sub_total - discount,2);
	
	//evaluate total with tax applied
	tot_rate=$('#tax_rate').val();
	tot_tax = roundNumber(total_due_without_tax*tot_rate/100,2);
	total_with_tax = roundNumber(Number(total_due_without_tax)+Number(tot_tax),2);
	
  	$('#subtotal').val(sub_total);
  
  	$('#total_hours').val(tot_hour);
  	$('#total_due_without_tax').val(total_due_without_tax);
  
  	$('#total_tax').val(tot_tax);
  	$('#total_due_with_tax').val(total_with_tax);
  
  	update_balance();
}

function update_balance() {
  var due = $("#total_due_with_tax").val() - $("#total_paid").val();
  due = roundNumber(due,2);
  
  $('#grand_total').val($("#total_due_with_tax").val());
  $('#balance_due').val(due);
}
	
function calculate_amount(){
	var tempAmount= $("#item_rate").val() * $("#item_hours").val();
	var item_discount = roundNumber(tempAmount * $('#item_discount').val()/100,2);
  	var price= tempAmount - item_discount;
 
	$("#item_amount").val(price);
}
function generateObjectJson(){
	var createArr=new Array();
	var i=0;
	$('.itemClass').each(function(){
		var createObject={};
  		createObject['uuid']=$(this).find('#uuid').val();
  		createObject['description']=$(this).find('#description').val();
  		createObject['rate']=$(this).find('#rate').val();
  		createObject['hours']=$(this).find('#hours').val();
  		createObject['discount']=$(this).find('#discount').val();
  		createObject['amount']=$(this).find('#amount').val();
  		createArr[i]=createObject;
  		i++;
  	});
  	$("#order_items").val(JSON.stringify(createArr));
}
function remove_item(e){
	if(e!=""){
		$(".itemtr_"+e).remove();
		update_total();
	}
}
function edit_item(e){
	if(e!=""){
		var row= $(".itemtr_"+e);			
		$("#item_uuid").val(e);
		$("#item_description").val(row.find('#description').val());
		$("#item_rate").val(row.find('#rate').val());
		$("#item_hours").val(row.find('#hours').val());
		$("#item_discount").val(row.find('#discount').val());
		$("#item_amount").val(row.find('#amount').val());
		$('#myModal').modal('show'); 
	}
}

function savelinkitem(){
	$("#msgSpan").remove();
	var item_uuid=$("#item_uuid").val();
	var item_description=$("#item_description").val();
	var item_rate=$("#item_rate").val();
	var item_hours=$("#item_hours").val();
	var item_amount=$("#item_amount").val();
	var item_discount=$("#item_discount").val();
	
	if(item_description!="" && item_rate!="" && item_hours!="" && item_amount!="" && item_rate>0 && item_hours>0 && item_amount>0){
			var newEntryBool= false;
			if(item_uuid==""){
				item_uuid=guid();
				newEntryBool= true;
			}
			var htmlStr='<td><input type="hidden" id="uuid" value="'+item_uuid+'"><input type="hidden" id="description" value="'+item_description+'">'+item_description+'</td>';
			htmlStr+='<td><input type="hidden" id="rate" value="'+item_rate+'">'+item_rate+'</td>';
			htmlStr+='<td><input type="hidden" id="hours" class="hours" value="'+item_hours+'">'+item_hours+'</td>';
			htmlStr+='<td><input type="hidden" id="discount" value="'+item_discount+'">'+item_discount+'</td>';
			htmlStr+='<td><input type="hidden" class="price" id="amount" value="'+item_amount+'">'+item_amount+'</td>';
			htmlStr+='<td><a href="javascript:void(0)" title="Edit" onClick="edit_item(\''+item_uuid+'\')"><i class="fa fa-pencil"></i></a>&nbsp;&nbsp;&nbsp;&nbsp;<a href="javascript:void(0)" onClick="remove_item(\''+item_uuid+'\')" title="Remove"><i class="fa fa-trash"></i></a></td>';
														
			if(newEntryBool){
				var tempHtmlStr='<tr class="itemClass itemtr_'+item_uuid+'">'+htmlStr+'</tr>';
				$("#link_items").append(tempHtmlStr);
			}else{
				$(".itemtr_"+item_uuid).html(htmlStr);
			}
			generateObjectJson();
			$('#myModal').modal('hide');
			resetItemForm();
			update_total();
			$('#table-items').basictable('destroy');	
			$('#table-items').basictable({
				breakpoint: 751
   			});
	}else{
		$("#messageId").before('<span id="msgSpan" style="color:#CC0000;">Please add all the required fields!</span>');
	}	
}		
function resetItemForm(){
	$("#msgSpan").remove();
	$("#item_uuid").val("");
	$("#item_description").val('');
	$("#item_rate").val(0);
	$("#item_discount").val(0);
	$("#item_hours").val(0);
	$("#item_amount").val(0);
}
 
$(function () {	
	$("#paid").blur(update_balance);
	$("#total_paid").blur( function() {
		update_balance();
	});
  	$("#discount_applied").blur( function() {
		update_total();
	}).keypress( function() {
		update_total();
	});
	$("#tax_rate").blur( function() {
		update_total();
	});
	$('#tax_code').change(function(){
		var tax_code=$(this).val();
		if(tax_code=='Rest of the world' || tax_code=='EU'){
			$('#addTaxRate').modal('show');
		}else if(tax_code=='US'){
			$('#tax_rate').val("");
		}else	{
			$('#tax_rate').val("20");
		}
		update_total();
	});
	
	$('#table-items').basictable({
    	breakpoint: 751
    });
	
	// validate form on keyup and submit
		$("#contentForm").validate({
			ignore: "",
			onkeyup: false,
			errorClass: 'error',
			validClass: 'valid',
			errorElement: "em",
			errorPlacement: function(error, element) {
				if (element.attr("id") == "client_mongo_id" || element.attr("id") == "project_mongo_id" ) {
					$(element).closest('div').after(error);
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
				order_id: { required: true },
				client_mongo_id: { required: true },
				ordered_date: { required: true },
				order_status : { required: true },
				project_mongo_id : { required: true },
				tax_code: { required: true },
				order_items: { required: true }
			},
			messages: {
				order_items: "Please add order items",
			},
			submitHandler: function(form) {
				generateObjectJson();
				generateNotesJson();
				
				$('#project_name').val($('#project_mongo_id option:selected').text());
				$('#client_name').val($('#client_mongo_id option:selected').text());
				
				var startTimestampNum=return_timestamp_from_datetimepicker($('#ordered_date').val(), false);
				$('#ordered_timestamp').val(startTimestampNum);
				
				var endTimestampNum=return_timestamp_from_datetimepicker($('#paid_date').val(), false);
				$('#paid_timestamp').val(endTimestampNum);
				
				//save data as json in data field, use dataAsJson function to populate that field
 				dataAsJson('contentForm', form);
 			}
		});	
			/* datepicker plugin */
			if($("#ordered_timestamp").val()!=""){
				var tempDisplayDate=return_datetimepicker_from_timestamp($("#ordered_timestamp").val());
				$("#ordered_date").val(tempDisplayDate)
			}
            $('#ordered_datetime_picker').datetimepicker({
				format: 'L',
				defaultDate:new Date()
			}).on("dp.show", function (e) {
				if($('#due_date').val()!=="")	{
					$('#ordered_datetime_picker').data("DateTimePicker").maxDate($('#due_date').val());
				}
        	}).on("dp.change", function (e) {
        		$('#due_datetime_picker').data("DateTimePicker").minDate(e.date);
        	});
			
			if($("#paid_timestamp").val()!=""){
				var tempDisplayDate=return_datetimepicker_from_timestamp($("#paid_timestamp").val());
				$("#paid_date").val(tempDisplayDate)
			}
            $('#paid_datetime_picker').datetimepicker({
				format: 'L'
			}).on("dp.show", function (e) {
				if($('#ordered_date').val()!==""){
					$('#paid_datetime_picker').data("DateTimePicker").minDate($('#ordered_date').val());
				}
        	}).on("dp.change", function (e) {
        		$('#ordered_datetime_picker').data("DateTimePicker").maxDate(e.date);
            });
				
});
function fetch_client_details(){
	if($("#client_mongo_id").val()!="" && $("#client_mongo_id").val()!=="undefined" && $("#client_mongo_id").val()!==null){
		$.getJSON(backendDirectory+"/collection_details?collection=customers&id="+$("#client_mongo_id").val(),function(response){
			if(response.aaData){
				var bill_to_str= $('#client_mongo_id option:selected').text();
				if(response.aaData.address_line_1 && response.aaData.address_line_1!=""){
					bill_to_str+="\n"+response.aaData.address_line_1;
				}
				if(response.aaData.address_line_2 && response.aaData.address_line_2!=""){
					bill_to_str+=", "+response.aaData.address_line_2;
				}
				bill_to_str+="\n";
				if(response.aaData.city_or_town && response.aaData.city_or_town!=""){
					bill_to_str+=response.aaData.city_or_town;
				}
				if(response.aaData.county_or_state && response.aaData.county_or_state!=""){
					bill_to_str+=", "+response.aaData.county_or_state;
				}
				if(response.aaData.country && response.aaData.country!=""){
					bill_to_str+="\n"+response.aaData.country;
				}
				if(response.aaData.post_zip_code && response.aaData.post_zip_code!=""){
					bill_to_str+=", "+response.aaData.post_zip_code;
				}
				$("#bill_to").val(bill_to_str);
			}
		});
	}
}

//autocomplete
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
            if(ele_select.attr('id')=='client_mongo_id'){
				$('#client_name').val($('#client_mongo_id option:selected').text());
				fetch_client_details();
			}
			if(ele_select.attr('id')=='project_mongo_id'){
				$('#project_name').val($('#project_mongo_id option:selected').text());
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
			if(ele_select.attr('id')=='project_mongo_id'){
				var jsonRow = backendDirectory+"/api_fetch_list?start=0&limit=20&collection=projects&s="+request.term;
			}else if(ele_select.attr('id')=='client_mongo_id'){
				var jsonRow = backendDirectory+"/api_fetch_list?start=0&limit=20&collection=customers&s="+request.term;
			}else if(ele_select.attr('id')=='analysis_ledger_mongo_id'){
				var jsonRow = backendDirectory+"/api_fetch_list?start=0&limit=20&collection=analysis_ledgers&s="+request.term;
			}
		if(xhr) xhr.abort();
		xhr=$.getJSON(jsonRow,function(result){
			
			if(result.aaData.length>0){
				var html='<option value=""></option>';

				$.each(result.aaData, function(i,item){
					html += '<option value="'+item._id+'">'+item.name+'</option>';
				});
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
        this.element.children( "option" ).each(function() {
          if ( $( this ).text().toLowerCase() === valueLowerCase ) {
            this.selected = valid = true;	
			if(ele_select.attr('id')=='client_mongo_id'){
				$('#client_name').val($('#client_mongo_id option:selected').text());
				fetch_client_details();
			}
			if(ele_select.attr('id')=='project_mongo_id'){
				$('#project_name').val($('#project_mongo_id option:selected').text());
			}
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