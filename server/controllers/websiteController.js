import WebsiteContent from '../models/WebsiteContent.js';
import FAQ from '../models/FAQ.js';
import Testimonial from '../models/Testimonial.js';
import Announcement from '../models/Announcement.js';

// Helper for restricted actions (Publish, Delete)
const checkSuperAdmin = (req, res) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'Super Admin permission required for this action.' });
  }
};

// =======================
// WEBSITE CONTENT (Singleton)
// =======================

export const getWebsiteContent = async (req, res) => {
  try {
    let content = await WebsiteContent.findOne({ isGlobal: true })
      .populate('homepage.featuredCourses', 'title thumbnail instructor price status')
      .populate('homepage.featuredInstructors', 'name profilePicture university role');
    
    if (!content) {
      content = await WebsiteContent.create({ isGlobal: true });
    }
    res.json(content);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching website content' });
  }
};

export const updateWebsiteContent = async (req, res) => {
  try {
    const { homepage, about, contact } = req.body;
    let content = await WebsiteContent.findOne({ isGlobal: true });
    
    if (!content) {
      content = new WebsiteContent({ isGlobal: true });
    }

    if (homepage) {
      content.homepage = homepage;
      content.markModified('homepage');
    }
    if (about) {
      content.about = about;
      content.markModified('about');
    }
    if (contact) {
      content.contact = contact;
      content.markModified('contact');
    }

    await content.save();
    res.json(content);
  } catch (error) {
    res.status(500).json({ message: 'Error updating website content' });
  }
};

// =======================
// FAQS
// =======================

export const getFAQs = async (req, res) => {
  try {
    // If public request, only show active
    const filter = req.baseUrl.includes('public') ? { status: 'active' } : {};
    const faqs = await FAQ.find(filter).sort({ displayOrder: 1, createdAt: -1 });
    res.json(faqs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching FAQs' });
  }
};

export const createFAQ = async (req, res) => {
  try {
    const faq = await FAQ.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json(faq);
  } catch (error) {
    res.status(500).json({ message: 'Error creating FAQ' });
  }
};

export const updateFAQ = async (req, res) => {
  try {
    const { status } = req.body;
    if (status === 'active' || status === 'archived') {
      const check = checkSuperAdmin(req, res);
      if (check) return check;
    }

    const faq = await FAQ.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(faq);
  } catch (error) {
    res.status(500).json({ message: 'Error updating FAQ' });
  }
};

export const deleteFAQ = async (req, res) => {
  try {
    const check = checkSuperAdmin(req, res);
    if (check) return check;

    await FAQ.findByIdAndDelete(req.params.id);
    res.json({ message: 'FAQ deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting FAQ' });
  }
};

// =======================
// TESTIMONIALS
// =======================

export const getTestimonials = async (req, res) => {
  try {
    const filter = req.baseUrl.includes('public') ? { status: { $in: ['approved', 'featured'] } } : {};
    const testimonials = await Testimonial.find(filter).sort({ createdAt: -1 });
    res.json(testimonials);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching testimonials' });
  }
};

export const createTestimonial = async (req, res) => {
  try {
    if (['approved', 'featured'].includes(req.body.status)) {
      const check = checkSuperAdmin(req, res);
      if (check) return check;
    }

    const testimonial = await Testimonial.create(req.body);
    res.status(201).json(testimonial);
  } catch (error) {
    res.status(500).json({ message: 'Error creating testimonial' });
  }
};

export const updateTestimonialStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (['approved', 'featured'].includes(status)) {
      const check = checkSuperAdmin(req, res);
      if (check) return check;
    }
    
    const testimonial = await Testimonial.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.json(testimonial);
  } catch (error) {
    res.status(500).json({ message: 'Error updating testimonial' });
  }
};

export const deleteTestimonial = async (req, res) => {
  try {
    const check = checkSuperAdmin(req, res);
    if (check) return check;

    await Testimonial.findByIdAndDelete(req.params.id);
    res.json({ message: 'Testimonial deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting testimonial' });
  }
};

// =======================
// ANNOUNCEMENTS
// =======================

export const getAnnouncements = async (req, res) => {
  try {
    const filter = req.baseUrl.includes('public') ? { status: 'published' } : {};
    const announcements = await Announcement.find(filter).sort({ createdAt: -1 });
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching announcements' });
  }
};

export const createAnnouncement = async (req, res) => {
  try {
    const data = { ...req.body, createdBy: req.user.id };
    if (data.status === 'published') {
      const check = checkSuperAdmin(req, res);
      if (check) return check;
    }
    const announcement = await Announcement.create(data);
    res.status(201).json(announcement);
  } catch (error) {
    res.status(500).json({ message: 'Error creating announcement' });
  }
};

export const updateAnnouncement = async (req, res) => {
  try {
    if (req.body.status === 'published' || req.body.status === 'archived') {
      const check = checkSuperAdmin(req, res);
      if (check) return check;
    }
    const announcement = await Announcement.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(announcement);
  } catch (error) {
    res.status(500).json({ message: 'Error updating announcement' });
  }
};

export const deleteAnnouncement = async (req, res) => {
  try {
    const check = checkSuperAdmin(req, res);
    if (check) return check;

    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ message: 'Announcement deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting announcement' });
  }
};
