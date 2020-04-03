// flow
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const position = { x: 100, y: 100 };
const speed = { x: 0, y: 0 };

const updatePosition = () => {
  position.x += speed.x;
  position.y += speed.y;
};

const draw = (timestamp) => {
  updatePosition();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#f00";
  ctx.fillRect(position.x, position.y, 50, 50);
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
    speed.x = -5;
  },
  right: () => {
    speed.x = 5;
  },
  up: () => {
    speed.y = -5;
  },
  down: () => {
    speed.y = 5;
  },
};

const upHandlers = {
  left: () => {
    speed.x = Math.max(0, speed.x);
  },
  right: () => {
    speed.x = Math.min(0, speed.x);
  },
  up: () => {
    speed.y = Math.max(0, speed.y);
  },
  down: () => {
    speed.y = Math.min(0, speed.y);
  },
};

loopForever(draw);
document.addEventListener("keydown", receiveInput(downHandlers));
document.addEventListener("keyup", receiveInput(upHandlers));
