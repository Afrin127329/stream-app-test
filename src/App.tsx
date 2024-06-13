import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.css";
import Lobby from "./components/Lobby/Lobby";
import Room from "./components/Room/Room";

import LeaveRoom from "./components/LeaveRoom/LeaveRoom";

function App() {
    return (
        <>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Lobby />} />
                    <Route path="/room/:roomId" element={<Room />} />
                    <Route path="/leave-room" element={<LeaveRoom />} />
                </Routes>
            </BrowserRouter>
        </>
    );
}

export default App;
