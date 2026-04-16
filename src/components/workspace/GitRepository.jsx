import { useState, useEffect, useMemo } from 'react';
import { projectsAPI } from '../../api/api';
import { Github, GitCommit, GitPullRequest, Settings, CheckCircle, Clock, GitBranch, Code, Trophy, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../../context/AuthContext';

export default function GitRepository({ project }) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [repositories, setRepositories] = useState([]);
    const [selectedRepoId, setSelectedRepoId] = useState(null);
    const [isSetupComplete, setIsSetupComplete] = useState(false);
    const [showSetupForm, setShowSetupForm] = useState(false);
    
    // Phase 6: Contextual Role Resolution
    const effectiveRole = user?.role === 'SU' ? 'SU' : project?.my_role;
    const isManagement = ['TL', 'PM', 'SU'].includes(effectiveRole);
    
    // Live data (Branches/Languages)
    const [liveData, setLiveData] = useState(null);
    const [liveLoading, setLiveLoading] = useState(false);

    // Setup form state
    const [repoUrl, setRepoUrl] = useState('');
    const [provider, setProvider] = useState('GitHub');
    const [defaultBranch, setDefaultBranch] = useState('main');
    const [githubToken, setGithubToken] = useState('');
    const [setupError, setSetupError] = useState('');
    const [newWebhookSecret, setNewWebhookSecret] = useState('');

    useEffect(() => {
        fetchGithubData();
    }, [project.id]);

    useEffect(() => {
        if (selectedRepoId) {
            fetchLiveData(selectedRepoId);
            setNewWebhookSecret(''); // Clear secret on tab switch
        }
    }, [selectedRepoId]);

    const fetchGithubData = async () => {
        try {
            setLoading(true);
            const res = await projectsAPI.getGithubData(project.id);
            const repos = res.data.repositories;
            if (repos && repos.length > 0) {
                setRepositories(repos);
                if (!selectedRepoId) setSelectedRepoId(repos[0].repository.id);
                setIsSetupComplete(true);
                setShowSetupForm(false);
            } else {
                setIsSetupComplete(false);
                setShowSetupForm(true);
            }
        } catch (err) {
            setIsSetupComplete(false);
            setShowSetupForm(true);
        } finally {
            setLoading(false);
        }
    };

    const fetchLiveData = async (repoId) => {
        setLiveLoading(true);
        try {
            const res = await projectsAPI.getGithubRepoDetails(project.id, repoId);
            setLiveData(res.data);
        } catch (err) {}
        finally {
            setLiveLoading(false);
        }
    };

    const handleSetupSubmit = async (e) => {
        e.preventDefault();
        setSetupError('');
        try {
            const res = await projectsAPI.setupGithub(project.id, {
                url: repoUrl,
                provider,
                default_branch: defaultBranch,
                github_token: githubToken
            });
            setNewWebhookSecret(res.data.webhook_secret);
            setRepoUrl('');
            setGithubToken('');
            await fetchGithubData();
            // Automatically select the new repo in the state
            setSelectedRepoId(res.data.id);
        } catch (err) {
            setSetupError(err.response?.data?.detail || 'Failed to connect repository. Check URL or Token.');
        }
    };

    const selectedRepoData = useMemo(() => {
        return repositories.find(r => r.repository.id === selectedRepoId) || null;
    }, [repositories, selectedRepoId]);

    // Top contributors logic
    const topContributors = useMemo(() => {
        if (!selectedRepoData?.commits) return [];
        const counts = {};
        selectedRepoData.commits.forEach(c => {
            counts[c.author_name] = (counts[c.author_name] || 0) + 1;
        });
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));
    }, [selectedRepoData]);

    if (loading) {
        return <div style={{ padding: '2rem' }}>Loading repository data...</div>;
    }

    if (!isSetupComplete && !isManagement) {
        return (
            <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--bg-card)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '1px solid var(--border-color)' }}>
                    <Github size={40} />
                </div>
                <h3>No Repository Connected</h3>
                <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '1rem auto' }}>
                    This project hasn't been linked to a Git repository yet. Only Project Managers or Tech Leads can set up the integration.
                </p>
            </div>
        );
    }

    if ((!isSetupComplete || showSetupForm) && isManagement) {
        return (
            <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
                <div style={{ marginBottom: '2rem' }}>
                    <div style={{
                        width: '80px', height: '80px', borderRadius: '50%',
                        background: 'var(--color-primary-bg)', color: 'var(--color-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 1.5rem'
                    }}>
                        <Github size={40} />
                    </div>
                    <h2>Connect Repository</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>Link a Git repository to track commits and pull requests directly in the workspace.</p>
                </div>

                <form onSubmit={handleSetupSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--bg-card)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'left' }}>
                    {setupError && <div className="alert alert--danger">{setupError}</div>}
                    
                    <div className="form-group">
                        <label>Repository URL</label>
                        <input 
                            type="url" 
                            className="input" 
                            value={repoUrl} 
                            onChange={(e) => setRepoUrl(e.target.value)}
                            placeholder="https://github.com/owner/repo"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Provider</label>
                        <select className="input" value={provider} onChange={(e) => setProvider(e.target.value)}>
                            <option value="GitHub">GitHub</option>
                            <option value="GitLab">GitLab</option>
                            <option value="Bitbucket">Bitbucket</option>
                        </select>
                    </div>
                    
                    <div className="form-group">
                        <label>GitHub Personal Access Token (PAT) <span style={{ color: 'var(--text-secondary)', fontWeight: 'normal' }}>(Optional)</span></label>
                        <input 
                            type="password" 
                            className="input" 
                            value={githubToken} 
                            onChange={(e) => setGithubToken(e.target.value)}
                            placeholder="Required for fetching commits in private repos"
                        />
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                            If the repo is private, provide a PAT so we can seamlessly fetch historical commits, active branches, and language stats.
                        </p>
                    </div>

                    <div className="form-group">
                        <label>Default Branch</label>
                        <input 
                            type="text" 
                            className="input" 
                            value={defaultBranch} 
                            onChange={(e) => setDefaultBranch(e.target.value)}
                            placeholder="main"
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button type="submit" className="btn btn--primary" style={{ flex: 1 }}>
                            Connect Repository
                        </button>
                        {isSetupComplete && (
                            <button type="button" className="btn btn--ghost" onClick={() => setShowSetupForm(false)}>
                                Cancel
                            </button>
                        )}
                    </div>
                </form>
            </div>
        );
    }

    const { repository, commits, pull_requests, webhook_secret } = selectedRepoData || {};
    const branches = liveData?.branches || [];
    const languages = liveData?.languages || {};
    const totalLangBytes = Object.values(languages).reduce((a, b) => a + b, 0);

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            
            {/* Multi-Repo Header / Tab Switcher */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', flex: 1 }}>
                    {repositories.map((repoObj) => {
                        const r = repoObj.repository;
                        const isSelected = selectedRepoId === r.id;
                        return (
                            <button 
                                key={r.id} 
                                onClick={() => setSelectedRepoId(r.id)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    padding: '0.5rem 1rem', borderRadius: '999px', border: 'none',
                                    background: isSelected ? 'var(--color-primary)' : 'var(--bg-card)',
                                    color: isSelected ? '#fff' : 'var(--text-primary)',
                                    fontWeight: isSelected ? 600 : 500,
                                    cursor: 'pointer', transition: 'all 0.2s'
                                }}
                            >
                                <Github size={16} /> 
                                {r.url.split('/').slice(-2).join('/')}
                            </button>
                        );
                    })}
                </div>
                
                {isManagement && (
                    <button className="btn btn--outline btn--sm" style={{ flexShrink: 0, marginLeft: '1rem' }} onClick={() => setShowSetupForm(true)}>
                        <Plus size={16} style={{ marginRight: '0.4rem' }}/> Connect Another
                    </button>
                )}
            </div>

            {/* Webhook Alert if newly added */}
            {newWebhookSecret && (
                <div className="alert alert--warning" style={{ marginBottom: '2rem' }}>
                    <strong>Setup Webhook:</strong> In <a href={repository?.url} target="_blank" rel="noopener noreferrer">your repository settings</a>, create a webhook pointing to your Aptivora Project Management Platform API endpoint (<code>/api/webhooks/github/</code>) and use this secret: 
                    <code style={{ marginLeft: '0.5rem', background: 'rgba(0,0,0,0.1)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>{newWebhookSecret}</code>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '2rem' }}>
                {/* LEFT COL: Commits & PRs */}
                <div>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <GitCommit size={20} /> Repository Timeline
                    </h4>
                    
                    {commits?.length > 0 ? (
                        <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                            {commits.map((commit, i) => (
                                <div key={commit.id} style={{
                                    padding: '1rem',
                                    borderBottom: i !== commits.length - 1 ? '1px solid var(--border-color)' : 'none',
                                    display: 'flex', flexDirection: 'column', gap: '0.5rem'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{commit.message.split('\n')[0]}</div>
                                        <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--color-primary)', background: 'var(--color-primary-bg)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                                            {commit.commit_hash.substring(0, 7)}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        <span>{commit.author_name}</span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            <Clock size={14} /> {formatDistanceToNow(new Date(commit.timestamp), { addSuffix: true })}
                                        </span>
                                        {commit.task && (
                                            <span style={{ color: 'var(--color-success)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <CheckCircle size={14} /> Resolves TASK-{commit.task.id}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                            No commits synced yet.
                        </div>
                    )}

                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '3rem', marginBottom: '1rem' }}>
                        <GitPullRequest size={20} /> Active & Recent Pull Requests
                    </h4>
                    
                    {pull_requests?.length > 0 ? (
                        <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                            {pull_requests.map((pr, i) => (
                                <div key={pr.id} style={{
                                    padding: '1rem',
                                    borderBottom: i !== pull_requests.length - 1 ? '1px solid var(--border-color)' : 'none',
                                }}>
                                    <a href={pr.pr_url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 500, color: 'var(--text-primary)', textDecoration: 'none', display: 'block', marginBottom: '0.5rem' }}>
                                        {pr.title} <span style={{ color: 'var(--text-secondary)' }}>#{pr.pr_id}</span>
                                    </a>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>by {pr.author}</span>
                                        <span style={{
                                            padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 600, fontSize: '0.8rem',
                                            background: pr.status === 'MERGED' ? 'var(--color-primary-bg)' : pr.status === 'OPEN' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                                            color: pr.status === 'MERGED' ? 'var(--color-primary)' : pr.status === 'OPEN' ? 'var(--color-success)' : 'var(--color-danger)'
                                        }}>
                                            {pr.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                            No pull requests tracked by webhook yet.
                        </div>
                    )}
                </div>

                {/* RIGHT COL: Stats & Branches */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    
                    {/* Top Contributors */}
                    {topContributors.length > 0 && (
                        <div>
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                <Trophy size={20} className="text-muted" /> Top Contributors
                            </h4>
                            <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                {topContributors.map((c, i) => (
                                    <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: i !== topContributors.length - 1 ? '0.75rem' : 0 }}>
                                        <span style={{ fontWeight: 500 }}>{c.name}</span>
                                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{c.count} commits</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Repo Languages */}
                    {totalLangBytes > 0 && (
                        <div>
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                <Code size={20} className="text-muted" /> Repository Languages
                            </h4>
                            <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', height: '12px', borderRadius: '6px', overflow: 'hidden', marginBottom: '1rem' }}>
                                    {Object.entries(languages).map(([lang, bytes], i) => {
                                        // Generate an arbitrary color based on lang string length for visual variety
                                        const hue = (lang.charCodeAt(0) * 137.5) % 360;
                                        const color = `hsl(${hue}, 70%, 50%)`;
                                        const percent = (bytes / totalLangBytes) * 100;
                                        return (
                                            <div key={lang} style={{ width: `${percent}%`, background: color }} title={`${lang}: ${percent.toFixed(1)}%`} />
                                        );
                                    })}
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.85rem' }}>
                                    {Object.entries(languages).map(([lang, bytes]) => {
                                        const hue = (lang.charCodeAt(0) * 137.5) % 360;
                                        const color = `hsl(${hue}, 70%, 50%)`;
                                        const percent = ((bytes / totalLangBytes) * 100).toFixed(1);
                                        return (
                                            <div key={lang} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }}></div>
                                                <span>{lang} <strong>{percent}%</strong></span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Active Branches */}
                    <div>
                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                            <GitBranch size={20} className="text-muted" /> Active Branches
                            {liveLoading && <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)', marginLeft: 'auto' }}>Refreshing...</span>}
                        </h4>
                        <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                            {branches.length > 0 ? (
                                branches.map((b, i) => (
                                    <div key={b.name} style={{
                                        padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        borderBottom: i !== branches.length - 1 ? '1px solid var(--border-color)' : 'none'
                                    }}>
                                        <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <GitBranch size={16} /> {b.name}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div style={{ padding: '1rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                                    {liveLoading ? 'Loading branches...' : 'No branches found.'}
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
