import sh1 from 'sha1';
import dbClient from '../utils/db';

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

export default postNew;
