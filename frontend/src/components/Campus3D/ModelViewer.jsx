import React from "react";
import { useGLTF } from "@react-three/drei";

export default function ModelViewer({ modelUrl }) {
  const { scene } = useGLTF(modelUrl);
  // Scale giảm xuống 0.8, hạ vị trí xuống thấp hơn (-5) để camera nhìn thấy nóc nhà
  return <primitive object={scene} scale={0.8} position={[0, -5, 0]} />;
}