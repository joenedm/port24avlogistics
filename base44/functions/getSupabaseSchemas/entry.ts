import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { accessToken } = await base44.asServiceRole.connectors.getConnection('supabase');

  // Get all projects
  const projectsRes = await fetch('https://api.supabase.com/v1/projects', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const projects = await projectsRes.json();

  if (!projects?.length) return Response.json({ error: 'No Supabase projects found' }, { status: 404 });

  const results = [];

  for (const project of projects) {
    const ref = project.ref;

    // Query schema for all tables via read-only endpoint
    const schemaRes = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query/read-only`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          SELECT
            t.table_name,
            c.column_name,
            c.data_type,
            c.is_nullable,
            c.column_default,
            c.character_maximum_length
          FROM information_schema.tables t
          JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
          WHERE t.table_schema = 'public'
            AND t.table_type = 'BASE TABLE'
            AND (
              t.table_name ILIKE '%asset%'
              OR t.table_name ILIKE '%inventor%'
            )
          ORDER BY t.table_name, c.ordinal_position;
        `,
      }),
    });

    const schemaData = await schemaRes.json();

    results.push({
      project: project.name,
      ref,
      schema: schemaData,
    });
  }

  return Response.json({ results });
});