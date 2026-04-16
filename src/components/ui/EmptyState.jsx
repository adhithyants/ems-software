import { Inbox } from 'lucide-react';
import './EmptyState.css';

export default function EmptyState({ icon: Icon = Inbox, title = 'Nothing here yet', subtitle, children }) {
    return (
        <div className="empty-state-container">
            <div className="empty-state-container__icon">
                <Icon size={32} />
            </div>
            <h3 className="empty-state-container__title">{title}</h3>
            {subtitle && <p className="empty-state-container__subtitle">{subtitle}</p>}
            {children}
        </div>
    );
}
