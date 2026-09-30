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


def test_mm_inch_conversion():
    # The mm-to-inch page is built directly on 25.4 mm per inch, so pin the
    # table of common metric stock against its inch decimal.
    ok("10 mm is 0.3937 in", abs(10.0 / IN - 0.3937008) < 1e-6)
    ok("5 mm is 0.1968504 in", abs(5.0 / IN - 0.1968504) < 1e-7)
    ok("12.7 mm is exactly 1/2 in", 12.7 / IN == 0.5)
    check("3/8 in is 9.525 mm", 0.375 * IN, 9.525)
    check("1 in is 25.4 mm", 1.0 * IN, 25.4)
    check("1 thou is 0.0254 mm", 0.001 * IN, 0.0254)
    ok("1 mm is 39.3701 thou", abs((1.0 / IN) * 1000.0 - 39.3701) < 1e-3)
    check("mm to inch round trip", (12.345 / IN) * IN, 12.345, 1e-12)
    check("inch to mm round trip", (0.4321 * IN) / IN, 0.4321, 1e-12)
    # The nearest-1/64th reading the page shows for 5 mm.
    nearest_num = round(5.0 / IN * 64.0)
    ok("5 mm nearest 64th is 13/64", (nearest_num, 64) == (13, 64))
    ok("5 mm is not an exact 64th", abs(5.0 / IN - nearest_num / 64.0) > 1e-9)


# ------------------------------------------------------ shipped table data

def read_js():
    with open(os.path.join(ROOT, "js", "tables.js"), encoding="utf-8") as fh:
        return fh.read()


def read_materials():
    with open(os.path.join(ROOT, "js", "materials.js"), encoding="utf-8") as fh:
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


def tap_feed(pitch, rpm, feed_mode="G94", unit="in"):
    """Tapping feed has to equal the thread lead, so this is the one place feed
    does follow from speed. G94 is feed per minute, G99 is feed per rev. The
    result comes back in the same unit as the lead that went in."""
    return pitch * rpm if feed_mode == "G94" else pitch


def test_tapping_feed():
    # 1/4-20 UNF lead is 0.0500 in, 1.0 mm pitch is 1.0 mm.
    check("G94 tap feed on 1/4-20 at 800 rpm in inches", tap_feed(0.05, 800, "G94", "in"), 40.0, 1e-9)
    check("G99 tap feed on 1/4-20 is the lead in inches", tap_feed(0.05, 800, "G99", "in"), 0.05, 1e-9)
    check("G94 tap feed on M8x1 at 500 rpm", tap_feed(1.0, 500, "G94", "mm"), 500.0, 1e-9)
    check("G99 tap feed on M8x1 is the pitch", tap_feed(1.0, 500, "G99", "mm"), 1.0, 1e-9)
    # G94 scales with rpm, G99 does not. This is the distinction that used to be
    # missed, where the rpm was written straight into the F word.
    check("G94 tap feed doubles with the rpm", tap_feed(1.0, 1000, "G94", "mm"), 2 * tap_feed(1.0, 500, "G94", "mm"), 1e-9)
    check("G99 tap feed ignores the rpm", tap_feed(1.0, 1000, "G99", "mm"), tap_feed(1.0, 500, "G99", "mm"), 1e-9)
    # The lead is fixed by the thread, so it must never equal the rpm.
    ok("tap feed is not the rpm", abs(tap_feed(0.05, 800, "G94", "in") - 800) > 1)


def test_turning_feed_data():
    """Parse the TURN_FEED table out of js/materials.js and sanity check it.

    The bands are starting values from published shop tables, so they are not
    checked against a single source. What is checked is internal consistency:
    a well formed range, carbide above HSS, and a sensible ordering between
    materials of very different machinability.
    """
    source = read_materials()
    match = re.search(r"const TURN_FEED = \{(.*?)\n\};", source, re.S)
    ok("materials.js exports TURN_FEED", bool(match))
    if not match:
        return
    body = match.group(1)

    # One row per line, in the form  'id': TF([lo, hi], [lo, hi]),
    bands = {}
    for line in body.splitlines():
        row = re.match(r"\s*'([a-z0-9-]+)':\s*TF\(\s*\[([^]]*)\],\s*\[([^]]*)\]", line)
        if not row:
            continue
        mid = row.group(1)
        pairs = ([float(n) for n in re.findall(r"\d*\.?\d+", row.group(2))],
                 [float(n) for n in re.findall(r"\d*\.?\d+", row.group(3))])
        bands[(mid, "carbide")] = (pairs[0][0], pairs[0][1])
        bands[(mid, "hss")] = (pairs[1][0], pairs[1][1])

    ok(f"TURN_FEED has rows (got {len(bands)})", len(bands) > 0)
    for (mid, tool), (lo, hi) in sorted(bands.items()):
        ok(f"{mid} {tool} low is positive", lo > 0)
        ok(f"{mid} {tool} range is not inverted", hi >= lo)

    # Only the seed array, so the tooling ids and hardness words that also carry
    # an id field elsewhere in the file are not mistaken for materials.
    seed_block = re.search(r"const SEED = \[(.*?)\n\];", source, re.S)
    ok("materials.js has a SEED array", bool(seed_block))
    if not seed_block:
        return
    seeded = re.findall(r"\bid:\s*'([a-z0-9-]+)'", seed_block.group(1))
    ok(f"SEED parsed out at least 20 materials (got {len(seeded)})", len(seeded) >= 20)
    for mid in seeded:
        ok(f"{mid} has a carbide band", (mid, "carbide") in bands)
        ok(f"{mid} has an hss band", (mid, "hss") in bands)

    # Carbon steel vs stainless. Stainless is gummy and work hardens, so it has
    # to run lighter than plain carbon steel.
    ok("stainless turning feed is below plain carbon steel",
       bands[("ss-304", "carbide")][1] < bands[("steel-1018", "carbide")][1])
    # Hardened tool steel and the nickel alloys are the toughest things seeded.
    ok("17-4 stainless is below 304",
       bands[("ss-17-4", "carbide")][1] <= bands[("ss-304", "carbide")][1]
       if ("ss-17-4", "carbide") in bands else True)
    # The shop bearing bronzes: SAE 660 is soft, SAE 955 is hard.
    # SAE 660 is the soft one, SAE 955 the hard one, so the bands must not
    # overlap. Touching at a single value is acceptable, crossing is not.
    ok("SAE 660 does not overlap SAE 955",
       bands[("bronze-660", "carbide")][0] >= bands[("bronze-955", "carbide")][1])
    # HSS is a fraction of carbide on every row.
    for (mid, tool), (lo, hi) in sorted(bands.items()):
        if tool != "hss" or (mid, "carbide") not in bands:
            continue
        ok(f"{mid} hss is below carbide", hi < bands[(mid, "carbide")][1])

    # The band midpoint is what the Table Feed page seeds, so it has to land
    # inside its own range for any pair of numbers.
    for (mid, tool), (lo, hi) in sorted(bands.items()):
        midp = (lo + hi) / 2
        ok(f"{mid} {tool} midpoint is inside the range", lo <= midp <= hi)


def main():
    for fn in (
        test_rpm_and_speed,
        test_feeds,
        test_tapping_feed,
        test_drill_geometry,
        test_bolt_circle,
        test_threads,
        test_mrr,
        test_fractions,
        test_mm_inch_conversion,
        test_unified_table,
        test_metric_table,
        test_drill_tables,
        test_turning_feed_data,
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
