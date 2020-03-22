var redis = require('redis');
var config = require("./config.json");
var subscriber = redis.createClient(config.redisClusterPort, config.redisClusterHost);
subscriber.keys('*', function (err, keys) {
    if (err) return console.log(err);
  
    for(var i = 0, len = keys.length; i < len; i++) {
      console.log(keys[i]);
    }
  });        