import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import RoomChatting from "./pages/RoomChatting.jsx";
import { RoomCredentialProvider } from "./context/roomCredential.jsx";
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RoomCredentialProvider>
      <RoomChatting />
    </RoomCredentialProvider>
  </StrictMode>
);
