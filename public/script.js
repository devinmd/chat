const socket = io({ autoConnect: false });

document.querySelector("#username-input").focus();

var uploadedImage = "";

var userStatus = 1;

const statusMap = ["idle", "online"];

var unreadMessages = 0;

var messages = [];

var users = [];

var userCount = 0;

function join() {
  socket.auth = { username: document.querySelector("#username-input").value };
  socket.connect();
  socket.status = userStatus;
}

socket.on("connected", () => {
  console.log("joined as '" + socket.auth.username + "'");

  document.querySelector("#join").remove();
  document.querySelector("#content-container").style.display = "block";
  document.querySelector("#sidenav").style.display = "block";

  document.querySelector("#message-input").focus();
});

// initial users list received on join
socket.on("users", (userlist) => {
  console.log("received user list:");
  users = userlist;
  console.log(users);

  generateUsers();
});

function generateUsers() {
  document.querySelector("#user-list").innerHTML = "";
  document.querySelector("#you").innerHTML = "";

  users.forEach((user, i) => {
    let container = document.createElement("div");
    container.className = "container";

    let status = document.createElement("p");
    status.className = "status " + statusMap[user.status];

    let username = document.createElement("p");
    username.innerHTML = user.username;
    username.title = user.id
    username.className = "username";
    let id = document.createElement("p");
    id.innerHTML = user.id;
    id.className = "id";

    container.append(status, username, id);

    if (user.id !== socket.id) {
      document.querySelector("#user-list").append(container);
    } else {
      container.className = "container container-self";
      document.querySelector("#you").prepend(container);
    }
  });
  userCount = Object.keys(users).length;

  document.querySelector("#user-count").innerHTML = `${userCount - 1} OTHER USER${
    userCount - 1 > 1 || userCount - 1 == 0 ? "S" : ""
  }:`;
}

function sendMessage() {
  let d = new Date();
  let msg = document.querySelector("#message-input").value;
  if (msg.replaceAll(" ", "") != "" || uploadedImage != "") {
    socket.emit("message", {
      author_username: socket.auth.username,
      author_id: socket.id,
      time: d.getTime(),
      content: msg,
      image: uploadedImage,
    });
    console.log('sent message: "' + msg + '"' + (uploadedImage != "" ? " with a file" : ""));
    document.querySelector("#message-input").value = "";
  }
  document.querySelector("#message-input").focus();
  document.querySelector("#image-preview").src = "";
  uploadedImage = "";
  regenerateMessages();
}

// receiver
socket.on("message", function (msg) {
  messages.push(msg);
  console.log(
    `'${msg.author_username}' (${msg.author_id}) said "${msg.content}"${msg.image == "" ? "" : " with a file"}`
  );
  showMessage(msg);

  if (userStatus == 0) {
    unreadMessages += 1;
    document.title = `Chat (${unreadMessages})`;
  }
  regenerateMessages();
});

socket.on("user_leave", function (user) {
  console.log(`'${user.username}' (${user.id}) left`);

  users.splice(getUserById(user.id), 1);

  console.log("updated user list");

  let d = new Date();
  showMessage({ author_username: user.username, author_id: user.id, content: " <i> left<i>", time: d.getTime() });
  messages.push({ author_username: user.username, author_id: user.id, content: " <i> left<i>", time: d.getTime() });
});

socket.on("user_join", function (user) {
  console.log(`'${user.username}' (${user.id}) joined`);

  users.push(user);
  console.log("updated user list");

  let d = new Date();
  showMessage({ author_username: user.username, author_id: user.id, content: " <i> joined<i>", time: d.getTime() });
  messages.push({ author_username: user.username, author_id: user.id, content: " <i> joined<i>", time: d.getTime() });
});

function showMessage(msg) {
  // container
  let messagebox = document.createElement("div");
  messagebox.className = "messagebox";

  // author
  let author = document.createElement("p");
  author.innerHTML = msg.author_username;
  author.title = msg.author_id;
  author.className = "author";

  // time
  // let d = new Date(msg.time);
  let time = document.createElement("p");
  time.innerHTML = relativeTime(msg.time);

  //time.innerHTML = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d
  // .getSeconds()
  //.toString()
  //.padStart(2, "0")}`;
  time.className = "time";

  // content

  let content = document.createElement("div");
  content.className = "content";

  // text
  let text = document.createElement("p");
  text.innerHTML = msg.content;
  text.className = "text";

  content.append(text);

  // image

  // image
  if (msg.image != "" && msg.image != null) {
    let image = document.createElement("img");
    image.src = msg.image;
    messagebox.append(image);
    content.append(image);
  }

  // append
  messagebox.append(time, author, content);

  document.querySelector("#messages").append(messagebox);

  document.querySelector("#messages").scrollTop = document.querySelector("#messages").scrollHeight;
}

document.querySelector("#message-input").onkeydown = function (e) {
  if (e.key == "Enter" || e.code == "Enter") {
    sendMessage();
  }
};

document.querySelector("#username-input").onkeydown = function (e) {
  if (e.key == "Enter" || e.code == "Enter") {
    join();
  }
};

document.onpaste = function (event) {
  var items = (event.clipboardData || event.originalEvent.clipboardData).items;

  // find pasted image among pasted items
  var blob = null;
  for (var i = 0; i < items.length; i++) {
    if (items[i].type.indexOf("image") === 0) {
      blob = items[i].getAsFile();
    }
  }

  // load image if there is a pasted image
  if (blob !== null) {
    var reader = new FileReader();
    reader.onload = function (event) {
      uploadedImage = event.target.result;
      console.log("uploaded " + blob.name);
      updateImagePreview();
    };
    reader.readAsDataURL(blob);
  }
};

function deleteFiles() {
  uploadedImage = [];
}

function imageUpload(files) {
  for (let f = 0; f < files.length; f++) {
    let reader = new FileReader();
    reader.onload = function () {
      uploadedImage = reader.result;
      console.log("uploaded " + files[f].name);
      updateImagePreview();
    };
    reader.readAsDataURL(files[f]);
  }
}

window.onblur = function () {
  // idle
  userStatus = 0;
  socket.emit("status_change", userStatus);
  socket.status = userStatus;
};

window.onfocus = function () {
  // active/online
  userStatus = 1;
  unreadMessages = 0;
  document.title = `Chat`;
  socket.status = userStatus;
  regenerateMessages();
  socket.emit("status_change", userStatus);
};

function updateImagePreview() {
  document.querySelector("#image-preview").src = uploadedImage;
}

socket.on("user_status_change", (user) => {
  console.log(`'${user.username}' (${user.id}) is ${statusMap[user.status]}`);
  users[getUserById(user.id)].status = user.status;
  generateUsers();
});

function getUserById(id) {
  for (i in users) {
    if (users[i].id == id) {
      return i;
    }
  }
}

function relativeTime(time) {
  let d = new Date();
  let now = d.getTime();

  let dif = now - time;

  let times = [86400000, 3600000, 60000, 1000];
  let letters = ["d", "h", "m", "s"];

  if (dif < 1000) return "now";

  for (let i in times) {
    if (dif < times[i]) continue;

    let count = Math.floor(dif / times[i]);

    return `${count}${letters[i]}`;
  }
}

function regenerateMessages() {
  document.querySelector("#messages").innerHTML = "";
  for (i in messages) {
    showMessage(messages[i]);
  }
}

socket.on("connect_error", (err) => {
  document.querySelector('#join-error').innerHTML = err.message
});
