const User = require('../models/user');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');
let token = {};
require('dotenv').config();

const validateToken = async (req, res) => {
    try {
        const token = req.headers['authorization']?.split(' ')[1];
        
        if (!token) {
            return res.status(403).json({ message: 'Se requiere un token para autenticación' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.json({
            valid: true,
            user: {
                id: decoded.id,
                legajo: decoded.legajo,
                isAdmin: decoded.isAdmin
            }
        });
    } catch (error) {
        res.status(401).json({
            valid: false,
            message: 'Token inválido o expirado'
        });
    }
};

const getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: { exclude: ['password'] } // Don't return passwords
        });

        const usersWithoutAdmin = users.filter(user => user.isAdmin === false);
        res.json(usersWithoutAdmin);
    } catch (error) {
        res.status(500).json({ 
            message: 'Error al obtener los usuarios',
            error: error.message 
        });
    }
};
/**
 * Se actualiza un usuario
 */
const updateUser = async (req, res) => {
    try {
        const { nombre, apellido, legajo, email, password, carrera, localidad, is_admin, is_authenticated } = req.body;
        const user = await User.findByPk(req.params.id);
        
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        
        // Se valida la estructura del mail
        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ 
                    message: 'El formato del email no es válido' 
                });
            }
            
            // Se controla que el mail no este ya registrado
            if (legajo !== user.legajo) {
                const existingUser = await User.findOne({ 
                    where: { 
                        legajo,
                        id: { [Op.ne]: req.params.id } // Exclude current user
                    } 
                });
                
                if (existingUser) {
                    return res.status(400).json({ 
                        message: 'El email ya está registrado por otro usuario' 
                    });
                }
            }
        }
        
        // Se prepara los datos del usuario para devolver
        const updateData = {};
        if (legajo !== undefined) updateData.legajo = legajo;
        if (nombre !== undefined) updateData.nombre = nombre;
        if (apellido !== undefined) updateData.apellido = apellido;
        if (email !== undefined) updateData.email = email;
        if (carrera !== undefined) updateData.carrera = carrera;
        if (localidad !== undefined) updateData.localidad = localidad;
        if (is_admin !== undefined) updateData.is_admin = is_admin;
        if (is_authenticated !== undefined) updateData.is_authenticated = is_authenticated;
        
        // Si se provee contraseña, se hashea
        if (password) {
            const saltRounds = 10;
            updateData.password = await bcrypt.hash(password, saltRounds);
        }
        
        // Update user
        await user.update(updateData);
        
        // Se obtiene el usuario actualizado sin la contraseña
        const updatedUser = await User.findByPk(req.params.id, {
            attributes: { exclude: ['password'] }
        });
        
        res.json({
            message: 'Usuario actualizado correctamente',
            user: updatedUser
        });
    } catch (error) {
        if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ message: error.message });
        }
        
        res.status(500).json({ 
            message: 'Error al actualizar el usuario',
            error: error.message 
        });
    }
};

/**
 * Eliminar usuario
 */
const deleteUser = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        
        await user.destroy();
        res.json({ message: 'Usuario eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ 
            message: 'Error al eliminar el usuario',
            error: error.message 
        });
    }
};

/**
 * Login de usuario
 */
// Login de usuario y generación de token
const loginUser = async (req, res) => {
    try {
        const { legajo, password } = req.body;
        
        // Validar que se proporcionaron email y password
        if (!legajo || !password) {
            return res.status(400).json({ message: 'Se requiere legajo y contraseña' });
        }
        
        // Buscar usuario por email
        const user = await User.findOne({ where: { legajo } });
        
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        
        // Verificar contraseña
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Contraseña incorrecta' });
        }
        
        // Generar token JWT
        token = jwt.sign(
            { 
                id: user.id, 
                legajo: user.legajo, 
                isAdmin: user.isAdmin 
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({
            message: 'Login exitoso',
            token,
            user: {
                id: user.id,
                legajo: user.legajo,
                username: "",
                nombre: user.nombre,
                apellido: user.apellido,
                email: user.email,
                carrera: user.carrera,
                localidad: user.localidad,
                isAdmin: user.isAdmin
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Se crea un usuario
 */
// Registro de usuario con encriptación de contraseña
const createUser = async (req, res) => {
    try {
        const { legajo, nombre, apellido, email, password, carrera, localidad, isAdmin = false } = req.body;
        
        // Validar datos
        if (!nombre || !apellido || !email || !password) {
            return res.status(400).json({ message: 'Nombre, apellido, email y contraseña son obligatorios' });
        }
        
        // Verificar si el usuario ya existe
        const existingUser = await User.findOne({ where: { legajo } });
        if (existingUser) {
            return res.status(400).json({ message: 'El legajo ya está registrado' });
        }
        
        // Encriptar contraseña
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Crear usuario
        const newUser = await User.create({
            legajo,
            nombre,
            apellido,
            email,
            password: hashedPassword,
            carrera,
            localidad,
            isAdmin,
            isAuthenticated: true
        });
        
        res.status(201).json({
            message: 'Usuario creado correctamente',
            user: {
                id: newUser.id,
                legajo: newUser.legajo,
                username: "",
                nombre: newUser.nombre,
                apellido: newUser.apellido,
                email: newUser.email,
                carrera: newUser.carrera,
                localidad: newUser.localidad,
                isAdmin: newUser.isAdmin
            }
        });
    } catch (error) {
        // Si es un error de validación de Sequelize, muestra los detalles
        if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ 
                message: error.message,
                errors: error.errors // Esto te da el detalle
            });
        }
        res.status(500).json({ message: error.message });
    }
};

const loginAdmin = async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Validar que se proporcionaron email y password
        if (!username || !password) {
            return res.status(400).json({ message: 'Se requiere username y contraseña' });
        }
        
        // Buscar usuario por email
        const user = await User.findOne({ where: { username } });
        
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        
        // Verificar contraseña
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Contraseña incorrecta' });
        }
        
        // Generar token JWT
        token = jwt.sign(
            { 
                id: user.id, 
                username: user.username, 
                isAdmin: user.isAdmin 
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({
            message: 'Login exitoso',
            token,
            user: {
                id: user.id,
                username: user.username,
                nombre: user.nombre,
                apellido: user.apellido,
                email: user.email,
                carrera: user.carrera,
                localidad: user.localidad,
                isAdmin: user.isAdmin
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getAllUsers,
    updateUser,
    deleteUser,
    loginUser,
    createUser,
    validateToken,
    loginAdmin
};
