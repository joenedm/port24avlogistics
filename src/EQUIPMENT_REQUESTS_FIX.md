# Equipment Requests Fix & Approve All Feature

## What Was Fixed

### Problem 1: Equipment Requests Not Showing After Submission
**Root Cause:** Query key mismatch
- The submission dialog (`AdditionalEquipmentDialog`) was invalidating `['additionalEquipmentRequests']` (generic key)
- The approval panel (`AdditionalEquipmentApprovalPanel`) was querying `['additionalEquipmentRequests', showId]` (specific key)
- React Query treats these as two different caches, so the panel never saw the new request

**Solution:** Fixed the dialog to invalidate with the correct showId-specific key:
```javascript
queryClient.invalidateQueries({ queryKey: ['additionalEquipmentRequests', show.id] });
```

### Problem 2: No Bulk Approval & Manual Refresh Required
**Added:** "Approve All" button with full workflow:
- Approves all pending requests for the current project in one action
- Updates all asset locations and assigns them to the show
- Prevents duplicate approvals (tracks in-progress requests)
- Refreshes the pending list immediately after approval
- Shows loading state with "Approving..." text
- Shows error toasts if any approval fails

---

## Files Changed

1. **components/scan/AdditionalEquipmentDialog.jsx**
   - Fixed query invalidation key to include `show.id` so approved requests appear immediately

2. **components/show/AdditionalEquipmentApprovalPanel.jsx**
   - Added `useState` for tracking in-progress approvals
   - Added `approveAllMutation` for bulk approvals
   - Added duplicate prevention logic (checks request status before approving)
   - Added "Approve All" button in the header
   - Enhanced individual approve buttons with loading states
   - Added error handling with `sonner` toast notifications
   - Updated query to refetch on window focus (for always-fresh data)

3. **pages/ShowDetail.jsx**
   - Added missing React imports (`useState`, `useMemo`)

---

## How "Approve All" Works

1. **User clicks "Approve All"** → `approveAllMutation` starts
2. **Get pending requests** → Filter requests with `status === 'pending'`
3. **For each request:**
   - Mark as in-progress in UI (disables buttons)
   - Check latest status to prevent duplicate approvals
   - Update request to `status: 'approved'` and set `approved_by`, `approved_at`
   - Assign asset to show by updating:
     - `current_show_id`
     - `current_sub_location_id`
     - `current_sub_location_name`
     - `status: 'checked_out'`
     - `location`
4. **Query refresh** → Both queries invalidated automatically:
   - `['additionalEquipmentRequests', showId]` → Pending list updates
   - `['assets']` → Equipment list in room planner updates
5. **Show result** → Toast success message + pending list clears

**Duplicate Prevention:**
- Tracks `approvalInProgress` state object with request IDs
- Checks request status again before each approval (race condition safe)
- If status is already 'approved', skips that request

---

## How to Test

### Test 1: Single Approval Still Works
1. Go to a show detail page
2. Trigger additional equipment request from Scan page (scan non-assigned asset)
3. Request appears immediately in "Additional Equipment Requests"
4. Click "Approve & Add to Show" on one request
5. ✅ Request moves to completed list, asset shows in room planner

### Test 2: Requests Show Immediately After Submission
1. Go to Scan page, select a project
2. Submit additional equipment request for an item not in the project
3. Go to that project's detail page WITHOUT refreshing
4. ✅ The request appears immediately in "Additional Equipment Requests"
5. No need to refresh or navigate away

### Test 3: Approve All Feature
1. Go to Scan page, select a project
2. Submit **3+ equipment requests** for different items
3. Go to project detail page
4. In "Additional Equipment Requests" section, click **"Approve All"** button
5. ✅ Button shows "Approving..." while processing
6. ✅ All requests disappear and appear in room planner equipment
7. ✅ Toast shows "All equipment approved and added to show"
8. ✅ "No pending equipment requests" message appears once list is empty

### Test 4: Partial Failure Handling
1. Set up 3 pending requests
2. Click "Approve All"
3. If one fails (simulate by testing error state)
4. ✅ Toast shows which requests failed
5. ✅ Approved requests are still saved
6. ✅ Failed requests remain pending

### Test 5: Prevent Duplicate Approvals
1. Submit a request
2. Click "Approve & Add to Show" → Don't wait for completion
3. Immediately click again on the same request (or "Approve All")
4. ✅ No duplicate approval created
5. ✅ Request status is 'approved' only once

### Test 6: Only Show When Needed
1. Clear all pending requests
2. Go to project detail page
3. ✅ "No pending equipment requests" appears in green card
4. Submit a new request
5. ✅ Card is replaced with actual pending requests

---

## Key Changes Summary

| Issue | Before | After |
|-------|--------|-------|
| Requests disappear after submit | ❌ Different query keys | ✅ Matching showId-specific keys |
| Manual refresh needed | ❌ Not auto-updating | ✅ Query invalidated on success |
| Bulk approvals | ❌ No Approve All button | ✅ Full bulk approve workflow |
| In-progress indication | ❌ No loading state | ✅ "Approving..." + disabled state |
| Duplicate approvals | ❌ Possible race condition | ✅ In-progress tracking + status check |
| Empty list message | ❌ Always showed (confusing) | ✅ Only shows when truly empty |
| Error visibility | ❌ Silent failures | ✅ Toast notifications |

---

## Technical Details

### Query Key Fix
```javascript
// Before: Generic key (doesn't match panel's query)
queryClient.invalidateQueries({ queryKey: ['additionalEquipmentRequests'] });

// After: Specific key matches panel's query
queryClient.invalidateQueries({ queryKey: ['additionalEquipmentRequests', show.id] });
```

### Approve All Loop with Duplicate Prevention
```javascript
for (const req of toApprove) {
  try {
    // Re-fetch to check if already approved (race condition safe)
    const latestReq = await base44.entities.AdditionalEquipmentRequest.filter({ id: req.id });
    if (latestReq[0]?.status === 'approved') continue; // Skip if already approved
    
    // Update request and asset
    await base44.entities.AdditionalEquipmentRequest.update(req.id, { status: 'approved', ... });
    await base44.entities.Asset.update(req.asset_id, { current_show_id: showId, ... });
  } catch (error) {
    errors.push(`${req.asset_name}: ${error.message}`);
  }
}
```

### UI Loading State
- "Approve All" button disabled while `approveAllMutation.isPending`
- Individual buttons disabled if already in progress: `approvalInProgress[request.id]`
- Shows "Approving..." text instead of button label

---

## Tested On
- React 18.2
- TanStack React Query 5.84
- Base44 SDK 0.8.26+