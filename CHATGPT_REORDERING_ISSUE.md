# CMS Reordering Issue - Cannot Move Items to Position 1

## Problem
In our React/TypeScript CMS admin panel using Supabase and DndKit, we **cannot reorder exercises to position 1**. Moving items to any other position works, but moving to position 1 fails silently.

## Database Schema

```sql
-- sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  plan_day_id UUID REFERENCES plan_days(id),
  name TEXT,
  order_index INTEGER,  -- 1-based position in the day
  collapsed BOOLEAN,
  -- ... other fields
);

-- session_blocks table
CREATE TABLE session_blocks (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES sessions(id),
  block_type TEXT,  -- 'standard', 'hiit', 'circuit', 'amrap'
  -- ... other fields
);

-- session_block_items table
CREATE TABLE session_block_items (
  id UUID PRIMARY KEY,
  block_id UUID REFERENCES session_blocks(id),
  exercise_id UUID REFERENCES exercises(id),
  item_order INTEGER,  -- Order within the block
  extra JSONB,  -- Contains sets, reps, weight, etc.
  -- ... other fields
);
```

## Data Structure
- Each **exercise** is a `session_block_item`
- Each item belongs to a `session_block`
- Each block belongs to a `session`
- Sessions are ordered by `order_index` (1, 2, 3, ...)
- Most exercises are "standalone" (1 session → 1 block → 1 item)

## Current Reordering Code

```typescript
// When user drags exercise A to position of exercise B
const handleDragEnd = async (event: DragEndEvent) => {
  const { active, over } = event;
  if (!over || active.id === over.id) return;
  
  const activeId = String(active.id);
  const overId = String(over.id);
  
  // For standalone items (format: "item:ITEM_ID:DAY_ID")
  if (activeId.startsWith('item:') && overId.startsWith('item:')) {
    const [, activeItemId, dayIdA] = activeId.split(':');
    const [, overItemId, dayIdB] = overId.split(':');
    
    if (dayIdA !== dayIdB) return; // Different days
    
    // Check if items are in groups
    const srcG = groupsByDay[dayIdA]?.find(g => 
      g.items.some(it => it.id === activeItemId)
    );
    const dstG = groupsByDay[dayIdA]?.find(g => 
      g.items.some(it => it.id === overItemId)
    );
    
    // If both items are standalone (not in groups), reorder standalone items
    if (!srcG && !dstG) {
      try {
        const standaloneItems = itemsByDay[dayIdA] || [];
        const fromIdx = standaloneItems.findIndex(it => it.id === activeItemId);
        const toIdx = standaloneItems.findIndex(it => it.id === overItemId);
        
        if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) {
          return;
        }
        
        // Reorder in memory (visual update)
        const reordered = arrayMove(standaloneItems, fromIdx, toIdx);
        setItemsByDay(prev => ({ ...prev, [dayIdA]: reordered }));
        
        // Update each session's order_index based on new position
        for (let idx = 0; idx < reordered.length; idx++) {
          const item = reordered[idx];
          const orderIndex = idx + 1; // 1-based indexing
          
          // Get session via: item -> block -> session (one query with join)
          const { data: itemData } = await supabase
            .from('session_block_items')
            .select('id, block_id, session_blocks!inner(id, session_id)')
            .eq('id', item.id)
            .single();
          
          if (!itemData || !(itemData as any).session_blocks) {
            continue;
          }
          
          const sessionId = (itemData as any).session_blocks.session_id;
          
          // Simply update the session's order_index
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
  }
  // ... (other reordering logic for groups)
};
```

## Example Scenario

**Before:**
```
Position 1: Exercise A (session_id: aaa, order_index: 1)
Position 2: Exercise B (session_id: bbb, order_index: 2)
Position 3: Exercise C (session_id: ccc, order_index: 3)
```

**User Action:** Drag Exercise C to position 1 (before Exercise A)

**Expected After:**
```
Position 1: Exercise C (session_id: ccc, order_index: 1)
Position 2: Exercise A (session_id: aaa, order_index: 2)
Position 3: Exercise B (session_id: bbb, order_index: 3)
```

**What Happens:** Nothing changes. Exercise C stays at position 3.

## What Works
- Moving from position 1 to position 2 ✅
- Moving from position 2 to position 3 ✅
- Moving from position 3 to position 2 ✅
- Moving from position 2 to position 1 ❌ **FAILS**
- Moving from position 3 to position 1 ❌ **FAILS**

## Suspected Issues
1. **Unique constraint conflict?** When updating order_index sequentially, might hit conflicts
2. **Off-by-one error?** The `idx + 1` logic might be wrong
3. **Race condition?** Multiple updates happening simultaneously
4. **DndKit issue?** The `arrayMove` might not be calculating the correct indices

## Questions
1. How should we update `order_index` to avoid conflicts? (Set to negative first? Use a transaction?)
2. Is the loop logic correct for updating all positions?
3. Should we use a batch update instead of individual updates?
4. Is there a better approach to reordering in Supabase?

## Additional Context
- Using `@dnd-kit/core` and `@dnd-kit/sortable`
- `arrayMove` is from `@dnd-kit/sortable`
- No unique constraints on `order_index` in the database
- No foreign key cascades that would prevent updates

