"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const body_parser_1 = __importDefault(require("body-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const node_http_1 = require("node:http");
const path_1 = __importDefault(require("path"));
const socket_io_1 = require("socket.io");
const xss_1 = __importDefault(require("xss"));
// variables
let connections = {};
let messages = {};
let timeOnline = {};
// App initialization
const app = (0, express_1.default)();
const server = (0, node_http_1.createServer)(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "*",
    },
});
//@ts-ignore
// const _filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(_filename);
// middlewares
app.use(body_parser_1.default.json());
dotenv_1.default.config();
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});
app.use(express_1.default.static(path_1.default.join(__dirname, "..", "client", "dist")));
app.set("port", process.env.PORT || 8001);
app.use("*", (req, res) => {
    res.sendFile(path_1.default.join(__dirname, "..", "client", "dist", "index.html"));
});
// Initial route
// app.get("/", (req, res) => {
//     res.status(200).send("<h1>Hello from Stream app Server</h1>");
// });
// text processing for messages/chats
const sanitizedString = (str) => {
    return (0, xss_1.default)(str);
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
            io.to(connections[path][a].id).emit("user-joined", socket.id, connections[path]);
        }
        if (messages[path] !== undefined) {
            for (let a = 0; a < messages[path].length; ++a) {
                io.to(socket.id).emit("chat-message", messages[path][a]["data"], messages[path][a]["sender"], messages[path][a]["socket-id-sender"]);
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
                io.to(connections[key][a].id).emit("screen-sharing", sharing, socket.id);
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
                io.to(connections[key][a].id).emit("chat-message", data, sender, socket.id);
            }
        }
    });
    // On disconnection
    socket.on("disconnect", () => {
        // Remove client from the room
        const leftTime = new Date();
        let key;
        //@ts-ignore
        const diffTime = Math.abs(timeOnline[socket.id] - leftTime);
        for (const [k, v] of JSON.parse(JSON.stringify(Object.entries(connections)))) {
            for (let a = 0; a < v.length; ++a) {
                if (v[a].id === socket.id) {
                    key = k;
                    const index = connections[key].findIndex((obj) => obj.id === socket.id);
                    connections[key].splice(index, 1);
                    for (let a = 0; a < connections[key].length; ++a) {
                        io.to(connections[key][a].id).emit("user-left", socket.id, connections[key]);
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
