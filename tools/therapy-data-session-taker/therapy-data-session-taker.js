/*
 * Tool: Therapy Session Data Taker
 * Responsibilities:
 *  - Dynamic construction and management of diverse therapy session data components.
 *  - Export pathways: printable HTML, clipboard summaries.
 *  - Specialized modules: discourse analysis, swallowing trial tracking, timers, stimulus practice tables, PACE tasks, SRT tables.
 * Structure:
 *  - Currently monolithic (~5k lines); future refactor should segment by feature (Print/Export, Timers, Discourse, Swallow, Tables, Utilities).
 *  - Relies on extensive DOM queries; event handlers bound after DOMContentLoaded.
 * Notes:
 *  - Avoid introducing global symbol collisions; all additions should namespace future helpers or wrap in IIFEs.
 */
// === MODULE: Print / Export (Printable Page) ===
// Printable Page functionality
// Ensure this runs only once after DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    if (window.DomUtils) {
        DomUtils.autoResizeTextareas();
        DomUtils.initDefaultDates(['#sessionDate']);
    }
    const printBtn = document.getElementById('printPageBtn');
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            const dropzone = document.getElementById('templateDropzone');
            if (!dropzone) return;

            // Get Patient and Date from top input fields
            const patientInput = document.getElementById('patientName');
            const dateInput = document.getElementById('sessionDate');
            const patient = patientInput ? patientInput.value.trim() : '';
            const date = dateInput ? dateInput.value.trim() : '';

            // Start building printable HTML
            let html = `<!DOCTYPE html><html><head><title>Printable Session Data</title><style>
                :root { --print-bg: var(--tdst-surface, var(--color-surface, #fff)); --print-text: var(--tdst-text, var(--color-text, #000)); --print-muted: var(--tdst-muted, var(--color-border, #999)); }
                body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 16px; background: var(--print-bg); line-height: 1.5; color: var(--print-text); }
                h1 { font-size: 1.6em; margin-bottom: 0.5em; color: var(--color-accent, #2196f3); border-bottom: 1px solid var(--color-accent, #2196f3); padding-bottom: 0.2em; font-weight: 600; }
                h2 { font-size: 1.1em; margin-top: 1em; margin-bottom: 0.4em; color: var(--print-text); font-weight: 500; }
                .meta-row { margin-bottom: 1em; font-size: 1em; padding: 8px; background: var(--print-bg); border-left: 2px solid var(--print-text); }
                .meta-label { font-weight: 600; margin-right: 0.5em; color: var(--print-text); }
                .component-block { margin-bottom: 1em; page-break-inside: avoid; border: 1px solid var(--print-muted); padding: 10px; border-radius: 2px; }
                .component-title { font-weight: 600; font-size: 1.05em; margin-bottom: 0.4em; color: var(--print-text); border-bottom: 1px solid var(--print-muted); padding-bottom: 0.2em; }
                .component-content { margin-bottom: 0.4em; white-space: pre-wrap; color: var(--print-text); }
                table { border-collapse: collapse; width: 100%; margin-bottom: 0.6em; font-size: 0.9em; }
                th, td { border: 1px solid var(--print-muted); padding: 4px 6px; text-align: left; }
                th { background: var(--tdst-surface-alt, var(--color-surface-alt, #f0f0f0)); font-weight: 600; color: var(--print-text); }
                tbody tr:nth-child(even) { background: color-mix(in srgb, var(--tdst-surface, var(--color-surface, #fff)) 95%, var(--tdst-muted, var(--color-border, #999)) 5%); }
                .stats-row { margin-bottom: 3px; font-size: 0.9em; }
                .swallow-stats-display, .swallow-analysis-container { margin-bottom: 0.4em; padding: 6px; background: var(--print-bg); border-radius: 2px; }
                .trial-success { color: var(--print-text); font-weight: 600; }
                .trial-fail { color: var(--print-text); font-weight: 600; text-decoration: underline; }
                .status-indicator { font-weight: 600; margin-bottom: 0.3em; padding: 4px; border-radius: 2px; }
                .status-pass { background: var(--tdst-surface-alt, var(--color-surface-alt, #f0f0f0)); color: var(--print-text); border: 1px solid var(--print-muted); }
                .status-fail { background: var(--tdst-surface-alt, var(--color-surface-alt, #f0f0f0)); color: var(--print-text); border: 1px solid var(--print-muted); }
                .status-in-progress { background: var(--tdst-surface-alt, var(--color-surface-alt, #f0f0f0)); color: var(--print-text); border: 1px solid var(--print-muted); }
                /* Discourse Transcript Editor Styles */
                .discourse-transcript-textarea[contenteditable] { font-family: inherit; }
                .discourse-transcript-textarea[contenteditable][data-placeholder]:empty::before {
                    content: attr(data-placeholder);
                    color: #666;
                    font-style: italic;
                    pointer-events: none;
                }
                .discourse-transcript-textarea[contenteditable]:focus::before { display: none; }
                .excluded-word { 
                    color: #000 !important; 
                    text-decoration: line-through; 
                    background-color: #f0f0f0; 
                    padding: 1px 2px;
                    border-radius: 1px;
                    border: 1px solid #999;
                }
                .ciu-word {
                    color: #000 !important;
                    background-color: #f0f0f0;
                    padding: 1px 2px;
                    border-radius: 1px;
                    font-weight: 600;
                    border: 1px solid #999;
                }
                /* Print-specific styles for discourse transcript markings */
                .discourse-transcript-print {
                    line-height: 1.5;
                    margin: 6px 0;
                    padding: 6px;
                    background: #f8f8f8;
                    border-left: 2px solid #333;
                    border-radius: 2px;
                }
                @media print {
                    body { padding: 12px; font-size: 10pt; }
                    .excluded-word { 
                        color: #000 !important; 
                        text-decoration: line-through !important; 
                        background-color: #f0f0f0 !important; 
                        padding: 1px 2px !important;
                        border-radius: 1px !important;
                        border: 0.5pt solid #999 !important;
                    }
                    .ciu-word {
                        color: #000 !important;
                        background-color: #f0f0f0 !important;
                        padding: 1px 2px !important;
                        border-radius: 1px !important;
                        font-weight: 600 !important;
                        border: 0.5pt solid #999 !important;
                    }
                    .discourse-transcript-print {
                        background: #f8f8f8 !important;
                        border-left: 1pt solid #333 !important;
                        margin: 4pt 0 !important;
                        padding: 4pt !important;
                    }
                    .component-block { 
                        border: 0.5pt solid #999; 
                        margin-bottom: 8pt; 
                        padding: 6pt;
                    }
                    h1 { 
                        border-bottom: 1pt solid #2196f3; 
                        color: #2196f3;
                        font-size: 14pt;
                        margin-bottom: 6pt;
                    }
                    h2 {
                        font-size: 11pt;
                        margin-top: 6pt;
                        margin-bottom: 3pt;
                    }
                    .meta-row {
                        padding: 4pt;
                        margin-bottom: 6pt;
                        font-size: 9pt;
                    }
                    table {
                        font-size: 8pt;
                    }
                    th, td {
                        padding: 2pt 3pt;
                        border: 0.5pt solid #999;
                    }
                }
            </style></head><body>`;

            html += `<h1>Therapy Session Data</h1>`;
            html += `<div class='meta-row'><span class='meta-label'>Patient:</span> ${patient} &nbsp; <span class='meta-label'>Date:</span> ${date}</div>`;

            // Iterate components and render static data
            Array.from(dropzone.children).forEach(compEl => {
                const labelEl = compEl.querySelector('.component-label, .component-label-editable');
                const label = labelEl ? (labelEl.textContent || labelEl.value || '').trim() : '';
                if (!label) return;

                html += `<div class='component-block'><div class='component-title'>${label}</div>`;

                // Skip generic input processing for components that have specific handlers
                const hasSpecificHandler = compEl.querySelector('table.practice-table') || 
                                         compEl.querySelector('table.pace-table') || 
                                         compEl.querySelector('table.custom-data-table') ||
                                         compEl.querySelector('table.srt-table') ||
                                         compEl.querySelector('.word-count-display') ||
                                         compEl.querySelector('.sentence-count-display') ||
                                         compEl.querySelector('.transcript-stats-display') ||
                                         compEl.querySelector('.swallow-trial-tracker') ||
                                         compEl.querySelector('.timer-display');

                // Standard text/textarea (only if no specific handler)
                if (!hasSpecificHandler) {
                    const input = compEl.querySelector('input[type="text"], textarea');
                    if (input) {
                        html += `<div class='component-content'>${input.value.trim().replace(/\n/g, '<br>')}</div>`;
                    }
                }

                // Handle discourse treatment components with their statistics
                const wordCountDisplay = compEl.querySelector('.word-count-display');
                if (wordCountDisplay) {
                    const wordListTextarea = compEl.querySelector('.word-list-textarea');
                    const cuesTextarea = compEl.querySelector('.word-list-cues');
                    
                    if (wordListTextarea) {
                        html += `<div class='component-content'><strong>Words:</strong><br>${wordListTextarea.value.trim().replace(/\n/g, '<br>')}</div>`;
                    }
                    if (cuesTextarea && cuesTextarea.value.trim()) {
                        html += `<div class='component-content'><strong>Cues/Comments:</strong><br>${cuesTextarea.value.trim().replace(/\n/g, '<br>')}</div>`;
                    }
                    html += `<div class='component-content'><em>${wordCountDisplay.textContent}</em></div>`;
                }

                const sentenceCountDisplay = compEl.querySelector('.sentence-count-display');
                if (sentenceCountDisplay) {
                    const sentenceListTextarea = compEl.querySelector('.sentence-list-textarea');
                    const cuesTextarea = compEl.querySelector('.sentence-list-cues');
                    
                    if (sentenceListTextarea) {
                        html += `<div class='component-content'><strong>Sentences:</strong><br>${sentenceListTextarea.value.trim().replace(/\n/g, '<br>')}</div>`;
                    }
                    if (cuesTextarea && cuesTextarea.value.trim()) {
                        html += `<div class='component-content'><strong>Cues/Comments:</strong><br>${cuesTextarea.value.trim().replace(/\n/g, '<br>')}</div>`;
                    }
                    html += `<div class='component-content'><em>${sentenceCountDisplay.innerHTML}</em></div>`;
                }

                const transcriptStatsDisplay = compEl.querySelector('.transcript-stats-display');
                if (transcriptStatsDisplay) {
                    // Handle discourse transcript with two columns
                    const transcriptEditor = compEl.querySelector('.discourse-transcript-textarea[contenteditable]');
                    const transcriptTextarea = compEl.querySelector('.discourse-transcript-textarea:not([contenteditable])');
                    const transcriptCues = compEl.querySelector('.discourse-transcript-cues');
                    
                    if ((transcriptEditor || transcriptTextarea) && transcriptCues) {
                        // Get content, preserving HTML markup for contentEditable
                        const transcriptContent = transcriptEditor ? 
                            transcriptEditor.innerHTML.trim() : 
                            (transcriptTextarea ? transcriptTextarea.value.trim() : '');
                        const cuesText = transcriptCues.value.trim();
                        
                        // Get time duration
                        const minutesInput = compEl.querySelector('input[type="number"][min="0"][max="99"]');
                        const secondsInput = compEl.querySelector('input[type="number"][min="0"][max="59"]');
                        let durationText = '';
                        if (minutesInput && secondsInput) {
                            const minutes = minutesInput.value || '0';
                            const seconds = secondsInput.value || '0';
                            if (minutes !== '0' || seconds !== '0') {
                                durationText = `Duration: ${minutes} min ${seconds} sec`;
                            }
                        }
                        
                        if (transcriptContent || cuesText || durationText) {
                            html += `<div class='component-content'>`;
                            if (transcriptContent) {
                                // For contentEditable, preserve HTML markup but clean up formatting
                                const cleanContent = transcriptEditor ? 
                                    transcriptContent.replace(/\s+/g, ' ').trim() : 
                                    transcriptContent.replace(/\n/g, '<br>').trim();
                                html += `<strong>Discourse Transcript:</strong><br><div class="discourse-transcript-print">${cleanContent}</div><br>`;
                            }
                            if (durationText) {
                                html += `<strong>${durationText}</strong><br><br>`;
                            }
                            if (cuesText) {
                                html += `<strong>Cues/Comments:</strong><br>${cuesText.replace(/\n/g, '<br>')}<br><br>`;
                            }
                            html += `</div>`;
                        }
                    }
                    
                    html += `<div class='component-content'><em>${transcriptStatsDisplay.textContent}</em></div>`;
                }

                // Render static tables for PACE, Practice, SRT, Swallow Data
                const paceTable = compEl.querySelector('table.pace-table:not(.practice-table):not(.srt-table)');
                if (paceTable) {
                    // Build static table from rows (hide delete column)
                    const rows = compEl.querySelectorAll('table.pace-table tbody tr');
                    const originalHeader = paceTable.querySelector('thead').innerHTML;
                    // Remove the last header column (delete button column)
                    const cleanHeader = originalHeader.replace(/<th[^>]*><\/th>\s*(?=<\/tr>)/, '');
                    html += `<table class='pace-table'><thead>${cleanHeader}</thead><tbody>`;
                    rows.forEach(row => {
                        html += '<tr>';
                        // Trial number
                        const trialNum = row.children[0].textContent;
                        console.log('Trial:', trialNum);
                        html += `<td>${trialNum}</td>`;
                        // Offer/Receive
                        html += `<td>${row.querySelector('.pace-offer-receive') ? row.querySelector('.pace-offer-receive').value : ''}</td>`;
                        // Level (radio group)
                        const radios = row.querySelectorAll('.pace-radio-group input[type="radio"]');
                        let selectedLevel = '';
                        radios.forEach(radio => { if (radio.checked) selectedLevel = radio.value; });
                        html += `<td>${selectedLevel}</td>`;
                        // Comments
                        html += `<td>${row.querySelector('.pace-comments') ? row.querySelector('.pace-comments').value : ''}</td>`;
                        // Omit delete button column entirely
                        html += '</tr>';
                    });
                    html += '</tbody></table>';
                }

                const practiceTable = compEl.querySelector('table.practice-table');
                if (practiceTable) {
                    const rows = practiceTable.querySelectorAll('tbody tr');
                    const originalHeader = practiceTable.querySelector('thead').innerHTML;
                    const cleanHeader = originalHeader.replace(/<th[^>]*><\/th>\s*(?=<\/tr>)/, '');
                    html += `<table class='practice-table'><thead>${cleanHeader}</thead><tbody>`;
                    rows.forEach(row => {
                        const trialCell = row.children[0];
                        const stimulusCell = row.children[1];
                        const performanceCell = row.children[2];
                        const supportCell = row.children[3];
                        const commentsCell = row.children[4];

                        // Read from either input or textarea (standardized by data-type)
                        const stimulusValue = stimulusCell.querySelector('[data-type="stimulus"]')?.value || '';
                        const performanceRadio = performanceCell.querySelector('div[data-type="performance"] input:checked');
                        let performanceValue = performanceRadio ? performanceRadio.value : '';
                        // Map numeric to label
                        const performanceMap = { '2': '2 (Accurate)', '1': '1 (Partial)', '0': '0 (Off-Target/NR)' };
                        performanceValue = performanceMap[performanceValue] || performanceValue;
                        const supportRadio = supportCell.querySelector('div[data-type="level"] input:checked');
                        let supportValue = supportRadio ? supportRadio.value : '';
                        // Ensure consistent capitalization (already correct in source but just in case)
                        if (supportValue.toLowerCase() === 'independent') supportValue = 'Independent';
                        if (supportValue.toLowerCase() === 'cued') supportValue = 'Cued';
                        const commentsValue = commentsCell.querySelector('[data-type="comments"]')?.value || '';

                        html += '<tr>' +
                            `<td>${trialCell.textContent.trim()}</td>` +
                            `<td>${stimulusValue.replace(/\n/g, '<br>')}</td>` +
                            `<td>${performanceValue}</td>` +
                            `<td>${supportValue}</td>` +
                            `<td>${commentsValue.replace(/\n/g, '<br>')}</td>` +
                            '</tr>';
                    });
                    html += '</tbody></table>';
                    // Only include the stats block that is a direct sibling of the practiceTable (not any generic or nested stats)
                    let practiceStats = null;
                    let sibling = practiceTable.nextElementSibling;
                    while (sibling) {
                        if (sibling.classList && sibling.classList.contains('swallow-stats-display')) {
                            practiceStats = sibling;
                            break;
                        }
                        sibling = sibling.nextElementSibling;
                    }
                    if (practiceStats) {
                        html += `<div class='swallow-stats-display'>${practiceStats.innerHTML}</div>`;
                    }
                }

                // Only output a single static table (built from the first live custom-data-table found)
                const customDataTable = compEl.querySelector('table.custom-data-table');
                if (customDataTable) {
                    const rows = customDataTable.querySelectorAll('tbody tr');
                    // Build printed header row from TH text content, excluding the delete column
                    const ths = Array.from(customDataTable.querySelectorAll('thead th'));
                    // Build arrays of visible headers and their keys, skipping any with data-key 'delete'
                    const visible = ths.map((th, idx) => ({ el: th, key: th.dataset.key || `col${idx}`, idx })).filter(h => h.key !== 'delete');
                    const cleanHeader = `<tr>${visible.map(h => `<th>${(h.el.textContent || '').trim()}</th>`).join('')}</tr>`;
                    html += `<table class='custom-data-table'><thead>${cleanHeader}</thead><tbody>`;

                    // For each row, extract cells by using the visible header indices so we don't pick the delete column
                    rows.forEach(row => {
                        html += '<tr>';
                        visible.forEach(h => {
                            const key = h.key;
                            const cell = row.children[h.idx];
                            if (!cell) { html += '<td></td>'; return; }

                            if (key === 'trial') {
                                html += `<td>${cell.textContent.trim()}</td>`;
                                return;
                            }

                            if (key === 'stimulus' || key === 'comments' || key.startsWith('extra')) {
                                const textarea = cell.querySelector('textarea');
                                if (textarea) html += `<td>${textarea.value.replace(/\n/g, '<br>')}</td>`;
                                else html += `<td>${cell.textContent.trim()}</td>`;
                                return;
                            }

                            if (key === 'dataCol1' || key === 'dataCol2') {
                                const radioGroup = cell.querySelector('.pace-radio-group');
                                if (radioGroup) {
                                    const checkedRadio = radioGroup.querySelector('input:checked');
                                    let selectedValue = '';
                                    if (checkedRadio) {
                                        const raw = (checkedRadio.nextElementSibling && checkedRadio.nextElementSibling.textContent) ? checkedRadio.nextElementSibling.textContent.trim() : '';
                                        const m = raw.match(/^(\d+)\s*[-–—]\s*(.+)$/);
                                        if (m) selectedValue = `${m[1]} (${m[2].trim()})`;
                                        else if (!isNaN(Number(checkedRadio.value))) selectedValue = `${checkedRadio.value} (${raw || ''})`;
                                        else selectedValue = raw || checkedRadio.value || '';
                                    }
                                    html += `<td>${selectedValue}</td>`;
                                } else {
                                    html += '<td></td>';
                                }
                                return;
                            }

                            // Generic fallback
                            const textarea = cell.querySelector('textarea');
                            if (textarea) html += `<td>${textarea.value.replace(/\n/g, '<br>')}</td>`;
                            else html += `<td>${cell.textContent.trim()}</td>`;
                        });
                        html += '</tr>';
                    });
                    html += '</tbody></table>';

                    // Include stats for custom data table (numeric averages produced in the live stats block)
                    let customStats = null;
                    let sibling = customDataTable.nextElementSibling;
                    while (sibling) {
                        if (sibling.classList && sibling.classList.contains('swallow-stats-display')) {
                            customStats = sibling;
                            break;
                        }
                        sibling = sibling.nextElementSibling;
                    }
                    if (customStats) {
                        html += `<div class='swallow-stats-display'>${customStats.innerHTML}</div>`;
                    }
                }

                const srtTable = compEl.querySelector('table.srt-table');
                if (srtTable) {
                    // Build static SRT table (hide delete column, clean up empty marks)
                    const originalHeader = srtTable.querySelector('thead').innerHTML;
                    // Remove the last header column (delete button column)
                    const cleanHeader = originalHeader.replace(/<th[^>]*><\/th>\s*(?=<\/tr>)/, '');
                    html += `<table class='srt-table'><thead>${cleanHeader}</thead><tbody>`;
                    const rows = compEl.querySelectorAll('table.srt-table tbody tr');
                    rows.forEach(row => {
                        html += '<tr>';
                        for (let i = 0; i < row.children.length - 1; i++) { // -1 to skip delete column
                            const cell = row.children[i];
                            // For mark cells, show check/cross only if selected, otherwise blank
                            if (cell.querySelector('.srt-correct.active')) {
                                html += `<td style='text-align:center;color:#388e3c;font-weight:bold;'>&#x2714;</td>`;
                            } else if (cell.querySelector('.srt-incorrect.active')) {
                                html += `<td style='text-align:center;color:#d32f2f;font-weight:bold;'>&#x2716;</td>`;
                            } else if (cell.querySelector('.srt-correct, .srt-incorrect')) {
                                // This is a mark cell but nothing is selected - leave blank
                                html += `<td></td>`;
                            } else if (cell.querySelector('input.srt-cvc')) {
                                html += `<td style='text-align:center;'>${cell.querySelector('input.srt-cvc').checked ? 'Yes' : 'No'}</td>`;
                            } else {
                                html += `<td>${cell.textContent.trim()}</td>`;
                            }
                        }
                        html += '</tr>';
                    });
                    html += '</tbody></table>';
                }

                // Swallow Data: show static fields and stats
                const swallowData = compEl.querySelector('.swallow-data-container');
                if (swallowData) {
                    // Level/Target Food
                    const levelInput = swallowData.querySelector('.swallow-level-input');
                    if (levelInput) {
                        html += `<div class='component-content'><strong>Level/Target Food:</strong> ${levelInput.value}</div>`;
                    }
                    // Criteria
                    const passNum = swallowData.querySelector('.criteria-row .criteria-select');
                    if (passNum) {
                        html += `<div class='component-content'><strong>Pass Criteria:</strong> ${passNum.value} out of ${passNum.nextElementSibling.nextElementSibling.value} rightmost trials must be successful</div>`;
                    }
                    const failNum = swallowData.querySelectorAll('.criteria-row .criteria-select')[2];
                    if (failNum) {
                        html += `<div class='component-content'><strong>Fail Criteria:</strong> ${failNum.value} out of ${failNum.nextElementSibling.nextElementSibling.value} rightmost trials must be unsuccessful</div>`;
                    }
                    // Trial Data
                    const trialInput = swallowData.querySelector('.swallow-trial-input');
                    if (trialInput) {
                        html += `<div class='component-content'><strong>Trial Data:</strong> ${trialInput.value}</div>`;
                    }
                }

                // Stats blocks
                const statsBlocks = compEl.querySelectorAll('.swallow-stats-display');
                statsBlocks.forEach(stats => {
                    html += `<div class='swallow-stats-display'>`;
                    Array.from(stats.querySelectorAll('.stats-row')).forEach(row => {
                        html += `<div class='stats-row'>${row.innerHTML}</div>`;
                    });
                    html += `</div>`;
                });

                // Trial breakdowns
                const trialBreakdown = compEl.querySelector('.swallow-trial-breakdown');
                if (trialBreakdown) {
                    html += `<div class='swallow-trial-breakdown'>${trialBreakdown.innerHTML}</div>`;
                }

                // Status indicator
                const statusIndicator = compEl.querySelector('.swallow-status-display');
                if (statusIndicator) {
                    const statusContent = statusIndicator.innerHTML;
                    // Apply appropriate status class based on content
                    let statusClass = 'status-in-progress';
                    if (statusContent.includes('Pass')) statusClass = 'status-pass';
                    else if (statusContent.includes('Fail')) statusClass = 'status-fail';
                    html += `<div class='status-indicator ${statusClass}'>${statusContent}</div>`;
                }

                html += `</div>`;
            });

            html += `</body></html>`;

            // Use DomUtils.openPrintWindow to allow Electron to render a PDF preview, or fallback to window.print()
            if (window.DomUtils && typeof DomUtils.openPrintWindow === 'function') {
                DomUtils.openPrintWindow({ title: 'Printable Session Data', bodyHtml: html, headHtml: '' , autoPrint: true });
            } else {
                const printWin = window.open('', '_blank', 'width=900,height=900');
                printWin.document.open();
                printWin.document.write(html);
                printWin.document.close();
                printWin.focus();
                setTimeout(() => { printWin.print(); }, 400);
            }
        });
    }
});

