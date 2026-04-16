import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { teamsAPI, projectsAPI } from '../api/api';
import { useQueryClient } from '@tanstack/react-query';
import { useAllTeams, useAllUsers, useAllProjects } from '../hooks/useSharedData';
import Modal from '../components/Modal';
import { Plus, Users as UsersIcon, Search, X, UserCheck, Trash2, AlertTriangle, Mail, Eye, UserPlus, Phone, MoreHorizontal } from 'lucide-react';
import { SkeletonCard } from '../components/ui/Skeleton';


/* ─── small searchable dropdown used twice inside the manage modal ─── */
function SearchableUserList({ users, onSelect, placeholder = 'Search...' }) {
    const [q, setQ] = useState('');
    const filtered = useMemo(
        () => users.filter(u =>
            u.name.toLowerCase().includes(q.toLowerCase()) ||
            u.email.toLowerCase().includes(q.toLowerCase())
        ),
        [users, q]
    );

    return (
        <div className="searchable-list">
            <div className="searchable-list__input-wrap">
                <Search size={14} />
                <input
                    type="text"
                    placeholder={placeholder}
                    value={q}
                    onChange={e => setQ(e.target.value)}
                    autoFocus
                />
            </div>
            <ul className="searchable-list__options">
                {filtered.length === 0 && (
                    <li className="searchable-list__empty">No users found</li>
                )}
                {filtered.map(u => (
                    <li
                        key={u.id}
                        className="searchable-list__option"
                        onClick={() => { onSelect(u); setQ(''); }}
                    >
                        <span className="font-medium">{u.name}</span>
                        <span className="text-muted small">{u.email} · {u.role}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

/* ─── Team Detail Modal (read-only, for TL/JP view) ─── */
function TeamDetailModal({ team, onClose, user }) {
    const navigate = useNavigate();
    const tl = team.tech_lead;
    const members = team.members ?? [];

    /* derive this user's role in this specific team */
    const myRoleInTeam = tl?.id === user?.id
        ? 'Tech Lead'
        : members.some(m => m.id === user?.id)
            ? 'Junior Programmer'
            : null;

    const [selectedUserProfile, setSelectedUserProfile] = useState(null);

    return (
        <div className="team-detail">
            {/* ── Team Identity ── */}
            <div className="team-detail__hero">
                <div className="team-detail__hero-icon">
                    <UsersIcon size={28} />
                </div>
                <div>
                    <h2 className="team-detail__name">{team.name}</h2>
                    <span className="team-detail__meta">{members.length} Member{members.length !== 1 ? 's' : ''}</span>
                    {myRoleInTeam && (
                        <span className={`team-detail__my-role team-detail__my-role--${myRoleInTeam === 'Tech Lead' ? 'tl' : 'jp'}`}>
                            Your Role: {myRoleInTeam}
                        </span>
                    )}
                </div>
            </div>

            {/* ── Tech Lead ── */}
            <div className="team-detail__section">
                <div className="team-detail__section-label">
                    <UserCheck size={15} />
                    <span>Tech Lead</span>
                </div>
                {tl ? (
                    <div className="team-detail__tl-chip">
                        <div className="team-detail__avatar team-detail__avatar--tl">
                            {tl.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="team-detail__tl-info">
                            <span className="team-detail__tl-name" onClick={() => setSelectedUserProfile(tl)} style={{ cursor: 'pointer', textDecoration: 'underline' }}>{tl.name}</span>
                            <span className="team-detail__tl-email">
                                {tl.email}
                            </span>
                        </div>
                    </div>
                ) : (
                    <p className="team-detail__empty">No Tech Lead assigned.</p>
                )}
            </div>

            {/* ── JP Roster ── */}
            <div className="team-detail__section">
                <div className="team-detail__section-label">
                    <UsersIcon size={15} />
                    <span>Members</span>
                    <span className="team-detail__count">{members.length}</span>
                </div>
                {members.length > 0 ? (
                    <ul className="team-detail__roster">
                        {members.map((m, idx) => (
                            <li key={m.id} className="team-detail__member-row">
                                <div className="team-detail__avatar" style={{ '--idx': idx }}>
                                    {m.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="team-detail__member-info">
                                    <span className="team-detail__member-name" onClick={() => setSelectedUserProfile(m)} style={{ cursor: 'pointer', textDecoration: 'underline' }}>{m.name}</span>
                                    <span className="team-detail__member-email">
                                        {m.email}
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="team-detail__empty">No members assigned yet.</p>
                )}
            </div>

            {/* ── Footer ── */}
            <Modal open={!!selectedUserProfile} onClose={() => setSelectedUserProfile(null)} title="Member Profile">
                {selectedUserProfile && <UserProfileCard user={selectedUserProfile} onClose={() => setSelectedUserProfile(null)} />}
            </Modal>
        </div>
    );
}

function UserProfileCard({ user, onClose }) {
    const ROLE_LABELS = { PM: 'Project Manager', TL: 'Tech Lead', JP: 'Junior Programmer' };
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--color-primary-bg)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 700 }}>
                    {user.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>{user.name}</h2>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>{ROLE_LABELS[user.role] || user.role || 'Employee'}</div>
                </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Email</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                        <Mail size={16} color="var(--color-primary)" />
                        {user.email}
                    </div>
                </div>
                {user.phone_number && (
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Phone</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                            <Phone size={16} color="var(--color-primary)" />
                            {user.phone_number}
                        </div>
                    </div>
                )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button className="btn btn--secondary" onClick={onClose}>Close Profile</button>
            </div>
        </div>
    );
}

/* ─── TL Team Manage Modal ─── */
function TLTeamManageModal({ team, projectName, availableUsers, onClose, onRefresh, setGlobalSuccess }) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [selectedUserProfile, setSelectedUserProfile] = useState(null);
    const [removedIds, setRemovedIds] = useState(new Set());
    const [additions, setAdditions] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [jpSearch, setJpSearch] = useState('');
    const [isAddingMode, setIsAddingMode] = useState(false);

    const currentMemberIds = new Set((team.members ?? []).map(m => m.id));

    const jpCandidates = useMemo(() =>
        availableUsers
            .filter(u => !currentMemberIds.has(u.id) && !additions.find(a => a.id === u.id))
            .filter(u =>
                u.name.toLowerCase().includes(jpSearch.toLowerCase()) ||
                u.email.toLowerCase().includes(jpSearch.toLowerCase())
            ),
        [availableUsers, additions, jpSearch, currentMemberIds]
    );

    const stageRemove = id => setRemovedIds(prev => new Set([...prev, id]));
    const unstageRemove = id => setRemovedIds(prev => { const s = new Set(prev); s.delete(id); return s; });

    const handleSubmit = async () => {
        setError('');
        setSubmitting(true);
        try {
            for (const uid of removedIds) await teamsAPI.tlRemoveMember(team.id, uid);
            for (const user of additions) await teamsAPI.tlAssignJP(team.id, { junior_id: user.id });
            queryClient.invalidateQueries(['teams']);
            setGlobalSuccess('Team updated successfully!');
            onClose();
            onRefresh();
        } catch (err) {
            setError(err.response?.data?.detail || 'An error occurred. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    /* ── shared styles ── */
    const S = {
        card: {
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.6rem 0.8rem',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
            background: '#fff',
            transition: 'border-color 0.15s',
        },
        avatar: (color = '#4F46E5') => ({
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            background: color, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: '0.82rem', letterSpacing: 0.3,
        }),
        roleBadge: (role) => {
            const colors = {
                PM: { bg: 'var(--color-primary-bg)', color: 'var(--color-primary)' },
                SU: { bg: '#FDF2F8', color: '#DB2777' },
                TL: { bg: '#ECFDF5', color: '#059669' },
                JP: { bg: '#EEF2FF', color: '#4F46E5' },
                PD: { bg: '#FFF7ED', color: '#EA580C' }
            };
            const theme = colors[role] || { bg: '#F3F4F6', color: '#6B7280' };
            return {
                display: 'inline-block',
                padding: '0.18rem 0.5rem', borderRadius: '4px',
                fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.4px',
                background: theme.bg, color: theme.color,
                border: '1px solid currentColor', opacity: 0.9
            };
        },
        sectionLabel: {
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.5px',
            marginBottom: '0.5rem',
        },
        scrollArea: {
            maxHeight: 220, overflowY: 'auto',
            display: 'flex', flexDirection: 'column', gap: '0.4rem',
            paddingRight: '2px',
            scrollbarWidth: 'thin', scrollbarColor: '#D1D5DB transparent',
        },
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '80vh', background: 'var(--bg-card)', borderRadius: '12px' }}>

            {/* ── Header exactly like image ── */}
            <div style={{ display: 'flex', gap: '16px', paddingBottom: '24px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--color-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <UsersIcon size={28} />
                </div>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>{team.name}</h2>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '8px' }}>
                        Led by {team.tech_lead ? team.tech_lead.name : 'Unassigned'}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {projectName ? `Project: ${projectName}` : 'Team managing projects and development'}
                    </div>
                </div>
            </div>

            {/* ── Members Header ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '24px 0 16px' }}>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Team Members ({(team.members?.length || 0) + (team.tech_lead ? 1 : 0) + additions.length - removedIds.size})
                </div>
                <button 
                    className="btn btn--primary btn--sm" 
                    type="button"
                    style={{ background: 'var(--color-primary)', border: 'none', display: 'flex', alignItems: 'center', gap: '6px', pointerEvents: submitting ? 'none' : 'auto', opacity: submitting ? 0.6 : 1 }}
                    onClick={() => setIsAddingMode(!isAddingMode)}
                >
                    {isAddingMode ? <X size={16} /> : <Plus size={16} />} {isAddingMode ? 'Cancel' : 'Add Member'}
                </button>
            </div>

            {/* ── Scrollable Members List ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', paddingRight: '4px', flex: 1, minHeight: 0 }}>
                {error && <div className="alert alert--danger" style={{ marginBottom: '8px' }}>{error}</div>}

                {/* Add Mode Overlay block */}
                {isAddingMode && (
                    <div style={{ padding: '16px', borderRadius: '12px', background: 'var(--bg-body)', border: '1px solid var(--border-color)', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '12px' }}>
                            <Search size={16} style={{ color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                placeholder="Search employees to add..."
                                value={jpSearch}
                                onChange={e => setJpSearch(e.target.value)}
                                autoFocus
                                style={{ border: 'none', background: 'transparent', color: 'var(--text-primary)', outline: 'none', width: '100%', fontSize: '0.9rem' }}
                            />
                        </div>
                        <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                            {jpCandidates.length === 0 ? (
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>No users match your search.</p>
                            ) : jpCandidates.map(u => (
                                <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-primary-light)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 600 }}>
                                            {u.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.85rem' }}>{u.name}</div>
                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{u.email}</div>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => { setAdditions(prev => [...prev, u]); setJpSearch(''); setIsAddingMode(false); }}
                                        style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 12px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                                    >
                                        Add
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Tech Lead Row */}
                {team.tech_lead && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '12px', background: 'var(--bg-body)', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-primary-light)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, position: 'relative' }}>
                                {team.tech_lead.name.substring(0, 2).toUpperCase()}
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-success)', position: 'absolute', bottom: 0, right: 0, border: '2px solid var(--bg-body)' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <div style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer' }} onClick={() => setSelectedUserProfile(team.tech_lead)}>{team.tech_lead.name}</div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Tech Lead</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--text-muted)' }}>
                        </div>
                    </div>
                )}

                {/* Newly Added Junior Programmers */}
                {additions.map((u, i) => (
                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '12px', background: 'var(--color-success-bg)', border: '1px solid var(--color-success)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-success)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, position: 'relative' }}>
                                {u.name.substring(0, 2).toUpperCase()}
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-success)', position: 'absolute', bottom: 0, right: 0, border: '2px solid var(--color-success-bg)' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.95rem' }}>{u.name} <span style={{ fontSize: '0.65rem', background: 'var(--color-success)', color: '#fff', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px', verticalAlign: 'middle' }}>New</span></div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{u.role || 'Member'}</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--text-muted)' }}>
                            <button type="button" onClick={() => setAdditions(prev => prev.filter(x => x.id !== u.id))} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} title="Cancel Add">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}

                {/* Existing Junior Programmers */}
                {team.members?.map((m, i) => {
                    const isRemoved = removedIds.has(m.id);
                    const colors = ['var(--color-primary-light)', 'var(--color-success)', 'var(--color-warning)', 'var(--color-danger)'];
                    const bg = colors[i % colors.length];
                    return (
                        <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '12px', background: isRemoved ? 'var(--color-danger-bg)' : 'var(--bg-body)', border: `1px solid ${isRemoved ? 'var(--color-danger)' : 'var(--border-color)'}`, opacity: isRemoved ? 0.6 : 1, transition: 'all 0.2s' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ width: 40, height: 40, borderRadius: '50%', background: isRemoved ? 'var(--color-danger)' : bg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, position: 'relative' }}>
                                    {m.name.substring(0, 2).toUpperCase()}
                                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: (i % 3 === 0) ? 'var(--color-warning)' : 'var(--color-success)', position: 'absolute', bottom: 0, right: 0, border: `2px solid ${isRemoved ? 'var(--color-danger-bg)' : 'var(--bg-body)'}` }} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <div style={{ color: isRemoved ? 'var(--color-danger)' : 'var(--color-primary)', fontWeight: 600, fontSize: '0.95rem', textDecoration: isRemoved ? 'line-through' : 'none', cursor: 'pointer' }} onClick={() => setSelectedUserProfile(m)}>{m.name}</div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{m.role || 'Member'}</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--text-muted)' }}>
                                {isRemoved ? (
                                    <button type="button" onClick={() => unstageRemove(m.id)} style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)', border: '1px solid var(--color-danger)', borderRadius: '6px', padding: '4px 10px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 500 }}>Undo</button>
                                ) : (
                                    <button type="button" onClick={() => stageRemove(m.id)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--color-danger)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'} title="Remove Member">
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── Footer ── */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '24px', borderTop: '1px solid var(--border-color)', marginTop: '8px' }}>
                <button 
                    type="button"
                    onClick={onClose} 
                    style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: 'var(--bg-hover)', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--border-color)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                >
                    Close
                </button>
                {(removedIds.size > 0 || additions.length > 0) && (
                    <button 
                        type="button"
                        onClick={handleSubmit} 
                        disabled={submitting}
                        style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: 'var(--color-primary)', color: '#fff', fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1, transition: 'background 0.2s' }}
                        onMouseEnter={e => !submitting && (e.currentTarget.style.background = 'var(--color-primary-dark)')}
                        onMouseLeave={e => !submitting && (e.currentTarget.style.background = 'var(--color-primary)')}
                    >
                        {submitting ? 'Saving...' : 'Save Changes'}
                    </button>
                )}
            </div>
            
            <Modal open={!!selectedUserProfile} onClose={() => setSelectedUserProfile(null)} title="Member Profile">
                {selectedUserProfile && <UserProfileCard user={selectedUserProfile} onClose={() => setSelectedUserProfile(null)} />}
            </Modal>
        </div>
    );
}



