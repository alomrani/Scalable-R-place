var database = require("pg");
var config = require("./config.json");
var dbConfig = {
        user: 'postgres',
        password: 'postgres',
        database: 'postgres',
        host: 'database.cqfkjyldqfdo.us-east-2.rds.amazonaws.com',
        port: 5432
};

var DBclient = new database.Client(dbConfig);

DBclient.connect();
 // COPY BOARD FROM DATABASE TO REDIS EVERY 2 SECODS
var query = DBclient.query("create table if not exists board (num Integer unique not null default 1, board jsonb[100][100] not null default array_fill('{\"r\":255, \"g\":255, \"b\":255}'::jsonb, ARRAY[100,100]));"); 


query.then(function (result) {
	let query2 = DBclient.query("insert into board (num, board) values (default, default) on conflict do nothing;");
	query2.then((res)=> {
		console.log("created database!");
		DBclient.end();
	}).catch((err)=> {
		console.log(err);
		DBclient.end();
	});

}).catch((err)=> {
	console.log("Error creating database");
	DBclient.end();
});
 
