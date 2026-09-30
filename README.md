# Mechanist Calculator

A shop-floor calculator for CNC work. It runs in a phone browser, works with no
signal once it has loaded, keeps every result in both imperial and metric, and
generates starter G-code for Haas, Okuma and Fanuc controls.

No build step, no framework, no CDN, no tracking, and no network calls of any
kind. Plain HTML, CSS and JavaScript modules.

## The calculators

| Calculator | What it answers |
| --- | --- |
| **RPM** | Spindle speed for a tool diameter and a cutting speed, in either direction. Speed only: it reports no feed. |
| **Table Feed** | IPM or mm/min from rpm and either a chip load and flute count (milling) or a feed per revolution (turning), plus the feeds at the speeds you can actually reach. |
| **FPR** | Feed per revolution (IPR) to table feed, or back the other way. |
| **Bolt Circle** | Hole coordinates, chord spacing, and the bolt circle diameter that gives a target chord. |
| **Drill** | Point length, full depth to command, hole count from pitch, and the nearest stock drill. |
| **Threads** | Unified and ISO geometry, percent thread, tap drill, roll tap drill, and G84/G85 blocks. |
| **MRR** | Material removal rate, stepover, cycle time and power, for milling, turning and drilling. |
| **Fractions** | Fraction and decimal conversion, plus the number, letter and fractional drill charts. |

Every result shows both units at once. The unit toggle in the header only decides
which one is bolded and which unit the input fields start in.

### Lathe or mill

The RPM page opens with a **Lathe / Mill** switch, because the two answer
different questions and the difference is not cosmetic.

- **Lathe** (the default) treats the main diameter as the **part diameter**. In
  turning the cutting speed belongs to the workpiece, so you size the spindle to
  the job, not to the insert. The duplicate workpiece field and the
  "speed at the workpiece" row are hidden, because on a lathe they would only
  repeat the cutting speed.
- **Mill** treats the main diameter as the **tool diameter**, since in milling the
  cutting speed is the speed of the cutting edge. A separate workpiece field
  appears, because the cutter and the job are different diameters and knowing the
  workpiece surface speed is genuinely useful.

### The RPM page reports speed and nothing else

The RPM page answers one question: how fast should the spindle turn. It does not
report a feed, in either mode, at any point.

This is a deliberate change, and the reason is worth stating plainly. A turning
feed does not follow from surface speed, so any feed the page showed had to come
from somewhere else. The version here used to compute a feed per revolution by
multiplying the material's milling chip load by a flutes count. That is a
milling quantity. On a lathe there are no flutes, and the feed comes from the
insert grade, the chipbreaker, the workpiece and the finish you want, none of
which this page has. Printing a number next to "250 SFM" made it look like the
speed had produced a feed, and it had not.

Two things that are easy to get backwards, kept here because they are the actual
traps:

- **Feed per revolution does not follow from surface speed.** SFM and IPR are
  independent axes. SFM sets how fast the edge travels, IPR sets how far the tool
  advances per turn, and you cannot derive one from the other. A job at 200 SFM
  and one at 60 SFM can want exactly the same IPR. For what it's worth,
  `SFM x 12 / (pi x D)` is the spindle-speed formula rearranged, not a feed
  formula.
- **FPR is chip load times the number of cutting edges.** That is true on a mill
  and meaningless on a lathe, which is the whole reason the feed is not here.

Feeds are on the **Table Feed** page, which asks for a feed per rev on a lathe
and lets you seed it from a material table.

The part diameter field is separate from the tool diameter and is only used to
report the surface speed at the workpiece, since on a mill SFM normally means
the cutter. It starts blank, because the part diameter is the most job-specific
number on the page and a guess would just print a surface speed that looks like
data but means nothing. On a lathe the field is not shown at all, since the
part diameter is already the working diameter.

