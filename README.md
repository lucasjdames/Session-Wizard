# Session Wizard

Session Wizard is a modular toolkit to help Speech-Language Pathologists (SLPs) and rehabilitation professionals create therapy goals, collect session data, and track client progress. The project is authored and maintained by Lucas James.

## What’s included

- Goal Builder — SMART goal composer with Goal Attainment Scale (GAS) support
- Therapy Session Data Taker — customizable real-time data collection templates
- Homework Tracker — printable, customizable home program logs

### Technical highlights

- Desktop-first packaging via Electron (see `session-wizard-desktop-build/`) — runs offline as a standalone desktop app
- Responsive, accessible UI with dark/light theme support

## Academic foundation & works cited

This toolkit is grounded in evidence-based practices from cognitive rehabilitation research, especially *Transforming Cognitive Rehabilitation: Effective Instructional Methods* (Sohlberg, Hamilton, & Turkstra, 2023).

Bard-Pondarré, R., Villepinte, C., Roumenoff, F., Lebrault, H., Bonnyaud, C., Pradeau, C., Bensmail, D., Isner-Horobeti, M.-E., & Krasny-Pacini, A. (2023). Goal Attainment Scaling in rehabilitation: An educational review providing a comprehensive didactical tool box for implementing Goal Attainment Scaling. Journal of Rehabilitation Medicine, 55, jrm6498. https://doi.org/10.2340/jrm.v55.6498

Sohlberg, M. M., Hamilton, J., & Turkstra, L. (2023). Transforming cognitive rehabilitation: Effective instructional methods. The Guilford Press.

Davis, G. A. (1980). A critical look at PACE therapy. Clinical Aphasiology: Proceedings of the Conference 1980, 248–257. http://aphasiology.pitt.edu/567/

Nicholas, L. E., & Brookshire, R. H. (1993). A System for Quantifying the Informativeness and Efficiency of the Connected Speech of Adults With Aphasia. Journal of Speech, Language, and Hearing Research, 36(2), 338–350. https://doi.org/10.1044/jshr.3602.338

## Tutorial — quick guide

This short tutorial explains the common workflows and features clinicians will use in Session Wizard.

Features
- Copy to Clipboard: produces a compact, easy-to-read text summary of the current page contents. Raw data is generally not included. Use this to paste concise clinical notes or brief progress updates into electronic health records, progress reports, or messaging systems.
- Export to PDF: creates a print-ready PDF that preserves layout, formatting, and raw data. Use this for documentation to include in charts, to hand to clients, or to attach to emails.
- File → Save / Load: Session Wizard preserves your work when navigating between tools during a single session. When you close the Session Wizard app, all data will be lost unless you choose to save each Session Wizard tool page individually to a local file. Files are stored locally on your device. You can use save to pause and resume a session for later use. Export (PDF/Copy) is preferred to share readable content with others. 
- Theme toggle: click the upper right-hand corner (sun/moon emojis) to toggle between light and dark themes.
- Full screen mode: Press F11 to toggle full-screen.

Primary tools
- Goal Builder: assemble SMART goals using drag-and-drop components. The interface guides you through measurable, time-bound, and functional goal components and helps you construct Goal Attainment Scales (GAS) to quantify outcome expectations. Use the included checklists to improve goal quality and reproducibility.
- Therapy Session Data Taker: build or select a template for in-session data collection. Templates support a wide range of component types (text, numeric, checkboxes) and special components for common interventions (PACE, structured discourse, spaced retrieval). The custom data table lets you record trial-by-trial performance and export the resulting data for analysis or records. You can click on the Quick Tool tabs (right side of the the window) to open the Stopwatch/Timer and Clicker Counter tools.
- Homework Tracker: design printable home-program logs by dragging exercises onto the canvas, setting labels, descriptions, and frequency. The Log Details allows you to customise identifying information and the number of weeks to print. The Exercise Group component bundles related activities into a compact layout for easy printing and client handouts. The Reflection section offers text-box or visual analog scale fields for self-reflection/rating and comments on a weekly, rather than daily, schedule.

Tips
- 
- All save files are local. If you need to share information, prefer Export to PDF or Copy to Clipboard.
- Save/Load isn't just for saving client data; try using it to make whole new custom templates. Configure a template to suit your needs, setting up Custom Data Tables, component titles, etc; then save and label it according to its use case so you can easily load it back up later for a new client or session.

## Downloads / Releases

Binary installers for the desktop app are published on GitHub Releases. To download the latest installer for your platform visit:

- https://github.com/lucasjdames/Session-Wizard/releases/latest

If you'd like to build locally, the Electron desktop wrapper is in `session-wizard-desktop-build/`. The CI will produce installers for supported platforms when a release tag (for example `v1.0.0`) is pushed.

Windows: run the `.exe` installer from Releases.

macOS: open the `.dmg` and drag the app into Applications (mac builds require a macOS runner).

If you plan to distribute broadly, consider signing your installers (Windows code signing / Apple notarization) to avoid SmartScreen or Gatekeeper warnings.

