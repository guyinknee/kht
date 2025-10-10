/**
 * Kazakhstan Hydrogen Interactive Tool
 * Main Application Controller
 */

// Global Application State
window.AppState = {
    mode: 'green', // 'green', 'blue', or 'derivatives'
    selectedRegion: null,
    selectedPoint: null,
    mapLayers: {},
    data: {
        regions: null,
        renewablePoints: [],
        waterSources: [],
        demandPoints: [],
        oilGasFields: [],
        co2Storage: [],
        pipelines: []
    },
    inputs: {
        // Green Hydrogen Inputs
        greenH2: {
            region: null,
            waterSource: null,
            renewableSource: null,
            electrolyzerType: 'PEM',
            capacity: 100,
            loadFactor: 40,
            waterType: 'river'
        },
        // Blue Hydrogen Inputs
        blueH2: {
            field: null,
            technology: 'SMR',
            captureRate: 90,
            capacity: 100,
            loadFactor: 85
        },
        // Derivatives Inputs
        derivatives: {
            hydrogenSource: 'green',
            product: 'ammonia',
            capacity: 100,
            loadFactor: 90
        },
        // Economic Parameters
        economic: {
            discountRate: 10,
            projectLifetime: 25,
            electricityPrice: 50,
            gasPrice: 3,
            carbonPrice: 50
        }
    },
    results: null
};
// Lightweight loading helper
const Loading = (() => {
  const el = () => document.getElementById('app-loader');
  const bar = () => document.getElementById('loader-bar-fill');
  const txt = () => document.getElementById('loader-status');
  let pct = 0;
  function set(msg, p) {
    pct = Math.max(0, Math.min(100, p));
    if (bar()) bar().style.width = pct + '%';
    if (txt() && msg) txt().textContent = msg;
  }
  function step(msg, delta) { set(msg, pct + delta); }
  function show() { el()?.classList.remove('loader-hidden'); set('Starting…', 0); }
  function hide() { set('Done', 100); setTimeout(() => el()?.classList.add('loader-hidden'), 150); }
  return { set, step, show, hide };
})();

document.addEventListener('DOMContentLoaded', async function() {
  console.log('Initializing Kazakhstan Hydrogen Interactive Tool...');
  Loading.show();
  try {
    Loading.set('Preparing map…', 10);
    await MapManager.initialize();
    Loading.set('Loading datasets…', 30);

    // If DataLoader exposes fine-grained events later, map them here.
    await DataLoader.loadAllData();
    Loading.set('Building UI…', 65);

    SidebarManager.initialize();
    ResultsManager.initialize();
    // Initialize live schematics
    if (window.SchematicsManager) SchematicsManager.initialize();

    Loading.set('Rendering first view…', 80);
    switchMode('green');
    setupEventListeners();
    updateLayerControls('green');

    Loading.set('Finalizing…', 95);
    console.log('Application initialized successfully');
  } catch (error) {
    console.error('Error initializing application:', error);
    alert('Error loading application. Please refresh the page.');
  } finally {
    Loading.hide();
  }
});


// Setup Event Listeners
function setupEventListeners() {
    // Hydrogen mode toggle
    document.querySelectorAll('.hydrogen-toggle button').forEach(btn => {
        btn.addEventListener('click', function() {
            const mode = this.dataset.mode;
            switchMode(mode);
        });
    });
    
    // Calculate button
    document.getElementById('calculate-btn').addEventListener('click', performCalculation);
    
    // Reset button
    document.getElementById('reset-btn').addEventListener('click', resetApplication);
    
    // Layers panel toggle
    document.getElementById('layers-btn').addEventListener('click', () => {
        const panel = document.getElementById('layers-panel');
        panel.classList.toggle('show');
    });
    
    // Close buttons
    document.getElementById('close-layers').addEventListener('click', () => {
        document.getElementById('layers-panel').classList.remove('show');
    });
    
    document.getElementById('close-results').addEventListener('click', () => {
        document.getElementById('results-panel').style.display = 'none';
    });
    
    document.getElementById('close-popup').addEventListener('click', () => {
        document.getElementById('info-popup').style.display = 'none';
    });
    
    // Export buttons
    document.getElementById('export-pdf').addEventListener('click', () => exportResults('pdf'));
    document.getElementById('export-excel').addEventListener('click', () => exportResults('excel'));
    document.getElementById('export-data').addEventListener('click', () => exportResults('json'));
    
    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            switchTab(this.dataset.tab);
        });
    });
        // Update app.js - Fix region selection functionality
    // Add this to the setupEventListeners function in app.js:

