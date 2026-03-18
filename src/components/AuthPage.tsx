import React, { useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react';

type AuthMode = 'login' | 'signup' | 'forgot';

interface AuthPageProps {
  onAuthSuccess: () => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const clearState = () => {
    setError('');
    setSuccessMessage('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearState();
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      onAuthSuccess();
    } catch (err: any) {
      setError(err.message === 'Invalid login credentials'
        ? 'Incorrect email or password. Please try again.'
        : err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    clearState();
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } }
      });
      if (error) throw error;
      onAuthSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearState();
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      if (error) throw error;
      setSuccessMessage('Password reset link sent. Check your email.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left — Image Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src="/assets/mucii.jpeg"
          alt="Mûcií home"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/60 to-amber-900/40" />
        {/* Branding on image */}
        
      </div>

      {/* Right — Auth Form */}
     <div className="w-full lg:w-1/2 flex flex-col p-8 bg-gradient-to-br from-purple-50 via-white to-amber-50">
        {/* Logo top center */}
        <div className="flex justify-center pt-4 pb-8">
          <img src="/assets/Mheaderlogo.png" alt="Mûcií" className="h-16 w-auto" />
        </div>
        <div className="w-full max-w-md mx-auto flex-1 flex flex-col justify-center">

          {/* Back button for forgot password */}
          {mode === 'forgot' && (
            <button
              onClick={() => { setMode('login'); clearState(); }}
              className="flex items-center space-x-2 text-gray-500 hover:text-purple-900 mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back to login</span>
            </button>
          )}

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">
              {mode === 'login' && 'Welcome back'}
              {mode === 'signup' && 'Create your home'}
              {mode === 'forgot' && 'Reset password'}
            </h2>
            <p className="text-gray-500 mt-2">
              {mode === 'login' && 'Sign in to manage your household'}
              {mode === 'signup' && 'Set up your household account'}
              {mode === 'forgot' && "We'll send a reset link to your email"}
            </p>
          </div>

          {/* Error / Success messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
              {successMessage}
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email address</label>
                <input
                  type="email" required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  placeholder="you@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'} required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                    placeholder="Your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="text-right mt-2">
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); clearState(); }}
                    className="text-sm text-purple-700 hover:text-purple-900 font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>
              <button
                type="submit" disabled={loading}
                className="w-full bg-gradient-to-r from-purple-900 to-purple-800 text-white py-3 rounded-xl font-semibold shadow-lg shadow-purple-900/25 hover:shadow-xl transition-all disabled:opacity-60 flex items-center justify-center space-x-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{loading ? 'Signing in...' : 'Sign in'}</span>
              </button>
              <p className="text-center text-sm text-gray-500">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('signup'); clearState(); }}
                  className="text-purple-700 hover:text-purple-900 font-semibold"
                >
                  Create one
                </button>
              </p>
            </form>
          )}

          {/* SIGNUP FORM */}
          {mode === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Your full name</label>
                <input
                  type="text" required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  placeholder="e.g. Jane Kamau"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email address</label>
                <input
                  type="email" required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  placeholder="you@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'} required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                    placeholder="At least 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit" disabled={loading}
                className="w-full bg-gradient-to-r from-purple-900 to-purple-800 text-white py-3 rounded-xl font-semibold shadow-lg shadow-purple-900/25 hover:shadow-xl transition-all disabled:opacity-60 flex items-center justify-center space-x-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{loading ? 'Creating account...' : 'Create account'}</span>
              </button>
              <p className="text-center text-sm text-gray-500">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('login'); clearState(); }}
                  className="text-purple-700 hover:text-purple-900 font-semibold"
                >
                  Sign in
                </button>
              </p>
            </form>
          )}

          {/* FORGOT PASSWORD FORM */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email address</label>
                <input
                  type="email" required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  placeholder="you@email.com"
                />
              </div>
              <button
                type="submit" disabled={loading || !!successMessage}
                className="w-full bg-gradient-to-r from-purple-900 to-purple-800 text-white py-3 rounded-xl font-semibold shadow-lg shadow-purple-900/25 hover:shadow-xl transition-all disabled:opacity-60 flex items-center justify-center space-x-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{loading ? 'Sending...' : 'Send reset link'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
