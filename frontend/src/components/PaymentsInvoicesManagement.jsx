import React, { useState, useEffect } from 'react';
import { 
  FaFileInvoiceDollar, FaDownload, FaSearch, FaFilter, FaCalendarAlt, 
  FaCreditCard, FaMoneyBillWave, FaExchangeAlt, FaChartLine, FaTimes, 
  FaCheckCircle, FaTimesCircle, FaUndoAlt, FaEye, FaPrint, FaInfoCircle
} from 'react-icons/fa';
import { format } from 'date-fns';
import axios from 'axios';
import { useAuth } from '../context/authContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Mock data for payments/invoices
const initialPayments = [
  {
    id: 'INV-2024-1001',
    customerId: 'CUST-1234',
    customerName: 'John Smith',
    customerEmail: 'john.smith@example.com',
    amount: 1299.99,
    currency: 'USD',
    date: '2024-10-20',
    dueDate: '2024-11-20',
    status: 'Paid',
    paymentMethod: 'Credit Card',
    lastFour: '4242',
    items: [
      { id: 1, description: 'Flight Booking - NY to London', quantity: 1, unitPrice: 899.99 },
      { id: 2, description: 'Travel Insurance - Premium', quantity: 1, unitPrice: 400.00 }
    ],
    notes: 'Thank you for your business!',
    transactionId: 'txn_1234567890'
  },
  {
    id: 'INV-2024-1002',
    customerId: 'CUST-5678',
    customerName: 'Jane Doe',
    customerEmail: 'jane.doe@example.com',
    amount: 750.00,
    currency: 'USD',
    date: '2024-10-18',
    dueDate: '2024-11-18',
    status: 'Paid',
    paymentMethod: 'PayPal',
    lastFour: null,
    items: [
      { id: 1, description: 'Hotel Booking - 3 nights', quantity: 3, unitPrice: 250.00 }
    ],
    notes: '',
    transactionId: 'txn_0987654321'
  },
  {
    id: 'INV-2024-1003',
    customerId: 'CUST-9012',
    customerName: 'Robert Johnson',
    customerEmail: 'robert.johnson@example.com',
    amount: 450.00,
    currency: 'USD',
    date: '2024-10-15',
    dueDate: '2024-11-15',
    status: 'Pending',
    paymentMethod: 'Bank Transfer',
    lastFour: null,
    items: [
      { id: 1, description: 'Car Rental - Compact - 5 days', quantity: 5, unitPrice: 90.00 }
    ],
    notes: 'Waiting for bank transfer confirmation',
    transactionId: null
  },
  {
    id: 'INV-2024-1004',
    customerId: 'CUST-3456',
    customerName: 'Sarah Williams',
    customerEmail: 'sarah.williams@example.com',
    amount: 2100.00,
    currency: 'USD',
    date: '2024-10-12',
    dueDate: '2024-11-12',
    status: 'Refunded',
    paymentMethod: 'Credit Card',
    lastFour: '1111',
    items: [
      { id: 1, description: 'Cancellation Fee', quantity: 1, unitPrice: 100.00 },
      { id: 2, description: 'Tour Package - Refunded', quantity: 1, unitPrice: 2000.00 }
    ],
    notes: 'Full refund processed due to emergency cancellation',
    transactionId: 'txn_2468135790',
    refundId: 'ref_1357924680',
    refundDate: '2024-10-14'
  },
  {
    id: 'INV-2024-1005',
    customerId: 'CUST-7890',
    customerName: 'Michael Brown',
    customerEmail: 'michael.brown@example.com',
    amount: 1500.00,
    currency: 'USD',
    date: '2024-10-10',
    dueDate: '2024-11-10',
    status: 'Overdue',
    paymentMethod: 'Invoice',
    lastFour: null,
    items: [
      { id: 1, description: 'Business Travel Package', quantity: 1, unitPrice: 1500.00 }
    ],
    notes: 'Second reminder sent on 2024-11-15',
    transactionId: null
  },
  {
    id: 'INV-2024-1006',
    customerId: 'CUST-2468',
    customerName: 'Emily Davis',
    customerEmail: 'emily.davis@example.com',
    amount: 899.50,
    currency: 'USD',
    date: '2024-10-08',
    dueDate: '2024-11-08',
    status: 'Paid',
    paymentMethod: 'Credit Card',
    lastFour: '7890',
    items: [
      { id: 1, description: 'Flight Booking - LA to Miami', quantity: 1, unitPrice: 699.50 },
      { id: 2, description: 'Airport Transfer - Miami', quantity: 1, unitPrice: 200.00 }
    ],
    notes: '',
    transactionId: 'txn_1593574862'
  },
  {
    id: 'INV-2024-1007',
    customerId: 'CUST-1357',
    customerName: 'David Wilson',
    customerEmail: 'david.wilson@example.com',
    amount: 350.00,
    currency: 'USD',
    date: '2024-10-05',
    dueDate: '2024-11-05',
    status: 'Partially Refunded',
    paymentMethod: 'PayPal',
    lastFour: null,
    items: [
      { id: 1, description: 'Guided Tour - City Highlights', quantity: 2, unitPrice: 175.00 }
    ],
    notes: 'Partial refund for one person who couldn\'t attend',
    transactionId: 'txn_7539514682',
    refundId: 'ref_9517536842',
    refundAmount: 175.00,
    refundDate: '2024-10-07'
  }
];

