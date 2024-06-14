/* eslint-disable @typescript-eslint/no-explicit-any */
export const generateRandomString = () => {
    // Function to generate a random string in the format "xxxx-xxx-xxxx"
    const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
    const sections = [4, 3, 4]; // Length of each section
    let result = "";
    for (let i = 0; i < sections.length; i++) {
        for (let j = 0; j < sections[i]; j++) {
            result += characters.charAt(
                Math.floor(Math.random() * characters.length)
            );
        }
        if (i < sections.length - 1) {
            result += "-";
        }
    }
    return result;
};

export const joinParticipant = (username: string, socketId: string) => {
    const memberListContainer: any = document.getElementById("member__list");
    const participantDiv = document.getElementById(socketId);

    if (!participantDiv) {
        // Create a new div element
        const newDiv = document.createElement("div");
        newDiv.className = "member__wrapper";
        newDiv.id = socketId;
        newDiv.innerHTML = `
                    <span class="green__icon"></span>
                    <p class="member_name">${username}</p>
                `;
        memberListContainer.appendChild(newDiv);
    } else {
        participantDiv.style.display = "flex";
    }
};

export const black = ({ width = 640, height = 480 } = {}) => {
    const canvas = Object.assign(document.createElement("canvas"), {
        width,
        height,
    });

    canvas.getContext("2d")?.fillRect(0, 0, width, height);

    const stream = canvas.captureStream();

    return Object.assign(stream.getVideoTracks()[0], { enabled: false });
};

export const silence = () => {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const dst = oscillator.connect(ctx.createMediaStreamDestination());
    oscillator.start();
    ctx.resume();

    // @ts-ignore
    return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
};

export const addVideoStreamToDom = (socketListId: string, event: any) => {
    const videoContainer = document.getElementById("video__container");

    const newVideo = document.createElement("video");

    newVideo.setAttribute("data-socket", socketListId);
    newVideo.classList.add("remote__video");
    newVideo.srcObject = event.stream;
    newVideo.autoplay = true;
    newVideo.playsInline = true;

    videoContainer?.appendChild(newVideo);
};
