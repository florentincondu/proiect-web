const Service = require('../models/Service');
const { protect, admin } = require('../middleware/authMiddleware');

// Get all services (admin only)
exports.getServices = async (req, res) => {
  try {
    const services = await Service.find().sort({ createdAt: -1 });
    res.json(services);
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get service by ID (admin only)
exports.getServiceById = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    
    res.json(service);
  } catch (error) {
    console.error('Get service error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create service (admin only)
exports.createService = async (req, res) => {
  try {
    const { name, description, price, duration, category, images } = req.body;
    
    const service = new Service({
      name,
      description,
      price,
      duration,
      category,
      images: images || []
    });
    
    await service.save();
    res.status(201).json(service);
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update service (admin only)
exports.updateService = async (req, res) => {
  try {
    const { name, description, price, duration, category, images, isActive } = req.body;
    const service = await Service.findById(req.params.id);
    
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    
    service.name = name || service.name;
    service.description = description || service.description;
    service.price = price || service.price;
    service.duration = duration || service.duration;
    service.category = category || service.category;
    service.images = images || service.images;
    service.isActive = isActive !== undefined ? isActive : service.isActive;
    
    await service.save();
    res.json(service);
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete service (admin only)
exports.deleteService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    
    await service.remove();
    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 