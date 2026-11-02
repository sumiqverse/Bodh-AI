# Design Specification: Gamified Learning Dashboard

> Reverse-engineered from the supplied screenshot. Hex values, sizes and radii are visual estimates (based on a ~1600×1200 mockup frame) and should be verified against the original design file.

---

## 1. Overview

**Product type:** Student e-learning dashboard (LMS) with heavy gamification (XP, levels, streaks, ranks, leaderboard, daily challenge).
**Persona:** Karan Mehra, Student, "Trainee" level, 9-day streak, rank #10.
**Design personality:** Playful, warm, friendly, motivating. Sticker-like cards with bold black outlines, pastel fills, and a squirrel mascot that provides encouragement.
**Style keywords:** Neo-brutalist-lite, soft pastel, outlined, rounded, illustrated, gamified.

---

## 2. Layout & Grid

| Region       | Approx. width | Notes                                                                      |
| ------------ | ------------- | -------------------------------------------------------------------------- |
| App shell    | ~1320px       | White container, ~28px radius, soft shadow on a light-gray gradient canvas |
| Left sidebar | ~230px        | Logo, profile, navigation                                                  |
| Main column  | ~630px        | Greeting, stats, course progress, challenge + efficiency                   |
| Right column | ~330px        | Monthly activity calendar, leaderboard                                     |

