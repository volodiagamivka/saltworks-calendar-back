'use strict';

require('dotenv').config(); // Load environment variables from .env file

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('admin', {
            ID: {
                type: Sequelize.INTEGER,
                allowNull: false,
                autoIncrement: true,
                primaryKey: true
            },
            login: {
                type: Sequelize.STRING,
                allowNull: false
            },
            password: {
                type: Sequelize.STRING,
                allowNull: false
            },
        });

        // Access ADMIN_PASSWORD from .env file
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!adminPassword) {
            throw new Error('ADMIN_PASSWORD is not defined in .env file');
        }

        // Add admin with the plain password (no hashing)
        await queryInterface.bulkInsert('admin', [{
            login: 'admin',
            password: adminPassword,  // Use plain password
        }]);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('admin');
    }
};
