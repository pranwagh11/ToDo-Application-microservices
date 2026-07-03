const jwt = require('jsonwebtoken');
const { errorResponse } = require('../../shared/utils');
const { HTTP_STATUS } = require('../../shared/constants');

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse(res, HTTP_STATUS.UNAUTHORIZED, 'No token provided');
  }

  const token = authHeader.split(' ')[1];

  try {
    // NOTE: must use the SAME JWT_SECRET as auth-service, since tokens are
    // issued there and verified here without an extra network call.
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return errorResponse(res, HTTP_STATUS.UNAUTHORIZED, 'Invalid or expired token');
  }
}

module.exports = verifyToken;
