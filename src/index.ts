import * as express from "express";
import * as ews from "express-ws";
import { WebSocket } from "ws";

const app = ews(express()).app;

let wses: WebSocket[] = [];

app.ws("/", (ws, _req, _res) => {
  wses.push(ws);
  ws.onmessage = (ev) => {
    wses.forEach((otherWs) => {
      if (otherWs !== ws) otherWs.send(ev.data);
    });
  };
});

app.listen(3000);
