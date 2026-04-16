import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api/api';
import { Shield, Key, Plus, Code2, User as UserIcon, TicketSlash, Ban, Users, AlertTriangle, Check, X, RefreshCw, Calendar, Save, Award, Search, Filter } from 'lucide-react';

/* ── derive status from an invitation object ── */
function getCodeStatus(code) {
    if (!code.is_active && code.usage_count < code.usage_limit) return 'deactivated';
    if (code.usage_count >= code.usage_limit) return 'exhausted';
    const now = new Date();
    const exp = new Date(code.expires_at);
    if (exp < now) return 'expired';
    return 'active';
}

/* ── format an ISO datetime to a readable "Expires" value ── */
function formatExpiry(isoStr) {
    const d = new Date(isoStr);
    return d.toLocaleString(undefined, {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

const ROLE_OPTIONS = [
    { value: 'PM', label: 'Project Manager' },
    { value: 'TL', label: 'Tech Lead' },
    { value: 'JP', label: 'Junior Programmer' },
];

export default function RolesManagement() {
    const { user } = useAuth();
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [activeTab, setActiveTab] = useState('employees');

    // Employees state
    const [employees, setEmployees] = useState([]);
    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const [changingRole, setChangingRole] = useState(null);
    const [confirmDeactivate, setConfirmDeactivate] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('ALL');

    // Pending users state removed as users now arrive with roles

    // Invite Codes State
    const [inviteCodes, setInviteCodes] = useState([]);
    const [generatingCode, setGeneratingCode] = useState(false);
    const [generateRole, setGenerateRole] = useState('PM');
    const [generateCountStr, setGenerateCountStr] = useState('1');
    const [copiedCode, setCopiedCode] = useState(null);

    // Leave Policies State
    const [leavePolicies, setLeavePolicies] = useState([]);
    const [loadingPolicies, setLoadingPolicies] = useState(false);
    const [savingPolicies, setSavingPolicies] = useState(false);

    // Earned Leaves State
    const [earnedLeaves, setEarnedLeaves] = useState([]);
    const [loadingEarnedLeaves, setLoadingEarnedLeaves] = useState(false);
    const [savingEarnedLeaves, setSavingEarnedLeaves] = useState(false);

    const showSuccess = (msg) => {
        setSuccess(msg);
        setTimeout(() => setSuccess(''), 4000);
    };

    const showError = (msg) => {
        setError(msg);
        setTimeout(() => setError(''), 4000);
    };

    // ── Fetch data ──
    const fetchEmployees = useCallback(async () => {
        setLoadingEmployees(true);
        try {
            const res = await authAPI.getEmployees();
            setEmployees(res.data);
        } catch (err) {
            console.error('Failed to fetch employees', err);
        } finally {
            setLoadingEmployees(false);
        }
    }, []);

    // fetchPendingUsers removed

    const fetchInviteCodes = useCallback(async () => {
        try {
            const res = await authAPI.getInviteCodes();
            setInviteCodes(res.data);
        } catch (err) {
            console.error('Failed to fetch invite codes', err);
        }
    }, []);

    const fetchLeavePolicies = useCallback(async () => {
        setLoadingPolicies(true);
        try {
            const { leavesAPI } = await import('../api/api');
            const res = await leavesAPI.getPolicies();
            setLeavePolicies(res.data);
        } catch (err) {
            console.error('Failed to fetch leave policies', err);
        } finally {
            setLoadingPolicies(false);
        }
    }, []);

    const fetchEarnedLeaves = useCallback(async () => {
        setLoadingEarnedLeaves(true);
        try {
            const { leavesAPI } = await import('../api/api');
            const res = await leavesAPI.getEarnedLeaves();
            setEarnedLeaves(res.data);
        } catch (err) {
            console.error('Failed to fetch earned leaves', err);
        } finally {
            setLoadingEarnedLeaves(false);
        }
    }, []);

    useEffect(() => {
        if (user?.role === 'SU') {
            fetchEmployees();
            fetchInviteCodes();
            fetchLeavePolicies();
            fetchEarnedLeaves();
        }
    }, [user, fetchEmployees, fetchInviteCodes, fetchLeavePolicies, fetchEarnedLeaves]);

    // ── Handlers ──
    const handleChangeRole = async (employeeId, newRole) => {
        setChangingRole(employeeId);
        try {
            await authAPI.changeEmployeeRole(employeeId, newRole);
            showSuccess('Role updated successfully.');
            fetchEmployees();
        } catch (err) {
            showError(err.response?.data?.error || 'Failed to change role.');
        } finally {
            setChangingRole(null);
        }
    };

    const handlePolicyChange = (role, type, field, value) => {
        setLeavePolicies(prev => {
            const existing = prev.find(p => p.role === role && p.leave_type === type);
            if (existing) {
                return prev.map(p => (p.role === role && p.leave_type === type) ? { ...p, [field]: value } : p);
            } else {
                return [...prev, { role, leave_type: type, [field]: value, limit: 0, frequency: 'Annual' }];
            }
        });
    };

    const handleSavePolicies = async () => {
        setSavingPolicies(true);
        try {
            const { leavesAPI } = await import('../api/api');
            const payload = leavePolicies.filter(p => ROLE_OPTIONS.some(r => r.value === p.role));
            await leavesAPI.updatePolicies(payload);
            showSuccess('Leave policies updated strictly!');
        } catch (err) {
            showError('Failed to save leave policies.');
        } finally {
            setSavingPolicies(false);
        }
    };

    const handleEarnedChange = (userId, field, value) => {
        setEarnedLeaves(prev => {
            const existing = prev.find(p => p.user === userId);
            if (existing) {
                return prev.map(p => (p.user === userId) ? { ...p, [field]: value } : p);
            } else {
                return [...prev, { user: userId, [field]: value, limit: 0, frequency: 'Annual' }];
            }
        });
    };

    const handleSaveEarnedLeaves = async () => {
        setSavingEarnedLeaves(true);
        try {
            const { leavesAPI } = await import('../api/api');
            const payload = earnedLeaves;
            await leavesAPI.updateEarnedLeaves(payload);
            showSuccess('Earned leaves updated successfully!');
        } catch (err) {
            showError('Failed to save earned leaves.');
        } finally {
            setSavingEarnedLeaves(false);
        }
    };

    const handleDeactivateEmployee = async (employeeId) => {
        try {
            const res = await authAPI.deactivateEmployee(employeeId);
            showSuccess(res.data.message);
            fetchEmployees();
            setConfirmDeactivate(null);
        } catch (err) {
            showError(err.response?.data?.error || 'Failed to update employee status.');
        }
    };

    const handleGenerateCode = async () => {
        const countNum = parseInt(generateCountStr, 10);
        if (!countNum || countNum < 1) {
            showError("Please enter a valid number greater than 0.");
            return;
        }
        if (countNum > 50) {
            showError("Maximum capacity is 50 users per code.");
            return;
        }

        setGeneratingCode(true);
        setError('');
        try {
            const res = await authAPI.generateInviteCode({ role: generateRole, count: countNum });
            setInviteCodes(prev => [res.data, ...prev]);
            showSuccess(`Generated invite code for ${countNum} user(s) successfully!`);
            setGenerateCountStr('1');
            setGenerateRole('PM');
        } catch (err) {
            showError(err.response?.data?.error || 'Failed to generate invite code.');
        } finally {
            setGeneratingCode(false);
        }
    };

    const handleDeactivateCode = async (id) => {
        try {
            await authAPI.deactivateInvitation(id);
            showSuccess('Code deactivated.');
            setInviteCodes(prev => prev.filter(c => c.id !== id));
        } catch {
            showError('Failed to deactivate code.');
        }
    };

    const handleCopyCode = (code) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2500);
    };

    const getRoleBadge = (role) => {
        const colors = {
            PM: { color: 'var(--color-primary)', bg: 'var(--color-primary-bg)' },
            TL: { color: '#7C3AED', bg: '#f3f0ff' },
            JP: { color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
            PD: { color: 'var(--color-warning)', bg: 'var(--color-warning-bg)' },
            SU: { color: 'var(--color-danger)', bg: 'var(--color-danger-bg)' },
        };
        const c = colors[role] || colors.PD;
        const labels = { SU: 'Supervisor', PM: 'Project Manager', TL: 'Tech Lead', JP: 'Junior Programmer', PD: 'Pending' };
        return (
            <span style={{
                display: 'inline-flex', alignItems: 'center', padding: '2px 10px',
                borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600,
                color: c.color, background: c.bg, whiteSpace: 'nowrap'
            }}>
                {labels[role] || role}
            </span>
        );
    };

    const tabs = [
        { id: 'employees', label: 'Employees', icon: Users },
        { id: 'invites', label: 'Invite Codes', icon: Key },
        { id: 'policies', label: 'Leave Policies', icon: Calendar },
        { id: 'earned', label: 'Earned Leaves', icon: Award },
        { id: 'roles', label: 'Defined Roles', icon: Shield },
    ];

    const roles = [
        {
            value: 'SU', label: 'Supervisor',
            icon: <Shield size={16} />, accent: 'var(--color-danger)', accentBg: 'var(--color-danger-bg)',
            desc: 'Company owner. Manages employees, roles, invite codes, and approves PM leave requests.',
        },
        {
            value: 'PM', label: 'Project Manager',
            icon: <Shield size={16} />, accent: 'var(--color-primary)', accentBg: 'var(--color-primary-bg)',
            desc: 'Creates teams, projects, and assigns tasks. Approves TL/JP leave requests.',
        },
        {
            value: 'TL', label: 'Tech Lead',
            icon: <Code2 size={16} />, accent: '#7C3AED', accentBg: '#f3f0ff',
            desc: 'Leads a team. Can create tasks, review submissions, and manage team projects.',
        },
        {
            value: 'JP', label: 'Junior Programmer',
            icon: <UserIcon size={16} />, accent: 'var(--color-success)', accentBg: 'var(--color-success-bg)',
            desc: 'Works on assigned tasks. Can submit tasks for review.',
        },
    ];

    return (
        <div className="page">
            <div className="page__header">
                <h2>Admin Panel</h2>
            </div>

            {error && <div className="alert alert--danger">{error}</div>}
            {success && <div className="alert alert--success">{success}</div>}

            {/* ── Tabs ── */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '1.5rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '0' }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '10px 20px', border: 'none', background: 'none',
                            cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem',
                            color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--text-muted)',
                            borderBottom: activeTab === tab.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                            marginBottom: '-2px', transition: 'all 0.15s ease',
                            fontFamily: 'inherit',
                        }}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ═══ Employees Tab ═══ */}
            {activeTab === 'employees' && (
                <div className="card">
                    <div className="card__header" style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}><Users size={18} /> All Employees</h3>
                        
                        <div style={{ display: 'flex', gap: '12px', flex: 1, justifyContent: 'flex-end', minWidth: '300px' }}>
                            <div style={{ position: 'relative', flex: '1', maxWidth: '300px' }}>
                                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input 
                                    type="text"
                                    placeholder="Search name or email..."
                                    className="select"
                                    style={{ width: '100%', paddingLeft: '36px', height: '38px' }}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <select 
                                    className="select"
                                    style={{ height: '38px', padding: '0 12px', fontSize: '0.875rem', minWidth: '140px' }}
                                    value={roleFilter}
                                    onChange={(e) => setRoleFilter(e.target.value)}
                                >
                                    <option value="ALL">All Roles</option>
                                    <option value="PM">Project Manager</option>
                                    <option value="TL">Tech Lead</option>
                                    <option value="JP">Junior Programmer</option>
                                </select>
                            </div>

                            <button className="btn btn--outline btn--sm" style={{ height: '38px' }} onClick={fetchEmployees} disabled={loadingEmployees}>
                                <RefreshCw size={14} className={loadingEmployees ? 'spinning' : ''} /> Refresh
                            </button>
                        </div>
                    </div>
                    {(() => {
                        const filteredEmployees = employees.filter(emp => {
                            const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                                 emp.email.toLowerCase().includes(searchTerm.toLowerCase());
                            const matchesRole = roleFilter === 'ALL' || emp.role === roleFilter;
                            return matchesSearch && matchesRole;
                        });

                        return filteredEmployees.length === 0 ? (
                            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                <Users size={40} strokeWidth={1.2} />
                                <p style={{ marginTop: '12px' }}>{searchTerm || roleFilter !== 'ALL' ? 'No matching employees found.' : 'No employees found.'}</p>
                                {(searchTerm || roleFilter !== 'ALL') && (
                                    <button 
                                        className="btn btn--link btn--sm" 
                                        onClick={() => { setSearchTerm(''); setRoleFilter('ALL'); }}
                                        style={{ color: 'var(--color-primary)' }}
                                    >
                                        Clear filters
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="table-wrapper">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Email</th>
                                            <th>Role</th>
                                            <th>Status</th>
                                            <th>Joined</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredEmployees.map(emp => (
                                        <tr key={emp.id} style={{ opacity: emp.is_active ? 1 : 0.5 }}>
                                            <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{emp.name}</td>
                                            <td>{emp.email}</td>
                                            <td>
                                                {emp.role === 'SU' ? getRoleBadge(emp.role) : (
                                                    <select
                                                        value={emp.role || 'PD'}
                                                        onChange={(e) => handleChangeRole(emp.id, e.target.value)}
                                                        disabled={changingRole === emp.id}
                                                        className="select"
                                                        style={{ maxWidth: '160px', padding: '4px 8px', fontSize: '0.82rem' }}
                                                    >
                                                        {emp.role === 'PD' && <option value="PD">Pending</option>}
                                                        {ROLE_OPTIONS.map(r => (
                                                            <option key={r.value} value={r.value}>{r.label}</option>
                                                        ))}
                                                    </select>
                                                )}
                                            </td>
                                            <td>
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                    padding: '2px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600,
                                                    color: emp.is_active ? 'var(--color-success)' : 'var(--color-danger)',
                                                    background: emp.is_active ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                                                }}>
                                                    {emp.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                                {new Date(emp.created_at).toLocaleDateString()}
                                            </td>
                                            <td>
                                                {emp.role !== 'SU' && (
                                                    confirmDeactivate === emp.id ? (
                                                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                            <span style={{ fontSize: '0.78rem', color: 'var(--color-danger)', fontWeight: 600 }}>
                                                                {emp.is_active ? 'Deactivate?' : 'Reactivate?'}
                                                            </span>
                                                            <button className="btn btn--danger btn--sm" onClick={() => handleDeactivateEmployee(emp.id)}>
                                                                <Check size={13} /> Yes
                                                            </button>
                                                            <button className="btn btn--outline btn--sm" onClick={() => setConfirmDeactivate(null)}>
                                                                <X size={13} /> No
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            className={`btn btn--sm ${emp.is_active ? 'btn--outline' : 'btn--success'}`}
                                                            onClick={() => setConfirmDeactivate(emp.id)}
                                                            style={emp.is_active ? { color: 'var(--color-danger)', borderColor: 'var(--color-danger)' } : {}}
                                                        >
                                                            {emp.is_active ? <><Ban size={13} /> Deactivate</> : <><RefreshCw size={13} /> Reactivate</>}
                                                        </button>
                                                    )
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* ═══ Invite Codes Tab ═══ */}
            {activeTab === 'invites' && (
                <div className="card invite-card">
                    <div className="card__header invite-card__header">
                        <div className="invite-card__title-group">
                            <h3><Key size={18} /> Invite Codes</h3>
                            <span className="invite-card__subtitle">Used or expired codes vanish automatically. Valid for 7 days.</span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <select 
                                value={generateRole} 
                                onChange={e => setGenerateRole(e.target.value)} 
                                className="select" 
                                style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                            >
                                <option value="PM">Project Manager</option>
                                <option value="TL">Tech Lead</option>
                                <option value="JP">Junior Programmer</option>
                            </select>
                            <input 
                                type="text" 
                                value={generateCountStr} 
                                onChange={e => {
                                    const val = e.target.value.replace(/\D/g, ''); // Allow only digits
                                    setGenerateCountStr(val);
                                }} 
                                placeholder="Capacity"
                                className="select" 
                                style={{ width: '100px', padding: '6px 12px', fontSize: '0.85rem', textAlign: 'center' }} 
                            />
                            <button
                                className="btn btn--primary btn--sm"
                                onClick={handleGenerateCode}
                                disabled={generatingCode}
                            >
                                <Plus size={14} />
                                {generatingCode ? 'Generating…' : 'Generate'}
                            </button>
                        </div>
                    </div>

                    <div className="invite-card__body">
                        {inviteCodes.length === 0 ? (
                            <div className="invite-empty">
                                <TicketSlash size={40} strokeWidth={1.2} />
                                <p>No invite codes generated yet.</p>
                                <span>Click &ldquo;Generate New Code&rdquo; to create one.</span>
                            </div>
                        ) : (
                            <div className="invite-table-wrap">
                                <table className="table invite-table">
                                    <thead>
                                        <tr>
                                            <th>Code</th>
                                            <th>Target Role</th>
                                            <th>Usage</th>
                                            <th>Expires</th>
                                            <th>Status</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {inviteCodes.map(code => {
                                            const codeStatus = getCodeStatus(code);
                                            return (
                                                <tr key={code.id} className="invite-table__row" style={{ opacity: codeStatus === 'active' ? 1 : 0.6 }}>
                                                    <td>
                                                        <code className="invite-code-text">{code.code}</code>
                                                    </td>
                                                    <td>
                                                        {getRoleBadge(code.role_type || 'PD')}
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                                                {code.usage_count} / {code.usage_limit}
                                                            </span>
                                                            <div style={{ flex: 1, height: '4px', minWidth: '40px', background: 'var(--bg-hover)', borderRadius: '2px', overflow: 'hidden' }}>
                                                                <div style={{ 
                                                                    width: `${Math.min((code.usage_count / code.usage_limit) * 100, 100)}%`, 
                                                                    height: '100%', 
                                                                    background: code.usage_count >= code.usage_limit ? 'var(--color-danger)' : 'var(--color-primary)',
                                                                    transition: 'width 0.3s ease'
                                                                }} />
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="text-muted" style={{ fontSize: '0.82rem' }}>
                                                        {formatExpiry(code.expires_at)}
                                                    </td>
                                                    <td>
                                                        <span className={`ic-badge ic-badge--${codeStatus}`} style={codeStatus === 'exhausted' ? { color: 'var(--color-danger)', background: 'var(--color-danger-bg)' } : {}}>
                                                            {codeStatus.charAt(0).toUpperCase() + codeStatus.slice(1)}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {codeStatus === 'active' ? (
                                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                                <button
                                                                    className={`btn btn--sm ${copiedCode === code.code ? 'btn--success' : 'btn--outline'}`}
                                                                    onClick={() => handleCopyCode(code.code)}
                                                                >
                                                                    {copiedCode === code.code ? 'Copied!' : 'Copy'}
                                                                </button>
                                                                <button
                                                                    className="btn btn--sm btn--outline"
                                                                    onClick={() => handleDeactivateCode(code.id)}
                                                                    title="Deactivate"
                                                                    style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                                                                >
                                                                    <Ban size={13} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══ Leave Policies Tab ═══ */}
            {activeTab === 'policies' && (
                <div className="card">
                    <div className="card__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="invite-card__title-group">
                            <h3><Calendar size={18} /> Leave Policies</h3>
                            <span className="invite-card__subtitle">Configure how many leaves employees receive per Role.</span>
                        </div>
                        <button className="btn btn--primary btn--sm" onClick={handleSavePolicies} disabled={savingPolicies}>
                            <Save size={14} className={savingPolicies ? 'spinning' : ''} />
                            {savingPolicies ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                    <div className="table-wrapper">
                        {loadingPolicies ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
                        ) : (
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Role</th>
                                        <th>Casual Leave (CL)</th>
                                        <th>Sick Leave (SL)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ROLE_OPTIONS.map(r => (
                                        <tr key={r.value}>
                                            <td style={{ fontWeight: 600 }}>{getRoleBadge(r.value)}</td>
                                            {['CL', 'SL'].map(l_type => {
                                                const policy = leavePolicies.find(p => p.role === r.value && p.leave_type === l_type) || { limit: 0, frequency: 'Annual' };
                                                return (
                                                    <td key={l_type}>
                                                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                            <input 
                                                                type="text" 
                                                                className="select" 
                                                                style={{ width: '50px', padding: '6px', fontSize: '0.85rem', textAlign: 'center' }} 
                                                                value={policy.limit}
                                                                onChange={e => {
                                                                    const val = e.target.value.replace(/\D/g, '');
                                                                    handlePolicyChange(r.value, l_type, 'limit', parseInt(val) || 0);
                                                                }}
                                                            />
                                                            <select
                                                                className="select"
                                                                style={{ padding: '6px', fontSize: '0.85rem' }}
                                                                value={policy.frequency}
                                                                onChange={e => handlePolicyChange(r.value, l_type, 'frequency', e.target.value)}
                                                            >
                                                                <option value="Annual">Annual</option>
                                                                <option value="Monthly">Monthly</option>
                                                            </select>
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* ═══ Earned Leaves Tab ═══ */}
            {activeTab === 'earned' && (
                <div className="card">
                    <div className="card__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="invite-card__title-group">
                            <h3><Award size={18} /> Earned Leaves Allowances</h3>
                            <span className="invite-card__subtitle">Assign specific Earned Leave balances to individual employees.</span>
                        </div>
                        <button className="btn btn--primary btn--sm" onClick={handleSaveEarnedLeaves} disabled={savingEarnedLeaves}>
                            <Save size={14} className={savingEarnedLeaves ? 'spinning' : ''} />
                            {savingEarnedLeaves ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                    <div className="table-wrapper">
                        {loadingEmployees || loadingEarnedLeaves ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
                        ) : (
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Employee</th>
                                        <th>Role</th>
                                        <th>Earned Leave Limit</th>
                                        <th>Frequency</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {employees.filter(emp => emp.role !== 'SU' && emp.is_active).map(emp => {
                                        const policy = earnedLeaves.find(p => p.user === emp.id) || { limit: 0, frequency: 'Annual' };
                                        return (
                                            <tr key={emp.id}>
                                                <td style={{ fontWeight: 600 }}>{emp.name}</td>
                                                <td>{getRoleBadge(emp.role)}</td>
                                                <td>
                                                    <input 
                                                        type="text" 
                                                        className="select" 
                                                        style={{ width: '60px', padding: '6px', fontSize: '0.85rem', textAlign: 'center' }} 
                                                        value={policy.limit}
                                                        onChange={e => {
                                                            const val = e.target.value.replace(/\D/g, '');
                                                            handleEarnedChange(emp.id, 'limit', parseInt(val) || 0);
                                                        }}
                                                    />
                                                </td>
                                                <td>
                                                    <select
                                                        className="select"
                                                        style={{ padding: '6px', fontSize: '0.85rem' }}
                                                        value={policy.frequency}
                                                        onChange={e => handleEarnedChange(emp.id, 'frequency', e.target.value)}
                                                    >
                                                        <option value="Annual">Annual</option>
                                                        <option value="Monthly">Monthly</option>
                                                    </select>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* ═══ Defined Roles Tab ═══ */}
            {activeTab === 'roles' && (
                <div className="card roles-card">
                    <div className="card__header">
                        <h3><Shield size={18} /> Defined Roles</h3>
                    </div>
                    <div className="roles-list">
                        {roles.map(r => (
                            <div
                                key={r.value}
                                className="role-item"
                                style={{ '--role-accent': r.accent, '--role-accent-bg': r.accentBg }}
                            >
                                <div className="role-item__header">
                                    <span className="role-item__icon">{r.icon}</span>
                                    <div>
                                        <span className="role-item__label">{r.label}</span>
                                        <span className="role-item__code">{r.value}</span>
                                    </div>
                                </div>
                                <p className="role-item__desc">{r.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
