var express = require('express'),
    OAuth = require('oauth').OAuth,
    twitter = require('ntwitter'),
    io = require('socket.io'),
    redis = require('redis'),
    $ = require('jQuery'),
    analyze = require('sentimental').analyze;

var app = express.createServer(express.logger());

//setup redis client
var redis_client = redis.createClient('9279','scat.redistogo.com');
redis_client.auth('bb20238066f9fca9c19efdbf18cb8bf9',function(err,reply){
	console.log(reply.toString());
});



//array of keywords
var keywords = [];


io = io.listen(app);
io.set('log level',1);

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
/*var TWITTER_KEY = '33mGf9Wg71gWZm1eNT61w',
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
					//console.log(results);
					//NEED TO REMOVE FROM HERE
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

app.get('/:keyword/:source/:attr',function(req,res){
	
	var url = req.params.keyword+'.'+req.params.source+'.'+req.params.attr;
	var keyword = req.params.keyword.split('_').join(' ');
	var title = keyword + ' ' +req.params.source+' '+req.params.attr;
	redis_client.smembers(url,function(err,reply){
		if (!err){
			redis_client.mget(reply,function(err,reply){
				if (reply){
					if (req.params.source === 'facebook'){
						if ((req.params.attr === 'photos') || (req.params.attr === 'videos')){
							res.render('fb_media',{posts : reply, title: title});	
						} else {
							res.render('posts',{posts : reply, title: title});
						}
					}
					
					if (req.params.source === 'tweets'){
						if (req.params.attr === 'photos'){
							
						} else if (req.params.attr === 'videos'){
							
						} else {
							res.render('tweets',{tweets : reply, title: title});
						}
					}
				} else {res.send('no results');}
			});
		} else {res.send('results arent favorable');}
	});
	
});


var port = process.env.PORT || 3000;
app.listen(port, function() {
	console.log("Listening on " + port);
});

io.sockets.on('connection', function (socket) {
	
	socket.on('track',function(track,location){	
		//call streaming twitter
		//console.log('setupStream '+track);
		if (track.length != 0)
		{
			twit.stream('statuses/filter', {'track': unescape(track),'locations':location}, function(stream){
				//console.log('in Stream');
				temp = unescape(track);
				//console.log('temp is ' +temp);
				keywords = temp.split(',');
				//called when tweet received
				stream.on('data',function(tweet){
				   processTweet(tweet,socket);
				   //socket.emit('tweet',escape(JSON.stringify(tweet)));
				  //console.log('recv tweet');	
				});
            
	            //called when disconnected
				stream.on('end', function (response){
					//handle a disconnection
					console.log('stream recv end ' +response);
				});
			
				stream.on('error',function(response){
				  console.log('error from track twit stream '+ JSON.stringify(response));	
				});
			});
	   } else {
	 	    twit.stream('statuses/filter', {'locations':location}, function(stream){
				//console.log('in Stream');
				//called when tweet received
				stream.on('data',function(tweet){
				   //socket.emit('tweet',escape(JSON.stringify(tweet)));
				  //console.log(tweet);	
				});
            
	            //called when disconnected
				stream.on('end', function (response){
					//handle a disconnection
				});
			
				stream.on('error',function(response){
				  console.log('error from location only twit stream '+ response);	
				});
			});
	   }
		
	});
	
	socket.on('fbsearch',function(track){
		temp = unescape(track);
		keywords = temp.split(',');
		
		var len = keywords.length;
		for (var i=0;i<len;i++){
			
			var temp = keywords[i];
			$.getJSON('http://graph.facebook.com/search?q='+escape(keywords[i])+'&type=post&callback=?',{"keyword":temp},(function(temp){
				return function(data){
					processFacebook(data, temp, socket);
				}
			  
			})(temp));
			
				
		}
	
	});
	

	
	socket.on('disconnect',function(err,reply){
		//console.log('user disconnect');
		redis_client.flushdb(function(err,reply){
			//console.log(reply);
		});
	});
	
});

function processFacebook(data, pkeyword, socket){
	var result = data.data;
	var keyword = pkeyword.split(" ").join("_");
	var multi = redis_client.multi();
	$.each(result,function(attr,value){
		redis_client.setnx('facebook.'+this.id+'.json', JSON.stringify(this));
		multi.sadd(keyword+'.facebook.all','facebook.'+this.id+'.json');
		if (this.type === "photo")
		  multi.sadd(keyword+'.facebook.photos','facebook.'+this.id+'.json');
		
		if (this.type === "video")
		  multi.sadd(keyword+'.facebook.videos','facebook.'+this.id+'.json');
		
		if (this.message){
			var sentiment = analyze(this.message);
			redis_client.set('facebook.'+this.id+'.sentiment', sentiment.score)
			
			if (sentiment.score > 0)
			{
				multi.sadd(keyword+'.facebook.positive','facebook.'+this.id+'.json');
			} else {
				if (sentiment.score < 0){
					multi.sadd(keyword+'.facebook.negative','facebook.'+this.id+'.json');
				}
				if (sentiment.score === 0)
				  multi.sadd(keyword+'.facebook.neutral','facebook.'+this.id+'.json');
			}
			
			//console.log('Sentiment '+this.message+' '+JSON.stringify(sentiment));
		}
		
		
		
	});
	
	var message = {"keyword":keyword,
	               "count":null,
	               "photos":null,
	               "videos":null,
	               "positive":null,
	               "negative":null,
	               "neutral":null};

	multi.exec(function(err,replies){
		
		var next_multi = redis_client.multi();
		//console.log('exec replies '+ replies);
		next_multi.scard(keyword+'.facebook.all',function(err,reply){
			message.count = reply;
		});

		next_multi.scard(keyword+'.facebook.photos',function(err, reply){
			message.photos = reply;
		});

		next_multi.scard(keyword+'.facebook.videos',function(err, reply){
			message.videos = reply;
		});
		
		next_multi.scard(keyword+'.facebook.positive',function(err, reply){
			message.positive = reply;
		});
		
		next_multi.scard(keyword+'.facebook.negative',function(err, reply){
			message.negative = reply;
		});
		
		next_multi.scard(keyword+'.facebook.neutral',function(err, reply){
			message.neutral = reply;
		});
		
		next_multi.exec(function(err,replies){
		  	//console.log('exec2 replies '+ replies);
		  socket.emit('fbresults',JSON.stringify(message));	
		});
		
	});	
	
}

//processTweet takes a tweet from twitter stream adds to redis store and sends summary message to web browser through socket
function processTweet(tweet_json, socket){
	
	var tweet = JSON.parse(JSON.stringify(tweet_json));
	
	  	var multi = redis_client.multi();
		
        var len = keywords.length;
		for (var i=0; i<len;i++)
		{
			if (tweet.text.indexOf(keywords[i]) > 0)
			{
				var keyword = keywords[i].split(" ").join("_");
				redis_client.setnx('tweet.'+tweet.id_str+'.json',JSON.stringify(tweet_json));
				var message = {"keyword":keyword,
				               "count":null,
				               "geo_count":null,
				               "positive":null,
				               "negative":null,
				               "neutral":null};
				multi.sadd(keyword+'.tweets.all','tweet.'+tweet.id_str+'.json');
				multi.scard(keyword+'.tweets.all', function(err, reply){
					//console.log('recv from redis: '+ reply)
					message.count = reply;
				});
				//console.log('inside processTweet found match');
				if (tweet.geo)
				{
					multi.sadd(keyword+'.tweets.geo', 'tweet.'+tweet.id_str+'.json');
					multi.scard(keyword+'.tweets.geo', function(err, reply){
						//console.log('recv from geo redis: '+ reply)
						message.geo_count = reply;
					});
				}
				
				var sentiment = analyze(tweet.text);
				multi.set('tweet.'+tweet.id_str+'.sentiment',sentiment.score);
				
				if (sentiment.score > 0){
					multi.sadd(keyword+'.tweets.positive', 'tweet.'+tweet.id_str+'.json');
					multi.scard(keyword+'.tweets.positive', function(err, reply){
						message.positive = reply;
					});
					
				}
				
				if (sentiment.score < 0){
					multi.sadd(keyword+'.tweets.negative', 'tweet.'+tweet.id_str+'.json');
					multi.scard(keyword+'.tweets.negative', function(err, reply){
						//console.log('recv from geo redis: '+ reply)
						message.negative = reply;
					});
					
				}
				if (sentiment.score === 0){
					multi.sadd(keyword+'.tweets.neutral', 'tweet.'+tweet.id_str+'.json');
					multi.scard(keyword+'.tweets.neutral', function(err, reply){
						//console.log('recv from geo redis: '+ reply)
						message.neutral = reply;
					});
					
				}
				
				multi.exec(function (err, replies) {
				      socket.emit('tweet',JSON.stringify(message));
				    });
				
			}
		}	
	
	
}




