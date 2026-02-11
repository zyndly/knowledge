import type { Step } from '../../stores/editorStore'
import { useEditorStore } from '../../stores/editorStore'
import './StepDetails.css'

interface StepDetailsProps {
    step: Step
}

function StepDetails({ step }: StepDetailsProps) {
    const { updateStep, deleteAnnotation } = useEditorStore()

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateStep(step._id, { title: e.target.value })
    }

    const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        updateStep(step._id, { description: e.target.value })
    }

    return (
        <div className="step-details">
            <div className="details-section">
                <h3 className="section-title">Step Details</h3>

                <div className="form-group">
                    <label htmlFor="step-title" className="form-label">
                        Title
                    </label>
                    <input
                        id="step-title"
                        type="text"
                        className="form-input"
                        value={step.title}
                        onChange={handleTitleChange}
                        placeholder="Enter step title..."
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="step-description" className="form-label">
                        Description
                    </label>
                    <textarea
                        id="step-description"
                        className="form-textarea"
                        value={step.description}
                        onChange={handleDescriptionChange}
                        placeholder="Describe what happens in this step..."
                        rows={4}
                    />
                </div>
            </div>

            <div className="details-section">
                <h3 className="section-title">Element Info</h3>
                <div className="meta-list">
                    {step.elementLabel && (
                        <div key="label" className="meta-item">
                            <span className="meta-label">Label</span>
                            <span className="meta-value">{step.elementLabel}</span>
                        </div>
                    )}
                    {step.elementTag && (
                        <div key="tag" className="meta-item">
                            <span className="meta-label">Element</span>
                            <span className="meta-value code">{step.elementTag}</span>
                        </div>
                    )}
                    {step.selector && (
                        <div key="selector" className="meta-item">
                            <span className="meta-label">Selector</span>
                            <span className="meta-value code" title={step.selector}>
                                {step.selector.length > 40
                                    ? step.selector.substring(0, 40) + '...'
                                    : step.selector}
                            </span>
                        </div>
                    )}
                    <div key="url" className="meta-item">
                        <span className="meta-label">URL</span>
                        <a
                            href={step.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="meta-value link"
                            title={step.url}
                        >
                            {new URL(step.url).hostname}
                        </a>
                    </div>
                </div>
            </div>

            {step.annotations.length > 0 && (
                <div className="details-section">
                    <h3 className="section-title">
                        Annotations
                        <span className="count">{step.annotations.length}</span>
                    </h3>
                    <ul className="annotations-list">
                        {step.annotations.map((ann) => (
                            <li key={ann.id} className="annotation-item">
                                <span className="annotation-type">
                                    {ann.type === 'arrow' && '➜'}
                                    {ann.type === 'rect' && '▢'}
                                    {ann.type === 'text' && 'T'}
                                </span>
                                <span className="annotation-info">
                                    {ann.type === 'text' ? ann.text || 'Text' : ann.type}
                                </span>
                                <span
                                    className="annotation-color"
                                    style={{ background: ann.color }}
                                />
                                <button
                                    className="annotation-delete"
                                    onClick={() => deleteAnnotation(step._id, ann.id)}
                                    title="Delete annotation"
                                >
                                    ×
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}

export default StepDetails
