const crypto = require('crypto');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {
  createUser,
  findUserByEmail,
  findUserById,
  updateUserPassword,
  createPasswordResetToken,
  findActivePasswordReset,
  incrementPasswordResetAttempts,
  deletePasswordResetTokensForUser,
} = require('../models/userModel');
const { successResponse, errorResponse, renderPasswordResetEmail } = require('../../shared/utils');
const { HTTP_STATUS } = require('../../shared/constants');

const OTP_EXPIRES_MINUTES = Number(process.env.OTP_EXPIRES_MINUTES) || 10;
const MAX_OTP_ATTEMPTS = 5;

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
}

async function register(req, res) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return errorResponse(res, HTTP_STATUS.BAD_REQUEST, 'name, email and password are required');
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return errorResponse(res, HTTP_STATUS.BAD_REQUEST, 'Email is already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await createUser({ name, email, hashedPassword });
    const token = generateToken(user);

    return successResponse(res, HTTP_STATUS.CREATED, 'User registered successfully', {
      user,
      token,
    });
  } catch (err) {
    console.error('Register error:', err.message);
    return errorResponse(res, HTTP_STATUS.SERVER_ERROR, 'Something went wrong during registration');
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return errorResponse(res, HTTP_STATUS.BAD_REQUEST, 'email and password are required');
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return errorResponse(res, HTTP_STATUS.UNAUTHORIZED, 'Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return errorResponse(res, HTTP_STATUS.UNAUTHORIZED, 'Invalid email or password');
    }

    const token = generateToken(user);

    return successResponse(res, HTTP_STATUS.OK, 'Login successful', {
      user: { id: user.id, name: user.name, email: user.email },
      token,
    });
  } catch (err) {
    console.error('Login error:', err.message);
    return errorResponse(res, HTTP_STATUS.SERVER_ERROR, 'Something went wrong during login');
  }
}

async function profile(req, res) {
  try {
    const user = await findUserById(req.user.id);
    if (!user) {
      return errorResponse(res, HTTP_STATUS.NOT_FOUND, 'User not found');
    }
    return successResponse(res, HTTP_STATUS.OK, 'Profile fetched successfully', user);
  } catch (err) {
    console.error('Profile error:', err.message);
    return errorResponse(res, HTTP_STATUS.SERVER_ERROR, 'Something went wrong fetching profile');
  }
}

// Best-effort call to notification-service, same pattern as task-service —
// never let an email failure block or reveal anything about the request.
async function notifyEmail({ to, subject, html }) {
  try {
    await axios.post(`${process.env.NOTIFICATION_SERVICE_URL}/notify/email`, {
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error('Notification call failed:', err.message);
  }
}

async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return errorResponse(res, HTTP_STATUS.BAD_REQUEST, 'email is required');
    }

    // Always return the same generic response whether or not the email
    // exists — otherwise this endpoint becomes a way to check who has an
    // account (user enumeration).
    const genericMessage = 'If an account exists for that email, a verification code has been sent.';

    const user = await findUserByEmail(email);
    if (user) {
      // 6-digit numeric OTP, e.g. "042917" — crypto.randomInt is
      // cryptographically secure, unlike Math.random().
      const otp = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
      const tokenHash = crypto.createHash('sha256').update(otp).digest('hex');
      const expiresAt = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000);

      await createPasswordResetToken(user.id, tokenHash, expiresAt);

      notifyEmail({
        to: user.email,
        subject: 'Your KeepNote password reset code',
        html: renderPasswordResetEmail({
          name: user.name,
          otp,
          expiresInMinutes: OTP_EXPIRES_MINUTES,
        }),
      });
    }

    return successResponse(res, HTTP_STATUS.OK, genericMessage);
  } catch (err) {
    console.error('Forgot password error:', err.message);
    return errorResponse(res, HTTP_STATUS.SERVER_ERROR, 'Something went wrong');
  }
}

async function resetPassword(req, res) {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return errorResponse(res, HTTP_STATUS.BAD_REQUEST, 'email, otp and newPassword are required');
    }
    if (newPassword.length < 6) {
      return errorResponse(res, HTTP_STATUS.BAD_REQUEST, 'newPassword must be at least 6 characters');
    }

    const genericError = 'Invalid or expired code';

    const user = await findUserByEmail(email);
    if (!user) {
      // Same error as a wrong/expired code — don't reveal whether the
      // email exists.
      return errorResponse(res, HTTP_STATUS.BAD_REQUEST, genericError);
    }

    const resetRecord = await findActivePasswordReset(user.id);
    if (!resetRecord) {
      return errorResponse(res, HTTP_STATUS.BAD_REQUEST, genericError);
    }

    if (resetRecord.attempts >= MAX_OTP_ATTEMPTS) {
      await deletePasswordResetTokensForUser(user.id);
      return errorResponse(res, HTTP_STATUS.BAD_REQUEST, 'Too many incorrect attempts. Please request a new code.');
    }

    const suppliedHash = crypto.createHash('sha256').update(String(otp)).digest('hex');

    // Constant-time comparison so response timing can't leak how many
    // hex characters matched.
    const hashesMatch =
      suppliedHash.length === resetRecord.token_hash.length &&
      crypto.timingSafeEqual(Buffer.from(suppliedHash), Buffer.from(resetRecord.token_hash));

    if (!hashesMatch) {
      await incrementPasswordResetAttempts(resetRecord.id);
      return errorResponse(res, HTTP_STATUS.BAD_REQUEST, genericError);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await updateUserPassword(user.id, hashedPassword);
    await deletePasswordResetTokensForUser(user.id);

    return successResponse(res, HTTP_STATUS.OK, 'Password reset successfully. You can now log in.');
  } catch (err) {
    console.error('Reset password error:', err.message);
    return errorResponse(res, HTTP_STATUS.SERVER_ERROR, 'Something went wrong');
  }
}

module.exports = { register, login, profile, forgotPassword, resetPassword };
