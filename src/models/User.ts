import mongoose, { Schema } from 'mongoose'

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
  
  },
  { timestamps: true }
)

export const User = mongoose.models.User || mongoose.model('User', UserSchema)
