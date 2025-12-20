import React, { useState, useEffect } from "react";
import CountUp from "react-countup"; // Chỉ cần import cái này
import "./Achievements.css";
import PlaceholderImg from "../../assets/images/slider/slider1.jpg"; 
import { apiUrl, publicUrl } from "../../config/api";

function Achievements() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetch(apiUrl("api/achievements"))
      .then((res) => res.json())
      .then((data) => setItems(data))
      .catch((err) => console.error("Lỗi tải achievements:", err));
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="achievements-container">
      <div className="section-header-wrapper">
        <h2 className="section-title-achieve">THÀNH TỰU NỔI BẬT</h2>
        <div className="header-line"></div>
      </div>

      <div className="achievements-grid">
        {items.map((item) => (
          <div key={item.id} className="achievement-card">
            {/* 1. ẢNH MÔ TẢ */}
            <div className="card-image-box">
              <img 
                src={item.image_url ? publicUrl(item.image_url) : PlaceholderImg} 
                alt="Achievement"
                className="achievement-img"
                onError={(e) => e.target.src = PlaceholderImg} 
              />
              <div className="img-overlay"></div>
            </div>

            <div className="card-content">
              {/* 2. SỐ LIỆU (Đã sửa lỗi) */}
              <div className="achievement-number">
                {/* Dùng enableScrollSpy thay cho VisibilitySensor */}
                <span className="prefix">{item.prefix}</span>
                <span className="val">
                  <CountUp 
                    end={item.number_val} 
                    duration={3} 
                    enableScrollSpy={true} // Tự động chạy khi lướt tới
                    scrollSpyOnce={true}   // Chỉ chạy 1 lần
                  />
                </span>
                <span className="suffix">{item.suffix}</span>
              </div>
              
              {/* 3. MÔ TẢ */}
              <p className="achievement-desc">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Achievements;