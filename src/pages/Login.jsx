import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Eye, EyeOff, ArrowLeft, KeyRound } from 'lucide-react';
import LineWaves from '../components/LineWaves';
import { authAPI } from '../api/api';
import './Auth.css';

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    
    // View state: 'login', 'forgot', 'reset'
    const [view, setView] = useState('login');
    const [form, setForm] = useState({ email: '', password: '' });
    const [forgotEmail, setForgotEmail] = useState('');
    const [resetData, setResetData] = useState({ otp: '', new_password: '', confirm_password: '' });
    
    const [showPassword, setShowPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(form.email, form.password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);
        try {
            const res = await authAPI.forgotPassword(forgotEmail);
            setSuccess(res.data.message);
            setView('reset');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to send reset code.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await authAPI.resetPassword({
                email: forgotEmail,
                otp: resetData.otp,
                new_password: resetData.new_password,
                confirm_password: resetData.confirm_password
            });
            setSuccess('Password updated successfully. Please login.');
            setView('login');
            setForm({ ...form, email: forgotEmail });
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to reset password.');
        } finally {
            setLoading(false);
        }
    };

    const renderLoginForm = () => (
        <form onSubmit={handleLogin}>
            {error && <div className="alert alert--danger">{error}</div>}
            {success && <div className="alert alert--success">{success}</div>}

            <div className="auth-form-group">
                <label className="auth-label" htmlFor="email">Email Address</label>
                <div className="auth-input-wrapper">
                    <input
                        id="email"
                        type="email"
                        className="auth-input"
                        placeholder="name@company.com"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        required
                    />
                    <div className="auth-input-icon"><Mail size={18} /></div>
                </div>
            </div>

            <div className="auth-form-group">
                <div className="flex justify-between items-center mb-2">
                    <label className="auth-label" style={{ marginBottom: 0 }} htmlFor="password">Password</label>
                    <button 
                        type="button" 
                        onClick={() => { setView('forgot'); setError(''); setSuccess(''); }}
                        className="auth-forgot-link"
                    >
                        Forgot Password?
                    </button>
                </div>
                <div className="auth-input-wrapper">
                    <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        className="auth-input"
                        placeholder="••••••••"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        required
                    />
                    <div className="auth-input-icon"><Lock size={18} /></div>
                    <button 
                        type="button"
                        className="auth-input-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
            </div>

            <button type="submit" className="auth-btn-primary" disabled={loading}>
                {loading ? 'Authenticating...' : 'Sign In'}
            </button>
        </form>
    );

    const renderForgotForm = () => (
        <div style={{ animation: 'authFadeUp 0.6s ease' }}>
            <div className="flex mb-4">
                <button 
                    type="button" 
                    onClick={() => { setView('login'); setError(''); setSuccess(''); }} 
                    className="auth-back-btn"
                >
                    <ArrowLeft size={16} /> Back to Login
                </button>
            </div>
            {error && <div className="alert alert--danger">{error}</div>}
            
            <form onSubmit={handleForgotPassword}>
                <div className="auth-form-group">
                    <label className="auth-label" htmlFor="forgot-email">Recovery Email</label>
                    <p className="auth-subtitle" style={{ fontSize: '0.8rem', textAlign: 'left', marginBottom: '12px' }}>
                        Linked to your APM Platform account
                    </p>
                    <div className="auth-input-wrapper">
                        <input
                            id="forgot-email"
                            type="email"
                            className="auth-input"
                            placeholder="name@company.com"
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                            required
                        />
                        <div className="auth-input-icon"><Mail size={18} /></div>
                    </div>
                </div>

                <button type="submit" className="auth-btn-primary" disabled={loading} style={{ marginTop: '12px' }}>
                    {loading ? 'Sending Code...' : 'Send Recovery Code'}
                    <ArrowRight size={18} style={{ marginLeft: '8px' }} />
                </button>
            </form>
        </div>
    );

    const renderResetForm = () => (
        <div style={{ animation: 'authFadeUp 0.6s ease' }}>
            <div className="flex mb-4">
                <button 
                    type="button" 
                    onClick={() => { setView('forgot'); setError(''); setSuccess(''); }} 
                    className="auth-back-btn"
                >
                    <ArrowLeft size={16} /> Change Email
                </button>
            </div>
            {error && <div className="alert alert--danger">{error}</div>}
            {success && <div className="alert alert--success">{success}</div>}

            <form onSubmit={handleResetPassword}>
                <div className="auth-form-group">
                    <label className="auth-label" htmlFor="otp">Verification Code</label>
                    <div className="auth-input-wrapper">
                        <input
                            id="otp"
                            type="text"
                            className="auth-input auth-otp-input"
                            placeholder="000000"
                            maxLength={6}
                            value={resetData.otp}
                            onChange={(e) => setResetData({ ...resetData, otp: e.target.value })}
                            required
                        />
                        <div className="auth-input-icon"><KeyRound size={18} /></div>
                    </div>
                </div>

                <div className="auth-form-group">
                    <label className="auth-label" htmlFor="new-password">New Password</label>
                    <div className="auth-input-wrapper">
                        <input
                            id="new-password"
                            type={showNewPassword ? "text" : "password"}
                            className="auth-input"
                            placeholder="••••••••"
                            value={resetData.new_password}
                            onChange={(e) => setResetData({ ...resetData, new_password: e.target.value })}
                            required
                        />
                        <div className="auth-input-icon"><Lock size={18} /></div>
                        <button 
                            type="button"
                            className="auth-input-toggle"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                            {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>

                <div className="auth-form-group">
                    <label className="auth-label" htmlFor="confirm-password">Confirm Password</label>
                    <div className="auth-input-wrapper">
                        <input
                            id="confirm-password"
                            type={showConfirmPassword ? "text" : "password"}
                            className="auth-input"
                            placeholder="••••••••"
                            value={resetData.confirm_password}
                            onChange={(e) => setResetData({ ...resetData, confirm_password: e.target.value })}
                            required
                        />
                        <div className="auth-input-icon"><Lock size={18} /></div>
                        <button 
                            type="button"
                            className="auth-input-toggle"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>

                <button type="submit" className="auth-btn-primary" disabled={loading} style={{ marginTop: '12px' }}>
                    {loading ? 'Updating...' : 'Securely Reset Password'}
                </button>
            </form>
        </div>
    );

    return (
        <div data-theme="default">
            <div className="auth-page">
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, opacity: 0.45 }}>
                    <LineWaves
                        speed={0.2}
                        innerLineCount={32}
                        outerLineCount={36}
                        warpIntensity={0.8}
                        rotation={-45}
                        edgeFadeWidth={0.2}
                        colorCycleSpeed={0.5}
                        brightness={0.2}
                        color1="#ffffff"
                        color2="#ffffff"
                        color3="#3908e7"
                        enableMouseInteraction
                        mouseInfluence={1.5}
                    />
                </div>
                
                <div className="auth-glass-container">
                    <div className="auth-header">
                        <div className="auth-brand">APM Platform</div>
                        <h1 className="auth-title">
                            {view === 'forgot' ? 'Forgot Password' : view === 'reset' ? 'Reset Password' : 'Welcome Back'}
                        </h1>
                        <p className="auth-subtitle">
                            {view === 'forgot' ? 'Enter your email to receive a password reset code' : 
                             view === 'reset' ? 'Enter the code sent to your email and set a new password' : 
                             'Enter your credentials to access your workspace'}
                        </p>
                    </div>

                    {view === 'login' && renderLoginForm()}
                    {view === 'forgot' && renderForgotForm()}
                    {view === 'reset' && renderResetForm()}

                    <div className="auth-divider">Or join your team</div>

                    <div className="auth-links">
                        <p>New here? 
                            <Link to="/register" className="auth-link">Register as Employee</Link>
                        </p>
                        <p style={{ marginTop: '12px' }}>Setting up a company? 
                            <Link to="/register/pm" className="auth-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                Register as Admin
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