// --- UI occupied rectangles relative to the map container ---
window.UIRects = (function() {
  const getMapEl = () => document.getElementById('kazakhstan-map');
  const toMapCoords = (r) => {
    const mapEl = getMapEl(); if (!mapEl || !r) return null;
    const m = mapEl.getBoundingClientRect();
    return { x: r.left - m.left, y: r.top - m.top, w: r.width, h: r.height };
  };
  const vis = (el) => el && el.offsetParent !== null;

  function getSidebarRect() {
    const el = document.getElementById('sidebar');
    return vis(el) ? toMapCoords(el.getBoundingClientRect()) : null;
  }
  function getSchematicsRect() {
    const el = document.getElementById('schematics-panel');
    return vis(el) ? toMapCoords(el.getBoundingClientRect()) : null;
  }
  function getResultsRect() {
    const el = document.getElementById('results-panel');
    return vis(el) ? toMapCoords(el.getBoundingClientRect()) : null;
  }
  // A single “forbidden zones” array
  function getOccupiedRects() {
    return [getSidebarRect(), getSchematicsRect(), getResultsRect()].filter(Boolean);
  }
  return { getSidebarRect, getResultsRect, getSchematicsRect, getOccupiedRects };
})();


document.getElementById('sidebar-panels').addEventListener('change', function(e) {
    // Handle gas field selection
    if (e.target.id === 'gas-field-select') {
        const fieldId = e.target.value;
        console.log('Gas field selected from dropdown:', fieldId);
        
        if (!fieldId) {
            // Clear selection
            MapManager.clearSelections();
            SidebarManager.updateGasComposition(null);
            return;
        }
        
        // Find the field in data
        const field = AppState.data.oilGasFields.find(f => f.id == fieldId || f.id === parseInt(fieldId));
        
        if (field) {
            // Update gas composition immediately
            SidebarManager.updateGasComposition(fieldId);
            
            // Update app state
            AppState.selectedPoint = field;
            
            // Zoom to field location if coordinates exist
            if (field.latitude && field.longitude) {
                const latlng = L.latLng(field.latitude, field.longitude);
                
                // Zoom to field location
                MapManager.map.setView(latlng, 10);
                
                // Show popup for the field
                setTimeout(() => {
                    PopupManager.showPopup(field, 
                        { id: 'oil-gas-fields', name: 'Oil & Gas Fields', dataSource: 'oilGasFields' },
                        latlng
                    );
                }, 300);
            }
        }
        updateActionArea();
        document.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'action-helper') {
                const el = e.target;
                el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
            }
            });

    }
    
    // Handle region selection
    if (e.target.id === 'region-select') {
        const selectedName = e.target.value;
        
        if (!selectedName) {
            // Reset selection
            MapManager.clearSelections();
            MapManager.map.setView([48.0196, 66.9237], 5);
            return;
        }
        
        // Find and select the region on the map
        if (MapManager.layers.regions) {
            MapManager.layers.regions.eachLayer(layer => {
                const props = layer.feature.properties;
                const regionName = props.name_en || props.name;
                
                if (regionName === selectedName) {
                    // Update app state
                    AppState.selectedRegion = layer.feature;
                    updateActionArea();
                    // Simulate click on the region
                    const bounds = layer.getBounds();
                    const center = bounds.getCenter();
                    
                    // Zoom to region
                    MapManager.map.fitBounds(bounds, { padding: [50, 50] });
                    
                    // Select the region visually
                    MapManager.selectFeature(
                        { target: layer, originalEvent: { preventDefault: () => {} } },
                        layer.feature,
                        { id: 'regions', name: 'Kazakhstan Regions', dataSource: 'regionsWithBorders', style: LayersConfig.styles.default }
                    );

                    // After AppState.selectedRegion is set and the map zooms
                    const mode = (window.AppState && window.AppState.mode) || 'green';
                    const p = AppState.selectedRegion?.properties || {};
                    const regionLabel = p.region_name_en || p.name_en || p.region_name || p.name || p.NAME_1 || 'Region';
                    const resType   = document.getElementById('renewable-source')?.value || 'solar';
                    const waterRaw  = document.getElementById('water-source-type')?.value || 'freshwater';
                    const waterType = ({freshwater:'fresh', brackish:'brackish', treated:'waste', groundwater:'ground'})[waterRaw] || 'fresh';
                    const electrolyzer = document.getElementById('electrolyzer-type')?.value || 'PEM';

                    if (window.SchematicsManager) {
                    SchematicsManager.setMode(mode);
                    SchematicsManager.setState({ regionLabel, resType, waterType, electrolyzer });
                    SchematicsManager.show();
                    }
    
                    // Show popup at center
                    setTimeout(() => {
                        PopupManager.showPopup(props, 
                            { id: 'regions', name: 'Kazakhstan Regions', dataSource: 'regionsWithBorders' },
                            center
                        );
                    }, 300);
                }
            });
        }
    }
        }   );
        }

