import express from 'express';

/**
 * Validate required fields in request body
 */
export const validateRequired = (fields: string[]) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const missing: string[] = [];

    for (const field of fields) {
      if (!req.body[field]) {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missing.join(', ')}`,
      });
    }

    next();
  };
};

/**
 * Validate email format
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate date format (YYYY-MM-DD)
 */
export const validateDateFormat = (date: string): boolean => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return false;

  const d = new Date(date);
  return d instanceof Date && !isNaN(d.getTime());
};

/**
 * Validate production record data
 */
export const validateProductionRecord = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const { color_pages, bw_pages, total_pages, po_number, machine_id, record_date } = req.body;

  // Validate page numbers are non-negative
  if (typeof color_pages === 'number' && color_pages < 0) {
    return res.status(400).json({ error: 'color_pages cannot be negative' });
  }

  if (typeof bw_pages === 'number' && bw_pages < 0) {
    return res.status(400).json({ error: 'bw_pages cannot be negative' });
  }

  if (typeof total_pages === 'number' && total_pages < 0) {
    return res.status(400).json({ error: 'total_pages cannot be negative' });
  }

  // Validate PO number
  if (po_number && typeof po_number !== 'number') {
    return res.status(400).json({ error: 'po_number must be a number' });
  }

  // Validate machine_id
  if (machine_id && typeof machine_id !== 'number') {
    return res.status(400).json({ error: 'machine_id must be a number' });
  }

  // Validate date format
  if (record_date && !validateDateFormat(record_date)) {
    return res.status(400).json({ error: 'record_date must be in YYYY-MM-DD format' });
  }

  next();
};