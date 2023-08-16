import fs from 'fs';

const filePath = async (name, data, type) => {
  const recordPath = process.env.FOLDER_PATH || '/tmp/files_manager';
  if (!fs.existsSync(recordPath)) fs.mkdirSync(recordPath, { recursive: true });
  let buff = Buffer.from(data, 'base64');
  if (type !== 'image') buff = buff.toString('utf-8');
  fs.writeFile(`${recordPath}/${name}`, buff, (err) => {
    if (err) throw err;
  });
  return recordPath;
};

export default filePath;
