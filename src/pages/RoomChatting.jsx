import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useRoomCredential } from "../context/roomCredential";
import JoinRoomAppBar from "../components/JoinRoomAppBar";

// Initialize the socket connection
const socket = io("https://vibb-stream-2-0.onrender.com");

const RoomChatting = () => {
  const customUserCredential = useRoomCredential();
  const [message, setMessage] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [isRoomFull, setIsRoomFull] = useState(false);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    // Set canvas dimensions
    canvas.width = 1280;
    canvas.height = 720;

    // Function to draw video frames on the canvas
    const drawVideoFrame = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);

      // Draw local video on the left
      if (localVideoRef.current) {
        context.drawImage(
          localVideoRef.current,
          0,
          0,
          canvas.width / 2,
          canvas.height
        );
      }

      // Draw remote video on the right
      if (remoteVideoRef.current) {
        context.drawImage(
          remoteVideoRef.current,
          canvas.width / 2,
          0,
          canvas.width / 2,
          canvas.height
        );
      }

      requestAnimationFrame(drawVideoFrame);
    };

    drawVideoFrame();

    if (customUserCredential.email && customUserCredential.roomId) {
      socket.emit("join-room", {
        roomId: customUserCredential.roomId,
        emailId: customUserCredential.email,
      });

      socket.on("joined-room", (msg) => console.log(msg));
      socket.on("user-joined", (data) => {
        console.log(`${data.emailId} has joined the room.`);
        handleJoinRoom(); // Automatically initiate WebRTC when a new user joins
      });

      socket.on("msg", (data) => {
        setChatMessages((prevMessages) => [...prevMessages, data]);
      });

      socket.on("room-full", (msg) => {
        setIsRoomFull(true);
        alert(msg);
      });

      socket.on("webrtc-offer", handleWebRTCOffer);
      socket.on("webrtc-answer", handleWebRTCAnswer);
      socket.on("webrtc-ice-candidate", handleIceCandidate);

      return () => {
        socket.off("joined-room");
        socket.off("user-joined");
        socket.off("msg");
        socket.off("room-full");
        socket.off("webrtc-offer");
        socket.off("webrtc-answer");
        socket.off("webrtc-ice-candidate");
      };
    }
  }, [customUserCredential.email, customUserCredential.roomId]);

  const handleSendMessage = () => {
    if (message && !isRoomFull) {
      socket.emit("msg", {
        roomId: customUserCredential.roomId,
        emailId: customUserCredential.email,
        message,
      });
      setMessage("");
    } else if (isRoomFull) {
      alert("You cannot send messages because the room is full.");
    }
  };

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

    peerConnection.current = new RTCPeerConnection();

    stream.getTracks().forEach((track) => {
      peerConnection.current.addTrack(track, stream);
    });

    peerConnection.current.ontrack = (event) => {
      remoteVideoRef.current.srcObject = event.streams[0];
    };

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("webrtc-ice-candidate", {
          roomId: customUserCredential.roomId,
          candidate: event.candidate,
        });
      }
    };

    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);
    socket.emit("webrtc-offer", {
      roomId: customUserCredential.roomId,
      offer,
    });
  };

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

  const handleWebRTCAnswer = async (data) => {
    const { answer } = data;
    await peerConnection.current.setRemoteDescription(
      new RTCSessionDescription(answer)
    );
  };

  const handleIceCandidate = (data) => {
    const { candidate } = data;
    if (candidate) {
      peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
    }
  };

  const handleGoLive = () => {
    const canvas = canvasRef.current;

    if (canvas) {
      const combinedStream = canvas.captureStream(25);

      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: "video/webm; codecs=vp8",
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          socket.emit("binaryStream", event.data);
        }
      };

      mediaRecorder.start(100);
      console.log("Live streaming started");
    } else {
      console.log("Canvas not available for streaming.");
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
          disabled={isRoomFull}
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

      <div className="mt-8 ">
        <div className="video-container flex w-full flex-row" id="main-stream">
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
        <canvas ref={canvasRef} className="hidden" />
        <button onClick={handleGoLive}>Go Live</button>
      </div>
    </>
  );
};

export default RoomChatting;
