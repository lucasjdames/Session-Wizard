/*
 * Tool: Goal Builder (SMART Goal + Goal Attainment Scale)
 * Responsibilities:
 *  - SMART goal drag & drop composition.
 *  - Goal Attainment Scale (GAS) dynamic table generation (4 or 5 level variant).
 *  - Clipboard and print export of composed goal + GAS table.
 * Notes:
 *  - Uses shared DomUtils for textarea auto-resize, date init, copy, print, and drag-after logic.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize shared utilities
    if (window.DomUtils) {
        DomUtils.autoResizeTextareas();
        DomUtils.initDefaultDates(['#goalDate']);
    }

    // SMART Goal drag/drop wiring
    const blocks = document.querySelectorAll('.sgb-block');
    const dropArea = document.getElementById('sgb-drop-area');
    const goalSentence = document.getElementById('sgb-goal-sentence');
    let draggedBlock = null;
    let draggedDropBlock = null;
    blocks.forEach(block => {
        block.addEventListener('dragstart', function(e) {
            draggedBlock = block;
            e.dataTransfer.effectAllowed = 'move';
        });
    });

    dropArea.addEventListener('dragstart', function(e) {
        if (e.target.classList.contains('sgb-drop-block')) {
            draggedDropBlock = e.target;
            e.dataTransfer.effectAllowed = 'move';
        }
    });

    dropArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        dropArea.classList.add('dragover');
        if (draggedDropBlock) {
            const afterElement = (window.DomUtils && DomUtils.getVerticalAfterElement) ? DomUtils.getVerticalAfterElement(dropArea, e.clientY, '.sgb-drop-block') : null;
            dropArea.querySelectorAll('.sgb-drop-block').forEach(b => b.classList.remove('drag-insert'));
            if (afterElement) {
                afterElement.classList.add('drag-insert');
            }
        }
    });

    dropArea.addEventListener('dragleave', function(e) {
        dropArea.classList.remove('dragover');
        dropArea.querySelectorAll('.sgb-drop-block').forEach(b => b.classList.remove('drag-insert'));
    });

    dropArea.addEventListener('drop', function(e) {
        e.preventDefault();
        dropArea.classList.remove('dragover');
        dropArea.querySelectorAll('.sgb-drop-block').forEach(b => b.classList.remove('drag-insert'));
        if (draggedBlock) {
            if (!dropArea.querySelector(`[data-block='${draggedBlock.dataset.block}']`)) {
                const placeholder = dropArea.querySelector('.sgb-drop-placeholder');
                if (placeholder) placeholder.remove();
                const blockDiv = document.createElement('div');
                blockDiv.className = 'sgb-drop-block';
                blockDiv.dataset.block = draggedBlock.dataset.block;
                blockDiv.setAttribute('draggable', 'true');
                blockDiv.innerHTML = `<span class='sgb-drop-label'>${draggedBlock.dataset.block}:</span> <input type='text' class='sgb-drop-input' placeholder='Enter details...'> <button class='sgb-drop-remove' title='Remove'>&times;</button>`;
                const afterElement = (window.DomUtils && DomUtils.getVerticalAfterElement) ? DomUtils.getVerticalAfterElement(dropArea, e.clientY, '.sgb-drop-block') : null;
                if (afterElement) {
                    dropArea.insertBefore(blockDiv, afterElement);
                } else {
                    dropArea.appendChild(blockDiv);
                }
                updateGoalSentence();
            }
            draggedBlock = null;
        } else if (draggedDropBlock) {
            const afterElement = (window.DomUtils && DomUtils.getVerticalAfterElement) ? DomUtils.getVerticalAfterElement(dropArea, e.clientY, '.sgb-drop-block') : null;
            if (afterElement && afterElement !== draggedDropBlock) {
                dropArea.insertBefore(draggedDropBlock, afterElement);
            } else if (!afterElement) {
                dropArea.appendChild(draggedDropBlock);
            }
            updateGoalSentence();
            draggedDropBlock = null;
        }
    });

    dropArea.addEventListener('click', function(e) {
        if (e.target.classList.contains('sgb-drop-remove')) {
            e.target.parentElement.remove();
            if (dropArea.children.length === 0) {
                dropArea.innerHTML = '<span class="sgb-drop-placeholder">Drag blocks here in order, then fill in details.</span>';
            }
            updateGoalSentence();
        }
    });

    dropArea.addEventListener('input', function(e) {
        if (e.target.classList.contains('sgb-drop-input')) {
            updateGoalSentence();
        }
    });

    function updateGoalSentence() {
        const blocks = dropArea.querySelectorAll('.sgb-drop-block');
        let sentence = '';
        blocks.forEach(block => {
            const val = block.querySelector('.sgb-drop-input').value.trim();
            if (val) sentence += (sentence ? ' ' : '') + val;
        });
        goalSentence.textContent = sentence;
    }

    // --- GAS Builder Logic ---
    const presetHeaders = {
        five: [
            {num: "-2", desc: "If I decline"},
            {num: "-1", desc: "Where I am now"},
            {num: "0", desc: "Where I hope to be following therapy"},
            {num: "+1", desc: "If I make really good progress"},
            {num: "+2", desc: "If I knock it out of the park"}
        ],
        four: [
            {num: "-1", desc: "If I decline"},
            {num: "0", desc: "Where I am now"},
            {num: "+1", desc: "Where I hope to be following therapy"},
            {num: "+2", desc: "If I do even better than I hoped"}
        ]
    };

    function buildTable(levels) {
        const headers = presetHeaders[levels].slice();
        const table = document.getElementById('gasTable');
        table.innerHTML = '';
        const headerRow = document.createElement('tr');
        headers.forEach((header, i) => {
            const th = document.createElement('th');
            th.innerHTML = `<div class="header-num">${header.num}</div><textarea class="header-input" rows="2" style="overflow:hidden;">${header.desc}</textarea>`;
            headerRow.appendChild(th);
        });
        table.appendChild(headerRow);
        const goalRow = document.createElement('tr');
        headers.forEach(() => {
            const td = document.createElement('td');
            td.innerHTML = '<textarea class="goal-input" rows="3" placeholder="Enter goal..." style="overflow:hidden;"></textarea>';
            goalRow.appendChild(td);
        });
        table.appendChild(goalRow);
        // Initialize auto-resize heights after DOM insertion
        if (window.DomUtils) setTimeout(() => DomUtils.autoResizeTextareas(), 0);
    }

    function syncChecklistParent() {
        const parentLabels = Array.from(document.querySelectorAll('.gas-checklist label')).filter(l => {
            const txt = l.textContent.trim();
            return txt.startsWith('The content of each level is:') || txt.startsWith('The phrasing of each level is:');
        });
        parentLabels.forEach(parentLabel => {
            const parent = parentLabel.querySelector('input[type="checkbox"]');
            const childDiv = parentLabel.nextElementSibling;
            if (!childDiv || !childDiv.classList.contains('checklist-child')) return;
            const children = childDiv.querySelectorAll('label input[type="checkbox"]');
            if (!parent || children.length === 0) return;
            children.forEach(child => {
                child.addEventListener('change', () => {
                    parent.checked = Array.from(children).every(c => c.checked);
                });
            });
            parent.addEventListener('change', () => {
                children.forEach(child => {
                    child.checked = parent.checked;
                });
            });
            parent.checked = Array.from(children).every(c => c.checked);
        });
    }

    // --- GAS Table Initialization ---
    const selector = document.getElementById('levelSelector');
    if (selector) {
        selector.addEventListener('change', e => {
            buildTable(e.target.value);
            setTimeout(syncChecklistParent, 0);
        });
        buildTable(selector.value);
    }
    setTimeout(() => {
        if (window.DomUtils) DomUtils.autoResizeTextareas();
        syncChecklistParent();
    }, 0);

    // --- Button Logic (Clipboard/Print) ---
    const copyBtn = document.getElementById('copyClipboardBtn');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const txt = getClipboardText();
            if (window.DomUtils) {
                DomUtils.copyToClipboard(txt, { button: copyBtn, resetText: 'Copy to Clipboard' });
            } else {
                navigator.clipboard.writeText(txt);
            }
        });
    }
    const printBtn = document.getElementById('printPageBtn');
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            const bodyHtml = getPrintableHtml();
            const head = (window.DomUtils && DomUtils.getDefaultPrintHead) ? DomUtils.getDefaultPrintHead() : '';
            if (window.DomUtils) {
                DomUtils.openPrintWindow({ title: 'SMART Goal Builder', bodyHtml, headHtml: head });
            } else {
                const win = window.open('', '_blank');
                win.document.write(`<!DOCTYPE html><html><head><title>Printable Goal Builder</title></head><body style='background:#f7fafd;'>${bodyHtml}<script>window.onload=function(){window.print();}</script></body></html>`);
                win.document.close();
            }
        });
    }

    // Clear All (Aim, SMART Goal, GAS)
    const clearAllBtn = document.getElementById('clearAllBtn');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
            // Use shared confirmation modal for consistency
            const doClear = () => {
                // Clear aim
                try { const aimEl = document.getElementById('aim'); if (aimEl) { aimEl.value = ''; } } catch (e) {}
                // Clear SMART builder blocks
                try { const dropArea = document.getElementById('sgb-drop-area'); if (dropArea) { dropArea.innerHTML = '<span class="sgb-drop-placeholder">Drag blocks here in order, then fill in details.</span>'; } const goalSentence = document.getElementById('sgb-goal-sentence'); if (goalSentence) goalSentence.textContent = ''; } catch (e) {}
                // Reset GAS to five-level default
                try { const sel = document.getElementById('levelSelector'); if (sel) { sel.value = 'five'; buildTable('five'); } } catch (e) {}
                // Clear checklists
                try { document.querySelectorAll('#smart-checklist input[type="checkbox"]').forEach(cb => cb.checked = false); document.querySelectorAll('#gas-checklist input[type="checkbox"]').forEach(cb => cb.checked = false); } catch (e) {}
                // Resize textareas where needed
                try { if (window.DomUtils) DomUtils.autoResizeTextareas(); } catch (e) {}
                // Ensure autosave state is cleared/saved so the cleared page isn't restored
                try {
                    if (window.__tempAutosave && typeof window.__tempAutosave.trySave === 'function') {
                        window.__tempAutosave.trySave();
                    } else if (window.electronSnapshot && typeof window.electronSnapshot.tempSave === 'function' && window.GoalBuilderSnapshot && typeof window.GoalBuilderSnapshot.prepareSnapshot === 'function') {
                        // save an empty/cleared snapshot explicitly
                        const snap = window.GoalBuilderSnapshot.prepareSnapshot();
                        window.electronSnapshot.tempSave((location.pathname || 'goal-builder'), snap).catch(() => {});
                    }
                } catch (e) {}
            };

            if (window.DomUtils && typeof DomUtils.confirmWarning === 'function') {
                DomUtils.confirmWarning({
                    title: 'Clear all content? ',
                    message: 'This will clear the Aim, SMART Goal and GAS builder. This action cannot be undone.',
                    confirmText: 'Yes, clear',
                    cancelText: 'Cancel'
                }).then(confirmed => { if (confirmed) doClear(); });
            } else {
                // fallback to native confirm
                if (confirm('Clear Aim, SMART Goal and GAS builder? This cannot be undone.')) doClear();
            }
        });
    }
});

// --- Section Dropdowns ---
function toggleSection(id, headerEl) {

{
    // no-op placeholder so the toggleSection function body follows correctly
}
    const el = document.getElementById(id);
    if (!el) return;
    // If header element passed, toggle its aria-expanded for accessibility and caret rotation
    if (headerEl && headerEl.setAttribute) {
        const isExpanded = headerEl.getAttribute('aria-expanded') === 'true';
        headerEl.setAttribute('aria-expanded', isExpanded ? 'false' : 'true');
    }
    // Animate via max-height on the sibling .dropdown-content
    // If the content has inline maxHeight set, clear it to collapse; otherwise expand to scrollHeight.
    const content = el; // el is the dropdown-content
    const current = content.style.maxHeight;
    if (current && current !== '0px') {
        // close
        content.style.maxHeight = '0px';
        content.style.padding = '0 0';
    } else {
        // open — set to scrollHeight so transition animates
        content.style.maxHeight = content.scrollHeight + 'px';
        content.style.padding = '';
    }
}

// --- Clipboard/Print Text ---
// --- Snapshot / Restore helpers for Save/Load ---
(function(){
    function serializeDropBlocks() {
        const dropArea = document.getElementById('sgb-drop-area');
        if (!dropArea) return [];
        return Array.from(dropArea.querySelectorAll('.sgb-drop-block')).map(b => ({
            block: b.dataset.block,
            value: b.querySelector('.sgb-drop-input') ? b.querySelector('.sgb-drop-input').value : '',
            html: b.innerHTML
        }));
    }

    function serializeGASTable() {
        const table = document.getElementById('gasTable');
        if (!table) return null;
        const rows = Array.from(table.querySelectorAll('tr'));
        const headerRow = rows[0];
        const goalRow = rows[1];
        const headers = Array.from(headerRow.children).map(th => ({
            num: th.querySelector('.header-num')?.textContent || '',
            desc: th.querySelector('.header-input')?.value || ''
        }));
        const goals = Array.from(goalRow.children).map(td => td.querySelector('.goal-input')?.value || '');
        return { headers, goals };
    }

    function serializeChecklists() {
        const result = {};
        // SMART checklist
        const smart = document.querySelectorAll('#smart-checklist input[type="checkbox"]');
        result.smart = Array.from(smart).map(ch => ({ checked: !!ch.checked, label: ch.parentElement?.textContent?.trim?.() }));
        // GAS checklist (including checklist-child items)
        const gas = document.querySelectorAll('#gas-checklist input[type="checkbox"]');
        result.gas = Array.from(gas).map(ch => ({ checked: !!ch.checked, label: ch.parentElement?.textContent?.trim?.() }));
        // Dropdown expanded states (header elements with class dropdown-header)
        result.dropdowns = {};
        Array.from(document.querySelectorAll('.dropdown-header')).forEach(h => {
            const next = h.nextElementSibling;
            if (next && next.id) result.dropdowns[next.id] = (h.getAttribute('aria-expanded') === 'true');
        });
        // level selector value
        result.levelSelector = document.getElementById('levelSelector') ? document.getElementById('levelSelector').value : null;
        return result;
    }

    function prepareSnapshot() {
        const patient = document.getElementById('patientName')?.value || '';
        const date = document.getElementById('goalDate')?.value || '';
        const aim = document.getElementById('aim')?.value || '';
        const blocks = serializeDropBlocks();
        const gas = serializeGASTable();
        const checklists = serializeChecklists();
        return {
            version: 1,
            tool: 'goal-builder',
            created: new Date().toISOString(),
            meta: { patient, date, aim },
            blocks, gas, checklists
        };
    }

    function restoreDropBlocks(blocks) {
        const dropArea = document.getElementById('sgb-drop-area');
        if (!dropArea) return;
        dropArea.innerHTML = '';
        if (!blocks || blocks.length === 0) {
            dropArea.innerHTML = '<span class="sgb-drop-placeholder">Drag blocks here in order, then fill in details.</span>';
            return;
        }
        blocks.forEach(b => {
            const div = document.createElement('div');
            div.className = 'sgb-drop-block';
            div.dataset.block = b.block || '';
            div.setAttribute('draggable', 'true');
            // recreate structure; prefer HTML if provided for fidelity
            if (b.html) div.innerHTML = b.html;
            else div.innerHTML = `<span class='sgb-drop-label'>${b.block}:</span> <input type='text' class='sgb-drop-input' placeholder='Enter details...'> <button class='sgb-drop-remove' title='Remove'>&times;</button>`;
            // If snapshot captured an input value, set it on the created element (value may be a property, not attribute)
            try {
                const inp = div.querySelector('.sgb-drop-input');
                if (inp && typeof b.value !== 'undefined') {
                    inp.value = b.value;
                }
            } catch (e) {}
            dropArea.appendChild(div);
        });
        // Recompute SMART goal sentence from restored blocks
        try {
            const goalSentence = document.getElementById('sgb-goal-sentence');
            if (goalSentence) {
                const parts = [];
                Array.from(dropArea.querySelectorAll('.sgb-drop-block')).forEach(block => {
                    const v = block.querySelector('.sgb-drop-input') ? (block.querySelector('.sgb-drop-input').value || '').trim() : '';
                    if (v) parts.push(v);
                });
                goalSentence.textContent = parts.join(' ');
            }
        } catch (e) {}
    }

    function restoreGASTable(gas) {
        const selector = document.getElementById('levelSelector');
        if (!gas) return;
        const table = document.getElementById('gasTable');
        if (!table) return;
        // Rebuild headers and goals from gas structure
        const headers = gas.headers || [];
        const goals = gas.goals || [];
        table.innerHTML = '';
        const headerRow = document.createElement('tr');
        headers.forEach((h, i) => {
            const th = document.createElement('th');
            th.innerHTML = `<div class="header-num">${h.num || ''}</div><textarea class="header-input" rows="2" style="overflow:hidden;">${h.desc || ''}</textarea>`;
            headerRow.appendChild(th);
        });
        table.appendChild(headerRow);
        const goalRow = document.createElement('tr');
        headers.forEach((_, i) => {
            const td = document.createElement('td');
            td.innerHTML = `<textarea class="goal-input" rows="3" placeholder="Enter goal..." style="overflow:hidden;">${goals[i] || ''}</textarea>`;
            goalRow.appendChild(td);
        });
        table.appendChild(goalRow);
        if (window.DomUtils) setTimeout(() => DomUtils.autoResizeTextareas(), 0);
    }

    function restoreChecklists(snapshotChecks) {
        if (!snapshotChecks) return;
        try {
            const smartInputs = Array.from(document.querySelectorAll('#smart-checklist input[type="checkbox"]'));
            (snapshotChecks.smart || []).forEach((s, i) => {
                if (smartInputs[i]) smartInputs[i].checked = !!s.checked;
            });
        } catch (e) {}
        try {
            const gasInputs = Array.from(document.querySelectorAll('#gas-checklist input[type="checkbox"]'));
            (snapshotChecks.gas || []).forEach((s, i) => {
                if (gasInputs[i]) gasInputs[i].checked = !!s.checked;
            });
        } catch (e) {}
        try {
            // restore dropdown expanded states
            const dropdowns = snapshotChecks.dropdowns || {};
            Object.keys(dropdowns).forEach(id => {
                const expanded = !!dropdowns[id];
                const header = Array.from(document.querySelectorAll('.dropdown-header')).find(h => h.nextElementSibling && h.nextElementSibling.id === id);
                const content = document.getElementById(id);
                if (header) header.setAttribute('aria-expanded', expanded ? 'true' : 'false');
                if (content) {
                    if (expanded) { content.style.maxHeight = content.scrollHeight + 'px'; content.style.padding = ''; }
                    else { content.style.maxHeight = '0px'; content.style.padding = '0 0'; }
                }
            });
        } catch (e) {}
        try {
            if (snapshotChecks.levelSelector && document.getElementById('levelSelector')) {
                // set value but do NOT dispatch change (that would rebuild the GAS table and overwrite snapshot restore)
                document.getElementById('levelSelector').value = snapshotChecks.levelSelector;
            }
        } catch (e) {}
    }

    function _formatSnapshotFilename(snapshot, toolName) {
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const meta = snapshot && snapshot.meta ? snapshot.meta : {};
        // remove all non-alphanumeric characters and ignore whitespace (don't replace with hyphen)
    const rawName = String(meta.patient || meta.clientName || meta.patientName || 'session');
    // Normalize unicode and strip diacritics (NFKD), then remove non-alphanumerics
    const normalized = rawName.normalize ? rawName.normalize('NFKD').replace(/\p{Diacritic}/gu, '') : rawName;
    const patient = normalized.replace(/[^0-9A-Za-z]/g, '');
        // Parse date as local for YYYY-MM-DD to avoid timezone shifts
        let d = null;
        if (meta.date && /^\d{4}-\d{2}-\d{2}$/.test(meta.date)) {
            const parts = meta.date.split('-');
            d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        } else if (meta.date) {
            d = new Date(meta.date);
        }
        if (!d || isNaN(d.getTime())) d = new Date();
        const day = String(d.getDate()).padStart(2,'0');
        const mon = months[d.getMonth()];
        const year = d.getFullYear();
        return `${patient}-${day}${mon}${year}-${toolName}.json`;
    }

    async function saveSnapshotToFile(snapshot) {
        const filename = _formatSnapshotFilename(snapshot, 'GoalBuilder');
        // prefer electron.saveFile if available via preload
        if (window.electron && typeof window.electron.saveFile === 'function') {
            try {
                const res = await window.electron.saveFile({ defaultPath: filename, filters: [{ name: 'JSON', extensions: ['json'] }], data: JSON.stringify(snapshot, null, 2) });
                return res;
            } catch (e) { /* fallthrough to browser save */ }
        }
        // browser fallback: create blob and trigger download
        try {
            const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            return { canceled: false };
        } catch (e) { return { canceled: true, error: e.message } }
    }

    async function loadSnapshotFromFile() {
        // Try electron.openFile first
        if (window.electron && typeof window.electron.openFile === 'function') {
            try {
                const res = await window.electron.openFile({ filters: [{ name: 'JSON', extensions: ['json'] }] });
                if (res && res.canceled) return null;
                const path = res.filePaths && res.filePaths[0];
                if (!path) return null;
                // Use electronOn.readFile if available
                if (window.electronOn && typeof window.electronOn.readFile === 'function') {
                    const read = await window.electronOn.readFile(path, 'utf8');
                    if (read && read.success) return JSON.parse(read.data);
                    return null;
                }
                // fallback to fetch file using file:// URL
                try {
                    const text = await fetch('file:///' + path.replace(/\\/g, '/')).then(r => r.text());
                    return JSON.parse(text);
                } catch (e) { return null; }
            } catch (e) { /* fallthrough to browser file picker */ }
        }
        // Browser fallback: file input
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json,application/json';
            input.addEventListener('change', () => {
                const f = input.files[0];
                if (!f) return resolve(null);
                const reader = new FileReader();
                reader.onload = () => { try { resolve(JSON.parse(reader.result)); } catch (e) { resolve(null); } };
                reader.onerror = () => resolve(null);
                reader.readAsText(f);
            });
            input.click();
        });
    }

    function restoreSnapshot(snapshot) {
        if (!snapshot || snapshot.tool !== 'goal-builder') return false;
        const meta = snapshot.meta || {};
        if (document.getElementById('patientName')) document.getElementById('patientName').value = meta.patient || '';
        if (document.getElementById('goalDate')) document.getElementById('goalDate').value = meta.date || '';
        if (document.getElementById('aim')) document.getElementById('aim').value = meta.aim || '';
        restoreDropBlocks(snapshot.blocks || []);
        restoreGASTable(snapshot.gas || null);
        restoreChecklists(snapshot.checklists || null);
        // re-run DOM utilities to rebind events and sizing
        setTimeout(() => {
            if (window.DomUtils) {
                DomUtils.autoResizeTextareas();
            }
            try { syncChecklistParent(); } catch (e) {}
        }, 0);
        return true;
    }

    // Expose to global for quick testing and internal usage
    window.GoalBuilderSnapshot = { prepareSnapshot, restoreSnapshot, saveSnapshotToFile, loadSnapshotFromFile };

    // Wire native menu events via preload-exposed electronOn
    try {
        if (window.electronOn && typeof window.electronOn.on === 'function') {
            window.electronOn.on('menu:save-session', async () => {
                const snap = prepareSnapshot();
                await saveSnapshotToFile(snap);
            });
            window.electronOn.on('menu:load-session', async () => {
                const snap = await loadSnapshotFromFile();
                if (snap) restoreSnapshot(snap);
            });
        } else {
            // fallback to listening to window events
            window.addEventListener('menu:save-session', async () => { const snap = prepareSnapshot(); await saveSnapshotToFile(snap); });
            window.addEventListener('menu:load-session', async () => { const snap = await loadSnapshotFromFile(); if (snap) restoreSnapshot(snap); });
        }
    } catch (e) { /* ignore wiring errors */ }

})();
function getClipboardText() {
    const patient = document.getElementById('patientName')?.value?.trim() || '';
    const date = document.getElementById('goalDate')?.value?.trim() || '';
    const aim = document.getElementById('aim')?.value?.trim() || '';
    let text = '';
    if (patient) text += `Patient: ${patient}\n`;
    if (date) text += `Date: ${date}\n`;
    if (aim) text += `Aim: ${aim}\n`;
    // SMART Goal from drag-and-drop builder
    const goalSentence = document.getElementById('sgb-goal-sentence')?.textContent?.trim() || '';
    if (goalSentence) text += `SMART Goal: ${goalSentence}\n`;
    text += '\n';
    // GAS Table
    const table = document.getElementById('gasTable');
    if (table) {
        const headerRow = table.querySelector('tr');
        const goalRow = table.querySelectorAll('tr')[1];
        if (headerRow && goalRow) {
            const headers = Array.from(headerRow.children).map(th => {
                const num = th.querySelector('.header-num')?.textContent?.trim() || '';
                const desc = th.querySelector('.header-input')?.value?.trim() || '';
                return { num, desc };
            });
            const goals = Array.from(goalRow.children).map(td => td.querySelector('.goal-input')?.value?.trim() || '');
            headers.forEach((header, i) => {
                text += `${header.num}: ${header.desc}\n    Goal: ${goals[i]}\n`;
            });
        }
    }
    return text;
}

