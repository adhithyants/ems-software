import { useState, useEffect } from 'react';

export default function Modal({ open, onClose, title, children, wide, overflowVisible }) {
    const [isSmallScreen, setIsSmallScreen] = useState(window.innerHeight < 480);

    useEffect(() => {
        const handleResize = () => setIsSmallScreen(window.innerHeight < 480);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (!open) return null;

    // Force scrollable mode if screen is too small, regardless of overflowVisible prop
    const effectiveOverflowVisible = isSmallScreen ? false : overflowVisible;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className={`modal${wide ? ' modal--wide' : ''}${effectiveOverflowVisible ? ' modal--overflow-visible' : ''}`} onClick={(e) => e.stopPropagation()}>
                <div className="modal__header">
                    <h2 className="modal__title">{title}</h2>
                    <button className="modal__close" onClick={onClose}>&times;</button>
                </div>
                <div className="modal__body">{children}</div>
            </div>
        </div>
    );
}

