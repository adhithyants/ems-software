import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import { 
    LayoutDashboard, Users, FolderKanban, ListTodo, Clock, Calendar, 
    MessageSquare, GitBranch, ShieldCheck, BarChart3, ArrowRight,
    CheckCircle2, Zap, Lock, UserPlus
} from 'lucide-react';
import LineWaves from '../components/LineWaves';

const FEATURES = [
    {
        icon: LayoutDashboard,
        title: 'Smart Dashboard',
        desc: 'Get a bird\'s-eye view of your entire organization. Real-time metrics, active tasks, and team updates — all in one place.',
        color: '#7b4dff'
    },
    {
        icon: FolderKanban,
        title: 'Project Workspaces',
        desc: 'Dedicated project hubs with message boards, task boards, file sharing, scheduling, and live team chat.',
        color: '#3B82F6'
    },
    {
        icon: ListTodo,
        title: 'Kanban Task Board',
        desc: 'Visual task management with drag-and-drop workflow. Track tasks from Assigned through In Progress to Completed.',
        color: '#22C55E'
    },
    {
        icon: Users,
        title: 'Team Management',
        desc: 'Organize your workforce into specialized teams. Assign Tech Leads, manage members, and maintain clear reporting lines.',
        color: '#A855F7'
    },
    {
        icon: Clock,
        title: 'Attendance Tracking',
        desc: 'Comprehensive work-hours logging with session tracking, break management, and visual heatmap analytics.',
        color: '#EF4444'
    },
    {
        icon: Calendar,
        title: 'Leave Management',
        desc: 'Streamlined leave applications with approval workflows. Role-based limits and calendar integration for perfect coordination.',
        color: '#F59E0B'
    },
    {
        icon: MessageSquare,
        title: 'Team Communication',
        desc: 'Built-in chat rooms and message boards per project. Keep discussions contextual and organized.',
        color: '#06B6D4'
    },
    {
        icon: GitBranch,
        title: 'GitHub Integration',
        desc: 'Connect repositories to projects. Track commits, pull requests and developer activity directly in the workspace.',
        color: '#6366F1'
    },
];

const ROLES = [
    {
        role: 'Supervisor',
        tag: 'SU',
        points: ['Full organization management', 'Generate secure invite codes', 'Master oversight of all projects', 'System-wide role administration'],
        color: '#A855F7'
    },
    {
        role: 'Project Manager',
        tag: 'PM',
        points: ['Create & manage projects', 'Assign teams & roles', 'Global organization visibility', 'Leave & work-hour approvals'],
        color: '#7b4dff'
    },
    {
        role: 'Tech Lead',
        tag: 'TL',
        points: ['Manage team members', 'Approve/reject tasks', 'Validate work hours', 'Resolve task tickets'],
        color: '#3B82F6'
    },
    {
        role: 'Junior Programmer',
        tag: 'JP',
        points: ['Execute assigned tasks', 'Log attendance & hours', 'Raise task tickets', 'Track personal performance'],
        color: '#22C55E'
    },
];

const FLOW_STEPS = [
    {
        icon: ShieldCheck,
        title: 'Organization Entry',
        desc: 'Supervisor (SU) registers and initializes the secure corporate vault.'
    },
    {
        icon: UserPlus,
        title: 'Smart Invitation',
        desc: 'Generate secure invite codes to bring your entire workforce onboard.'
    },
    {
        icon: Users,
        title: 'Role Orchestration',
        desc: 'Employees join via codes; PMs set up projects and TLs assign JPs.'
    },
    {
        icon: FolderKanban,
        title: 'Project Ignition',
        desc: 'Launch project workspaces with integrated Kanban boards and Live Chat.'
    },
    {
        icon: Zap,
        title: 'Peak Productivity',
        desc: 'Execute tasks, hit milestones, and collaborate in real-time via Kanban and Chat.'
    },
    {
        icon: Calendar,
        title: 'Attendance & Leave Management',
        desc: 'Automated attendance logging, precise work-hour tracking, and streamlined leave workflows.'
    }
];

