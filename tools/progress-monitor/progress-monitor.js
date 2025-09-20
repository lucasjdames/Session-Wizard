/*
 * Tool: Progress Monitor
 * Responsibilities:
 *  - Dynamic multi-date performance table with add/remove rows & columns.
 *  - CSV export/import preserving section structure & meta fields.
 *  - Clipboard + print-friendly output generation.
 * Notes:
 *  - Uses shared DomUtils for textarea auto-resize and date init; uses copy/print helpers.
 */

document.addEventListener('DOMContentLoaded', function() {
    if (window.DomUtils) {
        DomUtils.autoResizeTextareas();
        DomUtils.initDefaultDates(['#goalDate']);
    }
    // Date is initialized by DomUtils.initDefaultDates

    // Add initial delete buttons to date columns
    document.querySelectorAll('#pmDateRow th.pm-date-col').forEach(th => {
        if (!th.querySelector('.pm-del-date-btn')) {
            const delBtn = document.createElement('button');
            delBtn.className = 'pm-del-date-btn';
            delBtn.title = 'Delete this date column';
            delBtn.innerHTML = '&times;';
            delBtn.style.marginLeft = '0.3em';
            th.appendChild(delBtn);
        }
    });

    // Add initial delete buttons to rows
    document.querySelectorAll('.pm-row').forEach(row => {
        const actionTd = row.lastElementChild;
        if (actionTd && actionTd.querySelector('.pm-add-row-btn') && !actionTd.querySelector('.pm-del-row-btn')) {
            const delBtn = document.createElement('button');
            delBtn.className = 'pm-del-row-btn';
            delBtn.title = 'Delete row';
            delBtn.innerHTML = '&times;';
            delBtn.style.marginLeft = '0.5em';
            actionTd.appendChild(delBtn);
        }
    });

    // --- Main Event Delegation for the whole tool ---

    // Main action buttons (Export, Import, Copy, Print) - event delegation on document.body
    document.body.addEventListener('click', function(event) {
        const target = event.target;
        // DEBUG: Log all button clicks
        if (target.tagName === 'BUTTON') {
            console.log('Button clicked:', target.id, target.className);
        }
        if (target.id === 'exportCsvBtn') {
            exportTableToCSV('progress-monitor-data.csv');
        } else if (target.id === 'importCsvBtn') {
            document.getElementById('importCsvInput').click();
        } else if (target.id === 'copyClipboardBtn') {
            const txt = getClipboardText();
            if (window.DomUtils) {
                DomUtils.copyToClipboard(txt, { button: target, resetText: 'Copy to Clipboard' });
            } else {
                navigator.clipboard.writeText(txt);
            }
        } else if (target.id === 'printPageBtn') {
            const html = getPrintableHtml();
            const head = (window.DomUtils && DomUtils.getDefaultPrintHead) ? DomUtils.getDefaultPrintHead() : '';
            if (window.DomUtils) {
                DomUtils.openPrintWindow({ title: 'Progress Monitor', bodyHtml: html, headHtml: head, autoPrint: true });
            } else {
                const win = window.open('', '_blank');
                win.document.write(`<!DOCTYPE html><html><head><title>Printable Progress Monitor</title></head><body style='background:#f7fafd;'>${bodyHtml}<script>window.onload=function(){window.print();}</script></body></html>`);
                win.document.close();
            }
        }
    });

    // File input change handler
    const fileInput = document.getElementById('importCsvInput');
    if (fileInput) {
        fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                importCSVToTable(file);
            }
            // Reset file input to allow re-importing the same file
            event.target.value = '';
        });
    }

    // Table-wide actions (Add/Delete Rows/Cols)
    const table = document.getElementById('pmTable');
    if (table) {
        table.addEventListener('click', function(event) {
            const target = event.target.closest('button');
            if (!target) return;

            // Handle Add Date Column
            if (target.id === 'addDateBtn') {
                const dateRow = document.getElementById('pmDateRow');
                const newTh = document.createElement('th');
                newTh.className = 'pm-date-col';
                
                const dateInput = document.createElement('input');
                dateInput.type = 'date';
                dateInput.className = 'pm-date-input';
                newTh.appendChild(dateInput);

                const delBtn = document.createElement('button');
                delBtn.className = 'pm-del-date-btn';
                delBtn.title = 'Delete this date column';
                delBtn.innerHTML = '&times;';
                delBtn.style.marginLeft = '0.3em';
                newTh.appendChild(delBtn);
                
                dateRow.insertBefore(newTh, target.parentElement);

                document.querySelectorAll('.pm-row').forEach(row => {
                    const newTd = document.createElement('td');
                    const input = document.createElement('textarea');
                    input.className = 'pm-table-input';
                    newTd.appendChild(input);
                    row.insertBefore(newTd, row.lastElementChild);
                });
            }

            // Handle Delete Date Column
            if (target.classList.contains('pm-del-date-btn')) {
                if (confirm('Delete this date column and all its data?')) {
                    const thToDelete = target.closest('th');
                    const dateRow = document.getElementById('pmDateRow');
                    const idx = Array.from(dateRow.children).indexOf(thToDelete);
                    thToDelete.remove();
                    document.querySelectorAll('.pm-row').forEach(row => {
                        if (row.children[idx]) row.children[idx].remove();
                    });
                }
            }

            // Handle Add Row
            if (target.classList.contains('pm-add-row-btn')) {
                const section = target.getAttribute('data-section');
                const currentRow = target.closest('tr');
                const newRow = document.createElement('tr');
                newRow.className = 'pm-row';
                newRow.setAttribute('data-section', section);

                let placeholder = '';
                if (section === 'task') placeholder = 'Task Steps...';
                else if (section === 'prompts') placeholder = 'Prompts/Supports...';
                else if (section === 'motivational') placeholder = 'Motivational...';
                else placeholder = 'Other...';

                const labelTd = document.createElement('td');
                labelTd.className = 'pm-row-label';
                const labelInput = document.createElement('textarea');
                labelInput.className = 'pm-table-input pm-label-input';
                labelInput.placeholder = placeholder;
                labelTd.appendChild(labelInput);
                newRow.appendChild(labelTd);

                const dateCols = document.getElementById('pmDateRow').querySelectorAll('th.pm-date-col').length;
                for (let i = 0; i < dateCols; i++) {
                    const td = document.createElement('td');
                    const input = document.createElement('textarea');
                    input.className = 'pm-table-input';
                    td.appendChild(input);
                    newRow.appendChild(td);
                }

                const actionTd = document.createElement('td');
                const addBtn = document.createElement('button');
                addBtn.className = 'pm-add-row-btn';
                addBtn.setAttribute('data-section', section);
                addBtn.title = 'Add row';
                addBtn.textContent = '+';
                actionTd.appendChild(addBtn);

                const delBtn = document.createElement('button');
                delBtn.className = 'pm-del-row-btn';
                delBtn.title = 'Delete row';
                delBtn.innerHTML = '&times;';
                delBtn.style.marginLeft = '0.5em';
                actionTd.appendChild(delBtn);
                newRow.appendChild(actionTd);

                currentRow.after(newRow);
            }

            // Handle Delete Row
            if (target.classList.contains('pm-del-row-btn')) {
                const rowToDelete = target.closest('tr');
                const section = rowToDelete.getAttribute('data-section');
                const rowsInSection = Array.from(table.querySelectorAll(`.pm-row[data-section="${section}"]`));

                if (rowsInSection.length <= 1) {
                    alert('You cannot delete the only row under this section.');
                    return;
                }

                if (confirm('Delete this row?')) {
                    rowToDelete.remove();
                }
            }
        });
    }
});