The page opens on a coherent starting point rather than a placeholder: a 1/2 in
carbide at 250 SFM, which is about 1,900 rpm. 250 SFM is ordinary for carbide in
mild steel, so the number on screen is one you would recognise from real work.
Pick a material preset to replace it with that material's own figure.

### Table Feed in milling or turning

Table Feed has a **Milling / Turning** switch, because the input is a different
quantity in each case and mixing them up produces a feed that is off by a factor
of the diameter.

- **Milling** takes a chip load per tooth and a flute count. `IPM = rpm x chip
  load x flutes`, and the flute count is real, because a mill has edges.
- **Turning** takes a feed per revolution and has no flute count, because a lathe
  has none. `IPM = IPR x RPM`. The chip load per tooth input is removed rather
  than disabled, so there is no way to enter a milling number here by accident.

Pick a material in turning mode and the feed per rev box is seeded with the
midpoint of that material's turning band. The band itself is shown next to the
answer, and a feed outside it is flagged. That band is a starting range, not an
insert recommendation: see [Materials](#materials).

The page also prints table feed at the five nearest speeds you can realistically
dial in, because a machine does not run at the rpm you calculated, it runs at the
closest step on the dial.

Note that the speed box really is SFM. It briefly offered inches per minute under
an SFM label, which meant a value twelve times larger than intended; the unit
menu now offers SFM, m/min and in/min as separate, correctly scaled choices.

## Running it on your own machine

Double clicking `index.html` opens the app, but browsers refuse to register a
service worker over `file://`, so you lose offline support. Run the launcher
instead:

```
start-shop-server.cmd
```

It starts a local web server and opens your browser. Leave the window open while
you are using the app.

To use it on a phone, open the same page over your shop Wi-Fi. The launcher binds
to all interfaces, so find this machine's IPv4 address and use it:

```
ipconfig
```

Then on the phone, `http://<that-address>:8845/`. Add it to the home screen and
it behaves like an app.

## Deploying to GitHub Pages

1. Create a **public** repository. Do not create it as a GitHub Project.
2. Push this folder to the root of the repository, so `index.html` is at the top
   level.
3. In the repository, go to **Settings → Pages**, set **Source** to
   **Deploy from a branch**, branch `main`, folder `/ (root)`, and save.
4. The site appears at `https://<user>.github.io/<repo>/`.

Nothing in the app needs changing for Pages. It has no server-side code, so
there is no build step and no runtime configuration.

Note that GitHub Pages serves the repository as plain files, so the source of
every calculator is readable. That is fine for this project, but it does mean
anyone can see your data. Nothing you type is ever sent anywhere, because all of
it stays in the browser's own storage.

## Materials

The built-in list is a starting point, not gospel. You can add, edit, duplicate
and delete materials, and export or import the whole list as JSON. Everything
lives in this browser on this device only.

Two rows are flagged **unverified** because they are reasoned guesses rather than
values from a handbook: bronze SAE 660 and bronze SAE 955. They are marked as
such in the app. Prove any material on a scrap piece before you commit a real
part to it.

Each material also carries a **shop hardness call** of soft, medium or hard. This
is deliberately separate from the material group, because two alloys in the same
group can still want very different feeds. The shipped values follow this shop's
standard: SAE 660 runs **soft** and takes more feed, SAE 955 runs **hard** and is
run lighter. Treat that split as a shop convention rather than a metallurgical
claim, and change the IPT if your machine disagrees.

When a shipped seed value changes, existing browsers pick it up through a version
key. The migration only rewrites a material that still matches the previous seed
exactly, so anything you have edited by hand is left alone.

### Turning feeds

Every seeded material carries a turning feed **band** in in/rev, for carbide and
for HSS. Turning the material selector on the Table Feed page seeds the feed per
rev box with the midpoint of the band, shows the band next to the answer, and
flags a feed that falls outside it.

Where these numbers come from, and what they are not:

- The bands are **starting values compiled from published shop tables and tooling
  references.** They are not from an insert datasheet.
- **A real insert can sit outside the band.** Feed is set by the insert grade,
  the chipbreaker, the workpiece condition and the finish. The number on your
  insert box beats anything here, and the app says so next to the figure.
- They are deliberately banded rather than single values, because a single number
  implies a precision the source material does not support.

There is no insert catalogue in this project. Manufacturer insert data sits behind
account logins and PDFs, and transcribing a partial one by hand would have
produced exactly the kind of confident-looking guess the bronze rows already
taught us to avoid. A material-level starting range is honest; a scraped table of
insert part numbers with feeds attached is not. If you want insert-specific
figures, the practical route is a shop overrides file or entering the figure from
the insert box.

## G-code

The threading and drilling calculators emit starter blocks for Haas, Okuma and
Fanuc. They handle the differences that actually bite:

- Haas keeps X and Y modal inside a canned cycle; Okuma repeats the full block.
- Radius or diameter mode, and incremental moves when you want them.
- `G81` pecking, `G83` full pecking, `G84` rigid tapping and `G85` feed tapping,
  with the `Q` and `K` words where the control wants them.
- Program header, tool call, length offset, spindle speed, coolant and `G80`.

Treat the output as a starting block, not a finished program. Check it against
your machine's manual and your own offsets before you run it.

Modal words that used to be assumed are now asserted in the program, because
otherwise the block runs on whatever the control happened to be sitting in when
you loaded it:

- The **work offset** (`G54` by default) is emitted.
- The **feed mode** is emitted, `G94` for feed per minute or `G99` for feed per
  revolution. Tapping needs this, since a rigid tap in `G94` takes a per minute
  feed and in `G99` takes a per rev feed, and the two numbers are not the same.

Details that were wrong and are now fixed, kept here because the reasoning
matters more than the fix:

- **Rigid tap arming.** Fanuc arms a rigid tap with `M29 S____` in the block
  immediately before `G84`. A bare `M29` parked in the header, with the `S` three
  blocks earlier, is not the documented form and will not tap synchronised. The
  `M29 S` is now emitted directly ahead of the `G84`, and `G84` is refused if you
  have not entered a spindle speed, since the rpm rides in that word.
- **Tapping feed.** Tapping is the one case where feed really does follow from
  speed, because the feed must equal the thread lead. `G94` is `lead x rpm`, so
  a 1/4-20 tap at 800 rpm feeds at 40.0 IPM, not 800. `G99` is just the lead. The
  Threads page computes this from the pitch and the mode you picked.
- **Z reference return.** The zero return is now `G00 G53 G28 Z0.` on every
  control. A bare `G28` is a two stage move that can rapid into the part.
- **Incremental on generic Fanuc.** `G91.1` is not universal. The generic Fanuc
  profile does not support it, and that branch used to emit `G91.1` and `G90` and
  then nothing at all, so you got a valid looking program that drilled no holes.
  It now falls back to absolute radius programming.
- **Invalid input.** A blank depth, R plane, feed or hole count used to reach the
  number formatter and come out as a silent `Z0.` or `F0.0000` in a program you
  were invited to run. These are now checked before anything is emitted, and you
  get a message instead of a program.

Treat the output as a starting block, not a finished program. Check it against
your machine's manual and your own offsets before you run it.

## The maths

Thread geometry uses the standard 60 degree constants, in both inch and metric:

| Quantity | Formula |
| --- | --- |
| Pitch diameter | `D - 0.6495 P` |
| External minor | `D - 1.2268 P` |
| Internal minor | `D - 1.0825 P` |
| Percent thread | `100 (D - drill) / (1.299 P)` |
| Tap drill | `D - 1.299 P (pct / 100)` |
| Roll tap drill | `D - 1.299 P x 0.5` |
| Shop rule | `D - P`, which lands near 77% thread |

Other formulas:

| Quantity | Formula |
| --- | --- |
| Spindle speed | `n = 1000 Vc / (pi D)` |
| Table feed, milling | `VF = rpm x chip load x flutes` |
| Table feed, turning | `IPM = IPR x rpm` |
| Feed per revolution | `IPR = IPM / rpm` |
| Tap feed, `G94` | `F = lead x rpm` |
| Tap feed, `G99` | `F = lead` |
| Drill point | `(D / 2) / tan(angle / 2)` |
| Bolt circle chord | `chord = BCD sin(180 / holes)` |
| Cycle time | `length / feed` |
| Power | `P = kc x Q / 6e7`, in kW with `kc` in N/mm2 and `Q` in mm3/min |

Tapping is the only row here where feed follows from speed, and the reason is
that the feed is not free: it has to advance the tap by exactly one lead per
revolution or the thread will not form.

Facing uses the true circular segment rather than the usual `ae x ap` rectangle,
because the rectangle overstates a shallow cut by a lot. The app says so where it
matters.

## Adding a calculator

Drop one file into `js/calc/` and add one line to `js/registry.js`. A calculator
is a plain object with an `id`, `title`, `short`, `order`, `blurb`, a
`defaultState`, a `body(state)` function that returns HTML, an optional
`onChange(state, key, root)` that returns `true` when the body needs rebuilding,
and a `compute(state)` that returns result rows, notes, warnings and optional
extra HTML. `js/calc/fractions.js` and `js/calc/rpm.js` are the easiest two to
read as examples.

## Tests

```
python tests\test_math.py
```

That recomputes every formula from first principles in plain Python, so it is an
independent check on the JavaScript rather than a copy of it. It also audits the
shipped tables in `js/tables.js` and the turning feed bands in `js/materials.js`
for self-consistency: ranges that are not inverted, carbide above HSS, and the
relative ordering of materials that are genuinely harder to machine.

The browser side has three suites. Start the server first, then open:

| URL | What it checks |
| --- | --- |
| `index.html?selftest=1` | 119 maths, unit-parsing, material-data and G-code assertions, listed with pass and fail. |
| `tests/smoke.html` | Mounts all eight calculators, computes, and drives every segmented control and stepper. |
| `tests/shell.html` | Drives the real app in an iframe: navigation, search, unit toggle, settings, and the materials manager. |
| `tests/migrate.html` | Proves the material seed migration upgrades untouched rows and never overwrites a hand-edited one. |
| `tests/rpm.html` | Drives the RPM page in both lathe and mill mode: the diameter label, the workpiece field, and that no feed is ever reported. |
| `tests/turning.html` | The G-code emitter against the defects it had, plus the turning side of Table Feed: band seeding, in and out of range, and the milling/turning switch. |

None of these need a test framework. They are ES modules and plain Python on
purpose, so they run anywhere the app does.

## Layout

```
index.html              app shell
css/app.css             all styling
js/units.js             unit conversion, fractions, dual-unit output
js/store.js             localStorage, preferences, debounced writes
js/tables.js            drill, Unified and ISO tables, plus thread geometry
js/materials.js         material data, turning feed bands, and CRUD
js/materialsui.js       the materials sheet
js/gcode.js             G-code profiles and the canned-cycle emitter
js/ui.js                the field, result and panel toolkit
js/calc/matfield.js     shared material and tooling field helpers
js/registry.js          the calculator list
js/main.js              shell, routing, settings
js/selftest.js          browser maths assertions
js/calc/*.js            one file per calculator
sw.js                   offline cache
tools/make_icons.py     regenerates the PNG icons
tests/                  Python and browser test suites
```

## Browser support

Any current Chrome, Edge, Firefox or Safari on a phone or desktop. The app needs
ES modules and `localStorage`; without storage it still runs, it just forgets
your inputs when you close the tab. Wake Lock, which keeps the screen awake, is
used where the browser offers it and skipped where it does not.