export default function Onboarding() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [activeStep, setActiveStep] = useState(0);
    const [parallax, setParallax] = useState({ x: 0, y: 0 });
    const STEP_DURATION = 4000; // 4 seconds

    // Redirect authenticated users to dashboard
    useEffect(() => {
        if (user) navigate('/dashboard', { replace: true });
    }, [user, navigate]);

    // Cycle through flow steps
    useEffect(() => {
        const interval = setInterval(() => {
            setActiveStep(current => (current + 1) % FLOW_STEPS.length);
        }, STEP_DURATION);

        return () => clearInterval(interval);
    }, []);

    // Handle mouse movement for parallax
    const handleMouseMove = (e) => {
        const { clientX, clientY } = e;
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        
        // Calculate offset from center (-1 to 1)
        const xOffset = (clientX - centerX) / centerX;
        const yOffset = (clientY - centerY) / centerY;
        
        setParallax({ x: xOffset, y: yOffset });
    };

    return (
        <div data-theme="default">
            <div 
                onMouseMove={handleMouseMove}
                style={{ 
                    minHeight: '100vh', 
                    backgroundColor: '#050505',
                    color: '#FFFFFF',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    overflowX: 'hidden'
                }}
            >
                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

                    .onboard-nav {
                        position: fixed;
                        top: 0; left: 0; right: 0;
                        z-index: 100;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 16px 40px;
                        backdrop-filter: blur(20px);
                        background: rgba(10, 10, 10, 0.8);
                        border-bottom: 1px solid rgba(255,255,255,0.06);
                    }
                    .onboard-hero {
                        min-height: 100vh;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        text-align: center;
                        padding: 120px 40px 80px;
                        position: relative;
                        overflow: hidden;
                    }
                    .onboard-hero::before {
                        content: '';
                        position: absolute;
                        inset: 0;
                        background: radial-gradient(circle at 50% 50%, transparent 20%, rgba(5,5,5,0.4) 100%);
                        pointer-events: none;
                        z-index: 1;
                    }
                    .onboard-hero-content {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        position: relative;
                        z-index: 10;
                        width: 100%;
                    }
                    .onboard-badge {
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                        padding: 8px 20px;
                        border-radius: 999px;
                        background: rgba(57, 8, 231, 0.1);
                        border: 1px solid rgba(57, 8, 231, 0.3);
                        font-size: 0.8rem;
                        font-weight: 600;
                        color: #7b4dff;
                        margin-bottom: 32px;
                        letter-spacing: 0.5px;
                    }
                    .onboard-title {
                        font-size: clamp(2.5rem, 6vw, 4.5rem);
                        font-weight: 900;
                        line-height: 1.05;
                        letter-spacing: -2px;
                        margin-bottom: 24px;
                        max-width: 800px;
                    }
                    .onboard-title span {
                        background: linear-gradient(135deg, #7b4dff, #3908e7);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                    }
                    .onboard-subtitle {
                        font-size: 1.2rem;
                        color: rgba(255,255,255,0.85);
                        max-width: 560px;
                        line-height: 1.7;
                        margin-bottom: 48px;
                        font-weight: 500;
                    }
                    .onboard-cta-group {
                        display: flex;
                        gap: 16px;
                        flex-wrap: wrap;
                        justify-content: center;
                    }
                    .onboard-btn-primary {
                        padding: 16px 40px;
                        background: linear-gradient(135deg, #3908e7, #7b4dff);
                        color: #fff;
                        border: none;
                        border-radius: 12px;
                        font-size: 1rem;
                        font-weight: 700;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 20px rgba(57, 8, 231, 0.3);
                    }
                    .onboard-btn-primary:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 8px 30px rgba(57, 8, 231, 0.45);
                    }
                    .onboard-btn-secondary {
                        padding: 16px 40px;
                        background: rgba(255,255,255,0.04);
                        color: #fff;
                        border: 1px solid rgba(255,255,255,0.12);
                        border-radius: 12px;
                        font-size: 1rem;
                        font-weight: 700;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        transition: all 0.3s ease;
                    }
                    .onboard-btn-secondary:hover {
                        background: rgba(255,255,255,0.08);
                        border-color: rgba(255,255,255,0.2);
                        transform: translateY(-2px);
                    }
                    .onboard-section {
                        padding: 100px 40px;
                        max-width: 1300px;
                        margin: 0 auto;
                    }
                    .onboard-section-label {
                        font-size: 0.75rem;
                        font-weight: 700;
                        color: #7b4dff;
                        text-transform: uppercase;
                        letter-spacing: 2px;
                        margin-bottom: 12px;
                    }
                    .onboard-section-title {
                        font-size: clamp(1.8rem, 4vw, 2.8rem);
                        font-weight: 800;
                        letter-spacing: -1px;
                        margin-bottom: 16px;
                    }
                    .onboard-section-desc {
                        font-size: 1.05rem;
                        color: rgba(255,255,255,0.5);
                        max-width: 600px;
                        line-height: 1.7;
                        margin-bottom: 60px;
                    }
                    .onboard-features-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                        gap: 20px;
                    }
                    .onboard-feature-card {
                        background: rgba(10, 10, 10, 0.85);
                        backdrop-filter: blur(20px);
                        border: 1px solid rgba(255, 255, 255, 0.15);
                        border-radius: 16px;
                        padding: 32px 28px;
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        cursor: default;
                        position: relative;
                        z-index: 2;
                    }
                    .onboard-feature-card:hover {
                        background: rgba(57, 8, 231, 0.05);
                        border-color: rgba(57, 8, 231, 0.4);
                        transform: translateY(-4px);
                        box-shadow: 0 12px 40px rgba(0,0,0,0.4);
                    }
                    .onboard-feature-icon {
                        width: 48px;
                        height: 48px;
                        border-radius: 12px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin-bottom: 20px;
                    }
                    .onboard-feature-title {
                        font-size: 1.15rem;
                        font-weight: 700;
                        margin-bottom: 10px;
                        letter-spacing: -0.3px;
                    }
                    .onboard-feature-desc {
                        font-size: 0.9rem;
                        color: rgba(255,255,255,0.7);
                        line-height: 1.65;
                    }
                    .onboard-roles-grid {
                        display: grid;
                        grid-template-columns: repeat(4, 1fr);
                        gap: 24px;
                        max-width: 1380px;
                        margin: 0 auto;
                    }
                    @media (max-width: 1100px) {
                        .onboard-roles-grid { grid-template-columns: repeat(2, 1fr); }
                    }
                    @media (max-width: 600px) {
                        .onboard-roles-grid { grid-template-columns: 1fr; }
                    }
                    .onboard-role-card {
                        background: rgba(10, 10, 10, 0.85);
                        backdrop-filter: blur(20px);
                        border: 1px solid rgba(255, 255, 255, 0.15);
                        border-radius: 16px;
                        padding: 32px;
                        transition: all 0.3s ease;
                        position: relative;
                        overflow: hidden;
                    }
                    .onboard-role-card:hover {
                        border-color: rgba(255,122,0,0.15);
                        transform: translateY(-2px);
                    }
                    .onboard-role-card::before {
                        content: '';
                        position: absolute;
                        top: 0; left: 0; right: 0;
                        height: 3px;
                    }
                    .onboard-role-tag {
                        display: inline-flex;
                        padding: 4px 12px;
                        border-radius: 6px;
                        font-size: 0.7rem;
                        font-weight: 800;
                        letter-spacing: 1px;
                        margin-bottom: 16px;
                    }
                    .onboard-role-name {
                        font-size: 1.3rem;
                        font-weight: 800;
                        margin-bottom: 20px;
                        letter-spacing: -0.5px;
                    }
                    .onboard-role-list {
                        list-style: none;
                        padding: 0;
                        margin: 0;
                        display: flex;
                        flex-direction: column;
                        gap: 12px;
                    }
                    .onboard-role-list li {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        font-size: 0.9rem;
                        color: rgba(255,255,255,0.8);
                    }
                    .onboard-footer {
                        border-top: 1px solid rgba(255,255,255,0.06);
                        padding: 60px 40px;
                        text-align: center;
                        position: relative;
                        z-index: 10;
                    }
                    .onboard-footer-cta {
                        max-width: 600px;
                        margin: 0 auto;
                    }
                    .onboard-stats {
                        display: flex;
                        justify-content: center;
                        gap: 60px;
                        margin-top: 80px;
                        flex-wrap: wrap;
                    }
                    .onboard-stat-item {
                        text-align: center;
                    }
                    .onboard-stat-value {
                        font-size: 2.5rem;
                        font-weight: 900;
                        letter-spacing: -1px;
                        background: linear-gradient(135deg, #7b4dff, #3908e7);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                    }
                    .onboard-stat-label {
                        font-size: 0.85rem;
                        color: rgba(255,255,255,0.4);
                        font-weight: 500;
                        margin-top: 4px;
                    }

                    /* Lifecycle Horizontal Train Styles */
                    .lifecycle-container {
                        --lc-card-w: 480px;
                        --lc-gap: 24px;
                        width: 100vw;
                        margin-left: calc(-50vw + 50%); /* Center ultra-wide container */
                        margin-top: 60px;
                        overflow: hidden;
                        position: relative;
                    }
                    .lifecycle-track {
                        display: flex;
                        gap: var(--lc-gap);
                        padding: 40px 0;
                        transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
                        transform: translateX(calc(50vw - (var(--lc-card-w) / 2) - (var(--active) * (var(--lc-card-w) + var(--lc-gap)))));
                        width: max-content;
                    }
                    .lifecycle-card {
                        flex-shrink: 0;
                        width: var(--lc-card-w);
                        min-height: 180px;
                        background: rgba(10, 10, 10, 0.85);
                        backdrop-filter: blur(20px);
                        border: 1px solid rgba(255,255,255,0.15);
                        border-radius: 24px;
                        padding: 32px 40px;
                        text-align: left;
                        display: flex;
                        align-items: center;
                        gap: 32px;
                        transition: all 0.6s ease;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                        opacity: 0.3;
                        transform: scale(0.9);
                        filter: grayscale(1);
                    }
                    .lifecycle-card.active {
                        opacity: 1;
                        transform: scale(1.05);
                        border-color: rgba(57, 8, 231, 0.7);
                        background: rgba(57, 8, 231, 0.06);
                        box-shadow: 0 15px 45px rgba(57, 8, 231, 0.25);
                        filter: grayscale(0);
                    }
                    .lifecycle-card-icon {
                        width: 64px;
                        height: 64px;
                        border-radius: 18px;
                        background: rgba(255,255,255,0.05);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: rgba(255,255,255,0.3);
                        flex-shrink: 0;
                        transition: all 0.4s ease;
                    }
                    .lifecycle-card.active .lifecycle-card-icon {
                        background: rgba(57, 8, 231, 0.15);
                        color: #7b4dff;
                    }
                    .lifecycle-card-content h3 {
                        font-size: 1.6rem;
                        font-weight: 800;
                        margin-bottom: 12px;
                        letter-spacing: -0.5px;
                        color: #fff;
                    }
                    .lifecycle-card-content p {
                        font-size: 1.05rem;
                        color: rgba(255,255,255,0.85);
                        line-height: 1.6;
                        margin: 0;
                    }

                    @media (max-width: 768px) {
                        .onboard-nav { padding: 12px 20px; }
                        .onboard-hero { padding: 140px 20px 60px; }
                        .onboard-section { padding: 60px 20px; }
                        .lifecycle-container { 
                            height: 320px; 
                            --lc-card-w: 320px;
                            --lc-gap: 20px;
                        }
                        .lifecycle-card { padding: 24px; }
                        .lifecycle-card-icon { width: 48px; height: 48px; }
                        .lifecycle-card-content h3 { font-size: 1.25rem; }
                        .lifecycle-card-content p { font-size: 0.9rem; }
                        .lifecycle-card-number { font-size: 3rem; }
                        .onboard-cta-group { flex-direction: column; align-items: center; }
                        .onboard-btn-primary, .onboard-btn-secondary { width: 100%; max-width: 320px; justify-content: center; }
                    }
                `}</style>

                {/* ── NAVIGATION BAR ── */}
                <nav className="onboard-nav">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.5px' }}>APM Platform</span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <button 
                            className="onboard-btn-secondary" 
                            onClick={() => navigate('/login')} 
                            style={{ padding: '10px 24px', fontSize: '0.85rem' }}
                        >
                            Sign In
                        </button>
                        <button 
                            className="onboard-btn-primary"
                            onClick={() => navigate('/register')}
                            style={{ padding: '10px 24px', fontSize: '0.85rem', boxShadow: 'none' }}
                        >
                            Get Started
                        </button>
                    </div>
                </nav>

                {/* ── HERO SECTION ── */}
                <section className="onboard-hero">
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0, opacity: 0.45 }}>
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

                    <div className="onboard-hero-content">
                        <div className="onboard-badge" style={{ 
                            transform: `translate(${parallax.x * -25}px, ${parallax.y * -25}px)`,
                            transition: 'transform 0.1s ease-out'
                        }}>
                        <Zap size={14} /> Aptivora Project Management Platform
                    </div>
                    
                    <h1 className="onboard-title" style={{ 
                        transform: `translate(${parallax.x * -12}px, ${parallax.y * -12}px)`,
                        transition: 'transform 0.15s ease-out'
                    }}>
                        Manage Teams<br/><span>And Projects.</span>
                    </h1>
                    
                    <p className="onboard-subtitle" style={{ 
                        transform: `translate(${parallax.x * -6}px, ${parallax.y * -6}px)`,
                        transition: 'transform 0.2s ease-out'
                    }}>
                        A complete internal management suite for modern engineering teams. 
                        From task execution to attendance tracking — everything your organization needs, in one platform.
                    </p>
                    <div className="onboard-cta-group">
                        <button className="onboard-btn-primary" onClick={() => navigate('/register/pm')}>
                            <UserPlus size={20} /> Register Organization <ArrowRight size={18} />
                        </button>
                        <button className="onboard-btn-secondary" onClick={() => navigate('/login')}>
                            <Lock size={18} /> Sign In to Dashboard
                        </button>
                    </div>
                    </div>

                    {/* ── SYSTEM LIFECYCLE HORIZONTAL TRAIN ── */}
                    <div className="lifecycle-container" style={{ 
                        transform: `translate(${parallax.x * -8}px, ${parallax.y * -8}px)`,
                        transition: 'transform 0.3s ease-out'
                    }}>
                        <div 
                            className="lifecycle-track"
                            style={{ '--active': activeStep }}
                        >
                            {FLOW_STEPS.map((step, idx) => {
                                const Icon = step.icon;
                                return (
                                    <div 
                                        key={idx} 
                                        className={`lifecycle-card ${idx === activeStep ? 'active' : ''}`}
                                        onClick={() => setActiveStep(idx)}
                                    >
                                        <div className="lifecycle-card-icon">
                                            <Icon size={32} />
                                        </div>
                                        <div className="lifecycle-card-content">
                                            <h3>{step.title}</h3>
                                            <p>{step.desc}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* ── FEATURES SECTION ── */}
                <section className="onboard-section">
                    <div className="onboard-section-label">Platform Features</div>
                    <h2 className="onboard-section-title">Everything you need to run your team</h2>
                    <p className="onboard-section-desc">
                        From project inception to delivery, APM provides a unified workspace for every stage of your development lifecycle.
                    </p>
                    <div className="onboard-features-grid">
                        {FEATURES.map((f, i) => (
                            <div key={i} className="onboard-feature-card">
                                <div className="onboard-feature-icon" style={{ background: `${f.color}15` }}>
                                    <f.icon size={24} color={f.color} />
                                </div>
                                <div className="onboard-feature-title">{f.title}</div>
                                <div className="onboard-feature-desc">{f.desc}</div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── ROLES SECTION ── */}
                <section className="onboard-section" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <div className="onboard-section-label">Role-Based Access</div>
                    <h2 className="onboard-section-title">Built for every level of your team</h2>
                    <p className="onboard-section-desc">
                        Each role has tailored permissions and dashboards, ensuring everyone sees exactly what they need — nothing more, nothing less.
                    </p>
                    <div className="onboard-roles-grid">
                        {ROLES.map((r, i) => (
                            <div key={i} className="onboard-role-card" style={{ '--accent': r.color }}>
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: r.color, borderRadius: '16px 16px 0 0' }} />
                                <div className="onboard-role-tag" style={{ background: `${r.color}18`, color: r.color }}>
                                    {r.tag}
                                </div>
                                <div className="onboard-role-name">{r.role}</div>
                                <ul className="onboard-role-list">
                                    {r.points.map((p, j) => (
                                        <li key={j}>
                                            <CheckCircle2 size={16} color={r.color} />
                                            {p}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </section>


                {/* ── FOOTER CTA ── */}
                <section className="onboard-footer">
                    <div className="onboard-footer-cta">
                        <h2 style={{ 
                            fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', 
                            fontWeight: 900, 
                            letterSpacing: '-1.5px', 
                            marginBottom: '48px', 
                            background: 'linear-gradient(135deg, #ffffff, #d8ccff)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            lineHeight: 1.1,
                            whiteSpace: 'nowrap'
                        }}>
                            Ready to begin?
                        </h2>
                        <div className="onboard-cta-group">
                            <button className="onboard-btn-primary" onClick={() => navigate('/register/pm')}>
                                Create Organization <ArrowRight size={18} />
                            </button>
                            <button className="onboard-btn-secondary" onClick={() => navigate('/register')}>
                                Join as Employee
                            </button>
                        </div>
                    </div>
                    <div style={{ marginTop: '60px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                        © {new Date().getFullYear()} Aptivora Project Management · Built for modern engineering teams
                    </div>
                </section>
            </div>
        </div>
    );
}
