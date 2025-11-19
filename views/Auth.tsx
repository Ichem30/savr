import React, { useState, useEffect } from 'react';
import { Icons } from '../components/Icons';
import { User } from 'firebase/auth';
import { 
  signInGoogle, 
  signInApple, 
  signInGuest, 
  registerWithEmail, 
  loginWithEmail, 
  signInPhone, 
  sendVerificationEmail, 
  reloadCurrentUser,
  logOut
} from '../services/firebase';

interface AuthProps {
  onSkip: () => void;
  currentUser: User | null;
}

export const Auth: React.FC<AuthProps> = ({ onSkip, currentUser }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  
  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showVerificationScreen, setShowVerificationScreen] = useState(false);

  // Check if we need to show verification screen on mount or update
  useEffect(() => {
    if (currentUser && !currentUser.emailVerified) {
      // Only for email/password providers
      const isEmailAuth = currentUser.providerData.some(p => p.providerId === 'password');
      if (isEmailAuth) {
        setShowVerificationScreen(true);
      }
    }
  }, [currentUser]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isLogin) {
        await loginWithEmail(email, password);
        // Logic for verified check happens in App.tsx or useEffect above
      } else {
        await registerWithEmail(email, password);
        await sendVerificationEmail();
        setShowVerificationScreen(true);
      }
    } catch (err: any) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckVerification = async () => {
    setLoading(true);
    try {
      const user = await reloadCurrentUser();
      if (user?.emailVerified) {
        // Force a refresh of the app state essentially, App.tsx will catch the change
        window.location.reload(); 
      } else {
        setError("Email not verified yet. Please check your inbox.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setLoading(true);
    try {
      await sendVerificationEmail();
      alert("Verification email sent!");
    } catch (e: any) {
      if (e.code === 'auth/too-many-requests') {
        setError("Too many requests. Please wait a moment.");
      } else {
        setError("Failed to send email.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await signInPhone(phoneNumber);
      setConfirmationResult(result);
    } catch (err: any) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await confirmationResult.confirm(otp);
    } catch (err: any) {
      setError("Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple' | 'guest') => {
    setError(null);
    setLoading(true);
    try {
      if (provider === 'google') await signInGoogle();
      if (provider === 'apple') await signInApple();
      if (provider === 'guest') await signInGuest();
    } catch (err: any) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthError = (err: any) => {
      console.error("Auth Error:", err);

      switch (err.code) {
        case 'auth/unauthorized-domain':
          setError(`Configuration Error: The domain '${window.location.hostname}' is not authorized in Firebase. Please add it to Authorized Domains in the Firebase Console.`);
          break;
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          setError("Incorrect email or password. Please double-check your details.");
          break;
        case 'auth/email-already-in-use':
          setError("This email is already registered. Try logging in instead.");
          break;
        case 'auth/weak-password':
          setError("Password is too weak. Please use at least 6 characters.");
          break;
        case 'auth/network-request-failed':
          setError("Connection failed. Please check your internet connection.");
          break;
        case 'auth/too-many-requests':
          setError("Too many failed attempts. Please try again later.");
          break;
        case 'auth/popup-closed-by-user':
          setError("Sign-in cancelled.");
          break;
        case 'auth/popup-blocked':
          setError("Sign-in popup was blocked by your browser. Please allow popups.");
          break;
        case 'auth/admin-restricted-operation':
        case 'auth/operation-not-allowed':
          setError("This sign-in method is disabled. Please contact support or check Firebase Console.");
          break;
        case 'auth/invalid-phone-number':
          setError("Invalid phone number. Please use international format (e.g., +1555...).");
          break;
        case 'auth/quota-exceeded':
            setError("SMS quota exceeded for this project.");
            break;
        case 'auth/captcha-check-failed':
            setError("ReCAPTCHA failed. Please try again.");
            break;
        case 'auth/invalid-verification-code':
            setError("The code you entered is incorrect.");
            break;
        case 'auth/missing-verification-code':
            setError("Please enter the verification code.");
            break;
        default:
          // Fallback for unknown errors
          setError(err.message || "An unknown error occurred during sign in.");
      }
  };

  // --- VERIFICATION SCREEN ---
  if (showVerificationScreen) {
    return (
      <div className="h-full flex flex-col bg-white p-6 justify-center items-center text-center">
        <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6 animate-bounce-slow">
          <Icons.MessageCircle size={40} />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Verify your email</h2>
        <p className="text-gray-500 mb-8">
          We sent a verification link to <br/><span className="font-bold text-gray-800">{currentUser?.email}</span>.
          <br/>Please check your inbox.
        </p>

        {error && <div className="text-red-500 text-xs bg-red-50 p-3 rounded-lg border border-red-100 mb-4 w-full">{error}</div>}

        <button 
          onClick={handleCheckVerification}
          disabled={loading}
          className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-emerald-600 active:scale-[0.98] transition-all mb-3"
        >
          {loading ? 'Checking...' : 'I have verified my email'}
        </button>

        <button 
          onClick={handleResendEmail}
          disabled={loading}
          className="text-primary font-medium text-sm py-2 hover:underline"
        >
          Resend Email
        </button>

        <button 
          onClick={() => {
            logOut();
            setShowVerificationScreen(false);
            setIsLogin(true);
          }}
          className="mt-8 text-gray-400 text-xs hover:text-gray-600"
        >
          Sign Out / Use different email
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white p-6 overflow-y-auto">
      <div className="flex-1 flex flex-col justify-center py-8">
        <div className="text-center mb-8">
            <div className="w-20 h-20 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl shadow-primary/20">
                <Icons.ChefHat size={40} />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">PantryFit Chef</h1>
            <p className="text-gray-500">Turn ingredients into healthy meals.</p>
        </div>

        {/* Method Toggle */}
        <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
            <button 
                onClick={() => { setAuthMethod('email'); setError(null); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${authMethod === 'email' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
            >
                Email
            </button>
            <button 
                onClick={() => { setAuthMethod('phone'); setError(null); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${authMethod === 'phone' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
            >
                Phone
            </button>
        </div>

        {authMethod === 'email' && (
            <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
                <div className="space-y-3">
                    <input 
                        type="email" 
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="Email address"
                        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-primary font-semibold"
                    />
                    <input 
                        type="password" 
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-primary font-semibold"
                    />
                </div>
                
                {error && <div className="text-red-500 text-xs text-center bg-red-50 p-3 rounded-lg border border-red-100 break-words">{error}</div>}

                <button 
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-emerald-600 active:scale-[0.98] transition-all disabled:opacity-70"
                >
                    {loading ? 'Processing...' : (isLogin ? 'Log In' : 'Sign Up')}
                </button>
            </form>
        )}

        {authMethod === 'phone' && (
            <div className="mb-6">
                {!confirmationResult ? (
                    <form onSubmit={handlePhoneSignIn} className="space-y-4">
                         <input 
                            type="tel" 
                            required
                            value={phoneNumber}
                            onChange={e => setPhoneNumber(e.target.value)}
                            placeholder="+1 555 555 5555"
                            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-center text-lg tracking-wider text-primary font-semibold"
                        />
                        <p className="text-xs text-gray-400 text-center">Include country code (e.g., +1 or +44)</p>
                        {error && <div className="text-red-500 text-xs text-center bg-red-50 p-3 rounded-lg border border-red-100 break-words">{error}</div>}
                        <button 
                            type="submit"
                            disabled={loading || !phoneNumber}
                            className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-emerald-600 active:scale-[0.98] transition-all disabled:opacity-70"
                        >
                            {loading ? 'Sending Code...' : 'Send Verification Code'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOtp} className="space-y-4">
                        <p className="text-sm text-center text-gray-600">Enter the code sent to {phoneNumber}</p>
                        <input 
                            type="text" 
                            required
                            value={otp}
                            onChange={e => setOtp(e.target.value)}
                            placeholder="123456"
                            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-center text-2xl tracking-[0.5em] text-primary font-semibold"
                            maxLength={6}
                        />
                        {error && <div className="text-red-500 text-xs text-center bg-red-50 p-3 rounded-lg border border-red-100 break-words">{error}</div>}
                        <button 
                            type="submit"
                            disabled={loading || otp.length < 6}
                            className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-emerald-600 active:scale-[0.98] transition-all disabled:opacity-70"
                        >
                            {loading ? 'Verifying...' : 'Verify Code'}
                        </button>
                        <button 
                            type="button"
                            onClick={() => { setConfirmationResult(null); setError(null); }}
                            className="w-full py-2 text-sm text-gray-400 hover:text-gray-600"
                        >
                            Change Number
                        </button>
                    </form>
                )}
            </div>
        )}

        <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-400">Or continue with</span></div>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <button 
                onClick={() => handleSocialLogin('google')}
                disabled={loading}
                className="flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium text-gray-700"
            >
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                Google
            </button>
            <button 
                onClick={() => handleSocialLogin('apple')}
                disabled={loading}
                className="flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium text-gray-700"
            >
               <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.48 2.24-.82 3.26-.28.48.25.9.55 1.25.91-2.71 1.66-2.24 5.33.39 6.56-.32 1.74-1.15 3.42-2.06 4.98h.08zm-3.82-15.2a5.6 5.6 0 01-1.6 4.4c-1.41 1.26-2.99.98-3.75.1-.75-1.37-.22-3.12 1.18-4.38 1.4-1.31 3.17-1.11 4.17-.12z"/></svg>
               Apple
            </button>
        </div>
      </div>

      {authMethod === 'email' && (
        <div className="text-center">
            <p className="text-gray-600">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button 
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-primary font-bold hover:underline"
                >
                    {isLogin ? "Sign Up" : "Log In"}
                </button>
            </p>
        </div>
      )}
    </div>
  );
};