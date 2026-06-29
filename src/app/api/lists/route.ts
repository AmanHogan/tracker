import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import List from "@/models/List";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const userId = (session.user as any).id;
  const lists = await List.find({ userId }).sort({ updatedAt: -1 });
  return NextResponse.json(lists);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const userId = (session.user as any).id;
  const body = await req.json();

  const list = await List.create({
    userId,
    name: body.name,
    type: body.type || "shopping",
    description: body.description || "",
    items: body.items || [],
  });

  return NextResponse.json(list, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const userId = (session.user as any).id;
  const body = await req.json();
  const { id, ...update } = body;

  const list = await List.findOneAndUpdate(
    { _id: id, userId },
    update,
    { new: true }
  );

  if (!list) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(list);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const userId = (session.user as any).id;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  await List.findOneAndDelete({ _id: id, userId });
  return NextResponse.json({ ok: true });
}
