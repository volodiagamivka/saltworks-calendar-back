'use strict';

const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize('calendar2', 'root', 'MYrosyaW1llB3M1ne', {
    host: '127.0.0.1',
    dialect: 'mysql',
    logging: false,  // Set to true if you want to see SQL queries
});

const User = sequelize.define('User', {
    ID: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    phone: {
        type: DataTypes.STRING(15),
        allowNull: false,
        unique: true,
    },
    email: {
        type: DataTypes.STRING(45),
        allowNull: false,
        unique: true,
    },
    name: {
        type: DataTypes.STRING(25),
        allowNull: false,
    },
}, {
    tableName: 'user',
    timestamps: false, // You can enable this if your table has createdAt and updatedAt fields
});

const Guide = sequelize.define('Guide', {
    ID: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    description: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
}, {
    tableName: 'guide',
    timestamps: false, // Enable if needed
});

const Timing = sequelize.define('Timing', {
    ID: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    time_slot: {
        type: DataTypes.STRING(45),
        allowNull: false,
    },
    description: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
}, {
    tableName: 'timing',
    timestamps: false,
});

const Booking = sequelize.define('Booking', {
    ID: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    adults: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    kids: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    is_individual: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
    },
}, {
    tableName: 'booking',
    timestamps: false,
});

// Set up associations (relationships)

// One-to-many relationship: a User can have many Bookings
User.hasMany(Booking, { foreignKey: 'user_id' });
Booking.belongsTo(User, { foreignKey: 'user_id' });

// One-to-many relationship: a Guide can have many Timings
Guide.hasMany(Timing, { foreignKey: 'guide_id' });
Timing.belongsTo(Guide, { foreignKey: 'guide_id' });

// One-to-many relationship: a Timing can have many Bookings
Timing.hasMany(Booking, { foreignKey: 'timing_id' });
Booking.belongsTo(Timing, { foreignKey: 'timing_id' });

module.exports = { sequelize, User, Guide, Timing, Booking };
