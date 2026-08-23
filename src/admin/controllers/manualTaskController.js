import ManualTask from '../../shared/models/ManualTask.js';
import Volunteer from '../../shared/models/Volunteer.js';
import mongoose from 'mongoose';

// GET all manual tasks (for admin)
export const getAllManualTasks = async (req, res) => {
  try {
    const { status, priority, search, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { taskId: { $regex: search, $options: 'i' } },
      ];
    }

    const [tasks, total] = await Promise.all([
      ManualTask.find(filter)
        .populate('assignedVolunteer', 'fullName email mobileNumber')
        .populate('assignedVolunteerUser', 'name email')
        .populate('assignedBy', 'name email')
        .sort({ dueDate: 1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ManualTask.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: tasks,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching manual tasks:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tasks' });
  }
};

// GET unassigned manual tasks (for task assignment page)
export const getUnassignedManualTasks = async (req, res) => {
  try {
    const { priority } = req.query;
    const filter = { status: 'Pending', assignedVolunteer: null };
    
    if (priority) filter.priority = priority;

    const tasks = await ManualTask.find(filter)
      .sort({ priority: -1, dueDate: 1 })
      .lean();

    res.json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    console.error('Error fetching unassigned tasks:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch unassigned tasks' });
  }
};

// CREATE new manual task
export const createManualTask = async (req, res) => {
  try {
    const { title, description, taskType, priority, dueDate, location, city, estimatedHours, tags } = req.body;

    if (!title || !description || !taskType || !dueDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title, description, task type, and due date are required' 
      });
    }

    const task = new ManualTask({
      title,
      description,
      taskType,
      priority: priority || 'Medium',
      dueDate: new Date(dueDate),
      location: location || '',
      city: city || '',
      estimatedHours: estimatedHours || 2,
      tags: tags || [],
      assignedBy: req.user.id,
      status: 'Pending',
    });

    await task.save();

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: task,
    });
  } catch (error) {
    console.error('Error creating manual task:', error);
    res.status(500).json({ success: false, message: 'Failed to create task' });
  }
};

// ASSIGN task to volunteer
export const assignManualTask = async (req, res) => {
  try {
    const { taskId, volunteerId } = req.body;

    if (!taskId || !volunteerId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Task ID and Volunteer ID are required' 
      });
    }

    const task = await ManualTask.findById(taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (task.assignedVolunteer) {
      return res.status(400).json({ 
        success: false, 
        message: 'Task is already assigned' 
      });
    }

    // Find volunteer
    let volunteer = await Volunteer.findById(volunteerId);
    if (!volunteer) {
      volunteer = await Volunteer.findOne({ createdBy: volunteerId });
    }

    if (!volunteer) {
      return res.status(404).json({ success: false, message: 'Volunteer not found' });
    }

    // Update task
    task.assignedVolunteer = volunteer._id;
    task.assignedVolunteerUser = volunteerId;
    task.assignedAt = new Date();
    task.status = 'Assigned';
    await task.save();

    res.json({
      success: true,
      message: 'Task assigned successfully',
      data: task,
    });
  } catch (error) {
    console.error('Error assigning task:', error);
    res.status(500).json({ success: false, message: 'Failed to assign task' });
  }
};

// UNASSIGN task
export const unassignManualTask = async (req, res) => {
  try {
    const { taskId } = req.body;

    const task = await ManualTask.findById(taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    task.assignedVolunteer = null;
    task.assignedVolunteerUser = null;
    task.assignedAt = null;
    task.status = 'Pending';
    await task.save();

    res.json({
      success: true,
      message: 'Task unassigned successfully',
      data: task,
    });
  } catch (error) {
    console.error('Error unassigning task:', error);
    res.status(500).json({ success: false, message: 'Failed to unassign task' });
  }
};

// UPDATE manual task
export const updateManualTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { title, description, taskType, priority, dueDate, location, estimatedHours } = req.body;

    const task = await ManualTask.findById(taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (title) task.title = title;
    if (description) task.description = description;
    if (taskType) task.taskType = taskType;
    if (priority) task.priority = priority;
    if (dueDate) task.dueDate = new Date(dueDate);
    if (location !== undefined) task.location = location;
    if (estimatedHours) task.estimatedHours = estimatedHours;

    await task.save();

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: task,
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ success: false, message: 'Failed to update task' });
  }
};

// UPDATE task status
export const updateManualTaskStatus = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status, completionNotes, proofPhotos, actualHours } = req.body;

    const task = await ManualTask.findById(taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (status) task.status = status;
    if (completionNotes) task.completionNotes = completionNotes;
    if (proofPhotos) task.proofPhotos = proofPhotos;
    if (actualHours) task.actualHours = actualHours;

    if (status === 'Completed') {
      task.completedAt = new Date();
    }

    await task.save();

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: task,
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ success: false, message: 'Failed to update task' });
  }
};

// GET volunteer's assigned manual tasks
export const getVolunteerManualTasks = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const userEmail = req.user?.email;

    // Find volunteer by user ID or email
    let volunteer = await Volunteer.findOne({
      $or: [
        { createdBy: userId },
        { email: userEmail },
      ],
    });

    if (!volunteer && mongoose.Types.ObjectId.isValid(userId)) {
      volunteer = await Volunteer.findById(userId);
    }

    if (!volunteer) {
      return res.json({
        success: true,
        data: [],
      });
    }

    const tasks = await ManualTask.find({
      assignedVolunteer: volunteer._id,
    })
      .populate('assignedBy', 'name email')
      .sort({ dueDate: 1, createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    console.error('Error fetching volunteer tasks:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tasks' });
  }
};

// DELETE manual task
export const deleteManualTask = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await ManualTask.findByIdAndDelete(taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    res.json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ success: false, message: 'Failed to delete task' });
  }
};
