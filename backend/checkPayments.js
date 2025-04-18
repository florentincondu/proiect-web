const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkPayments() {
  try {
    console.log('Connecting to MongoDB...');
    const client = await MongoClient.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const db = client.db();
    

    const totalPayments = await db.collection('payments').countDocuments();
    console.log(`Total payments in database: ${totalPayments}`);
    

    const paidPayments = await db.collection('payments').find({
      status: { $in: ['paid', 'partially_refunded'] }
    }).toArray();
    
    console.log(`Payments with 'paid' or 'partially_refunded' status: ${paidPayments.length}`);
    
    if (paidPayments.length > 0) {
      console.log('Sample payment:', JSON.stringify(paidPayments[0], null, 2));
    } else {
      console.log('No paid payments found in the database');
    }
    
    await client.close();
    console.log('Connection closed');
  } catch (err) {
    console.error('Error:', err);
  }
}

checkPayments(); 