import mongoose, { Schema, models } from "mongoose";

export interface IListItem {
  _id?: string;
  name: string;
  notes: string;
  lowEst: number;
  midEst: number;
  highEst: number;
  deliverySetup: number;
  actualCost: number;
  checked: boolean;
  section: string;
  sortOrder: number;
}

export interface IList {
  _id: string;
  userId: string;
  name: string;
  type: "checklist" | "shopping";
  description: string;
  items: IListItem[];
  createdAt: Date;
  updatedAt: Date;
}

const ListItemSchema = new Schema<IListItem>({
  name: { type: String, required: true },
  notes: { type: String, default: "" },
  lowEst: { type: Number, default: 0 },
  midEst: { type: Number, default: 0 },
  highEst: { type: Number, default: 0 },
  deliverySetup: { type: Number, default: 0 },
  actualCost: { type: Number, default: 0 },
  checked: { type: Boolean, default: false },
  section: { type: String, default: "" },
  sortOrder: { type: Number, default: 0 },
});

const ListSchema = new Schema<IList>(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    type: { type: String, enum: ["checklist", "shopping"], default: "shopping" },
    description: { type: String, default: "" },
    items: [ListItemSchema],
  },
  { timestamps: true }
);

export default models.List || mongoose.model<IList>("List", ListSchema);
