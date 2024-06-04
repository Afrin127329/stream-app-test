/* eslint-disable prefer-const */
import { Component, FormEvent, createRef } from "react";
import { FiMic, FiMicOff, FiVideo, FiVideoOff } from "react-icons/fi";
import io, { Socket } from "socket.io-client";
//@ts-ignore
import { AiOutlineSend } from "react-icons/ai";
import { FaRightFromBracket } from "react-icons/fa6";
import { MdOutlineScreenshotMonitor } from "react-icons/md";
import {
    addVideoStreamToDom,
    black,
    sendMessageToDom,
    silence,
} from "../../utils/scripts";
import { RoomState } from "../../utils/types";
import JoinRoom from "../JoinRoom/JoinRoom";
import "./Room.css";

// Global variables
const serverUrl = "https://afrin-1.onrender.com/";
const configuration = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};
let connections: any = {};
let socket: Socket | null = null;
let socketId: string | any = null;
let elms = 0;

class Room extends Component<any, RoomState> {
    localVideo: any;
    videoAvailable: boolean;
    audioAvailable: boolean;

    constructor(props: any) {
        super(props);

        this.localVideo = createRef();
        this.videoAvailable = false;
        this.audioAvailable = false;

        this.state = {
            messages: [],
            video: false,
            audio: false,
            screen: false,
            screenAvailable: false,
            newMessage: 0,
            askForUsername: true,
            username: "",
            message: "",
            totalUser: 0,
        };

        connections = {};

        // Bind methods to this
        this.connect = this.connect.bind(this);
        this.getMedia = this.getMedia.bind(this);
        this.getPermissions = this.getPermissions.bind(this);
        this.getUserMediaSuccess = this.getUserMediaSuccess.bind(this);
        this.handleMessageSubmit = this.handleMessageSubmit.bind(this);
        this.handleVideo = this.handleVideo.bind(this);
        this.handleAudio = this.handleAudio.bind(this);
        this.handleScreening = this.handleScreening.bind(this);
        this.handleEndcall = this.handleEndcall.bind(this);
    }

    componentDidMount() {
        this.getPermissions();
    }

    connect = () => {
        this.setState({ askForUsername: !this.state.askForUsername }, () =>
            this.getMedia()
        );
    };

    async getPermissions() {
        try {
            // await navigator.mediaDevices
            //     .getUserMedia({ video: true })
            //     .then(() => (this.videoAvailable = true))
            //     .catch(() => (this.videoAvailable = false));

            // await navigator.mediaDevices
            //     .getUserMedia({ audio: true })
            //     .then(() => (this.audioAvailable = true))
            //     .catch(() => (this.audioAvailable = false));

            await navigator.mediaDevices
                .getUserMedia({ video: true, audio: true })
                .then(() => {
                    this.videoAvailable = true;
                    this.audioAvailable = true;
                })
                .catch(() => {
                    this.videoAvailable = false;
                    this.audioAvailable = false;
                });

            if (this.videoAvailable || this.audioAvailable) {
                navigator.mediaDevices
                    .getUserMedia({
                        video: this.videoAvailable,
                        audio: this.audioAvailable,
                    })
                    .then((stream) => {
                        //@ts-ignore
                        window.localStream = stream;

                        this.localVideo.current.srcObject = stream;
                    })
                    .then((_stream) => {})
                    .catch((e) => console.error(e));
            }
        } catch (error) {
            console.error(error);
        }
    }

    getUserMedia = () => {
        if (
            (this.state.video && this.videoAvailable) ||
            (this.state.audio && this.audioAvailable)
        ) {
            navigator.mediaDevices
                .getUserMedia({
                    video: this.state.video,
                    audio: this.state.audio,
                })
                .then(this.getUserMediaSuccess)
                .then((_stream) => {})
                .catch((e) => console.log(e));
        } else {
            try {
                let tracks = this.localVideo.current.srcObject.getTracks();
                tracks.forEach((track: any) => track.stop());
            } catch (e) {
                console.log(e);
            }
        }
    };

