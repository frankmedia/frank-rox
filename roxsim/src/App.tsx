import { BrowserRouter, Routes, Route, useLocation, useParams } from 'react-router-dom';
import { UserProvider, useUser } from '@/contexts/UserContext';
import { BottomNav } from '@/components/BottomNav';
import { Home } from '@/pages/Home';
import { Simulation } from '@/pages/Simulation';
import { CircuitSimulation } from '@/pages/CircuitSimulation';
import { Results } from '@/pages/Results';
import { Profile } from '@/pages/Profile';
import { Logbook } from '@/pages/Logbook';
import { PersonalBests } from '@/pages/PersonalBests';
import { useIAP } from '@/hooks/useIAP';

// Wrapper to route to correct simulation type
function SimulationRouter() {
  const { type } = useParams<{ type: string }>();
  
  if (type === 'circuit') {
    return <CircuitSimulation />;
  }
  
  return <Simulation />;
}

function AppContent() {
  const location = useLocation();
  const isSimulation = location.pathname.startsWith('/simulation');
  
  // Initialize IAP system
  useIAP();

  return (
    <div className="app-container">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/simulation/:type" element={<SimulationRouter />} />
        <Route path="/results/:type" element={<Results />} />
        <Route path="/logbook" element={<Logbook />} />
        <Route path="/personal-bests" element={<PersonalBests />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
      {!isSimulation && <BottomNav />}
    </div>
  );
}

function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </UserProvider>
  );
}

export default App;


