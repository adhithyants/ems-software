import { useState } from 'react';
import { authAPI } from '../api/api';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Key, CheckCircle, Eye, EyeOff } from 'lucide-react';
import LineWaves from '../components/LineWaves';
import './Auth.css';

export default function Register() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ name: '', email: '', password: '', invite_code: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);
        try {
            const res = await authAPI.register(form);
            setSuccess(res.data.message || 'Registration successful!');
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            const data = err.response?.data;
            if (typeof data === 'object') {
                const messages = Object.values(data).flat().join(' ');
                setError(messages);
            } else {
                setError('Registration failed.');
            }
        } finally {
            setLoading(false);
        }
    };

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
                        <h1 className="auth-title">Create Account</h1>
                        <p className="auth-subtitle">Join your organization workspace</p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {error && (
                            <div className="alert alert--danger" style={{ marginBottom: '24px', borderRadius: '12px' }}>
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="alert alert--success" style={{ marginBottom: '24px', borderRadius: '12px' }}>
                                {success}
                            </div>
                        )}

                        <div className="auth-form-group">
                            <label className="auth-label" htmlFor="name">Full Name</label>
                            <div className="auth-input-wrapper">
                                <input
                                    id="name"
                                    type="text"
                                    className="auth-input"
                                    placeholder=""
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    required
                                />
                                <div className="auth-input-icon">
                                    <User size={18} />
                                </div>
                            </div>
                        </div>

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
                                <div className="auth-input-icon">
                                    <Mail size={18} />
                                </div>
                            </div>
                        </div>

                        <div className="auth-form-group">
                            <label className="auth-label" htmlFor="invite_code">Invitation Code</label>
                            <div className="auth-input-wrapper">
                                <input
                                    id="invite_code"
                                    type="text"
                                    className="auth-input"
                                    placeholder="AUTH-XXXX-XXXX"
                                    value={form.invite_code}
                                    onChange={(e) => setForm({ ...form, invite_code: e.target.value })}
                                    required
                                />
                                <div className="auth-input-icon">
                                    <Key size={18} />
                                </div>
                            </div>
                        </div>

                        <div className="auth-form-group">
                            <label className="auth-label" htmlFor="password">Create Password</label>
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
                                <div className="auth-input-icon">
                                    <Lock size={18} />
                                </div>
                                <button 
                                    type="button"
                                    className="auth-input-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                    title={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" className="auth-btn-primary" disabled={loading}>
                            {loading ? 'Creating Account...' : 'Register'}
                        </button>
                    </form>

                    <div className="auth-links">
                        <p>Already have an account?
                            <Link to="/login" className="auth-link">Sign In</Link>

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
