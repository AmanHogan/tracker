import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import List from "@/models/List";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const userId = (session.user as any).id;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "List ID required" }, { status: 400 });
  }

  const list = await List.findOne({ _id: id, userId });
  if (!list) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rows = list.items.map((item: any) => ({
    Section: item.section || "",
    Item: item.name,
    Notes: item.notes || "",
    "Cost Estimate": item.costEstimate || 0,
    "Delivery/Setup": item.deliverySetup || 0,
    "Actual Cost": item.actualCost || 0,
    Checked: item.checked ? "Yes" : "No",
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  const colWidths = [
    { wch: 20 },
    { wch: 30 },
    { wch: 40 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 8 },
  ];
  ws["!cols"] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, list.name.slice(0, 31));
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const safeName = list.name.replace(/[^a-zA-Z0-9_-]/g, "_");
  return new NextResponse(buf, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${safeName}.xlsx"`,
    },
  });
}
