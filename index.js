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
  
  if (username.replaceAll(" ", "") == "" || !username || username == null || username == "" || username == undefined) {
    return next(new Error("Username is empty"));
  }

  if (usernames.includes(username)) {
    return next(new Error("This username is already in use"));
  }

  if (username.length > 16) {
    return next(new Error("Username must be 16 characters or less"));
  }

  if (username.length < 3) {
    return next(new Error("Username must be 3 characters or more"));
  }
  socket.username = username;
  next();
  socket.emit('connected')
});

var usernames = [];

io.on("connection", (socket) => {
  // on a new connection, send the list of sockets to them all

  console.log(`'${socket.username}' (${socket.id}) joined`);
  io.emit("user_join", { id: socket.id, username: socket.username });
  usernames.push(socket.username);

  updateUsers(socket);

  // on disconnect
  socket.on("disconnect", () => {
    console.log(`'${socket.username}' (${socket.id}) left`);
    io.emit("user_leave", { id: socket.id, username: socket.username });
    usernames.splice(usernames.indexOf(socket.username), 1);

    updateUsers(socket);
  });

  // on message
  socket.on("message", (msg) => {
    io.emit("message", msg);
    console.log(msg);
  });

  socket.on("status_change", (status) => {
    io.emit("user_status_change", { id: socket.id, username: socket.username, status: status });
  });
});

var users = [];
function updateUsers(socket) {
  users = [];
  for (let [id, socket] of io.of("/").sockets) {
    users.push({
      id: id,
      username: socket.username,
      status: socket.status == undefined ? 1 : socket.status,
    });
  }

  socket.emit("users", users);

  // socket.emit sends to only the socket passed in
  // io.emit sends to all
}

// set public
app.use(express.static(__dirname + "/public"));
