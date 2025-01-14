/**
 * Loads environment variables from .env file.
 * @see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
 */
import * as dotenv from 'dotenv';

dotenv.config({ path: './.env' });

import express from 'express';
import { createServer } from 'http';
import Redis from 'ioredis';
import { Server } from "socket.io";

// Utils
import { deleteRedisMessageHandler, getChannelName } from './common/utils.js';

/**
 * Express application instance.
 * @type {Express.Application}
 */
const app = express();

/**
 * HTTP server instance created using the Express app.
 * @type {http.Server}
 */
const server = createServer(app);

/**
 * The port number the server will listen on.
 * Uses the `PORT` environment variable if set, or defaults to 3000.
 * @type {number}
 */
const PORT = process.env.PORT || 3000;

/**
 Configuration object for Redis database connection
 */
const RedisConfig = {
    port: process.env.REDIS_PORT || 6379, // Redis port
    host: process.env.REDIS_HOST || "127.0.0.1", // Redis host
    // username: process.env.REDIS_USERNAME || "default", // needs Redis >= 6
    // password: process.env.REDIS_PASSWORD || "my-top-secret",
    db: 0, // Defaults to 0
    reconnectOnError: (err) => {
        console.error('ioredis client disconnected due to error', err);
        return true;
    },
    maxRetriesPerRequest: 20,
};

/**
 * Redis subscriber client instance.
 * @type {Redis}
 */
const redis = new Redis(RedisConfig);

/**
 * Redis common actions client instance.
 * @type {Redis}
 */
const redisCommon = new Redis(RedisConfig);

/**
 * @type {Server}
 */
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ["GET", "POST"]
    }
});

/**
 Event listener for socket connection.
 @param {Object} socket - The socket object
 */
io.on('connection', (socket) => {
    const name = getChannelName(socket.handshake.auth);
    if (name) {
        socket.join(name);
        io.sockets
            .in(name)
            .to(name)
            .emit('connectToRoom', {
                type: 'connectToRoom',
                data: {
                    message: 'You are in room no. ' + name
                }
            });
    }

    socket.emit('connected');

    socket.on('ping', () => {
        socket.emit('pong');
    });
});

/**
 * Middleware function for socket.io that handles authentication and subscription to Redis channels.
 * @function
 * @param {Socket} socket - The socket object
 * @param {Function} next - The next middleware function
 */
io.use((socket, next) => {
    const name = getChannelName(socket.handshake.auth);

    if (name) {
        redis.subscribe(name);
        next();
    }
});

/**
 Subscribe to Redis channels and emit messages to clients
 @listens redis
 @param {string} channel - The name of the Redis channel
 @param {string} message - The message received on the Redis channel
 */
redis.on('message', (channel, message) => {
    try {
        const data = JSON.parse(message || '{}');

        io.to(channel).emit(channel, data.data);
        redisCommon.del(channel, deleteRedisMessageHandler);
    } catch (error) {
        io.to(channel).emit(channel, { 'bad-parse-message': message });
    }
});

/**
 Event listener for when the ioredis client is disconnected from Redis.
 @param {string} event - The event name with the disconnection
 */
redis.on('end', (event) => {
    console.log('ioredis client disconnected', event);
});

/**
 Event listener for when the ioredis client is connected to Redis.
 */
redis.on('ready', () => {
    console.log('ioredis client connected');
});

/**
 * Start the server and listen on the specified port.
 * @function
 * @param {number} PORT - The port number to listen on
 * @callback console.log
 */
server.listen(PORT, () => {
    console.log(`Listening on Port ${ PORT }\n`);
});
