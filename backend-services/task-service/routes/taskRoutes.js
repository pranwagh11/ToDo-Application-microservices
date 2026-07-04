const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const {
  listTasks,
  addTask,
  editTask,
  completeTask,
  removeTask,
} = require('../controllers/taskController');

router.use(verifyToken);

router.get('/', listTasks);
router.post('/', addTask);
router.put('/:id', editTask);
router.delete('/:id', removeTask);
router.patch('/:id/complete', completeTask);

module.exports = router;
