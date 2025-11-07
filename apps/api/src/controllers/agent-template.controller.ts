// =====================================================
// AGENT TEMPLATE CONTROLLER
// =====================================================

import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as service from '../services/agent-template.service';
import { CreateAgentTemplateInput, UpdateAgentTemplateInput } from '@pravado/types';
import { z } from 'zod';

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const executeAgentSchema = z.object({
  templateId: z.string().uuid().optional(),
  agentName: z.string().min(1),
  inputData: z.record(z.any()),
  contextData: z.record(z.any()).optional(),
});

// =====================================================
// TEMPLATES
// =====================================================

export async function createTemplate(req: AuthRequest, res: Response) {
  try {
    const template = await service.createAgentTemplate(req.body as CreateAgentTemplateInput, req.user!.id);
    res.status(201).json(template);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

export async function listTemplates(req: AuthRequest, res: Response) {
  try {
    const { category } = req.query;
    const templates = await service.listAgentTemplates(
      req.user!.organizationId,
      category as string | undefined
    );
    res.json(templates);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getTemplate(req: AuthRequest, res: Response) {
  try {
    const template = await service.getAgentTemplate(req.params.id, req.user!.organizationId);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json(template);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function updateTemplate(req: AuthRequest, res: Response) {
  try {
    const template = await service.updateAgentTemplate(
      req.params.id,
      req.body as UpdateAgentTemplateInput,
      req.user!.organizationId,
      req.user!.id
    );
    res.json(template);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

export async function deleteTemplate(req: AuthRequest, res: Response) {
  try {
    await service.deleteAgentTemplate(req.params.id, req.user!.organizationId);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// =====================================================
// EXECUTIONS
// =====================================================

export async function executeAgent(req: AuthRequest, res: Response) {
  try {
    const { templateId, agentName, inputData, contextData } = executeAgentSchema.parse(req.body);

    // Create execution record
    const execution = await service.createAgentExecution(
      {
        templateId,
        agentName,
        inputData,
        contextData,
        organizationId: req.user!.organizationId,
      },
      req.user!.id
    );

    // Note: Queue integration will be added via agent queue
    // For now, return the execution record in PENDING status

    res.status(202).json({ execution, message: 'Agent execution created (queue integration pending)' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

export async function listExecutions(req: AuthRequest, res: Response) {
  try {
    const { templateId, status, limit } = req.query;

    const executions = await service.listAgentExecutions(req.user!.organizationId, {
      templateId: templateId as string | undefined,
      status: status as any,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json(executions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getExecution(req: AuthRequest, res: Response) {
  try {
    const execution = await service.getAgentExecution(req.params.id, req.user!.organizationId);
    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    // Get results for this execution
    const results = await service.listAgentExecutionResults(execution.id, req.user!.organizationId);

    res.json({ execution, results });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getExecutionResults(req: AuthRequest, res: Response) {
  try {
    const results = await service.listAgentExecutionResults(req.params.id, req.user!.organizationId);
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// =====================================================
// STATISTICS
// =====================================================

export async function getStats(req: AuthRequest, res: Response) {
  try {
    const stats = await service.getAgentStats(req.user!.organizationId);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
