import { Home, User, Book, Trophy } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const isHome = location.pathname === '/';
  const isLogbook = location.pathname === '/logbook';
  const isPB = location.pathname === '/personal-bests';
  const isProfile = location.pathname === '/profile';

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-black border-t border-white/10" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}>
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        <button
          onClick={() => navigate('/')}
          className={cn(
            'flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors',
            isHome ? 'text-yellow-500' : 'text-white/60'
          )}
        >
          <Home className="w-5 h-5" />
          <span className="text-xs font-medium">Home</span>
        </button>

        <button
          onClick={() => navigate('/logbook')}
          className={cn(
            'flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors',
            isLogbook ? 'text-yellow-500' : 'text-white/60'
          )}
        >
          <Book className="w-5 h-5" />
          <span className="text-xs font-medium">Logbook</span>
        </button>

        <button
          onClick={() => navigate('/personal-bests')}
          className={cn(
            'flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors',
            isPB ? 'text-yellow-500' : 'text-white/60'
          )}
        >
          <Trophy className="w-5 h-5" />
          <span className="text-xs font-medium">PBs</span>
        </button>

        <button
          onClick={() => navigate('/profile')}
          className={cn(
            'flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors',
            isProfile ? 'text-yellow-500' : 'text-white/60'
          )}
        >
          <User className="w-5 h-5" />
          <span className="text-xs font-medium">Profile</span>
        </button>
      </div>
    </nav>
  );
}


