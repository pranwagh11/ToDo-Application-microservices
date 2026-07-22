const { pool } = require('../config/db');

async function createUser({ name, email, hashedPassword }) {
  const [result] = await pool.query(
    'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
    [name, email, hashedPassword]
  );
  return { id: result.insertId, name, email };
}

async function findUserByEmail(email) {
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  return rows[0] || null;
}

async function findUserById(id) {
  const [rows] = await pool.query(
    'SELECT id, name, email, created_at FROM users WHERE id = ?',
    [id]
  );
  return rows[0] || null;
}

async function updateUserPassword(userId, hashedPassword) {
  await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);
}

// --- Password reset tokens ---------------------------------------------

async function createPasswordResetToken(userId, tokenHash, expiresAt) {
  // A user can only have one live OTP at a time — clear any earlier one
  // first so an old code can't still work once a new one's been requested.
  await pool.query('DELETE FROM password_resets WHERE user_id = ?', [userId]);
  await pool.query(
    'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
    [userId, tokenHash, expiresAt]
  );
}

async function findActivePasswordReset(userId) {
  const [rows] = await pool.query(
    `SELECT pr.*, u.email, u.name
     FROM password_resets pr
     JOIN users u ON u.id = pr.user_id
     WHERE pr.user_id = ? AND pr.expires_at > NOW()`,
    [userId]
  );
  return rows[0] || null;
}

async function incrementPasswordResetAttempts(id) {
  await pool.query('UPDATE password_resets SET attempts = attempts + 1 WHERE id = ?', [id]);
}

async function deletePasswordResetTokensForUser(userId) {
  await pool.query('DELETE FROM password_resets WHERE user_id = ?', [userId]);
}

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  updateUserPassword,
  createPasswordResetToken,
  findActivePasswordReset,
  incrementPasswordResetAttempts,
  deletePasswordResetTokensForUser,
};