// === MODULE: Session Timer ===
// Timer/Stopwatch functionality (wrapped for future modular extraction)
(function(global){
class SessionTimer {
    constructor() {
        this.isRunning = false;
        this.startTime = null;
        this.elapsedTime = 0;
        this.targetTime = 0;
        this.mode = 'stopwatch'; // 'stopwatch' or 'timer'
        this.timerInterval = null;
        this.flashTimeout = null;
        this.element = null;
        
        this.init();
    }
    
    init() {
        this.createElement();
        this.updateDisplay();
    }
    
    createElement() {
            // Create main timer container
            this.element = document.createElement('div');
            // container positioning remains dynamic; use centralized pullout styles
            this.element.className = 'tds-pullout session-timer';
            // Default top offset; precise positioning and toggling handled by stylesheet and JS
            this.element.style.top = '80px';
            // Ensure the pullout is closed by default. Temporarily disable transition so it's not visible half-open.
            this.element.style.transition = 'none';
            this.element.style.transform = 'translateX(200px)';
        
        // Create the tab button that sticks out
        this.tabElement = document.createElement('div');
        this.tabElement.className = 'tds-pullout-tab';
        // color/gradient is specific per module, keep inline background for accent
        this.tabElement.style.background = 'linear-gradient(135deg, var(--color-accent, #007bff) 0%, color-mix(in srgb, var(--color-accent, #007bff) 85%, black) 100%)';
        this.tabElement.style.border = '1px solid var(--color-border, #e3e7ed)';
        
    this.tabIcon = document.createElement('div');
    this.tabIcon.className = 'tds-tab-icon';
    this.tabIcon.innerHTML = '⏱️';
    this.tabIcon.style.cssText = `font-size:22px;transition: transform 0.2s ease; transform: rotate(0deg);`;
    // Tooltip shown on hover
    this.tabElement.title = 'Stopwatch/Timer';
    this.tabElement.appendChild(this.tabIcon);
        
        // Create the panel content
        this.panelContent = document.createElement('div');
        this.panelContent.className = 'tds-pullout-panel';
        
        // Panel header
        this.panelHeader = document.createElement('div');
        this.panelHeader.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-bottom: 8px;
            border-bottom: 1px solid var(--color-border, #e3e7ed);
        `;
        
        this.panelTitle = document.createElement('h4');
        this.panelTitle.textContent = 'Stopwatch/Timer';
        this.panelTitle.style.cssText = `
            margin: 0;
            font-size: 14px;
            font-weight: 600;
            color: var(--color-text, #333);
        `;
        
        this.panelHeader.appendChild(this.panelTitle);
        
        // Create timer controls row
        this.controlsRow = document.createElement('div');
        this.controlsRow.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 8px;
        `;
        
        // Add hover effects to tab
        this.tabElement.addEventListener('mouseenter', () => {
            this.tabElement.style.transform = 'translateX(-2px)';
            this.tabElement.style.boxShadow = '-4px 0 12px rgba(0,0,0,0.2)';
        });
        
        this.tabElement.addEventListener('mouseleave', () => {
            this.tabElement.style.transform = 'translateX(0)';
            this.tabElement.style.boxShadow = '-2px 0 8px rgba(0,0,0,0.1)';
        });
        
        // Toggle panel on tab click
        this.isOpen = false;
        this.tabElement.addEventListener('click', (e) => {
            e.stopPropagation();
            this.togglePanel();
        });
        
        // Mode selector (stopwatch/timer)
        this.modeSelector = document.createElement('select');
        this.modeSelector.style.cssText = `
            border: none;
            background: var(--color-surface, white);
            font-size: 16px;
            color: var(--color-text, #333);
            cursor: pointer;
            outline: none;
            border-radius: 4px;
            padding: 2px 4px;
            transition: background-color 0.2s ease;
        `;
        this.modeSelector.innerHTML = `
            <option value="stopwatch">⏱️</option>
            <option value="timer">⏰</option>
        `;
        this.modeSelector.title = 'Switch between stopwatch and timer';
        
        // Mode selector - make it two emoji buttons side by side
        this.modeSelector = document.createElement('div');
        this.modeSelector.style.cssText = `
            display: flex;
            gap: 4px;
            width: 100%;
        `;
        
        this.stopwatchBtn = document.createElement('button');
        this.stopwatchBtn.type = 'button';
        this.stopwatchBtn.innerHTML = '⏱️';
        this.stopwatchBtn.title = 'Stopwatch mode - count up';
        this.stopwatchBtn.style.cssText = `
            flex: 1;
            border: 2px solid var(--color-accent, #007bff);
            background: var(--color-accent, #007bff);
            color: white;
            cursor: pointer;
            font-size: 16px;
            padding: 8px;
            border-radius: 6px;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        this.timerBtn = document.createElement('button');
        this.timerBtn.type = 'button';
        this.timerBtn.innerHTML = '⏰';
        this.timerBtn.title = 'Timer mode - count down';
        this.timerBtn.style.cssText = `
            flex: 1;
            border: 2px solid var(--color-border, #dee2e6);
            background: var(--color-surface, white);
            color: var(--color-text, #333);
            cursor: pointer;
            font-size: 16px;
            padding: 8px;
            border-radius: 6px;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        // Add click handlers
        this.stopwatchBtn.addEventListener('click', () => {
            this.setMode('stopwatch');
        });
        
        this.timerBtn.addEventListener('click', () => {
            this.setMode('timer');
        });
        
        // Time display
        this.timeDisplay = document.createElement('span');
        this.timeDisplay.style.cssText = `
            font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Courier New', monospace;
            font-weight: 600;
            font-size: 20px;
            color: var(--color-text, #333);
            text-align: center;
            background: var(--color-surface-alt, #f8f9fa);
            padding: 12px;
            border-radius: 6px;
            border: 1px solid var(--color-border-soft, #e9ecef);
            letter-spacing: 1px;
            transition: all 0.2s ease;
            width: 100%;
            box-sizing: border-box;
            display: block;
        `;
        
        // Timer input (only shown in timer mode)
        this.timerInput = document.createElement('input');
        this.timerInput.type = 'text';
        this.timerInput.placeholder = '5:00';
        this.timerInput.style.cssText = `
            width: 100%;
            border: 1px solid var(--color-border, #ccc);
            border-radius: 6px;
            padding: 8px 10px;
            font-size: 14px;
            text-align: center;
            display: none;
            font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Courier New', monospace;
            background: var(--color-surface, white);
            transition: all 0.2s ease;
            outline: none;
            box-sizing: border-box;
        `;
        this.timerInput.title = 'Enter time in M:SS or MM:SS format';
        
        this.timerInput.addEventListener('focus', () => {
            this.timerInput.style.borderColor = 'var(--color-accent, #007bff)';
            this.timerInput.style.boxShadow = '0 0 0 2px rgba(0, 123, 255, 0.25)';
        });
        
        this.timerInput.addEventListener('blur', () => {
            this.timerInput.style.borderColor = 'var(--color-border, #ccc)';
            this.timerInput.style.boxShadow = 'none';
            this.setTimerTarget();
        });
        
        this.timerInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.setTimerTarget();
                this.timerInput.blur();
            }
        });
        
        // Control buttons - arrange horizontally in panel
        this.buttonsRow = document.createElement('div');
        this.buttonsRow.style.cssText = `
            display: flex;
            gap: 8px;
        `;
        
        this.playPauseBtn = document.createElement('button');
        this.playPauseBtn.type = 'button';
        this.playPauseBtn.innerHTML = '▶️';
        this.playPauseBtn.title = 'Start/Pause';
        this.playPauseBtn.style.cssText = `
            border: none;
            background: linear-gradient(135deg, var(--color-accent, #007bff) 0%, color-mix(in srgb, var(--color-accent, #007bff) 90%, black) 100%);
            color: white;
            cursor: pointer;
            font-size: 14px;
            padding: 10px;
            border-radius: 6px;
            transition: all 0.2s ease;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        this.playPauseBtn.addEventListener('click', () => {
            this.toggleTimer();
        });
        
        this.playPauseBtn.addEventListener('mouseenter', () => {
            this.playPauseBtn.style.transform = 'translateY(-1px)';
            this.playPauseBtn.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
        });
        
        this.playPauseBtn.addEventListener('mouseleave', () => {
            this.playPauseBtn.style.transform = 'translateY(0)';
            this.playPauseBtn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        });
        
        this.resetBtn = document.createElement('button');
        this.resetBtn.type = 'button';
        this.resetBtn.innerHTML = '⏹️';
        this.resetBtn.title = 'Reset';
        this.resetBtn.style.cssText = `
            border: none;
            background: linear-gradient(135deg, var(--color-surface, #f8f9fa) 0%, var(--color-border, #dee2e6) 100%);
            color: var(--color-text, #333);
            cursor: pointer;
            font-size: 14px;
            padding: 10px;
            border-radius: 6px;
            transition: all 0.2s ease;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        this.resetBtn.addEventListener('click', () => {
            this.reset();
        });
        
        this.resetBtn.addEventListener('mouseenter', () => {
            this.resetBtn.style.transform = 'translateY(-1px)';
            this.resetBtn.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
            this.resetBtn.style.background = 'linear-gradient(135deg, var(--color-surface-hover, #e9ecef) 0%, var(--color-border, #dee2e6) 100%)';
        });
        
        this.resetBtn.addEventListener('mouseleave', () => {
            this.resetBtn.style.transform = 'translateY(0)';
            this.resetBtn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
            this.resetBtn.style.background = 'linear-gradient(135deg, var(--color-surface, #f8f9fa) 0%, var(--color-border, #dee2e6) 100%)';
        });
        
        // Assemble the timer
        this.modeSelector.appendChild(this.stopwatchBtn);
        this.modeSelector.appendChild(this.timerBtn);
        
        this.controlsRow.appendChild(this.modeSelector);
        this.controlsRow.appendChild(this.timeDisplay);
        this.controlsRow.appendChild(this.timerInput);
        
        this.buttonsRow.appendChild(this.playPauseBtn);
        this.buttonsRow.appendChild(this.resetBtn);
        this.controlsRow.appendChild(this.buttonsRow);
        
        this.panelContent.appendChild(this.panelHeader);
        this.panelContent.appendChild(this.controlsRow);
        
        this.element.appendChild(this.tabElement);
        this.element.appendChild(this.panelContent);
        
        // Insert into the body (fixed position)
        document.body.appendChild(this.element);
        // Re-enable transitions on the next frame to allow smooth toggling afterwards
        requestAnimationFrame(() => {
            try { this.element.style.transition = 'transform 0.3s ease, top 0.25s ease'; } catch (e) {}
        });

        // Observe size changes and re-dispatch toggle events so listeners (like the Counter) can react
        try {
            this._lastReportedHeight = null;
            this._resizeObserver = new ResizeObserver(() => {
                try {
                    const rect = this.element.getBoundingClientRect();
                    const height = Math.round(rect.height);
                    if (height !== this._lastReportedHeight) {
                        this._lastReportedHeight = height;
                        document.dispatchEvent(new CustomEvent('TDS:timer-toggle', { detail: { open: this.isOpen, height } }));
                    }
                } catch (e) { /* ignore observer errors */ }
            });
            this._resizeObserver.observe(this.element);

            // Cleanup on unload
            window.addEventListener('unload', () => {
                try { this._resizeObserver.disconnect(); } catch (e) {}
            });
        } catch (e) {
            // ResizeObserver may not be available in some environments; ignore gracefully
        }
    }
    
    togglePanel() {
        this.isOpen = !this.isOpen;
        if (this.isOpen) {
            this.openPanel();
        } else {
            this.closePanel();
        }
    }
    
    openPanel() {
        this.isOpen = true;
        this.element.style.transform = 'translateX(0)';
        this.tabIcon.style.transform = 'rotate(180deg)';
        // Notify listeners that the timer opened
        try { document.dispatchEvent(new CustomEvent('TDS:timer-toggle', { detail: { open: true, height: this.element.getBoundingClientRect().height } })); } catch (e) { /* ignore */ }
    }
    
    closePanel() {
        this.isOpen = false;
        this.element.style.transform = 'translateX(200px)';
        this.tabIcon.style.transform = 'rotate(0deg)';
        // Notify listeners that the timer closed
        try { document.dispatchEvent(new CustomEvent('TDS:timer-toggle', { detail: { open: false, height: this.element.getBoundingClientRect().height } })); } catch (e) { /* ignore */ }
    }
    
    setMode(mode) {
        this.mode = mode;
        this.reset();
        
        // Update button styles
        if (mode === 'timer') {
            // Highlight timer button
            this.timerBtn.style.borderColor = 'var(--color-accent, #007bff)';
            this.timerBtn.style.background = 'var(--color-accent, #007bff)';
            this.timerBtn.style.color = 'white';
            
            // Unhighlight stopwatch button
            this.stopwatchBtn.style.borderColor = 'var(--color-border, #dee2e6)';
            this.stopwatchBtn.style.background = 'var(--color-surface, white)';
            this.stopwatchBtn.style.color = 'var(--color-text, #333)';
            
            this.timerInput.style.display = 'block';
        } else {
            // Highlight stopwatch button
            this.stopwatchBtn.style.borderColor = 'var(--color-accent, #007bff)';
            this.stopwatchBtn.style.background = 'var(--color-accent, #007bff)';
            this.stopwatchBtn.style.color = 'white';
            
            // Unhighlight timer button
            this.timerBtn.style.borderColor = 'var(--color-border, #dee2e6)';
            this.timerBtn.style.background = 'var(--color-surface, white)';
            this.timerBtn.style.color = 'var(--color-text, #333)';
            
            this.timerInput.style.display = 'none';
        }
        
        this.updateDisplay();
    }
    
    setTimerTarget() {
        const input = this.timerInput.value.trim();
        if (!input) {
            this.targetTime = 0;
            return;
        }
        
        // Parse input (M:SS or MM:SS format)
        const parts = input.split(':');
        let minutes = 0;
        let seconds = 0;
        
        if (parts.length === 2) {
            minutes = parseInt(parts[0]) || 0;
            seconds = parseInt(parts[1]) || 0;
        } else if (parts.length === 1) {
            // Assume just minutes if no colon
            minutes = parseInt(parts[0]) || 0;
        }
        
        this.targetTime = (minutes * 60 + seconds) * 1000; // Convert to milliseconds
        this.elapsedTime = 0;
        this.updateDisplay();
    }
    
    toggleTimer() {
        if (this.isRunning) {
            this.pause();
        } else {
            this.start();
        }
    }
    
    start() {
        if (this.mode === 'timer' && this.targetTime === 0) {
            this.setTimerTarget();
            if (this.targetTime === 0) {
                // Still no target time set, use default 5 minutes
                this.targetTime = 5 * 60 * 1000;
                this.timerInput.value = '5:00';
            }
        }
        
        this.isRunning = true;
        this.startTime = Date.now() - this.elapsedTime;
        this.playPauseBtn.innerHTML = '⏸️';
        this.playPauseBtn.title = 'Pause';
        
        this.timerInterval = setInterval(() => {
            this.updateTimer();
        }, 100); // Update every 100ms for smooth display
        
        this.stopFlashing();
    }
    
    pause() {
        this.isRunning = false;
        this.playPauseBtn.innerHTML = '▶️';
        this.playPauseBtn.title = 'Start';
        
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
    
    reset() {
        this.pause();
        this.elapsedTime = 0;
        this.updateDisplay();
        this.stopFlashing();
    }
    
    updateTimer() {
        if (!this.isRunning) return;
        
        this.elapsedTime = Date.now() - this.startTime;
        this.updateDisplay();
        
        // Check if timer has reached target time
        if (this.mode === 'timer' && this.elapsedTime >= this.targetTime) {
            this.pause();
            this.startFlashing();
        }
    }
    
    updateDisplay() {
        let displayTime;
        
        if (this.mode === 'stopwatch') {
            displayTime = this.elapsedTime;
        } else { // timer mode
            displayTime = Math.max(0, this.targetTime - this.elapsedTime);
        }
        
        const totalSeconds = Math.floor(displayTime / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        
        // Format display
        if (minutes > 99) {
            this.timeDisplay.textContent = '99:59';
        } else {
            this.timeDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
        
        // Color coding for timer mode
        if (this.mode === 'timer') {
            if (displayTime === 0) {
                this.timeDisplay.style.color = 'var(--color-error, #dc3545)';
            } else if (displayTime < 30000) { // Less than 30 seconds
                this.timeDisplay.style.color = 'var(--color-warning, #fd7e14)';
            } else {
                this.timeDisplay.style.color = 'var(--color-text, #333)';
            }
        } else {
            this.timeDisplay.style.color = 'var(--color-text, #333)';
        }
    }
    
    startFlashing() {
        if (this.isFlashing) return;
        
        this.isFlashing = true;
        
        // Flash the tab when timer expires
        const flash = () => {
            if (!this.isFlashing) return;
            
            this.tabElement.style.background = 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)';
            this.tabElement.style.boxShadow = '-2px 0 15px rgba(244, 67, 54, 0.4)';
            
            // Also flash the panel if open
            if (this.isOpen) {
                this.panelContent.style.background = 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)';
                this.panelContent.style.borderColor = '#f44336';
            }
            
            setTimeout(() => {
                if (!this.isFlashing) return;
                this.tabElement.style.background = 'linear-gradient(135deg, var(--color-accent, #007bff) 0%, color-mix(in srgb, var(--color-accent, #007bff) 85%, black) 100%)';
                this.tabElement.style.boxShadow = '-2px 0 8px rgba(0,0,0,0.1)';
                
                if (this.isOpen) {
                    this.panelContent.style.background = 'var(--color-surface, white)';
                    this.panelContent.style.borderColor = 'var(--color-border, #e3e7ed)';
                }
                
                setTimeout(flash, 500);
            }, 500);
        };
        
        flash();
    }
    
    stopFlashing() {
        this.isFlashing = false;
        this.tabElement.style.background = 'linear-gradient(135deg, var(--color-accent, #007bff) 0%, color-mix(in srgb, var(--color-accent, #007bff) 85%, black) 100%)';
        this.tabElement.style.boxShadow = '-2px 0 8px rgba(0,0,0,0.1)';
        
        if (this.isOpen) {
            this.panelContent.style.background = 'var(--color-surface, white)';
            this.panelContent.style.borderColor = 'var(--color-border, #e3e7ed)';
        }
    }
}
// Expose via namespaced container to avoid polluting future global scope.
global.TDSModules = global.TDSModules || {};
if(!global.TDSModules.SessionTimer){
    global.TDSModules.SessionTimer = SessionTimer;
}
// Keep backward compatibility if code later directly calls new SessionTimer()
global.SessionTimer = global.SessionTimer || SessionTimer;
})(window);

// === MODULE: Session Counter ===
// Simple clicker counter with a pullout tab similar to SessionTimer
(function(global){
class SessionCounter {
    constructor() {
        this.count = 0;
        this.isOpen = false;
        this.element = null;
        this.init();
        this.boundKeyHandler = this.handleKeyDown.bind(this);
    }

    init() {
        this.createElement();
        this.updateDisplay();
    }

    createElement() {
    this.element = document.createElement('div');
    this.element.className = 'tds-pullout session-counter';
    // Base top when timer is closed (will be adjusted dynamically when timer opens)
    this.baseTop = 178; // px
    this.element.style.top = `${this.baseTop}px`;
    // Keep the counter closed by default. Temporarily disable transition so it doesn't render half-open.
    this.element.style.transition = 'none';
    this.element.style.transform = 'translateX(200px)';

        // Tab
        this.tabElement = document.createElement('div');
        this.tabElement.className = 'tds-pullout-tab';
        this.tabElement.style.background = 'linear-gradient(135deg, var(--color-accent, #28a745) 0%, color-mix(in srgb, var(--color-accent, #28a745) 85%, black) 100%)';
        this.tabElement.style.border = '1px solid var(--color-border, #e3e7ed)';

    this.tabIcon = document.createElement('div');
    this.tabIcon.className = 'tds-tab-icon';
    this.tabIcon.innerHTML = '🔢';
    this.tabIcon.style.cssText = `font-size:22px; transform: rotate(0deg);`;
    // Tooltip title for hover
    this.tabElement.title = 'Clicker Counter';
    this.tabElement.appendChild(this.tabIcon);

        // Panel
        this.panelContent = document.createElement('div');
        this.panelContent.style.cssText = `
            width: 200px;
            background: var(--color-surface, white);
            border: 1px solid var(--color-border, #e3e7ed);
            border-radius: 8px 0 0 8px;
            box-shadow: -4px 0 12px rgba(0,0,0,0.12);
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;

        this.panelHeader = document.createElement('div');
        this.panelHeader.style.cssText = `display:flex;align-items:center;justify-content:space-between;padding-bottom:6px;border-bottom:1px solid var(--color-border, #e3e7ed);`;

        this.panelTitle = document.createElement('h4');
        this.panelTitle.textContent = 'Clicker Counter';
        this.panelTitle.style.cssText = `margin:0;font-size:14px;font-weight:600;color:var(--color-text,#333)`;

        this.panelHeader.appendChild(this.panelTitle);

        this.countDisplay = document.createElement('div');
        this.countDisplay.style.cssText = `
            font-family: 'SF Mono', monospace;
            font-weight:700;
            font-size:28px;
            text-align:center;
            padding:10px;
            border-radius:6px;
            background:var(--color-surface-alt,#f8f9fa);
            border:1px solid var(--color-border-soft,#e9ecef);
        `;

        // Controls
        this.controlsRow = document.createElement('div');
        this.controlsRow.style.cssText = `display:flex;gap:8px;`;

        this.incrementBtn = document.createElement('button');
        this.incrementBtn.type = 'button';
        this.incrementBtn.textContent = '+1';
        this.incrementBtn.title = 'Increment (or press ` while open)';
        this.incrementBtn.style.cssText = `flex:1;padding:10px;border-radius:6px;border:none;background:linear-gradient(135deg,var(--color-accent,#28a745)0%,color-mix(in srgb,var(--color-accent,#28a745)85%,black)100%);color:#fff;cursor:pointer;font-weight:600;`;
        this.incrementBtn.addEventListener('click', () => this.increment());

        this.resetBtn = document.createElement('button');
        this.resetBtn.type = 'button';
        this.resetBtn.textContent = 'Reset';
        this.resetBtn.title = 'Reset counter';
        this.resetBtn.style.cssText = `flex:1;padding:10px;border-radius:6px;border:1px solid var(--color-border,#dee2e6);background:var(--color-surface,#fff);color:var(--color-text,#333);cursor:pointer;font-weight:600;`;
        this.resetBtn.addEventListener('click', () => this.reset());

        this.controlsRow.appendChild(this.incrementBtn);
        this.controlsRow.appendChild(this.resetBtn);

        this.panelContent.appendChild(this.panelHeader);
        this.panelContent.appendChild(this.countDisplay);
        this.panelContent.appendChild(this.controlsRow);

        this.element.appendChild(this.tabElement);
        this.element.appendChild(this.panelContent);

        // Interactions
        this.tabElement.addEventListener('mouseenter', () => { this.tabElement.style.transform = 'translateX(-2px)'; });
        this.tabElement.addEventListener('mouseleave', () => { this.tabElement.style.transform = 'translateX(0)'; });
        this.tabElement.addEventListener('click', (e) => { e.stopPropagation(); this.togglePanel(); });

        document.body.appendChild(this.element);
        // Re-enable transitions on next frame
        requestAnimationFrame(() => {
            try { this.element.style.transition = 'transform 0.3s ease, top 0.25s ease'; } catch (e) {}
        });

        // Listen for timer open/close events to slide the counter
        this.timerToggleHandler = (ev) => {
            try {
                // Prefer computing from the live timer element bounds to avoid overlap
                const timerEl = document.querySelector('.session-timer');
                const detail = ev && ev.detail ? ev.detail : {};

                if (timerEl) {
                    // Use current bounding rect for accurate placement
                    const rect = timerEl.getBoundingClientRect();
                    if (detail.open) {
                        const newTop = Math.round(rect.top + rect.height + 2);
                        this.element.style.top = `${newTop}px`;
                    } else {
                        this.element.style.top = `${this.baseTop}px`;
                    }
                } else {
                    // Fallback: use event detail or assumed values
                    if (detail.open) {
                        const timerTop = 80;
                        const timerHeight = detail.height || 96;
                        const newTop = timerTop + timerHeight + 2;
                        this.element.style.top = `${newTop}px`;
                    } else {
                        this.element.style.top = `${this.baseTop}px`;
                    }
                }
            } catch (e) { /* ignore errors silently */ }
        };
        document.addEventListener('TDS:timer-toggle', this.timerToggleHandler);
    }

    togglePanel() {
        this.isOpen = !this.isOpen;
        if (this.isOpen) this.openPanel(); else this.closePanel();
    }

    openPanel() {
        this.isOpen = true;
        this.element.style.transform = 'translateX(0)';
        // bind key
        document.addEventListener('keydown', this.boundKeyHandler);
    }

    closePanel() {
        this.isOpen = false;
        this.element.style.transform = 'translateX(200px)';
        document.removeEventListener('keydown', this.boundKeyHandler);
    }

    handleKeyDown(e) {
        // Backtick key is ` (e.key === '`')
        if (e.key === '`') {
            e.preventDefault();
            this.increment();
        }
    }

    increment() {
        this.count = (this.count || 0) + 1;
        this.updateDisplay();
    }

    reset() {
        this.count = 0;
        this.updateDisplay();
    }

    updateDisplay() {
        this.countDisplay.textContent = String(this.count || 0);
    }
}

global.TDSModules = global.TDSModules || {};
if (!global.TDSModules.SessionCounter) {
    global.TDSModules.SessionCounter = SessionCounter;
}
global.SessionCounter = global.SessionCounter || SessionCounter;
})(window);

/**
 * Modular Session Builder - Refactored Architecture
 * Provides a robust, extensible system for creating therapy session templates
 */

// Core Application Class
// =========================
// REGION: DISCOURSE MODULES
// =========================

// Core Application Class
class SessionBuilder {
    constructor() {
        this.components = new Map();
        this.templates = new Map();
        this.dragHandler = new DragHandler(this);
        this.templateManager = new TemplateManager(this);
        this.uiManager = new UIManager(this);
        this.eventBus = new EventBus();
        
        this.init();
    }

    init() {
        this.registerComponents();
        this.registerTemplates();
        this.setupEventListeners();
        this.render();
    }

    // Placeholder helpers: keep the dropzone placeholder in sync with children
    showPlaceholder() {
        const ph = document.getElementById('dropzonePlaceholder');
        if (ph) ph.classList.remove('hidden');
    }

    hidePlaceholder() {
        const ph = document.getElementById('dropzonePlaceholder');
        if (ph) ph.classList.add('hidden');
    }

    updatePlaceholder() {
        const dropzone = document.getElementById('templateDropzone');
        const ph = document.getElementById('dropzonePlaceholder');
        if (!dropzone || !ph) return;
        // Count only actual component elements (exclude placeholder and drop-indicator)
        const childCount = Array.from(dropzone.children).filter(c => c !== ph && !c.classList.contains('drop-indicator')).length;
        if (childCount === 0) this.showPlaceholder(); else this.hidePlaceholder();
    }

    registerComponents() {
        // Register standard components
        this.registerComponent('custom-text-field', CustomTextFieldComponent);
        this.registerComponent('text', TextComponent);
        this.registerComponent('textarea', TextAreaComponent);
        this.registerComponent('pace-table', PaceTableComponent);
        this.registerComponent('practice-data-table', PracticeDataTableComponent);
        this.registerComponent('custom-data-table', CustomDataTableComponent);
        this.registerComponent('srt-table', SRTTableComponent);
        this.registerComponent('swallow-data', SwallowDataComponent);
        this.registerComponent('word-list', WordListComponent);
        this.registerComponent('sentence-list', SentenceListComponent);
        this.registerComponent('discourse-transcript', DiscourseTranscriptComponent);
    }

    registerTemplates() {
        // Register template presets
        this.templateManager.register('default', {
            name: 'Default Session Template',
            components: [
                { type: 'textarea', label: 'Check-In Info and Results of Homework' },
                { type: 'textarea', label: 'Aim' },
                { type: 'textarea', label: 'Target' },
                { type: 'textarea', label: 'Task/Activity' },
                { type: 'practice-data-table', label: 'Default Data Table' },
                { type: 'custom-data-table', label: 'Custom Data Table' },
                { type: 'textarea', label: 'Comments/Observations' },
                { type: 'textarea', label: 'Session Summary/Analysis of Progress' },
                { type: 'textarea', label: 'Feedback and Homework Provided' },
                { type: 'textarea', label: 'Plan for Next Session' }
            ]
        });

        this.templateManager.register('SOAP', {
            name: 'SOAP',
            components: [
                { type: 'textarea', label: 'Subjective' },
                { type: 'textarea', label: 'Objective' },
                { type: 'textarea', label: 'Assessment' },
                { type: 'textarea', label: 'Plan' }
            ]
        });

        this.templateManager.register('PACE', {
            name: 'PACE',
            components: [
                { type: 'textarea', label: 'Topic/Materials' },
                { type: 'pace-table', label: 'PACE Data Table' },
                { type: 'textarea', label: 'Comments/Observations' },
                { type: 'textarea', label: 'Plan for Next Session' }
            ]
        });

        this.templateManager.register('SpacedRetrieval', {
            name: 'Spaced Retrieval Training',
            components: [
                { type: 'textarea', label: 'Target' },
                { type: 'textarea', label: 'Stimulus/Cue' },
                { type: 'textarea', label: 'Desired Response' },
                { type: 'srt-table', label: 'SRT Data Table' },
                { type: 'textarea', label: 'Comments/Observations' },
                { type: 'textarea', label: 'Plan for Next Session' }
            ]
        });

        this.templateManager.register('Bolus Therapy', {
            name: 'Bolus Therapy',
            components: [
                { type: 'textarea', label: 'Check-In Info and Results of Homework' },
                { type: 'swallow-data', label: 'Bolus Therapy Data Table' },
                { type: 'textarea', label: 'Comments/Observations' },
                { type: 'textarea', label: 'Plan for Next Session' }

            ]
        });

        this.templateManager.register('Discourse Treatment', {
            name: 'Discourse Treatment',
            components: [
                { type: 'textarea', label: 'Check-In Info and Results of Homework' },
                { type: 'textarea', label: 'Target Discourse Structure(s)' },
                { type: 'textarea', label: 'Theme/Subject Matter' },
                { type: 'word-list', label: 'Word List' },
                { type: 'sentence-list', label: 'Sentence List' },
                { type: 'discourse-transcript', label: 'Discourse Transcript' },
                { type: 'textarea', label: 'Comments/Observations' },
                { type: 'textarea', label: 'Session Summary/Analysis of Progress' },
                { type: 'textarea', label: 'Feedback and Homework Provided' },
                { type: 'textarea', label: 'Plan for Next Session' }
            ]
        });

    }

    registerComponent(type, componentClass) {
        this.components.set(type, componentClass);
    }

    createComponent(type, label, config = {}) {
        const ComponentClass = this.components.get(type);
        if (!ComponentClass) {
            console.warn(`Component type "${type}" not found, using TextAreaComponent`);
            return new TextAreaComponent(this, { label, ...config });
        }
        return new ComponentClass(this, { label, ...config });
    }

    setupEventListeners() {
        // Delegate to managers
        this.dragHandler.init();
        this.uiManager.init();
    }

    render() {
        this.uiManager.render();
    }
}

// Base Component Class
// =========================
// REGION: UTILITIES & BASE COMPONENTS
// =========================

class BaseComponent {
    constructor(app, config) {
        this.app = app;
        this.config = config;
        this.element = null;
        this.dragHandle = null;
        this.deleteBtn = null;
        this.labelSpan = null;
        this.contentContainer = null;
        this.data = config.initialData || {};
        this.isEditing = false;
        // Ensure we always have the concrete component type available on config
        // This helps actions like duplicate create an identical kind (including special components)
        if (!this.config.type) {
            this.config.type = this.getComponentType();
        }
    }

    createElement() {
        this.element = document.createElement('div');
        this.element.className = 'template-component';
        // Store the actual component type for clarity and potential selectors/logic
        this.element.setAttribute('data-type', this.config.type || this.getComponentType());
        // Keep a back-reference from DOM element to the component instance so
        // snapshot code can capture internal component data (rows, options, etc.)
        try { this.element._componentInstance = this; } catch (e) { /* ignore */ }
        
        // Create header container (matches Homework Builder structure)
        const headerContainer = document.createElement('div');
        headerContainer.className = 'component-header';
        
        // Create title container with drag handle and label
        const titleContainer = document.createElement('div');
        titleContainer.className = 'component-title';
        
        this.createDragHandle();
        this.createLabel();
        // Ensure labels are editable across all components unless subclass already made them editable
        if (this.labelSpan && !this.labelSpan.classList.contains('component-label-editable')) {
            this.makeLabelEditable();
        }
        
        titleContainer.appendChild(this.dragHandle);
        titleContainer.appendChild(this.labelSpan);
        
        // Create controls container
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'component-controls';
        this.createDuplicateButton();
        this.createDeleteButton();
        controlsContainer.appendChild(this.duplicateBtn);
        controlsContainer.appendChild(this.deleteBtn);
        
        headerContainer.appendChild(titleContainer);
        headerContainer.appendChild(controlsContainer);

        // Create content container
        this.createContent();
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'component-content';
        contentWrapper.appendChild(this.contentContainer);
        
        this.element.appendChild(headerContainer);
        this.element.appendChild(contentWrapper);
        
        return this.element;
    }

    createDragHandle() {
        this.dragHandle = document.createElement('span');
        this.dragHandle.className = 'drag-handle';
        this.dragHandle.title = 'Drag to rearrange';
        this.dragHandle.innerHTML = '&#x2630;';
        this.dragHandle.draggable = true;
        
        this.dragHandle.addEventListener('dragstart', (e) => {
            this.app.dragHandler.startRearrange(this.element, e);
        });
        
        this.dragHandle.addEventListener('dragend', (e) => {
            this.app.dragHandler.endDrag(e);
        });
    }

    createLabel() {
        this.labelSpan = document.createElement('span');
        this.labelSpan.className = 'component-label';
        this.labelSpan.textContent = this.config.label;
    }

    // Make the label inline-editable (shared logic for all components)
    makeLabelEditable() {
        if (!this.labelSpan) return;
        this.labelSpan.classList.remove('component-label');
        this.labelSpan.classList.add('component-label-editable');
        this.labelSpan.style.cursor = 'pointer';
        this.labelSpan.style.padding = '2px 4px';
        this.labelSpan.style.borderRadius = '4px';
        this.labelSpan.style.border = '1px solid transparent';
        this.labelSpan.title = 'Click to edit name';

        this.labelSpan.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            if (!this.isEditing) {
                this.startEditing();
            }
        });

        this.labelSpan.addEventListener('mousedown', e => e.stopPropagation());
    }

    // Shared inline edit handler
    startEditing() {
        this.isEditing = true;

        const currentText = this.labelSpan.textContent;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentText;
        input.style.fontWeight = 'bold';
        input.style.fontSize = '1em';
        input.style.border = '1px solid #007bff';
        input.style.borderRadius = '4px';
        input.style.padding = '2px 4px';
        input.style.minWidth = '150px';

        // Replace the span with input
        this.labelSpan.parentNode.insertBefore(input, this.labelSpan);
        this.labelSpan.style.display = 'none';

        input.focus();
        input.select();

        // Protect against multiple calls
        let saved = false;
        const save = () => {
            if (saved) return;
            saved = true;
            const newValue = input.value.trim() || currentText || 'Section';
            this.config.label = newValue;
            this.labelSpan.textContent = newValue;
            this.labelSpan.style.display = '';
            if (input.parentNode) input.remove();
            this.isEditing = false;
            this.onLabelChanged?.(newValue);
        };

        const cancel = () => {
            if (saved) return;
            saved = true;
            this.labelSpan.style.display = '';
            if (input.parentNode) input.remove();
            this.isEditing = false;
        };

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); save(); }
            else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
        });
        input.addEventListener('blur', save);
        input.addEventListener('mousedown', e => e.stopPropagation());
    }

    // Hook for subclasses to react when label changes
    onLabelChanged(newLabel) { /* noop by default */ }

    createDuplicateButton() {
        this.duplicateBtn = document.createElement('button');
        this.duplicateBtn.className = 'duplicate-btn';
        this.duplicateBtn.title = 'Duplicate';
        this.duplicateBtn.innerHTML = '+'; // Plus sign
        this.duplicateBtn.onclick = () => this.duplicate();
    }

    createDeleteButton() {
        this.deleteBtn = document.createElement('button');
        this.deleteBtn.className = 'delete-btn';
        this.deleteBtn.title = 'Delete';
        this.deleteBtn.innerHTML = '&times;';
        this.deleteBtn.onclick = () => this.destroy();
    }

    createContent() {
        // Override in subclasses
        this.contentContainer = document.createElement('div');
    }

    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        this.app.eventBus.emit('component:destroyed', this);
        // Update placeholder visibility after destruction
        try { this.app.updatePlaceholder(); } catch (e) { /* noop */ }
    }

    duplicate() {
        // Create a new component of the same type
        const newComponent = this.app.createComponent(this.config.type || this.getComponentType(), this.config.label);
        const newElement = newComponent.createElement();
        
        // Insert the new component right after this one
        if (this.element && this.element.parentNode) {
            const nextSibling = this.element.nextSibling;
            if (nextSibling) {
                this.element.parentNode.insertBefore(newElement, nextSibling);
            } else {
                this.element.parentNode.appendChild(newElement);
            }
        }
        
        this.app.eventBus.emit('component:duplicated', { original: this, duplicate: newComponent });
        // Update placeholder in case DOM insertion changed empty state
        try { this.app.updatePlaceholder(); } catch (e) { /* noop */ }
    }

    getComponentType() {
        // Helper method to determine component type from class name
        // Check specific subclasses first before checking parent classes
        if (this instanceof TextComponent) return 'text';
        if (this instanceof TextAreaComponent) return 'textarea';
        if (this instanceof CustomTextFieldComponent) return 'custom-text-field';
        if (this instanceof PaceTableComponent) return 'pace-table';
        if (this instanceof PracticeDataTableComponent) return 'practice-data-table';
        if (this instanceof SRTTableComponent) return 'srt-table';
        if (this instanceof SwallowDataComponent) return 'swallow-data';
        // Discourse components
        if (this instanceof WordListComponent) return 'word-list';
        if (this instanceof SentenceListComponent) return 'sentence-list';
        if (this instanceof DiscourseTranscriptComponent) return 'discourse-transcript';
        return 'textarea'; // fallback
    }

    getData() {
        return this.data;
    }

    setData(data) {
        this.data = { ...this.data, ...data };
    }

    preventDragEvents(element) {
        element.addEventListener('mousedown', e => e.stopPropagation());
        element.addEventListener('dragstart', e => e.stopPropagation());
    }
}

// Component Implementations
class CustomTextFieldComponent extends BaseComponent {
    constructor(app, config) {
        super(app, config);
    }

    createLabel() {
        super.createLabel();
        this.makeLabelEditable();
    }

    // BaseComponent.startEditing handles the editing flow

    createContent() {
        this.contentContainer = document.createElement('textarea');
        this.contentContainer.className = 'tdst-textarea';
        this.contentContainer.rows = 2;
        this.contentContainer.placeholder = 'Enter text...';
        this.contentContainer.style.resize = 'none'; // Disable manual resize since we'll auto-resize
        this.contentContainer.style.wordBreak = 'break-word';
        this.contentContainer.style.flex = '1';
        this.contentContainer.style.marginLeft = '16px';
        this.contentContainer.style.minHeight = '40px';
        this.contentContainer.style.overflow = 'hidden';
        this.contentContainer.value = this.data.value || '';
        
        // Auto-resize function
        const autoResize = () => {
            this.contentContainer.style.height = 'auto';
            this.contentContainer.style.height = this.contentContainer.scrollHeight + 'px';
        };
        
        this.contentContainer.addEventListener('input', (e) => {
            this.setData({ value: e.target.value });
            autoResize();
        });
        
        // Initial resize in case there's existing content
        setTimeout(autoResize, 0);
        
        this.preventDragEvents(this.contentContainer);
    }

