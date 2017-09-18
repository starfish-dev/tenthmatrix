var xhrStatus;
var pageSize=10, totalNum=0, totalDisplayedNum=0, checkAllFlag= false;
var start=0, end=pageSize, searchStr='';
var accessRightCode=parseInt(access_right);
var complete=false, completeScroll=false;
	function searchKeyword(e){
		var searchField= $("#"+e).val();
		if(searchField!=""){
			totalDisplayedNum=0;
			$('#'+tableDisplayID).basictable('destroy');
			$("#"+tableDisplayID+" tbody").html('');
			$("#"+e).removeClass("errorPlaceHolder");
			$('#display_more_btn').hide();
			$('#img_loading_div').show();
			searchStr=searchField;
			start=0;
			end=start+pageSize;
			load_data();
		}else{
			$("#"+e).addClass("errorPlaceHolder");
			$("#"+e).attr("placeholder" , "Please enter search term here");
			$("#"+e).focus();
		}
	}
	
    $(document).ready(function() {
    	$('#display_more_btn').hide();
		$('#img_loading_div').show();
		load_data();
		
		$("#searchBtn").click(function()	{
			searchKeyword('searchField');
		});
		
		$('#searchField').keypress(function (e) {
  			if (e.which == 13) {
    			searchKeyword('searchField');
  			}
		});
		$("#searchBtn").click(function()	{
			searchKeyword('searchField');
		});

		$(window).scroll(function(){
			if ($(window).scrollTop() == $(document).height() - $(window).height()){
				if(complete==false && completeScroll==false) {
					load_more();
				}
			}
		});	
	});

function refresh_data(){
	totalDisplayedNum=0;
	$('#'+tableDisplayID).basictable('destroy');
	searchStr="";
	$(".searchFieldClass").val("");
	$("#"+tableDisplayID+" tbody").html('');
	$('#display_more_btn').hide();
	$('#img_loading_div').show();
	start=0;
	end=start+pageSize;
	load_data();
}
function load_more(){
	$('#'+tableDisplayID).basictable('destroy');
	$('#display_more_btn').hide();
	$('#img_loading_div').show();
	if(start==0)	{
		start=end+1;
	} else{
		start=end;
	}
	end=start+pageSize;
	load_data();
}
	
	function load_data(){
		completeScroll=true;
		$(".extra_alert").remove();
		var jsonRow=backendDirectory+"/api_fetch_list?start="+start+"&limit="+pageSize+"&collection="+relatedCollectionStr+"&s="+searchStr+"&findFieldName="+relatedFieldName+"&findFieldValue="+relatedFieldValue;
		if(xhrStatus) xhrStatus.abort();
		xhrStatus=$.getJSON(jsonRow,function(html){
			if(html.error){
				complete=true;
				$(".topOptionsClass").hide();
				$("#"+tableDisplayID).before('<div class="alert alert-danger extra_alert">'+html.error+'</div>');
			}else{
				var editorPage="javascript:void(0)";
				
				if(html.total){
					totalNum=parseInt(html.total);
				} else {
					totalNum=0;
				}
				if(html.iTotalRecordsReturned){
					totalDisplayedNum=totalDisplayedNum+parseInt(html.iTotalRecordsReturned);
				}
				if(totalDisplayedNum>0 && totalNum>0){
					$(".display_records_count").html("Showing "+totalDisplayedNum+" out of "+totalNum);
					$(".display_records_count").show();
				}else{
					$(".display_records_count").hide();
				}			
				if(html.aaData.length>0){
					var contentHtml=	draw_content_html(html.aaData);
					$("#"+tableDisplayID+" tbody").append(contentHtml);
					
					if(html.total && html.iTotalRecordsReturned && html.iTotalRecordsReturned==html.total){
						complete=true;
					}else{
						complete=false;
					}
     			}else{
     				complete=true;
					$("#"+tableDisplayID).before('<div class="alert alert-danger alert-dismissable extra_alert"><button class="close" aria-hidden="true" data-dismiss="alert" type="button">×</button>No more records found!</div>');
     			}
     				//initialize table
					$('#'+tableDisplayID).basictable({
        				breakpoint: 751
     				});
     		}
			if(end< totalNum){
				$('#display_more_btn').show();
			}
			$('#img_loading_div').hide();
			completeScroll=false;
		});
	}