// Payment methods for dropdown
const paymentMethods = [
  'All Methods',
  'credit_card',
  'paypal',
  'bank_transfer',
  'cash',
  'other'
];

// Payment statuses for dropdown
const paymentStatuses = [
  'All Statuses',
  'pending',
  'paid',
  'failed',
  'refunded',
  'partially_refunded',
  'voided',
  'cancelled'
];

const PaymentsInvoicesManagement = () => {
  const { token } = useAuth();
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All Statuses');
  const [filterMethod, setFilterMethod] = useState('All Methods');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterAmountMin, setFilterAmountMin] = useState('');
  const [filterAmountMax, setFilterAmountMax] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [refundAmount, setRefundAmount] = useState(0);
  const [refundReason, setRefundReason] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [paymentStats, setPaymentStats] = useState({
    totalRevenue: 0,
    revenueChange: 0,
    successfulPayments: 0,
    successRate: 0,
    pendingPayments: 0,
    pendingAmount: 0,
    refundedAmount: 0,
    refundCount: 0,
    byStatus: [],
    byMethod: [],
    monthlyRevenue: []
  });

  // Fetch payments data from API
  useEffect(() => {
    fetchPayments();
    fetchPaymentStats();
  }, [token, currentPage, pageSize, filterStatus, filterMethod, filterDateFrom, filterDateTo, filterAmountMin, filterAmountMax, sortBy, sortOrder]);

  // Function to fetch payments data
  const fetchPayments = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Fetching payments data...');
      let url = `${API_BASE_URL}/api/payments?page=${currentPage}&limit=${pageSize}&sort=${sortBy}&order=${sortOrder}`;
      
      // Add filters to the query
      if (filterStatus !== 'All Statuses') url += `&status=${filterStatus}`;
      if (filterMethod !== 'All Methods') url += `&method=${filterMethod}`;
      if (filterDateFrom) url += `&dateFrom=${filterDateFrom}`;
      if (filterDateTo) url += `&dateTo=${filterDateTo}`;
      if (filterAmountMin) url += `&minAmount=${filterAmountMin}`;
      if (filterAmountMax) url += `&maxAmount=${filterAmountMax}`;
      if (searchTerm) url += `&search=${searchTerm}`;
      
      console.log('API URL:', url);
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('API Response:', response.data);
      
      if (response.data && response.data.payments) {
        console.log('Setting payments from API response');
        
        // Map the API response to add missing fields if needed
        const processedPayments = response.data.payments.map(payment => {
          // Construct full customer name from user data if available
          const customerName = payment.user ? 
            `${payment.user.firstName || ''} ${payment.user.lastName || ''}`.trim() : 
            (payment.customerInfo?.name || 'Unknown Customer');
          
          const customerEmail = payment.user?.email || payment.customerInfo?.email || 'unknown@example.com';
          
          return {
            ...payment,
            id: payment._id || payment.id,
            customerName,
            customerEmail,
            invoiceNumber: payment.invoiceNumber,
            // Format dates consistently 
            date: payment.createdAt || payment.issueDate || payment.date,
            dueDate: payment.dueDate || null,
            lastUpdated: payment.updatedAt || null
          };
        });
        
        setPayments(processedPayments);
        setFilteredPayments(processedPayments);
        setTotalPages(Math.ceil(response.data.pagination.total / pageSize));
      } else {
        console.warn('API response format unexpected, using fallback data');
        // Only use mock data during development or as fallback
        setPayments(initialPayments);
        setFilteredPayments(initialPayments);
        setTotalPages(Math.ceil(initialPayments.length / pageSize));
      }
    } catch (err) {
      console.error('Error fetching payments:', err);
      setError('Failed to load payments data. Please try again later.');
      
      // Only use mock data during development or as fallback
      setPayments(initialPayments);
      setFilteredPayments(initialPayments);
      setTotalPages(Math.ceil(initialPayments.length / pageSize));
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch payment statistics
  const fetchPaymentStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/payments/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Payment stats response:', response.data);
      
      // The backend returns statistics data directly, not in a stats property
      if (response.data) {
        // Extract payment counts by status from the byStatus array
        const paidData = response.data.byStatus.find(item => item._id === 'paid') || { count: 0, revenue: 0 };
        const pendingData = response.data.byStatus.find(item => item._id === 'pending') || { count: 0, revenue: 0 };
        const refundedData = response.data.byStatus.find(item => item._id === 'refunded') || { count: 0, revenue: 0 };
        const partiallyRefundedData = response.data.byStatus.find(item => item._id === 'partially_refunded') || { count: 0, revenue: 0 };
        
        // Calculate success rate
        const totalPayments = response.data.byStatus.reduce((sum, status) => sum + status.count, 0);
        const successRate = totalPayments > 0 ? 
          ((paidData.count + partiallyRefundedData.count) / totalPayments * 100).toFixed(1) : 0;
        
        // Calculate total refunded amount
        const refundedAmount = refundedData.revenue + (partiallyRefundedData.revenue * 0.5); // Estimate for partially refunded
        
        // Calculate revenue change from monthly data if available
        let revenueChange = 0;
        if (response.data.monthlyRevenue && response.data.monthlyRevenue.length >= 2) {
          // Sort monthly revenue by date to ensure we're comparing correct months
          const sortedMonthlyData = [...response.data.monthlyRevenue].sort((a, b) => {
            if (a._id.year !== b._id.year) return b._id.year - a._id.year;
            return b._id.month - a._id.month;
          });
          
          // Get current month and previous month revenue
          const currentMonthRevenue = sortedMonthlyData[0]?.revenue || 0;
          const previousMonthRevenue = sortedMonthlyData[1]?.revenue || 0;
          
          // Calculate percentage change
          if (previousMonthRevenue > 0) {
            revenueChange = ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue * 100).toFixed(1);
          }
        }
        
        // Use real data from API
        setPaymentStats({
          totalRevenue: response.data.totals.revenue || 0,
          revenueChange: parseFloat(revenueChange),
          successfulPayments: paidData.count,
          successRate: parseFloat(successRate),
          pendingPayments: pendingData.count,
          pendingAmount: pendingData.revenue,
          refundedAmount: refundedAmount,
          refundCount: refundedData.count + partiallyRefundedData.count,
          byStatus: response.data.byStatus || [],
          byMethod: response.data.byMethod || [],
          monthlyRevenue: response.data.monthlyRevenue || []
        });
      } else {
        // Fallback to mock data if API doesn't return expected format
        setPaymentStats({
          totalRevenue: 4800,
          revenueChange: 12.5,
          successfulPayments: 142,
          successRate: 94.7,
          pendingPayments: 18,
          pendingAmount: 2300,
          refundedAmount: 450,
          refundCount: 3,
          byStatus: [
            { status: 'paid', count: 142, amount: 4800 },
            { status: 'pending', count: 18, amount: 2300 },
            { status: 'refunded', count: 3, amount: 450 }
          ],
          byMethod: [
            { method: 'credit_card', count: 95, amount: 3200 },
            { method: 'paypal', count: 42, amount: 1600 },
            { method: 'bank_transfer', count: 23, amount: 2300 }
          ],
          monthlyRevenue: [
            { month: 'Jan', revenue: 1200 },
            { month: 'Feb', revenue: 1800 },
            { month: 'Mar', revenue: 2400 },
            { month: 'Apr', revenue: 1900 }
          ]
        });
      }
    } catch (err) {
      console.error('Error fetching payment stats:', err);
      // Fallback to mock data
      setPaymentStats({
        totalRevenue: 4800,
        revenueChange: 12.5,
        successfulPayments: 142,
        successRate: 94.7,
        pendingPayments: 18,
        pendingAmount: 2300,
        refundedAmount: 450,
        refundCount: 3,
        byStatus: [
          { status: 'paid', count: 142, amount: 4800 },
          { status: 'pending', count: 18, amount: 2300 },
          { status: 'refunded', count: 3, amount: 450 }
        ],
        byMethod: [
          { method: 'credit_card', count: 95, amount: 3200 },
          { method: 'paypal', count: 42, amount: 1600 },
          { method: 'bank_transfer', count: 23, amount: 2300 }
        ],
        monthlyRevenue: [
          { month: 'Jan', revenue: 1200 },
          { month: 'Feb', revenue: 1800 },
          { month: 'Mar', revenue: 2400 },
          { month: 'Apr', revenue: 1900 }
        ]
      });
    }
  };

  // Filter and sort payments when any filter/sort value changes
  useEffect(() => {
    let results = [...payments];
    
    // Apply status filter
    if (filterStatus !== 'All Statuses') {
      results = results.filter(payment => payment.status === filterStatus);
    }
    
    // Apply payment method filter
    if (filterMethod !== 'All Methods') {
      results = results.filter(payment => payment.paymentMethod === filterMethod);
    }
    
    // Apply date range filter
    if (filterDateFrom) {
      results = results.filter(payment => new Date(payment.date) >= new Date(filterDateFrom));
    }
    
    if (filterDateTo) {
      results = results.filter(payment => new Date(payment.date) <= new Date(filterDateTo));
    }
    
    // Apply amount range filter
    if (filterAmountMin) {
      results = results.filter(payment => payment.amount >= parseFloat(filterAmountMin));
    }
    
    if (filterAmountMax) {
      results = results.filter(payment => payment.amount <= parseFloat(filterAmountMax));
    }
    
    // Apply search term
    if (searchTerm) {
      results = results.filter(payment => 
        payment.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.transactionId?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply sorting
    results.sort((a, b) => {
      if (sortBy === 'id') {
        return sortOrder === 'asc' 
          ? a.id.localeCompare(b.id) 
          : b.id.localeCompare(a.id);
      } else if (sortBy === 'date') {
        return sortOrder === 'asc' 
          ? new Date(a.date) - new Date(b.date) 
          : new Date(b.date) - new Date(a.date);
      } else if (sortBy === 'amount') {
        return sortOrder === 'asc' 
          ? a.amount - b.amount 
          : b.amount - a.amount;
      } else if (sortBy === 'customer') {
        return sortOrder === 'asc' 
          ? a.customerName.localeCompare(b.customerName) 
          : b.customerName.localeCompare(a.customerName);
      }
      return 0;
    });
    
    setFilteredPayments(results);
  }, [payments, searchTerm, filterStatus, filterMethod, filterDateFrom, filterDateTo, filterAmountMin, filterAmountMax, sortBy, sortOrder]);

  // Reset all filters
  const resetFilters = () => {
    setSearchTerm('');
    setFilterStatus('All Statuses');
    setFilterMethod('All Methods');
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterAmountMin('');
    setFilterAmountMax('');
    setCurrentPage(1);
  };

  // Handle sorting change
  const handleSortChange = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  // Format currency for display
  const formatCurrency = (amount, currency = 'RON') => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Get class for status display
  const getStatusClass = (status) => {
    if (!status) return '';
    
    const statusLower = status.toLowerCase();
    
    switch (statusLower) {
      case 'paid':
      case 'completed':
        return 'bg-green-500/20 text-green-400';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'failed':
      case 'cancelled':
      case 'voided':
        return 'bg-red-500/20 text-red-400';
      case 'refunded':
        return 'bg-blue-500/20 text-blue-400';
      case 'partially_refunded':
        return 'bg-indigo-500/20 text-indigo-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  // Get status color class
  const getStatusColorClass = (status) => {
    return getStatusClass(status);
  };

  // Format date for display
  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch (e) {
      return dateString || 'N/A';
    }
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Handle refund payment
  const handleRefundPayment = () => {
    setIsLoading(true);
    
    // In a real app, you would make an API call here
    setTimeout(() => {
      const isFullRefund = parseFloat(refundAmount) === (selectedPayment?.amount || 0);
      
      const newStatus = isFullRefund ? 'Refunded' : 'Partially Refunded';
      const updatedPayments = payments.map(payment => 
        payment.id === selectedPayment?.id 
          ? { 
              ...payment, 
              status: newStatus,
              refundAmount,
              refundDate: new Date().toISOString().split('T')[0],
              notes: payment.notes + (payment.notes ? '\n' : '') + `Refund processed: ${refundAmount} ${payment.currency}. Reason: ${refundReason}`
            } 
          : payment
      );
      
      setPayments(updatedPayments);
      setShowRefundModal(false);
      setRefundAmount(0);
      setRefundReason('');
      setIsLoading(false);
    }, 800);
  };

  // Generate PDF invoice (mock function)
  const generateInvoicePDF = () => {
    setIsLoading(true);
    
    // In a real app, you would make an API call here to generate the PDF
    setTimeout(() => {
      if (selectedPayment) {
        alert(`Invoice ${selectedPayment.id || 'Unknown'} has been generated and is ready for download.`);
      } else {
        alert(`Invoice has been generated and is ready for download.`);
      }
      setIsLoading(false);
      // Close modal after brief delay to show the success message
      setTimeout(() => setShowInvoiceModal(false), 500);
    }, 1000);
  };

  // Get payment method icon
  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case 'Credit Card':
        return <FaCreditCard />;
      case 'PayPal':
        return <FaMoneyBillWave />;
      case 'Bank Transfer':
        return <FaExchangeAlt />;
      default:
        return <FaFileInvoiceDollar />;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full py-20 bg-gray-900">
        <div className="loader border-t-4 border-b-4 border-blue-500 rounded-full w-12 h-12 animate-spin"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-10 bg-gray-900 text-white">
        <FaTimesCircle className="text-red-400 text-5xl mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">Error Loading Payments</h3>
        <p className="text-gray-300">{error}</p>
        <button 
          onClick={fetchPayments} 
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-5 bg-gray-900 text-white">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-2xl font-semibold text-white flex items-center">
          <FaFileInvoiceDollar className="mr-2 text-blue-500" /> Payments & Invoices
        </h2>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm text-gray-300 hover:bg-gray-700 w-full sm:w-auto justify-center sm:justify-start"
          >
            <FaFilter className="mr-2" /> {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
          <div className="relative w-full sm:w-auto">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search transactions..."
              className="pl-10 pr-4 py-2 w-full border border-gray-700 bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-200"
            />
          </div>
        </div>
      </div>

      {/* Payment Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Total Revenue Card */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 sm:p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Total Revenue</h3>
          <p className="text-2xl font-bold text-white">{formatCurrency(paymentStats.totalRevenue || 0)}</p>
          <div className="mt-2 text-xs">
            <span className={`inline-flex items-center ${paymentStats.revenueChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              <span>{paymentStats.revenueChange >= 0 ? '↑' : '↓'}</span>
              {Math.abs(paymentStats.revenueChange || 0)}% from last month
            </span>
          </div>
        </div>
        
        {/* Successful Payments Card */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 sm:p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Successful Payments</h3>
          <p className="text-2xl font-bold text-white">{paymentStats.successfulPayments || 0}</p>
          <div className="mt-2 text-xs text-gray-500">
            {paymentStats.successRate || 0}% success rate
          </div>
        </div>
        
        {/* Pending Payments Card */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 sm:p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Pending Payments</h3>
          <p className="text-2xl font-bold text-white">{paymentStats.pendingPayments || 0}</p>
          <div className="mt-2 text-xs text-gray-500">
            {formatCurrency(paymentStats.pendingAmount || 0)} total pending
          </div>
        </div>
        
        {/* Refunded Amount Card */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 sm:p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Refunded Amount</h3>
          <p className="text-2xl font-bold text-white">{formatCurrency(paymentStats.refundedAmount || 0)}</p>
          <div className="mt-2 text-xs text-gray-500">
            {paymentStats.refundCount || 0} refunds processed
          </div>
        </div>
      </div>

      {/* Filters Section */}
      {showFilters && (
        <div className="bg-gray-800 rounded-lg p-4 mb-6 border border-gray-700">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search invoices, customers, transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-md pl-10"
                />
                <FaSearch className="absolute left-3 top-3 text-gray-400" />
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-2 md:gap-4">
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-gray-700 text-white px-4 py-2 rounded-md"
              >
                {paymentStatuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              
              <select 
                value={`${sortBy}-${sortOrder}`} 
                onChange={(e) => {
                  const [newSortBy, newSortOrder] = e.target.value.split('-');
                  setSortBy(newSortBy);
                  setSortOrder(newSortOrder);
                }}
                className="bg-gray-700 text-white px-4 py-2 rounded-md"
              >
                <option value="date-desc">Date (Newest First)</option>
                <option value="date-asc">Date (Oldest First)</option>
                <option value="amount-desc">Amount (High to Low)</option>
                <option value="amount-asc">Amount (Low to High)</option>
                <option value="id-desc">Invoice # (Desc)</option>
                <option value="id-asc">Invoice # (Asc)</option>
                <option value="customer-asc">Customer Name (A-Z)</option>
                <option value="customer-desc">Customer Name (Z-A)</option>
              </select>
            </div>
          </div>
          
          {/* Advanced Filters */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-700">
            <div>
              <label className="block text-gray-300 mb-1 text-sm">Payment Method</label>
              <select 
                value={filterMethod} 
                onChange={(e) => setFilterMethod(e.target.value)}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-md"
              >
                {paymentMethods.map(method => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-gray-300 mb-1 text-sm">Date Range</label>
              <div className="flex space-x-2">
                <input
                  type="date"
                  placeholder="From"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-md"
                />
                <input
                  type="date"
                  placeholder="To"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-md"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-gray-300 mb-1 text-sm">Amount Range</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filterAmountMin}
                  onChange={(e) => setFilterAmountMin(e.target.value)}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-md"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filterAmountMax}
                  onChange={(e) => setFilterAmountMax(e.target.value)}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-md"
                />
              </div>
            </div>
            
            <div className="md:col-span-3 flex justify-end">
              <button
                onClick={resetFilters}
                className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-md flex items-center transition duration-300"
              >
                <FaTimesCircle className="mr-2" /> Reset Filters
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Payments Table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead>
              <tr className="bg-gray-750">
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  <button 
                    className="flex items-center hover:text-white focus:outline-none"
                    onClick={() => handleSortChange('invoiceNumber')}
                  >
                    Invoice
                    {sortBy === 'invoiceNumber' && (
                      <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </button>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  <button 
                    className="flex items-center hover:text-white focus:outline-none"
                    onClick={() => handleSortChange('date')}
                  >
                    Date
                    {sortBy === 'date' && (
                      <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </button>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Customer
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  <button 
                    className="flex items-center hover:text-white focus:outline-none"
                    onClick={() => handleSortChange('total')}
                  >
                    Amount
                    {sortBy === 'total' && (
                      <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </button>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  <button 
                    className="flex items-center hover:text-white focus:outline-none"
                    onClick={() => handleSortChange('status')}
                  >
                    Status
                    {sortBy === 'status' && (
                      <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </button>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  <button 
                    className="flex items-center hover:text-white focus:outline-none"
                    onClick={() => handleSortChange('paymentMethod')}
                  >
                    Method
                    {sortBy === 'paymentMethod' && (
                      <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </button>
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-10 text-center">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-blue-500"></div>
                    <p className="mt-2 text-gray-400">Loading payments data...</p>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="7" className="px-6 py-10 text-center">
                    <div className="bg-red-800/30 rounded-lg p-4 max-w-lg mx-auto">
                      <h3 className="text-xl font-semibold mb-2">Error Loading Payments</h3>
                      <p className="text-gray-300 mb-4">{error}</p>
                      <button 
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        onClick={fetchPayments}
                      >
                        Try Again
                      </button>
                    </div>
                  </td>
                </tr>
              ) : filteredPayments.length > 0 ? (
                filteredPayments.map((payment, index) => (
                  <tr key={payment.id || index} className="hover:bg-gray-750">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="font-medium text-blue-400">
                        {payment.invoiceNumber || `INV-${payment.id?.substring(0, 8) || index}`}
                      </div>
                      {payment.booking && (
                        <div className="text-xs text-gray-400">
                          {payment.booking.hotel && `${payment.booking.hotel.name || 'Booking'}`}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div>{formatDate(payment.date)}</div>
                      {payment.dueDate && (
                        <div className="text-xs text-gray-400">
                          Due: {formatDate(payment.dueDate)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="font-medium">
                        {payment.customerName || 'Unknown Customer'}
                      </div>
                      <div className="text-xs text-gray-400">
                        {payment.customerEmail}
                      </div>
                      {payment.customerId && (
                        <div className="text-xs text-gray-500">
                          ID: {payment.customerId}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                      {formatCurrency(payment.total || payment.amount, payment.currency)}
                      {payment.totalRefunded > 0 && (
                        <div className="text-xs text-orange-400">
                          {formatCurrency(payment.totalRefunded, payment.currency)} refunded
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColorClass(payment.status)}`}>
                        {payment.status?.charAt(0).toUpperCase() + payment.status?.slice(1) || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      <div className="flex items-center">
                        {getPaymentMethodIcon(payment.paymentMethod)}
                        <span className="ml-1">
                          {payment.paymentMethod?.replace('_', ' ')?.charAt(0).toUpperCase() + payment.paymentMethod?.replace('_', ' ')?.slice(1) || 'Unknown'}
                        </span>
                      </div>
                      {payment.lastFour && (
                        <div className="text-xs text-gray-400">
                          {payment.cardBrand ? payment.cardBrand + ' ' : ''}•••• {payment.lastFour}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      <div className="flex justify-end items-center space-x-3">
                        <button
                          onClick={() => {
                            setSelectedPayment(payment);
                            setShowInvoiceModal(true);
                          }}
                          className="text-gray-400 hover:text-white transition-colors"
                          title="View Invoice"
                        >
                          <FaEye />
                        </button>
                        <button
                          onClick={() => generateInvoicePDF(payment.id)}
                          className="text-gray-400 hover:text-white transition-colors"
                          title="Download Invoice"
                        >
                          <FaDownload />
                        </button>
                        {payment.status === 'paid' && (
                          <button
                            onClick={() => {
                              setSelectedPayment(payment);
                              setRefundAmount(payment.total);
                              setShowRefundModal(true);
                            }}
                            className="text-gray-400 hover:text-white transition-colors"
                            title="Process Refund"
                          >
                            <FaUndoAlt />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-10 text-center text-gray-400">
                    No payments found matching your criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        <div className="px-5 py-5 bg-gray-750 border-t border-gray-700 flex flex-col xs:flex-row items-center xs:justify-between">
          <div className="text-xs xs:text-sm text-gray-400">
            Showing <span className="font-medium text-gray-200">{filteredPayments.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to <span className="font-medium text-gray-200">{Math.min(currentPage * pageSize, payments.length || 0)}</span> of <span className="font-medium text-gray-200">{payments.length || 0}</span> payments
          </div>
          <div className="mt-2 xs:mt-0 flex items-center space-x-1">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-4 py-2 text-sm rounded-md transition ${
                currentPage === 1 ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-gray-800 text-white hover:bg-gray-700'
              }`}
            >
              Previous
            </button>
            
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              // Show current page and surrounding pages
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`w-10 h-10 text-sm rounded-md transition ${
                    currentPage === pageNum ? 'bg-blue-600 text-white' : 'bg-gray-800 text-white hover:bg-gray-700'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`px-4 py-2 text-sm rounded-md transition ${
                currentPage === totalPages ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-gray-800 text-white hover:bg-gray-700'
              }`}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* View Invoice Modal */}
      {showInvoiceModal && selectedPayment && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen">
            <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" aria-hidden="true"></div>
            
            <div className="relative bg-gray-800 rounded-lg max-w-4xl w-full mx-4 shadow-xl">
              <div className="absolute top-0 right-0 pt-4 pr-4">
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <FaTimes className="h-6 w-6" />
                </button>
              </div>
              
              {/* Invoice Header */}
              <div className="p-6 border-b border-gray-700">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                  <div>
                    <h3 className="text-2xl font-bold text-white" id="modal-title">
                      Invoice {selectedPayment.id || 'Unknown'}
                    </h3>
                    <p className="text-gray-400 mt-1">
                      Issued on {format(new Date(selectedPayment.date || new Date()), 'MMMM d, yyyy')}
                    </p>
                  </div>
                  <div className="mt-4 md:mt-0 flex space-x-3">
                    <button 
                      onClick={generateInvoicePDF}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md flex items-center transition duration-300"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </span>
                      ) : (
                        <>
                          <FaDownload className="mr-2" /> Download PDF
                        </>
                      )}
                    </button>
                    <button 
                      onClick={generateInvoicePDF}
                      className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-md flex items-center transition duration-300"
                    >
                      <FaPrint className="mr-2" /> Print
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Invoice Content */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div>
                    <h4 className="text-gray-400 font-medium mb-2">Billed To:</h4>
                    <p className="text-white font-medium">{selectedPayment.customerName || 'Unknown Customer'}</p>
                    <p className="text-gray-300">{selectedPayment.customerEmail || 'No email provided'}</p>
                    <p className="text-gray-300">Customer ID: {selectedPayment.customerId || 'Unknown'}</p>
                  </div>
                  <div className="md:text-right">
                    <h4 className="text-gray-400 font-medium mb-2">Payment Details:</h4>
                    <p className="text-white">
                      <span className={`inline-flex px-2 py-1 text-xs leading-5 font-semibold rounded-full ${getStatusColorClass(selectedPayment.status)}`}>
                        {selectedPayment.status || 'Unknown'}
                      </span>
                    </p>
                    <p className="text-gray-300 mt-2">
                      <span className="flex items-center md:justify-end">
                        {getPaymentMethodIcon(selectedPayment.paymentMethod)}
                        <span className="ml-2">{selectedPayment.paymentMethod || 'Unknown'}</span>
                        {selectedPayment.lastFour && <span className="ml-1">(*{selectedPayment.lastFour})</span>}
                      </span>
                    </p>
                    {selectedPayment.transactionId && (
                      <p className="text-gray-300">Transaction ID: {selectedPayment.transactionId}</p>
                    )}
                    {selectedPayment.refundId && (
                      <p className="text-gray-300">Refund ID: {selectedPayment.refundId}</p>
                    )}
                  </div>
                </div>
                
                {/* Invoice Items */}
                <div className="border border-gray-700 rounded-lg overflow-hidden mb-6">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-900">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Item</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Quantity</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Unit Price</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Total</th>
                      </tr>
                    </thead>
                    <tbody className="bg-gray-800 divide-y divide-gray-700">
                      {selectedPayment.items?.map((item) => (
                        <tr key={item.id}>
                          <td className="px-6 py-4 text-sm text-white">{item.description}</td>
                          <td className="px-6 py-4 text-sm text-white text-right">{item.quantity}</td>
                          <td className="px-6 py-4 text-sm text-white text-right">{formatCurrency(item.unitPrice, selectedPayment.currency)}</td>
                          <td className="px-6 py-4 text-sm text-white text-right">{formatCurrency(item.quantity * item.unitPrice, selectedPayment.currency)}</td>
                        </tr>
                      )) || <tr><td colSpan="4" className="px-6 py-4 text-sm text-gray-400 text-center">No items available</td></tr>}
                    </tbody>
                    <tfoot className="bg-gray-900">
                      <tr>
                        <td colSpan="3" className="px-6 py-3 text-right text-sm font-medium text-gray-300">Total</td>
                        <td className="px-6 py-3 text-right text-sm font-bold text-white">{formatCurrency(selectedPayment.amount || 0, selectedPayment.currency || 'USD')}</td>
                      </tr>
                      {selectedPayment.refundAmount > 0 && (
                        <tr>
                          <td colSpan="3" className="px-6 py-3 text-right text-sm font-medium text-gray-300">Refunded</td>
                          <td className="px-6 py-3 text-right text-sm font-bold text-red-400">-{formatCurrency(selectedPayment.refundAmount, selectedPayment.currency || 'USD')}</td>
                        </tr>
                      )}
                    </tfoot>
                  </table>
                </div>
                
                {/* Notes */}
                {selectedPayment.notes && (
                  <div className="mb-6">
                    <h4 className="text-gray-400 font-medium mb-2">Notes:</h4>
                    <div className="bg-gray-700 rounded-lg p-4 text-gray-200">
                      {selectedPayment.notes.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                    </div>
                  </div>
                )}
                
                {/* Payment Timeline */}
                <div>
                  <h4 className="text-gray-400 font-medium mb-2">Payment Timeline:</h4>
                  <div className="relative pb-8">
                    <div className="absolute h-full w-0.5 bg-gray-700 left-3.5"></div>
                    
                    <div className="relative flex items-start mb-4">
                      <div className="h-8 w-8 rounded-full bg-blue-900 text-blue-200 flex items-center justify-center z-10">
                        <FaFileInvoiceDollar className="h-4 w-4" />
                      </div>
                      <div className="ml-4">
                        <p className="text-white">{format(new Date(selectedPayment.date || new Date()), 'MMMM d, yyyy')}</p>
                        <p className="text-sm text-gray-400">Invoice created and sent to customer</p>
                      </div>
                    </div>
                    
                    {selectedPayment.status !== 'Pending' && selectedPayment.status !== 'Overdue' && (
                      <div className="relative flex items-start mb-4">
                        <div className="h-8 w-8 rounded-full bg-green-900 text-green-200 flex items-center justify-center z-10">
                          <FaCheckCircle className="h-4 w-4" />
                        </div>
                        <div className="ml-4">
                          <p className="text-white">{format(new Date(selectedPayment.date || new Date()), 'MMMM d, yyyy')}</p>
                          <p className="text-sm text-gray-400">Payment received via {selectedPayment.paymentMethod || 'Unknown method'}</p>
                        </div>
                      </div>
                    )}
                    
                    {(selectedPayment.status === 'Refunded' || selectedPayment.status === 'Partially Refunded') && (
                      <div className="relative flex items-start">
                        <div className="h-8 w-8 rounded-full bg-purple-900 text-purple-200 flex items-center justify-center z-10">
                          <FaUndoAlt className="h-4 w-4" />
                        </div>
                        <div className="ml-4">
                          <p className="text-white">{format(new Date(selectedPayment.refundDate || new Date()), 'MMMM d, yyyy')}</p>
                          <p className="text-sm text-gray-400">
                            {selectedPayment.status === 'Refunded' ? 'Full refund' : 'Partial refund'} of {formatCurrency(selectedPayment.refundAmount || selectedPayment.amount || 0, selectedPayment.currency || 'USD')} processed
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal && selectedPayment && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen">
            <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" aria-hidden="true"></div>
            
            <div className="relative bg-gray-800 rounded-lg max-w-md w-full mx-4 shadow-xl">
              <div className="absolute top-0 right-0 pt-4 pr-4">
                <button
                  onClick={() => setShowRefundModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <FaTimes className="h-6 w-6" />
                </button>
              </div>
              
              <div className="p-6">
                <div className="flex items-center mb-6">
                  <div className="p-3 rounded-full bg-purple-900 text-purple-200">
                    <FaUndoAlt className="h-6 w-6" />
                  </div>
                  <h3 className="ml-4 text-xl font-bold text-white" id="modal-title">
                    Process Refund
                  </h3>
                </div>
                
                <div className="mb-6">
                  <p className="text-gray-300 mb-4">
                    You are processing a refund for invoice <span className="font-medium text-white">{selectedPayment?.id || 'Unknown'}</span> ({selectedPayment?.customerName || 'Unknown Customer'}).
                  </p>
                  
                  <div className="bg-gray-700 rounded-lg p-4 mb-4">
                    <div className="text-sm text-gray-400">Original Amount:</div>
                    <div className="text-lg font-medium text-white">{formatCurrency(selectedPayment?.amount || 0, selectedPayment?.currency || 'USD')}</div>
                    
                    {selectedPayment && selectedPayment.refundAmount > 0 && (
                      <>
                        <div className="text-sm text-gray-400 mt-2">Already Refunded:</div>
                        <div className="text-lg font-medium text-red-400">{formatCurrency(selectedPayment.refundAmount, selectedPayment.currency)}</div>
                      </>
                    )}
                  </div>
                </div>
                
                <form>
                  <div className="mb-4">
                    <label className="block text-gray-300 mb-2">Refund Amount</label>
                    <input
                      type="number"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(Math.min(
                        selectedPayment && selectedPayment.status === 'Partially Refunded' 
                          ? (selectedPayment.amount - selectedPayment.refundAmount) || 0
                          : selectedPayment?.amount || 0,
                        e.target.value
                      ))}
                      max={selectedPayment && selectedPayment.status === 'Partially Refunded' 
                        ? (selectedPayment.amount - selectedPayment.refundAmount) || 0
                        : selectedPayment?.amount || 0}
                      min={0.01}
                      step={0.01}
                      className="w-full bg-gray-700 text-white px-4 py-2 rounded-md"
                      required
                    />
                    <div className="text-sm text-gray-400 mt-1">
                      Maximum refund: {formatCurrency(
                        selectedPayment && selectedPayment.status === 'Partially Refunded' 
                          ? (selectedPayment.amount - selectedPayment.refundAmount) || 0
                          : selectedPayment?.amount || 0,
                        selectedPayment?.currency || 'USD'
                      )}
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <label className="block text-gray-300 mb-2">Reason for Refund</label>
                    <textarea
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      className="w-full bg-gray-700 text-white px-4 py-2 rounded-md"
                      rows="3"
                      required
                    ></textarea>
                  </div>
                  
                  <div className="bg-yellow-900 bg-opacity-30 text-yellow-200 p-4 rounded-lg mb-6">
                    <div className="flex items-start">
                      <FaInfoCircle className="h-5 w-5 mr-2 mt-0.5" />
                      <p className="text-sm">
                        This action cannot be undone. The customer will be notified automatically when the refund is processed.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowRefundModal(false)}
                      className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleRefundPayment}
                      disabled={!refundAmount || !refundReason || isLoading}
                      className={`px-4 py-2 rounded-md flex items-center transition-colors ${
                        !refundAmount || !refundReason || isLoading
                          ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                          : 'bg-red-600 hover:bg-red-500 text-white'
                      }`}
                    >
                      {isLoading ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </span>
                      ) : (
                        <>
                          <FaCheckCircle className="mr-2" /> Process Refund
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentsInvoicesManagement;