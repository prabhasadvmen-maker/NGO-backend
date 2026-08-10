import axios from 'axios';

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

const sendEmail = async (to, subject, htmlContent) => {
  try {
    const apiKey = process.env.BREVO_API_KEY;
    const fromEmail = process.env.BREVO_FROM_EMAIL || 'Sanagoyal32@gmail.com';
    const fromName = process.env.BREVO_FROM_NAME || 'SAVITRAM FOUNDATION';

    if (!apiKey) {
      console.warn('⚠️ BREVO_API_KEY not configured in environment');
      return false;
    }

    const response = await axios.post(
      BREVO_API_URL,
      {
        sender: {
          name: fromName,
          email: fromEmail,
        },
        to: Array.isArray(to) ? to.map(email => ({ email })) : [{ email: to }],
        subject,
        htmlContent,
      },
      {
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ Brevo Email sent successfully:', response.data);
    return true;
  } catch (error) {
    console.error('Error sending email:', error.response?.data || error.message);
    return false;
  }
};

export const sendVolunteerRegistrationEmail = async (volunteer) => {
  const subject = 'Welcome to Savitram Foundation - Volunteer Registration';
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #1B5E20; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0;">Savitram Foundation</h1>
        <p style="margin: 5px 0 0 0;">Volunteer Portal</p>
      </div>
      <div style="padding: 30px; background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 0 0 8px 8px;">
        <h2 style="color: #1B5E20;">Welcome, ${volunteer.fullName}!</h2>
        <p>Thank you for registering as a volunteer with Savitram Foundation.</p>
        <div style="background-color: white; padding: 20px; border-left: 4px solid #1B5E20; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1B5E20;">Your Registration Details:</h3>
          <p><strong>Volunteer ID:</strong> ${volunteer.volunteerId}</p>
          <p><strong>Name:</strong> ${volunteer.fullName}</p>
          <p><strong>Email:</strong> ${volunteer.email}</p>
          <p><strong>Mobile:</strong> ${volunteer.mobileNumber}</p>
          <p><strong>Status:</strong> <span style="color: #D29C00; font-weight: bold;">Pending Approval</span></p>
        </div>
        <p style="color: #666; font-size: 14px;">Your registration is under review. You will receive an email once approved.</p>
        <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
          Contact: +91 88600 36008 | info@savitramfoundation.org
        </p>
      </div>
    </div>
  `;
  return sendEmail(volunteer.email, subject, htmlContent);
};

export const sendVolunteerApprovalEmail = async (volunteer) => {
  const subject = '🎉 Your Volunteer Account is Approved!';
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #1B5E20; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0;">✅ Account Approved!</h1>
      </div>
      <div style="padding: 30px; background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 0 0 8px 8px;">
        <h2 style="color: #1B5E20;">Great News, ${volunteer.fullName}!</h2>
        <p>Your volunteer account has been approved! You can now login to the Savitram Foundation Volunteer Portal.</p>
        <div style="background-color: #e8f5e9; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #4CAF50;">
          <h3 style="margin-top: 0; color: #1B5E20;">🚀 Get Started:</h3>
          <p><strong>Email:</strong> ${volunteer.email}</p>
          <p><strong>Password:</strong> Last 4 digits of mobile + "Savitram"</p>
        </div>
        <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
          Contact: +91 88600 36008
        </p>
      </div>
    </div>
  `;
  return sendEmail(volunteer.email, subject, htmlContent);
};

export const sendVolunteerRejectionEmail = async (volunteer) => {
  const subject = 'Savitram Foundation - Volunteer Application Status';
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #1B5E20; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0;">Application Status Update</h1>
      </div>
      <div style="padding: 30px; background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 0 0 8px 8px;">
        <h2 style="color: #1B5E20;">Hello ${volunteer.fullName},</h2>
        <p>Thank you for your interest. Your volunteer registration has been deactivated.</p>
        <p style="color: #666; font-size: 14px;">If you believe this is an error, please contact our team.</p>
        <div style="background-color: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #f5c6cb;">
          <p style="margin: 0; color: #721c24; font-size: 14px;">
            <strong>📞 Contact:</strong> +91 88600 36008 | info@savitramfoundation.org
          </p>
        </div>
      </div>
    </div>
  `;
  return sendEmail(volunteer.email, subject, htmlContent);
};

export const sendAdminNewVolunteerNotification = async (volunteer, adminEmail) => {
  const subject = `New Volunteer Registration - ${volunteer.fullName}`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #1B5E20; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0;">New Volunteer Registration</h1>
      </div>
      <div style="padding: 30px; background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 0 0 8px 8px;">
        <p>A new volunteer has registered and is awaiting approval.</p>
        <div style="background-color: white; padding: 20px; border-left: 4px solid #1B5E20; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1B5E20;">Volunteer Details:</h3>
          <p><strong>Name:</strong> ${volunteer.fullName}</p>
          <p><strong>Email:</strong> ${volunteer.email}</p>
          <p><strong>Mobile:</strong> ${volunteer.mobileNumber}</p>
          <p><strong>Branch:</strong> ${volunteer.branch?.name || 'Not assigned'}</p>
          <p><strong>Availability:</strong> ${volunteer.availability}</p>
          <p><strong>Skills:</strong> ${volunteer.skills?.join(', ') || 'Not specified'}</p>
        </div>
        <p style="color: #666; font-size: 14px;">Please review and approve or reject this registration.</p>
      </div>
    </div>
  `;
  return sendEmail(adminEmail, subject, htmlContent);
};

export const sendFoodDonationWelcomeEmail = async (donation) => {
  const subject = `💚 Thank You for Your Food Donation! [ID: ${donation.donationId}]`;
  const clientUrl = process.env.CLIENT_URL || 'https://savitramfoundation.org';
  const trackingUrl = `${clientUrl}/food-donation/track/${donation.donationId}`;
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
      <div style="background-color: #1B5E20; color: white; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">🍲 Savitram Foundation</h1>
        <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">AnnDan Surplus Food Rescue Initiative</p>
      </div>

      <div style="padding: 24px; color: #1e293b;">
        <h2 style="color: #1B5E20; margin-top: 0;">Welcome & Thank You, ${donation.donorName}!</h2>
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">
          We have successfully received your food donation request. Your generous contribution helps us feed hungry individuals and eliminate food waste in our community.
        </p>

        <div style="background-color: #f0fdf4; border-left: 4px solid #1B5E20; padding: 18px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 12px 0; color: #1B5E20; font-size: 16px;">📋 Donation Summary:</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 4px 0; color: #64748b; font-weight: bold;">Tracking ID:</td>
              <td style="padding: 4px 0; color: #0f172a; font-weight: bold; text-align: right;">${donation.donationId}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b; font-weight: bold;">Food Category:</td>
              <td style="padding: 4px 0; color: #0f172a; text-align: right;">${donation.foodType}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b; font-weight: bold;">Quantity:</td>
              <td style="padding: 4px 0; color: #0f172a; text-align: right;">${donation.quantity}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b; font-weight: bold;">Est. People Fed:</td>
              <td style="padding: 4px 0; color: #1B5E20; font-weight: bold; text-align: right;">~${donation.estimatedPeopleServed || 'N/A'} meals</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b; font-weight: bold;">Pickup Address:</td>
              <td style="padding: 4px 0; color: #0f172a; text-align: right;">${donation.pickupAddress}, ${donation.city}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b; font-weight: bold;">Time Window:</td>
              <td style="padding: 4px 0; color: #0f172a; text-align: right;">${donation.pickupTimeWindow}</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 14px; color: #475569;">
          Our volunteer team is verifying the request and assigning a nearby volunteer to pick up your food surplus during your preferred window.
        </p>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${trackingUrl}" style="background-color: #1B5E20; color: white; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 15px; display: inline-block;">
            📍 Track Your Donation Live
          </a>
        </div>

        <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">
          <strong>Next Steps:</strong>
          <ul style="margin: 8px 0 0 0; padding-left: 20px;">
            <li>A volunteer will contact you at <strong>${donation.donorPhone}</strong> before arrival.</li>
            <li>Please keep the food stored safely according to food safety guidelines.</li>
          </ul>
        </div>
      </div>

      <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0;">Savitram Foundation | AnnDan Food Rescue</p>
        <p style="margin: 4px 0 0 0;">📞 +91 88600 36008 | 📧 info@savitramfoundation.org</p>
      </div>
    </div>
  `;

  return sendEmail(donation.donorEmail, subject, htmlContent);
};

export const sendDonationCompletionEmail = async (donation) => {
  const subject = `🎉 Your Food Donation Has Been Successfully Distributed!`;
  const trackingUrl = `${process.env.CLIENT_URL || 'https://savitramfoundation.org'}/food-donation/track/${donation.donationId}`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #1B5E20; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0;">✅ Donation Completed!</h1>
        <p style="margin: 5px 0 0 0;">AnnDan Surplus Food Rescue</p>
      </div>
      <div style="padding: 30px; background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 0 0 8px 8px;">
        <h2 style="color: #1B5E20;">Dear ${donation.donorName},</h2>
        <p style="font-size: 16px; color: #333;">We are thrilled to inform you that your food donation has been successfully collected and distributed to those in need!</p>
        
        <div style="background-color: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4CAF50;">
          <h3 style="margin-top: 0; color: #1B5E20; text-align: center;">🌟 Impact Summary</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; text-align: center;">
            <div>
              <p style="margin: 0; font-size: 12px; color: #666; text-transform: uppercase; font-weight: bold;">People Fed</p>
              <p style="margin: 5px 0 0 0; font-size: 28px; color: #1B5E20; font-weight: bold;">${donation.actualPeopleServed || donation.estimatedPeopleServed || 0}</p>
            </div>
            <div>
              <p style="margin: 0; font-size: 12px; color: #666; text-transform: uppercase; font-weight: bold;">Quantity Saved</p>
              <p style="margin: 5px 0 0 0; font-size: 28px; color: #1B5E20; font-weight: bold;">${donation.actualQuantityCollected || donation.quantity}</p>
            </div>
          </div>
        </div>

        <div style="background-color: white; padding: 20px; border-left: 4px solid #1B5E20; margin: 20px 0; border-radius: 5px;">
          <h3 style="margin-top: 0; color: #1B5E20;">Donation Details:</h3>
          <p style="margin: 8px 0;"><strong>Tracking ID:</strong> ${donation.donationId}</p>
          <p style="margin: 8px 0;"><strong>Food Type:</strong> ${donation.foodType}</p>
          <p style="margin: 8px 0;"><strong>Pickup Location:</strong> ${donation.pickupAddress}, ${donation.city}</p>
          <p style="margin: 8px 0;"><strong>Completion Date:</strong> ${new Date(donation.completedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <p style="text-align: center; margin: 25px 0;">
          <a href="${trackingUrl}" style="display: inline-block; background-color: #1B5E20; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            View Full Impact Report
          </a>
        </p>

        <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <p style="margin: 0; color: #856404; font-size: 14px;">
            <strong>💚 Thank You!</strong> Your generosity has made a real difference. Together, we're fighting hunger and reducing food waste in our community.
          </p>
        </div>

        <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px; text-align: center;">
          Savitram Foundation | AnnDan Initiative<br>
          📞 +91 88600 36008 | 📧 info@savitramfoundation.org
        </p>
      </div>
    </div>
  `;
  return sendEmail(donation.donorEmail, subject, htmlContent);
};

export const sendVolunteerAssignmentEmail = async (donation, volunteer) => {
  if (!volunteer?.email) {
    console.warn('⚠️ Volunteer has no email address configured:', volunteer?.fullName);
    return false;
  }

  const subject = `🚨 New Food Rescue Pickup Assignment! [ID: ${donation.donationId}]`;
  const clientUrl = process.env.CLIENT_URL || 'https://savitramfoundation.org';
  const actionUrl = `${clientUrl}/volunteer/food-donation`;
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
      <div style="background-color: #1B5E20; color: white; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">🍲 Savitram Foundation</h1>
        <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">AnnDan Volunteer Rescue Operations</p>
      </div>

      <div style="padding: 24px; color: #1e293b;">
        <h2 style="color: #1B5E20; margin-top: 0;">Hello ${volunteer.fullName || 'Volunteer'}!</h2>
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">
          You have been assigned to collect a new food surplus donation! Please review the details below and log in to your Volunteer Portal to confirm pickup.
        </p>

        <div style="background-color: #f0fdf4; border-left: 4px solid #1B5E20; padding: 18px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 12px 0; color: #1B5E20; font-size: 16px;">📍 Pickup Details:</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 4px 0; color: #64748b; font-weight: bold;">Tracking ID:</td>
              <td style="padding: 4px 0; color: #0f172a; font-weight: bold; text-align: right;">${donation.donationId}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b; font-weight: bold;">Donor Name:</td>
              <td style="padding: 4px 0; color: #0f172a; font-weight: bold; text-align: right;">${donation.donorName}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b; font-weight: bold;">Donor Phone:</td>
              <td style="padding: 4px 0; color: #1B5E20; font-weight: bold; text-align: right;">📞 ${donation.donorPhone}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b; font-weight: bold;">Food Type:</td>
              <td style="padding: 4px 0; color: #0f172a; text-align: right;">${donation.foodType}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b; font-weight: bold;">Quantity:</td>
              <td style="padding: 4px 0; color: #0f172a; text-align: right;">${donation.quantity} (~${donation.estimatedPeopleServed || 'N/A'} meals)</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b; font-weight: bold;">Pickup Address:</td>
              <td style="padding: 4px 0; color: #0f172a; text-align: right;">${donation.pickupAddress}, ${donation.city}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b; font-weight: bold;">Time Window:</td>
              <td style="padding: 4px 0; color: #dc2626; font-weight: bold; text-align: right;">${donation.pickupTimeWindow}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${actionUrl}" style="background-color: #1B5E20; color: white; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 15px; display: inline-block;">
            🚚 Open Volunteer Portal & Collect
          </a>
        </div>
      </div>

      <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0;">Savitram Foundation | AnnDan Volunteer Rescue Operations</p>
        <p style="margin: 4px 0 0 0;">📞 +91 88600 36008 | 📧 info@savitramfoundation.org</p>
      </div>
    </div>
  `;

  return sendEmail(volunteer.email, subject, htmlContent);
};

export const sendCourseEnrollmentEmail = async (enrollment) => {
  const subject = `🎓 Application Received: ${enrollment.courseTitle} | Savitram Foundation`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
      <div style="background-color: #1B5E20; color: white; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">Savitram Foundation</h1>
        <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">Free Skill Development & Vocational Training</p>
      </div>
      
      <div style="padding: 30px; background-color: #ffffff;">
        <h2 style="color: #0f172a; margin-top: 0;">Application Received, ${enrollment.studentName}!</h2>
        <p style="color: #334155; line-height: 1.6; font-size: 15px;">
          Thank you for applying for our free training course <strong>${enrollment.courseTitle}</strong>. Your application is under review by our NGO coordinators.
        </p>

        <div style="background-color: #f8fafc; border-left: 4px solid #1B5E20; padding: 18px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 12px 0; color: #1B5E20; font-size: 16px;">📋 Application Summary:</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 4px 0; color: #64748b; font-weight: bold;">Enrollment ID:</td>
              <td style="padding: 4px 0; color: #1B5E20; font-weight: bold; text-align: right;">${enrollment.enrollmentId}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b; font-weight: bold;">Course Name:</td>
              <td style="padding: 4px 0; color: #0f172a; font-weight: bold; text-align: right;">${enrollment.courseTitle}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b; font-weight: bold;">Applicant Phone:</td>
              <td style="padding: 4px 0; color: #0f172a; text-align: right;">${enrollment.phone}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b; font-weight: bold;">Status:</td>
              <td style="padding: 4px 0; color: #d97706; font-weight: bold; text-align: right;">⏳ Pending Review</td>
            </tr>
          </table>
        </div>

        <p style="color: #475569; font-size: 14px; line-height: 1.5;">
          Our coordinator team will verify your application and send an approval notification once your seat is confirmed.
        </p>
      </div>

      <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0;">Savitram Foundation | Education & Empowerment</p>
        <p style="margin: 4px 0 0 0;">📞 +91 88600 36008 | 📧 info@savitramfoundation.org</p>
      </div>
    </div>
  `;

  return sendEmail(enrollment.email, subject, htmlContent);
};

export const sendCourseEnrollmentApprovalEmail = async (enrollment) => {
  const subject = `🎉 Course Application Approved! - ${enrollment.courseTitle} | Savitram Foundation`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
      <div style="background-color: #1B5E20; color: white; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">🎉 Admission Approved!</h1>
        <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">Savitram Foundation Education Portal</p>
      </div>
      
      <div style="padding: 30px; background-color: #ffffff;">
        <h2 style="color: #1B5E20; margin-top: 0;">Congratulations, ${enrollment.studentName}!</h2>
        <p style="color: #334155; line-height: 1.6; font-size: 15px;">
          Great news! Your application for the free course <strong>${enrollment.courseTitle}</strong> has been <strong>APPROVED</strong>.
        </p>

        <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 18px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 12px 0; color: #16a34a; font-size: 16px;">✅ Enrollment Details:</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 4px 0; color: #64748b; font-weight: bold;">Enrollment ID:</td>
              <td style="padding: 4px 0; color: #1B5E20; font-weight: bold; text-align: right;">${enrollment.enrollmentId}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b; font-weight: bold;">Course Name:</td>
              <td style="padding: 4px 0; color: #0f172a; font-weight: bold; text-align: right;">${enrollment.courseTitle}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b; font-weight: bold;">Fee:</td>
              <td style="padding: 4px 0; color: #16a34a; font-weight: bold; text-align: right;">FREE (100% NGO Grant)</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b; font-weight: bold;">Status:</td>
              <td style="padding: 4px 0; color: #16a34a; font-weight: bold; text-align: right;">APPROVED ✅</td>
            </tr>
          </table>
        </div>

        <p style="color: #475569; font-size: 14px; line-height: 1.5;">
          📞 Our batch coordinator will reach out to you on <strong>${enrollment.phone}</strong> for orientation details, timetable, and study material.
        </p>
      </div>

      <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0;">Savitram Foundation | Empowering Youth Through Education</p>
        <p style="margin: 4px 0 0 0;">📞 +91 88600 36008 | 📧 info@savitramfoundation.org</p>
      </div>
    </div>
  `;

  return sendEmail(enrollment.email, subject, htmlContent);
};

export const sendCourseEnrollmentRejectionEmail = async (enrollment, reason) => {
  const subject = `Update on Course Application - ${enrollment.courseTitle} | Savitram Foundation`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
      <div style="background-color: #0f172a; color: white; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">Savitram Foundation</h1>
        <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">Course Application Status Update</p>
      </div>
      
      <div style="padding: 30px; background-color: #ffffff;">
        <h2 style="color: #0f172a; margin-top: 0;">Hello, ${enrollment.studentName}</h2>
        <p style="color: #334155; line-height: 1.6; font-size: 15px;">
          Thank you for applying to <strong>${enrollment.courseTitle}</strong>. We regret to inform you that we are unable to approve your application for this batch at this time.
        </p>

        <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 14px; border-radius: 8px; margin: 20px 0; font-size: 14px; color: #991b1b;">
          <strong>Reason:</strong> ${reason || 'Capacity full or criteria not met'}
        </div>

        <p style="color: #475569; font-size: 14px;">
          You are welcome to explore and apply for our upcoming batches and other skill programs.
        </p>
      </div>

      <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0;">Savitram Foundation</p>
      </div>
    </div>
  `;

  return sendEmail(enrollment.email, subject, htmlContent);
};

export default {
  sendVolunteerRegistrationEmail,
  sendVolunteerApprovalEmail,
  sendVolunteerRejectionEmail,
  sendAdminNewVolunteerNotification,
  sendFoodDonationWelcomeEmail,
  sendVolunteerAssignmentEmail,
  sendDonationCompletionEmail,
  sendCourseEnrollmentEmail,
  sendCourseEnrollmentApprovalEmail,
  sendCourseEnrollmentRejectionEmail,
};
