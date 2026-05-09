/**
 * LoginScreen - Entry point of the app
 * 
 * A simple login screen with email/username and password fields.
 * Currently simulates login locally (no real backend).
 * 
 * TO ADD REAL AUTH:
 * Replace the AuthService.login() call with your real authentication
 * (e.g., Firebase Auth, Auth0, or custom API).
 */

import React, { useState } from 'react';
import { useApp } from '../store/AppContext';
import { AuthService } from '../services/AuthService';
import { Eye, EyeOff, Sparkles } from 'lucide-react';

export default function LoginScreen() {
  const { dispatch } = useApp();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    setIsLoading(true);
    
    // Simulate a brief loading delay
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const result = AuthService.login(loginId, password);
    setIsLoading(false);
    
    if (result.success && result.user) {
      dispatch({ type: 'LOGIN', user: result.user });
    } else {
      setError(result.error || 'Login failed. Please try again.');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: 'linear-gradient(145deg, #667eea 0%, #764ba2 100%)' }}>
      
      {/* App Logo & Title */}
      <div className="text-center mb-10 fade-in">
        <div className="w-20 h-20 rounded-3xl mx-auto mb-4 flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)' }}>
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-white mb-2">LifeLog AI</h1>
        <p className="text-white/70 text-lg">Your personal life dashboard</p>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-sm bg-white/95 dark:bg-gray-900/95 rounded-3xl p-8 shadow-2xl backdrop-blur-xl fade-in"
        style={{ animationDelay: '0.15s' }}>
        
        <h2 className="text-2xl font-bold text-center mb-6" style={{ color: 'var(--color-text)' }}>
          Welcome Back
        </h2>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 
            px-4 py-3 rounded-xl mb-4 text-sm text-center">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Login ID */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
              Email or Username
            </label>
            <input
              type="text"
              className="ios-input"
              placeholder="you@example.com"
              value={loginId}
              onChange={e => setLoginId(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              aria-label="Login ID"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="ios-input pr-12"
                placeholder="Enter password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                aria-label="Password"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" style={{ color: 'var(--color-text-tertiary)' }} />
                ) : (
                  <Eye className="w-5 h-5" style={{ color: 'var(--color-text-tertiary)' }} />
                )}
              </button>
            </div>
          </div>

          {/* Login Button */}
          <button
            className="ios-btn ios-btn-primary w-full mt-2"
            onClick={handleLogin}
            disabled={isLoading}
            aria-label="Login"
            style={{ height: 52, fontSize: 17 }}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Sign In'
            )}
          </button>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--color-text-tertiary)' }}>
          Demo mode — any credentials will work
        </p>
      </div>

      <p className="text-white/40 text-xs mt-8">LifeLog AI v1.0</p>
    </div>
  );
}