    getComponentType() {
        return 'custom-text-field';
    }
}

class TextComponent extends CustomTextFieldComponent {
    constructor(app, config) {
        super(app, config);
    }

    createLabel() {
        this.labelSpan = document.createElement('span');
        this.labelSpan.className = 'component-label-editable';
        this.labelSpan.textContent = this.config.label;
        this.labelSpan.style.cursor = 'pointer';
        this.labelSpan.style.padding = '2px 4px';
        this.labelSpan.style.borderRadius = '4px';
        this.labelSpan.style.border = '1px solid transparent';
        this.labelSpan.title = 'Click to edit field name';
        
        this.makeLabelEditable();
    }

    createContent() {
        this.contentContainer = document.createElement('textarea');
        this.contentContainer.className = 'tdst-textarea';
        this.contentContainer.rows = 2;
        this.contentContainer.placeholder = `Enter ${this.config.label.toLowerCase()}...`;
        this.contentContainer.style.resize = 'none'; // Disable manual resize since we'll auto-resize
        this.contentContainer.style.wordBreak = 'break-word';
        this.contentContainer.style.flex = '1';
        this.contentContainer.style.marginLeft = '16px';
        this.contentContainer.style.minHeight = '40px';
        this.contentContainer.style.overflow = 'hidden';
        this.contentContainer.value = this.data.value || '';
        
        // Auto-resize function
        const autoResize = () => {
            this.contentContainer.style.height = 'auto';
            this.contentContainer.style.height = this.contentContainer.scrollHeight + 'px';
        };
        
        this.contentContainer.addEventListener('input', (e) => {
            this.setData({ value: e.target.value });
            autoResize();
        });
        
        // Initial resize in case there's existing content
        setTimeout(autoResize, 0);
        
        this.preventDragEvents(this.contentContainer);
    }

    onLabelChanged(newLabel) {
        if (this.contentContainer) {
            this.contentContainer.placeholder = `Enter ${newLabel.toLowerCase()}...`;
        }
    }
}

class TextAreaComponent extends CustomTextFieldComponent {
    constructor(app, config) {
        super(app, config);
    }

    createLabel() {
        this.labelSpan = document.createElement('span');
        this.labelSpan.className = 'component-label-editable';
        this.labelSpan.textContent = this.config.label;
        this.labelSpan.style.cursor = 'pointer';
        this.labelSpan.style.padding = '2px 4px';
        this.labelSpan.style.borderRadius = '4px';
        this.labelSpan.style.border = '1px solid transparent';
        this.labelSpan.title = 'Click to edit field name';
        
        this.makeLabelEditable();
    }

    createContent() {
        this.contentContainer = document.createElement('textarea');
        this.contentContainer.className = 'tdst-textarea';
        this.contentContainer.rows = 2;
        this.contentContainer.placeholder = `Enter ${this.config.label.toLowerCase()}...`;
        this.contentContainer.style.resize = 'none'; // Disable manual resize since we'll auto-resize
        this.contentContainer.style.wordBreak = 'break-word';
        this.contentContainer.style.flex = '1';
        this.contentContainer.style.marginLeft = '16px';
        this.contentContainer.style.minHeight = '40px';
        this.contentContainer.style.overflow = 'hidden';
        this.contentContainer.value = this.data.value || '';
        
        // Auto-resize function
        const autoResize = () => {
            this.contentContainer.style.height = 'auto';
            this.contentContainer.style.height = this.contentContainer.scrollHeight + 'px';
        };
        
        this.contentContainer.addEventListener('input', (e) => {
            this.setData({ value: e.target.value });
            autoResize();
        });
        
        // Initial resize in case there's existing content
        setTimeout(autoResize, 0);
        
        this.preventDragEvents(this.contentContainer);
    }

    onLabelChanged(newLabel) {
        if (this.contentContainer) {
            this.contentContainer.placeholder = `Enter ${newLabel.toLowerCase()}...`;
        }
    }
}

// =========================
// REGION: PACE MODULES
// =========================

class PaceTableComponent extends BaseComponent {
    constructor(app, config) {
        super(app, config);
        this.data.rows = this.data.rows || [];
    }

    createContent() {
        this.contentContainer = document.createElement('div');
        this.contentContainer.style.marginLeft = '16px';
        
        // Create table
        this.table = document.createElement('table');
        this.table.className = 'pace-table';
        this.table.innerHTML = `
            <thead>
                <tr>
                    <th style="width:50px">Trial</th>
                    <th style="width:90px">Offer/Receive</th>
                    <th style="width:180px">Level</th>
                    <th style="width:180px">Cues/Comments</th>
                    <th style="width:40px"></th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        
        // Create add row button
        this.addRowBtn = document.createElement('button');
        this.addRowBtn.type = 'button';
        this.addRowBtn.className = 'pace-add-row-btn';
        this.addRowBtn.textContent = '+ Add Row';
        this.addRowBtn.style.margin = '10px 0 0 0';
        this.addRowBtn.onclick = () => this.addRow();
        
        this.contentContainer.appendChild(this.table);
        this.contentContainer.appendChild(this.addRowBtn);
        
        // Create PACE scoring explainer
        this.explainerContainer = document.createElement('div');
        this.explainerContainer.className = 'pace-explainer';
        this.explainerContainer.style.cssText = `
            margin: 12px 0;
            padding: 12px;
            background: var(--color-surface-alt, #f8f9fa);
            border: 1px solid var(--color-border, #e3e7ed);
            border-radius: var(--radius-md, 6px);
            font-size: 14px;
            line-height: 1.4;
            color: var(--color-text, #333);
        `;
        
        this.explainerContainer.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 8px; color: var(--color-accent, #2196f3);">PACE Scoring Guide (adapted from Davis, 1980):</div>
            <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px 12px; font-size: 13px;">
                <strong>5:</strong> <span>Message conveyed on the first attempt without clinician support/cueing.</span>
                <strong>4:</strong> <span>Message conveyed after general support/cueing from the clinician.</span>
                <strong>3:</strong> <span>Message conveyed after specific support/cueing from the clinician.</span>
                <strong>2:</strong> <span>Message is only partially conveyed, despite both general and specific support/cueing.</span>
                <strong>1:</strong> <span>Message is not conveyed, despite both general and specific support/cueing.</span>
                <strong>NR:</strong> <span>Patient does not appear to attempt to convey or receive the message.</span>
                <strong>O:</strong> <span>Other, e.g., the response is unscorable because the interaction got off track or there was an interruption.</span>
            </div>
        `;
        
        this.contentContainer.appendChild(this.explainerContainer);
        
        // Add statistics display
        this.statsContainer = document.createElement('div');
        this.statsContainer.className = 'swallow-analysis-container';
        this.statsContainer.style.marginTop = '12px';
        this.contentContainer.appendChild(this.statsContainer);
        
        // Add initial row if no data
        if (this.data.rows.length === 0) {
            this.addRow();
        } else {
            this.renderRows();
        }
        
        this.preventDragEvents(this.table);
        this.preventDragEvents(this.addRowBtn);
    }

    addRow(rowData = {}) {
        const rowId = Date.now() + Math.random();
        const newRowData = {
            id: rowId,
            offer: rowData.offer || 'Offer',
            level: rowData.level || '',
            comments: rowData.comments || ''
        };
        
        this.data.rows.push(newRowData);
        this.renderRows();
    }

    removeRow(rowId) {
        this.data.rows = this.data.rows.filter(row => row.id !== rowId);
        this.renderRows();
    }

    renderRows() {
        const tbody = this.table.querySelector('tbody');
        tbody.innerHTML = '';
        
        this.data.rows.forEach((rowData, i) => {
            const row = document.createElement('tr');
            const radioGroupId = `pace-level-${rowData.id}`;
            
            row.innerHTML = `
                <td>${i + 1}</td>
                <td>
                    <select class="pace-offer-receive" data-row="${rowData.id}">
                        <option value="Offer" ${rowData.offer === 'Offer' ? 'selected' : ''}>Offer</option>
                        <option value="Receive" ${rowData.offer === 'Receive' ? 'selected' : ''}>Receive</option>
                    </select>
                </td>
                <td>
                    <div class="pace-radio-group">
                        <label><input type="radio" name="${radioGroupId}" value="5" ${rowData.level === '5' ? 'checked' : ''}><span>5</span></label>
                        <label><input type="radio" name="${radioGroupId}" value="4" ${rowData.level === '4' ? 'checked' : ''}><span>4</span></label>
                        <label><input type="radio" name="${radioGroupId}" value="3" ${rowData.level === '3' ? 'checked' : ''}><span>3</span></label>
                        <label><input type="radio" name="${radioGroupId}" value="2" ${rowData.level === '2' ? 'checked' : ''}><span>2</span></label>
                        <label><input type="radio" name="${radioGroupId}" value="1" ${rowData.level === '1' ? 'checked' : ''}><span>1</span></label>
                        <label><input type="radio" name="${radioGroupId}" value="NR" ${rowData.level === 'NR' ? 'checked' : ''}><span>NR</span></label>
                        <label><input type="radio" name="${radioGroupId}" value="O" ${rowData.level === 'O' ? 'checked' : ''}><span>O</span></label>
                    </div>
                </td>
                <td>
                    <input type="text" class="pace-comments" data-row="${rowData.id}" placeholder="Cues/Comments" value="${rowData.comments || ''}" />
                </td>
                <td>
                    <button type="button" class="pace-row-delete" data-row="${rowData.id}" title="Delete Row">&times;</button>
                </td>
            `;
            
            // Add event listeners
            row.querySelector('.pace-offer-receive').addEventListener('change', (e) => {
                const row = this.data.rows.find(r => r.id == e.target.dataset.row);
                if (row) {
                    row.offer = e.target.value;
                    this.updatePaceStats();
                }
            });

            // Set up radio button tabindex - only one radio per group should be tabbable
            const paceRadios = row.querySelectorAll(`input[name="${radioGroupId}"]`);
            const checkedPaceRadio = row.querySelector(`input[name="${radioGroupId}"]:checked`);
            if (checkedPaceRadio) {
                // If there's a checked radio, only it should be tabbable
                paceRadios.forEach(radio => {
                    radio.tabIndex = radio === checkedPaceRadio ? 0 : -1;
                });
            } else {
                // If no radio is checked, make the first one tabbable
                paceRadios.forEach((radio, index) => {
                    radio.tabIndex = index === 0 ? 0 : -1;
                });
            }

            // PACE radio button event listeners
            row.querySelectorAll(`input[name="${radioGroupId}"]`).forEach(radio => {
                radio.addEventListener('change', (e) => {
                    const row = this.data.rows.find(r => r.id == rowData.id);
                    if (row) {
                        row.level = e.target.value;
                        this.updatePaceStats();
                    }
                    // Update tabindex for this group
                    paceRadios.forEach(r => {
                        r.tabIndex = r === e.target ? 0 : -1;
                    });
                });

                // Add keyboard support for PACE radio buttons
                radio.addEventListener('keydown', (e) => {
                    const radios = Array.from(row.querySelectorAll(`input[name="${radioGroupId}"]`));
                    const currentIndex = radios.indexOf(e.target);
                    
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        radio.checked = true;
                        radio.dispatchEvent(new Event('change'));
                    } else if (e.key === '5') {
                        e.preventDefault();
                        const radio5 = radios.find(r => r.value === '5');
                        if (radio5) {
                            radio5.checked = true;
                            radio5.focus();
                            radio5.dispatchEvent(new Event('change'));
                        }
                    } else if (e.key === '4') {
                        e.preventDefault();
                        const radio4 = radios.find(r => r.value === '4');
                        if (radio4) {
                            radio4.checked = true;
                            radio4.focus();
                            radio4.dispatchEvent(new Event('change'));
                        }
                    } else if (e.key === '3') {
                        e.preventDefault();
                        const radio3 = radios.find(r => r.value === '3');
                        if (radio3) {
                            radio3.checked = true;
                            radio3.focus();
                            radio3.dispatchEvent(new Event('change'));
                        }
                    } else if (e.key === '2') {
                        e.preventDefault();
                        const radio2 = radios.find(r => r.value === '2');
                        if (radio2) {
                            radio2.checked = true;
                            radio2.focus();
                            radio2.dispatchEvent(new Event('change'));
                        }
                    } else if (e.key === '1') {
                        e.preventDefault();
                        const radio1 = radios.find(r => r.value === '1');
                        if (radio1) {
                            radio1.checked = true;
                            radio1.focus();
                            radio1.dispatchEvent(new Event('change'));
                        }
                    } else if (e.key.toLowerCase() === 'n') {
                        e.preventDefault();
                        const radioNR = radios.find(r => r.value === 'NR');
                        if (radioNR) {
                            radioNR.checked = true;
                            radioNR.focus();
                            radioNR.dispatchEvent(new Event('change'));
                        }
                    } else if (e.key.toLowerCase() === 'o') {
                        e.preventDefault();
                        const radioO = radios.find(r => r.value === 'O');
                        if (radioO) {
                            radioO.checked = true;
                            radioO.focus();
                            radioO.dispatchEvent(new Event('change'));
                        }
                    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                        e.preventDefault();
                        const nextIndex = (currentIndex + 1) % radios.length;
                        radios[nextIndex].focus();
                        radios[nextIndex].checked = true;
                        radios[nextIndex].dispatchEvent(new Event('change'));
                    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                        e.preventDefault();
                        const prevIndex = (currentIndex - 1 + radios.length) % radios.length;
                        radios[prevIndex].focus();
                        radios[prevIndex].checked = true;
                        radios[prevIndex].dispatchEvent(new Event('change'));
                    }
                });
                
                // Add focus styling for better keyboard navigation
                radio.addEventListener('focus', (e) => {
                    e.target.parentElement.style.background = '#e3f2fd';
                    e.target.parentElement.style.borderColor = '#2196f3';
                });
                
                radio.addEventListener('blur', (e) => {
                    e.target.parentElement.style.background = '';
                    e.target.parentElement.style.borderColor = '';
                });
            });
            
            const commentsInput = row.querySelector('.pace-comments');
            commentsInput.addEventListener('input', (e) => {
                const row = this.data.rows.find(r => r.id == e.target.dataset.row);
                if (row) {
                    row.comments = e.target.value;
                }
            });

            commentsInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addRow();
                    setTimeout(() => {
                        const lastRow = this.table.querySelector('tbody tr:last-child');
                        if (lastRow) {
                            lastRow.querySelector('.pace-comments').focus();
                        }
                    }, 50);
                }
            });
            
            row.querySelector('.pace-row-delete').addEventListener('click', (e) => {
                this.removeRow(parseFloat(e.target.dataset.row));
            });
            
            // Prevent drag events
            row.querySelectorAll('input, select, button').forEach(el => {
                this.preventDragEvents(el);
            });
            
            tbody.appendChild(row);
        });
        
        // Update statistics after rendering rows
        this.updatePaceStats();
    }
    
    updatePaceStats() {
        const totalTrials = this.data.rows.length;
        
        // Count levels by offer/receive for new 7-point scale
        const offerStats = { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0, 'NR': 0, 'O': 0, total: 0 };
        const receiveStats = { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0, 'NR': 0, 'O': 0, total: 0 };
        const overallStats = { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0, 'NR': 0, 'O': 0 };
        
        this.data.rows.forEach(row => {
            if (row.level && overallStats.hasOwnProperty(row.level)) {
                overallStats[row.level]++;
                
                if (row.offer === 'Offer') {
                    if (offerStats.hasOwnProperty(row.level)) {
                        offerStats[row.level]++;
                    }
                    offerStats.total++;
                } else if (row.offer === 'Receive') {
                    if (receiveStats.hasOwnProperty(row.level)) {
                        receiveStats[row.level]++;
                    }
                    receiveStats.total++;
                }
            }
        });
        
        // Calculate overall percentages for each score
        const score5Percent = totalTrials > 0 ? ((overallStats['5'] / totalTrials) * 100).toFixed(1) : 0;
        const score4Percent = totalTrials > 0 ? ((overallStats['4'] / totalTrials) * 100).toFixed(1) : 0;
        const score3Percent = totalTrials > 0 ? ((overallStats['3'] / totalTrials) * 100).toFixed(1) : 0;
        const score2Percent = totalTrials > 0 ? ((overallStats['2'] / totalTrials) * 100).toFixed(1) : 0;
        const score1Percent = totalTrials > 0 ? ((overallStats['1'] / totalTrials) * 100).toFixed(1) : 0;
        const scoreNRPercent = totalTrials > 0 ? ((overallStats['NR'] / totalTrials) * 100).toFixed(1) : 0;
        const scoreOPercent = totalTrials > 0 ? ((overallStats['O'] / totalTrials) * 100).toFixed(1) : 0;
        
        // Calculate offer percentages
        const offer5Percent = offerStats.total > 0 ? ((offerStats['5'] / offerStats.total) * 100).toFixed(1) : 0;
        const offer4Percent = offerStats.total > 0 ? ((offerStats['4'] / offerStats.total) * 100).toFixed(1) : 0;
        const offer3Percent = offerStats.total > 0 ? ((offerStats['3'] / offerStats.total) * 100).toFixed(1) : 0;
        const offer2Percent = offerStats.total > 0 ? ((offerStats['2'] / offerStats.total) * 100).toFixed(1) : 0;
        const offer1Percent = offerStats.total > 0 ? ((offerStats['1'] / offerStats.total) * 100).toFixed(1) : 0;
        const offerNRPercent = offerStats.total > 0 ? ((offerStats['NR'] / offerStats.total) * 100).toFixed(1) : 0;
        const offerOPercent = offerStats.total > 0 ? ((offerStats['O'] / offerStats.total) * 100).toFixed(1) : 0;
        
        // Calculate receive percentages
        const receive5Percent = receiveStats.total > 0 ? ((receiveStats['5'] / receiveStats.total) * 100).toFixed(1) : 0;
        const receive4Percent = receiveStats.total > 0 ? ((receiveStats['4'] / receiveStats.total) * 100).toFixed(1) : 0;
        const receive3Percent = receiveStats.total > 0 ? ((receiveStats['3'] / receiveStats.total) * 100).toFixed(1) : 0;
        const receive2Percent = receiveStats.total > 0 ? ((receiveStats['2'] / receiveStats.total) * 100).toFixed(1) : 0;
        const receive1Percent = receiveStats.total > 0 ? ((receiveStats['1'] / receiveStats.total) * 100).toFixed(1) : 0;
        const receiveNRPercent = receiveStats.total > 0 ? ((receiveStats['NR'] / receiveStats.total) * 100).toFixed(1) : 0;
        const receiveOPercent = receiveStats.total > 0 ? ((receiveStats['O'] / receiveStats.total) * 100).toFixed(1) : 0;
        
        // Calculate average score (including NR as 0, excluding O)
        let totalScorePoints = 0;
        let scorableTrials = 0;
        ['5', '4', '3', '2', '1'].forEach(score => {
            totalScorePoints += parseInt(score) * overallStats[score];
            scorableTrials += overallStats[score];
        });
        // Include NR as 0 points
        totalScorePoints += 0 * overallStats['NR'];
        scorableTrials += overallStats['NR'];
        
        const averageScore = scorableTrials > 0 ? (totalScorePoints / scorableTrials).toFixed(2) : 'N/A';
        
        this.statsContainer.innerHTML = `
            <div class="swallow-stats-display">
                <div class="stats-row">
                    <span># Trials: <strong>${totalTrials}</strong></span>
                    <span>Average Score: <strong>${averageScore}</strong></span>
                    <span>5: <strong>${score5Percent}%</strong></span>
                    <span>4: <strong>${score4Percent}%</strong></span>
                    <span>3: <strong>${score3Percent}%</strong></span>
                    <span>2: <strong>${score2Percent}%</strong></span>
                    <span>1: <strong>${score1Percent}%</strong></span>
                    <span>NR: <strong>${scoreNRPercent}%</strong></span>
                    <span>O: <strong>${scoreOPercent}%</strong></span>
                </div>
                <div class="stats-row" style="margin-top: 8px;">
                    <span><strong>Offer (${offerStats.total}):</strong></span>
                    <span>5: <strong>${offer5Percent}%</strong></span>
                    <span>4: <strong>${offer4Percent}%</strong></span>
                    <span>3: <strong>${offer3Percent}%</strong></span>
                    <span>2: <strong>${offer2Percent}%</strong></span>
                    <span>1: <strong>${offer1Percent}%</strong></span>
                    <span>NR: <strong>${offerNRPercent}%</strong></span>
                    <span>O: <strong>${offerOPercent}%</strong></span>
                </div>
                <div class="stats-row" style="margin-top: 4px;">
                    <span><strong>Receive (${receiveStats.total}):</strong></span>
                    <span>5: <strong>${receive5Percent}%</strong></span>
                    <span>4: <strong>${receive4Percent}%</strong></span>
                    <span>3: <strong>${receive3Percent}%</strong></span>
                    <span>2: <strong>${receive2Percent}%</strong></span>
                    <span>1: <strong>${receive1Percent}%</strong></span>
                    <span>NR: <strong>${receiveNRPercent}%</strong></span>
                    <span>O: <strong>${receiveOPercent}%</strong></span>
                </div>
            </div>
        `;
    }
}

// =========================
// REGION: PRACTICE MODULES
// =========================

class PracticeDataTableComponent extends BaseComponent {
    constructor(app, config) {
        super(app, config);
        this.data.rows = this.data.rows || [];
    }

