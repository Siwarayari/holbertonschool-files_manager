import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const sha1 = require('sha1');
const { v4: uuidV4 } = require('uuid');

class AuthController {
  static async getConnect(req, res) {
    const authorization = req.header('Authorization') || '';
    const cred = authorization.split(' ')[1];
    if (!cred) return res.status(401).send({ error: 'Unauthorized' });
    const buff = Buffer.from(cred, 'base64').toString('utf-8');
    const [emailUsr, pwdUser] = buff.split(':');
    if (!emailUsr || !pwdUser) return res.status(401).send({ error: 'Unauthorized' });
    const pwsHash = sha1(pwdUser);
    const usr = await dbClient.users.findOne({ email: emailUsr, password: pwsHash });
    if (!usr) return res.status(401).send({ error: 'Unauthorized' });
    const token = uuidV4();
    const key = `auth_${token}`;
    const expire = 24 * 3600;
    await redisClient.set(key, usr._id.toString(), expire);
    return res.status(200).send({ token });
  }

  static async getDisconnect(req, res) {
    const token = req.header('X-Token') || '';
    const usrId = await redisClient.get(`auth_${token}`);
    if (!usrId) return res.status(401).send({ error: 'Unauthorized' });
    await redisClient.del(`auth_${token}`);
    return res.status(204).send();
  }
}

export default AuthController;
