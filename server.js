"use strict";

var io = require('socket.io');
var http = require('http');
var url = require('url');
var fs = require('fs');
var path = require('path');
var mime = require('mime');
//var redis = require("redis").createClient();
var exec = require("child_process").exec;



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
}).listen(8888);



io = io.listen(server);
io.set('log level', 0);


var users = [];
var map = [];
var map_width = 34;
var map_height = 34;

io.sockets.on('connection', function (socket) {
    socket.emit("ready", 1);

    for (var i=0; i<users.length; i++) {
        if(users[i]) socket.emit("join", JSON.stringify(users[i]));
    }

    var r = parseInt(Math.random()*255);
    var g = parseInt(Math.random()*255);
    var b = parseInt(Math.random()*255);

    var msg = {};
    msg.type = "join";
    msg.data = {};
    msg.data.id = "cursor"+users.length;
    msg.data.r = r;
    msg.data.g = g;
    msg.data.b = b;
    msg.data.x = 0;
    msg.data.y = 0;
    var json = JSON.stringify(msg);

    socket.broadcast.emit("join", json);

    var index = users.push(msg) - 1;

    socket.on('get_map', function (data) {
        var message = JSON.parse(data);
            var x = message.data.x;
            var y = message.data.y;
            if(map["mapx"+x+"mapy"+y]) {
                message.data.content = map["mapx"+x+"mapy"+y];
                socket.emit("get_map", JSON.stringify(message));
            } else {
                exec("perl maze.pl", function(error, stdout, stderr) {
                    map["mapx"+x+"mapy"+y] = stdout;
                    message.data.content = stdout;
                    socket.emit("get_map", JSON.stringify(message));
                });
            }
    });

    socket.on('type_in', function (data) {
        var message = JSON.parse(data);
            users[index].data.x = message.data.x;
            users[index].data.y = message.data.y;
            var s_x = parseInt(message.data.x/map_width);
            var s_y = parseInt(message.data.y/map_height);
            var x = message.data.x%map_width;
            var y = message.data.y%map_height;
            map["mapx"+s_x+"mapy"+s_y] = map["mapx"+s_x+"mapy"+s_y].substring(0,y*map_width+x)+message.data.value+map["mapx"+s_x+"mapy"+s_y].substring(y*map_width+x+1,map["mapx"+s_x+"mapy"+s_y].length);
            message.data.id = "cursor"+index;
            socket.broadcast.emit("type_in", JSON.stringify(message));
    });

    socket.on('delete', function (data) {
        var message = JSON.parse(data);
            users[index].data.x = message.data.x;
            users[index].data.y = message.data.y;
            var s_x = parseInt(message.data.x/map_width);
            var s_y = parseInt(message.data.y/map_height);
            var x = message.data.x%map_width;
            var y = message.data.y%map_height;
            map["mapx"+s_x+"mapy"+s_y] = map["mapx"+s_x+"mapy"+s_y].substring(0,y*map_width+x)+" "+map["mapx"+s_x+"mapy"+s_y].substring(y*map_width+x+1,map["mapx"+s_x+"mapy"+s_y].length);
            message.data.id = "cursor"+index;
            socket.broadcast.emit("delete", JSON.stringify(message));
    });

    socket.on('move', function (data) {
        var message = JSON.parse(data);
            users[index].data.x = message.data.x;
            users[index].data.y = message.data.y;
            message.data.id = "cursor"+index;
            socket.broadcast.emit("move", JSON.stringify(message));
    });

    socket.on('disconnect', function () {
        users[index] = 0;

        var msg = {};
        msg.type = "exit";
        msg.data = {};
        msg.data.id = "cursor"+index;
        socket.broadcast.emit("exit", JSON.stringify(msg));
    })
});
