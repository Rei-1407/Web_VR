import React, { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, useProgress, PointerLockControls, Environment } from "@react-three/drei";
import * as THREE from "three";
import ModelViewer from "./ModelViewer";
import FirstPersonCamera from "./FirstPersonCamera";
import "./CampusViewerPage.css";

import { apiUrl, publicUrl } from "../../config/api";

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

  // Cached vectors/quats (không cấp phát mỗi frame)
  const forward = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());
  const up = useRef(new THREE.Vector3(0, 1, 0));
  const moveDir = useRef(new THREE.Vector3());
  const yawQuat = useRef(new THREE.Quaternion());
  const headingQuat = useRef(new THREE.Quaternion());

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

  const DEAD_ZONE = 0.15;

  // Sprint + fly config (ổn định trên Quest)
  const SPRINT_MULT = 2.5; // giữ trigger phải để chạy nhanh
  const FLY_SPEED = 1.8;   // joystick phải trục Y để bay lên/xuống (unit/sec)

  const clampDeadZone = (v) => (Math.abs(v) < DEAD_ZONE ? 0 : v);

  const pickPad = (pads, prefer) => {
    if (!pads || pads.length === 0) return null;
    return prefer === "right" ? pads[1] || pads[0] : pads[0];
  };

  const getNavigatorPads = () =>
    navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];

  // Axes helper: ưu tiên mapping kiểu Quest (2/3), fallback (0/1)
  const readStick = (gamepad, prefer23 = true) => {
    const axes = gamepad?.axes || [];
    if (!axes.length) return { x: 0, y: 0 };
    const x = prefer23 && axes[2] !== undefined ? axes[2] : axes[0] || 0;
    const y = prefer23 && axes[3] !== undefined ? axes[3] : axes[1] || 0;
    return { x, y };
  };

  // Trigger helper: tìm nút có analog value (thường trigger)
  const isTriggerHeld = (gamepad) => {
    const btns = gamepad?.buttons || [];
    // trigger thường có value > 0 khi bóp
    return btns.some((b) => b && (b.value > 0.25 || b.pressed));
  };

  useFrame((_, deltaRaw) => {
    if (!active) return;

    const session = gl.xr?.getSession?.();
    if (!session) return;

    if (typeof XRRigidTransform === "undefined") return;

    // clamp delta để tránh teleport khi lag
    const delta = Math.min(deltaRaw, 0.05);

    const sources = Array.from(session.inputSources || []).filter((s) => s && s.gamepad);
    const leftSrc = sources.find((s) => s.handedness === "left") || sources[0];
    const rightSrc = sources.find((s) => s.handedness === "right") || sources[1];

    // ---- 1) Read left stick for movement (XZ) ----
    let { x: xAxis, y: yAxis } = readStick(leftSrc?.gamepad, true);

    // Fallback: navigator.getGamepads (Quest Link hay dùng)
    if (xAxis === 0 && yAxis === 0) {
      const pads = getNavigatorPads();
      const gp = pickPad(pads, "left");
      const stick = readStick(gp, true);
      xAxis = stick.x;
      yAxis = stick.y;
    }

    xAxis = clampDeadZone(xAxis);
    yAxis = clampDeadZone(yAxis);

    // ---- 2) Heading from XR camera + snap yaw ----
    const xrCam =
      gl.xr?.getCamera?.(camRef?.current || camera)?.cameras?.[0] ||
      gl.xr?.getCamera?.(camRef?.current || camera) ||
      camRef?.current ||
      camera;

    const camQuat = xrCam.quaternion;

    yawQuat.current.setFromAxisAngle(up.current, yawOffset.current);
    headingQuat.current.multiplyQuaternions(yawQuat.current, camQuat);

    forward.current.set(0, 0, -1).applyQuaternion(headingQuat.current);
    forward.current.y = 0;
    forward.current.normalize();
    right.current.crossVectors(up.current, forward.current).normalize().multiplyScalar(-1);

    // ---- 3) Sprint (trigger right) ----
    let sprintMul = 1;
    if (isTriggerHeld(rightSrc?.gamepad)) {
      sprintMul = SPRINT_MULT;
    } else {
      const pads = getNavigatorPads();
      const gpRight = pickPad(pads, "right");
      if (isTriggerHeld(gpRight)) sprintMul = SPRINT_MULT;
    }

    // ---- 4) Move XZ ----
    if (xAxis !== 0 || yAxis !== 0) {
      moveDir.current.copy(forward.current).multiplyScalar(yAxis);
      moveDir.current.addScaledVector(right.current, -xAxis);
      const moveSpeed = speed * sprintMul * delta;
      offset.current.addScaledVector(moveDir.current, moveSpeed);
    }

    // ---- 5) Snap turn with right stick X (giữ nguyên như bạn) ----
    let snapX = 0;
    if (rightSrc?.gamepad) {
      const r = readStick(rightSrc.gamepad, true);
      snapX = r.x;
    } else {
      const pads = getNavigatorPads();
      const gpRight = pickPad(pads, "right");
      const r = readStick(gpRight, true);
      snapX = r.x;
    }

    snapX = clampDeadZone(snapX);
    const snapThreshold = 0.6;
    const now = performance.now() / 1000;
    const cooldown = 0.35;
    if (Math.abs(snapX) >= snapThreshold && now - lastSnap.current > cooldown) {
      const angle = (snapX > 0 ? 1 : -1) * (Math.PI / 4);
      const x = offset.current.x;
      const z = offset.current.z;

      const c = Math.cos(-angle);
      const s = Math.sin(-angle);

      offset.current.x = x * c - z * s;
      offset.current.z = x * s + z * c;

      yawOffset.current += angle;
      lastSnap.current = now;
    }

    // ===== FLY UP / DOWN using X / Y buttons =====
    const leftGamepad = leftSrc?.gamepad || (navigator.getGamepads && navigator.getGamepads()[2]);

    if (leftGamepad && leftGamepad.buttons) { 
    const buttons = leftGamepad.buttons;
    const isXPressed = buttons[4]?.pressed; 
    const isYPressed = buttons[5]?.pressed;

    const FLY_SPEED = 1.6;

    if (isYPressed) {
      offset.current.y -= FLY_SPEED * delta;
    }

    if (isXPressed) {
      offset.current.y += FLY_SPEED * delta;
    }
  }
/*    const rightGamepad = rightSrc?.gamepad || (navigator.getGamepads && navigator.getGamepads()[1]);

    if (rightGamepad && rightGamepad.buttons) { 
    const buttons = rightGamepad.buttons;
    const isAPressed = buttons[4]?.pressed; 
    const isBPressed = buttons[5]?.pressed;

    const FLY_SPEED = 1.6;

    if (isAPressed) {
      offset.current.y -= FLY_SPEED * delta;
    }

    if (isBPressed) {
      offset.current.y += FLY_SPEED * delta;
    }
  }*/

    /* Đây là bay bằng joystick
    // ---- 6) Fly up/down: right stick Y ----
    // (Không dùng X/Y button để tránh mapping khác nhau)
    let flyAxis = 0;
    if (rightSrc?.gamepad) {
      const r = readStick(rightSrc.gamepad, true);
      flyAxis = r.y;
    } else {
      const pads = getNavigatorPads();
      const gpRight = pickPad(pads, "right");
      const r = readStick(gpRight, true);
      flyAxis = r.y;
    }

    flyAxis = clampDeadZone(flyAxis);
    if (flyAxis !== 0) {
      // đẩy stick lên -> y âm, nên đảo dấu để bay lên
      offset.current.y += flyAxis * FLY_SPEED * delta;

      // clamp độ cao để an toàn
      offset.current.y = Math.min(20, Math.max(-5, offset.current.y));
    }
    */
    // ---- 7) Apply offset + yaw into reference space ----
    if (!baseRefSpace.current) {
      baseRefSpace.current = gl.xr.getReferenceSpace?.();
      if (!baseRefSpace.current) return;
    }

    const q = yawQuat.current;
    const offsetRef = baseRefSpace.current.getOffsetReferenceSpace(
      new XRRigidTransform(
        { x: offset.current.x, y: offset.current.y, z: offset.current.z },
        { x: q.x, y: q.y, z: q.z, w: q.w }
      )
    );
    gl.xr.setReferenceSpace(offsetRef);

    // ---- 8) Optional debug log (giữ nguyên behavior, 1 lần/giây) ----
    if (performance.now() - lastLog.current > 1000) {
      const summary = sources.map((s) => ({
        hand: s.handedness,
        axes: s.gamepad?.axes || [],
        buttons: (s.gamepad?.buttons || []).map((b) => b.value),
      }));
      const pads = getNavigatorPads();
      const gpSummary = pads.map((p, idx) => ({
        idx,
        id: p.id,
        axes: p.axes || [],
        buttons: (p.buttons || []).map((b) => b.value),
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



export default function CampusViewerPage({ mode = "3d" }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [isLocked, setIsLocked] = useState(false);
  const [isXRActive, setIsXRActive] = useState(false);
  const [isContextLost, setIsContextLost] = useState(false);
  const [vrResetToken, setVrResetToken] = useState(0);
  const glRef = useRef(null);
  const playerRef = useRef(null);
  const camRef = useRef(null);

  const isVRPage = mode === "vr";

  const [campus, setCampus] = useState(location.state?.campus || null);

  useEffect(() => {
    if (location.state?.campus) setCampus(location.state.campus);
  }, [location.state]);

  useEffect(() => {
    let cancelled = false;
    if (campus) return;
    if (!id) {
      navigate("/");
      return;
    }

    fetch(apiUrl("api/campus"))
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (!Array.isArray(data)) {
          navigate("/");
          return;
        }
        const found = data.find((c) => String(c.id) === String(id));
        if (!found) {
          navigate("/");
          return;
        }
        setCampus(found);
      })
      .catch(() => {
        if (!cancelled) navigate("/");
      });

    return () => {
      cancelled = true;
    };
  }, [campus, id, navigate]);

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

    if (isVRPage && window.opener) {
      try {
        window.close();
        return;
      } catch {
        // fall back to navigate
      }
    }

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

      {isVRPage && (
        <div className="vr-button-container">
          <button className="vr-ui-button" onClick={isXRActive ? stopVR : startVR}>
            {isXRActive ? "Thoát chế độ VR" : "Bắt đầu chế độ VR"}
          </button>
          <p className="vr-hint">Kết nối với kính và controller để di chuyển. Sử dụng Joystick trái để di chuyển, Joystick phải để xoay góc nhìn.</p>
        </div>
      )}

      {/* 2. Bảng Hướng dẫn Điều khiển (Góc trên trái, dưới nút Back) */}
      {!isVRPage && (
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

        {/* Nhóm Bay (Q/E) */}
        <div className = "control-group horizontal">
          <div className = "key-cap">Q</div>
          <div className = "key-cap">E</div>
          <span className = "control-label">Bay xuống / Bay lên</span>
        </div>

        <div className = "divider"></div>

        {/* Nhóm tăng tốc (Shift) */}
        <div className = "control-group horizontal">
          <div className = "key-cap wide">SHIFT</div>
          <span className = "control-label">Tăng tốc</span>
        </div>

        <div className = "divider"></div>

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
      
      )}

      {/* 3. Man hinh Canvas 3D */}
      <div className="three-canvas-container">
        {/* Thong bao Click de bat dau (chi hien thi khi chua khoa chuot va chua vao VR) */}
        {!isVRPage && !isLocked && !isXRActive && (
          <div className="start-prompt" onClick={() => setIsLocked(true)}>
            <div className="prompt-content">
              <i className="bi bi-cursor-fill"></i>
              <span>CLICK VÀO MÀN HÌNH ĐỂ BẮT ĐẦU</span>
            </div>
          </div>
        )}

        <Canvas
          shadows
          camera={{ position: [0, 2, 5], fov: 75 }}
          className="r3f-canvas"
          gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
          onClick={() => { if (!isVRPage && !isXRActive) setIsLocked(true); }}
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
          {/* Hide debug overlay by default to avoid confusing the on-screen mirror */}
          {/* <VRDebug active={isXRActive} /> */}

          {!isVRPage && !isXRActive && isLocked && (
            <PointerLockControls
              onUnlock={() => setIsLocked(false)}
            />
          )}
          {!isVRPage && <FirstPersonCamera active={!isXRActive && isLocked} playerRef={playerRef} />}
        </Canvas>
      </div>
    </div>
  );
}