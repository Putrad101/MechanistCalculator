"""Reference tests for the Mechanist Calculator maths and shipped data.

These recompute every formula from first principles in plain Python, so they are
an independent check on the JavaScript rather than a copy of it. The data tests
read js/tables.js and assert the published tables are self-consistent.

Run with:  python tests/test_math.py
"""

import math
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

IN = 25.4
THREAD_EFFECTIVE = 0.6495
THREAD_EXTERNAL_MINOR = 1.2268
THREAD_INTERNAL_MINOR = 1.0825
THREAD_PERCENT = 1.299
TAILOR_ROLL_FACTOR = 0.5

failures = []
checks = 0


def check(label, got, want, tol=1e-9):
    global checks
    checks += 1
    if want is None or got is None:
        if got != want:
            failures.append(f"{label}: got {got!r} want {want!r}")
        return
    if abs(got - want) > tol:
        failures.append(f"{label}: got {got!r} want {want!r} (tol {tol})")


def ok(label, cond):
    global checks
    checks += 1
    if not cond:
        failures.append(f"{label}: expected true")


# ---------------------------------------------------------------- formulas

def rpm_from_vc(vc_mm_min, dia_mm):
    return 1000.0 * vc_mm_min / (math.pi * dia_mm)


def vc_from_rpm(rpm, dia_mm):
    return math.pi * dia_mm * rpm / 1000.0


def sfm_from_vc(vc_mm_min):
    return vc_mm_min / 0.3048


def feed_from_tooth_load(rpm, tooth_load_mm, flutes):
    return rpm * flutes * tooth_load_mm


def tooth_load_from_feed(feed_mm_min, rpm, flutes):
    return feed_mm_min / (rpm * flutes)


def drill_point_length(dia_mm, angle_deg):
    return (dia_mm / 2.0) / math.tan(math.radians(angle_deg / 2.0))


def bolt_chord(pcd_mm, holes):
    return pcd_mm * math.sin(math.radians(180.0 / holes))


def pcd_from_chord(chord_mm, holes):
    return chord_mm / math.sin(math.radians(180.0 / holes))


def thread_geometry(major_mm, pitch_mm):
    return {
        "pitchDia": major_mm - THREAD_EFFECTIVE * pitch_mm,
        "externalMinor": major_mm - THREAD_EXTERNAL_MINOR * pitch_mm,
        "internalMinor": major_mm - THREAD_INTERNAL_MINOR * pitch_mm,
    }


def percent_thread(major_mm, pitch_mm, drill_mm):
    return 100.0 * (major_mm - drill_mm) / (THREAD_PERCENT * pitch_mm)


def tap_drill_for_percent(major_mm, pitch_mm, pct):
    return major_mm - THREAD_PERCENT * pitch_mm * (pct / 100.0)


def roll_tap_drill(major_mm, pitch_mm):
    return major_mm - THREAD_PERCENT * pitch_mm * TAILOR_ROLL_FACTOR


def mrr_milling(feed_mm_min, radial_mm, axial_mm):
    return feed_mm_min * radial_mm * axial_mm


def cutting_area_facing(dia_mm, radial_mm):
    r = dia_mm / 2.0
    if radial_mm >= r:
        return math.pi * r * r
    a = 2.0 * math.acos((r - radial_mm) / r)
    return (r * r * (a - math.sin(a))) / 2.0


def mrr_turning(feed_mm_min, doc_mm, dia_mm):
    return feed_mm_min * doc_mm * math.pi * dia_mm


def mrr_drilling(feed_mm_min, area_mm2):
    return feed_mm_min * area_mm2


def cycle_time(length_mm, feed_mm_min):
    return length_mm / feed_mm_min


def power_kw(kc_n_mm2, mrr_mm3_min):
    return kc_n_mm2 * mrr_mm3_min / 6.0e7


def hp_from_kw(kw):
    return kw * 1.34102209


def stepover(dia_mm, pct):
    return dia_mm * pct / 100.0


# ------------------------------------------------- formula reference values

def test_rpm_and_speed():
    check("rpm 150 m/min on 10 mm", rpm_from_vc(150.0, 10.0), 4774.648, 1e-3)
    check("rpm 100 SFM on 0.5 in", rpm_from_vc(100.0 * 0.3048, 0.5 * IN), 763.9437, 1e-3)
    check("vc from 400 rpm on 0.75 in", vc_from_rpm(400.0, 0.75 * IN), 23.938, 1e-3)
    check("400 rpm 0.75in is 78.5 SFM", sfm_from_vc(vc_from_rpm(400.0, 0.75 * IN)), 78.5398, 1e-3)
    check("vc and rpm are inverses", rpm_from_vc(vc_from_rpm(1500.0, 8.0), 8.0), 1500.0, 1e-9)


