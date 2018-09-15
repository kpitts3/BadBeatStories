var database = require('./routes/tables');
var player = require('./game/player');
var table = require('./game/table');

playerList = [];
tableList = [];

var people={};

module.exports = function(io){
	database.getTables(function(allTables){
		for(var i=0;i< allTables.length;i++){
			var blinds = allTables[i].blinds.split('/');
			var sb = parseInt(blinds[0]);
			var bb = parseInt(blinds[1]);
			var minPlayers = 2;
			var type=""
			if(allTables[i].name.indexOf("Tournament") != -1){
				minPlayers = allTables[i].capacity;
				console.log(minPlayers);
				type = "Tournament";
				}
			var t = new table(sb,bb,minPlayers,allTables[i].capacity,allTables[i].buyin,99999,allTables[i].id,allTables[i].name,allTables[i].id,type);
				tableList.push(t);
			}
		});
	function addUserToTable(player,tableName,callback){
		var cb = true;
		for(var i=0;i< tableList.length;i++){
			if(tableList[i].name == tableName){
				//no space at the table
				if(tableList[i].maxPlayers <= tableList[i].players.length){
					cb = false; 
				}
				else{
					if(tableList[i].players.length == 0 && tableList[i].playersToAdd.length == 0){ 
						tableList[i].players.push(player);
						console.log("table empty");
					}
					else if(tableList[i].players.length == 0 && tableList[i].playersToAdd.length != 0){ 
						tableList[i].AddPlayer(player.playerName,player.chips,player.id);
						tableList[i].StartGame(function(res){
							if(res == false){
								console.log("Not enough players");
							}
							else{
								updatePlayersTableInfo(tableList[i]);
								playerSeeControls(tableList[i]);	
								}
						}); 
					}
					else{
						for(j=0;j< tableList[i].players.length;j++){ 
							if(tableList[i].players[j].id == player.id){
								cb = false;
								break;
							}
						}
						if(cb == true){
							tableList[i].AddPlayer(player.playerName,player.chips,player.id);
							tableList[i].StartGame(function(res){
								if(res == false){
									console.log("Not enough players");
								}
								else{
									updatePlayersTableInfo(tableList[i])
									playerSeeControls(tableList[i]);	
									if(tableList[i].type == "Tournament")tableList[i].startTimer();
								}	
							}); 							
						}						
					}
				}
			}
		}
		
	callback(cb);	
	}
	function playerSeeControls(table){
		var player_to_speak = table.players[table.currentPlayer];
		
		for(var i=0;i< table.gameLosers.length;i++){
			player_out = table.gameLosers[i];				
		}
		
		var ok = true;
		while(player_to_speak == undefined){
			//console.log(table.length+" "+table.);
			if(table.players.length == 0 && table.playersToAdd.length >= 2){
				for(var i=0;i<table.playersToAdd.length;i++)
					table.players.push(table.playersToAdd[i]);
				table.playersToAdd = [];
				console.log(table.players.length+" this is the lenght now");
			}

			if(table.players.length >= 2){
				table.game = new Game(table.smallBlind, table.bigBlind);
				table.NewRound();
				player_to_speak = table.players[table.currentPlayer];
				updatePlayersTableInfo(table);
			}
			else{
				updatePlayersTableInfo(table);
				console.log("player busted.not enought players");
				break;
			}
		}
		console.log(player_to_speak != undefined);
		if(player_to_speak){
			var socket_to_speak = people[player_to_speak.playerName]; 
			io.to(socket_to_speak).emit('show controls to current player', { table_id:table.id });
		}	
	}
	function updatePlayersTableInfo(table){
		for(var j=0;j<table.maxPlayers;j++){
			io.sockets.emit('update empty table seat', {table_id: table.id,seat: j});
		}

		var lastAction="none";
		if(table.actions.length > 0) var lastAction = table.actions.pop();

		for(var j=0;j<table.players.length;j++){ 
			var pl = table.players[j];
			var showdown = checkForShowdown(table,pl);
			io.sockets.emit('update table game info', {cards: pl.cards,table_id: table.id,seat: j, username: pl.playerName,chips:pl.chips, board: table.game.board,showdown:showdown,pot:table.game.pot,lastAction:lastAction});
		}	
	}

	function checkForShowdown(table,pl){
		var showdown = false;
		var lastManStanding = true; 
		for(var k=0;k<table.players.length;k++){
			if(table.players[k] != pl)
				if(table.players[k].folded == false)
					lastManStanding = false; 
		}
		if(table.game.roundName == "EndGame" && pl.folded != false && lastManStanding == false){
			//if the player has reached showdown
			showdown = true;	
		}
		return showdown;
	}
	function EndGameNewGame(table){
		setTimeout(function(){
			table.initNewGame();
			table.StartGame(function(res){

			});
			updatePlayersTableInfo(table);
			playerSeeControls(table);
		},4000); 	
	}
	io.on('connection',function(socket){		
		
		socket.on('current player fold',function(tableName){
			for(var i=0;i< tableList.length;i++){
				if(tableList[i].name == tableName){
					var p = tableList[i].players[tableList[i].currentPlayer];
					p.Fold();
					updatePlayersTableInfo(tableList[i]);

					if(tableList[i].game.roundName == "EndGame")
						EndGameNewGame(tableList[i]);
					else
						playerSeeControls(tableList[i]);	
				}
			}
		});
		socket.on('current player call/check',function(tableName){
			for(var i=0;i< tableList.length;i++){
				if(tableList[i].name == tableName){
					var p = tableList[i].players[tableList[i].currentPlayer];
					p.Check(function(res){ 
						if(!res){
							p.Call(); 
							updatePlayersTableInfo(tableList[i]);
							if(tableList[i].game.roundName == "EndGame")
								EndGameNewGame(tableList[i]);
							else
								playerSeeControls(tableList[i]);		
						}
						else{
							updatePlayersTableInfo(tableList[i]);
							
							if(tableList[i].game.roundName == "EndGame")
								EndGameNewGame(tableList[i]);
							else
								playerSeeControls(tableList[i]);	
										
						}
					}); 
				}
			}
		});
		socket.on('current player bet',function(data){
			for(var i=0;i< tableList.length;i++){
				if(tableList[i].name == data.table){
					var p = tableList[i].players[tableList[i].currentPlayer];
					p.Bet(data.bet);
					updatePlayersTableInfo(tableList[i]);

					if(tableList[i].game.roundName == "EndGame")
						EndGameNewGame(tableList[i]);
					else
						playerSeeControls(tableList[i]);	
				}
			}
		});
		
		socket.on('disconnect',function(data){});
		socket.on('join table', function(room,callback){
			var cb="";

			people[socket.request.user.attributes.username] = socket.id; 
			var tbl;
			for(var i=0;i<tableList.length;i++) 
				if(tableList[i].name == room.table_name){
					tbl = tableList[i];
					break;
				}
			var startingChips = 500;
			if(tbl.type == "Tournament"){
				startingChips = 1500;
			}
			var p = new player(socket.request.user.attributes.username,startingChips,socket.request.user.attributes.uid, tbl);

			addUserToTable(p,room.table_name,function(res){
				if(!res){
					console.log("Player was not added! Table full or Already at the table");
					cb = "Player was not added! Table full or Already at the table";
					io.sockets.in(room.table_id).emit('conversation private post', {
						user: "Server",msg: "welcome to this poker room "+room.table_name, chatId: room.table_id+"-chat"
					});
				}
				else if(res == true){
					
					socket.join(room.table_id);
					
					io.sockets.in(room.table_id).emit("private post conversation", {
						user: "Server",msg: "welcome to this poker room "+room.table_name, chatId: room.table_id+"-chat"
					});
								
					playerList.push(p); 

					for(var i=0;i<tableList.length;i++){
						//WHEN A NEW PLAYER JOINS THE TABLE, UPDATE THE INFO TO ALL PLAYERS FROM THAT TABLE
						if(tableList[i].name == room.table_name){
							for(var j=0;j<tableList[i].players.length;j++){
								var pl = tableList[i].players[j];
								io.sockets.emit('give player table seat', {table_id: room.table_id,seat: j, username: pl.playerName,chips:pl.chips});
							}
						}	
					}
					players_in = parseInt(room.players_in) + 1;
					io.sockets.emit('seats open update', {table_id: room.table_id, players_in: players_in}); 
					
					database.updateTable(room.table_name,players_in,function(res){ 
						if(!res){
						console.log("ERROR updating table in database");
						}
						else{
						}
					});					
				}
			});

			callback(cb);
		});
		//Send message
		socket.on('send room message',function(data){
			io.sockets.emit('new room message', {msg: data.msg, user: socket.request.user.attributes.username, roomId: data.roomId });
		});
	});	
}