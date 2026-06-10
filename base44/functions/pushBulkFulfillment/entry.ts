import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { item, asset, qty, showId, showName } = await req.json();
    if (!item || !asset || !qty || !showId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch the live asset record to get actual inventory quantity
    const liveAsset = await base44.asServiceRole.entities.Asset.filter({ id: asset.id });
    const assetRecord = liveAsset?.[0];
    if (!assetRecord) {
      return Response.json({ error: 'Asset not found in inventory' }, { status: 404 });
    }

    const inventoryQty = assetRecord.quantity ?? 1;
    const plannedQty = item.quantity_needed ?? 1;

    // How many are already fulfilled for this requirement on this show?
    const existingFulfillments = await base44.asServiceRole.entities.ShowFulfillment.filter({
      show_id: showId,
      requirement_id: item.id,
    });
    const alreadyFulfilled = existingFulfillments.filter(f => f.movement_state !== 'returned').length;
    const remainingNeeded = Math.max(0, plannedQty - alreadyFulfilled);

    // Cap: cannot exceed what's planned on the project OR what's in inventory
    const allowedQty = Math.min(qty, remainingNeeded, inventoryQty);

    if (allowedQty <= 0) {
      return Response.json({
        error: `Cannot push: ${alreadyFulfilled >= plannedQty ? 'requirement already fulfilled' : 'insufficient inventory'} (inventory: ${inventoryQty}, planned: ${plannedQty}, already out: ${alreadyFulfilled})`,
      }, { status: 400 });
    }

    const now = new Date().toISOString();
    const records = Array.from({ length: allowedQty }).map(() => ({
      show_id: showId,
      show_name: showName || '',
      requirement_id: item.id,
      asset_id: asset.id,
      asset_name: asset.name,
      asset_barcode: asset.barcode || '',
      asset_serial: asset.serial_number || (asset.serial_numbers ? asset.serial_numbers.split(',')[0].trim() : ''),
      room_id: item.room_id || null,
      room_name: item.room_name || null,
      movement_state: 'picked',
      scanned_by: user.email || '',
      scanned_at: now,
    }));

    await base44.asServiceRole.entities.ShowFulfillment.bulkCreate(records);

    await base44.asServiceRole.entities.Asset.update(asset.id, {
      status: 'checked_out',
      locked_to_show_id: showId,
      locked_to_show_name: showName || '',
      locked_at: now,
      current_show_id: showId,
      current_sub_location_id: item.room_id || null,
      current_sub_location_name: item.room_name || null,
    });

    return Response.json({ success: true, created: allowedQty, capped: allowedQty < qty, inventoryQty, plannedQty });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});