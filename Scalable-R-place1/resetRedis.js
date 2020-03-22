var redis = require('redis');
var config = require("./config.json");
var subscriber = redis.createClient(config.redisClusterPort, config.redisClusterHost);
subscriber.send_command("SET",["board",""]);
