/**
 * LoginScreen - Entry point of the app
 * 
 * Uses Supabase for real email/password authentication.
 * - Sign Up: Creates new account (first time)
 * - Sign In: Login with existing account
 */

import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { SupabaseAuth } from '../services/SupabaseService';
import { Eye, EyeOff, Sparkles, Mail, Lock, UserPlus, LogIn } from 'lucide-react';
import { v4 as uuid } from 'uuid';

export default function LoginScreen() {
  const { dispatch } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async () => {
    setError('');
    setSuccess('');
    
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        // Sign Up - Create new account
        const { data, error } = await SupabaseAuth.signUp(email, password);
        if (error) {
          setError(error.message);
          setIsLoading(false);
          return;
        }
        if (data?.user) {
          // Check if email confirmation is required
          if (data.user.identities && data.user.identities.length === 0) {
            setSuccess('Account already exists. Please sign in instead.');
            setIsSignUp(false);
          } else {
            dispatch({
              type: 'LOGIN',
              user: {
                id: data.user.id,
                username: email.split('@')[0],
                email: email,
                displayName: email.split('@')[0],
                createdAt: new Date().toISOString(),
              },
            });
          }
        }
      } else {
        // Sign In - Login with existing account
        const { data, error } = await SupabaseAuth.signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login')) {
            setError('Invalid email or password. If you\'re new, click "Sign Up" first.');
          } else {
            setError(error.message);
          }
          setIsLoading(false);
          return;
        }
        if (data?.user) {
          dispatch({
            type: 'LOGIN',
            user: {
              id: data.user.id,
              username: email.split('@')[0],
              email: email,
              displayName: email.split('@')[0],
              createdAt: data.user.created_at,
            },
          });
        }
      }
    } catch (err) {
      setError('Authentication error. Please check your connection.');
    }

    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAuth();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 safe-area-top"
      style={{ background: 'linear-gradient(145deg, #667eea 0%, #764ba2 100%)' }}>

      
      {/* App Logo & Title */}
      <div className="text-center mb-8 fade-in">
        <div className="w-20 h-20 rounded-3xl mx-auto mb-4 flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)' }}>
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-white mb-2">LifeLog AI</h1>
        <p className="text-white/70 text-lg">Your personal life dashboard</p>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-sm bg-white/95 dark:bg-gray-900/95 rounded-3xl p-6 shadow-2xl backdrop-blur-xl fade-in"
        style={{ animationDelay: '0.15s' }}>
        
        <h2 className="text-2xl font-bold text-center mb-1" style={{ color: 'var(--color-text)' }}>
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </h2>
        <p className="text-center text-sm mb-5" style={{ color: 'var(--color-text-secondary)' }}>
          {isSignUp ? 'Sign up to start tracking your life' : 'Sign in to continue'}
        </p>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 
            px-4 py-3 rounded-xl mb-4 text-sm text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 
            px-4 py-3 rounded-xl mb-4 text-sm text-center">
            {success}
          </div>
        )}

        <div className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
              Email
            </label>
            <div className="relative">
              <Mail className="input-icon w-5 h-5" style={{ color: 'var(--color-text-tertiary)' }} />
              <input
                type="email"
                className="ios-input input-with-icon"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
              Password
            </label>
            <div className="relative">
              <Lock className="input-icon w-5 h-5" style={{ color: 'var(--color-text-tertiary)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                className="ios-input input-with-icon pr-12"
                placeholder={isSignUp ? 'Min 6 characters' : 'Enter password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" style={{ color: 'var(--color-text-tertiary)' }} />
                ) : (
                  <Eye className="w-5 h-5" style={{ color: 'var(--color-text-tertiary)' }} />
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            className="ios-btn ios-btn-primary w-full mt-2"
            onClick={handleAuth}
            disabled={isLoading}
            style={{ height: 52, fontSize: 17 }}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {isSignUp ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
                {isSignUp ? 'Sign Up' : 'Sign In'}
              </>
            )}
          </button>
        </div>

        {/* Toggle Sign Up / Sign In */}
        <div className="mt-5 text-center">
          <button
            className="text-sm font-medium"
            style={{ color: 'var(--color-primary)' }}
            onClick={() => { setIsSignUp(!isSignUp); setError(''); setSuccess(''); }}
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: 'var(--color-text-tertiary)' }}>
          🔐 Secure cloud authentication
        </p>
      </div>

      <p className="text-white/40 text-xs mt-6">LifeLog AI v1.0</p>
    </div>
  );
}
