/* eslint-disable prefer-const */
import { Component, FormEvent, createRef } from "react";
import { AiOutlineSend } from "react-icons/ai";
import { FaRightFromBracket } from "react-icons/fa6";
import { FiMic, FiMicOff, FiVideo, FiVideoOff } from "react-icons/fi";
import { MdOutlineScreenshotMonitor } from "react-icons/md";
import io, { Socket } from "socket.io-client";
import {
  addVideoStreamToDom,
  black,
  changeStyleForVideos,
  silence,
} from "../../utils/scripts";
import { RoomState } from "../../utils/types";
import JoinRoom from "../JoinRoom/JoinRoom";
import "./Room.css";

// Global variables
// const serverUrl = "https://meet.jobabd.xyz";
const serverUrl = "https://stream-app-test-us4j.onrender.com";
// const configuration = {
//     iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
// };

const configuration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" }, // Google's STUN server
    {
      urls: "turn:192.158.29.39:3478?transport=udp",
      credential: "JZEOEt2V3Qb0y27GRntt2u2PAYA=",
      username: "28224511:1379330808",
    },
  ],
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
      askForUsername: true,
      username: "",
      message: "",
      users: [],
      sender: "",
      handledUsers: new Set(),
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
    this.joinParticipants = this.joinParticipants.bind(this);
  }

  componentDidMount() {
    this.getPermissions();
  }

  connect = () => {
    this.setState({ askForUsername: !this.state.askForUsername }, () =>
      this.getMedia()
    );
  };
  // {
  //     autoGainControl: false,
  //     channelCount: 2,
  //     echoCancellation: true,
  //     //@ts-ignore
  //     latency: 0,
  //     noiseSuppression: false,
  //     sampleRate: 48000,
  //     sampleSize: 16,
  //     volume: 1.0,
  // }
  async getPermissions() {
    try {
      await navigator.mediaDevices
        .getUserMedia({
          video: true,
          audio: {
            autoGainControl: false,
            channelCount: 2,
            echoCancellation: true,
            //@ts-ignore
            latency: 0,
            noiseSuppression: false,
            sampleRate: 48000,
            sampleSize: 16,
            volume: 1.0,
          },
        })
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
              let tracks = this.localVideo.current.srcObject.getTracks();
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
                  .catch((error: Error) => console.error(error));
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
          .getDisplayMedia({
            video: true,
            audio: true,
          })
          .then(this.getDisplayMediaSuccess)
          .then((_stream) => {})
          .catch((error: Error) => console.log(error));
      }
    }
  };

  getDisplayMediaSuccess = (stream: any) => {
    try {
      //@ts-ignore
      window.localStream.getTracks().forEach((track: any) => track.stop());
    } catch (error) {
      console.error(error);
    }
    socket!.emit("screen-sharing", { sharing: true, id: socketId });
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
            socket!.emit("screen-sharing", {
              sharing: false,
              id: socketId,
            });
            try {
              let tracks = this.localVideo.current.srcObject.getTracks();
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
                          sdp: connections[fromId].localDescription,
                        })
                      );
                    })
                    .catch((error: Error) => console.error(error));
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
      socket?.emit("join-call", window.location.href, this.state.username);
      socketId = socket?.id;

      socket?.on("chat-message", this.addMessage);

      socket?.on("screen-sharing", (data: { sharing: boolean; id: string }) => {
        const searchVideo = document.querySelector(
          `[data-socket="${data.id}"]`
        );
        if (data.sharing) {
          if (searchVideo) {
            // @ts-ignore
            searchVideo.style.width = "100%";
          }
        } else {
          this.getDisplayMedia();
          if (searchVideo) {
            //@ts-ignore
            searchVideo.style.width = "45%";
          }
        }
      });

      socket?.on("user-left", (id, clients) => {
        this.joinParticipants(clients);
        let video = document.querySelector(`[data-socket="${id}"]`);
        if (video !== null) {
          elms--;
          video.parentNode?.removeChild(video);

          const mainContainer = document.getElementById("video__container");
          changeStyleForVideos(mainContainer, elms);
        }
      });

      socket?.on("user-joined", (id: string, clients: any) => {
        this.joinParticipants(clients);

        // const handledUsers = new Set();
        // handledUsers.add(id);

        // // Check if the user who just joined has already been handled
        // if (!handledUsers.has(id)) {
        //     console.log(handledUsers);
        //     const client = clients.find(
        //         (client: { id: string; user: any }) => client.id === id
        //     );

        //     // Find the client that just joined and send the chat message

        //     if (client && !handledUsers.has(client.id)) {
        //         console.log(handledUsers.has(client.id));
        //         const data = `${client.user} just entered the room!`;
        //         const sender = "🤖 Points soft Bot";

        //         socket?.emit("chat-message", data, sender);
        //     }
        // }

        clients.forEach((client: any) => {
          connections[client.id] = new RTCPeerConnection(configuration);

          // Adding ice candidate
          connections[client.id].onicecandidate = (e: any) => {
            if (e.candidate != null) {
              socket?.emit(
                "signal",
                client.id,
                JSON.stringify({ ice: e.candidate })
              );
            }
          };

          // Adding video stream
          connections[client.id].onaddstream = (e: any) => {
            /**@todo mute button, full screen button */

            const searchVideo = document.querySelector(
              `[data-socket="${client.id}"]`
            );
            if (searchVideo !== null) {
              //@ts-ignore
              searchVideo.srcObject = e.stream;
            } else {
              elms = clients.length;

              addVideoStreamToDom(client.id, e, elms);
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
            connections[client.id].addStream(window.localStream);
          } else {
            let blackSilence = (...args: any[]) =>
              new MediaStream([black(...args), silence()]);
            // @ts-ignore
            window.localStream = blackSilence();

            //@ts-ignore
            connections[client.id].addStream(window.localStream);
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

            connections[id2].createOffer().then((description: any) => {
              connections[id2]
                .setLocalDescription(description)
                .then(() => {
                  socket?.emit(
                    "signal",
                    id2,
                    JSON.stringify({
                      sdp: connections[id2].localDescription,
                    })
                  );
                })
                .catch((error: Error) => console.error(error));
            });
          }
        }
      });
    });
  }

  handleMessageSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (this.state.username !== null && this.state.message) {
      socket?.emit("chat-message", this.state.message, this.state.username);
    }

    this.setState({ message: "", sender: this.state.username });

    //@ts-ignore
    e.target.reset();
  };
  addMessage = (data: any, sender: any, _socketIdSender: any) => {
    this.setState((prevState) => ({
      messages: [...prevState.messages, { sender: sender, data: data }],
    }));
  };

  joinParticipants = (clients: any) => {
    this.setState(() => ({
      users: clients,
    }));
  };

  handleVideo = () => {
    this.setState({ video: !this.state.video }, () => this.getUserMedia());
  };

  handleAudio = () => {
    this.setState({ audio: !this.state.audio }, () => this.getUserMedia());
  };

  handleScreening = () => {
    this.setState({ screen: !this.state.screen }, () => this.getDisplayMedia());
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
    const { askForUsername, audio, video, users, messages } = this.state;

    return (
      <div>
        {askForUsername === true ? (
          <JoinRoom
            connect={this.connect}
            setUsername={(username: any) => this.setState({ username })}
            localVideo={this.localVideo}
          />
        ) : (
          <div id="room__container">
            <section id="members__container">
              <div id="members__header">
                <span>Participants</span>

                <strong id="members__count">{users.length}</strong>
              </div>

              <div id="member__list">
                {users.map((user, index) => (
                  <div
                    className="member__wrapper"
                    id="member__2__wrapper"
                    key={index}
                  >
                    <span className="green__icon"></span>
                    <p className="member_name">{user.user}</p>
                  </div>
                ))}
              </div>
            </section>

            <section id="stream__container">
              <div className="stream__main">
                <div className="video__container" id="video__container">
                  <video
                    ref={this.localVideo}
                    className="main__video"
                    id="main__video"
                    autoPlay
                    playsInline
                    muted
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
                {/* <div className="message__wrapper">
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
                                    </div> */}

                {messages.length > 0 ? (
                  messages.map((item, index) => (
                    <div className="message__wrapper" key={index}>
                      <div className="message__body">
                        <strong className="message__author">
                          {item.sender}
                        </strong>
                        <p className="message__text">{item.data}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="d-flex justify-content-center m-4">
                    No Message Yet
                  </div>
                )}
              </div>

              <form id="message__form" onSubmit={this.handleMessageSubmit}>
                <input
                  type="text"
                  name="message"
                  placeholder="Send a message...."
                  value={this.state.message}
                  onChange={(e) =>
                    this.setState({
                      message: e.target.value,
                    })
                  }
                />
                <button type="submit" className="message__form__btn">
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
