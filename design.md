# Design Specification: Gamified Learning Dashboard (BodhAI LMS)

> **High-Fidelity Reverse-Engineered Specification**  
> Sourced directly from the official high-resolution mockup frame (`media_1793650620205_70bb1740.jpg`).  
> All measurements, typography scales, color hex codes, vector motifs, and layout grids are verified against the design artifact.

---

## 1. Overview & Aesthetic Identity

- **Product Type:** Gamified Student E-Learning Platform (LMS) designed for middle and secondary education.
- **Persona:** **Karan Mehra**, Student, Level: _"Trainee"_, Current XP: _1,320 XP_, Streak: _9 Days_, Global Rank: _#10_.
- **Design Personality:** Playful, warm, energetic, and encouraging without feeling childish. Neo-brutalist structure softened with pastel surfaces and sticker-like vector illustrations.
- **Core Style Keywords:**
  - **Neo-Brutalist-Lite:** Bold `2px solid #1A1A1A` ink borders, high contrast, flat color blocking, and clean pill contours.
  - **Warm Pastels:** Calming cream, butter yellow, sky blue, soft peach, and coral pink fills.
  - **Illustrated Gamification:** Orange squirrel mascot serving as an interactive guide, coach, and motivational feedback anchor.

---

## 2. Layout, Grid & Spatial Architecture

| Region                 | Width (Approx.) | Purpose & Architectural Notes                                                                                                              |
| ---------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Canvas / Backdrop**  | 100vw           | Studio drop-canvas: Light neutral gray (`#E8E8E8 → #F4F4F4`), subtle top-down lighting.                                                    |
| **App Shell**          | ~1320px         | Centered white container (`#FFFFFF`), `28px` border radius, `2px solid #1A1A1A` border, `0 20px 50px rgba(0, 0, 0, 0.12)` diffuse shadow.  |
| **Left Sidebar**       | ~230px          | Sticky left rail: Branding logo, user profile card, categorized navigation (`LEARNING` & `ACCOUNT`), pinned sign-out.                      |
| **Main Center Column** | ~640px          | Dynamic learning activity: Greeting row with mascot speech bubble, 4 stat tiles, course progress card, daily challenge & efficiency cards. |
| **Right Rail Column**  | ~330px          | Gamification & social proof: Monthly activity streak calendar (butter yellow) and weekly leaderboard podium.                               |

### Structural Dividers:

- **Vertical Column Dividers:** Distinctive **dashed black lines** (`1.5px dashed #1A1A1A`) separating:
  1. `Sidebar` | `Main Content` (runs the full height from top to bottom).
  2. `Main Content` | `Right Rail` (runs below the horizontal top-bar header line to bottom).
- **Top Bar Divider:** Thin solid light-gray horizontal line (`1px solid #DDDDDD` / `border-divider`) below the top bar.
- **Card Gutters:** `16px` between cards; `24px–28px` internal column padding.

---

## 3. Color Palette & Design Tokens

### 3.1 Primary Accent Colors

| Token                 | Hex Value | RGB / HSL                                 | Usage                                                                                                                        |
| --------------------- | --------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `primary-orange`      | `#E8800A` | `rgb(232, 128, 10)` / `hsl(32, 92%, 48%)` | Primary CTA buttons ("Continue"), circular play buttons, active progress bar fills, calendar attempted days, highlight dots. |
| `primary-orange-dark` | `#C96A00` | `rgb(201, 106, 0)` / `hsl(32, 100%, 39%)` | Pressed, active, and hover states for primary controls.                                                                      |

### 3.2 Surface Pastels (Neo-Brutalist Fills)

| Token                 | Hex Value | Usage in Mockup                                                                                    |
| --------------------- | --------- | -------------------------------------------------------------------------------------------------- |
| `surface-cream`       | `#FDEFC3` | XP Stat Tile fill, mascot greeting speech bubble, active sidebar nav pill, challenge warning pill. |
| `surface-butter`      | `#FFF4B5` | Monthly Activity Calendar card background.                                                         |
| `surface-yellow`      | `#FFD966` | Streak Stat Tile fill, today calendar indicator ring, gold accents.                                |
| `surface-blue`        | `#DCE8FB` | Level Stat Tile fill ("Trainee"), 2nd place avatar ring.                                           |
| `surface-pink`        | `#F9B9B9` | Rank Stat Tile fill ("#10"), 2nd podium accent blocks.                                             |
| `surface-peach`       | `#FDD9B5` | Course progress thumbnail, card corner accent circles, play button surroundings.                   |
| `surface-peach-light` | `#FEEBCF` | Decorative corner circles bleeding off card edges, progress bar tracks.                            |
| `surface-white`       | `#FFFFFF` | App shell, Course Progress card, Challenge card, Efficiency card, Leaderboard card.                |

