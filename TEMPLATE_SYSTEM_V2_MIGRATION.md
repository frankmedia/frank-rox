# Template System V2 - Migration Guide

## 🎯 Overview

Complete rebuild of the template system based on the **PT Web App Technical Spec**. The new system enables:
- **Template-driven program generation** with automatic exercise resolution
- **Day types** (Strength, Mobility, Heat, Consolidation, etc.)
- **Block-based structure** (WarmUp → Main Lift → Accessory → Cooldown)
- **Defaults matrix** for automatic prescription resolution
- **Exercise pools** for filtered selection
- **Immutable program instances** (audit trail)

---

## 📦 Migration Files

### **SQL Files (Run in Order)**

1. **`supabase_template_system_v2_PART1_drop_old.sql`**
   - Drops all old template tables
   - Safe to run (no one using templates yet)

2. **`supabase_template_system_v2_PART2_new_schema.sql`**
   - Creates new enums (DayType, BlockType, MobilityCategory, etc.)
   - Creates 13 new tables (templates, days, blocks, exercises, defaults, pools, instances)
   - Adds indexes and foreign keys

3. **`supabase_template_system_v2_PART3_seed_defaults.sql`**
   - Seeds ~70 default prescription rules
   - Covers all day types × block types (e.g., Strength+UpperBody = 5×5 @ 75% 1RM)

### **TypeScript Files**

4. **`src/types/template-system-v2.ts`**
   - All interfaces matching database schema
   - Enums for type safety
   - API request/response types
   - UI/view models

---

## 🗂️ New Database Schema

### **Core Template Tables**
```
program_templates (name, days_per_week, version)
  ↓
day_templates (day_index, day_type, mobility_category, title)
  ↓
blocks (order_index, block_type, use_defaults, intensity)
  ↓
block_exercises (exercise_id, sets, reps, intensity, prescription_source)
```

### **Defaults & Rules**
```
day_type_defaults (day_type × block_type → default prescription)
exercise_pools (label, filters)
day_template_exercise_pool_links (biases exercise selection)
```

### **Generated Instances (Immutable)**
```
program_instances (athlete_id, start_date, weeks, snapshot_version)
  ↓
program_days (calendar_date, day_type, title)
  ↓
program_blocks (order_index, block_type, title)
  ↓
program_exercises (exercise_id, RESOLVED sets/reps/intensity)
```

---

## 🔑 Key Concepts

### **DayType (enum)**
- **Strength**: Heavy compound lifts (5×5, 75% 1RM)
- **Mobility**: Flow patterns, holds (3×45s)
- **Consolidation**: Technique work (3×3, light)
- **Heat**: HIIT/MetCon (6×60s @ RPE 8)
- **Recovery**: Light movement (2×90s)
- **Technique**: Skill development (5×3 @ RPE 5)
- **Custom**: Fallback

### **BlockType (enum)**
- **WarmUp**, **Mobility**, **Stretch**
- **UpperBody**, **LowerBody**, **Squat**, **Hinge**, **Push**, **Pull**
- **Core**, **Conditioning**, **Accessory**, **Finisher**, **Cooldown**, **Technique**

### **MobilityCategory (enum)**
- **Push**, **Pull**, **Legs** (biases exercise selection)

### **Prescription Resolution**
1. Check if block_exercise has explicit sets/reps
2. If not, look up `day_type_defaults[(day_type, block_type)]`
3. If missing → validation error
4. Result stored as `ProgramExercise` with `source_info`

---

## 🚀 Quick Start (After Migration)

### **1. Run SQL Migrations**
```bash
# In Supabase SQL Editor:
# Run PART1 → PART2 → PART3 in order
```

### **2. Verify Schema**
```sql
-- Check tables created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'program_%' OR table_name LIKE 'day_%' OR table_name LIKE 'block%';

-- Check defaults seeded
SELECT day_type, block_type, default_sets, default_reps 
FROM day_type_defaults 
ORDER BY day_type, block_type;
```

### **3. Update Code**
```typescript
// Import new types
import {
  ProgramTemplate,
  DayTemplate,
  Block,
  BlockExercise,
  DayType,
  BlockType,
  MobilityCategory
} from '@/types/template-system-v2';

// Use enums for type safety
const dayType: DayType = DayType.Strength;
const blockType: BlockType = BlockType.UpperBody;
```

---

## 📋 Next Steps

### **Phase 1: Resolution Engine** (Priority 1)
Build `src/services/template-resolution-engine.ts`:
- Load template with all nested data
- Map days to calendar dates
- Resolve prescriptions via defaults
- Generate immutable ProgramInstance

