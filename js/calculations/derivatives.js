/**
 * Derivatives Calculator Module
 * Implements calculations for hydrogen derivatives (ammonia, methanol, e-fuels)
 */

const DerivativesCalculator = {
    // Constants
    constants: {
        // Product specifications
        products: {
            ammonia: {
                h2Consumption: 0.178, // tonnes H2/tonne NH3
                energyConsumption: 8.5, // MWh/tonne NH3
                capex: 1000, // $/tonne annual capacity
                opex: 0.05, // fraction of CAPEX
                efficiency: 0.85,
                n2Required: 0.822, // tonnes N2/tonne NH3
                marketPrice: 500 // $/tonne
            },
            methanol: {
                h2Consumption: 0.189, // tonnes H2/tonne CH3OH
                energyConsumption: 10.2, // MWh/tonne CH3OH
                capex: 800, // $/tonne annual capacity
                opex: 0.06,
                efficiency: 0.83,
                co2Required: 1.375, // tonnes CO2/tonne CH3OH
                marketPrice: 400 // $/tonne
            },
            'e-fuels': {
                h2Consumption: 0.25, // tonnes H2/tonne fuel
                energyConsumption: 15, // MWh/tonne fuel
                capex: 1500, // $/tonne annual capacity
                opex: 0.07,
                efficiency: 0.60,
                co2Required: 3.67, // tonnes CO2/tonne fuel
                marketPrice: 1200 // $/tonne
            }
        },
        // Feedstock costs
        feedstock: {
            nitrogen: {
                air: 50, // $/tonne N2 from ASU
                pipeline: 30 // $/tonne N2 from pipeline
            },
            co2: {
                captured: 50, // $/tonne CO2
                dac: 600, // $/tonne CO2 from Direct Air Capture
                biogenic: 100 // $/tonne CO2 from biogenic sources
            }
        }
    },
    
    // Main calculation function
    async calculate(params) {
        console.log('Calculating derivatives production...', params);
        
        // Extract parameters
        const h2Source = document.getElementById('h2-source-type')?.value || 'green';
        const h2Price = parseFloat(document.getElementById('h2-input-price')?.value) || 3;
        const product = document.getElementById('derivative-product')?.value || 'ammonia';
        const capacity = parseFloat(document.getElementById('derivative-capacity')?.value) || 100;
        const processEfficiency = parseFloat(document.getElementById('process-efficiency')?.value) || 85;
        
        // Feedstock sources
        const nitrogenSource = document.getElementById('nitrogen-source')?.value || 'air';
        const co2Source = document.getElementById('co2-source')?.value || 'captured';
        
        // Economic parameters
        const discountRate = parseFloat(document.getElementById('discount-rate')?.value) || 10;
        const lifetime = parseFloat(document.getElementById('project-lifetime')?.value) || 25;
        const electricityPrice = parseFloat(document.getElementById('electricity-price')?.value) || 50;
        const capexFactor = parseFloat(document.getElementById('capex-factor')?.value) || 0;
        const opexFactor = parseFloat(document.getElementById('opex-factor')?.value) || 0;
        
        // Get product specifications
        const specs = this.constants.products[product];
        
        // Calculate annual production
        const annualProduction = capacity * 1000; // tonnes/year
        const actualEfficiency = processEfficiency / 100;
        
        // Calculate H2 requirement
        const h2Required = annualProduction * specs.h2Consumption / actualEfficiency; // tonnes H2/year
        
        // Calculate other feedstock requirements
        let feedstockCost = 0;
        let feedstockDetails = {};
        
        if (product === 'ammonia') {
            const n2Required = annualProduction * specs.n2Required;
            const n2Cost = this.constants.feedstock.nitrogen[nitrogenSource];
            feedstockCost = n2Required * n2Cost;
            feedstockDetails.n2Required = n2Required;
            feedstockDetails.n2Source = nitrogenSource;
        } else if (product === 'methanol' || product === 'e-fuels') {
            const co2Required = annualProduction * specs.co2Required;
            const co2Cost = this.constants.feedstock.co2[co2Source];
            feedstockCost = co2Required * co2Cost;
            feedstockDetails.co2Required = co2Required;
            feedstockDetails.co2Source = co2Source;
        }
        
        // Calculate energy consumption
        const energyConsumption = annualProduction * specs.energyConsumption; // MWh/year
        const energyCost = energyConsumption * electricityPrice;
        
        // Calculate CAPEX
        const baseCapex = annualProduction * specs.capex;
        const totalCapex = baseCapex * (1 + capexFactor / 100);
        
        // Calculate OPEX
        const baseOpex = totalCapex * specs.opex;
        const h2Cost = h2Required * h2Price * 1000; // $/year
        const totalAnnualOpex = (baseOpex + h2Cost + feedstockCost + energyCost) * (1 + opexFactor / 100);
        
        // Calculate product cost
        const productionCost = totalAnnualOpex / annualProduction; // $/tonne product
        const annualizedCapex = this.annualizeCapex(totalCapex, discountRate, lifetime);
        const totalProductCost = (annualizedCapex + totalAnnualOpex) / annualProduction;
        
        // Calculate revenue and economics
        const annualRevenue = annualProduction * specs.marketPrice;
        const grossMargin = (annualRevenue - totalAnnualOpex) / annualRevenue * 100;
        
        // Economic metrics
        const npv = this.calculateNPV(totalCapex, totalAnnualOpex, annualRevenue, discountRate, lifetime);
        const irr = this.calculateIRR(totalCapex, totalAnnualOpex, annualRevenue, lifetime);
        const paybackPeriod = totalCapex / (annualRevenue - totalAnnualOpex);
        
        // Carbon intensity calculation
        const carbonIntensity = this.calculateCarbonIntensity(h2Source, product, h2Required, annualProduction);
        
        return {
            // Production metrics
            annualProduction: annualProduction / 1000, // kt/year
            dailyProduction: annualProduction / 365, // tonnes/day
            h2Consumption: h2Required, // tonnes H2/year
            h2IntensityAntonnes: specs.h2Consumption, // tonnes H2/tonne product
            
            // Cost metrics
            productionCost: productionCost, // $/tonne
            totalProductCost: totalProductCost, // $/tonne including CAPEX
            totalCapex: totalCapex / 1e6, // M$
            annualOpex: totalAnnualOpex / 1e6, // M$/year
            
            // Cost breakdown
            costBreakdown: {
                h2Feedstock: h2Cost / totalAnnualOpex * 100, // %
                otherFeedstock: feedstockCost / totalAnnualOpex * 100, // %
                energy: energyCost / totalAnnualOpex * 100, // %
                other: baseOpex / totalAnnualOpex * 100 // %
            },
            
            // Technical metrics
            processEfficiency: processEfficiency, // %
            energyConsumption: energyConsumption / 1000, // GWh/year
            specificEnergy: specs.energyConsumption, // MWh/tonne product
            ...feedstockDetails,
            
            // Environmental metrics
            carbonIntensity: carbonIntensity, // kg CO2/tonne product
            annualCO2Emissions: carbonIntensity * annualProduction / 1000, // tonnes CO2/year
            co2Avoided: this.calculateCO2Avoided(product, annualProduction, carbonIntensity),
            
            // Economic metrics
            revenue: annualRevenue / 1e6, // M$/year
            grossMargin: grossMargin, // %
            npv: npv / 1e6, // M$
            irr: irr, // %
            paybackPeriod: paybackPeriod, // years
            
            // Market metrics
            marketPrice: specs.marketPrice, // $/tonne
            competitiveness: (specs.marketPrice - totalProductCost) / specs.marketPrice * 100, // %
            
            // Additional info
            product: product,
            h2Source: h2Source,
            plantLocation: AppState.selectedRegion || 'Kazakhstan'
        };
    },
    
    // Calculate carbon intensity of derivative product
    calculateCarbonIntensity(h2Source, product, h2Required, production) {
        // Base H2 carbon intensity
        const h2CI = h2Source === 'green' ? 0.5 : 2.0; // kg CO2/kg H2
        
        // Process emissions
        const processEmissions = {
            ammonia: 0.1, // tonnes CO2/tonne NH3
            methanol: -1.375, // Negative because CO2 is consumed
            'e-fuels': -3.67 // Negative because CO2 is consumed
        };
        
        const h2Emissions = h2Required * h2CI;
        const processCI = processEmissions[product] || 0;
        
        return (h2Emissions / production + processCI) * 1000; // kg CO2/tonne product
    },
    
    // Calculate CO2 avoided compared to conventional production
    calculateCO2Avoided(product, production, carbonIntensity) {
        const conventionalCI = {
            ammonia: 2000, // kg CO2/tonne NH3 (Haber-Bosch)
            methanol: 500, // kg CO2/tonne CH3OH (from natural gas)
            'e-fuels': 3000 // kg CO2/tonne fuel (petroleum)
        };
        
        const conventional = conventionalCI[product] || 1000;
        return (conventional - carbonIntensity) * production / 1000; // tonnes CO2/year
    },
    
    // Helper functions
    annualizeCapex(capex, discountRate, lifetime) {
        const r = discountRate / 100;
        const crf = (r * Math.pow(1 + r, lifetime)) / (Math.pow(1 + r, lifetime) - 1);
        return capex * crf;
    },
    
    calculateNPV(capex, annualOpex, annualRevenue, discountRate, lifetime) {
        const r = discountRate / 100;
        let npv = -capex;
        
        for (let year = 1; year <= lifetime; year++) {
            const cashFlow = annualRevenue - annualOpex;
            npv += cashFlow / Math.pow(1 + r, year);
        }
        
        return npv;
    },
    
    calculateIRR(capex, annualOpex, annualRevenue, lifetime) {
        const annualCashFlow = annualRevenue - annualOpex;
        
        if (annualCashFlow <= 0) return -100;
        
        // Simplified IRR calculation
        return ((annualCashFlow / capex) * 100);
    }
};