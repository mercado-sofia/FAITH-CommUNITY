/**
 * Email templates for volunteer application status updates
 */

/**
 * Generate email HTML for volunteer application status update
 * @param {Object} params - Email parameters
 * @param {string} params.userName - User's name
 * @param {string} params.programName - Program name
 * @param {string} params.status - New status (Approved, Declined, Cancelled)
 * @param {string} params.siteName - Site name (from siteName utility)
 * @param {string} params.rejectionComment - Rejection comment (optional, for Declined status)
 * @returns {Object} Email content with subject, html, and text
 */
export function getVolunteerStatusEmail({ userName, programName, status, siteName = 'FAITH CommUNITY', rejectionComment }) {
  const statusMessages = {
    'Approved': {
      subject: `🎉 Your Volunteer Application Has Been Approved!`,
      title: 'Application Approved',
      message: `Great news! Your volunteer application for "${programName}" has been approved.`,
      details: `We're excited to have you join us as a volunteer. You will be contacted soon with further details about your role, schedule, and next steps.`,
      actionText: 'Thank you for your commitment to making a difference in our community!'
    },
    'Declined': {
      subject: `Update on Your Volunteer Application`,
      title: 'Application Status Update',
      message: `Thank you for your interest in volunteering for "${programName}".`,
      details: `After careful review, we regret to inform you that we are unable to proceed with your application at this time. This decision was made based on various factors including program capacity and current needs.`,
      actionText: 'We encourage you to apply for other volunteer opportunities in the future. Your interest in serving the community is greatly appreciated.'
    },
    'Cancelled': {
      subject: `Your Volunteer Application Has Been Cancelled`,
      title: 'Application Cancelled',
      message: `Your volunteer application for "${programName}" has been cancelled.`,
      details: `If you have any questions or concerns about this cancellation, please don't hesitate to contact us.`,
      actionText: 'We hope to see you apply for other volunteer opportunities in the future.'
    }
  };

  const statusInfo = statusMessages[status] || statusMessages['Declined'];
  const firstName = userName ? userName.split(' ')[0] : 'Valued Volunteer';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${statusInfo.subject}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f4f4f4;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e0e0e0;
    }
    .header h1 {
      color: #2c3e50;
      margin: 0;
      font-size: 24px;
    }
    .content {
      margin-bottom: 30px;
    }
    .greeting {
      font-size: 16px;
      margin-bottom: 20px;
    }
    .status-box {
      background-color: ${status === 'Approved' ? '#e8f5e9' : status === 'Declined' ? '#fff3e0' : '#fce4ec'};
      border-left: 4px solid ${status === 'Approved' ? '#4caf50' : status === 'Declined' ? '#ff9800' : '#e91e63'};
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .status-title {
      font-size: 18px;
      font-weight: bold;
      color: ${status === 'Approved' ? '#2e7d32' : status === 'Declined' ? '#e65100' : '#c2185b'};
      margin-bottom: 10px;
    }
    .program-name {
      font-weight: bold;
      color: #1976d2;
      font-size: 16px;
    }
    .message {
      margin: 15px 0;
      font-size: 15px;
    }
    .details {
      margin: 15px 0;
      font-size: 14px;
      color: #555;
    }
    .action-text {
      margin-top: 20px;
      padding: 15px;
      background-color: #f5f5f5;
      border-radius: 4px;
      font-size: 14px;
      font-style: italic;
      color: #666;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      text-align: center;
      font-size: 12px;
      color: #888;
    }
    .footer p {
      margin: 5px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${siteName}</h1>
    </div>
    
    <div class="content">
      <div class="greeting">
        Hello ${firstName},
      </div>
      
      <div class="status-box">
        <div class="status-title">${statusInfo.title}</div>
        <div class="message">
          ${statusInfo.message}
        </div>
      </div>
      
      <div class="details">
        <p><strong>Program:</strong> <span class="program-name">${programName}</span></p>
        <p>${statusInfo.details}</p>
        ${status === 'Declined' && rejectionComment ? `
        <div style="margin-top: 20px; padding: 15px; background-color: #fff9e6; border-left: 4px solid #ff9800; border-radius: 4px;">
          <p style="margin: 0 0 10px 0; font-weight: bold; color: #e65100;">Reason for Decline:</p>
          <p style="margin: 0; color: #555; white-space: pre-wrap;">${rejectionComment}</p>
        </div>
        ` : ''}
      </div>
      
      <div class="action-text">
        ${statusInfo.actionText}
      </div>
    </div>
    
    <div class="footer">
      <p>This is an automated notification from ${siteName}.</p>
      <p>Please do not reply to this email. If you have questions, please contact us through our website.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
${siteName}

Hello ${firstName},

${statusInfo.title}

${statusInfo.message}

Program: ${programName}

${statusInfo.details}
${status === 'Declined' && rejectionComment ? `

Reason for Decline:
${rejectionComment}
` : ''}

${statusInfo.actionText}

---
This is an automated notification from ${siteName}.
Please do not reply to this email. If you have questions, please contact us through our website.
  `.trim();

  return {
    subject: statusInfo.subject,
    html,
    text
  };
}

export default {
  getVolunteerStatusEmail
};

