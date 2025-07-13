import React, { useState, useEffect } from 'react';
import { Calculator, Sun, TrendingUp, User, DollarSign, Zap, AlertTriangle, CheckCircle, PiggyBank, MapPin, Globe } from 'lucide-react';

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
  const [locationData, setLocationData] = useState({
    isUSA: null,
    detectedZip: null,
    detectedState: null,
    detectedCity: null
  });
  const [locationChecked, setLocationChecked] = useState(false);
  const [zipValidation, setZipValidation] = useState({
    isValidating: false,
    isValid: null
  });

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

    // Real-time ZIP validation
    if (field === 'zipCode' && value.length === 5) {
      validateRealUSZipCode(value);
    }
  };

  // Enhanced email validation for homeowners and businesses
  const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email) && email.length >= 5;
  };

  // Basic ZIP format validation
  const validateUSZipCode = (zipCode) => {
    const zipRegex = /^\d{5}$/;
    return zipRegex.test(zipCode);
  };

  // Detect user location and validate ZIP code
  const detectLocationAndValidateZip = async () => {
    try {
      // Get user's location
      const locationResponse = await fetch('https://ipapi.co/json/');
      const locationData = await locationResponse.json();
      
      setLocationData({
        isUSA: locationData.country_code === 'US',
        detectedZip: locationData.postal,
        detectedState: locationData.region,
        detectedCity: locationData.city
      });
      
      // Auto-fill ZIP if they're in US and haven't entered one
      if (locationData.country_code === 'US' && !formData.zipCode) {
        handleInputChange('zipCode', locationData.postal);
      }
      
      setLocationChecked(true);
    } catch (error) {
      console.log('Location detection failed, proceeding anyway');
      setLocationChecked(true);
    }
  };

  // Validate ZIP code against real US ZIP database
  const validateRealUSZipCode = async (zipCode) => {
    if (!zipCode || zipCode.length !== 5) {
      setZipValidation({ isValidating: false, isValid: false });
      return false;
    }
    
    setZipValidation({ isValidating: true, isValid: null });
    
    try {
      const response = await fetch(`https://api.zippopotam.us/us/${zipCode}`);
      const isValid = response.ok;
      setZipValidation({ isValidating: false, isValid });
      return isValid;
    } catch (error) {
      // If API fails, fall back to basic validation
      const isValid = /^\d{5}$/.test(zipCode);
      setZipValidation({ isValidating: false, isValid });
      return isValid;
    }
  };

  const validateStep1 = () => {
    return formData.name.trim().length >= 2 && 
           validateEmail(formData.email) && 
           formData.phone.trim().length >= 10 && 
           formData.address.trim().length >= 5 && 
           validateUSZipCode(formData.zipCode) &&
           zipValidation.isValid === true &&
           locationData.isUSA !== false; // Allow null (unknown) but block false
  };

  const validateStep2 = () => {
    return formData.monthlyBill && formData.systemCost;
  };

  const sendWebhook = async (leadData) => {
    try {
      const webhookUrl = 'https://hook.us2.make.com/bthvgm9bsb6cjypl2j4fa6ma07b20eta';
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          leadSource: 'Solar ROI Calculator',
          locationVerification: {
            isUSA: locationData.isUSA,
            detectedLocation: `${locationData.detectedCity}, ${locationData.detectedState}`,
            detectedZip: locationData.detectedZip,
            enteredZip: formData.zipCode,
            zipMatches: locationData.detectedZip === formData.zipCode,
            zipValidated: zipValidation.isValid
          },
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

  // Detect location when component loads
  useEffect(() => {
    detectLocationAndValidateZip();
  }, []);

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
                  {locationData.isUSA && (
                    <span className="text-green-600 text-sm ml-2 flex items-center gap-1">
                      <Globe className="w-4 h-4" />
                      US Verified
                    </span>
                  )}
                </h2>
                <p className="text-gray-600 mb-6">
                  Get your personalized solar ROI analysis in 2 simple steps
                </p>

                {locationData.isUSA === false && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-2 text-orange-800">
                      <AlertTriangle className="w-5 h-5" />
                      <p className="font-medium">Outside USA Detected</p>
                    </div>
                    <p className="text-orange-700 text-sm mt-1">
                      This solar calculator is currently only available for US residents. 
                      If you're in the US, please verify your ZIP code below.
                    </p>
                  </div>
                )}

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                        formData.name && formData.name.trim().length < 2 ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter your full name"
                    />
                    {formData.name && formData.name.trim().length < 2 && (
                      <p className="text-red-500 text-sm mt-1">Please enter at least 2 characters</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                        formData.email && !validateEmail(formData.email) ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="your@email.com"
                    />
                    {formData.email && !validateEmail(formData.email) && (
                      <p className="text-red-500 text-sm mt-1">Please enter a valid email address</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                        formData.phone && formData.phone.trim().length < 10 ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="(555) 123-4567"
                    />
                    {formData.phone && formData.phone.trim().length < 10 && (
                      <p className="text-red-500 text-sm mt-1">Please enter a valid phone number</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Home Address *
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                        formData.address && formData.address.trim().length < 5 ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="123 Main Street, City, State"
                    />
                    {formData.address && formData.address.trim().length < 5 && (
                      <p className="text-red-500 text-sm mt-1">Please enter a complete address</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      ZIP Code *
                      {locationData.detectedZip && (
                        <span className="text-blue-600 text-sm">
                          (Detected: {locationData.detectedZip})
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={formData.zipCode}
                      onChange={(e) => handleInputChange('zipCode', e.target.value.replace(/\D/g, '').slice(0, 5))}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                        formData.zipCode && (!validateUSZipCode(formData.zipCode) || zipValidation.isValid === false) ? 'border-red-500' : 
                        zipValidation.isValid === true ? 'border-green-500' : 'border-gray-300'
                      }`}
                      placeholder="12345"
                      maxLength="5"
                    />
                    {zipValidation.isValidating && (
                      <p className="text-blue-500 text-sm mt-1 flex items-center gap-1">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
                        Validating ZIP code...
                      </p>
                    )}
                    {formData.zipCode && validateUSZipCode(formData.zipCode) && zipValidation.isValid === true && (
                      <p className="text-green-500 text-sm mt-1">✓ Valid US ZIP code</p>
                    )}
                    {formData.zipCode && (zipValidation.isValid === false || !validateUSZipCode(formData.zipCode)) && (
                      <p className="text-red-500 text-sm mt-1">Please enter a valid US ZIP code</p>
                    )}
                  </div>

                  <button
                    onClick={handleNextStep}
                    disabled={!validateStep1()}
                    className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-orange-600 hover:to-yellow-600 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    Continue to Energy Details
                  </button>
                  {!validateStep1() && formData.zipCode && (
                    <p className="text-gray-500 text-sm text-center">
                      Please complete all fields with valid information to continue
                    </p>
                  )}
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

export default SolarROICalculator; focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg
