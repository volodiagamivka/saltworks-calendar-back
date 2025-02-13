var mysql = require('mysql2/promise')

var mysqlPool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'MYrosyaW1llB3M1ne',
    database: 'calendar2'
})

mysqlPool.query("Select 1")
    .then(function(data) {
        console.log("succeded");
    })
    .catch(function(err) {
        console.log('failed');
    });

module.exports = mysqlPool;
