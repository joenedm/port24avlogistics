-- Rename invite_type value company_admin → company_owner for clarity
-- company_owner: Platform Admin invites a new customer company owner
-- team_member:   Workspace admin invites their own users
-- platform_staff: Platform Admin invites internal staff

UPDATE pending_invites SET invite_type = 'company_owner' WHERE invite_type = 'company_admin';
