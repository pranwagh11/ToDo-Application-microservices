const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createUser, findUserByEmail, findUserById } = require('../models/userModel');
const { successResponse, errorResponse } = require('../../shared/utils');
const { HTTP_STATUS } = require('../../shared/constants');

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

module.exports = { register, login, profile };
