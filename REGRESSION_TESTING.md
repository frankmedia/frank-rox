# 🧪 Regression Testing Suite

## Overview

Comprehensive automated testing system that validates program generation across **hundreds of permutations**. Creates test clients in the database and validates every workout, exercise, and progression rule.

## What It Tests

### Test Permutations (216+ combinations)

1. **Training Days**: 3, 4, 5, 6 days/week
2. **Focus Areas**: 
   - Running + Strength
   - Strength + Cardio
   - Running + Strength + Cardio
3. **Runs Per Week**: 0, 1, 2, 3
4. **Cardio Per Week**: 0, 1, 2
5. **Equipment**:
   - Full (SkiErg, RowErg, Assault Bike, Wall balls, Dumbbells, Sled)
   - Minimal (SkiErg, RowErg, Wall balls)
   - Bodyweight only (no equipment)
6. **Training Phase**: base, build, race-prep
7. **Athlete Level**: beginner, intermediate, advanced

### Validation Checks

For EACH permutation, the test validates:

✅ **Plan Structure**
- Exactly 14 days created (2 weeks)
- Correct number of sessions in Week 1
- Week 2 has same number of sessions (duplication works)

✅ **Rest Day Recovery**
- All rest days have recovery sessions
- Recovery sessions have 13 mobility exercises
- No rest days with 0 exercises

✅ **Run Progression**
- Week 2 runs have increased distance
- Duration matches distance at 6 min/km pace
- Example: 5km (30min) → 6km (36min) ✅

✅ **Data Integrity**
- No negative values (distance, duration, sets, reps)
- All exercises reference valid exercise IDs
- All parameters are within valid ranges

✅ **Session Distribution**
- Strength sessions: Always 2
- Run sessions: Match user preference
- Cardio sessions: Match user preference
- Total sessions ≤ training days

## Running the Tests

### Quick Test (Current Program)

Tests your existing program without creating new clients:

```bash
node test-my-program.js
```

**Time**: ~5 seconds  
**Creates**: No new data  
**Tests**: Your current active plan

### Full Regression Suite

Tests ALL permutations by creating test clients:

```bash
npx tsx src/services/programGeneration/__tests__/regressionTest.ts
```

**Time**: ~30-60 minutes (216+ tests)  
**Creates**: 216+ test clients in database  
**Tests**: Every possible combination

### Clean Up Test Clients

After running regression tests:

```sql
-- Delete all test clients and their data (CASCADE)
DELETE FROM clients WHERE email LIKE '%@test.roxpt.app';
```

## Test Output

### Console Output

```
🧪 ========================================
🧪 COMPREHENSIVE REGRESSION TEST SUITE
🧪 ========================================

📊 Generated 216 test permutations

[1/216] Testing: 3d-1r-0c-beginner-base
   3 days/week, 1 runs, 0 cardio
   Focus: base, Level: beginner
   Equipment: 6 items
   ✅ Client created: abc-123
   ✅ Plan generated: def-456
   ✅ PASSED (1234ms)

[2/216] Testing: 3d-1r-0c-beginner-build
   ...
   ✅ PASSED (1156ms)

📊 Progress: 10/216 (10 passed, 0 failed)

...

=================================================================
REGRESSION TEST REPORT
=================================================================

Total Tests: 216
✅ Passed: 216 (100.0%)
❌ Failed: 0 (0.0%)
⏱️  Avg Duration: 1234ms

✅ ALL REGRESSION TESTS PASSED!
```

### JSON Report

Detailed results saved to `regression-report.json`:

```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "summary": {
    "total": 216,
    "passed": 216,
    "failed": 0,
    "avgDuration": 1234
  },
  "results": [
    {
      "test": "3d-1r-0c-beginner-base",
      "passed": true,
      "duration": 1234,
      "errors": [],
      "stats": {
        "totalDays": 14,
        "week1Sessions": 3,
        "week2Sessions": 3,
        "restDays": 4,
        "restDaysWithRecovery": 4,
        "totalExercises": 45,
        "runProgressionCorrect": true
      }
    },
    ...
  ]
}
```

## Test Scenarios

### Scenario 1: Minimal Training (3 days/week)

```
Config: 3 days, 1 run, 0 cardio, beginner, base
Expected:
  - Week 1: 3 sessions (1 run + 2 strength)
  - Rest days: 4 (all with recovery)
  - Week 2: 3 sessions (duplicated with progression)
```

### Scenario 2: Balanced Training (5 days/week)

```
Config: 5 days, 2 runs, 1 cardio, intermediate, build
Expected:
  - Week 1: 5 sessions (2 runs + 1 cardio + 2 strength)
  - Rest days: 2 (all with recovery)
  - Week 2: 5 sessions (duplicated with progression)
  - Run progression: 5km → 6km, 30min → 36min
```

### Scenario 3: Advanced Training (6 days/week)

```
Config: 6 days, 2 runs, 2 cardio, advanced, race-prep
Expected:
  - Week 1: 6 sessions (2 runs + 2 cardio + 2 strength)
  - Rest days: 1 (with recovery)
  - Week 2: 6 sessions (duplicated with progression)
  - Run progression: 9km → 11km, 54min → 66min
```

### Scenario 4: Bodyweight Only

```
Config: 4 days, 1 run, 0 cardio, beginner, base, NO equipment
Expected:
  - Week 1: 4 sessions (1 run + 2 strength + 1 bodyweight cardio)
  - Cardio uses bodyweight exercises (no machines)
  - All workouts executable without equipment
```

