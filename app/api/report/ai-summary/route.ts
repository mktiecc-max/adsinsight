import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    data: {
      markdown:
        "Chi tiêu tăng **12,3%** nhưng SQL giảm **2,1%**, khiến CPSQL tăng **14,8%**. Điểm nghẽn chính nằm ở tỷ lệ lấy số và chất lượng sau khi có số. Không tăng ngân sách cho `ucmas / tuyển sinh hè` dù CPSQL thấp, vì tỷ lệ thoát bậc 0 chỉ **18,2%**.",
      generated_by: process.env.ANTHROPIC_API_KEY ? "anthropic" : "deterministic-demo",
    },
  });
}
