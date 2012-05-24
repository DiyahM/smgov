var express = require('express'),
    OAuth = require('oauth').OAuth,
    twitter = require('ntwitter'),
    io = require('socket.io');

var app = express.createServer(express.logger());

io = io.listen(app);

app.configure(function(){
  app.use(express.cookieParser());
  app.use(express.session({secret:"whatever"}));
  app.use(express.static('./static'));
  app.set('view engine','ejs');
  app.set('view options',{layout:false});
});

//app twitter settings
var TWITTER_KEY = 'SkeCtmWaBi2ShT4SvffE1g',
    TWITTER_SECRET = 'oWoV0tMtVrEAOXw7hKJm7Pxv491NXDJK3t0CGXyFw'
    CALLBACK = 'http://snapdemo.herokuapp.com/auth/twitter/callback';

var access_token, my_access_token_secret, twit;

//localhost settings
/*
var TWITTER_KEY = '33mGf9Wg71gWZm1eNT61w',
    TWITTER_SECRET = '0mZt0ga9WkGkNLB2sTuVF1a4Cl2pg1GrILglOTaqAqw'
    CALLBACK = 'http://local.host:3000/auth/twitter/callback';*/

var oa = new OAuth(
	"https://api.twitter.com/oauth/request_token",
	"https://api.twitter.com/oauth/access_token",
	TWITTER_KEY,
	TWITTER_SECRET,
	"1.0",
	CALLBACK,
	"HMAC-SHA1"
	);

app.get('/auth/twitter', function(req,res){
  oa.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results){
	  if (error) {
		console.log(error);
		res.send("didn't work");
	  }
	  else {
		req.session.oauth = {};
		req.session.oauth.token = oauth_token;
		console.log('oauth.token: ' + req.session.oauth.token);
		req.session.oauth.token_secret = oauth_token_secret;
		console.log('oauth.token_secret: ' + req.session.oauth.token_secret);
		res.redirect('https://twitter.com/oauth/authenticate?oauth_token='+oauth_token)
	  }
  });	
});

app.get('/auth/twitter/callback', function(req, res, next){
	if (req.session.oauth){
		req.session.oauth.verifier = req.query.oauth_verifier;
		var oauth = req.session.oauth;
		
		oa.getOAuthAccessToken(oauth.token, oauth.token_secret, oauth.verifier,
			function(error, oauth_access_token, oauth_access_token_secret, results){
				if (error){
					  console.log(error);
					res.send("something is broken");
				} else {
					req.session.oauth.access_token = oauth_access_token;
					access_token = oauth_access_token;
					req.session.oauth.access_token_secret = oauth_access_token_secret;
					my_access_token_secret = oauth_access_token_secret;
					console.log(results);
					twit = new twitter({
						consumer_key: TWITTER_KEY,
						consumer_secret : TWITTER_SECRET,
						access_token_key : access_token,
						access_token_secret: my_access_token_secret
					});
					res.redirect('/demo_create_map');
					//res.send("worked");
				}
			});
	} else
	  next(new Error("you're not suppose to be here"));
});

app.get('/demo_create_map', function(req,res){
	res.render('demo_create_map')
});


app.get('/', function(request, response){
	response.render('/static/index.html');
});


var port = process.env.PORT || 3000;
app.listen(port, function() {
	console.log("Listening on " + port);
});

io.sockets.on('connection', function (socket) {
	
	socket.on('setupStream',function(track,location){	
		//call streaming twitter
		console.log('setupStream');
		twit.stream('statuses/filter', {'track': track, 'locations': location}, function(stream){
			console.log('in Stream');
			//called when tweet received
			stream.on('data',function(tweet){
			   //socket.emit('tweet',JSON.stringify(tweet));
			  console.log(tweet);	
			});
            
            //called when disconnected
			stream.on('end', function (response){
				//handle a disconnection
			});
			
			stream.on('error',function(response){
			  console.log('error from twit stream '+ response);	
			});
		});
		
	});
});




