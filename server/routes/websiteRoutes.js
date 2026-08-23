import express from 'express';
import { protect, authorize, authorizeDoor } from '../middleware/authMiddleware.js';
import {
  getWebsiteContent,
  updateWebsiteContent,
  getFAQs,
  createFAQ,
  updateFAQ,
  deleteFAQ,
  getTestimonials,
  createTestimonial,
  updateTestimonialStatus,
  deleteTestimonial,
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement
} from '../controllers/websiteController.js';

const router = express.Router();

// =======================
// PUBLIC ROUTES
// =======================
const publicRouter = express.Router();

publicRouter.get('/content', getWebsiteContent);
publicRouter.get('/faqs', getFAQs);
publicRouter.get('/testimonials', getTestimonials);
publicRouter.get('/announcements', getAnnouncements);

router.use('/public', publicRouter);

// =======================
// PROTECTED ADMIN ROUTES
// =======================
router.use(protect);
router.use(authorizeDoor('admin', 'superadmin'));

// Content
router.route('/content')
  .get(getWebsiteContent)
  .patch(updateWebsiteContent);

// FAQs
router.route('/faqs')
  .get(getFAQs)
  .post(createFAQ);

router.route('/faqs/:id')
  .patch(updateFAQ)
  .delete(deleteFAQ);

// Testimonials
router.route('/testimonials')
  .get(getTestimonials)
  .post(createTestimonial);

router.route('/testimonials/:id')
  .patch(updateTestimonialStatus)
  .delete(deleteTestimonial);

// Announcements
router.route('/announcements')
  .get(getAnnouncements)
  .post(createAnnouncement);

router.route('/announcements/:id')
  .patch(updateAnnouncement)
  .delete(deleteAnnouncement);

export default router;
