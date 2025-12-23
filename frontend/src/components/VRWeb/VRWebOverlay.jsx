import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Text, useGLTF, useProgress, useTexture } from "@react-three/drei";
import * as THREE from "three";

import "./VRWeb.css";
import { apiUrl, publicUrl } from "../../config/api";
import SliderFallbackImg from "../../assets/images/slider/slider1.jpg";

const HISTORY_FALLBACK = [
  { id: 1, year_date: "07/09/1953", title: "Thành lập Đại học Bưu điện – Vô tuyến điện", description: "Tiền thân của Học viện ngày nay.", image: "moc-1.jpg" },
  { id: 2, year_date: "17/09/1966", title: "Thành lập Viện Khoa học Kỹ thuật Bưu điện RIPT", description: "", image: "moc-2.jpg" },
  { id: 3, year_date: "08/04/1975", title: "Thành lập Viện Kinh tế Bưu điện ERIPT", description: "", image: "moc-3.jpg" },
  { id: 4, year_date: "28/05/1988", title: "Thành lập Trung tâm Đào tạo BCVT II (PTTC2)", description: "", image: "moc-4.jpg" },
  { id: 5, year_date: "11/07/1997", title: "Thành lập Học viện Công nghệ Bưu chính Viễn thông", description: "Sắp xếp lại 4 đơn vị: PTTC1, PTTC2, Viện KHKT Bưu điện, Viện Kinh tế Bưu điện.", image: "moc-5.jpg" },
  { id: 6, year_date: "17/09/1997", title: "Công bố Quyết định thành lập", description: "Chính thức ra mắt Học viện Công nghệ BCVT.", image: "moc-6.jpg" },
  { id: 7, year_date: "22/03/1999", title: "Thành lập Trung tâm CDIT", description: "Trung tâm Công nghệ thông tin trực thuộc Học viện.", image: "moc-7.jpg" },
  { id: 8, year_date: "01/07/2014", title: "Chuyển về Bộ Thông tin và Truyền thông", description: "Điều chuyển từ Tập đoàn VNPT về Bộ TTTT, tự chủ tài chính.", image: "moc-8.jpg" },
  { id: 9, year_date: "27/02/2025", title: "Quy hoạch trở thành ĐH trọng điểm Quốc gia", description: "Theo Quyết định số 452/QĐ-TTg của Thủ tướng Chính phủ.", image: "moc-9.jpg" },
];

function resolveVrApiBase() {
  // Important: In Quest Browser, "localhost" points to the headset, not your PC.
  // Normal site can stay on localhost; VR overlay rewrites base ONLY when needed.
  try {
    const base = new URL(apiUrl(""));
    const host = window.location.hostname;
    const isLocalSite = host === "localhost" || host === "127.0.0.1";
    const isLocalApi = base.hostname === "localhost" || base.hostname === "127.0.0.1";
    if (!isLocalSite && isLocalApi) {
      return `${window.location.protocol}//${host}:5000`;
    }
    return base.origin;
  } catch {
    return apiUrl("");
  }
}

function vrApiUrl(path) {
  const base = String(resolveVrApiBase() || "").replace(/\/+$/, "");
  if (!path) return base;
  return `${base}/${String(path).replace(/^\/+/, "")}`;
}

function vrPublicUrl(filePath) {
  // Use publicUrl() when in local dev on PC; rewrite in headset/ip usage.
  return vrApiUrl(`public/${String(filePath || "").replace(/^\/+/, "")}`);
}

function mergeHistoryWithFallback(list) {
  const base = Array.isArray(list) ? list : [];
  const keyOf = (item) => `${item?.year_date || ""}__${item?.title || ""}`.toLowerCase();
  const existing = new Set(base.map(keyOf));
  const missing = HISTORY_FALLBACK.filter((item) => !existing.has(keyOf(item)));
  return [...base, ...missing];
}

function VRImagePlane({ url, width = 1.05, height = 0.32, position = [0, 0.17, 0.01] }) {
  const texture = useTexture(url);
  useEffect(() => {
    if (!texture) return;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
  }, [texture]);

  return (
    <mesh position={position}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

function VRLogoPlane({ url, size = 0.14, position = [0, 0, 0.01] }) {
  const texture = useTexture(url);
  useEffect(() => {
    if (!texture) return;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
  }, [texture]);

  return (
    <mesh position={position}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial map={texture} toneMapped={false} transparent />
    </mesh>
  );
}

// Auto-fit logo plane that preserves aspect ratio while fitting inside max width/height.
function VRLogoPlaneAutoFit({ url, maxWidth = 0.32, maxHeight = 0.12, position = [0, 0, 0.01] }) {
  const texture = useTexture(url);
  const [size, setSize] = useState({ w: maxWidth, h: maxHeight });

  useEffect(() => {
    if (!texture) return;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;

    const img = texture.image;
    if (!img || !img.width || !img.height) return;
    const aspect = img.width / img.height;
    let w = maxWidth;
    let h = w / aspect;
    if (h > maxHeight) {
      h = maxHeight;
      w = h * aspect;
    }
    setSize({ w, h });
  }, [texture, maxWidth, maxHeight]);

  return (
    <mesh position={position}>
      <planeGeometry args={[size.w, size.h]} />
      <meshBasicMaterial map={texture} toneMapped={false} transparent />
    </mesh>
  );
}

// NOTE: This overlay is intentionally self-contained.
// Normal (non-VR) site UI must remain untouched.

function Loader() {
  const { progress } = useProgress();
  return (
    <group position={[0, 1.6, -1]}>
      <Text
        fontSize={0.06}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        {`Đang tải... ${progress.toFixed(0)}%`}
      </Text>
    </group>
  );
}

function useXRInputs() {
  const { gl } = useThree();

  const getSources = () => {
    const session = gl.xr?.getSession?.();
    if (!session) return [];
    return Array.from(session.inputSources || []).filter(Boolean);
  };

  const getGamepadSource = (handedness) => {
    const sources = getSources().filter((s) => s.gamepad);
    if (!sources.length) return null;
    const exact = sources.find((s) => s.handedness === handedness);
    return exact || sources[0];
  };

  const readAxes = (source) => {
    const axes = source?.gamepad?.axes ? Array.from(source.gamepad.axes) : [];
    // Quest mapping often uses 2/3, but fall back to 0/1.
    const x = axes[2] !== undefined ? axes[2] : axes[0] || 0;
    const y = axes[3] !== undefined ? axes[3] : axes[1] || 0;
    return { x, y };
  };

  const readButtonPressed = (source, index) => {
    const b = source?.gamepad?.buttons?.[index];
    return !!b && (b.pressed || b.value > 0.5);
  };

  return { getGamepadSource, readAxes, readButtonPressed };
}

function VRLocomotion({ active, speed = 3, camRef, resetToken }) {
  const { gl, camera } = useThree();
  const forward = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());
  const up = useRef(new THREE.Vector3(0, 1, 0));
  const lastSnap = useRef(0);
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
    return Array.from(pad.axes);
  };

  useFrame((_, delta) => {
    if (!active) return;
    const session = gl.xr?.getSession?.();
    if (!session) return;
    if (typeof XRRigidTransform === "undefined") return;

    const sources = Array.from(session.inputSources || []).filter((s) => s && s.gamepad);
    const left = sources.find((s) => s.handedness === "left") || sources[0];
    const rightHand = sources.find((s) => s.handedness === "right");

    const axes = left?.gamepad?.axes || [];
    let xAxis = axes[2] !== undefined ? axes[2] : axes[0] || 0;
    let yAxis = axes[3] !== undefined ? axes[3] : axes[1] || 0;

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

    const xrCam =
      gl.xr?.getCamera?.(camRef?.current || camera)?.cameras?.[0] ||
      gl.xr?.getCamera?.(camRef?.current || camera) ||
      camRef?.current ||
      camera;

    const camQuat = xrCam.quaternion;
    const yawQuat = new THREE.Quaternion().setFromAxisAngle(up.current, yawOffset.current);
    const headingQuat = new THREE.Quaternion().multiplyQuaternions(yawQuat, camQuat);

    forward.current.set(0, 0, -1).applyQuaternion(headingQuat);
    forward.current.y = 0;
    forward.current.normalize();
    right.current.crossVectors(up.current, forward.current).normalize().multiplyScalar(-1);

    if (xAxis !== 0 || yAxis !== 0) {
      const moveDir = new THREE.Vector3();
      moveDir.copy(forward.current).multiplyScalar(yAxis);
      moveDir.addScaledVector(right.current, -xAxis);
      const moveSpeed = speed * delta;
      offset.current.addScaledVector(moveDir, moveSpeed);
    }

    if (rightHand?.gamepad?.axes?.length) {
      const rAxes = rightHand.gamepad.axes;
      const snapX = rAxes[2] !== undefined ? rAxes[2] : rAxes[0] || 0;
      const snapThreshold = 0.6;
      const now = performance.now() / 1000;
      const cooldown = 0.35;
      if (Math.abs(snapX) >= snapThreshold && now - lastSnap.current > cooldown) {
        const angle = (snapX > 0 ? 1 : -1) * (Math.PI / 4);
        yawOffset.current += angle;
        lastSnap.current = now;
      }
    } else {
      const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
      const gpAxes = pickPadAxes(pads, "right");
      if (gpAxes && gpAxes.length) {
        const snapX = gpAxes[2] !== undefined ? gpAxes[2] : gpAxes[0] || 0;
        const snapThreshold = 0.6;
        const now = performance.now() / 1000;
        const cooldown = 0.35;
        if (Math.abs(snapX) >= snapThreshold && now - lastSnap.current > cooldown) {
          const angle = (snapX > 0 ? 1 : -1) * (Math.PI / 4);
          yawOffset.current += angle;
          lastSnap.current = now;
        }
      }
    }

    if (!baseRefSpace.current) {
      baseRefSpace.current = gl.xr.getReferenceSpace?.();
      if (!baseRefSpace.current) return;
    }

    const offsetRef = baseRefSpace.current.getOffsetReferenceSpace(
      new XRRigidTransform(
        { x: offset.current.x, y: offset.current.y, z: offset.current.z },
        { x: yawQuat.x, y: yawQuat.y, z: yawQuat.z, w: yawQuat.w }
      )
    );
    gl.xr.setReferenceSpace(offsetRef);
  });

  return null;
}

