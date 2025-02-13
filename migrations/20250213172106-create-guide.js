'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Create the 'guide' table
        await queryInterface.createTable('guide', {
            ID: {
                type: Sequelize.INTEGER,
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
            },
            name: {
                type: Sequelize.STRING(20),
                allowNull: false,
            },
        });

    },

    async down(queryInterface, Sequelize) {
        // Drop the 'guide' table
        await queryInterface.dropTable('guide');
    }
};
