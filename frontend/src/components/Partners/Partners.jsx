import React, { useState, useEffect } from "react";
import "./Partners.css";

import { apiUrl, publicUrl } from "../../config/api";

// Hàm helper để render logo (xử lý link ảnh)
const PartnerLogo = ({ partner }) => {
  // Giả sử ảnh lưu trong folder public/uploads/partners/ của Backend
  // Nếu bạn lưu chỗ khác thì sửa lại đường dẫn này
  const imgUrl = publicUrl(partner.logo_url);
  
  return (
    <a 
      href={partner.website_url} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="partner-item"
    >
      <img 
        src={imgUrl} 
        alt={partner.name} 
        onError={(e) => {
           // Nếu lỗi ảnh thì hiện tên (fallback)
           e.target.style.display = 'none';
           e.target.parentElement.innerText = partner.name; 
        }} 
      />
    </a>
  );
};

function Partners() {
  const [partners, setPartners] = useState([]);

  useEffect(() => {
    fetch(apiUrl("api/partners"))
      .then((res) => res.json())
      .then((data) => setPartners(data))
      .catch((err) => console.error(err));
  }, []);

  if (partners.length === 0) return null;

  // 1. Chia danh sách thành 2 phần
  const midPoint = Math.ceil(partners.length / 2);
  const row1 = partners.slice(0, midPoint);    // Hàng trên (lớn hơn hoặc bằng)
  const row2 = partners.slice(midPoint);       // Hàng dưới

  return (
    <div className="partners-section">
      <div className="partners-header">
        <span className="sub-title">ĐỐI TÁC</span>
        <h2>ĐỐI TÁC DOANH NGHIỆP</h2>
        <div className="line-red"></div>
      </div>

      <div className="partners-marquee-wrapper">
        
        {/* HÀNG 1: Chạy từ Phải sang Trái */}
        <div className="marquee-track">
          <div className="marquee-content scroll-left">
            {/* Render 2 lần để tạo vòng lặp vô tận */}
            {row1.map((p) => <PartnerLogo key={p.id} partner={p} />)}
            {row1.map((p) => <PartnerLogo key={`dup-${p.id}`} partner={p} />)}
          </div>
        </div>

        {/* HÀNG 2: Chạy từ Trái sang Phải (hoặc chậm hơn) */}
        <div className="marquee-track">
          <div className="marquee-content scroll-right">
             {/* Render 2 lần */}
            {row2.map((p) => <PartnerLogo key={p.id} partner={p} />)}
            {row2.map((p) => <PartnerLogo key={`dup-${p.id}`} partner={p} />)}
          </div>
        </div>

      </div>
    </div>
  );
}

export default Partners;