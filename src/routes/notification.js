import express from "express";
import { authRequired, permit } from '../middleware/auth.js';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead
} from "../controllers/notificationController.js";


const router = express.Router();

router.get("/", authRequired, getNotifications);
router.get("/unread-count", authRequired, getUnreadCount);
router.patch("/:id/read", authRequired, markAsRead);
router.patch("/mark-all-read", authRequired, markAllAsRead);

export default router;