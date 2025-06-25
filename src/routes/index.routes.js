const express = require('express');
const router = express.Router();
const userRoutes = require('./user.routes.js');

router.use('/api/users', userRoutes);

// Ruta para verificar si la API está funcionando
router.get('/health', (req, res) => {
    res.json({ message: 'API funcionando correctamente' });
});

module.exports = router;