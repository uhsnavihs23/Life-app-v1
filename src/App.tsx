/**
 * App.tsx - Root Component
 * 
 * This is the entry point of LifeLog AI.
 * It wraps everything in the AppProvider (global state)
 * and conditionally renders either the Login screen or the Main App
 * based on whether the user is logged in.
 */

import { AppProvider, useApp } from './store/AppContext';
import LoginScreen from './views/LoginScreen';
import MainApp from './views/MainApp';

function AppRouter() {
  const { state } = useApp();
  
  if (!state.isLoggedIn) {
    return <LoginScreen />;
  }
  
  return <MainApp />;
}

export default function App() {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  );
}
