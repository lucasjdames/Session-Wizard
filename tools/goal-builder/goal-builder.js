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
});

// --- Section Dropdowns ---
function toggleSection(id, headerEl) {
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