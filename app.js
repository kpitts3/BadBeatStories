var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var bcrypt = require('bcrypt-nodejs');
var path = require('path');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var passportSocketIo = require("passport.socketio");

var app = express();
var http = require('http').Server(app);
var io = require("socket.io")(http);
var RedisStore = require('connect-redis')(session);

// Create a session Store
var sessionStore = new RedisStore({ 
   host: 'localhost',
   port: 6379,
});

//for saving user tokens
var users = require('./routes/users');
var route = require('./route');
var Model = require('./model');

app.use(express.static(__dirname + '/public')); 

passport.use(new LocalStrategy(function(username, password, done) {
   new Model.User({username: username}).fetch().then(function(data) {
      var user = data;
      if(user === null) {
         return done(null, false, {message: 'Invalid username or password'});
      } else {
         user = data.toJSON();
         if(!bcrypt.compareSync(password, user.password)) {
            return done(null, false, {message: 'Invalid username or password'});
         } else {
            //console.log("logged in");
            return done(null, user);
         }
      }
   });
}));

passport.serializeUser(function(user, done) {
  done(null, user.username);
});

passport.deserializeUser(function(username, done) {
   new Model.User({username: username}).fetch().then(function(user) {
      done(null, user);
   });
});

app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(cookieParser());
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(session({
  store: sessionStore,
  secret: 'mysecret',
  saveUninitialized: true,
  resave: true
}));

app.use(passport.initialize());
app.use(passport.session());


var tables = require('./routes/tables');
app.get('/', route.index);

// signin
app.get('/signin', route.signIn);
app.post('/signin', route.signInPost);

// signup
app.get('/signup', route.signUp);
app.post('/signup', route.signUpPost);

// logout
app.get('/signout', route.signOut);

app.post('/updateTokens', users.updateTokens);

// 404 not found
app.use(route.notFound404);

function onAuthorizeSuccess(data, accept){  
  accept();
}

function onAuthorizeFail(data, message, error, accept){ 
  if(error) accept(new Error(message));
  console.log('failed connection to socket.io:', message);
  accept(null, false);  
}

io.use(passportSocketIo.authorize({
  key: 'connect.sid',
   cookieParser: cookieParser,
   // make sure same as express
   secret:      'mysecret',    
   store:       sessionStore,        
   success:     onAuthorizeSuccess, 
   fail:        onAuthorizeFail, 
}));

var basicIO = require('./basicIO.js')(io);

io.sockets.on('connection', function(socket) {
  console.log("Hello "+socket.request.user.attributes.username);
});

var server = http.listen(app.get('port'), function(){
});