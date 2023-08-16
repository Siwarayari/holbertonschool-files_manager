import fs from 'fs';
// create file at the root
// create folder inside a folder
// create a file at the root
// create a file inside a folder

const filePath = async (name, data, type) => {
  const dir = process.env.FOLDER_PATH || '/tmp/files_manager';
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const path = `/tmp/files_manager/${name}`;
  let cls = Buffer.from(data, 'base64');
  if (type !== 'image') cls = cls.toString('utf-8');
  fs.writeFile(path, cls, (err) => {
    if (err) throw err;
  });
  return path;
};

export default filePath;
