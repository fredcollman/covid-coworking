// flow
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const position = { x: 100, y: 100 };

const draw = (timestamp) => {
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
    case 39:
      return handlers.right();
  }
};

const handlers = {
  left: () => position.x--,
  right: () => position.x++,
};

loopForever(draw);
document.addEventListener("keydown", receiveInput(handlers));
