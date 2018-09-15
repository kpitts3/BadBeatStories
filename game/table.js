var Game = require('./round');
var Player = require('./player');

module.exports = Table = function(smallBlind, bigBlind, minPlayers, maxPlayers, minBuyIn, maxBuyIn,table,name,id,type){
    this.type = type; 
    this.id = id;
    this.name = name;
    this.smallBlind = smallBlind;
    this.bigBlind = bigBlind;
    this.minPlayers = minPlayers;
    this.maxPlayers =  maxPlayers;
    this.players = [];
    this.dealer = 0;
    this.minBuyIn = minBuyIn;
    this.maxBuyIn = maxBuyIn;
    this.previousPlayers = [];
    this.playersToRemove = [];
    this.playersToAdd = [];
    this.turnBet = {};
    this.gameWinners = [];
    this.gameLosers = [];
    this.actions = [];
    this.members = [];
    this.active = false;
    this.instance = table;

    //Validate acceptable value ranges.
    var err;
    if(minPlayers < 2){
        err = new Error(101, 'Parameter [minPlayers] must be a postive integer of a minimum value of 2.');
    }else if(maxPlayers > 10){
        err = new Error(102, 'Parameter [maxPlayers] must be a positive integer less than or equal to 10.');
    }else if(minPlayers > maxPlayers){
        err = new Error(103, 'Parameter [minPlayers] must be less than or equal to [maxPlayers].');
    }
    if(err){
        return err;
    }
}

Table.prototype.initNewGame = function(){
    var i;
    this.instance.state = 'JOIN';
    this.dealer += 1;
    if(this.dealer >= this.players.length){
        this.dealer = 0;
    }
    delete this.game;
    this.previousPlayers = [];

    // add existing players and remove players who left or are bankrupt
    for(i=0;i<this.players.length;++i){
        this.previousPlayers.push(this.players[i]);
        if(this.playersToRemove.indexOf(i) === -1){
            this.AddPlayer(this.players[i].playerName, this.players[i].chips, this.players[i].id);
        }
    }
    this.players = [];
    this.playersToRemove = [];
    this.actions = [];
};

Table.prototype.StartGame = function(callback){
    if(this.players.length+this.playersToAdd.length == this.minPlayers){
        
        //If there is no current game and we have enough players, start a new game.
        this.instance.state = 'IN_PROGRESS';
        this.active = true;

        if(!this.game || this.game.roundName == 'GameEnd'){
            this.game = new Game(this.smallBlind, this.bigBlind);
            this.NewRound();
        }
        callback(true);
    }else{
        callback(false);
    }
};

Table.prototype.AddPlayer = function(playerName, chips, uid){
    if(chips >= this.minBuyIn && chips <= this.maxBuyIn){
        var player = new Player(playerName, chips, uid, this);
        this.playersToAdd.push(player);
    }
};
Table.prototype.removePlayer = function(pid){
    for(var i in this.players ){
        if(this.players[i].id === pid){
            this.playersToRemove.push( parseInt(i) );
            this.players[i].Fold();
        }
    }
    for(var i in this.playersToAdd ){
        if(this.playersToAdd[i].id === pid){
            this.playersToAdd.splice(i, 1);
        }
    }
    for(var i in this.members ){
        if(this.members[i].id === pid){
            this.members.splice(i, 1);
        }
    }
    for(var i in this.previousPlayers){
        if(this.previousPlayers[i].id === pid){
            this.previousPlayers.splice(i, 1);
        }
    }
}
Table.prototype.NewRound = function(){
    var removeIndex = 0;
    
    for(var i in this.playersToAdd){
        this.players.push(this.playersToAdd[i]);
    }
    this.playersToRemove = [];
    this.playersToAdd = [];
    this.gameWinners = [];
    this.gameLosers = [];

    var i, smallBlind, bigBlind;
    //Deal 2 cards to each player
    for(i=0;i< this.players.length;i+=1){
        this.players[i].cards.push(this.game.deck.pop());
        this.players[i].cards.push(this.game.deck.pop());
        this.game.bets[i] = 0;
        this.game.roundBets[i] = 0;
    }

    //Identify Small and Big Blind player indexes
    smallBlind = this.dealer + 1;
    if(smallBlind >= this.players.length){
        smallBlind = 0;
    }
    bigBlind = smallBlind + 1;
    if(bigBlind >= this.players.length){
        bigBlind = 0;
    }
    this.currentPlayer = bigBlind + 1;
    if(this.currentPlayer >= this.players.length){
        this.currentPlayer = 0;
    }
    this.startIndex = this.currentPlayer;

    //Force Blind Bets
    this.players[smallBlind].chips -= this.smallBlind;
    this.players[bigBlind].chips -= this.bigBlind;
    this.game.bets[smallBlind] = this.smallBlind;
    this.game.bets[bigBlind] = this.bigBlind;
    this.game.blinds = [smallBlind, bigBlind];
};

Table.prototype.startTimer = function(){
    var me = this;
    me.stopTimer();

    setTimeout(function(){
        console.log('>>>>>>>>>>>>>>>>>>>>>> timer ended. blinds going up <<<<<<<<<<<<<<<<<<<<<');
        me.smallBlind  = me.smallBlind*2;
        me.bigBlind = me.bigBlind*2;

    //blinds going up every 10 minutes
        me.startTimer();
    },600*1000);
};

Table.prototype.stopTimer = function(){
    if(this._countdown){
        clearTimeout(this._countdown);
    }
};

function getMaxBet(bets){
    var maxBet, i;
    maxBet = 0;
    for(i=0;i< bets.length;i+=1){
        if(bets[i] > maxBet){
            maxBet = bets[i];
        }
    }
    return maxBet;
}