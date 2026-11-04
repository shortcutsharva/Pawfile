import { Router } from 'express';
import type { AppConfig } from '../env';
import type { Db } from '../db';
import { requireDashboardSession } from '../auth';
import {
  getCaseDetail,
  getSummary,
  listActivity,
  listCases,
  listContacts,
  listDocuments,
  listHearings,
} from '../services/dashboardQueries';

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function number(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function dashboardRouter({ db, config }: { db: Db; config: AppConfig }): Router {
  const router = Router();
  router.use('/api/dashboard', requireDashboardSession(config.sharedSecret));
  router.use('/api/dashboard', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  router.get('/api/dashboard/summary', (_req, res) => {
    res.json(getSummary(db, config.sharedSecret));
  });

  router.get('/api/dashboard/cases', (req, res) => {
    res.json(
      listCases(db, {
        search: text(req.query.search),
        status: text(req.query.status),
        urgency: text(req.query.urgency),
        rescueStatus: text(req.query.rescueStatus),
        legalStatus: text(req.query.legalStatus),
        page: number(req.query.page),
        pageSize: number(req.query.pageSize),
      }),
    );
  });

  router.get('/api/dashboard/cases/:caseId', (req, res) => {
    const detail = getCaseDetail(db, req.params.caseId, config.sharedSecret);
    if (!detail) {
      res.status(404).json({ error: 'Case not found' });
      return;
    }
    res.json(detail);
  });

  router.get('/api/dashboard/contacts', (req, res) => {
    res.json({
      items: listContacts(db, {
        search: text(req.query.search),
        type: text(req.query.type),
        state: text(req.query.state),
      }),
    });
  });

  router.get('/api/dashboard/hearings', (req, res) => {
    res.json({
      items: listHearings(db, {
        from: text(req.query.from),
        to: text(req.query.to),
        status: text(req.query.status),
      }),
    });
  });

  router.get('/api/dashboard/documents', (req, res) => {
    res.json({
      items: listDocuments(
        db,
        {
          caseId: text(req.query.caseId),
          category: text(req.query.category),
        },
        config.sharedSecret,
      ),
    });
  });

  router.get('/api/dashboard/activity', (req, res) => {
    res.json(
      listActivity(db, {
        page: number(req.query.page),
        pageSize: number(req.query.pageSize),
      }),
    );
  });

  return router;
}
