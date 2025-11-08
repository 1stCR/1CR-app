# Stage 11: Integrations & Automation

## 🎯 Objective
Integrate external services including Google Calendar sync, SMS notifications, email automation, parts supplier APIs, shipping tracking, payment processing, and communication automation to streamline operations and enhance customer experience.

## ✅ Prerequisites
- Stages 1-10 completed
- All core features functional
- Mobile PWA working
- Third-party API accounts created:
  - Google Cloud (Calendar API)
  - Twilio (SMS)
  - SendGrid or Resend (Email)
  - Stripe (Payments)
  - SupplyHouse (Parts ordering - if available)
  - ShipStation or EasyPost (Shipping)

## 🛠️ What We're Building

### Core Features:
1. **Google Calendar Integration**
   - Two-way sync with technician calendar
   - Auto-create events for scheduled jobs
   - Update events when jobs change
   - Block out personal time
   - Travel time buffers

2. **SMS Notifications (Twilio)**
   - Job confirmations to customers
   - Arrival notifications (30 min, 5 min)
   - Quote/invoice delivery
   - Payment reminders
   - Parts arrival notifications
   - Two-way messaging

3. **Email Automation**
   - Welcome emails for new customers
   - Quote delivery with PDF
   - Invoice generation and delivery
   - Payment receipts
   - Service follow-ups
   - Review requests
   - Marketing campaigns

4. **Payment Processing (Stripe)**
   - Online payment links
   - Card on file
   - ACH/bank transfers
   - Payment plans
   - Automatic payment receipts
   - Refund processing

5. **Parts Supplier APIs**
   - Real-time price checking
   - Stock availability
   - Automated ordering
   - Order tracking
   - Account balance sync

6. **Shipping Tracking**
   - Automatic tracking updates
   - Delivery notifications
   - Multi-carrier support
   - Delivery confirmation
   - Exception handling

7. **Communication Automation**
   - Auto-response templates
   - Scheduled follow-ups
   - Abandoned quote reminders
   - Birthday/anniversary messages
   - Seasonal maintenance reminders

---

## 📅 Google Calendar Integration

### 1. Setup Google Calendar API

**File: `/lib/google-calendar.ts`**

```typescript
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

// Initialize OAuth2 client
export function getOAuth2Client() {
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

// Get calendar instance
export function getCalendar(accessToken: string) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });
  
  return google.calendar({ version: 'v3', auth: oauth2Client });
}

// Create job event in calendar
export async function createJobEvent(
  accessToken: string,
  job: {
    id: string;
    customer_name: string;
    appliance_type: string;
    address: string;
    scheduled_date: string;
    estimated_duration: number;
  }
) {
  const calendar = getCalendar(accessToken);
  
  const startTime = new Date(job.scheduled_date);
  const endTime = new Date(startTime.getTime() + job.estimated_duration * 60 * 60 * 1000);
  
  const event = {
    summary: `${job.customer_name} - ${job.appliance_type}`,
    description: `Job ID: ${job.id}\n\nService call for ${job.appliance_type}`,
    location: job.address,
    start: {
      dateTime: startTime.toISOString(),
      timeZone: 'America/Denver'
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: 'America/Denver'
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 30 },
        { method: 'popup', minutes: 5 }
      ]
    },
    extendedProperties: {
      private: {
        jobId: job.id
      }
    }
  };
  
  try {
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event
    });
    
    return response.data.id; // Return event ID
  } catch (error) {
    console.error('Error creating calendar event:', error);
    throw error;
  }
}

// Update existing event
export async function updateJobEvent(
  accessToken: string,
  eventId: string,
  updates: {
    scheduled_date?: string;
    estimated_duration?: number;
    customer_name?: string;
    appliance_type?: string;
    address?: string;
  }
) {
  const calendar = getCalendar(accessToken);
  
  // Get existing event
  const { data: existingEvent } = await calendar.events.get({
    calendarId: 'primary',
    eventId: eventId
  });
  
  // Build update object
  const updatedEvent: any = { ...existingEvent };
  
  if (updates.customer_name || updates.appliance_type) {
    updatedEvent.summary = `${updates.customer_name || ''} - ${updates.appliance_type || ''}`;
  }
  
  if (updates.address) {
    updatedEvent.location = updates.address;
  }
  
  if (updates.scheduled_date) {
    const startTime = new Date(updates.scheduled_date);
    const duration = updates.estimated_duration || 2; // Default 2 hours
    const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);
    
    updatedEvent.start = {
      dateTime: startTime.toISOString(),
      timeZone: 'America/Denver'
    };
    updatedEvent.end = {
      dateTime: endTime.toISOString(),
      timeZone: 'America/Denver'
    };
  }
  
  try {
    const response = await calendar.events.update({
      calendarId: 'primary',
      eventId: eventId,
      requestBody: updatedEvent
    });
    
    return response.data;
  } catch (error) {
    console.error('Error updating calendar event:', error);
    throw error;
  }
}

// Delete event
export async function deleteJobEvent(
  accessToken: string,
  eventId: string
) {
  const calendar = getCalendar(accessToken);
  
  try {
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId
    });
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    throw error;
  }
}

// Get events for date range
export async function getJobsFromCalendar(
  accessToken: string,
  startDate: Date,
  endDate: Date
) {
  const calendar = getCalendar(accessToken);
  
  try {
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    });
    
    return response.data.items || [];
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    throw error;
  }
}
```

