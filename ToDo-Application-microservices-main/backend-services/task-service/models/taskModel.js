const { pool } = require('../config/db');

async function getTasksByUser(userId) {
  const [rows] = await pool.query(
    'SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );
  return rows;
}

async function getTaskById(id, userId) {
  const [rows] = await pool.query(
    'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
    [id, userId]
  );
  return rows[0] || null;
}

async function createTask({ userId, title, description }) {
  const [result] = await pool.query(
    'INSERT INTO tasks (user_id, title, description) VALUES (?, ?, ?)',
    [userId, title, description || null]
  );
  return getTaskById(result.insertId, userId);
}

async function updateTask(id, userId, { title, description, status }) {
  const existing = await getTaskById(id, userId);
  if (!existing) return null;

  await pool.query(
    'UPDATE tasks SET title = ?, description = ?, status = ? WHERE id = ? AND user_id = ?',
    [
      title ?? existing.title,
      description ?? existing.description,
      status ?? existing.status,
      id,
      userId,
    ]
  );
  return getTaskById(id, userId);
}

async function updateTaskStatus(id, userId, status) {
  const existing = await getTaskById(id, userId);
  if (!existing) return null;

  await pool.query('UPDATE tasks SET status = ? WHERE id = ? AND user_id = ?', [
    status,
    id,
    userId,
  ]);
  return getTaskById(id, userId);
}

async function deleteTask(id, userId) {
  const existing = await getTaskById(id, userId);
  if (!existing) return null;

  await pool.query('DELETE FROM tasks WHERE id = ? AND user_id = ?', [id, userId]);
  return existing;
}

module.exports = {
  getTasksByUser,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
};