function getPrintableHtml() {
    const patient = document.getElementById('patientName')?.value?.trim() || '';
    const date = document.getElementById('goalDate')?.value?.trim() || '';
    const aim = document.getElementById('aim')?.value?.trim() || '';
    const goalSentence = document.getElementById('sgb-goal-sentence')?.textContent?.trim() || '';
    let html = `<div style='max-width:800px;margin:2em auto;padding:2em;background:#fff;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,0.08);font-family:Segoe UI,Arial,sans-serif;'>`;
    // Header for the printable export should be 'Goal Builder'
    html += `<h1 style='color:#1976d2;margin-bottom:0.3em;'>Goal Builder</h1>`;
    // Patient / Date / Aim come next
    html += `<div style='margin-bottom:0.5em;'><strong>Patient:</strong> ${patient}</div>`;
    html += `<div style='margin-bottom:0.5em;'><strong>Date:</strong> ${date}</div>`;
    if (aim) {
        html += `<div style='margin-bottom:1em;'><strong>Aim:</strong> ${aim}</div>`;
    }
    // Then the SMART Goal section
    if (goalSentence) {
        html += `<h2 style='color:#1976d2;margin-bottom:0.7em;'>SMART Goal</h2>`;
        html += `<div style='margin-bottom:1em;'><strong>SMART Goal:</strong> ${goalSentence}</div>`;
    }
    // Then the GAS heading and table
    html += `<h2 style='color:#1976d2;margin-bottom:0.7em;'>Goal Attainment Scale</h2>`;
    // GAS Table
    const table = document.getElementById('gasTable');
    if (table) {
        const headerRow = table.querySelector('tr');
        const goalRow = table.querySelectorAll('tr')[1];
        if (headerRow && goalRow) {
            const headers = Array.from(headerRow.children).map(th => {
                const num = th.querySelector('.header-num')?.textContent?.trim() || '';
                const desc = th.querySelector('.header-input')?.value?.trim() || '';
                return { num, desc };
            });
            const goals = Array.from(goalRow.children).map(td => td.querySelector('.goal-input')?.value?.trim() || '');
            html += '<table style="width:100%;border-collapse:collapse;margin-top:1.5em;font-family:Segoe UI,Arial,sans-serif;">';
            html += '<tr>' + headers.map(h => `<th style="border:1px solid #bbb;padding:0.7em 0.3em;background:#e3e8ee;font-size:1.05em;">${h.num}<br><span style="font-weight:400;font-size:0.97em;">${h.desc}</span></th>`).join('') + '</tr>';
            html += '<tr>' + goals.map(g => `<td style="border:1px solid #bbb;padding:0.7em 0.3em;font-size:1em;">${g}</td>`).join('') + '</tr>';
            html += '</table>';
        }
    }
    html += `</div>`;
    return html;
}