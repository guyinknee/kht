/**
 * Data Loader Module
 * Handles loading of all GeoJSON and CSV data files
 */

const DataLoader = {
    // Base paths
    paths: {
        geojson: 'data/geojson/',
        csv: 'data/csv/'
    },
    
    // Load all required data
    async loadAllData() {
        console.log('Loading all data files...');
        
        try {
            // Load GeoJSON files
            await this.loadGeoJSONData();
            
            // Load CSV data files
            await this.loadCSVData();
            
            console.log('All data loaded successfully');
        } catch (error) {
            console.error('Error loading data:', error);
            throw error;
        }
    },
    
    // Load GeoJSON files
    async loadGeoJSONData() {
        // Kazakhstan regions (for green hydrogen)
        AppState.data.regionsWithBorders = await this.loadGeoJSON('export (2).geojson');
        
        // Kazakhstan outline (for blue hydrogen)
        AppState.data.kazakhstanOutline = await this.loadGeoJSON('kznoregion.geojson');
        
        // Water bodies
        AppState.data.seaGeoJSON = await this.loadGeoJSON('Sea.geojson');
        AppState.data.riversGeoJSON = await this.loadGeoJSON('Riv2.geojson');
        
        // Water Management Areas
        AppState.data.wmaGeoJSON = await this.loadGeoJSON('wma.geojson');
        
        // Caspian Sea Projections - URL encode the filenames
        console.log('Loading Caspian projections...');
        AppState.data.caspianRCP45_2030 = await this.loadGeoJSON('Caspian RCP 4.5 - 2030.geojson');
        AppState.data.caspianRCP45_2040 = await this.loadGeoJSON('Caspian RCP 4.5 - 2040.geojson');
        AppState.data.caspianRCP45_2050 = await this.loadGeoJSON('Caspian RCP 4.5 - 2050.geojson');
        AppState.data.caspianRCP85_2030 = await this.loadGeoJSON('Caspian RCP 8.5 - 2030.geojson');
        AppState.data.caspianRCP85_2040 = await this.loadGeoJSON('Caspian RCP 8.5 - 2040.geojson');
        AppState.data.caspianRCP85_2050 = await this.loadGeoJSON('Caspian RCP 8.5 - 2050.geojson');
        
        // Log what was loaded
        console.log('Caspian data loaded:', {
            'RCP45_2030': !!AppState.data.caspianRCP45_2030,
            'RCP45_2040': !!AppState.data.caspianRCP45_2040,
            'RCP45_2050': !!AppState.data.caspianRCP45_2050,
            'RCP85_2030': !!AppState.data.caspianRCP85_2030,
            'RCP85_2040': !!AppState.data.caspianRCP85_2040,
            'RCP85_2050': !!AppState.data.caspianRCP85_2050
        });
    },
    
    // Load CSV data files
    async loadCSVData() {
        // Green Hydrogen Data
        AppState.data.renewablePoints = await this.loadCSV('renewable_energy_points.csv');
        AppState.data.electricityNetwork = await this.loadCSV('electricity_network.csv');
        AppState.data.groundwaterAccess = await this.loadCSV('groundwater_access.csv');
        AppState.data.wastewaterPlants = await this.loadCSV('wastewater_plants.csv');
        AppState.data.h2Projects = await this.loadCSV('h2_projects.csv');
        
        // Blue Hydrogen Data
        AppState.data.oilGasFields = await this.loadCSV('oil_gas_fields.csv');
        AppState.data.co2Storage = await this.loadCSV('co2_storage_sites.csv');
        AppState.data.pipelines = await this.loadCSV('pipelines.csv');
        
        // Common Data
        AppState.data.demandPoints = await this.loadCSV('hydrogen_demand_points.csv');
        
        // Regional Data
        AppState.data.regionalData = await this.loadCSV('regional_data.csv');
        
    },
    
    // Load single GeoJSON file
    async loadGeoJSON(filename) {
        try {
            // URL encode the filename to handle spaces
            const encodedFilename = encodeURIComponent(filename);
            const url = this.paths.geojson + encodedFilename;
            
            console.log(`Loading GeoJSON from: ${url}`);
            
            const response = await fetch(url);
            if (!response.ok) {
                console.warn(`GeoJSON file not found: ${filename} (${response.status})`);
                return null;
            }
            const data = await response.json();
            console.log(`Successfully loaded ${filename}:`, data.features ? data.features.length + ' features' : 'no features');
            return data;
        } catch (error) {
            console.warn(`Error loading GeoJSON ${filename}:`, error);
            return null;
        }
    },
    
    // Load and parse CSV file
    async loadCSV(filename) {
        try {
            const response = await fetch(this.paths.csv + filename);
            if (!response.ok) {
                console.warn(`CSV file not found: ${filename}`);
                return this.getEmptyDataStructure(filename);
            }
            const text = await response.text();
            return this.parseCSV(text, filename);
        } catch (error) {
            console.warn(`Error loading CSV ${filename}:`, error);
            return this.getEmptyDataStructure(filename);
        }
    },
    
    // Update the parseCSV function in dataLoader.js
    // Replace the parseCSV function with this improved version:

    parseCSV(text, filename) {
    // Use PapaParse if available
    if (typeof Papa !== 'undefined') {
        const result = Papa.parse(text, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            delimiter: ',',
            delimitersToGuess: [',', '\t', ' ', ';', '|'],
            transformHeader: function(header) {
                // Clean and standardize headers
                return header.trim()
                    .toLowerCase()
                    .replace(/[,\s]+/g, '_')  // Replace spaces and commas with underscore
                    .replace(/_+/g, '_')       // Remove multiple underscores
                    .replace(/^_|_$/g, '');    // Remove leading/trailing underscores
            }
        });
        
        // Special handling for CO2 storage sites
        if (filename === 'co2_storage_sites.csv') {
            result.data = result.data.map(row => {
                // Map the headers to expected field names
                return {
                    id: row.sink_id || row.id,
                    name: row.sink_id || row.name || 'Storage Site',
                    latitude: row.latitude,
                    longitude: row.longitude,
                    storage_capacity_mt: row.capacity_mtco2 || row.capacity || 0,
                    area_km2: row.area_km2 || row.area || 0,
                    thickness_m: row.thickness_m || row.thickness || 0,
                    porosity: row.porosity || 0,
                    efficiency_factor: row.efficiency_factor || 0,
                    density_kg_m3: row.density_kg_m3 || row.density || 700,
                    type: row.type || this.classifyStorageType(row.sink_id || row.name),
                    status: row.status || 'potential'
                };
            });
        }
    
            // Clean up the parsed data
            result.data = result.data.map(row => {
                const cleanRow = {};
                Object.keys(row).forEach(key => {
                    // Trim whitespace from keys and values
                    const cleanKey = key.trim();
                    let value = row[key];
                    
                    // Handle string values
                    if (typeof value === 'string') {
                        value = value.trim();
                        // Try to convert to number if possible
                        if (!isNaN(value) && value !== '') {
                            value = parseFloat(value);
                        }
                    }
                    
                    cleanRow[cleanKey] = value;
                });
                return cleanRow;
            });
            
            console.log(`Parsed ${filename}:`, result.data);
            return result.data;
        } else {
            // Fallback parsing with better delimiter detection
            const lines = text.split('\n').filter(line => line.trim());
            if (lines.length === 0) return [];
            
            // Detect delimiter
            const firstLine = lines[0];
            let delimiter = ',';
            if (firstLine.includes('\t')) delimiter = '\t';
            else if (!firstLine.includes(',') && firstLine.includes(' ')) {
                // Count spaces to detect if space-separated
                delimiter = /\s+/; // Multiple spaces as delimiter
            }
            
            // Parse headers
            const headers = firstLine.split(delimiter).map(h => h.trim());
            const data = [];
            
            // Parse data rows
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(delimiter).map(v => v.trim());
                const row = {};
                headers.forEach((header, index) => {
                    let value = values[index];
                    // Convert to number if possible
                    if (!isNaN(value) && value !== '') {
                        value = parseFloat(value);
                    }
                    row[header] = value;
                });
                data.push(row);
            }
            
            console.log(`Parsed ${filename} (fallback):`, data);
            return data;
        }
    },

    // Helper function to classify storage type based on name
    classifyStorageType(name) {
        if (!name) return 'saline_aquifer';
        const nameLower = name.toLowerCase();
        if (nameLower.includes('gas') || nameLower.includes('field')) {
            return 'depleted_field';
        }
        return 'saline_aquifer';
    },
    
    // Parse individual CSV value
    parseValue(value) {
        if (!value || value === '') return null;
        if (!isNaN(value)) return parseFloat(value);
        return value;
    },
    
    // Get empty data structure for missing files
    getEmptyDataStructure(filename) {
        console.log(`Creating empty structure for: ${filename}`);
        
        const structures = {
            'renewable_energy_points.csv': [
                // Example structure - will be populated from actual CSV
                {
                    id: 'example_wind_1',
                    name: 'Example Wind Farm',
                    type: 'wind', // 'wind' or 'solar'
                    latitude: 48.0,
                    longitude: 67.0,
                    capacity_mw: 100,
                    annual_generation_gwh: 250,
                    capacity_factor: 0.35,
                    commissioning_year: 2023,
                    operator: 'Example Company',
                    status: 'operational' // 'operational', 'construction', 'planned'
                }
            ],
            'electricity_network.csv': [
                {
                    id: 'line_1',
                    type: 'transmission', // 'transmission' or 'distribution'
                    voltage_kv: 220,
                    from_lat: 48.0,
                    from_lon: 67.0,
                    to_lat: 48.5,
                    to_lon: 67.5,
                    capacity_mw: 500
                }
            ],
            'groundwater_access.csv': [
                {
                    id: 'gw_1',
                    name: 'Groundwater Well 1',
                    latitude: 48.0,
                    longitude: 67.0,
                    depth_m: 150,
                    flow_rate_m3_day: 1000,
                    tds_mg_l: 500, // Total Dissolved Solids
                    quality: 'good' // 'excellent', 'good', 'moderate', 'poor'
                }
            ],
            'wastewater_plants.csv': [
                {
                    id: 'wwtp_1',
                    city: 'Astana',
                    name: 'Astana WWTP',
                    latitude: 51.1605,
                    longitude: 71.4704,
                    capacity_m3_day: 150000,
                    treatment_level: 'tertiary', // 'primary', 'secondary', 'tertiary'
                    available_for_reuse_m3_day: 100000
                }
            ],
            'oil_gas_fields.csv': [
                {
                    id: 'field_1',
                    name: 'Tengiz',
                    latitude: 46.5,
                    longitude: 53.0,
                    type: 'oil_gas', // 'oil', 'gas', 'oil_gas'
                    reserves_bcm: 100, // Billion cubic meters for gas
                    production_bcm_year: 5,
                    h2s_percent: 15, // Hydrogen sulfide content
                    co2_percent: 5, // CO2 content
                    methane_percent: 75,
                    operator: 'TCO'
                }
            ],
            'co2_storage_sites.csv': [
                {
                    sink_id: 'Karachiganak',
                    latitude: 51.45,
                    longitude: 53.39,
                    capacity_mtco2: 60.49,
                    area_km2: 324,
                    thickness_m: 650,
                    porosity: 0.08,
                    efficiency_factor: 0.0051,
                    density_kg_m3: 720,
                    type: 'saline_aquifer', // You can derive this or add it
                    status: 'potential' // You can add this field
                }
            ],
            'pipelines.csv': [
                {
                    id: 'pipeline_1',
                    name: 'CAC Pipeline',
                    type: 'gas', // 'gas', 'oil', 'products'
                    from_lat: 46.5,
                    from_lon: 53.0,
                    to_lat: 48.0,
                    to_lon: 67.0,
                    diameter_mm: 1420,
                    capacity_bcm_year: 30,
                    pressure_bar: 75
                }
            ],
            'hydrogen_demand_points.csv': [
                {
                    id: 'demand_1',
                    name: 'Pavlodar Refinery',
                    type: 'refinery', // 'refinery', 'ammonia', 'steel', 'fueling_station', 'export'
                    latitude: 52.2,
                    longitude: 76.9,
                    current_h2_demand_kt_year: 50,
                    potential_h2_demand_kt_year: 100,
                    notes: 'Oil refining and upgrading'
                }
            ],
            'regional_data.csv': [
                {
                    region_name: 'Mangystau',
                    solar_potential_gw: 50,
                    wind_potential_gw: 30,
                    freshwater_resources_bcm: 0.5,
                    freshwater_bcm: 0.1,
                    brackish_water_bcm: 0.3,
                    wastewater_bcm: 0.1,
                }
            ]
        };
        
        return structures[filename] || [];
    },
    
    // Get data by region
    getRegionalData(regionName) {
        const regionalData = AppState.data.regionalData.find(
            r => r.region_name_en === regionName || r.region_name === regionName
        );
        return regionalData || null;
    },
    
    // Get points within region
    getPointsInRegion(pointsArray, regionGeometry) {
        // TODO: Implement point-in-polygon check
        // For now, return all points
        return pointsArray;
    },
    
    // Calculate statistics
    calculateStatistics(dataArray, field) {
        if (!dataArray || dataArray.length === 0) return null;
        
        const values = dataArray.map(d => d[field]).filter(v => v !== null && !isNaN(v));
        
        return {
            min: Math.min(...values),
            max: Math.max(...values),
            avg: values.reduce((a, b) => a + b, 0) / values.length,
            sum: values.reduce((a, b) => a + b, 0),
            count: values.length
        };
    }
};