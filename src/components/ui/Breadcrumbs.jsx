import React from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import './Breadcrumbs.css';

export default function Breadcrumbs() {
    const location = useLocation();
    const navigate = useNavigate();

    // Map path segments to readable names
    const pathNames = {
        '': 'Home',
        'projects': 'Projects',
        'teams': 'Teams',
        'tasks': 'Tasks',
        'reports': 'Reports',
        // Add more dynamic mapping if needed later (e.g., checking IDs against a context)
    };

    const pathnames = location.pathname.split('/').filter((x) => x);

    // If we're on the dashboard, don't show breadcrumbs since it's redundant
    if (pathnames.length === 0) return null;

    return (
        <nav className="breadcrumbs" aria-label="Breadcrumb">
            <ol className="breadcrumbs__list">
                <li className="breadcrumbs__item">
                    <button
                        onClick={() => navigate('/')}
                        className="breadcrumbs__link breadcrumbs__link--home"
                        title="Dashboard"
                    >
                        <Home size={14} />
                    </button>
                    <ChevronRight size={14} className="breadcrumbs__separator" />
                </li>

                {pathnames.map((value, index) => {
                    const isLast = index === pathnames.length - 1;
                    const to = `/${pathnames.slice(0, index + 1).join('/')}`;

                    // Basic formatting: Capitalize or use mapped name. 
                    // If it's an ID (number), just show the ID.
                    const isId = !isNaN(value);
                    const displayName = pathNames[value] || (isId ? `#${value}` : value.charAt(0).toUpperCase() + value.slice(1));

                    return (
                        <li key={to} className="breadcrumbs__item">
                            {isLast ? (
                                <span className="breadcrumbs__current" aria-current="page">
                                    {displayName}
                                </span>
                            ) : (
                                <>
                                    <Link to={to} className="breadcrumbs__link">
                                        {displayName}
                                    </Link>
                                    <ChevronRight size={14} className="breadcrumbs__separator" />
                                </>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
