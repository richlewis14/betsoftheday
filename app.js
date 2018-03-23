var express = require('express');
var app = express();
// redis
var redis = require('redis');
var client = redis.createClient();

var profiles = ['InplayMan', "KBtips_"]
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

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});