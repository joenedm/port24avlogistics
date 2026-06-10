import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const base44 = createClientFromRequest(req);

    const messageIds = body.data?.new_message_ids ?? [];
    if (messageIds.length === 0) {
      return Response.json({ skipped: true, reason: 'no new messages' });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    // Get all admin users to notify
    const allUsers = await base44.asServiceRole.entities.User.list();
    const admins = allUsers.filter(u => u.role === 'admin' && u.email);

    const showKeywords = ['show', 'event', 'production', 'gig', 'booking'];
    const notified = [];

    for (const messageId of messageIds) {
      const res = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`,
        { headers: authHeader }
      );
      if (!res.ok) continue;

      const message = await res.json();
      const headers = message.payload?.headers ?? [];
      const subject = headers.find(h => h.name === 'Subject')?.value || '(no subject)';
      const from = headers.find(h => h.name === 'From')?.value || 'Unknown sender';

      // Check if subject contains a show keyword
      const subjectLower = subject.toLowerCase();
      const isShowEmail = showKeywords.some(kw => subjectLower.includes(kw));
      if (!isShowEmail) continue;

      console.log(`[gmailShowEmailWatcher] Show email detected: "${subject}" from ${from}`);

      // Notify all admins via Gmail send
      for (const admin of admins) {
        const emailBody = [
          `A new show-related email has arrived in your inbox.`,
          ``,
          `From: ${from}`,
          `Subject: ${subject}`,
          ``,
          `Log in to Port 24 or check your Gmail inbox for full details.`,
        ].join('\n');

        const mimeMessage = [
          `To: ${admin.email}`,
          `Subject: [Port 24 Alert] Show Email: ${subject}`,
          `Content-Type: text/plain; charset=utf-8`,
          ``,
          emailBody,
        ].join('\r\n');

        const encoded = btoa(unescape(encodeURIComponent(mimeMessage)))
          .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

        await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
          method: 'POST',
          headers: { ...authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({ raw: encoded }),
        });

        notified.push(admin.email);
      }
    }

    return Response.json({ success: true, notified });
  } catch (error) {
    console.error('[gmailShowEmailWatcher] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});