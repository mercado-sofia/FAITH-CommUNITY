// back_end/admin/routes/subscribers.js
import { Router } from "express";
import {
  subscribe,
  verify,
  unsubscribe,
  notifySubscribers,
} from "../controllers/subscribersController.js";

const router = Router();

router.post("/", subscribe);
router.get("/verify", verify);
router.get("/unsubscribe", unsubscribe);

// ⚠️ Consider protecting this endpoint (JWT, secret key, etc.)
router.post("/notify", notifySubscribers);

export default router;