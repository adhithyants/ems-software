import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FolderKanban, ListTodo, Users, X, ArrowRight } from 'lucide-react';
import { projectsAPI, tasksAPI, teamsAPI } from '../../api/api';
import './CommandPalette.css';

export default function CommandPalette({ isOpen, onClose }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState({ tasks: [], projects: [], users: [] });
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef(null);
    const navigate = useNavigate();

    // Flatten results for keyboard navigation
    const flatResults = [
        ...results.tasks.map(t => ({ ...t, _type: 'task' })),
        ...results.projects.map(p => ({ ...p, _type: 'project' })),
        ...results.users.map(u => ({ ...u, _type: 'user' }))
    ];

    // Reset state when opened
    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setResults({ tasks: [], projects: [], users: [] });
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Handle Search
    useEffect(() => {
        if (!query.trim()) {
            setResults({ tasks: [], projects: [], users: [] });
            return;
        }

        const fetchResults = async () => {
            setLoading(true);
            try {
                // In a real app we'd want dedicated search endpoints, 
                // but for now we'll fetch lists and filter client-side, 
                // or use existing endpoints if they support search args.
                // Assuming we can just fetch all and filter for this iteration:
                const [tasksRes, projectsRes, usersRes] = await Promise.allSettled([
                    tasksAPI.list(),
                    projectsAPI.list(),
                    teamsAPI.getAllUsers().catch(() => ({ data: [] })) // PM only usually, handle gracefully
                ]);

                const queryLower = query.toLowerCase();

                const tasks = tasksRes.status === 'fulfilled'
                    ? tasksRes.value.data.filter(t => t.name.toLowerCase().includes(queryLower) || t.id.toString() === queryLower)
                    : [];

                const projects = projectsRes.status === 'fulfilled'
                    ? projectsRes.value.data.filter(p => p.name.toLowerCase().includes(queryLower))
                    : [];

                const users = usersRes.status === 'fulfilled'
                    ? usersRes.value.data.filter(u => u.name.toLowerCase().includes(queryLower) || u.email.toLowerCase().includes(queryLower))
                    : [];

                setResults({
                    tasks: tasks.slice(0, 5),
                    projects: projects.slice(0, 5),
                    users: users.slice(0, 5)
                });
                setSelectedIndex(0);
            } catch (err) {
                console.error("Search failed", err);
            } finally {
                setLoading(false);
            }
        };

        const debounceTimer = setTimeout(fetchResults, 300);
        return () => clearTimeout(debounceTimer);
    }, [query]);

    // Handle Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isOpen) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev < flatResults.length - 1 ? prev + 1 : prev));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (flatResults.length > 0 && flatResults[selectedIndex]) {
                    handleSelect(flatResults[selectedIndex]);
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, flatResults.length, selectedIndex]);

    const handleSelect = (item) => {
        onClose();
        if (item._type === 'task') {
            navigate('/tasks', { state: { flashTaskId: item.id } }); // Or a dedicated task detail route
        } else if (item._type === 'project') {
            navigate('/projects', { state: { flashProjectId: item.id } });
        } else if (item._type === 'user') {
            // Might not have a user profile page yet, route to teams as fallback
            navigate('/teams');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="command-palette-overlay" onClick={onClose}>
            <div className="command-palette-modal" onClick={e => e.stopPropagation()}>
                <div className="command-palette-header">
                    <Search className="command-palette-icon" size={20} />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Search tasks, projects, or users..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="command-palette-input"
                    />
                    {loading && <div className="spinner command-palette-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />}
                    <button className="command-palette-close" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {query.trim() && (
                    <div className="command-palette-results">
                        {flatResults.length === 0 && !loading && (
                            <div className="command-palette-empty">No results found for "{query}"</div>
                        )}

                        {results.tasks.length > 0 && (
                            <div className="command-palette-group">
                                <div className="command-palette-group-title">Tasks</div>
                                {results.tasks.map((task, idx) => {
                                    const flatIdx = flatResults.findIndex(r => r.id === task.id && r._type === 'task');
                                    return (
                                        <div
                                            key={`task-${task.id}`}
                                            className={`command-palette-item ${selectedIndex === flatIdx ? 'selected' : ''}`}
                                            onClick={() => handleSelect({ ...task, _type: 'task' })}
                                            onMouseEnter={() => setSelectedIndex(flatIdx)}
                                        >
                                            <ListTodo size={16} className="command-palette-item-icon text-warning" />
                                            <div className="command-palette-item-content">
                                                <span className="command-palette-item-title">{task.name}</span>
                                                <span className="command-palette-item-subtitle">#{task.id} • {task.status.replace(/_/g, ' ')}</span>
                                            </div>
                                            <ArrowRight size={14} className="command-palette-item-arrow" />
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {results.projects.length > 0 && (
                            <div className="command-palette-group">
                                <div className="command-palette-group-title">Projects</div>
                                {results.projects.map((project, idx) => {
                                    const flatIdx = flatResults.findIndex(r => r.id === project.id && r._type === 'project');
                                    return (
                                        <div
                                            key={`proj-${project.id}`}
                                            className={`command-palette-item ${selectedIndex === flatIdx ? 'selected' : ''}`}
                                            onClick={() => handleSelect({ ...project, _type: 'project' })}
                                            onMouseEnter={() => setSelectedIndex(flatIdx)}
                                        >
                                            <FolderKanban size={16} className="command-palette-item-icon text-success" />
                                            <div className="command-palette-item-content">
                                                <span className="command-palette-item-title">{project.name}</span>
                                                <span className="command-palette-item-subtitle">{project.status.replace(/_/g, ' ')}</span>
                                            </div>
                                            <ArrowRight size={14} className="command-palette-item-arrow" />
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {results.users.length > 0 && (
                            <div className="command-palette-group">
                                <div className="command-palette-group-title">Users</div>
                                {results.users.map((user, idx) => {
                                    const flatIdx = flatResults.findIndex(r => r.id === user.id && r._type === 'user');
                                    return (
                                        <div
                                            key={`user-${user.id}`}
                                            className={`command-palette-item ${selectedIndex === flatIdx ? 'selected' : ''}`}
                                            onClick={() => handleSelect({ ...user, _type: 'user' })}
                                            onMouseEnter={() => setSelectedIndex(flatIdx)}
                                        >
                                            <Users size={16} className="command-palette-item-icon text-primary" />
                                            <div className="command-palette-item-content">
                                                <span className="command-palette-item-title">{user.name}</span>
                                                <span className="command-palette-item-subtitle">{user.role}</span>
                                            </div>
                                            <ArrowRight size={14} className="command-palette-item-arrow" />
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                <div className="command-palette-footer">
                    <span><kbd>↑</kbd> <kbd>↓</kbd> to navigate</span>
                    <span><kbd>↵</kbd> to select</span>
                    <span><kbd>ESC</kbd> to close</span>
                </div>
            </div>
        </div>
    );
}
