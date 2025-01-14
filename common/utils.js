/**
 Generates a channel name for connection, based on the provided authorization object
 @function
 @param {Object} auth - An object containing authorization details for the channel
 @param {string} auth.token - A token to uniquely identify the client
 @param {string} auth.type - The type of client, either "is_worker" or anything else
 @returns {string|null} - The generated channel name, or null if the auth object is missing required properties
 */
export const getChannelName = (auth) => {
    if (auth && auth.token && auth.type) {
        if (auth.type === 'is_worker') {
            return process.env.CHANNEL_WORKER_NAME + auth.token;
        }
        return process.env.CHANNEL_NAME + auth.token;
    }
    return null;
}

/**
 Handler function for Redis message deletion operations
 @function
 @param {Error|null} err - An error object if an error occurred during the deletion operation, or null if successful
 @param {number} result - The number of keys deleted from Redis
 @returns {void}
 */
export const deleteRedisMessageHandler = (err, result) => {
    if (err) {
        console.error(`Redis deleted error ${err}`);
    } else {
        console.log(`Redis message deleted ${result} keys`);
    }
}
