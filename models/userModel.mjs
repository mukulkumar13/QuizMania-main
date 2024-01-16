import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  email: { type: String, unique: true },
  lastLoggedIn: { type: Date, default: null },
  lastLoginIp: { type: String, default: null },
  lastLoginUserAgent: { type: String, default: null }
});


export default mongoose.model('User', userSchema);
