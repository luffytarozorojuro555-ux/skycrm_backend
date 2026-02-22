import { Server } from "socket.io";

let io;
const allowedOrigins = [
  "https://skycrm.co.in",
  "https://www.skycrm.co.in",
  "http://localhost:5173"
];

export function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
  });
}

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
  });
}

export function getIO() {
  if (!io) throw new Error("Socket.io not initialized!");
  return io;
}
