/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { generateRandomString } from "../../utils/scripts";
import "./Lobby.css";

const Lobby = () => {
    const [roomId, setRoomId] = useState(generateRandomString());
    const navigate = useNavigate();

    // Generating random string by button click
    const handleGenerateClick = () => {
        // Function to handle button click event
        const newRoomId = generateRandomString();
        setRoomId(newRoomId);
    };

    // API call for sending user info to the backend for creating a room
    const handleFormSubmit = (e: any) => {
        e.preventDefault();

        navigate(`/room/${roomId}`);
    };

    return (
        <>
            <main className="container-fluid main">
                <div className="main">
                    <main id="room__lobby__container">
                        <div id="form__container">
                            <div id="form__container__header">
                                <h2>👋 Create a Room for Broadcasting</h2>
                            </div>

                            <form
                                id="lobby__form"
                                className="row g-3"
                                method="POST"
                                onSubmit={handleFormSubmit}
                            >
                                {/* <div className="mb-3">
                                    <label
                                        htmlFor="username"
                                        className="form-label"
                                    >
                                        Enter Your Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        name="username"
                                        className="form-control"
                                        id="formGroupExampleInput"
                                        placeholder="Please Enter your name"
                                        onChange={(e) =>
                                            setUserName(e.target.value)
                                        }
                                    />
                                </div> */}
                                <div className="mb-3">
                                    <label
                                        htmlFor="roomId"
                                        className="form-label"
                                    >
                                        Generate Room Id
                                    </label>
                                    <div className="input-group">
                                        <div className="input-group-text">
                                            {roomId}
                                        </div>
                                        <button
                                            type="button"
                                            name="generate-roomId"
                                            className="btn  btn-secondary generate-roomId"
                                            id="roomId"
                                            onClick={handleGenerateClick}
                                        >
                                            Generate
                                        </button>
                                    </div>
                                </div>

                                <div className="form__field__wrapper">
                                    <button
                                        type="submit"
                                        className="btn btn-outline-success createRoombtn"
                                    >
                                        Create Room
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

export default Lobby;
