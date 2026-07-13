import Event from '../../shared/models/Event.js';
import EventRegistration from '../../shared/models/EventRegistration.js';

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

// GET /api/admin/events
export const getAllEvents = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
      branch = '',
      startDate,
      endDate,
      myEventsOnly = 'false'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = {};

    if (myEventsOnly === 'true') {
      filter.createdBy = req.user.id;
    }
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
    console.error('Admin get all events error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch events' });
  }
};

// GET /api/admin/events/stats
export const getEventStats = async (req, res) => {
  try {
    const filter = { createdBy: req.user.id };
    const totalCount = await Event.countDocuments(filter);
    const activeCount = await Event.countDocuments({ ...filter, status: 'Active' });
    const plannedCount = await Event.countDocuments({ ...filter, status: 'Planned' });
    const completedCount = await Event.countDocuments({ ...filter, status: 'Completed' });
    
    // Aggregated registrations for their events
    const aggregatedStats = await Event.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalCapacity: { $sum: '$capacity' },
          totalRegistrations: { $sum: '$registrationsCount' },
        }
      }
    ]);

    const stats = {
      totalCount,
      activeCount,
      plannedCount,
      completedCount,
      totalCapacity: aggregatedStats[0]?.totalCapacity || 0,
      totalRegistrations: aggregatedStats[0]?.totalRegistrations || 0,
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Admin get event stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to compile stats' });
  }
};

// POST /api/admin/events
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
    console.error('Admin create event error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create event' });
  }
};

// PUT /api/admin/events/:id
export const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const sanitized = sanitizeBody(req.body);

    const event = await Event.findOneAndUpdate(
      { _id: id, createdBy: req.user.id },
      {
        ...sanitized,
        updatedBy: req.user.id
      },
      { new: true, runValidators: true }
    );

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found or unauthorized' });
    }

    res.json({
      success: true,
      message: 'Event updated successfully',
      data: event
    });
  } catch (error) {
    console.error('Admin update event error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update event' });
  }
};

// DELETE /api/admin/events/:id
export const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findOneAndDelete({ _id: id, createdBy: req.user.id });

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found or unauthorized' });
    }

    // Clean up registrations
    await EventRegistration.deleteMany({ event: id });

    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Admin delete event error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete event' });
  }
};

// POST /api/admin/events/:id/register
export const registerAttendee = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, notes } = req.body;

    if (!name || !email || !phone) {
      return res.status(400).json({ success: false, message: 'Name, email and phone number are required' });
    }

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (event.status === 'Cancelled' || event.status === 'Completed') {
      return res.status(400).json({ success: false, message: 'Registrations are closed for this event status' });
    }

    if (event.capacity > 0 && event.registrationsCount >= event.capacity) {
      return res.status(400).json({ success: false, message: 'Event capacity has been reached' });
    }

    // Check if attendee is already registered
    const alreadyRegistered = await EventRegistration.findOne({ event: id, email: email.toLowerCase() });
    if (alreadyRegistered) {
      return res.status(400).json({ success: false, message: 'This email is already registered for the event' });
    }

    const registration = new EventRegistration({
      event: id,
      name,
      email,
      phone,
      notes,
      status: 'Confirmed'
    });

    await registration.save();

    event.registrationsCount += 1;
    await event.save();

    res.status(201).json({
      success: true,
      message: 'Attendee registered successfully',
      data: registration
    });
  } catch (error) {
    console.error('Admin event register error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to register attendee' });
  }
};

// GET /api/admin/events/:id/registrations
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
    console.error('Admin get event registrations error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch registrations' });
  }
};

// PATCH /api/admin/events/:eventId/registrations/:regId
export const toggleAttendance = async (req, res) => {
  try {
    const { eventId, regId } = req.params;
    const { status } = req.body; // should be 'Confirmed' or 'Attended' or 'Cancelled'

    if (!['Confirmed', 'Cancelled', 'Attended'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid attendance status' });
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
      message: `Registration marked as ${status}`,
      data: registration
    });
  } catch (error) {
    console.error('Admin toggle attendance error:', error);
    res.status(500).json({ success: false, message: 'Failed to update attendance status' });
  }
};
