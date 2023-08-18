import fs from 'fs';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

const { ObjectId } = require('mongodb').ObjectId;
const Bill = require('bull');
const { v4: uuidV4 } = require('uuid');

class FilesController {
  static async postUpload(req, res) {
    const fileQueue = new Bill('fileQueue');
    const token = req.header('X-Token') || null;
    if (!token) return res.status(401).send({ error: 'Unauthorized' });
    const reditoken = await redisClient.get(`auth_${token}`);
    if (!reditoken) return res.status(401).send({ error: 'Unauthorized' });
    const usr = await dbClient.users.findOne({ _id: ObjectId(reditoken) });
    if (!usr) return res.status(401).send({ error: 'Unauthorized' });
    const fileName = req.body.name;
    if (!fileName) return res.status(400).send({ error: 'Missing name' });
    const fileType = req.body.type;
    if (!fileType || !['folder', 'file', 'image'].includes(fileType)) return res.status(400).send({ error: 'Missing type' });
    const fileData = req.body.data;
    if (!fileData && ['file', 'image'].includes(fileType)) return res.status(400).send({ error: 'Missing data' });
    const filePublic = req.body.isPublic || false;
    let fileParentId = req.body.parentId || 0;
    fileParentId = fileParentId === '0' ? 0 : fileParentId;
    if (fileParentId !== 0) {
      const parent = await dbClient.files.findOne({ _id: ObjectId(fileParentId) });
      if (!parent) return res.status(400).send({ error: 'Parent not found' });
      if (parent.type !== 'folder') return res.status(400).send({ error: 'Parent is not a folder' });
    }
    const fileDataDb = {
      userId: usr._id,
      name: fileName,
      type: fileType,
      isPublic: filePublic,
      parentId: fileParentId,
    };
    if (['folder'].includes(fileType)) {
      await dbClient.files.insertOne(fileDataDb);
      return res.status(201).send({
        id: fileDataDb._id,
        userId: fileDataDb.userId,
        name: fileDataDb.name,
        type: fileDataDb.type,
        isPublic: fileDataDb.isPublic,
        parentId: fileDataDb.parentId,
      });
    }
    const pathDir = process.env.FOLDER_PATH || '/tmp/files_manager';
    const fileId = uuidV4();

    const buff = Buffer.from(fileData, 'base64');
    const pathFile = `${pathDir}/${fileId}`;
    await fs.mkdir(pathDir, { recursive: true }, (err) => {
      if (err) return res.status(400).send({ error: err.message });
      return true;
    });
    await fs.writeFile(pathFile, buff, (err) => {
      if (err) return res.status(400).send({ error: err.message });
      return true;
    });
    fileDataDb.localPath = pathFile;
    await dbClient.db.collection('files').insertOne(fileDataDb);
    fileQueue.add({
      userId: fileDataDb.userId,
      fileId: fileDataDb._id,
    });
    return res.status(201).send({
      id: fileDataDb._id,
      userId: fileDataDb.userId,
      name: fileDataDb.name,
      type: fileDataDb.type,
      isPublic: fileDataDb.isPublic,
      parentId: fileDataDb.parentId,
    });
  }

  static async getShow(req, res) {
    const token = req.header('X-Token') || null;
    if (!token) return res.status(401).send({ error: 'Unauthorized' });
    const reditoken = await redisClient.get(`auth_${token}`);
    if (!reditoken) return res.status(401).send({ error: 'Unauthorized' });
    const usr = await dbClient.db.collection('users').findOne({ _id: ObjectId(reditoken) });
    if (!usr) return res.status(401).send({ error: 'Unauthorized' });
    const idFile = req.params.id;
    if (!idFile) return res.status(400).send({ error: 'Missing file_id' });
    const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(idFile), userId: usr._id });
    if (!file) return res.status(404).send({ error: 'Not found' });
    return res.status(200).send({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    });
  }

  static async getIndex(req, res) {
    const token = req.header('X-Token') || null;
    if (!token) return res.status(401).send({ error: 'Unauthorized' });
    const reditoken = await redisClient.get(`auth_${token}`);
    if (!reditoken) return res.status(401).send({ error: 'Unauthorized' });
    const usr = await dbClient.db.collection('users').findOne({ _id: ObjectId(reditoken) });
    if (!usr) return res.status(401).send({ error: 'Unauthorized' });
    const parentId = req.query.parentId || 0;
    if (parentId !== 0) {
      const parent = await dbClient.db.collection('files').findOne({ _id: ObjectId(parentId) });
      if (!parent) return res.status(200).send([]);
      if (parent.type !== 'folder') return res.status(200).send([]);
    }
    const page = req.query.page || 0;
    const limit = req.query.limit || 20;
    const query = { userId: usr._id, parentId };
    if (parentId === 0) query.parentId = 0;
    const files = await dbClient.db.collection('files').find(query).skip(page * limit).limit(limit).toArray();
    return res.status(200).send(files.map((file) => ({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    })));
  }
}

export default FilesController;
