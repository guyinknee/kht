/**
 * Layers Configuration Module
 * Defines all map layers and their properties
 */

const LayersConfig = {
    // Layer definitions for each mode
    layers: {
        // Common layers (available in all modes)
        common: [
            {
                id: 'basemap',
                name: 'Base Map',
                category: 'Base Layers',
                type: 'tile',
                defaultVisible: true,
                url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png',
                attribution: '© OpenStreetMap contributors © CARTO'
            },
            {
                id: 'demand-points',
                name: 'H₂ Demand Points',
                category: 'Demand',
                type: 'marker',
                defaultVisible: true,
                icon: 'demand.png',
                dataSource: 'demandPoints',
                markerOptions: {
                    color: '#ff7043',
                    size: 'medium'
                }
            }
        ],
        
        // Green Hydrogen specific layers
        green: [
            {
                id: 'regions',
                name: 'Kazakhstan Regions',
                category: 'Administrative',
                type: 'geojson',
                defaultVisible: true,
                dataSource: 'regionsWithBorders',
                style: {
                    fillColor: '#4caf50',
                    fillOpacity: 0.3,
                    color: '#2e7d32',
                    weight: 2
                }
            },
            {
                id: 'wma-boundaries',
                name: 'Water Management Areas',
                category: 'Water Resources',
                type: 'geojson',
                defaultVisible: false,  // Not active by default
                dataSource: 'wmaGeoJSON',
                style: function(feature) {
                    // Dynamic styling based on water availability
                    const availability = feature.properties.water_availability || 'no_data';
                    const styles = {
                        'high': {
                            fillColor: '#1e88e5',  // Blue - High availability
                            fillOpacity: 0.6,
                            color: '#0d47a1',
                            weight: 2
                        },
                        'medium': {
                            fillColor: '#66bb6a',  // Green - Medium availability
                            fillOpacity: 0.6,
                            color: '#2e7d32',
                            weight: 2
                        },
                        'limited': {
                            fillColor: '#ffa726',  // Orange - Limited availability
                            fillOpacity: 0.6,
                            color: '#ef6c00',
                            weight: 2
                        },
                        'none': {
                            fillColor: '#ef5350',  // Red - No availability
                            fillOpacity: 0.6,
                            color: '#c62828',
                            weight: 2
                        },
                        'no_data': {
                            fillColor: '#bdbdbd',  // Gray - No data
                            fillOpacity: 0.3,
                            color: '#616161',
                            weight: 2,
                            dashArray: '5, 5'
                        }
                    };
                    return styles[availability] || styles['no_data'];
                }
            },
            {
                id: 'renewable-points',
                name: 'Renewable Energy',
                category: 'Energy Sources',
                type: 'marker',
                defaultVisible: true,
                icon: 'renewable.png',
                dataSource: 'renewablePoints',
                markerOptions: {
                    color: '#4caf50',
                    size: 'large'
                }
            },
            {
                id: 'electricity-network',
                name: 'Power Grid',
                category: 'Infrastructure',
                type: 'polyline',
                defaultVisible: true,
                dataSource: 'electricityNetwork',
                style: {
                    color: '#ffc107',
                    weight: 2,
                    opacity: 0.8
                }
            },
            {
                id: 'rivers',
                name: 'Rivers',
                category: 'Water Resources',
                type: 'geojson',
                defaultVisible: true,
                dataSource: 'riversGeoJSON',
                style: {
                    color: '#2195f390',
                    weight: 2,
                    opacity: 0.8
                }
            },
            {
                id: 'sea',
                name: 'Sea/Lakes',
                category: 'Water Resources',
                type: 'geojson',
                defaultVisible: true,
                dataSource: 'seaGeoJSON',
                style: {
                    fillColor: '#64b4f670',
                    fillOpacity: 0.5,
                    color: '#1976d2',
                    weight: 1
                }
            },
            {
                id: 'groundwater',
                name: 'Groundwater Access',
                category: 'Water Resources',
                type: 'marker',
                defaultVisible: false,
                icon: 'water.png',
                dataSource: 'groundwaterAccess',
                markerOptions: {
                    color: '#00bcd4',
                    size: 'small'
                }
            },
            {
                id: 'wastewater',
                name: 'Wastewater Plants',
                category: 'Water Resources',
                type: 'marker',
                defaultVisible: true,
                icon: 'wastewater.png',
                dataSource: 'wastewaterPlants',
                markerOptions: {
                    color: '#006064',
                    size: 'medium'
                }
            },
            {
                id: 'h2-projects',
                name: 'Existing H₂ Projects',
                category: 'Infrastructure',
                type: 'marker',
                defaultVisible: true,
                icon: 'H2project.png',
                dataSource: 'h2Projects',
                markerOptions: {
                    size: 'large'
                }
            },
            {
                id: 'caspian-projections',
                name: 'Caspian Sea Projections',
                category: 'Water Resources',
                type: 'group',  // Special type for grouped layers
                expandable: true,
                defaultExpanded: false,
                sublayers: [
                    // RCP 4.5 Scenario
                    {
                        id: 'caspian-rcp45-2030',
                        name: 'RCP 4.5 - 2030',
                        type: 'geojson',
                        defaultVisible: false,
                        dataSource: 'caspianRCP45_2030',
                        mutuallyExclusive: ['sea', 'caspian-projections'],  // Exclude sea and other projections
                        style: {
                            fillColor: '#64b5f6',
                            fillOpacity: 0.5,
                            color: '#0d47a1',
                            weight: 2,
                            dashArray: '5, 5'
                        }
                    },
                    {
                        id: 'caspian-rcp45-2040',
                        name: 'RCP 4.5 - 2040',
                        type: 'geojson',
                        defaultVisible: false,
                        dataSource: 'caspianRCP45_2040',
                        mutuallyExclusive: ['sea', 'caspian-projections'],
                        style: {
                            fillColor: '#42a5f5',
                            fillOpacity: 0.5,
                            color: '#0d47a1',
                            weight: 2,
                            dashArray: '5, 5'
                        }
                    },
                    {
                        id: 'caspian-rcp45-2050',
                        name: 'RCP 4.5 - 2050',
                        type: 'geojson',
                        defaultVisible: false,
                        dataSource: 'caspianRCP45_2050',
                        mutuallyExclusive: ['sea', 'caspian-projections'],
                        style: {
                            fillColor: '#1e88e5',
                            fillOpacity: 0.5,
                            color: '#0d47a1',
                            weight: 2,
                            dashArray: '5, 5'
                        }
                    },
                    // RCP 8.5 Scenario
                    {
                        id: 'caspian-rcp85-2030',
                        name: 'RCP 8.5 - 2030',
                        type: 'geojson',
                        defaultVisible: false,
                        dataSource: 'caspianRCP85_2030',
                        mutuallyExclusive: ['sea', 'caspian-projections'],
                        style: {
                            fillColor: '#ef9a9a',
                            fillOpacity: 0.5,
                            color: '#b71c1c',
                            weight: 2,
                            dashArray: '3, 7'
                        }
                    },
                    {
                        id: 'caspian-rcp85-2040',
                        name: 'RCP 8.5 - 2040',
                        type: 'geojson',
                        defaultVisible: false,
                        dataSource: 'caspianRCP85_2040',
                        mutuallyExclusive: ['sea', 'caspian-projections'],
                        style: {
                            fillColor: '#ef5350',
                            fillOpacity: 0.5,
                            color: '#b71c1c',
                            weight: 2,
                            dashArray: '3, 7'
                        }
                    },
                    {
                        id: 'caspian-rcp85-2050',
                        name: 'RCP 8.5 - 2050',
                        type: 'geojson',
                        defaultVisible: false,
                        dataSource: 'caspianRCP85_2050',
                        mutuallyExclusive: ['sea', 'caspian-projections'],
                        style: {
                            fillColor: '#f44336',
                            fillOpacity: 0.5,
                            color: '#b71c1c',
                            weight: 2,
                            dashArray: '3, 7'
                        }
                    }
                ]
            }
        ],
        
        // Blue Hydrogen specific layers
        blue: [
            {
                id: 'kazakhstan-outline',
                name: 'Kazakhstan',
                category: 'Administrative',
                type: 'geojson',
                defaultVisible: true,
                dataSource: 'kazakhstanOutline',
                style: {
                    fillColor: '#e3f2fd',
                    fillOpacity: 0.3,
                    color: '#1565c0',
                    weight: 2
                }
            },
            {
                id: 'oil-gas-fields',
                name: 'Oil & Gas Fields',
                category: 'Resources',
                type: 'marker',
                defaultVisible: true,
                icon: 'field.png',
                dataSource: 'oilGasFields',
                markerOptions: {
                    color: '#ff9800',
                    size: 'large'
                }
            },
            {
                id: 'co2-storage',
                name: 'CO₂ Storage Sites',
                category: 'Carbon Management',
                type: 'marker',
                defaultVisible: true,
                icon: 'co2.png',
                dataSource: 'co2Storage',
                markerOptions: {
                    color: '#795548',
                    size: 'large'
                }
            },
            {
                id: 'pipelines',
                name: 'Gas Pipelines',
                category: 'Infrastructure',
                type: 'polyline',
                defaultVisible: true,
                dataSource: 'pipelines',
                style: {
                    color: '#ff5722',  // Orange color for gas pipelines
                    weight: 3,
                    opacity: 0.8,
                    dashArray: '10, 5',  // Dashed line style
                    lineCap: 'round',
                    lineJoin: 'round'
                }
            },
        ],
        
        // Derivatives specific layers
        derivatives: [
            {
                id: 'regions',
                name: 'Kazakhstan Regions',
                category: 'Administrative',
                type: 'geojson',
                defaultVisible: true,
                dataSource: 'regionsWithBorders',
                style: {
                    fillColor: '#ffc107',
                    fillOpacity: 0.3,
                    color: '#f57c00',
                    weight: 2
                }
            },
            {
                id: 'ammonia-demand',
                name: 'Ammonia Demand',
                category: 'Chemical Industry',
                type: 'marker',
                defaultVisible: true,
                icon: 'ammonia.png',
                dataSource: 'ammoniaPoints',
                markerOptions: {
                    color: '#9c27b0',
                    size: 'medium'
                }
            },
            {
                id: 'fertilizer-plants',
                name: 'Fertilizer Plants',
                category: 'Agriculture',
                type: 'marker',
                defaultVisible: true,
                icon: 'fertilizer.png',
                dataSource: 'fertilizerPlants',
                markerOptions: {
                    color: '#4caf50',
                    size: 'medium'
                }
            }
        ]
    },
    
    // Get layers for specific mode
    getLayersForMode(mode) {
        const commonLayers = this.layers.common || [];
        const modeLayers = this.layers[mode] || [];
        return [...commonLayers, ...modeLayers];
    },
    
    // Get layer by ID
    getLayerById(layerId) {
        const allLayers = [
            ...this.layers.common,
            ...this.layers.green,
            ...this.layers.blue,
            ...this.layers.derivatives
        ];
        return allLayers.find(layer => layer.id === layerId);
    },
    
    // Get default visible layers for mode
    getDefaultVisibleLayers(mode) {
        const layers = this.getLayersForMode(mode);
        return layers.filter(layer => layer.defaultVisible);
    },
    
    // Layer styles for different selection states
    styles: {
        default: {
            fillOpacity: 0.3,
            weight: 2,
            opacity: 1
        },
        hover: {
            fillOpacity: 0.5,
            weight: 3,
            opacity: 1
        },
        selected: {
            fillOpacity: 0.7,
            weight: 4,
            opacity: 1,
            color: '#ff5722'
        }
    },
    
    // Marker icon configurations
    markerIcons: {
        renewable: {
            wind: {
                iconUrl: 'assets/icons/wind.png',
                iconSize: [30, 30],
                iconAnchor: [15, 30],
                popupAnchor: [0, -30]
            },
            solar: {
                iconUrl: 'assets/icons/solar.png',
                iconSize: [30, 30],
                iconAnchor: [15, 30],
                popupAnchor: [0, -30]
            }
        },
        water: {
            iconUrl: 'assets/icons/water.png',
            iconSize: [25, 25],
            iconAnchor: [12, 25],
            popupAnchor: [0, -25]
        },
        field: {
            iconUrl: 'assets/icons/field.png',
            iconSize: [30, 30],
            iconAnchor: [15, 30],
            popupAnchor: [0, -30]
        },
        demand: {
            iconUrl: 'assets/icons/demand.png',
            iconSize: [25, 25],
            iconAnchor: [12, 25],
            popupAnchor: [0, -25]
        }
    }
};