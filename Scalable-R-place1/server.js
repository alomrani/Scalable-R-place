const WebSocket = require('ws');
var os = require('os');
const shell = require('shelljs');
shell.exec("./find_rds.sh");
shell.exec("./find_elastic.sh");
const wss = new WebSocket.Server({ port: 8081 });
const secret_key = 'UzI1NiIsInR5-4067-11e9-8bad-9b1deb4d3b7d';
//const websocketids = {};
var dim = 100; // note: this is not the right dimensions!!
const time_out = 1000; //1000 is 1 second for each user
var redis = require('redis');
var database = require("pg");
var config = require("./config.json");
let configRds = require("./rds.json");
var initDB = require("./initDB.js");
var dbConfig = {
        user: configRds.DBInstances[0].MasterUsername,
        password: 'postgres',
        database: 'postgres',
        host: configRds.DBInstances[0].Endpoint.Address,
        port: configRds.DBInstances[0].Endpoint.Port
};
console.log(dbConfig);
var subscriber = redis.createClient(config.redisClusterPort, config.redisClusterHost);
var publisher = redis.createClient(config.redisClusterPort, config.redisClusterHost);
var DBclient = new database.Client(dbConfig);


let count = 0;

DBclient.connect(function(err) {
	if (err) {
		console.error('Database connection failed: ' + err.stack);
		return;
	}
});

//function getRedisBoard(){
	let board = new Array(dim);
	function getpixel(x, y, callback, board){
		publisher.send_command("BITFIELD", ["board","GET","u9",(y*dim+x)*9], function(err, val) {
			callback(err, val, x, y);
		})
	}
	for(let x=0;x<dim;x++){
		board[x]=new Array(dim);
		for(let y=0;y<dim;y++) {
			getpixel(x, y, function(err, val, x, y){ 
				var r =   ~~(val / 64) % 8;
				var g =   ~~(val / 8) % 8;
				var b =   val % 8;
				//console.log("r "+r+" g "+g+" b "+b);
				board[x][y]={ 'r':255-r*32, 'g':255-g*32, 'b':255-b*32};
				//count += 1
				//console.log("r "+r*32+" g "+g*32+" b "+b*32);
			})
		}
	}
//	return board;
//}

//var board = getRedisBoard();

// COPY BOARD FROM DATABASE TO REDIS EVERY 2 SECONDS
let query3 = DBclient.query("create table if not exists servers (num Integer not null default 0); insert into servers (num) values (default);");
query3.then((res)=> {
	console.log("created servers table")
let query2 = DBclient.query("select num from servers;");
query2.then((res) => {
console.log(res.rows.length);
if (res.rows.length === 1) {
setInterval(() => {
	let query = DBclient.query("SELECT * from board;");
	query.then(function (result) {
		let jsonString = JSON.stringify(result.rows);
		let DBboard = JSON.parse(jsonString)[0]["board"]; // 100 by 100 array
		for(let x=0;x<dim;x++){
			for(let y=0;y<dim;y++) {
				var r = Math.floor((255-DBboard[x][y].r)/32) * 64
				var g = Math.floor((255-DBboard[x][y].g)/32) * 8
				var b = Math.floor((255-DBboard[x][y].b)/32)
				let rgb = r+g+b;
				//console.log(DBboard[x][y]);
				//console.log(r);
				publisher.send_command("BITFIELD", ["board","SET","u9",(y*dim+x)*9,rgb]);
				board[x][y] = { 'r':255-r*32, 'g':255-g*32, 'b':255-b*32};
				//ws.send(JSON.stringify(o));
			}
		}
	console.log("database sync");
	}).catch((err) => {
			console.log(err);
	});	

}, 2000);
}
}).catch((err)=> {
	console.log(err);

});
}).catch((err) => {console.log(err);});
/*
setInterval(() => {
	board = getRedisBoard();
	console.log("grabbed board");
	app.get("/getBoard", (req, res) => {
		console.log("sending the board");
		res.send({'board': board});
	});
}, 2000);
*/

function setLastUpdate(socketId) {
	var query = DBclient.query("UPDATE clients SET lastset = "+Date.now()+" WHERE socketId = "+socketId+";");
	query.then((res) => {
		console.log("Recorded set time in database!");

	}).catch((err) => {
		console.log(err);
	});
}


