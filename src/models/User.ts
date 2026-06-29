import mongoose, { Schema, models } from "mongoose";

export interface IUser {
  _id: string;
  name: string;
  email: string;
  password: string;
  theme: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    theme: { type: String, default: "dark" },
  },
  { timestamps: true }
);

export default models.User || mongoose.model<IUser>("User", UserSchema);
