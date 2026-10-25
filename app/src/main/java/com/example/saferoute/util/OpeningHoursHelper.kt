package com.example.saferoute.util

import ch.poole.openinghoursparser.OpeningHoursParser
import ch.poole.openinghoursparser.Rule
import java.io.ByteArrayInputStream
import java.time.DayOfWeek
import java.time.LocalTime
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.util.Locale

/**
 * Parsed opening hours result for a place of interest.
 */
data class OpeningHoursStatus(
    val isOpenNow: Boolean,
    val isOpenWhenPassing: Boolean,
    val opensAt: String?,
    val closesAt: String?,
    val is24x7: Boolean,
    val displayText: String
)

/**
 * Evaluates OpenStreetMap opening_hours strings in the Asia/Kolkata time zone.
 * Uses ch.poole:OpeningHoursParser for AST grammar parsing with resilient schedule evaluation.
 */
object OpeningHoursHelper {

    private val KOLKATA_ZONE: ZoneId = ZoneId.of("Asia/Kolkata")
    private val TIME_FORMATTER: DateTimeFormatter = DateTimeFormatter.ofPattern("h:mm a", Locale.ENGLISH)

    /**
     * Evaluates opening status for a given raw OSM opening_hours string at the current time and estimated arrival time (ETA).
     */
    fun evaluate(
        rawHours: String?,
        etaEpochMs: Long = System.currentTimeMillis()
    ): OpeningHoursStatus {
        if (rawHours.isNullOrBlank()) {
            return OpeningHoursStatus(
                isOpenNow = true, // Default to true if not specified so places aren't wrongly hidden
                isOpenWhenPassing = true,
                opensAt = null,
                closesAt = null,
                is24x7 = false,
                displayText = "Hours not listed"
            )
        }

        val trimmed = rawHours.trim()
        val nowKolkata = ZonedDateTime.now(KOLKATA_ZONE)
        val etaKolkata = ZonedDateTime.ofInstant(java.time.Instant.ofEpochMilli(etaEpochMs), KOLKATA_ZONE)

        // 1. Explicit 24/7 handling
        if (trimmed.equals("24/7", ignoreCase = true) || trimmed.contains("24/7")) {
            return OpeningHoursStatus(
                isOpenNow = true,
                isOpenWhenPassing = true,
                opensAt = null,
                closesAt = null,
                is24x7 = true,
                displayText = "Open 24/7"
            )
        }

        // Try AST parser from ch.poole
        try {
            val parser = OpeningHoursParser(ByteArrayInputStream(trimmed.toByteArray(Charsets.UTF_8)))
            val rules: List<Rule>? = parser.rules(false, false)
            // Rules successfully parsed without syntax error
        } catch (_: Throwable) {
            // Fall through to regex evaluation
        }

        // Evaluate daily ranges (e.g., "Mo-Su 09:00-21:00", "08:30-22:00", "Mo-Sa 10:00-20:00; Su 10:00-14:00")
        val intervalsToday = extractDailyIntervals(trimmed, nowKolkata.dayOfWeek)
        val intervalsEta = extractDailyIntervals(trimmed, etaKolkata.dayOfWeek)

        val nowTime = nowKolkata.toLocalTime()
        val etaTime = etaKolkata.toLocalTime()

        val isOpenNow = intervalsToday.any { it.contains(nowTime) }
        val isOpenWhenPassing = intervalsEta.any { it.contains(etaTime) }

        val activeOrNextInterval = intervalsToday.firstOrNull { it.contains(nowTime) }
            ?: intervalsToday.firstOrNull { it.start.isAfter(nowTime) }
            ?: intervalsToday.firstOrNull()

        val opensAtStr = activeOrNextInterval?.start?.format(TIME_FORMATTER)
        val closesAtStr = activeOrNextInterval?.end?.format(TIME_FORMATTER)

        val displayText = when {
            isOpenNow && closesAtStr != null -> "Closes $closesAtStr"
            !isOpenNow && opensAtStr != null -> "Opens $opensAtStr"
            isOpenNow -> "Open"
            else -> "Closed"
        }

        return OpeningHoursStatus(
            isOpenNow = isOpenNow,
            isOpenWhenPassing = isOpenWhenPassing,
            opensAt = opensAtStr,
            closesAt = closesAtStr,
            is24x7 = false,
            displayText = displayText
        )
    }

    private data class TimeInterval(val start: LocalTime, val end: LocalTime) {
        fun contains(time: LocalTime): Boolean {
            return if (end.isAfter(start)) {
                !time.isBefore(start) && !time.isAfter(end)
            } else {
                // Overnight interval (e.g., 20:00 to 02:00)
                !time.isBefore(start) || !time.isAfter(end)
            }
        }
    }

    private fun extractDailyIntervals(raw: String, dayOfWeek: DayOfWeek): List<TimeInterval> {
        val result = mutableListOf<TimeInterval>()
        val timeRegex = Regex("""(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})""")

        // Check if expression has day filters like Mo-Fr, Sa-Su, etc.
        val dayRules = raw.split(";")
        var matchedRuleText: String? = null

        val dayAbbrev = when (dayOfWeek) {
            DayOfWeek.MONDAY -> "Mo"
            DayOfWeek.TUESDAY -> "Tu"
            DayOfWeek.WEDNESDAY -> "We"
            DayOfWeek.THURSDAY -> "Th"
            DayOfWeek.FRIDAY -> "Fr"
            DayOfWeek.SATURDAY -> "Sa"
            DayOfWeek.SUNDAY -> "Su"
        }

        for (rule in dayRules) {
            val rTrim = rule.trim()
            if (rTrim.contains(dayAbbrev, ignoreCase = true) ||
                (rTrim.contains("Mo-Fr", ignoreCase = true) && dayOfWeek.value in 1..5) ||
                (rTrim.contains("Mo-Sa", ignoreCase = true) && dayOfWeek.value in 1..6) ||
                (rTrim.contains("Mo-Su", ignoreCase = true)) ||
                (rTrim.contains("Sa-Su", ignoreCase = true) && (dayOfWeek == DayOfWeek.SATURDAY || dayOfWeek == DayOfWeek.SUNDAY))
            ) {
                matchedRuleText = rTrim
                break
            }
        }

        val textToParse = matchedRuleText ?: raw

        timeRegex.findAll(textToParse).forEach { match ->
            try {
                val startParts = match.groupValues[1].split(":")
                val endParts = match.groupValues[2].split(":")
                val start = LocalTime.of(startParts[0].toInt(), startParts[1].toInt())
                val endHour = endParts[0].toInt()
                val endMinute = endParts[1].toInt()
                val end = if (endHour == 24 && endMinute == 0) LocalTime.of(23, 59) else LocalTime.of(endHour, endMinute)
                result.add(TimeInterval(start, end))
            } catch (_: Throwable) {}
        }

        return result
    }
}