### 2. Calendar Sync Component

**File: `/components/integrations/CalendarSync.tsx`**

```typescript
import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

export function CalendarSync() {
  const [connected, setConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  
  useEffect(() => {
    checkConnectionStatus();
  }, []);
  
  const checkConnectionStatus = async () => {
    try {
      const response = await fetch('/api/integrations/google/status');
      const data = await response.json();
      setConnected(data.connected);
      if (data.lastSync) {
        setLastSync(new Date(data.lastSync));
      }
    } catch (error) {
      console.error('Error checking calendar status:', error);
    }
  };
  
  const connectCalendar = () => {
    // Redirect to Google OAuth
    window.location.href = '/api/auth/google';
  };
  
  const syncNow = async () => {
    setSyncing(true);
    try {
      await fetch('/api/integrations/google/sync', { method: 'POST' });
      setLastSync(new Date());
    } catch (error) {
      console.error('Error syncing calendar:', error);
    } finally {
      setSyncing(false);
    }
  };
  
  const disconnect = async () => {
    if (!confirm('Disconnect Google Calendar? Existing events will not be deleted.')) {
      return;
    }
    
    try {
      await fetch('/api/integrations/google/disconnect', { method: 'POST' });
      setConnected(false);
      setLastSync(null);
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Calendar className="text-blue-600" size={24} />
          <h3 className="text-lg font-semibold">Google Calendar</h3>
        </div>
        
        {connected ? (
          <CheckCircle className="text-green-600" size={20} />
        ) : (
          <AlertCircle className="text-gray-400" size={20} />
        )}
      </div>
      
      {connected ? (
        <div>
          <p className="text-gray-600 mb-4">
            Calendar sync is active. Job schedules will automatically sync to your Google Calendar.
          </p>
          
          {lastSync && (
            <p className="text-sm text-gray-500 mb-4">
              Last synced: {lastSync.toLocaleString()}
            </p>
          )}
          
          <div className="flex gap-2">
            <button
              onClick={syncNow}
              disabled={syncing}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>
            
            <button
              onClick={disconnect}
              className="text-red-600 px-4 py-2 rounded-lg hover:bg-red-50"
            >
              Disconnect
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-gray-600 mb-4">
            Connect your Google Calendar to automatically sync job schedules, receive reminders, and manage your day.
          </p>
          
          <button
            onClick={connectCalendar}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Connect Google Calendar
          </button>
        </div>
      )}
    </div>
  );
}
```

### 3. Calendar Webhook Handler

**File: `/pages/api/webhooks/calendar.ts`**

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/lib/supabase-server';
import { updateJobEvent } from '@/lib/google-calendar';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { jobId, action, data } = req.body;
  
  const supabase = createClient(req, res);
  
  try {
    // Get job and calendar event ID
    const { data: job } = await supabase
      .from('jobs')
      .select('*, google_calendar_event_id, user_id')
      .eq('id', jobId)
      .single();
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    // Get user's Google access token
    const { data: integration } = await supabase
      .from('integrations')
      .select('access_token')
      .eq('user_id', job.user_id)
      .eq('provider', 'google')
      .single();
    
    if (!integration) {
      return res.status(400).json({ error: 'Google Calendar not connected' });
    }
    
    // Handle different actions
    if (action === 'update' && job.google_calendar_event_id) {
      await updateJobEvent(
        integration.access_token,
        job.google_calendar_event_id,
        data
      );
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Calendar webhook error:', error);
    res.status(500).json({ error: 'Failed to update calendar' });
  }
}
```

---

## 📱 SMS Integration (Twilio)

### 1. Twilio Setup

**File: `/lib/twilio.ts`**

```typescript
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

