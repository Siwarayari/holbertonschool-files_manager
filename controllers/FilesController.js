import { ObjectId } from 'mongodb';
import { v4 as uuid } from 'uuid';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';
import mkdirPath from '../tools/mkdirPath';

const postUpload = async (req, res) => {
  const token = req.headers['x-token'];
  const userId = await redisClient.get(`auth_${token}`);
  if (!userId) return res.status(401).send({ error: 'Unauthorized' });
  const { name, type, data } = req.body;
  let { parentId, isPublic } = req.body;
  if (!parentId) parentId = 0;
  if (!isPublic) isPublic = false;
  if (!name) return res.status(400).json({ error: 'Missing name' });
  const fileTypes = ['folder', 'file', 'image'];
  if (!type || fileTypes.includes(type)) return res.status(400).json({ error: 'Missing type' });
  if (!data && type !== 'folder') return res.status(400).json({ error: 'Missing data' });
  if (parentId) {
    const parent = await dbClient.findFiles({ _id: ObjectId(parentId) });
    if (!parent) return res.status(400).json({ error: 'Parent not found' });
    if (parent.type !== 'folder') return res.status(400).json({ error: 'Parent is not a folder' });
  }
  const file = {
    userId,
    name,
    type,
    parentId,
    isPublic,
  };
  if (type !== 'folder') {
    file.data = data;
    file.path = mkdirPath(uuid, data, type);
  }
  const result = await dbClient.uploadFiles(file);
  delete result.data;
  delete result.path;
  return res.json(result);
};
export default postUpload;
