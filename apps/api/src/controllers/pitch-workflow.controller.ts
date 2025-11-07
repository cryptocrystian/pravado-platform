// =====================================================
// PITCH WORKFLOW CONTROLLER
// =====================================================

import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as service from '../services/pitch-workflow.service';
import { CreatePitchWorkflowInput, UpdatePitchWorkflowInput, PitchWorkflowStatus } from '@pravado/types';

// =====================================================
// WORKFLOWS
// =====================================================

export async function createWorkflow(req: AuthRequest, res: Response) {
  try {
    const workflow = await service.createPitchWorkflow(
      req.body as CreatePitchWorkflowInput,
      req.user!.id
    );
    res.status(201).json(workflow);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

export async function listWorkflows(req: AuthRequest, res: Response) {
  try {
    const { status } = req.query;
    const workflows = await service.listPitchWorkflows(
      req.user!.organizationId,
      status as PitchWorkflowStatus | undefined
    );
    res.json(workflows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getWorkflow(req: AuthRequest, res: Response) {
  try {
    const workflow = await service.getPitchWorkflow(req.params.id, req.user!.organizationId);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    res.json(workflow);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function updateWorkflow(req: AuthRequest, res: Response) {
  try {
    const workflow = await service.updatePitchWorkflow(
      req.params.id,
      req.body as UpdatePitchWorkflowInput,
      req.user!.organizationId,
      req.user!.id
    );
    res.json(workflow);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

export async function deleteWorkflow(req: AuthRequest, res: Response) {
  try {
    await service.deletePitchWorkflow(req.params.id, req.user!.organizationId);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getWorkflowStats(req: AuthRequest, res: Response) {
  try {
    const stats = await service.getPitchWorkflowStats(req.params.id, req.user!.organizationId);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// =====================================================
// JOBS
// =====================================================

export async function listJobs(req: AuthRequest, res: Response) {
  try {
    const { status } = req.query;
    const jobs = await service.listPitchJobs(
      req.params.workflowId,
      req.user!.organizationId,
      status as any
    );
    res.json(jobs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getJob(req: AuthRequest, res: Response) {
  try {
    const job = await service.getPitchJob(req.params.id, req.user!.organizationId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json(job);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// =====================================================
// EVENTS
// =====================================================

export async function listEvents(req: AuthRequest, res: Response) {
  try {
    const events = await service.listPitchEvents(req.params.workflowId, req.user!.organizationId);
    res.json(events);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// =====================================================
// WORKFLOW ACTIONS
// =====================================================

export async function startWorkflow(req: AuthRequest, res: Response) {
  try {
    const workflow = await service.updatePitchWorkflow(
      req.params.id,
      { status: 'RUNNING' as PitchWorkflowStatus },
      req.user!.organizationId,
      req.user!.id
    );
    res.json(workflow);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

export async function pauseWorkflow(req: AuthRequest, res: Response) {
  try {
    const workflow = await service.updatePitchWorkflow(
      req.params.id,
      { status: 'PAUSED' as PitchWorkflowStatus },
      req.user!.organizationId,
      req.user!.id
    );
    res.json(workflow);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

export async function cancelWorkflow(req: AuthRequest, res: Response) {
  try {
    const workflow = await service.updatePitchWorkflow(
      req.params.id,
      { status: 'CANCELLED' as PitchWorkflowStatus },
      req.user!.organizationId,
      req.user!.id
    );
    res.json(workflow);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}
