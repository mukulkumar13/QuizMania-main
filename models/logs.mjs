import mongoose from 'mongoose';
import moment from 'moment-timezone';

const loginAttemptSchema = new mongoose.Schema({
    email: { type: String, required: true },
    userIp: { type: String, required: true },
    userAgent: { type: String, required: true },
    success: { type: Boolean, required: true },
    timestamp: {
        type: Date,
        default: () => moment().tz('Asia/Kolkata').format(), // Default to current time in Asia/Kolkata
    },
});

const LoginAttempt = mongoose.model('LoginAttempt', loginAttemptSchema);

export default LoginAttempt;
