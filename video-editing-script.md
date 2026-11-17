# Video Editing & Eleven v4 Voice-Over Script

**Title:** The Geometry of Perfect Parking (Based on Simon R. Blackburn, 2009)
**Target Total Duration:** 10:00 (600 seconds across 16 slides)
**TTS Model:** ElevenLabs Eleven v4 (`eleven_v4`)
**Pacing Convention:** Uses ellipses (`...`), em-dashes (`—`), paragraph breaks, spoken-word math normalization, and Eleven v4 square-bracket delivery tags.

---

## Timeline Overview

| Slide  | Title                                                 | Duration | Cumulative Time |
| :----- | :---------------------------------------------------- | :------- | :-------------- |
| **01** | The Parallel Parking Dilemma                          | `0:35`   | `0:00 – 0:35`   |
| **02** | Defining Perfect Parking                              | `0:35`   | `0:35 – 1:10`   |
| **03** | Slicing the Car: The Wheel-Center Plane               | `0:40`   | `1:10 – 1:50`   |
| **04** | Ackermann Steering & The Turning Center X             | `0:50`   | `1:50 – 2:40`   |
| **05** | The Four Measurable Inputs                            | `0:45`   | `2:40 – 3:25`   |
| **06** | Previewing the Master Formula                         | `0:30`   | `3:25 – 3:55`   |
| **07** | Concentric Turning Circles (Figure 2)                 | `0:45`   | `3:55 – 4:40`   |
| **08** | Proof Step 1: The Wheelbase Triangle EFX              | `0:35`   | `4:40 – 5:15`   |
| **09** | Proof Steps 2 & 3: Front Corner Radius AX and GX      | `0:40`   | `5:15 – 5:55`   |
| **10** | Proof Steps 4 & 5: Dropping Construction Line GK      | `0:40`   | `5:55 – 6:35`   |
| **11** | Proof Steps 6 & 7: Solving Triangle GKX for AH        | `0:45`   | `6:35 – 7:20`   |
| **12** | Plugging in Real-World Numbers                        | `0:35`   | `7:20 – 7:55`   |
| **13** | The Paradox: Why Doesn't Your Car's Width Matter?     | `0:35`   | `7:55 – 8:30`   |
| **14** | Angled Approach & Late Full-Lock                      | `0:35`   | `8:30 – 9:05`   |
| **15** | Shuttling To and Fro in Tight Spaces (Figure 4)       | `0:40`   | `9:05 – 9:45`   |
| **16** | Nose-First Bay Parking & The Tractrix (Figures 5 & 6) | `0:15`   | `9:45 – 10:00`  |

---

## Slide-by-Slide Script & Visual Choreography

### Slide 01 — The Parallel Parking Dilemma (`0:00 – 0:35` | `35s`)

- **Minimalist Stage Content:**
  - Kerb line, two parked cars defining the bay, target gap bracket `|AH| = ?`, and the 2D cut-plane car.
- **CSS Motion Graphics:**
  - `0s – 11s`: Car pulls up alongside the front parked car.
  - `11s – 23s`: Multi-point shuffle back and forth into the space.
  - `23s – 35s`: Resets and sweeps into the space along a single luminous arc around turning center `X`.
- **Eleven v4 Voice-Over Script:**

```text
[curious] You are driving down a busy street... and you finally spot a gap between two parked cars.

[confident] The road is wide, so you have plenty of room to swing out... [hesitant] but the space itself... looks uncomfortably tight. ...

[sighs] [frustrated] Nobody enjoys shuffling back and forth... inching closer to the kerb... a few centimeters at a time. ...

[confident] You want to reverse into the space in one smooth sweep — and pull straight forward to park. ...

[thoughtful] So here is the mathematical question... how much extra length — beyond the length of your own car — does that parking space actually need?
```

---

### Slide 02 — Defining Perfect Parking (`0:35 – 1:10` | `35s`)

- **Minimalist Stage Content:**
  - Two-phase trajectory diagram: Phase 1 (full-lock reverse arc to kerb) and Phase 2 (straight forward pull-up).
- **CSS Motion Graphics:**
  - Cut-plane car reverses clockwise around center `X` until parallel with the kerb, straightens its front wheels, and glides forward into the center of the bay.
- **Eleven v4 Voice-Over Script:**

```text
[conversational] In two thousand and nine, mathematician Simon Blackburn formulated a precise model for what he called... a perfect parking manoeuvre. ...

[confident] First... there is no handbrake skidding, and no multi-point shuffling. You reverse into the space at full steering lock in a single continuous arc... stopping the exact moment your car is parallel to the kerb. ...

[calm] Then... you straighten your front wheels — and drive straight forward into the middle of the space. ...

[thoughtful] To find the minimum space required, we only need to analyze the geometry of that reversing sweep.
```

