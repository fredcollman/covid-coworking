// flow
const canvas = document.getElementById("game");
const characterForm = document.getElementById("character");
const emoteForm = document.getElementById("emote");
const ctx = canvas.getContext("2d");
const socket = io();

const maxSpeed = 1;
const touchRegionScale = 0.2;
let lastTime = 0;
const player = {
  size: { x: 40, y: 100 },
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

const receiveMessage = (received) => {
  const playerId = received.player.id;
  const updated = otherPlayers.get(playerId);
  if (updated) {
    updated.message = {
      emoji: received.emoji,
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
      size: { x: 40, y: 100 },
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

const makePenguin = (color) => {
  const svg = new Image();
  svg.src = `data:image/svg+xml;utf8,<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="40" height="100">
  <polygon points="12, 80 12, 92 4, 100 12, 100 15, 93 15, 80" fill="${color}"/>
  <polygon points="25, 80 25, 92 19, 100 26, 100 28, 93 28, 80" fill="${color}"/>
  <ellipse cx="20" cy="55" rx="20" ry="35" fill="#336" />
  <ellipse cx="20" cy="55" rx="14" ry="32" fill="white" />
  <ellipse cx="20" cy="15" rx="15" ry="15" fill="#336" />
  <ellipse cx="15" cy="12" rx="2" ry="2" fill="white" />
  <ellipse cx="15" cy="12.2" rx="1" ry="1.2" fill="#000" />
  <ellipse cx="25" cy="12" rx="2" ry="2" fill="white" />
  <ellipse cx="25" cy="12.2" rx="1" ry="1.2" fill="#000" />
  <path d="M21.5, 19 A2.3, 2.3, 45, 0, 0, 19, 16 L12, 25 Z" fill="${color}" stroke="white" stroke-width="1"/>
</svg>`.replace(/#/g, "%23");
  return svg;
};

const drawSomeone = (char) => {
  ctx.fillStyle = char.color;
  ctx.textAlign = "center";
  ctx.font =
    '24px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif';
  ctx.drawImage(makePenguin(char.color), char.position.x, char.position.y);
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

const receiveKeyboardInput = (handlers) => (event) => {
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

const receiveMouseEvent = (handlers) => (event) => {
  const { top, left, width, height } = event.target.getBoundingClientRect();
  if (event.clientX < left + touchRegionScale * width) {
    handlers.left();
  } else if (event.clientX > left + (1 - touchRegionScale) * width) {
    handlers.right();
  }
  if (event.clientY < top + touchRegionScale * height) {
    handlers.up();
  } else if (event.clientY > top + (1 - touchRegionScale) * height) {
    handlers.down();
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
  document.addEventListener("keydown", receiveKeyboardInput(downHandlers));
  document.addEventListener("keyup", receiveKeyboardInput(upHandlers));
  canvas.addEventListener("mousedown", receiveMouseEvent(downHandlers));
  canvas.addEventListener("mouseup", receiveMouseEvent(upHandlers));
  socket.on("receivePosition", receivePosition);
  socket.on("updateCharacter", updateCharacter);
  socket.on("message", receiveMessage);
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
