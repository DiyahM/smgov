var map;
var geocoder = new google.maps.Geocoder();
var tracks = [];
var stream_location;
var tweet_count = 0;
var markers = [];
var infowindows = [];

//html5 get user's location coordinates
navigator.geolocation.getCurrentPosition(function(data) {
	     var lat = data['coords']['latitude']; 
	     var lng = data['coords']['longitude'];
	
		var map_center = new google.maps.LatLng(lat, lng); 
		map = new google.maps.Map(document.getElementById("map_canvas"), {
		  zoom: 10,
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

function getDivName(keyword)
{
	temp = keyword.split(' ').join("_");
	return temp;
}



function withinGeoBounds(tweet)
{
	
	var latlng;
	if (!tweet.geo)
	{
		/*geocoder.geocode({'address':tweet.user.location}, function(results,status){
			if (status == google.maps.GeocoderStatus.OK)
			{
				latlng = results[0].geometry.location;
			} else{
				console.log('no good user from '+tweet.user.location +' '+ status);
			}
		});*/
    } else {
	    latlng = new google.maps.LatLng(tweet.geo.coordinates[0], tweet.geo.coordinates[1]);
    }

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
				title: tweet.user.screen_name
			});
			
			google.maps.event.addListener(markers[markers.length-1],'click',function(){
				infowindows[$.inArray(this,markers)].open(map,this);
			});
			
			return true;
	    }
    }
	return false;
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
				  +getDivName(tracks[i])+'_tneutral"><a href="/'+getDivName(tracks[i])+'/tweets/neutral" onclick="openAsPopup(this)"></a></td></tr>');

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
				  +getDivName(tracks[i])+'_fneutral"><a href="/'+getDivName(tracks[i])+'/facebook/neutral" onclick="openAsPopup(this)"></a></td></tr>');
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
			  +getDivName(tracks[i])+'_rneutral">tbd</td></tr>');
		} else {
          $('#'+getDivName(tracks[i])+'_rss').remove();
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





