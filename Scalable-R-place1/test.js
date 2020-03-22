var redis = require('redis');
var subscriber = redis.createClient();
subscriber.on("message", function (channel, message) {
	var o = JSON.parse(message);
	// check if coordinates recevied are valid and user did not make a request in the last 2 seconds
	// if(isValidSet(o)) {
	// 	o['status'] = 0;
	// 	wss.broadcast(JSON.stringify(o));
	// 	board[o.x][o.y] = { 'r': o.r, 'g': o.g, 'b': o.b };
	// 	// save most recent request time to database
	// }
	console.log(channel);
	console.log(message);
	
});
subscriber.subscribe("set");
