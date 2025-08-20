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

// Application Initialization
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Initializing Kazakhstan Hydrogen Interactive Tool...');
    
    try {
        // Initialize map
        await MapManager.initialize();
        
        // Load data
        await DataLoader.loadAllData();
        
        // Initialize sidebar
        SidebarManager.initialize();
        
        // Initialize results panel
        ResultsManager.initialize();
        
        // Set initial mode
        switchMode('green');
        
        // Setup event listeners
        setupEventListeners();
        
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Error initializing application:', error);
        alert('Error loading application. Please refresh the page.');
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
                    AppState.selectedRegion = regionName;
                    
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
}

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

// Perform Calculation
async function performCalculation() {
    console.log('Performing calculation...');
    
    // Validate inputs
    if (!validateInputs()) {
        alert('Please check your input parameters');
        return;
    }
    
    // Collect parameters
    const params = collectParameters();
    
    // Perform calculation based on mode
    let results;
    switch (AppState.mode) {
        case 'green':
            results = await GreenHydrogenCalculator.calculate(params);
            break;
        case 'blue':
            results = await BlueHydrogenCalculator.calculate(params);
            break;
        case 'derivatives':
            results = await DerivativesCalculator.calculate(params);
            break;
    }
    
    // Store results
    AppState.results = results;
    
    // Display results
    ResultsManager.displayResults(results, AppState.mode);
}

// Validate Inputs
function validateInputs() {
    // TODO: Implement comprehensive validation
    return true;
}

// Collect Parameters
function collectParameters() {
    const params = {
        mode: AppState.mode,
        inputs: { ...AppState.inputs },
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