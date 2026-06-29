import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import PayProfile from "@/models/PayProfile";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const userId = (session.user as any).id;
  const profile = await PayProfile.findOne({ userId });
  return NextResponse.json(profile || { userId });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const userId = (session.user as any).id;
  const body = await req.json();

  const profile = await PayProfile.findOneAndUpdate(
    { userId },
    { ...body, userId },
    { upsert: true, new: true }
  );

  return NextResponse.json(profile);
}
