import { Router, Response, Request } from 'express';
import { getPool, Database } from '../db';
import { ChartAnalysisDb } from '../db/chartAnalysisDb';
import { authenticateToken, requireRole, requirePermission, AuthRequest } from '../auth';

const router = Router();

// Helper to get active pool
function getDbPool() {
  const pool = getPool();
  if (!pool) {
    throw new Error('Database pool not available');
  }
  return pool;
}

// ====================================================
// 1. PUBLIC ENDPOINTS (Available to all visitors)
// ====================================================

/**
 * GET /api/chart-analyses/public
 * Returns only published analyses, optionally filtered by symbol and interval.
 */
router.get('/public', async (req: Request, res: Response): Promise<void> => {
  try {
    const pool = getDbPool();
    const symbol = typeof req.query.symbol === 'string' ? req.query.symbol : undefined;
    const interval = typeof req.query.interval === 'string' ? req.query.interval : undefined;

    const analyses = await ChartAnalysisDb.getPublishedAnalyses(pool, { symbol, interval });
    res.json({
      success: true,
      count: analyses.length,
      analyses,
    });
  } catch (err: any) {
    console.error('[Chart Analyses] Public query error:', err.message);
    res.status(500).json({ success: false, error: 'Failed retrieving chart analyses' });
  }
});

/**
 * GET /api/chart-analyses/:id
 * Retrieve a single analysis by ID. Public if published, auth required if draft.
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const pool = getDbPool();
    const analysis = await ChartAnalysisDb.getById(pool, req.params.id);
    if (!analysis) {
      res.status(404).json({ success: false, error: 'Analysis not found' });
      return;
    }

    // If draft, check authorization
    if (!analysis.isPublished) {
      // Run optional token extraction
      const authHeader = req.headers['authorization'];
      if (!authHeader) {
        res.status(403).json({ success: false, error: 'Draft analysis requires authorization' });
        return;
      }
    }

    res.json({ success: true, analysis });
  } catch (err: any) {
    console.error('[Chart Analyses] Query by ID error:', err.message);
    res.status(500).json({ success: false, error: 'Failed retrieving analysis' });
  }
});

// ====================================================
// 2. ADMIN ENDPOINTS (Super Admin & Authorized Admin Only)
// ====================================================

// Admin middleware chain
const requireAdminContent = [
  authenticateToken,
  requireRole(['super_admin', 'admin']),
  requirePermission('canManageContent'),
];

/**
 * GET /api/chart-analyses/admin/all
 * List all analyses (drafts and published) for Admin management
 */
router.get('/admin/all', ...requireAdminContent, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pool = getDbPool();
    const symbol = typeof req.query.symbol === 'string' ? req.query.symbol : undefined;
    const status = req.query.status as string | undefined;

    let isPublished: boolean | undefined = undefined;
    if (status === 'published') isPublished = true;
    if (status === 'draft') isPublished = false;

    const analyses = await ChartAnalysisDb.getAllForAdmin(pool, { symbol, isPublished });
    res.json({
      success: true,
      count: analyses.length,
      analyses,
    });
  } catch (err: any) {
    console.error('[Chart Analyses] Admin list error:', err.message);
    res.status(500).json({ success: false, error: 'Failed retrieving analyses for admin' });
  }
});

/**
 * POST /api/chart-analyses
 * Create a new chart analysis (Draft or Published)
 */
router.post('/', ...requireAdminContent, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const {
      symbol,
      interval,
      title,
      bias,
      summary,
      drawings,
      tradeSetup,
      isPublished,
    } = req.body;

    if (!symbol || !symbol.trim()) {
      res.status(400).json({ success: false, error: 'Symbol is required' });
      return;
    }
    if (!interval || !interval.trim()) {
      res.status(400).json({ success: false, error: 'Interval timeframe is required' });
      return;
    }
    if (!title || !title.trim()) {
      res.status(400).json({ success: false, error: 'Title is required' });
      return;
    }

    const pool = getDbPool();
    const analysis = await ChartAnalysisDb.create(pool, {
      symbol: symbol.trim(),
      interval: interval.trim(),
      title: title.trim(),
      bias: bias || 'neutral',
      summary: summary?.trim() || '',
      drawings: Array.isArray(drawings) ? drawings : [],
      tradeSetup: tradeSetup || undefined,
      isPublished: Boolean(isPublished),
      authorId: user.id,
      authorUsername: user.username,
      authorRole: user.role,
    });

    // Log to audit log
    await Database.addAuditLog({
      actorId: user.id,
      actorUsername: user.username,
      actorRole: user.role,
      action: isPublished ? 'publish_chart_analysis' : 'create_chart_analysis',
      targetId: analysis.id,
      targetUsername: undefined,
      details: `${isPublished ? 'Published' : 'Created draft'} chart analysis for ${analysis.symbol} (${analysis.interval}): "${analysis.title}"`,
      metadata: { analysisId: analysis.id, symbol: analysis.symbol, interval: analysis.interval },
    });

    res.status(201).json({
      success: true,
      analysis,
      message: isPublished ? 'Analysis published successfully' : 'Analysis saved as draft',
    });
  } catch (err: any) {
    console.error('[Chart Analyses] Create error:', err.message);
    res.status(500).json({ success: false, error: err.message || 'Failed creating chart analysis' });
  }
});

