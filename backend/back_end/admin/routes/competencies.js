import express from "express"
import {
  addCompetency,
  getCompetencies,
  getAllCompetencies,
  deleteCompetency,
} from "../controllers/competencyController.js"

const router = express.Router()

// GET all competencies (admin use)
router.get("/", getAllCompetencies)

// GET competency by organization ID
router.get("/:organization_id", getCompetencies)

// POST create/update competency by organization
router.post("/", addCompetency)

// DELETE competency by ID
router.delete("/:id", deleteCompetency)

export default router