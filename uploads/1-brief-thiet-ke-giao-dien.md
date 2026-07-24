# BRIEF THIẾT KẾ GIAO DIỆN
## Webapp báo cáo & phân tích hiệu suất Facebook Ads

> Tài liệu này tự chứa đủ ngữ cảnh — không cần đọc thêm tài liệu nào khác để thiết kế.
> Ngôn ngữ giao diện: **Tiếng Việt** · Tiền tệ: **VND** · Nền tảng: **Web, desktop-first**

---

# 1. SẢN PHẨM LÀ GÌ

Công cụ **nội bộ** báo cáo hiệu suất quảng cáo Facebook cho một hệ thống trung tâm giáo dục trẻ em tại Việt Nam (chương trình toán tư duy, tiền tiểu học).

Quảng cáo chạy mục tiêu **tin nhắn**. Người dùng cần biết chiến dịch nào mang lại nhiều số điện thoại nhất, rẻ nhất, **và** chất lượng nhất — ba thứ này thường không trùng nhau.

**Người dùng:** 3–8 chuyên viên marketing. Dùng trên laptop. Mở hằng ngày. Đọc số nhanh rồi ra quyết định tăng/giảm ngân sách.

**Cảm giác mong muốn:** công cụ làm việc chuyên nghiệp, dày dữ liệu, đọc nhanh. Không phải dashboard trình diễn cho lãnh đạo. Gần với Linear / Vercel Analytics hơn là Google Data Studio.

---

# 2. MÔ HÌNH NGHIỆP VỤ CẦN HIỂU TRƯỚC KHI THIẾT KẾ

## 2.1 Phễu 3 tầng — mỗi tầng một bộ phận chịu trách nhiệm

```
Chi tiêu ──→ Tin nhắn ──→ Số điện thoại ──→ Bậc 1 → 2 → 3 → 4
            └── CPR ──┘  └──── CPSQL ────┘
              Meta /       Đội chat          Đội tư vấn
              người chạy ads
```

Đây là ý tưởng trung tâm của toàn bộ sản phẩm. Giao diện phải liên tục làm rõ **vấn đề đang nằm ở tầng nào**, vì mỗi tầng do một bộ phận khác nhau phụ trách.

## 2.2 Từ điển chỉ số

| Tên hiển thị | Ý nghĩa | Hướng **tốt** | Đơn vị |
|---|---|---|---|
| Chi tiêu | Tiền đã tiêu | — | đ |
| Tin nhắn | Số cuộc trò chuyện Meta trả về | ↑ cao | số |
| **CPR** | Giá 1 tin nhắn | ↓ **thấp** | đ |
| **SQL** | Số điện thoại lấy được | ↑ cao | số |
| **Tỷ lệ lấy số** | SQL ÷ Tin nhắn | ↑ cao | % |
| **CPSQL** | Giá 1 số điện thoại | ↓ **thấp** | đ |
| **Tỷ lệ thoát bậc 0** | Bao nhiêu % số đi tiếp được | ↑ cao | % |
| CP_L1 … CP_L4 | Giá 1 lead đạt bậc N | ↓ **thấp** | đ |
| Tỷ lệ chuyển bậc | Bậc N ÷ Bậc N−1 | ↑ cao | % |
| Tỷ trọng organic | Lead không đến từ quảng cáo | — | % |
| Tỷ lệ trùng / SĐT lỗi | Chất lượng dữ liệu | ↓ thấp | % |
| Tỷ lệ khớp CRM | Lead tra được sang hệ CRM | — | % |

**Quan hệ then chốt phải hiện rõ trên giao diện:**

```
CPSQL = CPR ÷ Tỷ lệ lấy số
```

Khi CPSQL xấu đi, người dùng phải thấy ngay là do **CPR tăng** (lỗi quảng cáo) hay do **tỷ lệ lấy số giảm** (lỗi đội chat).

## 2.3 Bậc khách hàng (rank)

Mỗi số điện thoại có một **bậc cao nhất từng đạt**, từ 0 đến 4. Bậc 0 = mới có số, chưa đi đâu. Bậc 4 = cao nhất. Hành trình ngành giáo dục dài — bậc 3–4 cần 30–90 ngày mới chín.

## 2.4 Cái bẫy mà sản phẩm này sinh ra để phát hiện

> **Quảng cáo ra số RẺ NHẤT thường là quảng cáo TỆ NHẤT.**

