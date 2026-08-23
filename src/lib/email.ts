import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.ethereal.email';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || 'tickets@ticketmaster-demo.com';

function createTransporter() {
  if (SMTP_USER && SMTP_PASS) {
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  }
  // Fallback to ethereal or log transport if SMTP is not configured
  return null;
}

export async function sendBookingTicketEmail(
  toEmail: string,
  customerName: string,
  eventTitle: string,
  eventDate: Date,
  venueName: string,
  bookingRef: string,
  seats: string[],
  totalAmount: number,
  qrCodeDataUrl: string
) {
  const transporter = createTransporter();
  const dateFormatted = new Date(eventDate).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; borderRadius: 8px; overflow: hidden;">
      <div style="background-color: #0052cc; color: #ffffff; padding: 20px; text-align: center;">
        <h2 style="margin: 0;">🎉 Booking Confirmed!</h2>
        <p style="margin: 5px 0 0 0;">Reference: <strong>${bookingRef}</strong></p>
      </div>
      <div style="padding: 24px; color: #333333;">
        <p>Hi <strong>${customerName}</strong>,</p>
        <p>Your seats have been successfully booked for <strong>${eventTitle}</strong>.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px; color: #666666;">Venue:</td>
            <td style="padding: 8px; font-weight: bold;">${venueName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; color: #666666;">Date & Time:</td>
            <td style="padding: 8px; font-weight: bold;">${dateFormatted}</td>
          </tr>
          <tr>
            <td style="padding: 8px; color: #666666;">Seats:</td>
            <td style="padding: 8px; font-weight: bold;">${seats.join(', ')}</td>
          </tr>
          <tr>
            <td style="padding: 8px; color: #666666;">Total Paid:</td>
            <td style="padding: 8px; font-weight: bold; color: #0052cc;">$${totalAmount.toFixed(2)}</td>
          </tr>
        </table>

        <div style="text-align: center; margin: 24px 0;">
          <p style="margin-bottom: 12px; font-size: 14px; color: #666666;">Scan your ticket at the entrance:</p>
          <img src="${qrCodeDataUrl}" alt="QR Ticket" style="width: 200px; height: 200px; border: 2px dashed #0052cc; padding: 10px; border-radius: 8px;" />
        </div>

        <p style="font-size: 12px; color: #888888; text-align: center;">Thank you for using Ticket Booking System!</p>
      </div>
    </div>
  `;

  if (transporter) {
    try {
      await transporter.sendMail({
        from: SMTP_FROM,
        to: toEmail,
        subject: `🎟️ Ticket Confirmation: ${eventTitle} (${bookingRef})`,
        html: htmlContent,
      });
      console.log(`[EMAIL SENT] Confirmation email sent to ${toEmail}`);
    } catch (err) {
      console.error(`[EMAIL ERROR] Failed to send email to ${toEmail}:`, err);
    }
  } else {
    console.log(`================ MOCK EMAIL NOTIFICATION ================`);
    console.log(`TO: ${toEmail}`);
    console.log(`SUBJECT: 🎟️ Ticket Confirmation: ${eventTitle} (${bookingRef})`);
    console.log(`REF: ${bookingRef} | SEATS: ${seats.join(', ')} | TOTAL: $${totalAmount}`);
    console.log(`==========================================================`);
  }
}

export async function sendWaitlistOfferEmail(
  toEmail: string,
  customerName: string,
  eventTitle: string,
  seatCategory: string,
  offerExpiresAt: Date,
  claimUrl: string
) {
  const transporter = createTransporter();
  const expireFormatted = new Date(offerExpiresAt).toLocaleString('en-US', {
    timeStyle: 'short',
    dateStyle: 'medium',
  });

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; borderRadius: 8px; overflow: hidden;">
      <div style="background-color: #ff9900; color: #ffffff; padding: 20px; text-align: center;">
        <h2 style="margin: 0;">⚡ Waitlist Ticket Offer Available!</h2>
      </div>
      <div style="padding: 24px; color: #333333;">
        <p>Hi <strong>${customerName}</strong>,</p>
        <p>Good news! A seat in category <strong>${seatCategory}</strong> has become available for <strong>${eventTitle}</strong> because of a cancellation.</p>
        <p>You have been offered this seat as the next person on the waitlist.</p>

        <div style="background-color: #fff8e6; border-left: 4px solid #ff9900; padding: 12px; margin: 20px 0;">
          <p style="margin: 0; color: #b36b00; font-weight: bold;">⚠️ Time-Limited Offer:</p>
          <p style="margin: 4px 0 0 0;">This offer will expire at <strong>${expireFormatted}</strong> (10 minutes from now). If unclaimed, it will automatically pass to the next customer in line.</p>
        </div>

        <div style="text-align: center; margin: 24px 0;">
          <a href="${claimUrl}" style="background-color: #0052cc; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Claim & Book Seat Now</a>
        </div>
      </div>
    </div>
  `;

  if (transporter) {
    try {
      await transporter.sendMail({
        from: SMTP_FROM,
        to: toEmail,
        subject: `⚡ Waitlist Offer: Ticket Available for ${eventTitle}`,
        html: htmlContent,
      });
      console.log(`[WAITLIST EMAIL SENT] Offer sent to ${toEmail}`);
    } catch (err) {
      console.error(`[WAITLIST EMAIL ERROR] Failed to send offer to ${toEmail}:`, err);
    }
  } else {
    console.log(`================ MOCK WAITLIST EMAIL ================`);
    console.log(`TO: ${toEmail}`);
    console.log(`SUBJECT: ⚡ Waitlist Offer: Ticket Available for ${eventTitle}`);
    console.log(`CLAIM URL: ${claimUrl}`);
    console.log(`EXPIRES AT: ${expireFormatted}`);
    console.log(`=======================================================`);
  }
}