    getMedia = () => {
        this.setState(
            {
                video: this.videoAvailable,
                audio: this.audioAvailable,
            },
            () => {
                this.getUserMedia();
                this.connectToSocketServer();
            }
        );
    };

    getUserMediaSuccess(stream: any) {
        console.log(connections);
        console.log(Object.keys(connections).length);

        try {
            // @ts-ignore
            window.localStream.getTracks().forEach((track) => track.stop());
        } catch (error) {
            console.error(error);
        }

        //@ts-ignore
        window.localStream = stream;

        this.localVideo.current.srcObject = stream;

        for (let id in connections) {
            if (id === socketId) continue;
            console.log(id);
            this.setState({ totalUser: Object.keys(connections).length });

            // @ts-ignore
            connections[id].addStream(window.localStream);

            connections[id].createOffer().then((description: any) => {
                connections[id]
                    .setLocalDescription(description)
                    .then(() => {
                        socket!.emit(
                            "signal",
                            id,
                            JSON.stringify({
                                sdp: connections[id].localDescription,
                            })
                        );
                    })
                    .catch((error: any) => console.error(error));
            });
        }

        stream.getTracks().forEach(
            (track: any) =>
                (track.onended = () => {
                    this.setState({ video: false, audio: false }, () => {
                        try {
                            let tracks =
                                this.localVideo.current.srcObject.getTracks();
                            tracks.forEach((track: any) => track.stop());
                        } catch (error) {
                            console.error(error);
                        }

                        const blackSilence = (...args: any[]) =>
                            new MediaStream([black(...args), silence()]);

                        // @ts-ignore
                        window.localStream = blackSilence();

                        // @ts-ignore
                        this.localVideo.current.srcObject = window.localStream;

                        for (let id in connections) {
                            // @ts-ignore
                            connections[id].addStream(window.localStream);

                            connections[id]
                                .createOffer()
                                .then((description: any) => {
                                    connections[id]
                                        .setLocalDescription(description)
                                        .then(() => {
                                            socket!.emit(
                                                "signal",
                                                id,
                                                JSON.stringify({
                                                    sdp: connections[id]
                                                        .localDescription,
                                                })
                                            );
                                        })
                                        .catch((error: Error) =>
                                            console.error(error)
                                        );
                                });
                        }
                    });
                })
        );
    }

    getDisplayMedia = () => {
        if (this.state.screen) {
            if (navigator.mediaDevices.getDisplayMedia) {
                navigator.mediaDevices
                    .getDisplayMedia({ video: true, audio: true })
                    .then(this.getDisplayMediaSuccess)
                    .then((_stream) => {})
                    .catch((error: Error) => console.log(error));
            }
        }
    };

    getDisplayMediaSuccess = (stream: any) => {
        try {
            //@ts-ignore
            window.localStream
                .getTracks()
                .forEach((track: any) => track.stop());
        } catch (error) {
            console.error(error);
        }

        //@ts-ignore
        window.localStream = stream;
        this.localVideo.current.srcObject = stream;

        for (let id in connections) {
            if (id === socketId) continue;

            //@ts-ignore
            connections[id].addStream(window.localStream);
            connections[id].createOffer().then((description: any) => {
                connections[id]
                    .setLocalDescription(description)
                    .then(() => {
                        socket?.emit(
                            "signal",
                            id,
                            JSON.stringify({
                                sdp: connections[id].localDescription,
                            })
                        );
                    })
                    .catch((error: Error) => console.error(error));
            });
        }

        stream.getTracks().forEach(
            (track: any) =>
                (track.onended = () => {
                    this.setState({ screen: false }, () => {
                        try {
                            let tracks =
                                this.localVideo.current.srcObject.getTracks();
                            tracks.forEach((track: any) => track.stop());
                        } catch (error) {
                            console.error(error);
                        }

                        let blackSilence = (...args: any[]) =>
                            new MediaStream([black(...args), silence()]);

                        //@ts-ignore
                        window.localStream = blackSilence();

                        //@ts-ignore
                        this.localVideo.current.srcObject = window.localStream;

                        this.getUserMedia();
                    });
                })
        );
    };