Quảng cáo nhắm sai đối tượng hoặc câu kéo bằng quà tặng luôn cho CPSQL rẻ, rồi 90% số đó nằm chết ở bậc 0. Nếu chỉ nhìn CPSQL, người dùng sẽ liên tục rót thêm tiền vào đúng nhóm này.

Vì vậy hệ thống chấm điểm bằng **hai trục độc lập**, không gộp thành một chỉ số:

| Vùng | CPSQL | Tỷ lệ thoát bậc 0 | Nhãn | Ý nghĩa |
|---|---|---|---|---|
| 🟢 | thấp | cao | **Nhân rộng** | Tốt thật, tăng ngân sách |
| 🔴 | thấp | **thấp** | **Bẫy số rẻ** | Nguy hiểm nhất — không tăng ngân sách |
| 🟡 | cao | cao | **Đúng tệp nhưng đắt** | Giữ, tối ưu chi phí |
| ⚫ | cao | thấp | **Dừng** | Tắt, dồn tiền sang 🟢 |

Vùng 🔴 phải được thiết kế để **nhìn là thấy ngay**, không lẫn với các vùng khác.

---

# 3. NĂM ĐIỀU QUAN TRỌNG NHẤT

**① Bảng hiệu suất là trái tim sản phẩm.**
Dành nhiều công nhất ở đây: header dính, cột tên dính trái, thanh nhiệt trong ô, chữ số đều cột, 15+ cột nhưng vẫn đọc được.

**② Màu tốt/xấu phải theo hướng riêng của từng chỉ số.**
CPR giảm = tốt = xanh. Tỷ lệ lấy số giảm = xấu = đỏ. **Không** được dùng một quy tắc màu chung cho mọi con số. Đây là lỗi phổ biến nhất khi thiết kế loại sản phẩm này.

**③ Trạng thái "mờ" là một trạng thái thiết kế riêng và bắt buộc.**
Chỉ số có cỡ mẫu quá nhỏ (dưới 20 tin nhắn hoặc dưới 5 SĐT) vẫn phải hiện, nhưng ở dạng mờ kèm nhãn giải thích. **Không ẩn, cũng không hiện như bình thường.**

**④ Khối "Phân rã chẩn đoán"** trong panel chi tiết là thành phần đặc trưng nhất — một công thức nhân 3 vế, mỗi vế tô màu riêng, kết luận chỉ đích danh bộ phận chịu trách nhiệm. Đây là thứ khiến sản phẩm này khác một dashboard thông thường.

**⑤ Thẻ cảnh báo** luôn gồm đủ 4 phần: nhãn · đối tượng · bằng chứng số kèm trung vị để so · hành động cụ thể. Không thẻ nào được phép chỉ nói "hiệu quả kém".

---

# 4. RÀNG BUỘC BẮT BUỘC

| # | Ràng buộc | Lý do |
|---|---|---|
| 1 | **Chữ số dạng tabular (đều cột)** trên mọi bảng và thẻ KPI | Bảng nhiều số, lệch cột là không đọc được |
| 2 | **Màu tốt/xấu theo hướng của từng chỉ số** | Xem điều ② ở trên |
| 3 | **Trạng thái mờ cho cỡ mẫu nhỏ** | Xem điều ③ ở trên |
| 4 | **Bộ chọn khoảng ngày luôn ở header**, giữ nguyên khi chuyển trang | Mọi con số đều phụ thuộc khoảng ngày |
| 5 | Ưu tiên **mật độ thông tin** hơn khoảng trắng | Người dùng là chuyên viên, xem hằng ngày |
| 6 | **Desktop-first, tối thiểu 1280px** | Công cụ nội bộ, dùng trên laptop |
| 7 | Bảng có **header dính** và **cột đầu dính** | Bảng rộng, cuộn ngang nhiều |
| 8 | Toàn bộ nhãn **tiếng Việt** | |

**Tự do sáng tạo:** bảng màu, kiểu chữ, bo góc, đổ bóng, biểu tượng, cách thể hiện biểu đồ, hiệu ứng chuyển động.

---

# 5. QUY ƯỚC HIỂN THỊ SỐ

