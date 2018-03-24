if (process.env.NODE_ENV !== 'production') {
  require('dotenv').load();
}

var Twitter = require('twitter');
var redis = require('redis');
if(process.env.NODE_ENV == 'production') {
  var r_client = redis.createClient(process.env.REDISCLOUD_URL);
} else {
  var r_client = redis.createClient();
}

var client = new Twitter({
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  access_token_key: process.env.ACCESS_TOKEN_KEY,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET
});

const params = { "InplayMan": { "screen_name": "InplayMan", "hash_tag": "#IPMBetOfTheDay", "sub_string": "point stake"},
                 "KBtips_": { "screen_name": "KBtips_", "hash_tag": "#BetOfTheDay", "sub_string": "your bankroll"} }

function getTwitterTimeline(params) {
  return new Promise((resolve, reject) => {
    client.get('statuses/user_timeline', {screen_name: params, count: 100},  function(error, tweets, response) {
      if (error) {
        reject(error);
        return;
      }
      resolve(tweets);
    });
  });
}

function getHashTagTweet(tweets, params1, params2){
  var hash_tag_tweet = [];

  for (const key in tweets) {
    const val = tweets[key]['text'];
    if(val.includes(params1) && val.includes(params2)) {
      hash_tag_tweet.push(tweets[key]);
    }
  }
  hash_tag_tweet = hash_tag_tweet.shift();
  return hash_tag_tweet;
}

function writeToRedis(tweet, screen_name){
  return new Promise((resolve, reject) => {
    r_client.hset(screen_name, 'tweet_id', tweet['id'], 'tweet_text', tweet['text'], 'avatar', tweet['user']['profile_image_url'], 'screen_name', tweet['user']['screen_name'], function (error, result) {
     if (error) {
       reject(error);
       return;
     }
     resolve(result);
    });
  });
}

function readFromRedis(screen_name){
  return new Promise((resolve, reject) => {
    r_client.hgetall(screen_name, function (error, result) {
     if (error) {
       reject(error);
       return;
     }
     resolve(result);
    });
  });
}

async function getBOTD(){
  for (const key in params) {
    console.log("Searching for " + params[key]['screen_name'])
    const tweets = await getTwitterTimeline(params[key]['screen_name']);
    const hash_tag_tweet = await getHashTagTweet(tweets, params[key]['hash_tag'], params[key]['sub_string']);
    writeToRedis(hash_tag_tweet, params[key]['screen_name']);
    readFromRedis(params[key]['screen_name']);
  }
  r_client.quit();
}

getBOTD();
