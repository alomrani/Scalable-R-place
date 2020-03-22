
var config = require("./config.json");

var redis = require('redis');


var client = redis.createClient(config.redisClusterPort, config.redisClusterHost);

//connect to redis
client.on("connect", function () {
  console.log("connected");
  //check the functioning
  client.set("framework", "AngularJS", function (err, reply) {
    console.log("redis.set " , reply);
    client.get("framework", function (err, reply) {
      console.log("redis.get ", reply);
    });
  });

  
});

