import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const userId = (session.user as any).id;
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      theme: user.theme,
      salesTax: user.salesTax,
    });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { name, email, theme, newPassword, salesTax } = await req.json();

    await connectDB();

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (theme) updateData.theme = theme;

    if (salesTax != null) updateData.salesTax = salesTax;

    if (newPassword) {
      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    const user = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
    }).select("-password");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        theme: user.theme,
        salesTax: user.salesTax,
      },
    });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
