/**
 * Results Manager Module - Redesigned (stacked charts + tab fix)
 */

const ResultsManager = {
    currentResults: null,
    currentMode: null,
    charts: {},
    
    // Initialize results panel
    initialize() {
        console.log('Initializing results panel...');
        this.setupChartDefaults();
    },
    
    // Setup Chart.js defaults
    setupChartDefaults() {
        if (typeof Chart !== 'undefined') {
            Chart.defaults.font.family = 'Roboto, sans-serif';
            Chart.defaults.font.size = 12;
            Chart.defaults.plugins.legend.position = 'bottom';
        }
    },
    
    // Display results based on mode
    displayResults(results, mode) {
        console.log('Displaying results for mode:', mode, results);
        
        this.currentResults = results;
        this.currentMode = mode;
        
        // Show results panel
        const panel = document.getElementById('results-panel');
        if (panel) panel.style.display = 'block';
        
        // Update title
        const titles = {
            green: 'Green Hydrogen Results',
            blue: 'Blue Hydrogen Results',
            derivatives: `${results.product ? results.product.charAt(0).toUpperCase() + results.product.slice(1) : 'Derivatives'} Production Results`
        };
        const titleEl = document.getElementById('results-title');
        if (titleEl) titleEl.textContent = titles[mode];
        
        // Bind tab clicks (robust to .tab or .tab-button markup)
        this.bindTabClicks();
        
        // Show summary tab ONLY (don’t immediately repopulate all tabs and overwrite content)
        // (Previous version populated all tabs here, which left Environmental content visible last.) :contentReference[oaicite:3]{index=3}
        this.showTab('summary');
    },

    // Attach click handlers to tabs so they render on demand
    bindTabClicks() {
        document.querySelectorAll('.tab, .tab-button').forEach(btn => {
            // Avoid duplicate listeners
            btn.removeEventListener?.('__rm_click', btn.__rm_click);
            btn.__rm_click = () => {
                const tab = (btn.dataset.tab || btn.textContent || '').trim().toLowerCase();
                if (tab) this.showTab(tab);
            };
            btn.addEventListener('click', btn.__rm_click);
        });
    },
    
    // Populate summary tab - COMPACT DASHBOARD
    populateSummaryTab(results, mode) {
        results = results || {};
        const content = document.getElementById('tab-content');
        
        let html = '<div class="tab-content" id="summary-content">';
        
        // TOP ROW: Key Metric Cards (4 cards)
        html += '<div class="metrics-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 20px;">';
        
        if (mode === 'derivatives') {
            html += `
                <div class="metric-card">
                    <div class="metric-label">Production Cost</div>
                    <div class="metric-value">$${this.safeNum(results.totalProductCost, 0)}</div>
                    <div class="metric-unit">/tonne</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Annual Production</div>
                    <div class="metric-value">${this.safeNum(results.annualProduction, 1)}</div>
                    <div class="metric-unit">kt/yr</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Carbon Intensity</div>
                    <div class="metric-value">${this.safeNum(results.carbonIntensity, 2)}</div>
                    <div class="metric-unit">kg CO₂/t</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Gross Margin</div>
                    <div class="metric-value">${this.safeNum(results.grossMargin, 1)}</div>
                    <div class="metric-unit">%</div>
                </div>
            `;
        } else {
            const bottleneckDisplay = results.bottleneck ? 
                results.bottleneck.charAt(0).toUpperCase() + results.bottleneck.slice(1) : 'N/A';
            
            html += `
                <div class="metric-card">
                    <div class="metric-label">LCOH</div>
                    <div class="metric-value">$${this.safeNum(results.lcoh, 2)}</div>
                    <div class="metric-unit">/kg H₂</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Annual H₂</div>
                    <div class="metric-value">${this.safeNum(results.annualProduction_kt, 1)}</div>
                    <div class="metric-unit">kt/yr</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Bottleneck</div>
                    <div class="metric-value" style="font-size: 1.2rem;">${bottleneckDisplay}</div>
                    <div class="metric-unit">limited</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Carbon Intensity</div>
                    <div class="metric-value">${this.safeNum(results.carbonIntensity, 2)}</div>
                    <div class="metric-unit">kg CO₂/kg</div>
                </div>
            `;
        }
        html += '</div>';
        
        // KEY DRIVERS Section
        html += '<div class="drivers-section" style="margin-bottom: 20px;">';
        html += '<h4 style="margin-bottom: 10px;">Key Drivers</h4>';
        html += '<div class="drivers-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; font-size: 0.9rem;">';
        
        if (mode === 'green') {
            html += `
                <div>Electricity Price: $${this.safeNum(results.electricityPriceUsed, 3)}/kWh</div>
                <div>Specific Energy: ${this.safeNum(results.specificEnergy, 1)} kWh/kg</div>
                <div>Capacity Factor: ${this.safeNum((results.capacityFactor || 0) * 100, 1)}%</div>
                <div>Water Source: ${results.waterSource || 'N/A'}</div>
                <div>Sizing Mode: ${results.sizingMode || 'N/A'}</div>
                <div>Renewable: ${results.renewableSource || 'N/A'}</div>
            `;
        } else if (mode === 'blue') {
            html += `
                <div>Gas Price: $${this.safeNum(results.gasPrice, 2)}/MMBtu</div>
                <div>Capture Rate: ${this.safeNum(results.captureRate, 0)}%</div>
                <div>Plant Capacity: ${this.safeNum(results.plantCapacity, 0)} MW</div>
                <div>Technology: ${results.technology || 'SMR'}</div>
            `;
        } else {
            html += `
                <div>H₂ Price: $${this.safeNum(results.h2InputPrice, 2)}/kg</div>
                <div>Process Efficiency: ${this.safeNum(results.processEfficiency, 1)}%</div>
                <div>Plant Capacity: ${this.safeNum(results.plantCapacity, 0)} kt/yr</div>
                <div>Product: ${results.product || 'N/A'}</div>
            `;
        }
        html += '</div></div>';
        
        // CHARTS — VERTICAL STACK
        html += '<div style="display: flex; flex-direction: column; gap: 20px; margin-bottom: 20px;">';
        
        // LCOH/Cost Breakdown
        html += `
            <div class="chart-container" style="height: 300px;">
                <div class="chart-title">
                    ${mode === 'derivatives' ? 'Cost' : 'LCOH'} Breakdown
                    <div class="chart-options">
                        <span class="chart-option active" data-chart="doughnut">Pie</span>
                        <span class="chart-option" data-chart="bar">Bar</span>
                    </div>
                </div>
                <div class="chart-wrapper" style="height: 250px; position: relative;">
                    <canvas id="breakdown-chart"></canvas>
                </div>
            </div>
        `;
        
        // Production Limits (H₂ modes) or Market Analysis (derivatives)
        if (mode !== 'derivatives') {
            html += `
                <div class="chart-container" style="height: 300px;">
                    <div class="chart-title">Production Limits (kt/yr)</div>
                    <div class="chart-wrapper" style="height: 250px; position: relative;">
                        <canvas id="limits-chart"></canvas>
                    </div>
                </div>
            `;
        } else {
            html += `
                <div class="chart-container" style="height: 300px;">
                    <div class="chart-title">Market Competitiveness</div>
                    <div class="chart-wrapper" style="height: 250px; position: relative;">
                        <canvas id="market-chart"></canvas>
                    </div>
                </div>
            `;
        }
        html += '</div>';
        
        // LIMITS FOOTER (for H₂ modes)
        if (mode !== 'derivatives' && results.limits) {
            html += '<div class="limits-footer" style="background: #f5f5f5; padding: 15px; border-radius: 8px;">';
            html += '<h4 style="margin-bottom: 10px;">Capacity & Constraints</h4>';
            html += '<div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px; font-size: 0.9rem;">';
            html += `
                <div>
                    <div style="color: #666;">Power Limit</div>
                    <div style="font-weight: bold;">${this.safeNum(results.limits.powerLimit_kt, 2)} kt/yr</div>
                </div>
                <div>
                    <div style="color: #666;">Water Limit</div>
                    <div style="font-weight: bold;">${this.safeNum(results.limits.waterLimit_kt, 2)} kt/yr</div>
                </div>
                <div>
                    <div style="color: #666;">Installed RES</div>
                    <div style="font-weight: bold;">${this.safeNum(results.installedCapacityMW, 0)} MW</div>
                </div>
                <div>
                    <div style="color: #666;">Effective RES</div>
                    <div style="font-weight: bold;">${this.safeNum(results.effectiveCapacityMW, 0)} MW</div>
                </div>
                <div>
                    <div style="color: #666;">Electrolyzer</div>
                    <div style="font-weight: bold;">${this.safeNum(results.electrolyzerMW, 0)} MW</div>
                </div>
            `;
            html += '</div></div>';
        }
        
        content.innerHTML = html;
        
        // Create charts
        this.createBreakdownChart(results, mode);
        if (mode !== 'derivatives') {
            this.createLimitsChart(results);
        } else {
            this.createMarketChart(results);
        }
        
        // Setup chart option listeners
        this.setupChartOptions();
    },
    
    // Populate economics tab with detailed financial analysis
    populateEconomicsTab(results, mode) {
        const content = document.getElementById('tab-content');
        
        let html = '<div class="tab-content" id="economics-content">';
        
        // Financial Metrics Grid
        html += '<div class="metrics-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 20px;">';
        html += `
            <div class="metric-card">
                <div class="metric-label">Total CAPEX</div>
                <div class="metric-value">$${this.safeNum(results.totalCapex, 1)}</div>
                <div class="metric-unit">Million</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Annual OPEX</div>
                <div class="metric-value">$${this.safeNum(results.annualOpex, 1)}</div>
                <div class="metric-unit">M/year</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">NPV @ ${document.getElementById('discount-rate')?.value || 8}%</div>
                <div class="metric-value">$${this.safeNum(results.npv, 1)}</div>
                <div class="metric-unit">Million</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Payback Period</div>
                <div class="metric-value">${this.safeNum(results.paybackPeriod, 1)}</div>
                <div class="metric-unit">years</div>
            </div>
        `;
        html += '</div>';
        
        // Charts — VERTICAL STACK
        html += '<div style="display: flex; flex-direction: column; gap: 20px;">';
        
        // CAPEX Breakdown
        html += `
            <div class="chart-container" style="height: 350px;">
                <div class="chart-title">CAPEX Breakdown</div>
                <div class="chart-wrapper" style="height: 300px;">
                    <canvas id="capex-chart"></canvas>
                </div>
            </div>
        `;
        
        // OPEX Breakdown
        html += `
            <div class="chart-container" style="height: 350px;">
                <div class="chart-title">Annual OPEX Breakdown</div>
                <div class="chart-wrapper" style="height: 300px;">
                    <canvas id="opex-chart"></canvas>
                </div>
            </div>
        `;
        
        // Cash Flow Analysis
        html += `
            <div class="chart-container" style="height: 350px;">
                <div class="chart-title">20-Year Cash Flow Analysis</div>
                <div class="chart-wrapper" style="height: 300px;">
                    <canvas id="cashflow-chart"></canvas>
                </div>
            </div>
        `;
        
        // Sensitivity Analysis
        html += `
            <div class="chart-container" style="height: 350px;">
                <div class="chart-title">LCOH Sensitivity Analysis</div>
                <div class="chart-wrapper" style="height: 300px;">
                    <canvas id="sensitivity-chart"></canvas>
                </div>
            </div>
        `;
        
        html += '</div></div>';
        
        content.innerHTML = html;
        
        // Create economic charts
        setTimeout(() => {
            this.createCapexChart(results, mode);
            this.createOpexChart(results, mode);
            this.createCashflowChart(results);
            this.createSensitivityChart(results, mode);
        }, 100);
    },
    
    // Populate technical tab with operational details
    populateTechnicalTab(results, mode) {
        const content = document.getElementById('tab-content');
        
        let html = '<div class="tab-content" id="technical-content">';
        
        // Technical Metrics Grid
        html += '<div class="metrics-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 20px;">';
        
        if (mode === 'green') {
            html += `
                <div class="metric-card">
                    <div class="metric-label">Specific Energy</div>
                    <div class="metric-value">${this.safeNum(results.specificEnergy, 1)}</div>
                    <div class="metric-unit">kWh/kg</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Water Use</div>
                    <div class="metric-value">${this.safeNum(results.waterConsumption, 1)}</div>
                    <div class="metric-unit">L/kg</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Annual Energy</div>
                    <div class="metric-value">${this.safeNum((results.annualEnergyUse || 0) / 1000, 0)}</div>
                    <div class="metric-unit">GWh/yr</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Annual Water</div>
                    <div class="metric-value">${this.safeNum((results.annualWaterUse || 0) / 1000, 0)}</div>
                    <div class="metric-unit">k m³/yr</div>
                </div>
            `;
        } else if (mode === 'blue') {
            html += `
                <div class="metric-card">
                    <div class="metric-label">Gas Use</div>
                    <div class="metric-value">${this.safeNum(results.specificGasConsumption, 2)}</div>
                    <div class="metric-unit">MMBtu/kg</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Annual Gas</div>
                    <div class="metric-value">${this.safeNum(results.gasConsumption, 3)}</div>
                    <div class="metric-unit">BCM/yr</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">CO₂ Capture</div>
                    <div class="metric-value">${this.safeNum(results.captureRate, 0)}</div>
                    <div class="metric-unit">%</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Plant Load</div>
                    <div class="metric-value">${this.safeNum((results.loadFactor || 0) * 100, 1)}</div>
                    <div class="metric-unit">%</div>
                </div>
            `;
        } else {
            html += `
                <div class="metric-card">
                    <div class="metric-label">H₂ Use</div>
                    <div class="metric-value">${this.safeNum(results.h2Consumption, 0)}</div>
                    <div class="metric-unit">t/yr</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">H₂ Intensity</div>
                    <div class="metric-value">${this.safeNum(results.h2Intensity, 3)}</div>
                    <div class="metric-unit">t H₂/t product</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Energy Use</div>
                    <div class="metric-value">${this.safeNum(results.energyConsumption, 1)}</div>
                    <div class="metric-unit">GWh/yr</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Conversion</div>
                    <div class="metric-value">${this.safeNum(results.conversionEfficiency, 1)}</div>
                    <div class="metric-unit">%</div>
                </div>
            `;
        }
        html += '</div>';
        
        // Technical Charts — VERTICAL STACK
        html += '<div style="display: flex; flex-direction: column; gap: 20px;">';
        
        // Energy Balance (kept)
        html += `
            <div class="chart-container" style="height: 350px;">
                <div class="chart-title">Energy Balance</div>
                <div class="chart-wrapper" style="height: 300px;">
                    <canvas id="energy-chart"></canvas>
                </div>
            </div>
        `;
        

        
        html += '</div></div>';
        
        content.innerHTML = html;
        
        // Create technical charts (only energy chart)
        setTimeout(() => {
            this.createEnergyChart(results, mode);
        }, 100);
    },
    
    // Populate environmental tab with emissions analysis
    populateEnvironmentalTab(results, mode) {
        const content = document.getElementById('tab-content');
        
        let html = '<div class="tab-content" id="environmental-content">';
        
        // Environmental Metrics Grid
        html += '<div class="metrics-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 20px;">';
        html += `
            <div class="metric-card">
                <div class="metric-label">Carbon Intensity</div>
                <div class="metric-value">${this.safeNum(results.carbonIntensity, 2)}</div>
                <div class="metric-unit">kg CO₂/${mode === 'derivatives' ? 't' : 'kg'}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Annual Emissions</div>
                <div class="metric-value">${this.safeNum((results.annualCO2Emissions || 0) / 1000, 1)}</div>
                <div class="metric-unit">kt CO₂/yr</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">CO₂ Avoided</div>
                <div class="metric-value">${this.safeNum((results.co2Avoided || 0) / 1000, 1)}</div>
                <div class="metric-unit">kt CO₂/yr</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">vs Grey H₂</div>
                <div class="metric-value">${this.safeNum(((10 - (results.carbonIntensity || 0)) / 10) * 100, 0)}</div>
                <div class="metric-unit">% reduction</div>
            </div>
        `;
        html += '</div>';
        
        // Environmental Charts — VERTICAL STACK
        html += '<div style="display: flex; flex-direction: column; gap: 20px;">';
        
        // Emissions Comparison
        html += `
            <div class="chart-container" style="height: 350px;">
                <div class="chart-title">Emissions vs Benchmarks</div>
                <div class="chart-wrapper" style="height: 300px;">
                    <canvas id="emissions-comparison-chart"></canvas>
                </div>
            </div>
        `;
        
        // Carbon Footprint Breakdown
        html += `
            <div class="chart-container" style="height: 350px;">
                <div class="chart-title">Carbon Footprint Sources</div>
                <div class="chart-wrapper" style="height: 300px;">
                    <canvas id="carbon-sources-chart"></canvas>
                </div>
            </div>
        `;
        
        html += '</div></div>';
        
        content.innerHTML = html;
        
        // Create environmental charts (no cumulative chart)
        setTimeout(() => {
            this.createEmissionsComparisonChart(results, mode);
            this.createCarbonSourcesChart(results, mode);
        }, 100);
    },
    
    // Show specific tab
    showTab(tabName) {
        // Update tab buttons (.tab or .tab-button)
        const tabs = Array.from(document.querySelectorAll('.tab, .tab-button'));
        tabs.forEach(btn => {
            const name = (btn.dataset.tab || btn.textContent || '').trim().toLowerCase();
            btn.classList.toggle('active', name === tabName);
        });
        
        // Clear content
        const content = document.getElementById('tab-content');
        if (content) content.innerHTML = '';
        
        // Show the appropriate tab content
        switch (tabName) {
            case 'summary':
                this.populateSummaryTab(this.currentResults, this.currentMode);
                break;
            case 'economics':
                this.populateEconomicsTab(this.currentResults, this.currentMode);
                break;
            case 'technical':
                this.populateTechnicalTab(this.currentResults, this.currentMode);
                break;
            case 'environmental':
                this.populateEnvironmentalTab(this.currentResults, this.currentMode);
                break;
        }
    },
    
    // CHART CREATION FUNCTIONS
    createBreakdownChart(results, mode) {
        const ctx = document.getElementById('breakdown-chart');
        if (!ctx) return;
        
        let data, labels, colors;
        
        if (mode === 'derivatives') {
            const breakdown = results.costBreakdown || {};
            labels = ['H₂ Feedstock', 'Other Feedstock', 'Energy', 'Other'];
            data = [
                breakdown.h2Feedstock || 40,
                breakdown.otherFeedstock || 20,
                breakdown.energy || 25,
                breakdown.other || 15
            ];
            colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
        } else {
            const breakdown = results.lcohBreakdown || {};
            labels = ['CAPEX', 'Fixed O&M', 'Variable O&M', 'Electricity', 'Water'];
            data = [
                breakdown.capex || 0,
                breakdown.fixedOM || 0,
                breakdown.variableOM || 0,
                breakdown.electricity || 0,
                breakdown.water || 0
            ];
            colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
        }
        
        if (this.charts.breakdown) this.charts.breakdown.destroy();
        
        this.charts.breakdown = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { padding: 10, font: { size: 11 } } },
                    tooltip: {
                        callbacks: {
                            label: (c) => {
                                const label = c.label || '';
                                const value = mode === 'derivatives' 
                                    ? `${c.parsed.toFixed(1)}%` 
                                    : `$${c.parsed.toFixed(2)}/kg`;
                                const total = c.dataset.data.reduce((a,b)=>a+b,0) || 1;
                                const pct = ((c.parsed/total)*100).toFixed(1);
                                return `${label}: ${value} (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });
    },
    
    createLimitsChart(results) {
        const ctx = document.getElementById('limits-chart');
        if (!ctx || !results?.limits) return;
        
        const data = [
            results.limits.powerLimit_kt || 0,
            results.limits.waterLimit_kt || 0,
            results.annualProduction_kt || 0
        ];
        
        if (this.charts.limits) this.charts.limits.destroy();
        
        this.charts.limits = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Power Limit', 'Water Limit', 'Actual Production'],
                datasets: [{ data, backgroundColor: ['#3b82f6', '#10b981', '#f59e0b'], borderRadius: 4 }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${c.parsed.y.toFixed(2)} kt/yr` } } },
                scales: { y: { beginAtZero: true, title: { display: true, text: 'Production (kt/yr)' } } }
            }
        });
    },
    
    createCapexChart(results, mode) {
        const ctx = document.getElementById('capex-chart');
        if (!ctx) return;
        
        let labels, data;
        if (mode === 'green') {
            labels = ['Electrolyzer', 'Renewable Energy', 'Balance of Plant'];
            data = [
                results.electrolyzerCapex || results.totalCapex * 0.5,
                results.resCapex || results.totalCapex * 0.3,
                results.bopCapex || results.totalCapex * 0.2
            ];
        } else {
            labels = ['Process Equipment', 'CCS System', 'Infrastructure'];
            data = [results.totalCapex * 0.5, results.totalCapex * 0.3, results.totalCapex * 0.2];
        }
        
        if (this.charts.capex) this.charts.capex.destroy();
        
        this.charts.capex = new Chart(ctx, {
            type: 'pie',
            data: { labels, datasets: [{ data, backgroundColor: ['#3b82f6', '#10b981', '#f59e0b'] }] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: (c) => `${c.label}: $${c.parsed.toFixed(1)}M` } } }
            }
        });
    },
    
    createOpexChart(results) {
        const ctx = document.getElementById('opex-chart');
        if (!ctx) return;
        
        const breakdown = results.lcohBreakdown || {};
        const annual = results.annualProduction_kt * 1000 || 1; // kg/yr
        
        const labels = ['Fixed O&M', 'Variable O&M', 'Electricity', 'Water', 'Other'];
        const data = [
            (breakdown.fixedOM || 0) * annual / 1e6,
            (breakdown.variableOM || 0) * annual / 1e6,
            (breakdown.electricity || 0) * annual / 1e6,
            (breakdown.water || 0) * annual / 1e6,
            0
        ];
        
        if (this.charts.opex) this.charts.opex.destroy();
        
        this.charts.opex = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets: [{ data, backgroundColor: '#3b82f6', borderRadius: 4 }] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `$${c.parsed.y.toFixed(2)}M/yr` } } },
                scales: { y: { beginAtZero: true, title: { display: true, text: 'Cost (M$/yr)' } } }
            }
        });
    },
    
    createCashflowChart(results) {
        const ctx = document.getElementById('cashflow-chart');
        if (!ctx) return;
        
        // Generate 20-year cash flow
        const years = Array.from({length: 21}, (_, i) => i);
        const pricePerKg = Number(results.h2PriceUsed) || 7; // align with new input default
        const annualRevenue = (results.annualProduction_kt || 0) * 1000 * pricePerKg;
        const annualCost = (results.annualOpex || 0) * 1e6;
        const annualCashflow = annualRevenue - annualCost;
        
        const cashflows = years.map(year => (year === 0 ? -(results.totalCapex * 1e6 || 0) : annualCashflow));
        
        const cumulative = [];
        let cum = 0;
        cashflows.forEach(cf => { cum += cf; cumulative.push(cum / 1e6); });
        
        if (this.charts.cashflow) this.charts.cashflow.destroy();
        
        this.charts.cashflow = new Chart(ctx, {
            type: 'line',
            data: {
                labels: years,
                datasets: [{
                    label: 'Annual Cash Flow',
                    data: cashflows.map(cf => cf / 1e6),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    yAxisID: 'y'
                }, {
                    label: 'Cumulative',
                    data: cumulative,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: { legend: { position: 'bottom' } },
                scales: {
                    x: { title: { display: true, text: 'Year' } },
                    y: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'Annual (M$/yr)' } },
                    y1: { type: 'linear', display: true, position: 'right', title: { display: true, text: 'Cumulative (M$)' }, grid: { drawOnChartArea: false } }
                }
            }
        });
    },
    
    createSensitivityChart(results, mode) {
        const ctx = document.getElementById('sensitivity-chart');
        if (!ctx) return;
        
        const baseLCOH = results.lcoh || 5;
        const factors = ['Electricity Price', 'CAPEX', 'Load Factor', 'Efficiency', 'Water Cost'];
        const impacts = [baseLCOH * 0.4, baseLCOH * 0.3, baseLCOH * 0.2, baseLCOH * 0.15, baseLCOH * 0.05];
        
        if (this.charts.sensitivity) this.charts.sensitivity.destroy();
        
        this.charts.sensitivity = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: factors,
                datasets: [
                    { label: '-20% Change', data: impacts.map(i => -i), backgroundColor: '#10b981' },
                    { label: '+20% Change', data: impacts, backgroundColor: '#ef4444' }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: { callbacks: { label: (c) => `${c.dataset.label}: $${Math.abs(c.parsed.x).toFixed(2)}/kg` } }
                },
                scales: { x: { title: { display: true, text: 'LCOH Impact ($/kg)' } } }
            }
        });
    },
    
    // Other chart creation functions...
    createEnergyChart(results, mode) {
        const ctx = document.getElementById('energy-chart');
        if (!ctx) return;
        
        let labels, data;
        if (mode === 'green') {
            const total = results.annualEnergyUse || 100;
            labels = ['H₂ Production', 'Water Treatment', 'Auxiliaries'];
            data = [total * 0.85, total * 0.10, total * 0.05];
        } else {
            labels = ['Process Heat', 'Compression', 'CCS', 'Auxiliaries'];
            data = [40, 25, 20, 15];
        }
        
        if (this.charts.energy) this.charts.energy.destroy();
        
        this.charts.energy = new Chart(ctx, {
            type: 'doughnut',
            data: { labels, datasets: [{ data, backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'] }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });
    },
    
    createEmissionsComparisonChart(results, mode) {
        const ctx = document.getElementById('emissions-comparison-chart');
        if (!ctx) return;
        
        const labels = ['This Project', 'Grey H₂', 'Blue H₂', 'Green H₂'];
        const data = [
            results.carbonIntensity || 0,
            10, // Grey benchmark
            2,  // Blue benchmark
            0.5 // Green benchmark
        ];
        
        if (this.charts.emissionsComparison) this.charts.emissionsComparison.destroy();
        
        this.charts.emissionsComparison = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets: [{ data, backgroundColor: ['#f59e0b', '#ef4444', '#3b82f6', '#10b981'] }] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, title: { display: true, text: 'kg CO₂/kg H₂' } } }
            }
        });
    },
    
    createCarbonSourcesChart(results, mode) {
        const ctx = document.getElementById('carbon-sources-chart');
        if (!ctx) return;
        
        let labels, data;
        if (mode === 'green') {
            labels = ['Electricity', 'Water Treatment', 'Construction', 'Other'];
            const total = results.carbonIntensity || 1;
            data = [total * 0.7, total * 0.1, total * 0.15, total * 0.05];
        } else {
            labels = ['Natural Gas', 'Process', 'Fugitive', 'Electricity'];
            data = [5, 2, 1, 0.5];
        }
        
        if (this.charts.carbonSources) this.charts.carbonSources.destroy();
        
        this.charts.carbonSources = new Chart(ctx, {
            type: 'pie',
            data: { labels, datasets: [{ data, backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6'] }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });
    },
    
    // Setup chart option listeners
    setupChartOptions() {
        document.querySelectorAll('.chart-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const chartType = e.target.dataset.chart;
                e.target.parentElement.querySelectorAll('.chart-option').forEach(opt => opt.classList.remove('active'));
                e.target.classList.add('active');
                
                if (this.charts.breakdown) {
                    this.charts.breakdown.config.type = chartType === 'bar' ? 'bar' : 'doughnut';
                    this.charts.breakdown.update();
                }
            });
        });
    },
    
    // Helper function for safe number display
    safeNum(value, decimals = 2) {
        const num = Number(value);
        return isFinite(num) ? num.toFixed(decimals) : '--';
    }
};

// Make globally available
window.ResultsManager = ResultsManager;
