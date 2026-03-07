import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";
import { toast } from "react-toastify";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext(null);

const SOCKET_URL = import.meta.env.DEV ? "http://localhost:3000" : "";

export function NotificationProvider({ children }) {
    const { user } = useAuth();
    const socketRef = useRef(null);
    const [friendsDot, setFriendsDot] = useState(false);
    const [inboxDot, setInboxDot] = useState(false);

    const clearFriendsDot = useCallback(() => setFriendsDot(false), []);
    const clearInboxDot = useCallback(() => setInboxDot(false), []);

    useEffect(() => {
        if (!user) {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
            setFriendsDot(false);
            setInboxDot(false);
            return;
        }

        const socket = io(SOCKET_URL);
        socketRef.current = socket;

        socket.on("connect", () => {
            console.log("Socket connected:", socket.id);
            socket.emit("register", user.id);
        });

        socket.on("friend_request_received", (data) => {
            setFriendsDot(true);
            toast.info(`${data.from} sent you a friend request!`);
        });

        socket.on("friend_request_accepted", (data) => {
            setFriendsDot(true);
            toast.success(`${data.by} accepted your friend request!`);
        });

        socket.on("recommendation_received", (data) => {
            setInboxDot(true);
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
        <NotificationContext.Provider value={{ friendsDot, inboxDot, clearFriendsDot, clearInboxDot }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotification() {
    return useContext(NotificationContext);
}
