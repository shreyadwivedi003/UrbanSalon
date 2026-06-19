const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // 1. Verify the presence of the Authorization Header with Bearer Scheme
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: {
        message: 'Access token required. Please provide a valid Authorization Header matching: Bearer <JWT_TOKEN>',
        code: 'AUTH_TOKEN_MISSING'
      }
    });
  }

  // 2. Parse the token from the header array split
  const token = authHeader.split(' ')[1];

  try {
    // 3. Verify signature against your runtime Access Secret
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    
    // 4. Attach token identity directly into the request loop state
    req.user = decoded; 
    
    next(); // Pass control to the next middleware or controller route
  } catch (err) {
    // Handle specific expired token errors gracefully so frontend can trigger its token refresh handshake
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: {
          message: 'Access token has expired. Please refresh your session.',
          code: 'AUTH_TOKEN_EXPIRED'
        }
      });
    }

    return res.status(403).json({ 
      error: {
        message: 'Invalid access token signature verification failed.',
        code: 'AUTH_TOKEN_INVALID'
      }
    });
  }
};