```
Tiền:      < 1.000          → "847 đ"
           1.000–999.999    → "285 N"       (nghìn)
           ≥ 1.000.000      → "1,24 Tr"     (triệu)
           ≥ 1.000.000.000  → "1,24 Tỷ"
           Bảng chi tiết dùng số đầy đủ: "285.087 đ"

Phần trăm: 1 chữ số thập phân — "12,3%"
Số đếm:    ngăn nghìn bằng dấu chấm — "1.240"
Thập phân: dấu phẩy (chuẩn Việt Nam)
Rỗng:      "—"  (không hiện "0" hay "NaN")
So sánh:   "▲ 12,3%" / "▼ 8,1%" — mũi tên chỉ hướng thay đổi,
           MÀU chỉ tốt hay xấu (theo hướng riêng của chỉ số đó)
```

---

# 6. SITEMAP

```
/                       Tổng quan            ← trang chủ
/performance            Bảng hiệu suất       ← màn hình làm việc chính
/performance/:level/:id Chi tiết đối tượng   (panel trượt, không rời trang)
/funnel                 Phễu & chất lượng
/alerts                 Cảnh báo
/leads                  Tra cứu lead
/sync                   Đồng bộ & nhật ký    [admin]
/settings               Cài đặt              [admin]
  ├── /settings/ads        Nguồn dữ liệu quảng cáo
  ├── /settings/leads      Nguồn lead (POSCAKE)
  ├── /settings/crm        Nguồn bậc CRM
  └── /settings/general    Ngưỡng & cấu hình chung
/login                  Đăng nhập
```

---

# 7. BỐ CỤC KHUNG

```
┌────────────────────────────────────────────────────────────────────┐
│ [Logo]  Tổng quan · Hiệu suất · Phễu · Cảnh báo(3) · Lead   [👤]  │  ← header
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ 📅 01/06/2026 – 30/06/2026 ▾ │ Brand ▾ │ Người chạy ▾ │ TK ▾ │ │  ← thanh lọc dính
│ └────────────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│                        NỘI DUNG TRANG                              │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│ Đồng bộ lần cuối: 24/07/2026 09:14 · 1.240 dòng   [Đồng bộ ngay]  │  ← footer dính
└────────────────────────────────────────────────────────────────────┘
```

Bộ chọn khoảng ngày có mốc nhanh: **7 ngày · 30 ngày · 90 ngày · Tháng này · Tháng trước · Tùy chọn**. Mặc định 30 ngày.

Bộ lọc: **Brand** (ucmas / uckid) · **Người chạy** (tên người quản lý chiến dịch) · **Tài khoản quảng cáo**.

---

# 8. TỪNG MÀN HÌNH

## 8.1 Tổng quan `/`

**Mục đích:** mở lên trong 5 giây biết toàn cảnh có ổn không.

```
┌──────────────────────────────────────────────────────────────────┐
│ ⚠️  3 cảnh báo mức Cao · ước tính 4,2 Tr đ vượt chuẩn   [Xem →]  │  ← băng đỏ, chỉ hiện khi có
└──────────────────────────────────────────────────────────────────┘

┌─── Hàng KPI (6 thẻ) ─────────────────────────────────────────────┐
│ Chi tiêu     Tin nhắn    CPR        SQL        Tỷ lệ lấy số  CPSQL│
│ 48,2 Tr      1.240       38,9 N     412        33,2%        117 N │
│ ▲ 12,3%      ▲ 8,1%      ▲ 3,9%     ▼ 2,1%     ▼ 6,4%       ▲ 14,8%│
│ (trung tính) (xanh)      (đỏ)       (đỏ)       (đỏ)         (đỏ)  │
└──────────────────────────────────────────────────────────────────┘
   ↑ MŨI TÊN = hướng thay đổi. MÀU = tốt hay xấu, theo hướng của từng chỉ số.
     CPR tăng → mũi tên lên nhưng màu ĐỎ, vì CPR thấp mới tốt.

┌─── Phễu chuyển đổi (nằm ngang) ─────────────────────────────────┐
│  Chi tiêu ──→ Tin nhắn ──→ SQL ──→ Bậc 1+ ──→ Bậc 2+ ──→ Bậc 4  │
│   48,2Tr       1.240       412       198       —         —      │
│               CPR 38,9N   33,2%     48,1%   chưa chín  chưa chín│
│                          ↑lấy số   ↑thoát bậc 0                 │
└──────────────────────────────────────────────────────────────────┘
   Hover vào mỗi mắt xích → hiện bộ phận chịu trách nhiệm

┌─── Xu hướng theo ngày ────┐  ┌─── Ma trận 2 trục ──────────────┐
│ Kết hợp:                  │  │  Trục Y: Tỷ lệ thoát bậc 0      │
│  ▮ Chi tiêu (cột)         │  │  Trục X: CPSQL                  │
│  ─ SQL (đường)            │  │  Kích thước chấm = chi tiêu     │
│  ─ CPSQL (đường, trục phụ)│  │  4 vùng tô nền nhạt + nhãn      │
│                           │  │  🟢Nhân rộng 🔴Bẫy số rẻ        │
│                           │  │  🟡Đắt      ⚫Dừng               │
│                           │  │  Đường chia = trung vị (nét đứt)│
└───────────────────────────┘  └─────────────────────────────────┘

┌─── Top 5 tốt nhất ────────┐  ┌─── Top 5 cần xử lý ─────────────┐
│ xếp theo CPSQL tăng dần   │  │ xếp theo chi phí vượt chuẩn      │
│ (đã lọc bỏ cỡ mẫu nhỏ)    │  │ giảm dần                         │
└───────────────────────────┘  └─────────────────────────────────┘

┌─── Diễn giải AI ─────────────────────────────────────────────────┐
│ [Tạo diễn giải]  → hiện khối văn bản, có nút tạo lại             │
└──────────────────────────────────────────────────────────────────┘
```

