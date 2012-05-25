var lat,lng,map_center,map;
var geocoder = new google.maps.Geocoder();
//html5 get user's location coordinates
navigator.geolocation.getCurrentPosition(function(data) {
	     lat = data['coords']['latitude']; 
	     lng = data['coords']['longitude'];
	
		map_center = new google.maps.LatLng(lat, lng); 
		map = new google.maps.Map(document.getElementById("map_canvas"), {
		  zoom: 13,
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
	var address = $("#map_coordinates").val();
	geocoder.geocode({'address':address}, function(results,status){
		if (status == google.maps.GeocoderStatus.OK){
			map.setCenter(results[0].geometry.location);
			updatePositionInputField();
			setMapOptions();
		}
		else
		  alert('not ok');
	});
});

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


//

function updatePositionInputField(){
 
  $("#map_coordinates").val(map.getBounds().toString());
}


function centerMarker(){
	alert('bounds changed');
}


var socket= io.connect();
function loadMap(){
	socket.emit('setupStream','coffee','-122.75,36.8,-121.75,37.8,-74,40,-73,41');
	//socket.disconnect();
	//socket.socket.reconnect();	
}