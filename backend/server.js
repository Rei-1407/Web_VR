const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();
const db = require("./db"); // Đảm bảo file db.js của bạn cấu hình đúng
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Bỏ body-parser nếu dùng Express > 4.16 (Express đã tích hợp sẵn)
// const bodyParser = require("body-parser"); 
const multer = require('multer');
const fs = require('fs');
const nodemailer = require('nodemailer');

// Cấu hình upload file (Lưu vào RAM trước khi ghi xuống đĩa)
const upload = multer({ storage: multer.memoryStorage() });

// Cấu hình gửi mail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Lấy từ .env
    pass: process.env.EMAIL_PASS  // Lấy từ .env
  }
});

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Thay thế body-parser

app.use("/public", express.static(path.join(__dirname, "public")));

// --- CẤU HÌNH GEMINI ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Lưu ý: Dùng model gemini-1.5-flash để ổn định hơn (2.5 có thể chưa public rộng rãi)
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const SYSTEM_INSTRUCTION = `
Bạn là Trợ lý ảo AI của Học viện Công nghệ Bưu chính Viễn thông (PTIT).
Nhiệm vụ: Trả lời ngắn gọn, thân thiện, chính xác cho sinh viên.
Thông tin cơ bản:
- Tên trường: Học viện Công nghệ Bưu chính Viễn thông (PTIT).
- Trường có các cơ sở tại Hà Nội, TP.HCM.
- Cơ sở giảng dạy chính tại Hà Nội là cơ sở Hà Đông, nơi giảng dạy cho các bạn sinh viên năm 1, 2, 3, nơi diễn ra các sự kiện lớn, các cuộc hội thảo ở hội trường A2, một cơ sở giảng dạy khác là cơ sở ở Ngọc Trục cho các bạn sinh viên năm 4.
Dữ liệu khác: lấy từ Website: ptit.edu.vn.
Nếu câu hỏi không liên quan đến trường học, hãy từ chối lịch sự.
`;

// API Chatbot
app.post("/api/chat", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Tin nhắn trống" });

  try {
    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: "Hãy đóng vai trợ lý ảo PTIT và ghi nhớ: " + SYSTEM_INSTRUCTION }],
        },
        {
          role: "model",
          parts: [{ text: "Đã rõ. Tôi là AI của PTIT. Tôi sẵn sàng hỗ trợ." }],
        },
      ],
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    res.json({ reply: text });
  } catch (error) {
    console.error("Lỗi Gemini:", error);
    res.status(500).json({ reply: "Hệ thống đang bận, vui lòng thử lại sau." });
  }
});

// Các API lấy dữ liệu trang chủ
app.get("/api/intro", (req, res) => {
  const sql = "SELECT * FROM intro_slides ORDER BY display_order ASC";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: "Lỗi Server" });
    res.json(results);
  });
});

app.get("/api/history", (req, res) => {
  const sql = "SELECT * FROM history_events ORDER BY id ASC";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.get("/api/achievements", (req, res) => {
  const sql = "SELECT * FROM achievements ORDER BY display_order ASC";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: "Lỗi Server" });
    res.json(results);
  });
});

app.get("/api/partners", (req, res) => {
  const sql = "SELECT * FROM partners";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: "Lỗi Server" });
    res.json(results);
  });
});

app.get("/api/campus", (req, res) => {
  const sql = "SELECT * FROM campus_models";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// ==========================================
// --- API TUYỂN SINH (ĐÃ SỬA LỖI MAIL) ---
// ==========================================
app.post("/api/admission", upload.array('files'), async (req, res) => {
  console.log("📩 Nhận hồ sơ mới từ:", req.body.full_name);

  const { full_name, birth_date, gender, address, cccd, major } = req.body;
  const files = req.files;

  // 1. Lưu vào Database
  const sql = "INSERT INTO admissions (full_name, birth_date, gender, address, cccd, major) VALUES (?, ?, ?, ?, ?, ?)";
  
  db.query(sql, [full_name, birth_date, gender, address, cccd, major], async (err, result) => {
    if (err) {
      console.error("❌ Lỗi lưu DB:", err);
      return res.status(500).json({ error: "Lỗi lưu Database" });
    }

    const admissionId = result.insertId;
    let attachmentsForEmail = []; 

    try {
      // 2. Lưu file vào folder server
      const baseDir = path.join(__dirname, 'public', 'user');
      if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });

      const userFolder = path.join(baseDir, `admission_${admissionId}`);
      if (!fs.existsSync(userFolder)) fs.mkdirSync(userFolder);

      // Lưu file JSON thông tin
      const infoData = { ...req.body, id: admissionId, submitted_at: new Date().toLocaleString('vi-VN') };
      fs.writeFileSync(path.join(userFolder, 'info.json'), JSON.stringify(infoData, null, 2), 'utf8');

      // Lưu ảnh & chuẩn bị file đính kèm
      if (files && files.length > 0) {
        files.forEach((file, index) => {
          const ext = path.extname(file.originalname) || ".jpg";
          const newFileName = `${index + 1}${ext}`;
          const filePath = path.join(userFolder, newFileName);

          fs.writeFileSync(filePath, file.buffer);

          attachmentsForEmail.push({
            filename: file.originalname, 
            path: filePath 
          });
        });
      }

      // 3. --- GỬI EMAIL (CODE ĐÃ SỬA) ---
      const mailOptions = {
        // SỬA: Dùng template string `${}` để lấy giá trị biến, KHÔNG dùng dấu ngoặc đơn bao quanh biến
        from: `"PTIT Admission System" <${process.env.EMAIL_USER}>`, 
        
        // Gửi cho chính email trong .env để test (hoặc bạn có thể hardcode email khác)
        to: process.env.EMAIL_USER, 
        
        subject: `[Hồ sơ Tuyển sinh] Ứng viên ${full_name} - Mã: ${admissionId}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd;">
            <h2 style="color: #c90000;">Thông báo Hồ sơ Xét tuyển Mới</h2>
            <p>Hệ thống vừa nhận được hồ sơ đăng ký trực tuyến.</p>
            <hr>
            <h3>Thông tin ứng viên:</h3>
            <ul>
              <li><strong>Họ tên:</strong> ${full_name}</li>
              <li><strong>Ngày sinh:</strong> ${birth_date}</li>
              <li><strong>Giới tính:</strong> ${gender}</li>
              <li><strong>CCCD:</strong> ${cccd}</li>
              <li><strong>Địa chỉ:</strong> ${address}</li>
              <li><strong>Ngành đăng ký:</strong> <span style="color: #0066cc; font-weight: bold;">${major}</span></li>
            </ul>
            <p>Các tài liệu đính kèm (Học bạ, chứng chỉ...) đã được đính kèm trong email này.</p>
            <br>
            <p><em>Email này được gửi tự động từ hệ thống Website PTIT Edu.</em></p>
          </div>
        `,
        attachments: attachmentsForEmail 
      };

      await transporter.sendMail(mailOptions);
      console.log(`✅ Đã gửi email thông báo hồ sơ ID: ${admissionId}`);

      res.json({ message: "Nộp hồ sơ và gửi email thành công!", id: admissionId });

    } catch (error) {
      console.error("❌ Lỗi xử lý file hoặc gửi mail:", error);
      res.status(200).json({ message: "Lưu hồ sơ thành công (Lỗi gửi mail)", id: admissionId });
    }
  });
});

const PORT = Number(process.env.PORT) || 5000;
app.listen(PORT, () => {
  console.log(`Backend chạy tại http://localhost:${PORT}`);
});