// Switch Mode (Green, Blue, Derivatives)
function switchMode(mode) {
    try {
    SchematicsManager.setMode(mode);
    SchematicsManager.setState({ regionLabel: null, gasFieldLabel: null });
    SchematicsManager.hide();
    PopupManager.hide();
    } catch {}
    console.log('Switching to mode:', mode);
    
    // Update state
    AppState.mode = mode;
    
    // Update UI
    document.querySelectorAll('.hydrogen-toggle button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-mode="${mode}"]`).classList.add('active');
    
    // Update sidebar
    SidebarManager.updateForMode(mode);
    
    // Update map layers
    MapManager.updateLayersForMode(mode);
    
    // Update layer controls
    updateLayerControls(mode);
    
    // Clear previous results
    document.getElementById('results-panel').style.display = 'none';

    // Refresh action area on mode switch
    updateActionArea();
}


// --- Action area guard: show helper pill until a selection exists ---
function hasValidSelection() {
  if (AppState.mode === 'green') {
    return !!AppState.selectedRegion;
  } else if (AppState.mode === 'blue') {
    // treat either selectedPoint (map) or dropdown value as selection
    const sel = document.getElementById('gas-field-select');
    return !!AppState.selectedPoint || (sel && sel.value);
  }
  return true; // derivatives or others: allow
}

function updateActionArea() {
  const calcBtn = document.getElementById('calculate-btn');
  const resetBtn = document.getElementById('reset-btn');
  const helper  = document.getElementById('action-helper');
  if (!calcBtn || !resetBtn || !helper) return;

  const ok = hasValidSelection();
  const msg = AppState.mode === 'green' ? 'Choose a region to Calculate' :
              (AppState.mode === 'blue' ? 'Choose a field to Calculate' : '');

if (ok) {
    helper.style.display = 'none';
    calcBtn.style.display = 'inline-flex';
    resetBtn.style.display = 'inline-flex';
} else {
    helper.textContent = msg;
    helper.style.display = 'flex';
    calcBtn.style.display = 'none';
    resetBtn.style.display = 'none';
    }
    
}

// Fallback: poll for selection changes (covers map-click selections set in MapManager)
(function selectionPoller(){
  let lastKey = '';
  setInterval(() => {
    const key = `${AppState.mode}|${!!AppState.selectedRegion}|${!!AppState.selectedPoint}`;
    if (key !== lastKey) {
      lastKey = key;
      updateActionArea();
    }
  }, 400);
})();

// Update Layer Controls
function updateLayerControls(mode) {
    const layersContent = document.getElementById('layers-content');
    layersContent.innerHTML = '';
    
    const layers = LayersConfig.getLayersForMode(mode);
    
    // Group layers by category
    const categories = {};
    layers.forEach(layer => {
        if (!categories[layer.category]) {
            categories[layer.category] = [];
        }
        categories[layer.category].push(layer);
    });
    
    // Create layer controls
    Object.keys(categories).forEach(category => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'layer-category';
        
        const categoryTitle = document.createElement('div');
        categoryTitle.className = 'layer-category-title';
        categoryTitle.textContent = category;
        categoryDiv.appendChild(categoryTitle);
        
        categories[category].forEach(layer => {
            // Handle expandable groups (like Caspian projections)
            if (layer.type === 'group' && layer.expandable) {
                const groupContainer = document.createElement('div');
                groupContainer.className = 'layer-group-container';
                
                // Create expandable header
                const groupHeader = document.createElement('div');
                groupHeader.className = 'layer-group-header';
                groupHeader.innerHTML = `
                    <span class="expand-icon ${layer.defaultExpanded ? 'expanded' : ''}">▶</span>
                    <span class="group-name">${layer.name}</span>
                `;
                
                // Create sublayers container
                const sublayersContainer = document.createElement('div');
                sublayersContainer.className = `layer-sublayers ${layer.defaultExpanded ? '' : 'collapsed'}`;
                sublayersContainer.style.display = layer.defaultExpanded ? 'block' : 'none';
                
                // Add sublayers
                layer.sublayers.forEach(sublayer => {
                    const sublayerItem = createLayerItem(sublayer, true);
                    sublayersContainer.appendChild(sublayerItem);
                });
                
                // Toggle expansion
                groupHeader.addEventListener('click', () => {
                    const icon = groupHeader.querySelector('.expand-icon');
                    icon.classList.toggle('expanded');
                    sublayersContainer.style.display = 
                        sublayersContainer.style.display === 'none' ? 'block' : 'none';
                });
                
                groupContainer.appendChild(groupHeader);
                groupContainer.appendChild(sublayersContainer);
                categoryDiv.appendChild(groupContainer);
            } else {
                // Normal layer item
                const layerItem = createLayerItem(layer, false);
                categoryDiv.appendChild(layerItem);
            }
        });
        
        layersContent.appendChild(categoryDiv);
    });
}

