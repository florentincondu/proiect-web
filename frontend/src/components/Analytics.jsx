import React, { useState, useEffect } from 'react';
import { 
  FaChartLine, 
  FaMoneyBillWave, 
  FaMapMarkerAlt, 
  FaDownload, 
  FaCalendarAlt, 
  FaFilter,
  FaFileExport,
  FaChartBar,
  FaChartPie,
  FaInfoCircle
} from 'react-icons/fa';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ComposedChart
} from 'recharts';
import axios from 'axios';

const Analytics = () => {
  // State management
  const [analyticsData, setAnalyticsData] = useState({
    bookingTrends: [],
    revenueData: [],
    locationData: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [selectedChart, setSelectedChart] = useState('booking');
  const [error, setError] = useState('');
  const [exportLoading, setExportLoading] = useState({ csv: false, pdf: false });

  // Colors based on the Login component theme
  const colors = {
    primary: '#3b82f6', // blue-500
    secondary: '#60a5fa', // blue-400
    dark: '#111827', // gray-900
    darkOverlay: 'rgba(17, 24, 39, 0.9)', // gray-900 with opacity
    text: '#ffffff',
    textSecondary: '#9ca3af', // gray-400
    pieColors: ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a']
  };
  
  // Fetch analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      setError('');
      
      try {
        // In production, replace with actual API endpoints
        const bookingResponse = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/analytics/bookings`, 
          { params: { startDate: dateRange.start, endDate: dateRange.end } }
        );
        
        const revenueResponse = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/analytics/revenue`, 
          { params: { startDate: dateRange.start, endDate: dateRange.end } }
        );
        
        const locationResponse = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/analytics/locations`, 
          { params: { startDate: dateRange.start, endDate: dateRange.end } }
        );
        
        // Ensure bookingTrends is an array before setting state
        const bookingTrends = Array.isArray(bookingResponse.data) ? bookingResponse.data : [];
        
        // Process revenue data properly
        let revenueData;
        if (revenueResponse.data && typeof revenueResponse.data === 'object') {
          if (Array.isArray(revenueResponse.data)) {
            // If it's already an array, use it directly
            revenueData = revenueResponse.data;
          } else if (revenueResponse.data.revenueByPaymentMethod && Array.isArray(revenueResponse.data.revenueByPaymentMethod)) {
            // If it has revenueByPaymentMethod property, use that for the chart data
            revenueData = revenueResponse.data.revenueByPaymentMethod;
            // Also store the total revenue
            revenueData.totalRevenue = revenueResponse.data.totalRevenue || 0;
          } else {
            // If it's an object without expected structure, make an array from it
            revenueData = Object.entries(revenueResponse.data)
              .filter(([key, value]) => typeof value === 'number' && key !== 'totalRevenue')
              .map(([key, value]) => ({ service: key, revenue: value }));
            // Store total revenue if available
            if ('totalRevenue' in revenueResponse.data) {
              revenueData.totalRevenue = revenueResponse.data.totalRevenue;
            }
          }
        } else {
          revenueData = [];
        }
        
        // Ensure locationData is an array
        const locationData = Array.isArray(locationResponse.data) ? locationResponse.data : [];
        
        setAnalyticsData({
          bookingTrends: bookingTrends,
          revenueData: revenueData,
          locationData: locationData
        });
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
        setError('Failed to load analytics data. Please try again later.');
        
        // Mock data for development/preview
        setAnalyticsData({
          bookingTrends: [
            { date: '2025-01', bookings: 28, revenue: 22500 },
            { date: '2025-02', bookings: 35, revenue: 28750 },
            { date: '2025-03', bookings: 42, revenue: 32400 },
            { date: '2025-04', bookings: 38, revenue: 29200 },
            { date: '2025-05', bookings: 50, revenue: 42000 },
            { date: '2025-06', bookings: 57, revenue: 50100 }
          ],
          revenueData: [
            { service: 'Hotel Bookings', revenue: 45000 },
            { service: 'Flight Tickets', revenue: 32000 },
            { service: 'Car Rentals', revenue: 12500 },
            { service: 'Tour Packages', revenue: 28000 },
            { service: 'Activity Bookings', revenue: 8500 }
          ],
          locationData: [
            { location: 'București', bookings: 120, revenue: 48000 },
            { location: 'Cluj-Napoca', bookings: 85, revenue: 34000 },
            { location: 'Constanța', bookings: 65, revenue: 26000 },
            { location: 'Brașov', bookings: 75, revenue: 30000 },
            { location: 'Sibiu', bookings: 45, revenue: 18000 }
          ]
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAnalytics();
  }, [dateRange]);
  
  // Format currency to RON
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  // Calculate totals safely ensuring we have arrays
  const getTotalBookings = () => {
    if (!Array.isArray(analyticsData.bookingTrends)) return 0;
    return analyticsData.bookingTrends.reduce((acc, item) => acc + (item.bookings || 0), 0);
  };
  
  const getTotalRevenue = () => {
    // Check if we have revenueData array
    if (!Array.isArray(analyticsData.revenueData) || analyticsData.revenueData.length === 0) {
      return formatCurrency(0);
    }
    
    // If revenueData is an object with totalRevenue property (from backend)
    if (analyticsData.revenueData.totalRevenue !== undefined) {
      return formatCurrency(analyticsData.revenueData.totalRevenue);
    }
    
    // Otherwise calculate from the array items
    const total = analyticsData.revenueData.reduce((acc, item) => acc + (Number(item.revenue) || 0), 0);
    return formatCurrency(total);
  };
  
  const getTopLocation = () => {
    if (!Array.isArray(analyticsData.locationData) || analyticsData.locationData.length === 0) return 'N/A';
    
    // Sort by number of bookings to find the top location
    const topLocation = analyticsData.locationData.sort((a, b) => b.bookings - a.bookings)[0];
    if (!topLocation || !topLocation.location) return 'N/A';
    
    // First try to extract just the city/county name
    // Try different patterns:
    // 1. Extract everything before first comma
    const commaPattern = topLocation.location.split(',')[0];
    if (commaPattern) return commaPattern.trim();
    
    // 2. Extract the first word if it contains at least 3 characters
    const firstWord = topLocation.location.split(' ')[0];
    if (firstWord && firstWord.length > 2) return firstWord;
    
    // 3. If all else fails, return the full location or first 20 chars
    return topLocation.location.length > 20 ? 
           topLocation.location.substring(0, 20) + '...' : 
           topLocation.location;
  };
  
  // Handle date range change
  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle export functions
  const handleExport = async (type) => {
    setExportLoading({ ...exportLoading, [type]: true });
    
    try {
      // In production, replace with actual export API
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/analytics/export`,
        {
          params: { 
            type,
            startDate: dateRange.start, 
            endDate: dateRange.end,
            chart: selectedChart
          },
          responseType: 'blob'
        }
      );
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `boksy-analytics-${selectedChart}-${new Date().toISOString().split('T')[0]}.${type}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error(`Failed to export as ${type}:`, error);
      setError(`Failed to export data as ${type.toUpperCase()}. Please try again.`);
    } finally {
      setExportLoading({ ...exportLoading, [type]: false });
    }
  };
  
  // Extract county/city from full location 
  const extractCounty = (fullLocation) => {
    if (!fullLocation) return 'N/A';
    
    // Extract first part before comma if exists
    const commaPattern = fullLocation.split(',')[0];
    if (commaPattern) return commaPattern.trim();
    
    // Extract first word if long enough
    const firstWord = fullLocation.split(' ')[0];
    if (firstWord && firstWord.length > 2) return firstWord;
    
    // Return original if short, or truncated if long
    return fullLocation.length > 20 ? 
      fullLocation.substring(0, 20) + '...' : 
      fullLocation;
  };
  
  // Custom renderer for pie chart labels
  const renderCustomizedLabel = (props) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value } = props;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    // Only show percent if it's significant enough
    if (percent < 0.05) return null;
    
    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };
  
  // Process data for pie chart to limit slices
  const getPieChartData = () => {
    let data = [];
    
    if (selectedChart === 'revenue' && Array.isArray(analyticsData.revenueData)) {
      data = [...analyticsData.revenueData]
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5); // Limit to top 5 items
    } 
    else if (selectedChart === 'location' && Array.isArray(analyticsData.locationData)) {
      data = analyticsData.locationData
        .map(location => ({
          ...location,
          displayLocation: extractCounty(location.location)
        }))
        .sort((a, b) => b.bookings - a.bookings)
        .slice(0, 5); // Limit to top 5 locations
    } 
    else if (Array.isArray(analyticsData.bookingTrends)) {
      data = [...analyticsData.bookingTrends].slice(-5); // Get last 5 periods
    }
    
    return data;
  };
  
  // Process data for location chart
  const getLocationChartData = () => {
    if (!Array.isArray(analyticsData.locationData)) return [];
    
    return analyticsData.locationData
      .map(location => ({
        ...location,
        displayLocation: extractCounty(location.location)
      }))
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 6); // Limit to top 6 locations
  };
  
  // Card component for consistency
  const Card = ({ title, icon, children }) => (
    <div className="bg-gray-900 bg-opacity-90 rounded-xl shadow-lg p-5 backdrop-blur-sm">
      <div className="flex items-center mb-4">
        <span className="text-blue-500 mr-2">{icon}</span>
        <h3 className="text-xl font-bold text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Analytics <span className="text-blue-500">&</span> Reports
        </h1>
        <p className="text-gray-400">
          Track your booking trends, revenue, and performance metrics
        </p>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-100 p-3 rounded-lg mb-6">
          {error}
        </div>
      )}
      
      {/* Filters and controls */}
      <div className="bg-gray-900 bg-opacity-90 rounded-xl shadow-lg p-5 mb-6 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <FaFilter className="text-blue-500" />
            <span className="font-medium">Filters</span>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center">
              <FaCalendarAlt className="text-blue-500 mr-2" />
              <span className="text-sm text-gray-400 mr-2">From:</span>
              <input
                type="date"
                name="start"
                value={dateRange.start}
                onChange={handleDateChange}
                className="bg-gray-800 text-white px-3 py-2 rounded-md text-sm"
              />
            </div>
            
            <div className="flex items-center">
              <FaCalendarAlt className="text-blue-500 mr-2" />
              <span className="text-sm text-gray-400 mr-2">To:</span>
              <input
                type="date"
                name="end"
                value={dateRange.end}
                onChange={handleDateChange}
                className="bg-gray-800 text-white px-3 py-2 rounded-md text-sm"
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Chart Type Selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setSelectedChart('booking')}
          className={`px-4 py-2 rounded-full text-sm flex items-center ${selectedChart === 'booking' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-300'}`}
        >
          <FaChartLine className="mr-2" />
          Booking Trends
        </button>
        
        <button
          onClick={() => setSelectedChart('revenue')}
          className={`px-4 py-2 rounded-full text-sm flex items-center ${selectedChart === 'revenue' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-300'}`}
        >
          <FaMoneyBillWave className="mr-2" />
          Revenue Analysis
        </button>
        
        <button
          onClick={() => setSelectedChart('location')}
          className={`px-4 py-2 rounded-full text-sm flex items-center ${selectedChart === 'location' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-300'}`}
        >
          <FaMapMarkerAlt className="mr-2" />
          Location Metrics
        </button>
      </div>
      
      {/* Charts and Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Main Chart Area - Takes 2/3 of the width on large screens */}
        <div className="lg:col-span-2">
          <Card 
            title={
              selectedChart === 'booking' ? 'Booking Trends Over Time' : 
              selectedChart === 'revenue' ? 'Revenue Per Service' : 
              'Location-Based Analytics'
            }
            icon={
              selectedChart === 'booking' ? <FaChartLine size={18} /> : 
              selectedChart === 'revenue' ? <FaMoneyBillWave size={18} /> : 
              <FaMapMarkerAlt size={18} />
            }
          >
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  {selectedChart === 'booking' && (
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
                      <div className="xl:col-span-2">
                        <Card
                          title="Booking Trends"
                          icon={<FaChartLine />}
                        >
                          {isLoading ? (
                            <div className="flex justify-center items-center h-64">
                              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                            </div>
                          ) : !Array.isArray(analyticsData.bookingTrends) || analyticsData.bookingTrends.length === 0 ? (
                            <div className="flex justify-center items-center h-64 text-gray-400">
                              No booking data available for the selected period
                            </div>
                          ) : (
                            <div className="h-64">
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart
                                  data={analyticsData.bookingTrends}
                                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                                >
                                  <defs>
                                    <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                  </defs>
                                  <XAxis 
                                    dataKey="date" 
                                    stroke="#6b7280"
                                    tickFormatter={(value) => {
                                      const date = new Date(value);
                                      return date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
                                    }}
                                  />
                                  <YAxis stroke="#6b7280" />
                                  <Tooltip 
                                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: 'white' }}
                                    formatter={(value) => [`${value} bookings`, 'Bookings']}
                                    labelFormatter={(value) => {
                                      const date = new Date(value);
                                      return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
                                    }}
                                  />
                                  <Area 
                                    type="monotone" 
                                    dataKey="bookings" 
                                    stroke="#3b82f6" 
                                    fillOpacity={1} 
                                    fill="url(#colorBookings)" 
                                  />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                          )}
                        </Card>
                      </div>
                    </div>
                  )}
                  
                  {selectedChart === 'revenue' && (
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
                      <div className="xl:col-span-2">
                        <Card
                          title="Revenue by Service"
                          icon={<FaMoneyBillWave />}
                        >
                          {isLoading ? (
                            <div className="flex justify-center items-center h-64">
                              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                            </div>
                          ) : !Array.isArray(analyticsData.revenueData) || analyticsData.revenueData.length === 0 ? (
                            <div className="flex justify-center items-center h-64 text-gray-400">
                              No revenue data available for the selected period
                            </div>
                          ) : (
                            <div className="h-64">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                  data={analyticsData.revenueData}
                                  margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                                >
                                  <XAxis dataKey="service" stroke="#6b7280" />
                                  <YAxis stroke="#6b7280" />
                                  <Tooltip 
                                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: 'white' }}
                                    formatter={(value) => [`${formatCurrency(value)}`, 'Revenue']}
                                  />
                                  <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          )}
                        </Card>
                      </div>
                    </div>
                  )}
                  
                  {selectedChart === 'location' && (
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
                      <div className="xl:col-span-2">
                        <Card
                          title="Location Performance"
                          icon={<FaMapMarkerAlt />}
                        >
                          {isLoading ? (
                            <div className="flex justify-center items-center h-64">
                              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                            </div>
                          ) : !Array.isArray(analyticsData.locationData) || analyticsData.locationData.length === 0 ? (
                            <div className="flex justify-center items-center h-64 text-gray-400">
                              No location data available for the selected period
                            </div>
                          ) : (
                            <div className="h-64">
                              <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart
                                  data={getLocationChartData()}
                                  margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                                >
                                  <XAxis dataKey="displayLocation" stroke="#6b7280" />
                                  <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" />
                                  <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
                                  <Tooltip 
                                    contentStyle={{ 
                                      backgroundColor: '#111827', 
                                      border: '1px solid #374151',
                                      borderRadius: '0.375rem',
                                      padding: '8px 12px'
                                    }} 
                                    formatter={(value, name, props) => {
                                      // Calculate percentage
                                      let percent = '';
                                      
                                      try {
                                        const { payload, dataKey } = props || {};
                                        let total = 0;
                                        
                                        if (payload && 
                                            payload.constructor && 
                                            Array.isArray(payload.constructor.data)) {
                                          total = payload.constructor.data.reduce((sum, entry) => 
                                            sum + (entry[dataKey] || 0), 0);
                                          
                                          percent = total > 0 ? (value / total * 100).toFixed(1) + '%' : '';
                                        }
                                      } catch (error) {
                                        console.error('Error calculating percentage:', error);
                                      }
                                      
                                      if (selectedChart === 'revenue') {
                                        return [
                                          <span key="value">
                                            <span className="font-bold">{formatCurrency(value)}</span>
                                            {percent && <span className="text-gray-400 ml-2">({percent})</span>}
                                          </span>, 
                                          <span key="name" className="capitalize">{name}</span>
                                        ];
                                      }
                                      
                                      return [
                                        <span key="value">
                                          <span className="font-bold">{value}</span>
                                          {percent && <span className="text-gray-400 ml-2">({percent})</span>}
                                        </span>, 
                                        <span key="name" className="capitalize">{name}</span>
                                      ];
                                    }}
                                  />
                                  <Legend 
                                    layout="horizontal" 
                                    verticalAlign="bottom" 
                                    align="center"
                                    wrapperStyle={{ paddingTop: 20 }}
                                    formatter={(value, entry) => {
                                      if (value?.length > 12) {
                                        return value.substring(0, 10) + '...';
                                      }
                                      return value;
                                    }}
                                    iconSize={10}
                                    iconType="circle"
                                  />
                                  <Bar yAxisId="left" dataKey="bookings" fill="#3b82f6" name="Bookings" />
                                  <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#10b981" name="Revenue" />
                                </ComposedChart>
                              </ResponsiveContainer>
                            </div>
                          )}
                        </Card>
                      </div>
                    </div>
                  )}
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>
        
        {/* Stats cards - 1/3 width on large screens */}
        <div className="space-y-6">
          {/* Summary Card */}
          <Card title="Summary" icon={<FaInfoCircle size={18} />}>
            {isLoading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                <div className="h-4 bg-gray-700 rounded w-5/6"></div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-gray-700">
                  <span className="text-gray-400">Total Bookings</span>
                  <span className="text-xl font-bold">
                    {getTotalBookings()}
                  </span>
                </div>
                
                <div className="flex justify-between items-center pb-2 border-b border-gray-700">
                  <span className="text-gray-400">Total Revenue</span>
                  <span className="text-xl font-bold text-blue-500">
                    {getTotalRevenue()}
                  </span>
                </div>
                
                <div className="flex justify-between items-center pb-2 border-b border-gray-700">
                  <span className="text-gray-400">Top Location</span>
                  <span className="text-lg font-medium">
                    {getTopLocation()}
                  </span>
                </div>
              </div>
            )}
          </Card>
          
          {/* Pie Chart */}
          <Card title="Distribution" icon={<FaChartPie size={18} />}>
            {isLoading ? (
              <div className="flex justify-center items-center h-48">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getPieChartData()}
                      cx="50%"
                      cy="45%"
                      innerRadius={30}
                      outerRadius={70}
                      paddingAngle={2}
                      cornerRadius={3}
                      fill={colors.primary}
                      dataKey={
                        selectedChart === 'revenue' 
                          ? 'revenue' 
                          : selectedChart === 'location'
                            ? 'bookings'
                            : 'bookings'
                      }
                      nameKey={
                        selectedChart === 'revenue' 
                          ? 'service' 
                          : selectedChart === 'location'
                            ? 'displayLocation'
                            : 'date'
                      }
                      labelLine={false}
                      label={renderCustomizedLabel}
                    >
                      {getPieChartData().map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={colors.pieColors[index % colors.pieColors.length]} 
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#111827', 
                        border: '1px solid #374151',
                        borderRadius: '0.375rem',
                        padding: '8px 12px'
                      }} 
                      formatter={(value, name, props) => {
                        // Calculate percentage
                        let percent = '';
                        
                        try {
                          const { payload, dataKey } = props || {};
                          let total = 0;
                          
                          if (payload && 
                              payload.constructor && 
                              Array.isArray(payload.constructor.data)) {
                            total = payload.constructor.data.reduce((sum, entry) => 
                              sum + (entry[dataKey] || 0), 0);
                            
                            percent = total > 0 ? (value / total * 100).toFixed(1) + '%' : '';
                          }
                        } catch (error) {
                          console.error('Error calculating percentage:', error);
                        }
                        
                        if (selectedChart === 'revenue') {
                          return [
                            <span key="value">
                              <span className="font-bold">{formatCurrency(value)}</span>
                              {percent && <span className="text-gray-400 ml-2">({percent})</span>}
                            </span>, 
                            <span key="name" className="capitalize">{name}</span>
                          ];
                        }
                        
                        return [
                          <span key="value">
                            <span className="font-bold">{value}</span>
                            {percent && <span className="text-gray-400 ml-2">({percent})</span>}
                          </span>, 
                          <span key="name" className="capitalize">{name}</span>
                        ];
                      }}
                    />
                    <Legend 
                      layout="horizontal" 
                      verticalAlign="bottom" 
                      align="center"
                      wrapperStyle={{ paddingTop: 20 }}
                      formatter={(value, entry) => {
                        if (value?.length > 12) {
                          return value.substring(0, 10) + '...';
                        }
                        return value;
                      }}
                      iconSize={10}
                      iconType="circle"
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>
      </div>
      
      {/* Data Table */}
      <Card title="Detailed Data" icon={<FaChartBar size={18} />}>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-gray-800 rounded-lg overflow-hidden">
            <thead className="bg-gray-700">
              <tr>
                {selectedChart === 'booking' && (
                  <>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-300">Date</th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-300">Bookings</th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-300">Growth</th>
                  </>
                )}
                
                {selectedChart === 'revenue' && (
                  <>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-300">Service</th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-300">Revenue</th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-300">% of Total</th>
                  </>
                )}
                
                {selectedChart === 'location' && (
                  <>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-300">Location</th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-300">Bookings</th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-300">Revenue</th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-300">Rev/Booking</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {isLoading ? (
                Array(5).fill().map((_, index) => (
                  <tr key={index} className="animate-pulse">
                    <td className="py-3 px-4"><div className="h-4 bg-gray-700 rounded w-20"></div></td>
                    <td className="py-3 px-4"><div className="h-4 bg-gray-700 rounded w-16"></div></td>
                    <td className="py-3 px-4"><div className="h-4 bg-gray-700 rounded w-12"></div></td>
                    {selectedChart === 'location' && (
                      <td className="py-3 px-4"><div className="h-4 bg-gray-700 rounded w-12"></div></td>
                    )}
                  </tr>
                ))
              ) : (
                selectedChart === 'booking' && analyticsData.bookingTrends.map((item, index, arr) => {
                  let growth = 0;
                  let prevBookings = 0;
                  let comparisonLabel = '';
                  
                  if (index > 0) {
                    // Compare with previous period
                    prevBookings = arr[index - 1].bookings || 0;
                    comparisonLabel = 'vs prev period';
                    
                    if (prevBookings > 0) {
                      growth = ((item.bookings - prevBookings) / prevBookings) * 100;
                    } else if (item.bookings > 0) {
                      growth = 100; // Previous was zero, current has value
                    }
                  } else if (arr.length > 1) {
                    // For first item, compare with average excluding this item
                    const otherBookings = arr.slice(1).reduce((sum, b) => sum + (b.bookings || 0), 0);
                    const avgOtherBookings = otherBookings / (arr.length - 1);
                    comparisonLabel = 'vs avg';
                    
                    if (avgOtherBookings > 0) {
                      growth = ((item.bookings - avgOtherBookings) / avgOtherBookings) * 100;
                    }
                  }
                  
                  return (
                    <tr key={item.date} className="hover:bg-gray-700/50">
                      <td className="py-3 px-4 text-sm">{item.date}</td>
                      <td className="py-3 px-4 text-sm">{item.bookings}</td>
                      <td className="py-3 px-4 text-sm">
                        {Math.abs(growth) < 0.1 ? (
                          <span className="text-gray-400">No change</span>
                        ) : (
                          <div>
                            <span className={`${growth >= 0 ? 'text-green-500' : 'text-red-500'} flex items-center`}>
                              {growth >= 0 ? '↑' : '↓'} {Math.abs(growth).toFixed(1)}%
                            </span>
                            <span className="text-gray-500 text-xs">{comparisonLabel}</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
              
              {!isLoading && selectedChart === 'revenue' && analyticsData.revenueData.map((item) => {
                const totalRevenue = analyticsData.revenueData.reduce((acc, i) => acc + i.revenue, 0);
                const percentage = (item.revenue / totalRevenue) * 100;
                
                // Calculate rank
                const sortedData = [...analyticsData.revenueData].sort((a, b) => b.revenue - a.revenue);
                const rank = sortedData.findIndex(i => i.service === item.service) + 1;
                
                // Calculate comparison with average
                const avgRevenue = totalRevenue / analyticsData.revenueData.length;
                const vsAvg = ((item.revenue - avgRevenue) / avgRevenue) * 100;
                
                return (
                  <tr key={item.service} className="hover:bg-gray-700/50">
                    <td className="py-3 px-4 text-sm">{item.service}</td>
                    <td className="py-3 px-4 text-sm">{formatCurrency(item.revenue)}</td>
                    <td className="py-3 px-4 text-sm">
                      <div>
                        <span className="font-medium">{percentage.toFixed(1)}%</span>
                        <span className="text-gray-500 text-xs ml-1">(#{rank})</span>
                        {Math.abs(vsAvg) > 0.5 && (
                          <div className={`text-xs ${vsAvg > 0 ? 'text-green-500' : 'text-red-500'} flex items-center mt-1`}>
                            {vsAvg > 0 ? '↑' : '↓'} {Math.abs(vsAvg).toFixed(1)}% vs avg
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              
              {!isLoading && selectedChart === 'location' && analyticsData.locationData.map((item) => {
                const revPerBooking = item.revenue / item.bookings;
                
                // Calculate total bookings and average revenue per booking
                const totalBookings = analyticsData.locationData.reduce((acc, loc) => acc + loc.bookings, 0);
                const totalRevenue = analyticsData.locationData.reduce((acc, loc) => acc + loc.revenue, 0);
                const avgRevPerBooking = totalBookings > 0 ? totalRevenue / totalBookings : 0;
                
                // Calculate efficiency compared to average
                const efficiency = avgRevPerBooking > 0 ? ((revPerBooking - avgRevPerBooking) / avgRevPerBooking) * 100 : 0;
                
                // Calculate bookings share
                const bookingShare = totalBookings > 0 ? (item.bookings / totalBookings) * 100 : 0;
                
                return (
                  <tr key={item.location} className="hover:bg-gray-700/50">
                    <td className="py-3 px-4 text-sm">{extractCounty(item.location)}</td>
                    <td className="py-3 px-4 text-sm">
                      <div>
                        <span>{item.bookings}</span>
                        <span className="text-gray-500 text-xs ml-1">({bookingShare.toFixed(1)}%)</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm">{formatCurrency(item.revenue)}</td>
                    <td className="py-3 px-4 text-sm">
                      <div>
                        <span>{formatCurrency(revPerBooking)}</span>
                        {Math.abs(efficiency) > 1 && (
                          <div className={`text-xs ${efficiency > 0 ? 'text-green-500' : 'text-red-500'} flex items-center mt-1`}>
                            {efficiency > 0 ? '↑' : '↓'} {Math.abs(efficiency).toFixed(1)}% vs avg
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Analytics;