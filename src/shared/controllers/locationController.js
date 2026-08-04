import LocationMaster from '../models/LocationMaster.js';

/**
 * Detect location from GPS coordinates
 * GET /api/public/detect-location?latitude=26.75&longitude=84.50
 */
export const detectLocationFromCoordinates = async (req, res) => {
  try {
    const { latitude, longitude } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required',
      });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid latitude or longitude format',
      });
    }

    // Find location that matches the coordinates
    const location = await LocationMaster.findOne({
      minLatitude: { $lte: lat },
      maxLatitude: { $gte: lat },
      minLongitude: { $lte: lon },
      maxLongitude: { $gte: lon },
      isActive: true,
    });

    if (location) {
      return res.status(200).json({
        success: true,
        data: {
          city: location.city,
          state: location.state,
          district: location.district,
          pinCodes: location.pinCodes,
        },
      });
    }

    return res.status(404).json({
      success: false,
      message: 'Location not found in database',
    });
  } catch (error) {
    console.error('Error detecting location:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to detect location',
      error: error.message,
    });
  }
};

/**
 * Get all locations (Admin)
 * GET /api/admin/locations
 */
export const getAllLocations = async (req, res) => {
  try {
    const { state, city, isActive } = req.query;
    const filter = {};

    if (state) filter.state = new RegExp(state, 'i');
    if (city) filter.city = new RegExp(city, 'i');
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const locations = await LocationMaster.find(filter)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ state: 1, city: 1 });

    return res.status(200).json({
      success: true,
      data: locations,
      count: locations.length,
    });
  } catch (error) {
    console.error('Error fetching locations:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch locations',
      error: error.message,
    });
  }
};

/**
 * Create new location
 * POST /api/admin/locations
 */
export const createLocation = async (req, res) => {
  try {
    const {
      city,
      state,
      district,
      minLatitude,
      maxLatitude,
      minLongitude,
      maxLongitude,
      pinCodes,
    } = req.body;

    // Validation
    if (!city || !state || !district || minLatitude === undefined || maxLatitude === undefined || minLongitude === undefined || maxLongitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided',
      });
    }

    if (minLatitude >= maxLatitude || minLongitude >= maxLongitude) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinate bounds',
      });
    }

    // Check if location already exists
    const existingLocation = await LocationMaster.findOne({
      city: new RegExp(`^${city}$`, 'i'),
      state: new RegExp(`^${state}$`, 'i'),
    });

    if (existingLocation) {
      return res.status(409).json({
        success: false,
        message: 'Location already exists',
      });
    }

    const location = new LocationMaster({
      city,
      state,
      district,
      minLatitude: parseFloat(minLatitude),
      maxLatitude: parseFloat(maxLatitude),
      minLongitude: parseFloat(minLongitude),
      maxLongitude: parseFloat(maxLongitude),
      pinCodes: Array.isArray(pinCodes) ? pinCodes : [],
      createdBy: req.user?.id,
    });

    await location.save();

    return res.status(201).json({
      success: true,
      message: 'Location created successfully',
      data: location,
    });
  } catch (error) {
    console.error('Error creating location:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create location',
      error: error.message,
    });
  }
};

/**
 * Update location
 * PUT /api/admin/locations/:id
 */
export const updateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      city,
      state,
      district,
      minLatitude,
      maxLatitude,
      minLongitude,
      maxLongitude,
      pinCodes,
      isActive,
    } = req.body;

    const location = await LocationMaster.findById(id);

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found',
      });
    }

    // Update fields
    if (city) location.city = city;
    if (state) location.state = state;
    if (district) location.district = district;
    if (minLatitude !== undefined) location.minLatitude = parseFloat(minLatitude);
    if (maxLatitude !== undefined) location.maxLatitude = parseFloat(maxLatitude);
    if (minLongitude !== undefined) location.minLongitude = parseFloat(minLongitude);
    if (maxLongitude !== undefined) location.maxLongitude = parseFloat(maxLongitude);
    if (pinCodes) location.pinCodes = Array.isArray(pinCodes) ? pinCodes : [];
    if (isActive !== undefined) location.isActive = isActive;

    location.updatedBy = req.user?.id;

    await location.save();

    return res.status(200).json({
      success: true,
      message: 'Location updated successfully',
      data: location,
    });
  } catch (error) {
    console.error('Error updating location:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update location',
      error: error.message,
    });
  }
};

/**
 * Delete location
 * DELETE /api/admin/locations/:id
 */
export const deleteLocation = async (req, res) => {
  try {
    const { id } = req.params;

    const location = await LocationMaster.findByIdAndDelete(id);

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Location deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting location:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete location',
      error: error.message,
    });
  }
};

/**
 * Get location by ID
 * GET /api/admin/locations/:id
 */
export const getLocationById = async (req, res) => {
  try {
    const { id } = req.params;

    const location = await LocationMaster.findById(id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: location,
    });
  } catch (error) {
    console.error('Error fetching location:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch location',
      error: error.message,
    });
  }
};
