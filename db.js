require('dotenv').config();
const { Sequelize } = require('sequelize');

// Log the environment variables to check if they are loaded
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_NAME:', process.env.DB_NAME);

const sequelize = new Sequelize(
    process.env.DB_NAME,  // Database name from .env
    process.env.DB_USER,  // Database user from .env
    process.env.DB_PASSWORD,  // Database password from .env
    {
        host: process.env.DB_HOST,  // Host from .env
        dialect: 'mysql',  // MySQL dialect
        logging: false,  // Disable SQL query logging
    }
);

// Check connection
sequelize.authenticate()
    .then(() => console.log('Connection has been established successfully.'))
    .catch(err => console.error('Unable to connect to the database:', err));

module.exports = sequelize;
