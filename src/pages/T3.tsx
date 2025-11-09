import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Play, PlayCircle, Pause, PauseCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Timer } from "@/components/Timer";
import { useNavigate } from "react-router-dom";

// Simple rolling number column to simulate a time "roller"
const RollerColumn = ({ speedMs = 400 }: { speedMs?: number }) => {
  const [index, setIndex] = useState(0);
  const itemHeightPx = 48; // matches h-12 below
  useEffect(() => {
    const id = setInterval(() => setIndex((v) => (v + 1) % 10), speedMs);
    return () => clearInterval(id);
  }, [speedMs]);
  return (
    <div className="relative h-12 w-10 overflow-hidden rounded-md bg-black/80 border border-yellow-500/40">
      <div
        className="transition-transform duration-300 ease-out"
        style={{ transform: `translateY(-${index * itemHeightPx}px)` }}
      >
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-12 w-10 flex items-center justify-center text-2xl font-extrabold text-yellow-400">
            {i}
          </div>
        ))}
      </div>
    </div>
  );
};

const T3 = () => {
  const navigate = useNavigate();
  const [showCountdown, setShowCountdown] = useState(false);
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-extrabold">Test UI — T3</h1>
            <Button variant="outline" size="sm" onClick={() => navigate('/overview')}>
              Back
            </Button>
          </div>
        </div>
      </header>
      <main className="container max-w-2xl mx-auto px-2 sm:px-4 py-6 space-y-8">
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-extrabold">UI Library Showcase</h2>
          <p className="text-muted-foreground">
            Black/Yellow/White themed patterns: popups, sheets, forms, tabs and more.
          </p>
        </div>

        {/* Popups */}
        <section className="space-y-3">
          <h3 className="text-xl font-bold">Popups</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Contact Form Modal */}
            <Dialog>
              <DialogTrigger asChild>
                <Button className="h-12 text-lg font-bold" style={{ backgroundColor: '#FFCC00', color: '#000' }}>
                  Contact Form (Modal)
                </Button>
              </DialogTrigger>
              <DialogContent className="border">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Get in touch</DialogTitle>
                  <DialogDescription>We reply within 24 hours.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" placeholder="Your name" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="you@example.com" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="message">Message</Label>
                    <Textarea id="message" placeholder="How can we help?" />
                  </div>
                  <div className="pt-2">
                    <Button className="w-full h-12 text-lg font-bold" style={{ backgroundColor: '#FFCC00', color: '#000' }} onClick={() => toast.success("Message sent!", { description: "We’ll get back to you shortly." })}>
                      Send
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Action Sheet / Bottom Drawer */}
            <Drawer>
              <DrawerTrigger asChild>
                <Button variant="secondary" className="h-12 text-lg font-bold">Action Sheet</Button>
              </DrawerTrigger>
              <DrawerContent className="border">
                <DrawerHeader>
                  <DrawerTitle>Quick Actions</DrawerTitle>
                  <DrawerDescription>Choose one of the options below</DrawerDescription>
                </DrawerHeader>
                <div className="p-4 grid gap-3">
                  <Button className="w-full h-12 font-bold" style={{ backgroundColor: '#FFCC00', color: '#000' }} onClick={() => toast.success("Added to favorites")}>
                    Add to Favorites
                  </Button>
                  <Button variant="outline" className="w-full h-12 font-bold">Share</Button>
                  <Button variant="ghost" className="w-full h-12 font-bold">Remind me later</Button>
                </div>
                <DrawerFooter>
                  <DrawerClose asChild>
                    <Button variant="secondary" className="h-12 font-bold">Close</Button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>

            {/* Confirm Dialog */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="h-12 text-lg font-bold">Confirm Delete</Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="border">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete item?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the item.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction style={{ backgroundColor: '#FFCC00', color: '#000' }}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Help Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="h-12 text-lg">Help Popover</Button>
              </PopoverTrigger>
              <PopoverContent className="border">
                <h4 className="font-bold mb-1">Need help?</h4>
                <p className="text-sm text-muted-foreground">
                  This popover can show contextual help, tips, or shortcuts.
                </p>
              </PopoverContent>
            </Popover>
          </div>
        </section>

        {/* Tabs + Progress (Stepper style) */}
        <section className="space-y-3">
          <h3 className="text-xl font-bold">Tabs / Stepper</h3>
          <Card className="p-4 bg-yellow-500/5 border">
            <Tabs defaultValue="one">
              <TabsList className="grid grid-cols-3 gap-2 bg-transparent p-0">
                <TabsTrigger value="one" className="w-full h-12 font-bold border rounded-md data-[state=active]:border-yellow-500 data-[state=active]:bg-yellow-500/10">
                  Step 1
                </TabsTrigger>
                <TabsTrigger value="two" className="w-full h-12 font-bold border rounded-md data-[state=active]:border-yellow-500 data-[state=active]:bg-yellow-500/10">
                  Step 2
                </TabsTrigger>
                <TabsTrigger value="three" className="w-full h-12 font-bold border rounded-md data-[state=active]:border-yellow-500 data-[state=active]:bg-yellow-500/10">
                  Step 3
                </TabsTrigger>
              </TabsList>
              <div className="py-3" />
              <TabsContent value="one" className="space-y-3">
                <p className="text-foreground/80">Collect basic info.</p>
                <Progress value={33} />
              </TabsContent>
              <TabsContent value="two" className="space-y-3">
                <p className="text-foreground/80">Add details.</p>
                <Progress value={66} />
              </TabsContent>
              <TabsContent value="three" className="space-y-3">
                <p className="text-foreground/80">Review & submit.</p>
                <Progress value={100} />
              </TabsContent>
            </Tabs>
          </Card>
        </section>

        {/* Animations */}
        <section className="space-y-4">
          <h3 className="text-xl font-bold">Animations</h3>
          {/* Time rollers (simulated) */}
          <Card className="p-4 border bg-black/40">
            <p className="text-sm text-muted-foreground mb-3">Time rollers</p>
            <div className="flex items-center justify-center gap-2">
              <RollerColumn />
              <RollerColumn />
              <span className="text-2xl font-extrabold text-yellow-400 -mt-1">:</span>
              <RollerColumn />
              <RollerColumn />
            </div>
          </Card>
          {/* Countdown demo using app Timer */}
          <Card className="p-4 border bg-yellow-500/5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">Countdown (Timer component)</p>
              <Button size="sm" onClick={() => setShowCountdown((v) => !v)}>
                {showCountdown ? "Reset" : "Start"}
              </Button>
            </div>
            {showCountdown ? (
              <div className="overflow-hidden rounded-xl border-2 border-yellow-500">
                <Timer mode="countdown" initialSeconds={15} autoStart={true} onComplete={() => setShowCountdown(false)} />
              </div>
            ) : (
              <div className="h-24 flex items-center justify-center text-foreground/70">Tap Start to run 15s demo</div>
            )}
          </Card>
          {/* Pulse / breathe */}
          <div className="grid gap-3 sm:grid-cols-3">
            <Button className="h-14 text-lg font-bold animate-pulse" style={{ backgroundColor: '#FFCC00', color: '#000' }}>
              Breathe
            </Button>
            <Button variant="secondary" className="h-14 text-lg font-bold">
              <span className="inline-flex items-center gap-2">
                <PauseCircle className="w-5 h-5 animate-pulse" /> Soft Pulse
              </span>
            </Button>
            <Button variant="outline" className="h-14 text-lg font-bold">
              <span className="inline-flex items-center gap-2">
                <PlayCircle className="w-5 h-5 animate-spin text-yellow-400" /> Spin
              </span>
            </Button>
          </div>
        </section>

        {/* Metric trio (Distance / Time / Avg Speed) */}
        <section className="space-y-3">
          <h3 className="text-xl font-bold">Stats Trio</h3>
          <Card className="p-4 border bg-gradient-to-r from-background to-background/80">
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-lg bg-background/60 border">
                <p className="text-xs font-bold tracking-widest text-muted-foreground">DISTANCE</p>
                <p className="text-4xl font-extrabold text-foreground mt-1">0.01<span className="text-2xl">KM</span></p>
                <p className="text-sm text-muted-foreground mt-1">Estimated</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-background/60 border">
                <p className="text-xs font-bold tracking-widest text-muted-foreground">TIME</p>
                <p className="text-4xl font-extrabold text-foreground mt-1">0:14</p>
                <p className="text-sm text-muted-foreground mt-1">Estimated</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-background/60 border">
                <p className="text-xs font-bold tracking-widest text-muted-foreground">AVG SPEED</p>
                <p className="text-4xl font-extrabold text-foreground mt-1">1.6<span className="text-2xl">KPH</span></p>
                <p className="text-sm text-muted-foreground mt-1">Estimated</p>
              </div>
            </div>
          </Card>
        </section>

        {/* CTA samples */}
        <section className="space-y-3">
          <h3 className="text-xl font-bold">Buttons</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <Button className="h-12 text-lg font-bold" style={{ backgroundColor: '#FFCC00', color: '#000' }}>Primary</Button>
            <Button variant="secondary" className="h-12 text-lg font-bold">Secondary</Button>
            <Button variant="outline" className="h-12 text-lg font-bold">Outline</Button>
          </div>
          {/* Play-style buttons */}
          <div className="grid gap-3 sm:grid-cols-4">
            <Button className="h-12 text-lg font-bold gap-2" style={{ backgroundColor: '#FFCC00', color: '#000' }}>
              <Play className="w-5 h-5" /> Play
            </Button>
            <Button variant="secondary" className="h-12 text-lg font-bold gap-2">
              <Pause className="w-5 h-5" /> Pause
            </Button>
            <Button variant="outline" className="h-12 text-lg font-bold gap-2">
              <PlayCircle className="w-5 h-5 text-primary" /> Preview
            </Button>
            <Button variant="ghost" className="h-12 text-lg font-bold p-0 w-12 justify-center rounded-full" title="Play">
              <PlayCircle className="w-8 h-8 text-yellow-400" />
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default T3;


