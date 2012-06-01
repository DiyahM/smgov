var map;
var geocoder = new google.maps.Geocoder();
var tracks = [];
var stream_location;
var tweet_count = 0;
var markers = [];
var infowindows = [];
var dc_cams=[];

//html5 get user's location coordinates
navigator.geolocation.getCurrentPosition(function(data) {
	     var lat = data['coords']['latitude']; 
	     var lng = data['coords']['longitude'];
	
		//var map_center = new google.maps.LatLng(lat, lng); 
		//centering on bethesda for demo purposes
		var map_center = new google.maps.LatLng('38.9995335', '-77.0968425');
		map = new google.maps.Map(document.getElementById("map_canvas"), {
		  zoom: 11,
		  center: map_center,
		  mapTypeId: google.maps.MapTypeId.ROADMAP
		});
		
		setMapOptions();
		next();
});

function next(){

  google.maps.event.addListener(map, 'idle', function(){
	updatePositionInputField();
	//console.log('bounds event');
  });
  createDCTrafficCams();

}

$('#map_coordinates').focusout(function(){
	updateMap();
});

$('#map_coordinates').mouseup(function(e){
	e.preventDefault();
});

$('#map_coordinates').focus(function(){
	this.select();
});

$('#map_coordinates').keydown(function(e){
	if(e.keyCode == 13){
		e.preventDefault();
		e.stopPropagation();
		updateMap();
	}
});

$('#keyword_input').keydown(function(e){
	if(e.keyCode == 13){
		e.preventDefault();
		e.stopPropagation();
		addKeyword();
	}
});

$('#keyword_input').focusout(function(){
	addKeyword();
});


function openAsPopup(a){
	var url = $(a).attr('href');
	window.open(url,"Data Window","toolbar=0,location=0,menubar=0,directories=0,resizable=1;scrollbars=1,width=350,height=500");

}




function updateMap(){
	var address = $("#map_coordinates").val();
	geocoder.geocode({'address':address}, function(results,status){
		if (status == google.maps.GeocoderStatus.OK){
			map.setCenter(results[0].geometry.location);
			updatePositionInputField();
			setMapOptions();
			updateStream();
		}
		else
		  console.log('geocode did not return ok');
	});
}



function setMapOptions(){
	map.setOptions({
		draggable: true,
		overviewMapControl: true,
		panControl: true,
		scaleControl: true,
		streetViewControl: true,
		zoomControl: true
	});
}

function updatePositionInputField(){
	
  $("#map_coordinates").val(map.getBounds().toString());
  stream_location = map.getBounds().getSouthWest().lng() + ',' + map.getBounds().getSouthWest().lat() + ',' +
	     map.getBounds().getNorthEast().lng() + ',' + map.getBounds().getNorthEast().lat();
	updateStream();
}

//socket connect
var socket= io.connect();

//socket calls
socket.on('tweet',function(json){
	
	var tweet = JSON.parse(json);
	//console.log('tweet received ' + json);
	
	if (tweet.count)
	  $('#'+tweet.keyword+'_tcount a').html(tweet.count);
	
	if (tweet.geo_count)
	  $('#'+tweet.keyword+'_tgeocoded a').html(tweet.geo_count);
	
	if (tweet.positive)
	  $('#'+tweet.keyword+'_tpositive a').html(tweet.positive);

	if (tweet.negative)
	  $('#'+tweet.keyword+'_tnegative a').html(tweet.negative);
	
	if (tweet.neutral)
	  $('#'+tweet.keyword+'_tneutral a').html(tweet.neutral);
	
	
	
	/*if ((!tweet.retweeted))
	{
			if (!withinGeoBounds(tweet));
			{	
				var replacePattern = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
				var replacedText = (tweet.text).replace(replacePattern, '<a href="$1" target="_blank">$1</a>');
				$('#tweets ul').prepend('<li>'+tweet.user.screen_name+ ': '+ replacedText+'</li>').css({opacity:0}).slideDown("slow").animate({opacity:1},"slow");
				tweet_count++;
				if (tweet_count > 20)
				{
					$('#tweets ul li').last().remove();
					tweet_count--;
				}
			}		
		
	}*/
});

