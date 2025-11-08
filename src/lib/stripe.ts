import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

function getStripe() {
  if (!stripeInstance && process.env.STRIPE_SECRET_KEY) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-10-29.clover'
    });
  }
  return stripeInstance;
}

// Create payment intent
export async function createPaymentIntent(
  amount: number,
  customerId?: string,
  metadata?: Record<string, string>
) {
  const stripe = getStripe();
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

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
  const stripe = getStripe();
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

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
          url: `${process.env.NEXT_PUBLIC_BASE_URL || ''}/payment/success?invoice=${invoiceId}`
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
  const stripe = getStripe();
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

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
  const stripe = getStripe();
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

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
  const stripe = getStripe();
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('Webhook secret not configured');
  }

  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );

    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'charge.refunded':
        await handleRefund(event.data.object as Stripe.Charge);
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

  console.log('Payment succeeded:', {
    invoiceId,
    amount: paymentIntent.amount / 100,
    id: paymentIntent.id
  });

  // TODO: Record payment in database
  // TODO: Send receipt email
  // TODO: Update invoice status
  // TODO: Send notification
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment failed:', paymentIntent.id);
  // TODO: Notify customer and admin
}

async function handleRefund(charge: Stripe.Charge) {
  console.log('Refund processed:', charge.id);
  // TODO: Update payment record
  // TODO: Send refund confirmation email
}
