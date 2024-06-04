export const getUserMedia = (
    video: boolean,
    audio: boolean,
    videoAvailable: boolean,
    audioAvailable: boolean,
    getUserMediaSuccess: { (stream: any): void; (arg0: MediaStream): any }
) => {
    if ((video && videoAvailable) || (audio && audioAvailable)) {
        navigator.mediaDevices
            .getUserMedia({ video: video, audio: audio })
            .then((stream) => getUserMediaSuccess(stream))
            .then((_stream) => {})
            .catch((error) => console.error(error));

        // for firefox
        // navigator
        //     .mozGetUserMedia({ video: video, audio: audio })
        //     .then((stream: any) => getUserMediaSuccess(stream));
    } else {
        try {
            // @ts-ignore
            const tracks = localVideo.current.srcObject.getTracks();
            tracks.forEach((track: { stop: () => any }) => track.stop());
        } catch (error) {
            console.error(error);
        }
    }
};
