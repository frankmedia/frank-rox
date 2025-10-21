import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Video, CalendarDays, Check, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const BookPT = () => {
  const { user } = useAuth();
  const [date, setDate] = useState<Date>();
  const [formData, setFormData] = useState({
    name: user?.username || "",
    email: "",
    time: "",
    goals: "",
    packageType: "single", // single or recurring
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!date) {
      toast.error("Please select a date for your session");
      return;
    }

    setIsSubmitting(true);

    // TODO: Integrate with Stripe Payment
    // For now, just show success message
    toast.success("Booking request received! We'll contact you shortly to confirm payment and schedule.");
    
    // Reset form
    setFormData({
      name: user?.username || "",
      email: "",
      time: "",
      goals: "",
      packageType: "single",
    });
    setDate(undefined);
    setIsSubmitting(false);
  };

  const benefits = [
    "Personalized form checks & technique coaching",
    "Custom programme adjustments for your goals",
    "Race-day strategy & pacing plans",
    "Injury prevention & recovery guidance",
    "Direct WhatsApp support between sessions",
    "Video analysis of your movements",
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Video className="w-8 h-8" style={{ color: '#FFCC00' }} />
            <h1 className="text-2xl font-bold text-foreground">Book 1-on-1 Coaching</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Hero Section */}
        <Card className="p-6 border-2" style={{ borderColor: '#FFCC00' }}>
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold text-foreground">
              Level Up Your Training
            </h2>
            <p className="text-lg text-muted-foreground">
              Get personalized coaching from Frank the Tank
            </p>
            <div className="flex items-center justify-center gap-4 pt-2">
              <div className="text-center">
                <p className="text-4xl font-bold" style={{ color: '#FFCC00' }}>£100</p>
                <p className="text-sm text-muted-foreground">per session</p>
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
          <h3 className="text-xl font-bold text-foreground mb-4">Book Your Session</h3>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Package Type */}
            <div className="space-y-3">
              <Label className="text-base font-bold">Select Package:</Label>
              <RadioGroup
                value={formData.packageType}
                onValueChange={(value) => setFormData({ ...formData, packageType: value })}
              >
                <div className="flex items-center space-x-3 p-4 border-2 border-border rounded-lg hover:border-primary transition-colors">
                  <RadioGroupItem value="single" id="single" />
                  <Label htmlFor="single" className="flex-1 cursor-pointer">
                    <div>
                      <p className="font-bold">Single Session</p>
                      <p className="text-sm text-muted-foreground">£100 one-time payment</p>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-4 border-2 rounded-lg hover:border-primary transition-colors" style={{ borderColor: '#FFCC00' }}>
                  <RadioGroupItem value="recurring" id="recurring" />
                  <Label htmlFor="recurring" className="flex-1 cursor-pointer">
                    <div>
                      <p className="font-bold">Monthly Coaching Package</p>
                      <p className="text-sm text-muted-foreground">£100/month • Recurring check-ins & support</p>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

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
              <CreditCard className="w-5 h-5 mr-2" />
              {isSubmitting ? "Processing..." : `Pay £100 & Book ${formData.packageType === 'recurring' ? 'Monthly Package' : 'Session'}`}
            </Button>
          </form>
        </Card>

        {/* Additional Info */}
        <Card className="p-4 bg-secondary/10">
          <p className="text-sm text-muted-foreground text-center">
            <strong>Note:</strong> After submitting, you'll be contacted to confirm payment details and finalize your booking.
            All sessions are conducted via video call (Zoom/Google Meet).
          </p>
        </Card>
      </main>
    </div>
  );
};

export default BookPT;

