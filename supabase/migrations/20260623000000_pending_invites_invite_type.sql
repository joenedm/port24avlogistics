-- Add invite_type to distinguish platform-level vs workspace-level invites
ALTER TABLE pending_invites
  ADD COLUMN IF NOT EXISTS invite_type TEXT NOT NULL DEFAULT 'team_member';

-- Back-fill existing rows
UPDATE pending_invites SET invite_type = 'platform_staff' WHERE role = 'platform_admin';

-- Rows with role != 'platform_admin' and an org_id that is NOT the platform org
-- are workspace user invites — already covered by the DEFAULT 'team_member'.

-- Index for filtered queries
CREATE INDEX IF NOT EXISTS idx_pending_invites_invite_type ON pending_invites (invite_type);
