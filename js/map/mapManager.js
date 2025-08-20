/**
 * Map Manager Module
 * Handles all map operations and layer management
 */

const MapManager = {
    map: null,
    layers: {},
    selectedFeature: null,
    
    // Initialize map
    async initialize() {
        console.log('Initializing map...');
        
        // Create Leaflet map
        this.map = L.map('kazakhstan-map', {
            center: [48.0196, 66.9237],
            zoom: 5,
            zoomControl: false
        });
        
        // Add base map
        this.addBaseMap();
        
        // Setup map controls
        this.setupControls();
        
        // Setup map events
        this.setupMapEvents();
        
        console.log('Map initialized');
    },
    
    // Add base map layer
    addBaseMap() {
        const baseMap = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20
        });
        
        baseMap.addTo(this.map);
        this.layers['basemap'] = baseMap;
    },
    
    // Setup map controls
    setupControls() {
        // Zoom controls
        document.getElementById('zoom-in-btn').addEventListener('click', () => {
            this.map.zoomIn();
        });
        
        document.getElementById('zoom-out-btn').addEventListener('click', () => {
            this.map.zoomOut();
        });
        
        document.getElementById('reset-view-btn').addEventListener('click', () => {
            this.map.setView([48.0196, 66.9237], 5);
        });
    },

    
    // Setup map events
    setupMapEvents() {
        // Map click event
        this.map.on('click', (e) => {
            // Clear selection if clicking on empty space
            if (!e.originalEvent.defaultPrevented) {
                this.clearSelections();
            }
        });
        
        // Map move events
        this.map.on('moveend', () => {
            this.updateVisibleFeatures();
        });
    },
    
    // Update layers for current mode
    updateLayersForMode(mode) {
        console.log('Updating layers for mode:', mode);
        
        // Clear existing layers (except basemap)
        this.clearLayers();
        
        // Get layers for current mode
        const layers = LayersConfig.getLayersForMode(mode);
        
        // Process each layer
        layers.forEach(layerConfig => {
            // Handle grouped layers (like Caspian projections)
            if (layerConfig.type === 'group' && layerConfig.sublayers) {
                console.log(`Processing layer group: ${layerConfig.name}`);
                
                // Create each sublayer but don't add to map
                layerConfig.sublayers.forEach(sublayer => {
                    // Create the sublayer with proper configuration
                    const sublayerConfig = {
                        ...sublayer,
                        category: layerConfig.category // Inherit category from parent
                    };
                    
                    console.log(`Creating sublayer: ${sublayer.id}`);
                    this.addLayer(sublayerConfig);
                });
            } else {
                // Regular layer
                this.addLayer(layerConfig);
            }
        });
        
        // Log all created layers
        console.log('Created layers:', Object.keys(this.layers));
    },
    
        // Update addLayer to handle Caspian projections
    addLayer(layerConfig) {
        console.log('Adding layer:', layerConfig.id, 'Type:', layerConfig.type, 'DataSource:', layerConfig.dataSource);
        
        // Skip group layers (they don't have actual map layers)
        if (layerConfig.type === 'group') {
            console.log(`Skipping group layer: ${layerConfig.id}`);
            return;
        }
        
        // Check if data exists for data-dependent layers
        if (layerConfig.dataSource) {
            const data = AppState.data[layerConfig.dataSource];
            if (!data) {
                console.warn(`No data found for layer ${layerConfig.id}, dataSource: ${layerConfig.dataSource}`);
                // Don't return here - create empty layer that can be populated later
            } else {
                console.log(`Data found for ${layerConfig.id}: ${data.features ? data.features.length + ' features' : 'data exists'}`);
            }
        }
        
        let layer;
        
        switch (layerConfig.type) {
            case 'geojson':
                layer = this.createGeoJSONLayer(layerConfig);
                break;
            case 'marker':
                layer = this.createMarkerLayer(layerConfig);
                break;
            case 'polyline':
                layer = this.createPolylineLayer(layerConfig);
                break;
            case 'tile':
                layer = this.createTileLayer(layerConfig);
                break;
        }
        
        if (layer) {
            // Store the layer
            this.layers[layerConfig.id] = layer;
            
            // Only add to map if defaultVisible is true
            if (layerConfig.defaultVisible) {
                layer.addTo(this.map);
                console.log(`Layer ${layerConfig.id} added to map`);
            } else {
                console.log(`Layer ${layerConfig.id} created but not displayed (defaultVisible: false)`);
            }
        } else {
            console.warn(`Failed to create layer ${layerConfig.id}`);
        }
    },

    // Create export arrow icon function
    // Add this helper function above createMarker
    createExportIcon(direction = 'west', destination = 'Europe') {
        // The base icon points left (west), so we rotate from there
        const rotations = {
            'west': 0,      // No rotation for Europe (arrow already points left)
            'north': 90,    // 90 degrees clockwise for Russia
            'east': 180,    // 180 degrees for China
            'south': 270    // 270 degrees if needed
        };
        
        const rotation = rotations[direction] || 0;
        
        // Create a large icon with rotation
        return L.divIcon({
            className: `export-marker export-${destination.toLowerCase()}`,
            html: `
                <div style="
                    width: 80px;
                    height: 80px;
                    transform: rotate(${rotation}deg);
                    transform-origin: center;
                ">
                    <img src="assets/icons/export.png" 
                        style="width: 100%; height: 100%;"
                        alt="${destination} Export">
                </div>
                <div style="
                    position: absolute;
                    bottom: -20px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(255,255,255,0.9);
                    padding: 2px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    font-weight: bold;
                    white-space: nowrap;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                ">
                    ${destination}
                </div>
            `,
            width: 80,
            height: 80,
            iconSize: [80, 80],
            iconAnchor: [40, 40],  // Center the icon
            popupAnchor: [0, -40]
        });
    },

    // Update mapManager.js - createGeoJSONLayer function
    // Replace the createGeoJSONLayer function with this version:

    createGeoJSONLayer(config) {
        const data = AppState.data[config.dataSource];
        
        console.log(`Creating GeoJSON layer ${config.id} with data:`, data);
        
        if (!data) {
            console.warn(`No data for GeoJSON layer ${config.id}`);
            return null;
        }
        
        // Special handling for Kazakhstan outline - no interactivity
        if (config.id === 'kazakhstan-outline') {
            return L.geoJSON(data, {
                style: config.style,
                interactive: false,
                onEachFeature: null
            });
        }
        
        // Handle WMA layer with dynamic styling based on classification
        if (config.id === 'wma-boundaries') {
            const wmaStyle = function(feature) {
                // Use the classification field from your data
                const classification = (feature.properties.classification || 'no data').toLowerCase().trim();
                
                console.log('WMA Classification:', classification); // Debug log
                
                // Define styles with exact matching
                const styles = {
                    'available': {
                        fillColor: '#1e88e5',  // Blue - High availability
                        fillOpacity: 0.6,
                        color: '#0d47a1',
                        weight: 2
                    },
                    'high available water': {
                        fillColor: '#1e88e5',  // Blue - High availability
                        fillOpacity: 0.6,
                        color: '#0d47a1',
                        weight: 2
                    },
                    'medium available water': {
                        fillColor: '#66bb6a',  // Green - Medium availability
                        fillOpacity: 0.6,
                        color: '#2e7d32',
                        weight: 2
                    },
                    'less available water': {  // Add this for your data
                        fillColor: '#ffa726',  // Orange - Limited availability
                        fillOpacity: 0.6,
                        color: '#ef6c00',
                        weight: 2
                    },
                    'limited available water': {
                        fillColor: '#ffa726',  // Orange - Limited availability
                        fillOpacity: 0.6,
                        color: '#ef6c00',
                        weight: 2
                    },
                    'no available water': {
                        fillColor: '#ef5350',  // Red - No availability
                        fillOpacity: 0.6,
                        color: '#c62828',
                        weight: 2
                    },
                    'no data': {
                        fillColor: '#bdbdbd',  // Gray - No data
                        fillOpacity: 0.3,
                        color: '#616161',
                        weight: 2,
                        dashArray: '5, 5'
                    }
                };
                
                // Direct lookup first
                if (styles[classification]) {
                    return styles[classification];
                }
                
                // Fallback pattern matching
                if (classification.includes('high') || classification === 'available') {
                    return styles['available'];
                } else if (classification.includes('medium')) {
                    return styles['medium available water'];
                } else if (classification.includes('less') || classification.includes('limited')) {
                    return styles['less available water'];
                } else if (classification.includes('no available')) {
                    return styles['no available water'];
                }
                
                // Default
                return styles['no data'];
            };
            
            const wmaLayer = L.geoJSON(data, {
                style: wmaStyle,
                onEachFeature: (feature, layer) => {
                    // Add popup for WMA
                    layer.on('click', (e) => {
                        L.DomEvent.stopPropagation(e);
                        PopupManager.showWMAPopup(feature.properties, e.latlng);
                    });
                    
                    // Add tooltip with river name
                    const tooltipText = feature.properties.river_names || feature.properties.NAME_1 || 'Water Management Area';
                    layer.bindTooltip(tooltipText, {
                        permanent: false,
                        direction: 'center',
                        className: 'wma-tooltip'
                    });
                    
                    // Debug: log when feature is added
                    console.log('Added WMA feature:', feature.properties.river_names, '- Region:', feature.properties.NAME_1);
                }
            });
            
            console.log('WMA layer created with', data.features ? data.features.length : 0, 'features');
            return wmaLayer;
        }
        
        // Normal handling for other GeoJSON layers
        return L.geoJSON(data, {
            style: config.style,
            onEachFeature: (feature, layer) => {
                this.setupFeatureEvents(feature, layer, config);
            }
        });
    },
    
    // Create marker layer
    createMarkerLayer(config) {
        const data = AppState.data[config.dataSource];
        console.log(`Creating marker layer for ${config.id}:`, data);
        
        if (!data || data.length === 0) {
            console.warn(`No data for marker layer ${config.id}`);
            return null;
        }
        
        const markerGroup = L.featureGroup();
        let validMarkers = 0;
        
        data.forEach((point, index) => {
            // Check for valid coordinates
            if (point.latitude && point.longitude && 
                !isNaN(point.latitude) && !isNaN(point.longitude)) {
                
                const marker = this.createMarker(point, config);
                if (marker) {
                    markerGroup.addLayer(marker);
                    validMarkers++;
                }
            } else {
                console.warn(`Invalid coordinates for point ${index} in ${config.id}:`, point);
            }
        });
        
        console.log(`Created ${validMarkers} markers for ${config.id}`);
        return validMarkers > 0 ? markerGroup : null;
    },
    
    // Create individual marker
    createMarker(point, config) {
        try {
            let icon;
            
            // Special handling for hydrogen export points
            if (config.dataSource === 'demandPoints' && point.type === 'export') {
                // Determine direction and destination from point data
                const direction = point.export_direction || 'west';
                const destination = point.export_destination || 'Export';
                icon = this.createExportIcon(direction, destination);
            }
            // Standard icon handling
            else if (config.icon && config.icon !== '') {
                // Try to load image icon
                icon = L.icon({
                    iconUrl: `assets/icons/${config.icon}`,
                    iconSize: [30, 30],
                    iconAnchor: [15, 30],
                    popupAnchor: [0, -30]
                });
            } else {
                // Create a colored div icon as fallback
                const color = config.markerOptions?.color || '#333';
                icon = L.divIcon({
                    className: 'custom-div-icon',
                    html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                });
            }
            
            const marker = L.marker([point.latitude, point.longitude], {
                icon: icon,
                data: point
            });
            
            // Add click event
            marker.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
                
                // If this is an oil/gas field, update the dropdown
                if (config.dataSource === 'oilGasFields') {
                    const gasFieldSelect = document.getElementById('gas-field-select');
                    if (gasFieldSelect) {
                        gasFieldSelect.value = point.id;
                        
                        // Trigger the change event to update gas composition
                        const changeEvent = new Event('change', { bubbles: true });
                        gasFieldSelect.dispatchEvent(changeEvent);
                    }
                    
                    // Update app state
                    AppState.selectedPoint = point;
                }
                
                // Special popup for export points
                if (point.type === 'export') {
                    PopupManager.showExportPopup(point, e.latlng);
                } else {
                    // Show standard popup
                    PopupManager.showPopup(point, config, e.latlng);
                }
            });
            
            // Add tooltip if name exists - but disable for export points to avoid hover issues
            if (point.name && point.type !== 'export') {
                marker.bindTooltip(point.name, {
                    permanent: false,
                    direction: 'top',
                    offset: [0, -10]
                });
            }
            
            return marker;
        } catch (error) {
            console.error('Error creating marker:', error, point);
            return null;
        }
    },
    
    // Get marker icon
    getMarkerIcon(point, config) {
        // Custom icon based on point type
        if (config.icon) {
            return L.icon({
                iconUrl: `assets/icons/${config.icon}`,
                iconSize: [30, 30],
                iconAnchor: [15, 30],
                popupAnchor: [0, -30]
            });
        }
        
        // Default marker
        return L.divIcon({
            className: 'custom-marker',
            html: '<div style="background-color: ' + config.markerOptions.color + '; width: 20px; height: 20px; border-radius: 50%;"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
    },

    // Create polyline layer
    createPolylineLayer(config) {
        const data = AppState.data[config.dataSource];
        if (!data || data.length === 0) return null;
        
        const polylineGroup = L.featureGroup();
        
        // Check if this is pipeline data with groups
        if (config.dataSource === 'pipelines' && data[0].group !== undefined) {
            // Handle grouped pipeline data
            console.log('Creating grouped pipeline layers');
            
            // Group the data by 'group' field
            const groups = {};
            data.forEach(point => {
                if (!groups[point.group]) {
                    groups[point.group] = [];
                }
                groups[point.group].push(point);
            });
            
            // Process each group
            Object.keys(groups).forEach(groupId => {
                const groupPoints = groups[groupId];
                
                // Sort by pipeline_id to ensure correct order
                groupPoints.sort((a, b) => a.pipeline_id - b.pipeline_id);
                
                // Create array of coordinates for this pipeline group
                const coordinates = groupPoints.map(point => [point.latitude, point.longitude]);
                
                if (coordinates.length >= 2) {
                    // Create the polyline for this group
                    const polyline = L.polyline(coordinates, {
                        ...config.style,
                        className: `pipeline-group-${groupId}`
                    });
                    
                    // Create popup content for the pipeline
                    const pipelineInfo = {
                        name: `Pipeline Group ${groupId}`,
                        type: groupPoints[0].type || 'gas',
                        diameter: groupPoints[0].diameter_mm || 'N/A',
                        capacity: groupPoints[0].capacity_bcm_year || 'N/A',
                        length: this.calculatePipelineLength(coordinates),
                        stations: groupPoints.filter(p => p.ps_name).map(p => p.ps_name).join(' → ')
                    };
                    
                    // Add click event
                    polyline.on('click', (e) => {
                        L.DomEvent.stopPropagation(e);
                        PopupManager.showPipelinePopup(pipelineInfo, e.latlng);
                    });
                    
                    // Add hover effect
                    polyline.on('mouseover', function(e) {
                        this.setStyle({
                            weight: config.style.weight + 2,
                            opacity: 1
                        });
                    });
                    
                    polyline.on('mouseout', function(e) {
                        this.setStyle(config.style);
                    });
                    
                    polylineGroup.addLayer(polyline);
                    
                    // Add station markers at named points
                    groupPoints.forEach(point => {
                        if (point.ps_name) {
                            const stationMarker = L.circleMarker([point.latitude, point.longitude], {
                                radius: 5,
                                fillColor: '#ff5722',
                                color: '#fff',
                                weight: 2,
                                opacity: 1,
                                fillOpacity: 0.8
                            });
                            
                            stationMarker.bindTooltip(point.ps_name, {
                                permanent: false,
                                direction: 'top'
                            });
                            
                            stationMarker.on('click', (e) => {
                                L.DomEvent.stopPropagation(e);
                                PopupManager.showStationPopup(point, e.latlng);
                            });
                            
                            polylineGroup.addLayer(stationMarker);
                        }
                    });
                }
            });
            
        } else {
            // Handle simple two-point pipelines (original implementation)
            data.forEach(line => {
                if (line.from_lat && line.from_lon && line.to_lat && line.to_lon) {
                    const polyline = L.polyline([
                        [line.from_lat, line.from_lon],
                        [line.to_lat, line.to_lon]
                    ], config.style);
                    
                    polyline.on('click', (e) => {
                        L.DomEvent.stopPropagation(e);
                        PopupManager.showPopup(line, config, e.latlng);
                    });
                    
                    polylineGroup.addLayer(polyline);
                }
            });
        }
        
        return polylineGroup;
    },
    // Helper function to calculate pipeline length
    calculatePipelineLength(coordinates) {
        let totalDistance = 0;
        for (let i = 0; i < coordinates.length - 1; i++) {
            const latlng1 = L.latLng(coordinates[i]);
            const latlng2 = L.latLng(coordinates[i + 1]);
            totalDistance += latlng1.distanceTo(latlng2);
        }
        return (totalDistance / 1000).toFixed(1); // Convert to km
    },
    
    // Create tile layer
    createTileLayer(config) {
        return L.tileLayer(config.url, {
            attribution: config.attribution,
            maxZoom: 20
        });
    },
    
    // Setup feature events
    setupFeatureEvents(feature, layer, config) {
        // Mouse events
        layer.on({
            mouseover: (e) => this.highlightFeature(e),
            mouseout: (e) => this.resetHighlight(e, config),
            click: (e) => this.selectFeature(e, feature, config)
        });
        
        // Add tooltip
        if (feature.properties && feature.properties.name_en || feature.properties && feature.properties.name) {
            layer.bindTooltip(feature.properties.name_en || feature.properties.name, {
                permanent: false,
                direction: 'center'
            });
        }
    },
    
    // Highlight feature on hover
    highlightFeature(e) {
        const layer = e.target;
        
        layer.setStyle({
            weight: 3,
            fillOpacity: 0.7
        });
        
        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
            layer.bringToFront();
        }
    },
    
    // Reset highlight
    resetHighlight(e, config) {
        const layer = e.target;
        
        if (this.selectedFeature !== layer) {
            layer.setStyle(config.style);
        }
    },
    
    // Select feature
    selectFeature(e, feature, config) {
        e.originalEvent.preventDefault();
        
        // Clear previous selection
        if (this.selectedFeature) {
            this.selectedFeature.setStyle(config.style);
        }
        
        // Set new selection
        this.selectedFeature = e.target;
        this.selectedFeature.setStyle(LayersConfig.styles.selected);
        
        // Update app state and dropdowns based on feature type
        if (config.id === 'regions' && feature.properties) {
            const regionName = feature.properties.name_en || feature.properties.name;
            AppState.selectedRegion = regionName;
            
            // Update the region dropdown
            const regionSelect = document.getElementById('region-select');
            if (regionSelect) {
                regionSelect.value = regionName;
            }
        }
        
        // Show popup
        PopupManager.showPopup(feature.properties, config, e.latlng);
        
        // Zoom to feature
        if (e.target.getBounds) {
            this.map.fitBounds(e.target.getBounds());
        }
    },
    
    // Toggle layer visibility
    toggleLayer(layerId, visible) {
        console.log(`Toggling layer ${layerId} to ${visible}`);
        
        // Special handling for WMA and regions mutual exclusion
        if (layerId === 'wma-boundaries' && visible) {
            // When WMA is turned on, turn off regions
            const regionsLayer = this.layers['regions'];
            if (regionsLayer && this.map.hasLayer(regionsLayer)) {
                this.map.removeLayer(regionsLayer);
                // Update the checkbox UI
                const regionsCheckbox = document.getElementById('layer-regions');
                if (regionsCheckbox) regionsCheckbox.checked = false;
            }
        } else if (layerId === 'regions' && visible) {
            // When regions is turned on, turn off WMA
            const wmaLayer = this.layers['wma-boundaries'];
            if (wmaLayer && this.map.hasLayer(wmaLayer)) {
                this.map.removeLayer(wmaLayer);
                // Update the checkbox UI
                const wmaCheckbox = document.getElementById('layer-wma-boundaries');
                if (wmaCheckbox) wmaCheckbox.checked = false;
            }
        }
        
        const layer = this.layers[layerId];
        if (layer) {
            if (visible) {
                if (!this.map.hasLayer(layer)) {
                    layer.addTo(this.map);
                    
                    // Update legend when WMA layer is toggled
                    if (layerId === 'wma-boundaries') {
                        LegendManager.update(AppState.mode);
                    }
                }
            } else {
                if (this.map.hasLayer(layer)) {
                    this.map.removeLayer(layer);
                    
                    // Hide legend when WMA layer is removed
                    if (layerId === 'wma-boundaries') {
                        LegendManager.update(AppState.mode);
                    }
                }
            }
        } else {
            console.warn(`Layer ${layerId} not found in layers`);
        }
    },
        
    // Set layer opacity
    setLayerOpacity(layerId, opacity) {
        const layer = this.layers[layerId];
        if (layer) {
            if (layer.setOpacity) {
                layer.setOpacity(opacity);
            } else if (layer.setStyle) {
                layer.setStyle({ opacity: opacity, fillOpacity: opacity });
            }
        }
    },
    
    // Clear all selections
    clearSelections() {
        if (this.selectedFeature) {
            // Reset style based on layer config
            // TODO: Get original style from config
            this.selectedFeature = null;
        }
        
        AppState.selectedRegion = null;
        AppState.selectedPoint = null;
        
        // Hide popup
        document.getElementById('info-popup').style.display = 'none';
    },
    
    // Clear layers (except basemap)
    clearLayers() {
        Object.keys(this.layers).forEach(layerId => {
            if (layerId !== 'basemap') {
                if (this.layers[layerId]) {
                    this.map.removeLayer(this.layers[layerId]);
                    delete this.layers[layerId];
                }
            }
        });
    },
    
    // Update visible features (for performance)
    updateVisibleFeatures() {
        // TODO: Implement clustering or feature filtering based on zoom level
    },
    
    // Get map bounds
    getBounds() {
        return this.map.getBounds();
    },
    
    // Fit bounds
    fitBounds(bounds) {
        this.map.fitBounds(bounds);
    }
    
};

