/**
 * Invoice Generator Utility
 * Provides functionality for generating invoices for payments and bookings
 */

/**
 * Generate invoice data from payment information
 * @param {Object} payment - The payment object with populated user and booking
 * @returns {Object} Formatted invoice data
 */
exports.generateInvoice = async (payment) => {
  if (!payment) {
    throw new Error('Payment data is required to generate invoice');
  }
  
  // Format payment data for invoice
  const formattedInvoice = {
    invoiceNumber: payment.invoiceNumber,
    transactionId: payment.transactionId || 'N/A',
    customer: {
      name: payment.user ? 
        `${payment.user.firstName || ''} ${payment.user.lastName || ''}`.trim() : 
        'Unknown Customer',
      email: payment.user?.email || 'No email'
    },
    dateIssued: new Date(payment.issueDate || payment.createdAt).toLocaleDateString(),
    datePaid: payment.paidDate ? new Date(payment.paidDate).toLocaleDateString() : 'Unpaid',
    dueDate: new Date(payment.dueDate).toLocaleDateString(),
    items: payment.items?.map(item => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice.toFixed(2),
      total: item.total.toFixed(2)
    })) || [],
    subtotal: payment.subtotal.toFixed(2),
    tax: payment.tax.toFixed(2),
    discount: payment.discount.toFixed(2),
    total: payment.total.toFixed(2),
    status: payment.status.toUpperCase(),
    notes: payment.notes || ''
  };
  
  // Add booking information if available
  if (payment.booking) {
    formattedInvoice.booking = {
      id: payment.booking._id,
      hotel: payment.booking.hotel?.name || 'N/A',
      location: payment.booking.hotel?.location || 'N/A',
      checkIn: payment.booking.checkIn ? new Date(payment.booking.checkIn).toLocaleDateString() : 'N/A',
      checkOut: payment.booking.checkOut ? new Date(payment.booking.checkOut).toLocaleDateString() : 'N/A'
    };
  }
  
  console.log(`Generated invoice data for payment ${payment._id}`);
  
  return formattedInvoice;
};

/**
 * Generate a PDF invoice (placeholder function)
 * @param {Object} payment - The payment object
 * @returns {Buffer} PDF buffer data
 */
exports.generateInvoicePdf = async (payment) => {
  // In a real implementation, this would use a PDF library like PDFKit
  // For now, just return a placeholder message
  console.log(`Invoice PDF generation would happen here for payment ${payment._id}`);
  
  // Return a placeholder
  return {
    success: true,
    message: 'Invoice PDF generation functionality will be implemented in the future',
    invoiceData: await exports.generateInvoice(payment)
  };
}; 