### 3.3 Neutrals & Inks

| Token            | Hex Value           | Usage                                                                   |
| ---------------- | ------------------- | ----------------------------------------------------------------------- |
| `ink`            | `#1A1A1A`           | Universal 2px outlines, primary headings, pinned "You" leaderboard row. |
| `text-primary`   | `#222222`           | Card titles, prominent numbers, hero greeting.                          |
| `text-secondary` | `#6B6B6B`           | Helper copy, inactive nav labels, metadata, subtitle tags.              |
| `divider`        | `#DDDDDD`           | Thin horizontal separation rules.                                       |
| `canvas`         | `#E8E8E8 → #F4F4F4` | Outer viewport background canvas gradient.                              |

### 3.4 Leaderboard Podium Tokens

| Rank          | Token      | Hex Value                  | Visual Characteristics                                                       |
| ------------- | ---------- | -------------------------- | ---------------------------------------------------------------------------- |
| **1st Place** | `podium-1` | `#F39C12` (Amber Orange)   | Tallest block (~70px height), crowned avatar, `Rahul`, `2120 XP`, `36 days`. |
| **2nd Place** | `podium-2` | `#8B4A14` (Deep Brown)     | Mid-height block (~50px height), `Sakshi`, `1950 XP`, `28 days`.             |
| **3rd Place** | `podium-3` | `#D9A21B` (Burnished Gold) | Lowest block (~38px height), `Pallavi`, `1890 XP`, `27 days`.                |

---

## 4. Typography Scale

- **Primary Typeface:** Clean geometric sans-serif (`Inter`, `Roboto`, `system-ui`).
- **Devanagari Typeface:** `Noto Sans Devanagari` for the official "बो" brand glyph.
- **Logo Heading:** Script / handwritten wordmark placeholder or bold brand mark.

| Role                  | Font Size     | Line Height | Weight                            | Mockup Instance                                             |
| --------------------- | ------------- | ----------- | --------------------------------- | ----------------------------------------------------------- |
| **Hero Greeting**     | `34px – 36px` | `1.2`       | Bold (700)                        | `"Hello Karan!"`                                            |
| **Page Title**        | `22px – 24px` | `1.3`       | Semi-bold (600)                   | `"Dashboard"`                                               |
| **Stat Big Value**    | `20px – 22px` | `1.2`       | Extra-bold (800)                  | `"1,320 XP"`, `"Trainee"`, `"9 Days"`, `"#10"`              |
| **Card Heading**      | `16px – 18px` | `1.3`       | Bold (700)                        | `"Course Progress"`, `"Today's Challenge"`, `"Leaderboard"` |
| **Module / Sub-head** | `13px – 14px` | `1.4`       | Semi-bold (600)                   | `"Module - 4"`, `"Overall Progress"`, `"UI/UX Designing"`   |
| **Navigation Item**   | `14px – 15px` | `1.4`       | Regular (400) / Bold (700 active) | `"Dashboard"`, `"My Learning"`, `"Achievements"`            |
| **Section Tag**       | `11px – 12px` | `1.4`       | Bold (700), Upper, Spaced         | `"LEARNING"`, `"ACCOUNT"`                                   |
| **Meta / Micro Copy** | `10px – 11px` | `1.3`       | Medium (500)                      | `"+120 XP on completion"`, `"27 days"`, `"Attempted"`       |
| **Button Label**      | `14px – 15px` | `1.0`       | Bold (700)                        | `"Continue"`, `"Sign out"`                                  |

---

## 5. Shape, Borders & Elevation Hierarchy

- **Border Style:** `2px solid #1A1A1A` on cards, stat tiles, circular play buttons, and pills.
- **Corner Radii Hierarchy:**
  - **App Shell:** `28px – 32px`
  - **Content Cards:** `22px – 24px`
  - **Stat Tiles:** `18px – 20px`
  - **Thumbnails & Modules:** `16px`
  - **Interactive Pills & CTAs:** Fully rounded `9999px` (`rounded-full`)
  - **Podium Blocks:** `6px – 8px` rounded top corners.
- **Corner Arc Accents:** Soft peach/yellow circular sectors (`#FDD9B5` / `#FEEBCF`) anchored in the top-right corner of cards (Course Progress, Challenge, Calendar) to provide depth without noisy gradients.
- **Shadows:**
  - Shell: `0 20px 50px rgba(0, 0, 0, 0.12)`
  - Cards & Tiles: `0 4px 6px rgba(0, 0, 0, 0.10)`
  - Buttons: `0 2px 4px rgba(0, 0, 0, 0.08)`

---

## 6. Comprehensive Component Inventory

### 6.1 Top Bar

