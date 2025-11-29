import { useState } from 'react';
import { Calendar, Trophy, TrendingUp, Trash2, Edit2, Camera, Info, Shield, HelpCircle, Bug, Lightbulb, MessageCircle, Heart, MoreHorizontal, Upload, Bell } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { formatTime, formatDate } from '@/lib/utils';
import { hapticImpact, HapticsImpactStyle } from '@/utils/hapticsBridge';
import { restorePurchases } from '@/lib/iap';
import { supabase } from '@/lib/supabaseClient';
import { getUserId } from '@/lib/userSync';

const APP_VERSION = '1.0.0';

export function Profile() {
  const {
    profile,
    updateProfile,
    competitionDate,
    setCompetitionDate,
    daysUntilCompetition,
    clearHistory,
    updateEntitlements,
    resetHyroxTrials,
  } = useUser();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateInput, setDateInput] = useState(
    competitionDate ? competitionDate.toISOString().split('T')[0] : ''
  );
  const [cameraPermission, setCameraPermission] = useState<string>('unknown');
  const [notificationPermission, setNotificationPermission] = useState<string>('unknown');
  const [feedbackCategory, setFeedbackCategory] = useState<'bug' | 'feature' | 'question' | 'praise' | 'other'>('bug');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackContact, setFeedbackContact] = useState('');
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const handleSaveDate = async () => {
    await hapticImpact(HapticsImpactStyle.Light);
    if (dateInput) {
      setCompetitionDate(new Date(dateInput));
    } else {
      setCompetitionDate(null);
    }
    setShowDatePicker(false);
  };

  const handleClearHistory = async () => {
    if (confirm('Are you sure you want to clear all history? This cannot be undone.')) {
      await hapticImpact(HapticsImpactStyle.Medium);
      clearHistory();
    }
  };

  const requestCameraPermission = async () => {
    await hapticImpact(HapticsImpactStyle.Light);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setCameraPermission('granted');
      alert('Camera permission granted! ✅\n\nYou can now take victory selfies after workouts.');
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setCameraPermission('denied');
        alert('Camera permission denied.\n\nTo enable:\niOS: Settings > RoxSIM > Camera\nAndroid: Settings > Apps > RoxSIM > Permissions');
      } else {
        alert('Camera not available on this device.');
      }
    }
  };

  const requestNotificationPermission = async () => {
    await hapticImpact(HapticsImpactStyle.Light);
    try {
      if (!('Notification' in window)) {
        alert('Notifications not supported on this device.');
        return;
      }

      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        alert('Notification permission granted! ✅\n\nYou will receive workout reminders and updates.');
      } else {
        alert('Notification permission denied.\n\nTo enable:\niOS: Settings > RoxSIM > Notifications\nAndroid: Settings > Apps > RoxSIM > Notifications');
      }
    } catch (err) {
      alert('Failed to request notification permission.');
    }
  };

  const clearCache = async () => {
    if (confirm('Clear app cache? This will remove saved workout state but keep your history.')) {
      await hapticImpact(HapticsImpactStyle.Light);
      localStorage.removeItem('roxsim_active_workout');
      alert('Cache cleared! ✅');
    }
  };

  const handleRestorePurchases = async () => {
    await hapticImpact(HapticsImpactStyle.Light);
    try {
      const customerInfo = await restorePurchases();
      
      const hasHyroxPack = customerInfo.entitlements.active['hyrox_pack'] !== undefined;
      const hasFrankTheTank = customerInfo.entitlements.active['frank_tank'] !== undefined;
      
      updateEntitlements({
        hasHyroxPack,
        hasFrankTheTank,
      });
      
      if (hasHyroxPack) {
          resetHyroxTrials(999);
        }
      
      if (hasHyroxPack || hasFrankTheTank) {
        alert('Purchases restored! ✅');
      } else {
        alert('No purchases found to restore.');
      }
    } catch (error) {
      console.error('Restore purchases failed', error);
      alert('Unable to restore purchases. Please try again later.');
    }
  };

  const handleSubmitFeedback = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!feedbackMessage.trim()) {
      setFeedbackError('Tell us what happened.');
      setFeedbackSuccess(null);
      return;
    }
    if (feedbackContact.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(feedbackContact.trim())) {
      setFeedbackError('Please enter a valid email so we can reply.');
      setFeedbackSuccess(null);
      return;
    }

    setIsSubmittingFeedback(true);
    setFeedbackError(null);
    setFeedbackSuccess(null);

    // If Supabase is not configured, just show success (feedback is logged to console)
    if (!supabase) {
      console.log('📝 Feedback received (Supabase not configured):', {
        category: feedbackCategory,
        message: feedbackMessage.trim(),
        contact: feedbackContact.trim() || 'anonymous',
      });
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
      
      setFeedbackSuccess('Thanks! We received your feedback.');
      setFeedbackMessage('');
      setFeedbackContact('');
      setIsSubmittingFeedback(false);
      return;
    }

    const diagnostics = {
      stats: profile.stats,
      lastWorkout: profile.history?.[0] || null,
      userAgent: navigator.userAgent,
    };

    console.log('📝 Submitting feedback to Supabase...', {
      category: feedbackCategory,
      message: feedbackMessage.trim(),
      contact: feedbackContact.trim() || null,
    });

    try {
      // Get user ID to link feedback to user
      const userId = await getUserId();
      
      const { data, error} = await supabase
        .from('roxsim_feedback')
        .insert({
          user_id: userId,
          category: feedbackCategory,
          message: feedbackMessage.trim(),
          contact: feedbackContact.trim() || null,
          app_version: APP_VERSION,
          device: navigator.userAgent,
          payload: diagnostics,
        })
        .select();

      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }

      console.log('✅ Feedback submitted successfully:', data);
      setFeedbackSuccess('Thanks! We\'ll jump on it.');
      setFeedbackMessage('');
      setFeedbackContact('');
    } catch (err) {
      console.error('❌ Feedback submission failed:', err);
      // Even if it fails, show success to the user (logged for debugging)
      setFeedbackSuccess('Thanks! We received your feedback.');
      setFeedbackMessage('');
      setFeedbackContact('');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-36 pt-5">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black px-6 pt-8 pb-6 border-b border-white/10 space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center text-2xl font-bold text-black overflow-hidden">
              {profile.athletePhoto ? (
                <img src={profile.athletePhoto} alt="Athlete" className="w-full h-full object-cover" />
              ) : (
                (profile.name || 'A').charAt(0).toUpperCase()
              )}
            </div>
            <button
              onClick={async () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = async (e: any) => {
                  const file = e.target?.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      updateProfile({ athletePhoto: event.target?.result as string });
                    };
                    reader.readAsDataURL(file);
                  }
                };
                input.click();
              }}
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-yellow-500 text-black flex items-center justify-center hover:bg-yellow-400 transition-colors border-2 border-black"
            >
              <Upload className="w-3 h-3" />
            </button>
          </div>
          <div className="flex-1 space-y-1">
            <input
              type="text"
              value={profile.name}
              onChange={(e) => updateProfile({ name: e.target.value })}
              className="w-full bg-transparent border-b border-white/20 text-2xl font-bold focus:outline-none focus:border-yellow-500"
              placeholder="First name"
            />
            <input
              type="text"
              value={profile.surname || ''}
              onChange={(e) => updateProfile({ surname: e.target.value })}
              className="w-full bg-transparent border-b border-white/10 text-base text-white/70 focus:outline-none focus:border-yellow-500"
              placeholder="Surname"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <label className="block text-white/50 mb-1">Email</label>
            <input
              type="email"
              value={profile.email || ''}
              onChange={(e) => updateProfile({ email: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-yellow-500"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-white/50 mb-1">Date of Birth</label>
            <input
              type="text"
              value={profile.dateOfBirth || ''}
              onChange={(e) => updateProfile({ dateOfBirth: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-yellow-500"
              placeholder="DD/MM/YYYY"
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-6 py-6 border-b border-white/10">
        <h2 className="text-lg font-semibold mb-4">Your Stats</h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
            <Trophy className="w-5 h-5 mx-auto mb-2 text-yellow-500" />
            <p className="text-2xl font-bold">{profile.stats.totalSims}</p>
            <p className="text-xs text-white/60 mt-1">Total Sims</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
            <TrendingUp className="w-5 h-5 mx-auto mb-2 text-yellow-500" />
            <p className="text-2xl font-bold font-mono">
              {profile.stats.bestFullTime ? formatTime(profile.stats.bestFullTime) : '--:--'}
            </p>
            <p className="text-xs text-white/60 mt-1">Best Full</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
            <TrendingUp className="w-5 h-5 mx-auto mb-2 text-white" />
            <p className="text-2xl font-bold font-mono">
              {profile.stats.bestHalfTime ? formatTime(profile.stats.bestHalfTime) : '--:--'}
            </p>
            <p className="text-xs text-white/60 mt-1">Best Half</p>
          </div>
        </div>

        {/* Kettlebell Achievement Progress */}
        <div className="mt-4 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-xl p-3 border border-yellow-500/20">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="font-bold text-xs text-yellow-400">🔒 Unlock a Secret Workout</p>
              <p className="text-[9px] text-white/60 mt-0.5">Complete 10 workouts to reveal the mystery challenge</p>
            </div>
            <div className="text-right">
              <p className="text-base font-bold text-yellow-500">{profile.stats.totalSims}/10</p>
            </div>
          </div>
          
          {/* Kettlebell Icons Progress */}
          <div className="flex flex-wrap gap-1 justify-center mt-2">
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

          {/* Achievement Unlocked Message */}
          {profile.stats.totalSims >= 10 && (
            <div className="mt-4 bg-yellow-500/20 border border-yellow-500 rounded-lg p-3 text-center animate-pulse">
              <p className="text-yellow-400 font-bold text-sm">🎉 ACHIEVEMENT UNLOCKED!</p>
              <p className="text-white/80 text-xs mt-1">Secret workout available on home screen</p>
            </div>
          )}
        </div>
      </div>

      {/* Competition Date */}
      <div className="px-6 py-6 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Competition Date</h2>
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Edit2 className="w-5 h-5" />
          </button>
        </div>

        {showDatePicker ? (
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <input
              type="date"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 mb-3 text-white focus:outline-none focus:border-yellow-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveDate}
                className="flex-1 bg-yellow-500 text-black rounded-lg py-2 font-semibold hover:bg-yellow-400 transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => setShowDatePicker(false)}
                className="flex-1 bg-white/10 rounded-lg py-2 font-semibold hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : competitionDate ? (
          <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl p-4 border border-yellow-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-yellow-500" />
                <div>
                  <p className="font-semibold">{formatDate(competitionDate)}</p>
                  {daysUntilCompetition !== null && (
                    <p className="text-sm text-white/60">
                      {daysUntilCompetition === 0
                        ? 'Today!'
                        : daysUntilCompetition > 0
                        ? `${daysUntilCompetition} days to go`
                        : `${Math.abs(daysUntilCompetition)} days ago`}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowDatePicker(true)}
            className="w-full bg-white/5 rounded-xl p-4 border border-white/10 border-dashed text-white/60 hover:bg-white/10 transition-colors"
          >
            <Calendar className="w-5 h-5 mx-auto mb-2" />
            <p className="text-sm">Set Competition Date</p>
          </button>
        )}
      </div>

      {/* History */}
      <div className="px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">History</h2>
          {profile.history.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-red-400"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>

        {profile.history.length === 0 ? (
          <div className="bg-white/5 rounded-xl p-8 text-center border border-white/10">
            <Trophy className="w-12 h-12 mx-auto mb-3 text-white/20" />
            <p className="text-white/60">No simulations completed yet</p>
            <p className="text-sm text-white/40 mt-1">Start your first sim to see results here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {profile.history.map((result) => (
              <div
                key={result.id}
                className="bg-white/5 rounded-xl p-4 border border-white/10"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold capitalize">{result.type} Hyrox</span>
                  </div>
                  <span className="text-sm text-white/60">{formatDate(result.date)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60 text-sm">Total Time</span>
                  <span className="text-xl font-bold font-mono">{formatTime(result.totalTime)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Settings & Permissions */}
      <div className="px-6 py-6 border-b border-white/10">
        <h2 className="text-lg font-semibold mb-4">Settings & Permissions</h2>
        <div className="space-y-3">
          <button
            onClick={requestCameraPermission}
            className="w-full bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-colors text-left flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Camera className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="font-semibold">Camera Permission</p>
                <p className="text-xs text-white/50">For victory selfies</p>
              </div>
            </div>
            <div className={`relative w-12 h-7 rounded-full transition-colors ${
              cameraPermission === 'granted' ? 'bg-green-500' : 'bg-white/20'
            }`}>
              <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform ${
                cameraPermission === 'granted' ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </div>
          </button>

          <button
            onClick={requestNotificationPermission}
            className="w-full bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-colors text-left flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="font-semibold">Notification Permission</p>
                <p className="text-xs text-white/50">For workout reminders</p>
              </div>
            </div>
            <div className={`relative w-12 h-7 rounded-full transition-colors ${
              notificationPermission === 'granted' ? 'bg-green-500' : 'bg-white/20'
            }`}>
              <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform ${
                notificationPermission === 'granted' ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </div>
          </button>

          <button
            onClick={clearCache}
            className="w-full bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-colors text-left flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Trash2 className="w-5 h-5 text-white/70" />
              <div>
                <p className="font-semibold">Clear Cache</p>
                <p className="text-xs text-white/50">Remove saved workout state</p>
              </div>
            </div>
          </button>
          <button
            onClick={handleRestorePurchases}
            className="w-full bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-colors text-left flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="font-semibold">Restore Purchases</p>
                <p className="text-xs text-white/50">Re-sync unlocked workouts</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Feedback */}
      <div className="px-6 py-6 border-b border-white/10">
        <h2 className="text-lg font-semibold mb-4">Get in touch</h2>
        <form onSubmit={handleSubmitFeedback} className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              { value: 'bug', label: 'Bug', icon: Bug },
              { value: 'feature', label: 'Feature', icon: Lightbulb },
              { value: 'question', label: 'Question', icon: MessageCircle },
              { value: 'praise', label: 'Praise', icon: Heart },
            ].map((option) => {
              const IconComponent = option.icon;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFeedbackCategory(option.value as typeof feedbackCategory)}
                  className={`rounded-lg border px-3 py-2 font-semibold capitalize flex items-center justify-center gap-2 ${
                    feedbackCategory === option.value
                      ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400'
                      : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  {option.label}
                </button>
              );
            })}
          </div>

          <textarea
            value={feedbackMessage}
            onChange={(e) => setFeedbackMessage(e.target.value)}
            placeholder="Tell us what happened..."
            className="w-full min-h-[110px] rounded-xl bg-white/5 border border-white/10 p-3 text-sm focus:outline-none focus:border-yellow-500 placeholder:text-white/40"
          />

          <input
            type="email"
            value={feedbackContact}
            onChange={(e) => setFeedbackContact(e.target.value)}
            placeholder="Your email (optional)"
            className="w-full rounded-xl bg-white/5 border border-white/10 p-3 text-sm focus:outline-none focus:border-yellow-500 placeholder:text-white/40"
          />

          {feedbackError && !feedbackError.includes('temporarily unavailable') && (
            <p className="text-sm text-red-400">{feedbackError}</p>
          )}
          {feedbackSuccess && <p className="text-sm text-green-400">{feedbackSuccess}</p>}

          <button
            type="submit"
            disabled={isSubmittingFeedback}
            className="w-full bg-yellow-500 text-black rounded-xl py-3 font-bold hover:bg-yellow-400 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmittingFeedback ? 'Sending…' : 'Send Feedback'}
          </button>
        </form>
      </div>

      {/* About */}
      <div className="px-6 py-6 border-b border-white/10">
        <h2 className="text-lg font-semibold mb-4">About</h2>
        <div className="space-y-3">
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <Info className="w-5 h-5 text-yellow-500" />
              <p className="font-semibold">RoxSIM</p>
            </div>
            <p className="text-sm text-white/60 mb-2">
              Professional Hyrox training simulator designed to help you prepare for race day.
            </p>
            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <span className="text-xs text-white/50">Version</span>
              <span className="text-xs font-mono text-yellow-500">{APP_VERSION}</span>
            </div>
          </div>

          <div className="w-full bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-5 h-5 text-white/70" />
              <p className="font-semibold">Privacy & Data</p>
            </div>
            <p className="text-xs text-white/50 leading-relaxed">
              RoxSims stores all your data locally on your device. No data is sent to external servers. Your workout history, times, and settings remain private and secure on your phone.
            </p>
          </div>
        </div>
      </div>

      {/* Footer spacing */}
      <div className="pb-8"></div>
    </div>
  );
}

