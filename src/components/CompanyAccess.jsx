import { useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api/api';
import { Key, Copy, Check, Plus, Ban, Clock } from 'lucide-react';

export default function CompanyAccess() {
    const [codes, setCodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [copiedId, setCopiedId] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const fetchCodes = useCallback(async () => {
        try {
            const res = await authAPI.getInviteCodes();
            setCodes(res.data);
        } catch { /* ignore */ } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchCodes(); }, [fetchCodes]);

    const handleGenerate = async () => {
        setGenerating(true);
        setError('');
        try {
            await authAPI.generateInviteCode();
            setSuccess('Invitation code generated!');
            fetchCodes();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to generate code.');
        } finally {
            setGenerating(false);
        }
    };

    const handleDeactivate = async (id) => {
        try {
            await authAPI.deactivateInvitation(id);
            setSuccess('Invitation deactivated.');
            fetchCodes();
            setTimeout(() => setSuccess(''), 3000);
        } catch {
            setError('Failed to deactivate code.');
            setTimeout(() => setError(''), 3000);
        }
    };

    const handleCopy = (code, id) => {
        navigator.clipboard.writeText(code);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const isExpired = (expiresAt) => new Date(expiresAt) < new Date();

    const S = {
        card: {
            background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)',
            padding: '20px',
        },
        header: {
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '16px',
        },
        title: {
            display: 'flex', alignItems: 'center', gap: '10px',
            fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)',
        },
        codeRow: {
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px', borderRadius: '10px',
            border: '1px solid var(--border-color)', background: 'var(--bg-body)',
            transition: 'border-color 0.15s',
        },
        codeText: {
            fontFamily: 'monospace', fontSize: '0.95rem', fontWeight: 700,
            color: 'var(--text-primary)', letterSpacing: '0.5px',
        },
        statusBadge: (active) => ({
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '3px 8px', borderRadius: '999px',
            fontSize: '0.65rem', fontWeight: 600,
            background: active ? '#F0FDF4' : '#FEF2F2',
            color: active ? '#16A34A' : '#DC2626',
        }),
    };

    return (
        <div style={S.card}>
            <div style={S.header}>
                <div style={S.title}>
                    <Key size={18} style={{ color: 'var(--color-primary)' }} />
                    <span>Company Access</span>
                </div>
                <button
                    className="btn btn--primary btn--sm"
                    onClick={handleGenerate}
                    disabled={generating}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
                >
                    <Plus size={14} /> {generating ? 'Generating...' : 'Generate Code'}
                </button>
            </div>

            {success && <div className="alert alert--success" style={{ marginBottom: '12px', padding: '8px 12px', fontSize: '0.85rem' }}>{success}</div>}
            {error && <div className="alert alert--danger" style={{ marginBottom: '12px', padding: '8px 12px', fontSize: '0.85rem' }}>{error}</div>}

            {loading ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading codes...</div>
            ) : codes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    No invitation codes yet. Generate one to invite team members.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                    {codes.map((c) => {
                        const expired = isExpired(c.expires_at);
                        const active = c.is_active && !expired;
                        return (
                            <div key={c.id} style={{ ...S.codeRow, opacity: active ? 1 : 0.6 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                    <span style={S.codeText}>{c.code}</span>
                                    <span style={S.statusBadge(active)}>
                                        {!c.is_active ? 'Deactivated' : expired ? 'Expired' : 'Active'}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {active && (
                                        <>
                                            <button
                                                onClick={() => handleCopy(c.code, c.id)}
                                                title="Copy to Clipboard"
                                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: copiedId === c.id ? 'var(--color-success)' : 'var(--text-muted)', transition: 'color 0.2s', padding: '4px' }}
                                            >
                                                {copiedId === c.id ? <Check size={16} /> : <Copy size={16} />}
                                            </button>
                                            <button
                                                onClick={() => handleDeactivate(c.id)}
                                                title="Deactivate Code"
                                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', transition: 'color 0.2s', padding: '4px' }}
                                                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-danger)'}
                                                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                                            >
                                                <Ban size={16} />
                                            </button>
                                        </>
                                    )}
                                    {!active && (
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Clock size={12} />
                                            {expired ? 'Expired' : 'Revoked'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
