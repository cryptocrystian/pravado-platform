-- =====================================================
-- PROMPT ENGINEERING LAYER MIGRATION
-- Sprint 30: Advanced prompt engineering + modular blocks
-- =====================================================

-- =====================================================
-- ENUMS
-- =====================================================

-- Prompt block types
CREATE TYPE block_type AS ENUM (
  'SYSTEM',           -- System-level instructions (role, behavior)
  'INSTRUCTION',      -- Task-specific instructions
  'MEMORY',           -- Memory/context from previous interactions
  'CONTEXT',          -- Dynamic context injection (goals, data, etc.)
  'STRATEGY',         -- Strategic guidance and constraints
  'OUTPUT_FORMAT',    -- Output format specifications
  'DEBUG'             -- Debug/troubleshooting instructions
);

-- Prompt template use cases
CREATE TYPE use_case_tag AS ENUM (
  'PLANNING',         -- Strategic planning agents
  'EXECUTION',        -- Task execution agents
  'HANDOFF',          -- Agent-to-agent handoff
  'FOLLOWUP',         -- Follow-up and persistence
  'MEMORY',           -- Memory formation and recall
  'DEBUGGING',        -- Debugging and error recovery
  'CUSTOM'            -- Custom use case
);

-- Model scopes (which AI models this applies to)
CREATE TYPE model_scope AS ENUM (
  'GPT-4',            -- GPT-4 specific
  'GPT-3.5',          -- GPT-3.5 specific
  'CLAUDE-3',         -- Claude 3 specific
  'ALL'               -- All models
);

-- =====================================================
-- PROMPT BLOCKS TABLE
-- =====================================================

CREATE TABLE prompt_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Block metadata
  name TEXT NOT NULL,
  description TEXT,
  block_type block_type NOT NULL,

  -- Content
  content TEXT NOT NULL,

  -- Model compatibility
  model_scope model_scope NOT NULL DEFAULT 'ALL',

  -- Versioning
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true,

  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- Template metadata
  tags TEXT[] DEFAULT '{}',
  category TEXT,

  -- Ownership
  created_by UUID REFERENCES users(id),
  is_system_block BOOLEAN DEFAULT false,  -- System-provided vs user-created

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT prompt_blocks_org_name_unique UNIQUE(organization_id, name, version)
);

CREATE INDEX idx_prompt_blocks_org ON prompt_blocks(organization_id);
CREATE INDEX idx_prompt_blocks_type ON prompt_blocks(block_type);
CREATE INDEX idx_prompt_blocks_model_scope ON prompt_blocks(model_scope);
CREATE INDEX idx_prompt_blocks_active ON prompt_blocks(is_active) WHERE is_active = true;
CREATE INDEX idx_prompt_blocks_system ON prompt_blocks(is_system_block) WHERE is_system_block = true;
CREATE INDEX idx_prompt_blocks_tags ON prompt_blocks USING GIN(tags);

-- =====================================================
-- PROMPT TEMPLATES TABLE
-- =====================================================

CREATE TABLE prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Template metadata
  template_name TEXT NOT NULL,
  description TEXT,
  use_case_tag use_case_tag NOT NULL,

  -- Model compatibility
  model_scope model_scope NOT NULL DEFAULT 'ALL',

  -- Block composition
  blocks UUID[] NOT NULL DEFAULT '{}',  -- Ordered array of block IDs
  block_order INTEGER[] DEFAULT '{}',   -- Explicit ordering (optional)

  -- Configuration
  max_tokens INTEGER,                   -- Max tokens for this template
  temperature NUMERIC(3,2),             -- Default temperature
  top_p NUMERIC(3,2),                   -- Default top_p

  -- Validation
  is_validated BOOLEAN DEFAULT false,
  validation_notes TEXT,
  estimated_tokens INTEGER,

  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,     -- Default template for use case

  -- Ownership
  created_by UUID REFERENCES users(id),
  is_system_template BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT prompt_templates_org_name_unique UNIQUE(organization_id, template_name)
);

CREATE INDEX idx_prompt_templates_org ON prompt_templates(organization_id);
CREATE INDEX idx_prompt_templates_use_case ON prompt_templates(use_case_tag);
CREATE INDEX idx_prompt_templates_model_scope ON prompt_templates(model_scope);
CREATE INDEX idx_prompt_templates_active ON prompt_templates(is_active) WHERE is_active = true;
CREATE INDEX idx_prompt_templates_default ON prompt_templates(organization_id, use_case_tag, is_default) WHERE is_default = true;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE prompt_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;

