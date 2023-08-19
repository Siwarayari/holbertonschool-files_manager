import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const getUser = async (token) => {
  const userId = await redisClient.get(`auth_${token}`);
  if (!userId) return null;
  const user = await dbClient.db.collection('users').findOne({ _id: ObjectId(userId) });
  if (!user) return null;
  return user;
};

export default getUser;
