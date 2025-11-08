import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

let client: ReturnType<typeof twilio> | null = null;

// Lazy initialize client
function getClient() {
  if (!client && accountSid && authToken) {
    client = twilio(accountSid, authToken);
  }
  return client;
}

export interface SMSOptions {
  to: string;
  body: string;
  mediaUrl?: string;
}

export async function sendSMS({ to, body, mediaUrl }: SMSOptions) {
  const twilioClient = getClient();
  if (!twilioClient || !phoneNumber) {
    console.error('Twilio not configured');
    throw new Error('Twilio not configured');
  }

  try {
    const message = await twilioClient.messages.create({
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

  serviceComplete: (customerName: string, appliance: string, reviewUrl: string) => ({
    body: `Thank you ${customerName}! Your ${appliance} repair is complete. If you have any issues, please call us within 30 days. We'd love a review: ${reviewUrl}`
  }),

  reviewRequest: (customerName: string, reviewUrl: string) => ({
    body: `Hi ${customerName}, we hope you're happy with your repair! Would you mind leaving us a quick review? ${reviewUrl} Thank you!`
  })
};

interface JobData {
  customer_name: string;
  customer_phone: string;
  scheduled_date: string;
}

// Send job confirmation SMS
export async function sendJobConfirmationSMS(job: JobData) {
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
  // const from = body.From;
  const message = body.Body?.toLowerCase().trim();

  // Find customer by phone (placeholder - implement with your DB)
  // const customer = await findCustomerByPhone(from);

  // if (!customer) {
  //   return {
  //     response: "Thank you for contacting Appliance Man Dan. We couldn't find your number in our system. Please call us at (307) 684-9126."
  //   };
  // }

  // Handle common responses
  if (message === 'yes' || message === 'approve') {
    // Check for pending quote
    // const pendingQuote = await getPendingQuote(customer.id);
    // if (pendingQuote) {
    //   await approveQuote(pendingQuote.id);
    //   return {
    //     response: `Great! Your quote for $${pendingQuote.total} has been approved. We'll order the parts and contact you to schedule the repair.`
    //   };
    // }
  }

  if (message === 'stop') {
    // await optOutCustomer(customer.id);
    return {
      response: "You've been unsubscribed from SMS notifications. You can opt back in anytime by calling us."
    };
  }

  // Default response
  return {
    response: `Thanks for your message! We'll get back to you soon. For immediate assistance, call us at (307) 684-9126.`
  };
}
