var redis = require('redis');
var subscriber = redis.createClient();

subscriber.publish("set", "{\"message\":\"Hello world from Asgardian!\"}",() => {
	console.log("done");
});