- **Left:** Page title `"Dashboard"` in semi-bold black typography.
- **Right Controls:**
  - **Search Pill:** White pill container, `2px solid #1A1A1A` border, magnifying glass icon left, `"Search something..."` placeholder.
  - **Notification Bell:** Outlined circular button with bell glyph.
  - **Theme Toggle:** Circular button with crescent moon and sparkles glyph.

### 6.2 Left Navigation Sidebar (~230px)

- **Logo:** Top-centered script or BodhAI circular badge with `"BodhAI"`.
- **Profile Block:**
  - 64px circular avatar with `2px` black ring, young student illustration on teal background.
  - Name: `"Karan Mehra"` in bold black.
  - Sub-label: `"Student"` in neutral gray (`#737373`).
- **Section: "LEARNING":**
  - `Dashboard` — Active pill (`bg-surface-cream`, bold black text, 4-tile grid icon).
  - `My Learning` — Play card icon, neutral text.
  - `Achievements` — Trophy icon.
  - `Certifications` — Ribbon certificate icon.
  - `Quizzes` — Star / puzzle badge icon.
- **Section: "ACCOUNT":**
  - `Profile` — User outline icon.
  - `Settings` — Gear / cog icon.
  - `Support` — Question circle icon.
- **Bottom Pinned Action:**
  - `Sign out` — Exit door icon with bold black label.

### 6.3 Hero Greeting Row

- **Heading:** Large `"Hello Karan!"` (34px bold).
- **Mascot Avatar:** Round cream circle (`#FDEFC3`) with `2px` black outline containing the friendly squirrel face.
- **Speech Bubble:** Rounded cream pill (`#FDEFC3`) with left-pointing tail:
  - Copy: `"You're on fire! 🔥 Keep the 9-day streak going!"` (with bold `9-day streak`).

### 6.4 Four Stat Tiles (Horizontal Row)

All tiles are square (~120px × 120px), bordered by `2px solid #1A1A1A`, with metric at top-left and vector illustration anchored bottom-right:

1. **XP Tile (`#FDEFC3` Cream):**
   - Value: `1,320 XP` | Label: `Current XP`
   - Illustration: Gold faceted hex-coin badge.
2. **Level Tile (`#DCE8FB` Soft Blue):**
   - Value: `Trainee` | Label: `Your Level`
   - Illustration: 3D isometric blue faceted diamond.
3. **Streak Tile (`#FFD966` Warm Yellow):**
   - Value: `9 Days` | Label: `Streak`
   - Illustration: Two-tone dynamic orange & yellow flame.
4. **Rank Tile (`#F9B9B9` Soft Pink):**
   - Value: `#10` | Label: `Rank`
   - Illustration: Red 3-tier podium topped with a floating red star.

### 6.5 Course Progress Card (Full Width)

- **Header:**
  - Title: `"Course Progress"` (bold).
  - Subtitle: `"Continue where you left off"` (muted).
  - Top-Right: Peach corner circle with circular arrow button (`↗`).
- **Left Thumbnail Block (`#FDD9B5` Peach):**
  - Title: `"UI/UX Designing"` (or active NCERT subject).
  - Central Play Button: Bright orange circle (`#E8800A`) with white triangle and black outline.
  - Caption: `"Module 4 of 6"`.
- **Divider:** Vertical `1.5px dashed #1A1A1A` line.
- **Right Progress Metrics:**
  - **Item 1:** `"Module - 4"`, 6px orange progress bar on pale peach track, right-aligned `"67% completed"`, gold coin hint `"+120 XP on completion"`.
  - **Item 2:** `"Overall Progress"`, 6px orange progress bar on pale peach track, right-aligned `"80% completed"`, gold coin hint `"+500 XP on course completion"`.
  - **CTA:** Bottom-right `"Continue"` pill button (`#E8800A` fill, white bold text, `rounded-full`).

### 6.6 Today's Challenge Card (Left Split Card)

- **Header:** Title `"Today's Challenge"`, subtitle `"Test your skills & earn +50 XP!"`, top-right `↗` arrow.
- **Center Visual Trio:**
  1. Squirrel mascot with worried expression holding a round alarm clock.
  2. Central bright orange Play button (`#E8800A`) with white play triangle.
  3. Four interlocking vector puzzle pieces (cyan, green, yellow, pink) with bold outlines.
- **Bottom Info Pill:** White/cream pill with `2px` black border:
  - Copy: `"Updated daily · Skipping resets streak"`.

### 6.7 Learning Efficiency Card (Right Split Card)

- **Header:** Title `"Learning Efficiency"`.
- **Middle Section:**
  - **Legend (Left):**
    - 🟠 `"Quiz accuracy"` (primary orange dot)
    - 🟡 `"Active Learning"` (yellow dot)
    - 🍑 `"Incomplete Tasks"` (peach dot)
  - **Donut Chart (Right):**
    - 3 concentric segments in orange, yellow, and peach.
    - Center text: `"73%"` in large bold black.
