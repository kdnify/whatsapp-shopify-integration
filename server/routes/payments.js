const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

// Create checkout session for subscription
router.post('/create-subscription', async (req, res) => {
  try {
    const { priceId, customerId, successUrl, cancelUrl } = req.body;
    
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer: customerId,
      success_url: successUrl || `${process.env.FRONTEND_URL}/success`,
      cancel_url: cancelUrl || `${process.env.FRONTEND_URL}/cancel`,
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Stripe subscription error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Create one-time payment
router.post('/create-payment', async (req, res) => {
  try {
    const { amount, currency = 'usd', description, successUrl, cancelUrl } = req.body;
    
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: description || 'MVP Service',
            },
            unit_amount: amount, // amount in cents
          },
          quantity: 1,
        },
      ],
      success_url: successUrl || `${process.env.FRONTEND_URL}/success`,
      cancel_url: cancelUrl || `${process.env.FRONTEND_URL}/cancel`,
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Stripe payment error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Webhook for payment confirmations
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.log(`Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      console.log('Payment successful:', session.id);
      // TODO: Update user subscription status
      break;
    case 'invoice.payment_succeeded':
      const invoice = event.data.object;
      console.log('Subscription payment succeeded:', invoice.id);
      // TODO: Extend subscription
      break;
    case 'customer.subscription.deleted':
      const subscription = event.data.object;
      console.log('Subscription cancelled:', subscription.id);
      // TODO: Handle cancellation
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

module.exports = router; 