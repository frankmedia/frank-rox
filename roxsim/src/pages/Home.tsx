import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Flame, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { CompetitionCountdown } from '@/components/CompetitionCountdown';
import { Paywall } from '@/components/Paywall';
import { DEKABriefing } from '@/pages/DEKABriefing';
import { hapticImpact, HapticsImpactStyle } from '@/utils/hapticsBridge';
import { useUser } from '@/contexts/UserContext';
import { WORKOUTS } from '@/lib/workouts';
import type { HyroxType } from '@/types';

export function Home() {
  const navigate = useNavigate();
  const {
    entitlements,
    freeHyroxRunsRemaining,
    profile,
  } = useUser();
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallProductId, setPaywallProductId] = useState('com.roxsims.hyrox_pack');
  const [paywallTitle, setPaywallTitle] = useState('Unlock Hyrox Pack');
  const [showDekaBriefing, setShowDekaBriefing] = useState(false);

  const officialWorkouts = WORKOUTS.filter((w) => w.category === 'official');
  const dekaWorkouts = WORKOUTS.filter((w) => w.category === 'deka');
  
  // Always show all custom workouts, but secret one will be locked/blurred
  const customWorkouts = WORKOUTS.filter((w) => w.category === 'custom');

  const getEntitlementKey = (workoutId: string) => {
    if (workoutId === 'frank_tank') return 'hasFrankTheTank' as const;
    return 'hasHyroxPack' as const;
  };

  const isWorkoutUnlocked = (workoutId: string) => {
    // Secret workout unlocks at 10 completed workouts
    if (workoutId === 'kettlebell_secret') {
      return profile.stats.totalSims >= 10;
    }
    const key = getEntitlementKey(workoutId);
    return entitlements[key];
  };

  const canUseTrial = (workoutId: string) => {
    if (workoutId === 'hyrox_full' || workoutId === 'hyrox_half' || workoutId === 'deka_strong' || workoutId === 'deka_half') {
      return !entitlements.hasHyroxPack && freeHyroxRunsRemaining > 0;
    }
    return false;
  };

  const handleUnlock = (workoutId: string) => {
    console.log('🔓 handleUnlock called for:', workoutId);
    
    if (workoutId === 'frank_tank') {
      setPaywallProductId('com.roxsims.frank_tank');
      setPaywallTitle('Unlock Frank the Tank');
    } else {
      setPaywallProductId('com.roxsims.hyrox_pack');
      setPaywallTitle('Unlock Hyrox Pack');
    }
    
    setShowPaywall(true);
  };

  const handleStartWorkout = async (workoutId: string, hyroxType?: HyroxType) => {
    await hapticImpact(HapticsImpactStyle.Light);
    
    // Free workouts - always accessible
    if (workoutId === 'kettlebell_secret') {
      navigate('/simulation/secret');
      return;
    }
    
    if (workoutId === 'circuit_hiit') {
      navigate('/simulation/circuit');
      return;
    }
    
    if (workoutId === 'deka_strong' || workoutId === 'deka_half') {
      const unlocked = entitlements.hasHyroxPack || freeHyroxRunsRemaining > 0;
      if (!unlocked) {
        console.log('🔒 DEKA locked - showing paywall for:', 'com.roxsims.hyrox_pack');
        setPaywallProductId('com.roxsims.hyrox_pack');
        setPaywallTitle('Unlock Hyrox Pack');
        setShowPaywall(true);
        return;
      }
      setShowDekaBriefing(true);
      return;
    }
    
    if (workoutId === 'hyrox_full' || workoutId === 'hyrox_half') {
      const unlocked = entitlements.hasHyroxPack || freeHyroxRunsRemaining > 0;
      if (!unlocked) {
        console.log('🔒 Hyrox locked - showing paywall for:', 'com.roxsims.hyrox_pack');
        setPaywallProductId('com.roxsims.hyrox_pack');
        setPaywallTitle('Unlock Hyrox Pack');
        setShowPaywall(true);
        return;
      }
      navigate(`/simulation/${hyroxType}`);
      return;
    }

    if (workoutId === 'frank_tank') {
      if (!entitlements.hasFrankTheTank) {
        console.log('🔒 Frank the Tank locked - showing paywall for:', 'com.roxsims.frank_tank');
        setPaywallProductId('com.roxsims.frank_tank');
        setPaywallTitle('Unlock Frank the Tank');
        setShowPaywall(true);
        return;
      }
    navigate('/simulation/frank');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-36 pt-5">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black px-6 pt-6 pb-4 border-b border-white/10">
        <div className="flex items-center gap-2 justify-center">
          <Flame className="w-8 h-8 text-yellow-500" />
          <h1 className="text-4xl font-black tracking-tight">
            <span className="text-yellow-500">Rox</span>
            <span className="text-white">SIM</span>
          </h1>
        </div>
      </div>

      {/* Competition Countdown */}
      <div className="px-6 mb-4">
        <CompetitionCountdown />
      </div>

      <div className="px-6 space-y-8">
        <WorkoutSection
          title=""
          workouts={officialWorkouts}
          entitlements={entitlements}
          profile={profile}
          freeHyroxRunsRemaining={freeHyroxRunsRemaining}
          onStart={handleStartWorkout}
          onUnlock={handleUnlock}
          isWorkoutUnlocked={isWorkoutUnlocked}
          canUseTrial={canUseTrial}
        />

        <WorkoutSection
          title=""
          workouts={dekaWorkouts}
          entitlements={entitlements}
          profile={profile}
          freeHyroxRunsRemaining={freeHyroxRunsRemaining}
          onStart={handleStartWorkout}
          onUnlock={handleUnlock}
          isWorkoutUnlocked={isWorkoutUnlocked}
          canUseTrial={canUseTrial}
        />

        <WorkoutSection
          title="Custom Simulations"
          workouts={customWorkouts}
          entitlements={entitlements}
          profile={profile}
          freeHyroxRunsRemaining={freeHyroxRunsRemaining}
          onStart={handleStartWorkout}
          onUnlock={handleUnlock}
          isWorkoutUnlocked={isWorkoutUnlocked}
          canUseTrial={canUseTrial}
        />
      </div>

      {showPaywall && (
        <Paywall 
          productId={paywallProductId}
          title={paywallTitle}
          onClose={() => setShowPaywall(false)} 
        />
      )}

      {showDekaBriefing && (
        <DEKABriefing
          onStart={() => {
            setShowDekaBriefing(false);
            navigate('/simulation/deka');
          }}
          onClose={() => setShowDekaBriefing(false)}
        />
      )}
    </div>
  );
}

