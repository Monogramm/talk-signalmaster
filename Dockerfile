##
##    Simple signaling server for NextCloud Talk
##    Copyright (C) 2019  Monogramm
##
##    This program is free software: you can redistribute it and/or modify
##    it under the terms of the GNU Affero General Public License as published
##    by the Free Software Foundation, either version 3 of the License, or
##    (at your option) any later version.
##
##    This program is distributed in the hope that it will be useful,
##    but WITHOUT ANY WARRANTY; without even the implied warranty of
##    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
##    GNU Affero General Public License for more details.
##
##    You should have received a copy of the GNU Affero General Public License
##    along with this program.  If not, see <http://www.gnu.org/licenses/>.
##
FROM node:lts-alpine

WORKDIR /app
COPY . .

RUN set -e;\
    npm install --production; \
    apk add --update --no-cache --virtual .build-deps \
        openssl \
    ; \
    ./scripts/generate-ssl-certs.sh; \
	apk --purge del .build-deps; \
    chown -R node:node sslcerts/

ENV NODE_ENV=production \
    HOST=localhost \
    PORT=8888 \
    ROOM_MAX_CLIENTS=0 \
    STUN_SERVER_DOMAIN=stun.l.google.com \
    STUN_SERVER_PORT=19302 \
    TURN_SERVER_DOMAIN= \
    TURN_SERVER_PORT= \
    TURN_SERVER_SECRET= \
    SSL_KEY=./sslcerts/key.pem \
    SSL_CERT=./sslcerts/cert.pem \
    SSL_PASSWORD=

USER node
CMD ["node", "server.js"]
