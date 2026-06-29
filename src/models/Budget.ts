import mongoose, { Schema, models } from "mongoose";

export interface IBudgetItem {
  name: string;
  amount: number;
}

export interface IBudget {
  _id: string;
  userId: string;
  month: string;
  category: string;
  limit: number;
  items: IBudgetItem[];
}

const BudgetItemSchema = new Schema<IBudgetItem>(
  {
    name: { type: String, required: true },
    amount: { type: Number, required: true },
  },
  { _id: false }
);

const BudgetSchema = new Schema<IBudget>(
  {
    userId: { type: String, required: true },
    month: { type: String, required: true },
    category: { type: String, required: true },
    limit: { type: Number, required: true },
    items: { type: [BudgetItemSchema], default: [] },
  },
  { timestamps: true }
);

BudgetSchema.index({ userId: 1, month: 1 }, { unique: false });
BudgetSchema.index({ userId: 1, month: 1, category: 1 }, { unique: true });

export default models.Budget ||
  mongoose.model<IBudget>("Budget", BudgetSchema);
