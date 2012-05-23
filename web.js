var express = require('express'),
    OAuth = require('oauth').OAuth;

var app = express.createServer(express.logger());

app.configure(function(){
  app.use(express.cookieParser());
  app.use(express.session({secret:"whatever"}));
  app.use(express.static('./static'));
  app.set('view engine','ejs');
  app.set('view options',{layout:false});
});

var oa = new OAuth(
	"https://api.twitter.com/oauth/request_token",
	"https://api.twitter.com/oauth/access_token",
	"06468VOd9bc8UaBCgomLVg",
	"LouTevDJ6FxzTWrOCh7dRIplN1ft6jgHazdeHGxuVM",
	"1.0",
	"http://local.host:3000/auth/twitter/callback",
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
					req.session.oauth.access_token_secret = oauth_access_token_secret;
					console.log(results);
					res.render('demo_create_map')
					//res.send("worked");
				}
			});
	} else
	  next(new Error("you're not suppose to be here" + req.session.oauth));
});


app.get('/', function(request, response){
	response.send('Loading...');
});


var port = process.env.PORT || 3000;
app.listen(port, function() {
	console.log("Listening on " + port);
})
