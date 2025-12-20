create database ptit_edu;
use ptit_edu;

CREATE TABLE history_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    year_date VARCHAR(50),
    title TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Thêm dữ liệu lịch sử PTIT
INSERT INTO history_events (year_date, title, description) VALUES 
('07/09/1953', 'Thành lập Đại học Bưu điện – Vô tuyến điện', 'Tiền thân của Học viện ngày nay.'),
('17/09/1966', 'Thành lập Viện Khoa học Kỹ thuật Bưu điện RIPT', ''),
('08/04/1975', 'Thành lập Viện Kinh tế Bưu điện ERIPT', ''),
('28/05/1988', 'Thành lập Trung tâm Đào tạo BCVT II (PTTC2)', ''),
('11/07/1997', 'Thành lập Học viện Công nghệ Bưu chính Viễn thông', 'Sắp xếp lại 4 đơn vị: PTTC1, PTTC2, Viện KHKT Bưu điện, Viện Kinh tế Bưu điện.'),
('17/09/1997', 'Công bố Quyết định thành lập', 'Chính thức ra mắt Học viện Công nghệ BCVT.'),
('22/03/1999', 'Thành lập Trung tâm CDIT', 'Trung tâm Công nghệ thông tin trực thuộc Học viện.'),
('01/07/2014', 'Chuyển về Bộ Thông tin và Truyền thông', 'Điều chuyển từ Tập đoàn VNPT về Bộ TTTT, tự chủ tài chính.'),
('27/02/2025', 'Quy hoạch trở thành ĐH trọng điểm Quốc gia', 'Theo Quyết định số 452/QĐ-TTg của Thủ tướng Chính phủ.');

ALTER TABLE history_events ADD COLUMN image VARCHAR(255) DEFAULT NULL;

UPDATE history_events SET image = 'moc-1.jpg' WHERE id = 1;
UPDATE history_events SET image = 'moc-2.jpg' WHERE id = 2;
UPDATE history_events SET image = 'moc-3.jpg' WHERE id = 3;
UPDATE history_events SET image = 'moc-4.jpg' WHERE id = 4;
UPDATE history_events SET image = 'moc-5.jpg' WHERE id = 5;
UPDATE history_events SET image = 'moc-6.jpg' WHERE id = 6;
UPDATE history_events SET image = 'moc-7.jpg' WHERE id = 7; 
UPDATE history_events SET image = 'moc-8.jpg' WHERE id = 8; 
UPDATE history_events SET image = 'moc-9.jpg' WHERE id = 9; 

CREATE TABLE campus_models (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    file_name VARCHAR(255) NOT NULL, -- File 3D (.glb)
    thumbnail VARCHAR(255)           -- Ảnh đại diện (.jpg/.png)
);

INSERT INTO campus_models (name, description, file_name, thumbnail) VALUES 
(
    'CƠ SỞ HÀ ĐÔNG', 
    'Là cơ sở giảng dạy chính tại Hà Nội dành cho sinh viên năm 1, 2, 3. Hệ thống giảng đường A1, A2, A3 được trang bị tiện nghi (máy chiếu, điều hòa...); cùng hệ thống phòng thí nghiệm và thư viện đa dạng đầu sách. Khuôn viên đáp ứng tốt nhu cầu thể chất (sân bóng chuyền, bóng rổ) và sinh hoạt (Ký túc xá, Căng tin, Nhà xe). Đặc biệt, Hội trường A2 là nơi thường xuyên diễn ra các hội thảo và sự kiện kỷ niệm lớn.', 
    'PTIT_HD.glb', 
    'thumb-hd.jpg'
),
(
    'CƠ SỞ NGỌC TRỤC', 
    'Cơ sở mới hiện đại được đưa vào sử dụng dành riêng cho sinh viên năm cuối. Tuy quy mô nhỏ gọn nhưng đáp ứng trọn vẹn nhu cầu học tập với trang thiết bị tối tân (TV, loa, mic...). Tại đây tích hợp đầy đủ tiện ích: Phòng Gym, Ký túc xá, Căng tin và Nhà xe. Đây là cơ sở trọng điểm với tiềm năng phát triển mạnh mẽ về cơ sở vật chất trong tương lai.', 
    'PTIT_NT.glb', 
    'thumb-nt.jpg'
);

select * from campus_models;

-- 1. Tạo bảng giới thiệu
CREATE TABLE IF NOT EXISTS intro_slides (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL, -- Tiêu đề ngắn gọn (Màu đỏ)
    description TEXT NOT NULL,   -- Nội dung chi tiết (Màu đen)
    image_url VARCHAR(255),      -- Đường dẫn ảnh nền (nếu muốn mỗi slide 1 ảnh)
    display_order INT DEFAULT 0  -- Thứ tự hiển thị
);

-- 2. Thêm dữ liệu mẫu (Đã tách tiêu đề và nội dung cho đẹp)
INSERT INTO intro_slides (title, description, display_order) VALUES 
('Cơ sở Giáo dục Đại học trọng điểm Quốc gia về kỹ thuật, công nghệ', 'Với vị thế và uy tín gần 75 năm trong đào tạo các ngành công nghệ số như Công nghệ thông tin, Trí tuệ Nhân tạo, Kỹ thuật Dữ liệu, Vi mạch bán dẫn, Công nghệ Đa phương tiện, Kỹ thuật điều khiển và Tự động hóa (Robotics), Điện tử Viễn thông, Điện – Điện tử…Học viện Công nghệ Bưu chính Viễn thông đóng vai trò hạt nhân, nòng cốt trong đào tạo nguồn nhân lực chất lượng cao và nhân tài; được Nhà nước ưu tiên đầu tư tiềm lực nghiên cứu, phát triển và đổi mới  sáng tạo phục vụ các lĩnh vực công nghệ cao, công nghệ chiến lược và chuyển đổi số quốc gia. Là trường công lập có năng lực, uy tín hàng đầu về đào tạo, nghiên cứu một số ngành, lĩnh vực công nghệ then chốt, mũi nhọn.', 1),

