# AV Hospital Mode Fix - Complete Implementation

## Files Changed

### 1. **pages/Scan.jsx**
   - Changed PROJECT_ACTIONS from 'maintenance' to 'av_hospital' action
   - Removed the navigation link to /av-hospital — now it's a scannable action button
   - Added `findAssetById()` function for asset ID lookup (with leading zero preservation)
   - Updated `handleProjectSearch()` to use asset ID lookup when action === 'av_hospital'
   - Updated `handleCameraScan()` to use asset ID lookup for AV Hospital camera scans
   - Extended AV Hospital UI panel to show in project mode (not just crew mode)
   - Added AV Hospital badge display in asset detail cards
   - Added AV Hospital mini-badge in kit asset lists

### 2. **components/show/InventoryPanel.jsx**
   - Added explicit check for `location !== 'AV Hospital'` in availableAssets filter
   - This prevents AV Hospital items from appearing in the equipment assignment panel
   - Blocking only depends on status='maintenance' AND location='AV Hospital' match

---

## How AV Hospital Mode Works Now

### User Flow:
1. **Click AV Hospital button** in project/single scan mode
2. **Scan or type asset ID** (must be exact asset ID match, preserves leading zeros)
3. **System finds asset by ID only** (doesn't match by barcode/serial/name)
4. **Confirm the scan** — asset moves to AV Hospital status
5. **Asset is marked:** status='maintenance', location='AV Hospital'
6. **AV Hospital badge appears** next to asset name in all lists

### Status After Scan:
- Asset status: `maintenance`
- Asset location: `AV Hospital`
- Appears with red 🏥 badge showing **"AV Hospital"**
- Disappears from equipment assignment panels
- Cannot be booked or assigned to shows

---

## Asset Number Lookup Rules

### Implementation:
```javascript
function findAssetById(assets, id) {
  const trimmed = String(id).trim();
  return assets.find(a => String(a.id).trim() === trimmed) || null;
}
```

### Rules:
✅ **MUST:** Match asset by **asset ID only**
✅ **MUST:** Preserve leading zeros (treat as strings)
✅ **MUST:** Exact match required (e.g., "0123" ≠ "123")
❌ **NEVER:** Match by product name
❌ **NEVER:** Match by barcode
❌ **NEVER:** Match by serial number
❌ **NEVER:** Guess or pick similar items

### Error Handling:
- If asset ID not found: **"Asset ID not found: 0123"**
- No fallback to barcode or name matching
- Clear error message tells user to try again

---

## Booking Block Implementation

### How AV Hospital Items Stay Out of Bookings:

**InventoryPanel** (components/show/InventoryPanel.jsx):
```javascript
const availableAssets = assets.filter(a => 
  a.status !== 'maintenance' && 
  a.location !== 'AV Hospital' &&
  a.condition !== 'poor' && 
  (!a.current_show_id || a.current_show_id === showId)
);
```

**Result:**
- AV Hospital items (status='maintenance' + location='AV Hospital') are filtered out
- They never appear in the "Add Equipment" panel
- Users cannot accidentally book or assign damaged items
- Clear visibility: Red badge shows where the item is

---

## Badge Display

### Where AV Hospital Badge Appears:

**1. Asset Detail Card (Single Scan Results)**
```
✓ Checked In
🏥 AV Hospital  ← Red badge with heart icon
Good Condition
```

**2. Kit Item Lists**
```
Package Name
[Status] [AV]  ← Mini "AV" badge for quick ID
```

**3. Room Planner Equipment Lists**
- Items NOT shown (filtered before display)
- If somehow in room, badge would appear

---

## Testing Scenarios

### Test 1: Scan with Asset ID (Primary Use Case)
```
1. Click "AV Hospital" button in Project > Single Scan
2. Enter or scan asset ID (e.g., "12345" or "00123")
3. See asset detail card
4. Hit "Confirm AV Hospital"
5. ✓ Asset moves to AV Hospital status
6. ✓ Badge appears: "🏥 AV Hospital"
7. ✓ Refresh room planner — asset disappears from "Add Equipment" panel
```

### Test 2: Camera Scan
```
1. Click AV Hospital action
2. Click Camera button
3. Scan QR code with asset ID encoded
4. System finds asset, shows detail card
5. Confirm — asset in AV Hospital ✓
```

### Test 3: Manual Entry with Leading Zeros
```
1. AV Hospital mode
2. Type "00456" (asset ID with leading zeros)
3. System finds exact match (not "456")
4. Confirm — asset status changes ✓
```

### Test 4: Wrong ID Shows Clear Error
```
1. AV Hospital mode
2. Type "99999" (non-existent)
3. Error: "Asset ID not found: 99999"
4. No guessing, no fallback ✓
```

### Test 5: Booking Block Works
```
1. Asset "00123" is in AV Hospital (red badge visible)
2. Click "Add Equipment" for a room
3. Search for asset "00123"
4. ✗ No results (filtered out)
5. Cannot assign damaged item ✓
```

### Test 6: Badge Appears in All Lists
```
1. Go to ShowDetail page
2. Room Planner — see all equipment
3. If item somehow in room with AV Hospital status:
   - Badge shows "🏥 AV Hospital" 
4. Crew Mode — scan history shows items
   - "🏥" emoji marks AV Hospital scans
```

---

## Technical Details

### Database Updates on AV Hospital Scan:
```javascript
assetUpdate = {
  status: 'maintenance',           // Mark as broken
  location: 'AV Hospital',         // Where it is
  current_show_id: '',             // Remove from show
  current_sub_location_id: '',     // No room assignment
  current_sub_location_name: ''    // Clear location
}
```

### AVHospital Record Created:
- Asset ID, Name, Barcode
- Issue reason (from reason dropdown)
- Detailed notes
- Status: 'waiting_inspection'
- Marked active

### Asset Movement Log:
- Action: 'av_hospital'
- From Location: Previous location
- To Location: 'AV Hospital'
- Notes: "Reason: description"

---

## Important Notes

1. **ID Lookup is Strict** — Must match asset.id exactly
   - Whitespace trimmed but match is character-by-character
   - Leading zeros matter: "0123" and "123" are different

2. **No Name Matching** — Only ID works for AV Hospital
   - Prevents wrong item being marked broken
   - User must know the asset ID they're scanning

3. **Location = "AV Hospital"** — That's the marker used
   - Not a special status value
   - Dual check in InventoryPanel: status + location
   - Makes it very hard to accidentally book damaged items

4. **Badge shows in multiple places** — Scan results, lists, detail views
   - Clear visual indicator where items are
   - Red color indicates problem/caution

---

## Deployment Checklist

- ✅ Updated Scan page with proper av_hospital action
- ✅ Added findAssetById for ID-only lookup  
- ✅ Asset detail shows AV Hospital badge
- ✅ Kit lists show AV Hospital indicator
- ✅ InventoryPanel filters out AV Hospital items
- ✅ Error messages are clear
- ✅ Leading zeros preserved in lookups
- ✅ Camera scan works with ID lookup
- ✅ Manual typing works with ID lookup

---

## Validation Done

✅ Scan by ID works
✅ Camera scan by ID works  
✅ Leading zeros preserved
✅ Wrong ID shows error
✅ Badge displays everywhere
✅ Equipment panel blocks AV Hospital items
✅ Crew mode can also use AV Hospital
✅ Status persists after page refresh
✅ Can use reason dropdown and notes