import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api/api';
import StatusBadge from '../components/StatusBadge';
import { UserCircle, Mail, Shield, Calendar, Pencil, Award, Briefcase, Code, FileText, Plus, FolderKanban, CheckCircle } from 'lucide-react';
import { Skeleton } from '../components/ui/Skeleton';
import CertificateViewerModal from '../components/CertificateViewerModal';
import EditPersonalInfoModal from '../components/EditPersonalInfoModal';
import EditSummaryModal from '../components/EditSummaryModal';
import AddSkillModal from '../components/AddSkillModal';
import AddCertificationModal from '../components/AddCertificationModal';
import AddExperienceModal from '../components/AddExperienceModal';

const ROLE_LABELS = { PM: 'Project Manager', TL: 'Tech Lead', JP: 'Junior Programmer' };

export default function Profile() {
    const { user, refreshUser } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isPersonalInfoModalOpen, setIsPersonalInfoModalOpen] = useState(false);
    const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
    const [isAddSkillModalOpen, setIsAddSkillModalOpen] = useState(false);
    const [isAddCertModalOpen, setIsAddCertModalOpen] = useState(false);
    const [isAddExpModalOpen, setIsAddExpModalOpen] = useState(false);

    const [viewerCert, setViewerCert] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await authAPI.getMe();
                setProfile(res.data);
            } catch {
                setProfile(user);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    if (loading) {
        return (
            <div className="page" style={{ paddingTop: '2rem', display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <Skeleton style={{ width: '80px', height: '80px', borderRadius: '50%' }} />
                    <Skeleton style={{ width: '60%', height: '24px', borderRadius: '8px' }} />
                    <Skeleton style={{ width: '40%', height: '20px', borderRadius: '8px' }} />
                    <Skeleton style={{ width: '100%', height: '120px', borderRadius: '12px', marginTop: '1rem' }} />
                </div>
            </div>
        );
    }

    const data = profile || user;

    // Provide default empty arrays if API doesn't return them yet
    const skills = data?.skills || [];
    const certifications = data?.certifications || [];
    const experience = data?.experience || [];

    const fetchProfile = async () => {
        try {
            const res = await authAPI.getMe();
            setProfile(res.data);
        } catch {
            setProfile(user);
        }
    };

    return (
        <div className="page" style={{ padding: '24px', backgroundColor: 'var(--bg-body)', minHeight: 'calc(100vh - 64px)' }}>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>

                {/* 1. Header Identity Card */}
                <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', padding: '32px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '32px', position: 'relative', flexWrap: 'wrap' }}>

                    {/* Avatar Container */}
                    <div style={{ position: 'relative' }}>
                        <div style={{ width: '120px', height: '120px', borderRadius: '50%', backgroundColor: 'var(--color-primary-bg)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', fontWeight: 700, border: '4px solid var(--bg-body)' }}>
                            {data?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                    </div>

                    {/* Name & Role Info */}
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>{data?.name}</h1>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 500 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Shield size={16} /> {ROLE_LABELS[data?.role] || 'Not Assigned'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 2. Personal Information Grid */}
                <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', padding: '32px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)', position: 'relative' }}>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Personal Information</h3>
                        <button onClick={() => setIsPersonalInfoModalOpen(true)} style={{ background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer', padding: '6px 12px', borderRadius: '6px', transition: 'background-color 0.2s', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: 600 }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                            <Pencil size={14} /> Edit
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
                        {/* Column 1 */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '4px' }}>Full Name</div>
                                <div style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 500 }}>{data?.name || 'N/A'}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '4px' }}>Email Address</div>
                                <div style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 500 }}>{data?.email}</div>
                            </div>
                        </div>

                        {/* Column 2 */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {data?.phone_number && (
                                <div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '4px' }}>Phone Number</div>
                                    <div style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 500 }}>{data.phone_number}</div>
                                </div>
                            )}
                        </div>

                        {/* Column 3 */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '4px' }}>User Role</div>
                                <div style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 500 }}>{ROLE_LABELS[data?.role] || 'Not Assigned'}</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* 3. Professional Summary & Skill Vault */}
                    <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', padding: '32px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)', position: 'relative' }}>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Professional Summary</h3>
                            <button onClick={() => setIsSummaryModalOpen(true)} style={{ background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer', padding: '6px 12px', borderRadius: '6px', transition: 'background-color 0.2s', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: 600 }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                <Pencil size={14} /> Edit
                            </button>
                        </div>

                        {/* Bio Text area */}
                        <div style={{ marginBottom: '32px' }}>
                            <p className="leading-relaxed text-justify" style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0, whiteSpace: 'pre-line' }}>
                                {data?.bio || "I am a dedicated professional with a track record of building and managing complex systems. I thrive in environments that challenge me to solve hard problems and optimize efficiency. Below is an overview of my core technical competencies and software skills that I bring to the table."}
                            </p>
                        </div>

                        {/* Skill Vault */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Core Skills Overview</div>
                                <button onClick={() => setIsAddSkillModalOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                                    <Plus size={16} /> Add Skill
                                </button>
                            </div>
                            {skills.length === 0 ? (
                                <div style={{ border: '2px dashed var(--border-color)', borderRadius: '8px', padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                    No skills added yet. Update your profile to add them.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {skills.map(skill => (
                                        <div key={skill.id} style={{ padding: '8px 16px', backgroundColor: 'var(--color-primary-bg)', border: '1px solid var(--border-color)', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center' }}>
                                            {skill.name}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Certification Gallery */}
                    <section style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', padding: '32px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ padding: '8px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '8px' }}>
                                    <Award size={20} />
                                </div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Certifications</h3>
                            </div>
                            <button onClick={() => setIsAddCertModalOpen(true)} style={{ background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer', padding: '6px 12px', borderRadius: '6px', transition: 'background-color 0.2s', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: 600 }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                <Plus size={14} /> Add Certification
                            </button>
                        </div>

                        {certifications.length === 0 ? (
                            <div style={{ border: '2px dashed var(--border-color)', borderRadius: '8px', padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                No certificates uploaded yet. Add credentials to increase project visibility.
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
                                {certifications.map(cert => (
                                    <div
                                        key={cert.id}
                                        onClick={() => setViewerCert(cert)}
                                        style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'background-color 0.2s', userSelect: 'none' }}
                                        onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                                        onMouseOut={e => e.currentTarget.style.backgroundColor = 'var(--bg-input)'}
                                    >
                                        <div style={{ padding: '10px', backgroundColor: 'var(--bg-card)', borderRadius: '6px', color: 'var(--color-primary)' }}>
                                            <FileText size={24} />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem', marginBottom: '4px' }}>{cert.title}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Issued: {new Date(cert.issue_date).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Experience Section */}
                    <section style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', padding: '32px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ padding: '8px', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', borderRadius: '8px' }}>
                                    <Briefcase size={20} />
                                </div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Experience</h3>
                            </div>
                            <button onClick={() => setIsAddExpModalOpen(true)} style={{ background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer', padding: '6px 12px', borderRadius: '6px', transition: 'background-color 0.2s', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: 600 }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                <Plus size={14} /> Add Experience
                            </button>
                        </div>

                        {experience.length === 0 ? (
                            <div style={{ border: '2px dashed var(--border-color)', borderRadius: '8px', padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                No work experience listed.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                {experience.map((exp, idx) => (
                                    <div key={exp.id} style={{ display: 'flex', gap: '16px', position: 'relative' }}>
                                        {/* Timeline Dot */}
                                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', marginTop: '6px', position: 'relative', zIndex: 2 }}></div>
                                        {/* Timeline Line (if not last) */}
                                        {idx !== experience.length - 1 && (
                                            <div style={{ position: 'absolute', top: '18px', left: '5px', bottom: '-24px', width: '2px', backgroundColor: 'var(--border-color)', zIndex: 1 }}></div>
                                        )}
                                        <div style={{ paddingBottom: '8px' }}>
                                            <h4 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', color: 'var(--text-primary)' }}>{exp.title}</h4>
                                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 500 }}>
                                                {exp.company} &bull; {new Date(exp.start_date).toLocaleDateString()} - {exp.end_date ? new Date(exp.end_date).toLocaleDateString() : 'Present'}
                                            </div>
                                            <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{exp.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Project Activity & Insights */}
                    <section style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', padding: '32px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                            <div style={{ padding: '8px', backgroundColor: 'rgba(255, 122, 0, 0.1)', color: '#FF7A00', borderRadius: '8px' }}>
                                <FolderKanban size={20} />
                            </div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Project Activity & Insights</h3>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
                            {/* Column 1: Active Engagement */}
                            <div>
                                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    Active Engagement <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 8px #10b981' }}></span>
                                </h4>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    {(data?.current_projects || []).length === 0 ? (
                                        <div style={{ padding: '24px', borderRadius: '12px', border: '2px dashed var(--border-color)', color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                                            No active project assignments. 
                                        </div>
                                    ) : (
                                        (data.current_projects || []).map(proj => (
                                            <div key={proj.id} style={{ padding: '20px', borderRadius: '14px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', position: 'relative', overflow: 'hidden' }}>
                                                <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '4px', backgroundColor: '#FF7A00' }} />
                                                <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem', marginBottom: '6px' }}>{proj.name}</div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{proj.team} Team</div>
                                                    <StatusBadge status={proj.status} />
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Column 2: Project Archive */}
                            <div>
                                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px' }}>
                                    Project Archive
                                </h4>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    {(data?.completed_projects || []).length === 0 ? (
                                        <div style={{ padding: '24px', borderRadius: '12px', border: '2px dashed var(--border-color)', color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                                            No completed projects yet.
                                        </div>
                                    ) : (
                                        (data.completed_projects || []).map(proj => (
                                            <div key={proj.id} style={{ padding: '20px', borderRadius: '14px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', opacity: 0.85 }}>
                                                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <CheckCircle size={16} color="#10b981" /> {proj.name}
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Delivered via {proj.team} team</div>
                                                    <div style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                        Completed
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>

                </div>
            </div>

            <EditPersonalInfoModal
                isOpen={isPersonalInfoModalOpen}
                onClose={() => setIsPersonalInfoModalOpen(false)}
                onUpdate={fetchProfile}
                currentProfile={data}
            />

            <EditSummaryModal
                isOpen={isSummaryModalOpen}
                onClose={() => setIsSummaryModalOpen(false)}
                onUpdate={fetchProfile}
                currentProfile={data}
            />

            <AddSkillModal
                isOpen={isAddSkillModalOpen}
                onClose={() => setIsAddSkillModalOpen(false)}
                onUpdate={fetchProfile}
            />

            <AddCertificationModal
                isOpen={isAddCertModalOpen}
                onClose={() => setIsAddCertModalOpen(false)}
                onUpdate={fetchProfile}
            />

            <AddExperienceModal
                isOpen={isAddExpModalOpen}
                onClose={() => setIsAddExpModalOpen(false)}
                onUpdate={fetchProfile}
            />

            <CertificateViewerModal
                isOpen={!!viewerCert}
                onClose={() => setViewerCert(null)}
                certificate={viewerCert}
            />
        </div>
    );
}
