import sha1 from 'sha1';
import Bull from 'bull';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

export default class UserController {
  static async postNew(request, response) {
    const userQueue = new Bull('userQueue');
    const { email, password } = request.body;

    if (!email) return response.status(400).send({ error: 'Missing email' });
    if (!password) return response.status(400).send({ error: 'Missing password' });
    if (await dbClient.db.collection('users').findOne({ email })) return response.status(400).send({ error: 'Already exist' });

    const user = { email, password: sha1(password) };
    const result = await dbClient.db.collection('users').insertOne(user);
    await userQueue.add({
      userId: result.insertedId,
    });
    return response.status(201).send({ id: result.insertedId, email });
  }

  static async getMe(request, response) {
    const xToken = request.headers['x-token'];
    const userId = await redisClient.get(`auth_${xToken}`);
    if (!userId) return response.status(401).send({ error: 'Unauthorized' });
    const user = await dbClient.db.collection('users').findOne({ _id: ObjectId(userId) });
    if (!user) return response.status(401).send({ error: 'Unauthorized' });
    return response.status(200).send({ id: user._id, email: user.email });
  }
}
