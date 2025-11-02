// =====================================================
// REPORTING CONTROLLER
// Sprint 29: AI-driven reporting and strategic insights
// =====================================================

import { Request, Response } from 'express';
import { reportEngine } from '../../../agents/src/reporting/report-engine';
import { createClient } from '@supabase/supabase-js';
import type {
  GenerateReportInput,
  CreateReportTemplateInput,
  UpdateReportTemplateInput,
  GenerateSummaryInput,
} from '@pravado/shared-types';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// =====================================================
// REPORT GENERATION ENDPOINTS
// =====================================================

/**
 * Generate new report
 * POST /api/v1/reporting/campaign/:campaignId/generate-report
 */
export async function generateReport(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const organizationId = req.user?.organization_id;
    const { campaignId } = req.params;
    const { templateId, periodStart, periodEnd } = req.body;

    if (!userId || !organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: GenerateReportInput = {
      campaignId,
      organizationId,
      reportType: 'CAMPAIGN',
      templateId,
      periodStart,
      periodEnd,
      requestedBy: userId,
    };

    // Start async generation
    reportEngine
      .generateCampaignReport(input)
      .catch((error) => console.error('Background report generation error:', error));

    // Return immediately with pending status
    res.json({
      success: true,
      message: 'Report generation started',
      status: 'PENDING',
    });
  } catch (error: any) {
    console.error('Generate report error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate report' });
  }
}

/**
 * Get latest report for a campaign
 * GET /api/v1/reporting/campaign/:campaignId/report
 */
export async function getLatestReport(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { campaignId } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const report = await reportEngine.getLatestCampaignReport(campaignId, organizationId);

    if (!report) {
      return res.status(404).json({ error: 'No report found for this campaign' });
    }

    res.json({ success: true, report });
  } catch (error: any) {
    console.error('Get latest report error:', error);
    res.status(500).json({ error: error.message || 'Failed to get report' });
  }
}

/**
 * Get specific report by ID
 * GET /api/v1/reporting/campaign/:campaignId/report/:reportId
 */
export async function getReport(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { reportId } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const report = await reportEngine.getReport(reportId, organizationId);

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({ success: true, report });
  } catch (error: any) {
    console.error('Get report error:', error);
    res.status(500).json({ error: error.message || 'Failed to get report' });
  }
}

/**
 * Generate GPT summary only (quick summary without full report)
 * POST /api/v1/reporting/campaign/:campaignId/summary
 */
export async function generateSummary(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { campaignId } = req.params;
    const { periodStart, periodEnd, includeRecommendations } = req.body;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: GenerateSummaryInput = {
      campaignId,
      organizationId,
      periodStart,
      periodEnd,
      includeRecommendations,
    };

    // Get metrics and generate quick summary
    const metrics = await (reportEngine as any).getMetricsSnapshot(
      campaignId,
      organizationId,
      periodStart,
      periodEnd
    );

    const summary = await reportEngine.summarizePerformanceTrends(metrics, {
      campaignId,
      organizationId,
      reportType: 'CAMPAIGN',
    });

    res.json({ success: true, summary });
  } catch (error: any) {
    console.error('Generate summary error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate summary' });
  }
}

/**
 * Get report sections
 * GET /api/v1/reporting/report/:reportId/sections
 */
export async function getReportSections(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { reportId } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const report = await reportEngine.getReport(reportId, organizationId);

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({ success: true, sections: report.sections, total: report.sections.length });
  } catch (error: any) {
    console.error('Get report sections error:', error);
    res.status(500).json({ error: error.message || 'Failed to get report sections' });
  }
}

/**
 * Retry failed report
 * POST /api/v1/reporting/report/:reportId/retry
 */
export async function retryReport(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { reportId } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    // Start async retry
    reportEngine
      .retryReport(reportId, organizationId)
      .catch((error) => console.error('Retry report error:', error));

    res.json({ success: true, message: 'Report retry started' });
  } catch (error: any) {
    console.error('Retry report error:', error);
    res.status(500).json({ error: error.message || 'Failed to retry report' });
  }
}

// =====================================================
// TEMPLATE ENDPOINTS
// =====================================================

/**
 * Get available report templates
 * GET /api/v1/reporting/templates
 */
export async function getTemplates(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const { data, error } = await supabase
      .from('report_templates')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get templates: ${error.message}`);
    }

    const templates = (data || []).map((d) => ({
      id: d.id,
      organizationId: d.organization_id,
      name: d.name,
      description: d.description,
      reportType: d.report_type,
      sections: d.sections,
      metricsConfig: d.metrics_config,
      gptPromptTemplate: d.gpt_prompt_template,
      includeRecommendations: d.include_recommendations,
      includeStrategicInsights: d.include_strategic_insights,
      isDefault: d.is_default,
      isActive: d.is_active,
      createdBy: d.created_by,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    }));

    res.json({ success: true, templates, total: templates.length });
  } catch (error: any) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: error.message || 'Failed to get templates' });
  }
}

/**
 * Create report template
 * POST /api/v1/reporting/template
 */
export async function createTemplate(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const organizationId = req.user?.organization_id;

    if (!userId || !organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: CreateReportTemplateInput = {
      ...req.body,
      organizationId,
      createdBy: userId,
    };

    const { data, error } = await supabase
      .from('report_templates')
      .insert({
        organization_id: input.organizationId,
        name: input.name,
        description: input.description,
        report_type: input.reportType,
        sections: input.sections,
        metrics_config: input.metricsConfig,
        gpt_prompt_template: input.gptPromptTemplate,
        include_recommendations: input.includeRecommendations ?? true,
        include_strategic_insights: input.includeStrategicInsights ?? true,
        is_default: input.isDefault ?? false,
        created_by: input.createdBy,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create template: ${error.message}`);
    }

    res.json({ success: true, template: data });
  } catch (error: any) {
    console.error('Create template error:', error);
    res.status(500).json({ error: error.message || 'Failed to create template' });
  }
}

/**
 * Update report template
 * PUT /api/v1/reporting/template/:templateId
 */
export async function updateTemplate(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { templateId } = req.params;
    const input: UpdateReportTemplateInput = req.body;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const updateData: any = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.sections !== undefined) updateData.sections = input.sections;
    if (input.metricsConfig !== undefined) updateData.metrics_config = input.metricsConfig;
    if (input.gptPromptTemplate !== undefined)
      updateData.gpt_prompt_template = input.gptPromptTemplate;
    if (input.includeRecommendations !== undefined)
      updateData.include_recommendations = input.includeRecommendations;
    if (input.includeStrategicInsights !== undefined)
      updateData.include_strategic_insights = input.includeStrategicInsights;
    if (input.isActive !== undefined) updateData.is_active = input.isActive;

    const { data, error } = await supabase
      .from('report_templates')
      .update(updateData)
      .eq('id', templateId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update template: ${error.message}`);
    }

    res.json({ success: true, template: data });
  } catch (error: any) {
    console.error('Update template error:', error);
    res.status(500).json({ error: error.message || 'Failed to update template' });
  }
}

/**
 * Delete report template
 * DELETE /api/v1/reporting/template/:templateId
 */
export async function deleteTemplate(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { templateId } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    // Soft delete by marking as inactive
    const { error } = await supabase
      .from('report_templates')
      .update({ is_active: false })
      .eq('id', templateId)
      .eq('organization_id', organizationId);

    if (error) {
      throw new Error(`Failed to delete template: ${error.message}`);
    }

    res.json({ success: true, message: 'Template deleted successfully' });
  } catch (error: any) {
    console.error('Delete template error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete template' });
  }
}