---

## 8.2 Bảng hiệu suất `/performance`

**Đây là màn hình quan trọng nhất — thiết kế kỹ nhất ở đây.**

```
┌─ Mức gộp ───────────────────────────────────────────────────────┐
│ [Chiến dịch] [Nhóm QC] [Quảng cáo] [Creative] [Người chạy] [Brand]│
│  ☐ Hiện cả dòng cỡ mẫu nhỏ    🔍 Tìm...      [⚙ Chọn cột] [⬇ CSV]│
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ Tên            │Vùng│Chi tiêu│Tin nhắn│ CPR  │ SQL │Lấy số│ CPSQL │…│
│ (dính trái)    │    │        │        │      │     │      │       │ │
├────────────────┼────┼────────┼────────┼──────┼─────┼──────┼───────┼─┤
│ ucmas/mess/    │ 🟢 │ 12,4Tr │  318   │38,9N │ 112 │35,2% │ 110 N │ │
│  content a tùng│    │ ▓▓▓▓▓▓ │        │      │▓▓▓▓ │      │       │ │
│ ucmas/mess/    │ 🔴 │  8,1Tr │  240   │33,7N │  96 │40,0% │  84 N │ │
│  tuyển sinh    │    │ ▓▓▓▓   │        │      │▓▓▓  │      │  ⚠    │ │
│ uckid/mess/    │ ░░ │  1,2Tr │   12   │ ░░░  │   3 │ ░░░  │  ░░░  │ │  ← dòng MỜ
│  bé 5t… ⓘ     │    │ ▓      │        │      │▓    │      │       │ │
└──────────────────────────────────────────────────────────────────┘
   ▓ = thanh nhiệt trong ô (nền), tỷ lệ so với dòng lớn nhất
   Nhấp vào dòng → mở panel chi tiết trượt từ phải
```

### Cột

| Nhóm | Cột | Mặc định |
|---|---|---|
| Định danh | Tên · Vùng ma trận · Trạng thái | ✔ hiện |
| Giá | Chi tiêu · Tin nhắn · CPR · SQL · CPSQL | ✔ hiện |
| Cầu nối | Tỷ lệ lấy số | ✔ hiện |
| Chất lượng | Tỷ lệ thoát bậc 0 · Bậc 2+ · CP_L2 | ✔ hiện |
| Chất lượng sâu | Bậc 1+/3+/4 · CP_L1/L3/L4 · tỷ lệ chuyển từng bậc | ẩn |
| Chẩn đoán | CTR · CPM · Frequency · tỷ lệ trùng · tỷ lệ SĐT lỗi · tỷ lệ khớp CRM | ẩn |

Nút **⚙ Chọn cột** cho bật/tắt từng cột.

### Hành vi bảng

- Sắp xếp bất kỳ cột nào; mặc định CPSQL tăng dần
- **Header dính** khi cuộn dọc, **cột Tên dính trái** khi cuộn ngang
- **Dòng cỡ mẫu nhỏ:** chữ mờ ~50%, nền sọc rất nhạt, biểu tượng ⓘ với tooltip *"Chỉ 12 tin nhắn / 3 SĐT — chưa đủ để so sánh"*. Mặc định ẩn, bật bằng checkbox trên đầu
- **Thanh nhiệt trong ô:** cột Chi tiêu và SQL vẽ thanh nền theo tỷ lệ so với dòng lớn nhất
- Ô có cảnh báo gắn biểu tượng ⚠ nhỏ, hover ra tên cảnh báo
- **Dòng tổng cố định ở đáy bảng**
- Phân trang 50 dòng hoặc cuộn vô hạn

