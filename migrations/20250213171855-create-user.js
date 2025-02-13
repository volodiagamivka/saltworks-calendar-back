'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Create the 'user' table
        await queryInterface.createTable('user', {
            ID: {
                type: Sequelize.INTEGER,
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
            },
            phone: {
                type: Sequelize.STRING(15),
                allowNull: false,
                unique: true,
            },
            email: {
                type: Sequelize.STRING(45),
                allowNull: false,
                unique: true,
            },
            name: {
                type: Sequelize.STRING(25),
                allowNull: false,
            },
        });
    },

    async down(queryInterface, Sequelize) {
        // Drop the 'user' table
        await queryInterface.dropTable('user');
    }
};