- **Dividers:** Vertical **dashed black lines** separate sidebar | main | right column. A thin solid light-gray horizontal line sits under the top bar.
- **Top bar:** Page title "Dashboard" (left), search pill, notification bell, dark-mode (moon/star) toggle (right).
- **Gutters:** ~16px between cards; ~24–28px outer padding inside columns.
- **Card rhythm in main column:**
  1. Greeting row (full width)
  2. 4 equal stat tiles (4-column grid)
  3. Course Progress (full width)
  4. Two cards, side by side (Today's Challenge | Learning Efficiency)

---

## 3. Color Palette

### Primary / Accent

| Token                 | Hex (est.) | Usage                                                                                                 |
| --------------------- | ---------- | ----------------------------------------------------------------------------------------------------- |
| `primary-orange`      | `#E8800A`  | Primary buttons (Continue), play buttons, progress fills, donut chart, calendar attempted days, icons |
| `primary-orange-dark` | `#C96A00`  | Pressed / emphasis states                                                                             |

### Surface Pastels

| Token                 | Hex (est.) | Usage                                                          |
| --------------------- | ---------- | -------------------------------------------------------------- |
| `surface-cream`       | `#FDEFC3`  | XP tile, speech bubble                                         |
| `surface-butter`      | `#FFF4B5`  | Monthly Activity card                                          |
| `surface-yellow`      | `#FFD966`  | Streak tile                                                    |
| `surface-blue`        | `#DCE8FB`  | Level tile                                                     |
| `surface-pink`        | `#F9B9B9`  | Rank tile                                                      |
| `surface-peach`       | `#FDD9B5`  | Course thumbnail, circle accents                               |
| `surface-peach-light` | `#FEEBCF`  | Decorative corner circles on cards                             |
| `surface-white`       | `#FFFFFF`  | App shell, Course Progress, Challenge, Efficiency, Leaderboard |

### Neutrals

| Token            | Hex (est.)          | Usage                                 |
| ---------------- | ------------------- | ------------------------------------- |
| `ink`            | `#1A1A1A`           | Borders, headings, dark "You" row     |
| `text-primary`   | `#222222`           | Headings, key numbers                 |
| `text-secondary` | `#6B6B6B`           | Sub-labels, inactive nav, helper copy |
| `divider`        | `#DDDDDD`           | Horizontal rules                      |
| `canvas`         | `#E9E9E9 → #F4F4F4` | Page background gradient              |

### Leaderboard Podium

| Rank | Hex (est.)               |
| ---- | ------------------------ |
| 1    | `#F39C12` (amber-orange) |
| 2    | `#8B4A14` (brown)        |
| 3    | `#D9A21B` (gold)         |

### Semantic usage

- **Fire / streak:** orange + yellow flame illustration, 🔥 emoji in copy
- **XP:** gold coin icon (`#D9A21B` ring)
- **Today (calendar):** yellow dot / yellow-filled date
- **Attempted (calendar):** orange filled circle with white number

---

## 4. Typography

**Primary typeface:** Roboto-style geometric sans-serif (Roboto / Inter are good substitutes).
**Logo:** Handwritten script placeholder ("Logo").

| Role             | Size    | Weight                        | Example                                               |
| ---------------- | ------- | ----------------------------- | ----------------------------------------------------- |
| Hero greeting    | 36px    | 700                           | "Hello Karan!"                                        |
| Page title       | 24px    | 500                           | "Dashboard"                                           |
| Stat value       | 20px    | 600–700                       | "1,320 XP", "Trainee", "9 Days", "#10"                |
| Card title       | 16–18px | 600–700                       | "Course Progress", "Today's Challenge", "Leaderboard" |
| Nav item         | 16px    | 400 (500/600 active)          | "My Learning"                                         |
| Section label    | 14px    | 400, uppercase, letter-spaced | "LEARNING", "ACCOUNT"                                 |
| Body / sub-label | 13–14px | 400                           | "Continue where you left off"                         |
| Micro / meta     | 10–12px | 400–500                       | "+120 XP on completion", "27 days", "Attempted"       |
| Button label     | 16px    | 600–700                       | "Continue"                                            |

Notes: Names in the sidebar use slightly letter-spaced medium weight ("Karan Mehra"). Numbers in the podium and donut are large and bold for a game-score feel.

---

## 5. Shape, Borders & Elevation

- **Border:** `2px solid #1A1A1A` on almost all content cards (signature look).
- **Radius scale:**
  - App shell: ~28px
  - Cards: 20–24px
  - Stat tiles: 18–20px
  - Pills (search, buttons, leaderboard rows): fully rounded (999px)
  - Thumbnail: ~16px
  - Podium blocks: ~8px top corners
- **Shadow:** Very subtle, soft, offset-down shadow beneath outlined cards (gives a slight lift without losing the flat outline style). App shell has a large diffuse shadow.
- **Decorative circles:** Large pale-peach/yellow circles clipped into card corners (top-right of Course Progress, Challenge, Calendar; left of Calendar) add depth without gradients.
- **Dashed dividers:** `1.5px dashed #1A1A1A` full-height vertical lines.

---

## 6. Iconography & Illustration

- **UI icons:** Outline style, ~1.5–2px stroke, rounded caps, ~22px: dashboard grid, play-card, trophy, certificate, puzzle piece, user, gear, help circle, sign-out, bell, moon-with-stars, calendar, search.
- **Gamification illustrations:** Flat, thick-outlined vector art with a cartoon feel: gold hex-coin badge, blue diamond, flame, red podium with star, puzzle pieces (green, yellow, pink, blue).
- **Mascot:** Orange squirrel with thick dark outline, used in three poses:
  - Greeting avatar (inside a cream circle, next to speech bubble)
  - Holding a clock (Today's Challenge: urgency)
  - Holding a trophy (Leaderboard header)
- **Emoji:** 🔥 used inline in copy and the calendar legend.

---

## 7. Component Inventory

### 7.1 Sidebar

- **Logo** (top, centered)
- **Profile block:** 64px circular avatar with 2px ring, name (medium, letter-spaced), role caption in gray
- **Section labels:** "LEARNING", "ACCOUNT" (small caps, gray) with a thin divider above each group
- **Nav items:** Icon (22px) + label, 44px row height, ~12px radius
  - _Active:_ `surface-cream` pill background, bold black text and icon (Dashboard)
  - _Default:_ gray text and icon
- **Items:** Dashboard, My Learning, Achievements, Certifications, Quizzes | Profile, Settings, Support
- **Sign out:** Pinned to bottom, bold, icon + label

### 7.2 Top bar

- **Search:** Pill, 2px black border, search icon left, gray placeholder "Search something..."
- **Bell icon** and **dark-mode toggle** (moon + sparkle), outline style

### 7.3 Greeting banner

- Large "Hello Karan!" heading
- Mascot avatar in cream circle
- **Speech bubble:** `surface-cream`, rounded, tail pointing at mascot; message with bold "9-day" and 🔥

### 7.4 Stat tiles (×4)

Square tiles (~125px), 2px border, pastel fill, value (bold) + label (regular) at top-left, large illustration anchored bottom-right and slightly cropped.

| Tile                  | Fill       | Illustration      |
| --------------------- | ---------- | ----------------- |
| 1,320 XP – Current XP | Cream      | Gold hex coin     |
| Trainee – Your Level  | Light blue | Diamond           |
| 9 Days – Streak       | Yellow     | Flame             |
| #10 – Rank            | Pink       | Red podium + star |

### 7.5 Course Progress card

- Header: title, subtitle, top-right circular arrow button (peach circle bleeding off corner)
- **Left:** Peach thumbnail "UI/UX Designing" with centered orange play button, caption "Module 4 of 6"
- **Dashed vertical divider** between thumbnail and stats
- **Right:** Two progress groups, each with label, 6px rounded bar (orange fill on pale-peach track), "% completed" right-aligned, and a coin + "+XP on completion" reward hint
- **CTA:** "Continue" pill button, orange fill, white bold text, bottom-right

### 7.6 Today's Challenge card

- Title, subtitle with highlighted "+50 XP!", top-right arrow
- Central orange play button, puzzle-piece illustration (right), squirrel with clock (left)
- Bottom **info pill** (cream, bordered): "Updated daily · Skipping resets streak"

### 7.7 Learning Efficiency card

- Legend (left) with colored dots: Quiz accuracy, Active Learning, Incomplete Tasks
- **Donut chart** (right): 3 orange tints, bold center value "73%"
- Thin orange rule, then **Weekly report** with delta metrics (Quiz Accuracy +4%, Active Days −1)

### 7.8 Monthly Activity (calendar)

- Butter-yellow card with month label top-right ("June"), calendar icon
- 7-column grid (M–S), 36px circular day cells
- **States:** Attempted (orange fill, white text) · Today (yellow fill with ring) · Default (plain text) · Streak days are continuous runs of orange
- **Legend row:** Attempted ● · Today ● · Max streak: 9 days 🔥

### 7.9 Leaderboard

- Header with title, subtitle "This Week's Top Learners", trophy-holding mascot cropped at top-right
- **Podium:** 3 blocks of different heights (2nd – 1st – 3rd), each with large rank number, XP and streak metrics in small light text, with circular avatar and name above (small trophy glyph)
- **List rows (rank 4+):** Pill, 2px border: rank number · avatar · name · 🔥 streak days · coin XP
- **Current user row:** Inverted style: `ink` background, white text, labelled "You" (pinned at bottom, rank #10)

---

## 8. States & Interaction Notes (inferred)

- **Nav:** hover likely tints the row cream; active uses cream fill + bold.
- **Cards with arrows** (Course Progress, Challenge): entire card or arrow button is clickable.
- **Play buttons:** primary orange circles, likely scale on hover.
- **Dark mode:** toggle present in header; palette would need an inverted ink/cream scheme with orange retained as accent.
- **Gamification feedback:** streak at risk is communicated via copy ("Skipping resets streak"); positive reinforcement via mascot speech bubble.

---

## 9. Design Tokens (CSS)

```css
:root {
  /* Colors */
  --color-primary: #e8800a;
  --color-primary-dark: #c96a00;
  --color-ink: #1a1a1a;
  --color-text: #222222;
  --color-text-muted: #6b6b6b;
  --color-divider: #dddddd;

  --surface-white: #ffffff;
  --surface-cream: #fdefc3;
  --surface-butter: #fff4b5;
  --surface-yellow: #ffd966;
  --surface-blue: #dce8fb;
  --surface-pink: #f9b9b9;
  --surface-peach: #fdd9b5;
  --surface-peach-light: #feebcf;

  --podium-1: #f39c12;
  --podium-2: #8b4a14;
  --podium-3: #d9a21b;

  /* Typography */
  --font-sans: 'Roboto', 'Inter', system-ui, sans-serif;
  --fs-hero: 36px;
  --fs-title: 24px;
  --fs-stat: 20px;
  --fs-card-title: 18px;
  --fs-body: 14px;
  --fs-micro: 11px;

  /* Shape */
  --border: 2px solid var(--color-ink);
  --radius-shell: 28px;
  --radius-card: 22px;
  --radius-tile: 18px;
  --radius-pill: 999px;

  /* Spacing (4px base) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;

  /* Elevation */
  --shadow-card: 0 4px 6px rgba(0, 0, 0, 0.12);
  --shadow-shell: 0 20px 50px rgba(0, 0, 0, 0.12);
}
```

---

## 10. Strengths

- Strong, consistent visual language (outline + pastel + mascot) with high brand memorability.
- Clear information hierarchy: greeting → key stats → current course → daily action → social/competition.
- Color-coded stat tiles make scanning instant; each metric has a distinct illustration.
- Motivation loops are visible: streak, XP rewards on progress bars, loss-aversion copy, leaderboard with the user's own position highlighted.

## 11. Improvement Opportunities

- **Contrast:** Light gray secondary text (10–12px) and pale podium text on gold/brown blocks are low-contrast; aim for WCAG AA (4.5:1).
- **Small type:** Micro text at ~10px is below recommended minimums for readability.
- **Color-only encoding:** Donut chart segments and calendar states rely on similar orange tints; add patterns, labels or values for accessibility.
- **Redundant CTAs:** Both an arrow button and a "Continue" button on Course Progress may be confusing; unify.
- **Calendar:** The first row has an unlabeled/dim cell (6th) and "June" label is easy to miss; consider month navigation arrows.
- **Responsive plan:** Define breakpoints (sidebar collapses to icons < 1024px; right column stacks under main < 1200px; stat tiles 2×2 on mobile).

---

## 12. Suggested Tech Mapping

- **Framework:** React / Next.js + Tailwind CSS (map tokens to `tailwind.config`)
- **Charts:** Recharts or a custom SVG for the donut
- **Icons:** Lucide / Phosphor (outline weight) + custom SVG illustrations
- **Animation:** Framer Motion for progress bars, streak flame, and podium entrance
- **Accessibility:** Semantic landmarks (`nav`, `main`, `aside`), `aria-current="page"` on active nav, `aria-label` on icon-only buttons, text alternatives for charts
