import React, { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, useProgress, PointerLockControls, Environment } from "@react-three/drei";
import * as THREE from "three";
import ModelViewer from "./ModelViewer";
import FirstPersonCamera from "./FirstPersonCamera";
import "./CampusViewerPage.css";

import { publicUrl } from "../../config/api";

function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="loader-box">
        Đang tải mô hình... {progress.toFixed(0)}%
      </div>
    </Html>
  );
}

function VRLocomotion({ active, speed = 3, camRef, resetToken }) {
  const { gl, camera } = useThree();
  const forward = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());
  const up = useRef(new THREE.Vector3(0, 1, 0));
  const lastSnap = useRef(0);
  const lastLog = useRef(0);
  const baseRefSpace = useRef(null);
  const offset = useRef(new THREE.Vector3(0, 0, 0));
  const yawOffset = useRef(0);

  useEffect(() => {
    baseRefSpace.current = null;
    offset.current.set(0, 0, 0);
    yawOffset.current = 0;
  }, [resetToken]);

  const pickPadAxes = (pads, prefer) => {
    if (!pads || pads.length === 0) return null;
    const pad = prefer === "right" ? pads[1] || pads[0] : pads[0];
    if (!pad || !pad.axes) return null;
    const axes = Array.from(pad.axes);
    return axes;
  };

  useFrame((_, delta) => {
    if (!active) return;
    const session = gl.xr?.getSession?.();
    if (!session) return;

    // Some browsers/devices may not expose WebXR transforms
    if (typeof XRRigidTransform === "undefined") return;

    const sources = Array.from(session.inputSources || []).filter((s) => s && s.gamepad);
    const left = sources.find((s) => s.handedness === "left") || sources[0];
    const rightHand = sources.find((s) => s.handedness === "right");

    // Quest gamepad mapping: axes[2]/[3] for joysticks; fallback to 0/1 if needed
    const axes = left?.gamepad?.axes || [];
    let xAxis = axes[2] !== undefined ? axes[2] : axes[0] || 0; // left/right
    let yAxis = axes[3] !== undefined ? axes[3] : axes[1] || 0; // forward/back

    // Fallback: navigator.getGamepads (thường hoạt động với Quest Link)
    if (xAxis === 0 && yAxis === 0) {
      const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
      const gpAxes = pickPadAxes(pads, "left");
      if (gpAxes && gpAxes.length >= 2) {
        xAxis = gpAxes[2] !== undefined ? gpAxes[2] : gpAxes[0] || 0;
        yAxis = gpAxes[3] !== undefined ? gpAxes[3] : gpAxes[1] || 0;
      }
    }

    const deadZone = 0.15;
    if (Math.abs(xAxis) < deadZone) xAxis = 0;
    if (Math.abs(yAxis) < deadZone) yAxis = 0;
    if (xAxis === 0 && yAxis === 0) {
      // even if not moving, still allow snap turn below
    }

    // Lấy heading từ camera XR hiện tại (bám theo hướng nhìn thực) + snap yaw
    const xrCam = gl.xr?.getCamera?.(camRef?.current || camera)?.cameras?.[0]
      || gl.xr?.getCamera?.(camRef?.current || camera)
      || camRef?.current
      || camera;
    const camQuat = xrCam.quaternion;
    const yawQuat = new THREE.Quaternion().setFromAxisAngle(up.current, yawOffset.current);
    const headingQuat = new THREE.Quaternion().multiplyQuaternions(yawQuat, camQuat);
    forward.current.set(0, 0, -1).applyQuaternion(headingQuat);
    forward.current.y = 0;
    forward.current.normalize();
    right.current.crossVectors(up.current, forward.current).normalize().multiplyScalar(-1);

    // Move vector theo hướng nhìn (dựng trên heading hiện tại)
    if (xAxis !== 0 || yAxis !== 0) {
      const moveDir = new THREE.Vector3();
      moveDir.copy(forward.current).multiplyScalar(yAxis); // yAxis dương: tiến
      moveDir.addScaledVector(right.current, -xAxis); // đảo trục X để phải là phải
      const moveSpeed = speed * delta;
      offset.current.addScaledVector(moveDir, moveSpeed);
    }

    // Snap turn với tay phải (cập nhật yaw offset)
    if (rightHand?.gamepad?.axes?.length) {
      const rAxes = rightHand.gamepad.axes;
      const snapX = rAxes[2] !== undefined ? rAxes[2] : rAxes[0] || 0;
      const snapThreshold = 0.6;
      const now = performance.now() / 1000;
      const cooldown = 0.35; // seconds
      if (Math.abs(snapX) >= snapThreshold && now - lastSnap.current > cooldown) {
        const angle = (snapX > 0 ? -1 : 1) * (Math.PI / 4); // 45 degrees
        yawOffset.current += angle;
        lastSnap.current = now;
      }
    } else {
      // Fallback snap turn using standard gamepad
      const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
      const gpAxes = pickPadAxes(pads, "right");
      if (gpAxes && gpAxes.length) {
        const snapX = gpAxes[2] !== undefined ? gpAxes[2] : gpAxes[0] || 0;
        const snapThreshold = 0.6;
        const now = performance.now() / 1000;
        const cooldown = 0.35;
        if (Math.abs(snapX) >= snapThreshold && now - lastSnap.current > cooldown) {
          const angle = (snapX > 0 ? -1 : 1) * (Math.PI / 4);
          yawOffset.current += angle;
          lastSnap.current = now;
        }
      }
    }

    // Áp dụng offset + yaw vào reference space
    if (!baseRefSpace.current) {
      baseRefSpace.current = gl.xr.getReferenceSpace?.();
      if (!baseRefSpace.current) return;
    }
    const yawQuatRef = yawQuat;
    const offsetRef = baseRefSpace.current.getOffsetReferenceSpace(
      new XRRigidTransform(
        { x: offset.current.x, y: offset.current.y, z: offset.current.z },
        { x: yawQuatRef.x, y: yawQuatRef.y, z: yawQuatRef.z, w: yawQuatRef.w }
      )
    );
    gl.xr.setReferenceSpace(offsetRef);

    // Throttle log gamepad values to console (1/s) để debug khi không thấy HUD
    if (performance.now() - lastLog.current > 1000) {
      const summary = sources.map((s) => ({
        hand: s.handedness,
        axes: s.gamepad?.axes || [],
        buttons: (s.gamepad?.buttons || []).map((b) => b.value)
      }));
      const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
      const gpSummary = pads.map((p, idx) => ({
        idx,
        id: p.id,
        axes: p.axes || [],
        buttons: (p.buttons || []).map((b) => b.value)
      }));
      console.log("XR gamepads", summary, "navigator pads", gpSummary);
      lastLog.current = performance.now();
    }
  });

  return null;
}

