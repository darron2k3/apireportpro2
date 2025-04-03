import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { Landing } from './pages/Landing';
import { AuthForm } from './components/AuthForm';
import { InspectionForm } from './components/InspectionForm';

function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route
            path="/signin"
            element={
              session ? <Navigate to="/dashboard" /> : (
                <div className="min-h-screen flex items-center justify-center px-4">
                  <AuthForm />
                </div>
              )
            }
          />
          <Route
            path="/signup"
            element={
              session ? <Navigate to="/dashboard" /> : (
                <div className="min-h-screen flex items-center justify-center px-4">
                  <AuthForm />
                </div>
              )
            }
          />
          <Route
            path="/dashboard"
            element={
              session ? (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                  <h1 className="text-3xl font-bold text-gray-900 mb-8">
                    Create Inspection Report
                  </h1>
                  <InspectionForm />
                </div>
              ) : (
                <Navigate to="/signin" />
              )
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;