import dbClient from '../utils/db';

const findFiles = async (data) => {
  const files = await dbClient.db.collection('files').findOne(data);
  return files;
};

const uploadFiles = async (data) => {
  await dbClient.db.collection('files').insertOne(data);
  return dbClient.db.collection('files').findOne(data);
};

export { findFiles, uploadFiles };
