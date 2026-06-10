# Additional Equipment Request System

## Implementation Summary

This system prevents unassigned items from being scanned directly onto shows. Instead, unassigned items trigger an approval-based request workflow.

---

## 1. FILES CREATED / MODIFIED

### New Files Created:
- **entities/AdditionalEquipmentRequest.json** — Entity schema for equipment requests
- **components/scan/AdditionalEquipmentDialog.jsx** — Dialog to request additional equipment
- **components/show/AdditionalEquipmentApprovalPanel.jsx** — Panel for managers/coordinators/admins to approve requests

### Modified Files:
- **pages/Scan** — Added validation logic + dialog integration
- **pages/ShowDetail** — Added approval panel + user role fetching

---

## 2. SCAN VALIDATION LOGIC

### In Single Mode:
When user scans an item and clicks "Confirm":
```
IF action === 'check_out' AND item is NOT assigned to selected show:
  → SKIP normal scan flow
  → Open "Additional Equipment Request" dialog
  → Require user to select a room/truck/area
  → Submit request (status: pending)
  → Clear the scan
ELSE:
  → Proceed with normal check_out/check_in
```

### In Session Mode:
When user scans continuously:
```
IF item needs to check_out AND item is NOT assigned to show:
  → SKIP scan
  → Show error: "Not assigned — add as additional equipment request"
  → Focus back on scan input
ELSE:
  → Auto-process scan (check_out or check_in)
```

---

## 3. ADDITIONAL EQUIPMENT REQUEST ENTITY

**Entity Name:** `AdditionalEquipmentRequest`

**Required Fields:**
- `show_id` — Which show the request belongs to
- `asset_id` — The equipment being requested
- `requested_by` — User email who scanned the item
- `scanned_at` — ISO timestamp when scanned

**Key Fields:**
- `sub_location_id` — **REQUIRED before approval** — room/truck/area assignment
- `sub_location_name` — Display name of assigned location
- `status` — pending | approved | rejected
- `requested_quantity` — How many units (default: 1)
- `notes` — Optional context from requester
- `approved_by` — Approver email (set when approved)
- `approved_at` — ISO timestamp of approval
- `rejected_reason` — If rejected, optional reason

---

## 4. ROOM/TRUCK/AREA REQUIREMENT

When a user scans an unassigned item:
1. Dialog opens: "This item is not assigned to [show]"
2. Shows equipment details (name, barcode, serial)
3. **Requires** user to select a sub-location from dropdown
4. Optional notes field
5. Submit button disabled until location is selected
6. Error message if no location chosen: "Room/Truck/Area assignment is required"

---

## 5. APPROVAL ROLES

**Only these roles can approve additional equipment requests:**
- `admin`
- `manager`
- `coordinator`

**Crew cannot approve** — if crew scans unassigned equipment, they can create the request but it goes to the approval queue.

**Show Detail page:**
- Displays approval panel only to shows assigned to the current user
- Non-approved users see read-only status
- Approved users see "Approve & Add to Show" and "Reject" buttons

---

## 6. APPROVAL ACTIONS

When a manager/coordinator/admin approves a request:

1. **Approve & Add to Show:**
   - Update request status → `approved`
   - Set `approved_by` + `approved_at`
   - Update Asset:
     - Set `current_show_id` = show.id
     - Set `current_sub_location_id` = request.sub_location_id
     - Set `current_sub_location_name` = request.sub_location_name
     - Set `status` = `checked_out`
     - Update `location` field
   - Asset now appears in show equipment and can be scanned normally

2. **Reject:**
   - Update request status → `rejected`
   - Asset remains unassigned
   - Does not appear on show
   - Can resubmit another request later

---

## 7. PACKING PROGRESS PROTECTION

**Session Mode Progress Count Rules:**

Only counts equipment **officially assigned** to the show:
- ✅ Items with `current_show_id === selectedShowId`
- ✅ Approved additional equipment requests (after added to show)
- ❌ Pending requests
- ❌ Rejected requests
- ❌ Unassigned items

**Session Mode Missing Items:**
- Shows items assigned to show but not yet scanned
- Does NOT include pending additional equipment requests

---

## 8. USER FEEDBACK FLOW

### Scanning Unassigned Item (Single Mode):
```
1. User scans barcode
2. System checks: "Is this item assigned to the selected show?"
3. NO:
   - Dialog opens: "This item is not assigned to [show name]"
   - Shows equipment image/details
   - User selects location
   - User clicks "Submit Request"
   - Dialog closes
   - Toast: "Request submitted for [item name]"
   - Scan input clears, focus returns
4. Request appears in ShowDetail > Additional Equipment Requests section
5. Manager approves/rejects
6. If approved, item now on show and scannable
```

### Scanning Unassigned Item (Session Mode):
```
1. User scans barcode in session
2. System checks: "Is this assigned to show?"
3. NO:
   - Toast error: "[Item] not assigned — add as additional equipment request"
   - Scan clears
   - No item added to session list
   - Focus back on scan input
```