socket.on('fbresults',function(json){
	
	var fbresults = JSON.parse(json);
	//console.log('fb received ' + json);
	
	if (fbresults.count)
	  $('#'+fbresults.keyword+'_fcount a').html(fbresults.count);
	
	if (fbresults.photos)
	  $('#'+fbresults.keyword+'_fimages a').html(fbresults.photos);
	
	if (fbresults.videos)
	  $('#'+fbresults.keyword+'_fvideos a').html(fbresults.videos);
	
	if (fbresults.positive)
	  $('#'+fbresults.keyword+'_fpositive a').html(fbresults.positive);
	
	if (fbresults.negative)
	  $('#'+fbresults.keyword+'_fnegative a').html(fbresults.negative);
	
	if (fbresults.neutral)
	  $('#'+fbresults.keyword+'_fneutral a').html(fbresults.neutral);
	
});

socket.on('geo_tweet',function(json){
	
	if ($("#geo_checkbox").attr('checked'))
	{
		var tweet = JSON.parse(json);
		var latlng = new google.maps.LatLng(tweet.geo.coordinates[0], tweet.geo.coordinates[1]);


	    if (latlng)
	    {
		    if (map.getBounds().contains(latlng))
			{
			    infowindows[infowindows.length] = new google.maps.InfoWindow({
					content: tweet.user.screen_name + ':' + tweet.text,
					maxWidth: '200px'
				});
			
				markers[markers.length] = new google.maps.Marker({
					map: map,
					position: latlng,
					icon: tweet.user.profile_image_url,
					clickable: true,
					title: tweet.user.screen_name,
					visible:true
				});
			
				google.maps.event.addListener(markers[markers.length-1],'click',function(){
					infowindows[$.inArray(this,markers)].open(map,this);
				});

		    }
	    }
    }
	
});

function getDivName(keyword)
{
	temp = keyword.split(' ').join("_");
	return temp;
}


function createDCTrafficCams(){
	
	/*var dc_locations = ["Colesville Rd and Fenton St, Silver Spring, MD","Georgia Ave and Sligo Ave, Silver Spring, MD","East West Hwy and Georgia Ave, Silver Spring, MD",
	                     "East West Hwy and Wisconsin Ave, Bethesda, MD", "Rockville Pk and South Dr, Bethesda, MD","Bradley Blvd and Wisconsin Ave, Bethesda, MD",
	                      "Bradley Blvd and Connecticut Ave, Bethesda, MD", "Connecticut and East West Hwy, Bethesda, MD"];*/
	var dc_links =["/video/video.asp?feed=13015dbd01210075004d823633235daa","/video/video.asp?feed=0601f50e012b0075004d823633235daa","/video/video.asp?feed=ae01694b01220075004d823633235daa",
             "/video/video.asp?feed=efff918500020075004d823633235daa","/video/video.asp?feed=f400498202500075004d823633235daa","/video/video.asp?feed=f70054e703e00077004d823633235daa",
             "/video/video.asp?feed=a1008d3b00020075004d823633235daa","/video/video.asp?feed=0b01b57900060075004d823633235daa"];
	
	var dc_latlng = [{"coordinates":['38.9976537', '-77.0270182']},
	                 {"coordinates":['38.9902652', '-77.0265793']},
	                 {"coordinates":['38.9876015',' -77.0267504']},
					 {"coordinates":['38.9846986','-77.0942903']},
					 {"coordinates":['38.9995335','-77.0968425']},
					 {"coordinates":['38.9772353','-77.0907848']},
					 {"coordinates":['38.9767382','-77.0772258']},
					 {"coordinates":['38.9879499','-77.0771028']},
	];
	for (var i=0;i<8;i++){
		dc_cams[i] = new google.maps.Marker({
			map:map,
			position: new google.maps.LatLng(dc_latlng[i].coordinates[0], dc_latlng[i].coordinates[1]),
			clickable:true,
			icon:'/img/cam_Icon.png'
		
		});
		var url = "http://www.chart.state.md.us"+dc_links[i];
		
		google.maps.event.addListener(dc_cams[i],'click',function(){
			window.open(url,"Traffic Cam","toolbar=0,location=0,menubar=0,directories=0,resizable=1;scrollbars=0,width=480,height=360");
		});
		
	}

}

