import { useState } from "react";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface StripePaymentFormProps {
  customerId: string;
  onSuccess: () => void;
}

export const StripePaymentForm = ({ customerId, onSuccess }: StripePaymentFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      // Confirm the setup
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        redirect: "if_required",
      });

      if (error) {
        toast.error(error.message || "Payment failed");
        setIsProcessing(false);
        return;
      }

      if (setupIntent && setupIntent.payment_method) {
        // Create subscription with the payment method
        const response = await fetch("/api/create-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerId,
            paymentMethodId: setupIntent.payment_method,
          }),
        });

        const data = await response.json();

        if (response.ok && data.subscriptionId) {
          toast.success("Subscription created successfully! 🎉");
          onSuccess();
        } else {
          toast.error(data.message || "Failed to create subscription");
        }
      }
    } catch (err: any) {
      console.error("Payment error:", err);
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 border-2 border-border rounded-lg">
        <PaymentElement />
      </div>

      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full h-14 text-lg font-bold"
        style={{ backgroundColor: '#FFCC00', color: '#000' }}
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5 mr-2" />
            Subscribe for £99.99/month
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Your subscription will start immediately and you can cancel anytime.
      </p>
    </form>
  );
};