function createLayerItem(layer, isSublayer = false) {
    const layerItem = document.createElement('div');
    layerItem.className = `layer-item ${isSublayer ? 'sublayer-item' : ''}`;
    
    layerItem.innerHTML = `
        <input type="checkbox" class="layer-checkbox" 
               id="layer-${layer.id}" 
               data-layer-id="${layer.id}"
               data-mutually-exclusive="${layer.mutuallyExclusive ? layer.mutuallyExclusive.join(',') : ''}"
               ${layer.defaultVisible ? 'checked' : ''}>
        <div class="layer-icon">
            ${layer.icon ? `<img src="assets/icons/${layer.icon}">` : '📍'}
        </div>
        <label class="layer-label" for="layer-${layer.id}">${layer.name}</label>
        <input type="range" class="layer-opacity" 
               min="0" max="100" value="100" 
               id="opacity-${layer.id}">
    `;
    
    // Add event listeners
    const checkbox = layerItem.querySelector('.layer-checkbox');
    const opacitySlider = layerItem.querySelector('.layer-opacity');
    
    checkbox.addEventListener('change', (e) => {
        const layerId = e.target.dataset.layerId;
        const isChecked = e.target.checked;
        
        // Handle mutual exclusion
        if (isChecked && e.target.dataset.mutuallyExclusive) {
            const exclusiveGroups = e.target.dataset.mutuallyExclusive.split(',');
            
            // Turn off sea layer if Caspian projection is selected
            if (exclusiveGroups.includes('sea')) {
                const seaCheckbox = document.getElementById('layer-sea');
                if (seaCheckbox && seaCheckbox.checked) {
                    seaCheckbox.checked = false;
                    MapManager.toggleLayer('sea', false);
                }
            }
            
            // Turn off other Caspian projections
            if (exclusiveGroups.includes('caspian-projections')) {
                document.querySelectorAll('[data-mutually-exclusive*="caspian-projections"]').forEach(cb => {
                    if (cb !== e.target && cb.checked) {
                        cb.checked = false;
                        MapManager.toggleLayer(cb.dataset.layerId, false);
                    }
                });
            }
        }
        
        MapManager.toggleLayer(layerId, isChecked);
    });
    
    opacitySlider.addEventListener('input', (e) => {
        MapManager.setLayerOpacity(layer.id, e.target.value / 100);
    });
    
    return layerItem;
}

