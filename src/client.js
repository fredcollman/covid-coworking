// flow
const canvas = document.getElementById("game");
const characterForm = document.getElementById("character");
const emoteForm = document.getElementById("emote");
const ctx = canvas.getContext("2d");
const socket = io();

const maxSpeed = 1;
const touchRegionScale = 0.2;
const solidWallWidth = 2;
const walls = [];

let lastTime = 0;
const player = {
  size: { x: 40, y: 100 },
  color: "#000",
  position: { x: 0, y: 0 },
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

const newPosition = (deltaTime) => ({
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

const drawWall = (wall) => {
  ctx.beginPath();
  ctx.lineWidth = solidWallWidth;
  ctx.moveTo(wall.x, wall.y);
  ctx.lineTo(wall.x + wall.dx, wall.y + wall.dy);
  ctx.stroke();
};

const checkLineIntersection = (lineA) => (lineB) => {
  const determinant = lineB.dx * lineA.dy - lineA.dx * lineB.dy;
  if (determinant === 0) return false; // parallel
  const aFrac =
    ((lineA.x - lineB.x) * lineA.dy - (lineA.y - lineB.y) * lineA.dx) /
    determinant;
  const bFrac =
    ((lineA.x - lineB.x) * lineB.dy - (lineA.y - lineB.y) * lineB.dx) /
    determinant;
  const result = aFrac >= 0 && aFrac <= 1 && bFrac >= 0 && bFrac <= 1;
  return result;
};

const checkWallIntersection = (char) => (wall) => {
  if (
    wall.x >= char.position.x &&
    wall.x <= char.position.x + char.size.x &&
    wall.y >= char.position.y &&
    wall.y <= char.position.y + char.size.y
  ) {
    return true;
  }
  return [
    { x: char.position.x, y: char.position.y, dx: char.size.x, dy: 0 }, // top
    {
      x: char.position.x,
      y: char.position.y + char.size.y,
      dx: char.size.x,
      dy: 0,
    }, // bottom
    { x: char.position.x, y: char.position.y, dx: 0, dy: char.size.y }, // left
    {
      x: char.position.x + char.size.x,
      y: char.position.y,
      dx: 0,
      dy: char.size.y,
    }, // right
  ].some(checkLineIntersection(wall));
};

const anyCollision = (walls) => (char) =>
  walls.some(checkWallIntersection(char));

const buildWall = ({ x, y }, { dx = 0, dy = 0 }) => {
  walls.push({ x, y, dx, dy });
  return { x: x + dx, y: y + dy };
};

const buildOuterWalls = () =>
  [
    { dx: -600 },
    { dy: 350 },
    { dx: -400 },
    { dy: -350 },
    { dx: 300 },
    { dy: -700 },
    { dx: -2500 },
    { dy: -450 },
    { dx: 400 },
    { dy: -250 },
    { dx: 2860 },
    { dx: -60, dy: 1200 },
    { dy: 200 },
  ].reduce(buildWall, { x: 200, y: 200 });

const buildCamberwell = () =>
  [
    { dx: -150 },
    { dy: -400 },
    { dx: 400 },
    { dy: 400 },
    { dx: -150 },
  ].reduce(buildWall, { x: -1650, y: -800 });

const buildShoreditch = () =>
  [
    { dx: -150 },
    { dy: -400 },
    { dx: 400 },
    { dy: 400 },
    { dx: -150 },
  ].reduce(buildWall, { x: -1250, y: -800 });

const buildHampstead = () =>
  [{ dy: -20 }, { dx: 250 }, { dy: 200 }, { dx: -250 }, { dy: -20 }].reduce(
    buildWall,
    {
      x: -2050,
      y: -1180,
    }
  );

const buildBrixton = () =>
  [{ dy: -20 }, { dx: 250 }, { dy: 200 }, { dx: -250 }, { dy: -20 }].reduce(
    buildWall,
    {
      x: -2050,
      y: -980,
    }
  );

const buildGreenwich = () =>
  [{ dy: 100 }, { dx: -150 }, { dy: -250 }, { dx: 150 }].reduce(buildWall, {
    x: -2450,
    y: -600,
  });

const buildServerRoom = () =>
  [{ dy: -100 }, { dx: 200 }, { dy: 100 }].reduce(buildWall, {
    x: -1550,
    y: -500,
  });

const buildKitchenDivider = () => {
  buildWall({ x: -500, y: -500 }, { dx: 400 });
  buildWall({ x: 100, y: -500 }, { dx: 125 });
};

const buildEntranceLoos = () => {
  buildWall({ x: -800, y: 375 }, { dx: 300 });
};

const buildFireEscapeLoos = () => {
  buildWall({ x: -2600, y: -800 }, { dy: 50 });
  buildWall({ x: -3000, y: -750 }, { dx: 250 });
  buildWall({ x: -2750, y: -790 }, { dy: 50 });
  buildWall({ x: -3000, y: -620 }, { dx: 300 });
};

const buildWalls = () => {
  buildOuterWalls();
  buildCamberwell();
  buildShoreditch();
  buildHampstead();
  buildBrixton();
  buildGreenwich();
  buildServerRoom();
  buildKitchenDivider();
  buildEntranceLoos();
  buildFireEscapeLoos();
};

const charCenter = (char) => ({
  x: char.position.x + char.size.x / 2,
  y: char.position.y + char.size.y / 2,
});

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
  ctx.resetTransform();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const center = charCenter(player);
  ctx.translate(canvas.width / 2 - center.x, canvas.height / 2 - center.y);
  walls.forEach(drawWall);
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
    if (anyCollision(walls)(player)) {
      player.position = oldPosition;
    } else {
      notifyPosition();
    }
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
      event.preventDefault();
      return handlers.left();
    case 38:
      event.preventDefault();
      return handlers.up();
    case 39:
      event.preventDefault();
      return handlers.right();
    case 40:
      event.preventDefault();
      return handlers.down();
  }
};

const receiveMouseEvent = (handlers) => (event) => {
  if (event.buttons) {
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
  }
};

const receiveTouchEvent = (handlers) => (event) => {
  [...event.targetTouches].forEach((touch) => {
    const { top, left, width, height } = touch.target.getBoundingClientRect();
    if (touch.clientX < left + touchRegionScale * width) {
      handlers.left();
    } else if (touch.clientX > left + (1 - touchRegionScale) * width) {
      handlers.right();
    }
    if (touch.clientY < top + touchRegionScale * height) {
      handlers.up();
    } else if (touch.clientY > top + (1 - touchRegionScale) * height) {
      handlers.down();
    }
  });
};

const stop = () => {
  player.speed.x = 0;
  player.speed.y = 0;
};

const startHandlers = {
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

const stopHandlers = {
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
  buildWalls();
  loopForever(tick);
  document.addEventListener("keydown", receiveKeyboardInput(startHandlers));
  document.addEventListener("keyup", receiveKeyboardInput(stopHandlers));
  canvas.addEventListener("mousedown", receiveMouseEvent(startHandlers));
  canvas.addEventListener("mousemove", receiveMouseEvent(startHandlers));
  canvas.addEventListener("mouseup", stop);
  canvas.addEventListener("touchstart", receiveTouchEvent(startHandlers));
  canvas.addEventListener("touchmove", receiveTouchEvent(startHandlers));
  canvas.addEventListener("touchend", stop);
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
