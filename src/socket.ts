import type http from "http";
import { Server as SocketIOServer } from "socket.io";
import { env } from "./config/env";

let io: SocketIOServer | null = null;

export const initSocket = (server: http.Server) => {
  io = new SocketIOServer(server, {
    cors: {
      origin: env.CORS_ORIGIN,
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    socket.emit("connected", {
      success: true,
      message: "Socket connected",
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io has not been initialized");
  }

  return io;
};