function wireCalculateButton() {
  const btn = document.getElementById('calculate-results') 
           || document.getElementById('calculate-button')
           || document.querySelector('[data-action="calculate"]');
  if (!btn) {
    console.warn('Calculate button not found. Add id="calculate-results" to the button.');
    return;
  }
  btn.addEventListener('click', async () => {
    console.log('[KHT] Calculate clicked. Mode=', AppState.mode);
    await performCalculation();
  });
}
document.addEventListener('DOMContentLoaded', wireCalculateButton);
document.addEventListener('DOMContentLoaded', updateActionArea);

async function performCalculation() {
  console.log('Performing calculation...');
  try {
    // Validate inputs (Green-safe)
    const ok = validateInputs();
    if (!ok) {
      alert('Please check your input parameters');
      console.warn('[KHT] validateInputs() returned false');
      return;
    }

    const params = collectParameters();
    let results;

    switch (AppState.mode) {
      case 'green':
        if (typeof GreenHydrogenCalculator === 'undefined' || !GreenHydrogenCalculator.calculate) {
            throw new Error('GreenHydrogenCalculator is not available.');
            }
        results = await GreenHydrogenCalculator.calculate(params);
        break;
      case 'blue':
        results = await BlueHydrogenCalculator.calculate(params);
        break;
      case 'derivatives':
        results = await DerivativesCalculator.calculate(params);
        break;
      default:
        throw new Error('Unknown mode: ' + AppState.mode);
    }

    if (!results || typeof results !== 'object') {
      throw new Error('Calculation returned no results.');
    }

    AppState.results = results;
    console.log('[KHT] Results ready:', results);
    ResultsManager.displayResults(results, AppState.mode);
    try { SchematicsManager.hide(); } catch {}
    try { PopupManager.reflow?.(); } catch {}
    window.addEventListener('resize', () => {
    try { PopupManager.reflow?.(); } catch {}
    });
    } catch (err) {
    console.error('Calculation error:', err);
    alert('Calculation error: ' + (err?.message || err));
    try {
      ResultsManager.displayResults(
        { lcoh: NaN, annualProduction: NaN, carbonIntensity: NaN },
        AppState.mode
      );
    } catch {}
  }
}

function validateInputs() {
  const mode = AppState?.mode || 'green';
  const hasRegion = !!(AppState?.selectedRegion);

  if (mode === 'green') {
    if (!hasRegion) {
      console.warn('[KHT] No region selected. Blocking calculation.');
      const helper = document.getElementById('action-helper');
      if (helper) { helper.textContent = 'Choose a region to Calculate'; helper.style.display = 'flex'; helper.classList.add('shake'); }
      return false;
    }
    const resSel = document.getElementById('renewable-source');
    const elzSel = document.getElementById('electrolyzer-type');
    const drInp  = document.getElementById('discount-rate');
    const lifeInp= document.getElementById('project-lifetime');

    if (!resSel || !elzSel || !drInp || !lifeInp) {
      console.warn('[KHT] Missing one of required inputs for Green.');
      return true; // don’t block calc
    }
    return true;
  }

  if (mode === 'blue') {
    const hasField = !!AppState.selectedPoint || !!document.getElementById('gas-field-select')?.value;
    if (!hasField) {
      console.warn('[KHT] No field selected. Blocking calculation.');
      const helper = document.getElementById('action-helper');
      if (helper) { helper.textContent = 'Choose a field to Calculate'; helper.style.display = 'flex'; helper.classList.add('shake'); }
      return false;
    }
  }
  return true; // for other modes keep permissive
}

