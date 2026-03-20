import dotenv from "dotenv";
import Mailjet from "node-mailjet";

dotenv.config();

// Connect to Mailjet
const mailjet = Mailjet.apiConnect(
  process.env.MAILJET_API_KEY,
  process.env.MAILJET_SECRET_KEY
);

// Email templates
export const emailTemplates = {
  registration: (name, tempPassword) => {
  const loginUrl = process.env.FRONTEND_URL || "https://skycrm.co.in/login";

  return {
    subject: "SKY CRM - Your Account Has Been Created",
    html: `
      <div style="font-family: Helvetica, Arial, sans-serif; min-width: 1000px; overflow:auto; line-height:1.6; background-color: #f7f7f7; padding: 20px 0;">
        <div style="margin: 50px auto; width: 70%; padding: 20px; background-color: #ffffff; border-radius: 8px;">
          
          <div style="border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 20px;">
            <span style="font-size: 1.4em; color: #00466a; font-weight: 600;">
              SKY CRM
            </span>
          </div>

          <p style="font-size: 1.1em; margin-bottom: 10px;">Hello ${name},</p>

          <p style="margin-bottom: 15px;">
            Your account has been created by the admin.<br/>
            Your temporary password is:
            <b style="font-weight: 600; color: #00466a;">${tempPassword}</b>
          </p>

          <!-- ✅ LOGIN BUTTON -->
          <div style="text-align:center; margin: 30px 0;">
            <a href="https://skycrm.co.in/login" 
              style="
                display:inline-block;
                padding:12px 24px;
                background:#00466a;
                color:#ffffff;
                border-radius:6px;
                text-decoration:none;
                font-weight:bold;
                font-size:14px;
              ">
              Login Now
            </a>
          </div>

          <p style="font-size: 0.9em; color: #555;">
            Please login and change your password immediately.
          </p>

          <p style="font-size: 0.9em; color: #555;">
            Regards,<br />
            SKY CRM Team
          </p>
          
          <hr style="border:none; border-top:1px solid #e5e5e5; margin: 25px 0;" />

          <p style="font-size: 12px; color: #777777;">
            <strong>This is an automated email.</strong><br />
            Please do not reply to this message.
          </p>

          <p style="font-size: 12px; color: #aaaaaa; margin-top: 10px;">
            © 2026 SKY CRM. All rights reserved.
          </p>
        </div>
      </div>
    `,
  };
},

  forgotPassword: (name, resetToken, resetUrl) => ({
    subject: "SKY CRM PASSWORD RECOVERY",
    html: `
      <div style="font-family: Helvetica,Arial,sans-serif;min-width:1000px;overflow:auto;line-height:2">
        <div style="margin:50px auto;width:70%;padding:20px 0">
          <div style="border-bottom:1px solid #eee">
            <a href="${resetUrl}" style="font-size:1.4em;color: #00466a;text-decoration:none;font-weight:600">
              SKY CRM
            </a>
          </div>
          <p style="font-size:1.1em">Hi ${name},</p>
          <p>Use the following OTP to complete your Password Recovery. OTP is valid for 5 minutes</p>
          <h2 style="background: #00466a;margin: 0 auto;width: max-content;padding: 0 10px;color: #fff;border-radius: 4px;">
            ${resetToken}
          </h2>
          <p style="font-size:0.9em;">Regards,<br />SKY CRM</p>
          <hr style="border:none;border-top:1px solid #eee" />
          <div style="float:right;padding:8px 0;color:#aaa;font-size:0.8em;line-height:1;font-weight:300">
            <p>SKY CRM Inc</p>
          </div>
        </div>
      </div>
    `,
  }),

  contact: (name, email, phone, company, details) => ({
    subject: `New Contact Inquiry from ${name} (${company})`,
    html: `
      <div style="font-family: Helvetica, Arial, sans-serif; min-width: 1000px; overflow:auto; line-height:1.6; background-color: #f7f7f7; padding: 20px 0;">
        <div style="margin: 50px auto; width: 70%; padding: 40px; background-color: #ffffff; border-radius: 12px; shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px;">
            <h1 style="font-size: 1.8em; color: #1e3a8a; margin: 0;">New Contact Inquiry</h1>
            <p style="color: #6b7280; font-size: 0.9em; margin-top: 5px;">Sky CRM Enterprise Platform</p>
          </div>
          
          <div style="margin-bottom: 25px;">
            <h2 style="font-size: 1.2em; color: #1e40af; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">Contact Details</h2>
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
              <tr>
                <td style="padding: 8px 0; color: #4b5563; width: 150px;"><strong>Name:</strong></td>
                <td style="padding: 8px 0; color: #111827;">${name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #4b5563;"><strong>Email:</strong></td>
                <td style="padding: 8px 0; color: #111827;">${email}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #4b5563;"><strong>Phone:</strong></td>
                <td style="padding: 8px 0; color: #111827;">${phone}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #4b5563;"><strong>Company:</strong></td>
                <td style="padding: 8px 0; color: #111827;">${company}</td>
              </tr>
            </table>
          </div>

          <div style="margin-bottom: 25px;">
            <h2 style="font-size: 1.2em; color: #1e40af; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">Inquiry Details</h2>
            <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; color: #374151; margin-top: 10px; white-space: pre-wrap;">
              ${details}
            </div>
          </div>

          <p style="font-size: 0.85em; color: #6b7280; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
            This inquiry was sent from the Sky CRM landing page contact form.
          </p>
        </div>
      </div>
    `,
  }),
};

// Wrapper function for sending emails
export const sendEmail = async (to, template, data = {}) => {
  try {
    console.log("Sending from:", process.env.EMAIL_FROM);
    console.log("Using API key:", process.env.MAILJET_API_KEY ? "YES" : "NO");
    const cc = process.env.EMAIL_CC
      ? process.env.EMAIL_CC.split(",").map((email) => ({ Email: email }))
      : [];

    const emailContent = emailTemplates[template](...Object.values(data));

    const response = await mailjet
      .post("send", { version: "v3.1" })
      .request({
        Messages: [
          {
            From: {
              Email: process.env.EMAIL_FROM,
              Name: "SKY CRM",
            },
            To: [{ Email: to }],
            Cc: cc,
            Subject: emailContent.subject,
            HTMLPart: emailContent.html,
          },
        ],
      });

    console.log("✅ Email sent successfully");
    return { success: true, response: response.body };
  } catch (error) {
    console.error("❌ Error sending email:");
    console.error(error.response?.body || error.message);
    throw new Error("Failed to send email via Mailjet");
  }
};

export default sendEmail;