- **Footer Section:**
  - Thin divider rule.
  - Subtitle: `"Weekly report"`.
  - Metrics: `"Quiz Accuracy +4%"` (left) | `"Active Days -1"` (right).

### 6.8 Monthly Activity Calendar Card (Butter Yellow `#FFF4B5`)

- **Header:** Left: `"Monthly Activity 📅"` | Right: Month pill `"June"` (or current month).
- **7-Column Grid:** Headers `M, T, W, T, F, S, S`.
- **Day States:**
  - **Attempted Days (Days 7–26):** Solid orange filled circle (`#E8800A`) with bold white text.
  - **Today (Day 27):** Yellow filled circle with dark outline ring.
  - **Default Days (1–5, 28–30):** Plain dark text numbers.
- **Legend Row:**
  - `Attempted 🟠` | `Today 🟡` | `Max streak: 9 days 🔥`

### 6.9 Leaderboard Card

- **Header:** Title `"Leaderboard"`, subtitle `"This Week's Top Learners"`, mascot peaking with a gold trophy top-right.
- **Podium (Top 3 Learners):**
  - **2nd Place (Left):** Circular avatar, `"Sakshi"`, dark brown block (`#8B4A14`), big number `2`, `1950 XP`, `28 days`.
  - **1st Place (Center):** Circular avatar with trophy glyph, `"Rahul"`, amber block (`#F39C12`), big number `1`, `2120 XP`, `36 days`.
  - **3rd Place (Right):** Circular avatar, `"Pallavi 🏆"`, gold block (`#D9A21B`), big number `3`, `1890 XP`, `27 days`.
- **List Rows (Ranks 4, 5, 6):**
  - White pill with `1.5px` border:
    - Rank `4` · avatar · `"Ananya"` · `🔥 27 days` · `🪙 1820 XP`
    - Rank `5` · avatar · `"Gayathri"` · `🔥 27 days` · `🪙 1810 XP`
    - Rank `6` · avatar · `"Ronika"` · `🔥 26 days` · `🪙 1780 XP`
- **Pinned Current User Row (Rank 10):**
  - Inverted styling: Solid dark black background (`#1A1A1A`), crisp white text, `rounded-full`.
  - `10` · avatar · `"You"` · `🔥 09 days` · `🪙 1320 XP`.

---

## 7. Mascot System Specifications

The squirrel mascot is an expressive anthropomorphic guide with consistent vector styling:

1. **Greeting Pose:** Happy smiling face, upright fluffy tail, used in top hero banner.
2. **Timer / Urgency Pose:** Holding a round alarm clock, slightly anxious expression, indicating deadline / streak loss aversion in "Today's Challenge".
3. **Winner / Trophy Pose:** Raising a golden trophy with sparkling stars, encouraging competitive mastery in "Leaderboard".

---

## 8. CSS Design Tokens & Variable Mapping

```css
:root {
  /* Brand Primary */
  --color-primary: #e8800a;
  --color-primary-dark: #c96a00;

  /* Neo-Brutalist Ink & Text */
  --color-ink: #1a1a1a;
  --color-text: #222222;
  --color-text-muted: #6b6b6b;
  --color-divider: #dddddd;

  /* Surface Pastel Fills */
  --surface-white: #ffffff;
  --surface-cream: #fdefc3;
  --surface-butter: #fff4b5;
  --surface-yellow: #ffd966;
  --surface-blue: #dce8fb;
  --surface-pink: #f9b9b9;
  --surface-peach: #fdd9b5;
  --surface-peach-light: #feebcf;

  /* Leaderboard Podium Colors */
  --podium-1: #f39c12;
  --podium-2: #8b4a14;
  --podium-3: #d9a21b;

  /* Shape & Radii */
  --border-width: 2px;
  --border-color: #1a1a1a;
  --radius-shell: 28px;
  --radius-card: 22px;
  --radius-tile: 18px;
  --radius-pill: 9999px;

  /* Shadows */
  --shadow-card: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-shell: 0 20px 50px rgba(0, 0, 0, 0.12);
}
```

---

## 9. Responsive Breakpoints & Adaptive Layout

- **Desktop (`≥ 1280px`):** Full 3-column layout matching the mockup (~230px sidebar, ~640px center, ~330px right rail).
- **Tablet (`1024px – 1279px`):** Sidebar collapses to icon rail (~80px); Right column stacks below Main column or shifts to tabbed view.
- **Mobile (`< 1024px`):** Single column stack:
  - Top navigation with hamburger / drawer.
  - Stat tiles wrap into a 2×2 grid.
  - Challenge and Efficiency cards stack vertically.
  - Calendar and Leaderboard stack cleanly at bottom.
