// Lenovo Clearance Dashboard - Interactive Data Viewer

class LenovoDashboard {
    constructor() {
        this.currentData = null;
        this.currentTable = null;
        this.manifest = null;
        
        this.init();
    }
    
    async init() {
        try {
            await this.loadManifest();
            this.setupEventListeners();
        } catch (error) {
            this.showError('Fehler beim Laden der Reports: ' + error.message);
        }
    }
    
    async loadManifest() {
        const response = await fetch('data/json/manifest.json');
        if (!response.ok) {
            throw new Error('Manifest konnte nicht geladen werden');
        }
        
        this.manifest = await response.json();
        this.populateReportSelector();
        this.updateStats();
    }
    
    populateReportSelector() {
        const selector = document.getElementById('report-selector');
        selector.innerHTML = '<option value="">Report auswählen...</option>';
        
        this.manifest.reports.forEach(report => {
            const option = document.createElement('option');
            option.value = report.filename;
            option.textContent = report.display_name;
            selector.appendChild(option);
        });
    }
    
    updateStats() {
        document.getElementById('total-reports').textContent = this.manifest.total_reports;
        
        const lastUpdate = new Date(this.manifest.last_updated);
        document.getElementById('last-update').textContent = lastUpdate.toLocaleString('de-DE');
    }
    
    setupEventListeners() {
        document.getElementById('report-selector').addEventListener('change', (e) => {
            if (e.target.value) {
                this.loadReport(e.target.value);
            }
        });
    }
    
    async loadReport(filename) {
        try {
            document.getElementById('table-container').innerHTML = 
                '<div class="loading">📊 Lade Report-Daten...</div>';
            
            const response = await fetch(`data/json/${filename}`);
            if (!response.ok) {
                throw new Error('Report konnte nicht geladen werden');
            }
            
            this.currentData = await response.json();
            this.createSheetTabs();
            this.showSheet(Object.keys(this.currentData.data)[0], null); // Show first sheet
            
        } catch (error) {
            this.showError('Fehler beim Laden des Reports: ' + error.message);
        }
    }
    
    createSheetTabs() {
        const tabsContainer = document.getElementById('sheet-tabs');
        tabsContainer.innerHTML = '';
        
        Object.keys(this.currentData.data).forEach((sheetName, index) => {
            const tab = document.createElement('button');
            tab.className = 'tab' + (index === 0 ? ' active' : '');
            tab.textContent = `📋 ${sheetName} (${this.currentData.data[sheetName].count})`;
            tab.onclick = (e) => this.showSheet(sheetName, e);
            tabsContainer.appendChild(tab);
        });
    }
    
    showSheet(sheetName, clickEvent) {
        // Update active tab
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        if (clickEvent && clickEvent.target) {
            clickEvent.target.classList.add('active');
        } else {
            // Find and activate the correct tab by content
            document.querySelectorAll('.tab').forEach(tab => {
                if (tab.textContent.includes(sheetName)) {
                    tab.classList.add('active');
                }
            });
        }
        
        const sheetData = this.currentData.data[sheetName];
        document.getElementById('current-items').textContent = sheetData.count;
        
        // Destroy existing table
        if (this.currentTable) {
            this.currentTable.destroy();
        }
        
        // Create container
        document.getElementById('table-container').innerHTML = '<div id="data-table"></div>';
        
        // Configure columns based on data
        const columns = this.generateColumns(sheetData.columns, sheetData.records);
        
        // Create new table
        this.currentTable = new Tabulator("#data-table", {
            data: sheetData.records,
            columns: columns,
            layout: "fitColumns",
            responsiveLayout: "hide",
            pagination: "local",
            paginationSize: 50,
            paginationSizeSelector: [25, 50, 100, 200],
            movableColumns: true,
            resizableColumns: true,
            tooltips: true,
            headerFilterPlaceholder: "Filter...",
            locale: "de-de",
            langs: {
                "de-de": {
                    "pagination": {
                        "page_size": "Einträge pro Seite",
                        "first": "Erste",
                        "last": "Letzte",
                        "prev": "Zurück",
                        "next": "Weiter"
                    }
                }
            }
        });
    }
    
    generateColumns(columnNames, data) {
        return columnNames.map(col => {
            const column = {
                title: col,
                field: col,
                headerFilter: "input",
                headerFilterPlaceholder: `${col} filtern...`
            };
            
            // Special formatting for specific columns
            if (col.toLowerCase().includes('preis')) {
                column.formatter = (cell) => {
                    const value = cell.getValue();
                    if (typeof value === 'string' && value.includes('€')) {
                        return `<span style="font-weight: bold; color: #0066cc;">${value}</span>`;
                    }
                    return value;
                };
            }
            
            if (col.toLowerCase().includes('teilenummer')) {
                column.formatter = (cell) => {
                    const value = cell.getValue();
                    return `<code style="background: #f8f9fa; padding: 2px 6px; border-radius: 4px;">${value}</code>`;
                };
            }
            
            if (col.toLowerCase().includes('menge')) {
                column.formatter = (cell) => {
                    const value = cell.getValue();
                    return `<span style="background: #e8f5e8; color: #2d5d2d; padding: 2px 8px; border-radius: 12px; font-size: 0.9em;">${value}</span>`;
                };
            }
            
            return column;
        });
    }
    
    showError(message) {
        document.getElementById('table-container').innerHTML = 
            `<div class="error">❌ ${message}</div>`;
    }
}

// Initialize the dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    new LenovoDashboard();
});