export interface SMSOptions {
  to: string;
  body: string;
  mediaUrl?: string;
}

export async function sendSMS({ to, body, mediaUrl }: SMSOptions) {
  try {
    const message = await client.messages.create({
      body,
      from: phoneNumber,
      to,
      ...(mediaUrl && { mediaUrl: [mediaUrl] })
    });
    
    console.log('SMS sent:', message.sid);
    return message;
  } catch (error) {
    console.error('Error sending SMS:', error);
    throw error;
  }
}

// SMS Templates
export const SMSTemplates = {
  jobConfirmation: (customerName: string, date: string, time: string) => ({
    body: `Hi ${customerName}! Your appliance repair is confirmed for ${date} at ${time}. We'll send a reminder 30 minutes before arrival. Reply STOP to opt out.`
  }),
  
  arrival30Min: (techName: string) => ({
    body: `${techName} from Appliance Man Dan will arrive in approximately 30 minutes. Thank you for your patience!`
  }),
  
  arrival5Min: (techName: string) => ({
    body: `${techName} is 5 minutes away! Please ensure someone is available to let us in.`
  }),
  
  quoteReady: (customerName: string, amount: number, quoteUrl: string) => ({
    body: `Hi ${customerName}, your repair quote is ready: $${amount.toFixed(2)}. View details: ${quoteUrl} Reply YES to approve or call us with questions.`
  }),
  
  invoiceSent: (customerName: string, amount: number, invoiceUrl: string) => ({
    body: `Hi ${customerName}, your invoice for $${amount.toFixed(2)} is ready. Pay online: ${invoiceUrl} Thank you for choosing Appliance Man Dan!`
  }),
  
  paymentReminder: (customerName: string, amount: number, daysOverdue: number) => ({
    body: `Hi ${customerName}, friendly reminder: Invoice for $${amount.toFixed(2)} is ${daysOverdue} days past due. Pay online or call us to discuss payment options.`
  }),
  
  partsArrived: (customerName: string, date: string) => ({
    body: `Good news ${customerName}! Your parts have arrived. We can schedule your repair for ${date}. Reply with a preferred time or call us.`
  }),
  
  serviceComplete: (customerName: string) => ({
    body: `Thank you ${customerName}! Your ${appliance} repair is complete. If you have any issues, please call us within 30 days. We'd love a review: [review_link]`
  }),
  
  reviewRequest: (customerName: string, reviewUrl: string) => ({
    body: `Hi ${customerName}, we hope you're happy with your repair! Would you mind leaving us a quick review? ${reviewUrl} Thank you!`
  })
};

// Send job confirmation SMS
export async function sendJobConfirmationSMS(job: any) {
  const template = SMSTemplates.jobConfirmation(
    job.customer_name,
    new Date(job.scheduled_date).toLocaleDateString(),
    new Date(job.scheduled_date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    })
  );
  
  return sendSMS({
    to: job.customer_phone,
    body: template.body
  });
}

// Send arrival notification
export async function sendArrivalNotification(
  phone: string,
  techName: string,
  minutesAway: 30 | 5
) {
  const template = minutesAway === 30
    ? SMSTemplates.arrival30Min(techName)
    : SMSTemplates.arrival5Min(techName);
  
  return sendSMS({
    to: phone,
    body: template.body
  });
}

