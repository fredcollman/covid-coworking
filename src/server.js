// @flow
import express from "express";
import http from "http";
import sockets from "socket.io";

const app = express();
const server = http.createServer(app);
const io = sockets(server);

app.use(express.static("."));

io.on("connection", (socket) => {
  console.log("a user connected");
  socket.on("position", (position) => {
    // console.log(`[player ${socket.id}] x: ${position.x}, y: ${position.y}`);
    socket.broadcast.emit("receivePosition", {
      player: {
        id: socket.id,
      },
      position,
    });
  });
  socket.on("disconnect", () => {
    console.log("a user disconnected");
  });
});

server.listen(5000, () => {
  console.log("listening on port 5000");
});
