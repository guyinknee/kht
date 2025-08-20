/**
 * Sidebar Manager Module
 * Handles dynamic sidebar content based on mode
 */

const SidebarManager = {
    currentMode: 'green',
    
    // Initialize sidebar
    initialize() {
        console.log('Initializing sidebar...');
        this.setupEventHandlers();
    },
    
    // Setup event handlers
    setupEventHandlers() {
        // Handle input changes
        document.getElementById('sidebar-panels').addEventListener('change', (e) => {
            this.handleInputChange(e);
        });
    },
    
    // Update sidebar for mode
    updateForMode(mode) {
        console.log('Updating sidebar for mode:', mode);
        this.currentMode = mode;
        
        const container = document.getElementById('sidebar-panels');
        container.innerHTML = '';
        
        switch (mode) {
            case 'green':
                container.innerHTML = this.getGreenHydrogenPanels();
                break;
            case 'blue':
                container.innerHTML = this.getBlueHydrogenPanels();
                break;
            case 'derivatives':
                container.innerHTML = this.getDerivativesPanels();
                break;
        }
        
        // Add common economic parameters panel
        container.innerHTML += this.getEconomicPanel();
        
        // Initialize any special controls
        this.initializeControls();
    },
    
    // Green Hydrogen Panels
    getGreenHydrogenPanels() {
        return `
            <div class="panel green-mode-panel">
                <h3 class="panel-title">Region & Resources</h3>
                <div class="form-group">
                    <label>Select Region</label>
                    <select id="region-select">
                        <option value="">All Regions</option>
                        ${this.getRegionOptions()}
                    </select>
                </div>
                <div class="form-group">
                <label>Water Source Type</label>
                <select id="water-source-type">
                    <option value="freshwater">Fresh Water (Rivers/Lakes)</option>
                    <option value="groundwater">Groundwater</option>
                    <option value="brackish">Brackish Water</option>
                    <option value="seawater">Sea Water</option>
                    <option value="wastewater">Treated Wastewater</option>
                </select>
            </div>
                <div class="form-group">
                    <label>Renewable Energy Source</label>
                    <select id="renewable-source">
                        <option value="solar">Solar PV</option>
                        <option value="wind">Wind</option>
                        <option value="hybrid">Hybrid (Solar + Wind)</option>
                    </select>
                </div>
            </div>
            
            <div class="panel green-mode-panel">
                <h3 class="panel-title">Electrolyzer Configuration</h3>
                <div class="form-group">
                    <label>Electrolyzer Type</label>
                    <select id="electrolyzer-type">
                        <option value="PEM">PEM Electrolyzer</option>
                        <option value="Alkaline">Alkaline Electrolyzer</option>
                        <option value="SOEC">Solid Oxide Electrolyzer</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Electrolyzer Capacity (MW)</label>
                    <input type="number" id="electrolyzer-capacity" value="100" min="1" max="1000" step="10">
                </div>
                <div class="form-group">
                    <label>Load Factor (%)
                        <span class="info-icon" data-tooltip="Operating hours as % of year">?</span>
                    </label>
                    <input type="number" id="load-factor" value="40" min="10" max="100" step="5">
                </div>
                <div class="form-group">
                    <label>Stack Efficiency (%)
                        <span class="info-icon" data-tooltip="Electrolyzer stack efficiency">?</span>
                    </label>
                    <input type="number" id="stack-efficiency" value="70" min="50" max="85" step="1">
                </div>
            </div>
            
            <div class="panel green-mode-panel">
                <h3 class="panel-title">Water Requirements</h3>
                <div class="form-group">
                    <label>Water Consumption (L/kg H₂)</label>
                    <input type="number" id="water-consumption" value="9" min="9" max="20" step="0.5" readonly>
                </div>
                <div class="form-group">
                    <label>Water Treatment Required</label>
                    <select id="water-treatment">
                        <option value="none">None (Ultra-pure water)</option>
                        <option value="basic">Basic Treatment</option>
                        <option value="desalination">Desalination Required</option>
                        <option value="advanced">Advanced Treatment</option>
                    </select>
                </div>
            </div>
        `;
    },
    
    // Blue Hydrogen Panels
    getBlueHydrogenPanels() {
        return `
            <div class="panel blue-mode-panel">
                <h3 class="panel-title">Gas Field Selection</h3>
                <div class="form-group">
                    <label>Select Gas Field</label>
                    <select id="gas-field-select">
                        <option value="">Select a field...</option>
                        ${this.getGasFieldOptions()}
                    </select>
                </div>
                <div class="form-group">
                    <label>Gas Composition</label>
                    <div id="gas-composition-display" style="padding: 10px; background: #f5f5f5; border-radius: 4px;">
                        <div>CH₄: <span id="ch4-percent">--</span>%</div>
                        <div>C₂H₆: <span id="c2h6-percent">--</span>%</div>
                        <div>C₃H₈: <span id="c3h8-percent">--</span>%</div>
                        <div>C₄H₁₀: <span id="c4h10-percent">--</span>%</div>
                        <div>C₅H₁₂: <span id="c5h12-percent">--</span>%</div>
                        <div>Other: <span id="other-percent">--</span>%</div>
                    </div>
                </div>
            </div>
            
            <div class="panel blue-mode-panel">
                <h3 class="panel-title">Reforming Technology</h3>
                <div class="form-group">
                    <label>Technology Type</label>
                    <select id="reforming-tech">
                        <option value="SMR">Steam Methane Reforming (SMR)</option>
                        <option value="ATR">Autothermal Reforming (ATR)</option>
                        <option value="POX">Partial Oxidation (POX)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Plant Capacity (MW)</label>
                    <input type="number" id="plant-capacity" value="100" min="10" max="500" step="10">
                </div>
                <div class="form-group">
                    <label>Carbon Capture Rate (%)
                        <span class="info-icon" data-tooltip="Percentage of CO₂ captured">?</span>
                    </label>
                    <input type="number" id="capture-rate" value="90" min="0" max="99" step="5">
                </div>
                <div class="form-group">
                    <label>Steam to Carbon Ratio</label>
                    <input type="number" id="steam-carbon-ratio" value="3" min="2" max="5" step="0.1">
                </div>
            </div>
            
            <div class="panel blue-mode-panel">
                <h3 class="panel-title">CO₂ Management</h3>
                <div class="form-group">
                    <label>CO₂ Storage Site</label>
                    <select id="co2-storage-select">
                        <option value="">Select storage site...</option>
                        ${this.getCO2StorageOptions()}
                    </select>
                </div>
                <div class="form-group">
                    <label>Transport Distance (km)</label>
                    <input type="number" id="co2-transport-distance" value="50" min="0" max="500" step="10">
                </div>
                <div class="form-group">
                    <label>CO₂ Price ($/tonne)</label>
                    <input type="number" id="co2-price" value="50" min="0" max="200" step="10">
                </div>
            </div>
        `;
    },
    
    // Derivatives Panels
    getDerivativesPanels() {
        return `
            <div class="panel derivatives-mode-panel">
                <h3 class="panel-title">Hydrogen Source</h3>
                <div class="form-group">
                    <label>Hydrogen Type</label>
                    <select id="h2-source-type">
                        <option value="green">Green Hydrogen</option>
                        <option value="blue">Blue Hydrogen</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>H₂ Input Price ($/kg)</label>
                    <input type="number" id="h2-input-price" value="3" min="1" max="10" step="0.1">
                </div>
            </div>
            
            <div class="panel derivatives-mode-panel">
                <h3 class="panel-title">Product Selection</h3>
                <div class="form-group">
                    <label>Derivative Product</label>
                    <select id="derivative-product">
                        <option value="ammonia">Ammonia (NH₃)</option>
                        <option value="methanol">Methanol (CH₃OH)</option>
                        <option value="e-fuels">Synthetic Fuels</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Plant Capacity (kt/year)</label>
                    <input type="number" id="derivative-capacity" value="100" min="10" max="1000" step="10">
                </div>
                <div class="form-group">
                    <label>Process Efficiency (%)</label>
                    <input type="number" id="process-efficiency" value="85" min="70" max="95" step="1">
                </div>
            </div>
            
            <div class="panel derivatives-mode-panel">
                <h3 class="panel-title">Feedstock Requirements</h3>
                <div class="form-group" id="nitrogen-group" style="display: none;">
                    <label>Nitrogen Source</label>
                    <select id="nitrogen-source">
                        <option value="air">Air Separation Unit</option>
                        <option value="pipeline">Pipeline Supply</option>
                    </select>
                </div>
                <div class="form-group" id="co2-group" style="display: none;">
                    <label>CO₂ Source</label>
                    <select id="co2-source">
                        <option value="captured">Captured CO₂</option>
                        <option value="dac">Direct Air Capture</option>
                        <option value="biogenic">Biogenic CO₂</option>
                    </select>
                </div>
            </div>
        `;
    },
    
    // Economic Parameters Panel (common to all modes)
    getEconomicPanel() {
        return `
            <div class="panel">
                <h3 class="panel-title collapsible-header">
                    Economic Parameters
                    <span class="collapse-icon">▼</span>
                </h3>
                <div class="collapsible-content">
                    <div class="form-group">
                        <label>Discount Rate (%)</label>
                        <input type="number" id="discount-rate" value="10" min="0" max="20" step="0.5">
                    </div>
                    <div class="form-group">
                        <label>Project Lifetime (years)</label>
                        <input type="number" id="project-lifetime" value="25" min="10" max="40" step="5">
                    </div>
                    <div class="form-group">
                        <label>Electricity Price ($/MWh)</label>
                        <input type="number" id="electricity-price" value="50" min="10" max="200" step="5">
                    </div>
                    <div class="form-group">
                        <label>Natural Gas Price ($/MMBtu)</label>
                        <input type="number" id="gas-price" value="3" min="1" max="10" step="0.5">
                    </div>
                    <div class="form-group">
                        <label>CAPEX Adjustment Factor (%)</label>
                        <input type="number" id="capex-factor" value="0" min="-30" max="30" step="5">
                    </div>
                    <div class="form-group">
                        <label>OPEX Adjustment Factor (%)</label>
                        <input type="number" id="opex-factor" value="0" min="-30" max="30" step="5">
                    </div>
                </div>
            </div>
        `;
    },
    
    // Get region options
    getRegionOptions() {
        const regions = AppState.data.regionsWithBorders;
        if (!regions || !regions.features) return '';
        
        return regions.features.map(feature => {
            const name = feature.properties.name_en || feature.properties.name;
            return `<option value="${name}">${name}</option>`;
        }).join('');
    },
    
    // Get gas field options
    getGasFieldOptions() {
        const fields = AppState.data.oilGasFields;
        if (!fields || fields.length === 0) return '<option value="">No fields available</option>';
        
        return fields.map(field => {
            return `<option value="${field.id}">${field.name}</option>`;
        }).join('');
    },
    
    // Get CO2 storage options
    getCO2StorageOptions() {
        const sites = AppState.data.co2Storage;
        if (!sites || sites.length === 0) return '<option value="">No storage sites available</option>';
        
        return sites.map(site => {
            return `<option value="${site.id}">${site.name} (${site.storage_capacity_mt} Mt)</option>`;
        }).join('');
    },
    
    // Initialize special controls
    initializeControls() {
        // Setup collapsible sections
        document.querySelectorAll('.collapsible-header').forEach(header => {
            header.addEventListener('click', () => {
                header.classList.toggle('collapsed');
                const content = header.nextElementSibling;
                content.classList.toggle('collapsed');
            });
        });
        
        // Setup derivative product change handler
        const derivativeSelect = document.getElementById('derivative-product');
        if (derivativeSelect) {
            derivativeSelect.addEventListener('change', (e) => {
                this.updateDerivativeFeedstock(e.target.value);
            });
            // Initial update
            this.updateDerivativeFeedstock(derivativeSelect.value);
        }
        
        // Setup gas field selection handler with proper binding
        const gasFieldSelect = document.getElementById('gas-field-select');
        if (gasFieldSelect) {
            // Remove any existing listeners first
            const newSelect = gasFieldSelect.cloneNode(true);
            gasFieldSelect.parentNode.replaceChild(newSelect, gasFieldSelect);
            
            // Add the event listener to the new element
            newSelect.addEventListener('change', (e) => {
                console.log('Gas field select changed:', e.target.value);
                this.updateGasComposition(e.target.value);
                
                // Also update the map selection if needed
                const fieldId = e.target.value;
                if (fieldId) {
                    const field = AppState.data.oilGasFields.find(f => f.id == fieldId);
                    if (field) {
                        AppState.selectedPoint = field;
                    }
                }
            });
        }
    },
    
    // Update derivative feedstock requirements
    updateDerivativeFeedstock(product) {
        const nitrogenGroup = document.getElementById('nitrogen-group');
        const co2Group = document.getElementById('co2-group');
        
        if (nitrogenGroup && co2Group) {
            switch (product) {
                case 'ammonia':
                    nitrogenGroup.style.display = 'block';
                    co2Group.style.display = 'none';
                    break;
                case 'methanol':
                case 'e-fuels':
                    nitrogenGroup.style.display = 'none';
                    co2Group.style.display = 'block';
                    break;
            }
        }
    },
    
    // Update gas composition display
    updateGasComposition(fieldId) {
        console.log('Updating gas composition for field:', fieldId);
        
        // Find the field in the data
        const field = AppState.data.oilGasFields.find(f => f.id == fieldId || f.id === parseInt(fieldId));
        
        console.log('Found field:', field);
        
        // Get the display elements
        const ch4Element = document.getElementById('ch4-percent');
        const c2h6Element = document.getElementById('c2h6-percent');
        const c3h8Element = document.getElementById('c3h8-percent');
        const c4h10Element = document.getElementById('c4h10-percent');
        const c5h12Element = document.getElementById('c5h12-percent');
        const otherElement = document.getElementById('other-percent');
        
        if (field && ch4Element && c2h6Element && c3h8Element && c4h10Element && c5h12Element && otherElement) {
            // Update the display with actual values
            ch4Element.textContent = field.methane_percent || 0;
            c2h6Element.textContent = field.ethane_percent || 0;
            c3h8Element.textContent = field.propane_percent || 0;
            c4h10Element.textContent = field.butane_percent || 0;
            c5h12Element.textContent = field.pentane_percent || 0;
            otherElement.textContent = 100 - (field.methane_percent || 0) - (field.ethane_percent || 0) - (field.propane_percent || 0) - (field.butane_percent || 0) - (field.pentane_percent || 0);
            
            console.log('Updated gas composition display:', {
                CH4: field.methane_percent,
                C2H6: field.ethane_percent,
                C3H8: field.propane_percent,
                C4H10: field.butane_percent,
                C5H12: field.pentane_percent,
                Other: field.other_gases_percent
            });
        } else {
            // Reset to default if no field selected
            if (ch4Element) ch4Element.textContent = '--';
            if (c2h6Element) c2h6Element.textContent = '--';
            if (c3h8Element) c3h8Element.textContent = '--';
            if (c4h10Element) c4h10Element.textContent = '--';
            if (c5h12Element) c5h12Element.textContent = '--';
            if (otherElement) otherElement.textContent = '--';
            
            console.log('Reset gas composition display - no field or elements not found');
        }
    },
    
    // Handle input changes
    handleInputChange(e) {
        const input = e.target;
        const id = input.id;
        const value = input.type === 'checkbox' ? input.checked : input.value;
        
        // Update app state
        this.updateAppState(id, value);
        
        // Trigger any dependent updates
        this.handleDependentUpdates(id, value);
    },
    
    // Update app state
    updateAppState(inputId, value) {
        // Map input IDs to state paths
        // This is a simplified version - implement full mapping
        const stateMap = {
            'region-select': 'selectedRegion',
            'electrolyzer-capacity': 'inputs.greenH2.capacity',
            'load-factor': 'inputs.greenH2.loadFactor',
            'gas-field-select': 'inputs.blueH2.field',
            'capture-rate': 'inputs.blueH2.captureRate',
            'derivative-product': 'inputs.derivatives.product'
        };
        
        if (stateMap[inputId]) {
            // Set nested property in AppState
            const path = stateMap[inputId].split('.');
            let obj = AppState;
            for (let i = 0; i < path.length - 1; i++) {
                obj = obj[path[i]];
            }
            obj[path[path.length - 1]] = value;
        }
    },
    
    // Handle dependent updates
    handleDependentUpdates(inputId, value) {
        // Handle any cascading updates based on input changes
        switch (inputId) {
            case 'water-source-type':
                this.updateWaterTreatment(value);
                break;
            case 'electrolyzer-type':
                this.updateElectrolyzerDefaults(value);
                break;
        }
    },
    
    // Update water treatment requirements
    updateWaterTreatment(waterType) {
        const treatmentSelect = document.getElementById('water-treatment');
        if (!treatmentSelect) return;
        
        switch (waterType) {
            case 'sea':
                treatmentSelect.value = 'desalination';
                break;
            case 'wastewater':
                treatmentSelect.value = 'advanced';
                break;
            case 'river':
                treatmentSelect.value = 'basic';
                break;
            case 'groundwater':
                treatmentSelect.value = 'basic';
                break;
        }
    },
    
    // Update electrolyzer defaults
    updateElectrolyzerDefaults(type) {
        const efficiencyInput = document.getElementById('stack-efficiency');
        if (!efficiencyInput) return;
        
        const defaults = {
            'PEM': 70,
            'Alkaline': 65,
            'SOEC': 85
        };
        
        efficiencyInput.value = defaults[type] || 70;
    }
};