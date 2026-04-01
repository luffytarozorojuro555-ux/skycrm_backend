import { Server } from "socket.io";

let io;
const userSocketMap = {};
export function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: "https://skycrm.co.in" || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("register", (userId) => {
      userSocketMap[userId] = socket.id;
      console.log("User registered:", userId);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });

    for (let userId in userSocketMap) {
      if (userSocketMap[userId] === socket.id) {
        delete userSocketMap[userId];
      }
    }
  });
}

export function getIO() {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
}

export { userSocketMap };
