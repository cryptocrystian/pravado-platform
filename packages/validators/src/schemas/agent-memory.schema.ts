// =====================================================
// AGENT MEMORY ZOD VALIDATION SCHEMAS
// =====================================================

import { z } from 'zod';
import { MemoryType } from '@pravado/types';

// =====================================================
// ENUMS
// =====================================================

export const MemoryTypeSchema = z.nativeEnum(MemoryType);

// =====================================================
// BASE SCHEMAS
// =====================================================

export const AgentMemorySchema = z.object({
  id: z.string().uuid(),
  agentId: z.string().min(1, 'Agent ID is required'),
  memoryType: MemoryTypeSchema,
  content: z.string().min(1, 'Content is required'),
  contentEmbedding: z.array(z.number()).length(1536).nullable(),

  // Context
  agentExecutionId: z.string().uuid().nullable(),
  relatedContactId: z.string().uuid().nullable(),
  relatedCampaignId: z.string().uuid().nullable(),

  // Metadata
  importanceScore: z.number().min(0).max(1),
  contextTags: z.array(z.string()),

  // Temporal
  createdAt: z.date(),
  expiresAt: z.date().nullable(),

  // Multi-tenancy
  organizationId: z.string().uuid(),

  // Optional search result field
  similarity: z.number().min(0).max(1).optional(),
});

export const CreateAgentMemoryInputSchema = z.object({
  agentId: z.string().min(1, 'Agent ID is required'),
  memoryType: MemoryTypeSchema,
  content: z.string().min(1, 'Content is required').max(10000, 'Content too long'),
  contentEmbedding: z.array(z.number()).length(1536).optional(),
  organizationId: z.string().uuid(),

  // Optional context
  agentExecutionId: z.string().uuid().optional(),
  relatedContactId: z.string().uuid().optional(),
  relatedCampaignId: z.string().uuid().optional(),

  // Optional metadata
  importanceScore: z.number().min(0).max(1).default(0.5),
  contextTags: z.array(z.string()).default([]),
  expiresAt: z.date().optional(),
});

export const AgentMemorySearchParamsSchema = z.object({
  agentId: z.string().min(1, 'Agent ID is required'),
  organizationId: z.string().uuid(),
  tags: z.array(z.string()).optional(),
  queryEmbedding: z.array(z.number()).length(1536).optional(),
  topK: z.number().int().min(1).max(100).default(10),
  similarityThreshold: z.number().min(0).max(1).default(0.7),
  minImportance: z.number().min(0).max(1).default(0.3),
  memoryTypes: z.array(MemoryTypeSchema).optional(),
});

export const AgentMemorySnapshotSchema = z.object({
  id: z.string().uuid(),
  agentId: z.string().min(1),
  snapshotText: z.string().min(1),

  // Time window
  startTime: z.date(),
  endTime: z.date(),

  // Metadata
  memoryCount: z.number().int().min(0),
  contextTags: z.array(z.string()),
  avgImportance: z.number().min(0).max(1).nullable(),

  // Temporal
  createdAt: z.date(),

  // Multi-tenancy
  organizationId: z.string().uuid(),
}).refine((data) => data.endTime > data.startTime, {
  message: 'End time must be after start time',
  path: ['endTime'],
});

export const CreateMemorySnapshotInputSchema = z.object({
  agentId: z.string().min(1, 'Agent ID is required'),
  snapshotText: z.string().min(1, 'Snapshot text is required').max(50000, 'Snapshot text too long'),
  startTime: z.date(),
  endTime: z.date(),
  organizationId: z.string().uuid(),
}).refine((data) => data.endTime > data.startTime, {
  message: 'End time must be after start time',
  path: ['endTime'],
});

export const GenerateSnapshotParamsSchema = z.object({
  agentId: z.string().min(1, 'Agent ID is required'),
  organizationId: z.string().uuid(),
  startTime: z.date(),
  endTime: z.date(),
  tags: z.array(z.string()).optional(),
}).refine((data) => data.endTime > data.startTime, {
  message: 'End time must be after start time',
  path: ['endTime'],
});

export const PruneMemoriesParamsSchema = z.object({
  agentId: z.string().min(1, 'Agent ID is required'),
  organizationId: z.string().uuid(),
  olderThanDays: z.number().int().min(1).max(365).default(90),
  maxImportance: z.number().min(0).max(1).default(0.3),
});

export const MemoryStatsSchema = z.object({
  totalMemories: z.number().int().min(0),
  memoriesByType: z.record(MemoryTypeSchema, z.number().int().min(0)),
  avgImportance: z.number().min(0).max(1),
  oldestMemory: z.date().nullable(),
  newestMemory: z.date().nullable(),
  totalSnapshots: z.number().int().min(0),
});

export const ImportanceScoringConfigSchema = z.object({
  baseSentimentWeight: z.number().min(0).max(1).default(0.3),
  entityCountWeight: z.number().min(0).max(1).default(0.25),
  taskSuccessWeight: z.number().min(0).max(1).default(0.35),
  recencyDecay: z.number().min(0).max(1).default(0.1),
});