### Panel chi tiết (trượt từ phải)

```
┌───────────────────────────────────────────┐
│ ucmas/mess/tuyển sinh              [✕]   │
│ haicm · ucmas · mess          🔴 Bẫy số rẻ│
├───────────────────────────────────────────┤
│ ┌─ PHÂN RÃ CHẨN ĐOÁN ───────────────────┐ │
│ │ CP_L2 = CPR × 1/lấy số × 1/chuyển bậc │ │
│ │  420N =33,7N ×  2,50   ×    4,98      │ │
│ │         🟢       🟢          🔴        │ │
│ │                                       │ │
│ │ → Vấn đề nằm ở ĐỘI TƯ VẤN             │ │
│ └───────────────────────────────────────┘ │
│                                           │
│ [Chỉ số] [Theo ngày] [Phân bố bậc] [Lead] │
│                                           │
│ • Xu hướng CPR & tỷ lệ lấy số theo ngày   │
│ • Bảng con (nếu đang ở mức chiến dịch)    │
│ • Danh sách 20 lead gần nhất              │
└───────────────────────────────────────────┘
```

Khối **Phân rã chẩn đoán** là thành phần đặc trưng nhất của sản phẩm. Mỗi vế tô màu riêng theo mức độ tốt/xấu. Câu kết luận chỉ đích danh bộ phận chịu trách nhiệm (Quảng cáo / Đội chat / Đội tư vấn).

---

## 8.3 Phễu & chất lượng `/funnel`

**Mục đích:** tách bạch trách nhiệm giữa quảng cáo, đội chat và đội tư vấn.

```
┌─── Phễu lớn (bậc thang dọc) ────────────────────────────────────┐
│ Tin nhắn        1.240   ████████████████████  100%              │
│ → SĐT (SQL)       412   ███████               33,2%   ↓ đội chat│
│ → Bậc 1+          198   ███                   48,1%   ↓ tư vấn  │
│ → Bậc 2+           87   █▌                    43,9%             │
│ → Bậc 3+           31   ▌                     35,6%             │
│ → Bậc 4             9   ▏                     29,0%             │
└──────────────────────────────────────────────────────────────────┘

┌─── Tỷ lệ lấy số theo người chạy / theo brand ───────────────────┐
│ Thanh ngang so sánh, có đường trung vị                          │
│ Kèm KẾT LUẬN TỰ ĐỘNG (khối chữ nổi bật):                        │
│  "Lệch đều ở mọi quảng cáo → vấn đề ở kịch bản chat"            │
│  hoặc "Chỉ 3 quảng cáo thấp → vấn đề ở tệp/creative"            │
└──────────────────────────────────────────────────────────────────┘

┌─── Phân bố bậc ────────────┐ ┌─── Chất lượng nguồn ────────────┐
│ Cột chồng theo brand:      │ │ Organic vs Quảng cáo:            │
│ bậc 0/1/2/3/4              │ │ số lượng · tỷ lệ thoát bậc 0     │
│ (ucmas và uckid tách riêng)│ │ đặt cạnh nhau để so              │
└────────────────────────────┘ └──────────────────────────────────┘

┌─── SỨC KHỎE DỮ LIỆU ────────────────────────────────────────────┐
│ Lead có gắn quảng cáo   78,4%  ████████░░  (kỳ trước 79,1%)     │
│ Lead khớp được CRM      12,6%  █░░░░░░░░░  (kỳ trước 12,2%)  ⓘ │
│ SĐT lỗi định dạng        0,3%  ░░░░░░░░░░                       │
│ SĐT trùng                4,1%  ░░░░░░░░░░                       │
└──────────────────────────────────────────────────────────────────┘
```

Khối **Sức khỏe dữ liệu** quan trọng hơn vẻ ngoài của nó: ba con số này tụt đột ngột là dấu hiệu dữ liệu hỏng, phát hiện được **trước khi** báo cáo kịp sai. Nếu "Lead khớp CRM" xuống dưới 10% → hiện cảnh báo nổi bật: *"Tầng chất lượng gần như không có dữ liệu"*.

