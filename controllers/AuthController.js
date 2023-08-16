import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

export const getConnect = async (request, response) => {
  const auth = request.headers.authorization;
  if (!auth) return response.status(401).send({ error: 'Unauthorized' });

  const extractAuth = auth.split('Basic ')[1];
  const decodeAuth = Buffer.from(extractAuth, 'base64').toString('utf-8');
  const [email, password] = decodeAuth.split(':');
  if (!email || !password) return response.status(401).send({ error: 'Unauthorized' });

  const user = { email, password: sha1(password) };
  const getUser = await dbClient.db.collection('users').findOne(user);
  if (!getUser) return response.status(401).send({ error: 'Unauthorized' });
  const token = uuidv4();
  await redisClient.set(`auth_${token}`, getUser._id.toString(), 24 * 60 * 60);
  return response.status(200).send({ token });
};
export const getDisconnect = async (request, response) => {
  const xToken = request.headers['x-token'];
  const userId = await redisClient.get(`auth_${xToken}`);
  if (!userId) return response.status(401).send({ error: 'Unauthorized' });
  await redisClient.del(`auth_${xToken}`);
  return response.status(204).send();
};