### **Phase 2: Template Builder UI** (Priority 2)
Update `/admin/templates/new`:
- Step 1: Choose `days_per_week` (1-7)
- Step 2: Configure each day (day_type, mobility_category, title)
- Step 3: Add/arrange blocks (drag-and-drop)
- Step 4: Add exercises to blocks (explicit or via pools)
- Live preview of resolved prescriptions

### **Phase 3: Defaults Manager UI** (Priority 3)
Create `/admin/defaults`:
- Matrix editor (day_type × block_type)
- Quick presets (5×5 Strength, 3×12 Hypertrophy)
- Import/export defaults

### **Phase 4: Generation Wizard** (Priority 4)
Create `/admin/programs/generate`:
- Select athlete + template
- Choose start_date + weeks
- Map days to weekdays (optional)
- Preview before generating
- One-click generate immutable instance

---

## 🔄 Comparison: Old vs New

| Feature | Old System | New System V2 |
|---------|-----------|---------------|
| **Template Structure** | Flat movement requirements | Nested days → blocks → exercises |
| **Day Types** | ❌ None | ✅ 7 types (Strength, Mobility, Heat, etc.) |
| **Block Structure** | ❌ None | ✅ 16 types (WarmUp, UpperBody, Squat, etc.) |
| **Defaults** | ❌ Manual | ✅ Automatic resolution |
| **Exercise Selection** | ❌ Manual | ✅ Pools with filters |
| **Generation** | Creates empty days | Creates fully populated program |
| **Immutability** | ❌ Editable | ✅ Snapshot with version |
| **Audit Trail** | ❌ None | ✅ source_info tracks origin |

---

## 🎨 Example: 5-Day Strength Template

```json
{
  "name": "5-Day Push/Pull/Legs",
  "days_per_week": 5,
  "days": [
    {
      "day_index": 1,
      "day_type": "Strength",
      "mobility_category": "Push",
      "title": "Push Day",
      "blocks": [
        {"order": 1, "block_type": "WarmUp"},    // → 1 set × 5 min
        {"order": 2, "block_type": "Mobility"},  // → 2 sets × 60s
        {"order": 3, "block_type": "Push"},      // → 5 sets × 5 reps @ 75%
        {"order": 4, "block_type": "Accessory"}, // → 3 sets × 12 reps @ RPE 7
        {"order": 5, "block_type": "Cooldown"}   // → 1 set × 5 min
      ]
    },
    {
      "day_index": 2,
      "day_type": "Strength",
      "mobility_category": "Pull",
      "title": "Pull Day",
      "blocks": [
        {"order": 1, "block_type": "WarmUp"},
        {"order": 2, "block_type": "Mobility"},
        {"order": 3, "block_type": "Pull"},      // → 5 sets × 5 reps @ 75%
        {"order": 4, "block_type": "Accessory"},
        {"order": 5, "block_type": "Cooldown"}
      ]
    },
    // ... days 3, 4, 5
  ]
}
```

When generated → all blocks resolve prescriptions from defaults → ready-to-execute program!

---

## ✅ Validation Rules

Before generation:
- ✅ `days_per_week` matches number of `day_templates`
- ✅ Each `day_template` has ≥1 `block`
- ✅ Each `block_exercise` has explicit prescription OR resolvable default
- ✅ No duplicate `order_index` within siblings
- ✅ All required block types present (e.g., Strength day needs main lift)

---

## 🐛 Troubleshooting

**Q: "Missing default for (day_type, block_type)"**
A: Add entry to `day_type_defaults` or make prescription explicit

**Q: "Exercise pool resolves to 0 exercises"**
A: Adjust filters or tag more exercises

**Q: "Both reps and time_seconds provided"**
A: Use `time_seconds` for conditioning/mobility, `reps` as cue

---

## 📚 References

- **Technical Spec**: See original PT Web App spec (13 sections)
- **Defaults Matrix**: `supabase_template_system_v2_PART3_seed_defaults.sql`
- **Type Definitions**: `src/types/template-system-v2.ts`
- **Resolution Algorithm**: Spec Section 8 (pseudo-code provided)

---

## 🎯 Success Criteria

- [x] Old template tables dropped
- [x] New schema created with 13 tables
- [x] 70+ defaults seeded
- [x] TypeScript interfaces match schema
- [ ] Resolution engine built
- [ ] Template builder UI updated
- [ ] Generation wizard created
- [ ] First template created & tested
- [ ] First program generated successfully