---

## 8.4 Cảnh báo `/alerts`

Danh sách thẻ, xếp theo **chi phí vượt chuẩn** giảm dần (số tiền lẽ ra tiết kiệm được nếu chạy ở mức hiệu quả trung bình).

```
┌──────────────────────────────────────────────────────────────────┐
│ Bộ lọc: [Tất cả] [🔴 Cao] [🟡 Trung bình] [🔵 Thấp]              │
├──────────────────────────────────────────────────────────────────┤
│ 🔴 BẪY SỐ RẺ                          Vượt chuẩn: 2,4 Tr đ       │
│ ucmas/mess/tuyển sinh · Rèn não bộ - Mở tư duy                   │
│                                                                  │
│ CPSQL 84 N  (trung vị 117 N — rẻ hơn 28%)                       │
│ Tỷ lệ thoát bậc 0: 18,2%  (trung vị 48,1% — chỉ bằng 38%)       │
│                                                                  │
│ → Không tăng ngân sách. Quảng cáo này ra số rẻ nhưng gần như     │
│   không có số nào đi tiếp. Soi lại creative và độ tuổi tệp.      │
│                            [Xem chi tiết]  [Bỏ qua 7 ngày]       │
├──────────────────────────────────────────────────────────────────┤
│ 🟡 CPR LEO THANG                      Vượt chuẩn: 680 N đ        │
│ …                                                                │
└──────────────────────────────────────────────────────────────────┘

┌─── Cảnh báo đang tắt ────────────────────────────────────────────┐
│ ⓘ 3 quy tắc chưa chạy được: Bão hòa tệp · Creative mòn ·        │
│   Đấu giá đắt lên                                                │
│   Cần bổ sung cột vào nguồn dữ liệu: impressions, clicks,        │
│   frequency                                                      │
└──────────────────────────────────────────────────────────────────┘
```

Mỗi thẻ gồm **4 phần cố định**: nhãn cảnh báo · đối tượng · bằng chứng số (luôn kèm trung vị để so) · hành động cụ thể.

Danh sách các loại cảnh báo cần thiết kế nhãn: *Bẫy số rẻ · Bẫy tin nhắn rẻ · Đốt tiền không ra tin nhắn · Đốt tiền không ra số · Tỷ lệ lấy số vượt 100% · Sập tỷ lệ lấy số toàn tài khoản · Số rác bất thường · CPR leo thang · Tắc ở một bậc · Bão hòa tệp · Creative mòn · Đấu giá đắt lên*.

---

## 8.5 Tra cứu lead `/leads`

Bảng đơn giản, phục vụ đối chiếu thủ công khi nghi ngờ số liệu.

| Cột | Ghi chú |
|---|---|
| SĐT | 9 số, có nút sao chép |
| Tên khách | |
| Ngày vào | |
| Quảng cáo mang về | Rỗng = badge **Organic** |
| Chiến dịch | |
| Fanpage | |
| Bậc cao nhất | Badge màu theo bậc 0–4 |
| Trong CRM | ✔ / ✘ |
| Trạng thái SĐT | Hợp lệ / Trùng / Lỗi / Loại trừ |

Ô tìm kiếm chấp nhận SĐT ở **mọi định dạng** (`0912…`, `84912…`, `912…`).

---

## 8.6 Đồng bộ `/sync` `[admin]`

Dữ liệu vào hệ thống bằng **nút bấm thủ công**, không tự động. Có 3 nguồn riêng biệt.

