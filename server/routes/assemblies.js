const express = require('express');
const { getPool, sql } = require('../db');

const router = express.Router();

// Whitelist to prevent column-injection via filterBy / sortBy
// Use a Set for allowed sort fields to validate user input
const ALLOWED_SORT_MAP = {
  job_id:      'job_id',
  part_number: 'partno',
  updated_at:  'updated_at DESC',
};

// Build WHERE clause and bind params to a request
function applyFilters(request, search, categories, jobIds, preferences, sdcStandards) {
  let where = '1=1';

  if (search) {
    request.input('search', sql.NVarChar, `%${search}%`);
    where += ` AND (
      job_id LIKE @search OR
      job_name LIKE @search OR
      partno LIKE @search OR
      description LIKE @search
    )`;
  }

  if (categories && categories.length > 0) {
    // We'll build the IN clause manually for simplicity with mssql driver
    const catList = categories.map((c, i) => {
      const name = `cat_${i}`;
      request.input(name, sql.NVarChar, c);
      return `@${name}`;
    }).join(',');
    where += ` AND category IN (${catList})`;
  }

  if (jobIds && jobIds.length > 0) {
    const jobList = jobIds.map((j, i) => {
      const name = `job_${i}`;
      request.input(name, sql.NVarChar, j);
      return `@${name}`;
    }).join(',');
    where += ` AND job_id IN (${jobList})`;
  }

  if (preferences && preferences.length > 0) {
    const prefList = preferences.map((p, i) => {
      const name = `pref_${i}`;
      request.input(name, sql.NVarChar, p);
      return `@${name}`;
    }).join(',');
    where += ` AND preference IN (${prefList})`;
  }

  if (sdcStandards && sdcStandards.length > 0) {
    const sdcList = sdcStandards.map((s, i) => {
      const name = `sdc_${i}`;
      request.input(name, sql.NVarChar, s);
      return `@${name}`;
    }).join(',');
    where += ` AND sdc_standard IN (${sdcList})`;
  }

  return where;
}

