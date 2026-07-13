import Event from '../../shared/models/Event.js';
import EventRegistration from '../../shared/models/EventRegistration.js';
import Branch from '../../shared/models/Branch.js';

// Sanitize body fields
function sanitizeBody(body) {
  const optionalFields = ['branch', 'endDate', 'capacity'];
  const sanitized = { ...body };
  optionalFields.forEach(f => {
    if (sanitized[f] === '') {
      sanitized[f] = null;
    } else if (sanitized[f] === undefined) {
      delete sanitized[f];
    }
  });
  return sanitized;
}

// GET /api/superadmin/events
export const getAllEvents = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
      branch = '',
      startDate,
      endDate
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = {};

    if (status) filter.status = status;
    if (branch) filter.branch = branch;

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    if (startDate || endDate) {
      filter.startDate = {};
      if (startDate) filter.startDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.startDate.$lte = end;
      }
    }

    const [events, total] = await Promise.all([
      Event.find(filter)
        .populate('branch', 'name code')
        .populate('createdBy', 'name email')
        .sort({ startDate: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Event.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: events,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Superadmin get all events error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch events' });
  }
};

// GET /api/superadmin/events/stats
export const getEventStats = async (req, res) => {
  try {
    const totalCount = await Event.countDocuments();
    const activeCount = await Event.countDocuments({ status: 'Active' });
    const plannedCount = await Event.countDocuments({ status: 'Planned' });
    const completedCount = await Event.countDocuments({ status: 'Completed' });
    const cancelledCount = await Event.countDocuments({ status: 'Cancelled' });

    // Aggregate capacities & registrations
    const aggregatedStats = await Event.aggregate([
      {
        $group: {
          _id: null,
          totalCapacity: { $sum: '$capacity' },
          totalRegistrations: { $sum: '$registrationsCount' },
        }
      }
    ]);

    // Count checked-in attendees
    const checkInsCount = await EventRegistration.countDocuments({ status: 'Attended' });

    const stats = {
      totalCount,
      activeCount,
      plannedCount,
      completedCount,
      cancelledCount,
      totalCapacity: aggregatedStats[0]?.totalCapacity || 0,
      totalRegistrations: aggregatedStats[0]?.totalRegistrations || 0,
      checkInsCount,
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Superadmin get event stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to compile stats' });
  }
};

// POST /api/superadmin/events
export const createEvent = async (req, res) => {
  try {
    const sanitized = sanitizeBody(req.body);
    
    const event = new Event({
      ...sanitized,
      createdBy: req.user.id
    });

    await event.save();

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: event
    });
  } catch (error) {
    console.error('Superadmin create event error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create event' });
  }
};

// PUT /api/superadmin/events/:id
export const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const sanitized = sanitizeBody(req.body);

    const event = await Event.findByIdAndUpdate(
      id,
      {
        ...sanitized,
        updatedBy: req.user.id
      },
      { new: true, runValidators: true }
    );

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    res.json({
      success: true,
      message: 'Event updated successfully',
      data: event
    });
  } catch (error) {
    console.error('Superadmin update event error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update event' });
  }
};

// DELETE /api/superadmin/events/:id
export const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findByIdAndDelete(id);

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Clean up event registrations
    await EventRegistration.deleteMany({ event: id });

    res.json({
      success: true,
      message: 'Event and registrations deleted successfully'
    });
  } catch (error) {
    console.error('Superadmin delete event error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete event' });
  }
};

// GET /api/superadmin/events/:id/registrations
export const getEventRegistrations = async (req, res) => {
  try {
    const { id } = req.params;
    const { search = '', status = '' } = req.query;

    const filter = { event: id };
    if (status) filter.status = status;

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const registrations = await EventRegistration.find(filter).sort({ registeredAt: -1 }).lean();

    res.json({
      success: true,
      data: registrations
    });
  } catch (error) {
    console.error('Superadmin get event registrations error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch registrations' });
  }
};

// PATCH /api/superadmin/events/:eventId/registrations/:regId
export const updateRegistrationStatus = async (req, res) => {
  try {
    const { eventId, regId } = req.params;
    const { status } = req.body;

    if (!['Confirmed', 'Cancelled', 'Attended'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid registration status' });
    }

    const registration = await EventRegistration.findOne({ _id: regId, event: eventId });
    if (!registration) {
      return res.status(404).json({ success: false, message: 'Registration not found' });
    }

    const oldStatus = registration.status;
    registration.status = status;
    await registration.save();

    // Adjust event registration count if status changes from or to Cancelled
    if (oldStatus !== status) {
      const event = await Event.findById(eventId);
      if (event) {
        if (status === 'Cancelled' && oldStatus !== 'Cancelled') {
          event.registrationsCount = Math.max(0, event.registrationsCount - 1);
        } else if (oldStatus === 'Cancelled' && status !== 'Cancelled') {
          event.registrationsCount += 1;
        }
        await event.save();
      }
    }

    res.json({
      success: true,
      message: 'Registration status updated successfully',
      data: registration
    });
  } catch (error) {
    console.error('Superadmin update registration status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update registration status' });
  }
};