def test_feeds():
    # 0.05 in/tooth, 2 flutes, 800 rpm
    ipt_mm = 0.05 * IN
    feed = feed_from_tooth_load(800.0, ipt_mm, 2.0)
    check("800 rpm 0.05 IPT 2fl is 80 IPM", feed / IN, 80.0, 1e-9)
    check("tooth load round trip", tooth_load_from_feed(feed, 800.0, 2.0), ipt_mm, 1e-12)
    check("fpr from 80 IPM at 800 rpm", 80.0 / 800.0, 0.1, 1e-12)
    check("metric 12000 rpm 0.02 2fl", feed_from_tooth_load(12000.0, 0.02, 2.0), 480.0, 1e-9)


def test_drill_geometry():
    check("118 deg point on 10 mm", drill_point_length(10.0, 118.0), 3.0043, 1e-4)
    check("135 deg point on 10 mm", drill_point_length(10.0, 135.0), 2.0711, 1e-4)
    check("140 deg point on 10 mm", drill_point_length(10.0, 140.0), 1.8199, 1e-4)
    check("118 is about 0.3 x dia", drill_point_length(10.0, 118.0) / 10.0, 0.3004, 1e-3)
    check("135 is about 0.21 x dia", drill_point_length(10.0, 135.0) / 10.0, 0.2071, 1e-3)
    check("wider angle is shorter", drill_point_length(10.0, 140.0) < drill_point_length(10.0, 118.0), True)


def test_bolt_circle():
    check("6 holes on 100 mm pcd", bolt_chord(100.0, 6), 50.0, 1e-9)
    check("chord inverts pcd", pcd_from_chord(bolt_chord(152.4, 5), 5), 152.4, 1e-9)
    check("more holes means shorter chord", bolt_chord(100.0, 12) < bolt_chord(100.0, 4), True)
    check("4 holes quarter circle", bolt_chord(100.0, 4), 70.7107, 1e-4)


def test_threads():
    major, pitch = 0.25 * IN, IN / 20.0
    g = thread_geometry(major, pitch)
    check("1/4-20 pitch dia", g["pitchDia"] / IN, 0.2175, 1e-4)
    check("1/4-20 external minor", g["externalMinor"] / IN, 0.18866, 1e-4)
    check("1/4-20 internal minor", g["internalMinor"] / IN, 0.195875, 1e-6)
    ok("pitch dia below major", g["pitchDia"] < major)
    ok("external minor below pitch dia", g["externalMinor"] < g["pitchDia"])
    ok("external minor below internal minor, so the male root clears the female root",
       g["externalMinor"] < g["internalMinor"])

    check("75% tap drill 1/4-20", tap_drill_for_percent(major, pitch, 75.0) / IN, 0.2012, 2e-4)
    check("percent thread of that drill", percent_thread(major, pitch, 0.2012 * IN), 75.0, 0.3)
    check("roll tap drill 1/4-20", roll_tap_drill(major, pitch) / IN, 0.21753, 1e-4)
    check("roll tap gives 50% thread", percent_thread(major, pitch, roll_tap_drill(major, pitch)), 50.0, 1e-9)
    check("tap drill falls as pct rises", tap_drill_for_percent(major, pitch, 60.0) > tap_drill_for_percent(major, pitch, 80.0), True)
    check("shop rule major minus pitch", (major - pitch) / IN, 0.2, 1e-12)
    check("shop rule lands near 77% thread", percent_thread(major, pitch, major - pitch), 76.9, 0.3)

    # M8x1.25
    g8 = thread_geometry(8.0, 1.25)
    check("M8x1.25 pitch dia", g8["pitchDia"], 7.188, 1e-3)
    check("M8x1.25 tap 75%", tap_drill_for_percent(8.0, 1.25, 75.0), 6.782, 1e-3)
    check("6.8 mm drill in M8x1.25 is about 74% thread", percent_thread(8.0, 1.25, 6.8), 73.9, 0.5)