    gotMessageFromServer = (fromId: string, message: any) => {
        const signal = JSON.parse(message);

        if (fromId !== socketId) {
            if (signal.sdp) {
                connections[fromId]
                    .setRemoteDescription(new RTCSessionDescription(signal.sdp))
                    .then(() => {
                        if (signal.sdp.type === "offer") {
                            connections[fromId]
                                .createAnswer()
                                .then((description: any) => {
                                    connections[fromId]
                                        .setLocalDescription(description)
                                        .then(() => {
                                            socket?.emit(
                                                "signal",
                                                fromId,
                                                JSON.stringify({
                                                    sdp: connections[fromId]
                                                        .localDescription,
                                                })
                                            );
                                        })
                                        .catch((error: Error) =>
                                            console.error(error)
                                        );
                                })
                                .catch((error: Error) => console.error(error));
                        }
                    })
                    .catch((error: Error) => console.error(error));
            }

            if (signal.ice) {
                connections[fromId]
                    .addIceCandidate(new RTCIceCandidate(signal.ice))
                    .catch((error: Error) => console.error(error));
            }
        }
    };

    connectToSocketServer() {
        socket = io(serverUrl, {
            secure: true,
            transports: ["websocket"],
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        socket.on("signal", this.gotMessageFromServer);

        socket.on("connect", () => {
            socket?.emit(
                "join-call",
                window.location.href,
                this.state.username
            );
            socketId = socket?.id;

            socket?.on("chat-message", this.addMessage);

            socket?.on("user-left", (id) => {
                let video = document.querySelector(`[data-socket="${id}"]`);
                if (video !== null) {
                    elms--;
                    video.parentNode?.removeChild(video);

                    /**@todo add css */
                }
            });

            socket?.on("user-joined", (id: string, clients: any) => {
                clients.forEach((socketListId: string) => {
                    connections[socketListId] = new RTCPeerConnection(
                        configuration
                    );

                    // Adding ice candidate
                    connections[socketListId].onicecandidate = (e: any) => {
                        if (e.candidate != null) {
                            socket?.emit(
                                "signal",
                                socketListId,
                                JSON.stringify({ ice: e.candidate })
                            );
                        }
                    };

                    // Adding video stream
                    connections[socketListId].onaddstream = (e: any) => {
                        /**@todo mute button, full screen button */

                        const searchVideo = document.querySelector(
                            `[data-socket="${socketListId}"]`
                        );
                        if (searchVideo !== null) {
                            //@ts-ignore
                            searchVideo.srcObject = e.stream;
                        } else {
                            elms = clients.length;

                            addVideoStreamToDom(socketListId, e);
                        }
                    };

                    // add local video stream
                    if (
                        // @ts-ignore
                        window.localStream !== undefined &&
                        // @ts-ignore
                        window.localStream !== null
                    ) {
                        //@ts-ignore
                        connections[socketListId].addStream(window.localStream);
                    } else {
                        let blackSilence = (...args: any[]) =>
                            new MediaStream([black(...args), silence()]);
                        // @ts-ignore
                        window.localStream = blackSilence();

                        //@ts-ignore
                        connections[socketListId].addStream(window.localStream);
                    }
                });

                if (id === socketId) {
                    for (let id2 in connections) {
                        if (id2 === socketId) continue;

                        try {
                            //@ts-ignore
                            connections[id2].addStream(window.localStream);
                        } catch (error) {
                            console.error(error);
                        }

                        connections[id2]
                            .createOffer()
                            .then((description: any) => {
                                connections[id2]
                                    .setLocalDescription(description)
                                    .then(() => {
                                        socket?.emit(
                                            "signal",
                                            id2,
                                            JSON.stringify({
                                                sdp: connections[id2]
                                                    .localDescription,
                                            })
                                        );
                                    })
                                    .catch((error: Error) =>
                                        console.error(error)
                                    );
                            });
                    }
                }
            });
        });
    }

    handleMessageSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();

        if (this.state.username !== null && this.state.message) {
            sendMessageToDom(this.state.username, this.state.message);
        }

        this.setState({ message: "" });
    }
    addMessage() {}

    /**@todo video turn off not working */
    handleVideo = () => {
        this.setState({ video: !this.state.video }, () => this.getUserMedia());
    };

    handleAudio = () => {
        this.setState({ audio: !this.state.audio }, () => this.getUserMedia());
    };

    /**@todo screen handle not working */
    handleScreening = () => {
        this.setState({ screen: !this.state.screen }, () =>
            this.getDisplayMedia()
        );
    };
    handleEndcall = () => {
        try {
            let tracks = this.localVideo.current.srcObject.getTracks();
            tracks.forEach((track: any) => track.stop());
        } catch (error) {
            console.log(error);
        }
        window.location.href = "/leave-room";
    };

    render() {
        const { askForUsername, username, audio, video, totalUser } =
            this.state;

        return (
            <div>
                {askForUsername === true ? (
                    <JoinRoom
                        connect={this.connect}
                        setUsername={(username: any) =>
                            this.setState({ username })
                        }
                        localVideo={this.localVideo}
                    />
                ) : (
                    <div id="room__container">
                        <section id="members__container">
                            <div id="members__header">
                                <span>Participants</span>
                                <strong id="members__count">{totalUser}</strong>
                            </div>

                            <div id="member__list">
                                <div
                                    className="member__wrapper"
                                    id="member__2__wrapper"
                                >
                                    <span className="green__icon"></span>
                                    <p className="member_name">Dennis Ivy</p>
                                </div>

                                <div
                                    className="member__wrapper"
                                    id="member__2__wrapper"
                                >
                                    <span className="green__icon"></span>
                                    <p className="member_name">
                                        Shahriar P. Shuvo 👋:
                                    </p>
                                </div>

                                {/* Need to add users based on socket connections later  */}
                                <div
                                    className="member__wrapper"
                                    id="member__2__wrapper"
                                >
                                    <span className="green__icon"></span>
                                    <p className="member_name">{username}</p>
                                </div>
                            </div>
                        </section>
                        {/* <h4>{remoteSocketId ? "Connected" : "No one in room"}</h4> */}
                        <section id="stream__container">
                            <div className="stream__main">
                                <div
                                    className="video__container"
                                    id="video__container"
                                >
                                    <video
                                        ref={this.localVideo}
                                        className="ratio main__video"
                                        id="main__video"
                                        autoPlay
                                        playsInline
                                        src=" "
                                    ></video>
                                </div>
                            </div>

                            <div className="stream__actions">
                                {/* Turn off the video, right now, it's ending the call  */}
                                <button
                                    className="active"
                                    id="camera-btn"
                                    onClick={this.handleVideo}
                                >
                                    {" "}
                                    {video ? <FiVideo /> : <FiVideoOff />}
                                </button>

                                <button onClick={this.handleAudio}>
                                    {" "}
                                    {audio ? <FiMic /> : <FiMicOff />}
                                </button>

                                {/* screen share Button  */}
                                <button onClick={this.handleScreening}>
                                    <MdOutlineScreenshotMonitor
                                        style={{
                                            width: "2rem",
                                            height: "2rem",
                                        }}
                                    />
                                </button>

                                {/* Leave room Button  */}
                                <button onClick={this.handleEndcall}>
                                    <FaRightFromBracket
                                        style={{
                                            width: "2rem",
                                            height: "2rem",
                                        }}
                                    />
                                </button>
                            </div>
                        </section>

                        <section id="messages__container">
                            <div id="messages">
                                <div className="message__wrapper">
                                    <div className="message__body__bot">
                                        <strong className="message__author__bot">
                                            🤖 Points soft Bot
                                        </strong>
                                        <p className="message__text__bot">
                                            Welcome to the room, Don't be shy,
                                            say hello!
                                        </p>
                                    </div>
                                </div>

                                <div className="message__wrapper">
                                    <div className="message__body__bot">
                                        <strong className="message__author__bot">
                                            🤖 Points soft Bot
                                        </strong>
                                        <p className="message__text__bot">
                                            Dennis Ivy just entered the room!
                                        </p>
                                    </div>
                                </div>

                                <div className="message__wrapper">
                                    <div className="message__body">
                                        <strong className="message__author">
                                            Dennis Ivy
                                        </strong>
                                        <p className="message__text">
                                            Does anyone know hen he will be
                                            back?
                                        </p>
                                    </div>
                                </div>

                                <div className="message__wrapper">
                                    <div className="message__body__bot">
                                        <strong className="message__author__bot">
                                            🤖 Points soft Bot
                                        </strong>
                                        <p className="message__text__bot">
                                            Sulamita just entered the room!
                                        </p>
                                    </div>
                                </div>

                                <div className="message__wrapper">
                                    <div className="message__body">
                                        <strong className="message__author">
                                            Sulamita
                                        </strong>
                                        <p className="message__text">
                                            {" "}
                                            Great stream!
                                        </p>
                                    </div>
                                </div>

                                <div className="message__wrapper">
                                    <div className="message__body">
                                        <strong className="message__author">
                                            Dennis Ivy
                                        </strong>
                                        <p className="message__text">
                                            {" "}
                                            Convert RGB color codes to HEX HTML
                                            format for use in web design and
                                            CSS.
                                        </p>
                                    </div>
                                </div>

                                <div className="message__wrapper">
                                    <div className="message__body">
                                        <strong className="message__author">
                                            Shahriar P. Shuvo 👋
                                        </strong>
                                        <p className="message__text">
                                            Does anyone know hen he will be
                                            back?
                                        </p>
                                    </div>
                                </div>
                                <div className="message__wrapper">
                                    <div className="message__body">
                                        <strong className="message__author">
                                            Sulamita
                                        </strong>
                                        <p className="message__text">
                                            Great stream!
                                        </p>
                                    </div>
                                </div>

                                <div className="message__wrapper">
                                    <div className="message__body">
                                        <strong className="message__author">
                                            Dennis Ivy
                                        </strong>
                                        <p className="message__text">
                                            Convert RGB color codes to HEX HTML
                                            format for use in web design and
                                            CSS.
                                        </p>
                                    </div>
                                </div>

                                <div className="message__wrapper">
                                    <div className="message__body">
                                        <strong className="message__author">
                                            Shahriar P. Shuvo 👋
                                        </strong>
                                        <p className="message__text">
                                            Does anyone know hen he will be
                                            back?
                                        </p>
                                    </div>
                                </div>

                                <div className="message__wrapper">
                                    <div className="message__body">
                                        <strong className="message__author">
                                            Sulamita
                                        </strong>
                                        <p className="message__text">
                                            Great stream!
                                        </p>
                                    </div>
                                </div>

                                <div className="message__wrapper">
                                    <div className="message__body__bot">
                                        <strong className="message__author__bot">
                                            🤖 Points soft Bot
                                        </strong>
                                        <p className="message__text__bot">
                                            👋 Sulamita has left the room
                                        </p>
                                    </div>
                                </div>

                                <div className="message__wrapper">
                                    <div className="message__body">
                                        <strong className="message__author">
                                            Dennis Ivy
                                        </strong>
                                        <p className="message__text">
                                            Convert RGB color codes to HEX HTML
                                            format for use in web design and
                                            CSS.
                                        </p>
                                    </div>
                                </div>

                                <div className="message__wrapper">
                                    <div className="message__body">
                                        <strong className="message__author">
                                            Shahriar P. Shuvo 👋
                                        </strong>
                                        <p className="message__text">
                                            Does anyone know hen he will be
                                            back?
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <form
                                id="message__form"
                                onSubmit={this.handleMessageSubmit}
                            >
                                <input
                                    type="text"
                                    name="message"
                                    placeholder="Send a message...."
                                    onChange={(e) =>
                                        this.setState({
                                            message: e.target.value,
                                        })
                                    }
                                />
                                <button
                                    type="submit"
                                    className="message__form__btn"
                                >
                                    <AiOutlineSend />
                                </button>
                            </form>
                        </section>
                    </div>
                )}
            </div>
        );
    }
}

export default Room;
