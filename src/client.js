// flow
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const draw = (timestamp) => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#f00";
  ctx.fillRect(timestamp, Math.min(timestamp + 20, canvas.height - 50), 50, 50);
};

const loopForever = (callback) => {
  const loop = (timestamp) => {
    callback(timestamp);
    window.requestAnimationFrame(loop);
  };
  window.requestAnimationFrame(loop);
};

loopForever(draw);
