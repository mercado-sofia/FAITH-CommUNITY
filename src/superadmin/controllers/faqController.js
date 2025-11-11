// db table: faqs
import db from "../../database.js"

// Get all FAQs (for superadmin - includes inactive)
export const getAllFaqs = async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM faqs ORDER BY created_at DESC")
    res.status(200).json(rows)
  } catch (err) {
    console.error("Get all FAQs error:", err)
    res.status(500).json({ message: "Failed to retrieve FAQs", error: err.message })
  }
}

// Get active FAQs only (for public)
export const getActiveFaqs = async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM faqs WHERE status = 'active' ORDER BY created_at DESC")
    res.status(200).json(rows)
  } catch (err) {
    console.error("Get active FAQs error:", err)
    res.status(500).json({ message: "Failed to retrieve active FAQs", error: err.message })
  }
}

// Get FAQ by ID
export const getFaqById = async (req, res) => {
  const { id } = req.params

  if (!id || isNaN(id)) {
    return res.status(400).json({ error: "Invalid FAQ ID" })
  }

  try {
    const [rows] = await db.execute("SELECT * FROM faqs WHERE id = ?", [id])

    if (rows.length === 0) {
      return res.status(404).json({ message: "FAQ not found" })
    }

    res.json(rows[0])
  } catch (err) {
    console.error("Get FAQ by ID error:", err)
    res.status(500).json({ error: "Internal server error while fetching FAQ" })
  }
}

// Create a new FAQ
export const createFaq = async (req, res) => {
  const { question, answer, status = "active" } = req.body

  if (!question || !answer) {
    return res.status(400).json({ error: "Question and answer are required" })
  }

  if (question.trim().length < 5) {
    return res.status(400).json({ error: "Question must be at least 5 characters long" })
  }

  if (answer.trim().length < 10) {
    return res.status(400).json({ error: "Answer must be at least 10 characters long" })
  }

  try {
    const [result] = await db.execute(
      "INSERT INTO faqs (question, answer, status) VALUES (?, ?, ?)",
      [question.trim(), answer.trim(), status],
    )

    res.status(201).json({
      id: result.insertId,
      message: "FAQ created successfully",
      faq: {
        id: result.insertId,
        question: question.trim(),
        answer: answer.trim(),
        status,
      },
    })
  } catch (err) {
    console.error("Create FAQ error:", err)
    res.status(500).json({ message: "Failed to create FAQ", error: err.message })
  }
}

// Update FAQ
export const updateFaq = async (req, res) => {
  const { id } = req.params
  const { question, answer, status } = req.body

  if (!id || isNaN(id)) {
    return res.status(400).json({ error: "Invalid FAQ ID" })
  }

  if (!question || !answer) {
    return res.status(400).json({ error: "Question and answer are required" })
  }

  if (question.trim().length < 5) {
    return res.status(400).json({ error: "Question must be at least 5 characters long" })
  }

  if (answer.trim().length < 10) {
    return res.status(400).json({ error: "Answer must be at least 10 characters long" })
  }

  try {
    const [existingFaq] = await db.execute("SELECT id FROM faqs WHERE id = ?", [id])

    if (existingFaq.length === 0) {
      return res.status(404).json({ error: "FAQ not found" })
    }

    await db.execute("UPDATE faqs SET question = ?, answer = ?, status = ? WHERE id = ?", [
      question.trim(),
      answer.trim(),
      status || "active",
      id,
    ])

    res.json({
      message: "FAQ updated successfully",
      faq: {
        id: Number.parseInt(id),
        question: question.trim(),
        answer: answer.trim(),
        status: status || "active",
      },
    })
  } catch (err) {
    console.error("Update FAQ error:", err)
    res.status(500).json({ error: "Internal server error while updating FAQ" })
  }
}

// Delete FAQ (hard delete)
export const deleteFaq = async (req, res) => {
  const { id } = req.params

  if (!id || isNaN(id)) {
    return res.status(400).json({ error: "Invalid FAQ ID" })
  }

  try {
    const [existingFaq] = await db.execute("SELECT id FROM faqs WHERE id = ?", [id])

    if (existingFaq.length === 0) {
      return res.status(404).json({ error: "FAQ not found" })
    }

    await db.execute("DELETE FROM faqs WHERE id = ?", [id])

    res.json({ message: "FAQ deleted successfully" })
  } catch (err) {
    console.error("Delete FAQ error:", err)
    res.status(500).json({ error: "Internal server error while deleting FAQ" })
  }
}