---

### Slide 03 — Slicing the Car: The Wheel-Center Plane (`1:10 – 1:50` | `40s`)

- **Minimalist Stage Content:**
  - Enlarged 2D cut-plane car showing outer chassis rectangle `ABCD`, kerb line `AEFD`, front-left hub `E`, and rear-left hub `F`.
- **CSS Motion Graphics:**
  - Horizontal slice plane illuminates the four sectioned wheels and hubs; vertices `A, B, C, D` and wheel centers `E, F` pulse sequentially along the kerb line.
- **Eleven v4 Voice-Over Script:**

```text
[curious] To turn a real car into clean geometry... imagine slicing the vehicle horizontally right through the centers of its four wheels... looking straight down from above. ...

[calm] The extreme outer body forms a simple rectangle — labeled A, B, C, D. ...

The kerb runs along the straight line through A, E, F, and D — or, if you prefer never to scrape your alloy wheels on concrete... an imaginary line a few centimeters to the right of the kerb. ...

[thoughtful] Notice that our kerb-side wheels, centered at points E and F, line up closely with the left edge A-D of the car.
```

---

### Slide 04 — Ackermann Steering & The Turning Center X (`1:50 – 2:40` | `50s`)

- **Minimalist Stage Content:**
  - Cut-plane car with front wheels turned at full lock and three dashed axle rays converging at turning center `X`.
- **CSS Motion Graphics:**
  - Rear axle line extends right to `X`. Inside and outside front wheels pivot to their respective Ackermann angles as their hub normal lines intersect at `X`.
- **Eleven v4 Voice-Over Script:**

```text
[curious] How does a car actually rotate when reversing? ...

[confident] Its rear wheels are fixed parallel to the sides of the car. That means the imaginary line passing through both rear wheel centers... must always point directly at the center of the turning circle, labeled X. ...

[thoughtful] What about the front wheels? Because the inside front wheel travels along a tighter circle than the outside wheel... it has to steer at a sharper angle to avoid dragging sideways. ...

[conversational] This is called Ackermann steering — patented back in eighteen eighteen for horse-drawn carriages. When all wheel axle lines meet at a single point X... every part of the car turns cleanly around X.
```

---

### Slide 05 — The Four Measurable Inputs (`2:40 – 3:25` | `45s`)

- **Minimalist Stage Content:**
  - Dimensioned schematic highlighting `r = |EX|`, `l = |EF|`, `k = |AE|`, `w = |GH|`, and target `|AH|`.
- **CSS Motion Graphics:**
  - Each of the four dimension lines draws in one by one with luminous endpoints synchronized to the narration.
- **Eleven v4 Voice-Over Script:**

```text
[conversational] Blackburn chose four measurements for his formula that you can easily look up on the web... or measure yourself with a tape measure. ...

[confident] First is r — the radius of your car's kerb-to-kerb turning circle... which is the distance from the front wheel E to the turning center X. ...

Second is l — the wheelbase between the front wheel E and rear wheel F. ...

Third is k — the front overhang from the front wheel E to the front bumper corner A. ...

[thoughtful] And fourth is w — the width G-H of the parked car in front of you. Our goal... is to find the extra distance, A-H.
```

---

### Slide 06 — Previewing the Master Formula (`3:25 – 3:55` | `30s`)

- **Minimalist Stage Content:**
  - Clean centered typographic display of Equation (1) for extra parking length `|AH|`.
- **CSS Motion Graphics:**
  - Each bracketed term inside the square root illuminates softly as it is introduced.
- **Eleven v4 Voice-Over Script:**

```text
[confident] Before we dive into the proof... here is the exact formula we are going to build. ...

[conversational] At first glance, nested square roots might look intimidating. ...

[thoughtful] But every single piece inside this expression comes directly from Pythagoras's theorem... applied to three right-angled triangles. ... Let's freeze the parking manoeuvre at its most critical instant... and see why.
```

---

### Slide 07 — Concentric Turning Circles (Figure 2) (`3:55 – 4:40` | `45s`)

- **Minimalist Stage Content:**
  - Full Figure 2 geometry: three concentric circles centered at `X` (two dashed wheel paths for `E` and `F`, and the outer solid circle for corner `A` grazing `G`).
- **CSS Motion Graphics:**
  - Concentric circles draw around `X`; the cut-plane car reverses along the arcs as corner `A` traces the outer circle and just misses point `G`.
- **Eleven v4 Voice-Over Script:**