function getClipboardText() {
    // Timewise comparison format, cleaned up and with meta info
    const patient = document.getElementById('patientName')?.value?.trim() || '';
    const date = document.getElementById('goalDate')?.value?.trim() || '';
    const target = document.getElementById('target')?.value?.trim() || '';
    const trainingPhase = document.getElementById('trainingPhase')?.value?.trim() || '';
    const summary = document.querySelector('input[name="summaryMeasure"]:checked')?.value || '';
    let otherSummary = '';
    if (summary === 'Other') {
        otherSummary = document.getElementById('otherSummary')?.value?.trim() || '';
    }
    let output = '';
    output += '==== Progress Monitor Summary ====' + '\n';
    if (patient) output += `Patient: ${patient}\n`;
    if (date) output += `Date: ${date}\n`;
    if (target) output += `Target: ${target}\n`;
    if (trainingPhase) output += `Training Phase: ${trainingPhase}\n`;
    output += `Summary Measure: ${summary}${otherSummary ? ' - ' + otherSummary : ''}\n`;
    output += '\n';
    // Table data
    const dateHeaderCells = Array.from(document.querySelectorAll('#pmDateRow th.pm-date-col'));
    const dateValues = dateHeaderCells.map(th => th.querySelector('input.pm-date-input')?.value || '');
    // Group rows by their nearest previous editable subheader
    const tbodyChildren = Array.from(document.querySelectorAll('.pm-table-section tbody > *'));
    let currentSection = null;
    let sectionRowsMap = {};
    tbodyChildren.forEach(el => {
        if (el.classList.contains('pm-editable-subheader')) {
            const input = el.querySelector('.pm-subheader-input');
            currentSection = input ? input.value.trim() : '';
            if (!sectionRowsMap[currentSection]) sectionRowsMap[currentSection] = [];
        } else if (el.classList.contains('pm-row')) {
            if (currentSection) {
                sectionRowsMap[currentSection].push(el);
            }
        }
    });
    // Output each section and its rows
    Object.entries(sectionRowsMap).forEach(([sectionName, rows]) => {
        output += `Section: ${sectionName}\n`;
        rows.forEach(row => {
            const label = row.querySelector('.pm-label-input')?.value.trim() || '';
            output += `${label}\n`;
            dateValues.forEach((date, colIndex) => {
                const dataCell = row.children[colIndex + 1];
                const data = dataCell?.querySelector('.pm-table-input')?.value || '';
                output += `  - ${date}: ${data}\n`;
            });
            output += '\n';
        });
        output += '\n'; // Extra newline between sections
    });
    return output.trim();
}

