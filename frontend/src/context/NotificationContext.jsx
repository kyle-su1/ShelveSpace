import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";
import { toast } from "react-toastify";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext(null);

const SOCKET_URL = "http://localhost:3000";

export function NotificationProvider({ children }) {
    const { user } = useAuth();
    const socketRef = useRef(null);
    const [unreadCount, setUnreadCount] = useState(0);

    const clearNotifications = useCallback(() => {
        setUnreadCount(0);
    }, []);

    useEffect(() => {
        if (!user) {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
            setUnreadCount(0);
            return;
        }

        const socket = io(SOCKET_URL);
        socketRef.current = socket;

        socket.on("connect", () => {
            console.log("Socket connected:", socket.id);
            socket.emit("register", user.id);
        });

        socket.on("friend_request_received", (data) => {
            setUnreadCount((prev) => prev + 1);
            toast.info(`${data.from} sent you a friend request!`);
        });

        socket.on("friend_request_accepted", (data) => {
            setUnreadCount((prev) => prev + 1);
            toast.success(`${data.by} accepted your friend request!`);
        });

        socket.on("recommendation_received", (data) => {
            setUnreadCount((prev) => prev + 1);
            toast.info(`${data.from} recommended "${data.title}" to you!`);
        });

        socket.on("disconnect", () => {
            console.log("Socket disconnected");
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [user]);

    return (
        <NotificationContext.Provider value={{ unreadCount, clearNotifications }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotification() {
    return useContext(NotificationContext);
}
