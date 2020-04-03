// @flow
import express from "express";
import http from "http";

const app = express();
const server = http.createServer(app);

app.use(express.static('.'));

server.listen(3000, () => {
  console.log("listening on port 3000");
});
