/**
 * Green Hydrogen Calculator Module
 * Implements techno-economic calculations for green hydrogen production
 */

const GreenHydrogenCalculator = {
    // Constants (to be loaded from CSV/Excel)
    constants: {
        // Electrolyzer specifications
        electrolyzer: {
            PEM: {
                specificEnergy: 55, // kWh/kg H2
                efficiency: 0.70,
                capex: 1200, // $/kW
                opex: 0.03, // fraction of CAPEX per year
                lifetime: 80000, // operating hours
                waterConsumption: 9 // L/kg H2
            },
            Alkaline: {
                specificEnergy: 52,
                efficiency: 0.65,
                capex: 1000,
                opex: 0.025,
                lifetime: 90000,
                waterConsumption: 9
            },
            SOEC: {
                specificEnergy: 45,
                efficiency: 0.85,
                capex: 1500,
                opex: 0.04,
                lifetime: 40000,
                waterConsumption: 9
            }
        },
        // Water treatment costs
        waterTreatment: {
            none: 0,
            basic: 0.5, // $/m3
            desalination: 2.0,
            advanced: 1.5
        },
        // Regional factors
        regionalFactors: {
            labor: 0.7, // Kazakhstan labor cost factor vs global
            construction: 0.8,
            logistics: 1.2
        }
    },
    
    // Main calculation function
    async calculate(params) {
        console.log('Calculating green hydrogen production...', params);
        
        // Extract parameters
        const electrolyzerType = document.getElementById('electrolyzer-type')?.value || 'PEM';
        const capacity = parseFloat(document.getElementById('electrolyzer-capacity')?.value) || 100;
        const loadFactor = parseFloat(document.getElementById('load-factor')?.value) || 40;
        const stackEfficiency = parseFloat(document.getElementById('stack-efficiency')?.value) || 70;
        const waterType = document.getElementById('water-source-type')?.value || 'river';
        const waterTreatment = document.getElementById('water-treatment')?.value || 'basic';
        const renewableSource = document.getElementById('renewable-source')?.value || 'solar';
        
        // Economic parameters
        const discountRate = parseFloat(document.getElementById('discount-rate')?.value) || 10;
        const lifetime = parseFloat(document.getElementById('project-lifetime')?.value) || 25;
        const electricityPrice = parseFloat(document.getElementById('electricity-price')?.value) || 50;
        const capexFactor = parseFloat(document.getElementById('capex-factor')?.value) || 0;
        const opexFactor = parseFloat(document.getElementById('opex-factor')?.value) || 0;
        
        // Get electrolyzer specifications
        const specs = this.constants.electrolyzer[electrolyzerType];
        
        // Calculate annual operating hours
        const annualHours = 8760 * (loadFactor / 100);
        
        // Calculate hydrogen production
        const actualEfficiency = stackEfficiency / 100;
        const specificEnergy = specs.specificEnergy / actualEfficiency;
        const annualEnergyConsumption = capacity * 1000 * annualHours; // kWh/year
        const annualH2Production = annualEnergyConsumption / specificEnergy; // kg/year
        const dailyH2Production = annualH2Production / 365;
        
        // Calculate CAPEX
        const baseCapex = capacity * 1000 * specs.capex; // Convert MW to kW
        const regionalFactor = this.constants.regionalFactors.construction;
        const adjustedCapex = baseCapex * regionalFactor * (1 + capexFactor / 100);
        
        // Stack replacement costs
        const stackReplacements = Math.floor((lifetime * annualHours) / specs.lifetime);
        const stackReplacementCost = adjustedCapex * 0.4 * stackReplacements; // 40% of CAPEX for stack
        
        // Calculate OPEX
        const baseOpex = adjustedCapex * specs.opex;
        const electricityCost = annualEnergyConsumption * electricityPrice / 1000; // $/year
        
        // Water costs
        const annualWaterConsumption = annualH2Production * specs.waterConsumption / 1000; // m3/year
        const waterTreatmentCost = annualWaterConsumption * this.constants.waterTreatment[waterTreatment];
        
        const totalAnnualOpex = (baseOpex + electricityCost + waterTreatmentCost) * (1 + opexFactor / 100);
        
        // Calculate LCOH (Levelized Cost of Hydrogen)
        const lcoh = this.calculateLCOH(
            adjustedCapex + stackReplacementCost,
            totalAnnualOpex,
            annualH2Production,
            discountRate,
            lifetime
        );
        
        // Calculate carbon intensity
        const carbonIntensity = this.calculateCarbonIntensity(renewableSource, capacity, annualH2Production);
        
        // Water metrics
        const waterEfficiency = annualWaterConsumption / annualH2Production * 1000; // L/kg H2
        
        // Energy metrics
        const systemEfficiency = (33.33 / specificEnergy) * 100; // HHV of H2 = 33.33 kWh/kg
        
        // Economic metrics
        const npv = this.calculateNPV(adjustedCapex, totalAnnualOpex, annualH2Production, 5, discountRate, lifetime);
        const irr = this.calculateIRR(adjustedCapex, totalAnnualOpex, annualH2Production, 5, lifetime);
        const paybackPeriod = this.calculatePayback(adjustedCapex, totalAnnualOpex, annualH2Production, 5);
        
        return {
            // Production metrics
            annualProduction: annualH2Production / 1000, // tonnes/year
            dailyProduction: dailyH2Production, // kg/day
            capacityFactor: loadFactor,
            
            // Cost metrics
            lcoh: lcoh, // $/kg
            totalCapex: adjustedCapex / 1e6, // M$
            annualOpex: totalAnnualOpex / 1e6, // M$/year
            
            // Cost breakdown
            lcohBreakdown: {
                capex: lcoh * (adjustedCapex / (adjustedCapex + this.presentValue(totalAnnualOpex, discountRate, lifetime))),
                electricity: lcoh * (electricityCost / totalAnnualOpex) * (this.presentValue(totalAnnualOpex, discountRate, lifetime) / (adjustedCapex + this.presentValue(totalAnnualOpex, discountRate, lifetime))),
                om: lcoh * (baseOpex / totalAnnualOpex) * (this.presentValue(totalAnnualOpex, discountRate, lifetime) / (adjustedCapex + this.presentValue(totalAnnualOpex, discountRate, lifetime))),
                water: lcoh * (waterTreatmentCost / totalAnnualOpex) * (this.presentValue(totalAnnualOpex, discountRate, lifetime) / (adjustedCapex + this.presentValue(totalAnnualOpex, discountRate, lifetime)))
            },
            
            // Technical metrics
            specificEnergy: specificEnergy, // kWh/kg
            systemEfficiency: systemEfficiency, // %
            waterConsumption: waterEfficiency, // L/kg
            annualWaterUse: annualWaterConsumption, // m3/year
            annualEnergyUse: annualEnergyConsumption / 1000, // MWh/year
            
            // Environmental metrics
            carbonIntensity: carbonIntensity, // kg CO2/kg H2
            annualCO2Emissions: annualH2Production * carbonIntensity / 1000, // tonnes CO2/year
            co2Avoided: annualH2Production * (10 - carbonIntensity) / 1000, // tonnes CO2/year vs grey H2
            
            // Economic metrics
            npv: npv / 1e6, // M$
            irr: irr, // %
            paybackPeriod: paybackPeriod, // years
            
            // Additional info
            electrolyzerType: electrolyzerType,
            renewableSource: renewableSource,
            waterSource: waterType,
            region: AppState.selectedRegion || 'Kazakhstan'
        };
    },
    
    // Calculate LCOH using discounted cash flow
    calculateLCOH(capex, annualOpex, annualProduction, discountRate, lifetime) {
        const r = discountRate / 100;
        const crf = (r * Math.pow(1 + r, lifetime)) / (Math.pow(1 + r, lifetime) - 1);
        const annualizedCapex = capex * crf;
        const totalAnnualCost = annualizedCapex + annualOpex;
        return totalAnnualCost / annualProduction;
    },
    
    // Calculate carbon intensity based on renewable source
    calculateCarbonIntensity(source, capacity, production) {
        const gridFactors = {
            solar: 0.045, // kg CO2/kWh for solar PV lifecycle
            wind: 0.011, // kg CO2/kWh for wind lifecycle
            hybrid: 0.028 // Average of solar and wind
        };
        
        const factor = gridFactors[source] || 0.03;
        const energyPerKg = this.constants.electrolyzer.PEM.specificEnergy; // Simplified
        return factor * energyPerKg;
    },
    
    // Calculate NPV
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
    
    // Calculate IRR (simplified)
    calculateIRR(capex, annualOpex, annualProduction, h2Price, lifetime) {
        const annualRevenue = annualProduction * h2Price;
        const annualCashFlow = annualRevenue - annualOpex;
        
        // Simplified IRR calculation
        let irr = 0;
        let npv = 0;
        
        // Newton-Raphson method (simplified)
        for (let i = 0; i < 100; i++) {
            npv = -capex;
            let dnpv = 0;
            
            for (let year = 1; year <= lifetime; year++) {
                npv += annualCashFlow / Math.pow(1 + irr, year);
                dnpv -= year * annualCashFlow / Math.pow(1 + irr, year + 1);
            }
            
            if (Math.abs(npv) < 0.01) break;
            irr = irr - npv / dnpv;
        }
        
        return irr * 100;
    },
    
    // Calculate payback period
    calculatePayback(capex, annualOpex, annualProduction, h2Price) {
        const annualRevenue = annualProduction * h2Price;
        const annualCashFlow = annualRevenue - annualOpex;
        
        if (annualCashFlow <= 0) return Infinity;
        return capex / annualCashFlow;
    },
    
    // Helper function to calculate present value
    presentValue(annualAmount, discountRate, years) {
        const r = discountRate / 100;
        return annualAmount * ((1 - Math.pow(1 + r, -years)) / r);
    }
};