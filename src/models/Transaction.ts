import mongoose, { Schema, models } from "mongoose";

export interface ITransaction {
  _id: string;
  userId: string;
  date: Date;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  account?: string;
  createdAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    userId: { type: String, required: true, index: true },
    date: { type: Date, required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ["income", "expense"], required: true },
    category: { type: String, required: true },
    account: { type: String },
  },
  { timestamps: true }
);

TransactionSchema.index({ userId: 1, date: -1 });

export default models.Transaction ||
  mongoose.model<ITransaction>("Transaction", TransactionSchema);
