/**
 * Results Manager Module
 * Handles display and visualization of calculation results
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
        }
    },
    
    // Display results based on mode
    displayResults(results, mode) {
        console.log('Displaying results for mode:', mode, results);
        
        this.currentResults = results;
        this.currentMode = mode;
        
        // Show results panel
        document.getElementById('results-panel').style.display = 'block';
        
        // Update title
        const titles = {
            green: 'Green Hydrogen Results',
            blue: 'Blue Hydrogen Results',
            derivatives: `${results.product ? results.product.charAt(0).toUpperCase() + results.product.slice(1) : 'Derivatives'} Production Results`
        };
        document.getElementById('results-title').textContent = titles[mode];
        
        // Show summary tab by default
        this.showTab('summary');
        
        // Populate all tabs
        this.populateSummaryTab(results, mode);
        this.populateEconomicsTab(results, mode);
        this.populateTechnicalTab(results, mode);
        this.populateEnvironmentalTab(results, mode);
    },
    
    // Populate summary tab
    populateSummaryTab(results, mode) {
        const content = document.getElementById('tab-content');
        
        let html = '<div class="tab-content" id="summary-content">';
        
        // Key metrics grid
        html += '<div class="metrics-grid">';
        
        if (mode === 'derivatives') {
            html += `
                <div class="metric">
                    <div class="metric-label">Production Cost</div>
                    <div class="metric-value">$${results.totalProductCost?.toFixed(0) || '--'} <span class="metric-unit">/tonne</span></div>
                </div>
                <div class="metric">
                    <div class="metric-label">Annual Production</div>
                    <div class="metric-value">${results.annualProduction?.toFixed(1) || '--'} <span class="metric-unit">kt/yr</span></div>
                </div>
            `;
        } else {
            html += `
                <div class="metric">
                    <div class="metric-label">LCOH</div>
                    <div class="metric-value">$${results.lcoh?.toFixed(2) || '--'} <span class="metric-unit">/kg</span></div>
                </div>
                <div class="metric">
                    <div class="metric-label">H₂ Production</div>
                    <div class="metric-value">${results.annualProduction?.toFixed(1) || '--'} <span class="metric-unit">t/yr</span></div>
                </div>
            `;
        }
        
        html += `
            <div class="metric">
                <div class="metric-label">Carbon Intensity</div>
                <div class="metric-value">${results.carbonIntensity?.toFixed(2) || '--'} <span class="metric-unit">kg CO₂/${mode === 'derivatives' ? 't' : 'kg'}</span></div>
            </div>
            <div class="metric">
                <div class="metric-label">Efficiency</div>
                <div class="metric-value">${(results.efficiency || results.systemEfficiency || results.processEfficiency)?.toFixed(1) || '--'} <span class="metric-unit">%</span></div>
            </div>
        </div>`;
        
        // LCOH/Cost breakdown chart
        html += `
            <div class="chart-container">
                <div class="chart-title">
                    ${mode === 'derivatives' ? 'Cost' : 'LCOH'} Breakdown
                    <div class="chart-options">
                        <span class="chart-option active" data-chart="pie">Pie</span>
                        <span class="chart-option" data-chart="bar">Bar</span>
                    </div>
                </div>
                <div class="chart-wrapper">
                    <canvas id="breakdown-chart"></canvas>
                </div>
            </div>
        `;
        
        // Summary cards
        html += '<div class="summary-card">';
        html += '<div class="summary-card-title"><span class="summary-card-icon">💰</span>Economic Summary</div>';
        html += '<div class="summary-card-content">';
        html += `<div>Total CAPEX: $${results.totalCapex?.toFixed(1) || '--'} M</div>`;
        html += `<div>Annual OPEX: $${results.annualOpex?.toFixed(1) || '--'} M/yr</div>`;
        html += `<div>NPV: $${results.npv?.toFixed(1) || '--'} M</div>`;
        html += `<div>Payback: ${results.paybackPeriod?.toFixed(1) || '--'} years</div>`;
        html += '</div></div>';
        
        html += '</div>';
        
        content.innerHTML = html;
        
        // Create breakdown chart
        this.createBreakdownChart(results, mode);
        
        // Setup chart option listeners
        this.setupChartOptions();
    },
    
    // Populate economics tab
    populateEconomicsTab(results, mode) {
        // Store HTML template for economics tab
        this.economicsHTML = `
            <div class="tab-content" id="economics-content" style="display: none;">
                <div class="metrics-grid">
                    <div class="metric">
                        <div class="metric-label">Total CAPEX</div>
                        <div class="metric-value">$${results.totalCapex?.toFixed(1) || '--'} <span class="metric-unit">M</span></div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Annual OPEX</div>
                        <div class="metric-value">$${results.annualOpex?.toFixed(1) || '--'} <span class="metric-unit">M/yr</span></div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">NPV @ ${document.getElementById('discount-rate')?.value || 10}%</div>
                        <div class="metric-value">$${results.npv?.toFixed(1) || '--'} <span class="metric-unit">M</span></div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">IRR</div>
                        <div class="metric-value">${results.irr?.toFixed(1) || '--'} <span class="metric-unit">%</span></div>
                    </div>
                    <div class="metric metric-full">
                        <div class="metric-label">Simple Payback Period</div>
                        <div class="metric-value">${results.paybackPeriod?.toFixed(1) || '--'} <span class="metric-unit">years</span></div>
                    </div>
                </div>
                
                ${mode === 'derivatives' ? `
                <div class="summary-card">
                    <div class="summary-card-title">Market Analysis</div>
                    <div class="summary-card-content">
                        <div>Market Price: $${results.marketPrice || '--'}/tonne</div>
                        <div>Production Cost: $${results.totalProductCost?.toFixed(0) || '--'}/tonne</div>
                        <div>Gross Margin: ${results.grossMargin?.toFixed(1) || '--'}%</div>
                        <div>Competitiveness: ${results.competitiveness?.toFixed(1) || '--'}%</div>
                    </div>
                </div>
                ` : ''}
                
                <div class="chart-container">
                    <div class="chart-title">Cash Flow Analysis</div>
                    <div class="chart-wrapper">
                        <canvas id="cashflow-chart"></canvas>
                    </div>
                </div>
            </div>
        `;
    },
    
    // Populate technical tab
    populateTechnicalTab(results, mode) {
        this.technicalHTML = `
            <div class="tab-content" id="technical-content" style="display: none;">
                <div class="metrics-grid">
                    ${mode === 'green' ? `
                        <div class="metric">
                            <div class="metric-label">Specific Energy</div>
                            <div class="metric-value">${results.specificEnergy?.toFixed(1) || '--'} <span class="metric-unit">kWh/kg</span></div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">Water Consumption</div>
                            <div class="metric-value">${results.waterConsumption?.toFixed(1) || '--'} <span class="metric-unit">L/kg</span></div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">Annual Energy Use</div>
                            <div class="metric-value">${results.annualEnergyUse?.toFixed(0) || '--'} <span class="metric-unit">MWh/yr</span></div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">Annual Water Use</div>
                            <div class="metric-value">${results.annualWaterUse?.toFixed(0) || '--'} <span class="metric-unit">m³/yr</span></div>
                        </div>
                    ` : mode === 'blue' ? `
                        <div class="metric">
                            <div class="metric-label">Gas Consumption</div>
                            <div class="metric-value">${results.specificGasConsumption?.toFixed(1) || '--'} <span class="metric-unit">MMBtu/kg</span></div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">Annual Gas Use</div>
                            <div class="metric-value">${results.gasConsumption?.toFixed(3) || '--'} <span class="metric-unit">BCM/yr</span></div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">CO₂ Capture Rate</div>
                            <div class="metric-value">${results.captureRate || '--'} <span class="metric-unit">%</span></div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">Process Efficiency</div>
                            <div class="metric-value">${results.efficiency?.toFixed(1) || '--'} <span class="metric-unit">%</span></div>
                        </div>
                    ` : `
                        <div class="metric">
                            <div class="metric-label">H₂ Consumption</div>
                            <div class="metric-value">${results.h2Consumption?.toFixed(0) || '--'} <span class="metric-unit">t/yr</span></div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">H₂ Intensity</div>
                            <div class="metric-value">${results.h2Intensity?.toFixed(3) || '--'} <span class="metric-unit">t H₂/t product</span></div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">Energy Consumption</div>
                            <div class="metric-value">${results.energyConsumption?.toFixed(1) || '--'} <span class="metric-unit">GWh/yr</span></div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">Process Efficiency</div>
                            <div class="metric-value">${results.processEfficiency?.toFixed(1) || '--'} <span class="metric-unit">%</span></div>
                        </div>
                    `}
                </div>
                
                <div class="chart-container">
                    <div class="chart-title">Energy Balance</div>
                    <div class="chart-wrapper">
                        <canvas id="energy-chart"></canvas>
                    </div>
                </div>
            </div>
        `;
    },
    
    // Populate environmental tab
    populateEnvironmentalTab(results, mode) {
        this.environmentalHTML = `
            <div class="tab-content" id="environmental-content" style="display: none;">
                <div class="metrics-grid">
                    <div class="metric">
                        <div class="metric-label">Carbon Intensity</div>
                        <div class="metric-value">${results.carbonIntensity?.toFixed(2) || '--'} <span class="metric-unit">kg CO₂/${mode === 'derivatives' ? 't' : 'kg'}</span></div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Annual Emissions</div>
                        <div class="metric-value">${results.annualCO2Emissions?.toFixed(0) || '--'} <span class="metric-unit">t CO₂/yr</span></div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">CO₂ Avoided</div>
                        <div class="metric-value">${results.co2Avoided?.toFixed(0) || '--'} <span class="metric-unit">t CO₂/yr</span></div>
                    </div>
                    ${mode === 'blue' ? `
                    <div class="metric">
                        <div class="metric-label">CO₂ Captured</div>
                        <div class="metric-value">${results.co2Captured?.toFixed(0) || '--'} <span class="metric-unit">t CO₂/yr</span></div>
                    </div>
                    ` : ''}
                </div>
                
                <div class="progress-bar-container">
                    <div class="progress-bar-label">
                        <span>Carbon Reduction vs Conventional</span>
                        <span>${((results.co2Avoided / (results.annualProduction * 10)) * 100).toFixed(0)}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-bar-fill" style="width: ${Math.min(100, (results.co2Avoided / (results.annualProduction * 10)) * 100)}%"></div>
                    </div>
                </div>
                
                <div class="chart-container">
                    <div class="chart-title">Emissions Comparison</div>
                    <div class="chart-wrapper">
                        <canvas id="emissions-chart"></canvas>
                    </div>
                </div>
            </div>
        `;
    },
    
    // Show specific tab
    showTab(tabName) {
        const content = document.getElementById('tab-content');
        
        switch (tabName) {
            case 'summary':
                this.populateSummaryTab(this.currentResults, this.currentMode);
                break;
            case 'economics':
                content.innerHTML = this.economicsHTML;
                this.createCashflowChart();
                break;
            case 'technical':
                content.innerHTML = this.technicalHTML;
                this.createEnergyChart();
                break;
            case 'environmental':
                content.innerHTML = this.environmentalHTML;
                this.createEmissionsChart();
                break;
        }
    },
    
    // Create breakdown chart
    createBreakdownChart(results, mode) {
        const ctx = document.getElementById('breakdown-chart');
        if (!ctx) return;
        
        let data, labels;
        
        if (mode === 'derivatives') {
            labels = ['H₂ Feedstock', 'Other Feedstock', 'Energy', 'Other'];
            data = [
                results.costBreakdown?.h2Feedstock || 40,
                results.costBreakdown?.otherFeedstock || 20,
                results.costBreakdown?.energy || 25,
                results.costBreakdown?.other || 15
            ];
        } else {
            const breakdown = results.lcohBreakdown || {};
            labels = Object.keys(breakdown).map(k => k.charAt(0).toUpperCase() + k.slice(1));
            data = Object.values(breakdown);
        }
        
        if (this.charts.breakdown) {
            this.charts.breakdown.destroy();
        }
        
        this.charts.breakdown = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: ['#4caf50', '#2196f3', '#ff9800', '#9c27b0'],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const label = ctx.label || '';
                                const value = mode === 'derivatives' ? 
                                    `${ctx.parsed.toFixed(1)}%` : 
                                    `$${ctx.parsed.toFixed(2)}/kg`;
                                return `${label}: ${value}`;
                            }
                        }
                    }
                }
            }
        });
    },
    
    // Create cashflow chart
    createCashflowChart() {
        const ctx = document.getElementById('cashflow-chart');
        if (!ctx) return;
        
        // Generate cashflow data
        const years = Array.from({length: 26}, (_, i) => i);
        const cashflows = years.map(year => {
            if (year === 0) return -this.currentResults.totalCapex;
            return this.currentResults.annualProduction * 4 - this.currentResults.annualOpex;
        });
        
        const cumulativeCashflow = [];
        let cumulative = 0;
        cashflows.forEach(cf => {
            cumulative += cf;
            cumulativeCashflow.push(cumulative);
        });
        
        if (this.charts.cashflow) {
            this.charts.cashflow.destroy();
        }
        
        this.charts.cashflow = new Chart(ctx, {
            type: 'line',
            data: {
                labels: years,
                datasets: [{
                    label: 'Annual Cash Flow',
                    data: cashflows,
                    borderColor: '#2196f3',
                    backgroundColor: 'rgba(33, 150, 243, 0.1)',
                    tension: 0.1
                }, {
                    label: 'Cumulative Cash Flow',
                    data: cumulativeCashflow,
                    borderColor: '#4caf50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Year'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Cash Flow (M$)'
                        }
                    }
                }
            }
        });
    },
    
    // Create energy chart
    createEnergyChart() {
        const ctx = document.getElementById('energy-chart');
        if (!ctx) return;
        
        // Placeholder for energy balance visualization
        if (this.charts.energy) {
            this.charts.energy.destroy();
        }
        
        this.charts.energy = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Input Energy', 'Useful Output', 'Losses'],
                datasets: [{
                    label: 'Energy Flow (MWh/year)',
                    data: [
                        this.currentResults.annualEnergyUse || 100,
                        (this.currentResults.annualEnergyUse || 100) * 0.7,
                        (this.currentResults.annualEnergyUse || 100) * 0.3
                    ],
                    backgroundColor: ['#2196f3', '#4caf50', '#ff9800']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    },
    
    // Create emissions chart
    createEmissionsChart() {
        const ctx = document.getElementById('emissions-chart');
        if (!ctx) return;
        
        if (this.charts.emissions) {
            this.charts.emissions.destroy();
        }
        
        const conventional = this.currentResults.annualProduction * 10; // Grey H2 baseline
        const project = this.currentResults.annualCO2Emissions || 0;
        
        this.charts.emissions = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Conventional', 'This Project', 'Reduction'],
                datasets: [{
                    label: 'CO₂ Emissions (tonnes/year)',
                    data: [conventional, project, conventional - project],
                    backgroundColor: ['#f44336', '#4caf50', '#2196f3']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    },
    
    // Setup chart option listeners
    setupChartOptions() {
        document.querySelectorAll('.chart-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const chartType = e.target.dataset.chart;
                // Update active state
                e.target.parentElement.querySelectorAll('.chart-option').forEach(opt => {
                    opt.classList.remove('active');
                });
                e.target.classList.add('active');
                
                // Update chart type
                if (this.charts.breakdown) {
                    this.charts.breakdown.config.type = chartType;
                    this.charts.breakdown.update();
                }
            });
        });
    }
};