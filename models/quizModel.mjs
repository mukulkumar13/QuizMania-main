import mongoose from "mongoose";
import moment from "moment-timezone";

const quizSchema = new mongoose.Schema({
  quizId: String,
  isRandom: String,
  singleTime: String,
  quizTopic: {
    type: String,
    required: true,
  },
  createdBy: String,
  questions: [
    {
      question: String,
      options: [String],
      answer: String,
      imageUrl: {
        type: String,
        default: null,
      },
      timerValue: {
        type: Number,
        default: 10,
      },
    },
  ],
  creationTime: {
    type: Date,
    default: moment().tz("Asia/Kolkata").format(),
  },
  status: {
    type: String,
    default: "active", // You can set a default value as per your requirements
  },
});

export default mongoose.model('Quiz', quizSchema);