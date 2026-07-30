import express from 'express';
import { listInstructors, getInstructorProfile } from '../controllers/instructorController.js';

const router = express.Router();

router.get('/', listInstructors);
router.get('/:id', getInstructorProfile);

export default router;
