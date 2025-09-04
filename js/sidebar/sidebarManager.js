
const SidebarManager = {
  currentMode: 'green',

  initialize() {
    console.log('Initializing sidebar...');
    this.setupEventHandlers();
  },

  setupEventHandlers() {
    const container = document.getElementById('sidebar-panels');
    if (!container) return;
    container.addEventListener('change', (e) => this.handleInputChange(e));
    container.addEventListener('input', (e) => this.handleInputChange(e));
  },

  updateForMode(mode) {
    console.log('Updating sidebar for mode:', mode);
    this.currentMode = mode;

    const container = document.getElementById('sidebar-panels');
    if (!container) return;
    container.innerHTML = '';

    // Only green mode panels are supported in this build
    container.innerHTML = this.getGreenHydrogenPanels();

    // Append common economics panel
    container.innerHTML += this.getEconomicPanel();

    // Activate controls/toggles
    this.initializeControls();
  },

  // --------- GREEN HYDROGEN PANELS (with procurement toggle) ----------
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
          <label>Water Type</label>
          <select id="water-source-type">
            <option value="freshwater">Freshwater</option>
            <option value="brackish">Brackish</option>
            <option value="treated">Treated Wastewater</option>
            <option value="groundwater">Groundwater</option>
          </select>
        </div>

        <div class="form-group">
          <label>Renewable Energy Source</label>
          <select id="renewable-source">
            <option value="solar">Solar</option>
            <option value="wind">Wind</option>
            <option value="hydro">Hydro</option>
          </select>
        </div>

        <div class="form-group">
          <label>Sizing Mode</label>
          <select id="sizing-mode">
            <option value="max" selected>Max capacity (use region land/points)</option>
            <option value="custom">Custom capacity (MW)</option>
          </select>
        </div>

        <div class="form-group" id="custom-capacity-group" style="display:none;">
          <label>Installed Capacity (MW)</label>
          <input type="number" id="installed-capacity-mw" value="100" min="1" max="100000" step="10">
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
      </div>

      <div class="panel green-mode-panel">
        <h3 class="panel-title">Electricity Procurement</h3>
        <div class="form-group">
          <label>How will electricity be sourced?</label>
          <select id="electricity-procurement">
            <option value="buy">Buy electricity (grid/PPA)</option>
            <option value="own">Own new RES (project-owned)</option>
          </select>
        </div>
      </div>

      <!-- SHOWN WHEN BUY -->
      <div class="panel green-mode-panel" id="price-panel" style="display:block;">
        <h3 class="panel-title">Electricity Prices by Source ($/kWh)</h3>
        <div class="form-group">
          <label>Solar</label>
          <input type="number" id="solar-lcoe" value="0.045" step="0.001" min="0.005" max="0.50">
        </div>
        <div class="form-group">
          <label>Wind</label>
          <input type="number" id="wind-lcoe" value="0.040" step="0.001" min="0.005" max="0.50">
        </div>
        <div class="form-group">
          <label>Hydro</label>
          <input type="number" id="hydro-lcoe" value="0.050" step="0.001" min="0.005" max="0.50">
        </div>
      </div>

      <!-- SHOWN WHEN OWN -->
      <div class="panel green-mode-panel" id="owned-res-panel" style="display:none;">
        <h3 class="panel-title">Owned RES CAPEX (USD per MW)</h3>
        <div class="form-group">
          <label>Solar CAPEX ($/MW)</label>
          <input type="number" id="owned-solar-capex-permw" value="900000" step="10000" min="300000" max="3000000">
        </div>
        <div class="form-group">
          <label>Wind CAPEX ($/MW)</label>
          <input type="number" id="owned-wind-capex-permw" value="1300000" step="10000" min="500000" max="4000000">
        </div>
        <div class="form-group">
          <label>Hydro CAPEX ($/MW)</label>
          <input type="number" id="owned-hydro-capex-permw" value="2500000" step="10000" min="500000" max="8000000">
        </div>
        <div class="form-group">
          <label>Owned RES Fixed O&M (% of RES CAPEX / year)</label>
          <input type="number" id="owned-res-fixedom-pct" value="2.0" step="0.1" min="0" max="10">
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
    // ---------- ECONOMICS (UPDATED: adds H2 selling price) ----------
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
    <input type="number" id="discount-rate" value="8" min="0" max="20" step="0.5">
    </div>
    <div class="form-group">
    <label>Project Lifetime (years)</label>
    <input type="number" id="project-lifetime" value="20" min="5" max="50" step="1">
    </div>
    <div class="form-group">
    <label>Hydrogen Selling Price ($/kg)</label>
    <input type="number" id="h2-price" value="7.00" min="0" max="50" step="0.1">
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
    const regions = AppState?.data?.regionsWithBorders;
    if (!regions || !regions.features) return '';
    return regions.features.map(f => {
    const name = f.properties.name_en || f.properties.name || f.properties.region_name_en || 'Region';
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
        
        // Show/Hide custom capacity input based on sizing mode
        const sizingMode = document.getElementById('sizing-mode');
        const customGroup = document.getElementById('custom-capacity-group');
            if (sizingMode && customGroup) {
            const sync = () => { customGroup.style.display = (sizingMode.value === 'custom') ? 'block' : 'none'; };
            sizingMode.addEventListener('change', sync);
            sync();
        }

        // electricity procurement toggle → show/hide panels
        const procurement = document.getElementById('electricity-procurement');
        const pricePanel = document.getElementById('price-panel');
        const ownedPanel = document.getElementById('owned-res-panel');
        if (procurement && pricePanel && ownedPanel) {
        const sync = () => {
        const own = procurement.value === 'own';
        ownedPanel.style.display = own ? 'block' : 'none';
        pricePanel.style.display = own ? 'none' : 'block';
        };
        procurement.addEventListener('change', sync); sync();
        }
        // When RES changes, we could show/hide irrelevant hints (optional)
       const resSel = document.getElementById('renewable-source');
       if (resSel) {
           resSel.addEventListener('change', () => {
               // no-op for now; calculator uses RES-specific LCOE & EF internally
           });
       }
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
    const id = e.target.id;
    const value = (e.target.type === 'number') ? parseFloat(e.target.value) : e.target.value;


    // Dispatch any dependent UI logic
    if (id === 'water-source-type') this.updateWaterTreatment(value);
    if (id === 'electrolyzer-type') this.updateElectrolyzerDefaults(value);


    // No-op mapping here; GreenHydrogenCalculator.gatherInputs will read DOM directly
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
            case 'brackish': treatmentSelect.value = 'desalination'; break;
            case 'treated':  treatmentSelect.value = 'advanced'; break;
            case 'freshwater':
            case 'groundwater': treatmentSelect.value = 'basic'; break;
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
window.SidebarManager = SidebarManager;