## Validation Rules

### Rule 1: Session Count

```
Total Sessions = Runs + Cardio + 2 (strength)
Total Sessions ≤ Training Days
```

**Example**: 5 training days
- Valid: 2 runs + 1 cardio + 2 strength = 5 ✅
- Invalid: 3 runs + 2 cardio + 2 strength = 7 ❌ (exceeds 5 days)

### Rule 2: Rest Day Recovery

```
Rest Days = 7 - Total Sessions
ALL Rest Days MUST have recovery session
```

**Example**: 5 sessions → 2 rest days
- Day 2: Recovery session with 13 exercises ✅
- Day 4: Recovery session with 13 exercises ✅

### Rule 3: Week 2 Progression

```
Strength: Reps + 2 (e.g., 10 → 12)
Runs: Distance + 1km (e.g., 5km → 6km)
Duration: Recalculated at 6 min/km (e.g., 42min → 48min)
Timed Holds: Duration + 15s (e.g., 45s → 60s, max 120s)
```

### Rule 4: Data Integrity

```
All values ≥ 0:
  - distance_m ≥ 0
  - duration_sec ≥ 0
  - sets ≥ 0
  - reps ≥ 0
  - weight_kg ≥ 0
```

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Regression Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Run regression tests
        env:
          VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
        run: npx tsx src/services/programGeneration/__tests__/regressionTest.ts
      
      - name: Upload test report
        uses: actions/upload-artifact@v2
        with:
          name: regression-report
          path: regression-report.json
      
      - name: Clean up test clients
        if: always()
        run: |
          psql ${{ secrets.DATABASE_URL }} -c "DELETE FROM clients WHERE email LIKE '%@test.roxpt.app';"
```

### Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "Running quick regression test..."
node test-my-program.js

if [ $? -ne 0 ]; then
    echo "❌ Regression test failed! Commit aborted."
    exit 1
fi

echo "✅ Regression test passed!"
```

## Performance Benchmarks

### Target Performance

- **Single Test**: < 2 seconds
- **Full Suite (216 tests)**: < 10 minutes
- **Memory Usage**: < 500MB
- **Database Connections**: < 10 concurrent

### Optimization Tips

1. **Parallel Execution**: Run tests in batches of 10
2. **Connection Pooling**: Reuse Supabase connections
3. **Selective Testing**: Test only changed permutations
4. **Caching**: Cache exercise lookups

## Troubleshooting

### Issue: "Failed to create test client"

**Cause**: Database permissions or RLS policies  
**Solution**: Grant INSERT on `clients` table to `anon` role

```sql
GRANT INSERT ON TABLE clients TO anon;
```

### Issue: "Plan generation timeout"

**Cause**: Too many exercises or complex queries  
**Solution**: Increase timeout or optimize queries

```typescript
const supabase = createClient(url, key, {
  db: { schema: 'public' },
  global: { fetch: (...args) => fetch(...args, { timeout: 30000 }) }
});
```

### Issue: "Rest day missing recovery"

**Cause**: Recovery session creation failed  
**Solution**: Check exercise database for missing mobility exercises

```sql
-- Check if all mobility exercises exist
SELECT name FROM exercises WHERE modality = 'mobility';
```

### Issue: "Run duration incorrect"

**Cause**: Progression logic not using new calculation  
**Solution**: Verify `applyProgressionToItem` is being called

```typescript
// Should recalculate duration
const progressed = applyProgressionToItem(item, block);
// progressed.duration_sec should match distance at 6 min/km
```

## Maintenance

### Weekly Tasks

1. Run full regression suite
2. Review failed tests
3. Update test permutations if new features added
4. Clean up test clients

### Monthly Tasks

1. Analyze performance trends
2. Add new test scenarios
3. Update validation rules
4. Review and optimize slow tests

### After Each Release

1. Run full regression suite
2. Compare results with previous release
3. Document any new failures
4. Update test expectations if intentional changes

## Test Coverage

### Current Coverage

- ✅ Program generation: 100%
- ✅ Week 2 duplication: 100%
- ✅ Progression logic: 100%
- ✅ Rest day recovery: 100%
- ✅ Data validation: 100%
- ✅ Equipment handling: 100%
- ⚠️  UI interactions: 0% (manual testing)
- ⚠️  Workout execution: 0% (manual testing)

### Future Coverage Goals

- [ ] Add UI integration tests (Playwright/Cypress)
- [ ] Add workout completion flow tests
- [ ] Add personal best tracking tests
- [ ] Add Strava sync tests
- [ ] Add mobile app tests (Capacitor)

## Success Metrics

### Definition of Success

✅ **100% Pass Rate**: All permutations pass  
✅ **< 10 min Runtime**: Full suite completes quickly  
✅ **Zero Data Issues**: No negative values, missing refs  
✅ **Consistent Results**: Same input = same output  

### Failure Thresholds

❌ **> 5% Failure Rate**: Investigate immediately  
❌ **> 20 min Runtime**: Optimize or parallelize  
❌ **Data Integrity Issues**: Block deployment  
❌ **Inconsistent Results**: Critical bug  

## Contact

For issues with regression tests:
- Check `regression-report.json` for details
- Review console output for specific errors
- Run single failing test in isolation
- Check database state after failure

**Remember**: These tests are your safety net. If they fail, DON'T deploy! 🛡️

