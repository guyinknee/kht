/**
 * Popup Manager Module
 * Handles info popup display and content generation
 */

const PopupManager = {
    currentPopup: null,
    
    // Show popup with content
    showPopup(data, config, latlng) {
        const popup = document.getElementById('info-popup');
        const title = document.getElementById('popup-title');
        const content = document.getElementById('popup-content');
        
        // Set title
        title.textContent = this.getPopupTitle(data, config);
        
        // Generate content based on data type
        content.innerHTML = this.generatePopupContent(data, config);
        
        // Position popup
        this.positionPopup(popup, latlng);
        
        // Show popup
        popup.style.display = 'block';
        
        // Initialize charts after a brief delay to ensure DOM is ready
        setTimeout(() => {
            this.initializeCharts(data, config);
        }, 100);
        
        // Store current popup data
        this.currentPopup = { data, config };
    },
    
    // Get popup title
    getPopupTitle(data, config) {
        if (data.name_en) return data.name_en;
        if (data.name) return data.name;
        if (data.id) return `${config.name} - ${data.id}`;
        return config.name || 'Information';
    },
    
    // Generate popup content
    generatePopupContent(data, config) {
        let html = '';
        
        // Switch based on layer type or data source
        switch (config.dataSource) {
            case 'regionsWithBorders':
                html = this.generateRegionContent(data);
                break;
            case 'renewablePoints':
                html = this.generateRenewableContent(data);
                break;
            case 'wastewaterPlants':
                html = this.generateWastewaterContent(data);
                break;
            case 'oilGasFields':
                html = this.generateOilGasContent(data);
                break;
            case 'co2Storage':
                html = this.generateCO2StorageContent(data);
                break;
            case 'demandPoints':
                html = this.generateDemandContent(data);
                break;
            case 'h2Projects':
                html = this.generateH2ProjectContent(data);
                break;
            default:
                html = this.generateGenericContent(data);
        }
        
        return html;
    },
    
    // Generate region content
    // Generate region content with fixed water units
    generateRegionContent(data) {
        // Get the region name from the GeoJSON properties
        const regionName = data.name_en || data.name || data.NAME_1;
        console.log('Generating popup for region:', regionName);
        
        // Get regional data
        const regionalData = DataLoader.getRegionalData(regionName);
        
        let html = '<div class="popup-section">';
        
        // Renewable energy section
        html += `
            <div class="popup-section-title">Resource & Siting</div>
            <div class="popup-metric">
                <span class="popup-metric-label">🗺️ Available land:</span>
                <span class="popup-metric-value">${regionalData?.available_land_km2 ?? 'N/A'} km²</span>
            </div>
            <div class="popup-metric">
                <span class="popup-metric-label">☀️ Solar Energy Potential:</span>
                <span class="popup-metric-value">${regionalData?.pvout_kwh_kwp_yr ?? '—'} kWh/kWp·yr</span>
            </div>
            <div class="popup-metric">
                <span class="popup-metric-label">🌬️ Wind Energy Potential:</span>
                <span class="popup-metric-value">${regionalData?.wpd_w_m2_10pct ?? 'N/A'} W/m² · ${regionalData?.ws_m_s_10pct ?? '—'} m/s</span>
            </div>
            <div class="popup-metric">
            <span class="popup-metric-label">💦 Hydropower Potential:</span>
            <span class="popup-metric-value">
                ${regionalData?.hydro_potential_mw ?? '—'} MW 
            </span>
            </div>
        </div>
        <div class="popup-section">
            <div class="popup-section-title">Water Resources (Million m³/year)</div>
            <div class="popup-metric">
                <span class="popup-metric-label">💧 Freshwater:</span>
                <span class="popup-metric-value">${regionalData?.freshwater_mln_m3 || 'N/A'}</span>
            </div>
            <div class="popup-metric">
                <span class="popup-metric-label">🏔️ Groundwater:</span>
                <span class="popup-metric-value">${regionalData?.groundwater_mln_m3 || 'N/A'}</span>
            </div>
            <div class="popup-metric">
                <span class="popup-metric-label">🌊 Brackish Water:</span>
                <span class="popup-metric-value">${regionalData?.brackish_water_mln_m3 || 'N/A'}</span>
            </div>
            <div class="popup-metric">
                <span class="popup-metric-label">🏭 Treated Wastewater:</span>
                <span class="popup-metric-value">${regionalData?.wastewater_mln_m3 || 'N/A'}</span>
            </div>
            <div class="popup-metric">
                <span class="popup-metric-label">💧 Total Available:</span>
                <span class="popup-metric-value" style="font-weight: bold; color: var(--blue);">
                    ${regionalData ? 
                    (parseFloat(regionalData.freshwater_mln_m3 || 0) + 
                    parseFloat(regionalData.groundwater_mln_m3 || 0) +
                    parseFloat(regionalData.brackish_water_mln_m3 || 0) + 
                    parseFloat(regionalData.wastewater_mln_m3 || 0)).toFixed(1) : 
                    'N/A'} mln m³/year
                </span>
            </div>
        </div>
    `;
        
        // Add chart only if we have data
        if (regionalData) {
            html += `
            <div class="popup-section">
                <div class="popup-section-title">Quick Visuals</div>
                <div class="popup-chart" style="margin-bottom:12px;">
                <div style="font-size:12px; color:#666; margin-bottom:6px;">Region vs Kazakhstan Avg</div>
                <canvas id="region-compare-chart" width="320" height="160"></canvas>
                </div>
                <div class="popup-chart">
                <div style="font-size:12px; color:#666; margin-bottom:6px;">Water Resources Breakdown (mln m³/yr)</div>
                <canvas id="region-water-chart" width="320" height="160"></canvas>
                </div>
            </div>`;
            } else {
            html += `
            <div style="margin-top: 10px; padding: 10px; background: #fff3cd; border-radius: 4px; border: 1px solid #ffc107;">
                <strong>⚠️ Note:</strong> Regional data not available. Please ensure the region name matches the data file.
            </div>`;
            }
        
        return html;
    },
    
    // Generate renewable energy content
    generateRenewableContent(data) {
        return `
            <div class="popup-section">
                <div class="popup-section-title">Facility Details</div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Type:</span>
                    <span class="popup-metric-value">${data.type || 'N/A'}</span>
                </div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Capacity:</span>
                    <span class="popup-metric-value">${data.capacity_mw || 0} MW</span>
                </div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Annual Generation:</span>
                    <span class="popup-metric-value">${data.annual_generation_gwh || 0} GWh</span>
                </div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Capacity Factor:</span>
                    <span class="popup-metric-value">${((data.capacity_factor || 0) * 100).toFixed(1)}%</span>
                </div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Status:</span>
                    <span class="popup-metric-value">${data.status || 'Operational'}</span>
                </div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Operator:</span>
                    <span class="popup-metric-value">${data.operator || 'N/A'}</span>
                </div>
            </div>
        `;
    },
    
    // Generate wastewater content (updated)
    generateWastewaterContent(data) {
        // Calculate H2 potential from available water
        const dailyH2Potential = data.available_for_reuse_percent ? 
            (data.capacity_m3_day * (data.available_for_reuse_percent/100) / 9).toFixed(0) : 'N/A';
        
        const annualH2Potential = data.discharge_volume_mln_m3_year && data.available_for_reuse_percent ? 
            (data.discharge_volume_mln_m3_year * 1e6 * (data.available_for_reuse_percent/100) / 9 / 1000).toFixed(1) : 'N/A';
        
        // Discharge type display
        const dischargeTypeDisplay = {
            'water_body': '🌊 Water Body',
            'pond_evaporator': '☀️ Evaporation Pond',
            'unknown': '❓ Unknown'
        };
        
        // Treatment level display
        const treatmentLevelDisplay = {
            'primary': '🔵 Primary',
            'secondary': '🟡 Secondary', 
            'tertiary': '🟢 Tertiary',
            'unknown': '❓ Unknown'
        };
        
        return `
            <div class="popup-section">
                <div class="popup-section-title">Plant Information</div>
                <div class="popup-metric">
                    <span class="popup-metric-label">City:</span>
                    <span class="popup-metric-value">${data.city || 'N/A'}</span>
                </div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Operator:</span>
                    <span class="popup-metric-value">${data.operator || data.name || 'N/A'}</span>
                </div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Treatment Level:</span>
                    <span class="popup-metric-value">${treatmentLevelDisplay[data.treatment_level] || data.treatment_level || 'N/A'}</span>
                </div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Discharge To:</span>
                    <span class="popup-metric-value" style="font-weight: bold;">
                        ${dischargeTypeDisplay[data.discharge_type] || data.discharge_type || 'N/A'}
                    </span>
                </div>
            </div>
            <div class="popup-section">
                <div class="popup-section-title">Capacity & Flow</div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Daily Capacity:</span>
                    <span class="popup-metric-value">${this.formatNumber(data.capacity_m3_day || 0)} m³/day</span>
                </div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Annual Discharge:</span>
                    <span class="popup-metric-value">${data.discharge_volume_mln_m3_year || 0} mln m³/year</span>
                </div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Available for Reuse:</span>
                    <span class="popup-metric-value">${data.available_for_reuse_percent || 0}%</span>
                </div>
            </div>
            <div class="popup-section">
                <div class="popup-section-title">H₂ Production Potential</div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Daily H₂ Potential:</span>
                    <span class="popup-metric-value">${dailyH2Potential} kg/day</span>
                </div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Annual H₂ Potential:</span>
                    <span class="popup-metric-value">${annualH2Potential} kt/year</span>
                </div>
            </div>
            ${data.discharge_type === 'pond_evaporator' ? `
            <div style="margin-top: 10px; padding: 10px; background: #fff3cd; border-radius: 4px; border: 1px solid #ffc107;">
                <strong>⚠️ Note:</strong> Water discharged to evaporation ponds may have limited reuse potential for hydrogen production.
            </div>
            ` : ''}
        `;
    },
    
    // Generate oil & gas field content
    generateOilGasContent(data) {
        return `
            <div class="popup-section">
                <div class="popup-section-title">Field Information</div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Type:</span>
                    <span class="popup-metric-value">${data.type || 'N/A'}</span>
                </div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Reserves:</span>
                    <span class="popup-metric-value">${data.reserves_bcm || 0} BCM</span>
                </div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Production:</span>
                    <span class="popup-metric-value">${data.production_bcm_year || 0} BCM/year</span>
                </div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Operator:</span>
                    <span class="popup-metric-value">${data.operator || 'N/A'}</span>
                </div>
            </div>
            <div class="popup-section">
                <div class="popup-section-title">Gas Composition %</div>
                <div class="popup-chart">
                    <canvas id="composition-chart" width="300" height="150"></canvas>
                </div>
            </div>
        `;
    },
    
    // Generate CO2 storage content
    generateCO2StorageContent(data) {
        // Calculate additional metrics
        const totalVolume = (data.area_km2 * data.thickness_m * 1000) / 1e6; // Million m³
        const effectiveVolume = totalVolume * (data.porosity || 0.1) * (data.efficiency_factor || 0.005);
        const theoreticalCapacity = effectiveVolume * (data.density_kg_m3 || 700) / 1e6; // Mt CO2
        
        return `
            <div class="popup-section">
                <div class="popup-section-title">Storage Site Details</div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Type:</span>
                    <span class="popup-metric-value">${this.formatStorageType(data.type)}</span>
                </div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Storage Capacity:</span>
                    <span class="popup-metric-value">${data.storage_capacity_mt || data.capacity_mtco2 || 0} Mt CO₂</span>
                </div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Area:</span>
                    <span class="popup-metric-value">${this.formatNumber(data.area_km2 || 0)} km²</span>
                </div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Thickness:</span>
                    <span class="popup-metric-value">${this.formatNumber(data.thickness_m || 0)} m</span>
                </div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Status:</span>
                    <span class="popup-metric-value">${this.formatStatus(data.status)}</span>
                </div>
            </div>
            <div class="popup-section">
                <div class="popup-section-title">Technical Parameters</div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Porosity:</span>
                    <span class="popup-metric-value">${((data.porosity || 0) * 100).toFixed(1)}%</span>
                </div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Storage Efficiency:</span>
                    <span class="popup-metric-value">${((data.efficiency_factor || 0) * 100).toFixed(2)}%</span>
                </div>
                <div class="popup-metric">
                    <span class="popup-metric-label">CO₂ Density:</span>
                    <span class="popup-metric-value">${data.density_kg_m3 || 700} kg/m³</span>
                </div>
            </div>
        `;
    },
    
    // Generate demand point content
    generateDemandContent(data) {
        return `
            <div class="popup-section">
                <div class="popup-section-title">Demand Point</div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Type:</span>
                    <span class="popup-metric-value">${data.type || 'N/A'}</span>
                </div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Current H₂ Demand:</span>
                    <span class="popup-metric-value">${data.current_h2_demand_kt_year || 0} kt/year</span>
                </div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Potential H₂ Demand:</span>
                    <span class="popup-metric-value">${data.potential_h2_demand_kt_year || 0} kt/year</span>
                </div>
                ${data.notes ? `
                <div class="popup-metric">
                    <span class="popup-metric-label">Notes:</span>
                    <span class="popup-metric-value">${data.notes}</span>
                </div>
                ` : ''}
            </div>
        `;
    },

    generateH2ProjectContent(data) {
        return `
            <div class="popup-section">
                <div class="popup-section-title">Hydrogen Project Details</div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Project Name:</span>
                    <span class="popup-metric-value">${data.name || 'H₂ Project'}</span>
                </div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Type:</span>
                    <span class="popup-metric-value" style="color: ${data.type === 'green' ? '#4caf50' : '#2196f3'};">
                        ${data.type === 'green' ? '🟢 Green H₂' : '🔵 Blue H₂'}
                    </span>
                </div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Location:</span>
                    <span class="popup-metric-value">${data.city || 'Kazakhstan'}</span>
                </div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Status:</span>
                    <span class="popup-metric-value">
                        ${data.status === 'operational' ? '✅ Operational' : 
                        data.status === 'construction' ? '🚧 Under Construction' : '📋 Planned'} 
                    </span>
                </div>
            </div>
            <div class="popup-section">
                <div class="popup-section-title">Technical Specifications</div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Capacity:</span>
                    <span class="popup-metric-value">${data.capacity_mw || 'N/A'} MW</span>
                </div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Production:</span>
                    <span class="popup-metric-value">${data.production_kt_year || 'N/A'} kt/year</span>
                </div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Technology:</span>
                    <span class="popup-metric-value">${data.technology || 'N/A'}</span>
                </div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Commissioning:</span>
                    <span class="popup-metric-value">${data.commissioning_year || 'N/A'}</span>
                </div>
            </div>
            ${data.description ? `
            <div class="popup-section">
                <div class="popup-section-title">Description</div>
                <div style="padding: 10px; background: #f5f5f5; border-radius: 4px; font-size: 12px;">
                    ${data.description}
                </div>
            </div>
            ` : ''}
        `;
    },
    
    // Generate generic content
    generateGenericContent(data) {
        let html = '<div class="popup-section">';
        
        Object.keys(data).forEach(key => {
            if (key !== 'id' && data[key] !== null && data[key] !== undefined) {
                html += `
                    <div class="popup-metric">
                        <span class="popup-metric-label">${this.formatLabel(key)}:</span>
                        <span class="popup-metric-value">${data[key]}</span>
                    </div>
                `;
            }
        });
        
        html += '</div>';
        return html;
    },
    
    // Initialize charts in popup
    // Initialize charts in popup
    initializeCharts(data, config) {
    console.log('Initializing charts for:', config.dataSource);

    // Destroy any existing charts first
    if (window.popupCharts) {
        Object.values(window.popupCharts).forEach(ch => { try { ch?.destroy(); } catch(e){} });
    }
    window.popupCharts = {};

    // Gas composition chart
    const compositionChartCanvas = document.getElementById('composition-chart');
    if (compositionChartCanvas) {
        console.log('Creating composition chart');
        this.createCompositionChart(data);
    }

    // Storage chart
    const storageChartCanvas = document.getElementById('storage-chart');
    if (storageChartCanvas) {
        console.log('Creating storage chart');
        this.createStorageChart(data);
    }

    // --- Region Quick Visuals (add this block) ---
    const isRegionLayer = ['regionsWithBorders', 'regions'].includes(config?.dataSource);
    const compareEl = document.getElementById('region-compare-chart');
    const waterEl   = document.getElementById('region-water-chart');
    if ((compareEl || waterEl) && isRegionLayer) {
        const regionName = data.name_en || data.name || data.NAME_1;
        const regionalData = regionName ? DataLoader.getRegionalData(regionName) : null;
        if (regionalData) {
        if (compareEl) this.createRegionCompareIndexChart(regionalData); // apples-to-apples (KZ = 100) with dashed 100% line
        if (waterEl)   this.createRegionWaterChart(regionalData);        // water breakdown pie
        }
    }

    // Optional: if you still show single-canvas version
    const singleEl = document.getElementById('region-resources-chart');
    if (singleEl && isRegionLayer) {
        const regionName = data.name_en || data.name || data.NAME_1;
        const regionalData = regionName ? DataLoader.getRegionalData(regionName) : null;
        if (regionalData) this.createRegionResourcesChart(singleEl, regionalData);
    }
    },
    // Create gas composition chart
    createCompositionChart(data) {
        const ctx = document.getElementById('composition-chart').getContext('2d');
        const methane = data.methane_percent || 75;
        const ethane = data.ethane_percent || 0;
        const propane = data.propane_percent || 0;
        const butane = data.butane_percent || 0;
        const pentane = data.pentane_percent || 0;
        const others = data.others_percent || 0;
        const remainder = 100 - methane - ethane - propane - butane - pentane - others;

        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['CH₄', 'C₂H₆', 'C₃H₈', 'C₄H₁₀', 'C₅H₁₂', 'Other'],
                datasets: [{
                    data: [methane, ethane, propane, butane, pentane, others + remainder],
                    backgroundColor: ['#4caf50', '#ff9800', '#f44336', '#9e9e9e', '#607d8b', '#cfd8dc']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    },
    
    // Position popup near click location
    positionPopup(popup, latlng) {
        if (!latlng) return;
        
        const point = MapManager.map.latLngToContainerPoint(latlng);
        const mapSize = MapManager.map.getSize();
        const popupWidth = 450;  // Max width
        const popupHeight = 600; // Max height
        
        let left = point.x + 20;
        let top = point.y - 150; // Position higher to accommodate larger popup
        
        // Adjust if popup would go off screen
        if (left + popupWidth > mapSize.x) {
            left = point.x - popupWidth - 20;
        }
        if (top < 20) {
            top = 20;
        }
        if (top + popupHeight > mapSize.y) {
            top = mapSize.y - popupHeight - 20;
        }
        
        popup.style.left = left + 'px';
        popup.style.top = top + 'px';
    },
    
    // Helper functions
    formatNumber(num) {
        if (!num) return '0';
        return num.toLocaleString();
    },
    
    formatLabel(key) {
        return key.replace(/_/g, ' ')
                  .replace(/\b\w/g, l => l.toUpperCase());
    },
    
    calculateH2FromWaterMln(regionalData) {
        if (!regionalData) return 'N/A';
        
        // Total water in million m³/year
        const totalWaterMln = parseFloat(regionalData.freshwater_mln_m3 || 0) + 
                            parseFloat(regionalData.groundwater_mln_m3 || 0) +
                            parseFloat(regionalData.brackish_water_mln_m3 || 0) + 
                            parseFloat(regionalData.wastewater_mln_m3 || 0);
        
        // Convert to m³
        const totalWater = totalWaterMln * 1e6;
        
        // Assume 10% of water can be used for H2 production
        const availableWater = totalWater * 0.1;
        
        // 9 liters (0.009 m³) of water per kg H2
        const h2Production = availableWater / 0.009 / 1000000; // Convert to kt
        
        return h2Production > 0 ? h2Production.toFixed(0) : 'N/A';
    },
    // Keep the original calculateH2FromWater for backward compatibility
    calculateH2FromWater(regionalData) {
        // This function now calls the million m³ version
        return this.calculateH2FromWaterMln(regionalData);
    },

    // Calculate H2 from energy (unchanged)
    calculateH2FromEnergy(regionalData) {
        if (!regionalData) return 'N/A';
        
        // Total renewable capacity in MW
        const totalRenewable = (parseFloat(regionalData.wind_potential_gw || 0) + 
                            parseFloat(regionalData.solar_potential_gw || 0)) * 1000;
        
        // Assume 30% capacity factor average
        const annualEnergy = totalRenewable * 8760 * 0.3; // MWh/year
        
        // 55 kWh per kg H2
        const h2Production = annualEnergy * 1000 / 55 / 1000000; // Convert to kt
        
        return h2Production.toFixed(0);
    },

    // Determine limiting factor (million m³ version)
    determineLimitingFactorMln(regionalData) {
        if (!regionalData) return 'Insufficient Data';
        
        const waterH2 = parseFloat(this.calculateH2FromWaterMln(regionalData));
        const energyH2 = parseFloat(this.calculateH2FromEnergy(regionalData));
        
        if (isNaN(waterH2) || waterH2 === 0) return '💧 Water Limited (No Water Data)';
        if (isNaN(energyH2) || energyH2 === 0) return '⚡ Energy Limited (No Energy Data)';
        
        if (waterH2 < energyH2) {
            return '💧 Water Limited';
        } else {
            return '⚡ Energy Limited';
        }
    },
        // Keep original for backward compatibility
    determineLimitingFactor(regionalData) {
        return this.determineLimitingFactorMln(regionalData);
    },


    // Add WMA popup handler
    showWMAPopup(data, latlng) {
        const popup = document.getElementById('info-popup');
        const title = document.getElementById('popup-title');
        const content = document.getElementById('popup-content');
        
        // Use river_names as the title
        title.textContent = data.river_names || 'Water Management Area';
        
        // Map classification to readable text with icons
        const classificationText = {
            'available': '💧💧💧 High Volume Available',
            'high available water': '💧💧💧 High Volume Available',
            'medium available water': '💧💧 Medium Availability',
            'less available water': '💧 Limited Availability',
            'no available water': '⚠️ No Water Available',
            'no data': '❓ No Data Available'
        };
        
        // Get the classification display text
        let displayClassification = classificationText['no data'];
        const classification = (data.classification || '').toLowerCase();
        Object.keys(classificationText).forEach(key => {
            if (classification.includes(key)) {
                displayClassification = classificationText[key];
            }
        });
        
        const html = `
            <div class="popup-section">
                <div class="popup-section-title">Water Management Area Details</div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Water Source:</span>
                    <span class="popup-metric-value">${data.river_names || 'Unknown'}</span>
                </div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Region:</span>
                    <span class="popup-metric-value">${data.NAME_1 || 'N/A'}</span>
                </div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Water Availability:</span>
                    <span class="popup-metric-value">${displayClassification}</span>
                </div>
                ${data.ID ? `
                ` : ''}
            </div>
            <div class="popup-section">
                <div class="popup-section-title">Assessment Status</div>
                <div style="padding: 10px; background: #e3f2fd; border-radius: 4px; border-left: 3px solid #1976d2;">
                    <strong>Note:</strong> This Water Management Area covers the ${data.NAME_1} region. 
                    Water source is ${data.river_names}. 
                    Detailed WMA-based hydrogen production calculations will be available once full resource assessment is complete.
                </div>
            </div>
        `;
        
        content.innerHTML = html;
        this.positionPopup(popup, latlng);
        popup.style.display = 'block';
    },
    // Add these functions to popupManager.js:

    // Helper functions for CO2 storage
    formatStorageType(type) {
        const types = {
            'depleted_field': 'Depleted Gas Field',
            'saline_aquifer': 'Saline Aquifer',
            'oil_field': 'Depleted Oil Field'
        };
        return types[type] || type || 'Saline Aquifer';
    },

    formatStatus(status) {
        const statuses = {
            'operational': '🟢 Operational',
            'development': '🟡 In Development',
            'potential': '🔵 Potential Site'
        };
        return statuses[status] || status || '🔵 Potential Site';
    },

    calculateH2FromCO2Storage(capacityMt) {
        // Assuming 9 kg CO2 captured per kg H2 produced in SMR with CCS
        // And assuming 20-year project lifetime
        return ((capacityMt * 1000) / 9 / 20).toFixed(0); // kt H2/year
    },

    calculateStorageLifetime(capacityMt) {
        // Assuming 100 MW blue H2 plant with 90% capture
        // ~200 kt CO2/year captured
        return (capacityMt * 1000 / 200).toFixed(0);
    },

    // Update the initializeCharts function to add storage chart
    createStorageChart(data) {
        const ctx = document.getElementById('storage-chart');
        if (!ctx) return;
        
        new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['Capacity', 'Area', 'Thickness'],
                datasets: [{
                    label: 'Storage Parameters',
                    data: [
                        data.storage_capacity_mt || data.capacity_mtco2 || 0,
                        (data.area_km2 || 0) / 10, // Scale for visualization
                        (data.thickness_m || 0) / 10 // Scale for visualization
                    ],
                    backgroundColor: ['#795548', '#8d6e63', '#a1887f']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const labels = ['Mt CO₂', 'km² (×10)', 'm (×10)'];
                                return `${context.parsed.y.toFixed(1)} ${labels[context.dataIndex]}`;
                            }
                        }
                    }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    },

    // Normalized (KZ = 100) bars + dashed 100% baseline
    createRegionResourcesChart(canvasEl, regionalData) {
    if (!canvasEl || !regionalData) return;
    const ctx = (canvasEl.getContext ? canvasEl : document.getElementById(canvasEl))?.getContext('2d');
    if (!ctx) return;

    // Kazakhstan baselines
    const KZ = { pvout: 1363, wpd: 602, ws: 8.27 };

    // number -> finite or 0
    const num0 = (v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
    };

    // Region raw values (keys used in your popup)
    const rPV  = num0(regionalData.pvout_kwh_kwp_yr);
    const rWPD = num0(regionalData.wpd_w_m2_10pct);
    const rWS  = num0(regionalData.ws_m_s_10pct);

    // Normalize to KZ = 100
    const regIdx = [
        KZ.pvout ? (rPV  / KZ.pvout) * 100 : 0,
        KZ.wpd   ? (rWPD / KZ.wpd)   * 100 : 0,
        KZ.ws    ? (rWS  / KZ.ws)    * 100 : 0
    ].map(v => Math.max(0, v));

    const labels = ['PV Output', 'Wind Power Density', 'Mean Wind Speed'];

    // Clean up previous instance
    window.popupCharts ??= {};
    window.popupCharts.regionResources?.destroy?.();

    // Colors per bar (PVout, WPD, MWS)
    const BAR_COLORS = ['#f6c90e', '#0d47a1', '#b71c1c']; // yellow, dark blue, dark red

    window.popupCharts.regionResources = new Chart(ctx, {
        type: 'bar',
        data: {
        labels,
        datasets: [
            // Region bars (each bar its own color)
            {
            label: 'Region (KZ = 100)',
            data: regIdx,
            backgroundColor: BAR_COLORS,
            borderRadius: 4
            },
            // 100% KZ baseline (dashed line)
            {
            type: 'line',
            label: 'Kazakhstan = 100%',
            data: [100, 100, 100],
            borderColor: '#6b7280',   // neutral gray
            borderDash: [6, 6],
            borderWidth: 2,
            pointRadius: 0,
            fill: false
            }
        ]
        },
        options: {
        responsive: true,
        maintainAspectRatio: false,     // make sure parent gives a fixed height
        animation: false,
        resizeDelay: 150,
        plugins: {
            legend: { position: 'bottom' },
            tooltip: {
            callbacks: {
                // Show both normalized % and raw values
                label: (c) => {
                if (c.dataset.type === 'line') return 'Kazakhstan: 100%';
                const i = c.dataIndex;
                const raw = [rPV, rWPD, rWS][i];
                const units = ['kWh/kWp·yr', 'W/m²', 'm/s'][i];
                return `${c.label}: ${c.parsed.y.toFixed(0)}% of KZ  (Region = ${raw.toFixed(2)} ${units})`;
                }
            }
            }
        },
        scales: {
            x: { grid: { display: false }, ticks: { font: { size: 11 } } },
            y: {
            min: 0,
            // Give headroom above the taller of 100% or region bars
            suggestedMax: Math.max(120, Math.ceil(Math.max(...regIdx, 100) / 20) * 20),
            grid: { color: '#eee' },
            ticks: { display: false } // hide y-axis numbers
            }
        }
        }
    });
    },
    // helper: finite number or 0
    num0(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; },

    // Apples-to-apples normalized comparison (KZ = 100) with dashed 100% line
    createRegionCompareIndexChart(regionalData) {
    const el = document.getElementById('region-compare-chart');
    if (!el) return;
    const ctx = el.getContext('2d');

    // Kazakhstan baseline
    const KZ = { pvout: 1363, wpd: 602, ws: 8.27 };

    // Region values (use your keys)
    const rPV  = this.num0(regionalData?.pvout_kwh_kwp_yr);
    const rWPD = this.num0(regionalData?.wpd_w_m2_10pct);
    const rWS  = this.num0(regionalData?.ws_m_s_10pct);

    // Normalize to KZ = 100
    const regIdx = [
        KZ.pvout ? (rPV  / KZ.pvout) * 100 : 0,
        KZ.wpd   ? (rWPD / KZ.wpd)   * 100 : 0,
        KZ.ws    ? (rWS  / KZ.ws)    * 100 : 0
    ].map(v => Math.max(0, v));

    const labels = ['PV Output', 'Wind Power Density', 'Mean Wind Speed'];
    const BAR_COLORS = ['#f6c90e', '#0d47a1', '#b71c1c']; // yellow, dark blue, dark red

    window.popupCharts ??= {};
    window.popupCharts.regionCompare?.destroy?.();

    window.popupCharts.regionCompare = new Chart(ctx, {
        type: 'bar',
        data: {
        labels,
        datasets: [
            {
            label: 'Region (KZ = 100)',
            data: regIdx,
            backgroundColor: BAR_COLORS,
            borderRadius: 4
            },
            {
            type: 'line',
            label: 'Kazakhstan = 100%',
            data: [100, 100, 100],
            borderColor: '#6b7280',
            borderDash: [6, 6],
            borderWidth: 2,
            pointRadius: 0,
            fill: false
            }
        ]
        },
        options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        resizeDelay: 150,
        plugins: {
            legend: { position: 'bottom' },
            tooltip: {
            callbacks: {
                label: (c) => {
                if (c.dataset.type === 'line') return 'Kazakhstan: 100%';
                const raw = [rPV, rWPD, rWS][c.dataIndex];
                const units = ['kWh/kWp·yr', 'W/m²', 'm/s'][c.dataIndex];
                return `${c.label}: ${c.parsed.y.toFixed(0)}% of KZ (Region = ${raw.toFixed(2)} ${units})`;
                }
            }
            }
        },
        scales: {
            x: { grid: { display: false }, ticks: { font: { size: 11 } } },
            y: {
            min: 0,
            suggestedMax: Math.max(120, Math.ceil(Math.max(...regIdx, 100) / 20) * 20),
            grid: { color: '#eee' },
            ticks: { display: false } // hide y-axis numbers
            }
        }
        }
    });
    },

    // Water resources pie (auto-hides zero/empty slices)
    createRegionWaterChart(regionalData) {
    const el = document.getElementById('region-water-chart');
    if (!el) return;
    const ctx = el.getContext('2d');

    const slices = [
        { label: 'Freshwater',  value: this.num0(regionalData?.freshwater_mln_m3)  },
        { label: 'Groundwater', value: this.num0(regionalData?.groundwater_mln_m3) },
        { label: 'Brackish',    value: this.num0(regionalData?.brackish_water_mln_m3) },
        { label: 'Treated WW',  value: this.num0(regionalData?.wastewater_mln_m3) }
    ].filter(s => s.value > 0);

    if (!slices.length) return;

    window.popupCharts ??= {};
    window.popupCharts.regionWater?.destroy?.();

    window.popupCharts.regionWater = new Chart(ctx, {
        type: 'pie',
        data: {
        labels: slices.map(s => s.label),
        datasets: [{ data: slices.map(s => s.value) }]
        },
        options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { position: 'bottom' } }
        }
    });
    },
    // Show pipeline popup
    showPipelinePopup(pipelineInfo, latlng) {
        const popup = document.getElementById('info-popup');
        const title = document.getElementById('popup-title');
        const content = document.getElementById('popup-content');
        
        // Set title
        title.textContent = pipelineInfo.name;
        
        // Generate content
        const html = `
            <div class="popup-section">
                <div class="popup-section-title">Pipeline Information</div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Type:</span>
                    <span class="popup-metric-value">${pipelineInfo.type.toUpperCase()}</span>
                </div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Diameter:</span>
                    <span class="popup-metric-value">${pipelineInfo.diameter} mm</span>
                </div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Capacity:</span>
                    <span class="popup-metric-value">${pipelineInfo.capacity} BCM/year</span>
                </div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Length:</span>
                    <span class="popup-metric-value">${pipelineInfo.length} km</span>
                </div>
                ${pipelineInfo.stations ? `
                <div class="popup-metric">
                    <span class="popup-metric-label">Route:</span>
                    <span class="popup-metric-value" style="font-size: 11px;">${pipelineInfo.stations}</span>
                </div>
                ` : ''}
            </div>
            <div class="popup-section">
                <div class="popup-section-title">Transport Capacity</div>
                <div class="popup-metric">
                    <span class="popup-metric-label">H₂ Equivalent:</span>
                    <span class="popup-metric-value">${this.calculateH2Equivalent(pipelineInfo.capacity)} kt H₂/year</span>
                </div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Energy Flow:</span>
                    <span class="popup-metric-value">${(pipelineInfo.capacity * 10.5).toFixed(1)} TWh/year</span>
                </div>
            </div>
        `;
        
        content.innerHTML = html;
        
        // Position and show popup
        this.positionPopup(popup, latlng);
        popup.style.display = 'block';
    },

    // Add this to popupManager.js for export point popups

    showExportPopup(point, latlng) {
        const popup = document.getElementById('info-popup');
        const title = document.getElementById('popup-title');
        const content = document.getElementById('popup-content');
        
        // Set title
        title.textContent = point.name || 'H₂ Export Terminal';
        
        // Generate content
        const html = `
            <div class="popup-section">
                <div class="popup-section-title">Export Corridor Details</div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Destination Market:</span>
                    <span class="popup-metric-value">${point.export_destination || 'International'}</span>
                </div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Transport Mode:</span>
                    <span class="popup-metric-value">${point.transport_mode || 'Pipeline/Ship'}</span>
                </div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Port/Terminal:</span>
                    <span class="popup-metric-value">${point.port_name || point.name}</span>
                </div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Distance to Market:</span>
                    <span class="popup-metric-value">${point.distance_km || 'N/A'} km</span>
                </div>
            </div>
            <div class="popup-section">
                <div class="popup-section-title">Export Capacity</div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Current H₂ Export:</span>
                    <span class="popup-metric-value">${point.current_h2_demand_kt_year || 0} kt/year</span>
                </div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Potential H₂ Export:</span>
                    <span class="popup-metric-value">${point.potential_h2_demand_kt_year || 1000} kt/year</span>
                </div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Target Year:</span>
                    <span class="popup-metric-value">${point.target_year || 2030}</span>
                </div>
            </div>
            <div class="popup-section">
                <div class="popup-section-title">Market Analysis</div>
                <div class="popup-metric">
                    <span class="popup-metric-label">H₂ Price (delivered):</span>
                    <span class="popup-metric-value">$${point.delivered_price || 5}/kg</span>
                </div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Transport Cost:</span>
                    <span class="popup-metric-value">$${point.transport_cost || 1.5}/kg</span>
                </div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Market Size:</span>
                    <span class="popup-metric-value">${point.market_size_mt || 10} Mt/year</span>
                </div>
            </div>
        `;
        
        content.innerHTML = html;
        
        // Position and show popup
        this.positionPopup(popup, latlng);
        popup.style.display = 'block';
        
        // Create export economics chart
        setTimeout(() => {
            this.createExportChart(point);
        }, 100);
    },

    // Show station popup
    showStationPopup(station, latlng) {
        const popup = document.getElementById('info-popup');
        const title = document.getElementById('popup-title');
        const content = document.getElementById('popup-content');
        
        // Set title
        title.textContent = station.ps_name || 'Pipeline Station';
        
        // Generate content
        const html = `
            <div class="popup-section">
                <div class="popup-section-title">Station Details</div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Location:</span>
                    <span class="popup-metric-value">${station.latitude.toFixed(4)}, ${station.longitude.toFixed(4)}</span>
                </div>
                <div class="popup-metric">
                    <span class="popup-metric-label">Pipeline Group:</span>
                    <span class="popup-metric-value">Group ${station.group}</span>
                </div>
                ${station.type ? `
                <div class="popup-metric">
                    <span class="popup-metric-label">Type:</span>
                    <span class="popup-metric-value">${station.type.toUpperCase()}</span>
                </div>
                ` : ''}
                ${station.capacity_bcm_year ? `
                <div class="popup-metric">
                    <span class="popup-metric-label">Capacity:</span>
                    <span class="popup-metric-value">${station.capacity_bcm_year} BCM/year</span>
                </div>
                ` : ''}
            </div>
        `;
        
        content.innerHTML = html;
        
        // Position and show popup
        this.positionPopup(popup, latlng);
        popup.style.display = 'block';
    },

    // Calculate H2 equivalent from natural gas
    calculateH2Equivalent(gasBcm) {
        // Rough calculation: 1 BCM natural gas can produce ~90 kt H2 via SMR
        return (gasBcm * 90).toFixed(0);
    }
};