    createContent() {
        this.contentContainer = document.createElement('div');
        this.contentContainer.style.marginLeft = '16px';
        
    // Create table (add distinct class for identification in print builder)
    this.table = document.createElement('table');
    this.table.className = 'pace-table practice-table'; // retains styling, adds identifier
        this.table.innerHTML = `
            <thead>
                <tr>
                    <th style="width:50px">Trial</th>
                    <th style="width:120px">Stimulus</th>
                    <th style="width:180px">Performance</th>
                    <th style="width:120px">Support</th>
                    <th style="width:180px">Cues/Comments</th>
                    <th style="width:40px"></th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        
        // Create add row button
        this.addRowBtn = document.createElement('button');
        this.addRowBtn.type = 'button';
        this.addRowBtn.className = 'pace-add-row-btn';
        this.addRowBtn.textContent = '+ Add Row';
        this.addRowBtn.style.margin = '10px 0 0 0';
        this.addRowBtn.onclick = () => this.addRow();
        
        this.contentContainer.appendChild(this.table);
        this.contentContainer.appendChild(this.addRowBtn);
        
        // Add statistics display
        this.statsContainer = document.createElement('div');
        this.statsContainer.className = 'swallow-analysis-container';
        this.statsContainer.style.marginTop = '12px';
        this.contentContainer.appendChild(this.statsContainer);
        
        // Add initial row if no data
        if (this.data.rows.length === 0) {
            this.addRow();
        } else {
            this.renderRows();
        }
        
        this.preventDragEvents(this.table);
        this.preventDragEvents(this.addRowBtn);
    }

    addRow(rowData = {}) {
        const rowId = Date.now() + Math.random();
        // If no stimulus provided, use previous row's stimulus
        let defaultStimulus = '';
        if (!rowData.stimulus && this.data.rows.length > 0) {
            const prevRow = this.data.rows[this.data.rows.length - 1];
            defaultStimulus = prevRow.stimulus || '';
        }
        const newRowData = {
            id: rowId,
            stimulus: rowData.stimulus || defaultStimulus,
            performance: rowData.performance || '',
            level: rowData.level || '',
            comments: rowData.comments || ''
        };
        this.data.rows.push(newRowData);
        this.renderRows();
    }

    removeRow(rowId) {
        this.data.rows = this.data.rows.filter(row => row.id !== rowId);
        this.renderRows();
    }

    renderRows() {
        const tbody = this.table.querySelector('tbody');
        tbody.innerHTML = '';
        
        this.data.rows.forEach((rowData, i) => {
            const row = document.createElement('tr');
            const performanceGroupId = `practice-performance-${rowData.id}`;
            const levelGroupId = `practice-level-${rowData.id}`;
            
            row.innerHTML = `
                <td>${i + 1}</td>
                <td>
                    <textarea class="pace-comments" rows="2" data-row="${rowData.id}" data-type="stimulus" placeholder="Stimulus" style="resize: none; overflow: hidden;">${rowData.stimulus}</textarea>
                </td>
                <td>
                    <div class="pace-radio-group" data-type="performance">
                        <label><input type="radio" name="${performanceGroupId}" value="2" ${rowData.performance === '2' ? 'checked' : ''}><span>2 - Accurate</span></label>
                        <label><input type="radio" name="${performanceGroupId}" value="1" ${rowData.performance === '1' ? 'checked' : ''}><span>1 - Partial</span></label>
                        <label><input type="radio" name="${performanceGroupId}" value="0" ${rowData.performance === '0' ? 'checked' : ''}><span>0 - Off-Target-NR</span></label>
                    </div>
                </td>
                <td>
                    <div class="pace-radio-group" data-type="level">
                        <label><input type="radio" name="${levelGroupId}" value="Independent" ${rowData.level === 'Independent' ? 'checked' : ''}><span>Independent</span></label>
                        <label><input type="radio" name="${levelGroupId}" value="Cued" ${rowData.level === 'Cued' ? 'checked' : ''}><span>Cued</span></label>
                    </div>
                </td>
                <td>
                    <textarea class="pace-comments" rows="2" data-row="${rowData.id}" data-type="comments" placeholder="Cues/Comments" style="resize: none; overflow: hidden;">${rowData.comments || ''}</textarea>
                </td>
                <td>
                    <button type="button" class="pace-row-delete" data-row="${rowData.id}" title="Delete Row">&times;</button>
                </td>
            `;
            
            // Add event listeners for stimulus input/textarea
            const stimulusInput = row.querySelector('[data-type="stimulus"]');
            stimulusInput.addEventListener('input', (e) => {
                const rowDataObj = this.data.rows.find(r => r.id == e.target.dataset.row);
                if (rowDataObj) rowDataObj.stimulus = e.target.value;
            });
            // Allow Enter to add newline; Ctrl+Enter to add row from Stimulus cell
            stimulusInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    this.addRow();
                    setTimeout(() => {
                        const lastRow = this.table.querySelector('tbody tr:last-child');
                        lastRow?.querySelector('[data-type="stimulus"]').focus();
                    }, 50);
                }
            });
            
            // Use rowEl for all querySelectorAll calls below
            const rowEl = row;
            // Set up radio button tabindex for Performance - only one radio per group should be tabbable
            const performanceRadios = rowEl.querySelectorAll(`input[name="${performanceGroupId}"]`);
            const checkedPerformanceRadio = rowEl.querySelector(`input[name="${performanceGroupId}"]:checked`);
            if (checkedPerformanceRadio) {
                // If there's a checked radio, only it should be tabbable
                performanceRadios.forEach(radio => {
                    radio.tabIndex = radio === checkedPerformanceRadio ? 0 : -1;
                });
            } else {
                // If no radio is checked, make the first one tabbable
                performanceRadios.forEach((radio, index) => {
                    radio.tabIndex = index === 0 ? 0 : -1;
                });
            }
            
            const levelRadios = rowEl.querySelectorAll(`input[name="${levelGroupId}"]`);
            const checkedLevelRadio = rowEl.querySelector(`input[name="${levelGroupId}"]:checked`);
            if (checkedLevelRadio) {
                // If there's a checked radio, only it should be tabbable
                levelRadios.forEach(radio => {
                    radio.tabIndex = radio === checkedLevelRadio ? 0 : -1;
                });
            } else {
                // If no radio is checked, make the first one tabbable
                levelRadios.forEach((radio, index) => {
                    radio.tabIndex = index === 0 ? 0 : -1;
                });
            }
            
            // Performance radio button event listeners
            rowEl.querySelectorAll(`input[name="${performanceGroupId}"]`).forEach(radio => {
                radio.addEventListener('change', (e) => {
                    const rowDataObj = this.data.rows.find(r => r.id == rowData.id);
                    if (rowDataObj) {
                        rowDataObj.performance = e.target.value;
                        this.updatePracticeStats();
                    }
                    rowEl.querySelectorAll(`input[name="${performanceGroupId}"]`).forEach(r => {
                        r.tabIndex = r === e.target ? 0 : -1;
                    });
                });
            });
            // Level radio button event listeners
            rowEl.querySelectorAll(`input[name="${levelGroupId}"]`).forEach(radio => {
                radio.addEventListener('change', (e) => {
                    const rowDataObj = this.data.rows.find(r => r.id == rowData.id);
                    if (rowDataObj) {
                        rowDataObj.level = e.target.value;
                        this.updatePracticeStats();
                    }
                    rowEl.querySelectorAll(`input[name="${levelGroupId}"]`).forEach(r => {
                        r.tabIndex = r === e.target ? 0 : -1;
                    });
                });
            });
            
            // Add keyboard support for performance radio buttons
            row.querySelectorAll(`input[name="${performanceGroupId}"]`).forEach(radio => {
                radio.addEventListener('keydown', (e) => {
                    const radios = Array.from(row.querySelectorAll(`input[name="${performanceGroupId}"]`));
                    const currentIndex = radios.indexOf(e.target);
                    
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        radio.checked = true;
                        radio.dispatchEvent(new Event('change'));
                    } else if (e.key === '2') {
                        e.preventDefault();
                        const accurateRadio = radios.find(r => r.value === '2');
                        if (accurateRadio) {
                            accurateRadio.checked = true;
                            accurateRadio.focus();
                            accurateRadio.dispatchEvent(new Event('change'));
                        }
                    } else if (e.key === '1') {
                        e.preventDefault();
                        const partialRadio = radios.find(r => r.value === '1');
                        if (partialRadio) {
                            partialRadio.checked = true;
                            partialRadio.focus();
                            partialRadio.dispatchEvent(new Event('change'));
                        }
                    } else if (e.key === '0') {
                        e.preventDefault();
                        const offTargetRadio = radios.find(r => r.value === '0');
                        if (offTargetRadio) {
                            offTargetRadio.checked = true;
                            offTargetRadio.focus();
                            offTargetRadio.dispatchEvent(new Event('change'));
                        }
                    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                        e.preventDefault();
                        const nextIndex = (currentIndex + 1) % radios.length;
                        radios[nextIndex].focus();
                        radios[nextIndex].checked = true;
                        radios[nextIndex].dispatchEvent(new Event('change'));
                    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                        e.preventDefault();
                        const prevIndex = (currentIndex - 1 + radios.length) % radios.length;
                        radios[prevIndex].focus();
                        radios[prevIndex].checked = true;
                        radios[prevIndex].dispatchEvent(new Event('change'));
                    }
                });
                
                // Add focus styling for better keyboard navigation
                radio.addEventListener('focus', (e) => {
                    e.target.parentElement.style.background = '#e3f2fd';
                    e.target.parentElement.style.borderColor = '#2196f3';
                });
                
                radio.addEventListener('blur', (e) => {
                    e.target.parentElement.style.background = '';
                    e.target.parentElement.style.borderColor = '';
                });
            });
            
            // Add keyboard support for level radio buttons
            row.querySelectorAll(`input[name="${levelGroupId}"]`).forEach(radio => {
                radio.addEventListener('keydown', (e) => {
                    const radios = Array.from(row.querySelectorAll(`input[name="${levelGroupId}"]`));
                    const currentIndex = radios.indexOf(e.target);
                    
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        radio.checked = true;
                        radio.dispatchEvent(new Event('change'));
                    } else if (e.key.toLowerCase() === 'i') {
                        e.preventDefault();
                        const independentRadio = radios.find(r => r.value === 'Independent');
                        if (independentRadio) {
                            independentRadio.checked = true;
                            independentRadio.focus();
                            independentRadio.dispatchEvent(new Event('change'));
                        }
                    } else if (e.key.toLowerCase() === 'c') {
                        e.preventDefault();
                        const cuedRadio = radios.find(r => r.value === 'Cued');
                        if (cuedRadio) {
                            cuedRadio.checked = true;
                            cuedRadio.focus();
                            cuedRadio.dispatchEvent(new Event('change'));
                        }
                    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                        e.preventDefault();
                        const nextIndex = (currentIndex + 1) % radios.length;
                        radios[nextIndex].focus();
                        radios[nextIndex].checked = true;
                        radios[nextIndex].dispatchEvent(new Event('change'));
                    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                        e.preventDefault();
                        const prevIndex = (currentIndex - 1 + radios.length) % radios.length;
                        radios[prevIndex].focus();
                        radios[prevIndex].checked = true;
                        radios[prevIndex].dispatchEvent(new Event('change'));
                    }
                });
                
                // Add focus styling for better keyboard navigation
                radio.addEventListener('focus', (e) => {
                    e.target.parentElement.style.background = '#e3f2fd';
                    e.target.parentElement.style.borderColor = '#2196f3';
                });
                
                radio.addEventListener('blur', (e) => {
                    e.target.parentElement.style.background = '';
                    e.target.parentElement.style.borderColor = '';
                });
            });
            
            // Add event listeners for comments textarea
            const commentsInput = row.querySelector('[data-type="comments"]');
            commentsInput.addEventListener('input', (e) => {
                const rowDataObj = this.data.rows.find(r => r.id == e.target.dataset.row);
                if (rowDataObj) rowDataObj.comments = e.target.value;
            });
            
            commentsInput.addEventListener('keydown', (e) => {
                // Enter adds a new row; Shift+Enter inserts newline
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.addRow();
                    setTimeout(() => {
                        const lastRow = this.table.querySelector('tbody tr:last-child');
                        lastRow?.querySelector('[data-type="stimulus"]').focus();
                    }, 50);
                }
            });
            
            row.querySelector('.pace-row-delete').addEventListener('click', (e) => {
                this.removeRow(parseFloat(e.target.dataset.row));
            });
            
            // Prevent drag events
            row.querySelectorAll('input, textarea, button').forEach(el => {
                this.preventDragEvents(el);
            });
            
            tbody.appendChild(row);

            // Initialize textarea auto-resize for the new row (and set initial heights)
            if (window.DomUtils) {
                DomUtils.autoResizeTextareas({ root: row, initializeExisting: true });
            }
        });
        
        // Update statistics after rendering rows
        this.updatePracticeStats();
    }
    
    updatePracticeStats() {
        const totalTrials = this.data.rows.length;
        
        // Count support levels
        const levelCounts = {
            'Independent': 0,
            'Cued': 0
        };
        
        // Calculate performance scores
        let totalPerformanceScore = 0;
        let performanceTrialCount = 0;
        let independentTrials = [];
        let cuedTrials = [];
        
        this.data.rows.forEach(row => {
            // Count support levels
            if (row.level && levelCounts.hasOwnProperty(row.level)) {
                levelCounts[row.level]++;
            }
            
            // Calculate performance scores
            if (row.performance !== undefined && row.performance !== '') {
                const performanceValue = parseInt(row.performance);
                if (!isNaN(performanceValue)) {
                    totalPerformanceScore += performanceValue;
                    performanceTrialCount++;
                    
                    // Track performance by support level
                    if (row.level === 'Independent') {
                        independentTrials.push(performanceValue);
                    } else if (row.level === 'Cued') {
                        cuedTrials.push(performanceValue);
                    }
                }
            }
        });
        
        // Calculate overall average performance
        const averagePerformance = performanceTrialCount > 0 ? (totalPerformanceScore / performanceTrialCount).toFixed(2) : 0;
        const averagePerformancePercent = performanceTrialCount > 0 ? ((totalPerformanceScore / performanceTrialCount / 2) * 100).toFixed(1) : 0;
        
        // Calculate average performance by support level
        const independentAverage = independentTrials.length > 0 ? 
            (independentTrials.reduce((sum, val) => sum + val, 0) / independentTrials.length).toFixed(2) : 0;
        const independentAveragePercent = independentTrials.length > 0 ? 
            ((independentTrials.reduce((sum, val) => sum + val, 0) / independentTrials.length / 2) * 100).toFixed(1) : 0;
        const cuedAverage = cuedTrials.length > 0 ? 
            (cuedTrials.reduce((sum, val) => sum + val, 0) / cuedTrials.length).toFixed(2) : 0;
        const cuedAveragePercent = cuedTrials.length > 0 ? 
            ((cuedTrials.reduce((sum, val) => sum + val, 0) / cuedTrials.length / 2) * 100).toFixed(1) : 0;
        
        // Calculate percentages for support levels
        const independentPercent = totalTrials > 0 ? ((levelCounts['Independent'] / totalTrials) * 100).toFixed(1) : 0;
        const cuedPercent = totalTrials > 0 ? ((levelCounts['Cued'] / totalTrials) * 100).toFixed(1) : 0;
        
        // Get or set default moving average window size (max 20)
        const movingAvgInput = this.statsContainer.querySelector('.moving-avg-input');
        const movingAvgSize = movingAvgInput ? Math.min(parseInt(movingAvgInput.value) || 5, 20) : 5;
        
        // Calculate moving average for most recent N trials
        let movingAvgStats = '';
        if (totalTrials > 0) {
            // If window size >= total trials, use overall stats
            if (movingAvgSize >= totalTrials) {
                movingAvgStats = `
                    <div class="stats-row" style="display: flex; justify-content: space-between; margin-top: 8px; padding-top: 8px; border-top: 1px solid #e0e0e0;">
                        <div>
                            <span>Recent ${totalTrials} Trials (All):</span>
                            <span style="margin-left: 20px;"># Independent: <strong>${levelCounts['Independent']}</strong></span>
                            <span style="margin-left: 20px;"># Cued: <strong>${levelCounts['Cued']}</strong></span>
                        </div>
                        <div>
                            <span>Avg Performance: <strong>${averagePerformancePercent}%</strong></span>
                            <span style="margin-left: 20px;">Independent: <strong>${independentAveragePercent}%</strong></span>
                            <span style="margin-left: 20px;">Cued: <strong>${cuedAveragePercent}%</strong></span>
                        </div>
                    </div>
                `;
            } else {
                // Calculate moving average for subset of trials
                const recentTrials = this.data.rows.slice(-movingAvgSize);
                const movingLevelCounts = { 'Independent': 0, 'Cued': 0 };
                let movingTotalPerformanceScore = 0;
                let movingPerformanceTrialCount = 0;
                let movingIndependentTrials = [];
                let movingCuedTrials = [];
                
                recentTrials.forEach(row => {
                    // Count support levels for moving average
                    if (row.level && movingLevelCounts.hasOwnProperty(row.level)) {
                        movingLevelCounts[row.level]++;
                    }
                    
                    // Calculate performance scores for moving average
                    if (row.performance !== undefined && row.performance !== '') {
                        const performanceValue = parseInt(row.performance);
                        if (!isNaN(performanceValue)) {
                            movingTotalPerformanceScore += performanceValue;
                            movingPerformanceTrialCount++;
                            
                            // Track performance by support level for moving average
                            if (row.level === 'Independent') {
                                movingIndependentTrials.push(performanceValue);
                            } else if (row.level === 'Cued') {
                                movingCuedTrials.push(performanceValue);
                            }
                        }
                    }
                });
                
                // Calculate moving averages
                const movingAveragePerformancePercent = movingPerformanceTrialCount > 0 ? 
                    ((movingTotalPerformanceScore / movingPerformanceTrialCount / 2) * 100).toFixed(1) : 0;
                const movingIndependentAveragePercent = movingIndependentTrials.length > 0 ? 
                    ((movingIndependentTrials.reduce((sum, val) => sum + val, 0) / movingIndependentTrials.length / 2) * 100).toFixed(1) : 0;
                const movingCuedAveragePercent = movingCuedTrials.length > 0 ? 
                    ((movingCuedTrials.reduce((sum, val) => sum + val, 0) / movingCuedTrials.length / 2) * 100).toFixed(1) : 0;
                
                const actualTrialsUsed = recentTrials.length;
                
                movingAvgStats = `
                    <div class="stats-row" style="display: flex; justify-content: space-between; margin-top: 8px; padding-top: 8px; border-top: 1px solid #e0e0e0;">
                        <div>
                            <span>Recent ${actualTrialsUsed} Trials:</span>
                            <span style="margin-left: 20px;"># Independent: <strong>${movingLevelCounts['Independent']}</strong></span>
                            <span style="margin-left: 20px;"># Cued: <strong>${movingLevelCounts['Cued']}</strong></span>
                        </div>
                        <div>
                            <span>Avg Performance: <strong>${movingAveragePerformancePercent}%</strong></span>
                            <span style="margin-left: 20px;">Independent: <strong>${movingIndependentAveragePercent}%</strong></span>
                            <span style="margin-left: 20px;">Cued: <strong>${movingCuedAveragePercent}%</strong></span>
                        </div>
                    </div>
                `;
            }
        }
        
        this.statsContainer.innerHTML = `
            <div class="swallow-stats-display">
                <div class="stats-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <div>
                        <label style="margin-right: 8px;">Moving Avg Window:</label>
                        <input type="number" class="moving-avg-input" min="1" max="20" value="${movingAvgSize}" 
                               style="width: 60px; padding: 2px 4px; border: 1px solid #ccc; border-radius: 3px;" />
                        <span style="margin-left: 8px; font-size: 0.9em; color: #666;">trials (max 20)</span>
                    </div>
                </div>
                <div class="stats-row" style="display: flex; justify-content: space-between;">
                    <div>
                        <span># Trials: <strong>${totalTrials}</strong></span>
                        <span style="margin-left: 20px;"># Independent: <strong>${levelCounts['Independent']}</strong></span>
                        <span style="margin-left: 20px;"># Cued: <strong>${levelCounts['Cued']}</strong></span>
                    </div>
                    <div>
                        <span>Avg Performance: <strong>${averagePerformancePercent}%</strong></span>
                        <span style="margin-left: 20px;">Independent: <strong>${independentAveragePercent}%</strong></span>
                        <span style="margin-left: 20px;">Cued: <strong>${cuedAveragePercent}%</strong></span>
                    </div>
                </div>
                ${movingAvgStats}
            </div>
        `;
        
        // Add event listener to moving average input with validation
        const newMovingAvgInput = this.statsContainer.querySelector('.moving-avg-input');
        if (newMovingAvgInput) {
            newMovingAvgInput.addEventListener('input', (e) => {
                // Allow user to type freely, validate on blur or enter
                const inputValue = e.target.value;
                
                // If user presses enter, validate immediately
                if (e.inputType === 'insertLineBreak') {
                    this.validateAndUpdateMovingAvg(e.target);
                }
            });
            
            newMovingAvgInput.addEventListener('blur', (e) => {
                this.validateAndUpdateMovingAvg(e.target);
            });
            
            newMovingAvgInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.validateAndUpdateMovingAvg(e.target);
                }
            });
            
            this.preventDragEvents(newMovingAvgInput);
        }
    }
    
    validateAndUpdateMovingAvg(input) {
        let value = input.value.trim();
        let numValue = parseInt(value);
        
        // Validate input: if invalid text or NaN, default to 5
        if (isNaN(numValue) || value === '') {
            numValue = 5;
        }
        // Cap at maximum of 20
        else if (numValue > 20) {
            numValue = 20;
        }
        // Minimum of 1
        else if (numValue < 1) {
            numValue = 1;
        }
        
        // Update input value if it changed
        if (input.value !== numValue.toString()) {
            input.value = numValue;
        }
        
        // Update stats
        this.updatePracticeStats();
    }
}

// =========================
// REGION: SRT MODULES
// =========================

class SRTTableComponent extends BaseComponent {
    constructor(app, config) {
        super(app, config);
        this.data.intervals = this.data.intervals || ['30s', '1m', '2m'];
        this.data.rows = this.data.rows || [{ cvc: false, marks: Array(this.data.intervals.length).fill("") }];
    }

    createContent() {
        this.contentContainer = document.createElement('div');
        this.contentContainer.style.marginLeft = '16px';
        
        // Create table
        this.table = document.createElement('table');
        this.table.className = 'srt-table';
        
        // Create buttons
        this.addRowBtn = document.createElement('button');
        this.addRowBtn.type = 'button';
        this.addRowBtn.className = 'srt-add-row-btn';
        this.addRowBtn.textContent = '+ Add Row';
        this.addRowBtn.style.margin = '10px 0 0 0';
        this.addRowBtn.onclick = () => this.addRow();
        
        this.addColBtn = document.createElement('button');
        this.addColBtn.type = 'button';
        this.addColBtn.className = 'srt-add-col-btn';
        this.addColBtn.textContent = '+ Add Interval';
        this.addColBtn.style.margin = '10px 0 0 8px';
        this.addColBtn.onclick = () => this.addInterval();
        
        this.contentContainer.appendChild(this.table);
        this.contentContainer.appendChild(this.addRowBtn);
        this.contentContainer.appendChild(this.addColBtn);
        
        // Add statistics display
        this.statsContainer = document.createElement('div');
        this.statsContainer.className = 'swallow-analysis-container';
        this.statsContainer.style.marginTop = '12px';
        this.contentContainer.appendChild(this.statsContainer);
        
        this.renderTable();
        
        this.preventDragEvents(this.table);
        this.preventDragEvents(this.addRowBtn);
        this.preventDragEvents(this.addColBtn);
    }

    addRow() {
        this.data.rows.push({ cvc: false, marks: Array(this.data.intervals.length).fill("") });
        this.renderTable();
    }

    removeRow(index) {
        this.data.rows.splice(index, 1);
        this.renderTable();
    }

    addInterval() {
        // Insert a placeholder interval and render. The header will be made
        // editable via an inline input so users can type directly in the
        // desktop/electron build where window.prompt may be blocked.
        const placeholder = 'New interval';
        this.data.intervals.push(placeholder);
        this.data.rows.forEach(row => row.marks.push(""));
        // Render and request focus for the newly added interval header (last)
        this.renderTable({ focusHeader: this.data.intervals.length - 1 });
    }

    renderTable(focusInfo = null) {
        this.table.innerHTML = '';
        
        // Create header
        const thead = document.createElement('thead');
        const headRow = document.createElement('tr');
        // Static columns
        const trialTh = document.createElement('th');
        trialTh.style.width = '50px';
        trialTh.textContent = 'Trial';
        headRow.appendChild(trialTh);

        const cvcTh = document.createElement('th');
        cvcTh.style.width = '60px';
        cvcTh.textContent = 'CVC?';
        headRow.appendChild(cvcTh);

        // Interval headers (make them editable inline)
        this.data.intervals.forEach((iv, headerIdx) => {
            const th = document.createElement('th');
            th.className = 'srt-interval';
            th.textContent = iv;
            th.tabIndex = 0;
            th.title = 'Click to edit interval label';
            th.style.userSelect = 'none';

            // Make editable on click or Enter: replace with an input element
            const startEdit = () => {
                // Prevent creating multiple inputs
                if (th.querySelector('input')) return;
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'srt-interval-edit';
                input.value = this.data.intervals[headerIdx] || '';
                input.style.width = '100%';
                input.style.boxSizing = 'border-box';
                // When editing finishes, save value back to data and re-render
                const finish = (commit) => {
                    const val = input.value.trim();
                    if (commit && val) {
                        this.data.intervals[headerIdx] = val;
                    }
                    // If user left the field blank, remove the interval
                    if (commit && !val) {
                        this.data.intervals.splice(headerIdx, 1);
                        this.data.rows.forEach(row => row.marks.splice(headerIdx, 1));
                    }
                    this.renderTable();
                };

                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        finish(true);
                    } else if (e.key === 'Escape') {
                        e.preventDefault();
                        finish(false);
                    }
                });

                input.addEventListener('blur', () => finish(true));

                // Clear existing content and place input
                th.textContent = '';
                th.appendChild(input);
                input.focus();
                input.select();
            };

            th.addEventListener('click', startEdit);
            th.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    startEdit();
                }
            });

            headRow.appendChild(th);
        });

        const lastTh = document.createElement('th');
        lastTh.style.width = '40px';
        headRow.appendChild(lastTh);

        thead.appendChild(headRow);
        this.table.appendChild(thead);
        
        // Create body
        const tbody = document.createElement('tbody');
        this.data.rows.forEach((rowData, i) => {
            const row = document.createElement('tr');
            
            // Trial number
            const trialCell = document.createElement('td');
            trialCell.textContent = i + 1;
            row.appendChild(trialCell);
            
            // CVC checkbox
            const cvcCell = document.createElement('td');
            const cvcInput = document.createElement('input');
            cvcInput.type = 'checkbox';
            cvcInput.className = 'srt-cvc';
            cvcInput.checked = rowData.cvc;

            cvcInput.onchange = () => { rowData.cvc = cvcInput.checked; };
            
            // Add Enter key support for CVC checkbox
            cvcInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    cvcInput.checked = !cvcInput.checked;
                    cvcInput.dispatchEvent(new Event('change'));
                    // Keep focus on checkbox so user can tab away
                    cvcInput.focus();
                }
            });
            
            cvcCell.appendChild(cvcInput);
            row.appendChild(cvcCell);
            
            // Interval cells
            this.data.intervals.forEach((interval, idx) => {
                const cell = document.createElement('td');
                cell.className = 'srt-interval';
                const correct = document.createElement('span');
                correct.className = 'srt-mark srt-correct' + (rowData.marks[idx] === 'correct' ? ' active' : '');
                correct.title = 'Correct';
                correct.innerHTML = '&#x2714;';
                correct.tabIndex = rowData.marks[idx] === 'correct' || !rowData.marks[idx] ? 0 : -1;
                correct.onclick = () => {
                    rowData.marks[idx] = 'correct';
                    const focusInfo = { row: i, interval: idx, type: 'correct' };
                    this.renderTable(focusInfo);
                };
                
                const incorrect = document.createElement('span');
                incorrect.className = 'srt-mark srt-incorrect' + (rowData.marks[idx] === 'incorrect' ? ' active' : '');
                incorrect.title = 'Incorrect';
                incorrect.innerHTML = '&#x2716;';
                incorrect.tabIndex = rowData.marks[idx] === 'incorrect' ? 0 : -1;
                incorrect.onclick = () => {
                    rowData.marks[idx] = 'incorrect';
                    const focusInfo = { row: i, interval: idx, type: 'incorrect' };
                    this.renderTable(focusInfo);
                };
                
                // Add keyboard navigation for both marks
                [correct, incorrect].forEach(mark => {
                    mark.addEventListener('keydown', (e) => {
                        const marks = [correct, incorrect];
                        const currentIndex = marks.indexOf(e.target);
                        
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            const focusInfo = { row: i, interval: idx, type: mark === correct ? 'correct' : 'incorrect' };
                            mark.click();
                        } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                            e.preventDefault();
                            const nextIndex = (currentIndex + 1) % marks.length;
                            marks[nextIndex].focus();
                        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                            e.preventDefault();
                            const prevIndex = (currentIndex - 1 + marks.length) % marks.length;
                            marks[prevIndex].focus();
                        }
                    });
                    
                    mark.addEventListener('focus', (e) => {
                        e.target.style.transform = 'scale(1.2)';
                        e.target.style.outline = '2px solid #2196f3';
                        e.target.style.outlineOffset = '2px';
                    });
                    
                    mark.addEventListener('blur', (e) => {
                        e.target.style.transform = '';
                        e.target.style.outline = '';
                        e.target.style.outlineOffset = '';
                    });
                });
                
                cell.appendChild(correct);
                cell.appendChild(incorrect);
                row.appendChild(cell);
            });
            
            // Delete button
            const delCell = document.createElement('td');
            const delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.className = 'srt-row-delete';
            delBtn.title = 'Delete Row';
            delBtn.innerHTML = '&times;';
            delBtn.onclick = () => this.removeRow(i);
            delCell.appendChild(delBtn);
            row.appendChild(delCell);
            
            // Prevent drag events
            row.querySelectorAll('input, button, .srt-mark').forEach(el => {
                this.preventDragEvents(el);
            });
            
            tbody.appendChild(row);
        });
        
        this.table.appendChild(tbody);
        // Defensive: remove any other custom-data-table elements that may have been
        // injected into this component's DOM so only the live, editable table remains.
        try {
            if (this.element) {
                const allTables = this.element.querySelectorAll('table.custom-data-table');
                allTables.forEach(t => {
                    if (t !== this.table) t.remove();
                });
            }
        } catch (err) {
            // ignore any DOM errors
        }
        
        // Update statistics after rendering table
        this.updateSRTStats();
        
        // Restore focus if focusInfo provided
        if (focusInfo) {
            setTimeout(() => {
                // Focus a header input if requested
                if (typeof focusInfo.focusHeader === 'number') {
                    const headerIndex = focusInfo.focusHeader;
                    // Header ths are at positions: 0=trial,1=cvc, then intervals start at 2
                    const th = this.table.querySelectorAll('thead tr th')[2 + headerIndex];
                    if (th) {
                        const input = th.querySelector('input.srt-interval-edit');
                        if (input) {
                            input.focus();
                            input.select();
                            return;
                        } else {
                            // If input not present yet, simulate click to create it
                            th.click();
                            const input2 = th.querySelector('input.srt-interval-edit');
                            if (input2) { input2.focus(); input2.select(); }
                        }
                    }
                }

                // Otherwise, restore mark focus in the body if requested
                if (typeof focusInfo.row === 'number' && typeof focusInfo.interval === 'number' && focusInfo.type) {
                    const targetRow = tbody.children[focusInfo.row];
                    if (targetRow) {
                        const intervalCell = targetRow.children[2 + focusInfo.interval]; // +2 for trial# and CVC columns
                        if (intervalCell) {
                            const targetMark = intervalCell.querySelector(`.srt-${focusInfo.type}`);
                            if (targetMark) {
                                targetMark.focus();
                            }
                        }
                    }
                }
            }, 0);
        }
    }
    
    updateSRTStats() {
        const totalTrials = this.data.rows.length;
        
        // Find longest intervals achieved
        let longestWithCVC = 'None';
        let longestWithoutCVC = 'None';
        
        // Count correct and incorrect responses
        let totalCorrect = 0;
        let totalIncorrect = 0;
        
        // Process each row
        this.data.rows.forEach(row => {
            // Count marks for ratio
            row.marks.forEach(mark => {
                if (mark === 'correct') totalCorrect++;
                else if (mark === 'incorrect') totalIncorrect++;
            });
            
            // Find rightmost correct mark for this row
            let rightmostCorrectIndex = -1;
            for (let i = row.marks.length - 1; i >= 0; i--) {
                if (row.marks[i] === 'correct') {
                    rightmostCorrectIndex = i;
                    break;
                }
            }
            
            // Update longest intervals if this row has a correct mark
            if (rightmostCorrectIndex >= 0) {
                const intervalName = this.data.intervals[rightmostCorrectIndex];
                if (row.cvc) {
                    if (longestWithCVC === 'None' || rightmostCorrectIndex > this.data.intervals.indexOf(longestWithCVC)) {
                        longestWithCVC = intervalName;
                    }
                } else {
                    if (longestWithoutCVC === 'None' || rightmostCorrectIndex > this.data.intervals.indexOf(longestWithoutCVC)) {
                        longestWithoutCVC = intervalName;
                    }
                }
            }
        });
        
        // Calculate ratio
        const totalResponses = totalCorrect + totalIncorrect;
        const correctRatio = totalResponses > 0 ? `${totalCorrect}:${totalIncorrect}` : 'N/A';
        const correctPercent = totalResponses > 0 ? ((totalCorrect / totalResponses) * 100).toFixed(1) : 0;
        
        this.statsContainer.innerHTML = `
            <div class="swallow-stats-display">
                <div class="stats-row">
                    <span># Trials: <strong>${totalTrials}</strong></span>
                    <span>Correct:Incorrect: <strong>${correctRatio}</strong> (${correctPercent}% correct)</span>
                </div>
                <div class="stats-row" style="margin-top: 8px;">
                    <span>Longest interval with CVC: <strong>${longestWithCVC}</strong></span>
                    <span>Longest interval without CVC: <strong>${longestWithoutCVC}</strong></span>
                </div>
            </div>
        `;
    }
}

// =========================
// REGION: CUSTOM DATA TABLE MODULE
// =========================

class CustomDataTableComponent extends BaseComponent {
    constructor(app, config) {
        super(app, config);
        this.data = {
            headers: this.data.headers || {
                trial: 'Trial',
                stimulus: 'Stimulus',
                dataCol1: 'Performance',
                dataCol2: 'Support',
                comments: 'Comments',
                extraCols: []
            },
            // Allow removing/adding the rightmost data column (dataCol2)
            hasDataCol2: this.data.hasDataCol2 !== undefined ? this.data.hasDataCol2 : true,
            dataCol1: this.data.dataCol1 || {
                options: [
                    { label: 'Accurate', value: '2', numValue: 2 },
                    { label: 'Partial', value: '1', numValue: 1 },
                    { label: 'Off-Target', value: '0', numValue: 0 }
                ]
            },
            dataCol2: this.data.dataCol2 || {
                options: [
                    { label: 'Independent', value: 'Independent', numValue: 1 },
                    { label: 'Cued', value: 'Cued', numValue: 0 }
                ]
            },
            extraColumns: this.data.extraColumns || [],
            rows: this.data.rows || [],
            ...this.data
        };
    }

    createContent() {
        this.contentContainer = document.createElement('div');
        this.contentContainer.style.marginLeft = '16px';
        
        // Create configuration panel
        this.createConfigPanel();
        
        // Create table (add distinct class for identification in print builder)
        this.table = document.createElement('table');
    this.table.className = 'custom-data-table';
        
        // Create add row button
        this.addRowBtn = document.createElement('button');
        this.addRowBtn.type = 'button';
        this.addRowBtn.className = 'pace-add-row-btn';
        this.addRowBtn.textContent = '+ Add Row';
        this.addRowBtn.style.margin = '10px 0 0 0';
        this.addRowBtn.onclick = () => this.addRow();
        
        // Create column management buttons
        this.columnControls = document.createElement('div');
        this.columnControls.style.margin = '10px 0';
        this.createColumnControls();
        
        this.contentContainer.appendChild(this.table);
        this.contentContainer.appendChild(this.addRowBtn);
        this.contentContainer.appendChild(this.columnControls);
        
        // Add statistics display
        this.statsContainer = document.createElement('div');
        this.statsContainer.className = 'swallow-analysis-container';
        this.statsContainer.style.marginTop = '12px';
        this.contentContainer.appendChild(this.statsContainer);
        
        // Render initial table and stats
        this.renderTable();
        this.updateStats();
        
        // Add initial row if no data
        if (this.data.rows.length === 0) {
            this.addRow();
        }
        
        this.preventDragEvents(this.table);
        this.preventDragEvents(this.addRowBtn);
    }

    createConfigPanel() {
        this.configPanel = document.createElement('div');
        this.configPanel.className = 'custom-data-config-panel';
        this.configPanel.style.cssText = `
            margin-bottom: 12px;
            padding: 16px;
            background: var(--color-surface-alt, #2d3748);
            border: 1px solid var(--color-border, #4a5568);
            border-radius: var(--radius-md, 8px);
            display: none;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        `;
        
        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.textContent = '⚙️ Configure Columns';
        toggleBtn.className = 'pace-add-row-btn';
        toggleBtn.style.cssText = `
            margin-bottom: 8px;
            background: var(--color-primary, #2196f3);
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
        `;
        toggleBtn.onmouseover = () => toggleBtn.style.background = 'var(--color-primary-hover, #1976d2)';
        toggleBtn.onmouseout = () => toggleBtn.style.background = 'var(--color-primary, #2196f3)';
        toggleBtn.onclick = () => {
            this.configPanel.style.display = this.configPanel.style.display === 'none' ? 'block' : 'none';
        };
        
        this.createDataColumnConfig();
        
        this.contentContainer.appendChild(toggleBtn);
        this.contentContainer.appendChild(this.configPanel);
        
        this.preventDragEvents(toggleBtn);
        this.preventDragEvents(this.configPanel);
    }

    createDataColumnConfig() {
        // Data Column 1 Configuration
        const col1Config = document.createElement('div');
        col1Config.style.cssText = `
            margin-bottom: 20px;
            padding: 12px;
            background: var(--tdst-surface, var(--color-surface, #fff));
            border: 1px solid var(--tdst-border, var(--color-border, #e3e7ed));
            border-radius: 6px;
        `;
        col1Config.innerHTML = `
            <h4 data-column="dataCol1" style="margin: 0 0 12px 0; color: var(--color-text, #e2e8f0); font-size: 14px; font-weight: 600;">Data Column 1 (${this.data.headers.dataCol1}):</h4>
            <div class="config-options" data-column="dataCol1"></div>
        `;
        
        // Data Column 2 Configuration
        const col2Config = document.createElement('div');
        col2Config.style.cssText = `
            margin-bottom: 12px;
            padding: 12px;
            background: var(--tdst-surface, var(--color-surface, #fff));
            border: 1px solid var(--tdst-border, var(--color-border, #e3e7ed));
            border-radius: 6px;
        `;
        col2Config.innerHTML = `
            <h4 data-column="dataCol2" style="margin: 0 0 12px 0; color: var(--color-text, #e2e8f0); font-size: 14px; font-weight: 600;">Data Column 2 (${this.data.headers.dataCol2}):</h4>
            <div class="config-options" data-column="dataCol2"></div>
        `;
        
        this.configPanel.appendChild(col1Config);
        this.configPanel.appendChild(col2Config);
        this.renderDataColumnOptions();
        
        // Add option button listeners with hover effects
        this.configPanel.querySelectorAll('.add-option-btn').forEach(btn => {
            btn.onclick = () => this.addDataOption(btn.dataset.column);
            btn.onmouseover = () => btn.style.background = 'var(--color-success-hover, #2f855a)';
            btn.onmouseout = () => btn.style.background = 'var(--color-success, #38a169)';
            this.preventDragEvents(btn);
        });
    }

    renderDataColumnOptions() {
        ['dataCol1', 'dataCol2'].forEach(colKey => {
            const container = this.configPanel.querySelector(`.config-options[data-column="${colKey}"]`);
            container.innerHTML = '';
            // If dataCol2 is disabled, don't render its options
            if (colKey === 'dataCol2' && !this.data.hasDataCol2) return;

            this.data[colKey].options.forEach((option, index) => {
                const optionDiv = document.createElement('div');
                optionDiv.style.cssText = `
                    display: flex; 
                    gap: 8px; 
                    margin: 6px 0; 
                    align-items: center;
                    padding: 8px;
                    background: var(--tdst-surface-raised, var(--tdst-surface, var(--color-surface, #fff)));
                    border-radius: 4px;
                    border: 1px solid var(--tdst-border-subtle, var(--tdst-border, var(--color-border, #bfc8d6)));
                `;
                
                const labelInput = document.createElement('input');
                labelInput.type = 'text';
                labelInput.value = option.label;
                labelInput.placeholder = 'Option label';
                labelInput.style.cssText = `
                    flex: 1;
                    padding: 6px 8px;
                    background: var(--color-input-bg, #1a202c);
                    border: 1px solid var(--color-border, #4a5568);
                    border-radius: 4px;
                    color: var(--color-text, #e2e8f0);
                    font-size: 13px;
                `;
                labelInput.onchange = () => {
                    this.data[colKey].options[index].label = labelInput.value;
                    this.data[colKey].options[index].value = labelInput.value;
                    this.renderTable();
                };
                
                const numValueInput = document.createElement('input');
                numValueInput.type = 'number';
                numValueInput.value = option.numValue !== undefined ? option.numValue : '';
                numValueInput.placeholder = 'Value';
                numValueInput.style.cssText = `
                    width: 70px;
                    padding: 6px 8px;
                    background: var(--color-input-bg, #1a202c);
                    border: 1px solid var(--color-border, #4a5568);
                    border-radius: 4px;
                    color: var(--color-text, #e2e8f0);
                    font-size: 13px;
                `;
                numValueInput.title = 'Numeric value for averaging (optional)';
                numValueInput.onchange = () => {
                    const val = parseFloat(numValueInput.value);
                    this.data[colKey].options[index].numValue = isNaN(val) ? undefined : val;
                    // Re-render table so radio labels include updated numeric values
                    this.renderTable();
                    this.updateStats();
                };
                
                // Standardize delete button to match table row delete
                const deleteBtn = document.createElement('button');
                deleteBtn.type = 'button';
                deleteBtn.className = 'pace-row-delete';
                deleteBtn.title = 'Delete Option';
                deleteBtn.innerHTML = '&times;';
                deleteBtn.onclick = () => {
                    if (this.data[colKey].options.length > 1) {
                        this.data[colKey].options.splice(index, 1);
                        this.renderDataColumnOptions();
                        this.renderTable();
                    }
                };
                
                optionDiv.appendChild(labelInput);
                optionDiv.appendChild(numValueInput);
                optionDiv.appendChild(deleteBtn);
                container.appendChild(optionDiv);
                
                this.preventDragEvents(labelInput);
                this.preventDragEvents(numValueInput);
                this.preventDragEvents(deleteBtn);
            });
            // After listing options, add Clear All Values button for this column and enforce max options note
            const footer = document.createElement('div');
            footer.style.cssText = `
                margin-top: 12px; 
                display: flex; 
                gap: 12px; 
                align-items: center;
                padding-top: 8px;
                border-top: 1px solid var(--color-border-subtle, #4a5568);
            `;
            const clearBtn = document.createElement('button');
            clearBtn.type = 'button';
            clearBtn.textContent = 'Clear values';
            clearBtn.style.cssText = `
                background: var(--color-warning, #ed8936);
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                font-weight: 500;
                transition: background-color 0.2s ease;
            `;
            clearBtn.onmouseover = () => clearBtn.style.background = 'var(--color-warning-hover, #dd6b20)';
            clearBtn.onmouseout = () => clearBtn.style.background = 'var(--color-warning, #ed8936)';
            clearBtn.addEventListener('click', () => {
                // Clear numeric values (numValue) for all options in this column
                this.data[colKey].options.forEach(option => {
                    option.numValue = undefined;
                });
                // Re-render the config options to update inputs, table to update labels, and stats
                this.renderDataColumnOptions();
                this.renderTable();
                this.updateStats();
            });
            // Create a footer row to host Add Option and Clear buttons side-by-side
            const controlsRow = document.createElement('div');
            controlsRow.style.cssText = 'display:flex; gap:8px; align-items:center; margin-top:8px;';

            // Move Add Option button next to Clear button
            // Create single Add Option button for this column and place it next to Clear
            const addBtn = document.createElement('button');
            addBtn.type = 'button';
            addBtn.textContent = '+ Add Option';
            addBtn.style.cssText = `
                background: var(--color-success, #38a169);
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                font-weight: 500;
            `;
            addBtn.onclick = () => this.addDataOption(colKey);
            addBtn.onmouseover = () => addBtn.style.background = 'var(--color-success-hover, #2f855a)';
            addBtn.onmouseout = () => addBtn.style.background = 'var(--color-success, #38a169)';
            controlsRow.appendChild(addBtn);

            controlsRow.appendChild(clearBtn);

            const note = document.createElement('div');
            note.style.cssText = `
                font-size: 11px;
                color: var(--color-text-muted, #a0aec0);
                margin-left: 8px;
                line-height: 1.3;
            `;
            note.textContent = 'Max options: 10. Use digit hotkeys (0-9) when values are set.';
            controlsRow.appendChild(note);

            container.appendChild(controlsRow);
        });
    }

    addDataOption(columnKey) {
        // Enforce maximum of 10 options
        if (this.data[columnKey].options.length >= 10) {
            alert('Maximum of 10 options reached');
            return;
        }

        const idx = this.data[columnKey].options.length;
        this.data[columnKey].options.push({
            label: `Option ${idx + 1}`,
            value: `option${idx + 1}`,
            numValue: idx
        });
        this.renderDataColumnOptions();
        this.renderTable();
    }

    createColumnControls() {
        this.columnControls.innerHTML = '';
        
        if (this.data.extraColumns.length < 2) {
            const addColBtn = document.createElement('button');
            addColBtn.type = 'button';
            addColBtn.className = 'pace-add-row-btn';
            addColBtn.textContent = '+ Add Text Column';
            addColBtn.style.marginRight = '8px';
            addColBtn.onclick = () => this.addExtraColumn();
            this.columnControls.appendChild(addColBtn);
            this.preventDragEvents(addColBtn);
        }
        
        if (this.data.extraColumns.length > 0) {
            const removeColBtn = document.createElement('button');
            removeColBtn.type = 'button';
            removeColBtn.className = 'pace-add-row-btn';
            removeColBtn.textContent = '- Remove Last Column';
            removeColBtn.onclick = () => this.removeExtraColumn();
            this.columnControls.appendChild(removeColBtn);
            this.preventDragEvents(removeColBtn);
        }

        // Add toggle button for Data Column 2 visibility with confirmation when hiding
        const toggleDataCol2Btn = document.createElement('button');
        toggleDataCol2Btn.type = 'button';
        toggleDataCol2Btn.className = 'pace-add-row-btn';
        toggleDataCol2Btn.textContent = this.data.hasDataCol2 ? 'Hide Data Column 2' : 'Show Data Column 2';
        toggleDataCol2Btn.style.marginLeft = '8px';
        toggleDataCol2Btn.onclick = () => {
            if (this.data.hasDataCol2) {
                // Confirm hiding (user may want to keep values)
                const confirmed = confirm('Hide Data Column 2? This will keep existing values but hide the column.');
                if (!confirmed) return;
                this.data.hasDataCol2 = false;
            } else {
                this.data.hasDataCol2 = true;
            }
            toggleDataCol2Btn.textContent = this.data.hasDataCol2 ? 'Hide Data Column 2' : 'Show Data Column 2';
            // Recreate column controls in case button text or availability changes
            this.createColumnControls();
            this.renderTable();
            // Update stats and re-render config options so users see Data Column 2 choices immediately
            this.updateStats();
            try {
                // If the config panel exists, refresh its options. This ensures Data Column 2 options
                // appear immediately when the column is added. If the panel is hidden, open it so
                // the user can see and edit the new options right away.
                if (this.configPanel) {
                    this.renderDataColumnOptions();
                    if (this.data.hasDataCol2) {
                        this.configPanel.style.display = 'block';
                        // Scroll the Data Column 2 header into view for visibility
                        const col2Header = this.configPanel.querySelector('h4[data-column="dataCol2"]');
                        if (col2Header && typeof col2Header.scrollIntoView === 'function') {
                            // Smooth scroll for UX; wrapped in try to avoid issues in older browsers
                            try { col2Header.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { col2Header.scrollIntoView(); }
                        }
                    } else {
                        // If hidden, ensure options are cleared to avoid stale UI
                        this.renderDataColumnOptions();
                    }
                }
            } catch (err) {
                // Ignore any DOM timing issues
                console.warn('Could not refresh config panel after toggling Data Column 2', err);
            }
        };
        this.columnControls.appendChild(toggleDataCol2Btn);
        this.preventDragEvents(toggleDataCol2Btn);
    }

    addExtraColumn() {
        if (this.data.extraColumns.length < 2) {
            const newColumn = {
                name: `Extra ${this.data.extraColumns.length + 1}`,
                key: `extra${this.data.extraColumns.length + 1}`
            };
            this.data.extraColumns.push(newColumn);
            
            // Add column data to existing rows
            this.data.rows.forEach(row => {
                row[newColumn.key] = row[newColumn.key] || '';
            });
            
            this.createColumnControls();
            this.renderTable();
        }
    }

    removeExtraColumn() {
        if (this.data.extraColumns.length > 0) {
            const removedColumn = this.data.extraColumns.pop();
            
            // Remove column data from existing rows
            this.data.rows.forEach(row => {
                delete row[removedColumn.key];
            });
            
            this.createColumnControls();
            this.renderTable();
        }
    }

    addRow(rowData = {}) {
        const rowId = Date.now() + Math.random();
        const newRowData = {
            id: rowId,
            stimulus: rowData.stimulus || '',
            dataCol1: rowData.dataCol1 || '',
            dataCol2: rowData.dataCol2 || '',
            comments: rowData.comments || '',
            ...this.data.extraColumns.reduce((acc, col) => {
                acc[col.key] = rowData[col.key] || '';
                return acc;
            }, {})
        };
        
        this.data.rows.push(newRowData);
        this.renderTable();
        this.updateStats();
    }

    removeRow(rowId) {
        this.data.rows = this.data.rows.filter(row => row.id !== rowId);
        this.renderTable();
        this.updateStats();
    }

    renderTable() {
        this.table.innerHTML = '';
        
        // Create header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        // Basic headers (conditionally include dataCol2)
        const headers = [
            { key: 'trial', text: this.data.headers.trial, width: '50px', editable: false },
            { key: 'stimulus', text: this.data.headers.stimulus, width: '120px', editable: true },
            { key: 'dataCol1', text: this.data.headers.dataCol1, width: '180px', editable: true }
        ];

        if (this.data.hasDataCol2) {
            headers.push({ key: 'dataCol2', text: this.data.headers.dataCol2, width: '120px', editable: true });
        }

        headers.push({ key: 'comments', text: this.data.headers.comments, width: '180px', editable: true });
        
        // Add extra column headers
        this.data.extraColumns.forEach(col => {
            headers.push({ key: col.key, text: col.name, width: '120px', editable: true, isExtra: true });
        });
        
        // Add delete column
        headers.push({ key: 'delete', text: '', width: '40px', editable: false });
        
        headers.forEach(header => {
            const th = document.createElement('th');
            th.style.width = header.width;
            // Expose the logical column key on the TH so external exporters can map columns reliably
            if (header.key) th.dataset.key = header.key;
            
            if (header.editable) {
                th.contentEditable = true;
                th.textContent = header.text;
                th.addEventListener('input', () => {
                    if (header.isExtra) {
                        const extraCol = this.data.extraColumns.find(col => col.key === header.key);
                        if (extraCol) {
                            extraCol.name = th.textContent;
                            // Update any config panel entries for extra columns
                            if (this.configPanel) {
                                const extraHeader = this.configPanel.querySelector(`h4[data-column="${header.key}"]`);
                                if (extraHeader) extraHeader.textContent = th.textContent;
                            }
                        }
                    } else {
                        this.data.headers[header.key] = th.textContent;
                        // Update config panel titles for data columns
                        if (this.configPanel) {
                            const col1H = this.configPanel.querySelector('h4[data-column="dataCol1"]');
                            const col2H = this.configPanel.querySelector('h4[data-column="dataCol2"]');
                            if (col1H) col1H.innerHTML = `Data Column 1 (${this.data.headers.dataCol1}):`;
                            if (col2H) col2H.innerHTML = `Data Column 2 (${this.data.headers.dataCol2}):`;
                        }
                    }
                    // Re-render stats immediately to reflect new header labels
                    this.updateStats();
                });
                th.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        th.blur();
                    }
                });
                th.style.cssText += 'cursor: text; background: rgba(33, 150, 243, 0.1);';
            } else {
                th.textContent = header.text;
            }
            
        headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        this.table.appendChild(thead);
        
        // Create body
        const tbody = document.createElement('tbody');
        this.data.rows.forEach((rowData, i) => {
            const row = document.createElement('tr');
            
            // Trial number
            const trialCell = document.createElement('td');
            trialCell.textContent = i + 1;
            row.appendChild(trialCell);
            
            // Stimulus
            const stimulusCell = document.createElement('td');
            const stimulusTextarea = document.createElement('textarea');
            stimulusTextarea.className = 'pace-comments';
            stimulusTextarea.rows = 2;
            stimulusTextarea.style.cssText = 'resize: none; overflow: hidden; width: 100%;';
            stimulusTextarea.value = rowData.stimulus;
            stimulusTextarea.addEventListener('input', (e) => {
                rowData.stimulus = e.target.value;
            });
            stimulusCell.appendChild(stimulusTextarea);
            row.appendChild(stimulusCell);
            
            // Data Column 1 (radio buttons)
            const dataCol1Cell = document.createElement('td');
            const dataCol1Group = `custom-data1-${rowData.id}`;
            dataCol1Cell.innerHTML = '<div class="pace-radio-group" data-type="dataCol1">' +
                this.data.dataCol1.options.map(option => {
                    // Format label as "[Value] - [Label]" when numeric value present
                    const labelText = (option.numValue !== undefined && option.numValue !== '') ? `${option.numValue} - ${option.label}` : option.label;
                    // Escape value attribute
                    const escapedValue = String(option.value).replace(/"/g, '&quot;');
                    return `<label><input type="radio" name="${dataCol1Group}" value="${escapedValue}" ${rowData.dataCol1 === option.value ? 'checked' : ''}><span>${labelText}</span></label>`;
                }).join('') + '</div>';
            
            // Add radio button event listeners and hotkeys for data column 1
            this.setupRadioColumn(dataCol1Cell, rowData, 'dataCol1', dataCol1Group);
            row.appendChild(dataCol1Cell);
            
            // Data Column 2 (radio buttons) - only render if enabled
            if (this.data.hasDataCol2) {
                const dataCol2Cell = document.createElement('td');
                const dataCol2Group = `custom-data2-${rowData.id}`;
                dataCol2Cell.innerHTML = '<div class="pace-radio-group" data-type="dataCol2">' +
                    this.data.dataCol2.options.map(option => {
                        const labelText = (option.numValue !== undefined && option.numValue !== '') ? `${option.numValue} - ${option.label}` : option.label;
                        const escapedValue = String(option.value).replace(/"/g, '&quot;');
                        return `<label><input type="radio" name="${dataCol2Group}" value="${escapedValue}" ${rowData.dataCol2 === option.value ? 'checked' : ''}><span>${labelText}</span></label>`;
                    }).join('') + '</div>';

                // Add radio button event listeners and hotkeys for data column 2
                this.setupRadioColumn(dataCol2Cell, rowData, 'dataCol2', dataCol2Group);
                row.appendChild(dataCol2Cell);
            }
            
            // Comments
            const commentsCell = document.createElement('td');
            const commentsTextarea = document.createElement('textarea');
            commentsTextarea.className = 'pace-comments';
            commentsTextarea.rows = 2;
            commentsTextarea.style.cssText = 'resize: none; overflow: hidden; width: 100%;';
            commentsTextarea.value = rowData.comments || '';
            commentsTextarea.addEventListener('input', (e) => {
                rowData.comments = e.target.value;
            });
            // Enter/Ctrl+Enter behavior: Enter creates a new trial copying this row's stimulus; Ctrl/Cmd+Enter inserts newline
            commentsTextarea.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    if (e.ctrlKey || e.metaKey) {
                        const el = e.target;
                        const start = el.selectionStart;
                        const end = el.selectionEnd;
                        const val = el.value;
                        el.value = val.slice(0, start) + '\n' + val.slice(end);
                        el.selectionStart = el.selectionEnd = start + 1;
                        el.dispatchEvent(new Event('input'));
                        return;
                    }

                    e.preventDefault();
                    // Use the stimulus value from this row's data
                    const currentStim = rowData.stimulus || '';
                    this.addRow({ stimulus: currentStim });
                    setTimeout(() => {
                        try {
                            const lastStim = this.table.querySelector('tbody tr:last-child td:nth-child(2) textarea');
                            if (lastStim) {
                                lastStim.focus();
                                lastStim.selectionStart = lastStim.selectionEnd = lastStim.value.length;
                            }
                        } catch (err) {
                            // ignore
                        }
                    }, 0);
                }
            });
            commentsCell.appendChild(commentsTextarea);
            row.appendChild(commentsCell);
            
            // Extra columns
            this.data.extraColumns.forEach(col => {
                const extraCell = document.createElement('td');
                const extraTextarea = document.createElement('textarea');
                extraTextarea.className = 'pace-comments';
                extraTextarea.rows = 2;
                extraTextarea.style.cssText = 'resize: none; overflow: hidden; width: 100%;';
                extraTextarea.value = rowData[col.key] || '';
                extraTextarea.addEventListener('input', (e) => {
                    rowData[col.key] = e.target.value;
                });
                // Enter/Ctrl+Enter behavior on extra text columns: Enter adds a new trial copying this row's stimulus; Ctrl/Cmd+Enter inserts newline
                extraTextarea.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        if (e.ctrlKey || e.metaKey) {
                            const el = e.target;
                            const start = el.selectionStart;
                            const end = el.selectionEnd;
                            const val = el.value;
                            el.value = val.slice(0, start) + '\n' + val.slice(end);
                            el.selectionStart = el.selectionEnd = start + 1;
                            el.dispatchEvent(new Event('input'));
                            return;
                        }

                        e.preventDefault();
                        const currentStim = rowData.stimulus || '';
                        this.addRow({ stimulus: currentStim });
                        setTimeout(() => {
                            try {
                                const lastStim = this.table.querySelector('tbody tr:last-child td:nth-child(2) textarea');
                                if (lastStim) {
                                    lastStim.focus();
                                    lastStim.selectionStart = lastStim.selectionEnd = lastStim.value.length;
                                }
                            } catch (err) {
                                // ignore
                            }
                        }, 0);
                    }
                });
                extraCell.appendChild(extraTextarea);
                row.appendChild(extraCell);
            });
            
            // Delete button
            const deleteCell = document.createElement('td');
            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'pace-row-delete';
            deleteBtn.title = 'Delete Row';
            deleteBtn.innerHTML = '&times;';
            deleteBtn.onclick = () => this.removeRow(rowData.id);
            deleteCell.appendChild(deleteBtn);
            row.appendChild(deleteCell);
            
            // Prevent drag events
            row.querySelectorAll('input, textarea, button').forEach(el => {
                this.preventDragEvents(el);
            });
            
            tbody.appendChild(row);
        });
        
        this.table.appendChild(tbody);
    }

    setupRadioColumn(cell, rowData, columnKey, groupName) {
        const radios = cell.querySelectorAll(`input[name="${groupName}"]`);
        
        // Set up tabindex - only checked radio or first radio should be tabbable
        const checkedRadio = cell.querySelector(`input[name="${groupName}"]:checked`);
        if (checkedRadio) {
            radios.forEach(radio => radio.tabIndex = radio === checkedRadio ? 0 : -1);
        } else {
            radios.forEach((radio, index) => radio.tabIndex = index === 0 ? 0 : -1);
        }
        
        // Add change listeners
        radios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.checked) {
                    rowData[columnKey] = radio.value;
                    // Update tabindex
                    radios.forEach(r => r.tabIndex = r === radio ? 0 : -1);
                    this.updateStats();
                }
            });
            
            // Add hotkey support
            radio.addEventListener('keydown', (e) => {
                const options = this.data[columnKey].options;

                // Prefer digit hotkeys if any options have numeric numValue (map 0-9 to values)
                const digit = parseInt(e.key, 10);
                if (!isNaN(digit)) {
                    // Find option with numValue equal to digit
                    const matching = options.find(opt => Number(opt.numValue) === digit);
                    if (matching) {
                        e.preventDefault();
                        const targetRadio = cell.querySelector(`input[value="${matching.value}"]`);
                        if (targetRadio) {
                            targetRadio.checked = true;
                            targetRadio.dispatchEvent(new Event('change'));
                            targetRadio.focus();
                        }
                        return;
                    }
                }

                // Fallback: match by first letter
                const pressedKey = e.key.toLowerCase();
                const matchingOption = options.find(opt => opt.label && opt.label.charAt(0).toLowerCase() === pressedKey);
                if (matchingOption) {
                    e.preventDefault();
                    const targetRadio = cell.querySelector(`input[value="${matchingOption.value}"]`);
                    if (targetRadio) {
                        targetRadio.checked = true;
                        targetRadio.dispatchEvent(new Event('change'));
                        targetRadio.focus();
                    }
                    return;
                }

                // Arrow key navigation
                const currentIndex = Array.from(radios).indexOf(radio);
                let nextIndex = currentIndex;

                switch (e.key) {
                    case 'ArrowDown':
                    case 'ArrowRight':
                        e.preventDefault();
                        nextIndex = (currentIndex + 1) % radios.length;
                        break;
                    case 'ArrowUp':
                    case 'ArrowLeft':
                        e.preventDefault();
                        nextIndex = (currentIndex - 1 + radios.length) % radios.length;
                        break;
                    case 'Enter':
                    case ' ':
                        e.preventDefault();
                        radio.checked = true;
                        radio.dispatchEvent(new Event('change'));
                        return;
                }

                if (nextIndex !== currentIndex) {
                    radios[nextIndex].focus();
                }
            });
        });
    }

    updateStats() {
        const totalTrials = this.data.rows.length;
        
        // Calculate stats for data column 1
        const col1Stats = {};
        this.data.dataCol1.options.forEach(option => {
            col1Stats[option.value] = 0;
        });
        
        // Calculate stats for data column 2 (only if enabled)
        const col2Stats = {};
        if (this.data.hasDataCol2) {
            this.data.dataCol2.options.forEach(option => {
                col2Stats[option.value] = 0;
            });
        }
        
        // Calculate numeric averages for both columns
        let col1TotalValue = 0;
        let col1ValidCount = 0;
        let col2TotalValue = 0;
        let col2ValidCount = 0;
        
        this.data.rows.forEach(row => {
            if (row.dataCol1 && col1Stats.hasOwnProperty(row.dataCol1)) {
                col1Stats[row.dataCol1]++;
                
                // Find the numeric value for this option
                const col1Option = this.data.dataCol1.options.find(opt => opt.value === row.dataCol1);
                if (col1Option && col1Option.numValue !== undefined) {
                    col1TotalValue += col1Option.numValue;
                    col1ValidCount++;
                }
            }
            if (this.data.hasDataCol2 && row.dataCol2 && col2Stats.hasOwnProperty(row.dataCol2)) {
                col2Stats[row.dataCol2]++;
                
                // Find the numeric value for this option
                const col2Option = this.data.dataCol2.options.find(opt => opt.value === row.dataCol2);
                if (col2Option && col2Option.numValue !== undefined) {
                    col2TotalValue += col2Option.numValue;
                    col2ValidCount++;
                }
            }
        });
        
        // Calculate averages
        const col1Average = col1ValidCount > 0 ? (col1TotalValue / col1ValidCount).toFixed(2) : null;
        const col2Average = col2ValidCount > 0 ? (col2TotalValue / col2ValidCount).toFixed(2) : null;
        
        // Generate stats HTML
        const col1StatsHtml = this.data.dataCol1.options.map(option => {
            const count = col1Stats[option.value];
            const percent = totalTrials > 0 ? ((count / totalTrials) * 100).toFixed(1) : 0;
            return `<span>${option.label}: <strong>${count} (${percent}%)</strong></span>`;
        }).join(' ');
        
        const col2StatsHtml = this.data.dataCol2.options.map(option => {
            const count = col2Stats[option.value];
            const percent = totalTrials > 0 ? ((count / totalTrials) * 100).toFixed(1) : 0;
            return `<span>${option.label}: <strong>${count} (${percent}%)</strong></span>`;
        }).join(' ');
        
        // Build statistics display
        let statsHtml = `
            <div class="swallow-stats-display">
                <div class="stats-row">
                    <span># Trials: <strong>${totalTrials}</strong></span> `;
        
        if (col1Average !== null) {
            statsHtml += `<span>Avg ${this.data.headers.dataCol1}: <strong>${col1Average}</strong></span> `;
        }
        if (this.data.hasDataCol2 && col2Average !== null) {
            statsHtml += `<span>Avg ${this.data.headers.dataCol2}: <strong>${col2Average}</strong></span> `;
        }
        
        statsHtml += `
                </div>
                <div class="stats-row" style="margin-top: 8px;">
                    <span><strong>${this.data.headers.dataCol1}:</strong></span>
                    ${col1StatsHtml}
                </div>
                ${this.data.hasDataCol2 ? `<div class="stats-row" style="margin-top: 4px;">
                    <span><strong>${this.data.headers.dataCol2}:</strong></span>
                    ${col2StatsHtml}
                </div>` : ''}
            </div>
        `;
        
        this.statsContainer.innerHTML = statsHtml;
    }

    getComponentType() {
        return 'custom-data-table';
    }
}

// =========================
// REGION: SWALLOW MODULES
// =========================

class SwallowDataComponent extends BaseComponent {
    constructor(app, config) {
        super(app, config);
        this.data = {
            levelTarget: this.data.levelTarget || '',
            trialData: this.data.trialData || '',
            passCriteria: this.data.passCriteria || { numerator: 8, denominator: 10 },
            failCriteria: this.data.failCriteria || { numerator: 3, denominator: 5 },
            ...this.data
        };
        
        // Validate criteria to ensure numerators don't exceed denominators
        this.validateCriteria();
    }
    
    validateCriteria() {
        // Validate pass criteria
        if (this.data.passCriteria.numerator > this.data.passCriteria.denominator) {
            this.data.passCriteria.numerator = this.data.passCriteria.denominator;
        }
        
        // Validate fail criteria
        if (this.data.failCriteria.numerator > this.data.failCriteria.denominator) {
            this.data.failCriteria.numerator = this.data.failCriteria.denominator;
        }
    }

    createContent() {
        this.contentContainer = document.createElement('div');
        this.contentContainer.style.marginLeft = '16px';
        this.contentContainer.className = 'swallow-data-container';
        
        // Level/Target Food input
        this.createLevelTargetField();
        
        // Scoring criteria controls
        this.createScoringCriteria();
        
        // Trial data input
        this.createTrialDataField();
        
        // Real-time analysis display
        this.createAnalysisDisplay();
        
        // Instructions
        this.createInstructions();
        
        this.updateAnalysis();
    }

    createLevelTargetField() {
        const levelContainer = document.createElement('div');
        levelContainer.className = 'swallow-level-container';
        
        const levelLabel = document.createElement('label');
        levelLabel.textContent = 'Level/Target Bolus:';
        levelLabel.className = 'swallow-label';
        // Provide an accessible association between label and input
        const levelId = `swallow-level-${Math.random().toString(36).slice(2,8)}`;
        levelLabel.htmlFor = levelId;
        
        this.levelInput = document.createElement('input');
        this.levelInput.type = 'text';
        this.levelInput.className = 'swallow-level-input';
    this.levelInput.id = levelId;
        this.levelInput.placeholder = 'Enter level or target food...';
        this.levelInput.value = this.data.levelTarget;
        
        this.levelInput.addEventListener('input', (e) => {
            this.data.levelTarget = e.target.value;
        });
        
        levelContainer.appendChild(levelLabel);
        levelContainer.appendChild(this.levelInput);
        this.contentContainer.appendChild(levelContainer);
        
        this.preventDragEvents(this.levelInput);
    }

    createScoringCriteria() {
        const criteriaContainer = document.createElement('div');
        criteriaContainer.className = 'swallow-criteria-container';
        
        // Pass criteria
        const passContainer = document.createElement('div');
        passContainer.className = 'criteria-row';
        
        const passLabel = document.createElement('span');
        passLabel.textContent = 'Pass Criteria:';
        passLabel.className = 'criteria-label';
        
        this.passNumeratorSelect = this.createNumberSelect(1, 20, this.data.passCriteria.numerator);
        this.passDenominatorSelect = this.createNumberSelect(1, 20, this.data.passCriteria.denominator);
        
        // Initialize numerator options based on current denominator
        this.updateNumeratorOptions(this.passNumeratorSelect, this.data.passCriteria.denominator, this.data.passCriteria.numerator);
        
        this.passNumeratorSelect.addEventListener('change', () => {
            const newNumerator = parseInt(this.passNumeratorSelect.value);
            const currentDenominator = parseInt(this.passDenominatorSelect.value);
            
            // Ensure numerator doesn't exceed denominator
            if (newNumerator > currentDenominator) {
                this.passNumeratorSelect.value = currentDenominator;
                this.data.passCriteria.numerator = currentDenominator;
            } else {
                this.data.passCriteria.numerator = newNumerator;
            }
            this.updateAnalysis();
        });
        
        this.passDenominatorSelect.addEventListener('change', () => {
            const newDenominator = parseInt(this.passDenominatorSelect.value);
            const currentNumerator = parseInt(this.passNumeratorSelect.value);
            
            this.data.passCriteria.denominator = newDenominator;
            
            // Update numerator options to only show valid values (1 to newDenominator)
            this.updateNumeratorOptions(this.passNumeratorSelect, newDenominator, currentNumerator);
            
            // If current numerator exceeds new denominator, it will be automatically set to denominator by updateNumeratorOptions
            this.data.passCriteria.numerator = parseInt(this.passNumeratorSelect.value);
            this.updateAnalysis();
        });
        
        const passOf = document.createElement('span');
        passOf.textContent = ' out of ';
        passOf.className = 'criteria-text';
        
        const passTrials = document.createElement('span');
        passTrials.textContent = ' rightmost trials must be successful';
        passTrials.className = 'criteria-text';
        
        passContainer.appendChild(passLabel);
        passContainer.appendChild(this.passNumeratorSelect);
        passContainer.appendChild(passOf);
        passContainer.appendChild(this.passDenominatorSelect);
        passContainer.appendChild(passTrials);
        
        // Fail criteria
        const failContainer = document.createElement('div');
        failContainer.className = 'criteria-row';
        
        const failLabel = document.createElement('span');
        failLabel.textContent = 'Fail Criteria:';
        failLabel.className = 'criteria-label';
        
        this.failNumeratorSelect = this.createNumberSelect(1, 20, this.data.failCriteria.numerator);
        this.failDenominatorSelect = this.createNumberSelect(1, 20, this.data.failCriteria.denominator);
        
        // Initialize numerator options based on current denominator
        this.updateNumeratorOptions(this.failNumeratorSelect, this.data.failCriteria.denominator, this.data.failCriteria.numerator);
        
        this.failNumeratorSelect.addEventListener('change', () => {
            const newNumerator = parseInt(this.failNumeratorSelect.value);
            const currentDenominator = parseInt(this.failDenominatorSelect.value);
            
            // Ensure numerator doesn't exceed denominator
            if (newNumerator > currentDenominator) {
                this.failNumeratorSelect.value = currentDenominator;
                this.data.failCriteria.numerator = currentDenominator;
            } else {
                this.data.failCriteria.numerator = newNumerator;
            }
            this.updateAnalysis();
        });
        
        this.failDenominatorSelect.addEventListener('change', () => {
            const newDenominator = parseInt(this.failDenominatorSelect.value);
            const currentNumerator = parseInt(this.failNumeratorSelect.value);
            
            this.data.failCriteria.denominator = newDenominator;
            
            // Update numerator options to only show valid values (1 to newDenominator)
            this.updateNumeratorOptions(this.failNumeratorSelect, newDenominator, currentNumerator);
            
            // If current numerator exceeds new denominator, it will be automatically set to denominator by updateNumeratorOptions
            this.data.failCriteria.numerator = parseInt(this.failNumeratorSelect.value);
            this.updateAnalysis();
        });
        
        const failOf = document.createElement('span');
        failOf.textContent = ' out of ';
        failOf.className = 'criteria-text';
        
        const failTrials = document.createElement('span');
        failTrials.textContent = ' rightmost trials must be unsuccessful';
        failTrials.className = 'criteria-text';
        
        failContainer.appendChild(failLabel);
        failContainer.appendChild(this.failNumeratorSelect);
        failContainer.appendChild(failOf);
        failContainer.appendChild(this.failDenominatorSelect);
        failContainer.appendChild(failTrials);
        
        criteriaContainer.appendChild(passContainer);
        criteriaContainer.appendChild(failContainer);
        this.contentContainer.appendChild(criteriaContainer);
        
        [this.passNumeratorSelect, this.passDenominatorSelect, this.failNumeratorSelect, this.failDenominatorSelect].forEach(select => {
            this.preventDragEvents(select);
        });
    }

    updateNumeratorOptions(numeratorSelect, denominator, currentValue) {
        // Clear existing options
        numeratorSelect.innerHTML = '';
        
        // Add options from 1 to denominator
        for (let i = 1; i <= denominator; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            if (i === currentValue || (currentValue > denominator && i === denominator)) {
                option.selected = true;
            }
            numeratorSelect.appendChild(option);
        }
    }

    createNumberSelect(min, max, selected) {
        const select = document.createElement('select');
        select.className = 'criteria-select';
        
        for (let i = min; i <= max; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            if (i === selected) option.selected = true;
            select.appendChild(option);
        }
        
        return select;
    }

    createTrialDataField() {
        const dataContainer = document.createElement('div');
        dataContainer.className = 'swallow-data-field-container';
        
        const dataLabel = document.createElement('label');
        dataLabel.textContent = 'Trial Data:';
        dataLabel.className = 'swallow-label';
        // Create an id for the trial textarea and associate the label
        const trialId = `swallow-trial-${Math.random().toString(36).slice(2,8)}`;
        dataLabel.htmlFor = trialId;
        
        this.trialInput = document.createElement('textarea');
        this.trialInput.id = trialId;
        this.trialInput.className = 'swallow-trial-input';
        this.trialInput.placeholder = 'Enter trial data using I, R, C, T, S, O (e.g., IRRRIRIR)';
        this.trialInput.rows = 3;
        this.trialInput.value = this.data.trialData;
        
        this.trialInput.addEventListener('input', (e) => {
            // Filter and uppercase valid characters
            const validChars = /[IRCTSO]/gi;
            const filtered = e.target.value.toUpperCase().match(validChars) || [];
            e.target.value = filtered.join('');
            this.data.trialData = e.target.value;
            this.updateAnalysis();
        });
        
        dataContainer.appendChild(dataLabel);
        dataContainer.appendChild(this.trialInput);
        this.contentContainer.appendChild(dataContainer);
        
        this.preventDragEvents(this.trialInput);
    }

    createAnalysisDisplay() {
        this.analysisContainer = document.createElement('div');
        this.analysisContainer.className = 'swallow-analysis-container';
        
        // Status indicator
        this.statusDisplay = document.createElement('div');
        this.statusDisplay.className = 'swallow-status-display';
        
        // Trial breakdown
        this.trialBreakdown = document.createElement('div');
        this.trialBreakdown.className = 'swallow-trial-breakdown';
        
        // Statistics
        this.statsDisplay = document.createElement('div');
        this.statsDisplay.className = 'swallow-stats-display';
        
        this.analysisContainer.appendChild(this.statusDisplay);
        this.analysisContainer.appendChild(this.trialBreakdown);
        this.analysisContainer.appendChild(this.statsDisplay);
        this.contentContainer.appendChild(this.analysisContainer);
    }

    createInstructions() {
        const instructionsContainer = document.createElement('div');
        instructionsContainer.className = 'swallow-instructions';
        
        const instructionsText = document.createElement('p');
        instructionsText.innerHTML = `
            <strong>Instructions:</strong><br>
            • <strong>I</strong> = Initial swallow, <strong>R</strong> = Repeat swallow<br>
            • <strong>C</strong> = Cough, <strong>T</strong> = Throat clear, <strong>S</strong> = Sneeze, <strong>O</strong> = Other<br>
            • A swallow attempt = I followed by any number of Rs<br>
            • Successful = no C, T, S, or O indicators<br>
            • Example: IRRRIRIR = 3 successful attempts
        `;
        instructionsText.className = 'instructions-text';
        
        instructionsContainer.appendChild(instructionsText);
        this.contentContainer.appendChild(instructionsContainer);
    }

    parseTrials(trialData) {
        const trials = [];
        let currentTrial = '';
        let inTrial = false;
        
        for (let i = 0; i < trialData.length; i++) {
            const char = trialData[i];
            
            if (char === 'I') {
                // Start new trial
                if (currentTrial) {
                    trials.push(currentTrial);
                }
                currentTrial = 'I';
                inTrial = true;
            } else if (inTrial && ['R', 'C', 'T', 'S', 'O'].includes(char)) {
                currentTrial += char;
            } else if (!inTrial && ['C', 'T', 'S', 'O'].includes(char)) {
                // Indicators outside of trials are ignored for now
                // You could handle this differently if needed
            }
        }
        
        // Add final trial if exists
        if (currentTrial) {
            trials.push(currentTrial);
        }
        
        return trials;
    }

    isTrialSuccessful(trial) {
        // Successful if no indicators (C, T, S, O)
        return !/[CTSO]/.test(trial);
    }

    updateAnalysis() {
        const trials = this.parseTrials(this.data.trialData);
        const successfulTrials = trials.map(trial => this.isTrialSuccessful(trial));
        
        // Calculate pass/fail status
        let status = 'In Progress';
        let statusClass = 'status-in-progress';
        
        if (trials.length >= this.data.passCriteria.denominator) {
            const recentTrials = successfulTrials.slice(-this.data.passCriteria.denominator);
            const recentSuccesses = recentTrials.filter(success => success).length;
            
            if (recentSuccesses >= this.data.passCriteria.numerator) {
                status = 'Pass';
                statusClass = 'status-pass';
            }
        }
        
        if (trials.length >= this.data.failCriteria.denominator) {
            const recentTrials = successfulTrials.slice(-this.data.failCriteria.denominator);
            const recentFailures = recentTrials.filter(success => !success).length;
            
            if (recentFailures >= this.data.failCriteria.numerator) {
                status = 'Fail';
                statusClass = 'status-fail';
            }
        }
        
        // Update status display
        this.statusDisplay.innerHTML = `
            <div class="status-indicator ${statusClass}">
                Status: <strong>${status}</strong>
            </div>
        `;
        
        // Update trial breakdown
        this.trialBreakdown.innerHTML = '';
        if (trials.length > 0) {
            const breakdownTitle = document.createElement('div');
            breakdownTitle.textContent = 'Trial Breakdown:';
            breakdownTitle.className = 'breakdown-title';
            this.trialBreakdown.appendChild(breakdownTitle);
            
            const trialsContainer = document.createElement('div');
            trialsContainer.className = 'trials-container';
            
            trials.forEach((trial, index) => {
                const trialElement = document.createElement('span');
                trialElement.textContent = trial;
                trialElement.className = successfulTrials[index] ? 'trial-success' : 'trial-fail';
                trialElement.title = successfulTrials[index] ? 'Successful' : 'Unsuccessful';
                trialsContainer.appendChild(trialElement);
                
                if (index < trials.length - 1) {
                    const separator = document.createElement('span');
                    separator.textContent = ' ';
                    separator.className = 'trial-separator';
                    trialsContainer.appendChild(separator);
                }
            });
            
            this.trialBreakdown.appendChild(trialsContainer);
        }
        
        // Update statistics
        const totalTrials = trials.length;
        const successfulCount = successfulTrials.filter(success => success).length;
        const successRate = totalTrials > 0 ? ((successfulCount / totalTrials) * 100).toFixed(1) : 0;
        
        // Calculate total swallows (I and R characters)
        const totalSwallows = (this.data.trialData.match(/[IR]/g) || []).length;
        
        this.statsDisplay.innerHTML = `
            <div class="stats-row">
                <span>Total Trials: <strong>${totalTrials}</strong></span>
                <span>Successful: <strong>${successfulCount}</strong></span>
                <span>Success Rate: <strong>${successRate}%</strong></span>
                <span>Total Swallows: <strong>${totalSwallows}</strong></span>
            </div>
        `;
    }
}

// Discourse Treatment Components
class WordListComponent extends BaseComponent {
    createContent() {
        this.contentContainer = document.createElement('div');
        this.contentContainer.className = 'word-list-container';
        this.contentContainer.style.flex = '1';
        this.contentContainer.style.marginLeft = '16px';
        
        // Create main layout container
        this.mainLayout = document.createElement('div');
        this.mainLayout.style.display = 'flex';
        this.mainLayout.style.gap = '12px';
        this.mainLayout.style.marginBottom = '10px';
        this.mainLayout.style.width = '100%';
        
        // Left column for word list
        this.leftColumn = document.createElement('div');
        this.leftColumn.style.flex = '1';
        this.leftColumn.style.minWidth = '0'; // Allow shrinking
        
        // Create textarea for word list input with auto-resize
        this.wordListTextarea = document.createElement('textarea');
        this.wordListTextarea.className = 'tdst-textarea word-list-textarea';
        this.wordListTextarea.rows = 3;
        this.wordListTextarea.placeholder = 'Enter words separated by commas or line breaks...';
        this.wordListTextarea.style.resize = 'none'; // Disable manual resize
        this.wordListTextarea.style.overflow = 'hidden'; // Hide scrollbars
        this.wordListTextarea.style.minHeight = '60px';
        this.wordListTextarea.style.width = '100%';
        this.wordListTextarea.style.boxSizing = 'border-box';
        this.wordListTextarea.style.wordWrap = 'break-word';
        this.wordListTextarea.style.whiteSpace = 'pre-wrap';
        this.wordListTextarea.value = this.data.wordListText || '';
        
        // Auto-resize function
        const autoResize = () => {
            this.wordListTextarea.style.height = 'auto';
            this.wordListTextarea.style.height = Math.max(60, this.wordListTextarea.scrollHeight) + 'px';
        };
        
        this.wordListTextarea.addEventListener('input', (e) => {
            this.setData({ wordListText: e.target.value });
            this.updateWordCount();
            autoResize();
        });
        
        // Right column for cues/comments
        this.rightColumn = document.createElement('div');
        this.rightColumn.style.flex = '1';
        this.rightColumn.style.minWidth = '0'; // Allow shrinking
        
        // Create cues/comments textarea
        this.cuesTextarea = document.createElement('textarea');
        this.cuesTextarea.className = 'tdst-textarea word-list-cues';
        this.cuesTextarea.rows = 3;
        this.cuesTextarea.placeholder = 'Cues/Comments...';
        this.cuesTextarea.style.resize = 'none';
        this.cuesTextarea.style.overflow = 'hidden';
        this.cuesTextarea.style.minHeight = '60px';
        this.cuesTextarea.style.width = '100%';
        this.cuesTextarea.style.boxSizing = 'border-box';
        this.cuesTextarea.style.wordWrap = 'break-word';
        this.cuesTextarea.style.whiteSpace = 'pre-wrap';
        this.cuesTextarea.value = this.data.cuesText || '';
        
        // Auto-resize function for cues
        const autoResizeCues = () => {
            this.cuesTextarea.style.height = 'auto';
            this.cuesTextarea.style.height = Math.max(60, this.cuesTextarea.scrollHeight) + 'px';
            // Sync heights
            const maxHeight = Math.max(
                parseInt(this.wordListTextarea.style.height),
                parseInt(this.cuesTextarea.style.height)
            );
            this.wordListTextarea.style.height = maxHeight + 'px';
            this.cuesTextarea.style.height = maxHeight + 'px';
        };
        
        this.cuesTextarea.addEventListener('input', (e) => {
            this.setData({ cuesText: e.target.value });
            autoResizeCues();
        });
        
        // Word count display
        this.wordCountDisplay = document.createElement('div');
        this.wordCountDisplay.className = 'word-count-display';
        this.wordCountDisplay.style.fontSize = '0.9em';
        this.wordCountDisplay.style.color = 'var(--color-text-soft)';
        this.wordCountDisplay.style.marginTop = '5px';
        
        // Assemble the layout
        this.leftColumn.appendChild(this.wordListTextarea);
        this.rightColumn.appendChild(this.cuesTextarea);
        this.mainLayout.appendChild(this.leftColumn);
        this.mainLayout.appendChild(this.rightColumn);
        
        this.contentContainer.appendChild(this.mainLayout);
        this.contentContainer.appendChild(this.wordCountDisplay);
        
        this.preventDragEvents(this.wordListTextarea);
        this.preventDragEvents(this.cuesTextarea);
        
        // Initial resize and word count
        setTimeout(() => {
            autoResize();
            autoResizeCues();
        }, 0);
        this.updateWordCount();
    }
    
    updateWordCount() {
        const text = this.wordListTextarea.value.trim();
        if (text) {
            const words = text.split(/[,\n]+/).filter(word => word.trim().length > 0);
            this.wordCountDisplay.textContent = `Word count: ${words.length}`;
        } else {
            this.wordCountDisplay.textContent = 'Word count: 0';
        }
    }
}

class SentenceListComponent extends BaseComponent {
    createContent() {
        this.contentContainer = document.createElement('div');
        this.contentContainer.className = 'sentence-list-container';
        this.contentContainer.style.flex = '1';
        this.contentContainer.style.marginLeft = '16px';
        
        // Create main layout container
        this.mainLayout = document.createElement('div');
        this.mainLayout.style.display = 'flex';
        this.mainLayout.style.gap = '12px';
        this.mainLayout.style.marginBottom = '10px';
        this.mainLayout.style.width = '100%';
        
        // Left column for sentence list
        this.leftColumn = document.createElement('div');
        this.leftColumn.style.flex = '1';
        this.leftColumn.style.minWidth = '0'; // Allow shrinking
        
        // Create textarea for sentence list input with auto-resize
        this.sentenceListTextarea = document.createElement('textarea');
        this.sentenceListTextarea.className = 'tdst-textarea sentence-list-textarea';
        this.sentenceListTextarea.rows = 4;
        this.sentenceListTextarea.placeholder = 'Enter sentences, one per line...';
        this.sentenceListTextarea.style.resize = 'none';
        this.sentenceListTextarea.style.overflow = 'hidden';
        this.sentenceListTextarea.style.minHeight = '80px';
        this.sentenceListTextarea.style.width = '100%';
        this.sentenceListTextarea.style.boxSizing = 'border-box';
        this.sentenceListTextarea.style.wordWrap = 'break-word';
        this.sentenceListTextarea.style.whiteSpace = 'pre-wrap';
        this.sentenceListTextarea.value = this.data.sentenceListText || '';
        
        // Auto-resize function
        const autoResize = () => {
            this.sentenceListTextarea.style.height = 'auto';
            this.sentenceListTextarea.style.height = Math.max(80, this.sentenceListTextarea.scrollHeight) + 'px';
        };
        
        this.sentenceListTextarea.addEventListener('input', (e) => {
            this.setData({ sentenceListText: e.target.value });
            this.updateSentenceStats();
            autoResize();
        });
        
        // Right column for cues/comments
        this.rightColumn = document.createElement('div');
        this.rightColumn.style.flex = '1';
        this.rightColumn.style.minWidth = '0'; // Allow shrinking
        
        // Create cues/comments textarea
        this.cuesTextarea = document.createElement('textarea');
        this.cuesTextarea.className = 'tdst-textarea sentence-list-cues';
        this.cuesTextarea.rows = 4;
        this.cuesTextarea.placeholder = 'Cues/Comments...';
        this.cuesTextarea.style.resize = 'none';
        this.cuesTextarea.style.overflow = 'hidden';
        this.cuesTextarea.style.minHeight = '80px';
        this.cuesTextarea.style.width = '100%';
        this.cuesTextarea.style.boxSizing = 'border-box';
        this.cuesTextarea.style.wordWrap = 'break-word';
        this.cuesTextarea.style.whiteSpace = 'pre-wrap';
        this.cuesTextarea.value = this.data.cuesText || '';
        
        // Auto-resize function for cues
        const autoResizeCues = () => {
            this.cuesTextarea.style.height = 'auto';
            this.cuesTextarea.style.height = Math.max(80, this.cuesTextarea.scrollHeight) + 'px';
            // Sync heights
            const maxHeight = Math.max(
                parseInt(this.sentenceListTextarea.style.height),
                parseInt(this.cuesTextarea.style.height)
            );
            this.sentenceListTextarea.style.height = maxHeight + 'px';
            this.cuesTextarea.style.height = maxHeight + 'px';
        };
        
        this.cuesTextarea.addEventListener('input', (e) => {
            this.setData({ cuesText: e.target.value });
            autoResizeCues();
        });
        
        // Sentence statistics display
        this.sentenceStatsDisplay = document.createElement('div');
        this.sentenceStatsDisplay.className = 'sentence-count-display';
        this.sentenceStatsDisplay.style.fontSize = '0.9em';
        this.sentenceStatsDisplay.style.color = 'var(--color-text-soft)';
        this.sentenceStatsDisplay.style.marginTop = '5px';
        this.sentenceStatsDisplay.style.display = 'flex';
        this.sentenceStatsDisplay.style.gap = '15px';
        this.sentenceStatsDisplay.style.flexWrap = 'wrap';
        
        // Assemble the layout
        this.leftColumn.appendChild(this.sentenceListTextarea);
        this.rightColumn.appendChild(this.cuesTextarea);
        this.mainLayout.appendChild(this.leftColumn);
        this.mainLayout.appendChild(this.rightColumn);
        
        this.contentContainer.appendChild(this.mainLayout);
        this.contentContainer.appendChild(this.sentenceStatsDisplay);
        
        this.preventDragEvents(this.sentenceListTextarea);
        this.preventDragEvents(this.cuesTextarea);
        
        // Initial resize and stats
        setTimeout(() => {
            autoResize();
            autoResizeCues();
        }, 0);
        this.updateSentenceStats();
    }
    
    countWordsInSentence(sentence) {
        // Standardized word counting rules:
        // 1. Split on whitespace
        // 2. Hyphenated words count as 2 words (e.g., "well-being" = 2 words)
        // 3. Contractions count as 2 words (e.g., "don't" = 2 words)
        // 4. Irregular contractions count as 2 words (gonna, sorta, shoulda, kinda, woulda, coulda, oughta)
        // 5. Filter out empty strings and punctuation-only strings
        
        const trimmed = sentence.trim();
        if (!trimmed) return 0;
        
        // List of irregular contractions that should count as 2 words
        const irregularContractions = ['gonna', 'sorta', 'shoulda', 'kinda', 'woulda', 'coulda', 'oughta'];
        
        let wordCount = 0;
        const tokens = trimmed.split(/\s+/);
        
        tokens.forEach(token => {
            // Remove leading/trailing punctuation but keep internal punctuation
            const cleaned = token.replace(/^[^\w'-]+|[^\w'-]+$/g, '');
            if (cleaned.length === 0) return;
            
            // Check if this is an irregular contraction (case-insensitive)
            const lowerCleaned = cleaned.toLowerCase();
            if (irregularContractions.includes(lowerCleaned)) {
                wordCount += 2; // Irregular contractions count as 2 words
                return;
            }
            
            // Count hyphens as word separators (hyphenated words = multiple words)
            const hyphenParts = cleaned.split('-').filter(part => part.length > 0);
            wordCount += hyphenParts.length;
            
            // Count regular contractions as 2 words (apostrophes indicate contractions)
            const hasContraction = cleaned.includes("'") && cleaned.length > 1;
            if (hasContraction) {
                // Add 1 more for the contraction (since we already counted the base word)
                wordCount += 1;
            }
        });
        
        return wordCount;
    }
    
    updateSentenceStats() {
        const text = this.sentenceListTextarea.value.trim();
        if (text) {
            // Split by line breaks and filter out empty lines
            const sentences = text.split('\n').filter(sentence => sentence.trim().length > 0);
            const sentenceCount = sentences.length;
            
            if (sentenceCount > 0) {
                // Calculate word counts for each sentence
                const wordCounts = sentences.map(sentence => this.countWordsInSentence(sentence));
                const totalWords = wordCounts.reduce((sum, count) => sum + count, 0);
                const averageLength = sentenceCount > 0 ? (totalWords / sentenceCount).toFixed(1) : 0;
                const maxLength = Math.max(...wordCounts);
                
                this.sentenceStatsDisplay.innerHTML = `
                    <span>Sentence count: <strong>${sentenceCount}</strong></span>
                    <span>Average sentence length: <strong>${averageLength} wds</strong></span>
                    <span>Max sentence length: <strong>${maxLength} wds</strong></span>
                `;
            } else {
                this.sentenceStatsDisplay.innerHTML = `
                    <span>Sentence count: <strong>0</strong></span>
                    <span>Average sentence length: <strong>0 wds</strong></span>
                    <span>Max sentence length: <strong>0 wds</strong></span>
                `;
            }
        } else {
            this.sentenceStatsDisplay.innerHTML = `
                <span>Sentence count: <strong>0</strong></span>
                <span>Average sentence length: <strong>0 wds</strong></span>
                <span>Max sentence length: <strong>0 wds</strong></span>
            `;
        }
    }
}

class DiscourseTranscriptComponent extends BaseComponent {
    constructor(app, config) {
        super(app, config);
        this.excludedWords = new Set(); // Track excluded words by their position/id
        this.ciuWords = new Set(); // Track CIU words by their position/id
        this.exclusionMode = false; // Track if exclusion mode is active
        this.ciuMode = false; // Track if CIU inclusion mode is active
        this.wordIdCounter = 0; // Counter for unique word IDs
    }

    createContent() {
        this.contentContainer = document.createElement('div');
        this.contentContainer.className = 'discourse-transcript-container';
        this.contentContainer.style.flex = '1';
        this.contentContainer.style.marginLeft = '16px';
        
        // Create main layout container with flexbox for two columns
        this.mainLayout = document.createElement('div');
        this.mainLayout.style.display = 'flex';
        this.mainLayout.style.gap = '10px';
        this.mainLayout.style.alignItems = 'stretch';
        
        // Left column for discourse transcript
        this.leftColumn = document.createElement('div');
        this.leftColumn.style.flex = '1';
        this.leftColumn.style.minWidth = '0'; // Allow shrinking
        
        // Create toolbar above transcript
        this.toolbar = document.createElement('div');
        this.toolbar.className = 'transcript-toolbar';
        this.toolbar.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 8px;
            padding: 8px;
            background: var(--color-surface-alt, #f8f9fa);
            border: 1px solid var(--color-border, #e3e7ed);
            border-radius: 4px;
            font-size: 13px;
            color: var(--color-text, #333);
        `;
        
        // Red-X exclusion toggle button
        this.exclusionToggle = document.createElement('button');
        this.exclusionToggle.type = 'button';
        this.exclusionToggle.className = 'transcript-exclusion-toggle';
        this.exclusionToggle.innerHTML = '✘';
        this.exclusionToggle.title = 'Toggle word exclusion mode (double-click words to exclude from count)';
        this.exclusionToggle.style.cssText = `
            width: 28px;
            height: 28px;
            border: 2px solid #dc3545;
            background: var(--color-surface, white);
            color: #dc3545;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            font-size: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
        `;
        
        this.exclusionToggle.addEventListener('click', () => {
            this.toggleExclusionMode();
        });
        
        // Green checkmark CIU inclusion toggle button
        this.ciuToggle = document.createElement('button');
        this.ciuToggle.type = 'button';
        this.ciuToggle.className = 'transcript-ciu-toggle';
        this.ciuToggle.innerHTML = '✓';
        this.ciuToggle.title = 'Toggle CIU inclusion mode (double-click words to mark as CIUs)';
        this.ciuToggle.style.cssText = `
            width: 28px;
            height: 28px;
            border: 2px solid #28a745;
            background: var(--color-surface, white);
            color: #28a745;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            font-size: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
        `;
        
        this.ciuToggle.addEventListener('click', () => {
            this.toggleCIUMode();
        });
        
        // Toolbar label
        this.toolbarLabel = document.createElement('span');
        this.toolbarLabel.textContent = 'Selection Mode: Off';
        this.toolbarLabel.style.color = 'var(--color-text-soft, #6c757d)';
        
        // Clear all selections button
        this.clearSelectionsBtn = document.createElement('button');
        this.clearSelectionsBtn.type = 'button';
        this.clearSelectionsBtn.textContent = 'Clear All Selections';
        this.clearSelectionsBtn.style.cssText = `
            padding: 4px 8px;
            border: 1px solid var(--color-border, #6c757d);
            background: var(--color-surface, white);
            color: var(--color-text-soft, #6c757d);
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s ease;
        `;
        
        this.clearSelectionsBtn.addEventListener('click', () => {
            this.clearAllSelections();
        });
        
        // Add hover effects for buttons
        this.clearSelectionsBtn.addEventListener('mouseenter', () => {
            this.clearSelectionsBtn.style.background = 'var(--color-surface-hover, #f8f9fa)';
            this.clearSelectionsBtn.style.borderColor = 'var(--color-border-hover, #495057)';
        });
        
        this.clearSelectionsBtn.addEventListener('mouseleave', () => {
            this.clearSelectionsBtn.style.background = 'var(--color-surface, white)';
            this.clearSelectionsBtn.style.borderColor = 'var(--color-border, #6c757d)';
        });
        
        this.toolbar.appendChild(this.exclusionToggle);
        this.toolbar.appendChild(this.ciuToggle);
        this.toolbar.appendChild(this.toolbarLabel);
        this.toolbar.appendChild(this.clearSelectionsBtn);
        
        // Create content-editable div for discourse transcript input
        this.transcriptEditor = document.createElement('div');
        this.transcriptEditor.className = 'tdst-textarea discourse-transcript-textarea';
        this.transcriptEditor.contentEditable = true;
        this.transcriptEditor.style.cssText = `
            min-height: 120px;
            width: 100%;
            box-sizing: border-box;
            word-wrap: break-word;
            white-space: pre-wrap;
            padding: 8px;
            border: 1px solid var(--color-border, #ccc);
            border-radius: 4px;
            background: var(--color-surface, white);
            color: var(--color-text, #333);
            font-family: inherit;
            font-size: inherit;
            line-height: 1.4;
            outline: none;
            overflow-y: auto;
            max-height: 400px;
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
        `;
        
        // Add focus styling
        this.transcriptEditor.addEventListener('focus', () => {
            this.transcriptEditor.style.borderColor = 'var(--color-accent, #2196f3)';
            this.transcriptEditor.style.boxShadow = '0 0 0 2px var(--color-accent-alpha, rgba(33, 150, 243, 0.1))';
            this.hidePlaceholder();
        });
        
        this.transcriptEditor.addEventListener('blur', () => {
            this.transcriptEditor.style.borderColor = 'var(--color-border, #ccc)';
            this.transcriptEditor.style.boxShadow = 'none';
            this.updatePlaceholder();
        });
        
        // Set placeholder functionality
        this.updatePlaceholder();
        
        this.transcriptEditor.addEventListener('input', (e) => {
            this.handleTextChange();
        });
        
        this.transcriptEditor.addEventListener('dblclick', (e) => {
            if (this.exclusionMode || this.ciuMode) {
                this.handleWordDoubleClick(e);
            }
        });
        
        this.transcriptEditor.addEventListener('focus', () => {
            this.hidePlaceholder();
        });
        
        this.transcriptEditor.addEventListener('blur', () => {
            this.updatePlaceholder();
        });
        
        // Right column for cues/comments
        this.rightColumn = document.createElement('div');
        this.rightColumn.style.flex = '1';
        this.rightColumn.style.minWidth = '0'; // Allow shrinking
        
        // Create cues/comments textarea
        this.cuesTextarea = document.createElement('textarea');
        this.cuesTextarea.className = 'tdst-textarea discourse-transcript-cues';
        this.cuesTextarea.rows = 6;
        this.cuesTextarea.placeholder = 'Cues/Comments...';
        this.cuesTextarea.style.resize = 'none';
        this.cuesTextarea.style.overflow = 'hidden';
        this.cuesTextarea.style.minHeight = '120px';
        this.cuesTextarea.style.width = '100%';
        this.cuesTextarea.style.boxSizing = 'border-box';
        this.cuesTextarea.style.wordWrap = 'break-word';
        this.cuesTextarea.style.whiteSpace = 'pre-wrap';
        this.cuesTextarea.value = this.data.cuesText || '';
        
        // Auto-resize function for cues
        const autoResizeCues = () => {
            this.cuesTextarea.style.height = 'auto';
            this.cuesTextarea.style.height = Math.max(120, this.cuesTextarea.scrollHeight) + 'px';
            // Sync heights with transcript editor
            const transcriptHeight = this.transcriptEditor.offsetHeight;
            const maxHeight = Math.max(transcriptHeight, parseInt(this.cuesTextarea.style.height));
            this.transcriptEditor.style.minHeight = maxHeight + 'px';
            this.cuesTextarea.style.height = maxHeight + 'px';
        };
        
        this.cuesTextarea.addEventListener('input', (e) => {
            this.setData({ cuesText: e.target.value });
            autoResizeCues();
        });
        
        // Word count and character count display
        this.transcriptStatsDisplay = document.createElement('div');
        this.transcriptStatsDisplay.className = 'transcript-stats-display';
        this.transcriptStatsDisplay.style.fontSize = '0.9em';
        this.transcriptStatsDisplay.style.color = 'var(--color-text-soft, #6c757d)';
        this.transcriptStatsDisplay.style.marginTop = '5px';
        this.transcriptStatsDisplay.style.display = 'flex';
        this.transcriptStatsDisplay.style.gap = '15px';
        
        // Time input container
        this.timeInputContainer = document.createElement('div');
        this.timeInputContainer.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
            margin-top: 10px;
            padding: 8px;
            background: var(--color-surface-alt, #f8f9fa);
            border: 1px solid var(--color-border, #e3e7ed);
            border-radius: 4px;
            font-size: 13px;
        `;
        
        // Time label
        const timeLabel = document.createElement('span');
        timeLabel.textContent = 'Transcript Duration:';
        timeLabel.style.fontWeight = 'bold';
        timeLabel.style.color = 'var(--color-text, #333)';
        
        // Minutes input
        this.minutesInput = document.createElement('input');
        this.minutesInput.type = 'number';
        this.minutesInput.min = '0';
        this.minutesInput.max = '99';
        this.minutesInput.placeholder = '0';
        this.minutesInput.value = this.data.minutes || '';
        this.minutesInput.style.cssText = `
            width: 50px;
            padding: 4px 6px;
            border: 1px solid var(--color-border, #ccc);
            border-radius: 3px;
            text-align: center;
            font-size: 13px;
        `;
        
        const minutesLabel = document.createElement('span');
        minutesLabel.textContent = 'min';
        minutesLabel.style.color = 'var(--color-text-soft, #6c757d)';
        
        // Seconds input
        this.secondsInput = document.createElement('input');
        this.secondsInput.type = 'number';
        this.secondsInput.min = '0';
        this.secondsInput.max = '59';
        this.secondsInput.placeholder = '0';
        this.secondsInput.value = this.data.seconds || '';
        this.secondsInput.style.cssText = `
            width: 50px;
            padding: 4px 6px;
            border: 1px solid var(--color-border, #ccc);
            border-radius: 3px;
            text-align: center;
            font-size: 13px;
        `;
        
        const secondsLabel = document.createElement('span');
        secondsLabel.textContent = 'sec';
        secondsLabel.style.color = 'var(--color-text-soft, #6c757d)';
        
        // Add event listeners for time inputs
        this.minutesInput.addEventListener('input', (e) => {
            this.setData({ minutes: e.target.value });
            this.updateWordCount();
        });
        
        this.secondsInput.addEventListener('input', (e) => {
            this.setData({ seconds: e.target.value });
            this.updateWordCount();
        });
        
        // Prevent drag events on time inputs
        this.preventDragEvents(this.minutesInput);
        this.preventDragEvents(this.secondsInput);
        
        // Assemble time input container
        this.timeInputContainer.appendChild(timeLabel);
        this.timeInputContainer.appendChild(this.minutesInput);
        this.timeInputContainer.appendChild(minutesLabel);
        this.timeInputContainer.appendChild(this.secondsInput);
        this.timeInputContainer.appendChild(secondsLabel);
        
        // Create CIU and Exclusion Guidelines explainer
        this.explainerContainer = document.createElement('div');
        this.explainerContainer.className = 'discourse-explainer';
        this.explainerContainer.style.cssText = `
            margin: 12px 0;
            padding: 12px;
            background: var(--color-surface-alt, #f8f9fa);
            border: 1px solid var(--color-border, #e3e7ed);
            border-radius: var(--radius-md, 6px);
            font-size: 14px;
            line-height: 1.4;
            color: var(--color-text, #333);
        `;
        
        // Create dropdown header with click handler
        const dropdownHeader = document.createElement('div');
        dropdownHeader.style.cssText = `
            font-weight: 600; 
            margin-bottom: 8px; 
            color: var(--color-accent, #2196f3);
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            user-select: none;
        `;
        dropdownHeader.innerHTML = `
            <span>Word Counting and CIU Guidelines</span>
            <span class="dropdown-arrow" style="transition: transform 0.2s ease;">▼</span>
        `;
        
        // Create collapsible content container
        const dropdownContent = document.createElement('div');
        dropdownContent.style.cssText = `
            display: none;
            margin-top: 8px;
        `;
        
        dropdownContent.innerHTML = `
            <div style="margin-bottom: 12px;">
                <strong>Instructions:</strong> Use the <span style="color: #dc3545; font-weight: bold;">✘</span> button and double-click a word to exclude it from the transcript's word count. 
                Use the <span style="color: #28a745; font-weight: bold;">✓</span> button to mark Correct Information Units (CIUs) or other relevant word-level measures.
            </div>
            
            <div style="margin-bottom: 12px;">
                <strong>Suggested Exclusion/Inclusion criteria (adapted from Nicholson, 1993):</strong>
            </div>
            
            <div style="margin-bottom: 12px;">
                <strong style="color: #dc3545;">Word count should exclude:</strong>
                <ul style="margin: 4px 0; padding-left: 20px;">
                    <li>Unintelligible words or partial words</li>
                    <li>Non-word filler ("um", "uh", "hmm", etc)</li>
                </ul>
            </div>
            
            <div style="margin-bottom: 12px;">
                <strong style="color: #dc3545;">Do not exclude:</strong>
                <ul style="margin: 4px 0; padding-left: 20px;">
                    <li>Full filler words and phrases ("you know", "I mean", etc.)</li>
                    <li>Interjections and informal terms ("oh wow", "oh my", etc.)</li>
                    <li>Contractions/simplifications/hyphenated words (by default these are all counted as 2 words).</li>
                </ul>
            </div>
            
            <div style="margin-bottom: 12px;">
                <strong style="color: #28a745;">CIU count should include:</strong>
                <ul style="margin: 4px 0; padding-left: 20px;">
                    <li>Any words that are intelligible in context, and accurate, relevant, and informative about the topic.</li>
                    <li>Words/phrases that are informative even though incomplete. E.g., "The window..." is an incomplete thought, but counts as CIUs if it is otherwise accurate, relevant, and not repetitive of previous information.</li>
                    <li>Grammatically incorrect usages that are otherwise intelligible, accurate, and informative.</li>
                    <li>Words that, if ambiguous or inaccurate, express legitimate uncertainty or ambiguity, e.g. "He must be drunk, no, by the looks of it he might just be tired."</li>
                </ul>
            </div>
            
            <div style="margin-bottom: 12px;">
                <strong style="color: #28a745;">Do not include:</strong>
                <ul style="margin: 4px 0; padding-left: 20px;">
                    <li>Utterances that seem inaccurate to the subject matter, e.g., the word "cat" in reference to a picture of a dog.</li>
                    <li>Dead ends, false starts, or revisions, e.g., "The ... the ... my sister - no, not my sister".</li>
                    <li>Any instance of "and".</li>
                    <li>Repetitive words or phrases that don't add new information, and aren't otherwise necessary for cohesion/grammatical correctness/emphasis/descriptiveness, e.g., "The blue truck was blue" (only one instance of blue should be included).</li>
                    <li>The first use of a pronoun for which an unambiguous referent has not been provided.</li>
                    <li>Other vague, nonspecific words/phrases that aren't otherwise necessary for grammatical completeness, and for which there is no clear referent / the speaker could have reasonably used a more specific word or phrase (e.g., "thing", "stuff", "something").</li>
                    <li>Any grammatical words or qualifiers used superfluously or as fillers (e.g., "Then a dog, then a kite, then a picnic").</li>
                    <li>Filler words or phrases (e.g. "you know", "anyway").</li>
                    <li>Generic commentary on the task ("I don't know what to say") or utterances that don't fit the task.</li>
                </ul>
            </div>
            
            <div style="margin-top: 8px; font-style: italic; font-size: 12px; color: var(--color-text-soft, #6c757d);">
                Adapted from Nicholson, 1993 - please refer to the full text for more information about scoring and analyzing CIUs.
            </div>
        `;
        
        // Add click handler for dropdown toggle
        dropdownHeader.addEventListener('click', () => {
            const isHidden = dropdownContent.style.display === 'none';
            dropdownContent.style.display = isHidden ? 'block' : 'none';
            const arrow = dropdownHeader.querySelector('.dropdown-arrow');
            arrow.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
        });
        
        this.explainerContainer.appendChild(dropdownHeader);
        this.explainerContainer.appendChild(dropdownContent);
        
        // Assemble the layout
        this.leftColumn.appendChild(this.toolbar);
        this.leftColumn.appendChild(this.transcriptEditor);
        this.rightColumn.appendChild(this.cuesTextarea);
        this.mainLayout.appendChild(this.leftColumn);
        this.mainLayout.appendChild(this.rightColumn);
        
        this.contentContainer.appendChild(this.mainLayout);
        this.contentContainer.appendChild(this.timeInputContainer);
        this.contentContainer.appendChild(this.explainerContainer);
        this.contentContainer.appendChild(this.transcriptStatsDisplay);
        
        this.preventDragEvents(this.transcriptEditor);
        this.preventDragEvents(this.cuesTextarea);
        this.preventDragEvents(this.toolbar);
        
        // Initialize content if data exists
        if (this.data.transcriptText) {
            this.transcriptEditor.textContent = this.data.transcriptText;
        }
        
        // Initial word count
        setTimeout(() => {
            autoResizeCues();
            this.updateWordCount();
        }, 0);
    }
    
    toggleExclusionMode() {
        // If CIU mode is active, turn it off first
        if (this.ciuMode) {
            this.ciuMode = false;
            this.ciuToggle.style.background = 'var(--color-surface, white)';
            this.ciuToggle.style.color = '#28a745';
            this.ciuToggle.style.borderColor = '#28a745';
        }
        
        this.exclusionMode = !this.exclusionMode;
        
        if (this.exclusionMode) {
            this.exclusionToggle.style.background = '#dc3545';
            this.exclusionToggle.style.color = 'white';
            this.exclusionToggle.style.borderColor = '#dc3545';
            this.toolbarLabel.textContent = 'Word Exclusion: On (double-click words to exclude)';
            this.toolbarLabel.style.color = 'var(--color-text, #333)';
            this.transcriptEditor.style.cursor = 'pointer';
        } else {
            this.exclusionToggle.style.background = 'var(--color-surface, white)';
            this.exclusionToggle.style.color = '#dc3545';
            this.exclusionToggle.style.borderColor = '#dc3545';
            this.toolbarLabel.textContent = 'Selection Mode: Off';
            this.toolbarLabel.style.color = 'var(--color-text-soft, #6c757d)';
            this.transcriptEditor.style.cursor = 'text';
        }
    }
    
    toggleCIUMode() {
        // If exclusion mode is active, turn it off first
        if (this.exclusionMode) {
            this.exclusionMode = false;
            this.exclusionToggle.style.background = 'var(--color-surface, white)';
            this.exclusionToggle.style.color = '#dc3545';
            this.exclusionToggle.style.borderColor = '#dc3545';
        }
        
        this.ciuMode = !this.ciuMode;
        
        if (this.ciuMode) {
            this.ciuToggle.style.background = '#28a745';
            this.ciuToggle.style.color = 'white';
            this.ciuToggle.style.borderColor = '#28a745';
            this.toolbarLabel.textContent = 'CIU Inclusion: On (double-click words to mark as CIUs)';
            this.toolbarLabel.style.color = 'var(--color-text, #333)';
            this.transcriptEditor.style.cursor = 'pointer';
        } else {
            this.ciuToggle.style.background = 'var(--color-surface, white)';
            this.ciuToggle.style.color = '#28a745';
            this.ciuToggle.style.borderColor = '#28a745';
            this.toolbarLabel.textContent = 'Selection Mode: Off';
            this.toolbarLabel.style.color = 'var(--color-text-soft, #6c757d)';
            this.transcriptEditor.style.cursor = 'text';
        }
    }
    
    handleWordDoubleClick(e) {
        e.preventDefault();
        
        // Get the word that was double-clicked
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return;
        
        const range = selection.getRangeAt(0);
        const textNode = range.startContainer;
        
        if (textNode.nodeType !== Node.TEXT_NODE) return;
        
        const text = textNode.textContent;
        const clickOffset = range.startOffset;
        
        // Find word boundaries
        const wordMatch = this.findWordAt(text, clickOffset);
        if (!wordMatch) return;
        
        const { word, start, end } = wordMatch;
        
        // Create a unique identifier for this word instance
        const wordId = `word_${this.wordIdCounter++}_${start}_${word}`;
        
        // Create a range for the word
        const wordRange = document.createRange();
        wordRange.setStart(textNode, start);
        wordRange.setEnd(textNode, end);
        
        // Check if word already has any markup (excluded or CIU)
        const existingSpan = this.findMarkedSpanContaining(wordRange);
        
        if (existingSpan) {
            // Remove existing markup
            this.unmarkWord(existingSpan);
        } else {
            // Add new markup based on active mode
            if (this.exclusionMode) {
                this.excludeWord(wordRange, wordId, word);
            } else if (this.ciuMode) {
                this.markAsCIU(wordRange, wordId, word);
            }
        }
        
        this.updateWordCount();
    }
    
    findWordAt(text, offset) {
        // Find word boundaries around the clicked position
        let start = offset;
        let end = offset;
        
        // Move start backward to find word beginning
        while (start > 0 && /[\w'-]/.test(text[start - 1])) {
            start--;
        }
        
        // Move end forward to find word ending
        while (end < text.length && /[\w'-]/.test(text[end])) {
            end++;
        }
        
        const word = text.slice(start, end);
        return word.length > 0 ? { word, start, end } : null;
    }
    
    findMarkedSpanContaining(range) {
        let node = range.startContainer;
        while (node && node !== this.transcriptEditor) {
            if (node.nodeType === Node.ELEMENT_NODE && 
                node.classList && 
                (node.classList.contains('excluded-word') || node.classList.contains('ciu-word'))) {
                return node;
            }
            node = node.parentNode;
        }
        return null;
    }
    
    excludeWord(range, wordId, word) {
        try {
            const span = document.createElement('span');
            span.className = 'excluded-word';
            span.dataset.wordId = wordId;
            span.style.cssText = `
                color: #dc3545;
                text-decoration: line-through;
                background-color: rgba(220, 53, 69, 0.1);
                padding: 1px 2px;
                border-radius: 2px;
            `;
            
            range.surroundContents(span);
            this.excludedWords.add(wordId);
            
            // Clear selection
            window.getSelection().removeAllRanges();
        } catch (error) {
            console.warn('Could not exclude word:', error);
        }
    }
    
    markAsCIU(range, wordId, word) {
        try {
            const span = document.createElement('span');
            span.className = 'ciu-word';
            span.dataset.wordId = wordId;
            span.style.cssText = `
                color: #28a745;
                background-color: rgba(40, 167, 69, 0.1);
                padding: 1px 2px;
                border-radius: 2px;
                font-weight: bold;
            `;
            
            range.surroundContents(span);
            this.ciuWords.add(wordId);
            
            // Clear selection
            window.getSelection().removeAllRanges();
        } catch (error) {
            console.warn('Could not mark word as CIU:', error);
        }
    }
    
    unmarkWord(span) {
        const wordId = span.dataset.wordId;
        if (wordId) {
            this.excludedWords.delete(wordId);
            this.ciuWords.delete(wordId);
        }
        
        // Replace span with its text content
        const parent = span.parentNode;
        const textNode = document.createTextNode(span.textContent);
        parent.replaceChild(textNode, span);
        
        // Normalize to merge adjacent text nodes
        parent.normalize();
    }
    
    clearAllSelections() {
        // Clear both excluded words and CIU words
        const excludedSpans = this.transcriptEditor.querySelectorAll('.excluded-word');
        const ciuSpans = this.transcriptEditor.querySelectorAll('.ciu-word');
        
        excludedSpans.forEach(span => {
            this.unmarkWord(span);
        });
        
        ciuSpans.forEach(span => {
            this.unmarkWord(span);
        });
        
        this.excludedWords.clear();
        this.ciuWords.clear();
        this.updateWordCount();
    }
    
    handleTextChange() {
        const text = this.transcriptEditor.textContent || '';
        this.setData({ transcriptText: text });
        this.updatePlaceholder();
        this.updateWordCount();
    }
    
    updatePlaceholder() {
        const text = this.transcriptEditor.textContent || '';
        if (text.trim() === '') {
            this.transcriptEditor.setAttribute('data-placeholder', 'Enter discourse transcript...');
            if (!this.transcriptEditor.style.getPropertyValue('--placeholder-shown')) {
                this.transcriptEditor.style.setProperty('--placeholder-shown', 'true');
            }
        } else {
            this.transcriptEditor.style.removeProperty('--placeholder-shown');
        }
    }
    
    hidePlaceholder() {
        this.transcriptEditor.style.removeProperty('--placeholder-shown');
    }
    
    updateWordCount() {
        const text = this.transcriptEditor.textContent || '';
        if (text.trim()) {
            // Count all words using standardized counting
            const totalWordCount = this.countWordsInText(text);
            
            // Count excluded words
            const excludedWordCount = this.countExcludedWords();
            
            // Count CIU words
            const ciuWordCount = this.countCIUWords();
            
            // Calculate final count
            const finalWordCount = totalWordCount - excludedWordCount;
            
            // Calculate time-based rates
            const minutes = parseFloat(this.minutesInput.value) || 0;
            const seconds = parseFloat(this.secondsInput.value) || 0;
            const totalMinutes = minutes + (seconds / 60);
            
            let statsHTML = `<span>Word count: ${finalWordCount}</span>`;
            
            if (excludedWordCount > 0) {
                statsHTML += ` | <span style="color: #dc3545;">Excluded: ${excludedWordCount}</span>`;
            }
            
            if (ciuWordCount > 0) {
                statsHTML += ` | <span style="color: #28a745;">CIUs: ${ciuWordCount}</span>`;
                
                // Calculate % CIUs (percentage of CIUs in final word count after exclusions)
                if (finalWordCount > 0) {
                    const ciuPercentage = ((ciuWordCount / finalWordCount) * 100).toFixed(1);
                    statsHTML += ` | <span style="color: #28a745;">% CIUs: ${ciuPercentage}%</span>`;
                }
            }
            
            // Add rate calculations if time is provided
            if (totalMinutes > 0) {
                const wordsPerMinute = (finalWordCount / totalMinutes).toFixed(1);
                const ciusPerMinute = (ciuWordCount / totalMinutes).toFixed(1);
                
                statsHTML += ` | <span style="color: #2196f3;">Words/min: ${wordsPerMinute}</span>`;
                
                if (ciuWordCount > 0) {
                    statsHTML += ` | <span style="color: #28a745;">CIUs/min: ${ciusPerMinute}</span>`;
                }
            }
            
            this.transcriptStatsDisplay.innerHTML = statsHTML;
        } else {
            this.transcriptStatsDisplay.innerHTML = `
                <span>Word count: 0</span>
            `;
        }
    }
    
    countExcludedWords() {
        let excludedCount = 0;
        const excludedSpans = this.transcriptEditor.querySelectorAll('.excluded-word');
        
        excludedSpans.forEach(span => {
            const word = span.textContent.trim();
            if (word) {
                // Apply same counting rules to excluded words
                excludedCount += this.countWordsInText(word);
            }
        });
        
        return excludedCount;
    }
    
    countCIUWords() {
        let ciuCount = 0;
        const ciuSpans = this.transcriptEditor.querySelectorAll('.ciu-word');
        
        ciuSpans.forEach(span => {
            const word = span.textContent.trim();
            if (word) {
                // Apply same counting rules to CIU words
                ciuCount += this.countWordsInText(word);
            }
        });
        
        return ciuCount;
    }
    
    countWordsInText(text) {
        // Standardized word counting rules:
        // 1. Split on whitespace
        // 2. Hyphenated words count as 2 words (e.g., "well-being" = 2 words)
        // 3. Contractions count as 2 words (e.g., "don't" = 2 words)
        // 4. Irregular contractions count as 2 words (gonna, sorta, shoulda, kinda, woulda, coulda, wanna, oughta)
        // 5. Filter out empty strings and punctuation-only strings
        
        const trimmed = text.trim();
        if (!trimmed) return 0;
        
        // List of irregular contractions that should count as 2 words
        const irregularContractions = ['gonna', 'sorta', 'shoulda', 'kinda', 'woulda', 'coulda', 'oughta'];
        
        let wordCount = 0;
        const tokens = trimmed.split(/\s+/);
        
        tokens.forEach(token => {
            // Remove leading/trailing punctuation but keep internal punctuation
            const cleaned = token.replace(/^[^\w'-]+|[^\w'-]+$/g, '');
            if (cleaned.length === 0) return;
            
            // Check if this is an irregular contraction (case-insensitive)
            const lowerCleaned = cleaned.toLowerCase();
            if (irregularContractions.includes(lowerCleaned)) {
                wordCount += 2; // Irregular contractions count as 2 words
                return;
            }
            
            // Count hyphens as word separators (hyphenated words = multiple words)
            const hyphenParts = cleaned.split('-').filter(part => part.length > 0);
            wordCount += hyphenParts.length;
            
            // Count regular contractions as 2 words (apostrophes indicate contractions)
            const hasContraction = cleaned.includes("'") && cleaned.length > 1;
            if (hasContraction) {
                // Add 1 more for the contraction (since we already counted the base word)
                wordCount += 1;
            }
        });
        
        return wordCount;
    }
}

// Manager Classes
class TemplateManager {
    constructor(app) {
        this.app = app;
        this.templates = new Map();
    }

    register(id, template) {
        this.templates.set(id, template);
    }

    get(id) {
        return this.templates.get(id);
    }

    getAll() {
        return Array.from(this.templates.entries()).map(([id, template]) => ({
            id,
            ...template
        }));
    }

    getAllComponents() {
        const allComponents = new Set();
        
        // Add standalone components first
        const standaloneComponents = [
            { type: 'custom-text-field', label: 'Custom Text Field' },
            { type: 'custom-data-table', label: 'Custom Data Table' }
        ];
        
        standaloneComponents.forEach(comp => {
            allComponents.add(JSON.stringify(comp));
        });
        
        // Then add components from templates
        this.templates.forEach(template => {
            template.components.forEach(comp => {
                allComponents.add(JSON.stringify(comp));
            });
        });
        
        return Array.from(allComponents).map(comp => JSON.parse(comp));
    }
}

class DragHandler {
    constructor(app) {
        this.app = app;
        this.dragData = null;
        this.dropIndicator = null;
    }

    // Map display names to component types
    getComponentType(displayName) {
        const typeMap = {
            'Custom Text Field': 'custom-text-field',
            'Location': 'textarea',
            'Target': 'textarea',
            'Aim': 'textarea',
            'Check-in Info and Results of Homework': 'textarea',
            'Target Discourse Structure(s)': 'textarea',
            'Theme/Subject Matter': 'textarea',
            'Word List': 'word-list',
            'Sentence List': 'sentence-list',
            'Discourse Transcript': 'discourse-transcript',
            'Session': 'textarea',
            'Notes': 'textarea',
            'Comments/Observations': 'textarea',
            'Session Summary/Analysis of Progress': 'textarea',
            'Feedback and Homework Provided': 'textarea',
            'Plan for Next Session': 'textarea',
            'Custom Data Table': 'custom-data-table',
            // Table components
            'Default Data Table': 'practice-data-table',
            'PACE Data Table': 'pace-table',
            'SRT Data Table': 'srt-table',
            'Bolus Therapy Data Table': 'swallow-data'
        };
        
        return typeMap[displayName] || 'text'; // default to text if not found
    }

    init() {
        this.setupDropzone();
        this.setupSidePanel();
    }

    startRearrange(element, event) {
        this.dragData = { type: 'rearrange', element };
        event.dataTransfer.effectAllowed = 'move';
    }

    startComponent(component, event) {
        this.dragData = { type: 'component', component };
        event.dataTransfer.effectAllowed = 'copy';
    }

    startTemplate(templateId, event) {
        const template = this.app.templateManager.get(templateId);
        this.dragData = { type: 'template', template };
        event.dataTransfer.effectAllowed = 'copy';
    }

    endDrag(event) {
        this.dragData = null;
        this.removeDropIndicator();
    }

    setupDropzone() {
        const dropzone = document.getElementById('templateDropzone');
        
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.style.background = '#d1e7dd';
            
            if (this.dragData) { // Show indicator for rearrange, component, or template
                this.showDropIndicator(e, dropzone);
            }
        });

        dropzone.addEventListener('dragleave', (e) => {
            dropzone.style.background = '';
            this.removeDropIndicator();
        });

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.style.background = '';
            this.removeDropIndicator();
            
            if (!this.dragData) return;
            
            this.handleDrop(e, dropzone);
            this.dragData = null;
        });
    }

    setupSidePanel() {
        const sidePanel = document.getElementById('draggableList');
        
        sidePanel.addEventListener('dragstart', (e) => {
            // Ensure we find the draggable element even if the event target is a child (eg. <mark> or text node)
            const item = e.target.closest && e.target.closest('.draggable-item, .draggable-group');
            if (!item) return;
            if (item.classList.contains('draggable-item')) {
                const displayName = item.textContent.trim();
                const componentType = this.getComponentType(displayName);
                const component = {
                    type: componentType,
                    label: displayName
                };
                this.startComponent(component, e);
            } else if (item.classList.contains('draggable-group')) {
                this.startTemplate(item.dataset.preset, e);
            }
        });

        sidePanel.addEventListener('click', (e) => {
            const item = e.target.closest && e.target.closest('.draggable-item, .draggable-group');
            if (!item) return;
            if (item.classList.contains('draggable-item')) {
                const displayName = item.textContent.trim();
                const componentType = this.getComponentType(displayName);
                const componentConfig = {
                    type: componentType,
                    label: displayName
                };
                this.appendComponent(componentConfig);
            } else if (item.classList.contains('draggable-group')) {
                this.appendTemplate(item.dataset.preset);
            }
        });
    }

    appendComponent(componentConfig) {
        const dropzone = document.getElementById('templateDropzone');
        const component = this.app.createComponent(componentConfig.type, componentConfig.label);
        dropzone.appendChild(component.createElement());
        // Update placeholder visibility
        this.app.updatePlaceholder();
    }

    appendTemplate(templateId) {
        const dropzone = document.getElementById('templateDropzone');
        const template = this.app.templateManager.get(templateId);
        if (template) {
            template.components.forEach(compConfig => {
                const component = this.app.createComponent(compConfig.type, compConfig.label);
                dropzone.appendChild(component.createElement());
            });
            // Update placeholder visibility
            this.app.updatePlaceholder();
        }
    }

    handleDrop(event, dropzone) {
        if (this.dragData.type === 'component') {
            this.dropComponent(this.dragData.component, dropzone, event);
        } else if (this.dragData.type === 'template') {
            this.dropTemplate(this.dragData.template, dropzone, event);
        } else if (this.dragData.type === 'rearrange') {
            this.dropRearrange(event, dropzone);
        }
    }

    dropComponent(componentConfig, dropzone, event) {
        const component = this.app.createComponent(componentConfig.type, componentConfig.label);
        const newElement = component.createElement();

        let insertBefore = null;
        for (const child of dropzone.children) {
            if (child.classList.contains('drop-indicator')) continue;
            const rect = child.getBoundingClientRect();
            if (event.clientY < rect.top + rect.height / 2) {
                insertBefore = child;
                break;
            }
        }

        if (insertBefore) {
            dropzone.insertBefore(newElement, insertBefore);
        } else {
            dropzone.appendChild(newElement);
        }
        // Update placeholder visibility
        this.app.updatePlaceholder();
    }

    dropTemplate(template, dropzone, event) {
        let insertBefore = null;
        for (const child of dropzone.children) {
            if (child.classList.contains('drop-indicator')) continue;
            const rect = child.getBoundingClientRect();
            if (event.clientY < rect.top + rect.height / 2) {
                insertBefore = child;
                break;
            }
        }

        template.components.forEach(compConfig => {
            const component = this.app.createComponent(compConfig.type, compConfig.label);
            const newElement = component.createElement();
            if (insertBefore) {
                dropzone.insertBefore(newElement, insertBefore);
            } else {
                dropzone.appendChild(newElement);
            }
        });
        // Update placeholder visibility
        this.app.updatePlaceholder();
    }

    dropRearrange(event, dropzone) {
        let insertBefore = null;
        for (const child of dropzone.children) {
            if (child.classList.contains('drop-indicator')) continue;
            const rect = child.getBoundingClientRect();
            if (event.clientY < rect.top + rect.height / 2) {
                insertBefore = child;
                break;
            }
        }
        
        if (insertBefore) {
            dropzone.insertBefore(this.dragData.element, insertBefore);
        } else {
            dropzone.appendChild(this.dragData.element);
        }
    }

    showDropIndicator(event, dropzone) {
        if (!this.dropIndicator) {
            this.dropIndicator = document.createElement('div');
            this.dropIndicator.className = 'drop-indicator';
        }

        let insertBefore = null;
        for (const child of dropzone.children) {
            if (child.classList.contains('drop-indicator')) continue;
            const rect = child.getBoundingClientRect();
            if (event.clientY < rect.top + rect.height / 2) {
                insertBefore = child;
                break;
            }
        }

        if (insertBefore) {
            dropzone.insertBefore(this.dropIndicator, insertBefore);
        } else {
            dropzone.appendChild(this.dropIndicator);
        }
    }

    removeDropIndicator() {
        if (this.dropIndicator && this.dropIndicator.parentNode) {
            this.dropIndicator.parentNode.removeChild(this.dropIndicator);
        }
    }
}

class UIManager {
    constructor(app) {
        this.app = app;
        this.presetDropdown = document.getElementById('presetDropdown');
        this.draggableList = document.getElementById('draggableList');
        this.searchField = document.getElementById('componentSearch');
        this.currentComponents = [];
        this.searchTerm = '';
    }

    init() {
        this.setupDropdown();
        this.setupPresetFilter();
        this.setupSearch();
        this.setupClearButton();
    }

    setupDropdown() {
        // Clear existing options except the first one
        const firstOption = this.presetDropdown.firstElementChild;
        this.presetDropdown.innerHTML = '';
        
        // Add 'All' option
        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = 'Any Template';
        this.presetDropdown.appendChild(allOption);
        
        // Add template options
        this.app.templateManager.getAll().forEach(template => {
            const option = document.createElement('option');
            option.value = template.id;
            option.textContent = template.name;
            this.presetDropdown.appendChild(option);
        });
        
        this.presetDropdown.value = 'all';
    }

    setupPresetFilter() {
        this.presetDropdown.addEventListener('change', (e) => {
            const selected = e.target.value;
            if (selected === 'all') {
                this.currentComponents = this.app.templateManager.getAllComponents();
            } else {
                const template = this.app.templateManager.get(selected);
                if (template) {
                    this.currentComponents = template.components;
                }
            }
            this.applyFilters();
        });
    }

    setupSearch() {
        this.searchField.addEventListener('input', (e) => {
            this.searchTerm = e.target.value.toLowerCase().trim();
            this.applyFilters();
        });

        this.searchField.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.searchField.value = '';
                this.searchTerm = '';
                this.applyFilters();
            }
        });
    }

    setupClearButton() {
        const clearButton = document.getElementById('clearTemplateBtn');
        if (clearButton) {
            clearButton.addEventListener('click', () => {
                this.clearTemplate();
            });
        }
    }

    clearTemplate() {
        const confirmed = confirm('Are you sure you want to clear all components from the session template? This action cannot be undone.');
        
        if (confirmed) {
            const dropzone = document.getElementById('templateDropzone');
            if (dropzone) {
                // Remove only actual component children and drop-indicator elements,
                // but preserve (or recreate) the placeholder element so it can be shown again.
                const placeholderId = 'dropzonePlaceholder';
                let ph = document.getElementById(placeholderId);

                // Remove everything except placeholder and drop-indicator
                Array.from(dropzone.children).forEach(child => {
                    if (child.id === placeholderId) return;
                    if (child.classList && child.classList.contains('drop-indicator')) {
                        // remove any lingering drop indicators
                        child.remove();
                        return;
                    }
                    child.remove();
                });

                // If placeholder element is missing (older DOM state), recreate it
                if (!ph) {
                    ph = document.createElement('div');
                    ph.id = placeholderId;
                    ph.className = 'dropzone-placeholder';
                    ph.innerHTML = `
                        <span class="placeholder-icon">📋</span>
                        <p>Click or drop components here to build your template</p>
                        <small>Tip: click a component to add it, or drag to reorder.</small>
                    `;
                    dropzone.appendChild(ph);
                }
                
                // Emit event for any cleanup needed
                this.app.eventBus.emit('template:cleared');
                // Ensure placeholder is visible after clearing
                this.app.updatePlaceholder();
            }
        }
    }

    applyFilters() {
        let filteredComponents = [...this.currentComponents];
        
        // Apply search filter
        if (this.searchTerm) {
            filteredComponents = filteredComponents.filter(comp => 
                comp.label.toLowerCase().includes(this.searchTerm) ||
                comp.type.toLowerCase().includes(this.searchTerm)
            );
        }
        
        this.renderComponents(filteredComponents);
    }

    render() {
        this.currentComponents = this.app.templateManager.getAllComponents();
        this.applyFilters();
    }

    renderComponents(components) {
        // Single-pass renderer: compute ordered items (components + groups) and append once via DocumentFragment
        const frag = document.createDocumentFragment();
        const selectedPreset = this.presetDropdown.value;
        const isTemplateSpecificView = selectedPreset !== 'all';

        // Show search results count if searching
        if (this.searchTerm) {
            const searchInfo = document.createElement('div');
            searchInfo.className = 'search-results-info';
            searchInfo.textContent = `${components.length} component${components.length !== 1 ? 's' : ''} found`;
            frag.appendChild(searchInfo);
        }

        // Build items array differently depending on whether we're viewing a specific template
        let items = [];

        if (isTemplateSpecificView) {
            // For a template-specific view, the first listed item should be the Group for that template.
            // Use the selectedPreset id as the "preset" so dataset.preset is always a string the handlers expect.
            // Then render components in the template's own order so Default/Custom Data Tables follow Task/Activity
            if (!this.searchTerm) {
                const template = this.app.templateManager.get(selectedPreset);
                if (template) items.push({ kind: 'group', template, preset: selectedPreset });
            }

            // Render components in the provided order (template order)
            items.push(...components.map(c => ({ kind: 'component', comp: c })));
        } else {
            // Global view: keep the previous ordering rules (special placement of custom text/table and then groups)
            // Build ordered list of components according to rules
            const customTextFieldComp = components.find(comp => comp.type === 'custom-text-field');
            const customDataTableComp = components.find(comp => comp.type === 'custom-data-table');
            const defaultDataTableComp = components.find(comp => comp.type === 'practice-data-table');

            const otherComponents = components.filter(comp => comp.type !== 'custom-text-field' && comp.type !== 'custom-data-table' && comp.type !== 'practice-data-table');

            const orderedComponents = [];
            if (customTextFieldComp) orderedComponents.push(customTextFieldComp);
            if (customDataTableComp) orderedComponents.push(customDataTableComp);
            if (defaultDataTableComp) orderedComponents.push(defaultDataTableComp);
            orderedComponents.push(...otherComponents);

            // Build items array (kind: 'component' | 'group')
            items = orderedComponents.map(c => ({ kind: 'component', comp: c }));

            // Insert groups (all templates) in global view after custom-data-table if present,
            // otherwise after custom-text-field, otherwise at end. Do not insert groups when searching.
            if (!this.searchTerm) {
                const templates = this.app.templateManager.getAll();
                const groupItems = templates.map(t => ({ kind: 'group', template: t }));

                let insertIndex = -1;
                const idxCustomData = items.findIndex(it => it.kind === 'component' && it.comp.type === 'custom-data-table');
                if (idxCustomData !== -1) insertIndex = idxCustomData + 1;
                else {
                    const idxCustomText = items.findIndex(it => it.kind === 'component' && it.comp.type === 'custom-text-field');
                    if (idxCustomText !== -1) insertIndex = idxCustomText + 1;
                }

                if (insertIndex === -1) items.push(...groupItems);
                else items.splice(insertIndex, 0, ...groupItems);
            }
        }

        // Render items into fragment
        items.forEach(it => {
            if (it.kind === 'component') {
                const comp = it.comp;
                const item = document.createElement('div');
                item.className = 'draggable-item';
                item.draggable = true;
                item.dataset.type = comp.type;

                const label = comp.label || comp.type;
                if (this.searchTerm) {
                    const searchRegex = new RegExp(`(${this.searchTerm.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')})`, 'gi');
                    item.innerHTML = label.replace(searchRegex, '<mark>$1</mark>');
                } else {
                    item.textContent = label;
                }

                frag.appendChild(item);
            } else if (it.kind === 'group') {
                const template = it.template;
                const group = document.createElement('div');
                group.className = 'draggable-group';
                group.draggable = true;
                // Prefer explicit preset id (passed when rendering template-specific view). Fall back to template.id if present.
                group.dataset.preset = it.preset || (template && template.id) || '';
                group.textContent = `${template.name} (Group)`;
                frag.appendChild(group);
            }
        });

        // If searching and no results, show the no-results node
        if (this.searchTerm && components.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'no-search-results';
            noResults.innerHTML = `
                <div class="no-results-icon">🔍</div>
                <div class="no-results-text">No components found for "${this.searchTerm}"</div>
                <div class="no-results-hint">Try a different search term</div>
            `;
            frag.appendChild(noResults);
        }

        // Replace list contents once
        this.draggableList.innerHTML = '';
        this.draggableList.appendChild(frag);
    }
}

class EventBus {
    constructor() {
        this.events = new Map();
    }

    on(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event).push(callback);
    }

    emit(event, data) {
        if (this.events.has(event)) {
            this.events.get(event).forEach(callback => callback(data));
        }
    }

    off(event, callback) {
        if (this.events.has(event)) {
            const callbacks = this.events.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }
}

// --- Snapshot / Restore helpers for Therapy Session Data Taker ---
// DOM-path based serializer for component-local form state (inputs, textareas, selects, contenteditable)
function _getPathFromRoot(root, node) {
    const path = [];
    let cur = node;
    while (cur && cur !== root) {
        const parent = cur.parentElement;
        if (!parent) break;
        const idx = Array.prototype.indexOf.call(parent.children, cur);
        path.push(idx);
        cur = parent;
    }
    path.reverse();
    return path;
}

function _getNodeByPath(root, path) {
    let cur = root;
    for (let i = 0; i < path.length; i++) {
        if (!cur) return null;
        cur = cur.children[path[i]];
    }
    return cur || null;
}

function _serializeComponent(compEl) {
    const state = [];
    // find all relevant form / editable elements inside component
    const els = compEl.querySelectorAll('input,textarea,select,[contenteditable]');
    els.forEach(el => {
        const relPath = _getPathFromRoot(compEl, el);
        const tag = el.tagName && el.tagName.toLowerCase();
        const entry = { path: relPath, tag };
        if (tag === 'input') {
            const t = el.type && el.type.toLowerCase();
            entry.inputType = t;
            if (t === 'checkbox' || t === 'radio') entry.checked = !!el.checked;
            else entry.value = el.value || '';
        } else if (tag === 'textarea') {
            entry.value = el.value || '';
        } else if (tag === 'select') {
            // store value (preferred) and selectedIndex as fallback
            entry.value = el.value;
            entry.selectedIndex = el.selectedIndex;
        } else {
            // contenteditable or other elements
            if (el.isContentEditable) entry.innerHTML = el.innerHTML || '';
            else entry.value = el.value || '';
        }
        state.push(entry);
    });
    return state;
}

function prepareSnapshot() {
    try {
        const dropzone = document.getElementById('templateDropzone');
        const patient = document.getElementById('patientName')?.value?.trim() || '';
        const date = document.getElementById('sessionDate')?.value?.trim() || '';

        const components = [];
        if (dropzone) {
            Array.from(dropzone.children).forEach(child => {
                if (!child || child.id === 'dropzonePlaceholder' || child.classList.contains('drop-indicator')) return;
                const type = child.getAttribute('data-type') || child.dataset.type || 'unknown';
                // label may be in .component-label or .component-label-editable
                const labelEl = child.querySelector('.component-label-editable, .component-label');
                const label = labelEl ? (labelEl.textContent || labelEl.value || '').trim() : '';
                const state = _serializeComponent(child);
                // If the DOM element has a linked component instance, also capture
                // its internal data model (rows, options, etc.) so we can restore
                // complex components using their public APIs instead of only
                // applying DOM writes.
                let compData = null;
                try {
                    const inst = child && child._componentInstance;
                    if (inst && typeof inst.getData === 'function') compData = inst.getData();
                } catch (e) { /* ignore */ }
                components.push({ type, label, state, data: compData });
            });
        }

        return { version: 1, tool: 'therapy-data-session-taker', created: Date.now(), meta: { patient, date }, components };
    } catch (e) {
        console.error('prepareSnapshot error', e);
        return null;
    }
}

function _applyStateToComponentElement(compEl, state) {
    try {
        if (!compEl || !Array.isArray(state)) return;
        state.forEach(entry => {
            let target = _getNodeByPath(compEl, entry.path || []);
                if (!target) {
                    // The component may dynamically create rows/columns (via addRow/addCol).
                    // Try to trigger those UI helpers (click add-row/add-col buttons) until the path exists.
                    try {
                        const maxAttempts = 20;
                        let attempts = 0;
                        const addSelector = '.pace-add-row-btn, .srt-add-row-btn, .practice-add-row-btn, .custom-add-row-btn, .pace-add-col-btn, .add-row-btn';
                        while (!target && attempts < maxAttempts) {
                            const addBtn = compEl.querySelector(addSelector);
                            if (!addBtn) break;
                            try { addBtn.click(); } catch (e) { try { addBtn.dispatchEvent(new MouseEvent('click', { bubbles: true })); } catch (ee) {} }
                            // allow any synchronous DOM additions to complete
                            target = _getNodeByPath(compEl, entry.path || []);
                            attempts++;
                        }
                    } catch (e) { /* ignore failures while attempting to grow component */ }
                }
                if (!target) return;
            // If an adapter already restored this element, skip applying the saved state
            try { if (target.dataset && target.dataset.tdstRestored === '1') return; } catch (e) {}
            const tag = entry.tag;
            if (tag === 'input') {
                const t = entry.inputType;
                if (t === 'checkbox' || t === 'radio') target.checked = !!entry.checked;
                else target.value = entry.value || '';
                // ensure change/input handlers can react if necessary
                try { target.dispatchEvent(new Event('input', { bubbles: true })); } catch(e) {}
            } else if (tag === 'textarea') {
                target.value = entry.value || '';
                try { target.dispatchEvent(new Event('input', { bubbles: true })); } catch(e) {}
            } else if (tag === 'select') {
                if (typeof entry.value !== 'undefined') target.value = entry.value;
                else if (typeof entry.selectedIndex !== 'undefined') target.selectedIndex = entry.selectedIndex;
                try { target.dispatchEvent(new Event('change', { bubbles: true })); } catch(e) {}
            } else {
                if (target.isContentEditable && typeof entry.innerHTML !== 'undefined') {
                    target.innerHTML = entry.innerHTML || '';
                } else if (typeof entry.value !== 'undefined') {
                    target.value = entry.value || '';
                }
            }
        });
    } catch (e) { console.error('applyState error', e); }
}

// Small per-component adapters to reconstruct complex components from their
// saved internal data model (so we avoid prompts or fragile UI-click-growth).
function _runComponentAdapter(type, compInstance, savedData, el) {
    try {
        if (!compInstance || !savedData) return;
        // diagnostic helper: non-invasive logging during restore
        const _log = (msg, ...args) => {
            try {
                if (window && window.console && typeof window.console.log === 'function') {
                    window.console.log('[TDST][restore]', msg, ...args);
                }
            } catch (e) {}
        };
        switch ((type||'').toLowerCase()) {
            case 'pace-table':
            case 'pace-table': {
                // PaceTableComponent uses this.data.rows and renderRows()
                if (typeof compInstance.setData === 'function') compInstance.setData({ rows: savedData.rows || [] });
                else compInstance.data = { ...compInstance.data, rows: savedData.rows || [] };
                if (typeof compInstance.renderRows === 'function') compInstance.renderRows();
                // After rendering, set per-row values reliably by matching row ids
                try {
                    const rows = savedData.rows || [];
                    rows.forEach((row, rowIndex) => {
                        const id = row && row.id;
                        if (!id) return;
                        // select offer/receive
                        const sel = el.querySelector(`select.pace-offer-receive[data-row="${id}"]`);
                        if (sel && typeof row.offer !== 'undefined') { sel.value = row.offer; try { sel.dataset.tdstRestored = '1'; } catch(e){}; sel.dispatchEvent(new Event('change', { bubbles: true })); _log('pace: set offer', id, row.offer); }
                        // comments
                        const comm = el.querySelector(`.pace-comments[data-row="${id}"]`);
                        if (comm) { comm.value = row.comments || ''; try { comm.dataset.tdstRestored = '1'; } catch(e){}; comm.dispatchEvent(new Event('input', { bubbles: true })); _log('pace: set comments', id); }
                        // radio level - try name-based, row-scoped, then index fallback
                        if (row.level) {
                            let radio = null;
                            let matchedBy = null;
                            // 1) name-based radio group
                            radio = el.querySelector(`input[name="pace-level-${id}"][value="${row.level}"]`);
                            if (radio) matchedBy = 'name';
                            // 2) row-scoped radio lookup
                            if (!radio) {
                                const rowEl = el.querySelector(`[data-row="${id}"]`);
                                if (rowEl) {
                                    radio = rowEl.querySelector(`input[type="radio"][value="${row.level}"]`);
                                    if (radio) matchedBy = 'row-scope';
                                }
                            }
                            // 3) index-based fallback
                            if (!radio) {
                                try {
                                    const tbody = el.querySelector('table.pace-table tbody');
                                    if (tbody) {
                                        const idx = rowIndex; // use saved order index
                                        const tr = tbody.children[idx];
                                        if (tr) {
                                            radio = tr.querySelector(`input[type="radio"][value="${row.level}"]`);
                                            if (radio) matchedBy = 'index';
                                        }
                                    }
                                } catch (e) {}
                            }
                            if (radio) {
                                radio.checked = true; try { radio.dataset.tdstRestored = '1'; } catch(e){}; radio.dispatchEvent(new Event('change', { bubbles: true }));
                                _log('pace: set level', id, row.level, 'matchedBy', matchedBy);
                            } else {
                                _log('pace: level not applied', id, row.level);
                            }
                        }
                    });
                } catch (e) { /* ignore */ }
                break;
            }
            case 'practice-data-table': {
                if (typeof compInstance.setData === 'function') compInstance.setData({ rows: savedData.rows || [] });
                else compInstance.data = { ...compInstance.data, rows: savedData.rows || [] };
                if (typeof compInstance.renderRows === 'function') compInstance.renderRows();
                // Map saved row fields by data-row id
                try {
                    const rows = savedData.rows || [];
                    rows.forEach((row, rowIndex) => {
                        const id = row && row.id;
                        if (!id) return;
                        const stim = el.querySelector(`[data-row="${id}"][data-type="stimulus"], textarea[data-row="${id}"]`);
                        if (stim) { stim.value = row.stimulus || ''; try { stim.dataset.tdstRestored = '1'; } catch(e){}; stim.dispatchEvent(new Event('input', { bubbles: true })); _log('practice: set stimulus', id); }
                        if (row.performance) {
                            let perf = el.querySelector(`input[name="practice-performance-${id}"][value="${row.performance}"]`);
                            let matchedBy = null;
                            if (perf) matchedBy = 'name';
                            if (!perf) {
                                const rowEl = el.querySelector(`[data-row="${id}"]`);
                                if (rowEl) { perf = rowEl.querySelector(`input[type="radio"][value="${row.performance}"]`); if (perf) matchedBy = 'row-scope'; }
                            }
                            if (!perf) {
                                // index fallback
                                try { const tbody = el.querySelector('table.practice-table tbody'); if (tbody && tbody.children[rowIndex]) { perf = tbody.children[rowIndex].querySelector(`input[type="radio"][value="${row.performance}"]`); if (perf) matchedBy = 'index'; } } catch (e) {}
                            }
                            if (perf) { perf.checked = true; try { perf.dataset.tdstRestored = '1'; } catch(e){}; perf.dispatchEvent(new Event('change', { bubbles: true })); _log('practice: set performance', id, row.performance, 'matchedBy', matchedBy); }
                        }
                        if (row.level) {
                            let lvl = el.querySelector(`input[name="practice-level-${id}"][value="${row.level}"]`);
                            let matchedBy = null;
                            if (lvl) matchedBy = 'name';
                            if (!lvl) {
                                const rowEl = el.querySelector(`[data-row="${id}"]`);
                                if (rowEl) { lvl = rowEl.querySelector(`input[type="radio"][value="${row.level}"]`); if (lvl) matchedBy = 'row-scope'; }
                            }
                            if (!lvl) {
                                try { const tbody = el.querySelector('table.practice-table tbody'); if (tbody && tbody.children[rowIndex]) { lvl = tbody.children[rowIndex].querySelector(`input[type="radio"][value="${row.level}"]`); if (lvl) matchedBy = 'index'; } } catch (e) {}
                            }
                            if (lvl) { lvl.checked = true; try { lvl.dataset.tdstRestored = '1'; } catch(e){}; lvl.dispatchEvent(new Event('change', { bubbles: true })); _log('practice: set level', id, row.level, 'matchedBy', matchedBy); }
                        }
                        const comm = el.querySelector(`[data-row="${id}"][data-type="comments"], .pace-comments[data-row="${id}"]`);
                        if (comm) { comm.value = row.comments || ''; try { comm.dataset.tdstRestored = '1'; } catch(e){}; comm.dispatchEvent(new Event('input', { bubbles: true })); _log('practice: set comments', id); }
                    });
                } catch (e) {}
                break;
            }
            case 'srt-table': {
                // Avoid prompt-driven addInterval; set intervals and rows then render
                if (Array.isArray(savedData.intervals)) {
                    if (typeof compInstance.setData === 'function') compInstance.setData({ intervals: savedData.intervals });
                    else compInstance.data.intervals = savedData.intervals.slice();
                }
                if (Array.isArray(savedData.rows)) {
                    if (typeof compInstance.setData === 'function') compInstance.setData({ rows: savedData.rows });
                    else compInstance.data.rows = savedData.rows.map(r => ({ cvc: !!r.cvc, marks: Array.isArray(r.marks) ? r.marks.slice() : [] }));
                }
                if (typeof compInstance.renderTable === 'function') compInstance.renderTable();
                // After rendering, set per-row cvc and marks by index
                try {
                    const rows = savedData.rows || [];
                    rows.forEach((r, i) => {
                        const tbody = el.querySelector('tbody');
                        if (!tbody) return;
                        const rowEl = tbody.children[i];
                        if (!rowEl) return;
                        const cvc = rowEl.querySelector('input.srt-cvc');
                        if (cvc) { cvc.checked = !!r.cvc; try { cvc.dataset.tdstRestored = '1'; } catch(e){}; cvc.dispatchEvent(new Event('change', { bubbles: true })); _log('srt: set cvc', i, !!r.cvc); }
                        if (Array.isArray(r.marks)) {
                            // Find cells that represent intervals (td.srt-interval)
                            const cells = rowEl.querySelectorAll('td.srt-interval');
                            r.marks.forEach((mark, idx) => {
                                const cell = cells[idx];
                                if (!cell) return;
                                const correct = cell.querySelector('.srt-mark.srt-correct');
                                const incorrect = cell.querySelector('.srt-mark.srt-incorrect');
                                if (mark === 'correct') { if (correct) { correct.classList.add('active'); try { correct.dataset.tdstRestored = '1'; } catch(e){} } if (incorrect) incorrect.classList.remove('active'); }
                                else if (mark === 'incorrect') { if (incorrect) { incorrect.classList.add('active'); try { incorrect.dataset.tdstRestored = '1'; } catch(e){} } if (correct) correct.classList.remove('active'); }
                                else { if (correct) correct.classList.remove('active'); if (incorrect) incorrect.classList.remove('active'); }
                            });
                            _log('srt: set marks', i, r.marks.length);
                        }
                    });
                } catch (e) { /* ignore */ }
                break;
            }
            case 'custom-data-table': {
                // Restore headers, options, extraColumns, rows and visibility
                const newData = { ...(compInstance.data || {}), ...(savedData || {}) };
                // Ensure arrays are copied
                if (Array.isArray(savedData.rows)) newData.rows = savedData.rows.map(r => ({ ...r }));
                if (Array.isArray(savedData.extraColumns)) newData.extraColumns = savedData.extraColumns.map(c => ({ ...c }));
                if (Array.isArray(savedData.dataCol1?.options)) newData.dataCol1 = savedData.dataCol1;
                if (Array.isArray(savedData.dataCol2?.options)) newData.dataCol2 = savedData.dataCol2;
                if (typeof compInstance.setData === 'function') compInstance.setData(newData);
                else compInstance.data = newData;
                if (typeof compInstance.createColumnControls === 'function') compInstance.createColumnControls();
                if (typeof compInstance.renderTable === 'function') compInstance.renderTable();
                // After rendering, map saved rows into DOM by id
                try {
                    const rows = savedData.rows || [];
                    rows.forEach((row, rowIndex) => {
                        const id = row && row.id;
                        if (!id) return;
                        const stim = el.querySelector(`textarea[data-row="${id}"]`);
                        if (stim) { stim.value = row.stimulus || ''; try { stim.dataset.tdstRestored = '1'; } catch(e){}; stim.dispatchEvent(new Event('input', { bubbles: true })); _log('custom: set stimulus', id); }
                        if (row.dataCol1) {
                            let r = el.querySelector(`input[name="custom-data1-${id}"][value="${row.dataCol1}"]`);
                            let matchedBy = null;
                            if (r) matchedBy = 'name';
                            if (!r) {
                                const rowEl = el.querySelector(`[data-row="${id}"]`);
                                if (rowEl) { r = rowEl.querySelector(`input[type="radio"][value="${row.dataCol1}"]`); if (r) matchedBy = 'row-scope'; }
                            }
                            if (!r) {
                                try { const tbody = el.querySelector('table.custom-data-table tbody'); if (tbody && tbody.children[rowIndex]) { r = tbody.children[rowIndex].querySelector(`input[type="radio"][value="${row.dataCol1}"]`); if (r) matchedBy = 'index'; } } catch (e) {}
                            }
                            if (r) { r.checked = true; try { r.dataset.tdstRestored = '1'; } catch(e){}; r.dispatchEvent(new Event('change', { bubbles: true })); _log('custom: set dataCol1', id, row.dataCol1, 'matchedBy', matchedBy); }
                        }
                        if (row.dataCol2) {
                            let r2 = el.querySelector(`input[name="custom-data2-${id}"][value="${row.dataCol2}"]`);
                            let matchedBy2 = null;
                            if (r2) matchedBy2 = 'name';
                            if (!r2) {
                                const rowEl = el.querySelector(`[data-row="${id}"]`);
                                if (rowEl) { r2 = rowEl.querySelector(`input[type="radio"][value="${row.dataCol2}"]`); if (r2) matchedBy2 = 'row-scope'; }
                            }
                            if (!r2) {
                                try { const tbody = el.querySelector('table.custom-data-table tbody'); if (tbody && tbody.children[rowIndex]) { r2 = tbody.children[rowIndex].querySelector(`input[type="radio"][value="${row.dataCol2}"]`); if (r2) matchedBy2 = 'index'; } } catch (e) {}
                            }
                            if (r2) { r2.checked = true; try { r2.dataset.tdstRestored = '1'; } catch(e){}; r2.dispatchEvent(new Event('change', { bubbles: true })); _log('custom: set dataCol2', id, row.dataCol2, 'matchedBy', matchedBy2); }
                        }
                        const comm = el.querySelector(`textarea[data-row="${id}"][data-type="comments"]`);
                        if (comm) { comm.value = row.comments || ''; try { comm.dataset.tdstRestored = '1'; } catch(e){}; comm.dispatchEvent(new Event('input', { bubbles: true })); _log('custom: set comments', id); }
                    });
                } catch (e) {}
                if (typeof compInstance.updateStats === 'function') compInstance.updateStats();
                break;
            }
            default: {
                // Generic fallback: if component exposes setData and render, use them
                if (typeof compInstance.setData === 'function') compInstance.setData(savedData);
                else compInstance.data = { ...compInstance.data, ...(savedData || {}) };
                if (typeof compInstance.renderTable === 'function') compInstance.renderTable();
                if (typeof compInstance.renderRows === 'function') compInstance.renderRows();
                break;
            }
        }
        // Ensure any DOM utilities run for textareas etc.
        try { if (window.DomUtils) DomUtils.autoResizeTextareas({ root: el, initializeExisting: true }); } catch (e) {}
    } catch (e) { console.warn('component adapter failure', type, e); }
}

function restoreSnapshot(snapshot) {
    try {
        if (!snapshot || snapshot.tool !== 'therapy-data-session-taker') return false;
        const meta = snapshot.meta || {};
        if (document.getElementById('patientName')) document.getElementById('patientName').value = meta.patient || '';
        if (document.getElementById('sessionDate')) document.getElementById('sessionDate').value = meta.date || '';

        const dropzone = document.getElementById('templateDropzone');
        if (!dropzone) return false;

        // Clear existing components but preserve placeholder element
        const placeholderId = 'dropzonePlaceholder';
        const ph = document.getElementById(placeholderId);
        Array.from(dropzone.children).forEach(child => {
            if (child.id === placeholderId) return;
            if (child.classList && child.classList.contains('drop-indicator')) { child.remove(); return; }
            child.remove();
        });

        const comps = Array.isArray(snapshot.components) ? snapshot.components : [];
        comps.forEach(csnap => {
            try {
                // Pass saved internal data into the component constructor as
                // initialData so the component can rebuild rows/columns itself.
                const initialConfig = csnap.data ? { initialData: csnap.data } : {};
                const compInstance = window.sessionBuilder ? window.sessionBuilder.createComponent(csnap.type, csnap.label || '', initialConfig) : null;
                if (compInstance && typeof compInstance.createElement === 'function') {
                    const el = compInstance.createElement();
                    dropzone.appendChild(el);
                    // First run a per-component adapter to reconstruct internal model
                    try { _runComponentAdapter(csnap.type, compInstance, csnap.data, el); } catch (e) {}
                    // then apply recorded DOM-path state
                    _applyStateToComponentElement(el, csnap.state || []);
                } else {
                    // Fallback: if we cannot create a proper component instance, attempt to create a placeholder element
                    const fallback = document.createElement('div');
                    fallback.className = 'template-component';
                    fallback.setAttribute('data-type', csnap.type || 'unknown');
                    fallback.innerHTML = `<div class="component-header"><div class="component-title"><span class="component-label">${(csnap.label||csnap.type||'Component')}</span></div></div><div class="component-content"><div>Restored component (type: ${csnap.type})</div></div>`;
                    dropzone.appendChild(fallback);
                    _applyStateToComponentElement(fallback, csnap.state || []);
                }
            } catch (e) { console.error('restore component error', e); }
        });

        // Re-run DOM utilities and UI wiring to ensure textareas, placeholders, etc. are correct
        setTimeout(() => {
            try {
                if (window.DomUtils) DomUtils.autoResizeTextareas();
                if (window.sessionBuilder && typeof window.sessionBuilder.updatePlaceholder === 'function') window.sessionBuilder.updatePlaceholder();
            } catch (e) { /* ignore */ }
        }, 0);

        return true;
    } catch (e) {
        console.error('restoreSnapshot error', e);
        return false;
    }
}

async function saveSnapshotToFile(snapshot) {
    try {
        const filename = `therapy-data-${(snapshot.meta?.patient||'session').replace(/\s+/g,'-')}-${Date.now()}.json`;
        const data = JSON.stringify(snapshot, null, 2);
        if (window.electron && typeof window.electron.saveFile === 'function') {
            await window.electron.saveFile({ defaultPath: filename, filters: [{ name: 'JSON', extensions: ['json'] }], data });
            return true;
        }
        // Browser fallback
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        return true;
    } catch (e) { console.error('saveSnapshotToFile error', e); return false; }
}

async function loadSnapshotFromFile() {
    try {
        // Prefer electron open dialog path
        if (window.electron && typeof window.electron.openFile === 'function' && window.electron.openFile) {
            const res = await window.electron.openFile({ filters: [{ name: 'JSON', extensions: ['json'] }] });
            if (!res || !res.filePaths || res.filePaths.length === 0) return null;
            const path = res.filePaths[0];
            // if preload exposes a readFile helper
            if (window.electronOn && typeof window.electronOn.readFile === 'function') {
                const contents = await window.electronOn.readFile(path, 'utf8');
                // ipc preload returns an object like { success: true, data: '...' }
                if (contents && contents.success) return JSON.parse(contents.data);
                return null;
            }
            // If no readFile, attempt fetch via file:// (may not work in electron depending on sandbox)
            try {
                const txt = await fetch(path).then(r => r.text());
                return JSON.parse(txt);
            } catch (e) {
                console.error('loadSnapshotFromFile read error', e);
                return null;
            }
        }

        // Browser fallback using input[type=file]
        return await new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json,application/json';
            input.addEventListener('change', (ev) => {
                const f = input.files && input.files[0];
                if (!f) return resolve(null);
                const reader = new FileReader();
                reader.onload = () => {
                    try { resolve(JSON.parse(String(reader.result))); } catch (e) { resolve(null); }
                };
                reader.readAsText(f);
            });
            input.click();
        });
    } catch (e) { console.error('loadSnapshotFromFile error', e); return null; }
}

// expose API and wire menu events via preload-exposed electronOn
window.TherapyDataSnapshot = { prepareSnapshot, restoreSnapshot, saveSnapshotToFile, loadSnapshotFromFile };
try {
    if (window.electronOn && typeof window.electronOn.on === 'function') {
        window.electronOn.on('menu:save-session', async () => { const snap = prepareSnapshot(); if (snap) await saveSnapshotToFile(snap); });
        window.electronOn.on('menu:load-session', async () => { const snap = await loadSnapshotFromFile(); if (snap) restoreSnapshot(snap); });
    }
    window.addEventListener('menu:save-session', async () => { const snap = prepareSnapshot(); if (snap) await saveSnapshotToFile(snap); });
    window.addEventListener('menu:load-session', async () => { const snap = await loadSnapshotFromFile(); if (snap) restoreSnapshot(snap); });
} catch (e) { /* noop */ }


// Initialize the application

document.addEventListener('DOMContentLoaded', () => {
    window.sessionBuilder = new SessionBuilder();

    // Initialize timer after a short delay to ensure header is rendered
    setTimeout(() => {
        // Use namespaced reference while preserving legacy global path
        if (!window.sessionTimer) {
            const TimerCtor = window.TDSModules?.SessionTimer || window.SessionTimer;
            window.sessionTimer = new TimerCtor();
        }
        // Initialize simple clicker counter (instantiated once)
        if (!window.sessionCounter) {
            const CounterCtor = window.TDSModules?.SessionCounter || window.SessionCounter;
            if (CounterCtor) window.sessionCounter = new CounterCtor();
        }
    }, 100);

    // Clipboard copy functionality
    const copyBtn = document.getElementById('copyClipboardBtn');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const dropzone = document.getElementById('templateDropzone');
            if (!dropzone) return;

            // Always get Patient and Date from top input fields
            const patientInput = document.getElementById('patientName');
            const dateInput = document.getElementById('sessionDate');
            const patient = patientInput ? patientInput.value.trim() : '';
            const date = dateInput ? dateInput.value.trim() : '';
            let output = 'SESSION DATA\n';
            output += `Patient: ${patient}\nDate: ${date}\n\n`;


            // Iterate components and format output
            Array.from(dropzone.children).forEach(compEl => {
                const labelEl = compEl.querySelector('.component-label, .component-label-editable');
                const label = labelEl ? (labelEl.textContent || labelEl.value || '').trim() : '';
                if (!label) return;

                // Check for discourse transcript component
                const transcriptEditor = compEl.querySelector('.discourse-transcript-textarea[contenteditable]');
                const transcriptTextarea = compEl.querySelector('.discourse-transcript-textarea:not([contenteditable])');
                const transcriptCues = compEl.querySelector('.discourse-transcript-cues');
                const transcriptStats = compEl.querySelector('.transcript-stats-display');
                
                if (transcriptEditor || transcriptTextarea) {
                    // Handle Discourse Transcript component
                    output += `${label}\n`;
                    
                    // Get plain text content (no HTML markup)
                    let transcriptText = '';
                    if (transcriptEditor) {
                        transcriptText = transcriptEditor.textContent || transcriptEditor.innerText || '';
                    } else if (transcriptTextarea) {
                        transcriptText = transcriptTextarea.value || '';
                    }
                    
                    // Add transcript content
                    if (transcriptText.trim()) {
                        output += `Transcript: ${transcriptText.trim()}\n`;
                    }
                    
                    // Add time duration if present
                    const minutesInput = compEl.querySelector('input[type="number"][min="0"][max="99"]');
                    const secondsInput = compEl.querySelector('input[type="number"][min="0"][max="59"]');
                    if (minutesInput && secondsInput) {
                        const minutes = minutesInput.value || '0';
                        const seconds = secondsInput.value || '0';
                        if (minutes !== '0' || seconds !== '0') {
                            output += `Duration: ${minutes} min ${seconds} sec\n`;
                        }
                    }
                    
                    // Add cues/comments if present
                    if (transcriptCues && transcriptCues.value.trim()) {
                        output += `Cues/Comments: ${transcriptCues.value.trim()}\n`;
                    }
                    
                    // Add transcript statistics if present
                    if (transcriptStats && transcriptStats.textContent.trim()) {
                        output += `Statistics: ${transcriptStats.textContent.trim()}\n`;
                    }
                    
                    output += '\n';
                    return; // Skip the standard input processing for this component
                }

                // Check for word list component
                const wordListTextarea = compEl.querySelector('.word-list-textarea');
                const wordListCues = compEl.querySelector('.word-list-cues');
                const wordListStats = compEl.querySelector('.word-list-stats-display');
                
                if (wordListTextarea) {
                    // Handle Word List component
                    output += `${label}\n`;
                    
                    if (wordListTextarea.value.trim()) {
                        output += `Words: ${wordListTextarea.value.trim()}\n`;
                    }
                    
                    if (wordListCues && wordListCues.value.trim()) {
                        output += `Cues/Comments: ${wordListCues.value.trim()}\n`;
                    }
                    
                    if (wordListStats && wordListStats.textContent.trim()) {
                        output += `Statistics: ${wordListStats.textContent.trim()}\n`;
                    }
                    
                    output += '\n';
                    return; // Skip the standard input processing for this component
                }

                // Check for sentence list component
                const sentenceListTextarea = compEl.querySelector('.sentence-list-textarea');
                const sentenceListCues = compEl.querySelector('.sentence-list-cues');
                const sentenceListStats = compEl.querySelector('.sentence-list-stats-display');
                
                if (sentenceListTextarea) {
                    // Handle Sentence List component
                    output += `${label}\n`;
                    
                    if (sentenceListTextarea.value.trim()) {
                        output += `Sentences: ${sentenceListTextarea.value.trim()}\n`;
                    }
                    
                    if (sentenceListCues && sentenceListCues.value.trim()) {
                        output += `Cues/Comments: ${sentenceListCues.value.trim()}\n`;
                    }
                    
                    if (sentenceListStats && sentenceListStats.textContent.trim()) {
                        output += `Statistics: ${sentenceListStats.textContent.trim()}\n`;
                    }
                    
                    output += '\n';
                    return; // Skip the standard input processing for this component
                }

                // Check for practice data table component
                const practiceTable = compEl.querySelector('table.practice-table');
                if (practiceTable) {
                    // Handle Practice Data Table component - only output summary stats, not the table
                    output += `${label}\n`;
                    
                    // Add practice statistics if present (but clean up the formatting)
                    const practiceStats = compEl.querySelector('.swallow-analysis-container');
                    if (practiceStats) {
                        const statsText = practiceStats.textContent.trim();
                        if (statsText) {
                            // Clean up the stats text - remove unnecessary labels and clean formatting
                            const cleanedStats = statsText
                                .replace(/Moving Avg Window:\s*/g, '')
                                .replace(/trials \(max 20\)/g, '')
                                .replace(/\s+/g, ' ')
                                .replace(/\n\s*\n/g, '\n')
                                .trim();
                            
                            if (cleanedStats) {
                                output += `${cleanedStats}\n`;
                            }
                        }
                    }
                    
                    output += '\n';
                    return; // Skip the standard input processing for this component
                }

                // Check for custom data table component - only output label and stats summary
                const customTable = compEl.querySelector('table.custom-data-table');
                if (customTable) {
                    output += `${label}\n`;
                    const customStats = compEl.querySelector('.swallow-stats-display');
                    if (customStats) {
                        // Pull each stats-row text content into the output
                        Array.from(customStats.querySelectorAll('.stats-row')).forEach(row => {
                            output += row.textContent.trim() + '\n';
                        });
                        output += '\n';
                    }
                    return; // Skip the standard input processing for this component
                }

                // Standard text/textarea
                const input = compEl.querySelector('input[type="text"], textarea');
                const stats = compEl.querySelector('.swallow-stats-display');

                // If both input and stats exist, only output the label once, then append stats
                if (input && stats) {
                    output += `${label}\n${input.value.trim()}\n`;
                    Array.from(stats.querySelectorAll('.stats-row')).forEach(row => {
                        output += row.textContent.trim() + '\n';
                    });
                    output += '\n';
                } else if (input) {
                    output += `${label}\n${input.value.trim()}\n\n`;
                } else if (stats) {
                    output += `${label}\n`;
                    Array.from(stats.querySelectorAll('.stats-row')).forEach(row => {
                        output += row.textContent.trim() + '\n';
                    });
                    output += '\n';
                }
            });

            // Copy to clipboard
            if (window.DomUtils) {
                DomUtils.copyToClipboard(output, { button: copyBtn, resetText: 'Copy to Clipboard' });
            } else {
                navigator.clipboard.writeText(output);
            }
        });
    }
});
