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
        IN p_is_individual BOOLEAN
      )
      BEGIN
        DECLARE v_timing_id INT DEFAULT NULL;
        DECLARE v_is_free TINYINT(1) DEFAULT NULL;
        DECLARE v_amount INT DEFAULT 0;
        DECLARE v_user_id INT DEFAULT NULL;
        DECLARE v_check INT DEFAULT NULL;
        DECLARE v_message TEXT;

        -- Procedure logic for 'AddBooking'
        SELECT COUNT(*) INTO v_check
        FROM booking b
        JOIN user u ON u.ID = b.user_id
        JOIN timing t ON t.ID = b.timing_id
        WHERE u.phone = p_phone
        AND t.timing = p_timing;

        IF v_check > 0 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Вже є бронювання від вас на цю годину. Зайдіть в кабінет, щоб видалити чи оновити його.';
        END IF;

        SELECT ID, is_free INTO v_timing_id, v_is_free 
        FROM timing 
        WHERE timing = p_timing;

        IF v_timing_id IS NOT NULL THEN
            IF v_is_free = 0 THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ця година зайнята';
            ELSE
                SELECT COALESCE(SUM(kids + adults), 0) INTO v_amount 
                FROM booking 
                WHERE timing_id = v_timing_id;

                IF (v_amount + p_kids + p_adults) > 30 THEN
                    SET v_message = CONCAT('На жаль, на таку кількість людей місця нема. Доступно: ', 30 - v_amount);
                    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_message;
                END IF;

                IF (v_amount + p_kids + p_adults) = 30 THEN
                    UPDATE timing SET is_free = FALSE WHERE ID = v_timing_id;
                END IF;
            END IF;
        ELSE
            IF (p_kids + p_adults) > 30 THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Забагато людей. Максимум можна тільки 30';
            ELSE
                INSERT INTO timing (timing, guide_id, is_free) 
                VALUES (p_timing, p_guide_id, NOT(p_is_individual));
                SET v_timing_id = LAST_INSERT_ID();
            END IF;
        END IF;

        SELECT ID INTO v_user_id FROM user WHERE phone = p_phone;

        IF v_user_id IS NULL THEN
            INSERT INTO user(phone, email, name) VALUES (p_phone, p_email, p_name);
            SET v_user_id = LAST_INSERT_ID();
        END IF;

        INSERT INTO booking (adults, kids, timing_id, is_individual, user_id) 
        VALUES (p_adults, p_kids, v_timing_id, p_is_individual, v_user_id);

        COMMIT;
      END
    `);

        // Create 'addNewTime' stored procedure
        await queryInterface.sequelize.query(`
      CREATE DEFINER=\`root\`@\`localhost\` PROCEDURE \`addNewTime\`(
        IN new_timing DATETIME,
        IN p_guide_name Varchar(45)
      )
      BEGIN
        DECLARE v_guide_id int;
        START TRANSACTION;
        SELECT ID INTO v_guide_id FROM guide g WHERE p_guide_name = g.name;
        INSERT INTO timing(Timing, guide_id, is_free) 
        VALUES (new_timing, v_guide_id, true);
        COMMIT;
      END
    `);

        // Create 'DeleteArrangement' stored procedure
        await queryInterface.sequelize.query(`
      CREATE DEFINER=\`root\`@\`localhost\` PROCEDURE \`DeleteArrangement\`(
        IN booking_id INT
      )
      BEGIN
        START TRANSACTION;
        DELETE FROM booking WHERE ID = booking_id;
        COMMIT;
      END
    `);

        // Create 'GetBookingsByPhoneNumber' stored procedure
        await queryInterface.sequelize.query(`
      CREATE DEFINER=\`root\`@\`localhost\` PROCEDURE \`GetBookingsByPhoneNumber\`(
        IN p_phone VARCHAR(15)
      )
      BEGIN
        SELECT b.*
        FROM user u
        JOIN booking b ON u.ID = b.user_id
        WHERE u.phone = p_phone;
      END
    `);

        // Create 'СhangeArrangement' stored procedure
        await queryInterface.sequelize.query(`
      CREATE DEFINER=\`root\`@\`localhost\` PROCEDURE \`СhangeArrangement\`(
        IN p_booking_id INT,
        IN new_adults INT,
        IN new_children INT
      )
      BEGIN
        DECLARE v_amount INT DEFAULT 0;
        DECLARE v_message TEXT;

        -- Procedure logic for 'СhangeArrangement'
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
            SET v_message = CONCAT('На жаль, на таку кількість людей місця нема. Доступно: ', 30 - v_amount);
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_message;
        END IF;
      END
    `);
    },

    async down(queryInterface, Sequelize) {
        // Drop all stored procedures when rolling back the migration
        await queryInterface.sequelize.query(`
      DROP PROCEDURE IF EXISTS \`AddBooking\`;
      DROP PROCEDURE IF EXISTS \`addNewTime\`;
      DROP PROCEDURE IF EXISTS \`DeleteArrangement\`;
      DROP PROCEDURE IF EXISTS \`GetBookingsByPhoneNumber\`;
      DROP PROCEDURE IF EXISTS \`СhangeArrangement\`;
    `);
    }
};
