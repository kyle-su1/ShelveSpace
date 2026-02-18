import { Server } from "socket.io";

let io;
const userSocketMap = new Map(); // userId -> socketId

export const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: "*", // Allow all origins for simplicity in this project
            methods: ["GET", "POST"],
        },
    });

    io.on("connection", (socket) => {
        console.log(`User connected: ${socket.id}`);

        // Client should emit 'register' with their userId after connecting
        socket.on("register", (userId) => {
            if (userId) {
                userSocketMap.set(userId, socket.id);
                console.log(`Mapped user ${userId} to socket ${socket.id}`);
            }
        });

        socket.on("disconnect", () => {
            console.log(`User disconnected: ${socket.id}`);
            // Remove user from map (inefficient linear search, but fine for small scale)
            for (const [userId, socketId] of userSocketMap.entries()) {
                if (socketId === socket.id) {
                    userSocketMap.delete(userId);
                    break;
                }
            }
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};

export const getSocketId = (userId) => {
    return userSocketMap.get(userId);
};
