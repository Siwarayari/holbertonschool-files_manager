import util from 'util';
import redis from 'redis';

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
    return util.promisify(this.client.get)
      .bind(this.client)(key);
  }

  async set(key, value, duration) {
    this.client.set(key, value);
    this.client.expire(key, duration);
  }

  async del(key) {
    this.client.del(key);
  }
}

const redisClient = new RedisClient();

export default redisClient;
