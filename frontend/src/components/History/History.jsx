import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import "./History.css";

import { apiUrl, publicUrl } from "../../config/api";

function History() {
  const [events, setEvents] = useState([]);

  // Gọi API lấy danh sách sự kiện
  useEffect(() => {
    fetch(apiUrl("api/history"))
      .then((res) => res.json())
      .then((data) => setEvents(data))
      .catch((err) => console.error("Lỗi tải lịch sử:", err));
  }, []);

  return (
    <div className="history-section">
      <motion.h2 
        className="section-title"
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        LỊCH SỬ PHÁT TRIỂN
      </motion.h2>

      <div className="timeline-container">
        {/* Đường kẻ dọc neon ở giữa */}
        <div className="timeline-line"></div>

        {events.map((item, index) => (
          <TimelineItem key={item.id} item={item} index={index} />
        ))}
      </div>
    </div>
  );
}

// Component con hiển thị từng mốc
function TimelineItem({ item, index }) {
  // index chẵn -> content nằm bên trái, index lẻ -> bên phải
  const isEven = index % 2 === 0;

  return (
    <motion.div
      className={`timeline-row ${isEven ? "left" : "right"}`}
      initial={{ opacity: 0, x: isEven ? -50 : 50 }} // Trượt từ 2 bên vào
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.2 }} // Chạy 1 lần khi cuộn tới 20%
      transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
    >
      {/* 1. Phần Nội dung (Text + Ảnh) */}
      <div className="timeline-content">
        <span className="date-badge">{item.year_date}</span>
        <h3 className="history-title">{item.title}</h3>
        
        {/* Mô tả */}
        {item.description && <p className="history-desc">{item.description}</p>}

        {/* Hiển thị ảnh nếu có trong DB */}
        {item.image && (
          <div className="history-image-wrapper">
            <img 
              src={publicUrl(item.image)} 
              alt={item.title} 
              className="history-img"
              // onError={(e) => { e.target.style.display = 'none'; }} // Ẩn nếu ảnh lỗi
            />
          </div>
        )}
      </div>

      {/* 2. Dấu chấm tròn ở giữa */}
      <div className="timeline-dot">
        <div className="dot-inner"></div>
      </div>
      
      {/* 3. Khoảng trống để cân bằng layout flex */}
      <div className="timeline-empty"></div>
    </motion.div>
  );
}

export default History;