// Handle incoming SMS (webhook)
export async function handleIncomingSMS(body: any) {
  const from = body.From;
  const message = body.Body?.toLowerCase().trim();
  
  // Find customer by phone
  const customer = await findCustomerByPhone(from);
  
  if (!customer) {
    return {
      response: "Thank you for contacting Appliance Man Dan. We couldn't find your number in our system. Please call us at (307) 684-9126."
    };
  }
  
  // Handle common responses
  if (message === 'yes' || message === 'approve') {
    // Check for pending quote
    const pendingQuote = await getPendingQuote(customer.id);
    if (pendingQuote) {
      await approveQuote(pendingQuote.id);
      return {
        response: `Great! Your quote for $${pendingQuote.total} has been approved. We'll order the parts and contact you to schedule the repair.`
      };
    }
  }
  
  if (message === 'stop') {
    await optOutCustomer(customer.id);
    return {
      response: "You've been unsubscribed from SMS notifications. You can opt back in anytime by calling us."
    };
  }
  
  // Default response
  return {
    response: `Thanks for your message! We'll get back to you soon. For immediate assistance, call us at (307) 684-9126.`
  };
}
```

### 2. SMS Webhook Endpoint

**File: `/pages/api/webhooks/sms.ts`**

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { handleIncomingSMS } from '@/lib/twilio';
import twilio from 'twilio';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Validate Twilio request
    const twilioSignature = req.headers['x-twilio-signature'] as string;
    const url = `${process.env.BASE_URL}/api/webhooks/sms`;
    
    if (!twilio.validateRequest(
      process.env.TWILIO_AUTH_TOKEN!,
      twilioSignature,
      url,
      req.body
    )) {
      return res.status(403).json({ error: 'Invalid signature' });
    }
    
    // Handle the incoming SMS
    const result = await handleIncomingSMS(req.body);
    
    // Respond with TwiML
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message(result.response);
    
    res.setHeader('Content-Type', 'text/xml');
    res.status(200).send(twiml.toString());
  } catch (error) {
    console.error('SMS webhook error:', error);
    res.status(500).json({ error: 'Failed to process SMS' });
  }
}
```

---

## 📧 Email Integration

### 1. Email Setup (Resend)

**File: `/lib/email.ts`**

```typescript
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
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
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
              <p>${quoteData.diagnosis}</p>
              
              <h3>Quote Details:</h3>
              ${quoteData.line_items.map((item: any) => `
                <div class="line-item">
                  <span>${item.description}</span>
                  <span>$${item.total.toFixed(2)}</span>
                </div>
              `).join('')}
              
              <div class="total">
                Total: $${quoteData.total.toFixed(2)}
              </div>
              
              <a href="${process.env.BASE_URL}/quotes/${quoteData.id}" class="button">
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
  
  invoiceEmail: (customerName: string, invoiceData: any, pdfBuffer: Buffer) => ({
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
              <p><strong>Amount Due:</strong> $${invoiceData.total.toFixed(2)}</p>
              <p><strong>Due Date:</strong> ${new Date(invoiceData.due_date).toLocaleDateString()}</p>
              
              <a href="${process.env.BASE_URL}/pay/${invoiceData.id}" class="button">
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
    `,
    attachments: [{
      filename: `invoice-${invoiceData.invoice_number}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf'
    }]
  }),
  
  paymentReceipt: (customerName: string, paymentData: any) => ({
    subject: `Payment Receipt - $${paymentData.amount.toFixed(2)}`,
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
              <p><strong>Amount:</strong> $${paymentData.amount.toFixed(2)}</p>
              <p><strong>Method:</strong> ${paymentData.payment_method}</p>
              <p><strong>Date:</strong> ${new Date(paymentData.payment_date).toLocaleDateString()}</p>
              <p><strong>Reference:</strong> ${paymentData.reference_number}</p>
              
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
              <p>We hope you're happy with your ${jobData.appliance_type} repair!</p>
              <p>We'd love to hear about your experience. Your feedback helps us improve and helps other customers make informed decisions.</p>
              
              <div class="stars">⭐⭐⭐⭐⭐</div>
              
              <a href="${process.env.BASE_URL}/review/${jobData.id}" class="button">
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

// Send quote email with PDF
export async function sendQuoteEmail(quote: any, customer: any) {
  // Generate PDF (you'll implement this)
  const pdfBuffer = await generateQuotePDF(quote);
  
  const template = EmailTemplates.quoteEmail(customer.first_name, quote);
  
  return sendEmail({
    to: customer.email,
    subject: template.subject,
    html: template.html,
    attachments: [{
      filename: `quote-${quote.quote_number}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf'
    }]
  });
}
```

---

## 💳 Payment Processing (Stripe)

### 1. Stripe Setup

**File: `/lib/stripe.ts`**

```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
});

// Create payment intent
export async function createPaymentIntent(
  amount: number,
  customerId?: string,
  metadata?: Record<string, string>
) {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      customer: customerId,
      metadata: metadata || {},
      automatic_payment_methods: {
        enabled: true
      }
    });
    
    return paymentIntent;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
}

