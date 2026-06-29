import mongoose, { Schema, models } from "mongoose";

export interface IPayProfile {
  _id: string;
  userId: string;
  grossAnnual: number;
  payFrequency: "biweekly" | "semimonthly" | "monthly";

  // Pre-tax deductions (per payslip)
  pretax401kPercent: number;
  hsaPretax: number;
  medicalPretax: number;

  // Taxes (per payslip)
  oasdi: number;
  medicare: number;
  federalWithholding: number;
  stateWithholding: number;

  // Net pay distribution percentages
  savingsPercent: number;
  checkingPercent: number;
  rothPercent: number;
}

const PayProfileSchema = new Schema<IPayProfile>(
  {
    userId: { type: String, required: true, unique: true },
    grossAnnual: { type: Number, default: 0 },
    payFrequency: {
      type: String,
      enum: ["biweekly", "semimonthly", "monthly"],
      default: "semimonthly",
    },
    pretax401kPercent: { type: Number, default: 0 },
    hsaPretax: { type: Number, default: 0 },
    medicalPretax: { type: Number, default: 0 },
    oasdi: { type: Number, default: 0 },
    medicare: { type: Number, default: 0 },
    federalWithholding: { type: Number, default: 0 },
    stateWithholding: { type: Number, default: 0 },
    savingsPercent: { type: Number, default: 20 },
    checkingPercent: { type: Number, default: 75 },
    rothPercent: { type: Number, default: 5 },
  },
  { timestamps: true }
);

export default models.PayProfile ||
  mongoose.model<IPayProfile>("PayProfile", PayProfileSchema);
