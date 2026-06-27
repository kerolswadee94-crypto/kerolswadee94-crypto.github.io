// script.js – fetch & render projects from Google Sheets CSV

(function() {
  'use strict';

  // ----- CONFIG -----
  const SHEET_ID = '156_JKOp12VhKtfGATGKhTwf69k4GS9_JaymqJuoL_FY';

  function getSheetUrl() {
    return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&id=${SHEET_ID}&gid=0&t=${Date.now()}`;
  }

  const container = document.getElementById('projects-container');

  // ----- helper: clean text -----
  function cleanText(text) {
    if (!text) return '';
    return text.replace(/^["']|["']$/g, '').replace(/\r/g, '').replace(/\n/g, '').trim();
  }

  // ----- helper: parse CSV with quoted fields -----
  function parseCSV(csvText) {
    const rows = [];
    let currentRow = [];
    let currentField = '';
    let insideQuotes = false;
    let i = 0;

    while (i < csvText.length) {
      const char = csvText[i];
      const nextChar = csvText[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentField += '"';
          i += 2;
          continue;
        }
        insideQuotes = !insideQuotes;
        i++;
        continue;
      }

      if (char === ',' && !insideQuotes) {
        currentRow.push(cleanText(currentField));
        currentField = '';
        i++;
        continue;
      }

      if ((char === '\r' && nextChar === '\n') || char === '\n') {
        if (!insideQuotes) {
          currentRow.push(cleanText(currentField));
          if (currentRow.length > 0 && currentRow.some(f => f !== '')) {
            rows.push(currentRow);
          }
          currentRow = [];
          currentField = '';
          i += (char === '\r' && nextChar === '\n') ? 2 : 1;
          continue;
        }
        currentField += char;
        i++;
        continue;
      }

      currentField += char;
      i++;
    }

    if (currentField || currentRow.length > 0) {
      currentRow.push(cleanText(currentField));
      if (currentRow.some(f => f !== '')) {
        rows.push(currentRow);
      }
    }

    return rows;
  }

  // ----- render projects -----
  function renderProjectsFromCSV(csvText) {
    const rows = parseCSV(csvText);
    
    if (rows.length < 2) {
      container.innerHTML = `<div class="status-message"><i class="fas fa-info-circle"></i> No project data found.</div>`;
      return;
    }

    const header = rows[0].map(h => h.toLowerCase());
    let nameIdx = -1, descIdx = -1, linkIdx = -1;
    header.forEach((h, i) => {
      if (h.includes('project name') || h.includes('name')) nameIdx = i;
      else if (h.includes('description') || h.includes('desc')) descIdx = i;
      else if (h.includes('media link') || h.includes('link') || h.includes('url')) linkIdx = i;
    });

    if (nameIdx === -1 || descIdx === -1 || linkIdx === -1) {
      console.warn('Using fallback column mapping');
      nameIdx = 0;
      descIdx = 1;
      linkIdx = 2;
    }

    const projects = [];
    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i];
      while (cols.length < 3) cols.push('');
      const name = cols[nameIdx] || 'Untitled Project';
      const desc = cols[descIdx] || 'No description provided.';
      let link = cols[linkIdx] || '#';
      if (link === '' || link === '#') link = '#';
      projects.push({ name, description: desc, link });
    }

    if (projects.length === 0) {
      container.innerHTML = `<div class="status-message"><i class="fas fa-inbox"></i> No projects found.</div>`;
      return;
    }

    let html = '';
    projects.forEach(proj => {
      const safeName = proj.name.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const safeDesc = proj.description.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const linkHref = proj.link === '#' ? '#' : proj.link;

      html += `
        <div class="project-card">
          <h3>${safeName}</h3>
          <p>${safeDesc}</p>
          <a class="btn" href="${linkHref}" target="_blank" rel="noopener noreferrer">
            <i class="fas fa-external-link-alt"></i> View Project
          </a>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  // ----- fetch data -----
  async function fetchProjects() {
    try {
      const url = getSheetUrl();
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const csvText = await response.text();
      renderProjectsFromCSV(csvText);
    } catch (error) {
      console.error('Error fetching Google Sheet:', error);
      container.innerHTML = `
        <div class="status-message" style="border-left-color:#b91c1c; background:#fee9e7;">
          <i class="fas fa-exclamation-triangle" style="color:#b91c1c; margin-right:8px;"></i>
          Could not load projects. Please check the sheet ID or network.
        </div>
      `;
    }
  }

  fetchProjects();
})();