function updateBoard(o) {
	let pixel = JSON.stringify({ "r": o.r, "g": o.g, "b": o.b });
	// database index starts at 1
	console.log(o.x+" "+o.y);
	off_x = o.x+1;
	off_y = o.y+1;

	var r = Math.floor((255-o.r)/32)*64;
	var g = Math.floor((255-o.g)/32)*8;
	var b = Math.floor((255-o.b)/32);

	var rgb = r+g+b;

	var query = DBclient.query("UPDATE board SET board["+off_x+"]["+off_y+"] = '"+pixel+"'::jsonb;");
	//publisher.send_command("BITFIELD", ["board","SET","u9",(o.y*dim+o.x)*9,rgb]);
	query.then((res) => {
		console.log("Updated board!");
	}).catch((err) => {
		console.log(err);

	});
}

//const buf2 = Buffer.alloc(90000, 1);
//subscriber.set("board",buf2);
//subscriber.set("board","");

var str = "Hello world!";
str.repeat(2);

subscriber.on("message", function (channel, message) {
	var o = JSON.parse(message);
	// check if coordinates recevied are valid and user did not make a request in the last 2 seconds
	if(isValidSet(o)) {
		o['status'] = 0;
		wss.broadcast(JSON.stringify(o));
		board[o.x][o.y] = { 'r': o.r, 'g': o.g, 'b': o.b };
	}
});
subscriber.subscribe("set");


wss.on('close', function() {
    console.log('disconnected');
});

wss.broadcast = function broadcast(data) {
  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
};

// for heartbeat to make sure connection is alive 
function noop() {}
function heartbeat() {
  this.isAlive = true;
}

function isValidSet(o){
	var isValid=false;
	try {
	   isValid = 
		Number.isInteger(o.x) && o.x!=null && 0<=o.x && o.x<dim &&
		Number.isInteger(o.y) && o.y!=null && 0<=o.y && o.y<dim && 
		Number.isInteger(o.r) && o.r!=null && 0<=o.r && o.r<=255 && 
		Number.isInteger(o.g) && o.g!=null && 0<=o.g && o.g<=255 && 
		Number.isInteger(o.b) && o.b!=null && 0<=o.b && o.b<=255;
	} catch (err){ 
		isValid=false; 
	} 
	return isValid;
}
wss.on('connection', function(ws) {
	// heartbeat
  	ws.isAlive = true;
	ws.on('pong', heartbeat);
	// when we get a message from the client
	ws.on('message', function(message) {
		var o = JSON.parse(message);
		var decoded = jwt.verify(o.token, secret_key);
		// check if coordinates recevied are valid and user did not make a request in the last 2 seconds
		publisher.get(decoded.id, function(err,last_time){
			if(isValidSet(o) && Date.now() - last_time >= time_out) {
				o['status'] = 0;
				publisher.publish("set", JSON.stringify(o),() => {
					console.log("sent update to all subscribers");
				});
				// save most recent request time to database
				updateBoard(o);
				//setLastUpdate(decoded.id);
				var r = Math.floor((255-o.r)/32)*64;
				var g = Math.floor((255-o.g)/32)*8;
				var b = Math.floor((255-o.b)/32);
	
				var rgb = r+g+b;
				
				publisher.send_command("BITFIELD", ["board","SET","u9",(o.y*dim+o.x)*9,rgb]);
				publisher.set(decoded.id,Date.now());
				//console.log(decoded.id)
				//websocketids[decoded.id] = Date.now();
			} else {
				o['status'] = 1;
				ws.send(JSON.stringify(o));
			}
		});
	});
	
//	board = getRedisBoard();
});

// heartbeat (ping) sent to all clients
const interval = setInterval(function ping() {
  wss.clients.forEach(function each(ws) {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping(noop);
  });
}, 30000);

// Static content
var express = require('express');
var jwt = require('jsonwebtoken');
const uuidv1 = require('uuid/v1');

var app = express();
// static_files has all of statically returned content
// https://expressjs.com/en/starter/static-files.html
app.use('/',express.static('static_files')); // this directory has files to be returned

app.get("/getToken", (req, res) => {
	const id = uuidv1()
	console.log(id);
	var token = jwt.sign({'id': id}, secret_key, {
		expiresIn : 10000
	});
	//save token to database with timestamp
	publisher.set(id,0);

	/*
	publisher.select(1, function(err,res){
		
		publisher.select(0);
	});
	*/
	//websocketids[id]= 0;
	
	res.send({'token': token});
})
//async function businessLogic() {
//	try{
//	let init_board = await delayedBoard();
app.get("/getBoard", (req, res) => {
	console.log("sending the board");
	res.send({'board': board});
});

//	}
//	catch(error) {
  //      console.error("ERROR:" + error);
//    }
//}
console.log(os.hostname())

app.listen(8080, function () {
	console.log('Example app listening on port 8080!');
});
