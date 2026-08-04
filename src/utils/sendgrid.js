import { dispatchBulkCommunication } from './communication.js';
import { sendFoodDonationWelcomeEmail } from '../shared/services/emailService.js';

/**
 * Send Food Donation Confirmation Email to Donor
 * @param {object} donation - FoodDonation Mongoose doc or object
 */
export async function sendDonationReceivedEmail(donation) {
  try {
    // 1. Send real Brevo HTML Welcome Email to Donor
    await sendFoodDonationWelcomeEmail(donation);

    // 2. Also log to communication inbox
    const subject = `AnnDan Food Donation Received [${donation.donationId}]`;
    const trackingUrl = `${process.env.CLIENT_URL || 'https://savitramfoundation.org'}/food-donation/track/${donation.donationId}`;
    
    const message = `
      Hello ${donation.donorName},

      Thank you for offering your food donation with Savitram Foundation's AnnDan Initiative!

      Donation Details:
      - Tracking ID: ${donation.donationId}
      - Food Type: ${donation.foodType}
      - Quantity: ${donation.quantity}
      - Pickup Address: ${donation.pickupAddress}, ${donation.city}
      - Pickup Time Window: ${donation.pickupTimeWindow}

      Our team is verifying the donation details and matching a nearby volunteer for pickup.
      Track your donation status live here: ${trackingUrl}

      Warm regards,
      Savitram Foundation AnnDan Team
    `;

    await dispatchBulkCommunication(
      {
        type: 'Email',
        subject,
        message,
        recipientType: 'Donor',
      },
      [{ name: donation.donorName, email: donation.donorEmail, mobile: donation.donorPhone }]
    );
  } catch (err) {
    console.error('Error sending donation received email:', err);
  }
}

/**
 * Send Status Update Email to Donor
 * @param {object} donation 
 * @param {string} status 
 * @param {string} notes 
 */
export async function sendDonationStatusUpdateEmail(donation, status, notes = '') {
  const subject = `Update on Food Donation [${donation.donationId}]: ${status}`;
  const trackingUrl = `${process.env.CLIENT_URL || 'https://savitramfoundation.org'}/food-donation/track/${donation.donationId}`;

  const message = `
    Hello ${donation.donorName},

    Your AnnDan food donation status has been updated to: ${status.toUpperCase()}.

    ${notes ? `Notes from our team: ${notes}` : ''}

    Track real-time updates and view collection/distribution photos here:
    ${trackingUrl}

    Thank you for feeding lives!
    Savitram Foundation AnnDan Team
  `;

  await dispatchBulkCommunication(
    {
      type: 'Email',
      subject,
      message,
      recipientType: 'Donor',
    },
    [{ name: donation.donorName, email: donation.donorEmail, mobile: donation.donorPhone }]
  );
}

/**
 * Send Volunteer Assignment Alert
 * @param {object} donation 
 * @param {object} volunteer 
 */
export async function sendVolunteerAssignmentNotification(donation, volunteer) {
  const subject = `New Food Donation Pickup Assignment [${donation.donationId}]`;
  const message = `
    Hello ${volunteer.fullName || 'Volunteer'},

    You have been assigned to collect an AnnDan food donation!

    Pickup Details:
    - Tracking ID: ${donation.donationId}
    - Donor Name: ${donation.donorName}
    - Phone: ${donation.donorPhone}
    - Address: ${donation.pickupAddress}, ${donation.city}
    - Time Window: ${donation.pickupTimeWindow}
    - Food Details: ${donation.foodType} (${donation.quantity})

    Please log in to your Volunteer Dashboard to accept the pickup and upload proof photos.

    Savitram Foundation AnnDan Operations
  `;

  await dispatchBulkCommunication(
    {
      type: 'Email',
      subject,
      message,
      recipientType: 'Volunteer',
    },
    [{ name: volunteer.fullName || 'Volunteer', email: volunteer.email || '', mobile: volunteer.mobileNumber || '' }]
  );
}

/**
 * Send Final Thank You Email to Donor with Impact Metrics
 * @param {object} donation 
 */
export async function sendThankYouImpactEmail(donation) {
  const subject = `Impact Certificate: Your AnnDan Donation Nourished ${donation.actualPeopleServed || donation.estimatedPeopleServed || 20} People!`;
  const message = `
    Dear ${donation.donorName},

    We are thrilled to inform you that your food donation (${donation.donationId}) has been successfully collected and distributed to beneficiaries!

    🌟 Impact Summary:
    - People Fed: ${donation.actualPeopleServed || donation.estimatedPeopleServed || 20}
    - Quantity Saved: ${donation.actualQuantityCollected || donation.quantity}
    - Completed Date: ${new Date().toLocaleDateString('en-IN')}

    Thank you for fighting hunger and reducing food waste with Savitram Foundation. You are a true hero!

    With deep gratitude,
    Savitram Foundation Board
  `;

  await dispatchBulkCommunication(
    {
      type: 'Email',
      subject,
      message,
      recipientType: 'Donor',
    },
    [{ name: donation.donorName, email: donation.donorEmail, mobile: donation.donorPhone }]
  );
}
