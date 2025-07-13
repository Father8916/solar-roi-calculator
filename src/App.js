import React, { useState } from 'react';
import { Calculator, Sun, TrendingUp, User, DollarSign, Zap, AlertTriangle, CheckCircle, PiggyBank } from 'lucide-react';

const SolarROICalculator = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    zipCode: '',
    monthlyBill: '',
    electricityRate: '0.12',
    annualUsage: '',
    systemSize: '',
    systemCost: '',
    downPayment: '',
    financingRate: '6.5',
    location: 'average',
    roofType: 'south',
    timeFrame: '20',
    utilityRateIncrease: '3.0'
  });
  const [results, setResults] = useState(null);
  const [showResults, setShowResults] = useState(false);

  // Solar irradiance data (kWh/m²/day)
  const solarIrradiance = {
    'high': 5.5, // Southwest US
    'average': 4.2, // Most of US  
    'low': 3.5, // Northeast, Northwest
  };

  // Roof orientation multipliers
  const roofMultipliers = {
    'south': 1.0,
    'southeast': 0.95,
    'southwest': 0.95,
    'east': 0.85,
    'west': 0.85,
    'north': 0.6,
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateStep1 = () => {
    return formData.name.trim() && formData.email.trim() && formData.phone.trim() && 
           formData.address.trim() && formData.zipCode.trim();
  };

  const validateStep2 = () => {
    return formData.monthlyBill && formData.systemCost;
  };

  const sendWebhook = async (leadData) => {
    try {
      const webhookUrl = 'https://your-webhook-url.com/solar-roi-leads';
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          leadSource: 'Solar ROI Calculator',
          contactInfo: {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
            zipCode: formData.zipCode,
          },
          energyData: {
            monthlyBill: formData.monthlyBill,
            electricityRate: formData.electricityRate,
            systemSize: formData.systemSize,
            systemCost: formData.systemCost,
            financingRate: formData.financingRate,
            timeFrame: formData.timeFrame,
          },
          calculations: leadData,
          utmSource: window.location.search,
        }),
      });

      if (!response.ok) {
        console.error('Webhook failed:', response.status);
      }
    } catch (error) {
      console.error('Webhook error:', error);
    }
  };

  const calculateSolarROI = async () => {
    const monthlyBill = parseFloat(formData.monthlyBill);
    const systemCost = parseFloat(formData.systemCost);
    const downPayment = parseFloat(formData.downPayment) || systemCost;
    const loanAmount = systemCost - downPayment;
    const electricityRate = parseFloat(formData.electricityRate);
    const timeFrame = parseFloat(formData.timeFrame);
    const utilityRateIncrease = parseFloat(formData.utilityRateIncrease) / 100;
    const financingRate = parseFloat(formData.financingRate) / 100 / 12;

    // System specifications
    const systemSize = parseFloat(formData.systemSize) || (monthlyBill * 12) / (electricityRate * 1000 * 4.5); // Estimate if not provided
    const peakSunHours = solarIrradiance[formData.location];
    const roofEfficiency = roofMultipliers[formData.roofType];
    const systemEfficiency = 0.85; // Account for inverter losses, shading, etc.

    // Annual solar production
    const annualProduction = systemSize * peakSunHours * 365 * roofEfficiency * systemEfficiency;
    const firstYearSavings = annualProduction * electricityRate;

    // Federal and state incentives
    const federalTaxCredit = systemCost * 0.30; // 30% federal tax credit
    const netSystemCost = systemCost - federalTaxCredit;
    const actualOutOfPocket = downPayment - (downPayment * 0.30); // Tax credit on down payment

    // Financing calculations
    let monthlyLoanPayment = 0;
    let totalInterestPaid = 0;
    if (loanAmount > 0) {
      const loanTermMonths = 20 * 12; // 20-year loan
      monthlyLoanPayment = loanAmount * (financingRate * Math.pow(1 + financingRate, loanTermMonths)) / (Math.pow(1 + financingRate, loanTermMonths) - 1);
      totalInterestPaid = (monthlyLoanPayment * loanTermMonths) - loanAmount;
    }

    // Calculate savings over time with utility rate increases
    let cumulativeSavings = 0;
    let cumulativeCosts = actualOutOfPocket + totalInterestPaid;
    let breakEvenYear = 0;
    let totalLifetimeSavings = 0;
    let currentAnnualSavings = firstYearSavings;

    for (let year = 1; year <= timeFrame; year++) {
      // Account for slight degradation of solar panels (0.5% per year)
      const systemDegradation = Math.pow(0.995, year - 1);
      const adjustedProduction = annualProduction * systemDegradation;
      
      // Current year savings with utility rate increases
      currentAnnualSavings = adjustedProduction * electricityRate * Math.pow(1 + utilityRateIncrease, year - 1);
      cumulativeSavings += currentAnnualSavings;
      
      // Add loan payments to costs (only for loan term)
      if (year <= 20 && loanAmount > 0) {
        cumulativeCosts += monthlyLoanPayment * 12;
      }

      // Find break-even point
      if (cumulativeSavings >= cumulativeCosts && breakEvenYear === 0) {
        breakEvenYear = year;
      }
    }

    totalLifetimeSavings = cumulativeSavings - cumulativeCosts;

    // Calculate ROI
    const totalInvestment = actualOutOfPocket + totalInterestPaid;
    const roi = (totalLifetimeSavings / totalInvestment) * 100;
    const annualizedROI = roi / timeFrame;

    // Without solar projection (what they'll pay for electricity)
    let totalElectricityBillWithoutSolar = 0;
    for (let year = 1; year <= timeFrame; year++) {
      const yearlyBill = monthlyBill * 12 * Math.pow(1 + utilityRateIncrease, year - 1);
      totalElectricityBillWithoutSolar += yearlyBill;
    }

    // Carbon offset calculation
    const carbonOffsetPerYear = annualProduction * 0.0004; // metric tons CO2 per kWh
    const totalCarbonOffset = carbonOffsetPerYear * timeFrame;

    const calculationResults = {
      // System details
      systemSize: Math.round(systemSize * 10) / 10,
      annualProduction: Math.round(annualProduction),
      systemCost: Math.round(systemCost),
      netSystemCost: Math.round(netSystemCost),
      actualOutOfPocket: Math.round(actualOutOfPocket),
      
      // Savings and ROI
      firstYearSavings: Math.round(firstYearSavings),
      totalLifetimeSavings: Math.round(totalLifetimeSavings),
      totalElectricityBillWithoutSolar: Math.round(totalElectricityBillWithoutSolar),
      cumulativeSavings: Math.round(cumulativeSavings),
      
      // Financial metrics
      roi: Math.round(roi * 10) / 10,
      annualizedROI: Math.round(annualizedROI * 10) / 10,
      breakEvenYear,
      federalTaxCredit: Math.round(federalTaxCredit),
      
      // Financing
      monthlyLoanPayment: Math.round(monthlyLoanPayment),
      totalInterestPaid: Math.round(totalInterestPaid),
      
      // Environmental
      carbonOffsetPerYear: Math.round(carbonOffsetPerYear * 10) / 10,
      totalCarbonOffset: Math.round(totalCarbonOffset * 10) / 10,
      
      // Analysis
      isProfitable: totalLifetimeSavings > 0,
      paybackPeriod: breakEvenYear,
      effectiveAnnualSavings: Math.round(totalLifetimeSavings / timeFrame),
      
      // Utility bill impact
      currentMonthlyBill: Math.round(monthlyBill),
      newMonthlyBill: Math.round(Math.max(0, monthlyBill - (firstYearSavings / 12))),
      monthlySavings: Math.round(Math.min(monthlyBill, firstYearSavings / 12)),
    };

    setResults(calculationResults);
    setShowResults(true);
    await sendWebhook(calculationResults);
  };

  const handleNextStep = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      calculateSolarROI();
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sun className="text-orange-500 w-8 h-8" />
            <h1 className="text-3xl font-bold text-gray-800">Solar ROI Calculator</h1>
          </div>
          <p className="text-gray-600 text-lg">
            Discover if solar will actually pay for itself and how much you'll save
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            {step === 1 ? (
              <>
                <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                  <User className="text-orange-500" />
                  Your Information
                </h2>
                <p className="text-gray-600 mb-6">
                  Get your personalized solar ROI analysis in 2 simple steps
                </p>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="your@email.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="(555) 123-4567"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Home Address *
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="123 Main Street, City, State"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ZIP Code *
                    </label>
                    <input
                      type="text"
                      value={formData.zipCode}
                      onChange={(e) => handleInputChange('zipCode', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="12345"
                      maxLength="5"
                    />
                  </div>

                  <button
                    onClick={handleNextStep}
                    disabled={!validateStep1()}
                    className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-orange-600 hover:to-yellow-600 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    Continue to Energy Details
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold flex items-center gap-2">
                    <Calculator className="text-orange-500" />
                    Solar Investment Details
                  </h2>
                  <button
                    onClick={() => setStep(1)}
                    className="text-orange-500 hover:text-orange-700 text-sm font-medium"
                  >
                    ← Back
                  </button>
                </div>
                <p className="text-gray-600 mb-6">
                  Hi {formData.name}! Let's calculate your solar ROI and payback period.
                </p>

                <div className="space-y-6">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-800 mb-3">Current Energy Usage</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Monthly Electricity Bill ($) *
                        </label>
                        <input
                          type="number"
                          value={formData.monthlyBill}
                          onChange={(e) => handleInputChange('monthlyBill', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="e.g., 180"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Electricity Rate ($/kWh)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.electricityRate}
                          onChange={(e) => handleInputChange('electricityRate', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="0.12"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4">
                    <h3 className="font-semibold text-green-800 mb-3">Solar System Investment</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Total System Cost ($) *
                        </label>
                        <input
                          type="number"
                          value={formData.systemCost}
                          onChange={(e) => handleInputChange('systemCost', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="e.g., 25000"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Down Payment ($)
                        </label>
                        <input
                          type="number"
                          value={formData.downPayment}
                          onChange={(e) => handleInputChange('downPayment', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="Leave blank if paying cash"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          System Size (kW)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={formData.systemSize}
                          onChange={(e) => handleInputChange('systemSize', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="Leave blank to auto-calculate"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Solar Resource
                      </label>
                      <select
                        value={formData.location}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      >
                        <option value="high">High (Southwest US)</option>
                        <option value="average">Average (Most of US)</option>
                        <option value="low">Low (Northeast, Northwest)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Roof Orientation
                      </label>
                      <select
                        value={formData.roofType}
                        onChange={(e) => handleInputChange('roofType', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      >
                        <option value="south">South-facing</option>
                        <option value="southeast">Southeast</option>
                        <option value="southwest">Southwest</option>
                        <option value="east">East-facing</option>
                        <option value="west">West-facing</option>
                        <option value="north">North-facing</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Analysis Period
                      </label>
                      <select
                        value={formData.timeFrame}
                        onChange={(e) => handleInputChange('timeFrame', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      >
                        <option value="10">10 years</option>
                        <option value="15">15 years</option>
                        <option value="20">20 years</option>
                        <option value="25">25 years</option>
                        <option value="30">30 years</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Utility Rate Increase (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.utilityRateIncrease}
                        onChange={(e) => handleInputChange('utilityRateIncrease', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="3.0"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleNextStep}
                    disabled={!validateStep2()}
                    className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-orange-600 hover:to-yellow-600 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    Calculate My Solar ROI
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Results Section */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <TrendingUp className="text-green-500" />
              Your Solar ROI Analysis
            </h2>

            {!showResults ? (
              <div className="text-center text-gray-500 py-12">
                <Sun className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>Complete the form to see if solar will pay for itself</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* ROI Declaration */}
                <div className={`rounded-lg p-6 text-center ${results.isProfitable ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className="flex items-center justify-center mb-3">
                    {results.isProfitable ? (
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    ) : (
                      <AlertTriangle className="w-8 h-8 text-red-500" />
                    )}
                  </div>
                  <h3 className={`text-xl font-bold mb-2 ${results.isProfitable ? 'text-green-800' : 'text-red-800'}`}>
                    {results.isProfitable 
                      ? `Solar Will Pay for Itself!` 
                      : 'Solar May Not Be Profitable'
                    }
                  </h3>
                  <p className={`text-lg ${results.isProfitable ? 'text-green-700' : 'text-red-700'}`}>
                    {results.isProfitable 
                      ? `${results.roi}% ROI over ${formData.timeFrame} years`
                      : `Negative ${Math.abs(results.roi)}% ROI over ${formData.timeFrame} years`
                    }
                  </p>
                  {results.isProfitable && (
                    <p className="text-sm text-green-600 mt-2">
                      Breaks even in year {results.paybackPeriod}
                    </p>
                  )}
                </div>

                {/* Monthly Impact */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Monthly Bill Impact
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Current Monthly Bill</span>
                      <span className="font-semibold">{formatCurrency(results.currentMonthlyBill)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">New Monthly Bill</span>
                      <span className="font-semibold text-green-600">{formatCurrency(results.newMonthlyBill)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-gray-600">Monthly Savings</span>
                      <span className="font-bold text-green-600">{formatCurrency(results.monthlySavings)}</span>
                    </div>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Investment Summary
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">System Cost</span>
                      <span className="font-semibold">{formatCurrency(results.systemCost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Federal Tax Credit (30%)</span>
                      <span className="font-semibold text-green-600">-{formatCurrency(results.federalTaxCredit)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Net Investment</span>
                      <span className="font-semibold">{formatCurrency(results.netSystemCost)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-gray-600">{formData.timeFrame}-Year Savings</span>
                      <span className={`font-bold ${results.totalLifetimeSavings > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(results.totalLifetimeSavings)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* System Performance */}
                <div className="bg-yellow-50 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-800 mb-3">System Performance</h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>• System Size: {results.systemSize} kW</p>
                    <p>• Annual Production: {results.annualProduction.toLocaleString()} kWh</p>
                    <p>• First Year Savings: {formatCurrency(results.firstYearSavings)}</p>
                    <p>• Payback Period: {results.paybackPeriod} years</p>
                  </div>
                </div>

                {/* Environmental Impact */}
                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                    <PiggyBank className="w-4 h-4" />
                    Environmental Impact
                  </h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>• Annual CO₂ Offset: {results.carbonOffsetPerYear} metric tons</p>
                    <p>• {formData.timeFrame}-Year CO₂ Offset: {results.totalCarbonOffset} metric tons</p>
                    <p>• Equivalent to planting {Math.round(results.totalCarbonOffset * 16)} trees</p>
                  </div>
                </div>

                {/* Future Electricity Costs */}
                <div className="bg-orange-50 rounded-lg p-4">
                  <h3 className="font-semibold text-orange-800 mb-2">Without Solar</h3>
                  <p className="text-sm text-gray-600">
                    You'd pay <strong>{formatCurrency(results.totalElectricityBillWithoutSolar)}</strong> for electricity over {formData.timeFrame} years with rate increases.
                  </p>
                </div>

                {/* CTA */}
                <div className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-lg p-4 text-center">
                  <h3 className="font-semibold mb-2">
                    {results.isProfitable 
                      ? `Ready to Start Saving, ${formData.name}?`
                      : `Let's Explore Better Options, ${formData.name}!`
                    }
                  </h3>
                  <p className="text-sm mb-3">
                    {results.isProfitable 
                      ? `Your solar investment will save ${formatCurrency(results.totalLifetimeSavings)} over ${formData.timeFrame} years!`
                      : `Let's find ways to make solar work better for your situation.`
                    }
                  </p>
                  <p className="text-xs mb-4">I'll call you at {formData.phone} to discuss your solar options.</p>
                  <button className="bg-white text-orange-600 px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                    {results.isProfitable ? 'Get My Free Solar Quote' : 'Explore Solar Options'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-8 bg-gray-100 rounded-lg p-4 text-sm text-gray-600">
          <p className="mb-2">
            <strong>Disclaimer:</strong> This calculator provides estimates based on average conditions, typical equipment performance, 
            and standard assumptions. Actual results may vary based on specific equipment, installation factors, local weather patterns, 
            roof conditions, shading, and utility rate structures.
          </p>
          <p>
            Solar panel performance may degrade over time. Federal tax credit is subject to change. Consult with certified solar 
            professionals for accurate system design and financial projections specific to your property.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SolarROICalculator;
