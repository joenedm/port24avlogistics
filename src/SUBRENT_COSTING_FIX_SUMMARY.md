# Subrent Costing & Project Builder Restructure — Summary

## Problem Statement
1. **Costing Issue**: Subrents were being added to billable revenue, artificially inflating profitability and margin calculations
2. **Project Builder Layout**: Subrents were isolated in a separate tab, preventing seamless mixing of owned and subrented equipment
3. **Margin Distortion**: Subrent costs reduced internal costs while inflating billable totals, breaking profit/loss calculations

## Solution Overview

### Part 1: Costing Logic Fix
**Changed subrents from revenue to cost/expense:**

#### Before:
```javascript
const totalBillable = crewTotal + eventCostsTotal + quoteBillable + subrentsTotal;  // Wrong!
const totalInternal = crewInternal + eventCostsInternal;
// Subrents inflated billable, increasing margin artificially
```

#### After:
```javascript
const totalBillable = crewTotal + eventCostsTotal + quoteBillable;  // Unchanged
const totalInternal = crewInternal + eventCostsInternal + subrentsCost;  // Added subrents here
// Subrents now reduce internal costs, reducing margin (correct)
```

**Impact on calculations:**
- **Internal Total**: Now includes subrents as a cost layer
- **Billable Total**: Unchanged (subrents are not billable line items)
- **Margin**: Reduced by the full subrent cost amount (correct)
- **Markup %**: Reduced proportionally (now accurate)
- **Budget Health**: Shows realistic profitability with subrents factored as expenses

### Part 2: Project Builder Restructure
**Moved subrents from separate tab into Equipment tab:**

#### Before:
- Roundtable Subrents had its own dedicated tab
- Could not mix owned and subrented gear in the same workflow
- Difficult to plan real-world room/location layouts with mixed equipment

#### After:
- Subrents live inside the Equipment tab
- Displayed below owned equipment with amber badges for distinction
- Shows partner name, status, cost, and room assignment
- Users can view owned + subrented gear together in one view

## Files Changed

### 1. **components/dashboard/BudgetSummary.jsx**
- Added subrents as a cost parameter
- Moved subrents from billable to internal cost calculation
- Updated breakdown display to show subrents with red/cost styling
- Added `isCost` flag to distinguish cost-only items from revenue items

### 2. **pages/LiveProject.jsx**
- Removed separate "Subrents" tab
- Added subrents badge to Equipment tab label
- Integrated subrents display into Equipment tab content
- Subrents now render below equipment list with amber styling

### 3. **pages/ShowDetail.jsx**
- Added subrents to projectTotals calculation
- Subrents now included in totalInternalCost (not billable)
- Updated cost breakdown display to show subrents as separate cost row
- Subrents display with red styling to indicate cost/expense nature

## Costing Behavior — End-to-End

### Scenario: Show with $10,000 equipment (billable) + $2,000 crew + $500 subrents

**Before (Incorrect):**
- Billable: $10,000 + $2,000 + $500 = $12,500
- Internal: $5,000 (equipment cost) + $1,500 (crew cost) = $6,500
- Margin: $12,500 - $6,500 = $6,000 ✗ (inflated)
- Markup %: 92% ✗ (distorted)

**After (Correct):**
- Billable: $10,000 + $2,000 = $12,000 (subrents not added)
- Internal: $5,000 (equipment) + $1,500 (crew) + $500 (subrents) = $7,000
- Margin: $12,000 - $7,000 = $5,000 ✓ (reduced by subrent cost)
- Markup %: 71% ✓ (accurate)

### Where Subrents Now Affect Calculations:

1. **Live Project (LiveProject.jsx)**
   - Budget tab: BudgetSummary includes subrents in internal total
   - Automatically updates when subrents added/removed via ShowSubrentsPanel
   - Real-time margin and markup recalculation

2. **Show Detail (ShowDetail.jsx)**
   - Live Project Costing section shows subrents cost breakdown
   - Margin automatically reduced when subrents present
   - Visible cost impact in the project totals card

3. **Budget Summary Component (BudgetSummary.jsx)**
   - Subrent costs display with red background (cost indicator)
   - Labeled as "Roundtable Subrents (Cost)" for clarity
   - Included in margin calculation (reduces profitability)

## Project Builder Layout — End-to-End

### Before:
```
LiveProject
├── Overview
├── Budget
├── Crew
├── Equipment      ← Owned gear only
├── Rooms
├── Subrents       ← Isolated, separate section
└── Missing
```

### After:
```
LiveProject
├── Overview
├── Budget
├── Crew
├── Equipment      ← Owned + subrented gear mixed
│   ├── Equipment Status (owned)
│   └── Roundtable Subrents (subrented, with partner info)
├── Rooms
└── Missing
```

### Equipment Tab Display:
- **Owned equipment**: Rendered by EquipmentStatus component
- **Subrented equipment**: Rendered below with:
  - Item name + quantity
  - Total cost (clearly marked as $X)
  - Partner company name (source)
  - Room/location assignment
  - Status badge (requested, delivered, in-use, etc.)
  - Amber color scheme for visual distinction

## How to Test

### Test 1: Costing Logic
1. Go to ShowDetail for any show
2. Add subrented items via Roundtable tab
3. Verify in "Live Project Costing" section:
   - Internal total **increases** (subrents added as cost)
   - Billable total **stays same** (subrents not revenue)
   - Margin **decreases** by subrent amount
   - Markup % **reduces** proportionally
4. Remove subrents and verify margin recovers

### Test 2: Equipment Layout
1. Go to LiveProject → Equipment tab
2. Verify you see both:
   - Owned equipment (from quote/assets)
   - Subrented equipment (in amber section below)
3. Mix should appear natural and organized
4. Verify partner name and status visible on each subrent
5. Verify no separate "Subrents" tab exists

### Test 3: Real-World Scenario
1. Create a show with:
   - 5 owned items ($1000 billable)
   - 2 subrented items ($300 total cost)
   - 1 crew member ($500 billable)
2. Check Budget tab: margin should reflect $300 cost reduction
3. Check LiveProject Budget: same calculation
4. Equipment tab should show all 7 items mixed together

## Why Subrents Were Wrong Before

1. **Treated as Revenue**: Subrents were added to billable total, making them look like income
2. **Margin Inflation**: Without corresponding internal cost increase, margin grew artificially
3. **Misleading Profitability**: Shows looked more profitable than they actually were
4. **Isolated from Planning**: Separate tab meant users couldn't see true equipment mix during planning

## Now Fixed

✓ Subrents are treated as costs (internal expense)
✓ Margin calculation is accurate and realistic
✓ Markup % reflects true profitability
✓ Equipment planning includes all gear in one view
✓ Partner/source company stays visible
✓ Status tracking still works (delivery, return, etc.)
✓ Real-world show building is simpler and more intuitive