import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import Papa from "papaparse";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Transaction from "@/models/Transaction";
import { FIDELITY_CATEGORY_MAP, getMonthKey } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const month = formData.get("month") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "CSV file is required" },
        { status: 400 }
      );
    }

    let csvText = await file.text();
    csvText = csvText.replace(/^﻿/, "");
    const lines = csvText.split("\n");

    // Skip the first row ("Spending Transactions:")
    const dataStart = lines.findIndex((l) =>
      l.includes('"Date"') && l.includes('"Description"')
    );
    const csvWithoutHeader = lines.slice(dataStart >= 0 ? dataStart : 1).join("\n");

    const parsed = Papa.parse(csvWithoutHeader, {
      header: true,
      skipEmptyLines: true,
    });

    const transactions: any[] = [];
    let minDate: Date | null = null;
    let maxDate: Date | null = null;

    for (const row of parsed.data as any[]) {
      const transactionType = row["Transaction Type"];
      if (transactionType !== "Expenses") continue;

      const rawAmount = parseFloat(
        (row["Amount (in $)"] || row["Amount"] || "0").replace(/[$,]/g, "")
      );
      if (rawAmount === 0) continue;

      // Parse date from "Jun-25-2026" format
      const dateStr = row["Date"];
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) continue;

      // If month filter provided, only import matching transactions
      if (month && getMonthKey(date) !== month) continue;

      // Negative amounts are expenses, store as positive
      const amount = Math.abs(rawAmount);
      const type = rawAmount < 0 ? "expense" : "income";

      const subcategory = row["Subcategory"] || "";
      const category = FIDELITY_CATEGORY_MAP[subcategory] || "Other";
      const account = row["Account Name"] || "";
      const description = row["Description"] || "";

      transactions.push({
        userId,
        date,
        description,
        amount,
        type,
        category,
        account,
      });

      if (!minDate || date < minDate) minDate = date;
      if (!maxDate || date > maxDate) maxDate = date;
    }

    if (transactions.length === 0) {
      return NextResponse.json({ imported: 0, month: month || "" });
    }

    await connectDB();

    // Delete existing imported transactions (those with an account field)
    // in the date range to allow re-importing without duplicates
    if (minDate && maxDate) {
      await Transaction.deleteMany({
        userId,
        account: { $exists: true, $ne: "" },
        date: {
          $gte: minDate,
          $lte: maxDate,
        },
      });
    }

    await Transaction.insertMany(transactions);

    const importMonth = month || (minDate ? getMonthKey(minDate) : "");

    return NextResponse.json({
      imported: transactions.length,
      month: importMonth,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
