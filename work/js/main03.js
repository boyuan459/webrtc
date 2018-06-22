'use strict';

let localConnection;
let remoteConnection;
let sendChannel;
let receiveChannel;
let pcConstraint;
let dataConstraint;

const dataChannelSend = document.querySelector('#dataChannelSend');
const dataChannelReceive = document.querySelector('#dataChannelReceive');

// buttons element
const startButton = document.getElementById('startButton');
const sendButton = document.getElementById('sendButton');
const closeButton = document.getElementById('closeButton');


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

function onAddIceCandidateSuccess() {
    trace(`AddIceCandidate Success`);
}

function onAddIceCandidateError(error) {
    trace(`Failed to add Ice Candidate: ${error.toString()}`);
}

function handleIceLocal(event) {
    trace('local ice callback');
    if (event.candidate) {
        remoteConnection.addIceCandidate(event.candidate)
        .then(
            onAddIceCandidateSuccess,
            onAddIceCandidateError
        );
        trace(`Remote ICE candidate:\n ${event.candidate.candidate}`);
    }
}

function handleIceRemote(event) {
    trace('remote ice callback');
    if (event.candidate) {
        localConnection.addIceCandidate(event.candidate)
        .then(
            onAddIceCandidateSuccess,
            onAddIceCandidateError
        );
        trace(`Remote ICE candidate:\n ${event.candidate.candidate}`);
    }
}

function onSendChannelStateChange() {
    var readyState = sendChannel.readyState;
    trace(`Send channel state is: ${readyState}`);
    if (readyState === 'open') {
        dataChannelSend.disabled = false;
        dataChannelSend.focus();
        sendButton.disabled = false;
        closeButton.disabled = false;
    } else {
        dataChannelSend.disabled = true;
        sendButton.disabled = true;
        closeButton.disabled = true;
    }
}

function onReceiveMessageCb(event) {
    trace(`Received Message`);
    dataChannelReceive.value = event.data;
}

function onReceiveChannelStateChange() {
    var readyState = receiveChannel.readyState;
    trace(`Receive channel state is: ${readyState}`);
}

function handleReceiveChannel(event) {
    trace('Receive Channel Callback');
    receiveChannel = event.channel;
    receiveChannel.onmessage = onReceiveMessageCb;
    receiveChannel.onopen = onReceiveChannelStateChange;
    receiveChannel.onclose = onReceiveChannelStateChange;
}

function onCreateSessionDescriptionError(error) {
    trace('Failed to create session description: ' + error.toString());
  }

function createdOffer(description) {
    localConnection.setLocalDescription(description);
    trace(`Offer from localConnection:\n${description.sdp}`);
    remoteConnection.setRemoteDescription(description);
    remoteConnection.createAnswer().then(
        createdAnswer,
        onCreateSessionDescriptionError
    );
}

function createdAnswer(description) {
    remoteConnection.setLocalDescription(description);
    trace(`Answer from remoteConnection:\n+${description.sdp}`);
    localConnection.setRemoteDescription(description);
}

function createConnection() {
    dataChannelSend.placeholder = '';
    var servers = null;
    pcConstraint = null;
    dataConstraint = null;
    trace(`Using SCTP based data channels`);
    //for SCTP, reliable and ordered delivery is true by default
    window.localConnection = localConnection = 
        new RTCPeerConnection(servers, pcConstraint);
    trace('Created local peer connection object localConnection');

    sendChannel = localConnection.createDataChannel('sendDataChannel', dataConstraint);
    trace('Created send data channel');

    localConnection.onicecandidate = handleIceLocal;
    sendChannel.onopen = onSendChannelStateChange;
    sendChannel.onclose = onSendChannelStateChange;

    window.remoteConnection = remoteConnection = 
        new RTCPeerConnection(servers, pcConstraint);
    trace(`Created remote peer connection object remoteConnection`);

    remoteConnection.onicecandidate = handleIceRemote;
    remoteConnection.ondatachannel = handleReceiveChannel;

    localConnection.createOffer().then(
        createdOffer,
        onCreateSessionDescriptionError
    );

    startButton.disabled = true;
    closeButton.disabled = false;
}

function sendData() {
    var data = dataChannelSend.value;
    sendChannel.send(data);
    trace(`Send data: ${data}`);
}

function closeDataChannels() {
    sendChannel.close();
    receiveChannel.close();
    localConnection.close();
    remoteConnection.close();
    localConnection = null;
    remoteConnection = null;
    startButton.disabled = false;
    sendButton.disabled = true;
    closeButton.disabled = true;
    dataChannelSend.value = '';
    dataChannelReceive.value = '';
    dataChannelSend.disabled = true;
}
// define buttons behavior

// init buttons
sendButton.disabled = true;
closeButton.disabled = true;

startButton.addEventListener('click', createConnection);
sendButton.addEventListener('click', sendData);
closeButton.addEventListener('click', closeDataChannels);

// Initializes media stream.

