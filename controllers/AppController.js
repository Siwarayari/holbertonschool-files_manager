import dbClient from '../utils/db';
import redisClient from '../utils/redis';

export const getStatus = (req, res) => res.status(200)
  .send({
    redis: redisClient
      .isAlive(),
    db: dbClient
      .isAlive(),
  });
export const getStats = async (req, res) => res.status(200)
  .send({
    users: await dbClient
      .nbUsers(),
    files: await dbClient
      .nbFiles(),
  });
