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

    console.log('✅ Manual Task Email sent successfully:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Error sending manual task email:', error.response?.data || error.message);
    return false;
  }
};

/**
 * Send task assignment email to volunteer
 */
export const sendTaskAssignmentEmail = async (task, volunteer) => {
  if (!volunteer?.email) {
    console.warn('⚠️ Volunteer has no email configured:', volunteer?.fullName);
    return false;
  }

  const subject = `🎯 New Task Assignment: ${task.title} [ID: ${task.taskId}]`;
  const clientUrl = process.env.CLIENT_URL || 'https://savitramfoundation.org';
  const taskUrl = `${clientUrl}/volunteer/tasks/${task._id}`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
      <div style="background-color: #1B5E20; color: white; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">🎯 Savitram Foundation</h1>
        <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">Volunteer Task Management System</p>
      </div>

      <div style="padding: 24px; color: #1e293b;">
        <h2 style="color: #1B5E20; margin-top: 0;">Hello ${volunteer.fullName}!</h2>
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">
          You have been assigned a new task. Please review the details below and log in to your Volunteer Portal to accept and complete it.
        </p>

        <div style="background-color: #f0fdf4; border-left: 4px solid #1B5E20; padding: 18px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 12px 0; color: #1B5E20; font-size: 16px;">📋 Task Details:</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Task ID:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: bold; text-align: right;">${task.taskId}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Title:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: bold; text-align: right;">${task.title}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Description:</td>
              <td style="padding: 6px 0; color: #0f172a; text-align: right;">${task.description}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Type:</td>
              <td style="padding: 6px 0; color: #0f172a; text-align: right;">${task.taskType}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Priority:</td>
              <td style="padding: 6px 0; color: ${task.priority === 'Urgent' ? '#dc2626' : task.priority === 'High' ? '#ea580c' : '#1B5E20'}; font-weight: bold; text-align: right;">🔴 ${task.priority}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Due Date:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: bold; text-align: right;">${new Date(task.dueDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Estimated Hours:</td>
              <td style="padding: 6px 0; color: #0f172a; text-align: right;">${task.estimatedHours} hours</td>
            </tr>
            ${task.location ? `
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Location:</td>
              <td style="padding: 6px 0; color: #0f172a; text-align: right;">${task.location}, ${task.city}</td>
            </tr>
            ` : ''}
          </table>
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${taskUrl}" style="background-color: #1B5E20; color: white; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 15px; display: inline-block;">
            ✅ View & Accept Task
          </a>
        </div>

        <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">
          <strong>What's Next:</strong>
          <ul style="margin: 8px 0 0 0; padding-left: 20px;">
            <li>Log in to your Volunteer Portal</li>
            <li>Review the task details and accept it</li>
            <li>Complete the task by the due date</li>
            <li>Upload proof photos and completion notes</li>
            <li>Submit for admin verification</li>
          </ul>
        </div>
      </div>

      <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0;">Savitram Foundation | Volunteer Task Management</p>
        <p style="margin: 4px 0 0 0;">📞 +91 88600 36008 | 📧 info@savitramfoundation.org</p>
      </div>
    </div>
  `;

  return sendEmail(volunteer.email, subject, htmlContent);
};

/**
 * Send task completion confirmation email to volunteer
 */
export const sendTaskCompletionConfirmationEmail = async (task, volunteer) => {
  if (!volunteer?.email) {
    console.warn('⚠️ Volunteer has no email configured:', volunteer?.fullName);
    return false;
  }

  const subject = `✅ Task Completion Submitted: ${task.title} [ID: ${task.taskId}]`;
  const clientUrl = process.env.CLIENT_URL || 'https://savitramfoundation.org';
  const taskUrl = `${clientUrl}/volunteer/tasks/${task._id}`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
      <div style="background-color: #1B5E20; color: white; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">✅ Task Submitted</h1>
        <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">Awaiting Admin Verification</p>
      </div>

      <div style="padding: 24px; color: #1e293b;">
        <h2 style="color: #1B5E20; margin-top: 0;">Great Work, ${volunteer.fullName}!</h2>
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">
          Your task completion has been submitted successfully. Our admin team will review your submission and verify the completion.
        </p>

        <div style="background-color: #f0fdf4; border-left: 4px solid #1B5E20; padding: 18px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 12px 0; color: #1B5E20; font-size: 16px;">📋 Submission Summary:</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Task ID:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: bold; text-align: right;">${task.taskId}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Task Title:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: bold; text-align: right;">${task.title}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Status:</td>
              <td style="padding: 6px 0; color: #1B5E20; font-weight: bold; text-align: right;">⏳ Under Review</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Actual Hours:</td>
              <td style="padding: 6px 0; color: #0f172a; text-align: right;">${task.actualHours || 'N/A'} hours</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Submitted At:</td>
              <td style="padding: 6px 0; color: #0f172a; text-align: right;">${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
            </tr>
            ${task.proofPhotos && task.proofPhotos.length > 0 ? `
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Proof Photos:</td>
              <td style="padding: 6px 0; color: #0f172a; text-align: right;">${task.proofPhotos.length} uploaded</td>
            </tr>
            ` : ''}
          </table>
        </div>

        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #92400e; font-size: 14px;">
            <strong>⏳ What Happens Next:</strong> Our admin team will review your submission within 24-48 hours. You'll receive an email notification once the task is verified and marked as completed.
          </p>
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${taskUrl}" style="background-color: #1B5E20; color: white; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 15px; display: inline-block;">
            📊 View Task Status
          </a>
        </div>
      </div>

      <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0;">Savitram Foundation | Volunteer Task Management</p>
        <p style="margin: 4px 0 0 0;">📞 +91 88600 36008 | 📧 info@savitramfoundation.org</p>
      </div>
    </div>
  `;

  return sendEmail(volunteer.email, subject, htmlContent);
};

