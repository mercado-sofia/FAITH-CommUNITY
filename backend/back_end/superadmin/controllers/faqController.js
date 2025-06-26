// db table: faqs
import db from "../../database.js";

// Get all active FAQs
export const getAllFaqs = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM faqs WHERE status = 'active'");
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ message: "Failed to retrieve FAQs", error: err.message });
  }
};

// Add a new FAQ
export const createFaq = async (req, res) => {
  const { question, answer } = req.body;
  try {
    const [result] = await db.query(
      "INSERT INTO faqs (question, answer) VALUES (?, ?)",
      [question, answer]
    );
    res.status(201).json({ id: result.insertId, message: "FAQ created" });
  } catch (err) {
    res.status(500).json({ message: "Failed to create FAQ", error: err.message });
  }
};

// Delete FAQ
export const deleteFaq = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM faqs WHERE id = ?", [id]);
    res.status(200).json({ message: "FAQ deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete FAQ", error: err.message });
  }
};
