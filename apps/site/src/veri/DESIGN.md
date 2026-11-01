# Veri Properties site: design notes

Veri's public site has its own design, separate from the default agency layout that PMS and the
demo use. Everything Veri-only lives in `src/veri/`; the shared pages hand over to these
components when the agency is `veri-properties`.

Built to the method in juliobsz/skills `/awwwards` (concept, system, QA loop). The theatre is
scaled to the brief: this is a working letting agency site, so there is no loader, no WebGL and
no smooth-scroll library. The craft goes into type, layout and one signature interaction.

## Brief

- **Subject:** Veri Properties, a fully remote UK letting agency. Email first, no shop front,
  no phone line. Full management at 10% + VAT; a long, honest fee schedule.
- **Audience:** landlords deciding whether to hand over a property; tenants browsing homes.
- **Job:** win management instructions and enquiries on listed homes.
- **Constraint:** portal logins live in the footer only (Ben, 2026-10-30).

## Concept

Three candidates:

| | A. The tick (name) | B. The inbox (process) | C. Plain sentences (formal) |
|---|---|---|---|
| Idea | Veri means true. The site reads like an itemised statement where every line is checked off | Everything arrives as an email: pages are messages, CTAs are replies | The whole site is set as plain sentences at one size |
| Anchor | The name (Latin *verus*, "verify") and the real fee schedule | Remote, email-only working | Clarity as a promise |
| Originality / fit / feasibility / portability | 4 / 5 / 5 / 2 | 3 / 4 / 4 / 3 | 3 / 3 / 5 / 4 |

Picked **A**: it comes from the name and from content Veri already publishes (the full fee
table), so it can't be moved to another agency without losing its anchor.

```
Idea:        Veri means true: the site is an itemised statement, and every line is ticked once it's checked.
Metaphor:    the landlord statement and the inspector's checklist.
Signature:   the tick. The V of the wordmark is a pen tick; statement lines tick themselves off as they
             scroll into view (one stroke each, staggered), and every primary target ticks on hover.
Emotion:     calm, legible, nothing hidden.
Motion verb: tick off: a quick pen stroke (stroke-dashoffset, 420 ms, out-ease), staggered 70 ms.
Screenshot:  "Lettings, itemised." over the house photo, with the fee slip beside it.
```

## System

**Palette** (cool paper, not cream; ballpoint blue, the colour you sign and tick with)

| Role | Hex |
|---|---|
| ground (paper) | `#F4F5F2` |
| card | `#FFFFFF` |
| ink | `#121417` |
| muted | `#575D63` (6.1:1 on paper) |
| line | `#D5D8D2` |
| accent (pen) | `#3D24FD` (6.7:1 on paper), matched to the logo; `#A89CFF` on ink |

**Logo.** Ben's redesigned mark (2026-11-01): a folded ribbon tick that is the V, then "eri".
Source artwork in `tenants/veri-properties/brand/veri-logo.png`; redrawn as SVG in `LogoTick`
(ui.tsx) and in the favicon/apple icon. The tick runs from the i-dot top to the baseline and
the "e" tucks under its right arm.

**Type.** Archivo only, using its width axis as the hierarchy: expanded 125% at 800 for display,
normal width for text and UI. IBM Plex Mono for figures that are money or references (fees,
rent, deposits). No serif, no italic accent words.

**Grid.** 12 columns, max 84rem, gutter clamp(1rem, 3vw, 2.5rem). Display type hangs on the
first column with a small negative indent.

**Shape.** One radius: 4px. Statement rows use rules and dotted leaders: a hairline system,
used on purpose because the concept is a statement.

**Motion.** One ease (`cubic-bezier(.2,.7,.1,1)`). Ticks draw with stroke-dashoffset; nothing
animates layout. One IntersectionObserver marks `[data-tick]` groups as seen. Under reduced
motion every tick is already drawn and nothing moves.

**Idle state.** Still at rest, on purpose: a lettings site should sit still while someone reads
fees. The life is in the ticks on scroll and on hover.

## Composition (home)

```
HERO      [ Lettings, / itemised.                          ]   type-led, full width
          [ lead + CTAs        ] [ photo 4:3 + fee slip     ]   asymmetric split 5/7
HOMES     [ h2 + count + link ]                                 header row
          [ card ][ card ][ card ]                              grid
COVERS    [ sticky h2 + summary ] [ ticked statement (8 lines) + double-ruled total ]
CHECKED   dark band: big ticked rows (tenant promises)          full-bleed index
DOORS     [ Landlords ............................. tick ]      index list, huge type
          [ Tenants ............................... tick ]
REMOTE    "No shop front. No phone queue." + giant email + memberships
```

Inner pages each lead with a type-led page head and use the same statement and tick-list
components, so the fee table on Landlords is the signature at full length.

## Genericness test

- Charcoal + apricot + Outfit + Instrument Serif italic accent word (the old site) was an AI
  default: replaced with cool paper, ballpoint blue and one width-axis family.
- Floating glass pill nav: replaced with a plain sticky bar that marks the current page with a tick.
- Eyebrow above every heading: removed. Labels only where they carry information.

## QA (2026-11-01)

Two passes on a production build against a mock platform (desktop 1440, phone 390, phone with
reduced motion; 11 page types including the 404). Checked with a Playwright script: console
errors, horizontal overflow, tap targets, one `h1` per page, every tick group drawn by the end
of the page, axe (no serious or critical violations), keyboard order with a visible focus ring
on every stop, and hover frames for buttons and the two doors.

Fixed after pass 1: undrawn ticks left a round-cap dot; hero type too small on phones; the hero
fee slip stacked its amounts; the tenant promise ticks were too small; the home page title
repeated the agency name.

Self-score from the screenshots (the skill prefers an outside critic; none was run): Design 8,
Usability 8, Creativity 7.5, Content 8. Biggest lifts: Veri's own photography (the hero is a
single stock-looking house) and real listing photos.
