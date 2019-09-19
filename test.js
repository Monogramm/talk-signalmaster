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

var tape = require('tape');
var config = require('getconfig');
var server = require('./server');

var test = tape.createHarness();

var output = test.createStream();
output.pipe(process.stdout);
output.on('end', function () {
    console.log('Tests complete, killing server.');
    process.exit(0);
});

var WebSocketClient = require('websocket').client;

var socketURL;
if (config.server.secure) {
    socketURL = "wss://" + config.server.host + ":" + config.server.port;
} else {
    socketURL = "ws://" + config.server.host + ":" + config.server.port;
}

test('it should be able to connect', function (t) {
    t.plan(1);
    var client = new WebSocketClient();

    client.on('connectFailed', function(error) {
        t.fail();
    });
    client.on('connect', function () {
        t.pass();
    });

    client.connect(socketURL, null);
});

test('it should not crash when sent an empty message', function (t) {
    t.plan(1);
    var client = new WebSocketClient();

    client.on('connectFailed', function(error) {
        t.fail();
    });
    client.on('connect', function (connection) {
        connection.send('message');
        t.pass();
    });

    client.connect(socketURL, null);
});

test('it should not crash when sent a text message', function (t) {
    t.plan(1);
    var client = new WebSocketClient();

    client.on('connectFailed', function(error) {
        t.fail();
    });
    client.on('connect', function (connection) {
        const msg = 'Hello World!';
        connection.on('message', function(message) {
            t.equal(message.utf8Data, msg);
        });
        connection.sendUTF(msg);
    });

    client.connect(socketURL, null);
});

test('it should not crash when sent a custom message', function (t) {
    t.plan(1);
    var client = new WebSocketClient();

    client.on('connectFailed', function(error) {
        t.fail();
    });
    client.on('connect', function (connection) {
        const msg = 'Hello World!';
        connection.on('message', function(message) {
            t.ok(message.utf8Data === msg);
        });
        connection.send({
            id: 'random_id',
            type: 'custom',
            custom: {
                text: msg,
                custom_field: 42,
            },
            toString: function() { return this.custom.text; }
        });
    });

    client.connect(socketURL, null);
});