function TeamManageModal({ team, allUsers, onClose, onRefresh, setGlobalSuccess }) {
    const queryClient = useQueryClient();
    /* PM can only change the TL — JP management is done by the TL */
    const [stagedTL, setStagedTL] = useState(null);
    const [showTLPicker, setShowTLPicker] = useState(false);

    /* delete-team confirmation */
    const [confirmDelete, setConfirmDelete] = useState(false);

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    /* derive the TL shown in the section: stagedTL > current */
    const displayTL = stagedTL ?? team.tech_lead;

    /* all users eligible for TL role (everyone except the current team TL,
       filtered in the picker so the PM can change from anyone to anyone)  */
    const tlCandidates = useMemo(
        () => allUsers.filter(u => u.id !== displayTL?.id),
        [allUsers, displayTL]
    );





    const handleDeleteTeam = async () => {
        try {
            await teamsAPI.deleteTeam(team.id);
            queryClient.invalidateQueries(['teams']);
            setGlobalSuccess(`Team "${team.name}" deleted.`);
            onClose();
            onRefresh();
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to delete team.');
        }
    };

    const handleSubmit = async () => {
        setError('');
        setSubmitting(true);
        try {
            // PM can only change the TL
            if (stagedTL) {
                await teamsAPI.assignTL(team.id, { tech_lead_id: stagedTL.id });
            }
            queryClient.invalidateQueries(['teams']);
            setGlobalSuccess('Team updated successfully!');
            onClose();
            onRefresh();
        } catch (err) {
            setError(err.response?.data?.detail || 'An error occurred. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const hasNoTL = !displayTL && !stagedTL;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', borderRadius: '12px' }}>

            {/* ── Header exactly like image ── */}
            <div style={{ display: 'flex', gap: '16px', paddingBottom: '24px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--color-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <UsersIcon size={28} />
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>{team.name}</h2>
                        {!confirmDelete ? (
                            <button
                                className="btn btn--danger btn--sm"
                                onClick={() => setConfirmDelete(true)}
                                style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)', border: '1px solid var(--color-danger)', borderRadius: '6px', fontSize: '0.8rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <Trash2 size={14} /> Delete Team
                            </button>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-danger-bg)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--color-danger)' }}>
                                <AlertTriangle size={14} color="var(--color-danger)" />
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-danger)', fontWeight: 600, marginRight: '4px' }}>Are you sure?</span>
                                <button onClick={handleDeleteTeam} style={{ background: 'var(--color-danger)', color: '#fff', border: 'none', borderRadius: '4px', padding: '2px 8px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>Confirm</button>
                                <button onClick={() => setConfirmDelete(false)} style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500 }}>Cancel</button>
                            </div>
                        )}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '8px' }}>
                        Manage the Tech Lead for this team.
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '24px 0 16px', flex: 1 }}>
                {error && <div className="alert alert--danger" style={{ marginBottom: '8px' }}>{error}</div>}

                <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Team Leadership
                </div>

                {/* Change TL Picker Overlay */}
                {showTLPicker && (
                    <div style={{ padding: '16px', borderRadius: '12px', background: 'var(--bg-body)', border: '1px solid var(--border-color)', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Select a new Tech Lead</span>
                            <button onClick={() => setShowTLPicker(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={16} /></button>
                        </div>
                        <SearchableUserList
                            users={tlCandidates}
                            placeholder="Search by name or email…"
                            onSelect={u => { setStagedTL(u); setShowTLPicker(false); }}
                        />
                    </div>
                )}

                {/* Tech Lead Row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '12px', background: 'var(--bg-body)', border: '1px solid var(--border-color)' }}>
                    {displayTL ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-primary-light)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, position: 'relative' }}>
                                {displayTL.name.substring(0, 2).toUpperCase()}
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-success)', position: 'absolute', bottom: 0, right: 0, border: '2px solid var(--bg-body)' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.95rem' }}>{displayTL.name}</div>
                                    {stagedTL && <span style={{ fontSize: '0.65rem', background: 'var(--color-primary)', color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>Staged Change</span>}
                                </div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Tech Lead</div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-hover)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                                ?
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <div style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.95rem' }}>No Tech Lead assigned</div>
                            </div>
                        </div>
                    )}
                    
                    {!showTLPicker && (
                        <button
                            onClick={() => setShowTLPicker(true)}
                            style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--border-color)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                        >
                            Change TL
                        </button>
                    )}
                </div>
            </div>

            {/* ── Footer ── */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '24px', borderTop: '1px solid var(--border-color)', marginTop: '8px' }}>
                <button 
                    type="button"
                    onClick={onClose} 
                    disabled={submitting}
                    style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: 'var(--bg-hover)', color: 'var(--text-primary)', fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', transition: 'background 0.2s', opacity: submitting ? 0.6 : 1 }}
                    onMouseEnter={e => !submitting && (e.currentTarget.style.background = 'var(--border-color)')}
                    onMouseLeave={e => !submitting && (e.currentTarget.style.background = 'var(--bg-hover)')}
                >
                    Cancel
                </button>
                <button 
                    type="button"
                    onClick={handleSubmit} 
                    disabled={hasNoTL || submitting}
                    title={hasNoTL ? 'A Tech Lead is required before submitting.' : ''}
                    style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: 'var(--color-primary)', color: '#fff', fontWeight: 600, cursor: (hasNoTL || submitting) ? 'not-allowed' : 'pointer', opacity: (hasNoTL || submitting) ? 0.5 : 1, transition: 'background 0.2s' }}
                    onMouseEnter={e => !(hasNoTL || submitting) && (e.currentTarget.style.background = 'var(--color-primary-dark)')}
                    onMouseLeave={e => !(hasNoTL || submitting) && (e.currentTarget.style.background = 'var(--color-primary)')}
                >
                    {submitting ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </div>
    );
}

