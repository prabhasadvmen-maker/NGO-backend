import axios from 'axios';

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_FROM_EMAIL = process.env.BREVO_FROM_EMAIL;
const BREVO_FROM_NAME = process.env.BREVO_FROM_NAME || 'SAVITRAM FOUNDATION';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://savitramfoundation.org';

const brevoClient = axios.create({
  baseURL: 'https://api.brevo.com/v3',
  headers: {
    'api-key': BREVO_API_KEY,
    'Content-Type': 'application/json',
  },
});

export const sendDonationReceipt = async (donationData) => {
  try {
    if (!donationData.donorEmail) {
      console.warn('⚠️ No donor email provided, skipping receipt email');
      return { success: false, message: 'No email provided' };
    }

    const {
      donorName,
      donorEmail,
      amount,
      receiptNumber,
      transactionId,
      purpose,
      donationDate,
    } = donationData;

    const formattedDate = new Date(donationDate).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const emailContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 28px; }
    .header p { margin: 5px 0 0 0; font-size: 14px; opacity: 0.9; }
    .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 8px 8px; }
    .receipt-box { background: white; padding: 20px; border-left: 4px solid #1B5E20; margin: 20px 0; }
    .receipt-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    .receipt-row:last-child { border-bottom: none; }
    .receipt-label { font-weight: bold; color: #666; }
    .receipt-value { color: #1B5E20; font-weight: bold; }
    .amount-box { background: #1B5E20; color: white; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
    .amount-box .label { font-size: 14px; opacity: 0.9; }
    .amount-box .value { font-size: 36px; font-weight: bold; margin: 10px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    .button { display: inline-block; background: #1B5E20; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .thank-you { color: #1B5E20; font-size: 18px; font-weight: bold; text-align: center; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Donation Receipt</h1>
      <p>Thank you for your generous contribution</p>
    </div>
    
    <div class="content">
      <p>Dear <strong>${donorName}</strong>,</p>
      
      <p>We are deeply grateful for your donation to SAVITRAM FOUNDATION. Your contribution will make a meaningful impact on the lives of those we serve.</p>
      
      <div class="receipt-box">
        <div class="receipt-row">
          <span class="receipt-label">Receipt Number:</span>
          <span class="receipt-value">${receiptNumber}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Transaction ID:</span>
          <span class="receipt-value">${transactionId}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Donation Date:</span>
          <span class="receipt-value">${formattedDate}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Purpose:</span>
          <span class="receipt-value">${purpose}</span>
        </div>
      </div>
      
      <div class="amount-box">
        <div class="label">Donation Amount</div>
        <div class="value">₹${amount.toLocaleString('en-IN')}</div>
      </div>
      
      <div class="thank-you">
        Your generosity will help us continue our mission of healthcare, education, and community development.
      </div>
      
      <p style="text-align: center;">
        <a href="${FRONTEND_URL}/donate" class="button">Make Another Donation</a>
      </p>
      
      <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
      
      <p><strong>Impact of Your Donation:</strong></p>
      <ul>
        <li>₹500 - Provides basic health checkup for 5 children</li>
        <li>₹1000 - Supplies educational materials for 10 students</li>
        <li>₹2000 - Supports clean water initiative for a village</li>
        <li>₹5000+ - Funds comprehensive healthcare camp</li>
      </ul>
      
      <p>For any queries, please contact us at <strong>Support.savitramfoundation@gmail.com</strong> or call <strong>8860036008</strong></p>
      
      <div class="footer">
        <p>SAVITRAM FOUNDATION | Empowering Lives, Building Futures</p>
        <p>A-13, GRAPHIX 2 SECTOR 62, Noida, Uttar Pradesh - 201301</p>
        <p>This is an automated email. Please do not reply to this email.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    const response = await brevoClient.post('/smtp/email', {
      sender: {
        name: BREVO_FROM_NAME,
        email: BREVO_FROM_EMAIL,
      },
      to: [
        {
          email: donorEmail,
          name: donorName,
        },
      ],
      subject: `Donation Receipt - ${receiptNumber} | SAVITRAM FOUNDATION`,
      htmlContent: emailContent,
      replyTo: {
        email: BREVO_FROM_EMAIL,
        name: BREVO_FROM_NAME,
      },
    });

    console.log(`✅ Donation receipt email sent to ${donorEmail}`);
    return { success: true, messageId: response.data.messageId };
  } catch (error) {
    console.error('❌ Error sending donation receipt email:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
};

export const sendAdminNotification = async (donationData) => {
  try {
    const adminEmail = process.env.BREVO_FROM_EMAIL;
    const {
      donorName,
      donorEmail,
      amount,
      receiptNumber,
      transactionId,
      purpose,
    } = donationData;

    const emailContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1B5E20; color: white; padding: 20px; text-align: center; border-radius: 5px; }
    .content { background: #f9f9f9; padding: 20px; margin-top: 20px; border-radius: 5px; }
    .detail { padding: 10px; border-bottom: 1px solid #ddd; }
    .detail:last-child { border-bottom: none; }
    .label { font-weight: bold; color: #666; }
    .value { color: #1B5E20; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>🎉 New Donation Received</h2>
    </div>
    
    <div class="content">
      <h3>Donation Details:</h3>
      
      <div class="detail">
        <span class="label">Donor Name:</span>
        <span class="value">${donorName}</span>
      </div>
      
      <div class="detail">
        <span class="label">Donor Email:</span>
        <span class="value">${donorEmail || 'Not provided'}</span>
      </div>
      
      <div class="detail">
        <span class="label">Amount:</span>
        <span class="value">₹${amount.toLocaleString('en-IN')}</span>
      </div>
      
      <div class="detail">
        <span class="label">Purpose:</span>
        <span class="value">${purpose}</span>
      </div>
      
      <div class="detail">
        <span class="label">Receipt Number:</span>
        <span class="value">${receiptNumber}</span>
      </div>
      
      <div class="detail">
        <span class="label">Transaction ID:</span>
        <span class="value">${transactionId}</span>
      </div>
      
      <p style="margin-top: 20px; padding: 15px; background: #fff3cd; border-radius: 5px;">
        <strong>Action Required:</strong> Please verify this donation in the admin dashboard and update the donation records if needed.
      </p>
    </div>
  </div>
</body>
</html>
    `;

    const response = await brevoClient.post('/smtp/email', {
      sender: {
        name: BREVO_FROM_NAME,
        email: BREVO_FROM_EMAIL,
      },
      to: [
        {
          email: adminEmail,
          name: 'Admin',
        },
      ],
      subject: `New Donation: ₹${amount} | ${receiptNumber}`,
      htmlContent: emailContent,
    });

    console.log(`✅ Admin notification sent for donation ${receiptNumber}`);
    return { success: true, messageId: response.data.messageId };
  } catch (error) {
    console.error('❌ Error sending admin notification:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
};

export default {
  sendDonationReceipt,
  sendAdminNotification,
};
