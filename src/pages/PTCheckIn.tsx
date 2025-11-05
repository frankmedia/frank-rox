import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Video, CheckCircle2, Calendar, Flame } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/utils/supabaseClient";

interface CheckInFormData {
  // Training & Activity
  sessionsCompleted: string;
  consistency: string;
  pushLevel: string;
  extraTraining: string;
  
  // Nutrition & Recovery
  nutritionRating: string;
  recoveryIssues: string;
  
  // Mindset & Goals
  motivation: string;
  proud: string;
  improve: string;
  ptFeedback: string;
}

const PTCheckIn = () => {
  const { user } = useAuth();
  const [showSuccess, setShowSuccess] = useState(false);
  const [canCheckIn, setCanCheckIn] = useState(true);
  const [daysSinceLastCheckIn, setDaysSinceLastCheckIn] = useState(0);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [formData, setFormData] = useState<CheckInFormData>({
    sessionsCompleted: "",
    consistency: "",
    pushLevel: "",
    extraTraining: "",
    nutritionRating: "",
    recoveryIssues: "",
    motivation: "",
    proud: "",
    improve: "",
    ptFeedback: "",
  });

  useEffect(() => {
    // Check last check-in date
    const username = user?.username || "default";
    const lastCheckInKey = `lastPTCheckIn_${username}`;
    const lastCheckInStr = localStorage.getItem(lastCheckInKey);
    
    if (lastCheckInStr) {
      const lastCheckInDate = new Date(lastCheckInStr);
      const now = new Date();
      const diffTime = now.getTime() - lastCheckInDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      setDaysSinceLastCheckIn(diffDays);
      setProgressPercentage(Math.min((diffDays / 14) * 100, 100));
      
      if (diffDays < 14) {
        setCanCheckIn(false);
      }
    } else {
      // No previous check-in, allow first one
      setDaysSinceLastCheckIn(14); // Show as ready
      setProgressPercentage(100);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    const missingFields = [];
    if (!formData.sessionsCompleted) missingFields.push("Training sessions completed");
    if (!formData.consistency) missingFields.push("Consistency level");
    if (!formData.pushLevel) missingFields.push("Push level");
    if (!formData.nutritionRating) missingFields.push("Nutrition rating");
    if (!formData.motivation) missingFields.push("Motivation level");
    
    if (missingFields.length > 0) {
      setErrorMessage(`Please answer the following required questions:\n• ${missingFields.join('\n• ')}`);
      // Scroll to error message
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      return;
    }
    
    // Clear error message if form is valid
    setErrorMessage("");

    // Save check-in to localStorage
    const username = user?.username || "default";
    const now = new Date();
    
    // Update last check-in date
    const lastCheckInKey = `lastPTCheckIn_${username}`;
    localStorage.setItem(lastCheckInKey, now.toISOString());
    
    // Save check-in data
    const checkInHistoryKey = `ptCheckInHistory_${username}`;
    const historyStr = localStorage.getItem(checkInHistoryKey);
    const history = historyStr ? JSON.parse(historyStr) : [];
    
    history.push({
      timestamp: now.toISOString(),
      ...formData,
    });
    
    localStorage.setItem(checkInHistoryKey, JSON.stringify(history));

    // Save check-in to Supabase (client-specific)
    try {
      const clientId = user?.clientId;
      if (clientId) {
        const { error: insertErr } = await supabase.from('pt_checkins').insert({
          client_id: clientId,
          timestamp: now.toISOString(),
          sessions_completed: formData.sessionsCompleted,
          consistency: formData.consistency,
          push_level: formData.pushLevel,
          extra_training: formData.extraTraining,
          nutrition_rating: formData.nutritionRating,
          recovery_issues: formData.recoveryIssues,
          motivation: formData.motivation,
          proud: formData.proud,
          improve: formData.improve,
          pt_feedback: formData.ptFeedback,
        });
        if (insertErr) {
          console.error('❌ PT check-in Supabase insert failed:', insertErr);
          // Continue silently; local copy is still stored and will be visible to the user
        }
      }
    } catch (dbErr) {
      console.error('❌ PT check-in Supabase error:', dbErr);
    }
    
    // Reset progress
    setDaysSinceLastCheckIn(0);
    setProgressPercentage(0);
    setCanCheckIn(false);
    setShowSuccess(true);
    
    toast.success("Check-in submitted!", { description: "Your PT will review and respond within 24 hours" });
  };

  const updateField = (field: keyof CheckInFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error message when user starts filling in the form
    if (errorMessage) {
      setErrorMessage("");
    }
  };

  // Success Screen
  if (showSuccess) {
    return (
      <div className="min-h-screen bg-background pb-24" style={{ paddingTop: 0 }}>
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
          <div className="container max-w-2xl mx-auto px-4 py-4">
            <div className="flex items-center justify-center gap-3">
              <Video className="w-6 h-6" style={{ color: '#FFCC00' }} />
              <h1 className="text-xl font-bold text-foreground">PT Check-In</h1>
            </div>
          </div>
        </header>

        <main className="container max-w-2xl mx-auto px-4 pt-20 pb-6 space-y-6">
          <Card className="p-8 border-2 text-center" style={{ borderColor: '#FFCC00' }}>
            <CheckCircle2 className="w-20 h-20 mx-auto mb-4" style={{ color: '#FFCC00' }} />
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Check-In Submitted! 🎉
            </h2>
            <p className="text-lg text-muted-foreground mb-6">
              Your PT will review your answers and reply with feedback within 24 hours.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Your next check-in will be available in 14 days.
            </p>
            <Button
              onClick={() => setShowSuccess(false)}
              className="w-full h-12"
              style={{ backgroundColor: '#FFCC00', color: '#000' }}
            >
              Back to Dashboard
            </Button>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24" style={{ paddingTop: 0 }}>
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-center gap-3">
            <Video className="w-6 h-6" style={{ color: '#FFCC00' }} />
            <h1 className="text-xl font-bold text-foreground">PT Check-In</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container max-w-2xl mx-auto px-4 pt-20 pb-6 space-y-6">
        
        {/* Progress Bar */}
        <Card className="p-6 border-2" style={{ borderColor: canCheckIn ? '#FFCC00' : '#666' }}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5" style={{ color: '#FFCC00' }} />
                <h3 className="text-lg font-bold text-foreground">
                  {canCheckIn ? "Ready for Check-In" : `Next Check-In Available In ${14 - daysSinceLastCheckIn} Days`}
                </h3>
              </div>
              <span className="text-sm text-muted-foreground">
                {daysSinceLastCheckIn}/14 days
              </span>
            </div>
            <Progress value={progressPercentage} className="h-3" />
            <p className="text-sm text-muted-foreground">
              {canCheckIn 
                ? "✅ You can submit your 2-week check-in now"
                : "⏳ Check back soon to share your progress with your PT"}
            </p>
          </div>
        </Card>

        {!canCheckIn && (
          <Card className="p-4 bg-secondary/10">
            <p className="text-sm text-muted-foreground text-center">
              Check-ins are available every 14 days to give your PT time to adjust your programme and monitor progress.
            </p>
          </Card>
        )}

        {/* Form */}
        {canCheckIn && (
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Training & Activity */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-foreground px-1">🏋️‍♂️ Training & Activity</h3>
              
              {/* Sessions Completed */}
              <Card className="p-5">
                <Label className="text-base font-bold block mb-4">How many training sessions did you complete in the last 2 weeks?</Label>
                <div className="grid grid-cols-2 gap-3">
                  {['0-2', '3-4', '5-6', '7+'].map((option) => (
                    <Button
                      key={option}
                      type="button"
                      variant={formData.sessionsCompleted === option ? "default" : "outline"}
                      className="h-14 text-lg font-semibold"
                      style={formData.sessionsCompleted === option ? { backgroundColor: '#FFCC00', color: '#000' } : {}}
                      onClick={() => updateField("sessionsCompleted", option)}
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              </Card>

              {/* Consistency */}
              <Card className="p-5">
                <Label className="text-base font-bold block mb-4">How consistent did you feel overall?</Label>
                <div className="space-y-3">
                  {[
                    { value: 'very-consistent', label: 'Very consistent' },
                    { value: 'ups-downs', label: 'Some ups and downs' },
                    { value: 'struggled', label: 'Struggled to stay on track' }
                  ].map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      variant={formData.consistency === option.value ? "default" : "outline"}
                      className="w-full h-14 text-base font-semibold"
                      style={formData.consistency === option.value ? { backgroundColor: '#FFCC00', color: '#000' } : {}}
                      onClick={() => updateField("consistency", option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </Card>

              {/* Push Level */}
              <Card className="p-5">
                <Label className="text-base font-bold block mb-4">How hard did you push yourself in most workouts?</Label>
                <div className="grid grid-cols-2 gap-3">
                  {['Light', 'Moderate', 'Hard', 'Very hard'].map((option) => (
                    <Button
                      key={option.toLowerCase()}
                      type="button"
                      variant={formData.pushLevel === option.toLowerCase().replace(' ', '-') ? "default" : "outline"}
                      className="h-14 text-base font-semibold"
                      style={formData.pushLevel === option.toLowerCase().replace(' ', '-') ? { backgroundColor: '#FFCC00', color: '#000' } : {}}
                      onClick={() => updateField("pushLevel", option.toLowerCase().replace(' ', '-'))}
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              </Card>

              {/* Extra Training */}
              <Card className="p-5">
                <Label htmlFor="extra" className="text-base font-bold block mb-4">Did you do any extra training?</Label>
                <p className="text-sm text-muted-foreground mb-3">e.g., runs, walks, classes, cycling</p>
                <Textarea
                  id="extra"
                  value={formData.extraTraining}
                  onChange={(e) => updateField("extraTraining", e.target.value)}
                  placeholder="Optional - Describe any additional activity..."
                  rows={4}
                  className="text-base resize-none"
                />
              </Card>
            </div>

            {/* Nutrition & Recovery */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-foreground px-1">🍽️ Nutrition & Recovery</h3>
              
              {/* Nutrition Rating */}
              <Card className="p-5">
                <Label className="text-base font-bold block mb-4">How would you rate your nutrition lately?</Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'on-point', label: 'On point' },
                    { value: 'pretty-good', label: 'Pretty good' },
                    { value: 'hit-miss', label: 'Hit and miss' },
                    { value: 'off-track', label: 'Off track' }
                  ].map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      variant={formData.nutritionRating === option.value ? "default" : "outline"}
                      className="h-14 text-base font-semibold"
                      style={formData.nutritionRating === option.value ? { backgroundColor: '#FFCC00', color: '#000' } : {}}
                      onClick={() => updateField("nutritionRating", option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </Card>

              {/* Recovery Issues */}
              <Card className="p-5">
                <Label htmlFor="recovery" className="text-base font-bold block mb-4">Any issues with recovery, energy, or soreness?</Label>
                <Textarea
                  id="recovery"
                  value={formData.recoveryIssues}
                  onChange={(e) => updateField("recoveryIssues", e.target.value)}
                  placeholder="Optional - Share any recovery concerns..."
                  rows={4}
                  className="text-base resize-none"
                />
              </Card>
            </div>

            {/* Mindset & Goals */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-foreground px-1">💬 Mindset & Goals</h3>
              
              {/* Motivation */}
              <Card className="p-5">
                <Label className="text-base font-bold block mb-4">How motivated are you feeling right now?</Label>
                <div className="space-y-3">
                  {[
                    { value: 'very-motivated', label: 'Very motivated' },
                    { value: 'ok', label: 'OK' },
                    { value: 'struggling', label: 'Struggling a bit' }
                  ].map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      variant={formData.motivation === option.value ? "default" : "outline"}
                      className="w-full h-14 text-base font-semibold"
                      style={formData.motivation === option.value ? { backgroundColor: '#FFCC00', color: '#000' } : {}}
                      onClick={() => updateField("motivation", option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </Card>

              {/* Proud */}
              <Card className="p-5">
                <Label htmlFor="proud" className="text-base font-bold block mb-4">What's something you're proud of from the last 2 weeks?</Label>
                <Textarea
                  id="proud"
                  value={formData.proud}
                  onChange={(e) => updateField("proud", e.target.value)}
                  placeholder="Share your wins..."
                  rows={4}
                  className="text-base resize-none"
                />
              </Card>

              {/* Improve */}
              <Card className="p-5">
                <Label htmlFor="improve" className="text-base font-bold block mb-4">What's something you'd like to improve before the next check-in?</Label>
                <Textarea
                  id="improve"
                  value={formData.improve}
                  onChange={(e) => updateField("improve", e.target.value)}
                  placeholder="What do you want to work on?"
                  rows={4}
                  className="text-base resize-none"
                />
              </Card>

              {/* PT Feedback */}
              <Card className="p-5">
                <Label htmlFor="ptFeedback" className="text-base font-bold block mb-4">Anything specific you'd like your PT to focus on or adjust in your plan?</Label>
                <Textarea
                  id="ptFeedback"
                  value={formData.ptFeedback}
                  onChange={(e) => updateField("ptFeedback", e.target.value)}
                  placeholder="Any requests for your PT?"
                  rows={4}
                  className="text-base resize-none"
                />
              </Card>
            </div>

            {/* Error Message - Super Visible */}
            {errorMessage && (
              <Card className="p-6 border-4 border-red-500 bg-red-500/10">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-500 flex items-center justify-center text-white text-2xl font-bold">
                    !
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-red-500 mb-2">Required Questions Missing</h3>
                    <div className="text-base text-foreground whitespace-pre-line">
                      {errorMessage}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-16 text-xl font-bold"
              style={{ backgroundColor: '#FFCC00', color: '#000' }}
            >
              Submit Check-In
            </Button>

            <Card className="p-4 bg-secondary/10">
              <p className="text-sm text-muted-foreground text-center">
                Your PT will review your check-in and respond with personalized feedback within 24 hours.
              </p>
            </Card>
          </form>
        )}
      </main>
    </div>
  );
};

export default PTCheckIn;

