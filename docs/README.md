# Session Wizard

A modular web-based toolkit designed to help Speech-Language Pathologists (SLPs) and cognitive rehabilitation clinicians set therapy goals, track client progress, and collect session data. Created by Lucas James.

## Features

- **Goal Builder**: Unified SMART Goal composer + Goal Attainment Scale (GAS) table generator
- **Progress Monitor**: Document client progress across multiple therapy sessions (CSV import/export, print)
- **Therapy Session Data Taker**: Customize real-time data collection templates for various interventions
- **Homework Tracker**: Create customizable, printable home program logs with drag-and-drop components.

### 🔧 Technical Features
- Progressive Web App (PWA) - works offline and can be installed
- Responsive design for desktop and mobile devices
- No external dependencies - runs entirely in the browser
- Dark/light theme support

## Quick Start

1. **Development Server**:
   ```bash
   npm run dev
   ```
   This starts a live server at `http://localhost:8080`

2. **Production**: Simply serve the files from any web server - no build step required

Desktop build
---------------
There is a minimal Electron wrapper under `session-wizard-desktop-build/` for creating a standalone Windows executable using `electron-builder`.

From PowerShell:

```powershell
cd session-wizard-desktop-build
npm install
npm run start    # to run the app
npm run build    # to create an installer (Windows)
```

## Project Structure

```
├── index.html              # Main dashboard
├── manifest.json           # PWA configuration
├── service-worker.js       # Offline support
├── assets/
│   ├── css/               # Styles and fonts
│   ├── fonts/             # Inter font files
│   ├── img/               # Icons and images
│   └── js/                # Core JavaScript
└── tools/                 # Individual tool modules
    ├── goal-builder/                 # SMART + GAS combined
    ├── progress-monitor/             # Longitudinal performance tracker
    ├── homework-tracker/             # Home program log builder
    └── therapy-data-session-taker/   # Detailed session data capture

Legacy/archived Electron and split tool folders are stored under `_archived_cleanout/` and excluded from active distribution.

## Maintenance & Contribution

See `CONTRIBUTING.md` for coding standards, naming conventions, and service worker update procedure.

Typical maintenance workflow:
1. Add or modify tool assets under `tools/<tool-name>/`.
2. Bump `CACHE_NAME` + adjust `urlsToCache` in `service-worker.js` if new offline-critical files were added.
3. Smoke test each tool (load, print/export, clipboard features, offline reload).
4. Document noteworthy changes in `CHANGELOG.md`.

## Offline Behavior

The service worker precaches the dashboard, shared assets, and each tool entry page. Dynamic user-entered content is not persisted—export or copy/print before closing the page if you need a record.
```

## Academic Foundation

This toolkit is inspired by evidence-based practices from cognitive rehabilitation research, particularly *Transforming Cognitive Rehabilitation: Effective Instructional Methods* (Sohlberg, Hamilton, & Turkstra, 2023).

## Works Cited

Bard-Pondarré, R., Villepinte, C., Roumenoff, F., Lebrault, H., Bonnyaud, C., Pradeau, C., Bensmail, D., Isner-Horobeti, M.-E., & Krasny-Pacini, A. (2023). Goal Attainment Scaling in rehabilitation: An educational review providing a comprehensive didactical tool box for implementing Goal Attainment Scaling. *Journal of Rehabilitation Medicine*, *55*, jrm6498. https://doi.org/10.2340/jrm.v55.6498

Davis, G. A. (1980). A critical look at PACE therapy. *Clinical Aphasiology: Proceedings of the Conference 1980*, 248–257. http://aphasiology.pitt.edu/567/

Sohlberg, M. M., Hamilton, J., & Turkstra, L. (2023). *Transforming cognitive rehabilitation: Effective instructional methods*. The Guilford Press.
