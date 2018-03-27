var express = require('express');
var app = express();
// redis
var redis = require('redis');

if(process.env.NODE_ENV == 'production') {
  var client = redis.createClient(process.env.REDISCLOUD_URL);
} else {
  var client = redis.createClient();
}

var port = process.env.PORT || 3000;

var profiles = ['InplayMan', "KBtips_", "BristolTipster", "BengalsTips", "WhaleBets_com",
                "TheWiseGuyTips", "longshotaccaman", "garydoc777", "Rolland_Chaser"]
var tweets_array = [];

async function getBOTD(){
  // empty tweets array as on a page refresh content would double each time
  tweets_array = [];
  for (var i = 0; i < profiles.length; i++) {
    var tweet_info = await readFromRedis(profiles[i]);
    tweets_array.push(tweet_info);
  }
}

function readFromRedis(screen_name){
  return new Promise((resolve, reject) => {
    client.hgetall(screen_name, function (error, result) {
     if (error) {
       reject(error);
       return;
     }
     resolve(result);
    });
  });
}

app.use(express.static('public'))
// set the view engine to ejs
app.set('view engine', 'ejs')

app.get('/', async function (req, res) {
  // render `home.ejs` with the list of tweets
  await getBOTD();
  const tweets = tweets_array;
  res.render('home', { tweets: tweets });
});

app.listen(port, function () {
  console.log('Bets of the day listening on port ' + port);
});
