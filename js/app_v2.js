// Lenovo Clearance Dashboard V2 - Fixed Version

class LenovoDashboardV2 {
    constructor() {
        this.summary = null;
        this.manifest = null;
        this.currentData = null;
        this.currentTable = null;
        this.isLoading = false;
        this.init();
    }
    
    async init() {
        console.log('Initializing Dashboard V2...');
        
        // Prevent multiple initializations
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
            // Try to load summary first
            const summaryResponse = await fetch('data/json/summary.json?v=' + Date.now());
            if (summaryResponse.ok) {
                this.summary = await summaryResponse.json();
                console.log('Summary loaded:', this.summary);
                this.renderSummary();
            } else {
                console.warn('No summary.json found');
                this.showEmptyState();
            }
        } catch (error) {
            console.warn('Failed to load summary:', error);
            this.showEmptyState();
        }
        
        try {
            // Load manifest
            const manifestResponse = await fetch('data/json/manifest.json?v=' + Date.now());
            if (manifestResponse.ok) {
                this.manifest = await manifestResponse.json();
                console.log('Manifest loaded:', this.manifest);
                this.populateReportSelector();
                
                // Auto-load the latest report
                if (this.manifest.reports && this.manifest.reports.length > 0) {
                    await this.loadReport(this.manifest.reports[0].filename);
                }
            }
        } catch (error) {
            console.error('Failed to load manifest:', error);
        }
    }
    
    renderSummary() {
        console.log('Rendering summary...');
        
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
    }
    
    updateStat(elementId, value) {
        const el = document.getElementById(elementId);
        if (el) {
            el.textContent = value;
        }
    }
    
    renderHighlights() {
        const container = document.getElementById('highlights-grid');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (!this.summary || !this.summary.highlights) {
            return;
        }
        
        const highlights = this.summary.highlights;
        
        // Dramatic drops (>100€ to <20€)
        if (highlights.dramatic_drops && highlights.dramatic_drops.length > 0) {
            const card = this.createHighlightCard(
                '💥 Dramatische Preisfälle', 
                highlights.dramatic_drops,
                'dramatic'
            );
            container.appendChild(card);
        }
        
        // New video cards
        if (highlights.new_video_cards && highlights.new_video_cards.length > 0) {
            const card = this.createHighlightCard(
                '🆕 Neue Grafikkarten unter 20€', 
                highlights.new_video_cards,
                'new'
            );
            container.appendChild(card);
        }
        
        // Biggest price drops
        if (highlights.biggest_price_drops && highlights.biggest_price_drops.length > 0) {
            const card = this.createHighlightCard(
                '📉 Größte Preissenkungen', 
                highlights.biggest_price_drops.slice(0, 5),
                'drops'
            );
            container.appendChild(card);
        }
        
        // Removed deals
        if (highlights.removed_deals && highlights.removed_deals.length > 0) {
            const card = this.createHighlightCard(
                '❌ Entfernte Deals', 
                highlights.removed_deals,
                'removed'
            );
            container.appendChild(card);
        }
    }
    
    createHighlightCard(title, items, type) {
        const card = document.createElement('div');
        card.className = 'highlight-card';
        
        const titleEl = document.createElement('h3');
        titleEl.textContent = title;
        card.appendChild(titleEl);
        
        const itemsContainer = document.createElement('div');
        itemsContainer.className = 'highlight-items';
        card.appendChild(itemsContainer);
        
        items.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'highlight-item';
            
            const nameEl = document.createElement('div');
            nameEl.className = 'highlight-item-name';
            nameEl.textContent = item.name || 'Unknown';
            itemEl.appendChild(nameEl);
            
            const detailsEl = document.createElement('div');
            detailsEl.className = 'highlight-item-details';
            
            if (type === 'dramatic' || type === 'drops') {
                const priceChangeEl = document.createElement('div');
                priceChangeEl.className = 'price-change';
                priceChangeEl.innerHTML = `
                    <span class="price-old">${item.old_price}</span>
                    <span>→</span>
                    <span class="price-new">${item.new_price}</span>
                    <span class="price-drop-percent">${item.change_percent}</span>
                `;
                detailsEl.appendChild(priceChangeEl);
            } else if (type === 'new' || type === 'removed') {
                const priceChangeEl = document.createElement('div');
                priceChangeEl.className = 'price-change';
                priceChangeEl.innerHTML = `
                    <span class="price-new">${item.price}</span>
                    <span style="color: #666;">| ${item.quantity} verfügbar</span>
                `;
                detailsEl.appendChild(priceChangeEl);
            }
            
            const codeEl = document.createElement('code');
            codeEl.style.fontSize = '0.9em';
            codeEl.style.color = '#666';
            codeEl.textContent = item.teilenummer;
            detailsEl.appendChild(codeEl);
            
            itemEl.appendChild(detailsEl);
            itemsContainer.appendChild(itemEl);
        });
        
        return card;
    }
    
    showEmptyState() {
        const loadingEl = document.getElementById('loading-summary');
        const errorEl = document.getElementById('error-state');
        const contentEl = document.getElementById('summary-content');
        const emptyEl = document.getElementById('empty-state');
        
        if (loadingEl) loadingEl.style.display = 'none';
        if (errorEl) errorEl.style.display = 'none';
        if (contentEl) contentEl.style.display = 'none';
        if (emptyEl) emptyEl.style.display = 'block';
    }
    
    showError(message) {
        const loadingEl = document.getElementById('loading-summary');
        const contentEl = document.getElementById('summary-content');
        const emptyEl = document.getElementById('empty-state');
        const errorEl = document.getElementById('error-state');
        const messageEl = document.getElementById('error-message');
        
        if (loadingEl) loadingEl.style.display = 'none';
        if (contentEl) contentEl.style.display = 'none';
        if (emptyEl) emptyEl.style.display = 'none';
        if (errorEl) errorEl.style.display = 'block';
        if (messageEl) messageEl.textContent = message;
    }
    
    // Report browser functions
    populateReportSelector() {
        const selector = document.getElementById('report-selector');
        if (!selector || !this.manifest || !this.manifest.reports) return;
        
        selector.innerHTML = '<option value="">Report auswählen...</option>';
        
        this.manifest.reports.forEach((report, index) => {
            const option = document.createElement('option');
            option.value = report.filename;
            option.textContent = report.display_name;
            if (index === 0) option.selected = true;
            selector.appendChild(option);
        });
    }
    
    setupEventListeners() {
        const selector = document.getElementById('report-selector');
        if (selector) {
            selector.addEventListener('change', (e) => {
                if (e.target.value) {
                    this.loadReport(e.target.value);
                }
            });
        }
    }
    
    async loadReport(filename) {
        console.log('Loading report:', filename);
        try {
            const container = document.getElementById('table-container');
            if (container) {
                container.innerHTML = '<div class="loading"><div class="spinner"></div>Lade Report-Daten...</div>';
            }
            
            const response = await fetch(`data/json/${filename}?v=${Date.now()}`);
            if (!response.ok) {
                throw new Error('Report konnte nicht geladen werden');
            }
            
            this.currentData = await response.json();
            this.createSheetTabs();
            
            const firstSheet = Object.keys(this.currentData.data)[0];
            this.showSheet(firstSheet);
            
        } catch (error) {
            console.error('Report load error:', error);
            this.showTableError('Fehler beim Laden des Reports: ' + error.message);
        }
    }
    
    createSheetTabs() {
        const tabsContainer = document.getElementById('sheet-tabs');
        if (!tabsContainer || !this.currentData) return;
        
        tabsContainer.innerHTML = '';
        
        Object.keys(this.currentData.data).forEach((sheetName, index) => {
            const tab = document.createElement('button');
            tab.className = 'tab' + (index === 0 ? ' active' : '');
            tab.textContent = `📋 ${sheetName} (${this.currentData.data[sheetName].count})`;
            tab.setAttribute('data-sheet', sheetName);
            
            tab.addEventListener('click', (e) => {
                this.showSheet(sheetName);
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
            });
            
            tabsContainer.appendChild(tab);
        });
    }
    
    showSheet(sheetName) {
        console.log('Showing sheet:', sheetName);
        
        if (!this.currentData || !this.currentData.data || !this.currentData.data[sheetName]) {
            console.error('Sheet data not found:', sheetName);
            return;
        }
        
        const sheetData = this.currentData.data[sheetName];
        
        if (this.currentTable) {
            this.currentTable.destroy();
        }
        
        const container = document.getElementById('table-container');
        if (container) {
            container.innerHTML = '<div id="data-table"></div>';
        }
        
        const columns = this.generateColumns(sheetData.columns);
        
        try {
            this.currentTable = new Tabulator("#data-table", {
                data: sheetData.records,
                columns: columns,
                layout: "fitColumns",
                responsiveLayout: "hide",
                pagination: "local",
                paginationSize: 50,
                paginationSizeSelector: [25, 50, 100],
                movableColumns: true,
                resizableColumns: true,
                tooltips: true,
                headerFilterPlaceholder: "Filter..."
            });
        } catch (error) {
            console.error('Tabulator error:', error);
            this.showTableError('Fehler beim Erstellen der Tabelle: ' + error.message);
        }
    }
    
    generateColumns(columnNames) {
        if (!columnNames || !Array.isArray(columnNames)) {
            console.error('Invalid column names:', columnNames);
            return [];
        }
        
        return columnNames.map(col => {
            const column = {
                title: col,
                field: col,
                headerFilter: "input"
            };
            
            if (col.toLowerCase().includes('preis')) {
                column.formatter = (cell) => {
                    const value = cell.getValue();
                    return `<span style="font-weight: bold; color: #0066cc;">${value}</span>`;
                };
            }
            
            return column;
        });
    }
    
    showTableError(message) {
        const container = document.getElementById('table-container');
        if (container) {
            container.innerHTML = `<div class="error">❌ ${message}</div>`;
        }
    }
}

// Initialize only once when DOM is ready
let dashboardInstance = null;

function initializeDashboard() {
    if (dashboardInstance) {
        console.log('Dashboard already initialized');
        return;
    }
    
    console.log('Creating dashboard instance...');
    dashboardInstance = new LenovoDashboardV2();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDashboard);
} else {
    initializeDashboard();
}