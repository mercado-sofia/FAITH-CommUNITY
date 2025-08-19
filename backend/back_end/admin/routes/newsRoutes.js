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

// Other endpoints
router.get("/approved", getApprovedNews);
router.get("/approved/:orgId", getApprovedNewsByOrg);
router.get("/org/:orgId", getNewsByOrg);
router.get("/deleted/:orgId", getRecentlyDeletedNews);
router.patch("/restore/:id", restoreNews);
router.delete("/permanent/:id", permanentlyDeleteNews);
router.put("/:id", updateNews);

// Delete news (soft delete)
router.delete("/:id", deleteNewsSubmission);

// Keep this near the end so it doesn't shadow the specific routes above
router.get("/:id", getNewsById);

export default router;