interface WorkoutSectionProps {
  title: string;
  workouts: WorkoutDefinition[];
  entitlements: ReturnType<typeof useUser>['entitlements'];
  freeHyroxRunsRemaining: number;
  profile: ReturnType<typeof useUser>['profile'];
  onStart: (id: string, hyroxType?: 'full' | 'half') => void;
  onUnlock: (id: string) => void;
  isWorkoutUnlocked: (id: string) => boolean;
  canUseTrial: (id: string) => boolean;
}

function WorkoutSection({
  title,
  workouts,
  profile,
  onStart,
  onUnlock,
  isWorkoutUnlocked,
  canUseTrial,
  freeHyroxRunsRemaining,
}: WorkoutSectionProps) {
  if (workouts.length === 0) return null;

  // Check if this section contains Hyrox or DEKA workouts (horizontal scroll)
  const isHyroxSection = workouts.some(w => w.id === 'hyrox_full' || w.id === 'hyrox_half');
  const isDEKASection = workouts.some(w => w.id === 'deka_strong' || w.id === 'deka_half');

  if (isHyroxSection || isDEKASection) {
    return (
      <div className="-mx-6">
        <h2 className="text-xl font-bold mb-4 px-6">{title}</h2>
        <div className="flex gap-3 overflow-x-auto pb-2 px-6 snap-x snap-mandatory scrollbar-hide">
          {workouts.map((workout) => {
            const unlocked = isWorkoutUnlocked(workout.id);
            const trialAvailable = canUseTrial(workout.id);
            const trialsLeft =
              workout.hasFreeTrial && (workout.id === 'hyrox_full' || workout.id === 'hyrox_half' || workout.id === 'deka_strong' || workout.id === 'deka_half')
                ? freeHyroxRunsRemaining
                : 0;
            const canStart = !workout.requiresPurchase || unlocked || trialAvailable;
            const status = unlocked
              ? 'Unlocked'
              : trialAvailable
              ? `Free trials left: ${trialsLeft}`
              : 'Locked';

             const isHyrox = workout.id === 'hyrox_full' || workout.id === 'hyrox_half';
             const isFull = workout.id === 'hyrox_full';
             const isDEKA = workout.id === 'deka_strong' || workout.id === 'deka_half';
             const isDEKAFull = workout.id === 'deka_strong';
             
             const gradientClass = isDEKAFull
               ? 'bg-gradient-to-br from-red-500 via-red-600 to-red-700'
               : isDEKA
               ? 'bg-gradient-to-br from-red-400 via-red-500 to-red-600'
               : isFull
               ? 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500'
               : 'bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500';
             
             const textColor = isDEKA ? 'text-white' : 'text-black';
             const textOpacity = isDEKA ? 'text-white/80' : 'text-black/80';
             const textLighter = isDEKA ? 'text-white/60' : 'text-black/60';
             const textDarker = isDEKA ? 'text-white/70' : 'text-black/70';

             return (
               <button
                 key={workout.id}
                 onClick={() => canStart ? onStart(workout.id, workout.hyroxType) : onUnlock(workout.id)}
                 className={`flex-shrink-0 w-[85vw] rounded-2xl p-6 text-left transition-all active:scale-95 snap-center group ${gradientClass} ${
                  !canStart ? 'opacity-60' : ''
                }`}
              >
                <div className="mb-4">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-2xl font-black ${textColor}`}>
                        {workout.title}
                      </h3>
                      {unlocked && <CheckCircle2 className={`w-5 h-5 ${textColor}`} />}
                    </div>
                    {!unlocked && (
                      <div className={`flex-shrink-0 ml-4 px-2.5 py-1 rounded-full ${isDEKA ? 'bg-white/10 text-white' : 'bg-black/20 text-black'} text-xs font-bold`}>
                        {workout.priceText}
                      </div>
                    )}
                  </div>
                   <p className={`${textLighter} text-xs font-medium uppercase tracking-wide mb-2`}>
                     {workout.subtitle}
                   </p>
                   <p className={`${textOpacity} text-sm font-medium italic`}>
                     "{workout.description}"
                   </p>
                 </div>
                 
                 {/* Stats Grid - for Hyrox workouts */}
                 {isHyrox && (
                   <div className="flex gap-3 mb-4 text-sm">
                     <div className="flex-1 backdrop-blur-sm bg-white/20 border border-black/10 rounded-xl px-4 py-3 shadow-sm">
                       <div className="flex items-center gap-2 mb-1">
                         <svg className={`w-4 h-4 ${textDarker}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                         </svg>
                         <p className={`${textLighter} text-xs font-semibold uppercase`}>Run</p>
                       </div>
                       <p className={`${textColor} font-bold text-base`}>{isFull ? '8 km' : '4 km'}</p>
                     </div>
                     <div className="flex-1 backdrop-blur-sm bg-white/20 border border-black/10 rounded-xl px-4 py-3 shadow-sm">
                       <div className="flex items-center gap-2 mb-1">
                         <svg className={`w-4 h-4 ${textDarker}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                         </svg>
                         <p className={`${textLighter} text-xs font-semibold uppercase`}>Stations</p>
                       </div>
                       <p className={`${textColor} font-bold text-base`}>8 Exercises</p>
                     </div>
                   </div>
                 )}

                 {/* Stats Grid - for DEKA workouts */}
                 {isDEKA && (
                   <div className="flex gap-3 mb-4 text-sm">
                     <div className="flex-1 backdrop-blur-sm bg-white/20 border border-white/10 rounded-xl px-4 py-3 shadow-sm">
                       <div className="flex items-center gap-2 mb-1">
                         <svg className={`w-4 h-4 ${textDarker}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                         </svg>
                         <p className={`${textLighter} text-xs font-semibold uppercase`}>Zones</p>
                       </div>
                       <p className={`${textColor} font-bold text-base`}>{isDEKAFull ? '10 Zones' : '5 Zones'}</p>
                     </div>
                     <div className="flex-1 backdrop-blur-sm bg-white/20 border border-white/10 rounded-xl px-4 py-3 shadow-sm">
                       <div className="flex items-center gap-2 mb-1">
                         <svg className={`w-4 h-4 ${textDarker}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                         </svg>
                         <p className={`${textLighter} text-xs font-semibold uppercase`}>Rows</p>
                       </div>
                       <p className={`${textColor} font-bold text-base`}>{isDEKAFull ? '4500m' : '2500m'}</p>
                     </div>
                   </div>
                 )}

                 {/* Start Button */}
                 <div className="flex items-center justify-center gap-2 bg-black/90 rounded-xl py-3 px-4 group-hover:bg-black transition-colors">
                   {canStart ? (
                     <>
                       <Play className={`w-5 h-5 ${isDEKA ? 'text-red-500' : 'text-yellow-500'}`} fill="currentColor" />
                       <span className="text-white font-bold text-sm uppercase tracking-wider">
                         {unlocked ? 'Start Simulation' : `Use Trial (${trialsLeft} left)`}
                       </span>
                     </>
                   ) : (
                     <>
                       <Lock className="w-5 h-5 text-white" />
                       <span className="text-white font-bold text-sm uppercase tracking-wider">
                         Unlock to Start
                       </span>
                     </>
                   )}
                 </div>
               </button>
             );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-4">
        {workouts.map((workout) => {
          const unlocked = isWorkoutUnlocked(workout.id);
          const trialAvailable = canUseTrial(workout.id);
          const trialsLeft =
            workout.hasFreeTrial && (workout.id === 'hyrox_full' || workout.id === 'hyrox_half')
              ? freeHyroxRunsRemaining
              : 0;
          const canStart = !workout.requiresPurchase || unlocked || trialAvailable;
          const status = unlocked
            ? 'Unlocked'
            : trialAvailable
            ? `Free trials left: ${trialsLeft}`
            : 'Locked';

           const isHyrox = workout.id === 'hyrox_full' || workout.id === 'hyrox_half';
           const isFull = workout.id === 'hyrox_full';
           const isFrankTank = workout.id === 'frank_tank';
           const isSecret = workout.id === 'kettlebell_secret';
           const isCircuit = workout.id === 'circuit_hiit';
           const isDEKA = workout.id === 'deka_strong';
           
           const gradientClass = isFull
             ? 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500'
             : isHyrox
             ? 'bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500'
             : isDEKA
             ? 'bg-gradient-to-br from-red-600 via-red-700 to-red-800'
             : isCircuit
             ? 'bg-gradient-to-br from-orange-600 via-orange-700 to-orange-800'
             : (isFrankTank || (isSecret && unlocked))
             ? 'bg-gradient-to-br from-green-600 via-green-700 to-green-800'
             : isSecret
             ? 'bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900'
             : 'bg-gradient-to-br from-green-600 via-green-700 to-green-800';
           
           const textColor = (isFrankTank || isSecret || isCircuit || isDEKA) ? 'text-white' : 'text-black';
           const textOpacity = (isFrankTank || isSecret || isCircuit || isDEKA) ? 'text-white/80' : 'text-black/80';
           const textLighter = (isFrankTank || isSecret || isCircuit || isDEKA) ? 'text-white/60' : 'text-black/60';
           const textDarker = (isFrankTank || isSecret || isCircuit || isDEKA) ? 'text-white/70' : 'text-black/70';

           return (
             <button
               key={workout.id}
               onClick={() =>
                 canStart
                   ? onStart(workout.id, workout.hyroxType)
                   : onUnlock(workout.id)
               }
               disabled={isSecret && !unlocked}
               className={`group relative w-full ${gradientClass} rounded-2xl p-6 text-left shadow-xl hover:shadow-2xl transition-all active:scale-[0.98] overflow-hidden ${isSecret && !unlocked ? 'opacity-60 cursor-not-allowed' : ''}`}
             >
               {/* Subtle pattern overlay */}
               <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(0,0,0,0.05),transparent)] pointer-events-none" />
               
               {/* Lock Badge for locked workouts (but not secret) */}
               {!unlocked && !trialAvailable && !isSecret && (
                 <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1">
                   <Lock className="w-3 h-3 text-white" />
                   <span className="text-xs font-semibold text-white">{workout.priceText || 'Locked'}</span>
                 </div>
               )}

               {/* Trial Badge */}
               {trialAvailable && (
                 <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1">
                   <AlertCircle className="w-3 h-3 text-yellow-400" />
                   <span className="text-xs font-semibold text-yellow-400">{trialsLeft} Free</span>
                 </div>
               )}

               {/* Unlocked Badge */}
               {unlocked && (
                 <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1">
                   <CheckCircle2 className="w-3 h-3 text-green-400" />
                   <span className="text-xs font-semibold text-white">Unlocked</span>
                 </div>
               )}
               
               <div className="relative">
                 {/* Header */}
                 <div className="mb-3">
                   <div className="flex items-center gap-3 mb-1">
                     <h3 className={`text-3xl font-black ${textColor} tracking-tight`} style={{ textShadow: (isFrankTank || isSecret) ? '0 2px 4px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.1)' }}>
                       {workout.title.toUpperCase()}
                     </h3>
                     {workout.id === 'frank_tank' && (
                       <span className="text-3xl" role="img" aria-label="tank">
                         🪖
                       </span>
                     )}
                     {workout.id === 'kettlebell_secret' && unlocked && (
                       <span className="text-3xl" role="img" aria-label="kettlebell">
                         🏋️
                       </span>
                     )}
                   </div>
                   <p className={`${textLighter} text-xs font-medium uppercase tracking-wide mb-2`}>
                     {workout.subtitle}
                   </p>
                   <p className={`${textOpacity} text-sm font-medium italic`}>
                     "{workout.description}"
                   </p>
                 </div>
                 
                {/* Stats Grid - only for Hyrox workouts */}
                {isHyrox && (
                  <div className="flex gap-3 mb-4 text-sm">
                    <div className="flex-1 backdrop-blur-sm bg-white/20 border border-black/10 rounded-xl px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <svg className={`w-4 h-4 ${textDarker}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <p className={`${textLighter} text-xs font-semibold uppercase`}>Run</p>
                      </div>
                      <p className={`${textColor} font-bold text-base`}>{isFull ? '8 km' : '4 km'}</p>
                    </div>
                    <div className="flex-1 backdrop-blur-sm bg-white/20 border border-black/10 rounded-xl px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <svg className={`w-4 h-4 ${textDarker}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <p className={`${textLighter} text-xs font-semibold uppercase`}>Stations</p>
                      </div>
                      <p className={`${textColor} font-bold text-base`}>8 Exercises</p>
                    </div>
                  </div>
                )}
                
                {/* Stats Grid - Circuit workout */}
                {isCircuit && (
                  <>
                    <div className="flex gap-2 mb-3 text-sm">
                      <div className="flex-1 backdrop-blur-sm bg-white/20 border border-white/10 rounded-xl px-3 py-2 shadow-sm">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <svg className={`w-3.5 h-3.5 ${textDarker}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className={`${textLighter} text-[10px] font-semibold uppercase`}>Format</p>
                        </div>
                        <p className={`${textColor} font-bold text-sm`}>50/10</p>
                      </div>
                      <div className="flex-1 backdrop-blur-sm bg-white/20 border border-white/10 rounded-xl px-3 py-2 shadow-sm">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <svg className={`w-3.5 h-3.5 ${textDarker}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className={`${textLighter} text-[10px] font-semibold uppercase`}>Duration</p>
                        </div>
                        <p className={`${textColor} font-bold text-sm`}>~32 Min</p>
                      </div>
                    </div>
                    
                    {/* Equipment needed */}
                    <div className="mb-3">
                      <p className={`${textLighter} text-[10px] font-semibold uppercase mb-1.5`}>Equipment</p>
                      <div className="flex gap-2">
                        <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-2.5 py-1.5">
                          <span className="text-base">🧍</span>
                          <span className={`${textColor} text-xs font-semibold`}>Bodyweight</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-2.5 py-1.5">
                          <span className="text-base">🏋️</span>
                          <span className={`${textColor} text-xs font-semibold`}>Dumbbells</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
                
                {/* Kettlebell Progress - Secret workout */}
                {isSecret && (
                  <div className="mb-3">
                    <div className="flex flex-wrap gap-1 justify-center">
                      {Array.from({ length: 10 }).map((_, index) => (
                        <div
                          key={index}
                          className={`transition-all duration-300 ${
                            index < profile.stats.totalSims
                              ? 'opacity-100'
                              : 'opacity-30 grayscale'
                          }`}
                          style={{
                            filter: index < profile.stats.totalSims ? 'drop-shadow(0 0 4px rgba(255, 204, 0, 0.5))' : 'none',
                          }}
                        >
                          <svg
                            version="1.1"
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 512 512"
                            className={index < profile.stats.totalSims ? 'fill-yellow-500' : 'fill-white/30'}
                          >
                            <path d="M0 0 C35.30689162 31.2683672 56.6473819 76.2464241 59.71484375 123.1875 C61.51291784 165.23726874 50.31670918 212.77213026 21.21484375 244.6875 C8.11551763 258.45718328 -8.22096946 267.93686007 -27.61068594 268.53815544 C-31.75231876 268.60466265 -35.89238222 268.6030507 -40.03442383 268.59155273 C-41.90346177 268.5972652 -43.77249623 268.60423283 -45.64152527 268.61235046 C-50.68716632 268.63020185 -55.73263269 268.62912843 -60.77829576 268.62340808 C-65.00503991 268.62030403 -69.2317511 268.62642228 -73.45849055 268.63244683 C-83.43825696 268.64646465 -93.41793772 268.64495414 -103.39770508 268.63354492 C-113.65991632 268.62207134 -123.92186598 268.63613296 -134.18404275 268.6629414 C-143.02522892 268.68516467 -151.86633337 268.69172074 -160.70754546 268.68586498 C-165.97455119 268.68250944 -171.24138937 268.68481641 -176.50837135 268.70211601 C-181.46537544 268.71768867 -186.42199499 268.71351616 -191.37898445 268.69481087 C-193.18682029 268.69115312 -194.99468528 268.69415015 -196.80249405 268.70469666 C-217.47935182 268.81601085 -235.9161492 264.01508546 -251.21289062 249.38745117 C-280.72148477 219.98453242 -294.27816923 174.95690727 -294.53515625 134.1875 C-294.34460833 99.23254277 -284.98073877 62.81404271 -264.28515625 34.1875 C-263.62386719 33.25679688 -262.96257812 32.32609375 -262.28125 31.3671875 C-233.29735441 -8.34956388 -193.80555461 -33.15103523 -145.2421875 -41.26953125 C-92.55300557 -48.49934002 -40.39324543 -34.93469875 0 0 Z M-235.59765625 50.2578125 C-237.56554259 53.67428184 -238.1049061 56.26359299 -238.28515625 60.1875 C-236.89606725 63.23663936 -236.89606725 63.23663936 -234.28515625 65.1875 C-231.32855752 66.02099951 -231.32855752 66.02099951 -228.28515625 65.1875 C-224.85362883 62.05436627 -221.9283478 58.62720496 -219.03515625 55 C-208.36787388 41.91550093 -197.1233975 31.97200443 -183.17578125 22.52734375 C-181.17363155 21.18802227 -181.17363155 21.18802227 -179.28515625 19.1875 C-178.93201396 15.93859093 -179.00732547 13.80853352 -180.34765625 10.8125 C-182.26825246 8.93015001 -182.26825246 8.93015001 -185.34765625 8.625 C-205.4948584 11.50317174 -223.74633116 35.16338831 -235.59765625 50.2578125 Z M-254.1484375 88.078125 C-257.39649689 94.10545171 -258.73568455 101.39123266 -258.28515625 108.1875 C-256.4892794 110.56062298 -255.01652594 111.83361144 -252.34765625 113.125 C-249.17754577 113.22106395 -247.74347282 112.14154651 -245.28515625 110.1875 C-241.65280407 104.87867758 -239.81158085 97.56042817 -239.28515625 91.1875 C-240.87417967 87.63468348 -242.01607869 86.36688504 -245.28515625 84.1875 C-249.56289099 83.28692426 -251.55001 84.63541349 -254.1484375 88.078125 Z" transform="translate(373.28515625,211.8125)"/>
                            <path d="M0 0 C1.75597566 -0.00379229 3.51194831 -0.00929978 5.26791382 -0.01637268 C9.9951421 -0.03022387 14.72200221 -0.01923179 19.44920969 -0.00266147 C24.41901271 0.01128808 29.38879648 0.00471792 34.35861206 0.00120544 C42.6987698 -0.0014884 51.03878293 0.0119093 59.37890625 0.03515625 C68.9959023 0.06177818 78.61265703 0.0635044 88.22967732 0.05176789 C97.51697864 0.04095849 106.80419341 0.04720082 116.09148788 0.06132317 C120.02818748 0.06705383 123.96482313 0.06702346 127.90152359 0.06225777 C132.54251682 0.05745665 137.18324848 0.06771836 141.82419205 0.08921242 C143.51878986 0.09473737 145.21341303 0.09528549 146.90801239 0.09025955 C159.44598425 0.05775924 170.84983236 1.26056697 182.14013672 7.12670898 C183.15346069 7.64720825 183.15346069 7.64720825 184.18725586 8.17822266 C201.51731217 17.39826569 212.64141119 32.43452336 219.20654297 50.63061523 C224.28880972 68.676345 220.96250836 86.51712673 218.27195358 104.64830399 C217.73529291 108.28843757 217.21701938 111.93118613 216.69702148 115.57373047 C215.87869683 121.29135027 215.05083441 127.00749217 214.21386719 132.72241211 C213.24644704 139.32874964 212.29747732 145.93753713 211.36279297 152.54858398 C211.12665091 154.21745122 210.89048686 155.88631533 210.65429688 157.55517578 C210.546922 158.31389984 210.43954712 159.0726239 210.32891846 159.8543396 C209.58812645 165.07151248 208.83347776 170.28669763 208.07763672 175.50170898 C204.07763672 175.50170898 204.07763672 175.50170898 202.61279297 174.32202148 C202.12681641 173.76256836 201.64083984 173.20311523 201.14013672 172.62670898 C187.88266763 158.66704344 170.01745699 149.21500734 153.07763672 140.50170898 C153.65872471 132.53883231 154.53500994 124.67540784 155.70654297 116.77905273 C156.02253278 114.58963346 156.33828074 112.40017926 156.65380859 110.21069336 C157.14672803 106.81821896 157.64206287 103.42613835 158.1418457 100.03466797 C158.62859884 96.72125104 159.10565025 93.40654451 159.58154297 90.09155273 C159.73152237 89.09228256 159.88150177 88.09301239 160.036026 87.0634613 C161.87332516 75.59212424 161.87332516 75.59212424 159.82763672 64.43920898 C157.13225627 61.45503777 155.06719821 60.58455861 151.03816319 60.24723339 C149.23934649 60.24415409 149.23934649 60.24415409 147.40419006 60.24101257 C146.39980138 60.23527425 146.39980138 60.23527425 145.37512201 60.22942001 C143.13273247 60.21910598 140.89059975 60.22307904 138.64819336 60.22705078 C137.03997053 60.22270342 135.43174978 60.21752019 133.8235321 60.21156311 C129.45578064 60.19816457 125.08811566 60.19759538 120.72034764 60.20012641 C117.07463459 60.20119552 113.42893907 60.1963143 109.78322977 60.19152099 C101.18286577 60.1804229 92.58254544 60.17999013 83.98217773 60.18603516 C75.10825428 60.19207652 66.23448931 60.17976051 57.3605929 60.15846509 C49.74265248 60.14085554 42.12476253 60.1348467 34.5068025 60.13810283 C29.95654361 60.13991683 25.40639778 60.13726788 20.8561573 60.12338829 C16.5773006 60.11082504 12.29869118 60.11273973 8.01983833 60.12579918 C6.44969093 60.12816778 4.8795262 60.12542012 3.30939865 60.11717606 C1.16533373 60.10673045 -0.97789807 60.11479071 -3.12193298 60.12748718 C-4.32152114 60.12731944 -5.52110929 60.1271517 -6.75704861 60.12697887 C-10.24415822 60.53980512 -12.11817963 61.4283992 -14.92236328 63.50170898 C-20.05474556 70.93755676 -16.4036342 83.60593203 -15.17236328 91.86889648 C-14.99479492 93.10664825 -14.81722656 94.34440002 -14.63427734 95.61965942 C-14.16617834 98.87678837 -13.69189114 102.13292624 -13.21386719 105.38861084 C-12.53908195 109.99074221 -11.87313366 114.59414052 -11.21044922 119.19802856 C-10.85826995 121.64153188 -10.5022984 124.08449236 -10.14208984 126.52682495 C-9.98192383 127.63212555 -9.82175781 128.73742615 -9.65673828 129.8762207 C-9.44355957 131.32869705 -9.44355957 131.32869705 -9.22607422 132.81051636 C-8.93368351 135.40140003 -8.86671867 137.89710484 -8.92236328 140.50170898 C-9.6600293 140.86969604 -9.6600293 140.86969604 -10.41259766 141.24511719 C-27.58587224 149.87759771 -42.46961805 159.8604795 -56.92236328 172.50170898 C-58.91362477 174.17922369 -60.91677037 175.8412923 -62.92236328 177.50170898 C-65.03860145 175.38547082 -64.80535365 171.10142639 -65.21337891 168.1809082 C-65.33871506 167.30752808 -65.46405121 166.43414795 -65.59318542 165.53430176 C-66.00933508 162.62560015 -66.41919936 159.7160533 -66.82861328 156.80639648 C-67.11604206 154.78106766 -67.40368339 152.75576899 -67.69152832 150.73049927 C-68.29620419 146.46859522 -68.89767984 142.20625399 -69.49707031 137.94360352 C-70.26041724 132.51737573 -71.03243633 127.09242473 -71.8070755 121.667799 C-72.40468811 117.47464572 -72.99709222 113.2807684 -73.58805847 109.08667374 C-73.87021358 107.08924679 -74.15403874 105.09205494 -74.43965149 103.09511948 C-78.12068301 77.31283716 -80.72380045 53.22568054 -64.92236328 30.50170898 C-64.36033203 29.68186523 -63.79830078 28.86202148 -63.21923828 28.01733398 C-47.96995784 7.38595456 -24.68167425 -0.15367849 0 0 Z" transform="translate(183.92236328125,31.498291015625)"/>
                          </svg>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                 {/* Start Button */}
                 <div className="flex items-center justify-center gap-2 bg-black/90 rounded-xl py-3 px-4 group-hover:bg-black transition-colors">
                   {isSecret && !unlocked ? (
                     <>
                       <Lock className="w-5 h-5 text-white" />
                       <span className="text-white font-bold text-sm uppercase tracking-wider">
                         {10 - profile.stats.totalSims} Workouts Left
                       </span>
                     </>
                   ) : canStart ? (
                     <>
                       <Play className="w-5 h-5 text-yellow-500" fill="currentColor" />
                       <span className="text-white font-bold text-sm uppercase tracking-wider">
                         {isCircuit ? 'Start the Workout' : unlocked ? 'Start Simulation' : `Use Trial (${trialsLeft} left)`}
                       </span>
                     </>
                   ) : (
                     <>
                       <Lock className="w-5 h-5 text-white" />
                       <span className="text-white font-bold text-sm uppercase tracking-wider">
                         Unlock to Start
                       </span>
                     </>
                   )}
                 </div>
               </div>
             </button>
           );
        })}
      </div>
    </div>
  );
}

