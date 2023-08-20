import fs from 'fs';
import getUser from '../tools/getUser';
import dbClient from '../utils/db';

const Bull = require('bull');
const { v4: uuidv4 } = require('uuid');
const { ObjectId } = require('mongodb');
const mime = require('mime-types');

export default class FilesController {
  static async postUpload(request, response) {
    const fileQueue = new Bull('fileQueue');
    const xToken = request.headers['x-token'];
    const user = await getUser(xToken);
    if (!user) return response.status(401).send({ error: 'Unauthorized' });
    const {
      name, type, isPublic, data,
    } = request.body;
    const parentId = request.body.parentId || 0;
    const validTypes = ['folder', 'file', 'image'];

    if (!name) return response.status(400).send({ error: 'Missing name' });
    if (!type || !validTypes.includes(type)) return response.status(400).send({ error: 'Missing type' });
    if (!data && type !== 'folder') return response.status(400).send({ error: 'Missing data' });
    if (parentId) {
      const query = { _id: ObjectId(parentId) };
      const parent = await dbClient.db.collection('files').findOne(query);
      if (!parent) return response.status(400).send({ error: 'Parent not found' });
      if (parent.type !== 'folder') return response.status(400).send({ error: 'Parent is not a folder' });
    }
    if (type === 'folder') {
      const document = {
        userId: user._id,
        name,
        type,
        isPublic: isPublic || false,
        parentId: parentId === 0 ? parentId : ObjectId(parentId),
      };
      const result = await dbClient.db.collection('files').insertOne(document);
      return response.status(201).send({
        id: result.insertedId,
        userId: user._id,
        name,
        type,
        isPublic: isPublic || false,
        parentId,
      });
    }
    let localPath = process.env.FOLDER_PATH || '/tmp/files_manager';
    const filename = uuidv4();
    const clearData = Buffer.from(data, 'base64');
    try {
      if (!fs.existsSync(localPath)) {
        fs.mkdirSync(localPath, { recursive: true });
      }
      localPath = `${localPath}/${filename}`;
      fs.writeFile(localPath, clearData, (error) => {
        if (error) console.log(error);
      });
    } catch (error) {
      console.log(error);
    }
    const document = {
      userId: user._id,
      name,
      type,
      isPublic: !!isPublic,
      parentId: parentId === 0 ? parentId : ObjectId(parentId),
      localPath,
    };
    const result = await dbClient.db.collection('files').insertOne(document);
    const fileId = result.insertedId;
    if (type === 'image') {
      await fileQueue.add({
        userId: user._id,
        fileId,
      });
    }
    return response.status(201).send({
      id: fileId,
      userId: user._id,
      name,
      type,
      isPublic: !!isPublic,
      parentId,
    });
  }

  static async getShow(request, response) {
    const xToken = request.headers['x-token'];
    const user = await getUser(xToken);

    if (!user) return response.status(401).send({ error: 'Unauthorized' });

    const fileId = request.params.id;

    if (!fileId) return response.status(404).send({ error: 'Not found' });

    const query = { _id: ObjectId(fileId), userId: user._id };
    const file = await dbClient.db.collection('files').findOne(query);

    if (!file) return response.status(404).send({ error: 'Not found' });

    return response.status(200).send({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    });
  }

  static async getIndex(request, response) {
    const xToken = request.headers['x-token'];
    const user = await getUser(xToken);
    if (!user) return response.status(401).send({ error: 'Unauthorized' });
    const parentId = request.query.parentId || 0;
    const page = request.query.page || 0;
    let match;
    if (parentId === 0) match = {};
    else {
      match = {
        parentId: parentId === '0' ? Number(parentId) : ObjectId(parentId),
      };
    }
    const limit = 20;
    const skip = page * limit;
    const filesList = await dbClient.db.collection('files').aggregate([
      {
        $match: match,
      },
      { $skip: skip },
      { $limit: limit },
    ]).toArray();
    const resultList = filesList.map((file) => ({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    }));
    return response.status(200).send(resultList);
  }

  static async putPublish(request, response) {
    const xToken = request.headers['x-token'];
    const user = await getUser(xToken);
    if (!user) return response.status(401).send({ error: 'Unauthorized' });
    const fileId = request.params.id;
    if (!fileId) return response.status(404).send({ error: 'Not found' });
    const query = { _id: ObjectId(fileId), userId: user._id };
    const file = await dbClient.db.collection('files').findOne(query);
    if (!file) return response.status(404).send({ error: 'Not found' });
    const update = { $set: { isPublic: true } };
    await dbClient.db.collection('files').updateOne(query, update, (error) => {
      if (error) throw error;
    });
    return response.status(200).send({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: true,
      parentId: file.parentId,
    });
  }

  static async putUnPublish(request, response) {
    const xToken = request.headers['x-token'];
    const user = await getUser(xToken);
    if (!user) return response.status(401).send({ error: 'Unauthorized' });
    const fileId = request.params.id;
    if (!fileId) return response.status(404).send({ error: 'Not found' });
    const query = { _id: ObjectId(fileId), userId: user._id };
    const file = await dbClient.db.collection('files').findOne(query);
    if (!file) return response.status(404).send({ error: 'Not found' });
    const update = { $set: { isPublic: false } };
    await dbClient.db.collection('files').updateOne(query, update, (error) => {
      if (error) throw error;
    });
    return response.status(200).send({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: false,
      parentId: file.parentId,
    });
  }

  static async getFile(request, response) {
    const fileID = request.params.id || '';
    if (fileID === '') return response.status(404).send({ error: 'not found' });

    const size = request.query.size || 0;

    const query = { _id: ObjectId(fileID) };

    const file = await dbClient.db.collection('files').findOne(query);
    if (!file) return response.status(404).send({ error: 'Not found' });

    const path = size === 0 ? file.localPath : `${file.localPath}_${size}`;

    if (!file.isPublic) {
      const xToken = request.headers['x-token'];
      const user = await getUser(xToken);
      if (!user || user._id.toString() !== file.userId.toString()) {
        return response.status(404).send({ error: 'Not found' });
      }
    }

    if (file.type === 'folder') return response.status(400).send({ error: 'A folder doesn\'t have content' });

    try {
      const typOfMime = mime.lookup(file.name);
      response.setHeader('Content-Type', typOfMime);
      const dataToRead = fs.readFileSync(path);
      return response.status(200).send(dataToRead);
    } catch (error) {
      return response.status(404).send({ error: 'not found' });
    }
  }
}
