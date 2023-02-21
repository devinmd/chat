const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

const port = 8008;

// send index.html
app.get("/", function (req, res) {
  res.sendFile(__dirname + "/public/index.html");
});

// listen
server.listen(port, () => {
  console.log(`PORT: ${port}`);
});

io.use((socket, next) => {
  // handshake (auth)
  const username = socket.handshake.auth.username;
  /* if (!username) {
    return next(new Error("invalid username"));
  }*/
  socket.username = username;
  next();
});



io.on("connection", (socket) => {
  // on a new connection, send the list of sockets to them all

  console.log(`'${socket.username}' (${socket.id}) has joined`)
  io.emit('user_join', {id: socket.id, username: socket.username})

  updateUsers(socket)

  // on disconnect
  socket.on("disconnect", () => {
    console.log(`'${socket.username}' (${socket.id}) has left`)
    io.emit('user_leave', {id: socket.id, username: socket.username})

    updateUsers(socket)
  });

  // on message
  socket.on("message", (msg) => {
    io.emit("message", msg);
    console.log(msg);
  });
});


var users = []
function updateUsers(socket){
  users = []
  for (let [id, socket] of io.of("/").sockets) {
    users.push({
      id: id,
      username: socket.username,
    });
  }
  
  io.emit('users', users)

  // socket.emit sends to only the socket passed in
  // io.emit send sto all
}

// set public
app.use(express.static(__dirname + '/public'));