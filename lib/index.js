"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var ews = require("express-ws");
var app = ews(express()).app;
var wses = [];
app.ws("/", function (ws, _req, _res) {
    wses.push(ws);
    ws.onmessage = function (ev) {
        wses.forEach(function (otherWs) {
            if (otherWs !== ws)
                otherWs.send(ev.data);
        });
    };
});
app.listen(3000);
