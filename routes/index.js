import { getStats, getStatus } from '../controllers/AppController';
import { postNew, getMe } from '../controllers/UsersController';
import { getConnect, getDisconnect } from '../controllers/AuthController';

const express = require('express');

const router = express.Router();

router.use(express.json());

router.get('/status', getStatus);
router.get('/stats', getStats);
router.get('/users/me', getMe);
router.get('/connect', getConnect);
router.get('/disconnect', getDisconnect);

router.post('/users', postNew);

export default router;
