'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Create 'AddBooking' stored procedure
        await queryInterface.sequelize.query(`
      CREATE DEFINER=\`root\`@\`localhost\` PROCEDURE \`AddBooking\`(
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
        SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
        START TRANSACTION;
        
        -- Procedure logic for 'AddBooking'
        SELECT COUNT(*) INTO v_check
        FROM booking b
        JOIN user u ON u.ID = b.user_id
        JOIN timing t ON t.ID = b.timing_id
        WHERE u.phone = p_phone
        AND t.timing = p_timing;

        IF v_check > 0 THEN
			rollback;
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Booking already exists.';
            
        END IF;

        SELECT ID, is_free INTO v_timing_id, v_is_free 
        FROM timing 
        WHERE timing = p_timing;

        IF v_timing_id IS NOT NULL THEN
            IF v_is_free = 0 THEN
				rollback;
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'The timing is already booked.';
            ELSE
                SELECT COALESCE(SUM(kids + adults), 0) INTO v_amount 
                FROM booking 
                WHERE timing_id = v_timing_id;

                IF (v_amount + p_kids + p_adults) > 30 THEN
					rollback;
                    SET v_message = CONCAT('Sorry, there are not enough spaces. Remaining spots: ', 30 - v_amount);
                    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_message;
                END IF;

                IF (v_amount + p_kids + p_adults) = 30 THEN
                    UPDATE timing SET is_free = FALSE WHERE ID = v_timing_id;
                END IF;
            END IF;
        ELSE
            IF (p_kids + p_adults) > 30 THEN
				rollback;
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
      END
    `);

        // Create 'addNewTime' stored procedure
        await queryInterface.sequelize.query(`
      CREATE DEFINER=\`root\`@\`localhost\` PROCEDURE \`addNewTime\`(
        IN new_timing DATETIME,
        IN p_guide_name VARCHAR(45)
      )
      BEGIN
        DECLARE v_guide_id INT;
        SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
        START TRANSACTION;
        SELECT ID INTO v_guide_id FROM guide g WHERE p_guide_name = g.name;
        INSERT INTO timing(Timing, guide_id, is_free, saltwork) 
        VALUES (new_timing, v_guide_id, true, true);
        COMMIT;
      END
    `);

        // Create 'DeleteArrangement' stored procedure
        await queryInterface.sequelize.query(`
      CREATE DEFINER=\`root\`@\`localhost\` PROCEDURE \`DeleteArrangement\`(
        IN booking_id INT
      )
      BEGIN
        DECLARE v_is_individual TINYINT(1);
        DECLARE v_timing_id INT;
        SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
        START TRANSACTION;
        SELECT is_individual, timing_id
        INTO v_is_individual, v_timing_id
        FROM booking
        WHERE ID = booking_id;
        DELETE FROM booking WHERE ID = booking_id;
        IF v_is_individual = TRUE THEN
            DELETE FROM timing WHERE ID = v_timing_id;
        END IF;
        COMMIT;
      END
    `);

        // Create 'GetBookingsByPhoneNumber' stored procedure
        await queryInterface.sequelize.query(`
      CREATE DEFINER=\`root\`@\`localhost\` PROCEDURE \`GetBookingsByPhoneNumber\`(
        IN p_phone VARCHAR(15)
      )
      BEGIN
        SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
		start transaction;
        SELECT b.*
        FROM user u
        JOIN booking b ON u.ID = b.user_id
        WHERE u.phone = p_phone;
        commit;


      END
    `);

        // Create 'ChangeArrangement' stored procedure
        await queryInterface.sequelize.query(`
      CREATE DEFINER=\`root\`@\`localhost\` PROCEDURE \`ChangeArrangement_admin\`(
        IN booking_id INT,
        IN new_adults INT,
        IN new_children INT,
        IN new_timing DATETIME  -- Add missing parameter for new_timing
      )
      BEGIN
        DECLARE v_phone VARCHAR(15);
        DECLARE v_email VARCHAR(25);
        DECLARE v_name VARCHAR(45);
        DECLARE v_guide_id INT;
        DECLARE v_is_individual TINYINT(1);  
        DECLARE v_saltwork TINYINT(1);  
        DECLARE user_id INT;
        SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
        START TRANSACTION;

        SELECT 
            u.ID, 
            u.phone, 
            u.email, 
            u.name, 
            t.guide_id, 
            b.is_individual, 
            b.saltwork
        INTO 
            user_id, 
            v_phone, 
            v_email, 
            v_name, 
            v_guide_id, 
            v_is_individual, 
            v_saltwork
        FROM booking b
        JOIN user u ON b.user_id = u.ID
        JOIN timing t ON b.timing_id = t.ID
        WHERE b.ID = booking_id;

        CALL DeleteArrangement_for_change(booking_id);
        CALL AddBooking_for_change(v_phone, v_email, v_name, new_timing, new_adults, v_guide_id, new_children, v_is_individual, v_saltwork);  -- Pass new_timing
        COMMIT;
      END
    `);
    },

    async down(queryInterface, Sequelize) {
        // Drop each stored procedure individually when rolling back the migration
        await queryInterface.sequelize.query('DROP PROCEDURE IF EXISTS AddBooking');
        await queryInterface.sequelize.query('DROP PROCEDURE IF EXISTS addNewTime');
        await queryInterface.sequelize.query('DROP PROCEDURE IF EXISTS DeleteArrangement');
        await queryInterface.sequelize.query('DROP PROCEDURE IF EXISTS GetBookingsByPhoneNumber');
        await queryInterface.sequelize.query('DROP PROCEDURE IF EXISTS ChangeArrangement_admin');
    }
};
