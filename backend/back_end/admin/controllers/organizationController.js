//db table: organizations
import db from '../../database.js';

export const submitOrganization = async (req, res) => {
  const {
    logo, name, acronym, facebook, email, description, submitted_by,
    advocacies, competencies, projects, heads
  } = req.body;

  const conn = await db.getConnection();
  await conn.beginTransaction();

  try {
    // Insert into organizations
    const [orgRes] = await conn.execute(
      `INSERT INTO organizations (logo, name, acronym, facebook, email, description, status, submitted_by)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [logo, name, acronym, facebook, email, description, submitted_by]
    );
    const organization_id = orgRes.insertId;

    // Insert advocacies
    for (let adv of advocacies) {
      await conn.execute(
        `INSERT INTO advocacies (organization_id, advocacy) VALUES (?, ?)`,
        [organization_id, adv]
      );
    }

    // Insert competencies
    for (let comp of competencies) {
      await conn.execute(
        `INSERT INTO competencies (organization_id, competency) VALUES (?, ?)`,
        [organization_id, comp]
      );
    }

    // Insert featured projects
    for (let proj of projects) {
      await conn.execute(
        `INSERT INTO featured_projects (organization_id, title, description, image) VALUES (?, ?, ?, ?)`,
        [organization_id, proj.title, proj.description, proj.image]
      );
    }

    // Insert organization heads
    for (let head of heads) {
      await conn.execute(
        `INSERT INTO organization_heads (organization_id, name, role, facebook, email, photo) VALUES (?, ?, ?, ?, ?, ?)`,
        [organization_id, head.name, head.role, head.facebook, head.email, head.photo]
      );
    }

    await conn.commit();
    res.status(201).json({ message: 'Organization submitted successfully.' });

  } catch (error) {
    await conn.rollback();
    console.error('Submission Error:', error);
    res.status(500).json({ message: 'Submission failed.', error });
  } finally {
    conn.release();
  }
};