('Tiên phong đào tạo liên ngành Kinh tế, Báo chí, Truyền thông và Công nghệ số', 'Học viện đã và đang là Cơ sở đào tạo bậc đại học công lập dẫn đầu trong cung cấp nguồn nhân lực chất lượng cao trong thời đại kỷ nguyên số với nhiều chương trình đào tạo liên ngành, liên lĩnh vực, kết hợp công nghệ số với các ngành Kinh tế, Truyền thông lần đầu tiên được đào tạo tại Việt nam như Công nghệ Đa phương tiện (2011), Truyền thông đa phương tiện (2015), Công nghệ Tài chính (2021),  Thiết kế và Phát triển Game (2024)… Cùng với các ngành đào tạo liên ngành khác như Marketing (định hướng Marketing số), Thương mại Điện tử, Báo chí (định hướng Báo chí số) … trên cơ sở khai thác kinh nghiệm và uy tín trong đào tạo nhóm ngành Công nghệ thông tin, Điện tử, Viễn thông và các khối ngành Kinh tế và Truyền thông - Báo chí.', 2),

('Tiên phong trong Đổi mới sáng tạo và chuyển đổi số giáo dục Đại học', 'Học viện Công nghệ Bưu chính Viễn thông là 1 trong 7 trường Đại học đào tạo nguồn nhân lực An toàn thông tin trọng điểm Quốc gia từ năm 2013; 1 trong 5 trường đại học thuộc liên minh các cơ sở giáo dục đào tạo ngành Vi mạch bán dẫn từ năm 2023. Là đơn vị giáo dục duy nhất của Việt Nam nhận giải thưởng Công nghệ thông tin uy tín ASOCIO 2024 hạng mục Giáo dục số, được tổ chức SCImago bình chọn giữ vị trí số 1 về tiêu chí đổi mới sáng tạo trong bảng xếp hạng các cơ sở nghiên cứu khoa học tại Việt Nam. Trong lĩnh vực khoa học máy tính, Học viện cũng là Cơ sở giáo dục Đại học duy nhất tại Việt Nam được xếp hạng trong bảng xếp hạng về CS Ranking Châu Á.', 3);

DROP TABLE IF EXISTS achievements;

CREATE TABLE achievements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    number_val INT NOT NULL,       -- Giá trị số (VD: 30)
    prefix VARCHAR(10) DEFAULT '', -- Ký tự đầu (VD: #)
    suffix VARCHAR(10) DEFAULT '', -- Ký tự cuối (VD: +)
    description TEXT NOT NULL,     -- Mô tả chi tiết
    image_url VARCHAR(255),        -- Tên file ảnh minh họa (Bạn sẽ chèn ảnh thật vào đây)
    display_order INT DEFAULT 0
);

-- Dữ liệu chuẩn PTIT 2024 (Kèm tên ảnh placeholder)
INSERT INTO achievements (prefix, number_val, suffix, description, image_url, display_order) VALUES 
('#', 1, '', 'Về Đổi mới sáng tạo theo xếp hạng Scimago 2024', 'achieve_1.jpg', 1),
('', 30, '+', 'Chương trình đào tạo trình độ Đại học', 'achieve_2.jpg', 2),
('', 10, '', 'Chương trình đào tạo Thạc sĩ và Tiến sỹ', 'achieve_3.jpg', 3),
('', 3, '', 'Văn phòng hợp tác nghiên cứu, liên kết đào tạo quốc tế', 'achieve_4.jpg', 4),
('', 7, '', 'Cơ sở nghiên cứu, đào tạo trên toàn quốc', 'achieve_5.jpg', 5),
('', 400, '+', 'Đối tác doanh nghiệp trong và ngoài nước', 'achieve_6.jpg', 6);

CREATE TABLE IF NOT EXISTS partners (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    logo_url VARCHAR(255) NOT NULL,
    website_url VARCHAR(255)
);

-- Dữ liệu mẫu (Bạn đã cung cấp)
INSERT INTO partners (name, logo_url, website_url) VALUES 
('Samsung', 'samsung.png', 'https://www.samsung.com'),
('Ericsson', 'ericsson.png', 'https://www.ericsson.com'),
('Google', 'google.png', 'https://about.google'),
('Microsoft', 'microsoft.png', 'https://www.microsoft.com'),
('Naver', 'naver.png', 'https://www.navercorp.com'),
('FPT', 'fpt.png', 'https://fpt.com.vn'),
('VMO', 'vmo.png', 'https://vmogroup.com'),
('Rikei', 'rikei.png', 'https://rikei.vn'),
('Viettel', 'viettel.png', 'https://viettel.com.vn'),
('VNPT', 'vnpt.png', 'https://vnpt.com.vn'),
('Qualcomm', 'qualcomm.png', 'https://www.qualcomm.com'),
('MobiFone', 'mobifone.png', 'https://www.mobifone.vn'),
('ARM', 'arm.png', 'https://www.arm.com');

CREATE TABLE admissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(255),
    birth_date DATE,
    gender VARCHAR(20),
    address TEXT,
    cccd VARCHAR(50),
    major VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);