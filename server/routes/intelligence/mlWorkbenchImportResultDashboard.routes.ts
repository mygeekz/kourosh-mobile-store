import type { Express } from 'express';
import {
  buildMlWorkbenchImportResultDashboard,
  buildMlWorkbenchImportResultDashboardContract,
} from '../../intelligence/mlWorkbenchImport/candidateEvaluationMetadataImportResultDashboard.service';
import {
  buildMlWorkbenchImportResultDetail,
  buildMlWorkbenchImportResultDetailContract,
} from '../../intelligence/mlWorkbenchImport/candidateEvaluationMetadataImportResultDetail.service';
import {
  buildMlWorkbenchImportOfflineMetricsComparison,
  buildMlWorkbenchImportOfflineMetricsComparisonContract,
} from '../../intelligence/mlWorkbenchImport/candidateEvaluationMetadataImportResultOfflineMetricsComparison.service';
import {
  buildMlWorkbenchImportTrendRegressionSummary,
  buildMlWorkbenchImportTrendRegressionSummaryContract,
} from '../../intelligence/mlWorkbenchImport/candidateEvaluationMetadataImportResultTrendRegression.service';
import {
  buildMlWorkbenchImportAnnotationSearchContract,
  searchMlWorkbenchImportReviewAnnotations,
} from '../../intelligence/mlWorkbenchImport/candidateEvaluationMetadataImportResultAnnotationSearch.service';
import {
  applyMlWorkbenchImportAnnotationSavedView,
  buildMlWorkbenchImportAnnotationSavedViewsContract,
  listMlWorkbenchImportAnnotationSavedViews,
} from '../../intelligence/mlWorkbenchImport/candidateEvaluationMetadataImportResultAnnotationSavedViews.service';
import {
  buildMlWorkbenchImportAnnotationSavedViewUsageSummary,
  buildMlWorkbenchImportAnnotationSavedViewUsageSummaryContract,
} from '../../intelligence/mlWorkbenchImport/candidateEvaluationMetadataImportResultAnnotationSavedViewUsageSummary.service';
import {
  buildMlWorkbenchImportReviewAnnotationsContract,
  getLatestMlWorkbenchImportReviewAnnotation,
  getMlWorkbenchImportReviewAnnotationSummary,
  getMlWorkbenchImportReviewAnnotationsByCandidatePackageId,
  listMlWorkbenchImportReviewAnnotations,
  recordMlWorkbenchImportReviewAnnotation,
} from '../../intelligence/mlWorkbenchImport/candidateEvaluationMetadataImportResultAnnotations.service';
import {
  getLatestMlWorkbenchMetadataImportResult,
  getMlWorkbenchMetadataImportResultByCandidatePackageId,
  getMlWorkbenchMetadataImportResultById,
  getMlWorkbenchMetadataImportResultSummary,
  listMlWorkbenchMetadataImportResults,
  recordMlWorkbenchMetadataImportResult,
} from '../../intelligence/mlWorkbenchImport/candidateEvaluationMetadataImportResultPersistence.service';
import {
  buildMlMetadataToShadowReadinessBridge,
  buildMlMetadataToShadowReadinessBridgeContract,
} from '../../intelligence/mlWorkbenchImport/candidateEvaluationMetadataToShadowReadinessBridge.service';
import type { IntelligenceRouteDeps } from './types';

const readUserId = (req: unknown): number | null => {
  const user = (req as { user?: { id?: unknown } }).user;
  const id = Number(user?.id);
  return Number.isFinite(id) && id > 0 ? id : null;
};

export const registerMlWorkbenchImportResultDashboardRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.post(
    '/api/brain/ml-workbench-import/metadata-result',
    authorizeRole(['Admin', 'Manager']),
    async (req, res, next) => {
      try {
        const data = await recordMlWorkbenchMetadataImportResult(req.body, readUserId(req));
        res.status(201).json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    '/api/brain/ml-workbench-import/metadata-results/summary',
    authorizeRole(['Admin', 'Manager']),
    async (_req, res, next) => {
      try {
        const data = await getMlWorkbenchMetadataImportResultSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    '/api/brain/ml-workbench-import/metadata-results/latest',
    authorizeRole(['Admin', 'Manager']),
    async (_req, res, next) => {
      try {
        const data = await getLatestMlWorkbenchMetadataImportResult();
        if (!data.result) {
          res.status(404).json({ success: false, message: 'هنوز نتیجه import متادیتا ثبت نشده است.', data });
          return;
        }
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    '/api/brain/ml-workbench-import/metadata-results/by-candidate/:candidatePackageId',
    authorizeRole(['Admin', 'Manager']),
    async (req, res, next) => {
      try {
        const data = await getMlWorkbenchMetadataImportResultByCandidatePackageId(String(req.params.candidatePackageId || ''));
        if (!data.result) {
          res.status(404).json({ success: false, message: 'برای این candidatePackageId نتیجه import متادیتا پیدا نشد.', data });
          return;
        }
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );


  app.get(
    '/api/brain/ml-workbench-import/metadata-results/offline-metrics-comparison/contract',
    authorizeRole(['Admin', 'Manager']),
    async (_req, res, next) => {
      try {
        const data = buildMlWorkbenchImportOfflineMetricsComparisonContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    '/api/brain/ml-workbench-import/metadata-results/offline-metrics-comparison',
    authorizeRole(['Admin', 'Manager']),
    async (req, res, next) => {
      try {
        const data = await buildMlWorkbenchImportOfflineMetricsComparison(req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );


  app.get(
    '/api/brain/ml-workbench-import/metadata-results/trend-regression-summary/contract',
    authorizeRole(['Admin', 'Manager']),
    async (_req, res, next) => {
      try {
        const data = buildMlWorkbenchImportTrendRegressionSummaryContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    '/api/brain/ml-workbench-import/metadata-results/trend-regression-summary',
    authorizeRole(['Admin', 'Manager']),
    async (req, res, next) => {
      try {
        const data = await buildMlWorkbenchImportTrendRegressionSummary(req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );


  app.get(
    '/api/brain/ml-workbench-import/metadata-results/review-annotations/contract',
    authorizeRole(['Admin', 'Manager']),
    async (_req, res, next) => {
      try {
        const data = buildMlWorkbenchImportReviewAnnotationsContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    '/api/brain/ml-workbench-import/metadata-results/review-annotations',
    authorizeRole(['Admin', 'Manager']),
    async (req, res, next) => {
      try {
        const data = await recordMlWorkbenchImportReviewAnnotation(req.body as Record<string, unknown>, readUserId(req));
        res.status(201).json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );





  app.get(
    '/api/brain/ml-workbench-import/metadata-results/review-annotations/saved-views/usage-summary/contract',
    authorizeRole(['Admin', 'Manager']),
    async (_req, res, next) => {
      try {
        const data = buildMlWorkbenchImportAnnotationSavedViewUsageSummaryContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    '/api/brain/ml-workbench-import/metadata-results/review-annotations/saved-views/usage-summary',
    authorizeRole(['Admin', 'Manager']),
    async (_req, res, next) => {
      try {
        const data = await buildMlWorkbenchImportAnnotationSavedViewUsageSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    '/api/brain/ml-workbench-import/metadata-results/review-annotations/saved-views/contract',
    authorizeRole(['Admin', 'Manager']),
    async (_req, res, next) => {
      try {
        const data = buildMlWorkbenchImportAnnotationSavedViewsContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    '/api/brain/ml-workbench-import/metadata-results/review-annotations/saved-views/:presetId/apply',
    authorizeRole(['Admin', 'Manager']),
    async (req, res, next) => {
      try {
        const data = await applyMlWorkbenchImportAnnotationSavedView(req.params.presetId, req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    '/api/brain/ml-workbench-import/metadata-results/review-annotations/saved-views',
    authorizeRole(['Admin', 'Manager']),
    async (_req, res, next) => {
      try {
        const data = await listMlWorkbenchImportAnnotationSavedViews();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    '/api/brain/ml-workbench-import/metadata-results/review-annotations/search/contract',
    authorizeRole(['Admin', 'Manager']),
    async (_req, res, next) => {
      try {
        const data = buildMlWorkbenchImportAnnotationSearchContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    '/api/brain/ml-workbench-import/metadata-results/review-annotations/search',
    authorizeRole(['Admin', 'Manager']),
    async (req, res, next) => {
      try {
        const data = await searchMlWorkbenchImportReviewAnnotations(req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    '/api/brain/ml-workbench-import/metadata-results/review-annotations/summary',
    authorizeRole(['Admin', 'Manager']),
    async (_req, res, next) => {
      try {
        const data = await getMlWorkbenchImportReviewAnnotationSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    '/api/brain/ml-workbench-import/metadata-results/review-annotations/latest',
    authorizeRole(['Admin', 'Manager']),
    async (_req, res, next) => {
      try {
        const data = await getLatestMlWorkbenchImportReviewAnnotation();
        if (!data.annotation) {
          res.status(404).json({ success: false, message: 'هنوز annotation برای نتیجه import متادیتا ثبت نشده است.', data });
          return;
        }
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    '/api/brain/ml-workbench-import/metadata-results/review-annotations/by-candidate/:candidatePackageId',
    authorizeRole(['Admin', 'Manager']),
    async (req, res, next) => {
      try {
        const data = await getMlWorkbenchImportReviewAnnotationsByCandidatePackageId(String(req.params.candidatePackageId || ''), req.query.limit);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    '/api/brain/ml-workbench-import/metadata-results/review-annotations',
    authorizeRole(['Admin', 'Manager']),
    async (req, res, next) => {
      try {
        const data = await listMlWorkbenchImportReviewAnnotations(req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );



  app.get(
    '/api/brain/ml-workbench-import/metadata-results/shadow-readiness-bridge/contract',
    authorizeRole(['Admin', 'Manager']),
    async (_req, res, next) => {
      try {
        const data = buildMlMetadataToShadowReadinessBridgeContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    '/api/brain/ml-workbench-import/metadata-results/shadow-readiness-bridge',
    authorizeRole(['Admin', 'Manager']),
    async (req, res, next) => {
      try {
        const data = await buildMlMetadataToShadowReadinessBridge(req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    '/api/brain/ml-workbench-import/metadata-results/:id',
    authorizeRole(['Admin', 'Manager']),
    async (req, res, next) => {
      try {
        const data = await getMlWorkbenchMetadataImportResultById(req.params.id);
        if (!data.result) {
          res.status(404).json({ success: false, message: 'نتیجه import متادیتا پیدا نشد.', data });
          return;
        }
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    '/api/brain/ml-workbench-import/metadata-results',
    authorizeRole(['Admin', 'Manager']),
    async (req, res, next) => {
      try {
        const data = await listMlWorkbenchMetadataImportResults(req.query.limit);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    '/api/brain/ml-workbench-import/metadata-result-dashboard/contract',
    authorizeRole(['Admin', 'Manager']),
    async (_req, res, next) => {
      try {
        const data = buildMlWorkbenchImportResultDashboardContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    '/api/brain/ml-workbench-import/metadata-result-dashboard',
    authorizeRole(['Admin', 'Manager']),
    async (req, res, next) => {
      try {
        const data = await buildMlWorkbenchImportResultDashboard(req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    '/api/brain/ml-workbench-import/metadata-result-dashboard/detail/contract',
    authorizeRole(['Admin', 'Manager']),
    async (_req, res, next) => {
      try {
        const data = buildMlWorkbenchImportResultDetailContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    '/api/brain/ml-workbench-import/metadata-result-dashboard/detail/:candidatePackageId',
    authorizeRole(['Admin', 'Manager']),
    async (req, res, next) => {
      try {
        const data = await buildMlWorkbenchImportResultDetail(String(req.params.candidatePackageId || ''), req.query as Record<string, unknown>);
        if (!data.detail) {
          res.status(404).json({ success: false, message: 'جزئیات متادیتا برای این candidate پیدا نشد.', data });
          return;
        }
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );
};

/* Phase 12A safety anchors: shadow-readiness-bridge is metadata-only and read-only; createsShadowRuntimeRecord=false; createsShadowObservation=false; no inference, no execute, no train, no deploy, no activate, no business mutation, no governance workflow.
 * Phase 11J safety anchors: saved view usage summary is metadata-only and read-only; storesUserBehavior=false; storesClickEvents=false; no inference, no execute, no train, no deploy, no activate, no business mutation, no governance workflow.
 * Phase 11H safety anchors: annotation search is metadata-only and read-only; no inference, no execute, no train, no deploy, no activate, no business mutation, no governance workflow.
 * Phase 11G safety anchors: review annotations are metadata-only operator notes; no inference, no execute, no train, no deploy, no activate, no business mutation, no governance workflow. */
