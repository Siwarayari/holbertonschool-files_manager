import Queue from 'bull';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const sha1 = require('sha1');

const usrQueue = new Queue('usrQueue');
const { ObjectId } = require('mongodb');

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;
    if (!email) return res.status(400).json({ error: 'Missing email' });
    if (!password) return res.status(400).json({ error: 'Missing password' });
    const verifyEmail = await dbClient.users.findOne({ email });
    if (verifyEmail) return res.status(400).json({ error: 'Already exist' });
    const pwdHash = sha1(password);
    const result = await dbClient.users.insertOne({ email, password: pwdHash });
    const createUser = {
      id: result.insertId,
      email,
    };
    await usrQueue.add({
      userId: result.insertId,
    });
    return res.status(201).json(createUser);
  }

  static async getMe(req, res) {
    const token = req.header('X-Token') || '';
    const usrId = await redisClient.get(`auth_${token}`);
    if (!usrId) return res.status(401).send({ error: 'Unauthorized' });
    const usr = await dbClient.users.findOne({ _id: ObjectId(usrId) });
    if (!usr) return res.status(401).send({ error: 'Unauthorized' });
    delete usr.password;
    return res.status(200).send(usr);
  }
}

export default UsersController;
