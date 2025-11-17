
const SidebarManager = {
  currentMode: 'green',

  initialize() {
    console.log('Initializing sidebar....');
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

    if (mode === 'green') {
        container.innerHTML = this.getGreenHydrogenPanels();
    } else if (mode === 'blue') {
        container.innerHTML = this.getBlueHydrogenPanels();
    } else if (mode === 'derivatives') {
        container.innerHTML = this.getDerivativesPanels();
    } else {
        container.innerHTML = '<div class="panel"><p>Mode not supported.</p></div>';
    }

    // Append shared economics
    container.innerHTML += this.getEconomicPanel();

    // Activate controls/toggles for whichever mode is active
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
            <option value="freshwater">Surface Freshwater</option>
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
        <h3 class="panel-title">Gas Field</h3>
        <div class="form-group">
            <label>Select Gas Field</label>
            <select id="gas-field-select">
            <option value="">Select a field…</option>
            ${this.getGasFieldOptions()}
            </select>
        </div>

        <div class="form-group">
        </div>
        </div>

        <div class="panel blue-mode-panel">
        <h3 class="panel-title">Sizing</h3>
        <div class="form-group">
            <label>Sizing Mode</label>
            <select id="blue-sizing-mode">
            <option value="all" selected>Use all available gas (from field)</option>
            <option value="custom">Specify amount</option>
            </select>
        </div>
        <div class="form-group" id="blue-gas-amount-wrap" style="display:none;">
            <label>Gas Amount (m³/hr)</label>
            <input type="number" id="blue-gas-amount" value="1000" min="1" step="1">
        </div>
        <div class="form-hint" id="blue-gas-amount-hint" style="font-size:12px;color:#5b6b7a"></div>
        </div>

        <div class="panel blue-mode-panel">
        <h3 class="panel-title">Process Options</h3>
        <div class="form-group">
            <label>Reformer Technology</label>
            <select id="reforming-tech">
            <option value="SMR" selected>Steam Methane Reforming (SMR)</option>
            <option value="ATR">Autothermal Reforming (ATR)</option>
            <option value="POX">Partial Oxidation (POX)</option>
            </select>
        </div>
        <div class="form-group">
            <label>CO₂ Capture Rate</label>
            <select id="capture-rate">
            <option value="90" selected>90%</option>
            <option value="95">95%</option>
            </select>
        </div>
        <div class="form-group">
            <label>CO₂ Fate</label>
            <select id="co2-fate">
            <option value="eor" selected>Enhanced Oil Recovery (EOR)</option>
            <option value="storage">Permanent Storage</option>
            </select>
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

        // BLUE: show/hide custom gas amount
        const blueSizing = document.getElementById('blue-sizing-mode');
        const blueAmtWrap = document.getElementById('blue-gas-amount-wrap');
        const blueAmt = document.getElementById('blue-gas-amount');
        const blueHint = document.getElementById('blue-gas-amount-hint');
        const gasFieldSel = document.getElementById('gas-field-select');

        function refreshBlueSizingUI() {
        if (!blueSizing) return;
        const mode = blueSizing.value;
        if (mode === 'custom') {
            blueAmtWrap && (blueAmtWrap.style.display = 'block');
            blueHint && (blueHint.textContent = '');
        } else {
            blueAmtWrap && (blueAmtWrap.style.display = 'none');
            // show info about the field’s available gas if selected
            if (gasFieldSel && gasFieldSel.value) {
            const f = AppState.data.oilGasFields?.find(x => x.id == gasFieldSel.value || x.id === parseInt(gasFieldSel.value));
            if (f && typeof f.gas_amount !== 'undefined') {
                blueHint && (blueHint.textContent = `Using field capacity: ${f.gas_amount} m³/hr`);
            } else {
                blueHint && (blueHint.textContent = '');
            }
            } else {
            blueHint && (blueHint.textContent = '');
            }
        }
        }

        if (blueSizing) {
        blueSizing.addEventListener('change', refreshBlueSizingUI);
        refreshBlueSizingUI();
        }

        // update composition + hint when field changes
        if (gasFieldSel) {
        gasFieldSel.addEventListener('change', () => {
            this.updateGasComposition(gasFieldSel.value);
            refreshBlueSizingUI();
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

    // --- NEW: notify schematics + collapse results on any change ---
    if (window.ResultsManager) {
      // If results are visible, collapse them when any input changes
      const panel = document.getElementById('results-panel');
      if (panel && panel.classList.contains('show')) {
        panel.classList.remove('show');
      }
    }
    if (window.SchematicsManager) {
      const mode = (window.AppState && window.AppState.mode) || this.currentMode || 'green';
      SchematicsManager.setMode(mode);
      // Map DOM values -> schematic state
        const props = window.AppState?.selectedRegion?.properties || {};
        const regionLabel = props.region_name_en || props.name_en || props.region_name || props.name || props.NAME_1;
        const resSel = document.getElementById('renewable-source')?.value || 'solar';

        // Map sidebar water values -> schematic icon keys
        const waterRaw = document.getElementById('water-source-type')?.value || 'freshwater';
        const waterSel = ({freshwater:'fresh', brackish:'brackish', treated:'waste', groundwater:'ground'})[waterRaw] || 'fresh';

        // Electrolyzer
        const elySel = document.getElementById('electrolyzer-type')?.value || 'PEM';

        // Blue-mode mappings
        const reformSel = document.getElementById('reforming-tech')?.value || 'SMR';
        const fateRaw   = document.getElementById('co2-fate')?.value || 'storage';  // 'eor' | 'storage'
        const co2DispSel = fateRaw === 'eor' ? 'EOR' : 'CCS';

        // Gas field label (text of the selected option)
        const gfSel = document.getElementById('gas-field-select');
        const gasFieldLabel = gfSel && gfSel.value ? (gfSel.options[gfSel.selectedIndex].textContent || 'Gas Field') : null;

        const patch = {
        gasFieldLabel,
        resType: resSel,
        waterType: waterSel,
        electrolyzer: elySel,
        reformer: reformSel,
        co2Disposition: co2DispSel
        };
        if (regionLabel) patch.regionLabel = regionLabel; // only set if truthy
        SchematicsManager.setState(patch);
                }

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