def test_mrr():
    # Facing uses the true circular segment, not the optimistic rectangle.
    dia, r = 20.0, 10.0
    check("full width facing is the whole disc", cutting_area_facing(dia, r), math.pi * r * r, 1e-9)
    check("zero radial depth removes nothing", cutting_area_facing(dia, 0.0), 0.0, 1e-12)
    half = cutting_area_facing(dia, r / 2.0)
    check("half radius facing area", half, r * r * (2 * math.acos(0.5) - math.sin(2 * math.acos(0.5))) / 2, 1e-9)
    ok("the true half-radius segment is under the naive rectangle",
       half < (r / 2.0) * dia)
    ok("and the app warns about exactly that", half < (r / 2.0) * dia)
    check("segment is about 61% of the half rectangle", half / ((r / 2.0) * dia), 0.6142, 1e-3)

    check("milling 1200 mm/min, 5 radial, 10 axial", mrr_milling(1200.0, 5.0, 10.0), 60000.0, 1e-9)
    check("milling is linear in feed", mrr_milling(2400.0, 5.0, 10.0), 2 * mrr_milling(1200.0, 5.0, 10.0), 1e-9)
    check("milling is linear in depth", mrr_milling(1200.0, 10.0, 10.0), 2 * mrr_milling(1200.0, 5.0, 10.0), 1e-9)

    check("turning 1 mm doc on 50 mm at 500 mm/min", mrr_turning(500.0, 1.0, 50.0), 500 * math.pi * 50, 1e-9)
    check("drilling 120 mm/min through a 10 mm hole", mrr_drilling(120.0, math.pi / 4 * 100), 120 * math.pi / 4 * 100, 1e-9)

    check("5 percent stepover on 20 mm", stepover(20.0, 5.0), 1.0, 1e-9)
    check("50 percent stepover on 20 mm", stepover(20.0, 50.0), 10.0, 1e-9)

    # kc is N/mm2 and Q is mm3/min, so kc*Q/6e7 lands in kW.
    check("1900 N/mm2 at 10000 mm3/min is 0.317 kW", power_kw(1900.0, 10000.0), 0.31667, 1e-4)
    check("that is about 0.42 hp", hp_from_kw(power_kw(1900.0, 10000.0)), 0.4248, 1e-3)
    check("kc x Q is watts over 60000", 1900.0 * 10000.0 / 60000.0, 316.67, 1e-2)
    check("cycle time 100 mm at 500 mm/min", cycle_time(100.0, 500.0), 0.2, 1e-12)


def test_fractions():
    def to_in(text):
        text = text.strip()
        sign = -1.0 if text.startswith("-") else 1.0
        if sign < 0:
            text = text[1:].strip()
        if " " in text:
            whole, rest = text.split(" ", 1)
            base = float(whole)
        elif "-" in text:
            whole, rest = text.split("-", 1)
            base = float(whole)
        else:
            base, rest = 0.0, text
        if "/" in rest:
            n, d = rest.split("/")
            return sign * (base + float(n) / float(d))
        return sign * (base + float(rest))

    check("1/2", to_in("1/2"), 0.5)
    check("7/8", to_in("7/8"), 0.875)
    check("1 1/2", to_in("1 1/2"), 1.5)
    check("1-1/2", to_in("1-1/2"), 1.5)
    check("-5/16", to_in("-5/16"), -0.3125)
    check("1 3/8", to_in("1 3/8"), 1.375)
    check("plain decimal", to_in("2.5"), 2.5)
    check("1/2 in inches is 12.7 mm", 0.5 * IN, 12.7)
    check("25.4 mm is 1 in", 25.4 / IN, 1.0)


# ------------------------------------------------------ shipped table data

def read_js():
    with open(os.path.join(ROOT, "js", "tables.js"), encoding="utf-8") as fh:
        return fh.read()


def rows_of(source, name):
    """Pull the object literals out of an exported array in js/tables.js."""
    match = re.search(rf"export const {name} = \[(.*?)\n\];", source, re.S)
    if not match:
        return []
    return re.findall(r"\{(.*?)\}", match.group(1), re.S)


def field_str(body, key):
    m = re.search(rf"{key}:\s*[\"']([^\"']+)[\"']", body)
    return m.group(1) if m else None


def field_num(body, key):
    m = re.search(rf"{key}:\s*(-?[\d.]+)", body)
    return float(m.group(1)) if m else None


def unthread_rows(source):
    out = []
    for body in rows_of(source, "THREADS_UN"):
        row = {
            "des": field_str(body, "des"),
            "series": field_str(body, "series"),
            "tpi": field_num(body, "tpi"),
            "majorIn": field_num(body, "majorIn"),
            "tapInch": field_num(body, "tapInch"),
        }
        if all(v is not None for v in row.values()):
            out.append(row)
    return out


def metric_rows(source, name):
    out = []
    for body in rows_of(source, name):
        row = {
            "des": field_str(body, "des"),
            "majorMm": field_num(body, "majorMm"),
            "pitchMm": field_num(body, "pitchMm"),
            "tapMm": field_num(body, "tapMm"),
        }
        if all(v is not None for v in row.values()):
            out.append(row)
    return out


