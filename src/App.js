import React, { useState, useEffect } from 'react';
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

  const [locationData, setLocationData] = useState({
    isUSA: null,
    detectedZip: null,
    detectedState: null,
    detectedCity: null
  });
  const [zipValidationStatus, setZipValidationStatus] = useState('');
  const [isStep1Valid, setIsStep1Valid] = useState(false);
  const [isStep2Valid, setIsStep2Valid] = useState(false);

  // Solar irradiance data (kWh/m²/day)
  const solarIrradiance = {
    'high': 5.5,
    'average': 4.2,
    'low': 3.5,
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

  // Enhanced email validation for all valid emails
  const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(email) || email.length < 5) return false;
    const validProviders = [
      'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
      'icloud.com', 'protonmail.com', 'zoho.com', 'yandex.com', 'mail.com',
      'comcast.net', 'verizon.net', 'att.net', 'charter.net', 'cox.net',
      'earthlink.net', 'sbcglobal.net', 'roadrunner.com', 'bellsouth.net'
    ];
    const domain = email.split('@')[1]?.toLowerCase();
    return domain && (
      validProviders.includes(domain) ||
      /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain)
    );
  };

  // Location detection function
  const detectLocationAndValidateZip = async () => {
    try {
      const locationResponse = await fetch('https://ipapi.co/json/');
      const locationInfo = await locationResponse.json();
      setLocationData({
        isUSA: locationInfo.country_code === 'US',
        detectedZip: locationInfo.postal,
        detectedState: locationInfo.region,
        detectedCity: locationInfo.city
      });
      if (locationInfo.country_code === 'US' && !formData.zipCode && locationInfo.postal) {
        handleInputChange('zipCode', locationInfo.postal);
      }
    } catch (error) {
      // Silent fail
    }
  };

  // Real ZIP code validation against database
  const validateRealUSZipCode = async (zipCode) => {
    if (!zipCode || zipCode.length !== 5) {
      setZipValidationStatus('invalid-format');
      return false;
    }
    setZipValidationStatus('checking');
    try {
      const response = await fetch(`https://api.zippopotam.us/us/${zipCode}`);
      if (response.ok) {
        const data = await response.json();
        setZipValidationStatus(`valid - ${data.places[0]['place name']}, ${data.places[0]['state abbreviation']}`);
        return true;
      } else {
        setZipValidationStatus('invalid-zip');
        return false;
      }
    } catch (error) {
      const isBasicValid = /^\d{5}$/.test(zipCode);
      setZipValidationStatus(isBasicValid ? 'valid-format' : 'invalid-format');
      return isBasicValid;
    }
  };

  // Synchronous validation for Step 1 (UI state)
  const syncValidateStep1 = () => (
    formData.name.trim().length >= 2 &&
    validateEmail(formData.email) &&
    formData.phone.trim().length >= 10 &&
    formData.address.trim().length >= 5 &&
    formData.zipCode.length === 5 &&
    (zipValidationStatus.startsWith('valid') || zipValidationStatus === 'valid-format')
  );

  // Synchronous validation for Step 2 (UI state)
  const syncValidateStep2 = () => !!(formData.monthlyBill && formData.systemCost);

  // Validate Step 1 (API, async)
  const validateStep1 = async () => {
    const basicValidation =
      formData.name.trim().length >= 2 &&
      validateEmail(formData.email) &&
      formData.phone.trim().length >= 10 &&
      formData.address.trim().length >= 5 &&
      formData.zipCode.length === 5;
    if (!basicValidation) return false;
    const isRealZip = await validateRealUSZipCode(formData.zipCode);
    return isRealZip;
  };

  // Update validation state on input change
  useEffect(() => {
    setIsStep1Valid(syncValidateStep1());
  }, [formData, zipValidationStatus, syncValidateStep1]);

  useEffect(() => {
    setIsStep2Valid(syncValidateStep2());
  }, [formData.monthlyBill, formData.systemCost, syncValidateStep2]);

  // Detect location when component loads
  useEffect(() => {
    detectLocationAndValidateZip();
    // eslint-disable-next-line
  }, []);

  // Validate ZIP code when it changes
  useEffect(() => {
    if (formData.zipCode.length === 5) {
      validateRealUSZipCode(formData.zipCode);
    } else {
      setZipValidationStatus('');
    }
    // eslint-disable-next-line
  }, [formData.zipCode]);

  const sendWebhook = async (leadData) => {
    try {
      const webhookUrl = 'https://hook.us2.make.com/bthvgm9bsb6cjypl2j4fa6ma07b20eta';
      const utmSource = typeof window !== 'undefined' ? window.location.search : '';
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
          utmSource,
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
    const systemSize = parseFloat(formData.systemSize) || (monthlyBill * 12) / (electricityRate * 1000 * 4.5);
    const peakSunHours = solarIrradiance[formData.location];
    const roofEfficiency = roofMultipliers[formData.roofType];
    const systemEfficiency = 0.85;

    // Annual solar production
    const annualProduction = systemSize * peakSunHours * 365 * roofEfficiency * systemEfficiency;
    const firstYearSavings = annualProduction * electricityRate;

    // Federal and state incentives
    const federalTaxCredit = systemCost * 0.30;
    const netSystemCost = systemCost - federalTaxCredit;
    const actualOutOfPocket = downPayment - (downPayment * 0.30);

    // Financing calculations
    let monthlyLoanPayment = 0;
    let totalInterestPaid = 0;
    if (loanAmount > 0) {
      const loanTermMonths = 20 * 12;
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
      const systemDegradation = Math.pow(0.995, year - 1);
      const adjustedProduction = annualProduction * systemDegradation;
      currentAnnualSavings = adjustedProduction * electricityRate * Math.pow(1 + utilityRateIncrease, year - 1);
      cumulativeSavings += currentAnnualSavings;
      if (year <= 20 && loanAmount > 0) {
        cumulativeCosts += monthlyLoanPayment * 12;
      }
      if (cumulativeSavings >= cumulativeCosts && breakEvenYear === 0) {
        breakEvenYear = year;
      }
    }

    totalLifetimeSavings = cumulativeSavings - cumulativeCosts;
    const totalInvestment = actualOutOfPocket + totalInterestPaid;
    const roi = (totalLifetimeSavings / totalInvestment) * 100;
    const annualizedROI = roi / timeFrame;

    let totalElectricityBillWithoutSolar = 0;
    for (let year = 1; year <= timeFrame; year++) {
      const yearlyBill = monthlyBill * 12 * Math.pow(1 + utilityRateIncrease, year - 1);
      totalElectricityBillWithoutSolar += yearlyBill;
    }

    const carbonOffsetPerYear = annualProduction * 0.0004;
    const totalCarbonOffset = carbonOffsetPerYear * timeFrame;

    const calculationResults = {
      systemSize: Math.round(systemSize * 10) / 10,
      annualProduction: Math.round(annualProduction),
      systemCost: Math.round(systemCost),
      netSystemCost: Math.round(netSystemCost),
      actualOutOfPocket: Math.round(actualOutOfPocket),
      firstYearSavings: Math.round(firstYearSavings),
      totalLifetimeSavings: Math.round(totalLifetimeSavings),
      totalElectricityBillWithoutSolar: Math.round(totalElectricityBillWithoutSolar),
      cumulativeSavings: Math.round(cumulativeSavings),
      roi: Math.round(roi * 10) / 10,
      annualizedROI: Math.round(annualizedROI * 10) / 10,
      breakEvenYear,
      federalTaxCredit: Math.round(federalTaxCredit),
      monthlyLoanPayment: Math.round(monthlyLoanPayment),
      totalInterestPaid: Math.round(totalInterestPaid),
      carbonOffsetPerYear: Math.round(carbonOffsetPerYear * 10) / 10,
      totalCarbonOffset: Math.round(totalCarbonOffset * 10) / 10,
      isProfitable: totalLifetimeSavings > 0,
      paybackPeriod: breakEvenYear,
      effectiveAnnualSavings: Math.round(totalLifetimeSavings / timeFrame),
      currentMonthlyBill: Math.round(monthlyBill),
      newMonthlyBill: Math.round(Math.max(0, monthlyBill - (firstYearSavings / 12))),
      monthlySavings: Math.round(Math.min(monthlyBill, firstYearSavings / 12)),
    };

    setResults(calculationResults);
    setShowResults(true);
    await sendWebhook(calculationResults);
  };

  const handleNextStep = async () => {
    if (step === 1) {
      const button = document.querySelector('button[type="submit"]') || document.querySelector('button');
      const originalText = button ? button.textContent : '';
      if (button) button.textContent = 'Validating...';

      const isValid = await validateStep1();

      if (button) button.textContent = originalText;

      if (isValid) {
        setStep(2);
      } else {
        alert('Please ensure all fields are valid:\n- Real email address\n- Valid US ZIP code\n- Complete information');
      }
    } else if (step === 2 && isStep2Valid) {
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
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                        formData.email && !validateEmail(formData.email) ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="your@email.com"
                    />
                    {formData.email && !validateEmail(formData.email) && (
                      <p className="text-red-500 text-sm mt-1">Please enter a valid email address</p>
                    )}
                    {formData.email && validateEmail(formData.email) && (
                      <p className="text-green-500 text-sm mt-1">✓ Valid email</p>
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
                      {locationData.isUSA && locationData.detectedZip && (
                        <span className="text-green-600 text-sm ml-2">
                          (Detected: {locationData.detectedZip})
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={formData.zipCode}
                      onChange={(e) => handleInputChange('zipCode', e.target.value.replace(/\D/g, '').slice(0, 5))}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                        zipValidationStatus === 'invalid-zip' || zipValidationStatus === 'invalid-format' ? 'border-red-500' : 
                        zipValidationStatus.startsWith('valid') ? 'border-green-500' : 'border-gray-300'
                      }`}
                      placeholder="12345"
                      maxLength="5"
                    />
                    {locationData.isUSA === false && (
                      <p className="text-orange-500 text-sm mt-1">
                        ⚠️ This calculator is currently only available for US residents
                      </p>
                    )}
                    {zipValidationStatus === 'checking' && (
                      <p className="text-blue-500 text-sm mt-1">🔍 Validating ZIP code...</p>
                    )}
                    {zipValidationStatus === 'invalid-zip' && (
                      <p className="text-red-500 text-sm mt-1">❌ Invalid ZIP code - please enter a real US ZIP</p>
                    )}
                    {zipValidationStatus === 'invalid-format' && (
                      <p className="text-red-500 text-sm mt-1">❌ Please enter a 5-digit ZIP code</p>
                    )}
                    {zipValidationStatus.startsWith('valid -') && (
                      <p className="text-green-500 text-sm mt-1">✓ {zipValidationStatus}</p>
                    )}
                    {zipValidationStatus === 'valid-format' && (
                      <p className="text-green-500 text-sm mt-1">✓ Valid ZIP format</p>
                    )}
                  </div>

                  <button
                    onClick={handleNextStep}
                    disabled={!isStep1Valid}
                    className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-orange-600 hover:to-yellow-600 transition-all duration-300"
                    type="submit"
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
                    disabled={!isStep2Valid}
                    className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-orange-600 hover:to-yellow-600 transition-all duration-300"
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
