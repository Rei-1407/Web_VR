import "./App.css";
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./components/Home/Home.jsx";
import CampusViewerPage from "./components/Campus3D/CampusViewerPage.jsx";
import Chatbot from "./components/Chatbot/Chatbot.jsx";
import AdmissionForm from "./components/Admission/AdmissionForm.jsx";

function App() {
  return (
    <Router>
      <div className="app-wrapper">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tour/:id" element={<CampusViewerPage />} />
          <Route path="/tuyen-sinh" element={<AdmissionForm />} />
        </Routes>

        <Chatbot />
      </div>
    </Router>
  );
}

export default App;
