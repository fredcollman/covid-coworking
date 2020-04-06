// @flow
import express from "express";
import http from "http";
import sockets from "socket.io";

const app = express();
const server = http.createServer(app);
const io = sockets(server);

app.use(express.static("."));

const updateCharacter = (socket) => ({ name, color }) => {
  console.log(`[${socket.id}] user name: ${name}, color: ${color}`);
  socket.broadcast.emit("updateCharacter", {
    player: {
      id: socket.id,
      name,
      color,
    },
  });
};

const updatePosition = (socket) => (position) => {
  // console.log(`[${socket.id}] x: ${position.x}, y: ${position.y}`);
  socket.broadcast.emit("receivePosition", {
    player: {
      id: socket.id,
    },
    position,
  });
};

const handleDisconnect = (socket) => () => {
  console.log(`[${socket.id}] user disconnected`);
};

io.on("connection", (socket) => {
  console.log(`[${socket.id}] user connected`);
  socket.on("character", updateCharacter(socket));
  socket.on("position", updatePosition(socket));
  socket.on("disconnect", handleDisconnect(socket));
});

server.listen(5000, () => {
  console.log("listening on port 5000");
});