function getPrintableHtml() {
    const patient = document.getElementById('patientName')?.value?.trim() || '';
    const date = document.getElementById('goalDate')?.value?.trim() || '';
    const target = document.getElementById('target')?.value?.trim() || '';
    const trainingPhase = document.getElementById('trainingPhase')?.value?.trim() || '';

    // Start building HTML
    let html = `<div style="font-family: Segoe UI, Arial, sans-serif; max-width: 95%; margin: auto; padding: 1em; background: #fff;">`;
    html += `<h1 style="color: #1976d2; border-bottom: 2px solid #1976d2; padding-bottom: 0.5em;">Progress Monitor Report</h1>`;

    // Meta Info
    html += `<div style="margin-bottom: 1.5em; padding: 1em; background: #f7fafd; border-radius: 8px; font-size: 0.9em;">`;
    if (patient) html += `<p style="margin: 0.5em 0;"><strong>Patient:</strong> ${patient}</p>`;
    if (date) html += `<p style="margin: 0.5em 0;"><strong>Date Created:</strong> ${date}</p>`;
    if (target) html += `<p style="margin: 0.5em 0;"><strong>Target:</strong> ${target}</p>`;
    if (trainingPhase) html += `<p style="margin: 0.5em 0;"><strong>Training Phase:</strong> ${trainingPhase}</p>`;
    
    const summary = document.querySelector('input[name="summaryMeasure"]:checked')?.value || '';
    let otherSummary = '';
    if (summary === 'Other') {
        otherSummary = document.getElementById('otherSummary')?.value?.trim() || '';
    }
    html += `<p style="margin: 0.5em 0;"><strong>Summary Measure:</strong> ${summary}${otherSummary ? ' - ' + otherSummary : ''}</p>`;
    html += `</div>`;

    // Table
    html += `<table style="width: 100%; border-collapse: collapse; font-size: 0.85em;">`;
    
    const dateHeaderCells = Array.from(document.querySelectorAll('#pmDateRow th.pm-date-col'));
    const dateValues = dateHeaderCells.map(th => th.querySelector('input.pm-date-input')?.value || 'N/A');
    html += `<thead><tr>`;
    html += `<th style="background: #e3e8ee; padding: 0.6em; border: 1px solid #ccc; text-align: left;">Measure</th>`;
    dateValues.forEach(dateVal => {
        html += `<th style="background: #e3e8ee; padding: 0.6em; border: 1px solid #ccc;">${dateVal}</th>`;
    });
    html += `</tr></thead>`;

    // Table Body
    html += `<tbody>`;
    document.querySelectorAll('.pm-editable-subheader').forEach(subheader => {
        // Defensive: skip if nextElementSibling is not a .pm-row
        let nextRow = subheader.nextElementSibling;
        if (!nextRow || !nextRow.classList.contains('pm-row')) return;
        const input = subheader.querySelector('.pm-subheader-input');
        const sectionName = input ? input.value.trim() : '';
        html += `<tr><td colspan="${dateValues.length + 1}" style="background: #f7fafd; font-weight: bold; color: #1976d2; padding: 0.6em; border: 1px solid #ccc;">${sectionName}</td></tr>`;
        const section = nextRow.getAttribute('data-section');
        const rowsInSection = document.querySelectorAll(`.pm-row[data-section="${section}"]`);
        rowsInSection.forEach(row => {
            const label = row.querySelector('.pm-label-input')?.value.trim() || row.querySelector('.pm-label-input')?.placeholder.trim();
            html += `<tr>`;
            html += `<td style="font-weight: 600; padding: 0.6em; border: 1px solid #ccc; text-align: left;">${label}</td>`;
            dateHeaderCells.forEach((_, colIndex) => {
                const dataCell = row.children[colIndex + 1];
                const data = dataCell?.querySelector('.pm-table-input')?.value.trim().replace(/\n/g, '<br>') || '';
                html += `<td style="padding: 0.6em; border: 1px solid #ccc; vertical-align: top;">${data}</td>`;
            });
            html += `</tr>`;
        });
    });
    html += `</tbody></table></div>`;
    return html;
}