// Create payment link
export async function createPaymentLink(
  invoiceId: string,
  amount: number,
  description: string
) {
  try {
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: description
          },
          unit_amount: Math.round(amount * 100)
        },
        quantity: 1
      }],
      metadata: {
        invoice_id: invoiceId
      },
      after_completion: {
        type: 'redirect',
        redirect: {
          url: `${process.env.BASE_URL}/payment/success?invoice=${invoiceId}`
        }
      }
    });
    
    return paymentLink;
  } catch (error) {
    console.error('Error creating payment link:', error);
    throw error;
  }
}

// Create or get customer
export async function createStripeCustomer(
  email: string,
  name: string,
  phone?: string
) {
  try {
    // Check if customer exists
    const existing = await stripe.customers.list({
      email,
      limit: 1
    });
    
    if (existing.data.length > 0) {
      return existing.data[0];
    }
    
    // Create new customer
    const customer = await stripe.customers.create({
      email,
      name,
      phone
    });
    
    return customer;
  } catch (error) {
    console.error('Error creating Stripe customer:', error);
    throw error;
  }
}

// Process refund
export async function processRefund(
  paymentIntentId: string,
  amount?: number,
  reason?: string
) {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined,
      reason: reason as any
    });
    
    return refund;
  } catch (error) {
    console.error('Error processing refund:', error);
    throw error;
  }
}

// Webhook handler
export async function handleStripeWebhook(
  signature: string,
  payload: Buffer
) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  
  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );
    
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      
      case 'charge.refunded':
        await handleRefund(event.data.object);
        break;
    }
    
    return { received: true };
  } catch (error) {
    console.error('Webhook error:', error);
    throw error;
  }
}

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const invoiceId = paymentIntent.metadata.invoice_id;
  
  // Record payment in database
  await recordPayment({
    invoice_id: invoiceId,
    amount: paymentIntent.amount / 100,
    payment_method: 'card',
    reference_number: paymentIntent.id,
    payment_date: new Date()
  });
  
  // Send receipt email
  // Update invoice status
  // Send notification
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment failed:', paymentIntent.id);
  // Notify customer and admin
}

async function handleRefund(charge: Stripe.Charge) {
  console.log('Refund processed:', charge.id);
  // Update payment record
  // Send refund confirmation email
}
```

### 2. Payment Page

**File: `/components/payment/CheckoutForm.tsx`**

```typescript
import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function CheckoutFormInner({ amount, invoiceId }: { amount: number; invoiceId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message || 'An error occurred');
        setLoading(false);
        return;
      }
      
      // Create payment intent
      const response = await fetch('/api/payment/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          invoiceId
        })
      });
      
      const { clientSecret } = await response.json();
      
      // Confirm payment
      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/payment/success?invoice=${invoiceId}`
        }
      });
      
      if (confirmError) {
        setError(confirmError.message || 'Payment failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      
      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded">
          {error}
        </div>
      )}
      
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full mt-6 bg-indigo-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
      >
        {loading ? 'Processing...' : `Pay $${amount.toFixed(2)}`}
      </button>
    </form>
  );
}

export function CheckoutForm({ amount, invoiceId }: { amount: number; invoiceId: string }) {
  const [clientSecret, setClientSecret] = useState<string>('');
  
  React.useEffect(() => {
    // Create payment intent on mount
    fetch('/api/payment/create-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, invoiceId })
    })
      .then(res => res.json())
      .then(data => setClientSecret(data.clientSecret));
  }, [amount, invoiceId]);
  
  if (!clientSecret) {
    return <div>Loading payment form...</div>;
  }
  
  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CheckoutFormInner amount={amount} invoiceId={invoiceId} />
    </Elements>
  );
}
```

---

## 📦 Parts Supplier Integration

### 1. SupplyHouse API (Example)

**File: `/lib/suppliers/supplyhouse.ts`**

```typescript
export interface PartPrice {
  part_number: string;
  price: number;
  in_stock: boolean;
  lead_time_days: number;
  supplier: string;
}

export async function lookupPartPrice(partNumber: string): Promise<PartPrice | null> {
  try {
    const response = await fetch('https://api.supplyhouse.com/v1/parts/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPPLYHOUSE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        part_number: partNumber
      })
    });
    
    if (!response.ok) {
      console.error('SupplyHouse API error:', response.status);
      return null;
    }
    
    const data = await response.json();
    
    return {
      part_number: data.part_number,
      price: data.price,
      in_stock: data.stock_status === 'in_stock',
      lead_time_days: data.estimated_ship_days || 3,
      supplier: 'SupplyHouse'
    };
  } catch (error) {
    console.error('Error fetching part price:', error);
    return null;
  }
}

export async function createOrder(parts: Array<{ part_number: string; quantity: number }>) {
  try {
    const response = await fetch('https://api.supplyhouse.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPPLYHOUSE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: parts,
        shipping_address: {
          // Your business address
        }
      })
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
}
```

