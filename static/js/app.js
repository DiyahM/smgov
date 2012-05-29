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
		updateMap();
	}
});

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
	  $('#'+getDivName(tweet.keyword)+'_tcount').html(tweet.count);
	
	if (tweet.geo_count)
	  $('#'+getDivName(tweet.keyword)+'_tgeocoded').html(tweet.geo_count);
	
	
	
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
	  $('#'+getDivName(fbresults.keyword)+'_fcount').html(fbresults.count);
	
	if (fbresults.photos)
	  $('#'+getDivName(fbresults.keyword)+'_fimages').html(fbresults.photos);
	
	if (fbresults.videos)
	  $('#'+getDivName(fbresults.keyword)+'_fvideos').html(fbresults.videos);
	
});

function getDivName(keyword)
{
	temp = keyword.split(' ').join("");
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
		if (tweet.text.indexOf(tracks[i]))
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
			$('thead').after('<tr id='+getDivName(tracks[i])+'_twitter><td>Twitter</td><td>'
			  +tracks[i]+'</td><td id="'
			  +getDivName(tracks[i])+'_tcount">0</td><td id="'
			  +getDivName(tracks[i])+'_timages">tbd</td><td id="'
			  +getDivName(tracks[i])+'_tvideos">tbd</td><td id="'
			  +getDivName(tracks[i])+'_tgeocoded">0</td><td id="'
			  +getDivName(tracks[i])+'_tsentiment">tbd</td><td id="'
			  +getDivName(tracks[i])+'_taction"><button class="btn btn-mini">Expand</button></td></tr>');
			

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
			$('thead').after('<tr id='+getDivName(tracks[i])+'_facebook><td>Facebook</td><td>'
			  +tracks[i]+'</td><td id="'
			  +getDivName(tracks[i])+'_fcount">0</td><td id="'
			  +getDivName(tracks[i])+'_fimages">tbd</td><td id="'
			  +getDivName(tracks[i])+'_fvideos">tbd</td><td id="'
			  +getDivName(tracks[i])+'_fgeocoded">tbd</td><td id="'
			  +getDivName(tracks[i])+'_fsentiment">tbd</td><td id="'
			  +getDivName(tracks[i])+'_faction"><button class="btn btn-mini">Expand</button></td></tr>');
			  
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
			$('thead').after('<tr id='+getDivName(tracks[i])+'_rss><td>RSS</td><td>'
			  +tracks[i]+'</td><td id="'
			  +getDivName(tracks[i])+'_rcount">0</td><td id="'
			  +getDivName(tracks[i])+'_rimages">tbd</td><td id="'
			  +getDivName(tracks[i])+'_rvideos">tbd</td><td id="'
			  +getDivName(tracks[i])+'_rgeocoded">0</td><td id="'
			  +getDivName(tracks[i])+'_rsentiment">tbd</td><td id="'
			  +getDivName(tracks[i])+'_raction"><button class="btn btn-mini">Expand</button></td></tr>');
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





