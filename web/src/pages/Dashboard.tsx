import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { guidesApi } from '../services/api'
import type { Guide } from '../stores/editorStore'
import './Dashboard.css'

function Dashboard() {
    const [guides, setGuides] = useState<Guide[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState('')
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

    // Use proxy URL for S3 images to bypass CORS
    const getProxiedUrl = (url: string) => {
        if (url.includes('s3.') && url.includes('amazonaws.com')) {
            return `/api/uploads/proxy/${encodeURIComponent(url)}`
        }
        return url
    }

    useEffect(() => {
        loadGuides()
    }, [])

    const loadGuides = async () => {
        try {
            setIsLoading(true)
            const data = await guidesApi.getAll()
            setGuides(data)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to load guides')
        } finally {
            setIsLoading(false)
        }
    }

    const handleDelete = async (guideId: string) => {
        try {
            await guidesApi.delete(guideId)
            setGuides((prev) => prev.filter((g) => g._id !== guideId))
            setDeleteConfirm(null)
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Failed to delete guide')
        }
    }

    const copyShareLink = (shareId: string) => {
        const url = `${window.location.origin}/view/${shareId}`
        navigator.clipboard.writeText(url).then(() => {
        alert("Link copied to clipboard!");
    });

    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        })
    }

    if (isLoading) {
        return (
            <div className="dashboard">
                <div className="dashboard-loading">
                    <div className="loading-spinner"></div>
                    <p>Loading your guides...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div className="header-content">
                    <h1>My Guides</h1>
                    <p>Create and manage your step-by-step guides</p>
                </div>
                <div className="header-actions">
                    <div className="extension-hint">
                        <span className="hint-icon">💡</span>
                        <span>Use the browser extension to record new guides</span>
                    </div>
                </div>
            </header>

            {error && <div className="dashboard-error">{error}</div>}

            {guides.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">📸</div>
                    <h2>No guides yet</h2>
                    <p>
                        Install the Cirqapture browser extension to start recording your
                        first guide. Simply click "Start Recording" and perform the actions
                        you want to capture.
                    </p>
                    <div className="empty-steps">
                        <div className="empty-step">
                            <span className="step-number">1</span>
                            <span>Install the browser extension</span>
                        </div>
                        <div className="empty-step">
                            <span className="step-number">2</span>
                            <span>Click "Start Recording"</span>
                        </div>
                        <div className="empty-step">
                            <span className="step-number">3</span>
                            <span>Perform actions on any website</span>
                        </div>
                        <div className="empty-step">
                            <span className="step-number">4</span>
                            <span>Edit and share your guide</span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="guides-grid">
                    {guides.map((guide) => (
                        <div key={guide._id} className="guide-card">
                            <div className="guide-cover">
                                {guide.coverImageUrl ? (
                                    <img src={getProxiedUrl(guide.coverImageUrl)} alt={guide.title} />
                                ) : (
                                    <div className="cover-placeholder">
                                        <span>📸</span>
                                    </div>
                                )}
                                <div className="guide-status">
                                    <span className={`status-badge ${guide.status}`}>
                                        {guide.status}
                                    </span>
                                    {guide.isPublic && (
                                        <span className="status-badge public">Public</span>
                                    )}
                                </div>
                            </div>

                            <div className="guide-content">
                                <h3 className="guide-title">{guide.title}</h3>
                                {guide.description && (
                                    <p className="guide-description">{guide.description}</p>
                                )}
                                <div className="guide-meta">
                                    <span className="meta-item">
                                        📷 {guide.steps.length} steps
                                    </span>
                                    <span className="meta-item">
                                        👁️ {guide.viewCount} views
                                    </span>
                                    <span className="meta-item">
                                        📅 {formatDate(guide.createdAt)}
                                    </span>
                                </div>
                            </div>

                            <div className="guide-actions">
                                <Link
                                    to={`/editor/${guide._id}`}
                                    className="btn btn-primary btn-sm"
                                >
                                    Edit
                                </Link>
                                <button
                                    onClick={() => copyShareLink(guide.shareId)}
                                    className="btn btn-secondary btn-sm"
                                    title="Copy share link"
                                >
                                    🔗 Share
                                </button>
                                <button
                                    onClick={() => setDeleteConfirm(guide._id)}
                                    className="btn btn-ghost btn-sm"
                                    title="Delete guide"
                                >
                                    🗑️
                                </button>
                            </div>

                            {deleteConfirm === guide._id && (
                                <div className="delete-confirm">
                                    <p>Delete this guide?</p>
                                    <div className="delete-actions">
                                        <button
                                            onClick={() => handleDelete(guide._id)}
                                            className="btn btn-danger btn-sm"
                                        >
                                            Delete
                                        </button>
                                        <button
                                            onClick={() => setDeleteConfirm(null)}
                                            className="btn btn-ghost btn-sm"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default Dashboard
