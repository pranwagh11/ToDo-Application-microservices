const axios = require('axios');
const {
  getTasksByUser,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
} = require('../models/taskModel');
const { successResponse, errorResponse } = require('../../shared/utils');
const { HTTP_STATUS, TASK_STATUS } = require('../../shared/constants');

async function listTasks(req, res) {
  try {
    const tasks = await getTasksByUser(req.user.id);
    return successResponse(res, HTTP_STATUS.OK, 'Tasks fetched successfully', tasks);
  } catch (err) {
    console.error('List tasks error:', err.message);
    return errorResponse(res, HTTP_STATUS.SERVER_ERROR, 'Failed to fetch tasks');
  }
}

async function addTask(req, res) {
  try {
    const { title, description } = req.body;
    if (!title) {
      return errorResponse(res, HTTP_STATUS.BAD_REQUEST, 'title is required');
    }

    const task = await createTask({ userId: req.user.id, title, description });

    // Fire-and-forget notification; do not block task creation if it fails.
    notifyEmail({
      to: req.user.email,
      subject: 'New task created',
      message: `Your task "${task.title}" was created successfully.`,
    });

    return successResponse(res, HTTP_STATUS.CREATED, 'Task created successfully', task);
  } catch (err) {
    console.error('Add task error:', err.message);
    return errorResponse(res, HTTP_STATUS.SERVER_ERROR, 'Failed to create task');
  }
}

async function editTask(req, res) {
  try {
    const { id } = req.params;
    const { title, description, status } = req.body;

    const updated = await updateTask(id, req.user.id, { title, description, status });
    if (!updated) {
      return errorResponse(res, HTTP_STATUS.NOT_FOUND, 'Task not found');
    }

    return successResponse(res, HTTP_STATUS.OK, 'Task updated successfully', updated);
  } catch (err) {
    console.error('Edit task error:', err.message);
    return errorResponse(res, HTTP_STATUS.SERVER_ERROR, 'Failed to update task');
  }
}

async function completeTask(req, res) {
  try {
    const { id } = req.params;
    const updated = await updateTaskStatus(id, req.user.id, TASK_STATUS.COMPLETED);
    if (!updated) {
      return errorResponse(res, HTTP_STATUS.NOT_FOUND, 'Task not found');
    }

    notifyEmail({
      to: req.user.email,
      subject: 'Task completed',
      message: `Your task "${updated.title}" was marked as completed.`,
    });

    return successResponse(res, HTTP_STATUS.OK, 'Task marked as completed', updated);
  } catch (err) {
    console.error('Complete task error:', err.message);
    return errorResponse(res, HTTP_STATUS.SERVER_ERROR, 'Failed to update task status');
  }
}

async function removeTask(req, res) {
  try {
    const { id } = req.params;
    const deleted = await deleteTask(id, req.user.id);
    if (!deleted) {
      return errorResponse(res, HTTP_STATUS.NOT_FOUND, 'Task not found');
    }
    return successResponse(res, HTTP_STATUS.OK, 'Task deleted successfully', deleted);
  } catch (err) {
    console.error('Remove task error:', err.message);
    return errorResponse(res, HTTP_STATUS.SERVER_ERROR, 'Failed to delete task');
  }
}

// Best-effort call to notification-service. Errors are logged, never thrown,
// so the user's task operation always succeeds even if email is down.
async function notifyEmail({ to, subject, message }) {
  try {
    await axios.post(`${process.env.NOTIFICATION_SERVICE_URL}/notify/email`, {
      to,
      subject,
      message,
    });
  } catch (err) {
    console.error('Notification call failed:', err.message);
  }
}

module.exports = { listTasks, addTask, editTask, completeTask, removeTask };
