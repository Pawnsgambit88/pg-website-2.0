// Razorpay payment integration helper
// Loads the Razorpay checkout script and initiates a payment

export function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

// options: { amount (in paise), currency, name, description, orderId, prefill: { name, email, contact } }
// onSuccess(paymentId, orderId, signature) — called on successful payment
// onFailure(error) — called on failure/dismissal
export async function initiatePayment({ options, onSuccess, onFailure }) {
  const loaded = await loadRazorpayScript()
  if (!loaded) {
    onFailure(new Error('Failed to load Razorpay. Check your connection.'))
    return
  }

  const rzpOptions = {
    key: import.meta.env.VITE_RAZORPAY_KEY_ID,
    amount: options.amount,
    currency: options.currency || 'INR',
    name: options.name || "Pawn's Gambit",
    description: options.description,
    order_id: options.orderId,
    prefill: options.prefill || {},
    theme: { color: '#1e3a55' },
    handler: (response) => {
      onSuccess(
        response.razorpay_payment_id,
        response.razorpay_order_id,
        response.razorpay_signature
      )
    },
    modal: {
      ondismiss: () => {
        onFailure(new Error('Payment cancelled'))
      },
    },
  }

  const rzp = new window.Razorpay(rzpOptions)
  rzp.on('payment.failed', (response) => {
    onFailure(new Error(response.error?.description || 'Payment failed'))
  })
  rzp.open()
}
