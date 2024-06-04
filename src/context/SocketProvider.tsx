/* eslint-disable @typescript-eslint/no-explicit-any */
import { createContext, useContext, useMemo } from "react";
import { io } from "socket.io-client";

const SocketContext: any = createContext(null);

const serverUrl = "https://afrin-1.onrender.com/";

// eslint-disable-next-line react-refresh/only-export-components
export const useSocket = () => {
    const socket = useContext(SocketContext);
    return socket;
};

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const socket = useMemo(
        () => io(serverUrl, { transports: ["websocket"] }),
        []
    );

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};