```text
[calm] Look directly down from above... just as we finish reversing parallel to the kerb. ...

[conversational] As the car reverses around center X, the wheels at E and F travel along the two dashed circles. Meanwhile, the front-left corner A of our car sweeps along the outer circle. ...

[confident] In the tightest possible parking space, that corner A will just barely miss the corner G of the car parked in front. ...

[thoughtful] Because corner A passes right through point G along that outer circle... both A and G lie at the exact same distance from the center X.
```

---

### Slide 08 — Proof Step 1: The Wheelbase Triangle EFX (`4:40 – 5:15` | `35s`)

- **Minimalist Stage Content:**
  - Isolated right-angled triangle `EFX` with right angle at `F`, hypotenuse `|EX| = r`, vertical leg `|EF| = l`, and base `|FX|`.
- **CSS Motion Graphics:**
  - Triangle `EFX` highlights; right-angle marker appears at `F`; base `|FX|` resolves to `sqrt(r^2 - l^2)`.
- **Eleven v4 Voice-Over Script:**

```text
[confident] Step one of our proof focuses on the right-angled triangle E-F-X. ...

[conversational] Because the rear axle line goes straight through the turning center X at a right angle to the side of the car... the angle at F is ninety degrees. ...

We know the hypotenuse E-X is the turning radius r... and the vertical side E-F is the wheelbase l. ...

[thoughtful] Applying Pythagoras's theorem gives us the horizontal distance F-X — the square root of r squared minus l squared.
```

---

### Slide 09 — Proof Steps 2 & 3: Front Corner Radius AX and GX (`5:15 – 5:55` | `40s`)

- **Minimalist Stage Content:**
  - Right-angled triangle `AFX` with vertical side `l + k`, base `|FX|`, hypotenuse `|AX|`, and radius equality `|GX| = |AX|`.
- **CSS Motion Graphics:**
  - Vertical leg extends from `E` to `A`; hypotenuse `AX` draws in and sweeps like a compass arm up to `GX`.
- **Eleven v4 Voice-Over Script:**

```text
[conversational] For step two... look at the taller right-angled triangle A-F-X. ...

[confident] Its vertical side A-F is simply the wheelbase l... plus the front overhang k. And we just found the base F-X in step one. ...

Using Pythagoras's theorem a second time gives us the hypotenuse A-X — the radius of the outer circle. ...

[thoughtful] And that leads immediately to step three... since point G lies on that exact same circle, the distance G-X is identical to A-X.
```

---

### Slide 10 — Proof Steps 4 & 5: Dropping Construction Line GK (`5:55 – 6:35` | `40s`)

- **Minimalist Stage Content:**
  - Figure 3 construction: vertical line dropped from `G` parallel to the kerb down to `FX` at point `K`, showing `|KX| = |FX| - w`.
- **CSS Motion Graphics:**
  - Auxiliary line `GK` animates downward from `G` to `K`; width `w` (`GH`) projects onto `FK`, leaving `|KX| = |FX| - w`.
- **Eleven v4 Voice-Over Script:**

```text
[curious] Now for step four — the key geometric construction shown in Figure three. ...

[confident] We draw a new line straight down from corner G, parallel to the kerb, until it meets the horizontal line F-X at a new point... K. ...

[thoughtful] In step five, notice that the distance F-K at the bottom is equal to the width w of the parked car at the top. Since we already know the full length F-X... the remaining segment K-X is simply F-X minus w.
```

---

### Slide 11 — Proof Steps 6 & 7: Solving Triangle GKX for AH (`6:35 – 7:20` | `45s`)

- **Minimalist Stage Content:**
  - Right-angled triangle `GKX` (right angle at `K`) solving for vertical height `|GK|`, followed by `|AH| = |GK| - l - k`.
- **CSS Motion Graphics:**
  - Triangle `GKX` illuminates; vertical leg `GK` slides left onto kerb segment `HF`, subtracts `AF` (`l + k`), and leaves `|AH|`.
- **Eleven v4 Voice-Over Script:**

```text
[confident] In step six, we apply Pythagoras's theorem one last time... to the right-angled triangle G-K-X. ...

[conversational] We know the hypotenuse G-X from step three... and we know the base K-X from step five. Subtracting their squares and taking the square root gives us the vertical height G-K. ...

[thoughtful] Finally, step seven... the vertical height G-K is the exact same length as H-F along the kerb. Subtract the wheelbase l and front overhang k... and what remains is A-H — the exact extra space we need.
```

---

### Slide 12 — Plugging in Real-World Numbers (`7:20 – 7:55` | `35s`)

