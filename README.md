# Mechanist Calculator

A shop-floor calculator for CNC work. It runs in a phone browser, works with no
signal once it has loaded, keeps every result in both imperial and metric, and
generates starter G-code for Haas, Okuma and Fanuc controls.

No build step, no framework, no CDN, no tracking, and no network calls of any
kind. Plain HTML, CSS and JavaScript modules.

## The calculators

| Calculator | What it answers |
| --- | --- |
| **RPM** | Spindle speed for a tool diameter and a cutting speed, in either direction, plus the recommended feed per revolution and the resulting feed. |
| **Table Feed** | IPM or mm/min from rpm, chip load and flute count, and the nearest value on the machine's feed table. |
| **FPR** | Feed per revolution (IPR) to table feed, or back the other way. |
| **Bolt Circle** | Hole coordinates, chord spacing, and the bolt circle diameter that gives a target chord. |
| **Drill** | Point length, full depth to command, hole count from pitch, and the nearest stock drill. |
| **Threads** | Unified and ISO geometry, percent thread, tap drill, roll tap drill, and G84/G85 blocks. |
| **MRR** | Material removal rate, stepover, cycle time and power, for milling, turning and drilling. |
| **Fractions** | Fraction and decimal conversion, plus the number, letter and fractional drill charts. |

Every result shows both units at once. The unit toggle in the header only decides
which one is bolded and which unit the input fields start in.

### Feed per revolution on the RPM calculator

The RPM calculator also reports a recommended feed per revolution, because that is
the other number you normally set at the same time as the speed.

Two things worth being clear about, since both are easy to get backwards:

- **Feed per revolution does not follow from surface speed.** SFM and IPR are
  independent axes. SFM sets how fast the edge travels, IPR sets how far the tool
  advances per turn, and you cannot derive one from the other. A job at 200 SFM
  and one at 60 SFM can want exactly the same IPR. For what it's worth,
  `SFM x 12 / (pi x D)` is the spindle-speed formula rearranged, not a feed
  formula.
- **FPR is chip load times the number of cutting edges.** The chip load comes from
  the material's IPT in the table when a material preset is selected. With no
  preset it falls back to a carbide rule of thumb of about 0.10 mm per tooth for
  every 25.4 mm of tool diameter, which lands near 0.002 in/tooth on a 1/2 in
  tool. Once the speed is known, IPM = FPR x RPM.

The part diameter field is separate from the tool diameter and is only used to
report the surface speed at the workpiece, since on a lathe SFM normally means
the part, not the tool.

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
| Table feed | `VF = rpm x chip load x flutes` |
| Feed per revolution | `IPR = IPM / rpm` |
| Drill point | `(D / 2) / tan(angle / 2)` |
| Bolt circle chord | `chord = BCD sin(180 / holes)` |
| Cycle time | `length / feed` |
| Power | `P = kc x Q / 6e7`, in kW with `kc` in N/mm2 and `Q` in mm3/min |

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
independent check on the JavaScript rather than a copy of it, and it also audits
the shipped tables in `js/tables.js` for self-consistency.

The browser side has three suites. Start the server first, then open:

| URL | What it checks |
| --- | --- |
| `index.html?selftest=1` | 77 maths and unit-parsing assertions, listed with pass and fail. |
| `tests/smoke.html` | Mounts all eight calculators, computes, and drives every segmented control and stepper. |
| `tests/shell.html` | Drives the real app in an iframe: navigation, search, unit toggle, settings, and the materials manager. |
| `tests/migrate.html` | Proves the material seed migration upgrades untouched rows and never overwrites a hand-edited one. |

None of these need a test framework. They are ES modules and plain Python on
purpose, so they run anywhere the app does.

## Layout

```
index.html              app shell
css/app.css             all styling
js/units.js             unit conversion, fractions, dual-unit output
js/store.js             localStorage, preferences, debounced writes
js/tables.js            drill, Unified and ISO tables, plus thread geometry
js/materials.js         material data and CRUD
js/materialsui.js       the materials sheet
js/gcode.js             G-code profiles and the canned-cycle emitter
js/ui.js                the field, result and panel toolkit
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
