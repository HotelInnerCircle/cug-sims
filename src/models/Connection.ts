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

const BillingEmailLogSchema = new Schema(
  {
    days_remaining: { type: Number, required: true },
    sent_at: { type: Date, default: Date.now },
    cycle: { type: String, default: '' }, // e.g. "2026-05"
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
    // Billing fields
    billing_amount: { type: Number, default: 0 },
    plan_start_date: { type: Date, default: null },
    plan_expiry_date: { type: Date, default: null },
    billing_status: {
      type: String,
      enum: ['active', 'expiring_soon', 'expired'],
      default: 'active',
    },
    billing_email_log: { type: [BillingEmailLogSchema], default: [] },
  },
  { timestamps: true }
)

export const ConnectionModel =
  mongoose.models.Connection || mongoose.model('Connection', ConnectionSchema)
