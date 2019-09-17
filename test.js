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

var io = require('socket.io-client');

var socketURL;
if (config.server.secure) {
    socketURL = "https://" + config.server.host + ":" + config.server.port;
} else {
    socketURL = "http://" + config.server.host + ":" + config.server.port;
}

var socketOptions = {
    transports: ['websocket'],
    'force new connection': true,
    "secure": config.server.secure
};

test('it should not crash when sent an empty message', function (t) {
    t.plan(1);
    var client = io.connect(socketURL, socketOptions);

    client.on('connect', function () {
        client.emit('message');
        t.ok(true);
    });
});