```
┌─── Ba thẻ nguồn ────────────────────────────────────────────────┐
│ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐        │
│ │ 📊 Quảng cáo   │ │ 📞 Lead        │ │ 🎯 Bậc CRM     │        │
│ │ ✅ 09:14 hôm nay│ │ ✅ 09:14       │ │ ⚠️ 3 ngày trước│        │
│ │ 1.240 dòng     │ │ 2.418 dòng     │ │ 856 dòng       │        │
│ │ [Chạy thử][Sync]│ │ [Chạy thử][Sync]│ │ [Chạy thử][Sync]│      │
│ └────────────────┘ └────────────────┘ └────────────────┘        │
│                    [ ⟳ ĐỒNG BỘ TẤT CẢ ]                          │
└──────────────────────────────────────────────────────────────────┘

┌─── Khi đang chạy ───────────────────────────────────────────────┐
│ Đang đồng bộ Lead…                                               │
│ ████████████████████░░░░░░░░  68%   1.642 / 2.418 dòng          │
│ ✔ Hợp lệ 1.630   ⚠ Lỗi 12                          [Hủy]        │
└──────────────────────────────────────────────────────────────────┘

┌─── Kết quả ─────────────────────────────────────────────────────┐
│ ✅ Hoàn tất lúc 09:14 · 42 giây                                  │
│ 1.240 dòng chi tiêu · 87 lead mới · 34 thay đổi bậc · 12 lỗi    │
│ Sức khỏe: có quảng cáo 78,4% · khớp CRM 12,6% · SĐT lỗi 0,3%    │
│                                          [Xem 12 dòng lỗi →]     │
└──────────────────────────────────────────────────────────────────┘

┌─── Lịch sử 20 lần gần nhất ─────────────────────────────────────┐
│ Thời gian │ Nguồn │ Chế độ │ Kết quả │ Thời lượng │ Lỗi │       │
└──────────────────────────────────────────────────────────────────┘
```

**Nút "Chạy thử"** xử lý toàn bộ nhưng không ghi dữ liệu — trả về "1.240 dòng hợp lệ, 12 dòng lỗi" kèm bảng chi tiết. Thiết kế nút này **nổi bật ngang** nút Đồng bộ, không phải nút phụ, vì quy trình đúng là chạy thử sạch rồi mới đồng bộ thật.

**Bảng dòng lỗi:** số dòng trong nguồn · nội dung dòng thô · lý do cụ thể (*"SĐT sau chuẩn hóa bắt đầu bằng 2 — không thuộc dải đầu số di động"*).

---

## 8.7 Cài đặt `/settings` `[admin]`

Bốn thẻ: **Quảng cáo · Lead · CRM · Chung**. Ba thẻ đầu cấu trúc **giống hệt nhau**, gồm 4 khối xếp dọc.

### Khối 1 — Kết nối
```
Link nguồn dữ liệu  [ https://docs.google.com/spreadsheets/d/… ]
Tab                 [ Dữ liệu quảng cáo ▾ ]
Dòng tiêu đề        [ 1 ]
                    [ 🔍 Đọc cấu trúc ]
```
Sau khi đọc → hiện bảng xem trước 5 dòng đầu, cuộn ngang được.

### Khối 2 — Ánh xạ trường
```
┌──────────────────┬──────────────────────┬─────────────────┬───┐
│ Trường chuẩn     │ Cột trong nguồn      │ Xử lý           │   │
├──────────────────┼──────────────────────┼─────────────────┼───┤
│ Mã quảng cáo ●   │ [ ad_id          ▾ ] │ [ Cắt khoảng ▾]│ ✔ │
│ SĐT          ●   │ [ SĐT phụ huynh  ▾ ] │ [ SĐT VN     ▾]│ ✔ │
│ Ngày         ●   │ [ — chưa chọn —  ▾ ] │ [ Ngày d/m/y ▾]│ ⚠ │  ← viền đỏ
│ Tin nhắn         │ [ Kết quả        ▾ ] │ [ Số VN      ▾]│ ✔ │
└──────────────────┴──────────────────────┴─────────────────┴───┘
                                            [ ✨ Tự động khớp ]

● = bắt buộc. Chưa map đủ trường bắt buộc → CHẶN LƯU.
```

### Khối 3 — Quy đổi bậc *(chỉ hiện ở thẻ CRM)*
```
┌──────────────┬────────┬───────────────────────────────┐
│ Giá trị      │ Bậc    │ Số dòng đang có               │
├──────────────┼────────┼───────────────────────────────┤
│ L0.R         │ [ 0 ▾] │ 8                             │
│ L0.K         │ [ 0 ▾] │ 6                             │
│ L1.KK        │ [ 0 ▾] │ 5                             │
│ L2.2A        │ [ 2 ▾] │ 34                            │
│ L5.NEW  🆕   │ [ — ▾] │ 3   ⚠ chưa gán, đang tính 0  │
└──────────────┴────────┴───────────────────────────────┘
```
Giá trị mới xuất hiện trong nguồn mà chưa gán bậc → gắn nhãn 🆕 + cảnh báo.

### Khối 4 — Chạy thử & Đồng bộ
Hai nút, kết quả hiện ngay bên dưới.