function VRDebug({ active }) {
  const { gl } = useThree();
  const [info, setInfo] = useState("");

  useFrame(() => {
    if (!active) return;
    const session = gl.xr?.getSession?.();
    if (!session) return;
    const sources = Array.from(session.inputSources || []).filter((s) => s && s.gamepad);
    const lines = sources.map((s, idx) => {
      const axes = s.gamepad?.axes || [];
      const buttons = (s.gamepad?.buttons || []).map((b) => Math.round(b.value * 100) / 100);
      return `#${idx} ${s.handedness || "unknown"} axes:[${axes.map((a) => a.toFixed(2)).join(", ")}] buttons:[${buttons.join(",")}]`;
    });
    setInfo(lines.join(" | "));
  });

  if (!active) return null;

  return (
    <Html position={[0, 2, 0]} style={{ pointerEvents: "none" }}>
      <div style={{
        background: "rgba(0,0,0,0.6)",
        color: "#0f0",
        padding: "8px 12px",
        borderRadius: "8px",
        fontSize: "12px",
        maxWidth: "480px"
      }}>
        {info || "No XR gamepads detected"}
      </div>
    </Html>
  );
}

// Reset hook for VRLocomotion offsets
VRLocomotion.reset = () => {
  // these will be reinitialized in the next render cycle
};



