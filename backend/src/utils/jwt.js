const jwt = require('jsonwebtoken');
require('dotenv').config();

const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not defined.');
  }
  return secret;
};

const generateToken = (payload, expiresIn = '1h') => {
  return jwt.sign(payload, getSecret(), { expiresIn });
};

const verifyToken = (token) => {
  return jwt.verify(token, getSecret());
};

module.exports = {
  generateToken,
  verifyToken
};
