const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("user_enter", (data) => {
    const payload = {
      socketId: socket.id,
      userId: data.userId,
      page: data.page,
      referrer: data.referrer,
      time: data.time || new Date().toISOString()
    };

    console.log("User entered:", payload);

    io.emit("admin_user_enter", payload);
  });

  socket.on("user_message", (data) => {
    const payload = {
      socketId: socket.id,
      userId: data.userId,
      message: data.message,
      page: data.page,
      time: data.time || new Date().toISOString()
    };

    console.log("User message:", payload);

    io.emit("admin_user_message", payload);
  });

  socket.on("admin_reply", (data) => {
    if (!data.socketId || !data.message) return;

    const payload = {
      socketId: data.socketId,
      message: data.message,
      time: data.time || new Date().toISOString()
    };

    console.log("Admin reply:", payload);

    io.to(data.socketId).emit("admin_reply", payload);
  });

  socket.on("disconnect", () => {
    const payload = {
      socketId: socket.id,
      time: new Date().toISOString()
    };

    console.log("Socket disconnected:", payload);

    io.emit("admin_user_leave", payload);
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Meridian Chat SDK running on port ${PORT}`);
});