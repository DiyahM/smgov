var socket= io.connect();
function loadMap(){
	socket.emit('setupStream','coffee','-122.75,36.8,-121.75,37.8,-74,40,-73,41');
	//socket.disconnect();
	//socket.socket.reconnect();	
}