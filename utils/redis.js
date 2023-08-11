import redis from 'redis';
import util from 'util';

class RedisClient {
    constructor() {
        this.client = redis.createClient();

        // Display errors in the console
        this.client.on('error', (err) => {
            console.error('Redis Error:', err);
        });
    }


    isAlive() {
        return this.client.connected;
    }


    async get(key) {
        const getAsync = util.promisify(this.client.get).bind(this.client);
        return await getAsync(key);
    }


    async set(key, value, duration) {
        const setAsync = util.promisify(this.client.setex).bind(this.client);
        await setAsync(key, duration, value);
    }


    async del(key) {
        const delAsync = util.promisify(this.client.del).bind(this.client);
        await delAsync(key);
    }
}

const redisClient = new RedisClient();

export default redisClient;
