import "./App.css";
import React from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import Home from "./components/Home/Home.jsx";
import CampusViewerPage from "./components/Campus3D/CampusViewerPage.jsx";
import Chatbot from "./components/Chatbot/Chatbot.jsx";
import AdmissionForm from "./components/Admission/AdmissionForm.jsx";
import VRFloatingButton from "./components/VRWeb/VRFloatingButton.jsx";
import VRWebOverlay from "./components/VRWeb/VRWebOverlay.jsx";

function AppContent() {
  const location = useLocation();
  const hideChatbot = location.pathname.startsWith("/tour-vr/");

  const [vrOpen, setVrOpen] = React.useState(false);
  const [xrSession, setXrSession] = React.useState(null);

  const enterVR = React.useCallback(() => {
    if (!navigator.xr) {
      alert("Trình duyệt không hỗ trợ WebXR / VR");
      return;
    }

    navigator.xr
      .requestSession("immersive-vr", {
        optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking"],
      })
      .then((session) => {
        session.addEventListener("end", () => {
          setVrOpen(false);
          setXrSession(null);
        });
        setXrSession(session);
        setVrOpen(true);
      })
      .catch((err) => {
        console.error("Start VR error:", err);
      });
  }, []);

  const exitVR = React.useCallback(() => {
    try {
      xrSession?.end?.();
    } catch {
      // ignore
    }
    setVrOpen(false);
    setXrSession(null);
  }, [xrSession]);

  return (
    <div className="app-wrapper">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tour/:id" element={<CampusViewerPage mode="3d" />} />
        <Route path="/tour-vr/:id" element={<CampusViewerPage mode="vr" />} />
        <Route path="/tuyen-sinh" element={<AdmissionForm />} />
      </Routes>

      <VRFloatingButton onClick={enterVR} hidden={vrOpen} />
      <VRWebOverlay open={vrOpen} session={xrSession} onRequestExit={exitVR} />

      {!hideChatbot && <Chatbot />}
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
