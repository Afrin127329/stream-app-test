import bodyParser from "body-parser";
import dotenv from "dotenv";
import express from "express";
import { createServer } from "node:http";
import path from "path";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import xss from "xss";

// variables
let connections = {};
let messages = {};
let timeOnline = {};

// App initialization
const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
    },
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// middlewares
app.use(bodyParser.json());
dotenv.config();
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
    );
    next();
});
app.use(express.static(path.join(__dirname, "./client/dist")));
app.set("port", process.env.PORT || 8001);

app.use("*", (req, res) => {
    res.sendFile(path.join(__dirname, "./client/dist/index.html"));
});
// Initial route
// app.get("/", (req, res) => {
//     res.status(200).send("<h1>Hello from Stream app Server</h1>");
// });

// text processing for messages/chats
const sanitizedString = (str) => {
    return xss(str);
};

// socket connection
io.on("connection", (socket) => {
    // Joining the room
    socket.on("join-call", (path, joinedUser) => {
        if (connections[path] === undefined) {
            connections[path] = [];
        }

        connections[path].push({ id: socket.id, user: joinedUser });

        timeOnline[socket.id] = new Date();

        for (let a = 0; a < connections[path].length; ++a) {
            io.to(connections[path][a].id).emit(
                "user-joined",
                socket.id,
                connections[path]
            );
        }

        if (messages[path] !== undefined) {
            for (let a = 0; a < messages[path].length; ++a) {
                io.to(socket.id).emit(
                    "chat-message",
                    messages[path][a]["data"],
                    messages[path][a]["sender"],
                    messages[path][a]["socket-id-sender"]
                );
            }
        }
    });

    // Send the sdp from incoming socketId to the current socket id
    socket.on("signal", (toId, message) => {
        io.to(toId).emit("signal", socket.id, message);
    });

    socket.on("screen-sharing", (sharing, id) => {
        let key;
        let ok;
        if (sharing) {
            for (let [k, v] of Object.entries(connections)) {
                //@ts-ignore
                for (let a = 0; a < v.length; ++a) {
                    //@ts-ignore
                    if (v[a].id === socket.id) {
                        key = k;
                        ok = true;
                    }
                }
            }
            for (let a = 0; a < connections[key].length; ++a) {
                io.to(connections[key][a].id).emit(
                    "screen-sharing",
                    sharing,
                    socket.id
                );
            }
        }
    });

    socket.on("chat-message", (data, sender) => {
        data = sanitizedString(data);
        sender = sanitizedString(sender);

        let key;
        let ok = false;

        for (let [k, v] of Object.entries(connections)) {
            //@ts-ignore
            for (let a = 0; a < v.length; ++a) {
                //@ts-ignore
                if (v[a].id === socket.id) {
                    key = k;
                    ok = true;
                }
            }
        }

        if (ok === true) {
            if (messages[key] === undefined) {
                messages[key] = [];
            }
            messages[key].push({
                sender: sender,
                data: data,
                "socket-id-sender": socket.id,
            });

            for (let a = 0; a < connections[key].length; ++a) {
                io.to(connections[key][a].id).emit(
                    "chat-message",
                    data,
                    sender,
                    socket.id
                );
            }
        }
    });

    // On disconnection
    socket.on("disconnect", () => {
        // Remove client from the room
        const leftTime = new Date();
        let key;

        const diffTime = Math.abs(timeOnline[socket.id] - leftTime);

        for (const [k, v] of JSON.parse(
            JSON.stringify(Object.entries(connections))
        )) {
            for (let a = 0; a < v.length; ++a) {
                if (v[a].id === socket.id) {
                    key = k;

                    const index = connections[key].findIndex(
                        (obj) => obj.id === socket.id
                    );
                    connections[key].splice(index, 1);

                    for (let a = 0; a < connections[key].length; ++a) {
                        io.to(connections[key][a].id).emit(
                            "user-left",
                            socket.id,
                            connections[key]
                        );
                    }
                    if (connections[key].length === 0) {
                        delete connections[key];
                    }
                }
            }
        }
    });
});

server.listen(app.get("port"), () => {
    console.log("server running at", app.get("port"));
});
