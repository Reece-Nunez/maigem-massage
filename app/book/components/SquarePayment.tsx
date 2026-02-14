'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Card } from '@/components/ui/card'

declare global {
  interface Window {
    Square: any
  }
}

interface SquarePaymentProps {
  amountCents: number | null
  priceDisplay: string | null
  paymentMethod: 'pay_at_appointment' | 'pay_online'
  onPaymentMethodChange: (method: 'pay_at_appointment' | 'pay_online') => void
  onPaymentToken: (token: string) => void
  onPaymentReady: (ready: boolean) => void
}

export function SquarePayment({
  amountCents,
  priceDisplay,
  paymentMethod,
  onPaymentMethodChange,
  onPaymentToken,
  onPaymentReady,
}: SquarePaymentProps) {
  const cardContainerRef = useRef<HTMLDivElement>(null)
  const cardInstanceRef = useRef<any>(null)
  const [sdkLoaded, setSdkLoaded] = useState(false)
  const [cardReady, setCardReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasFixedPrice = amountCents != null && amountCents > 0

  // Load Square Web Payments SDK script
  useEffect(() => {
    if (document.getElementById('square-web-sdk')) {
      setSdkLoaded(true)
      return
    }

    const env = process.env.NEXT_PUBLIC_SQUARE_ENVIRONMENT
    const scriptUrl = env === 'production'
      ? 'https://web.squarecdn.com/v1/square.js'
      : 'https://sandbox.web.squarecdn.com/v1/square.js'

    const script = document.createElement('script')
    script.id = 'square-web-sdk'
    script.src = scriptUrl
    script.onload = () => setSdkLoaded(true)
    script.onerror = () => setError('Failed to load payment system')
    document.head.appendChild(script)
  }, [])

  // Initialize card form when SDK is loaded and pay_online is selected
  useEffect(() => {
    if (!sdkLoaded || paymentMethod !== 'pay_online' || !cardContainerRef.current) return

    let cancelled = false

    async function initCard() {
      try {
        const payments = window.Square.payments(
          process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID,
          process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID
        )

        const card = await payments.card({
          style: {
            '.input-container': {
              borderColor: '#d4c5b5',
              borderRadius: '12px',
            },
            '.input-container.is-focus': {
              borderColor: '#4682b4',
            },
            '.input-container.is-error': {
              borderColor: '#dc3545',
            },
            '.message-text': {
              color: '#6b6b6b',
            },
            '.message-icon': {
              color: '#6b6b6b',
            },
            '.message-text.is-error': {
              color: '#dc3545',
            },
            input: {
              fontFamily: 'Arial, Helvetica, sans-serif',
              color: '#2d2d2d',
              fontSize: '16px',
            },
            'input::placeholder': {
              color: '#6b6b6b',
            },
          },
        })

        if (cancelled) return

        await card.attach(cardContainerRef.current!)
        cardInstanceRef.current = card
        setCardReady(true)
        onPaymentReady(true)
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to initialize card form:', err)
          setError('Failed to initialize payment form')
          onPaymentReady(false)
        }
      }
    }

    initCard()

    return () => {
      cancelled = true
      if (cardInstanceRef.current) {
        cardInstanceRef.current.destroy()
        cardInstanceRef.current = null
      }
      setCardReady(false)
      onPaymentReady(false)
    }
  }, [sdkLoaded, paymentMethod, onPaymentReady])

  // Tokenize card when called by parent
  const tokenize = useCallback(async (): Promise<string | null> => {
    if (!cardInstanceRef.current) return null

    try {
      const result = await cardInstanceRef.current.tokenize()
      if (result.status === 'OK') {
        onPaymentToken(result.token)
        return result.token
      } else {
        setError('Payment verification failed. Please check your card details.')
        return null
      }
    } catch (err) {
      console.error('Tokenization failed:', err)
      setError('Payment verification failed. Please try again.')
      return null
    }
  }, [onPaymentToken])

  // Expose tokenize to parent via ref-like pattern
  useEffect(() => {
    (window as any).__squareTokenize = tokenize
    return () => {
      delete (window as any).__squareTokenize
    }
  }, [tokenize])

  return (
    <div className="space-y-4 sm:space-y-6">
      <h3 className="text-base sm:text-lg font-semibold text-foreground">How would you like to pay?</h3>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Pay Now option — only if fixed price */}
        {hasFixedPrice && (
          <Card
            onClick={() => onPaymentMethodChange('pay_online')}
            selected={paymentMethod === 'pay_online'}
            className="p-4 sm:p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                paymentMethod === 'pay_online' ? 'border-primary' : 'border-secondary'
              }`}>
                {paymentMethod === 'pay_online' && (
                  <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                )}
              </div>
              <h4 className="font-semibold text-foreground">Pay Now</h4>
            </div>
            <p className="text-text-muted text-xs sm:text-sm ml-8">
              Pay {priceDisplay} securely with your card
            </p>
          </Card>
        )}

        {/* Pay at Appointment option */}
        <Card
          onClick={() => onPaymentMethodChange('pay_at_appointment')}
          selected={paymentMethod === 'pay_at_appointment'}
          className="p-4 sm:p-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              paymentMethod === 'pay_at_appointment' ? 'border-primary' : 'border-secondary'
            }`}>
              {paymentMethod === 'pay_at_appointment' && (
                <div className="w-2.5 h-2.5 rounded-full bg-primary" />
              )}
            </div>
            <h4 className="font-semibold text-foreground">Pay at Appointment</h4>
          </div>
          <p className="text-text-muted text-xs sm:text-sm ml-8">
            Cash, card, or Venmo at your visit
          </p>
        </Card>
      </div>

      {/* Card form */}
      {paymentMethod === 'pay_online' && hasFixedPrice && (
        <div className="space-y-3">
          <div
            ref={cardContainerRef}
            className="min-h-[90px]"
          />
          {!cardReady && !error && (
            <div className="text-center py-4 text-text-muted text-sm">
              Loading payment form...
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="p-3 sm:p-4 bg-red-50 text-red-600 rounded-xl text-xs sm:text-sm">
          {error}
        </div>
      )}
    </div>
  )
}
