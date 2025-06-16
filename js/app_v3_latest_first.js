// Lenovo Clearance Dashboard V3 - Latest First with History Browser

class LenovoDashboardV3 {
    constructor() {
        this.summary = null;
        this.manifest = null;
        this.currentData = null;
        this.currentTable = null;
        this.isLoading = false;
        this.historyVisible = false;
        this.init();
    }
    
    async init() {
        console.log('Initializing Dashboard V3 - Latest First...');
        
        if (this.isLoading) {
            console.log('Already loading, skipping...');
            return;
        }
        this.isLoading = true;
        
        try {
            await this.loadData();
            this.setupEventListeners();
        } catch (error) {
            console.error('Init error:', error);
            this.showError('Fehler beim Laden: ' + error.message);
        } finally {
            this.isLoading = false;
        }
    }
    
    async loadData() {
        console.log('Loading data...');
        
        try {
            // Load summary (latest report)
            const summaryResponse = await fetch('data/json/summary.json?v=' + Date.now());
            if (summaryResponse.ok) {
                this.summary = await summaryResponse.json();
                console.log('Summary loaded:', this.summary);
                this.renderSummary();
                this.showLatestOnly();
            } else {
                console.warn('No summary.json found');
                this.showEmptyState();
            }
        } catch (error) {
            console.warn('Failed to load summary:', error);
            this.showEmptyState();
        }
        
        try {
            // Load manifest for history
            const manifestResponse = await fetch('data/json/manifest.json?v=' + Date.now());
            if (manifestResponse.ok) {
                this.manifest = await manifestResponse.json();
                console.log('Manifest loaded:', this.manifest);
                this.setupHistoryBrowser();
            }
        } catch (error) {
            console.error('Failed to load manifest:', error);
        }
    }
    
    showLatestOnly() {
        // Hide the old report selector and table sections
        const oldSections = document.querySelectorAll('.old-report-section');
        oldSections.forEach(section => section.style.display = 'none');
        
        // Update UI to show we're displaying latest data
        const reportTitle = document.getElementById('report-title');
        if (reportTitle) {
            reportTitle.textContent = 'Aktuelle Änderungen';
        }
    }
    
    setupHistoryBrowser() {
        // Create history browser button
        const headerContainer = document.querySelector('.dashboard-header');
        if (!headerContainer || !this.manifest || !this.manifest.reports || this.manifest.reports.length === 0) {
            return;
        }
        
        // Add history button
        const historyButton = document.createElement('button');
        historyButton.className = 'history-button';
        historyButton.innerHTML = '📅 Historie anzeigen';
        historyButton.addEventListener('click', () => this.toggleHistory());
        
        headerContainer.appendChild(historyButton);
    }
    
    toggleHistory() {
        this.historyVisible = !this.historyVisible;
        
        if (this.historyVisible) {
            this.showHistoryBrowser();
        } else {
            this.hideHistoryBrowser();
        }
    }
    
