import { promisify } from 'util';
import redis from 'redis';

class RedisClient {
  constructor() {
    this.client = redis.createClient();
    this.client.get = promisify(this.client.get).bind(this.client);
    this.client.set = promisify(this.client.set).bind(this.client);
    this.client.expire = promisify(this.client.expire).bind(this.client);
    this.client.del = promisify(this.client.del).bind(this.client);
    this.client.on('error', (err) => console.log(`${err.message}`));
  }

  isAlive() {
    return this.client.connected;
  }

  async get(key) {
    return this.client.get(key);
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
