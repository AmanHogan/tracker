import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Budget from "@/models/Budget";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");

    if (!month) {
      return NextResponse.json(
        { error: "Month parameter is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const budgets = await Budget.find({ userId, month });

    return NextResponse.json(budgets);
  } catch (error) {
    console.error("Get budgets error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { month, category, limit } = await req.json();

    if (!month || !category || limit == null) {
      return NextResponse.json(
        { error: "Month, category, and limit are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const budget = await Budget.findOneAndUpdate(
      { userId, month, category },
      { userId, month, category, limit },
      { upsert: true, new: true }
    );

    return NextResponse.json(budget);
  } catch (error) {
    console.error("Upsert budget error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
