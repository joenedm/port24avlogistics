import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Migration: Convert all old "Physical combination" / "Virtual combination" records.
 *
 * Strategy:
 *   1. Find all Asset records where category = "Physical combination" or "Virtual combination".
 *      These are the OLD-style combination asset records that should have been migrated to Kit records.
 *      - If a corresponding Kit already exists (linked via kit_id), just fix the asset category to "Kit".
 *      - If no kit exists yet, create a proper Kit (serialized or cloud) and link the asset.
 *
 *   2. Find all Kit records where kit_type is still "physical_combination" or "virtual_combination"
 *      (in case old enum values were stored) and remap to "serialized" or "cloud".
 *
 *   3. Return a full summary of what was changed.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // ── 1. Fetch everything ──────────────────────────────────────────────────
    const [assets, kits] = await Promise.all([
      base44.asServiceRole.entities.Asset.list('-created_date', 20000),
      base44.asServiceRole.entities.Kit.list('-created_date', 5000),
    ]);

    const errors = [];
    let assetCategoryFixed = 0;
    let newKitsCreatedFromPhysical = 0;
    let newKitsCreatedFromVirtual = 0;
    let kitTypeFixed = 0;

    // ── 2. Fix Asset records with old category names ─────────────────────────
    const physicalAssets = assets.filter(a => a.category === 'Physical combination');
    const virtualAssets  = assets.filter(a => a.category === 'Virtual combination');

    for (const asset of physicalAssets) {
      try {
        if (asset.kit_id) {
          // Already linked to a kit — just fix the category label
          await base44.asServiceRole.entities.Asset.update(asset.id, { category: 'Kit' });
          assetCategoryFixed++;
        } else {
          // No kit yet — create a Serialized Kit and link
          const kit = await base44.asServiceRole.entities.Kit.create({
            name: asset.name,
            kit_type: 'serialized',
            barcode: asset.barcode || undefined,
            location: asset.location || undefined,
            status: asset.status || 'available',
            daily_rate: asset.daily_rate || undefined,
            notes: `Auto-migrated from Physical combination asset ${asset.id}`,
          });
          await base44.asServiceRole.entities.Asset.update(asset.id, {
            kit_id: kit.id,
            category: 'Kit',
          });
          newKitsCreatedFromPhysical++;
          assetCategoryFixed++;
        }
      } catch (e) {
        errors.push(`Asset ${asset.id} (Physical combination): ${e.message}`);
      }
    }

    for (const asset of virtualAssets) {
      try {
        if (asset.kit_id) {
          // Already linked — just fix category
          await base44.asServiceRole.entities.Asset.update(asset.id, { category: 'Kit' });
          assetCategoryFixed++;
        } else {
          // No kit yet — create a Cloud Kit and link
          const kit = await base44.asServiceRole.entities.Kit.create({
            name: asset.name,
            kit_type: 'cloud',
            barcode: asset.barcode || undefined,
            location: asset.location || undefined,
            status: asset.status || 'available',
            daily_rate: asset.daily_rate || undefined,
            notes: `Auto-migrated from Virtual combination asset ${asset.id}`,
          });
          await base44.asServiceRole.entities.Asset.update(asset.id, {
            kit_id: kit.id,
            category: 'Kit',
          });
          newKitsCreatedFromVirtual++;
          assetCategoryFixed++;
        }
      } catch (e) {
        errors.push(`Asset ${asset.id} (Virtual combination): ${e.message}`);
      }
    }

    // ── 3. Fix any Kit records with legacy kit_type values ───────────────────
    const legacyKits = kits.filter(k =>
      k.kit_type === 'physical_combination' ||
      k.kit_type === 'virtual_combination' ||
      k.kit_type === 'Physical combination' ||
      k.kit_type === 'Virtual combination'
    );

    for (const kit of legacyKits) {
      try {
        const newType =
          (kit.kit_type === 'physical_combination' || kit.kit_type === 'Physical combination')
            ? 'serialized'
            : 'cloud';
        await base44.asServiceRole.entities.Kit.update(kit.id, { kit_type: newType });
        kitTypeFixed++;
      } catch (e) {
        errors.push(`Kit ${kit.id}: ${e.message}`);
      }
    }

    return Response.json({
      success: true,
      summary: {
        physicalCombinationAssetsFound: physicalAssets.length,
        virtualCombinationAssetsFound: virtualAssets.length,
        assetCategoriesFixed: assetCategoryFixed,
        newSerializedKitsCreated: newKitsCreatedFromPhysical,
        newCloudKitsCreated: newKitsCreatedFromVirtual,
        legacyKitTypesFixed: kitTypeFixed,
        totalChanges: assetCategoryFixed + kitTypeFixed,
        errors: errors.length > 0 ? errors : null,
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});