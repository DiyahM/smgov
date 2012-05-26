var map;
var geocoder = new google.maps.Geocoder();
var tracks = [];
//var stream_location;
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

  google.maps.event.addListener(map, 'bounds_changed', function(){
	updatePositionInputField();
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
  //stream_location = map.getBounds().getSouthWest().lng() + ',' + map.getBounds().getSouthWest().lat() + ',' +
	     //map.getBounds().getNorthEast().lng() + ',' + map.getBounds().getNorthEast().lat();
}

var socket= io.connect();

socket.on('tweet',function(json){
	
	var tweet = JSON.parse(unescape(json));
	
	if ((!tweet.retweeted))
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
		
	}
});

function withinGeoBounds(tweet)
{
	
	var latlng;
	if (!tweet.geo)
	{
		geocoder.geocode({'address':tweet.user.location}, function(results,status){
			if (status == google.maps.GeocoderStatus.OK)
			{
				latlng = results[0].geometry.location;
			} else{
				console.log('no good user from '+tweet.user.location +' '+ status);
			}
		});
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
	for (var i= 0; i < tracks.length; i++)
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
	  $('#keywords').prepend(keyword + '<br>');
	  $('#keyword_input').val('');
	  updateStream();
	}	
	
}

function updateStream(){
	if (tracks.length != 0)
	{
	  socket.emit('track',tracks.toString());
	}
	
}