    showHistoryBrowser() {
        // Create history browser overlay
        const overlay = document.createElement('div');
        overlay.id = 'history-overlay';
        overlay.className = 'history-overlay';
        overlay.innerHTML = `
            <div class="history-browser">
                <div class="history-header">
                    <h2>📅 Änderungshistorie</h2>
                    <button class="close-history" onclick="dashboard.hideHistoryBrowser()">✕</button>
                </div>
                <div class="history-timeline">
                    ${this.renderHistoryTimeline()}
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Update button text
        const historyButton = document.querySelector('.history-button');
        if (historyButton) {
            historyButton.innerHTML = '📅 Historie schließen';
        }
    }
    
    hideHistoryBrowser() {
        const overlay = document.getElementById('history-overlay');
        if (overlay) {
            overlay.remove();
        }
        
        this.historyVisible = false;
        
        // Update button text
        const historyButton = document.querySelector('.history-button');
        if (historyButton) {
            historyButton.innerHTML = '📅 Historie anzeigen';
        }
    }
    
    renderHistoryTimeline() {
        if (!this.manifest || !this.manifest.reports) {
            return '<p>Keine historischen Daten verfügbar</p>';
        }
        
        let timelineHTML = '<div class="timeline">';
        
        // Group reports by date
        const reportsByDate = {};
        this.manifest.reports.forEach((report, index) => {
            const timestamp = report.timestamp;
            const date = timestamp.substring(0, 10); // YYYY-MM-DD
            
            if (!reportsByDate[date]) {
                reportsByDate[date] = [];
            }
            reportsByDate[date].push({...report, index});
        });
        
        // Render grouped reports
        for (const [date, reports] of Object.entries(reportsByDate)) {
            const dateObj = new Date(date.replace(/-/g, '/'));
            const dateStr = dateObj.toLocaleDateString('de-DE', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
            
            timelineHTML += `
                <div class="timeline-date">
                    <h3>${dateStr}</h3>
                    <div class="timeline-items">
            `;
            
            reports.forEach(report => {
                const time = report.timestamp.substring(11, 16).replace(/_/g, ':');
                const isLatest = report.index === 0;
                
                timelineHTML += `
                    <div class="timeline-item ${isLatest ? 'latest' : ''}" 
                         onclick="dashboard.loadHistoricalReport('${report.filename}')">
                        <span class="time">${time} Uhr</span>
                        ${isLatest ? '<span class="badge">Aktuell</span>' : ''}
                        <div class="stats-mini">
                            ${this.getReportStats(report)}
                        </div>
                    </div>
                `;
            });
            
            timelineHTML += `
                    </div>
                </div>
            `;
        }
        
        timelineHTML += '</div>';
        
        return timelineHTML;
    }
    
    getReportStats(report) {
        // Try to extract stats from the report if available
        // For now, return the sheet info
        if (report.sheets) {
            return report.sheets.map(sheet => `<span class="sheet-badge">${sheet}</span>`).join(' ');
        }
        return '';
    }
    
    async loadHistoricalReport(filename) {
        console.log('Loading historical report:', filename);
        
        try {
            const response = await fetch(`data/json/${filename}?v=${Date.now()}`);
            if (!response.ok) {
                throw new Error('Report konnte nicht geladen werden');
            }
            
            const reportData = await response.json();
            
            // Hide history browser
            this.hideHistoryBrowser();
            
            // Update current data and render
            this.currentData = reportData;
            
            // Show historical data in main view
            this.renderHistoricalReport(reportData);
            
        } catch (error) {
            console.error('Error loading historical report:', error);
            alert('Fehler beim Laden des historischen Reports: ' + error.message);
        }
    }
    
    renderHistoricalReport(reportData) {
        // Update header to show historical report
        const reportTitle = document.getElementById('report-title');
        if (reportTitle) {
            const timestamp = reportData.metadata.timestamp;
            const date = new Date(timestamp.substring(0, 10).replace(/-/g, '/'));
            const time = timestamp.substring(11, 16).replace(/_/g, ':');
            reportTitle.innerHTML = `Historischer Report vom ${date.toLocaleDateString('de-DE')} um ${time} Uhr 
                <button class="back-to-latest" onclick="dashboard.backToLatest()">← Zurück zum aktuellen Report</button>`;
        }
        
        // Clear current summary and show historical data
        const summaryContent = document.getElementById('summary-content');
        if (summaryContent) {
            summaryContent.style.display = 'none';
        }
        
        // Show report analysis section
        const reportSection = document.getElementById('report-analysis');
        if (reportSection) {
            reportSection.style.display = 'block';
            reportSection.classList.remove('old-report-section');
        }
        
        // Render the historical data
        this.renderReportData(reportData);
    }
    
    backToLatest() {
        // Reload the page to show latest data
        location.reload();
    }
    
    renderReportData(reportData) {
        if (!reportData || !reportData.data) return;
        
        const container = document.getElementById('report-content');
        if (!container) return;
        
        container.innerHTML = '';
        
        // Create tabs for each sheet
        if (reportData.metadata.sheets && reportData.metadata.sheets.length > 0) {
            const tabsHTML = `
                <div class="sheet-tabs">
                    ${reportData.metadata.sheets.map((sheet, index) => 
                        `<button class="sheet-tab ${index === 0 ? 'active' : ''}" 
                                onclick="dashboard.showSheet('${sheet}')">${sheet}</button>`
                    ).join('')}
                </div>
                <div id="sheet-content"></div>
            `;
            container.innerHTML = tabsHTML;
            
            // Show first sheet
            this.showSheet(reportData.metadata.sheets[0]);
        }
    }
    
    showSheet(sheetName) {
        if (!this.currentData || !this.currentData.data[sheetName]) return;
        
        // Update active tab
        document.querySelectorAll('.sheet-tab').forEach(tab => {
            tab.classList.toggle('active', tab.textContent === sheetName);
        });
        
        const sheetData = this.currentData.data[sheetName];
        const container = document.getElementById('sheet-content');
        
        if (!container) return;
        
        // Destroy existing table
        if (this.currentTable) {
            this.currentTable.destroy();
            this.currentTable = null;
        }
        
        container.innerHTML = '<div id="data-table"></div>';
        
        // Create new table
        this.currentTable = new Tabulator("#data-table", {
            data: sheetData,
            layout: "fitDataTable",
            responsiveLayout: "collapse",
            movableColumns: true,
            pagination: "local",
            paginationSize: 20,
            paginationSizeSelector: [10, 20, 50, 100],
            columns: this.detectColumns(sheetData)
        });
    }
    
    renderSummary() {
        console.log('Rendering enhanced summary...');
        
        // Hide loading and error states
        const loadingEl = document.getElementById('loading-summary');
        const errorEl = document.getElementById('error-state');
        const emptyEl = document.getElementById('empty-state');
        const contentEl = document.getElementById('summary-content');
        
        if (loadingEl) loadingEl.style.display = 'none';
        if (errorEl) errorEl.style.display = 'none';
        if (emptyEl) emptyEl.style.display = 'none';
        if (contentEl) contentEl.style.display = 'block';
        
        // Update last update time
        if (this.summary.metadata) {
            const latestTime = new Date(this.summary.metadata.generated_at);
            const timeEl = document.getElementById('last-update-time');
            if (timeEl) {
                timeEl.textContent = `Letztes Update: ${latestTime.toLocaleString('de-DE')}`;
            }
        }
        
        // Update quick stats
        const stats = this.summary.quick_stats;
        this.updateStat('stat-new', '+' + (stats.new_items || 0));
        this.updateStat('stat-removed', '-' + (stats.removed_items || 0));
        this.updateStat('stat-changed', '~' + (stats.changed_items || 0));
        this.updateStat('stat-drops', stats.price_drops || 0);
        
        // Render highlights
        this.renderHighlights();
        
        // Render detailed sections
        this.renderDetailedSections();
    }
    
    updateStat(id, value) {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = value;
            el.parentElement.style.display = 'block';
        }
    }
    
    renderHighlights() {
        const highlights = this.summary.highlights;
        if (!highlights) return;
        
        // Price drops
        this.renderHighlightSection('price-drops', highlights.biggest_price_drops, (item) => `
            <div class="highlight-item">
                <h4>${this.escapeHtml(item.name)}</h4>
                <div class="price-change">
                    <span class="old-price">${this.escapeHtml(item.old_price)}</span>
                    →
                    <span class="new-price">${this.escapeHtml(item.new_price)}</span>
                    <span class="discount">${item.discount}% Rabatt</span>
                </div>
                <div class="item-meta">
                    ${this.escapeHtml(item.category)} | Menge: ${item.quantity}
                </div>
            </div>
        `);
        
        // Cheap deals
        this.renderHighlightSection('cheap-deals', highlights.cheap_deals, (item) => `
            <div class="highlight-item">
                <h4>${this.escapeHtml(item.name)}</h4>
                <div class="price">${this.escapeHtml(item.price)}</div>
                <div class="item-meta">
                    ${this.escapeHtml(item.category)} | Menge: ${item.quantity}
                </div>
            </div>
        `);
        
        // Removed deals
        this.renderHighlightSection('removed-deals', highlights.removed_deals, (item) => `
            <div class="highlight-item removed">
                <h4>${this.escapeHtml(item.name)}</h4>
                <div class="price">${this.escapeHtml(item.price)}</div>
                <div class="item-meta">
                    ${this.escapeHtml(item.category)} | War: ${item.quantity} Stück
                </div>
            </div>
        `);
    }
    
    renderHighlightSection(id, items, renderFunc) {
        const container = document.getElementById(id);
        if (!container || !items || items.length === 0) {
            if (container) {
                container.closest('.highlight-section').style.display = 'none';
            }
            return;
        }
        
        container.closest('.highlight-section').style.display = 'block';
        container.innerHTML = items.map(renderFunc).join('');
    }
    
    renderDetailedSections() {
        const details = this.summary.details;
        if (!details) return;
        
        // New items
        this.renderDetailSection('new-items-list', details.new_items, 'new');
        
        // Removed items
        this.renderDetailSection('removed-items-list', details.removed_items, 'removed');
        
        // Changed items
        this.renderDetailSection('changed-items-list', details.changed_items, 'changed');
    }
    
    renderDetailSection(id, items, type) {
        const container = document.getElementById(id);
        if (!container || !items || items.length === 0) {
            if (container) {
                container.closest('.detail-section').style.display = 'none';
            }
            return;
        }
        
        container.closest('.detail-section').style.display = 'block';
        
        if (type === 'changed') {
            container.innerHTML = items.map(item => this.renderChangedItem(item)).join('');
        } else {
            container.innerHTML = items.map(item => this.renderSimpleItem(item)).join('');
        }
    }
    
    renderSimpleItem(item) {
        return `
            <div class="detail-item">
                <div class="item-header">
                    <span class="item-name">${this.escapeHtml(item.name)}</span>
                    <span class="item-price">${this.escapeHtml(item.price)}</span>
                </div>
                <div class="item-meta">
                    <span class="category">${this.escapeHtml(item.category)}</span>
                    <span class="quantity">Menge: ${item.quantity}</span>
                    <span class="part-number">Teil: ${this.escapeHtml(item.teilenummer)}</span>
                </div>
            </div>
        `;
    }
    
    renderChangedItem(item) {
        const changes = item.changes;
        let changesHTML = '';
        
        if (changes.price) {
            changesHTML += `
                <span class="change-item">
                    Preis: ${this.escapeHtml(changes.price.old)} → ${this.escapeHtml(changes.price.new)}
                </span>
            `;
        }
        
        if (changes.quantity) {
            changesHTML += `
                <span class="change-item">
                    Menge: ${changes.quantity.old} → ${changes.quantity.new}
                </span>
            `;
        }
        
        return `
            <div class="detail-item changed">
                <div class="item-header">
                    <span class="item-name">${this.escapeHtml(item.name)}</span>
                    <span class="item-price">${this.escapeHtml(item.price || 'N/A')}</span>
                </div>
                <div class="item-changes">
                    ${changesHTML}
                </div>
                <div class="item-meta">
                    <span class="category">${this.escapeHtml(item.category)}</span>
                    <span class="part-number">Teil: ${this.escapeHtml(item.teilenummer)}</span>
                </div>
            </div>
        `;
    }
    
    detectColumns(data) {
        if (!data || data.length === 0) return [];
        
        const firstRow = data[0];
        const columns = [];
        
        for (const key in firstRow) {
            const column = {
                title: this.formatColumnTitle(key),
                field: key,
                headerFilter: true,
                resizable: true
            };
            
            // Special formatting for certain columns
            if (key.toLowerCase().includes('price') || key.toLowerCase().includes('preis')) {
                column.formatter = "money";
                column.formatterParams = {
                    decimal: ",",
                    thousand: ".",
                    symbol: "€",
                    symbolAfter: true
                };
            }
            
            columns.push(column);
        }
        
        return columns;
    }
    
    formatColumnTitle(key) {
        return key
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }
    
    setupEventListeners() {
        // Quick stats click handlers
        document.querySelectorAll('.stat-card').forEach(card => {
            card.addEventListener('click', () => {
                const targetId = card.getAttribute('data-target');
                if (targetId) {
                    const targetElement = document.getElementById(targetId);
                    if (targetElement) {
                        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }
            });
        });
    }
    
    showError(message) {
        const errorEl = document.getElementById('error-state');
        if (errorEl) {
            errorEl.style.display = 'block';
            errorEl.querySelector('.error-message').textContent = message;
        }
    }
    
    showEmptyState() {
        const emptyEl = document.getElementById('empty-state');
        if (emptyEl) {
            emptyEl.style.display = 'block';
        }
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new LenovoDashboardV3();
});