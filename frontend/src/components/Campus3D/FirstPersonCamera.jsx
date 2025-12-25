import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function FirstPersonCamera({ active, playerRef }) {
  const { camera } = useThree();

  const keys = useRef({
    w: false, a: false, s: false, d: false,
    q: false, e: false,
    shift: false,
  });

  const vFront = useRef(new THREE.Vector3());
  const vSide = useRef(new THREE.Vector3());
  const vMove = useRef(new THREE.Vector3());

  useEffect(() => {
    const setKey = (e, isDown) => {
      const code = e.code;

      if (code === "KeyW") keys.current.w = isDown;
      else if (code === "KeyA") keys.current.a = isDown;
      else if (code === "KeyS") keys.current.s = isDown;
      else if (code === "KeyD") keys.current.d = isDown;
      else if (code === "KeyQ") keys.current.q = isDown;
      else if (code === "KeyE") keys.current.e = isDown;
      else if (code === "ShiftLeft" || code === "ShiftRight") keys.current.shift = isDown;
    };

    const handleKeyDown = (e) => setKey(e, true);
    const handleKeyUp = (e) => setKey(e, false);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useFrame((state, delta) => {
    if (!active) return;

    const k = keys.current;

    if (!k.w && !k.a && !k.s && !k.d && !k.q && !k.e) return;

    const dt = Math.min(delta, 0.05);

    const sprintMul = k.shift ? 2.5 : 1.0; //Shift
    const moveSpeed = 3.0 * sprintMul; // WASD
    const flySpeed = 2.2 * sprintMul;  // Q/E

    const front = vFront.current;
    const side = vSide.current;
    const move = vMove.current;

    front.set(0, 0, (k.s ? 1 : 0) - (k.w ? 1 : 0));
    side.set((k.a ? 1 : 0) - (k.d ? 1 : 0), 0, 0);

    move.subVectors(front, side);
    const lenSq = move.lengthSq();

    if (lenSq > 0) {
      move.multiplyScalar(1 / Math.sqrt(lenSq)); 
      move.multiplyScalar(moveSpeed * dt);
      move.applyEuler(camera.rotation);
    } else {
      move.set(0, 0, 0);
    }

    const target = playerRef?.current || camera;

    target.position.add(move);

    let dy = 0;
    if (k.e) dy += flySpeed * dt;
    if (k.q) dy -= flySpeed * dt;
    if (dy !== 0) target.position.y += dy;

  });

  return null;
}
