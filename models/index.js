const path = require('path');
const fs = require('fs');
const { Sequelize } = require('sequelize');
const config = require(__dirname + '/../config/config.json');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';  // Default to 'development' environment
const configEnv = config[env];
const sequelize = new Sequelize(configEnv.database, configEnv.username, configEnv.password, configEnv);

// Read all the models from the models directory
const db = {};

fs.readdirSync(__dirname)
    .filter(file => file.indexOf('.') !== 0 && file !== basename && file.slice(-3) === '.js')
    .forEach(file => {
        const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
        db[model.name] = model;
    });

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
