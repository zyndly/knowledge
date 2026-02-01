import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Step } from '../../stores/editorStore'
import { useEditorStore } from '../../stores/editorStore'
import './StepItem.css'

interface StepItemProps {
    step: Step
    isSelected: boolean
    onSelect: () => void
}

function StepItem({ step, isSelected, onSelect }: StepItemProps) {
    const { deleteStep } = useEditorStore()

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: step._id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (confirm('Delete this step?')) {
            deleteStep(step._id)
        }
    }

    // Use proxy URL for S3 images to bypass CORS
    const getProxiedUrl = (url: string) => {
        if (url.includes('s3.') && url.includes('amazonaws.com')) {
            return `/api/uploads/proxy/${encodeURIComponent(url)}`
        }
        return url
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`step-item ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
            onClick={onSelect}
        >
            <div className="step-drag-handle" {...attributes} {...listeners}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <circle cx="5" cy="4" r="1.5" />
                    <circle cx="11" cy="4" r="1.5" />
                    <circle cx="5" cy="8" r="1.5" />
                    <circle cx="11" cy="8" r="1.5" />
                    <circle cx="5" cy="12" r="1.5" />
                    <circle cx="11" cy="12" r="1.5" />
                </svg>
            </div>

            <div className="step-thumbnail">
                <img src={getProxiedUrl(step.screenshotUrl)} alt={`Step ${step.order + 1}`} />
                {step.annotations.length > 0 && (
                    <span className="annotation-badge" title={`${step.annotations.length} annotations`}>
                        {step.annotations.length}
                    </span>
                )}
            </div>

            <div className="step-info">
                <span className="step-number">{step.order + 1}</span>
                <span className="step-title">
                    {step.title || step.elementLabel || `Step ${step.order + 1}`}
                </span>
            </div>

            <button
                className="step-delete"
                onClick={handleDelete}
                title="Delete step"
            >
                ×
            </button>
        </div>
    )
}

export default StepItem
