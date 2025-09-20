/*
 * Data Utilities (shared across tools)
 *  - CSV formatting and parsing with quoted field support
 */
(function(global){
  const DataUtils = {};

  DataUtils.formatCSVField = function(data){
    if (data === null || data === undefined) return '';
    let str = String(data);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      str = str.replace(/"/g, '""');
      str = `"${str}"`;
    }
    return str;
  };

  // Parses CSV into { meta, headers, data } compatible with Progress Monitor expectations
  DataUtils.parseCSV = function(text){
    const lines = String(text).replace(/\r/g, '').split('\n');
    const meta = {};
    let headers = [];
    const data = [];
    let isDataSection = false;

    for (const line of lines) {
      if (!line.trim()) continue;
      // Split line into CSV parts supporting quotes
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
  };

  global.DataUtils = DataUtils;
})(window);
