var express = require('express');
var router = express.Router();

var database = {
    updateTokens: function(req,res){
        var tokens = req.body.tokens;
        var username = req.body.username;
        console.log(tokens+" "+username);
       var mysql = require('mysql');
        var connection = mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'root',
            database: 'dbusers'
        });

        connection.connect();
        connection.query('UPDATE user SET tokens = ? WHERE username = ?',[tokens,username],function(err,result){ 
            if(err){ 
                console.error(err);
                return;
            }
            res.end();
        });
    }
}

module.exports = database;