// GET /api/assemblies/categories - distinct existing categories
router.get('/categories', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(
      "SELECT DISTINCT category FROM solidworks_assemblies WHERE category IS NOT NULL AND category <> '' AND category <> 'None' ORDER BY category"
    );
    res.json(result.recordset.map((r) => r.category));
  } catch (err) {
    console.error('Category fetch error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/assemblies/jobs - distinct existing job IDs
router.get('/jobs', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(
      "SELECT DISTINCT job_id FROM solidworks_assemblies WHERE job_id IS NOT NULL AND job_id <> '' ORDER BY job_id"
    );
    res.json(result.recordset.map((r) => r.job_id));
  } catch (err) {
    console.error('Job fetch error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/assemblies
router.get('/', async (req, res) => {
  const {
    search = '',
    categories = '', // comma-separated
    jobIds = '',     // comma-separated
    sortBy = 'job_id',
    page = '1',
    limit = '20',
    preferences = '',    // comma-separated
    sdcStandards = '',   // comma-separated
  } = req.query;

  const catArr  = categories   ? categories.split(',')   : [];
  const jobArr  = jobIds       ? jobIds.split(',')       : [];
  const prefArr = preferences  ? preferences.split(',')  : [];
  const sdcArr  = sdcStandards ? sdcStandards.split(',') : [];

  const safeSort   = ALLOWED_SORT_MAP[sortBy] || 'job_id';
  const pageNum    = Math.max(1, parseInt(page, 10)  || 1);
  const limitNum   = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset     = (pageNum - 1) * limitNum;

  const filters = { search, categories: catArr, jobIds: jobArr, preferences: prefArr, sdcStandards: sdcArr };

  try {
    const pool = await getPool();

    // Count
    const countReq = pool.request();
    const where = applyFilters(countReq, filters.search, filters.categories, filters.jobIds, filters.preferences, filters.sdcStandards);
    const countResult = await countReq.query(`SELECT COUNT(*) as total FROM solidworks_assemblies WHERE ${where}`);
    const total = countResult.recordset[0].total;

    // Data
    const dataReq = pool.request();
    applyFilters(dataReq, filters.search, filters.categories, filters.jobIds, filters.preferences, filters.sdcStandards);
    dataReq.input('offset', sql.Int, offset);
    dataReq.input('limitN', sql.Int, limitNum);

    const dataResult = await dataReq.query(`
      SELECT
        id, job_id, job_name, partno, description,
        category, comments, updated_by, updated_at,
        model_link, picture_link, preference, sdc_standard
      FROM solidworks_assemblies
      WHERE ${where}
      ORDER BY
        CASE
          WHEN sdc_standard = 'Yes' AND preference = 'Yes' THEN 0
          WHEN sdc_standard = 'Yes'                         THEN 1
          WHEN preference   = 'Yes'                         THEN 2
          ELSE                                                   3
        END,
        ${safeSort}
      OFFSET @offset ROWS FETCH NEXT @limitN ROWS ONLY
    `);

    res.json({ data: dataResult.recordset, total, page: pageNum });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', detail: err.message });
  }
});

// POST /api/assemblies — create a new record manually
router.post('/', async (req, res) => {
  const {
    partno, job_id, job_name, description,
    category, comments, updated_by, model_link, picture_link,
    preference, sdc_standard,
  } = req.body;

  if (!partno || !partno.trim()) {
    return res.status(400).json({ error: 'Bad Request', detail: 'partno is required' });
  }

  try {
    const pool = await getPool();

    // Check uniqueness
    const exists = await pool.request()
      .input('pno', sql.NVarChar, partno.trim())
      .query('SELECT 1 FROM solidworks_assemblies WHERE partno = @pno');

    if (exists.recordset.length > 0) {
      return res.status(409).json({ error: 'Conflict', detail: `Part number "${partno.trim()}" already exists` });
    }

    const request = pool.request();
    request.input('partno',       sql.NVarChar, partno.trim());
    request.input('job_id',       sql.NVarChar, job_id       || null);
    request.input('job_name',     sql.NVarChar, job_name     || null);
    request.input('description',  sql.NVarChar, description  || null);
    request.input('category',     sql.NVarChar, category     || null);
    request.input('comments',     sql.NVarChar, comments     || null);
    request.input('updated_by',   sql.NVarChar, updated_by   || null);
    request.input('model_link',   sql.NVarChar, model_link   || null);
    request.input('picture_link', sql.NVarChar, picture_link || null);
    request.input('preference',   sql.NVarChar, preference   || null);
    request.input('sdc_standard', sql.NVarChar, sdc_standard || null);

    await request.query(`
      INSERT INTO solidworks_assemblies
        (partno, job_id, job_name, description, category, comments,
         updated_by, model_link, picture_link, preference, sdc_standard, updated_at)
      VALUES
        (@partno, @job_id, @job_name, @description, @category, @comments,
         @updated_by, @model_link, @picture_link, @preference, @sdc_standard, GETDATE())
    `);

    const created = await pool.request()
      .input('pno', sql.NVarChar, partno.trim())
      .query('SELECT id, job_id, job_name, partno, description, category, comments, updated_by, updated_at, model_link, picture_link, preference, sdc_standard FROM solidworks_assemblies WHERE partno = @pno');

    res.status(201).json({ success: true, assembly: created.recordset[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', detail: err.message });
  }
});

// PATCH /api/assemblies/:partno
router.patch('/:partno', async (req, res) => {
  const { partno } = req.params;
  const { category, description, comments, updated_by, model_link, picture_link, preference, sdc_standard } = req.body;

  try {
    const pool = await getPool();
    // Fetch current values to handle partial updates or just set only modified ones
    const currentRes = await pool.request()
      .input('pno', sql.NVarChar, partno)
      .query('SELECT * FROM solidworks_assemblies WHERE partno = @pno');

    if (currentRes.recordset.length === 0) {
      return res.status(404).json({ error: 'Not found', detail: `No assembly with partno "${partno}"` });
    }

    const current = currentRes.recordset[0];

    const request = pool.request();
    request.input('partno',       sql.NVarChar, partno);
    request.input('category',     sql.NVarChar, category     !== undefined ? category     : current.category);
    request.input('description',  sql.NVarChar, description  !== undefined ? description  : current.description);
    request.input('comments',     sql.NVarChar, comments     !== undefined ? comments     : current.comments);
    request.input('updated_by',   sql.NVarChar, updated_by   !== undefined ? updated_by   : current.updated_by);
    request.input('model_link',   sql.NVarChar, model_link   !== undefined ? model_link   : current.model_link);
    request.input('picture_link', sql.NVarChar, picture_link !== undefined ? picture_link : current.picture_link);
    request.input('preference',    sql.NVarChar, preference    !== undefined ? preference    : current.preference);
    request.input('sdc_standard',  sql.NVarChar, sdc_standard  !== undefined ? sdc_standard  : current.sdc_standard);

    const result = await request.query(`
      UPDATE solidworks_assemblies
      SET
        category     = @category,
        description  = @description,
        comments     = @comments,
        updated_by   = @updated_by,
        model_link   = @model_link,
        picture_link = @picture_link,
        preference   = @preference,
        sdc_standard = @sdc_standard,
        updated_at   = GETDATE()
      WHERE partno = @partno;

      SELECT partno, category, description, comments, updated_by, updated_at, model_link, picture_link, preference, sdc_standard
      FROM solidworks_assemblies
      WHERE partno = @partno;
    `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Not found', detail: `No assembly with partno "${partno}"` });
    }

    res.json({ success: true, updated: result.recordset[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', detail: err.message });
  }
});

// PATCH /api/assemblies (bulk field update)
router.patch('/', async (req, res) => {
  const { partnos, field, value } = req.body;

  const ALLOWED_FIELDS = { preference: 'preference', sdc_standard: 'sdc_standard' };
  if (!ALLOWED_FIELDS[field]) {
    return res.status(400).json({ error: 'Bad Request', detail: `Field "${field}" is not allowed for bulk update` });
  }
  if (!Array.isArray(partnos) || partnos.length === 0) {
    return res.status(400).json({ error: 'Bad Request', detail: 'partnos must be a non-empty array' });
  }
  if (value !== 'Yes' && value !== 'No' && value !== null) {
    return res.status(400).json({ error: 'Bad Request', detail: 'value must be Yes, No, or null' });
  }

  try {
    const pool = await getPool();
    const request = pool.request();
    const col = ALLOWED_FIELDS[field];
    request.input('val', sql.NVarChar, value);

    const paramList = partnos.map((p, i) => {
      request.input(`p_${i}`, sql.NVarChar, p);
      return `@p_${i}`;
    }).join(',');

    const result = await request.query(
      `UPDATE solidworks_assemblies SET ${col} = @val, updated_at = GETDATE() WHERE partno IN (${paramList})`
    );
    res.json({ success: true, updated: result.rowsAffected[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', detail: err.message });
  }
});

// DELETE /api/assemblies (bulk)
router.delete('/', async (req, res) => {
  const password = req.headers['x-delete-password'];
  if (password !== '49') {
    return res.status(403).json({ error: 'Unauthorized', detail: 'Invalid deletion password' });
  }

  const { partnos } = req.body;
  if (!Array.isArray(partnos) || partnos.length === 0) {
    return res.status(400).json({ error: 'Bad Request', detail: 'partnos must be a non-empty array' });
  }

  try {
    const pool = await getPool();
    const request = pool.request();
    const paramList = partnos.map((p, i) => {
      request.input(`p_${i}`, sql.NVarChar, p);
      return `@p_${i}`;
    }).join(',');

    const result = await request.query(`DELETE FROM solidworks_assemblies WHERE partno IN (${paramList})`);
    res.json({ success: true, deleted: result.rowsAffected[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', detail: err.message });
  }
});

// DELETE /api/assemblies/:partno
router.delete('/:partno', async (req, res) => {
  const { partno } = req.params;
  const password = req.headers['x-delete-password'];

  if (password !== '49') {
    return res.status(403).json({ error: 'Unauthorized', detail: 'Invalid deletion password' });
  }

  try {
    const pool = await getPool();
    const request = pool.request();
    request.input('partno', sql.NVarChar, partno);

    const result = await request.query('DELETE FROM solidworks_assemblies WHERE partno = @partno');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Not found', detail: `No assembly with partno "${partno}"` });
    }

    res.json({ success: true, partno });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', detail: err.message });
  }
});

module.exports = router;