function formatCSVField(data) {
    if (data === null || data === undefined) return '';
    let str = String(data);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        str = str.replace(/"/g, '""');
        str = `"${str}"`;
    }
    return str;
}

function exportTableToCSV(filename) {
    // Defensive check for required elements
    const dateHeaderCells = Array.from(document.querySelectorAll('#pmDateRow th.pm-date-col'));
    if (!dateHeaderCells.length) {
        alert('No date columns found. Please check your table.');
        return;
    }

    let csv = [];

    // Meta Data
    csv.push(['Meta', 'Key', 'Value']);
    csv.push(['Meta', 'Patient', document.getElementById('patientName')?.value || '']);
    csv.push(['Meta', 'Date Created', document.getElementById('goalDate')?.value || '']);
    csv.push(['Meta', 'Target', document.getElementById('target')?.value || '']);
    csv.push(['Meta', 'Training Phase', document.getElementById('trainingPhase')?.value || '']);
    const summary = document.querySelector('input[name="summaryMeasure"]:checked')?.value || '';
    let otherSummary = '';
    if (summary === 'Other') {
        otherSummary = document.getElementById('otherSummary')?.value?.trim() || '';
    }
    csv.push(['Meta', 'Summary Measure', summary]);
    csv.push(['Meta', 'Other Summary', otherSummary]);
    csv.push([]); // Spacer row

    // Header Row
    let headerRow = ['Section', 'Measure'];
    dateHeaderCells.forEach(th => {
        let dateValue = th.querySelector('input.pm-date-input')?.value;
        if (dateValue) {
            const d = new Date(dateValue);
            if (!isNaN(d.getTime())) {
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                dateValue = `${yyyy}-${mm}-${dd}`;
            }
        }
        headerRow.push(dateValue || 'N/A');
    });
    csv.push(headerRow);

    // Data Rows
    document.querySelectorAll('.pm-editable-subheader').forEach(subheader => {
        // Defensive: skip if nextElementSibling is not a .pm-row
        let nextRow = subheader.nextElementSibling;
        if (!nextRow || !nextRow.classList.contains('pm-row')) return;
        const input = subheader.querySelector('.pm-subheader-input');
        const sectionName = input ? input.value.trim() : '';
        const section = nextRow.getAttribute('data-section');
        const rowsInSection = document.querySelectorAll(`.pm-row[data-section="${section}"]`);
        rowsInSection.forEach(row => {
            let dataRow = [];
            dataRow.push(sectionName);
            const label = row.querySelector('.pm-label-input')?.value.trim() || '';
            dataRow.push(label);
            dateHeaderCells.forEach((_, colIndex) => {
                const dataCell = row.children[colIndex + 1];
                const data = dataCell?.querySelector('.pm-table-input')?.value || '';
                dataRow.push(data);
            });
            csv.push(dataRow);
        });
    });


    // Convert to CSV string
    const toField = (window.DataUtils && DataUtils.formatCSVField) ? DataUtils.formatCSVField : formatCSVField;
    const csvString = csv.map(row => row.map(toField).join(',')).join('\n');

    // Download
    try {
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            alert('Download not supported in this browser.');
        }
    } catch (err) {
        alert('CSV export failed: ' + err.message);
    }
}

