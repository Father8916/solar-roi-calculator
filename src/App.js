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
    systemCost: '',
    downPayment: '',
    location: 'average',
    roofType: 'south',
    timeFrame: '20',
    utilityRateIncrease: '3.0'
  });
  const [results, setResults] = useState(null);
  const [showResults, setShowResults] = useState(false);

  const solarIrradiance = {
    'high': 5.5,
    'average': 4.2,
    'low': 3.5,
  };

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

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateStep1 = () => {
    return formData.name.trim().length >= 2 && 
           validateEmail(formData.email) && 
           formData.phone.trim().length >= 10 && 
           formData.address.trim().length >= 5 && 
           formData.zipCode.length === 5;
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
            systemCost: formData.systemCost,
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
    const electricityRate = parseFloat(formData.electricityRate);
    const timeFrame = parseFloat(formData.timeFrame);
    const utilityRateIncrease = parseFloat(formData.utilityRateIncrease) / 100;

    const systemSize = (monthlyBill * 12) / (electricityRate * 1000 * 4.5);
    const peakSunHours = solarIrradiance[formData.location];
    const roofEfficiency = roofMultipliers[formData.roofType];
    const systemEfficiency = 0.85;

    const annualProduction = systemSize * peakSunHours * 365 * roofEfficiency * systemEfficiency;
    const firstYearSavings = annualProduction * electricityRate;
    const federalTaxCredit = systemCost * 0.30;
    const netSystemCost = systemCost - federalTaxCredit;

    let totalLifetimeSavings = 0;
    for (let year = 1; year <= timeFrame; year++) {
      const systemDegradation = Math.pow(0.995, year - 1);
      const adjustedProduction = annualProduction * systemDegradation;
      const currentAnnualSavings = adjustedProduction * electricityRate * Math.pow(1 + utilityRateIncrease, year - 1);
      totalLifetimeSavings += currentAnnualSavings;
    }

    totalLifetimeSavings -= netSystemCost;
    const roi = (totalLifetimeSavings / netSystemCost) * 100;
    const paybackPeriod = netSystemCost / firstYearSavings;

    const calculationResults = {
      systemSize: Math.round(systemSize * 10) / 10,
      annualProduction: Math.round(annualProduction),
      systemCost: Math.round(systemCost),
      netSystemCost: Math.round(netSystemCost),
      firstYearSavings: Math.round(firstYearSavings),
      totalLifetimeSavings: Math.round(totalLifetimeSavings),
      roi: Math.round(roi * 10) / 10,
      federalTaxCredit: Math.round(federalTaxCredit),
      paybackPeriod: Math.round(paybackPeriod * 10) / 10,
      isProfitable: totalLifetimeSavings > 0,
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
                      onChange={(e) => handleInputChange('zipCode', e.target.value.replace(/\D/g, '').slice(0, 5))}
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
                      Breaks even in {results.paybackPeriod} years
                    </p>
                  )}
                </div>

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