const LegendManager = {
    show() {
        document.getElementById('map-legend').style.display = 'block';
    },
    
    hide() {
        document.getElementById('map-legend').style.display = 'none';
    },
    
    update(mode) {
        const legendContent = document.getElementById('legend-content');
        if (!legendContent) return;
        
        let html = '';
        
        // Check which layers are active
        const wmaLayerActive = MapManager.layers['wma-boundaries'] && 
                              MapManager.map.hasLayer(MapManager.layers['wma-boundaries']);
        
        if (wmaLayerActive) {
            html += `
                <div class="legend-section">
                    <div class="legend-subtitle">Water Availability</div>
                    <div class="legend-item">
                        <div class="legend-color" style="background-color: #1e88e5; opacity: 0.6;"></div>
                        <div class="legend-label">Available / High Volume</div>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color" style="background-color: #66bb6a; opacity: 0.6;"></div>
                        <div class="legend-label">Medium Available</div>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color" style="background-color: #ffa726; opacity: 0.6;"></div>
                        <div class="legend-label">Limited Available</div>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color" style="background-color: #ef5350; opacity: 0.6;"></div>
                        <div class="legend-label">No Available Water</div>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color" style="background-color: #bdbdbd; opacity: 0.3; border-style: dashed;"></div>
                        <div class="legend-label">No Data</div>
                    </div>
                </div>
                <div style="margin-top: 10px; padding: 8px; background: #f5f5f5; border-radius: 4px; font-size: 11px; color: #666;">
                    <strong>Source:</strong> River basins and water bodies
                </div>
            `;
        }
        
        // Show legend if there's content, hide if not
        if (html) {
            legendContent.innerHTML = html;
            this.show();
        } else {
            this.hide();
        }
    }
};

// Make sure the legend toggle event listener is set up
document.addEventListener('DOMContentLoaded', function() {
    const legendToggle = document.getElementById('legend-toggle');
    if (legendToggle) {
        legendToggle.addEventListener('click', function() {
            const content = document.getElementById('legend-content');
            if (content) {
                content.classList.toggle('collapsed');
                this.textContent = content.classList.contains('collapsed') ? '+' : '−';
            }
        });
    }
});

// Update legend when WMA layer changes
document.addEventListener('change', function(e) {
    if (e.target.id === 'layer-wma-boundaries') {
        setTimeout(() => LegendManager.update(AppState.mode), 100);
    }
});