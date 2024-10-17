import { createContext, useContext, useState } from "react";
const RoomCredentialContext = createContext(null);
export const useRoomCredential = () => useContext(RoomCredentialContext);
export const RoomCredentialProvider = (props) => {
  const [title, setTitle] = useState("Join Room");
  const [email, setEmail] = useState("");
  const [roomId, setRoomId] = useState("");
  return (
    <RoomCredentialContext.Provider
      value={{ email, setEmail, roomId, setRoomId, title, setTitle }}
    >
      {props.children}
    </RoomCredentialContext.Provider>
  );
};
