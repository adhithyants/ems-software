import React from 'react';
import './Skeleton.css';

export const Skeleton = ({ className = '', style = {} }) => {
    return (
        <div className={`skeleton ${className}`} style={style} />
    );
};

export const SkeletonText = ({ lines = 1, className = '', style = {} }) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', ...style }}>
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    className={`skeleton-text ${i === lines - 1 && lines > 1 ? 'skeleton-text--short' : ''} ${className}`}
                />
            ))}
        </div>
    );
};

export const SkeletonCard = ({ style = {} }) => {
    return (
        <div className="skeleton-card" style={style}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Skeleton className="skeleton-avatar" />
                <div style={{ flex: 1 }}>
                    <SkeletonText lines={2} />
                </div>
            </div>
            <Skeleton className="skeleton-text" style={{ marginTop: '12px', height: '60px' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto' }}>
                <Skeleton className="skeleton-button" />
            </div>
        </div>
    );
};

export const SkeletonTable = ({ rows = 5, columns = 5 }) => {
    return (
        <div className="card">
            <div className="table-wrapper">
                <table className="table">
                    <thead>
                        <tr>
                            {Array.from({ length: columns }).map((_, i) => (
                                <th key={i}>
                                    <Skeleton className="skeleton-text" style={{ height: '14px', width: '60%' }} />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: rows }).map((_, r) => (
                            <tr key={r}>
                                {Array.from({ length: columns }).map((_, c) => (
                                    <td key={c}>
                                        <Skeleton className="skeleton-text" style={{ height: '14px', width: c === 0 ? '80%' : '50%' }} />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