/**
 * Send task completion verification email to admin
 */
export const sendTaskCompletionVerificationEmail = async (task, volunteer, adminEmail) => {
  const subject = `🔍 Task Completion Verification Required: ${task.title} [ID: ${task.taskId}]`;
  const clientUrl = process.env.CLIENT_URL || 'https://savitramfoundation.org';
  const taskUrl = `${clientUrl}/admin/tasks/${task._id}`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
      <div style="background-color: #1B5E20; color: white; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">🔍 Task Completion Verification</h1>
        <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">Admin Review Required</p>
      </div>

      <div style="padding: 24px; color: #1e293b;">
        <h2 style="color: #1B5E20; margin-top: 0;">Task Completion Submitted for Review</h2>
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">
          A volunteer has submitted their task completion. Please review the details and verify the submission.
        </p>

        <div style="background-color: #f0fdf4; border-left: 4px solid #1B5E20; padding: 18px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 12px 0; color: #1B5E20; font-size: 16px;">📋 Task Information:</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Task ID:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: bold; text-align: right;">${task.taskId}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Title:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: bold; text-align: right;">${task.title}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Type:</td>
              <td style="padding: 6px 0; color: #0f172a; text-align: right;">${task.taskType}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Priority:</td>
              <td style="padding: 6px 0; color: ${task.priority === 'Urgent' ? '#dc2626' : task.priority === 'High' ? '#ea580c' : '#1B5E20'}; font-weight: bold; text-align: right;">${task.priority}</td>
            </tr>
          </table>
        </div>

        <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 18px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 12px 0; color: #1e40af; font-size: 16px;">👤 Volunteer Information:</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Name:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: bold; text-align: right;">${volunteer.fullName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Email:</td>
              <td style="padding: 6px 0; color: #0f172a; text-align: right;">${volunteer.email}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Mobile:</td>
              <td style="padding: 6px 0; color: #0f172a; text-align: right;">${volunteer.mobileNumber}</td>
            </tr>
          </table>
        </div>

        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 18px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 12px 0; color: #92400e; font-size: 16px;">📝 Submission Details:</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Actual Hours:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: bold; text-align: right;">${task.actualHours || 'N/A'} hours</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Estimated Hours:</td>
              <td style="padding: 6px 0; color: #0f172a; text-align: right;">${task.estimatedHours} hours</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Proof Photos:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: bold; text-align: right;">${task.proofPhotos && task.proofPhotos.length > 0 ? task.proofPhotos.length + ' uploaded' : 'None'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: bold; vertical-align: top;">Completion Notes:</td>
              <td style="padding: 6px 0; color: #0f172a; text-align: right;">${task.completionNotes || 'N/A'}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${taskUrl}" style="background-color: #1B5E20; color: white; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 15px; display: inline-block;">
            🔍 Review & Verify Task
          </a>
        </div>
      </div>

      <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0;">Savitram Foundation | Admin Task Management</p>
        <p style="margin: 4px 0 0 0;">📞 +91 88600 36008 | 📧 info@savitramfoundation.org</p>
      </div>
    </div>
  `;

  return sendEmail(adminEmail, subject, htmlContent);
};

/**
 * Send task completion approval email to volunteer
 */
export const sendTaskCompletionApprovalEmail = async (task, volunteer) => {
  if (!volunteer?.email) {
    console.warn('⚠️ Volunteer has no email configured:', volunteer?.fullName);
    return false;
  }

  const subject = `🎉 Task Completed & Verified: ${task.title} [ID: ${task.taskId}]`;
  const clientUrl = process.env.CLIENT_URL || 'https://savitramfoundation.org';
  const dashboardUrl = `${clientUrl}/volunteer/dashboard`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
      <div style="background-color: #1B5E20; color: white; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">🎉 Task Completed!</h1>
        <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">Admin Verification Complete</p>
      </div>

      <div style="padding: 24px; color: #1e293b;">
        <h2 style="color: #1B5E20; margin-top: 0;">Excellent Work, ${volunteer.fullName}!</h2>
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">
          Your task has been verified and marked as completed. Thank you for your contribution to Savitram Foundation!
        </p>

        <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 18px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 12px 0; color: #16a34a; font-size: 16px;">✅ Task Completion Summary:</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Task ID:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: bold; text-align: right;">${task.taskId}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Title:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: bold; text-align: right;">${task.title}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Status:</td>
              <td style="padding: 6px 0; color: #16a34a; font-weight: bold; text-align: right;">✅ COMPLETED</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Hours Logged:</td>
              <td style="padding: 6px 0; color: #0f172a; text-align: right;">${task.actualHours || task.estimatedHours} hours</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Completed At:</td>
              <td style="padding: 6px 0; color: #0f172a; text-align: right;">${new Date(task.completedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
            </tr>
          </table>
        </div>

        <div style="background-color: #e8f5e9; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4CAF50;">
          <p style="margin: 0; color: #1B5E20; font-size: 14px;">
            <strong>💚 Thank You!</strong> Your dedication and hard work make a real difference in our community. Keep up the great work!
          </p>
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${dashboardUrl}" style="background-color: #1B5E20; color: white; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 15px; display: inline-block;">
            📊 View Your Dashboard
          </a>
        </div>
      </div>

      <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0;">Savitram Foundation | Volunteer Task Management</p>
        <p style="margin: 4px 0 0 0;">📞 +91 88600 36008 | 📧 info@savitramfoundation.org</p>
      </div>
    </div>
  `;

  return sendEmail(volunteer.email, subject, htmlContent);
};

export default {
  sendTaskAssignmentEmail,
  sendTaskCompletionConfirmationEmail,
  sendTaskCompletionVerificationEmail,
  sendTaskCompletionApprovalEmail,
};
