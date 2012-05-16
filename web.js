var express = require('express');

var app = express.createServer(express.logger());

app.configure(function(){
  //app.use(gzippo.staticGzip(dirname +'/static', {clientMaxAge: maxAge}));
  app.use(express.static('./static'));
});

app.get('/', function(request, response){
	response.send('Hello World!');
});


var port = process.env.PORT || 3000;
app.listen(port, function() {
	console.log("Listening on " + port);
})