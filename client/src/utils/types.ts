import { LegacyRef } from "react";

export interface JoinRoomProps {
    connect: any;
    setUsername: React.Dispatch<React.SetStateAction<string>>;
    localVideo: LegacyRef<HTMLVideoElement>;
}
export interface RoomState {
    messages: any[];
    video: boolean;
    audio: boolean;
    screen: boolean;
    screenAvailable: boolean;
    askForUsername: boolean;
    username: string;
    message: string;
    users: any[];
    sender: string;
    handledUsers: any;
}
