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

var uuid = require('uuid/v4'),
    crypto = require('crypto'),
    connections = {};

module.exports = function (server, config) {

    server.on('request', function (request) {
        if (!originIsAllowed(request.origin)) {
            // Make sure we only accept requests from an allowed origin
            request.reject();
            log('Connection from origin ' + request.origin + ' rejected.');
            return;
        }
        else if (config.isDev) {
            log('Connection from origin ' + request.origin);
        }

        var connection = request.accept(null, request.origin);

        // Store a reference to the connection using an incrementing ID
        connection.id = uuid();
        connections[connection.id] = connection;
        if (config.isDev) {
            log('Connection ID ' + connection.id + ' accepted.');
        }

        connection.on('message', function(message) {
            if (message.type === 'utf8') {
                if (config.isDev) {
                    log('Received Message: ' + message.utf8Data);
                }
                connection.sendUTF(message.utf8Data);
            }
            else if (message.type === 'binary') {
                if (config.isDev) {
                    log('Received Binary Message of ' + message.binaryData.length + ' bytes');
                }
                connection.sendBytes(message.binaryData);
            }
        });

        connection.on('error', function(error) {
            log('Error received: ' + error);
        });

        connection.on('close', function(reasonCode, description) {
            if (config.isDev) {
                log('Peer ' + connection.remoteAddress + ' disconnected the connection ID ' + connection.id);
            }
            delete connections[connection.id];
        });

        // Old Socket.io implementation for SimpleWebRTC
        /*

        client.resources = {
            screen: false,
            video: true,
            audio: false
        };

        // pass a message to another id
        client.on('message', function (details) {
            if (!details) return;

            var otherClient = io.to(details.to);
            if (!otherClient) return;

            details.from = client.id;
            otherClient.emit('message', details);
        });

        client.on('shareScreen', function () {
            client.resources.screen = true;
        });

        client.on('unshareScreen', function (type) {
            client.resources.screen = false;
            removeFeed('screen');
        });

        client.on('join', join);

        function removeFeed(type) {
            if (client.room) {
                io.sockets.in(client.room).emit('remove', {
                    id: client.id,
                    type: type
                });
                if (!type) {
                    client.leave(client.room);
                    client.room = undefined;
                }
            }
        }

        function join(name, cb) {
            // sanity check
            if (typeof name !== 'string') return;
            // check if maximum number of clients reached
            var maxClients = parseInt(process.env.ROOM_MAX_CLIENTS || config.rooms.maxClients, 10);
            if (maxClients > 0 && clientsInRoom(name) >= maxClients) {
                safeCb(cb)('full');
                return;
            }
            // leave any existing rooms
            removeFeed();
            safeCb(cb)(null, describeRoom(name));
            client.join(name);
            client.room = name;
        }

        // we don't want to pass "leave" directly because the
        // event type string of "socket end" gets passed too.
        client.on('disconnect', function () {
            removeFeed();
        });
        client.on('leave', function () {
            removeFeed();
        });

        client.on('create', function (name, cb) {
            if (arguments.length == 2) {
                cb = (typeof cb == 'function') ? cb : function () {};
                name = name || uuid();
            } else {
                cb = name;
                name = uuid();
            }
            // check if exists
            var room = io.nsps['/'].adapter.rooms[name];
            if (room && room.length) {
                safeCb(cb)('taken');
            } else {
                join(name);
                safeCb(cb)(null, name);
            }
        });

        // support for logging full webrtc traces to stdout
        // useful for large-scale error monitoring
        client.on('trace', function (data) {
            console.log('trace', JSON.stringify(
                [data.type, data.session, data.prefix, data.peer, data.time, data.value]
            ));
        });


        // tell client about stun and turn servers and generate nonces
        client.emit('stunservers', config.stunservers || []);

        // create shared secret nonces for TURN authentication
        // the process is described in draft-uberti-behave-turn-rest
        var credentials = [];
        // allow selectively vending turn credentials based on origin.
        var origin = client.handshake.headers.origin;
        if (!config.turnorigins || config.turnorigins.indexOf(origin) !== -1) {
            config.turnservers.forEach(function (server) {
                var hmac = crypto.createHmac('sha1', server.secret);
                // default to 86400 seconds timeout unless specified
                var username = Math.floor(new Date().getTime() / 1000) + (parseInt(server.expiry || 86400, 10)) + "";
                hmac.update(username);
                credentials.push({
                    username: username,
                    credential: hmac.digest('base64'),
                    urls: server.urls || server.url
                });
            });
        }
        client.emit('turnservers', credentials);
        */
    });

    function log(message) {
        console.log('[' + (new Date().toISOString()) + '] - ' + message);
    }

    function originIsAllowed(origin) {
        var regex = new RegExp(config.origins.regex, 'i');
        return regex.test(origin);
    }

    // Broadcast to all open connections
    function broadcast(data) {
        Object.keys(connections).forEach(function(key) {
            var connection = connections[key];
            if (connection.connected) {
                connection.send(data);
            }
        });
    }

    // Send a message to a connection by its connectionID
    function sendToConnectionId(connectionID, data) {
        var connection = connections[connectionID];
        if (connection && connection.connected) {
            connection.send(data);
        }
    }

    function describeRoom(name) {
        var adapter = io.nsps['/'].adapter;
        var room = adapter.rooms[name] || {sockets: {}, length: 0};
        var result = {
            clients: {}
        };
        Object.keys(room.sockets).forEach(function (id) {
            result.clients[id] = adapter.nsp.connected[id].resources;
        });
        return result;
    }

    function clientsInRoom(name) {
        return Object.keys(io.nsps['/'].adapter.rooms[name] || {}).length;
    }

};

function safeCb(cb) {
    if (typeof cb === 'function') {
        return cb;
    } else {
        return function () {};
    }
}