/* eslint-disable @typescript-eslint/ban-ts-comment */
import React from "react";
import { useParams } from "react-router-dom";
import { JoinRoomProps } from "../../utils/types";

/**
 * @todo
 * Grab room id from the existing room/broadcast (e.g using context(not working) or socket connection), send it to backend for joining that particular
 * room/broadcast
 * Grab the joined username and send it along with the roomId to the backend
 *
 * The user will only able to get to this page if there is any existig broadcast, but if the link is invalid, it should say, sorry there's no current stream happening
 *
 */

const JoinRoom: React.FC<JoinRoomProps> = ({
    connect,
    setUsername,
    localVideo,
}) => {
    const { roomId } = useParams();

    const handleFormSubmit = (e: any) => {
        e.preventDefault();

        // working
        // socket.emit("signal", {
        //     id: socket.id,
        //     message: e.target.joinedUser.value,
        // });
        connect();
    };

    return (
        <>
            <main className="container-fluid main">
                <div className="main">
                    <main id="room__lobby__container">
                        <div id="form__container">
                            <div id="form__container__header">
                                <h2>👋 Join Live Stream</h2>
                                {roomId ? (
                                    <h3 style={{ color: "purple" }}>
                                        Stream is going on. Join now
                                    </h3>
                                ) : (
                                    <h3 style={{ color: "purple" }}>
                                        Sorry! No room available
                                    </h3>
                                )}
                            </div>

                            <form
                                id="lobby__form"
                                className="row g-3"
                                method="POST"
                                onSubmit={handleFormSubmit}
                            >
                                <video
                                    src=""
                                    ref={localVideo}
                                    autoPlay
                                    muted
                                    style={{ width: "350px" }}
                                ></video>
                                <div className="mb-3">
                                    <label
                                        htmlFor="joinedUser"
                                        className="form-label"
                                    >
                                        Enter Your Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        name="joinedUser"
                                        className="form-control"
                                        id="formGroupExampleInput"
                                        placeholder="Please Enter your name"
                                        onChange={(e) =>
                                            setUsername(e.target.value)
                                        }
                                    />
                                </div>

                                <div className="form__field__wrapper">
                                    <button
                                        type="submit"
                                        className="btn btn-outline-success createRoombtn"
                                    >
                                        Join Stream
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="24"
                                            height="24"
                                            viewBox="0 0 24 24"
                                        >
                                            <path d="M13.025 1l-2.847 2.828 6.176 6.176h-16.354v3.992h16.354l-6.176 6.176 2.847 2.828 10.975-11z" />
                                        </svg>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </main>
                </div>
            </main>
        </>
    );
};

export default JoinRoom;
