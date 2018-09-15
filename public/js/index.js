var socket = io.connect();
var messageForm = $('#messageForm');
var message = $('#message');
var chat = $('#chat');
var userForm = $('#userForm');
var userFormArea = $('#userFormArea');
var messageArea = $('#messageArea');
var users = $('#users');
var username = $('#username');

	$('.join-table').on('click',function(e){
		table_id = $(this).attr('id');
		table_name = $(this).attr('value');
		var buyinValue = parseInt($(this).parent().siblings('.buyinValue')[0].innerHTML);
		var playerTokens = parseInt($('#player-info').children('span#tokenCount')[0].innerHTML);
			if(buyinValue > playerTokens){
				alert("Not enough tokens!");
			}
			else{
				players_in =$(this).parent().siblings(".player-count")[0].innerHTML;

				socket.emit('join table', {table_id:table_id, table_name:table_name, players_in:players_in},function(res){
					console.log(res.length);
					if(res.length == 0){
						$('#player-info').children('span#tokenCount')[0].innerHTML = playerTokens - buyinValue;
						
						//ajax req to update player tokens
						var data = {};
						data.tokens = parseInt(playerTokens) - parseInt(buyinValue);
						data.username = $('#player-info').children('span#username')[0].innerHTML;
						$.ajax({
							type: 'POST',
							data: data,
							url:  "/updateTokens",
							success: function(data) {}
						});
					}
					else{
						alert(res);
					}					
				});

				$(this).siblings(".poker-table").show();
			}
		});

		socket.on('seats open update', function(data){
			console.log(data.players_in+" players at table "+data.table_id);
			$('table').find('#'+data.table_id).parent().siblings(".player-count")[0].innerHTML = data.players_in;
		});
		
		socket.on('give player table seat',function(data){
			console.log(data.table_id+" "+data.username+" "+data.seat+" "+data.chips);
			var table = data.table_id;
			var username = data.username;
			var seat = parseInt(data.seat)+1;seat = "seat"+seat;
			var chips = data.chips;

			$('table').find('#'+data.table_id).siblings('.poker-table').find('.'+seat).children(".name-placeholder")[0].innerHTML = username; //setting the username to the first seat available
			$('table').find('#'+data.table_id).siblings('.poker-table').find('.'+seat).children(".chips-placeholder")[0].innerHTML = chips; 
		});
		socket.on('update empty table seat',function(data){
			var table = "room"+data.table_id;
			var seat = parseInt(data.seat)+1;seat = "seat"+seat;

			$('table').find('#'+table).siblings('.poker-table').find('.'+seat).children(".firstCard-placeholder")[0].src = 'img/cards/blank.gif';
			$('table').find('#'+table).siblings('.poker-table').find('.'+seat).children(".secondCard-placeholder")[0].src = 'img/cards/blank.gif';

			$('table').find('#'+table).siblings('.poker-table').find('.'+seat).children(".chips-placeholder")[0].innerHTML = "";
			$('table').find('#'+table).siblings('.poker-table').find('.'+seat).children(".name-placeholder")[0].innerHTML = "";
		});
		socket.on('update table game info',function(data){
			//console.log(data.cards[0]+data.cards[1]);
			var firstCard = data.cards[data.cards.length-2]+".png";
			var secondCard = data.cards[data.cards.length-1]+".png";
			var table = "room"+data.table_id;
			var username = data.username;
			var seat = parseInt(data.seat)+1;seat = "seat"+seat;
			var chips = data.chips;

			//console.log("Current player is "+$('#player-info').children('span#username')[0].innerHTML);
			var isCurrentPlayer = $('#player-info').children('span#username')[0].innerHTML; //show the card's face just to the 2 cards of the current player, and the back for the others
			if(isCurrentPlayer != username){
				if(data.showdown == false){
				firstCard = "cardback1.png";
				secondCard = "cardback1.png";
				}
			}
			$('table').find('#'+table).siblings('.poker-table').find('.'+seat).children(".firstCard-placeholder")[0].src = 'img/cards/'+firstCard;
			$('table').find('#'+table).siblings('.poker-table').find('.'+seat).children(".secondCard-placeholder")[0].src = 'img/cards/'+secondCard;

			$('table').find('#'+table).siblings('.poker-table').find('.'+seat).children(".chips-placeholder")[0].innerHTML = chips; //also update chips
			$('table').find('#'+table).siblings('.poker-table').find('.'+seat).children(".name-placeholder")[0].innerHTML = username; //also update name

			$('table').find('#'+table).siblings('.poker-table').find('.pot-placeholder')[0].innerHTML = data.pot;
			//console.log("Current player is "+$('#player-info').children('span#username')[0].innerHTML);
			var board= data.board;
			if(board.length == 0){ //new round, clear board
				for(var i=1;i<= 5;i++){
					$('table').find('#'+table).siblings('.poker-table').find('.board'+i+'-placeholder')[0].src = 'img/cards/blank.gif';
				}
			}else{
				for(var i=0;i< board.length;i++){
					var boardCard = board[i]+".png";
					//console.log('.board'+(i+1)+'-placeholder');
					$('table').find('#'+table).siblings('.poker-table').find('.board'+(i+1)+'-placeholder')[0].src = 'img/cards/'+boardCard;
				}
			}

			var lastAction = data.lastAction;
			var lastBetText = "";
			if(username == lastAction.playerName){ 
				lastPlace = parseInt(data.seat)+1;lastPlace = "bet"+lastPlace;
				if(lastAction.action == "bet" || lastAction.action == "call"){
					lastBetText = lastAction.action+" "+lastAction.amount;
				}else if(lastAction.action == "check" || lastAction.action == "fold"){
					lastBetText = lastAction.action;
				}
				$('table').find('#'+table).siblings('.poker-table').find('.'+lastPlace)[0].innerHTML = lastBetText;
			}
		});
		socket.on('show controls to current player',function(data){
			var table =  "room"+data.table_id;
			$('table').find('#'+table).siblings('.poker-table').find('.active-player').show();
		});

		$(".foldButton").on("click",function(){
			var table = $(this).parent('.active-player').siblings('.table-name')[0].innerHTML;
			socket.emit('current player fold',table);
			$(this).parent('.active-player').hide();
		});

		$(".callButton").on("click",function(){
			var table = $(this).parent('.active-player').siblings('.table-name')[0].innerHTML;
			socket.emit('current player call/check',table);
			$(this).parent('.active-player').hide();
		});

		$(".betButton").on("click",function(){
			var table = $(this).parent('.active-player').siblings('.table-name')[0].innerHTML;
			var bet = parseInt( $(this).siblings('.betArea').val() );
			console.log("bet is "+bet);
			
			socket.emit('current player bet',{table:table,bet:bet});
			$(this).parent('.active-player').hide();
		});

		socket.on('conversation private post', function(data) {
			console.log(data.chatId);
			var chatTableId = '#'+data.chatId;
    		$('#'+data.chatId).append('<p>' +'<strong>'+data.user+"</strong>: "+data.msg  +'</p>');
		});

		$(".room-sendButton").on("click",function(){
			
			var msg = $(this).siblings(".room-textArea").val();
			var roomId = $(this).parent().siblings(".join-table").attr('id'); 
			//console.log(msg+" "+roomId);
			socket.emit('send room message', { msg : msg, roomId : roomId });

			$(this).siblings(".room-textArea").val("");
		});
		socket.on('new room message',function(data){
			console.log(data.msg+" "+data.roomId+" "+data.user);
			$('#'+data.roomId+"-chat").append('<p>' +'<strong>'+data.user+"</strong>: "+data.msg  +'</p>');
		});

		messageForm.submit(function(e){
			e.preventDefault();
			//console.log('Submitted');
			socket.emit('send message', message.val());
			message.val('');
		});

		socket.on('new message',function(data){
			console.log(data.msg);
			chat.append('<div class="well">' +'<strong>'+data.user+"</strong>: "+data.msg  +'</div>');
		});

		userForm.submit(function(e){
			e.preventDefault();

			socket.emit('new user',username.val(), function(data){
				if(data){
					userFormArea.hide();
					messageArea.show();
				}
			});
			$username.val('');
		});

		socket.on('get users', function(data){
			var html = '';
			for(i = 0;i< data.length;i++){
				html += '<li class="list-group-item">'+data[i]+'</li>';
			}
			$users.html(html);
		});