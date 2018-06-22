'use strict';

// On this codelab, you will be streaming only video (video: true).
const mediaStreamConstraints = {
    video: true,
};

// setup to exchange only video
const offerOptions = {
    offerToReceiveVideo: 1,
};

// define initial start time of the call (defined as connection between peers.)
let startTime = null;

// Video element where stream will be placed.
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

// buttons element
const startButton = document.getElementById('startButton');
const callButton = document.getElementById('callButton');
const hangupButton = document.getElementById('hangupButton');

// Local stream that will be reproduced on the video.
let localStream;
let remoteStream;

let localPeerConnection;
let remotePeerConnection;

// define helper functions.

// helper log function
function trace(text) {
    text = text.trim();
    const now = (window.performance.now() / 1000).toFixed(3);
    console.log(now, text);
}

// get the other peer connection.
function getOtherPeer(peerConnection) {
    return (peerConnection === localPeerConnection) ?
        remotePeerConnection : localPeerConnection;
}

// get the name of a certain peer connection
function getPeerName(peerConnection) {
    return (peerConnection === localPeerConnection) ?
        'localPeerConnection' : 'remotePeerConnection';
}

// define media stream callbacks

// Handles success by adding the MediaStream to the video element.
function gotLocalMediaStream(mediaStream) {
    localStream = mediaStream;
    localVideo.srcObject = mediaStream;
    trace('Received local stream.');
    callButton.disabled = false;
}

// Handles error by logging a message to the console with the error message.
function handleLocalMediaStreamError(error) {
    trace(`navigator.getUserMedia error: ${error.toString()}.`);
}

// handle remote media stream success by adding it as the remote video src
function gotRemoteMediaStream(event) {
    const mediaStream = event.stream;
    remoteVideo.srcObject = mediaStream;
    remoteStream = mediaStream;
    trace('Received remote stream from remote peer connection ');
}

// add behavior for video streams

// log a message with the id and size of a video element.
function logVideoLoaded(event) {
    const video = event.target;
    trace(`${video.id} videoWidth: ${video.videoWidth}px, videoHeight: ${video.videoHeight}px.`);
}

// log a message with the id and size of a video element,
// this event is fired when video begins streaming
function logResizedVideo(event) {
    trace('onresize');
    logVideoLoaded(event);
    if (startTime) {
        const elapsedTime = window.performance.now() - startTime;
        startTime = null;
        trace(`Setup time: ${elapsedTime.toFixed(3)}ms.`);
    }
}

localVideo.addEventListener('loadedmetadata', logVideoLoaded);
remoteVideo.addEventListener('loadedmetadata', logVideoLoaded);
remoteVideo.addEventListener('onresize', logResizedVideo);

// define RTC peer conneciton behaviour

// connect with new peer candidate
function handleConnection(event) {
    const peerConnection = event.target;
    const iceCandidate = event.candidate;

    if (iceCandidate) {
        const newIceCandidate = new RTCIceCandidate(iceCandidate);
        const otherPeer = getOtherPeer(peerConnection);

        otherPeer.addIceCandidate(newIceCandidate)
            .then(() => {
                handleConnectionSuccess(peerConnection);
            }).catch(error => {
                handleConnectionFailure(peerConnection, error);
            });
    }
}

// log that the connection succeeded
function handleConnectionSuccess(peerConnection) {
    trace(`${getPeerName(peerConnection)} addIceCandidate success.`);
}

// log that the connection failed
function handleConnectionFailure(peerConnection, error) {
    trace(`${getPeerName(peerConnection)} failed to add ICE Candidate:\n ${error.toString()}.`);
}

// log changes to the connection state
function handleConnectionChange(event) {
    const peerConnection = event.target;
    console.log('ICE state change event: ', event);
    trace(`${getPeerName(peerConnection)} ICE state: ${peerConnection.iceConnectionState}.`);
}

// log error when setting session description fails
function setSessionDescriptionError(error) {
    trace(`Failed to create session description: ${error.toString()}.`);
}

// log success when setting session description
function setDescriptionSuccess(peerConnection, functionName) {
    const peerName = getPeerName(peerConnection);
    trace(`${peerName} ${functionName} complete.`);
}