### Thẻ Chung
Ngưỡng cỡ mẫu tối thiểu · Ngưỡng từng cảnh báo (bảng sửa được từng dòng) · Khoảng ngày mặc định · Danh sách SĐT loại trừ · Trạng thái kết nối nguồn.

---

# 9. DANH MỤC COMPONENT

```
atoms/
  Button · Badge · Input · Select · Checkbox · Tooltip · Spinner
  MetricValue      ← nhận (giá trị, đơn vị, hướng tốt, muted?)
  DeltaIndicator   ← ▲▼ + màu theo hướng riêng của chỉ số
  RankBadge        ← badge bậc 0–4
  ZoneChip         ← 🟢🔴🟡⚫ + tên vùng
  SeverityDot      ← mức cảnh báo

molecules/
  DateRangePicker · FilterBar · KpiCard · ColumnPicker
  SyncSourceCard · FieldMapRow · LevelMapRow
  SampleSizeWarning · HealthBar

organisms/
  AppHeader · StickyFilterBar · SyncFooter
  PerformanceTable      ← header dính, cột dính, thanh nhiệt trong ô
  FunnelChart · MatrixScatter · TrendChart · LevelDistribution
  AlertCard · AlertList
  DetailDrawer · DiagnosticBreakdown   ← khối phân rã 3 vế
  AiSummaryPanel
  SyncProgress · SyncHistoryTable · RowErrorTable
  SheetPreviewTable · FieldMapTable

templates/
  AppLayout · SettingsLayout · AuthLayout
```

---

# 10. TRẠNG THÁI PHẢI THIẾT KẾ

Đây là phần hay bị bỏ sót nhất — cần thiết kế đủ.

| Trạng thái | Xuất hiện ở | Nội dung |
|---|---|---|
| Đang tải | mọi trang | Skeleton đúng hình dạng nội dung, **không** dùng spinner giữa màn hình |
| Chưa cấu hình | lần đầu chạy | "Chưa kết nối nguồn dữ liệu" + nút đi tới Cài đặt |
| Đã cấu hình, chưa đồng bộ | | "Chưa có dữ liệu — bấm Đồng bộ để bắt đầu" |
| Không có dữ liệu trong khoảng | mọi báo cáo | "Không có chi tiêu trong 01/06 – 30/06" + nút mở rộng khoảng |
| **Cỡ mẫu nhỏ** | bảng, thẻ | Mờ + nhãn giải thích. **Không ẩn** |
| **Chỉ số chưa chín** | bậc 3–4 | "Chưa đủ 60 ngày — còn 12 ngày nữa mới đọc được" |
| Cảnh báo bị tắt | trang Cảnh báo | Liệt kê quy tắc + dữ liệu còn thiếu |
| Đang đồng bộ | toàn cục | Thanh tiến trình ở footer, chặn nút Đồng bộ khác |
| Đồng bộ lỗi | | Thông báo + link tới bảng dòng lỗi |
| Lỗi tải | mọi trang | Thông báo + nút thử lại |

---

# 11. RESPONSIVE

| Kích thước | Hành vi |
|---|---|
| ≥ 1440px | Đầy đủ, bảng hiện mọi cột đã bật |
| 1280–1439px | Đầy đủ, bảng cuộn ngang |
| 768–1279px | Điều hướng thu thành menu, biểu đồ xếp dọc, bảng cuộn ngang |
| < 768px | **Chỉ hỗ trợ đọc** Tổng quan và Cảnh báo. Bảng hiệu suất chuyển thành danh sách thẻ rút gọn (tên · CPSQL · SQL · vùng). Màn hình Cài đặt và Đồng bộ hiện thông báo yêu cầu dùng máy tính |

---

# 12. TÓM TẮT ĐẦU RA MONG MUỐN

1. **Design token**: bảng màu (có màu ngữ nghĩa cho tốt/xấu/trung tính, 4 màu vùng ma trận, 3 mức cảnh báo), kiểu chữ (**bắt buộc có font chữ số tabular**), thang khoảng cách, bo góc, đổ bóng
2. **Component library** theo danh mục mục 9, đủ các trạng thái mục 10
3. **8 màn hình** theo mục 8, ưu tiên độ hoàn thiện: Bảng hiệu suất > Tổng quan > Cảnh báo > Phễu > Đồng bộ > Cài đặt > Lead > Đăng nhập
4. Thiết kế riêng cho **panel chi tiết** và khối **Phân rã chẩn đoán**
5. Trạng thái responsive ở 1280px và < 768px cho Tổng quan
