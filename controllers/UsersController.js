import sh1 from 'sha1';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const postNew = async (req, res) => {
  const { email, password } = req.body;
  if (!email) return res.status(400).send({ error: 'Missing email' });
  if (!password) return res.status(400).send({ error: 'Missing password' });
  if (await dbClient.db.collection('users').findOne({ email })) {
    return res.status(400).send({ error: 'Already exist' });
  }
  const user = { email, password: sh1(password) };
  const result = await dbClient.db.collection('users').insertOne(user);
  return res.status(201).send({ id: result.insertedId, email });
};

const getMe = async (req, res) => {
  const xToken = req.header['x-token'];
  const userId = await redisClient.get(`auth_${xToken}`);
  if (!userId) return res.status(401).send({ error: 'Unauthorized' });
  const user = await dbClient.db.collection('users').findOne({ _id: ObjectId(userId) });
  if (!user) return res.status(401).send({ error: 'Unauthorized' });
  return res.status(200).send({ id: user._id, email: user.email });
};

export { postNew, getMe };
