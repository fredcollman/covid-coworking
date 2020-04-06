// flow
const canvas = document.getElementById("game");
const characterForm = document.getElementById("character");
const emoteForm = document.getElementById("emote");
const ctx = canvas.getContext("2d");
const socket = io();

const maxSpeed = 1;
let lastTime = 0;
const player = {
  size: { x: 20, y: 50 },
  color: "#000",
  position: { x: 100, y: 100 },
  speed: { x: 0, y: 0 },
  name: "",
  message: null,
};
const otherPlayers = new Map();

const randomColor = () =>
  "#" +
  Math.floor(Math.random() * 16777215)
    .toString(16)
    .padStart(6, "0");

const updatePlayer = ({ name, color }) => {
  player.name = name;
  player.color = color;
  characterForm.name.value = name;
  characterForm.color.value = color;
  socket.emit("character", { name, color });
};

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

const emote = (event) => {
  if (event.target.type === "button") {
    socket.emit("message", { emoji: event.target.innerText });
    player.message = {
      emoji: event.target.innerText,
      expiry: new Date().getTime() + 5000,
    };
  }
};

const receivePosition = (received) => {
  const playerId = received.player.id;
  const updated = otherPlayers.get(playerId);
  if (updated) {
    updated.position = received.position;
  } else {
    otherPlayers.set(playerId, {
      size: { x: 20, y: 50 },
      color: "#ccc",
      position: received.position,
      name: "?",
    });
  }
};

const updateCharacter = (received) => {
  const playerId = received.player.id;
  const updated = otherPlayers.get(playerId);
  if (updated) {
    updated.name = received.player.name;
    updated.color = received.player.color;
  }
};

const destroyPlayer = (received) => {
  otherPlayers.delete(received.player.id);
};

const drawSomeone = (char) => {
  ctx.fillStyle = char.color;
  ctx.textAlign = "center";
  ctx.font =
    '24px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif';
  ctx.fillRect(char.position.x, char.position.y, char.size.x, char.size.y);
  ctx.fillText(
    char.name,
    char.position.x + char.size.x / 2,
    char.position.y + char.size.y + 24
  );
  if (char.message && char.message.expiry > new Date().getTime()) {
    ctx.textAlign = "left";
    ctx.fillText(
      char.message.emoji,
      char.position.x + char.size.x + 10,
      char.position.y + 10
    );
  }
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

const init = () => {
  updatePlayer({
    name: "bob",
    color: randomColor(),
  });
  loopForever(tick);
  document.addEventListener("keydown", receiveInput(downHandlers));
  document.addEventListener("keyup", receiveInput(upHandlers));
  socket.on("receivePosition", receivePosition);
  socket.on("updateCharacter", updateCharacter);
  socket.on("destroyPlayer", destroyPlayer);
  characterForm.addEventListener("submit", (event) => {
    event.preventDefault();
    updatePlayer({
      name: event.target.name.value,
      color: event.target.color.value,
    });
  });
  emoteForm.addEventListener("click", emote);
};

init();