// Logs success when localDescription is set.
function setLocalDescriptionSuccess(peerConnection) {
    setDescriptionSuccess(peerConnection, 'setLocalDescription');
}

// Logs success when remoteDescription is set.
function setRemoteDescriptionSuccess(peerConnection) {
    setDescriptionSuccess(peerConnection, 'setRemoteDescription');
}

// create offer and set peer connection session description
function createOffer(description) {
    trace(`Offer from localPeerConnection:\n ${description.sdp}`);

    trace(`localPeerConnection setLocalDescription start.`);
    localPeerConnection.setLocalDescription(description)
        .then(() => {
            setLocalDescriptionSuccess(localPeerConnection);
        }).catch(setSessionDescriptionError);

    trace('remotePeerConnection setRemoteDescription start.');
    remotePeerConnection.setRemoteDescription(description)
        .then(() => {
            setRemoteDescriptionSuccess(remotePeerConnection);
        }).catch(setSessionDescriptionError);

    trace(`remotePeerConnection createAnswer start.`);
    remotePeerConnection.createAnswer()
        .then(createAnswer)
        .catch(setSessionDescriptionError);
}

// create answer to offer and set peer connection session description
function createAnswer(description) {
    trace(`Answer from remotePeerConnection:\n ${description.sdp}`);
    trace('remotePeerConnection setLocalDescription start.');
    remotePeerConnection.setLocalDescription(description)
        .then(() => {
            setLocalDescriptionSuccess(remotePeerConnection);
        }).catch(setSessionDescriptionError);

    trace('localPeerConnection setRemoteDescription start.');
    localPeerConnection.setRemoteDescription(description)
        .then(() => {
            setRemoteDescriptionSuccess(localPeerConnection);
        }).catch(setSessionDescriptionError);
}

// define buttons behavior

// init buttons
callButton.disabled = true;
hangupButton.disabled = true;

// handle start button action: create local MediaStream.
function startAction() {
    startButton.disabled = true;
    navigator.mediaDevices.getUserMedia(mediaStreamConstraints)
    .then(gotLocalMediaStream).catch(handleLocalMediaStreamError);

    trace('Requesting local stream.');
}

// handle call action: creates peer connection
function callAction() {
    callButton.disabled = true;
    hangupButton.disabled = false;

    trace('Starting call.');
    startTime = window.performance.now();

    // get local media stream tracks
    const videoTracks = localStream.getVideoTracks();
    const audioTracks = localStream.getAudioTracks();

    if (videoTracks.length > 0) {
        trace(`Using video device: ${videoTracks[0].label}`);
    }
    if (audioTracks.length > 0) {
        trace(`Using audio device: ${audioTracks[0].label}`);
    }

    const servers = null;   // allows for RTC server configuration

    //create peer connections and add behavior
    localPeerConnection = new RTCPeerConnection(servers);
    trace('Created local peer connection object localPeerConnection.');

    localPeerConnection.addEventListener('icecandidate', handleConnection);
    localPeerConnection.addEventListener('iceconnectionstatechange', handleConnectionChange);

    remotePeerConnection = new RTCPeerConnection(servers);
    trace('Created remote peer connection object remotePeerConnection.');
    remotePeerConnection.addEventListener('icecandidate', handleConnection);
    remotePeerConnection.addEventListener('iceconnectionstatechange', handleConnectionChange);
    remotePeerConnection.addEventListener('addstream', gotRemoteMediaStream);

    // add local stream to connection and create offter to connect
    localPeerConnection.addStream(localStream);
    trace('Added local stream to localPeerConnection.');

    trace('localPeerConnection createOffer start.');
    localPeerConnection.createOffer(offerOptions)
    .then(createOffer).catch(setSessionDescriptionError);
}

// handle hangup action: ends up call, close connections and reset peers
function hangupAction() {
    localPeerConnection.close();
    remotePeerConnection.close();
    localPeerConnection = null;
    remotePeerConnection = null;
    hangupButton.disabled = true;
    callButton.disabled = false;
    trace('Ending call.');
}

startButton.addEventListener('click', startAction);
callButton.addEventListener('click', callAction);
hangupButton.addEventListener('click', hangupAction);

// Initializes media stream.

