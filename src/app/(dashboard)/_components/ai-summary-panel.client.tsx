"use client";

import { useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { cn } from "@/lib/shared/utils";

export function AiSummaryPanelClient() {
  const [aiGenerated, setAiGenerated] = useState(false);
  const [generating, setGenerating] = useState(false);

  const generateSummary = () => {
    setGenerating(true);
    window.setTimeout(() => {
      setAiGenerated(true);
      setGenerating(false);
    }, 850);
  };

  return (
    <section className="card ai-panel">
      <div className="ai-panel-top">
        <div className="ai-icon"><Sparkles size={17} /></div>
        <div>
          <strong>Diễn giải phân tích</strong>
          <p>AI chỉ diễn giải các con số đã được hệ thống tính sẵn.</p>
        </div>
        <button
          className={cn("button", aiGenerated ? "" : "button-primary")}
          onClick={generateSummary}
          disabled={generating}
        >
          {generating ? <RefreshCw size={14} className="spin" /> : <Sparkles size={14} />}
          {generating ? "Đang tạo…" : aiGenerated ? "Tạo lại" : "Tạo diễn giải"}
        </button>
      </div>
      {aiGenerated ? (
        <div className="ai-summary">
          <p>
            Chi tiêu tăng <b className="num">12,3%</b> nhưng SQL giảm{" "}
            <b className="num">2,1%</b>, khiến CPSQL tăng mạnh{" "}
            <b className="num metric-negative">14,8%</b>. Vấn đề chính không nằm ở lượng tin nhắn
            mà ở hiệu quả lấy số và chất lượng sau khi có số.
          </p>
          <p>
            <b>ucmas / tuyển sinh hè</b> là bẫy số rẻ: CPSQL chỉ{" "}
            <b className="num">84 N</b> nhưng tỷ lệ thoát bậc 0 chỉ{" "}
            <b className="num metric-negative">18,2%</b>. Không tăng ngân sách; đội quảng cáo cần
            rà lại creative và tệp trước khi chạy tiếp.
          </p>
        </div>
      ) : (
        <div className="ai-placeholder">
          Bấm “Tạo diễn giải” để nhận tóm tắt 3–5 câu theo đúng khoảng ngày và bộ lọc hiện tại.
        </div>
      )}
    </section>
  );
}
