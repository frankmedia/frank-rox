# CMS Reordering Issue V2 - Database Updates Succeed But UI Doesn't Reflect Changes

## Problem
Database updates are **100% successful** (all `order_index` values are correctly updated to 1, 2, 3...), but after reloading the data, the UI still shows the OLD order.

## What We've Tried

### ✅ Attempt 1: Two-Phase Update (WORKS for DB)
```typescript
// Phase 1: Set all to -999 to break existing order
for (const item of reordered) {
  await supabase
    .from('sessions')
    .update({ order_index: -999 })
    .eq('id', sessionId);
}

// Phase 2: Set final positions (1, 2, 3...)
for (let idx = 0; idx < reordered.length; idx++) {
  await supabase
    .from('sessions')
    .update({ order_index: idx + 1 })
    .eq('id', sessionId);
}
```

**Result:** All database updates succeed with ✓ logs, but UI doesn't update.

### ✅ Attempt 2: Remove Premature State Update
We removed `setItemsByDay()` before database updates to prevent premature re-renders.

**Result:** Still doesn't work.

## Console Logs Showing the Issue

```
🔄 ========== REORDER START ==========
🔄 Active Item ID: fabd05f5-67cc-421e-b7a7-32345f40ddc7
🔄 Over Item ID: 2370efc8-39c4-422a-947e-9ca8edfd84d4
🔄 Day ID: 11e9e5df-4603-46ff-96a5-f487f9e83ad2
🔄 Total standalone items: 9
🔄 Items BEFORE reorder: 
  [{ position: 1, id: 'xxx', name: 'Easy Walk' },
   { position: 2, id: 'yyy', name: 'Dead Bug' },
   ...]
🔄 From Index: 1 (0-based)
🔄 To Index: 0 (0-based)
🔄 Items AFTER arrayMove: 
  [{ position: 1, id: 'yyy', name: 'Dead Bug' },  ← Should be first now
   { position: 2, id: 'xxx', name: 'Easy Walk' },
   ...]

🔄 ========== PHASE 1: Set to -999 ==========
🔄 [1/9] Getting session for item: Dead Bug (ID: fabd05f5-...)
🔄 ✓ Found session ID: e8c599de-...
🔄 Setting session e8c599de-... to order_index = -999
🔄 ✓ Successfully set to -999
... (all 9 items successfully set to -999)

🔄 ========== PHASE 2: Set final positions ==========
🔄 [1/9] Processing: Dead Bug → Position 1
🔄 Session ID: e8c599de-14af-4759-a40a-5e7ed38b0bb0
🔄 Setting session e8c599de-... to order_index = 1
🔄 ✓ Successfully set to 1

🔄 [2/9] Processing: Easy Walk → Position 2
🔄 Session ID: 25879b4c-...
🔄 Setting session 25879b4c-... to order_index = 2
🔄 ✓ Successfully set to 2

🔄 [3/9] Processing: Tall Kneeling Landmine Press → Position 3
🔄 ✓ Successfully set to 3

... (all 9 items successfully updated to positions 1-9)

🔄 ========== RELOADING DATA ==========
🔍 Checking blocks for groups: Array(9) [...]
🔄 ========== REORDER COMPLETE ==========
```

**ALL DATABASE UPDATES SUCCEED**, but the UI still shows the old order!

## Current Code

### Reordering Logic
```typescript
// If both items are standalone (not in groups), reorder standalone items
if (!srcG && !dstG) {
  try {
    const standaloneItems = itemsByDay[dayIdA] || [];
    const fromIdx = standaloneItems.findIndex(it => it.id === activeItemId);
    const toIdx = standaloneItems.findIndex(it => it.id === overItemId);
    
    if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) {
      return;
    }
    
    // Reorder in memory
    const reordered = arrayMove(standaloneItems, fromIdx, toIdx);
    
    // DON'T update UI state yet - it causes premature reload!
    // setItemsByDay will be updated after loadDayGroups() completes
    
    // TWO-PHASE UPDATE to avoid conflicts when moving to position 1:
    // Phase 1: Set all to temporary negative values to break existing order
    for (let i = 0; i < reordered.length; i++) {
      const item = reordered[i];
      
      const { data: itemData, error: itemError } = await supabase
        .from('session_block_items')
        .select('id, block_id, session_blocks!inner(id, session_id)')
        .eq('id', item.id)
        .single();
      
      if (!itemData || !(itemData as any).session_blocks) {
        continue;
      }
      
      const sessionId = (itemData as any).session_blocks.session_id;
      
      // Set to temporary negative value
      await supabase
        .from('sessions')
        .update({ order_index: -999 })
        .eq('id', sessionId);
    }
    
    // Phase 2: Assign final order_index values (1-based)
    for (let idx = 0; idx < reordered.length; idx++) {
      const item = reordered[idx];
      const orderIndex = idx + 1; // 1-based indexing
      
      const { data: itemData, error: itemError } = await supabase
        .from('session_block_items')
        .select('id, block_id, session_blocks!inner(id, session_id)')
        .eq('id', item.id)
        .single();
      
      if (!itemData || !(itemData as any).session_blocks) {
        continue;
      }
      
      const sessionId = (itemData as any).session_blocks.session_id;
      
      // Set final order_index
      await supabase
        .from('sessions')
        .update({ order_index: orderIndex })
        .eq('id', sessionId);
    }
    
    toast({ description: 'Reordered exercises' });
    await loadDayGroups(dayIdA);
  } catch(e) {
    console.error('Reorder failed:', e);
    toast({ description: 'Failed to reorder', variant: 'destructive' as any });
  }
  return;
}
```

