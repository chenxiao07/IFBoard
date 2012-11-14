"use strict";

var webSocketsServerPort = 1337;

var webSocketServer = require('websocket').server;
var http = require('http');
//var redis = require("redis").createClient();
var exec = require("child_process").exec;
var fs = require("fs");
var url = require('url');
var path = require("path");
var mime = require("mime");

var clients = [];
var users = [];
var map = [];
var map_width = 34;
var map_height = 34;

var server = http.createServer(function(request, response) {
    var uri = url.parse(request.url).pathname;
    var filename = path.join(process.cwd(), uri);

    path.exists(filename, function(exists) {
        if(!exists) {
            response.writeHead(404, {"Content-Type": "text/plain"});
            response.write("404 Not Found\n");
            response.end();
            return;
        }

        if (fs.statSync(filename).isDirectory()) filename += '/index.html';

        fs.readFile(filename, "binary", function(err, file) {
            if(err) {
                response.writeHead(500, {"Content-Type": "text/plain"});
                response.write(err + "\n");
                response.end();
                return;
            }

            response.writeHead(200, {"Content-Type": mime.lookup(filename)});
            response.write(file, "binary");
            response.end();
        });
    });
}).listen(webSocketsServerPort);

/**
 * WebSocket server
 */
var wsServer = new webSocketServer({
    // WebSocket server is tied to a HTTP server. WebSocket request is just
    // an enhanced HTTP request. For more info http://tools.ietf.org/html/rfc6455#page-6
    httpServer: server
});

// This callback function is called every time someone
// tries to connect to the WebSocket server
wsServer.on('request', function(request) {
    var connection = request.accept(null, request.origin);

    for (var i=0; i<users.length; i++) {
        connection.sendUTF(JSON.stringify(users[i]));
    }

    var r = parseInt(Math.random()*255);
    var g = parseInt(Math.random()*255);
    var b = parseInt(Math.random()*255);

    var msg = {};
    msg.type = "join";
    msg.data = {};
    msg.data.id = "cursor"+clients.length;
    msg.data.r = r;
    msg.data.g = g;
    msg.data.b = b;
    msg.data.x = 0;
    msg.data.y = 0;
    var json = JSON.stringify(msg);

    for (var i=0; i < clients.length; i++) {
        if(clients[i]) clients[i].sendUTF(json);
    }

    var index = clients.push(connection) - 1;
    users.push(msg);

    connection.on('message', function(message) {
        try {
            var message = JSON.parse(message.utf8Data);
        } catch (e) {
            console.log('This doesn\'t look like a valid JSON: ', message);
            return;
        }

        if (message.type === 'type_in') {
            users[index].data.x = message.data.x;
            users[index].data.y = message.data.y;
            var s_x = parseInt(message.data.x/map_width);
            var s_y = parseInt(message.data.y/map_height);
            var x = message.data.x%map_width;
            var y = message.data.y%map_height;
            map["mapx"+s_x+"mapy"+s_y] = map["mapx"+s_x+"mapy"+s_y].substring(0,y*map_width+x)+message.data.value+map["mapx"+s_x+"mapy"+s_y].substring(y*map_width+x+1,map["mapx"+s_x+"mapy"+s_y].length);
            message.data.id = "cursor"+index;
            var json = JSON.stringify(message);
            for (var i=0; i < clients.length; i++) {
                if(i!=index && clients[i]) {
                    clients[i].sendUTF(json);
                }
            }

        } else if(message.type === "move") {
            users[index].data.x = message.data.x;
            users[index].data.y = message.data.y;
            message.data.id = "cursor"+index;
            var json = JSON.stringify(message);
            for (var i=0; i < clients.length; i++) {
                if(i!=index && clients[i]) {
                    clients[i].sendUTF(json);
                }
            }
        } else if(message.type === "get_map") {
            var x = message.data.x;
            var y = message.data.y;
            if(map["mapx"+x+"mapy"+y]) {
                message.data.content = map["mapx"+x+"mapy"+y];
                clients[index].sendUTF(JSON.stringify(message));
            } else {
                exec("perl maze.pl", function(error, stdout, stderr) {
                    map["mapx"+x+"mapy"+y] = stdout;
                    message.data.content = stdout;
                    clients[index].sendUTF(JSON.stringify(message));
                });
            }
        }
    });

    // user disconnected
    connection.on('close', function(connection) {
        clients[index] = 0;
        users[index] = 0;

        var msg = {};
        msg.type = "exit";
        msg.data = {};
        msg.data.id = "cursor"+index;
        var json = JSON.stringify(msg);

        for (var i=0; i < clients.length; i++) {
            if(clients[i]) clients[i].sendUTF(json);
        }
    });

});
