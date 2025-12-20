import React, { useState, useEffect, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import "./CampusShowcase.css";

// --- THƯ VIỆN 3D ---
import { Canvas, useThree } from "@react-three/fiber";
import { useGLTF, Stage, Html, useProgress, OrbitControls } from "@react-three/drei";

import { apiUrl, publicUrl } from "../../config/api";

// --- LOADER ---
function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="model-loader">
        Loading {progress.toFixed(0)}%
      </div>
    </Html>
  );
}

// --- FIX LAYOUT ---
function FixLayout() {
  const { gl, camera, invalidate } = useThree();
  useEffect(() => {
    const parent = gl.domElement.parentElement;
    let rafId = null;
    if (parent) {
      const observer = new ResizeObserver(() => {
        if (rafId) window.cancelAnimationFrame(rafId);
        rafId = window.requestAnimationFrame(() => {
          if (!parent || !gl || !gl.domElement) return;
          const { clientWidth, clientHeight } = parent;
          if (clientWidth > 0 && clientHeight > 0) {
            gl.setSize(clientWidth, clientHeight);
            camera.aspect = clientWidth / clientHeight;
            camera.updateProjectionMatrix();
            invalidate();
          }
        });
      });
      observer.observe(parent);
      setTimeout(() => { if (gl && gl.domElement) invalidate(); }, 100);
      return () => {
        observer.disconnect();
        if (rafId) window.cancelAnimationFrame(rafId);
      };
    }
  }, [gl, camera, invalidate]);
  return null;
}

// --- MODEL 3D ---
function Model3D({ url }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

// --- COMPONENT MODAL CHI TIẾT ---
const CampusModal = ({ campus, onClose }) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (campus?.file_name) {
      useGLTF.preload(publicUrl(campus.file_name));
    }
  }, [campus]);

  if (!campus) return null;

  const handleView3D = () => {
    navigate(`/tour/${campus.id}`, { state: { campus: campus } });
  };

  const handleViewVR = () => {
    navigate(`/tour/${campus.id}?vr=1`, { state: { campus: campus, vr: true } });
  };

  return (
    <div className="campus-modal-overlay">
      <div className="campus-modal-content">
        <button className="btn-close-modal" onClick={onClose}>
          <i className="bi bi-x-lg"></i>
        </button>

        <div className="modal-body">
          {/* CỘT TRÁI: 3D MODEL XOAY */}
          <div className="modal-left">
            <Canvas dpr={1} camera={{ fov: 45 }} frameloop="always">
              <FixLayout />
              <Suspense fallback={<Loader />}>
                <Stage environment="city" intensity={1} contactShadow={false} adjustCamera={1.2}>
                  <Model3D url={publicUrl(campus.file_name)} />
                </Stage>
              </Suspense>
              <OrbitControls 
                makeDefault 
                autoRotate={true}
                autoRotateSpeed={2.0}
                enableZoom={false} 
                enablePan={false}
                enableRotate={true}
                minPolarAngle={Math.PI / 4}
                maxPolarAngle={Math.PI / 2}
              />
            </Canvas>
            
            <p className="mouse-hint-text">
              <i className="bi bi-mouse"></i> Kéo chuột để xoay góc nhìn
            </p>
          </div>

          {/* CỘT PHẢI: THÔNG TIN */}
          <div className="modal-right">
            <h2 className="modal-title">{campus.name}</h2>
            <div className="modal-divider"></div>
            <p className="modal-desc">{campus.description}</p>

            <div className="modal-actions">
              {/* Button đã được làm đẹp */}
              <button className="btn-3d-action" onClick={handleView3D}>
                <i className="bi bi-controller"></i> BẮT ĐẦU THAM QUAN
              </button>
              <button className="btn-vr-action" onClick={handleViewVR}>
                <i className="bi bi-eyeglasses"></i> TRẢI NGHIỆM VR
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENT CHÍNH (SLIDER ẢNH) ---
function CampusShowcase() {
  const [campuses, setCampuses] = useState([]);
  const [selectedCampus, setSelectedCampus] = useState(null);

  useEffect(() => {
    fetch(apiUrl("api/campus"))
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setCampuses(data);
      })
      .catch((err) => console.error(err));
  }, []);

  const settings = {
    dots: true,
    infinite: true,
    speed: 600,
    slidesToShow: 2,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 4000,
    arrows: false,
    responsive: [
      { breakpoint: 768, settings: { slidesToShow: 1 } }
    ]
  };

  return (
    <div className="campus-section">
      <h2 className="campus-header">KHÁM PHÁ CƠ SỞ HỌC VIỆN</h2>
      <div className="campus-line"></div>

      <div className="campus-slider-wrapper">
        <Slider {...settings}>
          {campuses.map((campus) => (
            <div key={campus.id} className="campus-card-padding">
              <div className="campus-card-item">
                <div className="card-img-wrapper">
                  <img 
                    src={campus.thumbnail ? publicUrl(campus.thumbnail) : "https://via.placeholder.com/600x400?text=PTIT+Campus"} 
                    alt={campus.name}
                    className="card-thumb"
                  />
                  <div className="card-overlay">
                    <button className="btn-view-detail" onClick={() => setSelectedCampus(campus)}>
                      XEM CHI TIẾT
                    </button>
                  </div>
                </div>
                <div className="card-info">
                  <h3 className="card-title">{campus.name}</h3>
                </div>
              </div>
            </div>
          ))}
        </Slider>
      </div>

      {selectedCampus && (
        <CampusModal 
          campus={selectedCampus} 
          onClose={() => setSelectedCampus(null)} 
        />
      )}
    </div>
  );
}

export default CampusShowcase;
