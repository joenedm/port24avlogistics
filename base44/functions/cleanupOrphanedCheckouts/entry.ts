import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Finds assets marked as checked_out but whose show no longer exists,
// and resets them to available.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch all shows, checked-out assets, and fulfillments
    const [shows, checkedOutAssets, fulfillments] = await Promise.all([
      base44.asServiceRole.entities.Show.list('-created_date', 5000),
      base44.asServiceRole.entities.Asset.filter({ status: 'checked_out' }, '-created_date', 5000),
      base44.asServiceRole.entities.ShowFulfillment.list('-created_date', 10000),
    ]);

    const showIds = new Set(shows.map(s => s.id));
    const fulfillmentsByAsset = {};
    for (const f of fulfillments) {
      if (!fulfillmentsByAsset[f.asset_id]) fulfillmentsByAsset[f.asset_id] = [];
      fulfillmentsByAsset[f.asset_id].push(f);
    }

    const orphaned = [];

    for (const asset of checkedOutAssets) {
      // Check if the show it's locked/assigned to still exists
      const lockedShowExists = asset.locked_to_show_id && showIds.has(asset.locked_to_show_id);
      const currentShowExists = asset.current_show_id && showIds.has(asset.current_show_id);

      // Check if any active fulfillment (not returned) points to an existing show
      const activeFulfillments = (fulfillmentsByAsset[asset.id] || []).filter(f => {
        const notReturned = !['returned', 'completed'].includes(f.status || '');
        return notReturned && showIds.has(f.show_id);
      });

      // If the asset is checked out but has no active show connection, it's orphaned
      const hasActiveShow = lockedShowExists || currentShowExists || activeFulfillments.length > 0;

      if (!hasActiveShow) {
        orphaned.push(asset);
      }
    }

    // Reset orphaned assets to available
    const resetResults = await Promise.all(
      orphaned.map(asset =>
        base44.asServiceRole.entities.Asset.update(asset.id, {
          status: 'available',
          locked_to_show_id: null,
          locked_to_show_name: null,
          locked_at: null,
          current_show_id: null,
          current_sub_location_id: null,
          current_sub_location_name: null,
        })
      )
    );

    return Response.json({
      success: true,
      orphaned_count: orphaned.length,
      reset: orphaned.map(a => ({ id: a.id, name: a.name, was_locked_to: a.locked_to_show_name || a.current_show_id })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});