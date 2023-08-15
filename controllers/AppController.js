import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const getStatus = async (req, res) => {
  const redis = await redisClient.isAlive();
  const db = await dbClient.isAlive();
  res.status(200)
    .send({
      redis,
      db
    });
};

const getStats = async (req, res) => {
  const users = await dbClient.nbUsers();
  const files = await dbClient.nbFiles();
  res.status(200)
    .send({
      users,
      files
    });
};

export { getStatus, getStats };
