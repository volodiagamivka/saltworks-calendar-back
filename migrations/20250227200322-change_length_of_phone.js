'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.changeColumn('user', 'phone', {
            type: Sequelize.STRING(25),
            allowNull: false,
            unique: true,
        });
    },

    async down(queryInterface, Sequelize) { 
        await queryInterface.changeColumn('user', 'phone', {
            type: Sequelize.STRING(15),
            allowNull: false,
            unique: true,
        });
    }
};
