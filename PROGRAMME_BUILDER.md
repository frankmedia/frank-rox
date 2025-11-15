## Programme Builder Overview

`src/pages/ProgrammeBuilder.tsx` is the planning brain that assembles the 14‑day training plan before anything hits Supabase. Understanding the flow makes it easier to insert new sessions (e.g., Ski‑Row Threshold or Light Mobility) without breaking the schedule.

---

### 1. Inputs & local state

- Pulls user preferences from onboarding (training days, runs per week, cardio/strength focus, taper flags, equipment list, etc.).
- Maintains a mutable `sessions: SessionBlock[]` array. Each entry has `{ day, type, title, effort, distance, detail }`.
- Tracks which weekday labels are already used via `usedDays`.

### 2. Day allocation helper

```ts
const getNextDay = (preferredDays: string[]) => { ... };
```

- Returns the first available day from `preferredDays`. If all are taken, falls back to any unused weekday.
- Always call `usedDays.add(day)` after scheduling to prevent collisions.

### 3. Session creation order

1. **Running block**
   - Adds long run, intervals, tempo, hills, recovery runs based on `runsPerWeek`.
   - Each push uses `type: "run"` and sets `distance`, `pace`, and `detail` strings (`detail` is later used by the run generator).

2. **Strength block**
   - Adds lower, upper, and optional full-body sessions according to `requestedStrength`.
   - Titles like `"Strength Lower"` inform the strength generator which template to load.

3. **Cardio / Conditioning**
   - Calculates how many standalone cardio days remain.
   - Uses `selectCardioWorkout` to choose a template (`machine-endurance`, `ski-row-threshold`, etc.) and pushes `type: "cardio"` sessions with that name.
   - This is where Ski‑Row Threshold must be scheduled if you want it in Week 1.

4. **Recovery & mobility**
   - Add `{ type: "recovery", title, detail }` entries for rest days.
   - To trigger the 5‑minute flow, set `detail: "light-mobility"` (or another agreed key). `createPlanInDatabase`/`generateRecoveryWorkout` can map that to `sessionType: "light-mobility"` when calling `createRecoverySession`.

5. **Extras / fillers**
   - If training days remain unused, the builder can add bonus cardio or mobility sessions to reach the requested weekly volume.

### 4. Output contract

The final `sessions` array plus metadata (`blockNumber`, `focus`, etc.) is returned to `createPlanInDatabase()`. For each entry:

- `type` decides which generator to call: run, strength, cardio, or recovery.
- `title/detail` drive template selection (e.g., `"Strength Upper"` → upper-day lifts, `detail === "light-mobility"` → 5‑min flow).
- `day` matches against `plan_days.description` (`"Monday"`, `"Tuesday"`, …). Ensure every session uses a weekday label that actually exists in the 14‑day shell.

---

### Adding a new Day 2 Light Mobility

```ts
const day2 = getNextDay(["Tuesday"]);
sessions.push({
  day: day2,
  type: "recovery",
  title: "Light Mobility Flow",
  effort: "easy",
  detail: "light-mobility",
});
usedDays.add(day2);
```

Then, inside `generateRecoveryWorkout`, translate `session.detail === "light-mobility"` into `sessionType: "light-mobility"` when calling `createRecoverySession`.

---

Keep this sequence in mind whenever you need to guarantee a workout (Hyrox sim, Ski‑Row Threshold, mobility flow) appears automatically in the 14‑day plan—if it isn’t scheduled here, it’ll never reach Supabase. 

