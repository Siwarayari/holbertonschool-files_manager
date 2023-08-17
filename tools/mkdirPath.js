import fs from 'fs';

export default async (name, data, type) => {
  const storagePath = process.env.FOLDER_PATH || '/tmp/files_manager';
  if (!fs.existsSync(storagePath)) {
    fs.mkdirSync(storagePath, { recursive: true });
  }
  const path = `/tmp/files_manager/${name}`;
  let buff = Buffer.from(data, 'base64');
  if (type !== 'image') buff = buff.toString('utf-8');
  fs.writeFile(path, buff, (err) => {
    if (err) throw err;
  });
  return path;
};
