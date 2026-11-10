const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');
const HttpError = require('../utils/HttpError');
const v = require('../utils/validate');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// POST /api/auth/register  (optional cloud account)
router.post('/register', asyncHandler(async (req, res) => {
  const body = req.body || {};
  const email = v.email(body.email);
  const password = v.password(body.password);
  if (await UserModel.getByEmail(email)) throw new HttpError(400, 'Email is already registered.');

  const user = await UserModel.create(email, await bcrypt.hash(password, 10));
  res.status(201).json({ success: true, message: 'Cloud account created successfully', data: user });
}));

// POST /api/auth/login
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password)
    throw new HttpError(400, 'Please provide email and password.');

  const user = await UserModel.getByEmail(email.trim().toLowerCase());
  // Same message for unknown email and wrong password
  if (!user || !(await bcrypt.compare(password, user.password)))
    throw new HttpError(401, 'Invalid email or password.');

  const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1d' });
  res.status(200).json({ success: true, message: 'Login successful', token, user: { id: user.id, email: user.email } });
}));

module.exports = router;