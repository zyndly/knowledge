import type { Guide } from '../../stores/editorStore'
import { useEditorStore } from '../../stores/editorStore'
import './EditorToolbar.css'

interface EditorToolbarProps {
    guide: Guide
    onSave: () => void
    onExport: () => void
    onPreview: () => void
    isSaving: boolean
    isDirty: boolean
}

const COLORS = [
    '#ef4444', // Red
    '#f97316', // Orange
    '#eab308', // Yellow
    '#22c55e', // Green
    '#00d4ff', // Cyan
    '#7c3aed', // Purple
    '#ec4899', // Pink
    '#ffffff', // White
]

function EditorToolbar({
    guide,
    onSave,
    onExport,
    onPreview,
    isSaving,
    isDirty,
}: EditorToolbarProps) {
    const {
        annotationTool,
        annotationColor,
        setAnnotationTool,
        setAnnotationColor,
        updateGuide,
    } = useEditorStore()

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateGuide({ title: e.target.value })
    }

    const handleTogglePublic = () => {
        updateGuide({ isPublic: !guide.isPublic })
    }

    return (
        <div className="editor-toolbar">
            <div className="toolbar-left">
                <input
                    type="text"
                    className="guide-title-input"
                    value={guide.title}
                    onChange={handleTitleChange}
                    placeholder="Untitled Guide"
                />
                {isDirty && <span className="unsaved-indicator">Unsaved changes</span>}
            </div>

            <div className="toolbar-center">
                <div className="tool-group">
                    <button
                        className={`tool-btn ${annotationTool === 'select' ? 'active' : ''}`}
                        onClick={() => setAnnotationTool('select')}
                        title="Select (V)"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M4 4l16 16m-5-5l5 5-5-5zm0 0l-6 6 6-6zm0 0l-6-6 6 6z" stroke="currentColor" strokeWidth="2" fill="none" />
                        </svg>
                    </button>
                    <button
                        className={`tool-btn ${annotationTool === 'rect' ? 'active' : ''}`}
                        onClick={() => setAnnotationTool('rect')}
                        title="Rectangle (R)"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                        </svg>
                    </button>
                    <button
                        className={`tool-btn ${annotationTool === 'arrow' ? 'active' : ''}`}
                        onClick={() => setAnnotationTool('arrow')}
                        title="Arrow (A)"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 19L19 5M19 5H10M19 5v9" />
                        </svg>
                    </button>
                    <button
                        className={`tool-btn ${annotationTool === 'text' ? 'active' : ''}`}
                        onClick={() => setAnnotationTool('text')}
                        title="Text (T)"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M5 5h14v3h-2V7H13v10h2v2H9v-2h2V7H7v1H5V5z" />
                        </svg>
                    </button>
                </div>

                <div className="tool-divider" />

                <div className="color-picker">
                    {COLORS.map((color) => (
                        <button
                            key={color}
                            className={`color-btn ${annotationColor === color ? 'active' : ''}`}
                            style={{ background: color }}
                            onClick={() => setAnnotationColor(color)}
                            title={color}
                        />
                    ))}
                </div>
            </div>

            <div className="toolbar-right">
                <button
                    className={`toggle-btn ${guide.isPublic ? 'active' : ''}`}
                    onClick={handleTogglePublic}
                    title={guide.isPublic ? 'Make private' : 'Make public'}
                >
                    {guide.isPublic ? '🔓 Public' : '🔒 Private'}
                </button>
                <button className="btn btn-secondary" onClick={onPreview}>
                    👁️ Preview
                </button>
                <button className="btn btn-secondary" onClick={onExport}>
                    📥 Export HTML
                </button>
                <button
                    className="btn btn-primary"
                    onClick={onSave}
                    disabled={isSaving || !isDirty}
                >
                    {isSaving ? 'Saving...' : 'Save'}
                </button>
            </div>
        </div>
    )
}

export default EditorToolbar
