import fs from 'fs';
import { v4 as uuidV4 } from 'uuid';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

const { ObjectId } = require('mongodb').ObjectId;
const Bill = require('bull');

class FilesController {
  static async postUpload(req, res) {
    const fileQueue = new Bill('fileQueue');
    const token = req.header('X-Token') || null;
    if (!token) {
      return res.status(401)
        .send({ error: 'Unauthorized' });
    }
    const reditoken = await redisClient.get(`auth_${token}`);
    if (!reditoken) {
      return res.status(401)
        .send({ error: 'Unauthorized' });
    }
    const usr = await dbClient.users.findOne({ _id: ObjectId(reditoken) });
    if (!usr) {
      return res.status(401)
        .send({ error: 'Unauthorized' });
    }
    const fileName = req.body.name;
    if (!fileName) {
      return res.status(400)
        .send({ error: 'Missing name' });
    }
    const fileType = req.body.type;
    if (!fileType || !['folder', 'file', 'image'].includes(fileType)) {
      return res.status(400)
        .send({ error: 'Missing type' });
    }
    const fileData = req.body.data;
    if (!fileData && ['file', 'image'].includes(fileType)) {
      return res.status(400)
        .send({ error: 'Missing data' });
    }
    const filePublic = req.body.isPublic || false;
    let fileParentId = req.body.parentId || 0;
    fileParentId = fileParentId === '0' ? 0 : fileParentId;
    if (fileParentId !== 0) {
      const parent = await dbClient.files.findOne({ _id: ObjectId(fileParentId) });
      if (!parent) {
        return res.status(400)
          .send({ error: 'Parent not found' });
      }
      if (parent.type !== 'folder') {
        return res.status(400)
          .send({ error: 'Parent is not a folder' });
      }
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
      return res.status(201)
        .send({
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
      if (err) {
        return res.status(400)
          .send({ error: err.message });
      }
      return true;
    });
    await fs.writeFile(pathFile, buff, (err) => {
      if (err) {
        return res.status(400)
          .send({ error: err.message });
      }
      return true;
    });
    fileDataDb.localPath = pathFile;
    await dbClient.db.collection('files')
      .insertOne(fileDataDb);
    fileQueue.add({
      userId: fileDataDb.userId,
      fileId: fileDataDb._id,
    });
    return res.status(201)
      .send({
        id: fileDataDb._id,
        userId: fileDataDb.userId,
        name: fileDataDb.name,
        type: fileDataDb.type,
        isPublic: fileDataDb.isPublic,
        parentId: fileDataDb.parentId,
      });
  }

  static async getShow(request, response) {
    const token = request.header('X-Token') || null;
    if (!token) return response.status(401).send({ error: 'Unauthorized' });

    const redisToken = await redisClient.get(`auth_${token}`);
    if (!redisToken) return response.status(401).send({ error: 'Unauthorized' });

    const user = await dbClient.db.collection('users').findOne({ _id: ObjectId(redisToken) });
    if (!user) return response.status(401).send({ error: 'Unauthorized' });

    const idFile = request.params.id || '';
    // if (!idFile) return response.status(404).send({ error: 'Not found' });

    const fileDocument = await dbClient.db.collection('files').findOne({ _id: ObjectId(idFile), userId: user._id });
    if (!fileDocument) return response.status(404).send({ error: 'Not found' });

    return response.send({
      id: fileDocument._id,
      userId: fileDocument.userId,
      name: fileDocument.name,
      type: fileDocument.type,
      isPublic: fileDocument.isPublic,
      parentId: fileDocument.parentId,
    });
  }

  static async getIndex(request, response) {
    const token = request.header('X-Token') || null;
    if (!token) return response.status(401).send({ error: 'Unauthorized' });

    const redisToken = await redisClient.get(`auth_${token}`);
    if (!redisToken) return response.status(401).send({ error: 'Unauthorized' });

    const user = await dbClient.db.collection('users').findOne({ _id: ObjectId(redisToken) });
    if (!user) return response.status(401).send({ error: 'Unauthorized' });

    const parentId = request.query.parentId || 0;
    // parentId = parentId === '0' ? 0 : parentId;

    const pagination = request.query.page || 0;
    // pagination = Number.isNaN(pagination) ? 0 : pagination;
    // pagination = pagination < 0 ? 0 : pagination;

    const aggregationMatch = { $and: [{ parentId }] };
    let aggregateData = [{ $match: aggregationMatch }, { $skip: pagination * 20 }, { $limit: 20 }];
    if (parentId === 0) aggregateData = [{ $skip: pagination * 20 }, { $limit: 20 }];

    const files = await dbClient.db.collection('files').aggregate(aggregateData);
    const filesArray = [];
    await files.forEach((item) => {
      const fileItem = {
        id: item._id,
        userId: item.userId,
        name: item.name,
        type: item.type,
        isPublic: item.isPublic,
        parentId: item.parentId,
      };
      filesArray.push(fileItem);
    });

    return response.send(filesArray);
  }
}

export default FilesController;