### Data Loading Logic
```typescript
async function loadDayGroups(dayId: string) {
  const sess = await supabase
    .from('sessions')
    .select('id,name,order_index,collapsed,session_blocks(id,block_type,title,parameters,rounds,rest_between_rounds_s,time_cap_sec,work_sec,rest_sec,intensity,session_block_items(id,exercise_id,item_order,status))')
    .eq('plan_day_id', dayId)
    .order('order_index', { ascending: true });
  
  if (sess.error) { 
    setGroupsByDay(prev=>({ ...prev, [dayId]: [] })); 
    return; 
  }

  // Build blocks list preserving session and block order
  const blocks = (sess.data || []).flatMap((s:any)=> {
    const arr = Array.isArray(s.session_blocks) ? s.session_blocks : (s.session_blocks ? [s.session_blocks] : []);
    // Sort blocks within a session by order_index to preserve import order
    arr.sort((a:any,b:any)=> (a?.order_index ?? 0) - (b?.order_index ?? 0));
    return arr.map((b:any)=> ({
      sessionId: String(s.id),
      sessionName: s.name || '',
      sessionOrderIndex: s.order_index ?? 0,
      sessionCollapsed: s.collapsed ?? false,
      blockId: String(b.id),
      blockType: b.block_type || 'standard',
      blockTitle: b.title || '',
      blockParameters: b.parameters || {},
      rounds: b.rounds,
      restBetweenRounds: b.rest_between_rounds_s,
      timeCap: b.time_cap_sec,
      workSec: b.work_sec,
      restSec: b.rest_sec,
      intensity: b.intensity,
      items: (b.session_block_items || []).map((it:any)=> ({
        id: String(it.id),
        exerciseId: String(it.exercise_id),
        itemOrder: it.item_order ?? 0,
        status: it.status || 'draft'
      }))
    }));
  });

  // Separate grouped vs standalone
  const grouped = blocks.filter(b => b.blockType !== 'standard');
  const standalone = blocks.filter(b => b.blockType === 'standard');

  // Build standalone items list
  const standaloneItems = standalone.flatMap(b => 
    b.items.map(it => ({
      ...it,
      sessionId: b.sessionId,
      sessionOrderIndex: b.sessionOrderIndex,
      blockId: b.blockId
    }))
  );

  // Sort standalone items by session order_index
  standaloneItems.sort((a, b) => a.sessionOrderIndex - b.sessionOrderIndex);

  // Enrich with exercise data
  const enriched = await Promise.all(
    standaloneItems.map(async (it) => {
      const ex = exercises.find(e => e.id === it.exerciseId);
      return {
        ...it,
        name: ex?.name || 'Unknown',
        modality: ex?.modality || 'strength',
        extra: {}
      };
    })
  );

  setItemsByDay(prev => ({ ...prev, [dayId]: enriched }));
  setGroupsByDay(prev => ({ ...prev, [dayId]: grouped }));
}
```

## Questions for ChatGPT

1. **Why doesn't the UI update after successful database updates?**
   - All `order_index` values are correctly updated in the database (verified by logs)
   - `loadDayGroups()` is called after updates complete
   - Query uses `.order('order_index', { ascending: true })`
   - But UI still shows old order

2. **Is there a caching issue with Supabase queries?**
   - Do we need to invalidate cache?
   - Should we add a timestamp or force refresh?

3. **Is the sorting logic correct?**
   - We sort by `sessionOrderIndex` after loading
   - Is this being overwritten somewhere?

4. **Could there be a race condition?**
   - Multiple state updates happening?
   - React batching causing issues?

5. **Should we use a different approach entirely?**
   - Maybe update `item_order` instead of `order_index`?
   - Use a single RPC function for atomic updates?
   - Different data structure?

## Additional Context
- Using React + TypeScript + Supabase
- Using `@dnd-kit/core` for drag and drop
- Each exercise is: `item → block → session`
- Most exercises are "standalone" (1 session → 1 block → 1 item)
- Sessions are ordered by `order_index` (1-based)
- UI is built from `itemsByDay` state which is populated by `loadDayGroups()`

