import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useRoomCredential } from "../context/roomCredential";
import JoinRoomAppBar from "../components/JoinRoomAppBar";

// Initialize the socket connection
const socket = io("https://vibb-backend.onrender.com");

const RoomChatting = () => {
  const customUserCredential = useRoomCredential();
  const [message, setMessage] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [isRoomFull, setIsRoomFull] = useState(false); // New state to track if the room is full
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);

  useEffect(() => {
    // Check if the email and roomId are set to join the room
    if (customUserCredential.email && customUserCredential.roomId) {
      // Join the room
      socket.emit("join-room", {
        roomId: customUserCredential.roomId,
        emailId: customUserCredential.email,
      });

      // Handle events
      socket.on("joined-room", (msg) => console.log(msg));
      socket.on("user-joined", (data) => {
        console.log(`${data.emailId} has joined the room.`);
        handleJoinRoom(); // Automatically initiate WebRTC when a new user joins
      });

      socket.on("msg", (data) => {
        setChatMessages((prevMessages) => [...prevMessages, data]);
      });

      // Handle when the room is full
      socket.on("room-full", (msg) => {
        setIsRoomFull(true); // Set the state to indicate the room is full
        alert(msg); // Alert the user that the room is full
      });

      socket.on("webrtc-offer", handleWebRTCOffer);
      socket.on("webrtc-answer", handleWebRTCAnswer);
      socket.on("webrtc-ice-candidate", handleIceCandidate);

      return () => {
        socket.off("joined-room");
        socket.off("user-joined");
        socket.off("msg");
        socket.off("room-full"); // Remove the room-full listener
        socket.off("webrtc-offer");
        socket.off("webrtc-answer");
        socket.off("webrtc-ice-candidate");
      };
    }
  }, [customUserCredential.email, customUserCredential.roomId]);

  // Function to send a chat message
  const handleSendMessage = () => {
    if (message && !isRoomFull) {
      // Prevent sending messages if the room is full
      socket.emit("msg", {
        roomId: customUserCredential.roomId,
        emailId: customUserCredential.email,
        message,
      });
      setMessage(""); // Clear the input
    } else if (isRoomFull) {
      alert("You cannot send messages because the room is full.");
    }
  };

  // Set up WebRTC connection when entering the room
  const handleJoinRoom = async () => {
    if (isRoomFull) {
      alert("The room is full. You cannot join the video chat.");
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    localVideoRef.current.srcObject = stream;

    // Create a new RTCPeerConnection instance
    peerConnection.current = new RTCPeerConnection();

    // Add stream tracks to the connection
    stream.getTracks().forEach((track) => {
      peerConnection.current.addTrack(track, stream);
    });

    // Listen for remote track
    peerConnection.current.ontrack = (event) => {
      remoteVideoRef.current.srcObject = event.streams[0];
    };

    // Listen for ICE candidates
    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("webrtc-ice-candidate", {
          roomId: customUserCredential.roomId,
          candidate: event.candidate,
        });
      }
    };

    // Create and send WebRTC offer
    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);
    socket.emit("webrtc-offer", {
      roomId: customUserCredential.roomId,
      offer,
    });
  };

  // Handle incoming WebRTC offer
  const handleWebRTCOffer = async (data) => {
    const { offer } = data;
    await peerConnection.current.setRemoteDescription(
      new RTCSessionDescription(offer)
    );
    const answer = await peerConnection.current.createAnswer();
    await peerConnection.current.setLocalDescription(answer);
    socket.emit("webrtc-answer", {
      roomId: customUserCredential.roomId,
      answer,
    });
  };

  // Handle incoming WebRTC answer
  const handleWebRTCAnswer = async (data) => {
    const { answer } = data;
    await peerConnection.current.setRemoteDescription(
      new RTCSessionDescription(answer)
    );
  };

  // Handle incoming ICE candidates
  const handleIceCandidate = (data) => {
    const { candidate } = data;
    if (candidate) {
      peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
    }
  };

  return (
    <>
      <JoinRoomAppBar val={customUserCredential.title} />
      <div className="p-12 space-y-2">
        <label htmlFor="EmailId" className="text-lg mr-2 font-bold">
          Email:
        </label>
        <input
          type="email"
          id="EmailId"
          value={customUserCredential.email}
          onChange={(e) => customUserCredential.setEmail(e.target.value)}
          className="rounded-md border-2 border-slate-500 px-2 py-1 font-medium focus:border-slate-950"
          placeholder="Enter your Email here..."
        />
        <br />
        <label htmlFor="RoomId" className="text-lg mr-2 font-bold">
          Room Id:
        </label>
        <input
          id="RoomId"
          value={customUserCredential.roomId}
          onChange={(e) => customUserCredential.setRoomId(e.target.value)}
          className="rounded-md border-2 border-slate-500 px-2 py-1 font-medium focus:border-slate-950"
          placeholder="Enter your Room id here..."
        />
        <br />
        <button
          className="bg-slate-950 text-white rounded-xl border-4 border-white px-4 py-2"
          onClick={handleJoinRoom}
          disabled={isRoomFull} // Disable button if room is full
        >
          {isRoomFull ? "Room Full" : "Enter Room"}
        </button>
      </div>

      <div className="mt-4">
        <h2>Chat Messages:</h2>
        {chatMessages.map((msg, index) => (
          <div key={index}>
            <strong>{msg.emailId}:</strong> {msg.message}
          </div>
        ))}
      </div>

      {/* Video for WebRTC */}
      <div className="mt-8 ">
        <div className="video-container flex w-full flex-row">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            className="w-1/2 rounded-xl border-4 border-green-950"
          />
          <video
            ref={remoteVideoRef}
            autoPlay
            className="w-1/2 rounded-xl border-4 border-red-950"
          />
        </div>
      </div>
    </>
  );
};

export default RoomChatting;
