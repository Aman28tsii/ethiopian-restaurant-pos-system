import { query } from '../config/database.js';
import { catchAsync } from '../middleware/errorHandler.js';

// Get all tables
export const getAllTables = catchAsync(async (req, res) => {
  const result = await query(`
    SELECT id, table_number, capacity, status, current_order_id, created_at
    FROM tables 
    ORDER BY table_number ASC
  `);
  
  res.json({ success: true, data: result.rows });
});

// Get available tables
export const getAvailableTables = catchAsync(async (req, res) => {
  const result = await query(`
    SELECT id, table_number, capacity
    FROM tables 
    WHERE status = 'available'
    ORDER BY table_number ASC
  `);
  
  res.json({ success: true, data: result.rows });
});

// Get single table
export const getTableById = catchAsync(async (req, res) => {
  const { id } = req.params;
  
  const result = await query(`
    SELECT id, table_number, capacity, status, current_order_id
    FROM tables 
    WHERE id = $1
  `, [id]);
  
  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, error: 'Table not found' });
  }
  
  res.json({ success: true, data: result.rows[0] });
});

// Update table status
export const updateTableStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status, current_order_id } = req.body;
  
  const validStatuses = ['available', 'occupied', 'reserved', 'cleaning'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid status' });
  }
  
  const result = await query(`
    UPDATE tables 
    SET status = $1, 
        current_order_id = COALESCE($2, current_order_id),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
    RETURNING id, table_number, status, current_order_id
  `, [status, current_order_id, id]);
  
  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, error: 'Table not found' });
  }
  
  res.json({ success: true, data: result.rows[0], message: `Table status updated to ${status}` });
});

// Reserve a table
export const reserveTable = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { customer_name, customer_phone, reservation_time } = req.body;
  
  const result = await query(`
    UPDATE tables 
    SET status = 'reserved'
    WHERE id = $1 AND status = 'available'
    RETURNING id, table_number, status
  `, [id]);
  
  if (result.rows.length === 0) {
    return res.status(400).json({ success: false, error: 'Table not available for reservation' });
  }
  
  res.json({ success: true, data: result.rows[0], message: 'Table reserved successfully' });
});