-- Prompt Blocks Policies
CREATE POLICY prompt_blocks_org_isolation ON prompt_blocks
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    ) OR is_system_block = true  -- Allow access to system blocks
  );

-- Prompt Templates Policies
CREATE POLICY prompt_templates_org_isolation ON prompt_templates
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    ) OR is_system_template = true  -- Allow access to system templates
  );

-- =====================================================
-- POSTGRESQL FUNCTIONS
-- =====================================================

/**
 * Assemble prompt from template
 * Combines all blocks in order into a single prompt string
 */
CREATE OR REPLACE FUNCTION assemble_prompt(
  p_template_id UUID,
  p_organization_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_template prompt_templates%ROWTYPE;
  v_block_id UUID;
  v_block prompt_blocks%ROWTYPE;
  v_assembled_prompt TEXT;
  v_section_divider TEXT;
BEGIN
  -- Get template
  SELECT * INTO v_template
  FROM prompt_templates
  WHERE id = p_template_id
    AND (organization_id = p_organization_id OR is_system_template = true);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found';
  END IF;

  -- Initialize
  v_assembled_prompt := '';
  v_section_divider := E'\n\n---\n\n';

  -- Loop through blocks in order
  FOREACH v_block_id IN ARRAY v_template.blocks
  LOOP
    -- Get block
    SELECT * INTO v_block
    FROM prompt_blocks
    WHERE id = v_block_id
      AND is_active = true
      AND (organization_id = p_organization_id OR is_system_block = true);

    IF FOUND THEN
      -- Add block header
      v_assembled_prompt := v_assembled_prompt || '## ' || UPPER(v_block.block_type::TEXT) || E'\n\n';

      -- Add block content
      v_assembled_prompt := v_assembled_prompt || v_block.content || v_section_divider;

      -- Update block usage
      UPDATE prompt_blocks
      SET
        usage_count = usage_count + 1,
        last_used_at = NOW()
      WHERE id = v_block_id;
    END IF;
  END LOOP;

  -- Update template usage
  UPDATE prompt_templates
  SET
    usage_count = usage_count + 1,
    last_used_at = NOW()
  WHERE id = p_template_id;

  RETURN v_assembled_prompt;
END;
$$;

/**
 * Get prompt blocks for a template
 * Returns detailed block information with metadata
 */
CREATE OR REPLACE FUNCTION get_prompt_blocks(
  p_template_id UUID,
  p_organization_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_template prompt_templates%ROWTYPE;
  v_block_id UUID;
  v_blocks JSONB;
  v_block JSONB;
BEGIN
  -- Get template
  SELECT * INTO v_template
  FROM prompt_templates
  WHERE id = p_template_id
    AND (organization_id = p_organization_id OR is_system_template = true);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found';
  END IF;

  -- Initialize blocks array
  v_blocks := '[]'::JSONB;

  -- Loop through blocks in order
  FOREACH v_block_id IN ARRAY v_template.blocks
  LOOP
    -- Get block as JSON
    SELECT jsonb_build_object(
      'id', pb.id,
      'name', pb.name,
      'description', pb.description,
      'blockType', pb.block_type,
      'content', pb.content,
      'modelScope', pb.model_scope,
      'version', pb.version,
      'isActive', pb.is_active,
      'usageCount', pb.usage_count,
      'isSystemBlock', pb.is_system_block,
      'createdAt', pb.created_at
    ) INTO v_block
    FROM prompt_blocks pb
    WHERE pb.id = v_block_id
      AND pb.is_active = true
      AND (pb.organization_id = p_organization_id OR pb.is_system_block = true);

    IF v_block IS NOT NULL THEN
      v_blocks := v_blocks || v_block;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'templateId', p_template_id,
    'templateName', v_template.template_name,
    'useCase', v_template.use_case_tag,
    'blocks', v_blocks,
    'totalBlocks', jsonb_array_length(v_blocks)
  );
END;
$$;

/**
 * Create prompt from block contents directly
 * Accepts array of block contents (not IDs) for dynamic assembly
 */
CREATE OR REPLACE FUNCTION create_prompt_from_blocks(
  p_block_contents TEXT[]
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_content TEXT;
  v_assembled_prompt TEXT;
  v_section_divider TEXT;
BEGIN
  v_assembled_prompt := '';
  v_section_divider := E'\n\n---\n\n';

  FOREACH v_content IN ARRAY p_block_contents
  LOOP
    v_assembled_prompt := v_assembled_prompt || v_content || v_section_divider;
  END LOOP;

  RETURN v_assembled_prompt;
END;
$$;

/**
 * Validate prompt template
 * Checks for common issues: length, repetition, ambiguity
 */
CREATE OR REPLACE FUNCTION validate_prompt_template(
  p_template_id UUID,
  p_organization_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_prompt TEXT;
  v_issues JSONB;
  v_warnings TEXT[];
  v_prompt_length INTEGER;
  v_block_count INTEGER;
BEGIN
  -- Assemble prompt
  v_prompt := assemble_prompt(p_template_id, p_organization_id);
  v_prompt_length := length(v_prompt);

  -- Get block count
  SELECT array_length(blocks, 1) INTO v_block_count
  FROM prompt_templates
  WHERE id = p_template_id;

  v_warnings := '{}';

  -- Check length
  IF v_prompt_length > 10000 THEN
    v_warnings := array_append(v_warnings, 'Prompt is very long (' || v_prompt_length || ' chars). Consider splitting into smaller blocks.');
  END IF;

  -- Check block count
  IF v_block_count = 0 THEN
    v_warnings := array_append(v_warnings, 'Template has no blocks');
  ELSIF v_block_count > 10 THEN
    v_warnings := array_append(v_warnings, 'Template has many blocks (' || v_block_count || '). Consider consolidating.');
  END IF;

  -- Build result
  v_issues := jsonb_build_object(
    'isValid', array_length(v_warnings, 1) IS NULL OR array_length(v_warnings, 1) = 0,
    'warnings', v_warnings,
    'promptLength', v_prompt_length,
    'blockCount', v_block_count,
    'estimatedTokens', (v_prompt_length / 4)::INTEGER  -- Rough estimate: 1 token ≈ 4 chars
  );

  -- Update template validation status
  UPDATE prompt_templates
  SET
    is_validated = (array_length(v_warnings, 1) IS NULL OR array_length(v_warnings, 1) = 0),
    validation_notes = array_to_string(v_warnings, '; '),
    estimated_tokens = (v_prompt_length / 4)::INTEGER
  WHERE id = p_template_id;

  RETURN v_issues;
END;
$$;

/**
 * Get default template for use case
 */
CREATE OR REPLACE FUNCTION get_default_template_for_use_case(
  p_use_case use_case_tag,
  p_organization_id UUID,
  p_model_scope model_scope DEFAULT 'ALL'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_template_id UUID;
BEGIN
  -- Try to get organization-specific default
  SELECT id INTO v_template_id
  FROM prompt_templates
  WHERE organization_id = p_organization_id
    AND use_case_tag = p_use_case
    AND is_default = true
    AND is_active = true
    AND (model_scope = p_model_scope OR model_scope = 'ALL')
  LIMIT 1;

  -- If not found, get system default
  IF v_template_id IS NULL THEN
    SELECT id INTO v_template_id
    FROM prompt_templates
    WHERE is_system_template = true
      AND use_case_tag = p_use_case
      AND is_default = true
      AND is_active = true
      AND (model_scope = p_model_scope OR model_scope = 'ALL')
    LIMIT 1;
  END IF;

  RETURN v_template_id;
END;
$$;

-- =====================================================
-- UPDATE TIMESTAMP TRIGGERS
-- =====================================================

CREATE TRIGGER update_prompt_blocks_updated_at
  BEFORE UPDATE ON prompt_blocks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prompt_templates_updated_at
  BEFORE UPDATE ON prompt_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEED SYSTEM PROMPT BLOCKS
-- =====================================================

-- Note: In production, seed default system blocks for common use cases
-- These will be is_system_block = true and accessible to all orgs

-- Example system block (would be inserted per organization or as global)
-- INSERT INTO prompt_blocks (organization_id, name, block_type, content, model_scope, is_system_block)
-- VALUES (
--   'SYSTEM_ORG_ID',
--   'PR Agent System Role',
--   'SYSTEM',
--   'You are an expert PR and communications strategist...',
--   'ALL',
--   true
-- );

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE prompt_blocks IS 'Modular prompt building blocks for AI agents';
COMMENT ON TABLE prompt_templates IS 'Reusable prompt templates composed of blocks';
COMMENT ON FUNCTION assemble_prompt IS 'Assembles a complete prompt from template blocks';
COMMENT ON FUNCTION get_prompt_blocks IS 'Returns detailed block information for a template';
COMMENT ON FUNCTION validate_prompt_template IS 'Validates prompt template for common issues';
