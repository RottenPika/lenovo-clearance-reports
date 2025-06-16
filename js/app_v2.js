// Lenovo Clearance Dashboard V2 - Instant Overview

class LenovoDashboardV2 {
    constructor() {
        this.summary = null;
        this.manifest = null;
        this.currentData = null;
        this.currentTable = null;
        this.init();
    }
    
    async init() {
        console.log('Initializing Dashboard V2...');
        try {
            // Load both summary and manifest in parallel
            const [summaryResponse, manifestResponse] = await Promise.all([
                fetch('data/json/summary.json'),
                fetch('data/json/manifest.json')
            ]);
            
            if (summaryResponse.ok) {
                this.summary = await summaryResponse.json();
                console.log('Summary loaded:', this.summary);
                this.renderSummary();
            } else {
                console.warn('No summary.json found, showing empty state');
                this.showEmptyState();
            }
            
            if (manifestResponse.ok) {
                this.manifest = await manifestResponse.json();
                console.log('Manifest loaded:', this.manifest);
                this.populateReportSelector();
                
                // Auto-load the latest report
                if (this.manifest.reports && this.manifest.reports.length > 0) {
                    this.loadReport(this.manifest.reports[0].filename);
                }
            }
            
            this.setupEventListeners();
            
        } catch (error) {
            console.error('Init error:', error);
            this.showError('Fehler beim Laden: ' + error.message);
        }
    }
    
    renderSummary() {
        // Hide loading, show content
        document.getElementById('loading-summary').style.display = 'none';
        document.getElementById('summary-content').style.display = 'block';
        
        // Update last update time
        if (this.summary.metadata) {
            const latestTime = new Date(this.summary.metadata.generated_at);
            document.getElementById('last-update-time').textContent = 
                `Letztes Update: ${latestTime.toLocaleString('de-DE')}`;
        }
        
        // Update quick stats
        const stats = this.summary.quick_stats;
        document.getElementById('stat-new').textContent = '+' + (stats.new_items || 0);
        document.getElementById('stat-removed').textContent = '-' + (stats.removed_items || 0);
        document.getElementById('stat-changed').textContent = '~' + (stats.changed_items || 0);
        document.getElementById('stat-drops').textContent = stats.price_drops || 0;
        
        // Render highlights
        this.renderHighlights();
    }
    
    renderHighlights() {
        const container = document.getElementById('highlights-grid');
        container.innerHTML = '';
        
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
        
        card.innerHTML = `<h3>${title}</h3><div class="highlight-items"></div>`;
        const itemsContainer = card.querySelector('.highlight-items');
        
        items.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'highlight-item';
            
            let content = `<div class="highlight-item-name">${item.name || 'Unknown'}</div>`;
            content += '<div class="highlight-item-details">';
            
            if (type === 'dramatic' || type === 'drops') {
                content += `
                    <div class="price-change">
                        <span class="price-old">${item.old_price}</span>
                        <span>→</span>
                        <span class="price-new">${item.new_price}</span>
                        <span class="price-drop-percent">${item.change_percent}</span>
                    </div>
                `;
            } else if (type === 'new' || type === 'removed') {
                content += `
                    <div class="price-change">
                        <span class="price-new">${item.price}</span>
                        <span style="color: #666;">| ${item.quantity} verfügbar</span>
                    </div>
                `;
            }
            
            content += `<code style="font-size: 0.9em; color: #666;">${item.teilenummer}</code>`;
            content += '</div>';
            
            itemEl.innerHTML = content;
            itemsContainer.appendChild(itemEl);
        });
        
        return card;
    }
    
    showEmptyState() {
        document.getElementById('loading-summary').style.display = 'none';
        document.getElementById('empty-state').style.display = 'block';
    }
    
    // Report browser functions (from V1, simplified)
    populateReportSelector() {
        const selector = document.getElementById('report-selector');
        selector.innerHTML = '<option value="">Report auswählen...</option>';
        
        if (this.manifest && this.manifest.reports) {
            this.manifest.reports.forEach((report, index) => {
                const option = document.createElement('option');
                option.value = report.filename;
                option.textContent = report.display_name;
                if (index === 0) option.selected = true;
                selector.appendChild(option);
            });
        }
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
            document.getElementById('table-container').innerHTML = 
                '<div class="loading"><div class="spinner"></div>Lade Report-Daten...</div>';
            
            const response = await fetch(`data/json/${filename}`);
            if (!response.ok) {
                throw new Error('Report konnte nicht geladen werden');
            }
            
            this.currentData = await response.json();
            this.createSheetTabs();
            
            const firstSheet = Object.keys(this.currentData.data)[0];
            this.showSheet(firstSheet);
            
        } catch (error) {
            console.error('Report load error:', error);
            this.showError('Fehler beim Laden des Reports: ' + error.message);
        }
    }
    
    createSheetTabs() {
        const tabsContainer = document.getElementById('sheet-tabs');
        if (!tabsContainer) return;
        
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
        
        const sheetData = this.currentData.data[sheetName];
        
        if (this.currentTable) {
            this.currentTable.destroy();
        }
        
        document.getElementById('table-container').innerHTML = '<div id="data-table"></div>';
        
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
        }
    }
    
    generateColumns(columnNames) {
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
    
    showError(message) {
        const container = document.getElementById('table-container');
        if (container) {
            container.innerHTML = `<div class="error">❌ ${message}</div>`;
        }
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new LenovoDashboardV2();
    });
} else {
    new LenovoDashboardV2();
}