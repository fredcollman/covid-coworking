// flow
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const socket = io();

const maxSpeed = 1;
let lastTime = 0;
const player = {
  size: { x: 20, y: 50 },
  color: "#f00",
  position: { x: 100, y: 100 },
  speed: { x: 0, y: 0 },
  name: "bob",
};

const otherPlayers = new Map();

const constrain = (idealPosition) => ({
  x: Math.max(0, Math.min(canvas.width - player.size.x, idealPosition.x)),
  y: Math.max(0, Math.min(canvas.height - player.size.y, idealPosition.y)),
});

const newPosition = (deltaTime) =>
  constrain({
    x: player.position.x + player.speed.x * deltaTime,
    y: player.position.y + player.speed.y * deltaTime,
  });

const notifyPosition = () => {
  socket.emit("position", player.position);
};

const receivePosition = (received) => {
  const updated = otherPlayers.get(received.id);
  if (updated) {
    updated.position = received.position;
  } else {
    otherPlayers.set(received.id, {
      size: { x: 20, y: 50 },
      color: "#00f",
      position: received.position,
      name: "jenny",
    });
  }
};

const drawSomeone = (char) => {
  ctx.fillStyle = char.color;
  ctx.textAlign = "center";
  ctx.fillRect(char.position.x, char.position.y, char.size.x, char.size.y);
  ctx.fillText(
    char.name,
    char.position.x + char.size.x / 2,
    char.position.y + char.size.y + 15
  );
};

const draw = (timestamp) => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  otherPlayers.forEach(drawSomeone);
  drawSomeone(player);
};

const tick = (timestamp) => {
  const oldPosition = player.position;
  player.position = newPosition(timestamp - lastTime);
  if (
    player.position.x !== oldPosition.x ||
    player.position.y !== oldPosition.y
  ) {
    notifyPosition();
  }
  lastTime = timestamp;
  draw(timestamp);
};

const loopForever = (callback) => {
  const loop = (timestamp) => {
    callback(timestamp);
    window.requestAnimationFrame(loop);
  };
  window.requestAnimationFrame(loop);
};

const receiveInput = (handlers) => (event) => {
  switch (event.keyCode) {
    case 37:
      return handlers.left();
    case 38:
      return handlers.up();
    case 39:
      return handlers.right();
    case 40:
      return handlers.down();
  }
};

const downHandlers = {
  left: () => {
    player.speed.x = -maxSpeed;
  },
  right: () => {
    player.speed.x = maxSpeed;
  },
  up: () => {
    player.speed.y = -maxSpeed;
  },
  down: () => {
    player.speed.y = maxSpeed;
  },
};

const upHandlers = {
  left: () => {
    player.speed.x = Math.max(0, player.speed.x);
  },
  right: () => {
    player.speed.x = Math.min(0, player.speed.x);
  },
  up: () => {
    player.speed.y = Math.max(0, player.speed.y);
  },
  down: () => {
    player.speed.y = Math.min(0, player.speed.y);
  },
};

loopForever(tick);
document.addEventListener("keydown", receiveInput(downHandlers));
document.addEventListener("keyup", receiveInput(upHandlers));
socket.on("receivePosition", receivePosition);