- **Minimalist Stage Content:**
  - Numerical evaluation: `r = 5.4 m`, `l = 2.6 m`, `k = 1.3 m`, `w = 1.7 m` yielding `|AH| = 1.43 m`.
- **CSS Motion Graphics:**
  - Values populate into the formula; the cut-plane car completes a scaled single-sweep park with `1.43 m` of clearance.
- **Eleven v4 Voice-Over Script:**

```text
[conversational] Let's put some realistic numbers into the formula. ...

[confident] Suppose your car has a kerb-to-kerb turning circle diameter of ten point eight meters... which means the radius r is five point four meters. ...

Let's say the wheelbase l is two point six meters, the front overhang k is one point three meters, and the parked car in front has a width w of one point seven meters. ...

[thoughtful] When we crunch those numbers... the formula tells us the parking space must be at least the length of your car... plus one point four three meters.
```

---

### Slide 13 — The Paradox: Why Doesn't Your Car's Width Matter? (`7:55 – 8:30` | `35s`)

- **Minimalist Stage Content:**
  - Cut-plane car expanding and contracting in width along its right edge `BC` while kerb-side edge `AD` follows the unchanged outer turning circle.
- **CSS Motion Graphics:**
  - Right side `BC` morphs wider and narrower during the reverse arc, showing that corner `A` still traces the same path past `G`.
- **Eleven v4 Voice-Over Script:**

```text
[curious] Looking closely at the formula, you might notice something surprising... it depends on the width w of the parked car in front, but it does not include the width of your own car at all. ...

[thoughtful] Why? Because in a single-sweep manoeuvre on a wide road, the critical pinch point is your kerb-side front corner A clearing point G. Making your car wider pushes edge B-C closer to the center X... without changing the path of corner A. ...

[conversational] In real life, of course, a wider car does make a difference on narrow roads... or when you have to shuffle back and forth.
```

---

### Slide 14 — Angled Approach & Late Full-Lock (`8:30 – 9:05` | `35s`)

- **Minimalist Stage Content:**
  - Car reversing straight along a tangent approach line, then snapping to full lock as corner `A` passes `G`. Tangent angles at `G` and `A` shown against the kerb.
- **CSS Motion Graphics:**
  - Tangent lines draw at `G` and `A`; car reverses straight along the approach angle, locks wheels at `G`, and merges onto the circular arc.
- **Eleven v4 Voice-Over Script:**

```text
[curious] What if you parallel park using a different method — pointing your car toward the kerb at an angle, reversing straight back, and putting on full lock at the very last minute? ...

[confident] Blackburn's geometry still tells you the best angle of approach. You apply full lock right as corner A passes point G... placing your car onto the exact same turning circle. ...

[thoughtful] The ideal angle of approach is simply the angle a tangent to the circle at G makes with the kerb... minus the tangent angle at A.
```

---

### Slide 15 — Shuttling To and Fro in Tight Spaces (Figure 4) (`9:05 – 9:45` | `40s`)

- **Minimalist Stage Content:**
  - Figure 4 geometry: rear-axle midpoint tracing alternating circular arcs `AB` and `Ba` (centers `X` and `x`) of radius `sqrt(r^2 - l^2) - n/2`, stepping inward by `2|PA|`.
- **CSS Motion Graphics:**
  - Rear-axle midpoint node traces the S-curve `A -> B -> a` between parallel boundary lines separated by `c`, illustrating the `2|PA|` inward gain.
- **Eleven v4 Voice-Over Script:**

```text
[curious] What if the extra space c is smaller than one point four three meters... and you don't mind shuttling back and forth? ...

[confident] Mathematically, as long as the space is even slightly longer than your car, you can always park if you use enough movements. ...

[thoughtful] By tracking the midpoint between your two rear wheels, each forward or backward movement follows two opposite circular arcs... moving you closer to the kerb by a distance of twice P-A — though you always have to finish by reversing so your front bumper never swings over the pavement.
```

---

### Slide 16 — Nose-First Bay Parking & The Tractrix (Figures 5 & 6) (`9:45 – 10:00` | `15s`)

- **Minimalist Stage Content:**
  - Figures 5 & 6: Car turning nose-first into bay `EFGH` as front corner `B` tracks line `EF` and rear corner `C` traces the orthogonal tractrix across a family of circles.
- **CSS Motion Graphics:**
  - Front corner `B` glides along the straight guide line while rear corner `C` draws the sweeping tractrix curve.
- **Eleven v4 Voice-Over Script:**

```text
[conversational] Finally... if you park nose-first into a multi-storey carpark bay while steering your front corner B along a straight line... [thoughtful] your rear corner C traces a classic curve called a tractrix — proving that wherever you park... geometry is in the driver's seat.
```