/**
 * PUT /api/chart-analyses/:id
 * Update an existing chart analysis
 */
router.put('/:id', ...requireAdminContent, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const pool = getDbPool();

    const existing = await ChartAnalysisDb.getById(pool, id);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Analysis not found' });
      return;
    }

    const updated = await ChartAnalysisDb.update(pool, id, req.body);
    if (!updated) {
      res.status(404).json({ success: false, error: 'Failed updating analysis' });
      return;
    }

    await Database.addAuditLog({
      actorId: user.id,
      actorUsername: user.username,
      actorRole: user.role,
      action: 'update_chart_analysis',
      targetId: id,
      targetUsername: undefined,
      details: `Updated chart analysis ${updated.symbol} (${updated.interval}): "${updated.title}"`,
      metadata: { analysisId: id, isPublished: updated.isPublished },
    });

    res.json({
      success: true,
      analysis: updated,
      message: 'Analysis updated successfully',
    });
  } catch (err: any) {
    console.error('[Chart Analyses] Update error:', err.message);
    res.status(500).json({ success: false, error: err.message || 'Failed updating chart analysis' });
  }
});

/**
 * PATCH /api/chart-analyses/:id/publish
 * Toggle publish status between Draft and Live
 */
router.patch('/:id/publish', ...requireAdminContent, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { isPublished } = req.body;

    if (typeof isPublished !== 'boolean') {
      res.status(400).json({ success: false, error: 'isPublished boolean is required' });
      return;
    }

    const pool = getDbPool();
    const updated = await ChartAnalysisDb.update(pool, id, { isPublished });
    if (!updated) {
      res.status(404).json({ success: false, error: 'Analysis not found' });
      return;
    }

    await Database.addAuditLog({
      actorId: user.id,
      actorUsername: user.username,
      actorRole: user.role,
      action: isPublished ? 'publish_chart_analysis' : 'unpublish_chart_analysis',
      targetId: id,
      targetUsername: undefined,
      details: `${isPublished ? 'Published' : 'Unpublished'} analysis ${updated.symbol}: "${updated.title}"`,
      metadata: { analysisId: id, isPublished },
    });

    res.json({
      success: true,
      analysis: updated,
      message: isPublished ? 'Analysis is now LIVE for all visitors' : 'Analysis moved to Drafts',
    });
  } catch (err: any) {
    console.error('[Chart Analyses] Publish toggle error:', err.message);
    res.status(500).json({ success: false, error: err.message || 'Failed toggling publish status' });
  }
});

/**
 * DELETE /api/chart-analyses/:id
 * Delete a chart analysis
 */
router.delete('/:id', ...requireAdminContent, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const pool = getDbPool();

    const existing = await ChartAnalysisDb.getById(pool, id);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Analysis not found' });
      return;
    }

    const deleted = await ChartAnalysisDb.delete(pool, id);
    if (!deleted) {
      res.status(500).json({ success: false, error: 'Failed deleting analysis' });
      return;
    }

    await Database.addAuditLog({
      actorId: user.id,
      actorUsername: user.username,
      actorRole: user.role,
      action: 'delete_chart_analysis',
      targetId: id,
      targetUsername: undefined,
      details: `Deleted chart analysis for ${existing.symbol} (${existing.interval}): "${existing.title}"`,
      metadata: { analysisId: id, symbol: existing.symbol },
    });

    res.json({
      success: true,
      message: 'Analysis deleted successfully',
    });
  } catch (err: any) {
    console.error('[Chart Analyses] Delete error:', err.message);
    res.status(500).json({ success: false, error: err.message || 'Failed deleting analysis' });
  }
});

export default router;
