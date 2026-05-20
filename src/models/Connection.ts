import mongoose, { Schema } from 'mongoose'

const RemarkSchema = new Schema(
  {
    assignedTo: { type: String, default: '' },
    note: { type: String, default: '' },
    updatedAt: { type: Date, default: null },
    updatedBy: { type: String, default: '' },
  },
  { _id: false }
)

const ConnectionSchema = new Schema(
  {
    company: { type: String, required: true },
    mobile: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    designation: { type: String, default: '' },
    department: { type: String, default: '' },
    network: { type: String, default: '' },
    plan_type: { type: String, default: '' },
    paid_by: { type: String, default: '' },
    location: { type: String, default: '' },
    fancy_tier: { type: Number, default: null },
    remark: { type: RemarkSchema, default: () => ({}) },
  },
  { timestamps: true }
)

export const ConnectionModel =
  mongoose.models.Connection || mongoose.model('Connection', ConnectionSchema)
