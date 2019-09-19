//
//    Simple signaling server for NextCloud Talk
//    Copyright (C) 2019  Monogramm
//
//    This program is free software: you can redistribute it and/or modify
//    it under the terms of the GNU Affero General Public License as published
//    by the Free Software Foundation, either version 3 of the License, or
//    (at your option) any later version.
//
//    This program is distributed in the hope that it will be useful,
//    but WITHOUT ANY WARRANTY; without even the implied warranty of
//    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//    GNU Affero General Public License for more details.
//
//    You should have received a copy of the GNU Affero General Public License
//    along with this program.  If not, see <http://www.gnu.org/licenses/>.
//

/*global console*/
var config = require('getconfig'),
    fs = require('fs'),
    websockets = require('./websockets'),
    port = parseInt(process.env.PORT || config.server.port, 10),
    host = process.env.HOST || config.server.host,
    key = process.env.SSL_KEY || config.server.key,
    cert = process.env.SSL_CERT || config.server.cert,
    password = process.env.SSL_PASSWORD || config.server.password,
    server_handler = function (request, response) {
        if (request.url === '/healthcheck') {
            console.log(Date.now(), 'healthcheck');
            response.writeHead(200);
            response.end('OK');
            return;
        }
        response.writeHead(404);
        response.end();
    },
    server = null,
    WebSocketServer = require('websocket').server,
    wsServer = null;

// Create an http(s) server instance that the websocket server can listen to
if (config.server.secure && key && cert) {
    server = require('https').createServer({
        key: fs.readFileSync(key),
        cert: fs.readFileSync(cert),
        passphrase: password
    }, server_handler);
} else {
    server = require('http').createServer(server_handler);
}

server.listen(port, function() {
    var httpUrl,
        wsUrl;
    if (config.server.secure) {
        httpUrl = "https://" + host + ":" + port;
        wsUrl = "wss://" + host + ":" + port;
    } else {
        httpUrl = "http://" + host + ":" + port;
        wsUrl = "ws://" + host + ":" + port;
    }
    console.log("NextCloud Talk -- HTTP server is running at '" + httpUrl + "'");
    console.log("NextCloud Talk -- signal master is running at '" + wsUrl + "'");
});

wsServer = new WebSocketServer({
    httpServer: server,
    // You should not use autoAcceptConnections for production
    // applications, as it defeats all standard cross-origin protection
    // facilities built into the protocol and the browser.  You should
    // *always* verify the connection's origin and decide whether or not
    // to accept it.
    autoAcceptConnections: false,
    secret: config.server.secret
});

websockets(wsServer, config);

if (config.uid) process.setuid(config.uid);
