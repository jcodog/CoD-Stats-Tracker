"use client"

import { useState } from "react"
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js"
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

type CheckoutPaymentFormProps = {
  clientSecret: string
  returnUrl: string
  secretType: "payment_intent" | "setup_intent"
  submitLabel?: string
  subtitle?: string
  title?: string
}

export function CheckoutPaymentForm({
  clientSecret,
  returnUrl,
  secretType,
  submitLabel = "Confirm billing",
  subtitle = "Secure card entry is handled by Stripe Elements.",
  title = "Payment details",
}: CheckoutPaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function resolveReturnUrl() {
    if (/^https?:\/\//.test(returnUrl)) {
      return returnUrl
    }

    return new URL(returnUrl, window.location.origin).toString()
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      const resolvedReturnUrl = resolveReturnUrl()

      if (secretType === "setup_intent") {
        const result = await stripe.confirmSetup({
          clientSecret,
          confirmParams: {
            return_url: resolvedReturnUrl,
          },
          elements,
          redirect: "if_required",
        })

        if (result.error) {
          setErrorMessage(result.error.message ?? "Payment confirmation failed.")
          return
        }

        window.location.assign(resolvedReturnUrl)
        return
      }

      const result = await stripe.confirmPayment({
        clientSecret,
        confirmParams: {
          return_url: resolvedReturnUrl,
        },
        elements,
        redirect: "if_required",
      })

      if (result.error) {
        setErrorMessage(result.error.message ?? "Payment confirmation failed.")
        return
      }

      window.location.assign(resolvedReturnUrl)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="border-border/70 bg-card/95 shadow-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <PaymentElement />
          {errorMessage ? (
            <Alert variant="destructive">
              <AlertTitle>Payment failed</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}
          <Button className="w-full" disabled={!stripe || !elements || isSubmitting}>
            {isSubmitting ? "Confirming..." : submitLabel}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
