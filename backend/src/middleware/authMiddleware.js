const { verifyToken } = require('../utils/jwt');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication token is missing or invalid' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);

    if (!decoded || !decoded.sub) {
      return res.status(401).json({ message: 'Invalid authentication token' });
    }

    req.user = {
      id: decoded.sub,
      role: decoded.role
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired authentication token' });
  }
};

module.exports = authMiddleware;