export default function Teams() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();

    const { data: teams = [], isLoading: teamsLoading } = useAllTeams();
    const { data: allUsers = [] } = useAllUsers();

    const [selectedUserProfile, setSelectedUserProfile] = useState(null);
    const [search, setSearch] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [manageTeam, setManageTeam] = useState(null);
    const [tlManageTeam, setTLManageTeam] = useState(null);
    const [tlManageProjectName, setTLManageProjectName] = useState('');
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [newTeamName, setNewTeamName] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const userLeadsSelectedTeam = selectedTeam?.tech_lead && String(selectedTeam.tech_lead.id) === String(user?.id);
    const userLeadsAnyTeam = teams.some(t => String(t.tech_lead?.id) === String(user?.id));

    // Auto-open TL manage modal when navigated from Projects page
    useEffect(() => {
        if (!location.state?.openManageTeamId || teams.length === 0) return;
        const targetTeam = teams.find(t => t.id === location.state.openManageTeamId);
        if (targetTeam) {
            setTLManageTeam(targetTeam);
            setTLManageProjectName(location.state.projectName || '');
            // Clear state so it doesn't re-trigger on re-render
            window.history.replaceState({}, '');
        }
    }, [location.state, teams]);

    // Auto-select the first team if none is selected and data loads
    useEffect(() => {
        if (teams.length > 0 && !selectedTeam) {
            setSelectedTeam(teams[0]);
        } else if (teams.length > 0 && selectedTeam) {
            // Update selected team if it was modified (e.g. member added/removed)
            const updated = teams.find(t => t.id === selectedTeam.id);
            if (updated) setSelectedTeam(updated);
        }
    }, [teams, selectedTeam]);

    const handleCreateTeam = async (e) => {
        e.preventDefault();
        setError('');
        setIsCreating(true);
        try {
            await teamsAPI.create({ name: newTeamName });
            queryClient.invalidateQueries(['teams']);
            setShowCreate(false);
            setNewTeamName('');
            setSuccess('Team created successfully!');
        } catch (err) {
            setError(err.response?.data?.detail || err.response?.data?.name?.[0] || 'Failed to create team.');
        } finally {
            setIsCreating(false);
        }
    };

    const handleRefresh = () => {
        queryClient.invalidateQueries(['teams']);
        setTimeout(() => setSuccess(''), 3000);
    };

    const filtered = teams.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase())
    );

    if (teamsLoading) {
        return (
            <div className="page" style={{ paddingTop: '2rem' }}>
                <div className="cards-grid">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <SkeletonCard key={i} />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="page__header">
                <h2>Teams Management</h2>
                {user?.role === 'PM' && (
                    <button className="btn btn--primary" onClick={() => setShowCreate(true)}>
                        <Plus size={18} /> Create Team
                    </button>
                )}
            </div>

            {success && <div className="alert alert--success">{success}</div>}



            <div className="teams-layout">
                {/* ── Left Sidebar: Team List ── */}
                <div className="teams-sidebar">
                    <div className="search-bar" style={{ marginBottom: 0 }}>
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder="Search teams..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    
                    <div className="teams-sidebar__header">
                        All Teams ({filtered.length})
                    </div>

                    <div className="teams-list" style={{ overflowY: 'auto', flex: 1 }}>
                        {filtered.map(team => (
                            <div
                                key={team.id}
                                className={`teams-list-item ${selectedTeam?.id === team.id ? 'teams-list-item--active' : ''}`}
                                onClick={() => setSelectedTeam(team)}
                            >
                                <div className="teams-list-item__icon">
                                    <UsersIcon size={20} />
                                </div>
                                <div className="teams-list-item__info">
                                    <div className="teams-list-item__name">{team.name}</div>
                                    <div className="teams-list-item__meta">{team.members?.length ?? 0} members</div>
                                </div>
                            </div>
                        ))}
                        {filtered.length === 0 && (
                            <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                                <UsersIcon size={32} />
                                <p style={{ fontSize: '0.9rem' }}>No teams found</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Right Panel: Team Details ── */}
                {selectedTeam ? (
                    <div className="teams-main">
                        <div className="teams-main__header">
                            <div className="teams-main__header-left">
                                <div className="teams-main__icon">
                                    <UsersIcon size={28} />
                                </div>
                                <div>
                                    <h2 className="teams-main__title">{selectedTeam.name}</h2>
                                    <div className="teams-main__subtitle">
                                        Led by {selectedTeam.tech_lead ? selectedTeam.tech_lead.name : 'Unassigned'}
                                    </div>
                                    <div className="teams-main__desc">
                                        {/* Mock description if none exists in DB */}
                                        Team working on core platform features and development.
                                    </div>
                                </div>
                            </div>
                            <div>
                                {/* Context Menu or Actions */}
                                {user?.role === 'PM' && (
                                    <button 
                                        className="btn btn--outline btn--sm" 
                                        onClick={() => setManageTeam(selectedTeam)}
                                        title="Manage Team Settings"
                                    >
                                        Manage Settings
                                    </button>
                                )}
                                {userLeadsSelectedTeam && (
                                    <button 
                                        className="btn btn--outline btn--sm" 
                                        onClick={() => setTLManageTeam(selectedTeam)}
                                        title="Manage Team Members"
                                    >
                                        Manage Members
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="teams-main__members">
                            <div className="teams-main__members-header">
                                <div className="teams-main__members-title">
                                    Team Members ({(selectedTeam.members?.length || 0) + (selectedTeam.tech_lead ? 1 : 0)})
                                </div>
                                {/* "Add Member" logic is handled in modals currently, but we show the trigger if authorized */}
                                {(user?.role === 'PM' || userLeadsSelectedTeam) && (
                                    <button 
                                        className="btn btn--ghost btn--sm" 
                                        style={{ color: 'var(--color-primary)' }}
                                        onClick={() => {
                                            if (user?.role === 'PM') setManageTeam(selectedTeam);
                                            if (userLeadsSelectedTeam) setTLManageTeam(selectedTeam);
                                        }}
                                    >
                                        Add Member
                                    </button>
                                )}
                            </div>

                            <div className="teams-main__members-list">
                                {/* TL Row */}
                                {selectedTeam.tech_lead && (
                                    <div className="member-row">
                                        <div className="member-row__left">
                                            <div className="member-row__avatar" style={{ background: '#6366F1' }}>
                                                {selectedTeam.tech_lead.name.substring(0, 2).toUpperCase()}
                                                <div className="member-row__status" />
                                            </div>
                                            <div className="member-row__info" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span className="member-row__name" onClick={() => setSelectedUserProfile(selectedTeam.tech_lead)} style={{ cursor: 'pointer', color: 'var(--color-primary)' }}>{selectedTeam.tech_lead.name}</span>
                                                <span className="member-row__role">Tech Lead</span>
                                            </div>
                                        </div>
                                        <div className="member-row__actions">
                                            {/* Only TL or PM can manage team, so show dots for them on the TL row (though no current action exists) */}
                                            {(user?.role === 'PM' || userLeadsSelectedTeam) && (
                                                <button className="member-row__action-btn" title="More options"><MoreHorizontal size={16} /></button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* JP Rows */}
                                {selectedTeam.members?.map((m, i) => {
                                    const colors = ['#8B5CF6', '#EC4899', '#3B82F6', '#10B981', '#F59E0B'];
                                    const bg = colors[i % colors.length];
                                    return (
                                        <div key={m.id} className="member-row">
                                            <div className="member-row__left">
                                                <div className="member-row__avatar" style={{ background: bg }}>
                                                    {m.name.substring(0, 2).toUpperCase()}
                                                    <div className="member-row__status" style={{ background: i % 3 === 0 ? 'var(--color-warning)' : 'var(--color-success)' }} />
                                                </div>
                                                <div className="member-row__info" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    <span className="member-row__name" onClick={() => setSelectedUserProfile(m)} style={{ cursor: 'pointer', color: 'var(--color-primary)' }}>{m.name}</span>
                                                    <span className="member-row__role">Junior Programmer</span>
                                                </div>
                                            </div>
                                            <div className="member-row__actions">
                                                {(user?.role === 'PM' || userLeadsSelectedTeam) && (
                                                    <>
                                                        <button 
                                                            className="member-row__action-btn"
                                                            title="Remove (open manage settings)"
                                                            onClick={() => {
                                                                if (user?.role === 'PM') setManageTeam(selectedTeam);
                                                                if (userLeadsSelectedTeam) setTLManageTeam(selectedTeam);
                                                            }}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                        <button className="member-row__action-btn" title="More options"><MoreHorizontal size={16} /></button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="teams-main" style={{ alignItems: 'center', justifyContent: 'center' }}>
                        <div className="empty-state">
                            <UsersIcon size={48} />
                            <p>Select a team to view details</p>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Create Team Modal ── */}
            <Modal open={showCreate} onClose={() => { setShowCreate(false); setError(''); }} title="Create Team">
                <form onSubmit={handleCreateTeam}>
                    {error && <div className="alert alert--danger">{error}</div>}
                    <div className="form-group">
                        <label htmlFor="team-name">Team Name</label>
                        <input
                            id="team-name"
                            type="text"
                            placeholder="e.g. Alpha Team"
                            value={newTeamName}
                            onChange={e => setNewTeamName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="modal__actions">
                        <button type="button" className="btn btn--ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                        <button type="submit" className="btn btn--primary" disabled={isCreating}>
                            {isCreating ? 'Creating...' : 'Create'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* ── Manage Team Modal ── */}
            <Modal
                open={!!manageTeam}
                onClose={() => setManageTeam(null)}
                title="Manage Team Settings"
                wide
            >
                {manageTeam && (
                    <TeamManageModal
                        team={manageTeam}
                        allUsers={allUsers}
                        onClose={() => setManageTeam(null)}
                        onRefresh={handleRefresh}
                        setGlobalSuccess={setSuccess}
                    />
                )}
            </Modal>

            {/* ── TL Team Manage Modal ── */}
            <Modal
                open={!!tlManageTeam}
                onClose={() => { setTLManageTeam(null); setTLManageProjectName(''); }}
                title="Manage Team Members"
                wide
            >
                {tlManageTeam && (
                    <TLTeamManageModal
                        team={tlManageTeam}
                        projectName={tlManageProjectName}
                        availableUsers={allUsers}
                        onClose={() => { setTLManageTeam(null); setTLManageProjectName(''); }}
                        onRefresh={handleRefresh}
                        setGlobalSuccess={setSuccess}
                    />
                )}
            </Modal>
            
            <Modal open={!!selectedUserProfile} onClose={() => setSelectedUserProfile(null)} title="Member Profile">
                {selectedUserProfile && <UserProfileCard user={selectedUserProfile} onClose={() => setSelectedUserProfile(null)} />}
            </Modal>
        </div>
    );
}
