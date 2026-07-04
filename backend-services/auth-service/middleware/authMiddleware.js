const jwt = require('jsonwebtoken');
const { errorResponse } = require('../../shared/utils');
const { HTTP_STATUS } = require('../../shared/constants');

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse(res, HTTP_STATUS.UNAUTHORIZED, 'No token provided');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return errorResponse(res, HTTP_STATUS.UNAUTHORIZED, 'Invalid or expired token');
  }
}

module.exports = authMiddleware;
