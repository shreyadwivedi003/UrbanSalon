const db = require('../../config/db');
const jwt = require('jsonwebtoken');

/**
 * Handles fast OAuth login tracking. 
 * Creates a password-less customer profile dynamically if the email is unseen.
 */
exports.handleOAuthLogin = async (req, res, next) => {
  const { name, email } = req.body; 

  if (!email || !name) {
    return res.status(400).json({ error: 'Missing required payload variables: name and email.' });
  }

  try {
    // 1. Check if the user already has a profile registered
    let userResult = await db.query(
      'SELECT id, name, email, role, style_profile FROM users WHERE email = $1', 
      [email]
    );
    let user = userResult.rows[0];

    // 2. If user doesn't exist, create an account with an empty JSON configuration profile block
    if (!user) {
      const newUser = await db.query(
        `INSERT INTO users (name, email, role, style_profile) 
         VALUES ($1, $2, 'customer', $3) 
         RETURNING id, name, email, role, style_profile`,
        [name, email, JSON.stringify({})]
      );
      user = newUser.rows[0];
    }

    // 3. Generate a secure cryptographic short-lived JWT Access Token
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );

    res.status(200).json({
      message: 'Authentication handshake completed successfully.',
      accessToken,
      user
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Resolves token metadata down to absolute live database user record metrics.
 */
exports.getProfile = async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT id, name, email, role, style_profile, created_at FROM users WHERE id = $1', 
      [req.user.id]
    );
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'User identity resource profile data not found.' });
    }
    
    res.status(200).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

/**
 * Updates individual properties inside the flexible JSONB column structure.
 */
exports.updateStyleProfile = async (req, res, next) => {
  const { faceShape, skinTone, hairType, preferredStyles } = req.body;
  
  try {
    // Construct the structured profile configuration block payload
    const updatedProfile = { 
      faceShape: faceShape || null, 
      skinTone: skinTone || null, 
      hairType: hairType || null, 
      preferredStyles: preferredStyles || [] 
    };
    
    // Execute atomic update directly into the relational field
    const result = await db.query(
      `UPDATE users 
       SET style_profile = $1 
       WHERE id = $2 
       RETURNING id, name, email, style_profile`,
      [JSON.stringify(updatedProfile), req.user.id]
    );

    res.status(200).json({
      message: 'Your personal style profile parameters have been updated.',
      user: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};