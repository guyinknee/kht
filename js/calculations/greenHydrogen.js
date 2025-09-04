/**
 * Green Hydrogen Calculator – with Procurement Mode + $7/kg Revenue
 * - Avoids LCOE/CAPEX double counting via 'buy' vs 'own' branch
 * - Reads owned-RES CAPEX + fixed O&M if present in DOM (safe defaults if not)
 * - Uses user-editable H2 price (default $7/kg) for NPV/payback
 */

const GreenHydrogenCalculator = {

  // Technology constants (2024–2025 indicative values)
  constants: {
    // Electrolyzer specs: SEC in kWh/kg, capex in $/kW
    electrolyzer: {
      PEM:      { SEC: 52, capex: 1000, fixedOM: 0.025, varOM_perkg: 0.15, lifetimeY: 20, stackEveryY: 7, stackFracCapex: 0.10 },
      Alkaline: { SEC: 54, capex: 800,  fixedOM: 0.025, varOM_perkg: 0.15, lifetimeY: 20, stackEveryY: 7, stackFracCapex: 0.10 },
      SOEC:     { SEC: 42, capex: 2000, fixedOM: 0.030, varOM_perkg: 0.20, lifetimeY: 20, stackEveryY: 5, stackFracCapex: 0.15 }
    },

    // Water treatment: energy (kWh/m³) and cost ($/m³)
    water: {
      freshwater:  { energy_kWh_per_m3: 0.40, cost_per_m3: 0.50 },
      groundwater: { energy_kWh_per_m3: 0.25, cost_per_m3: 0.50 },
      brackish:    { energy_kWh_per_m3: 1.50, cost_per_m3: 1.00 },
      treated:     { energy_kWh_per_m3: 0.60, cost_per_m3: 0.70 }
    },

    // RES: LCOE ($/kWh) and emission factor (kgCO2/kWh)
    res: {
      solar: { lcoe: 0.045, ef: 0.048 },
      wind:  { lcoe: 0.040, ef: 0.011 },
      hydro: { lcoe: 0.050, ef: 0.024 }
    },

    // System water consumption (L/kg H2)
    water_L_per_kg: 10,

    // Land use assumptions (rough)
    powerDensity: { solar_MW_per_km2: 35, wind_MW_per_km2: 5 },
    usableLandFraction: 0.10
  },

  // ----------------------------
  // Main calculation pipeline
  // ----------------------------
  async calculate() {
    const inputs = this.gatherInputs();
    const regional = this.getRegionalData(inputs.regionLabel);

    const resCalc = this.calculateRESCapacity(inputs, regional);
    if (resCalc.noResource) return this.createNoResourceResult(inputs, resCalc.message);

    const h2Limits = this.calculateH2Limits(inputs, resCalc, regional);
    const electrolyzerMW = this.sizeElectrolyzer(h2Limits.actualH2_kg, inputs.elz.SEC, resCalc.capacityFactor);

    const economics = this.calculateEconomics(inputs, h2Limits, electrolyzerMW, resCalc);
    const carbonIntensity = this.calculateCarbonIntensity(inputs, h2Limits);

    return this.compileResults(inputs, resCalc, h2Limits, electrolyzerMW, economics, carbonIntensity);
  },

  // ----------------------------
  // Inputs
  // ----------------------------
  gatherInputs() {
    // Allow user to override LCOEs (buy mode)
    ['solar', 'wind', 'hydro'].forEach(key => {
      const el = document.getElementById(`${key}-lcoe`);
      if (el && !isNaN(el.value)) this.constants.res[key].lcoe = parseFloat(el.value);
    });

    // Core selectors
    const electrolyzerType = document.getElementById('electrolyzer-type')?.value || 'PEM';
    const sizingMode = document.getElementById('sizing-mode')?.value || 'max';
    const customCapMW = parseFloat(document.getElementById('installed-capacity-mw')?.value) || 100;
    const resType = document.getElementById('renewable-source')?.value || 'solar';
    const waterType = document.getElementById('water-source-type')?.value || 'freshwater';

    // Economics
    const discountRate = parseFloat(document.getElementById('discount-rate')?.value) || 8;
    const projectLifetime = parseFloat(document.getElementById('project-lifetime')?.value) || 20;
    // New: H2 selling price (defaults to 7 if field absent)
    const h2Price = parseFloat(document.getElementById('h2-price')?.value) || 7.0;

    // Procurement mode + owned-RES inputs (safe defaults if sidebar fields absent)
    const procurementMode = document.getElementById('electricity-procurement')?.value || 'buy'; // 'buy' | 'own'
    const ownedSolarCapex  = parseFloat(document.getElementById('owned-solar-capex-permw')?.value || '900000');
    const ownedWindCapex   = parseFloat(document.getElementById('owned-wind-capex-permw')?.value  || '1300000');
    const ownedHydroCapex  = parseFloat(document.getElementById('owned-hydro-capex-permw')?.value || '2500000');
    const ownedResFixedOMp = (parseFloat(document.getElementById('owned-res-fixedom-pct')?.value || '2.0')) / 100;

    // Region label
    const regionLabel = AppState?.selectedRegion?.properties?.region_name_en
      || AppState?.selectedRegion?.properties?.name_en
      || AppState?.selectedRegion?.properties?.name
      || AppState?.selectedRegion?.name
      || document.getElementById('region-select')?.value
      || 'Unknown Region';

    return {
      // config
      electrolyzerType,
      sizingMode,
      customCapMW,
      resType,
      waterType,
      regionLabel,

      // economics
      discountRate: discountRate / 100,
      projectLifetime,
      h2Price,

      // procurement
      procurementMode,
      owned: {
        solarCapexPerMW: ownedSolarCapex,
        windCapexPerMW: ownedWindCapex,
        hydroCapexPerMW: ownedHydroCapex,
        fixedOMpct: ownedResFixedOMp
      },

      // constant bundles for convenience
      elz: this.constants.electrolyzer[electrolyzerType],
      res: this.constants.res[resType],
      wat: this.constants.water[waterType]
    };
  },

  // ----------------------------
  // Regional data
  // ----------------------------
  getRegionalData(regionLabel) {
    const R = (typeof DataLoader?.getRegionalData === 'function')
      ? DataLoader.getRegionalData(regionLabel)
      : null;

    if (!R) {
      console.warn('No regional data for:', regionLabel);
      return {
        pvout_kwh_kwp_yr: 1500,
        wind_cf: 0.25,
        hydro_mw: 0,
        hydro_cf: 0.45,
        land_km2: 1000,
        waterAvail_Mm3: {}
      };
    }

    const parseNum = v => {
      const n = Number(v);
      return isFinite(n) ? n : undefined;
    };

    const pvout = parseNum(R.pvout_kwh_kwp_yr)
      || (parseNum(R.pvout_kwh_kwp_day) * 365)
      || 1500;

    const ws = parseNum(R.ws_m_s_10pct);
    const windCF = parseNum(R.wind_cf_est) || (ws ? Math.max(0, Math.min(1, 0.087 * ws - 0.33)) : 0.25);

    const land_km2 = parseNum(R.available_land_km2) || 1000;

    const solarMaxMW = parseNum(R.solar_max_mw)
      || (land_km2 * this.constants.usableLandFraction * this.constants.powerDensity.solar_MW_per_km2);
    const windMaxMW  = parseNum(R.wind_max_mw)
      || (land_km2 * this.constants.usableLandFraction * this.constants.powerDensity.wind_MW_per_km2);

    const hydroMW = parseNum(R.hydro_potential_mw) || 0;
    const hydroCF = 0.45;

    const waterFields = {
      freshwater: parseNum(R.freshwater_mln_m3),
      brackish: parseNum(R.brackish_water_mln_m3),
      groundwater: parseNum(R.groundwater_mln_m3),
      treated: parseNum(R.wastewater_mln_m3)
    };

    return {
      pvout_kwh_kwp_yr: pvout,
      wind_cf: windCF,
      hydro_mw: hydroMW,
      hydro_cf: hydroCF,
      solarMaxMW,
      windMaxMW,
      land_km2,
      waterAvail_Mm3: waterFields,
      raw: R
    };
  },

  // ----------------------------
  // RES capacity & energy
  // ----------------------------
  calculateRESCapacity(inputs, regional) {
    let installedMW = 0, annualEnergy_kWh = 0, capacityFactor = 0;

    if (inputs.resType === 'hydro' && (!regional.hydro_mw || regional.hydro_mw <= 0)) {
      return { noResource: true, message: 'No hydro resource available in this region' };
    }

    const apply = (mw) => {
      if (inputs.resType === 'solar') {
        capacityFactor = regional.pvout_kwh_kwp_yr / 8760;
        annualEnergy_kWh = mw * 1000 * regional.pvout_kwh_kwp_yr;
      } else if (inputs.resType === 'wind') {
        capacityFactor = regional.wind_cf;
        annualEnergy_kWh = mw * 1000 * capacityFactor * 8760;
      } else {
        capacityFactor = regional.hydro_cf;
        annualEnergy_kWh = mw * 1000 * capacityFactor * 8760;
      }
    };

    if (inputs.sizingMode === 'max') {
      installedMW = (inputs.resType === 'solar') ? regional.solarMaxMW
                 : (inputs.resType === 'wind')  ? regional.windMaxMW
                 : regional.hydro_mw;
      apply(installedMW);
    } else {
      installedMW = inputs.customCapMW || 100;
      apply(installedMW);
    }

    if (!installedMW || installedMW <= 0) {
      installedMW = 100;
      capacityFactor = 0.25;
      annualEnergy_kWh = installedMW * 1000 * capacityFactor * 8760;
    }

    return { installedMW, annualEnergy_kWh, capacityFactor, noResource: false };
  },

  // ----------------------------
  // Power vs water limits
  // ----------------------------
  calculateH2Limits(inputs, resCalc, regional) {
    const SEC = inputs.elz.SEC;
    const water_m3_per_kg = this.constants.water_L_per_kg / 1000;

    const powerLimit_kg = resCalc.annualEnergy_kWh / SEC;

    const Mm3 = regional.waterAvail_Mm3[inputs.waterType] ?? regional.waterAvail_Mm3.freshwater;
    const waterAvail_m3 = isFinite(Mm3) ? Mm3 * 1e6 : Infinity;
    const waterLimit_kg = isFinite(waterAvail_m3) ? (waterAvail_m3 / water_m3_per_kg) : Infinity;

    const actualH2_kg = Math.min(powerLimit_kg, waterLimit_kg);
    const bottleneck = (actualH2_kg === powerLimit_kg) ? 'power' : 'water';

    const actualWater_m3 = actualH2_kg * water_m3_per_kg;
    const waterTreatEnergy_kWh = actualWater_m3 * inputs.wat.energy_kWh_per_m3;
    const electrolyzerEnergy_kWh = actualH2_kg * SEC;
    const totalEnergy_kWh = electrolyzerEnergy_kWh + waterTreatEnergy_kWh;

    return { powerLimit_kg, waterLimit_kg, actualH2_kg, bottleneck, actualWater_m3, waterTreatEnergy_kWh, electrolyzerEnergy_kWh, totalEnergy_kWh };
  },

  // ----------------------------
  // Electrolyzer sizing
  // ----------------------------
  sizeElectrolyzer(actualH2_kg, SEC, capacityFactor) {
    const hours = 8760 * capacityFactor;
    const kgph = actualH2_kg / Math.max(hours, 1e-6);
    return (kgph * SEC) / 1000; // MW
  },

  // ----------------------------
  // Economics (branching buy vs own)
  // ----------------------------
  calculateEconomics(inputs, h2Limits, electrolyzerMW, resCalc) {
    // Electrolyzer CAPEX with scale
    const scale = this.getCapexScaleFactor(electrolyzerMW, 100);
    const capexPerKW = inputs.elz.capex * scale;
    const electrolyzerCapex = electrolyzerMW * 1000 * capexPerKW;

    // Effective RES capacity if user chose "max"
    let effectiveRES_MW = resCalc.installedMW;
    if (inputs.sizingMode === 'max') {
      const needed = h2Limits.totalEnergy_kWh;
      if (inputs.resType === 'solar') {
        const pvout_kWh_per_kWyr = resCalc.annualEnergy_kWh / (resCalc.installedMW * 1000);
        effectiveRES_MW = needed / (pvout_kWh_per_kWyr * 1000);
      } else {
        const hours = resCalc.capacityFactor * 8760;
        effectiveRES_MW = needed / (hours * 1000);
      }
      effectiveRES_MW = Math.min(effectiveRES_MW, resCalc.installedMW);
    }

    // Branch: buy (grid/PPA) vs own new RES (project-owned)
    let resCapex = 0, electricityCost = 0, resFixedOM = 0;

    if (inputs.procurementMode === 'own') {
      // Project owns the RES → CAPEX + fixed O&M, no LCOE energy purchase
      const perMW = (inputs.resType === 'solar') ? inputs.owned.solarCapexPerMW
                  : (inputs.resType === 'wind')  ? inputs.owned.windCapexPerMW
                  : inputs.owned.hydroCapexPerMW;

      resCapex   = effectiveRES_MW * perMW;
      resFixedOM = resCapex * (inputs.owned.fixedOMpct || 0);
      electricityCost = 0;
    } else {
      // Buy electricity → pay price per kWh; no RES CAPEX
      resCapex = 0;
      resFixedOM = 0;
      electricityCost = h2Limits.totalEnergy_kWh * inputs.res.lcoe;
    }

    // Total CAPEX & annualization
    const totalCapex = electrolyzerCapex + resCapex;
    const r = inputs.discountRate, n = inputs.projectLifetime;
    const CRF = (r === 0) ? (1/n) : (r * Math.pow(1+r, n)) / (Math.pow(1+r, n) - 1);
    const annualizedCapex = totalCapex * CRF;

    // Stack replacements
    const numRepl = Math.floor(n / inputs.elz.stackEveryY);
    const stackTotal = electrolyzerCapex * inputs.elz.stackFracCapex * numRepl;
    const annualizedStacks = stackTotal * CRF;

    // O&M
    const fixedOM_elz = totalCapex * inputs.elz.fixedOM; // simple: against total installed $ (electrolyzer + owned RES)
    const fixedOM_total = fixedOM_elz + resFixedOM;
    const variableOM = h2Limits.actualH2_kg * inputs.elz.varOM_perkg;
    const waterCost = h2Limits.actualWater_m3 * inputs.wat.cost_per_m3;

    // Totals
    const totalAnnualCost = annualizedCapex + annualizedStacks + fixedOM_total + variableOM + electricityCost + waterCost;
    const lcoh = h2Limits.actualH2_kg > 0 ? totalAnnualCost / h2Limits.actualH2_kg : NaN;

    const lcohBreakdown = {
      capex: (annualizedCapex + annualizedStacks) / Math.max(h2Limits.actualH2_kg, 1),
      fixedOM: fixedOM_total / Math.max(h2Limits.actualH2_kg, 1),
      variableOM: variableOM / Math.max(h2Limits.actualH2_kg, 1),
      electricity: electricityCost / Math.max(h2Limits.actualH2_kg, 1),
      water: waterCost / Math.max(h2Limits.actualH2_kg, 1)
    };

    return {
      totalCapex,
      electrolyzerCapex,
      resCapex,
      annualizedCapex,
      annualizedStacks,
      fixedOM: fixedOM_total,
      variableOM,
      electricityCost,
      waterCost,
      totalAnnualCost,
      lcoh,
      lcohBreakdown,
      effectiveRES_MW
    };
  },

  // ----------------------------
  // Carbon intensity
  // ----------------------------
  calculateCarbonIntensity(inputs, h2Limits) {
    const EF = inputs.res.ef; // kgCO2/kWh
    const CI_elz = EF * inputs.elz.SEC;
    const CI_water = EF * (h2Limits.waterTreatEnergy_kWh / Math.max(h2Limits.actualH2_kg, 1));
    return { total: CI_elz + CI_water, electrolyzer: CI_elz, water: CI_water };
  },

  // ----------------------------
  // Results
  // ----------------------------
  compileResults(inputs, resCalc, h2Limits, electrolyzerMW, economics, carbonIntensity) {
    const annualH2_t  = h2Limits.actualH2_kg / 1000;
    const annualH2_kt = annualH2_t / 1000;

    if (!h2Limits.actualH2_kg || h2Limits.actualH2_kg <= 0) {
      return {
        lcoh: NaN,
        carbonIntensity: 0,
        annualProduction: 0,
        annualProduction_kt: 0,
        bottleneck: h2Limits.bottleneck,
        limits: { powerLimit_kt: h2Limits.powerLimit_kg / 1e6, waterLimit_kt: h2Limits.waterLimit_kg / 1e6 },
        installedCapacityMW: resCalc.installedMW,
        effectiveCapacityMW: 0,
        electrolyzerMW: 0,
        electrolyzerType: inputs.electrolyzerType,
        renewableSource: inputs.resType,
        waterSource: inputs.waterType,
        sizingMode: inputs.sizingMode,
        region: inputs.regionLabel,
        note: 'No H₂ production possible with current constraints'
      };
    }

    // Revenue / cashflows using user price (default 7 $/kg)
    const annualRevenue = h2Limits.actualH2_kg * (inputs.h2Price || 7.0);
    const annualOpex = economics.fixedOM + economics.variableOM + economics.electricityCost + economics.waterCost;
    const annualCashflow = annualRevenue - annualOpex;
    const npv = this.calculateNPV(economics.totalCapex, annualCashflow, inputs.discountRate, inputs.projectLifetime);
    const paybackPeriod = economics.totalCapex / Math.max(annualCashflow, 1);

    return {
      // Core metrics
      lcoh: economics.lcoh,
      lcohBreakdown: economics.lcohBreakdown,
      carbonIntensity: carbonIntensity.total,
      carbonIntensityBreakdown: carbonIntensity,

      // Production
      annualProduction: annualH2_t,
      annualProduction_kt: annualH2_kt,

      // Bottleneck analysis
      bottleneck: h2Limits.bottleneck,
      limits: { powerLimit_kt: h2Limits.powerLimit_kg / 1e6, waterLimit_kt: h2Limits.waterLimit_kg / 1e6 },

      // Capacities
      installedCapacityMW: resCalc.installedMW,
      effectiveCapacityMW: economics.effectiveRES_MW,
      electrolyzerMW: electrolyzerMW,
      capacityFactor: resCalc.capacityFactor,

      // Resources
      annualEnergyUse: h2Limits.totalEnergy_kWh / 1000, // MWh/yr
      annualWaterUse: h2Limits.actualWater_m3,          // m³/yr
      specificEnergy: inputs.elz.SEC,                   // kWh/kg
      waterConsumption: this.constants.water_L_per_kg,  // L/kg

      // Economics
      totalCapex: economics.totalCapex / 1e6,           // M$
      annualOpex: annualOpex / 1e6,                     // M$/yr
      npv: npv / 1e6,                                   // M$
      paybackPeriod,

      // Config & provenance
      electrolyzerType: inputs.electrolyzerType,
      renewableSource: inputs.resType,
      waterSource: inputs.waterType,
      procurementMode: inputs.procurementMode,
      electricityPriceUsed: (inputs.procurementMode === 'buy') ? inputs.res.lcoe : 0,
      efElectricityUsed: inputs.res.ef,
      h2PriceUsed: inputs.h2Price,
      sizingMode: inputs.sizingMode,
      region: inputs.regionLabel
    };
  },

  // ----------------------------
  // Utilities
  // ----------------------------
  getCapexScaleFactor(sizeMW, baseMW) {
    if (!sizeMW || sizeMW <= 0) return 1.0;
    const factor = Math.pow(sizeMW / baseMW, -0.1); // ~10% reduction per doubling
    return Math.max(0.6, Math.min(1.1, factor));
  },

  calculateNPV(initialCost, annualCashflow, r, years) {
    let npv = -initialCost;
    for (let y = 1; y <= years; y++) npv += annualCashflow / Math.pow(1 + r, y);
    return npv;
  },

  createNoResourceResult(inputs, message) {
    return {
      lcoh: NaN,
      carbonIntensity: NaN,
      annualProduction: 0,
      annualProduction_kt: 0,
      bottleneck: 'no resource',
      limits: { powerLimit_kt: 0, waterLimit_kt: 0 },
      installedCapacityMW: 0,
      effectiveCapacityMW: 0,
      electrolyzerMW: 0,
      electrolyzerType: inputs.electrolyzerType,
      renewableSource: inputs.resType,
      waterSource: inputs.waterType,
      sizingMode: inputs.sizingMode,
      region: inputs.regionLabel,
      note: message
    };
  }
};

window.GreenHydrogenCalculator = GreenHydrogenCalculator;
