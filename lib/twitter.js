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

const params = { "InplayMan": { "screen_name": "InplayMan", "hash_tag": "#IPMBetOfTheDay", "sub_string": "point stake" },
                 "KBtips_": { "screen_name": "KBtips_", "hash_tag": "#KBetOfTheDay", "sub_string": "your bankroll" },
                 "ProSports_Tips": { "screen_name": "ProSports_Tips", "hash_tag": "BETOFTHEDAY", "sub_string": "odds" },
                 "BengalsTips": { "screen_name": "BengalsTips", "hash_tag": "BetOfTheDay", "sub_string": "odds" },
                 "WhaleBets_com": { "screen_name": "WhaleBets_com", "hash_tag": "BetOfTheDay", "sub_string": "price" },
                 "longshotaccaman": { "screen_name": "longshotaccaman", "hash_tag": "BetOfTheDay", "sub_string": "stake" },
                 "garydoc777": { "screen_name": "garydoc777", "hash_tag": "betoftheday", "sub_string": "odds" },
                 "Rolland_Chaser": { "screen_name": "Rolland_Chaser", "hash_tag": "BetOfTheDay", "sub_string": "price" },
                 "XV_Betting": { "screen_name": "XV_Betting", "hash_tag": "BetOfTheDay", "sub_string": "price" },
                 "simplebetting01": { "screen_name": "simplebetting01", "hash_tag": "BetOfTheDay", "sub_string": "good luck" },
                 "KKTipster": { "screen_name": "KKTipster", "hash_tag": "KKTipsterBetOfTheDay", "sub_string": "stake" },
                 "PGFootyTips": { "screen_name": "PGFootyTips", "hash_tag": "BestBet", "sub_string": "row" },
                 "DIGtipping": { "screen_name": "DIGtipping", "hash_tag": "betoftheday", "sub_string": "odds" },
                 "AceCornertips": { "screen_name": "AceCornertips", "hash_tag": "BetOfTheDay", "sub_string": "@" },
                 "TheWiseGuyTips": { "screen_name": "TheWiseGuyTips", "hash_tag": "BetOfTheDay", "sub_string": "stake" },
                 "BristolTipster": { "screen_name": "BristolTipster", "hash_tag": "BetOfTheDay", "sub_string": "point stake" },
                 "BeardyBets": { "screen_name": "BeardyBets", "hash_tag": "BetOfTheDay", "sub_string": "pays" }
               }


function getTwitterTimeline(params) {
  return new Promise((resolve, reject) => {
    client.get('statuses/user_timeline', {screen_name: params, count: 200, tweet_mode: "extended"},  function(error, tweets, response) {
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
    const val = tweets[key]['full_text'];
    if(val.includes(params1) && val.toLowerCase().includes(params2)) {
      // Check if media attribute exists (Betslip posted mostly)
      if(tweets[key]['entities']['media']){
        const media_url = tweets[key]['entities']['media'][0]['media_url'];
        // Add to exisiting tweet object
        tweets[key]["media_url"] = media_url;
      }
      // var regexp = /https:.*/gi;
      // var link = val.match(regexp);
      //var media_url = tweets[key]['entities']['media'][0]['media_url']
      // tweets[key]["media_url"] = media_url;
      hash_tag_tweet.push(tweets[key]);
    }
  }
  hash_tag_tweet = hash_tag_tweet.shift();
  return hash_tag_tweet;
}

function writeToRedis(tweet, screen_name){
  return new Promise((resolve, reject) => {
    // Not all tweets have a media attribute (so no betslip in tweet for example)
    if(tweet['entities']['media'] == undefined){
      var hash_set = ['tweet_id', tweet['id'], 'tweet_text', tweet['full_text'], 'avatar', tweet['user']['profile_image_url'], 'screen_name', tweet['user']['screen_name'], 'created_at', tweet['created_at']];
    } else {
      var hash_set = ['tweet_id', tweet['id'], 'tweet_text', tweet['full_text'], 'avatar', tweet['user']['profile_image_url'], 'screen_name', tweet['user']['screen_name'], 'media_url', tweet['media_url'], 'created_at', tweet['created_at']];
    }

    r_client.hmset(screen_name, hash_set, function (error, result) {
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
    const read = await readFromRedis(params[key]['screen_name']);
    console.log(read);
  }
  r_client.quit();
}

getBOTD();
