import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';
import filePath from '../tools/mkdirPath';
import { uploadFiles } from '../tools/uploadfind_data';

const postUpload = async (req, res) => {
  try {
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).send({ error: 'Unauthorized' });
    const { name, type, data } = req.body;
    let { parentId, isPublic } = req.body;
    if (!parentId) parentId = 0;
    if (!isPublic) isPublic = false;
    if (!name) return res.status(400).json({ error: 'Missing name' });
    if (!type || !['folder', 'file', 'image'].includes(type)) return res.status(400).json({ error: 'Missing type' });
    if (!data && type !== 'folder') return res.status(400).json({ error: 'Missing data' });
    if (parentId) {
      // check this way
      const parent = await dbClient.db.collection('files').findOne({ _id: ObjectId(parentId) });
      if (!parent) return res.status(400).json({ error: 'Parent not found' });
      if (parent.type !== 'folder') return res.status(400).json({ error: 'Parent is not a folder' });
    }
    const file = {
      userId,
      name,
      type,
      isPublic,
      parentId,
    };
    if (type !== 'folder') {
      file.data = data;
      file.path = filePath(uuidv4(), data, type);
    }
    const newFile = await uploadFiles(file);
    delete newFile.data;
    delete newFile.path;
    return res.status(201).json(newFile);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: 'Server error' });
  }
};
export default postUpload;
