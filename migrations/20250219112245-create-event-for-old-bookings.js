'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.sequelize.query(`
      CREATE EVENT delete_old_bookings
      ON SCHEDULE EVERY 15 MINUTE
      DO
      BEGIN
        -- Delete old bookings
        DELETE FROM booking
        WHERE timing_id IN (
          SELECT id
          FROM timing
          WHERE timing < NOW()
        );

        -- Delete old timing entries
        DELETE FROM timing
        WHERE timing < NOW();
      END;
    `);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.sequelize.query('DROP EVENT IF EXISTS delete_old_bookings');
    }
};
