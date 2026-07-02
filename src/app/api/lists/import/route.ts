import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import List from "@/models/List";
import * as XLSX from "xlsx";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const userId = (session.user as any).id;

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const listId = formData.get("listId") as string | null;
  const listName = formData.get("name") as string | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const wb = XLSX.read(new Uint8Array(arrayBuffer));
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[] = XLSX.utils.sheet_to_json(ws);

  const items = rows.map((row, idx) => ({
    section: row["Section"] || row["section"] || "",
    name: row["Item"] || row["item"] || row["Name"] || row["name"] || "",
    notes: row["Notes"] || row["notes"] || "",
    costEstimate:
      parseFloat(row["Cost Estimate"] || row["costEstimate"] || row["Cost"] || row["cost"] || 0) || 0,
    deliverySetup:
      parseFloat(row["Delivery/Setup"] || row["deliverySetup"] || row["Delivery"] || row["delivery"] || 0) || 0,
    actualCost:
      parseFloat(row["Actual Cost"] || row["actualCost"] || row["Actual"] || row["actual"] || 0) || 0,
    checked:
      row["Checked"] === "Yes" || row["checked"] === true || row["Checked"] === true,
    sortOrder: idx,
  })).filter((item) => item.name);

  if (listId) {
    const list = await List.findOneAndUpdate(
      { _id: listId, userId },
      { $push: { items: { $each: items } } },
      { new: true }
    );
    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }
    return NextResponse.json({ count: items.length, list });
  }

  const list = await List.create({
    userId,
    name: listName || file.name.replace(/\.[^.]+$/, "") || "Imported List",
    type: "checklist",
    description: "Imported from Excel",
    items,
  });

  return NextResponse.json({ count: items.length, list }, { status: 201 });
}
