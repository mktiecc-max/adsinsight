import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  return NextResponse.json({
    runId: id,
    errors: [
      {
        row: 128,
        sheet: "LEADS_JUL",
        field: "phone",
        message: "Số điện thoại không đúng định dạng Việt Nam",
      },
      {
        row: 242,
        sheet: "ADS_RAW",
        field: "campaign_name",
        message: "Thiếu tên chiến dịch để ánh xạ",
      },
    ],
  });
}
