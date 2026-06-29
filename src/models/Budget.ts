import mongoose, { Schema, models } from "mongoose";

export interface IBudget {
  _id: string;
  userId: string;
  month: string;
  category: string;
  limit: number;
}

const BudgetSchema = new Schema<IBudget>(
  {
    userId: { type: String, required: true },
    month: { type: String, required: true },
    category: { type: String, required: true },
    limit: { type: Number, required: true },
  },
  { timestamps: true }
);

BudgetSchema.index({ userId: 1, month: 1 }, { unique: false });
BudgetSchema.index({ userId: 1, month: 1, category: 1 }, { unique: true });

export default models.Budget ||
  mongoose.model<IBudget>("Budget", BudgetSchema);
