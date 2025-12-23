import React from "react";
import "./VRWeb.css";

export default function VRFloatingButton({ onClick, hidden }) {
  if (hidden) return null;

  return (
    <button
      type="button"
      className="vr-fab"
      onClick={onClick}
      aria-label="Bật chế độ VR"
      title="Bật chế độ VR"
    >
      VR
    </button>
  );
}