function tweetContainsKeyword(tweet)
{
    var len = tracks.length;
	for (var i= 0; i < len; i++)
	{
		if (tweet.text.indexOf(tracks[i]) > 0)
		{
		  return true;
		}
	}
	return false;
}

function addKeyword(){
	//console.log('keyword add');
	var keyword = $('#keyword_input').val();
	if ((keyword != 'New keyword') && (keyword != ''))
	{
	  tracks.push(keyword);
	  $('#keywords').append(keyword + ' ');
	  $('#keyword_input').val('');
	  twitterToggle();
	  facebookToggle();
	  rssToggle();
	  
	}
		
}




function twitterToggle(){
	
	var len = tracks.length;
	for (var i=0;i<len;i++){
		if ($('#twitter_checkbox').attr('checked'))
		{
			if ($('#'+getDivName(tracks[i])+'_twitter').length == 0){
				$('thead').after('<tr id='+getDivName(tracks[i])+'_twitter><td>Twitter</td><td><a href="/'+getDivName(tracks[i])+'/tweets/all" onclick="openAsPopup(this)">'
				  +tracks[i]+'</a></td><td id="'
				  +getDivName(tracks[i])+'_tcount"><a href="/'+getDivName(tracks[i])+'/tweets/all" onclick="openAsPopup(this)"></a></td><td id="'
				  +getDivName(tracks[i])+'_timages">tbd</td><td id="'
				  +getDivName(tracks[i])+'_tvideos">tbd</td><td id="'
				  +getDivName(tracks[i])+'_tgeocoded"><a href="/'+getDivName(tracks[i])+'/tweets/geo" onclick="openAsPopup(this)"></a></td><td id="'
				  +getDivName(tracks[i])+'_tpositive"><a href="/'+getDivName(tracks[i])+'/tweets/positive" onclick="openAsPopup(this)"></a></td><td id="'
				  +getDivName(tracks[i])+'_tnegative"><a href="/'+getDivName(tracks[i])+'/tweets/negative" onclick="openAsPopup(this)"></a></td><td id="' 
				  +getDivName(tracks[i])+'_tneutral"><a href="/'+getDivName(tracks[i])+'/tweets/neutral" onclick="openAsPopup(this)"></a></td><td id="'
				  +getDivName(tracks[i])+'_twords">tbd</td><td id="'
				  +getDivName(tracks[i])+'_tnotes"><button class="btn btn-mini disabled">Add Note</button></td></tr>');

					$('#'+getDivName(tracks[i])+'_twitter a').click(function(e){
						e.preventDefault();
					});
				
			}
			
			

		} else {
          $('#'+getDivName(tracks[i])+'_twitter').remove();
		}
		
	}	
}