// Collect Parameters
function collectParameters() {
    const params = {
        mode: AppState.mode,
        inputs: AppState?.inputs ?? {},
        selectedRegion: AppState.selectedRegion,
        selectedPoint: AppState.selectedPoint
    };
    
    // Collect values from form inputs
    document.querySelectorAll('#sidebar-panels input, #sidebar-panels select').forEach(input => {
        const id = input.id;
        const value = input.type === 'checkbox' ? input.checked : 
                      input.type === 'number' ? parseFloat(input.value) : 
                      input.value;
        
        // Map input ID to state structure
        // This will be implemented based on actual form IDs
        if (id && value !== undefined) {
            // params.inputs[category][field] = value;
        }
    });
    
    return params;
}

// Reset Application
function resetApplication() {
    try {
    SchematicsManager.setState({ regionLabel: null, gasFieldLabel: null });
    SchematicsManager.hide();
    } catch {}
    console.log('Resetting application...');
    
    // Reset inputs
    document.querySelectorAll('#sidebar-panels input[type="number"]').forEach(input => {
        input.value = input.defaultValue || '';
    });
    
    document.querySelectorAll('#sidebar-panels select').forEach(select => {
        select.selectedIndex = 0;
    });
    
    // Clear selections
    AppState.selectedRegion = null;
    AppState.selectedPoint = null;
    
    // Clear map selections
    MapManager.clearSelections();
    
    // Hide results
    document.getElementById('results-panel').style.display = 'none';

    // Refresh action area
    updateActionArea();
    
    // Reset to green mode
    switchMode('green');
}

// Switch Tab
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update content
    ResultsManager.showTab(tabName);
}

// Export Results
async function exportResults(format) {
    if (!AppState.results) {
        alert('No results to export. Please perform a calculation first.');
        return;
    }
    
    switch (format) {
        case 'pdf':
            await exportToPDF();
            break;
        case 'excel':
            await exportToExcel();
            break;
        case 'json':
            await exportToJSON();
            break;
    }
}

// Export to PDF
async function exportToPDF() {
    // TODO: Implement PDF export using jsPDF or similar library
    console.log('Exporting to PDF...');
    alert('PDF export will be implemented with jsPDF library');
}

// Export to Excel
async function exportToExcel() {
    // TODO: Implement Excel export using SheetJS or similar
    console.log('Exporting to Excel...');
    alert('Excel export will be implemented with SheetJS library');
}

// Export to JSON
async function exportToJSON() {
    const dataStr = JSON.stringify(AppState.results, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `hydrogen_results_${Date.now()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

// Global error handler
window.addEventListener('error', function(e) {
    console.error('Global error:', e);
});

function debugWMALayer() {
    console.log('=== WMA Layer Debug ===');
    
    // Check if WMA data is loaded
    console.log('WMA GeoJSON data:', AppState.data.wmaGeoJSON);
    
    // Check if layer exists in MapManager
    console.log('WMA layer in MapManager:', MapManager.layers['wma-boundaries']);
    
    // Check if layer is on map
    if (MapManager.layers['wma-boundaries']) {
        console.log('WMA layer on map:', MapManager.map.hasLayer(MapManager.layers['wma-boundaries']));
    }
    
    // Check layer configuration
    const wmaConfig = LayersConfig.getLayerById('wma-boundaries');
    console.log('WMA layer config:', wmaConfig);
    
    // Try to manually add the layer
    if (AppState.data.wmaGeoJSON && !MapManager.layers['wma-boundaries']) {
        console.log('Manually creating WMA layer...');
        const testLayer = L.geoJSON(AppState.data.wmaGeoJSON, {
            style: {
                fillColor: '#2196f3',
                fillOpacity: 0.5,
                color: '#1976d2',
                weight: 3
            }
        });
        testLayer.addTo(MapManager.map);
        console.log('Test layer added to map');
    }
}

// Call this after the app loads
setTimeout(() => {
    console.log('Running WMA debug...');
    debugWMALayer();
}, 3000);