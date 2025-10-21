import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Video, CalendarDays, Check, ArrowLeft, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { StripePaymentForm } from "@/components/StripePaymentForm";

// Initialize Stripe (using test key for now)
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

const BookPT = () => {
  const { user } = useAuth();
  const [date, setDate] = useState<Date>();
  const [formData, setFormData] = useState({
    name: user?.username || "",
    email: "",
    time: "",
    goals: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!date) {
      toast.error("Please select a date for your session");
      return;
    }

    // Show summary screen first
    setShowSummary(true);
  };

  const handleSubscribeClick = async () => {
    if (!date) return;

    setIsSubmitting(true);

    try {
      // Create SetupIntent via API
      const response = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          preferredDate: format(date, "PPP"),
          preferredTime: formData.time,
          goals: formData.goals,
        }),
      });

      const data = await response.json();

      if (response.ok && data.clientSecret) {
        setClientSecret(data.clientSecret);
        setCustomerId(data.customerId);
      } else {
        toast.error(data.message || "Failed to initialize payment");
      }
    } catch (error) {
      console.error("Setup error:", error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentSuccess = () => {
    setShowSuccess(true);
    // Reset form
    setFormData({
      name: user?.username || "",
      email: "",
      time: "",
      goals: "",
    });
    setDate(undefined);
    setClientSecret(null);
    setCustomerId(null);
  };

  const handleBack = () => {
    if (clientSecret) {
      // Back from payment to summary
      setClientSecret(null);
      setCustomerId(null);
    } else if (showSummary) {
      // Back from summary to form
      setShowSummary(false);
    }
  };

  const benefits = [
    "Custom-tailored training programme for your goals",
    "Weekly 20-minute check-in sessions",
    "Nutrition advice & meal planning guidance",
    "Training progress review & adjustments",
    "Form checks & technique analysis",
  ];

  // Success View
  if (showSuccess) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
          <div className="container max-w-2xl mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <Video className="w-8 h-8" style={{ color: '#FFCC00' }} />
              <h1 className="text-2xl font-bold text-foreground">Weekly Check-In Coaching</h1>
            </div>
          </div>
        </header>

        <main className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
          <Card className="p-8 border-2 text-center" style={{ borderColor: '#FFCC00' }}>
            <CheckCircle2 className="w-20 h-20 mx-auto mb-4" style={{ color: '#FFCC00' }} />
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Welcome Aboard! 🎉
            </h2>
            <p className="text-lg text-muted-foreground mb-6">
              Your subscription is active. Frank will reach out within 24 hours to schedule your first check-in!
            </p>
            <Button
              onClick={() => setShowSuccess(false)}
              className="w-full h-12"
              style={{ backgroundColor: '#FFCC00', color: '#000' }}
            >
              Book Another Session
            </Button>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Video className="w-8 h-8" style={{ color: '#FFCC00' }} />
            <h1 className="text-2xl font-bold text-foreground">Weekly Check-In Coaching</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        {!showSummary && !clientSecret ? (
          <>
            {/* Hero Section */}
            <Card className="p-6 border-2" style={{ borderColor: '#FFCC00' }}>
              <div className="text-center space-y-4">
                <h2 className="text-3xl font-bold text-foreground">
                  Weekly Check-In Coaching
                </h2>
                <p className="text-lg text-muted-foreground">
                  20-minute weekly sessions covering nutrition, training & progress
                </p>
                <div className="flex items-center justify-center gap-4 pt-2">
                  <div className="text-center">
                    <p className="text-4xl font-bold" style={{ color: '#FFCC00' }}>£99.99</p>
                    <p className="text-sm text-muted-foreground">per month</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Benefits */}
            <Card className="p-6">
              <h3 className="text-xl font-bold text-foreground mb-4">What You Get:</h3>
              <div className="space-y-3">
                {benefits.map((benefit, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <Check className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#FFCC00' }} />
                    <p className="text-foreground">{benefit}</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Booking Form */}
            <Card className="p-6">
              <h3 className="text-xl font-bold text-foreground mb-4">Book Your First Check-In</h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Info Card */}
                <Card className="p-4 border-2" style={{ borderColor: '#FFCC00' }}>
                  <div className="space-y-2">
                    <p className="font-bold text-foreground">Monthly Check-In Programme</p>
                    <p className="text-sm text-muted-foreground">
                      £99.99/month • 4 weekly 20-minute video sessions covering nutrition, training progress, and custom programme adjustments
                    </p>
                  </div>
                </Card>

                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="Enter your full name"
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    placeholder="your.email@example.com"
                  />
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Preferred Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarDays className="mr-2 h-4 w-4" />
                          {date ? format(date, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={setDate}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="time">Preferred Time</Label>
                    <Input
                      id="time"
                      type="time"
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Goals / Message */}
                <div className="space-y-2">
                  <Label htmlFor="goals">What do you want to work on?</Label>
                  <Textarea
                    id="goals"
                    value={formData.goals}
                    onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
                    placeholder="E.g., improving sled push technique, running form, race pacing strategy..."
                    rows={4}
                    required
                  />
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-14 text-lg font-bold"
                  style={{ backgroundColor: '#FFCC00', color: '#000' }}
                >
                  {isSubmitting ? "Loading..." : "Continue to Payment"}
                </Button>
              </form>
            </Card>

            {/* Additional Info */}
            <Card className="p-4 bg-secondary/10">
              <p className="text-sm text-muted-foreground text-center">
                <strong>Note:</strong> All sessions are conducted via video call (Zoom/Google Meet).
                Cancel anytime from your account settings.
              </p>
            </Card>
          </>
        ) : showSummary && !clientSecret ? (
          <>
            {/* Summary / Confirmation Screen */}
            <Card className="p-6 border-2" style={{ borderColor: '#FFCC00' }}>
              <div className="text-center space-y-4">
                <h2 className="text-3xl font-bold text-foreground">
                  Ready to Start Your Journey?
                </h2>
                <p className="text-lg text-muted-foreground">
                  Review your details and subscribe to get started
                </p>
              </div>
            </Card>

            {/* Summary Details */}
            <Card className="p-6 space-y-4">
              <h3 className="text-xl font-bold text-foreground mb-4">Your Details:</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Name:</span>
                  <span className="font-semibold text-foreground">{formData.name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-semibold text-foreground">{formData.email}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">First Session:</span>
                  <span className="font-semibold text-foreground">
                    {date ? format(date, "PPP") : ""} at {formData.time}
                  </span>
                </div>
                <div className="py-2">
                  <span className="text-muted-foreground block mb-2">Goals:</span>
                  <p className="text-foreground">{formData.goals}</p>
                </div>
              </div>
            </Card>

            {/* Pricing Summary */}
            <Card className="p-6 border-2" style={{ borderColor: '#FFCC00' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-bold text-foreground">Monthly Subscription</p>
                  <p className="text-sm text-muted-foreground">4 weekly check-ins</p>
                </div>
                <p className="text-3xl font-bold" style={{ color: '#FFCC00' }}>£99.99</p>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>✓ Cancel anytime, no commitment</p>
                <p>✓ First session within 7 days</p>
              </div>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleSubscribeClick}
                disabled={isSubmitting}
                className="w-full h-14 text-lg font-bold"
                style={{ backgroundColor: '#FFCC00', color: '#000' }}
              >
                {isSubmitting ? "Loading..." : "Subscribe Now - £99.99/month"}
              </Button>
              
              <Button
                onClick={handleBack}
                variant="outline"
                className="w-full h-12"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Edit Details
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Payment Form */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  className="p-0 h-auto hover:bg-transparent"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back
                </Button>
              </div>

              <h3 className="text-2xl font-bold text-foreground mb-2">Complete Your Subscription</h3>
              <p className="text-muted-foreground mb-6">
                Enter your payment details to start your weekly coaching programme
              </p>

              {clientSecret && customerId && (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: "night",
                      variables: {
                        colorPrimary: "#FFCC00",
                        colorBackground: "#000000",
                        colorText: "#ffffff",
                        colorDanger: "#ff5555",
                      },
                    },
                  }}
                >
                  <StripePaymentForm
                    customerId={customerId}
                    onSuccess={handlePaymentSuccess}
                  />
                </Elements>
              )}
            </Card>

            <Card className="p-4 bg-secondary/10">
              <p className="text-sm text-muted-foreground text-center">
                🔒 Secure payment powered by Stripe • Cancel anytime
              </p>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default BookPT;