function importCSVToTable(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
    const parser = (window.DataUtils && DataUtils.parseCSV) ? DataUtils.parseCSV : parseCSV;
    const { meta, headers, data } = parser(text);

        document.getElementById('patientName').value = meta['Patient'] || '';
        document.getElementById('goalDate').value = meta['Date Created'] || '';
        document.getElementById('target').value = meta['Target'] || '';
        document.getElementById('trainingPhase').value = meta['Training Phase'] || '';
        const summaryMeasure = meta['Summary Measure'];
        if (summaryMeasure) {
            const radio = document.querySelector(`input[name="summaryMeasure"][value="${summaryMeasure}"]`);
            if (radio) radio.checked = true;
        }
        if (meta['Other Summary']) {
            document.getElementById('otherSummary').value = meta['Other Summary'];
        }

        const tableBody = document.querySelector('#pmTable tbody');
        tableBody.innerHTML = '';
        const dateRow = document.getElementById('pmDateRow');
        // Clear existing date columns, but keep the first (label) and last (actions) th
        const dateCols = dateRow.querySelectorAll('.pm-date-col');
        dateCols.forEach(col => col.remove());


        const dateHeaders = headers.slice(2);
        const addDateBtnCell = dateRow.querySelector('#addDateBtn').parentElement;
        dateHeaders.forEach(dateStr => {
            const newTh = document.createElement('th');
            newTh.className = 'pm-date-col';
            const dateInput = document.createElement('input');
            dateInput.type = 'date';
            dateInput.className = 'pm-date-input';
            dateInput.value = dateStr === 'N/A' ? '' : dateStr;
            newTh.appendChild(dateInput);

            const delBtn = document.createElement('button');
            delBtn.className = 'pm-del-date-btn';
            delBtn.title = 'Delete this date column';
            delBtn.innerHTML = '&times;';
            delBtn.style.marginLeft = '0.3em';
            newTh.appendChild(delBtn);
            dateRow.insertBefore(newTh, addDateBtnCell);
        });

        let currentSection = '';
        data.forEach(rowData => {
            const sectionName = rowData.Section;
            if (sectionName !== currentSection) {
                currentSection = sectionName;
                const subheaderRow = document.createElement('tr');
                subheaderRow.innerHTML = `<td colspan="${headers.length}" class="pm-subheader">${sectionName}</td>`;
                tableBody.appendChild(subheaderRow);
            }

            const newRow = document.createElement('tr');
            newRow.className = 'pm-row';
            let sectionId = '';
            if (sectionName === 'Task Description/Steps') sectionId = 'task';
            else if (sectionName === 'Ingredients - Prompts and Supports') sectionId = 'prompts';
            else if (sectionName === 'Ingredients - Motivational') sectionId = 'motivational';
            else if (sectionName === 'Other Measures') sectionId = 'other';
            else sectionId = 'other';
            newRow.setAttribute('data-section', sectionId);

            const labelTd = document.createElement('td');
            labelTd.className = 'pm-row-label';
            const labelInput = document.createElement('textarea');
            labelInput.className = 'pm-table-input pm-label-input';
            labelInput.value = rowData.Measure;
            labelTd.appendChild(labelInput);
            newRow.appendChild(labelTd);

            dateHeaders.forEach(header => {
                const td = document.createElement('td');
                const input = document.createElement('textarea');
                input.className = 'pm-table-input';
                input.value = rowData[header] || '';
                td.appendChild(input);
                newRow.appendChild(td);
            });

            const actionTd = document.createElement('td');
            const addBtn = document.createElement('button');
            addBtn.className = 'pm-add-row-btn';
            addBtn.setAttribute('data-section', sectionId);
            addBtn.title = 'Add row';
            addBtn.textContent = '+';
            actionTd.appendChild(addBtn);

            const delBtn = document.createElement('button');
            delBtn.className = 'pm-del-row-btn';
            delBtn.title = 'Delete row';
            delBtn.innerHTML = '&times;';
            delBtn.style.marginLeft = '0.5em';
            actionTd.appendChild(delBtn);
            newRow.appendChild(actionTd);

            tableBody.appendChild(newRow);
        });
        
        if (window.DomUtils) DomUtils.autoResizeTextareas({ selector: 'textarea.pm-table-input' });
    };
    reader.readAsText(file);
}

function parseCSV(text) {
    const lines = text.replace(/\r/g, '').split('\n');
    const meta = {};
    let headers = [];
    const data = [];
    let isDataSection = false;

    for (const line of lines) {
        if (!line.trim()) continue;

        // Use a regex to split the CSV line to handle quoted fields
        const parts = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
        const cleanedParts = parts.map(p => p.replace(/^"|"$/g, '').replace(/""/g, '"').trim());

        if (cleanedParts[0] === 'Meta') {
            meta[cleanedParts[1]] = cleanedParts[2] || '';
        } else if (cleanedParts[0] === 'Section' && cleanedParts[1] === 'Measure') {
            headers = cleanedParts;
            isDataSection = true;
        } else if (isDataSection && headers.length > 0) {
            const rowData = {};
            headers.forEach((header, index) => {
                rowData[header] = cleanedParts[index] || '';
            });
            data.push(rowData);
        }
    }
    return { meta, headers, data };
}

// DEBUG: Confirm script is loaded
console.log('progress-monitor.js loaded');
