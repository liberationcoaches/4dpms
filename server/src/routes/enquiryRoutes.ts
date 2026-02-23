import express from 'express';
import { submitEnquiry, getEnquiries, updateEnquiry } from '../controllers/enquiryController';

const router = express.Router();

// Public route - submit enquiry
router.post('/', submitEnquiry);

// Admin routes
router.get('/', getEnquiries);
router.put('/:id', updateEnquiry);

export default router;
