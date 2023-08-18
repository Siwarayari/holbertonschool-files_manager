import { promisify } from 'util';
import redis from 'redis';

class RedisClient {
  constructor() {
    this.client = redis.createClient();
    this.get = promisify(this.client.get)
      .bind(this.client);
  }

  isAlive() {
    return this.client.connected;
  }

  async get(key) {
    return this.get(key, (err, reply) => reply);
  }

  async set(key, value, duration) {
    this.client.set(key, value);
    this.client.expire(key, duration);
  }

  async del(key) {
    return this.client.del(key);
  }

  async getUserIdAndKey(request) {
    const obj = { userId: null, key: null };
    const token = request.header('X-Token');
    if (!token) return obj;
    obj.key = `auth_${token}`;
    obj.userId = await this.get(obj.key);
    return obj;
  }
}

const redisClient = new RedisClient();

export default redisClient;
