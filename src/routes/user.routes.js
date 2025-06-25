const express = require('express');
const router = express.Router();
const {
    getAllUsers,
    updateUser,
    deleteUser,
    loginUser,
    createUser,
    validateToken,
    loginAdmin
} = require('../controllers/user.controller');
const { verifyToken, isAdmin } = require('../middlewares/auth.middleware');

router.post('/login', loginUser);
router.post('/login-admin', loginAdmin);
router.post('/validate-token', validateToken);

router.delete('/:id', verifyToken, isAdmin, deleteUser);
router.post('/', verifyToken, isAdmin, createUser);
router.put('/:id', verifyToken, isAdmin, updateUser);
router.get('/', verifyToken, isAdmin, getAllUsers);

module.exports = router;