---

## 🚚 Shipping Tracking Integration

### 1. Multi-Carrier Tracking

**File: `/lib/shipping-tracker.ts`**

```typescript
export async function getTrackingInfo(trackingNumber: string, carrier?: string) {
  // Auto-detect carrier if not provided
  const detectedCarrier = carrier || detectCarrier(trackingNumber);
  
  switch (detectedCarrier) {
    case 'ups':
      return trackUPS(trackingNumber);
    case 'fedex':
      return trackFedEx(trackingNumber);
    case 'usps':
      return trackUSPS(trackingNumber);
    default:
      throw new Error('Unsupported carrier');
  }
}

function detectCarrier(trackingNumber: string): string {
  // UPS: 1Z followed by 16 characters
  if (/^1Z[0-9A-Z]{16}$/.test(trackingNumber)) {
    return 'ups';
  }
  
  // FedEx: 12 or 14 digits
  if (/^\d{12}$/.test(trackingNumber) || /^\d{14}$/.test(trackingNumber)) {
    return 'fedex';
  }
  
  // USPS: 20-22 digits
  if (/^\d{20,22}$/.test(trackingNumber)) {
    return 'usps';
  }
  
  return 'unknown';
}

async function trackUPS(trackingNumber: string) {
  // UPS API integration
  // Return standardized tracking data
}

async function trackFedEx(trackingNumber: string) {
  // FedEx API integration
}

async function trackUSPS(trackingNumber: string) {
  // USPS API integration
}
```

---

## 🧪 Testing Procedures

### Test Calendar Sync
1. Connect Google Calendar
2. Create a job with scheduled date
3. Verify event appears in calendar
4. Update job schedule
5. Verify calendar event updates
6. Delete job
7. Verify calendar event removed

### Test SMS Notifications
1. Configure Twilio credentials
2. Create job with customer phone
3. Trigger job confirmation SMS
4. Verify SMS received
5. Reply with "YES" to test incoming
6. Verify auto-response

### Test Email Automation
1. Configure email service
2. Send quote email
3. Verify email received with PDF
4. Send invoice email
5. Verify payment receipt email
6. Test review request email

### Test Payment Processing
1. Configure Stripe
2. Create test invoice
3. Generate payment link
4. Process test payment
5. Verify webhook received
6. Verify payment recorded
7. Test refund process

---

## ✅ Success Criteria

### Stage 11 is complete when:
- ✅ Google Calendar bidirectional sync working
- ✅ SMS notifications send successfully
- ✅ Incoming SMS processed correctly
- ✅ Email templates render properly
- ✅ Quote/invoice emails include PDFs
- ✅ Payment processing works end-to-end
- ✅ Stripe webhooks handled correctly
- ✅ Parts prices fetched from suppliers
- ✅ Shipping tracking updates automatically
- ✅ All integrations have error handling
- ✅ Fallbacks work when APIs unavailable
- ✅ Rate limiting implemented
- ✅ API keys stored securely
- ✅ Logs capture integration events

### Key Performance Targets:
- API response time: <2 seconds
- Email delivery: <30 seconds
- SMS delivery: <10 seconds
- Payment processing: <5 seconds
- Webhook processing: <1 second
- Error rate: <1%

---

## 🚀 What's Next?

After Stage 11, you'll have full integration with external services! Stage 12 (final) will add:
- **Production Deployment**
- Performance optimization
- Security hardening
- Monitoring and logging
- Documentation
- Training materials
- Backup and disaster recovery

---

## 📚 Resources

- Twilio Docs: https://www.twilio.com/docs
- Stripe Docs: https://stripe.com/docs
- Resend Docs: https://resend.com/docs
- Google Calendar API: https://developers.google.com/calendar
- Webhooks Best Practices: https://webhooks.fyi

---

**Stage 11 connects your system to the outside world, automating communications and integrating with essential business services! 🔌**