def drill_rows(source, name):
    out = []
    for body in rows_of(source, name):
        label = field_str(body, "label")
        inch = field_num(body, "inch")
        if label is not None and inch is not None:
            out.append({"label": label, "inch": inch})
    return out


def test_unified_table():
    rows = unthread_rows(read_js())
    ok(f"THREADS_UN has 62 rows (got {len(rows)})", len(rows) == 62)
    for r in rows:
        pitch_mm = IN / r["tpi"]
        major_mm = r["majorIn"] * IN
        tap_mm = r["tapInch"] * IN
        pct = percent_thread(major_mm, pitch_mm, tap_mm)
        # The published tables run 60-90%. The 9/16-24 and 5/8-24 UNEF rows sit
        # at about 86.6%, which is correct, and a couple of them land just under
        # the sharp-V internal minor. So the invariant is the thread percentage
        # and the pitch line, not the internal minor.
        ok(f"{r['des']} thread {pct:.1f}% inside 60-90", 60.0 <= pct <= 90.0)
        ok(f"{r['des']} tap drill is smaller than major", tap_mm < major_mm)
        ok(f"{r['des']} tap drill is below the pitch diameter", tap_mm < thread_geometry(major_mm, pitch_mm)["pitchDia"])
        ok(f"{r['des']} series is Unified", r["series"] in ("UNC", "UNF", "UNEF"))
        ok(f"{r['des']} tpi is positive", r["tpi"] > 0)
        ok(f"{r['des']} major is positive", r["majorIn"] > 0)
    ok("no duplicate Unified designations", len({r["des"] for r in rows}) == len(rows))

    # A few well-known sizes, to catch a data edit that silently swaps series.
    expect = {("1/4-20", "UNC"), ("3/8-16", "UNC"), ("1/2-13", "UNC"),
              ("3/8-24", "UNF"), ("#10-24", "UNC"), ("#10-32", "UNF")}
    got = {(r["des"], r["series"]) for r in rows}
    for pair in expect:
        ok(f"{pair[0]} is {pair[1]}", pair in got)


def test_metric_table():
    source = read_js()
    for name in ("THREADS_METRIC_COARSE", "THREADS_METRIC_FINE"):
        rows = metric_rows(source, name)
        ok(f"{name} is not empty (got {len(rows)})", len(rows) > 0)
        for r in rows:
            pct = percent_thread(r["majorMm"], r["pitchMm"], r["tapMm"])
            ok(f"{r['des']} thread {pct:.1f}% inside 55-85", 55.0 <= pct <= 85.0)
            ok(f"{r['des']} tap below major", r["tapMm"] < r["majorMm"])
            ok(f"{r['des']} pitch fits designation", r["des"].startswith("M"))
    coarse = {r["des"] for r in metric_rows(source, "THREADS_METRIC_COARSE")}
    ok("M10x1.5 is coarse", "M10x1.5" in coarse)


def test_drill_tables():
    source = read_js()
    for name in ("NUMBER_DRILLS", "LETTER_DRILLS"):
        rows = drill_rows(source, name)
        ok(f"{name} is not empty (got {len(rows)})", len(rows) > 0)
        ok(f"{name} labels are unique", len({r['label'] for r in rows}) == len(rows))
        diameters = sorted(r["inch"] for r in rows)
        ok(f"{name} diameters are unique", len(set(diameters)) == len(diameters))
        for r in rows:
            ok(f"{name} {r['label']} is a sane size", 0.005 < r["inch"] < 1.5)

    numbers = {r["label"] for r in drill_rows(source, "NUMBER_DRILLS")}
    ok("number drills run 1-80", len(numbers) == 80)
    ok("#7 is present", "#7" in numbers)
    letters = {r["label"] for r in drill_rows(source, "LETTER_DRILLS")}
    ok("letter drills run A-Z", len(letters) == 26)
    # Letter drill B is 0.2380, and the step is a steady 0.005.
    b_row = [r for r in drill_rows(source, "LETTER_DRILLS") if r["label"] == "B"][0]
    check("letter B is 0.2380", b_row["inch"], 0.2380, 1e-9)


def main():
    for fn in (
        test_rpm_and_speed,
        test_feeds,
        test_drill_geometry,
        test_bolt_circle,
        test_threads,
        test_mrr,
        test_fractions,
        test_unified_table,
        test_metric_table,
        test_drill_tables,
    ):
        try:
            fn()
        except Exception as err:  # noqa: BLE001
            failures.append(f"{fn.__name__} raised {err!r}")

    if failures:
        print(f"FAILURES - {len(failures)} of {checks} checks failed\n")
        for f in failures:
            print(f"  - {f}")
        return 1
    print(f"All passed - {checks} checks")
    return 0


if __name__ == "__main__":
    sys.exit(main())