function FollowHeadset({ enabled, targetRef, distance = 1.0, height = 1.45 }) {
  const { gl, camera } = useThree();
  const tmpForward = useRef(new THREE.Vector3());
  const tmpPos = useRef(new THREE.Vector3());
  const tmpQuat = useRef(new THREE.Quaternion());
  const tmpEuler = useRef(new THREE.Euler());

  useFrame(() => {
    if (!enabled) return;
    const g = targetRef?.current;
    if (!g) return;

    const xrCam = gl.xr?.getCamera?.(camera);
    const headCam = xrCam?.cameras?.[0] || xrCam || camera;

    headCam.getWorldPosition(tmpPos.current);
    headCam.getWorldQuaternion(tmpQuat.current);

    tmpForward.current.set(0, 0, -1).applyQuaternion(tmpQuat.current);
    tmpForward.current.y = 0;
    if (tmpForward.current.lengthSq() < 1e-6) tmpForward.current.set(0, 0, -1);
    tmpForward.current.normalize();

    g.position.copy(tmpPos.current).addScaledVector(tmpForward.current, distance);
    g.position.y = height;

    tmpEuler.current.setFromQuaternion(tmpQuat.current, "YXZ");
    g.rotation.set(0, tmpEuler.current.y, 0);
  });

  return null;
}

function PanelButton({ label, position, onHoverChange, onSelect, hovered }) {
  return (
    <group position={position}>
      <mesh
        onPointerOver={() => onHoverChange(true)}
        onPointerOut={() => onHoverChange(false)}
        onClick={onSelect}
      >
        <planeGeometry args={[0.6, 0.12]} />
        <meshBasicMaterial color={hovered ? "#00ffff" : "#2b2b44"} />
      </mesh>
      <Text
        position={[0, 0, 0.01]}
        fontSize={0.045}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        maxWidth={0.55}
      >
        {label}
      </Text>
    </group>
  );
}

function useRaycastInteractor({ enabled, targetsRef, onSelect }) {
  const { gl, camera, scene } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const tempMatrix = useMemo(() => new THREE.Matrix4(), []);
  const hoverRef = useRef(null);

  // Build controllers
  const controllerGrip0 = useRef();
  const controllerGrip1 = useRef();
  const controller0 = useRef();
  const controller1 = useRef();

  useEffect(() => {
    if (!gl?.xr) return;

    const c0 = gl.xr.getController(0);
    const c1 = gl.xr.getController(1);
    controller0.current = c0;
    controller1.current = c1;

    const g0 = gl.xr.getControllerGrip(0);
    const g1 = gl.xr.getControllerGrip(1);
    controllerGrip0.current = g0;
    controllerGrip1.current = g1;

    // Ensure controllers live in the scene graph so attached rays render.
    scene?.add(c0);
    scene?.add(c1);
    scene?.add(g0);
    scene?.add(g1);

    // Tag controllers with handedness when connected.
    const onConnected = (controller) => (e) => {
      controller.userData.handedness = e?.data?.handedness;
    };
    const onDisconnected = (controller) => () => {
      controller.userData.handedness = undefined;
    };

    const c0Connected = onConnected(c0);
    const c1Connected = onConnected(c1);
    const c0Disconnected = onDisconnected(c0);
    const c1Disconnected = onDisconnected(c1);

    c0.addEventListener("connected", c0Connected);
    c1.addEventListener("connected", c1Connected);
    c0.addEventListener("disconnected", c0Disconnected);
    c1.addEventListener("disconnected", c1Disconnected);

    const tintRay = (ray, color) => {
      ray?.traverse?.((child) => {
        if (child.material?.color) child.material.color.setHex(color);
        if (child.material) {
          child.material.opacity = 0.98;
          child.material.transparent = true;
          child.material.depthTest = false;
          child.material.depthWrite = false;
        }
      });
      ray.renderOrder = 999;
    };

    // Attach bright, always-visible rays with a cone tip for clarity.
    const makeRay = (color) => {
      const ray = new THREE.Group();
      ray.frustumCulled = false;
      ray.renderOrder = 999;

      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -1),
      ]);
      const material = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.98,
        depthTest: false,
        depthWrite: false,
      });
      const line = new THREE.Line(geometry, material);
      line.name = "xr-ray";
      // Shorter beam; matches only the arrow length.
      line.scale.z = 2;
      line.frustumCulled = false;
      ray.add(line);

      const tip = new THREE.Mesh(
        new THREE.ConeGeometry(0.013, 0.08, 16),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.98,
          depthTest: false,
          depthWrite: false,
        })
      );
      // Place the cone tip at the end of the shortened beam.
      tip.position.z = -2.02;
      tip.rotation.x = -Math.PI / 2;
      tip.frustumCulled = false;
      ray.add(tip);

      tintRay(ray, color);
      return ray;
    };

    c0.userData.rayLine = makeRay(0x00fff0);
    c1.userData.rayLine = makeRay(0x00fff0);
    c0.add(c0.userData.rayLine);
    c1.add(c1.userData.rayLine);

    const handleSelect = (event) => {
      if (!enabled) return;
      const controller = event.target;
      const hit = intersect(controller);
      if (hit && hit.object) {
        onSelect?.(hit.object);
      }
    };

    c0.addEventListener("select", handleSelect);
    c1.addEventListener("select", handleSelect);

    return () => {
      scene?.remove(c0);
      scene?.remove(c1);
      scene?.remove(g0);
      scene?.remove(g1);
      c0.removeEventListener("select", handleSelect);
      c1.removeEventListener("select", handleSelect);
      c0.removeEventListener("connected", c0Connected);
      c1.removeEventListener("connected", c1Connected);
      c0.removeEventListener("disconnected", c0Disconnected);
      c1.removeEventListener("disconnected", c1Disconnected);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, enabled, onSelect]);

  const intersect = (controller) => {
    const targets = targetsRef?.current || [];
    if (!controller || targets.length === 0) return null;

    // Unlimited reach: always allow hits regardless of visible beam length.
    raycaster.far = Infinity;
    raycaster.near = 0.01;

    tempMatrix.identity().extractRotation(controller.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

    const hits = raycaster.intersectObjects(targets, true);
    return hits[0] || null;
  };

  useFrame(() => {
    if (!enabled) return;

    const c0 = controller0.current;
    const c1 = controller1.current;
    const rightController =
      [c0, c1].find((c) => c?.userData?.handedness === "right") || c1 || c0;

    const setRayVisual = (ray, isActive) => {
      const activeColor = 0x00fff0;
      const inactiveColor = 0x4b5563;
      ray.visible = true;
      ray.renderOrder = 999;
      ray.traverse?.((child) => {
        if (child.material?.color) child.material.color.setHex(isActive ? activeColor : inactiveColor);
        if (child.material?.opacity !== undefined) child.material.opacity = isActive ? 0.98 : 0.65;
        if (child.material) {
          child.material.transparent = true;
          child.material.depthTest = false;
          child.material.depthWrite = false;
        }
        child.renderOrder = 999;
        child.frustumCulled = false;
      });
    };

    if (c0?.userData?.rayLine) {
      const active = c0 === rightController;
      setRayVisual(c0.userData.rayLine, active);
    }
    if (c1?.userData?.rayLine) {
      const active = c1 === rightController;
      setRayVisual(c1.userData.rayLine, active);
    }

    const c = rightController;
    if (!c) return;

    const hit = intersect(c);
    const hoveredObj = hit?.object || null;

    if (hoveredObj !== hoverRef.current) {
      // clear previous hover
      if (hoverRef.current) {
        hoverRef.current.userData.__vrHovered = false;
      }
      if (hoveredObj) {
        hoveredObj.userData.__vrHovered = true;
      }
      hoverRef.current = hoveredObj;
    }
  });

  return { controllerGrip0, controllerGrip1 };
}

