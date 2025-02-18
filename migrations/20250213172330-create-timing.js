'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Create the 'timing' table
        await queryInterface.createTable('timing', {
            ID: {
                type: Sequelize.INTEGER,
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
            },
            timing: {
                type: Sequelize.DATE,
                allowNull: false,
                unique: true,
            },
            guide_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'guide', // References the 'guide' table
                    key: 'ID',
                },
            },
            is_free: {
                type: Sequelize.TINYINT(1), // Tinyint for boolean values
                allowNull: false,
            },
            saltwork: {
                type: Sequelize.TINYINT(1), // Tinyint for boolean-like values
                allowNull: false,
            },
        });

    },

    async down(queryInterface, Sequelize) {
        // Drop the 'timing' table
        await queryInterface.dropTable('timing');
    }
};