export default function CampusViewerPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLocked, setIsLocked] = useState(false);
  const searchParams = new URLSearchParams(location.search);
  const wantsVR = searchParams.get("vr") === "1" || Boolean(location.state?.vr);
  const [isXRActive, setIsXRActive] = useState(false);
  const [isContextLost, setIsContextLost] = useState(false);
  const [vrResetToken, setVrResetToken] = useState(0);
  const glRef = useRef(null);
  const playerRef = useRef(null);
  const camRef = useRef(null);

  const campus = location.state?.campus;

  useEffect(() => {
    if (!campus) {
      navigate("/");
    }
  }, [campus, navigate]);

  const startVR = useCallback(async () => {
    const gl = glRef.current;
    if (!gl || !navigator.xr) {
      alert("Trinh duyet khong ho tro WebXR / VR");
      return;
    }
    if (isContextLost) {
      alert("WebGL context dang bi mat. Vui long tai lai trang roi thu VR lai.");
      return;
    }
    try {
      const session = await navigator.xr.requestSession("immersive-vr", {
        optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking"],
      });
      // Reset offset/yaw mỗi lần vào session mới
      setVrResetToken((t) => t + 1);
      session.addEventListener("end", () => setIsXRActive(false));
      session.addEventListener("inputsourceschange", (e) => {
        console.log("XR inputsourceschange", e.added, e.removed);
      });
      gl.xr.setSession(session);
      setIsXRActive(true);
      if (document.pointerLockElement) document.exitPointerLock();
      setIsLocked(false);
    } catch (err) {
      console.error("Start VR error:", err);
    }
  }, [isContextLost]);

  const stopVR = useCallback(() => {
    const session = glRef.current?.xr?.getSession?.();
    if (session) session.end();
  }, []);

  useEffect(() => {
    if (wantsVR && glRef.current) {
      const t = setTimeout(() => startVR(), 500);
      return () => clearTimeout(t);
    }
  }, [startVR, wantsVR]);

  useEffect(() => {
    return () => {
      stopVR();
    };
  }, [stopVR]);

  const handleBack = () => {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
    if (isXRActive) stopVR();
    setIsLocked(false);
    navigate("/", { state: { scrollTo: "campus" } });
  };

  if (!campus) return null;

  return (
    <div className="campus-viewer-container">
      {/* 1. Nút Quay lại (Góc trên trái) */}
      <div className="back-button-container">
        <button className="btn-back" onClick={handleBack}>
          <i className="bi bi-arrow-left"></i> Quay lại
        </button>
      </div>

      <div className="vr-button-container">
        <button className="vr-ui-button" onClick={isXRActive ? stopVR : startVR}>
          {isXRActive ? "THOAT VR" : "BAT DAU VR"}
        </button>
        <p className="vr-hint">Deo kinh roi bam VR. Trong VR: joystick de di chuyen, xoay dau de nhin.</p>
      </div>

      {/* 2. Bảng Hướng dẫn Điều khiển (Góc trên trái, dưới nút Back) */}
      <div className="controls-panel">
        <h4 className="controls-title">HƯỚNG DẪN</h4>
        
        {/* Nhóm Di chuyển */}
        <div className="control-group">
          <div className="keys-layout">
            <div className="key-row">
              <div className="key-cap">W</div>
            </div>
            <div className="key-row">
              <div className="key-cap">A</div>
              <div className="key-cap">S</div>
              <div className="key-cap">D</div>
            </div>
          </div>
          <span className="control-label">Di chuyển</span>
        </div>

        <div className="divider"></div>

        {/* Nhóm Nhìn */}
        <div className="control-group horizontal">
          <div className="icon-box"><i className="bi bi-mouse"></i></div>
          <span className="control-label">Xoay góc nhìn</span>
        </div>

        <div className="divider"></div>

        {/* Nhóm Thoát */}
        <div className="control-group horizontal">
          <div className="key-cap wide">ESC</div>
          <span className="control-label">Hiện con trỏ chuột</span>
        </div>
      </div>

      {/* 3. Man hinh Canvas 3D */}
      <div className="three-canvas-container">
        {/* Thong bao Click de bat dau (chi hien thi khi chua khoa chuot va chua vao VR) */}
        {!isLocked && !isXRActive && (
          <div className="start-prompt" onClick={() => setIsLocked(true)}>
            <div className="prompt-content">
              <i className="bi bi-cursor-fill"></i>
              <span>CLICK VAO MAN HINH DE BAT DAU</span>
            </div>
          </div>
        )}

        <Canvas
          shadows
          camera={{ position: [0, 2, 5], fov: 75 }}
          onClick={() => { if (!isXRActive) setIsLocked(true); }}
          onCreated={({ gl, camera: createdCamera }) => {
            glRef.current = gl;
            camRef.current = createdCamera;
            gl.xr.enabled = true;
            const canvas = gl.domElement;
            const handleLost = (e) => { e.preventDefault(); setIsContextLost(true); };
            const handleRestored = () => setIsContextLost(false);
            canvas.addEventListener("webglcontextlost", handleLost, false);
            canvas.addEventListener("webglcontextrestored", handleRestored, false);

            // Tạo player rig và gắn camera vào để di chuyển (cho cả VR và non-VR)
            const store = gl.__r3f?.store;
            const scene = gl.scene || store?.getState().scene;
            if (scene) {
              if (playerRef.current) {
                scene.remove(playerRef.current);
              }
              const player = new THREE.Group();
              player.position.set(0, 0, 5);
              playerRef.current = player;
              scene.add(player);
              player.add(createdCamera);
              createdCamera.position.set(0, 1.6, 0);
              createdCamera.rotation.set(0, 0, 0);
              player.updateMatrixWorld(true);
            }
          }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight
            castShadow
            position={[10, 20, 15]}
            intensity={1.5}
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          <Environment preset="park" background blur={0.5} />

          <Suspense fallback={<Loader />}>
            <ModelViewer modelUrl={publicUrl(campus.file_name)} />
          </Suspense>

          <VRLocomotion active={isXRActive} camRef={camRef} resetToken={vrResetToken} />
          <VRDebug active={isXRActive} />

          {!isXRActive && isLocked && (
            <PointerLockControls
              onUnlock={() => setIsLocked(false)}
            />
          )}
          <FirstPersonCamera active={!isXRActive && isLocked} playerRef={playerRef} />
        </Canvas>
      </div>
    </div>
  );
}
