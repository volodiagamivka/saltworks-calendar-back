'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.sequelize.query(`
      CREATE DEFINER=\`root\`@\`localhost\` PROCEDURE \`DeleteArrangement_for_change\`(
        IN booking_id INT
      )
      BEGIN
        DECLARE v_is_individual TINYINT(1);
        DECLARE v_timing_id INT;
        SELECT is_individual, timing_id
        INTO v_is_individual, v_timing_id
        FROM booking
        WHERE ID = booking_id;
        DELETE FROM booking WHERE ID = booking_id;
        IF v_is_individual = TRUE THEN
            DELETE FROM timing WHERE ID = v_timing_id;
        END IF;
      END
    `);

        await queryInterface.sequelize.query(`
      CREATE DEFINER=\`root\`@\`localhost\` PROCEDURE \`AddBooking_for_change\`(
   IN p_phone VARCHAR(20), 
   IN p_email VARCHAR(45),
   IN p_name VARCHAR(45),
   IN p_timing DATETIME, 
   IN p_adults INT, 
   IN p_guide_id INT,
   IN p_kids INT,
   IN p_is_individual BOOLEAN,
   IN p_saltwork BOOLEAN
)
BEGIN
   DECLARE v_timing_id INT DEFAULT NULL;
   DECLARE v_is_free TINYINT(1) DEFAULT NULL;
   DECLARE v_amount INT DEFAULT 0;
   DECLARE v_user_id INT DEFAULT NULL;
   DECLARE v_check INT DEFAULT NULL;
   DECLARE v_message TEXT;

   -- Start transaction
   START TRANSACTION;

   -- Procedure logic for 'AddBooking'
   SELECT COUNT(*) INTO v_check
   FROM booking b
   JOIN user u ON u.ID = b.user_id
   JOIN timing t ON t.ID = b.timing_id
   WHERE u.phone = p_phone
   AND t.timing = p_timing;

   IF v_check > 0 THEN
       ROLLBACK;
       SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Booking already exists.';
   END IF;

   SELECT ID, is_free INTO v_timing_id, v_is_free 
   FROM timing 
   WHERE timing = p_timing;

   IF v_timing_id IS NOT NULL THEN
       IF v_is_free = 0 THEN
           ROLLBACK;
           SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'The timing is already booked.';
       ELSE
           SELECT COALESCE(SUM(kids + adults), 0) INTO v_amount 
           FROM booking 
           WHERE timing_id = v_timing_id;

           IF (v_amount + p_kids + p_adults) > 30 THEN
               ROLLBACK;
               SET v_message = CONCAT('Sorry, there are not enough spaces. Remaining spots: ', 30 - v_amount);
               SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_message;
           END IF;

           IF (v_amount + p_kids + p_adults) = 30 THEN
               UPDATE timing SET is_free = FALSE WHERE ID = v_timing_id;
           END IF;
       END IF;
   ELSE
       IF (p_kids + p_adults) > 30 THEN
           ROLLBACK;
           SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Not enough spots. Maximum allowed is 30.';
       ELSE
           INSERT INTO timing (timing, guide_id, is_free, saltwork) 
           VALUES (p_timing, p_guide_id, NOT(p_is_individual), false);
           SET v_timing_id = LAST_INSERT_ID();
       END IF;
   END IF;

   SELECT ID INTO v_user_id FROM user WHERE phone = p_phone;

   IF v_user_id IS NULL THEN
       INSERT INTO user(phone, email, name) VALUES (p_phone, p_email, p_name);
       SET v_user_id = LAST_INSERT_ID();
   END IF;

   -- Insert the booking with the additional saltwork field
   INSERT INTO booking (adults, kids, timing_id, is_individual, user_id, saltwork) 
   VALUES (p_adults, p_kids, v_timing_id, p_is_individual, v_user_id, p_saltwork);

   COMMIT;
END;

    `);

        // Create 'ChangeArrangement' stored procedure (fixed typo)
        await queryInterface.sequelize.query(`
      CREATE DEFINER=\`root\`@\`localhost\` PROCEDURE \`ChangeArrangement\`(
        IN p_booking_id INT,
        IN new_adults INT,
        IN new_children INT
      )
      BEGIN
        DECLARE v_amount INT DEFAULT 0;
        DECLARE v_message TEXT;
        SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
        start transaction;
        -- Procedure logic for 'ChangeArrangement'
        SELECT  COALESCE(SUM(b.kids + b.adults) - (SELECT b1.kids + b1.adults 
                                                  FROM booking b1 
                                                  WHERE b1.ID = p_booking_id), 0) 
        INTO v_amount
        FROM booking b
        JOIN timing t ON b.timing_id = t.id
        WHERE t.id = (SELECT timing_id FROM booking WHERE ID = p_booking_id)
        GROUP BY t.timing;

        IF new_adults + new_children + v_amount <= 30 THEN
            UPDATE booking
            SET adults = new_adults,
                kids = new_children
            WHERE id = p_booking_id;
        ELSE
            SET v_message = CONCAT('Too much people. Places left: ', 30 - v_amount);
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_message;
        END IF;
      END
    `);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.sequelize.query('DROP PROCEDURE IF EXISTS AddBooking_for_change');
        await queryInterface.sequelize.query('DROP PROCEDURE IF EXISTS DeleteArrangement_for_change');
        await queryInterface.sequelize.query('DROP PROCEDURE IF EXISTS ChangeArrangement');
    }
};
