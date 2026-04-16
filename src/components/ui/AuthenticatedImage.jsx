import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../../api/api';
import { getAccessToken } from '../../lib/authStorage';

/**
 * A secure image component that fetches images using an authenticated axios request.
 * Useful for displaying images from API endpoints protected by JWT/Session auth.
 */
export default function AuthenticatedImage({ url, alt, className, style, ...props }) {
    const [imgSrc, setImgSrc] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!url) return;

        let isMounted = true;
        const controller = new AbortController();

        const fetchImage = async () => {
            setLoading(true);
            setError(false);
            
            try {
                // Determine full URL (if relative, prepend API_BASE)
                const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
                
                // Get the token from localStorage (matching your api.js logic)
                const token = await getAccessToken();
                
                const response = await axios.get(fullUrl, {
                    headers: token ? {
                        'Authorization': `Bearer ${token}`
                    } : {},
                    responseType: 'blob',
                    signal: controller.signal
                });

                if (isMounted) {
                    const objectUrl = URL.createObjectURL(response.data);
                    setImgSrc(objectUrl);
                    setLoading(false);
                }
            } catch (err) {
                if (axios.isCancel(err)) return;
                console.error("Failed to load authenticated image:", err);
                if (isMounted) {
                    setError(true);
                    setLoading(false);
                }
            }
        };

        fetchImage();

        return () => {
            isMounted = false;
            controller.abort();
            // Cleanup the Object URL to prevent memory leaks
            if (imgSrc) {
                URL.revokeObjectURL(imgSrc);
            }
        };
    }, [url]);

    // Cleanup specifically for the imgSrc when it changes
    useEffect(() => {
        return () => {
            if (imgSrc) {
                URL.revokeObjectURL(imgSrc);
            }
        };
    }, [imgSrc]);

    if (loading) {
        return (
            <div className={`authenticated-image-loading ${className}`} style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)' }}>
                <div className="spinner-sm" />
            </div>
        );
    }

    if (error || !imgSrc) {
        return (
            <div className={`authenticated-image-error ${className}`} style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,0,0,0.05)', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                Failed to load image
            </div>
        );
    }

    return (
        <img 
            src={imgSrc} 
            alt={alt} 
            className={className} 
            style={style} 
            {...props} 
        />
    );
}
