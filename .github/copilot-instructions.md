# GitHub Copilot Instructions

## Project Overview

This repository contains a multi-game showcase platform for a SoftUni school event.

The main platform is called **GameHub** and acts as a central launcher and presentation layer for multiple standalone student-made games.

---

# IMPORTANT

Until explicitly stated otherwise, DO NOT:

* Modify student game folders
* Create random game implementations
* Refactor unrelated projects
* Touch external repositories
* Generate placeholder games
* Create unnecessary backend systems

The focus right now is ONLY the actual hub platform.

---

# Tech Stack

The GameHub platform MUST use:

* React
* Vite
* TypeScript
* TailwindCSS

The project should follow a modern frontend architecture with reusable components and clean folder structure.

---

# Design Requirements

The platform should feel:

* Extremely modern
* Sleek
* Premium
* Dynamic
* Highly animated
* Responsive
* Smooth and polished

The overall visual direction is:

* Dark themed
* Modern SaaS/game launcher inspired
* Motion-heavy
* Interactive
* Minimal but visually impressive

Animations are VERY important.

Use:

* Smooth transitions
* Motion effects
* Hover animations
* Scroll animations
* Entrance animations
* Animated backgrounds
* Interactive UI feedback
* Dynamic lighting/glow effects where appropriate

Avoid:

* Generic bootstrap-looking UI
* Flat/static layouts
* Boring spacing
* Default browser styling
* Basic school-project appearance

The platform should feel like a real modern product.

---

# Design Reference File

A separate file exists:

```text
/GameHub/.github/design.md
```

This file contains visual direction, inspiration, styling ideas, layout ideas, animation guidance, and design language.

IMPORTANT:

* Follow the design file ONLY where relevant
* Do NOT blindly implement every single thing inside it
* Use judgment and adapt ideas appropriately
* Prioritize cohesion and quality over feature spam

The design file is guidance, not strict law.

---

# Architecture Guidelines

Keep the project scalable and organized.

Preferred structure:

```text
/GameHub
├── src
│   ├── components
│   ├── pages
│   ├── layouts
│   ├── data
│   ├── hooks
│   ├── animations
│   ├── styles
│   └── types
```

Components should be:

* Reusable
* Modular
* Cleanly separated
* Easy to extend

---

# Game Integration Philosophy

Games should be treated as standalone modules.

DO NOT:

* Merge all games into one codebase
* Rewrite student projects
* Force all games into React components

The hub should instead:

* Display games
* Organize games
* Launch games
* Embed/link games cleanly

Games may later be loaded through:

* iframe embedding
* static builds
* standalone launch pages

The hub itself should remain independent from game internals.

---

# Code Style

Prefer:

* Clean readable TypeScript
* Functional React components
* Tailwind utility classes
* Reusable UI primitives
* Consistent spacing and typography
* Motion systems that are easy to maintain

Avoid:

* Massive monolithic files
* Overengineering
* Unnecessary abstractions
* Complex state management unless truly needed
* Dead code
* Premature optimization

---

# Animation Guidelines

Animations are a core part of the experience.

Prioritize:

* Framer Motion
* Tailwind animations
* GPU-accelerated transforms
* Smooth opacity/transforms
* Staggered entrances
* Responsive motion timing

Avoid:

* Laggy effects
* Excessive particle spam
* Janky parallax
* Overly distracting motion
* Cheap-looking glow abuse

The UI should feel smooth and intentional.

---

# UI Direction

Inspirations include:

* Steam
* Linear
* Raycast
* modern game launchers
* premium SaaS landing pages
* futuristic dashboards

The platform should balance:

* gaming aesthetic
* professional polish
* modern frontend trends

---

# Current Priorities

Current focus areas:

1. Main landing page
2. Game library/grid
3. Navigation system
4. Responsive layout
5. Motion/animation systems
6. Modern UI foundation
7. Reusable components

DO NOT prematurely implement:

* backend systems
* authentication
* databases
* multiplayer
* leaderboards
* analytics
* admin systems

Keep focus on frontend experience first.

---

# Final Notes

This project is intended to be visually impressive during a real-world event presentation.

Every UI element should feel intentional, polished, animated, and modern.

Quality > quantity.
Polish > unnecessary complexity.
Experience > feature count.
