import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { showId } = await req.json();
    if (!showId) return Response.json({ error: 'showId required' }, { status: 400 });

    // Get all fulfillments for this show with no requirement_id (additional equipment)
    const fulfillments = await base44.asServiceRole.entities.ShowFulfillment.filter({ show_id: showId });
    const orphaned = fulfillments.filter(f => !f.requirement_id && f.movement_state !== 'returned');

    if (orphaned.length === 0) {
      return Response.json({ cleaned: 0 });
    }

    // Get all approval requests for this show
    const approvalRequests = await base44.asServiceRole.entities.AdditionalEquipmentRequest.filter({ show_id: showId });

    const toDelete = [];

    for (const fulfillment of orphaned) {
      // Find a matching approval request for this asset on this show
      const matchingApproval = approvalRequests.find(r => r.asset_id === fulfillment.asset_id);

      // Delete if: no approval request exists at all, OR the approval was rejected
      if (!matchingApproval || matchingApproval.status === 'rejected') {
        toDelete.push(fulfillment);
      }
    }

    // Delete orphaned fulfillments and reset asset status
    for (const f of toDelete) {
      await base44.asServiceRole.entities.ShowFulfillment.delete(f.id);

      // Reset asset back to available if it was locked to this show
      const assets = await base44.asServiceRole.entities.Asset.filter({ id: f.asset_id });
      const asset = assets?.[0];
      if (asset && asset.locked_to_show_id === showId) {
        await base44.asServiceRole.entities.Asset.update(asset.id, {
          status: 'available',
          locked_to_show_id: null,
          locked_to_show_name: null,
          locked_at: null,
          current_show_id: null,
        });
      }
    }

    return Response.json({ cleaned: toDelete.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});