### Approval Flow (ShowDetail Page):
```
1. Pending requests visible in "Additional Equipment Requests" section
2. Manager sees request details:
   - Item name, barcode, serial
   - Scanned by [email], date/time
   - Assigned location [room/truck/area]
   - Quantity, notes
3. Manager clicks "Approve & Add to Show"
4. System:
   - Updates request status
   - Assigns asset to show + location
   - Invalidates queries
   - Panel refreshes
   - Request no longer pending (moves to approved)
5. Asset now visible in Equipment tab and scannable
```

---

## 9. HOW TO TEST

### Test 1: Scan Assigned Item (Works Normally)
1. Go to Scan page
2. Select a show
3. Select a room/truck
4. Scan an item already assigned to that show
5. **Expected:** Normal check_out/check_in flow, item added to session

### Test 2: Scan Unassigned Item (Single Mode)
1. Go to Scan page
2. Select a show
3. Scan an item NOT assigned to that show
4. **Expected:**
   - Dialog opens: "This item is not assigned to [show]"
   - Dialog shows item details
   - Location dropdown is empty/required
   - Try clicking "Submit Request" without selecting location
   - **Expected:** Error/disabled state
   - Select a location
   - Click "Submit Request"
   - **Expected:** Dialog closes, toast shows success

### Test 3: Scan Unassigned Item (Session Mode)
1. Go to Scan page
2. Switch to "Session Mode (Bulk)"
3. Select a show
4. Scan an item NOT assigned to that show
5. **Expected:**
   - Toast error: "[Item] not assigned — add as additional equipment request"
   - Item NOT added to scanned list
   - Scan clears, focus returns

### Test 4: Approve Request (Manager)
1. Go to ShowDetail for a show with pending requests
2. Look for "Additional Equipment Requests" section
3. See pending request with item details
4. Click "Approve & Add to Show"
5. **Expected:**
   - Request status updates to approved
   - Asset assigned to show + room
   - Asset now visible in Equipment tab
   - Asset scannable in subsequent scans

### Test 5: Reject Request (Manager)
1. Go to ShowDetail
2. Click "Reject" on a pending request
3. **Expected:**
   - Request status → rejected
   - Asset remains unassigned
   - Does not appear on show

### Test 6: Crew Cannot Approve
1. Log in as crew user
2. Go to ShowDetail
3. Look at pending additional equipment requests
4. **Expected:**
   - Read-only message: "Only managers, coordinators, and admins can approve requests"
   - No approve/reject buttons visible

### Test 7: Packing Progress Only Counts Assigned
1. Go to Scan > Session Mode
2. Select a show with 5 assigned items and 2 pending requests
3. Scan 3 assigned items
4. **Expected:**
   - "Scanned This Session: 3"
   - "Total on Show: 5" (does NOT include pending requests)
   - "Missing (from show): 2" (does NOT include pending requests)

---

## 10. SAFE RULES ENFORCED

✅ **Unassigned items blocked from direct scan** — Must go through request workflow
✅ **Crew cannot approve** — Only manager/coordinator/admin can approve
✅ **Room/Truck/Area required** — Cannot submit request without location assignment
✅ **Silent additions prevented** — Dialog forces intentional request submission
✅ **Packing progress protected** — Only counts truly assigned equipment
✅ **Approval traceable** — Requests record who scanned, who approved, when
✅ **Rejection supported** — Requests can be rejected without adding to show
✅ **Fast flow for assigned items** — Assigned items scan instantly, no dialog

---

## 11. DATABASE QUERIES & RELATIONSHIPS

**Scan Validation Check:**
```javascript
const isAssigned = asset.current_show_id === selectedShowId;
```

**Create Request:**
```javascript
await base44.entities.AdditionalEquipmentRequest.create({
  show_id, asset_id, sub_location_id, requested_by, scanned_at, ...
})
```

**Approve Request:**
```javascript
await base44.entities.AdditionalEquipmentRequest.update(id, {
  status: 'approved', approved_by, approved_at
})
await base44.entities.Asset.update(asset_id, {
  current_show_id, current_sub_location_id, status: 'checked_out'
})
```

**Fetch Pending Requests:**
```javascript
const pending = await base44.entities.AdditionalEquipmentRequest.filter({
  show_id, status: 'pending'
})
```

---

## 12. EDGE CASES HANDLED

- ✅ User selects show but no sub-locations exist → Can still submit request
- ✅ Item is a kit → Validation applies to each item in kit
- ✅ Item scanned, location selected, but network fails → Request unsaved, user retries
- ✅ Item scanned by crew, approved by manager → Crew can now scan it normally
- ✅ Request approved, then someone removes item from show → Request stays approved (idempotent)
- ✅ Multiple users submitting same unassigned item simultaneously → Each creates separate request

---

## Next Steps

1. Test all 7 test scenarios above
2. Monitor AdditionalEquipmentRequest entity for volume/usage
3. Optional: Add auto-reject after N days without approval
4. Optional: Add email notifications to managers on new requests
5. Optional: Add bulk approval feature for managers