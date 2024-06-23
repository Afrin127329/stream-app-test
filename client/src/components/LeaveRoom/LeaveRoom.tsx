import { useNavigate } from "react-router-dom";
import "./LeaveRoom.css";

const LeaveRoom = () => {
    const navigate = useNavigate();
    const handleClick = () => {
        navigate("/user/level/home");
    };

    return (
        <div className="container leave-container">
            <h1 className="text-center leave-text">
                Thank you for joining the broadcast
            </h1>
            <br />
            <button
                className="btn btn-outline-success mt-4"
                onClick={handleClick}
            >
                Return to challange page
            </button>
        </div>
    );
};

export default LeaveRoom;
