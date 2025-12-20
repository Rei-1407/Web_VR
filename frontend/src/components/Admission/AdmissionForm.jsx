import React, { useState } from "react";
import "./AdmissionForm.css";

import { apiUrl } from "../../config/api";

// DANH SÁCH NGÀNH ĐÀO TẠO (Cập nhật đầy đủ từ ảnh)
const MAJORS = [
  "An toàn thông tin (7480202)",
  "An toàn thông tin - Chất lượng cao",
  "Báo chí (Journalism) (7320101)",
  "Công nghệ đa phương tiện (7329001)",
  "Công nghệ Internet vạn vật (IoT) (7520208)",
  "Công nghệ kỹ thuật Điện, điện tử (7510301)",
  "Công nghệ tài chính – Fintech (7340205)",
  "Công nghệ thông tin (7480201)",
  "Công nghệ thông tin - Hệ Chất lượng cao",
  "Công nghệ thông tin - Định hướng ứng dụng",
  "Công nghệ thông tin - Việt Nhật",
  "Kế toán (7340301)",
  "Kế toán - Chất lượng cao chuẩn quốc tế (ACCA)",
  "Khoa học máy tính (7480101)",
  "Kỹ thuật Điện tử viễn thông (7520207)",
  "Kỹ thuật Điều khiển và Tự động hóa (7520216)",
  "Kỹ thuật dữ liệu (Mạng máy tính & TT dữ liệu)",
  "Logistics và quản trị chuỗi cung ứng (7340101)",
  "Marketing (7340115)",
  "Marketing - Hệ Chất lượng cao",
  "Quan hệ công chúng (Ngành Marketing)",
  "Quản trị kinh doanh (7340101)",
  "Thiết kế và Phát triển Game",
  "Thương mại điện tử (7340122)",
  "Trí tuệ nhân tạo (7480107)",
  "Trí tuệ nhân tạo vạn vật (AIoT)",
  "Truyền thông đa phương tiện (7320104)"
];

const AdmissionForm = () => {
  const [formData, setFormData] = useState({
    full_name: "",
    birth_date: "",
    gender: "Nam",
    address: "",
    cccd: "",
    major: "",
  });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Xử lý thay đổi input text
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Xử lý chọn file
  const handleFileChange = (e) => {
    setSelectedFiles(e.target.files);
  };

  // Xử lý Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Kiểm tra xem ngành nhập vào có đúng trong danh sách không (nếu cần bắt buộc)
    if (!MAJORS.includes(formData.major)) {
      alert("Vui lòng chọn một ngành có trong danh sách gợi ý!");
      setIsSubmitting(false);
      return;
    }

    const data = new FormData();
    data.append("full_name", formData.full_name);
    data.append("birth_date", formData.birth_date);
    data.append("gender", formData.gender);
    data.append("address", formData.address);
    data.append("cccd", formData.cccd);
    data.append("major", formData.major);

    for (let i = 0; i < selectedFiles.length; i++) {
      data.append("files", selectedFiles[i]);
    }

    try {
      const response = await fetch(apiUrl("api/admission"), {
        method: "POST",
        body: data,
      });

      if (response.ok) {
        alert("Nộp hồ sơ thành công! Nhà trường sẽ liên hệ sớm.");
        setFormData({
            full_name: "", birth_date: "", gender: "Nam", address: "", cccd: "", major: ""
        });
        setSelectedFiles([]);
      } else {
        alert("Có lỗi xảy ra, vui lòng thử lại.");
      }
    } catch (error) {
      console.error("Lỗi:", error);
      alert("Lỗi kết nối server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admission-container">
      <h2 className="admission-title">ĐĂNG KÝ XÉT TUYỂN TRỰC TUYẾN</h2>
      <p className="admission-subtitle">Điền thông tin và chọn ngành học mơ ước của bạn tại PTIT</p>

      <form className="admission-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Họ và tên:</label>
          <input 
            type="text" 
            name="full_name" 
            value={formData.full_name} 
            onChange={handleChange} 
            placeholder="Ví dụ: Nguyễn Văn A"
            required 
          />
        </div>

        <div className="form-row">
          <div className="form-group half">
            <label>Ngày sinh:</label>
            <input 
              type="date" 
              name="birth_date" 
              value={formData.birth_date} 
              onChange={handleChange} 
              required 
            />
          </div>
          <div className="form-group half">
            <label>Giới tính:</label>
            <select name="gender" value={formData.gender} onChange={handleChange}>
              <option value="Nam">Nam</option>
              <option value="Nữ">Nữ</option>
              <option value="Khác">Khác</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Số CCCD/CMND:</label>
          <input 
            type="text" 
            name="cccd" 
            value={formData.cccd} 
            onChange={handleChange} 
            placeholder="Nhập số căn cước công dân"
            required 
          />
        </div>

        <div className="form-group">
          <label>Địa chỉ liên hệ:</label>
          <input 
            type="text" 
            name="address" 
            value={formData.address} 
            onChange={handleChange} 
            placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/TP"
            required 
          />
        </div>

        {/* --- PHẦN CHỌN NGÀNH CÓ TÌM KIẾM --- */}
        <div className="form-group">
          <label>Ngành mong muốn xét tuyển:</label>
          <input 
            list="major-options" 
            name="major" 
            value={formData.major} 
            onChange={handleChange} 
            placeholder="Gõ để tìm kiếm (VD: Công nghệ thông tin...)"
            className="major-search-input"
            required
            autoComplete="off"
          />
          <datalist id="major-options">
            {MAJORS.map((major, index) => (
              <option key={index} value={major} />
            ))}
          </datalist>
        </div>
        {/* ------------------------------------- */}

        <div className="form-group file-upload-section">
          <label>Hồ sơ đính kèm:</label>
          <div className="file-instruction">
            <p><i className="bi bi-info-circle"></i> Hướng dẫn:</p>
            <ul>
              <li>Vui lòng nộp ảnh chụp Học bạ, Bằng tốt nghiệp, Chứng chỉ (nếu có).</li>
              <li>Hệ thống tự động tạo hồ sơ dựa trên thông tin bạn nhập.</li>
            </ul>
          </div>
          <input 
            type="file" 
            multiple 
            onChange={handleFileChange} 
            accept="image/*,.pdf"
            className="file-input"
          />
          <p className="file-count">Đã chọn: {selectedFiles.length} file</p>
        </div>

        <button type="submit" className="btn-submit" disabled={isSubmitting}>
          {isSubmitting ? "Đang gửi..." : "NỘP HỒ SƠ"}
        </button>
      </form>
    </div>
  );
};

export default AdmissionForm;