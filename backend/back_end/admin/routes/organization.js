import express from 'express';
import { submitOrganization } from '../controllers/organizationController.js';
import db from '../../database.js';

const router = express.Router();

// Submit an organization (POST)
router.post('/submit', submitOrganization);

// Get all submitted organizations (GET)
router.get('/all', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM organizations');
    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching organizations', error });
  }
});

// GET individual organization by ID with all related data
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Get organization details
    const [rows] = await db.execute('SELECT * FROM organizations WHERE id = ?', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    const org = rows[0];

    // Get advocacies
    const [advocacies] = await db.execute(
      'SELECT advocacy FROM advocacies WHERE organization_id = ?',
      [id]
    );

    // Get competencies
    const [competencies] = await db.execute(
      'SELECT competency FROM competencies WHERE organization_id = ?',
      [id]
    );

    // Get organization heads
    const [heads] = await db.execute(
      'SELECT orgName, role, facebook, email, photo FROM organization_heads WHERE organization_id = ?',
      [id]
    );

    res.json({
      success: true,
      data: {
        ...org,
        advocacies: advocacies.map(a => a.advocacy),
        competencies: competencies.map(c => c.competency),
        heads
      }
    });
  } catch (error) {
    console.error('Error retrieving organization:', error);
    res.status(500).json({ message: 'Error retrieving organization', error });
  }
});

// GET organization advocacies
router.get('/:id/advocacies', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT advocacy FROM advocacies WHERE organization_id = ?',
      [req.params.id]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching advocacies', error });
  }
});

// GET organization competencies
router.get('/:id/competencies', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT competency FROM competencies WHERE organization_id = ?',
      [req.params.id]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching competencies', error });
  }
});

// GET organization heads
router.get('/:id/heads', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT orgName, role, facebook, email, photo FROM organization_heads WHERE organization_id = ?',
      [req.params.id]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching organization heads', error });
  }
});

// Get organization by org
router.get('/org/:org', async (req, res) => {
  const { org } = req.params;

  try {
    // Get organization details
    const [rows] = await db.execute(
      'SELECT * FROM organizations WHERE LOWER(org) = LOWER(?)', 
      [org]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    const org = rows[0];

    // Get advocacies
    const [advocacies] = await db.execute(
      'SELECT advocacy FROM advocacies WHERE organization_id = ?',
      [org.id]
    );

    // Get competencies
    const [competencies] = await db.execute(
      'SELECT competency FROM competencies WHERE organization_id = ?',
      [org.id]
    );

    // Get organization heads
    const [heads] = await db.execute(
      'SELECT orgName, role, facebook, email, photo FROM organization_heads WHERE organization_id = ?',
      [org.id]
    );

    res.json({
      success: true,
      data: {
        ...org,
        advocacies: advocacies.map(a => a.advocacy),
        competencies: competencies.map(c => c.competency),
        heads
      }
    });
  } catch (error) {
    console.error('Error retrieving organization:', error);
    res.status(500).json({ message: 'Error retrieving organization', error });
  }
});

export default router;