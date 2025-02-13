'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Create the 'booking' table
        await queryInterface.createTable('booking', {
            ID: {
                type: Sequelize.INTEGER,
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
            },
            adults: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            kids: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            timing_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'timing', // References the 'timing' table
                    key: 'ID',
                },
            },
            is_individual: {
                type: Sequelize.TINYINT(1), // Tinyint for boolean-like values
                allowNull: false,
            },
            user_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'user', // References the 'user' table
                    key: 'ID',
                },
            },
        });
    },

    async down(queryInterface, Sequelize) {
        // Drop the 'booking' table
        await queryInterface.dropTable('booking');
    }
};