function CampusPreviewModel({ modelUrl, active, onRotateRequest }) {
  const groupRef = useRef();
  const { scene } = useGLTF(modelUrl);

  useEffect(() => {
    if (!groupRef.current) return;
    groupRef.current.rotation.set(0, 0, 0);
  }, [modelUrl]);

  useFrame(() => {
    if (!active) return;
    if (!groupRef.current) return;

    const deltaYaw = onRotateRequest?.() || 0;
    if (deltaYaw !== 0) {
      groupRef.current.rotation.y += deltaYaw;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={scene} scale={0.22} position={[0, -0.35, 0]} />
    </group>
  );
}

function VRTourModel({ modelUrl }) {
  const { scene } = useGLTF(modelUrl);
  return <primitive object={scene} scale={0.8} position={[0, -5, 0]} />;
}

export default function VRWebOverlay({ open, session, onRequestExit }) {
  const [campuses, setCampuses] = useState([]);
  const [intro, setIntro] = useState([]);
  const [history, setHistory] = useState(HISTORY_FALLBACK);
  const [achievements, setAchievements] = useState([]);
  const [partners, setPartners] = useState([]);
  const [activeSection, setActiveSection] = useState("intro");

  const [apiBase, setApiBase] = useState("");
  const [loadErrors, setLoadErrors] = useState({});

  const [state, setState] = useState("scroll"); // scroll | campus | tour
  const [selectedCampusIndex, setSelectedCampusIndex] = useState(0);

  const overlayRef = useRef(null);
  const stateHistoryRef = useRef([]);

  useEffect(() => {
    if (!open) return;
    const base = resolveVrApiBase();
    setApiBase(base);
    setLoadErrors({});

    const fetchList = async (path, setter, key) => {
      try {
        const res = await fetch(vrApiUrl(path));
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const data = await res.json();
        if (!Array.isArray(data)) {
          throw new Error("Response is not an array");
        }
        if (key === "history") {
          setter(mergeHistoryWithFallback(data));
        } else {
          setter(data);
        }
      } catch (err) {
        console.error(`VR fetch failed: ${path}`, err);
        setLoadErrors((prev) => ({
          ...prev,
          [key]: String(err?.message || err || "Unknown error"),
        }));
        if (key === "history") {
          setter(HISTORY_FALLBACK);
        } else {
          setter([]);
        }
      }
    };

    // Fetch campus list only when VR opens
    fetchList("api/campus", setCampuses, "campus");
    fetchList("api/intro", setIntro, "intro");
    fetchList("api/history", setHistory, "history");
    fetchList("api/achievements", setAchievements, "achievements");
    fetchList("api/partners", setPartners, "partners");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setState("scroll");
    setSelectedCampusIndex(0);
    setActiveSection("intro");
    stateHistoryRef.current = [];
  }, [open]);

  const transitionState = useCallback((next) => {
    setState((prev) => {
      const resolved = typeof next === "function" ? next(prev) : next;
      if (!resolved || resolved === prev) return prev;
      stateHistoryRef.current.push(prev);
      return resolved;
    });
  }, []);

  const goBackState = useCallback(() => {
    if (stateHistoryRef.current.length === 0) return false;
    const prevState = stateHistoryRef.current.pop();
    setState(prevState);
    return true;
  }, []);

  if (!open) return null;

  const selectedCampus = campuses[selectedCampusIndex] || null;

  return (
    <div className="vr-overlay" ref={overlayRef}>
      <div className="vr-overlay__canvas">
        <Canvas
          shadows
          camera={{ position: [0, 1.6, 2], fov: 70 }}
          gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
          onCreated={({ gl, camera }) => {
            gl.xr.enabled = true;
            if (session) {
              gl.xr.setSession(session);
            }
            gl.setClearColor(new THREE.Color("#101019"), 1);
            // avoid scroll or keyboard events bleeding through
            gl.domElement.style.touchAction = "none";
          }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight castShadow position={[8, 12, 8]} intensity={1.3} />
          <Environment preset="park" blur={0.6} />

          <Suspense fallback={<Loader />}>
            <VRScene
              campuses={campuses}
              intro={intro}
              history={history}
              achievements={achievements}
              partners={partners}
              apiBase={apiBase}
              loadErrors={loadErrors}
              selectedCampusIndex={selectedCampusIndex}
              setSelectedCampusIndex={setSelectedCampusIndex}
              selectedCampus={selectedCampus}
              state={state}
              setState={transitionState}
              activeSection={activeSection}
              setActiveSection={setActiveSection}
              goBack={goBackState}
              onRequestExit={onRequestExit}
            />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}

function VRScene({
  campuses,
  intro,
  history,
  achievements,
  partners,
  apiBase,
  loadErrors,
  selectedCampusIndex,
  setSelectedCampusIndex,
  selectedCampus,
  state,
  setState: setStateWithHistory,
  activeSection,
  setActiveSection,
  goBack,
  onRequestExit,
}) {
  const { gl, camera } = useThree();
  const { getGamepadSource, readAxes, readButtonPressed } = useXRInputs();

  const uiRef = useRef();
  const uiRightRef = useRef();
  const uiHintsRef = useRef();
  const targetsRef = useRef([]);
  const camRef = useRef(camera);
  const vrResetToken = useRef(0);

  // Fixed anchors so UI/hints stay in place instead of following the headset.
  const zDistance = -2.0; // 200cm in front of the user
  const uiAnchorLeft = useMemo(() => new THREE.Vector3(-0.6, 1.45, zDistance), [zDistance]);
  const uiAnchorRight = useMemo(() => new THREE.Vector3(0.6, 1.45, zDistance), [zDistance]);
  // Hint stack: 10cm further right, 60cm closer to user than nav/content
  const uiAnchorHints = useMemo(() => new THREE.Vector3(1.9, 1.45, zDistance + 0.6), [zDistance]);
  const lookTarget = useMemo(() => new THREE.Vector3(0, 1.45, 0), []);

  useEffect(() => {
    if (!uiRef.current) return;
    uiRef.current.position.copy(uiAnchorLeft);
    uiRef.current.lookAt(lookTarget);
  }, [uiAnchorLeft, lookTarget]);

  useEffect(() => {
    if (!uiRightRef.current) return;
    uiRightRef.current.position.copy(uiAnchorRight);
    uiRightRef.current.lookAt(lookTarget);
  }, [uiAnchorRight, lookTarget]);

  useEffect(() => {
    if (!uiHintsRef.current) return;
    uiHintsRef.current.position.copy(uiAnchorHints);
    uiHintsRef.current.lookAt(lookTarget);
  }, [uiAnchorHints, lookTarget]);

  const lastStep = useRef(0);
  const lastBack = useRef(false);
  const lastNavStep = useRef(0);

  // Scroll position for the content panel
  const scrollOffset = useRef(0);

  const [scrollHint, setScrollHint] = useState("Joystick trái lên/xuống để cuộn.");

  const [modelRotateHeld, setModelRotateHeld] = useState(false);
  const modelRotateBaseQuat = useRef(new THREE.Quaternion());
  const modelRotateLastYaw = useRef(0);

  const selectable = useMemo(() => {
    const list = [];
    const push = (mesh, key) => {
      if (!mesh) return;
      mesh.userData.__vrKey = key;
      list.push(mesh);
    };
    return { list, push };
  }, []);

  // Keep targetsRef up to date every render (list object is stable, contents mutate).
  useEffect(() => {
    targetsRef.current = selectable.list;
  });

  const onRaySelect = (obj) => {
    // Walk up to find a mesh with __vrKey
    let cur = obj;
    while (cur && !cur.userData?.__vrKey) cur = cur.parent;
    const key = cur?.userData?.__vrKey;
    if (!key) return;

    if (key === "nav:intro") setActiveSection("intro");
    if (key === "nav:history") setActiveSection("history");
    if (key === "nav:achievements") setActiveSection("achievements");
    if (key === "nav:partners") setActiveSection("partners");
    if (key === "nav:campus") setActiveSection("campus");

    if (key?.startsWith("campus:card:")) {
      const idxFromKey = Number(String(key).split(":").pop());
      const idxFromMesh = Number(cur?.userData?.__campusIdx);
      const preferred = Number.isFinite(idxFromMesh) ? idxFromMesh : idxFromKey;
      const safeIdx = Number.isFinite(preferred)
        ? Math.min(Math.max(0, preferred), Math.max(0, campuses.length - 1))
        : 0;
      setSelectedCampusIndex(safeIdx);
      setActiveSection("campus");
      setStateWithHistory("tour");
      vrResetToken.current += 1;
      return;
    }

    if (key === "campus:next") {
      setSelectedCampusIndex((i) => Math.min(campuses.length - 1, i + 1));
      return;
    }

    if (key === "campus:prev") {
      setSelectedCampusIndex((i) => Math.max(0, i - 1));
      return;
    }

    if (key === "campus:enter") {
      if (!selectedCampus) return;
      setStateWithHistory("tour");
      vrResetToken.current += 1;
      return;
    }
  };

  useRaycastInteractor({
    enabled: true,
    targetsRef,
    onSelect: onRaySelect,
  });

  // Controller bindings:
  // - B (right controller) back/exit
  // - Left joystick: move between nav items (fallback to right if left missing)
  // - Right joystick: scroll content (fallback to left if right missing)
  useFrame((_, delta) => {
    const left = getGamepadSource("left");
    const right = getGamepadSource("right");

    const axesWithFallback = (prefer, alt) => {
      const src = getGamepadSource(prefer) || getGamepadSource(alt);
      const { x, y } = readAxes(src);
      if (src) return { x, y };
      const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
      const pad = prefer === "left" ? pads[0] || pads[1] : pads[1] || pads[0];
      if (!pad) return { x: 0, y: 0 };
      const ax = pad.axes || [];
      const gx = ax[2] !== undefined ? ax[2] : ax[0] || 0;
      const gy = ax[3] !== undefined ? ax[3] : ax[1] || 0;
      return { x: gx, y: gy };
    };

    // Back button (B) handling: once from tour->lobby/campus, then from lobby/campus -> exit session
    // Oculus mapping: right controller buttons[1] is commonly B.
    const bPressed = readButtonPressed(right, 1) || readButtonPressed(right, 5);
    if (bPressed && !lastBack.current) {
      if (state === "tour") {
        vrResetToken.current += 1;
      }
      const wentBack = goBack?.();
      if (!wentBack) {
        onRequestExit?.();
      }
    }
    lastBack.current = bPressed;

    // Nav step with left stick; scroll with right stick (falls back to left when not stepping nav)
    if (state === "scroll") {
      const { y: ly } = axesWithFallback("left", "right");
      const { y: ry } = axesWithFallback("right", "left");
      const deadZoneNav = 0.35;
      const deadZoneScroll = 0.15;
      const now = performance.now();

      let navTriggered = false;
      if (Math.abs(ly) > deadZoneNav && now - lastNavStep.current > 250) {
        const order = ["intro", "history", "achievements", "partners", "campus"];
        const idx = order.indexOf(activeSection);
        const dir = ly > 0 ? 1 : -1; // down (positive) moves to next item
        const next = Math.min(order.length - 1, Math.max(0, idx + dir));
        if (next !== idx) setActiveSection(order[next]);
        lastNavStep.current = now;
        scrollOffset.current = 0;
        navTriggered = true;
      }

      const useRy = Math.abs(ry) > deadZoneScroll ? ry : 0;
      const useLy = !navTriggered && useRy === 0 && Math.abs(ly) > deadZoneScroll ? ly : 0;
      const vy = useRy !== 0 ? useRy : useLy;

      if (vy !== 0) {
        const speed = 0.65; // meters per second
        scrollOffset.current = Math.max(0, scrollOffset.current + vy * speed * delta);
      }
    }

    // Model rotate "by controller": hold trigger to rotate (right trigger index 0 on many controllers)
    // This is a simple yaw rotate; user holds trigger and twists the controller.
    const triggerPressed = readButtonPressed(right, 0);
    if (state === "campus") {
      if (triggerPressed && !modelRotateHeld) {
        setModelRotateHeld(true);
        modelRotateBaseQuat.current.set(0, 0, 0, 1);
        modelRotateLastYaw.current = 0;
      }
      if (!triggerPressed && modelRotateHeld) {
        setModelRotateHeld(false);
      }

      if (modelRotateHeld) {
        // Use right controller pose yaw delta if available
        const session = gl.xr?.getSession?.();
        const source = Array.from(session?.inputSources || []).find((s) => s.handedness === "right");
        const gripSpace = source?.gripSpace;
        // If gripSpace exists we can estimate yaw using XRFrame, but r3f doesn't expose XRFrame here.
        // Fallback: rotate using right joystick x axis.
      }
    }
  });

  // Hint text switches based on state
  useEffect(() => {
    scrollOffset.current = 0;
    if (state === "scroll") setScrollHint("Joystick phải (hoặc trái) lên/xuống để cuộn nội dung. Joystick trái đổi mục.");
    if (state === "campus") setScrollHint("Chọn cơ sở. Xoay model bằng joystick phải.");
    if (state === "tour") setScrollHint("Tham quan VR. Joystick trái: di chuyển. Joystick phải: xoay.");
  }, [state, activeSection]);

  const rotateRequest = () => {
    // Fallback rotate by right joystick X (simple and reliable)
    const right = getGamepadSource("right");
    const { x } = readAxes(right);
    const dead = 0.12;
    const v = Math.abs(x) < dead ? 0 : x;
    return v * 0.04;
  };

  const buildTargets = (mesh, key) => {
    if (!mesh) return;
    mesh.userData.__vrKey = key;
    selectable.list.push(mesh);
  };

  // Reset targets list every render pass
  selectable.list.length = 0;

  return (
    <>
      {state === "scroll" && (
        <>
          <group ref={uiRef} position={[uiAnchorLeft.x, uiAnchorLeft.y, uiAnchorLeft.z]} rotation={[0, 0, 0]}>
            <VRNavPanel activeSection={activeSection} setActiveSection={setActiveSection} buildTargets={buildTargets} />
          </group>

          <group ref={uiRightRef} position={[uiAnchorRight.x, uiAnchorRight.y, uiAnchorRight.z]} rotation={[0, 0, 0]}>
            <VRContentPanel
              activeSection={activeSection}
              intro={intro}
              history={history}
              achievements={achievements}
              partners={partners}
              campuses={campuses}
              loadErrors={loadErrors}
              scrollOffsetRef={scrollOffset}
              buildTargets={buildTargets}
            />
          </group>

          {/* Static hint cards to the right of content */}
          <group ref={uiHintsRef} position={[uiAnchorHints.x, uiAnchorHints.y, uiAnchorHints.z]} rotation={[0, 0, 0]}>
            <VRHintStack />
          </group>
        </>
      )}

      {state === "campus" && (
        <group ref={uiRightRef} position={[uiAnchorRight.x, uiAnchorRight.y, uiAnchorRight.z]} rotation={[0, 0, 0]}>
          <mesh position={[0, 0, -0.02]}>
            <planeGeometry args={[1.15, 0.72]} />
            <meshBasicMaterial color="#11111a" />
          </mesh>

          <Text
            position={[0, 0.28, 0.01]}
            fontSize={0.035}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            maxWidth={1.05}
          >
            Chọn cơ sở (dùng tia laser để bấm). Xoay model bằng joystick phải.
          </Text>

          <group position={[0, -0.02, 0.22]}>
            {selectedCampus ? (
              <Suspense fallback={null}>
                <CampusPreviewModel
                  modelUrl={vrPublicUrl(selectedCampus.file_name)}
                  active={true}
                  onRotateRequest={rotateRequest}
                />
              </Suspense>
            ) : (
              <Text fontSize={0.04} color="#ffffff" anchorX="center" anchorY="middle">
                Đang tải danh sách cơ sở...
              </Text>
            )}
          </group>

          <Text
            position={[0, -0.32, 0.01]}
            fontSize={0.04}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            maxWidth={1.05}
          >
            {selectedCampus ? selectedCampus.name : ""}
          </Text>

          <group>
            <mesh
              position={[-0.35, -0.22, 0]}
              ref={(m) => buildTargets(m, "campus:prev")}
            >
              <planeGeometry args={[0.32, 0.1]} />
              <meshBasicMaterial color="#2b2b44" />
            </mesh>
            <Text position={[-0.35, -0.22, 0.01]} fontSize={0.035} color="#ffffff" anchorX="center" anchorY="middle">
              TRƯỚC
            </Text>

            <mesh
              position={[0.35, -0.22, 0]}
              ref={(m) => buildTargets(m, "campus:next")}
            >
              <planeGeometry args={[0.32, 0.1]} />
              <meshBasicMaterial color="#2b2b44" />
            </mesh>
            <Text position={[0.35, -0.22, 0.01]} fontSize={0.035} color="#ffffff" anchorX="center" anchorY="middle">
              SAU
            </Text>

            <mesh
              position={[0, -0.22, 0]}
              ref={(m) => buildTargets(m, "campus:enter")}
            >
              <planeGeometry args={[0.38, 0.1]} />
              <meshBasicMaterial color="#006b5a" />
            </mesh>
            <Text position={[0, -0.22, 0.01]} fontSize={0.035} color="#ffffff" anchorX="center" anchorY="middle">
              THAM QUAN
            </Text>
          </group>
        </group>
      )}

      {state === "tour" && selectedCampus && (
        <>
          <Suspense fallback={<Loader />}>
            <VRTourModel modelUrl={vrPublicUrl(selectedCampus.file_name)} />
          </Suspense>
          <VRLocomotion active={true} camRef={camRef} resetToken={vrResetToken.current} />
        </>
      )}

      {/* Simple guard: if session ends externally */}
      <XRSessionGuard onRequestExit={onRequestExit} />
    </>
  );
}

function VRNavPanel({ activeSection, setActiveSection, buildTargets }) {
  const panelW = 0.58;
  const panelH = 1.12;
  const items = [
    { key: "nav:intro", label: "Giới thiệu" },
    { key: "nav:history", label: "Lịch sử" },
    { key: "nav:achievements", label: "Thành tựu" },
    { key: "nav:partners", label: "Đối tác" },
    { key: "nav:campus", label: "Khám phá cơ sở" },
  ];

  return (
    <group>
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[panelW, panelH]} />
        <meshBasicMaterial color="#0f0f18" />
      </mesh>

      {items.map((item, idx) => {
        const y = panelH / 2 - 0.18 - idx * 0.18;
        const isActive = activeSection === item.key.replace("nav:", "");
        return (
          <group key={item.key} position={[0, y, 0.01]}>
            <mesh ref={(m) => buildTargets?.(m, item.key)} onClick={() => setActiveSection(item.key.replace("nav:", ""))}>
              <planeGeometry args={[panelW - 0.08, 0.14]} />
              <meshBasicMaterial color={isActive ? "#00fff0" : "#1a1a2d"} opacity={isActive ? 0.9 : 0.75} transparent />
            </mesh>
            <Text
              position={[-(panelW / 2) + 0.12, 0, 0.02]}
              fontSize={0.045}
              color={isActive ? "#0f0f18" : "#ffffff"}
              anchorX="left"
              anchorY="middle"
              maxWidth={panelW - 0.16}
            >
              {item.label}
            </Text>
          </group>
        );
      })}
    </group>
  );
}

function VRContentPanel({
  activeSection,
  intro,
  history,
  achievements,
  partners,
  campuses,
  loadErrors,
  scrollOffsetRef,
  buildTargets,
}) {
  const panelW = 1.45;
  const panelH = 1.12; // match nav panel height
  const padding = 0.1;
  const viewportH = panelH - padding * 2;
  const contentRef = useRef();
  const scrollState = useRef(0);
  const contentOffsetRef = useRef(0);

  const introItem = Array.isArray(intro) && intro.length ? intro[0] : null;
  const introTitle = introItem?.title ? String(introItem.title) : "HỌC VIỆN CÔNG NGHỆ BƯU CHÍNH VIỄN THÔNG";
  const introDesc = introItem?.description ? String(introItem.description) : "";
  const introImageUrl = introItem?.image_url ? vrPublicUrl(introItem.image_url) : SliderFallbackImg;

  const historyList = useMemo(() => mergeHistoryWithFallback(history), [history]);
  const achievementsList = useMemo(() => (Array.isArray(achievements) ? achievements : []), [achievements]);
  const partnersList = useMemo(() => (Array.isArray(partners) ? partners : []), [partners]);
  const campusCards = useMemo(() => {
    const safeIndex = (i, fallback = 0) => {
      if (!Array.isArray(campuses) || !campuses.length) return 0;
      if (i >= 0 && i < campuses.length) return i;
      return Math.min(fallback, campuses.length - 1);
    };
    return [
      { title: "CƠ SỞ HÀ ĐÔNG", thumb: vrPublicUrl("thumb-hd.jpg"), targetIndex: safeIndex(0) },
      { title: "CƠ SỞ NGỌC TRỤC", thumb: vrPublicUrl("thumb-nt.jpg"), targetIndex: safeIndex(1, 0) },
    ];
  }, [campuses]);
  const errorLines = useMemo(() => {
    const errors = loadErrors || {};
    const keys = Object.keys(errors);
    return keys.map((k) => `Lỗi ${k}: ${errors[k]}`);
  }, [loadErrors]);

  const historyLayout = useMemo(() => {
    const estimateDescHeight = (text) => {
      if (!text) return 0;
      const charsPerLine = 48;
      const lines = Math.max(1, Math.ceil(String(text).length / charsPerLine));
      return Math.min(0.42, 0.08 + lines * 0.05);
    };

    const cardHeights = historyList.map((item) => {
      const hasImg = !!item?.image;
      const descH = estimateDescHeight(item?.description || "");
      const base = 0.38; // badge + title + extra padding for multiline titles
      const imgH = hasImg ? 0.36 : 0;
      const h = Math.max(0.52, base + descH + imgH);
      return h;
    });

    const gap = 0.24;
    const totalCards = cardHeights.reduce((a, b) => a + b, 0);
    const totalGap = cardHeights.length > 1 ? (cardHeights.length - 1) * gap : 0;
    const stackHeight = totalCards + totalGap;
    return { cardHeights, gap, stackHeight };
  }, [historyList]);

  const achievementsLayout = useMemo(() => {
    const estimateDescHeight = (text) => {
      if (!text) return 0;
      const charsPerLine = 60;
      const lines = Math.max(1, Math.ceil(String(text).length / charsPerLine));
      return 0.06 + lines * 0.04;
    };

    const imgH = 0.32;
    const numH = 0.08;
    const basePadding = 0.1; // tighter top/bottom padding for compact cards

    const cardHeights = achievementsList.map((a) => {
      const descH = estimateDescHeight(a?.description || "");
      return Math.max(0.6, basePadding + imgH + numH + descH);
    });

    const gap = 0.14;
    const totalCards = cardHeights.reduce((a, b) => a + b, 0);
    const totalGap = cardHeights.length > 1 ? (cardHeights.length - 1) * gap : 0;
    // Approximate stack height for 2-column layout: use row heights (max of pairs)
    const rowHeights = [];
    for (let i = 0; i < cardHeights.length; i += 2) {
      rowHeights.push(Math.max(cardHeights[i], cardHeights[i + 1] || 0));
    }
    const rowStack = rowHeights.reduce((a, b) => a + b, 0) + (rowHeights.length > 1 ? (rowHeights.length - 1) * gap : 0);

    return { cardHeights, gap, stackHeight: rowStack, imgH };
  }, [achievementsList]);

  const contentHeight = useMemo(() => {
    const historyHeaderH = 0.16;
    switch (activeSection) {
      case "intro":
        return 0.68 + (errorLines.length ? 0.12 : 0);
      case "history": {
        const stackH = historyLayout.stackHeight || 0.4;
        const err = errorLines.length ? 0.14 : 0;
        return Math.max(0.6, historyHeaderH + 0.1 + stackH + err + 0.12);
      }
      case "achievements": {
        const stackH = achievementsLayout.stackHeight || 0.8;
        return Math.max(1.0, 0.18 + stackH + (errorLines.length ? 0.12 : 0));
      }
      case "partners": {
        const rows = Math.max(1, Math.ceil(partnersList.length / 3));
        const gridH = rows * 0.2 + Math.max(0, rows - 1) * 0.16;
        const headerH = 0.32; // subtitle + title + underline spacing
        const err = errorLines.length ? 0.12 : 0;
        return Math.max(0.6, headerH + gridH + 0.24 + err);
      }
      case "campus": {
        const headerH = 0.2;
        const cardsH = 0.5; // two cards row height (taller cards to fit labels)
        const err = errorLines.length ? 0.12 : 0;
        return Math.max(0.7, headerH + cardsH + 0.18 + err);
      }
      default:
        return 0.6;
    }
  }, [activeSection, historyLayout, achievementsList, partnersList, errorLines.length]);

  useFrame(() => {
    if (!contentRef.current) return;
    const maxScroll = Math.max(0, contentHeight - viewportH);
    const clamped = Math.max(0, Math.min(maxScroll, scrollOffsetRef.current));
    scrollState.current = clamped;
    scrollOffsetRef.current = clamped;
    const startY = panelH / 2 - padding;
    // Positive scrollOffset pushes content upward to reveal lower items.
    contentRef.current.position.y = contentOffsetRef.current + startY + clamped;
  });

  // Disable clipping: always render content regardless of viewport overlap.
  const shouldRender = () => true;

  const renderIntro = () => {
    let y = 0.02;
    const nodes = [];

    if (errorLines.length) {
      const text = errorLines.join("\n");
      const h = 0.12;
      if (shouldRender(y, h)) {
        nodes.push(
          <Text key="err" position={[-panelW / 2 + 0.06, y, 0.02]} fontSize={0.03} color="#ff9f9f" anchorX="left" anchorY="top" maxWidth={panelW - 0.12} lineHeight={1.15}>
            {text}
          </Text>
        );
      }
      y -= h;
    }

    const titleH = 0.08;
    if (shouldRender(y, titleH)) {
      nodes.push(
        <Text key="intro-title" position={[-panelW / 2 + 0.06, y, 0.02]} fontSize={0.05} color="#ffffff" anchorX="left" anchorY="top" maxWidth={panelW - 0.12}>
          GIỚI THIỆU
        </Text>
      );
    }
    y -= 0.08;

    const imgH = 0.32;
    if (shouldRender(y - imgH / 2, imgH)) {
      nodes.push(
        <Suspense key="intro-img" fallback={null}>
          <VRImagePlane url={introImageUrl} width={panelW - 0.12} height={imgH} position={[0, y - imgH / 2, 0.01]} />
        </Suspense>
      );
    }
    y -= imgH + 0.08;

    const titleBlockH = 0.08;
    if (shouldRender(y, titleBlockH)) {
      nodes.push(
        <Text key="intro-head" position={[-panelW / 2 + 0.06, y, 0.02]} fontSize={0.038} color="#ffffff" anchorX="left" anchorY="top" maxWidth={panelW - 0.12} lineHeight={1.2}>
          {introTitle}
        </Text>
      );
    }
    y -= 0.12;

    if (introDesc) {
      const descH = 0.26;
      if (shouldRender(y, descH)) {
        nodes.push(
          <Text key="intro-desc" position={[-panelW / 2 + 0.06, y, 0.02]} fontSize={0.03} color="#cfd2ff" anchorX="left" anchorY="top" maxWidth={panelW - 0.12} lineHeight={1.25}>
            {introDesc}
          </Text>
        );
      }
      y -= descH;
    }

    return nodes;
  };

  const renderHistory = () => {
    let y = panelH / 2 - padding - 0.02;
    const nodes = [];

    if (errorLines.length) {
      const h = 0.12;
      if (shouldRender(y, h)) {
        nodes.push(
          <Text key="err" position={[-panelW / 2 + 0.06, y, 0.02]} fontSize={0.03} color="#ff9f9f" anchorX="left" anchorY="top" maxWidth={panelW - 0.12} lineHeight={1.15}>
            {errorLines.join("\n")}
          </Text>
        );
      }
      y -= h + 0.08;
    }

    const headerH = 0.16;
    nodes.push(
      <>
        <mesh key="history-title-bg" position={[0, y - 0.02, 0]}>
          <planeGeometry args={[panelW - 0.18, 0.12]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <Text
          key="history-title"
          position={[0, y, 0.02]}
          fontSize={0.055}
          color="#c90000"
          anchorX="center"
          anchorY="top"
          maxWidth={panelW - 0.24}
        >
          LỊCH SỬ PHÁT TRIỂN
        </Text>
      </>
    );
    y -= headerH + 0.06;

    const lineH = Math.max(0.5, historyLayout.stackHeight || 0.5);
    const lineY = y - (lineH / 2 - 0.01);
    nodes.push(
      <mesh key="timeline-line" position={[0, lineY, -0.01]}>
        <planeGeometry args={[0.012, lineH]} />
        <meshBasicMaterial color="#e0e0e0" />
      </mesh>
    );

    const cardW = 0.68;
    const cardHeights = historyLayout.cardHeights.length ? historyLayout.cardHeights : historyList.map(() => 0.62);
    const gap = Math.max(0.16, historyLayout.gap - 0.06);
    const startY = y;

    historyList.forEach((e, idx) => {
      const isLeft = idx % 2 === 0;
      const cardH = cardHeights[idx] || 0.62;
      const cardY = startY - idx * (cardH + gap);
      const year = e?.year_date ? String(e.year_date) : "";
      const title = e?.title ? String(e.title) : "";
      const desc = e?.description ? String(e.description) : "";
      const img = e?.image ? vrPublicUrl(e.image) : null;
      const descH = (() => {
        if (!desc) return 0;
        const charsPerLine = 50;
        const lines = Math.max(1, Math.ceil(String(desc).length / charsPerLine));
        return Math.min(0.34, 0.05 + lines * 0.045);
      })();
      const imgH = img ? 0.34 : 0;

      const x = isLeft ? -(cardW / 2 + 0.12) : cardW / 2 + 0.12;

      nodes.push(
        <group key={e?.id || idx} position={[x, cardY - cardH / 2, 0.01]}>
          <mesh position={[0, 0, -0.01]}>
            <planeGeometry args={[cardW, cardH]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0, 0, -0.012]}>
            <planeGeometry args={[cardW, cardH]} />
            <meshBasicMaterial color="#e6e6e6" transparent opacity={0.08} />
          </mesh>

          <mesh position={[-0.26 + 0.13, cardH / 2 - 0.08, 0.015]}>
            <planeGeometry args={[0.26, 0.08]} />
            <meshBasicMaterial color="#c90000" />
          </mesh>
          <Text position={[-0.26 + 0.13, cardH / 2 - 0.08, 0.02]} fontSize={0.032} color="#ffffff" anchorX="center" anchorY="middle" maxWidth={0.24}>
            {year}
          </Text>
          {(() => {
            const items = [];
            let cursor = cardH / 2 - 0.16;
            items.push(
              <Text key="title" position={[-cardW / 2 + 0.12, cursor, 0.02]} fontSize={0.037} color="#c90000" anchorX="left" anchorY="top" maxWidth={cardW - 0.24} lineHeight={1.3}>
                {title}
              </Text>
            );
            cursor -= 0.18;

            if (desc) {
              items.push(
                <Text key="desc" position={[-cardW / 2 + 0.12, cursor, 0.02]} fontSize={0.026} color="#555555" anchorX="left" anchorY="top" maxWidth={cardW - 0.24} lineHeight={1.4}>
                  {desc}
                </Text>
              );
              cursor -= descH + 0.04;
            } else {
              cursor -= 0.06;
            }

            if (img) {
              items.push(
                <Suspense key="img" fallback={null}>
                  <VRImagePlane url={img} width={cardW - 0.2} height={imgH} position={[0, cursor - imgH / 2, 0.02]} />
                </Suspense>
              );
              cursor -= imgH + 0.03;
            }

            return items;
          })()}
        </group>
      );

      // Timeline dot on center line
      const dotY = cardY - cardH / 2 + 0.04;
      nodes.push(
        <group key={`dot-${idx}`} position={[0, dotY, 0.015]}>
          <mesh>
            <circleGeometry args={[0.016, 32]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0, 0, 0.002]}>
            <circleGeometry args={[0.012, 32]} />
            <meshBasicMaterial color="#c90000" />
          </mesh>
        </group>
      );
    });

    return nodes;
  };

  const renderAchievements = () => {
    let y = -0.02;
    const nodes = [];

    if (errorLines.length) {
      const h = 0.12;
      if (shouldRender(y, h)) {
        nodes.push(
          <Text key="err" position={[-panelW / 2 + 0.06, y, 0.02]} fontSize={0.03} color="#ff9f9f" anchorX="left" anchorY="top" maxWidth={panelW - 0.12} lineHeight={1.15}>
            {errorLines.join("\n")}
          </Text>
        );
      }
      y -= h;
    }

    nodes.push(
      <Text key="title" position={[0, y, 0.02]} fontSize={0.05} color="#ffffff" anchorX="center" anchorY="top" maxWidth={panelW - 0.12}>
        THÀNH TỰU NỔI BẬT
      </Text>
    );
    y -= 0.14;

    const cols = 2;
    const gapX = 0.08;
    const gapY = achievementsLayout.gap;
    const cardW = (panelW - 0.12 - (cols - 1) * gapX) / cols;
    const imgH = achievementsLayout.imgH;

    achievementsList.forEach((a, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const cardH = achievementsLayout.cardHeights[idx] || 0.7;
      const rowHeight = Math.max(
        achievementsLayout.cardHeights[row * 2] || 0.7,
        achievementsLayout.cardHeights[row * 2 + 1] || 0.7
      );
      const x = -panelW / 2 + 0.06 + cardW / 2 + col * (cardW + gapX);
      const rowTopY = y - row * (rowHeight + gapY);
      const centerY = rowTopY - cardH / 2;
      if (!shouldRender(centerY, cardH)) return;

      const prefix = a?.prefix ? String(a.prefix) : "";
      const val = a?.number_val !== undefined ? String(a.number_val) : "";
      const suffix = a?.suffix ? String(a.suffix) : "";
      const desc = a?.description ? String(a.description) : "";
      const img = a?.image_url ? vrPublicUrl(a.image_url) : SliderFallbackImg;
      const num = [prefix, val, suffix].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();

      const padTop = 0.03;
      const imageY = cardH / 2 - padTop - imgH / 2;
      const numberY = imageY - imgH / 2 - 0.07;
      const descY = numberY - 0.08;

      nodes.push(
        <group key={a?.id || idx} position={[x, centerY, 0.01]}>
          <mesh position={[0, 0, -0.007]}>
            <planeGeometry args={[cardW + 0.016, cardH + 0.016]} />
            <meshBasicMaterial color="#e9e9e9" />
          </mesh>
          <mesh position={[0, 0, -0.006]}>
            <planeGeometry args={[cardW + 0.008, cardH + 0.008]} />
            <meshBasicMaterial color="#f7f7f7" />
          </mesh>
          <mesh position={[0, 0, -0.005]}>
            <planeGeometry args={[cardW, cardH]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>

          <Suspense fallback={null}>
            <VRImagePlane url={img} width={cardW - 0.12} height={imgH} position={[0, imageY, 0.02]} />
          </Suspense>

          <Text position={[0, numberY, 0.02]} fontSize={0.072} color="#c90000" anchorX="center" anchorY="middle" maxWidth={cardW - 0.16}>
            {num}
          </Text>
          <Text position={[0, descY, 0.02]} fontSize={0.032} color="#222222" anchorX="center" anchorY="top" maxWidth={cardW - 0.16} lineHeight={1.45}>
            {desc}
          </Text>
        </group>
      );
    });

    return nodes;
  };

  const renderPartners = () => {
    let y = 0.12;
    const nodes = [];

    if (errorLines.length) {
      const h = 0.12;
      nodes.push(
        <Text key="err" position={[0, y, 0.02]} fontSize={0.03} color="#ff9f9f" anchorX="center" anchorY="top" maxWidth={panelW - 0.12} lineHeight={1.15}>
          {errorLines.join("\n")}
        </Text>
      );
      y -= h + 0.06;
    }

    nodes.push(
      <mesh key="title-bg" position={[0, y, -0.01]}>
        <planeGeometry args={[0.82, 0.16]} />
        <meshBasicMaterial color="#f8fbff" />
      </mesh>
    );

    nodes.push(
      <Text key="title" position={[0, y, 0.02]} fontSize={0.06} color="#0b2a4d" anchorX="center" anchorY="middle" maxWidth={panelW - 0.12}>
        ĐỐI TÁC DOANH NGHIỆP
      </Text>
    );
    y -= 0.16;

    const cols = 3;
    const cellW = 0.42;
    const cellH = 0.2;
    const gapX = 0.08;
    const gapY = 0.16;
    const totalRows = Math.ceil(partnersList.length / cols) || 1;
    const gridHeight = totalRows * cellH + Math.max(0, totalRows - 1) * gapY;

    partnersList.forEach((p, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = -panelW / 2 + 0.06 + cellW / 2 + col * (cellW + gapX);
      const cellY = y - row * (cellH + gapY);
      const logo = p?.logo_url ? vrPublicUrl(p.logo_url) : null;
      const name = p?.name ? String(p.name) : "";

      nodes.push(
        <group key={p?.id || idx} position={[x, cellY - cellH / 2, 0.01]}>
          <mesh position={[0, 0, -0.004]}>
            <planeGeometry args={[cellW, cellH]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0, 0, -0.005]}>
            <planeGeometry args={[cellW + 0.02, cellH + 0.02]} />
            <meshBasicMaterial color="#e7eef7" />
          </mesh>
          {logo ? (
            <Suspense fallback={null}>
              <VRLogoPlaneAutoFit url={logo} maxWidth={cellW - 0.1} maxHeight={cellH - 0.08} position={[0, 0, 0.02]} />
            </Suspense>
          ) : (
            <Text fontSize={0.024} color="#18324f" anchorX="center" anchorY="middle" maxWidth={cellW - 0.08}>
              {name}
            </Text>
          )}
        </group>
      );
    });

    return nodes;
  };

  const renderCampusCTA = () => {
    let y = panelH / 2 - padding - 0.02;
    const nodes = [];

    if (shouldRender(y, 0.12)) {
      nodes.push(
        <mesh key="campus-title-bg" position={[0, y, -0.01]}>
          <planeGeometry args={[0.96, 0.16]} />
          <meshBasicMaterial color="#f8fbff" />
        </mesh>
      );
      nodes.push(
        <Text key="title" position={[0, y, 0.02]} fontSize={0.06} color="#b62c1f" anchorX="center" anchorY="middle" maxWidth={panelW - 0.12}>
          KHÁM PHÁ CƠ SỞ HỌC VIỆN
        </Text>
      );
    }
    y -= 0.14;

    y -= 0.08;

    const cols = 2;
    const gapX = 0.08;
    const cardW = (panelW - 0.12 - gapX) / cols;
    const cardH = 0.46;
    const imgH = 0.26;

    campusCards.forEach((card, idx) => {
      const col = idx % cols;
      const x = -panelW / 2 + 0.06 + cardW / 2 + col * (cardW + gapX);
      const centerY = y - cardH / 2;
      if (!shouldRender(centerY, cardH)) return;

      nodes.push(
        <group key={card.title} position={[x, centerY, 0.01]}>
          <mesh
            position={[0, 0, -0.005]}
            ref={(m) => {
              if (!m) return;
              m.userData.__campusIdx = card.targetIndex;
              buildTargets?.(m, `campus:card:${idx}`);
            }}
          >
            <planeGeometry args={[cardW, cardH]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0, 0, -0.006]}>
            <planeGeometry args={[cardW + 0.02, cardH + 0.02]} />
            <meshBasicMaterial color="#e5eaf0" />
          </mesh>

          <Suspense fallback={null}>
            <VRImagePlane url={card.thumb} width={cardW - 0.08} height={imgH} position={[0, cardH / 2 - imgH / 2 - 0.06, 0.02]} />
          </Suspense>

          <Text position={[0, -cardH / 2 + 0.05, 0.02]} fontSize={0.032} color="#2b2b44" anchorX="center" anchorY="middle" maxWidth={cardW - 0.1}>
            {card.title}
          </Text>
        </group>
      );
    });

    return nodes;
  };

  const renderContent = () => {
    if (activeSection === "intro") return renderIntro();
    if (activeSection === "history") return renderHistory();
    if (activeSection === "achievements") return renderAchievements();
    if (activeSection === "partners") return renderPartners();
    if (activeSection === "campus") return renderCampusCTA();
    return [];
  };

  return (
    <group>
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[panelW, panelH]} />
        <meshBasicMaterial color="#0d0d16" transparent opacity={0} />
      </mesh>

      <group ref={contentRef} position={[0, 0, 0]}>
        {renderContent()}
      </group>
    </group>
  );
}

