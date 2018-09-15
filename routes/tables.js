var express = require('express');
var router = express.Router();

var database = {
    getTables: function(callback) {
        var mysql = require('mysql');
        var connection = mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'root',
            database: 'dbusers'
        });
        connection.connect();

        connection.query('SELECT * FROM cash_table', function (err, result) {
            if (err) {
                console.error(err);
                return;
            }
            //console.log(result);
            callback(result);
        });
    },
    updateTable: function(tableName,noPlayers,callback) {
        var mysql = require('mysql');
        var connection = mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'root',
            database: 'dbusers'
        });

        connection.connect();
        connection.query('UPDATE cash_table SET player_count = ? WHERE name = ?',[noPlayers,tableName], function (err, result) {
            if (err) {
                console.error(err);
                return;
            }
            if(result.affectedRows > 0)
                callback(true);
            else
                callback(false);
        });
    }
}

module.exports = database;