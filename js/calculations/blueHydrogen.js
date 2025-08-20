/**
 * Blue Hydrogen Calculator Module
 * Implements techno-economic calculations for blue hydrogen production
 */

const BlueHydrogenCalculator = {
    // Constants
    constants: {
        // Reforming technology specifications
        technology: {
            SMR: {
                efficiency: 0.76, // % of theoretical
                capex: 800, // $/kW H2
                opex: 0.04, // fraction of CAPEX
                gasConsumption: 4.5, // MMBtu/kg H2
                co2Emission: 9.0, // kg CO2/kg H2 without CCS
                steamRatio: 3.0 // mol steam/mol carbon
            },
            ATR: {
                efficiency: 0.78,
                capex: 900,
                opex: 0.045,
                gasConsumption: 4.3,
                co2Emission: 8.5,
                steamRatio: 2.5
            },
            POX: {
                efficiency: 0.72,
                capex: 750,
                opex: 0.035,
                gasConsumption: 4.8,
                co2Emission: 10.0,
                steamRatio: 0 // No steam required
            }
        },
        // CCS specifications
        ccs: {
            capex: 200, // $/tonne CO2 annual capacity
            opex: 20, // $/tonne CO2
            energyPenalty: 0.1 // 10% energy penalty
        },
        // Natural gas composition defaults
        gasComposition: {
            methane: 0.85,
            ethane: 0.05,
            propane: 0.03,
            co2: 0.02,
            n2: 0.03,
            h2s: 0.02
        }
    },
    
    // Main calculation function
    async calculate(params) {
        console.log('Calculating blue hydrogen production...', params);
        
        // Extract parameters
        const technology = document.getElementById('reforming-tech')?.value || 'SMR';
        const capacity = parseFloat(document.getElementById('plant-capacity')?.value) || 100;
        const captureRate = parseFloat(document.getElementById('capture-rate')?.value) || 90;
        const steamCarbonRatio = parseFloat(document.getElementById('steam-carbon-ratio')?.value) || 3;
        const gasFieldId = document.getElementById('gas-field-select')?.value;
        const co2StorageId = document.getElementById('co2-storage-select')?.value;
        const co2TransportDistance = parseFloat(document.getElementById('co2-transport-distance')?.value) || 50;
        
        // Economic parameters
        const discountRate = parseFloat(document.getElementById('discount-rate')?.value) || 10;
        const lifetime = parseFloat(document.getElementById('project-lifetime')?.value) || 25;
        const gasPrice = parseFloat(document.getElementById('gas-price')?.value) || 3;
        const co2Price = parseFloat(document.getElementById('co2-price')?.value) || 50;
        const capexFactor = parseFloat(document.getElementById('capex-factor')?.value) || 0;
        const opexFactor = parseFloat(document.getElementById('opex-factor')?.value) || 0;
        
        // Get technology specifications
        const specs = this.constants.technology[technology];
        
        // Get gas field data
        const gasField = AppState.data.oilGasFields?.find(f => f.id === gasFieldId);
        const gasComposition = gasField ? {
            methane: (gasField.methane_percent || 85) / 100,
            co2: (gasField.co2_percent || 2) / 100,
            h2s: (gasField.h2s_percent || 2) / 100
        } : this.constants.gasComposition;
        
        // Calculate annual production (assuming 90% availability)
        const availability = 0.9;
        const annualHours = 8760 * availability;
        const h2ProductionRate = capacity * 1000 / 33.33; // kg/h (HHV basis)
        const annualH2Production = h2ProductionRate * annualHours; // kg/year
        
        // Calculate natural gas consumption
        const gasConsumption = annualH2Production * specs.gasConsumption; // MMBtu/year
        const gasConsumptionBCM = gasConsumption * 0.0283168 / 1000; // BCM/year
        
        // Calculate CO2 emissions and capture
        const co2Generated = annualH2Production * specs.co2Emission / 1000; // tonnes/year
        const co2Captured = co2Generated * (captureRate / 100);
        const co2Emitted = co2Generated - co2Captured;
        
        // Calculate CAPEX
        const reformerCapex = capacity * 1000 * specs.capex;
        const ccsCapex = captureRate > 0 ? co2Captured * 365 * this.constants.ccs.capex : 0;
        const totalCapex = (reformerCapex + ccsCapex) * (1 + capexFactor / 100);
        
        // Calculate OPEX
        const baseOpex = reformerCapex * specs.opex;
        const gassCost = gasConsumption * gasPrice;
        const ccsCost = co2Captured * this.constants.ccs.opex;
        const co2TransportCost = co2Captured * (0.1 * co2TransportDistance); // $/tonne
        const co2TaxOrCredit = co2Emitted * co2Price - co2Captured * (co2Price * 0.5); // Assume 50% credit for CCS
        
        const totalAnnualOpex = (baseOpex + gassCost + ccsCost + co2TransportCost + co2TaxOrCredit) * (1 + opexFactor / 100);
        
        // Calculate LCOH
        const lcoh = this.calculateLCOH(totalCapex, totalAnnualOpex, annualH2Production, discountRate, lifetime);
        
        // Calculate carbon intensity
        const carbonIntensity = co2Emitted / annualH2Production * 1000; // kg CO2/kg H2
        
        // Economic metrics
        const npv = this.calculateNPV(totalCapex, totalAnnualOpex, annualH2Production, 4, discountRate, lifetime);
        const irr = this.calculateIRR(totalCapex, totalAnnualOpex, annualH2Production, 4, lifetime);
        const paybackPeriod = totalCapex / (annualH2Production * 4 - totalAnnualOpex);
        
        return {
            // Production metrics
            annualProduction: annualH2Production / 1000, // tonnes/year
            dailyProduction: annualH2Production / 365, // kg/day
            gasConsumption: gasConsumptionBCM, // BCM/year
            
            // Cost metrics
            lcoh: lcoh, // $/kg
            totalCapex: totalCapex / 1e6, // M$
            annualOpex: totalAnnualOpex / 1e6, // M$/year
            
            // Cost breakdown
            lcohBreakdown: {
                capex: lcoh * (totalCapex / (totalCapex + this.presentValue(totalAnnualOpex, discountRate, lifetime))),
                naturalGas: lcoh * (gassCost / totalAnnualOpex) * (this.presentValue(totalAnnualOpex, discountRate, lifetime) / (totalCapex + this.presentValue(totalAnnualOpex, discountRate, lifetime))),
                ccs: lcoh * ((ccsCost + co2TransportCost) / totalAnnualOpex) * (this.presentValue(totalAnnualOpex, discountRate, lifetime) / (totalCapex + this.presentValue(totalAnnualOpex, discountRate, lifetime))),
                other: lcoh * (baseOpex / totalAnnualOpex) * (this.presentValue(totalAnnualOpex, discountRate, lifetime) / (totalCapex + this.presentValue(totalAnnualOpex, discountRate, lifetime)))
            },
            
            // Technical metrics
            efficiency: specs.efficiency * 100, // %
            specificGasConsumption: specs.gasConsumption, // MMBtu/kg H2
            steamCarbonRatio: steamCarbonRatio,
            
            // Environmental metrics
            carbonIntensity: carbonIntensity, // kg CO2/kg H2
            co2Generated: co2Generated, // tonnes/year
            co2Captured: co2Captured, // tonnes/year
            co2Emitted: co2Emitted, // tonnes/year
            captureRate: captureRate, // %
            co2Avoided: annualH2Production * (10 - carbonIntensity) / 1000, // tonnes CO2/year vs grey H2
            
            // Economic metrics
            npv: npv / 1e6, // M$
            irr: irr, // %
            paybackPeriod: paybackPeriod, // years
            
            // Additional info
            technology: technology,
            gasField: gasField?.name || 'Generic',
            co2Storage: co2StorageId || 'Not selected'
        };
    },
    
    // Helper functions (reuse from green hydrogen calculator)
    calculateLCOH(capex, annualOpex, annualProduction, discountRate, lifetime) {
        const r = discountRate / 100;
        const crf = (r * Math.pow(1 + r, lifetime)) / (Math.pow(1 + r, lifetime) - 1);
        const annualizedCapex = capex * crf;
        const totalAnnualCost = annualizedCapex + annualOpex;
        return totalAnnualCost / annualProduction;
    },
    
    calculateNPV(capex, annualOpex, annualProduction, h2Price, discountRate, lifetime) {
        const r = discountRate / 100;
        const annualRevenue = annualProduction * h2Price;
        let npv = -capex;
        
        for (let year = 1; year <= lifetime; year++) {
            const cashFlow = annualRevenue - annualOpex;
            npv += cashFlow / Math.pow(1 + r, year);
        }
        
        return npv;
    },
    
    calculateIRR(capex, annualOpex, annualProduction, h2Price, lifetime) {
        const annualRevenue = annualProduction * h2Price;
        const annualCashFlow = annualRevenue - annualOpex;
        
        if (annualCashFlow <= 0) return -100;
        
        // Simplified IRR
        return ((annualCashFlow / capex) * 100);
    },
    
    presentValue(annualAmount, discountRate, years) {
        const r = discountRate / 100;
        return annualAmount * ((1 - Math.pow(1 + r, -years)) / r);
    }
};