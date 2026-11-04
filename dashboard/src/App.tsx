import { Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import { Layout } from './components/Layout';
import { Loading } from './components/States';
import { Activity } from './pages/Activity';
import { CaseDetail } from './pages/CaseDetail';
import { Cases } from './pages/Cases';
import { Contacts } from './pages/Contacts';
import { Documents } from './pages/Documents';
import { Hearings } from './pages/Hearings';
import { Login } from './pages/Login';
import { NotFound } from './pages/NotFound';
import { Overview } from './pages/Overview';

export default function App() {
  const { status } = useAuth();

  if (status === 'checking') {
    return (
      <div className="login-shell">
        <div className="login-card">
          <Loading rows={2} />
        </div>
      </div>
    );
  }

  if (status === 'anon') {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Overview />} />
        <Route path="/cases" element={<Cases />} />
        <Route path="/cases/:caseId" element={<CaseDetail />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/hearings" element={<Hearings />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
