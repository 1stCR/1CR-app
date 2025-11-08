import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export async function sendEmail({ to, subject, html, attachments }: EmailOptions) {
  try {
    const data = await resend.emails.send({
      from: 'Appliance Man Dan <noreply@appliancemandan.com>',
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      attachments
    });

    console.log('Email sent:', data);
    return data;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

// Email Templates
export const EmailTemplates = {
  welcome: (customerName: string) => ({
    subject: 'Welcome to Appliance Man Dan!',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #667eea; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Appliance Man Dan!</h1>
            </div>
            <div class="content">
              <p>Hi ${customerName},</p>
              <p>Thank you for choosing Appliance Man Dan for your appliance repair needs! We're committed to providing fast, reliable, and honest service.</p>
              <p>Here's what you can expect:</p>
              <ul>
                <li>✅ Professional diagnosis and repair</li>
                <li>✅ Transparent pricing with detailed quotes</li>
                <li>✅ Quality parts and workmanship</li>
                <li>✅ Warranty on all repairs</li>
              </ul>
              <p>If you have any questions, feel free to reach out:</p>
              <p>📞 (307) 684-9126<br>📧 service@appliancemandan.com</p>
            </div>
          </div>
        </body>
      </html>
    `
  }),

  quoteEmail: (customerName: string, quoteData: any) => ({
    subject: `Quote #${quoteData.quote_number} - ${quoteData.appliance_type} Repair`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #667eea; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .line-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #ddd; }
            .total { font-size: 1.2em; font-weight: bold; margin-top: 20px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Repair Quote</h1>
              <p>Quote #${quoteData.quote_number}</p>
            </div>
            <div class="content">
              <p>Hi ${customerName},</p>
              <p>Thank you for choosing Appliance Man Dan. Here's your repair quote:</p>

              <h3>Diagnosis:</h3>
              <p>${quoteData.diagnosis || 'See quote details'}</p>

              <h3>Quote Details:</h3>
              ${quoteData.line_items?.map((item: any) => `
                <div class="line-item">
                  <span>${item.description}</span>
                  <span>$${item.total?.toFixed(2) || '0.00'}</span>
                </div>
              `).join('') || '<p>No line items</p>'}

              <div class="total">
                Total: $${quoteData.total?.toFixed(2) || '0.00'}
              </div>

              <a href="${process.env.NEXT_PUBLIC_BASE_URL || ''}/quotes/${quoteData.id}" class="button">
                View Full Quote & Approve
              </a>

              <p>This quote is valid for 30 days. If you have any questions, please don't hesitate to call us at (307) 684-9126.</p>

              <p>Thank you,<br>Appliance Man Dan</p>
            </div>
          </div>
        </body>
      </html>
    `
  }),

  invoiceEmail: (customerName: string, invoiceData: any) => ({
    subject: `Invoice #${invoiceData.invoice_number} - Payment Due`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #667eea; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Invoice</h1>
              <p>Invoice #${invoiceData.invoice_number}</p>
            </div>
            <div class="content">
              <p>Hi ${customerName},</p>
              <p>Thank you for choosing Appliance Man Dan! Your repair is complete.</p>

              <h3>Invoice Summary:</h3>
              <p><strong>Amount Due:</strong> $${invoiceData.total?.toFixed(2) || '0.00'}</p>
              <p><strong>Due Date:</strong> ${invoiceData.due_date ? new Date(invoiceData.due_date).toLocaleDateString() : 'N/A'}</p>

              <a href="${process.env.NEXT_PUBLIC_BASE_URL || ''}/pay/${invoiceData.id}" class="button">
                Pay Online Now
              </a>

              <p>Your invoice is attached as a PDF. We accept the following payment methods:</p>
              <ul>
                <li>💳 Credit/Debit Card (online)</li>
                <li>🏦 Bank Transfer</li>
                <li>💵 Cash or Check</li>
              </ul>

              <p>If you have any questions about this invoice, please contact us at (307) 684-9126.</p>

              <p>Thank you for your business!<br>Appliance Man Dan</p>
            </div>
          </div>
        </body>
      </html>
    `
  }),

  paymentReceipt: (customerName: string, paymentData: any) => ({
    subject: `Payment Receipt - $${paymentData.amount?.toFixed(2) || '0.00'}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10b981; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✓ Payment Received</h1>
            </div>
            <div class="content">
              <p>Hi ${customerName},</p>
              <p>Thank you! We've received your payment.</p>

              <h3>Payment Details:</h3>
              <p><strong>Amount:</strong> $${paymentData.amount?.toFixed(2) || '0.00'}</p>
              <p><strong>Method:</strong> ${paymentData.payment_method || 'N/A'}</p>
              <p><strong>Date:</strong> ${paymentData.payment_date ? new Date(paymentData.payment_date).toLocaleDateString() : 'N/A'}</p>
              <p><strong>Reference:</strong> ${paymentData.reference_number || 'N/A'}</p>

              <p>Keep this email for your records. If you have any questions, please contact us at (307) 684-9126.</p>

              <p>Thank you for your business!<br>Appliance Man Dan</p>
            </div>
          </div>
        </body>
      </html>
    `
  }),

  reviewRequest: (customerName: string, jobData: any) => ({
    subject: 'How was your experience with Appliance Man Dan?',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #667eea; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; text-align: center; }
            .stars { font-size: 48px; margin: 20px 0; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>How Did We Do?</h1>
            </div>
            <div class="content">
              <p>Hi ${customerName},</p>
              <p>We hope you're happy with your ${jobData.appliance_type || 'appliance'} repair!</p>
              <p>We'd love to hear about your experience. Your feedback helps us improve and helps other customers make informed decisions.</p>

              <div class="stars">⭐⭐⭐⭐⭐</div>

              <a href="${process.env.NEXT_PUBLIC_BASE_URL || ''}/review/${jobData.id}" class="button">
                Leave a Review
              </a>

              <p style="margin-top: 30px; font-size: 14px; color: #666;">
                Your review will be posted on Google and our website (first name only).
              </p>

              <p>Thank you for choosing Appliance Man Dan!<br>Dan & Team</p>
            </div>
          </div>
        </body>
      </html>
    `
  })
};

// Send welcome email
export async function sendWelcomeEmail(customerName: string, customerEmail: string) {
  const template = EmailTemplates.welcome(customerName);
  return sendEmail({
    to: customerEmail,
    subject: template.subject,
    html: template.html
  });
}

// Send quote email
export async function sendQuoteEmail(quote: any, customer: any) {
  const template = EmailTemplates.quoteEmail(customer.first_name, quote);

  return sendEmail({
    to: customer.email,
    subject: template.subject,
    html: template.html
  });
}

// Send invoice email
export async function sendInvoiceEmail(invoice: any, customer: any) {
  const template = EmailTemplates.invoiceEmail(customer.first_name, invoice);

  return sendEmail({
    to: customer.email,
    subject: template.subject,
    html: template.html
  });
}
