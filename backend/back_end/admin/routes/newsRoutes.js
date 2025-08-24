import { Router } from "express";
import {
  createNews,
  getNewsByOrg,
  getApprovedNews,
  getApprovedNewsByOrg,
  getNewsById,
  deleteNewsSubmission,
  getRecentlyDeletedNews,
  restoreNews,
  permanentlyDeleteNews,
  updateNews,
} from "../controllers/newsController.js";

const router = Router();

// Create news for an org (orgId can be numeric or acronym)
router.post("/:orgId", createNews);

// Root -> return approved news (so GET /api/news works)
router.get("/", getApprovedNews);

// Other specific endpoints
router.get("/approved", getApprovedNews);
router.get("/approved/:orgId", getApprovedNewsByOrg);
router.get("/org/:orgId", getNewsByOrg);
router.get("/deleted/:orgId", getRecentlyDeletedNews);
router.patch("/restore/:id", restoreNews);
router.delete("/permanent/:id", permanentlyDeleteNews);

// Generic CRUD operations for individual news items
router.put("/:id", updateNews);
router.delete("/:id", deleteNewsSubmission);
router.get("/:id", getNewsById);

export default router;
