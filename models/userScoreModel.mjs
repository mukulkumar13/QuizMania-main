// userScoreModel.js
import mongoose from "mongoose";
import moment from "moment-timezone";
const userScoreSchema = new mongoose.Schema({
  quizId: String,
  userId: String,
  score: Number,
  AttemptedCount: Number,
  TotalCount: Number,
  userIp: String,
  userAgent: String,
  playId: String,
  status: String,
  shuffleSalt: String,
  username: String,
  timestamp: {
    type: Date,
    default: () => moment().tz('Asia/Kolkata').format(), // Default to current time in Asia/Kolkata
},
});

export default mongoose.model('UserScore', userScoreSchema);