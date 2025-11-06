package com.roxpt.app

import android.content.Intent
import android.util.Log
import androidx.activity.result.ActivityResult
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.HealthConnectClient.Companion.SDK_AVAILABLE
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.DistanceRecord
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.TotalCaloriesBurnedRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.SpeedRecord
import androidx.health.connect.client.records.PowerRecord
import androidx.health.connect.client.records.ElevationGainedRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import androidx.health.connect.client.units.Energy
import androidx.health.connect.client.units.Length
import androidx.health.connect.client.units.Power
import androidx.health.connect.client.units.Velocity
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.Duration
import kotlin.math.min
import kotlin.math.max

@CapacitorPlugin(name = "AppHealth")
class AppHealthPlugin : Plugin() {

    private val logTag = "AppHealthPlugin"
    private val ioScope = CoroutineScope(Dispatchers.IO)

    private val healthConnectClient: HealthConnectClient? by lazy {
        try {
            HealthConnectClient.getOrCreate(context)
        } catch (e: Exception) {
            Log.e(logTag, "Error creating HealthConnectClient", e)
            null
        }
    }

    // Permissions we need
    private val requiredPermissions: Set<String> by lazy {
        setOf(
            HealthPermission.getReadPermission(StepsRecord::class),
            HealthPermission.getReadPermission(HeartRateRecord::class),
            HealthPermission.getReadPermission(SleepSessionRecord::class),
            HealthPermission.getReadPermission(DistanceRecord::class),
            HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class),
            HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class),
            HealthPermission.getReadPermission(ExerciseSessionRecord::class),
            HealthPermission.getReadPermission(SpeedRecord::class),
            HealthPermission.getReadPermission(PowerRecord::class),
            HealthPermission.getReadPermission(ElevationGainedRecord::class)
        )
    }

    // The Health Connect contract (used to build intent and parse result)
    private val permissionContract = PermissionController.createRequestPermissionResultContract()

    @PluginMethod
    fun isAvailable(call: PluginCall) {
        Log.d(logTag, "isAvailable() called")
        val status = HealthConnectClient.getSdkStatus(context)
        val js = JSObject()
        js.put("platform", "android")
        js.put("status", status.toString())
        js.put("available", status == SDK_AVAILABLE && healthConnectClient != null)
        call.resolve(js)
    }

    @PluginMethod
    fun requestHealthPermissions(call: PluginCall) {
        Log.d(logTag, "requestHealthPermissions() called")

        val client = healthConnectClient
        if (client == null) {
            call.reject("HealthConnectClient not available")
            return
        }

        val act = activity
        if (act == null) {
            call.reject("No activity attached")
            return
        }

        ioScope.launch {
            try {
                val granted = client.permissionController.getGrantedPermissions()
                Log.d(logTag, "Currently granted: $granted")

                if (granted.containsAll(requiredPermissions)) {
                    Log.d(logTag, "All required permissions already granted")
                    val js = JSObject()
                    js.put("granted", true)
                    call.resolve(js)
                    return@launch
                }

                // Not all granted → launch Health Connect permission UI
                Log.d(logTag, "Missing permissions, launching Health Connect screen")

                // Use the Health Connect contract to build the intent
                val intent = permissionContract.createIntent(act, requiredPermissions)
                
                Log.d(logTag, "Intent action: ${intent.action}")
                Log.d(logTag, "Intent extras: ${intent.extras}")

                // IMPORTANT: startActivityForResult must be called on main thread
                bridge.executeOnMainThread {
                    startActivityForResult(call, intent, "onPermissionsResult")
                    Log.d(logTag, "startActivityForResult called")
                }

            } catch (e: Exception) {
                Log.e(logTag, "Error requesting permissions", e)
                e.printStackTrace()
                call.reject("Error requesting permissions: ${e.message}")
            }
        }
    }

    @ActivityCallback
    private fun onPermissionsResult(call: PluginCall?, result: ActivityResult) {
        Log.d(logTag, "onPermissionsResult() called, resultCode=${result.resultCode}")

        if (call == null) {
            Log.w(logTag, "onPermissionsResult: call is null")
            return
        }

        // Use the Health Connect contract to parse the result
        val granted: Set<String> = permissionContract.parseResult(
            result.resultCode,
            result.data
        )

        Log.d(logTag, "Health Connect granted set: $granted")

        val allGranted = granted.containsAll(requiredPermissions)

        val js = JSObject()
        js.put("granted", allGranted)
        call.resolve(js)
    }

    @PluginMethod
    fun getSteps(call: PluginCall) {
        val client = healthConnectClient
        if (client == null) {
            call.reject("HealthConnectClient not available")
            return
        }

        val startStr = call.getString("start")
        val endStr = call.getString("end")

        Log.d(logTag, "📊 getSteps() - Received start: $startStr, end: $endStr")

        if (startStr == null || endStr == null) {
            call.reject("start and end ISO timestamps are required")
            return
        }

        val start = try { Instant.parse(startStr) } catch (e: Exception) {
            call.reject("Invalid start time: $startStr")
            return
        }

        val end = try { Instant.parse(endStr) } catch (e: Exception) {
            call.reject("Invalid end time: $endStr")
            return
        }

        Log.d(logTag, "📊 getSteps() - Parsed start: $start, end: $end")

        ioScope.launch {
            try {
                val request = ReadRecordsRequest(
                    recordType = StepsRecord::class,
                    timeRangeFilter = TimeRangeFilter.between(start, end)
                )

                val response = client.readRecords(request)
                val total = response.records.sumOf { it.count.toLong() }

                Log.d(logTag, "📊 getSteps() - Found ${response.records.size} records, total steps: $total")
                response.records.forEach { record ->
                    Log.d(logTag, "  - Steps record: ${record.count} steps from ${record.startTime} to ${record.endTime}")
                }

                val js = JSObject()
                js.put("total", total)
                js.put("platform", "android")
                call.resolve(js)
            } catch (e: Exception) {
                Log.e(logTag, "Error reading steps", e)
                call.reject("Error reading steps: ${e.message}")
            }
        }
    }
    
    @PluginMethod
    fun getHeartRate(call: PluginCall) {
        val client = healthConnectClient
        if (client == null) {
            call.reject("HealthConnectClient not available")
            return
        }

        val startStr = call.getString("start")
        val endStr = call.getString("end")

        Log.d(logTag, "❤️ getHeartRate() - Received start: $startStr, end: $endStr")

        if (startStr == null || endStr == null) {
            call.reject("start and end ISO timestamps are required")
            return
        }

        val start = try { Instant.parse(startStr) } catch (e: Exception) {
            call.reject("Invalid start time: $startStr")
            return
        }

        val end = try { Instant.parse(endStr) } catch (e: Exception) {
            call.reject("Invalid end time: $endStr")
            return
        }

        Log.d(logTag, "❤️ getHeartRate() - Parsed start: $start, end: $end")

        ioScope.launch {
            try {
                val request = ReadRecordsRequest(
                    recordType = HeartRateRecord::class,
                    timeRangeFilter = TimeRangeFilter.between(start, end)
                )

                val response = client.readRecords(request)
                
                // Get all heart rate samples
                val samples = response.records.flatMap { record ->
                    record.samples.map { it.beatsPerMinute }
                }
                
                val average = if (samples.isNotEmpty()) {
                    samples.average().toInt()
                } else {
                    0
                }
                
                val max = samples.maxOrNull()?.toInt() ?: 0
                val min = samples.minOrNull()?.toInt() ?: 0

                Log.d(logTag, "❤️ getHeartRate() - Found ${response.records.size} records, ${samples.size} samples")
                Log.d(logTag, "❤️ getHeartRate() - Avg: $average, Min: $min, Max: $max")

                val js = JSObject()
                js.put("average", average)
                js.put("max", max)
                js.put("min", min)
                js.put("samples", samples.size)
                js.put("platform", "android")
                call.resolve(js)
            } catch (e: Exception) {
                Log.e(logTag, "Error reading heart rate", e)
                call.reject("Error reading heart rate: ${e.message}")
            }
        }
    }
    
    @PluginMethod
    fun getDistance(call: PluginCall) {
        val client = healthConnectClient
        if (client == null) {
            call.reject("HealthConnectClient not available")
            return
        }

        val startStr = call.getString("start")
        val endStr = call.getString("end")

        Log.d(logTag, "🏃 getDistance() - Received start: $startStr, end: $endStr")

        if (startStr == null || endStr == null) {
            call.reject("start and end ISO timestamps are required")
            return
        }

        val start = try { Instant.parse(startStr) } catch (e: Exception) {
            call.reject("Invalid start time: $startStr")
            return
        }

        val end = try { Instant.parse(endStr) } catch (e: Exception) {
            call.reject("Invalid end time: $endStr")
            return
        }

        Log.d(logTag, "🏃 getDistance() - Parsed start: $start, end: $end")

        ioScope.launch {
            try {
                val request = ReadRecordsRequest(
                    recordType = DistanceRecord::class,
                    timeRangeFilter = TimeRangeFilter.between(start, end)
                )

                val response = client.readRecords(request)
                val totalMeters = response.records.sumOf { it.distance.inMeters }
                val totalKm = totalMeters / 1000.0

                Log.d(logTag, "🏃 getDistance() - Found ${response.records.size} records, total: ${totalKm}km")

                val js = JSObject()
                js.put("kilometers", totalKm)
                js.put("meters", totalMeters)
                js.put("platform", "android")
                call.resolve(js)
            } catch (e: Exception) {
                Log.e(logTag, "Error reading distance", e)
                call.reject("Error reading distance: ${e.message}")
            }
        }
    }
    
    @PluginMethod
    fun getCalories(call: PluginCall) {
        val client = healthConnectClient
        if (client == null) {
            call.reject("HealthConnectClient not available")
            return
        }

        val startStr = call.getString("start")
        val endStr = call.getString("end")

        Log.d(logTag, "🔥 getCalories() - Received start: $startStr, end: $endStr")

        if (startStr == null || endStr == null) {
            call.reject("start and end ISO timestamps are required")
            return
        }

        val start = try { Instant.parse(startStr) } catch (e: Exception) {
            call.reject("Invalid start time: $startStr")
            return
        }

        val end = try { Instant.parse(endStr) } catch (e: Exception) {
            call.reject("Invalid end time: $endStr")
            return
        }

        Log.d(logTag, "🔥 getCalories() - Parsed start: $start, end: $end")

        ioScope.launch {
            try {
                val request = ReadRecordsRequest(
                    recordType = ActiveCaloriesBurnedRecord::class,
                    timeRangeFilter = TimeRangeFilter.between(start, end)
                )

                val response = client.readRecords(request)
                val totalKcal = response.records.sumOf { it.energy.inKilocalories }

                Log.d(logTag, "🔥 getCalories() - Found ${response.records.size} records, total: ${totalKcal.toInt()}kcal")

                val js = JSObject()
                js.put("calories", totalKcal.toInt())
                js.put("platform", "android")
                call.resolve(js)
            } catch (e: Exception) {
                Log.e(logTag, "Error reading calories", e)
                call.reject("Error reading calories: ${e.message}")
            }
        }
    }
    
    @PluginMethod
    fun getSleep(call: PluginCall) {
        val client = healthConnectClient
        if (client == null) {
            call.reject("HealthConnectClient not available")
            return
        }

        val startStr = call.getString("start")
        val endStr = call.getString("end")

        Log.d(logTag, "😴 getSleep() - Received start: $startStr, end: $endStr")

        if (startStr == null || endStr == null) {
            call.reject("start and end ISO timestamps are required")
            return
        }

        val start = try { Instant.parse(startStr) } catch (e: Exception) {
            call.reject("Invalid start time: $startStr")
            return
        }

        val end = try { Instant.parse(endStr) } catch (e: Exception) {
            call.reject("Invalid end time: $endStr")
            return
        }

        Log.d(logTag, "😴 getSleep() - Parsed start: $start, end: $end")

        ioScope.launch {
            try {
                val sessionRequest = ReadRecordsRequest(
                    recordType = SleepSessionRecord::class,
                    timeRangeFilter = TimeRangeFilter.between(start, end)
                )

                val sessionResponse = client.readRecords(sessionRequest)

                var inBedMinutes = 0L
                val stageTotals = mutableMapOf(
                    "awakeMinutes" to 0L,
                    "lightMinutes" to 0L,
                    "deepMinutes" to 0L,
                    "remMinutes" to 0L,
                    "outOfBedMinutes" to 0L
                )

                sessionResponse.records.forEach { record ->
                    inBedMinutes += Duration.between(record.startTime, record.endTime).toMinutes()

                    record.stages.forEach { stage ->
                        val stageMinutes = Duration.between(stage.startTime, stage.endTime).toMinutes()
                        when (stage.stage) {
                            SleepSessionRecord.STAGE_TYPE_AWAKE,
                            SleepSessionRecord.STAGE_TYPE_AWAKE_IN_BED -> stageTotals["awakeMinutes"] = stageTotals.getValue("awakeMinutes") + stageMinutes
                            SleepSessionRecord.STAGE_TYPE_LIGHT,
                            SleepSessionRecord.STAGE_TYPE_SLEEPING -> stageTotals["lightMinutes"] = stageTotals.getValue("lightMinutes") + stageMinutes
                            SleepSessionRecord.STAGE_TYPE_DEEP -> stageTotals["deepMinutes"] = stageTotals.getValue("deepMinutes") + stageMinutes
                            SleepSessionRecord.STAGE_TYPE_REM -> stageTotals["remMinutes"] = stageTotals.getValue("remMinutes") + stageMinutes
                            SleepSessionRecord.STAGE_TYPE_OUT_OF_BED -> stageTotals["outOfBedMinutes"] = stageTotals.getValue("outOfBedMinutes") + stageMinutes
                            else -> {}
                        }
                    }
                }

                val asleepMinutes = stageTotals["lightMinutes"]!! + stageTotals["deepMinutes"]!! + stageTotals["remMinutes"]!!
                val asleepHours = asleepMinutes / 60.0
                val inBedHours = inBedMinutes / 60.0
                val efficiency = if (inBedMinutes > 0) asleepMinutes.toDouble() / inBedMinutes else 0.0

                val targetMinutes = 7.5 * 60 // 7.5h target
                val quantityRatio = max(0.0, min(asleepMinutes / targetMinutes, 1.2))
                val quantityScore = (quantityRatio / 1.2) * 70.0
                val qualityRatio = if (asleepMinutes > 0) (stageTotals["deepMinutes"]!! + stageTotals["remMinutes"]!!).toDouble() / asleepMinutes else 0.0
                val qualityScore = (max(0.0, min(qualityRatio, 0.5)) / 0.5) * 30.0
                val sleepScore = max(0, min((quantityScore + qualityScore).toInt(), 100))

                Log.d(logTag, "😴 getSleep() - Sessions=${sessionResponse.records.size}, in-bed=${inBedHours}h, asleep=${asleepHours}h")

                val stagesJson = JSObject().apply {
                    put("awakeMinutes", stageTotals["awakeMinutes"])
                    put("lightMinutes", stageTotals["lightMinutes"])
                    put("deepMinutes", stageTotals["deepMinutes"])
                    put("remMinutes", stageTotals["remMinutes"])
                    put("outOfBedMinutes", stageTotals["outOfBedMinutes"])
                }

                val js = JSObject()
                js.put("hours", asleepHours)
                js.put("minutes", asleepMinutes)
                js.put("inBedHours", inBedHours)
                js.put("inBedMinutes", inBedMinutes)
                js.put("efficiency", efficiency)
                js.put("sleepScore", sleepScore)
                js.put("stages", stagesJson)
                js.put("platform", "android")
                call.resolve(js)
            } catch (e: Exception) {
                Log.e(logTag, "Error reading sleep", e)
                call.reject("Error reading sleep: ${e.message}")
            }
        }
    }
    
    @PluginMethod
    fun openHealthConnectSettings(call: PluginCall) {
        try {
            val intent = Intent("androidx.health.action.OPEN_HEALTH_CONNECT_SETTINGS")
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
            call.resolve()
        } catch (e: Exception) {
            Log.e(logTag, "Could not open HC settings, trying app details", e)
            try {
                val fallbackIntent = Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
                fallbackIntent.data = android.net.Uri.parse("package:${context.packageName}")
                fallbackIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(fallbackIntent)
                call.resolve()
            } catch (e2: Exception) {
                Log.e(logTag, "Fallback also failed", e2)
                call.reject("Could not open settings: ${e.message}")
            }
        }
    }
}