function VRHintStack() {
  // Slightly narrower to reduce overlap and keep visual balance on the right.
  const panelW = 0.8;
  const panelH = 0.18;
  const gapY = 0.08;

  const items = [
    "Nhấn B để thoát chế độ VR",
    "Dùng Controller để điều hướng nội dung và tiêu đề.",
    "Sử dụng tia laser để chuyển tới cơ sở muốn tham quan",
  ];

  return (
    <group>
      {items.map((text, idx) => {
        const y = 0.32 - idx * (panelH + gapY);
        return (
          <group key={text} position={[0, y, 0]}>
            <mesh position={[0, 0, -0.01]}>
              <planeGeometry args={[panelW, panelH]} />
              <meshBasicMaterial color="#f2f5f9" />
            </mesh>
            <mesh position={[0, 0, -0.011]}>
              <planeGeometry args={[panelW + 0.02, panelH + 0.02]} />
              <meshBasicMaterial color="#dfe6ef" />
            </mesh>
            <Text
              position={[0, 0, 0.01]}
              fontSize={0.04}
              color="#1c2533"
              anchorX="center"
              anchorY="middle"
              maxWidth={panelW - 0.12}
            >
              {text}
            </Text>
          </group>
        );
      })}
    </group>
  );
}

function XRSessionGuard({ onRequestExit }) {
  const { gl } = useThree();
  const last = useRef(null);

  useFrame(() => {
    const s = gl.xr?.getSession?.();
    if (s && last.current !== s) {
      last.current = s;
      s.addEventListener("end", () => onRequestExit?.());
    }
  });

  return null;
}

// Preload cache helper
useGLTF.preload = useGLTF.preload || (() => {});
