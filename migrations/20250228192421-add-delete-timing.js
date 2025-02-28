'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Creating the DeleteTiming procedure
        await queryInterface.sequelize.query(`
      DELIMITER $$

      CREATE DEFINER=\`root\`@\`localhost\` PROCEDURE \`DeleteTiming\`(IN timing_id INT)
      BEGIN
          SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
          START TRANSACTION;
          
          DELETE FROM booking WHERE timing_id = timing_id;
          DELETE FROM timing WHERE ID = timing_id;
          
          COMMIT;
      END $$

      DELIMITER ;
    `);
    },

    down: async (queryInterface, Sequelize) => {
        // Dropping the DeleteTiming procedure
        await queryInterface.sequelize.query(`
      DROP PROCEDURE IF EXISTS \`DeleteTiming\`;
    `);
    }
};
