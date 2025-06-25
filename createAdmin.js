const bcrypt = require('bcrypt');
const { User } = require('./src/models');
const sequelize = require('./src/config/database');
require('dotenv').config();

// Datos del usuario administrador
const adminUser = {
  legajo: 123456789,
  nombre: 'Administrador',
  apellido: 'Sistema',
  username: 'admin',
  email: 'admin@example.com',
  password: 'admin123', // Cambiar por una contraseña segura
  carrera: 'admin',
  localidad: 'admin',
  isAdmin: true,
  isAuthenticated: true
};

// Función para crear el usuario administrador
async function createAdminUser() {
  try {
    // Conectar a la base de datos
    await sequelize.authenticate();
    console.log('Conexión a la base de datos establecida correctamente.');
    
    // Sincronizar la base de datos (esto creará las tablas si no existen)
    await sequelize.sync({ force: false });
    console.log('Base de datos sincronizada correctamente.');

    // Verificar si ya existe un usuario con ese email
    const existingUser = await User.findOne({ where: { email: adminUser.email } });
    
    if (existingUser) {
      console.log('Ya existe un usuario con ese email. Actualizando a administrador...');
      
      // Encriptar la contraseña
      const hashedPassword = await bcrypt.hash(adminUser.password, 10);
      
      // Actualizar el usuario existente
      await existingUser.update({
        nombre: adminUser.nombre,
        password: hashedPassword,
        isAdmin: true,
        isAuthenticated: true
      });
      
      console.log('Usuario actualizado correctamente como administrador.');
      return;
    }
    
    // Encriptar la contraseña
    const hashedPassword = await bcrypt.hash(adminUser.password, 10);
    
    // Crear el usuario administrador
    const newAdmin = await User.create({
      ...adminUser,
      password: hashedPassword
    });
    
    console.log('Usuario administrador creado correctamente:');
    console.log({
      id: newAdmin.id,
      nombre: newAdmin.nombre,
      email: newAdmin.email,
      isAdmin: newAdmin.isAdmin
    });
    
  } catch (error) {
    console.error('Error al crear el usuario administrador:', error);
  } finally {
    // Cerrar la conexión a la base de datos
    await sequelize.close();
    process.exit(0);
  }
}

// Ejecutar la función
createAdminUser();