function facebookToggle(){
	var len = tracks.length;
	for (var i=0;i<len;i++){
		if ($('#facebook_checkbox').attr('checked'))
		{
			if ($('#'+getDivName(tracks[i])+'_facebook').length == 0){
				$('thead').after('<tr id='+getDivName(tracks[i])+'_facebook><td>Facebook</td><td><a href="/'+getDivName(tracks[i])+'/facebook/all" onclick="openAsPopup(this)">'
				  +tracks[i]+'</a></td><td id="'
				  +getDivName(tracks[i])+'_fcount"><a href="/'+getDivName(tracks[i])+'/facebook/all" onclick="openAsPopup(this)"></a></td><td id="'
				  +getDivName(tracks[i])+'_fimages"><a href="/'+getDivName(tracks[i])+'/facebook/photos" onclick="openAsPopup(this)"></a></td><td id="'
				  +getDivName(tracks[i])+'_fvideos"><a href="/'+getDivName(tracks[i])+'/facebook/videos" onclick="openAsPopup(this)"></a></td><td id="'
				  +getDivName(tracks[i])+'_fgeocoded">na</td><td id="'
				  +getDivName(tracks[i])+'_fpositive"><a href="/'+getDivName(tracks[i])+'/facebook/positive" onclick="openAsPopup(this)"></a></td><td id="'
				  +getDivName(tracks[i])+'_fnegative"><a href="/'+getDivName(tracks[i])+'/facebook/negative" onclick="openAsPopup(this)"></a></td><td id="'
				  +getDivName(tracks[i])+'_fneutral"><a href="/'+getDivName(tracks[i])+'/facebook/neutral" onclick="openAsPopup(this)"></a></td><td id="'
				  +getDivName(tracks[i])+'_fwords">tbd</td><td id="'
				  +getDivName(tracks[i])+'_fnotes"><button class="btn btn-mini disabled">Add Note</button></td></tr>');
				$('#'+getDivName(tracks[i])+'_facebook a').click(function(e){
					e.preventDefault();
				});
				
			}
			
			  
		} else {
          $('#'+getDivName(tracks[i])+'_facebook').remove();
		}
		
	}
	
}

function rssToggle(){
	var len = tracks.length;
	for (var i=0;i<len;i++){
		if ($('#rss_checkbox').attr('checked'))
		{
			$('thead').after('<tr id='+getDivName(tracks[i])+'_rss><td>RSS</td><td><a href="/'+getDivName(tracks[i])+'/rss_links/all">'
			  +tracks[i]+'</a></td><td id="'
			  +getDivName(tracks[i])+'_rcount">0</td><td id="'
			  +getDivName(tracks[i])+'_rimages">tbd</td><td id="'
			  +getDivName(tracks[i])+'_rvideos">tbd</td><td id="'
			  +getDivName(tracks[i])+'_rgeocoded">0</td><td id="'
			  +getDivName(tracks[i])+'_rpositive">tbd</td><td id="'
			  +getDivName(tracks[i])+'_rnegative">tbd</td><td id="'
			  +getDivName(tracks[i])+'_rneutral">tbd</td><td id="'
			  +getDivName(tracks[i])+'_rwords">tbd</td>	<td id="'
			  +getDivName(tracks[i])+'_rnotes"><button class="btn btn-mini disabled">Add Note</button></td></tr>');
		} else {
          $('#'+getDivName(tracks[i])+'_rss').remove();
		}
		
	}
	
}

function cameraToggle(){
	var len = dc_cams.length;
	if ($('#camera_checkbox').attr('checked')){
		
		for (var i=0;i<len;i++){
		
			dc_cams[i].setVisible(true);
			
			
		}
	} else {
		for (var i=0;i<len;i++){
			dc_cams[i].setVisible(false);
		}
	}
	
}

function geoToggle(){
	var len = markers.length;
	if ($('#geo_checkbox').attr('checked')){
		
		for (var i=0;i<len;i++){	
			markers[i].setVisible(true);
			
		}
	} else {
		for (var i=0;i<len;i++){
			markers[i].setVisible(false);
		}
	}
	
}

function search(){
	
	showResults();
	
	if ($('#twitter_checkbox').attr('checked'))
	  updateStream();
	
	if ($('#facebook_checkbox').attr('checked'))
	  searchFB();
	
	if ($('#rss_checkbox').attr('checked'))
	  searchRSS();
	
	

}

function showResults(){
	
	$('#data_table').css('visibility','visible');
	$('#map_canvas').addClass('halfscreen');
	$('#map_canvas').removeClass('fullscreen');
	
}

function updateStream(){
	
	if ((tracks.length) && ($('#twitter_checkbox').attr('checked'))) 
	  socket.emit('track',escape(tracks.toString()),stream_location);
	
}

function searchFB(){
	if (tracks.length)
	{
		socket.emit('fbsearch',escape(tracks.toString()));
	}
	  
	
}

function searchRSS(){
	
}





