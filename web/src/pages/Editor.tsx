import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useEditorStore } from '../stores/editorStore'
import { guidesApi } from '../services/api'
import StepItem from '../components/editor/StepItem'
import AnnotationCanvas from '../components/editor/AnnotationCanvas'
import StepDetails from '../components/editor/StepDetails'
import EditorToolbar from '../components/editor/EditorToolbar'
import './Editor.css'

function Editor() {
    const { guideId } = useParams<{ guideId: string }>()
    const navigate = useNavigate()
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState('')

    const {
        guide,
        selectedStepId,
        isDirty,
        isSaving,
        setGuide,
        selectStep,
        reorderSteps,
        setIsSaving,
        setIsDirty,
        reset,
    } = useEditorStore()

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    useEffect(() => {
        if (guideId) {
            loadGuide(guideId)
        }
        return () => reset()
    }, [guideId])

    const loadGuide = async (id: string) => {
        try {
            setIsLoading(true)
            const data = await guidesApi.getById(id)
            setGuide(data)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to load guide')
        } finally {
            setIsLoading(false)
        }
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        if (!over || !guide) return

        if (active.id !== over.id) {
            const oldIndex = guide.steps.findIndex((s) => s._id === active.id)
            const newIndex = guide.steps.findIndex((s) => s._id === over.id)
            const newOrder = arrayMove(
                guide.steps.map((s) => s._id),
                oldIndex,
                newIndex
            )
            reorderSteps(newOrder)
        }
    }

    const handleSave = useCallback(async () => {
        if (!guide || isSaving) return

        setIsSaving(true)
        try {
            // Update guide metadata
            await guidesApi.update(guide._id, {
                title: guide.title,
                description: guide.description,
                isPublic: guide.isPublic,
                status: guide.status,
            })

            // Update step order
            await guidesApi.reorderSteps(
                guide._id,
                guide.steps.map((s) => s._id)
            )

            // Update each step's annotations
            for (const step of guide.steps) {
                try {
                    await guidesApi.updateStep(guide._id, step._id, {
                        title: step.title,
                        description: step.description,
                        annotations: step.annotations,
                    })
                } catch (err) {
                    console.error(`Failed to update step ${step._id}:`, err)
                    // Continue with other steps even if one fails
                }
            }

            setIsDirty(false)
            alert('Guide saved successfully!')
        } catch (err: unknown) {
            console.error('Save error:', err)
            alert(err instanceof Error ? err.message : 'Failed to save changes')
        } finally {
            setIsSaving(false)
        }
    }, [guide, isSaving])

    const handleExport = async () => {
        if (!guide) return
        try {
            const html = await guidesApi.exportHtml(guide._id)
            const blob = new Blob([html], { type: 'text/html' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${guide.title.replace(/\s+/g, '-')}.html`
            a.click()
            URL.revokeObjectURL(url)
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Failed to export guide')
        }
    }

    const handlePreview = () => {
        if (guide) {
            window.open(`/view/${guide.shareId}`, '_blank')
        }
    }

    const selectedStep = guide?.steps.find((s) => s._id === selectedStepId)

    if (isLoading) {
        return (
            <div className="editor-loading">
                <div className="loading-spinner"></div>
                <p>Loading guide...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="editor-error">
                <h2>Error loading guide</h2>
                <p>{error}</p>
                <button onClick={() => navigate('/dashboard')} className="btn btn-primary">
                    Back to Dashboard
                </button>
            </div>
        )
    }

    if (!guide) {
        return null
    }

    return (
        <div className="editor">
            <EditorToolbar
                guide={guide}
                onSave={handleSave}
                onExport={handleExport}
                onPreview={handlePreview}
                isSaving={isSaving}
                isDirty={isDirty}
            />

            <div className="editor-content">
                {/* Left Panel - Steps List */}
                <aside className="editor-sidebar">
                    <div className="sidebar-header">
                        <h3>Steps</h3>
                        <span className="step-count">{guide.steps.length}</span>
                    </div>

                    <div className="steps-list">
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={guide.steps.map((s) => s._id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {guide.steps
                                    .sort((a, b) => a.order - b.order)
                                    .map((step) => (
                                        <StepItem
                                            key={step._id}
                                            step={step}
                                            isSelected={step._id === selectedStepId}
                                            onSelect={() => selectStep(step._id)}
                                        />
                                    ))}
                            </SortableContext>
                        </DndContext>
                    </div>
                </aside>

                {/* Center Panel - Screenshot & Annotations */}
                <main className="editor-main">
                    {selectedStep ? (
                        <AnnotationCanvas step={selectedStep} />
                    ) : (
                        <div className="no-step-selected">
                            <p>Select a step to edit</p>
                        </div>
                    )}
                </main>

                {/* Right Panel - Step Details */}
                <aside className="editor-details">
                    {selectedStep ? (
                        <StepDetails step={selectedStep} />
                    ) : (
                        <div className="no-step-selected">
                            <p>Select a step to view details</p>
                        </div>
                    )}
                </aside>
            </div>
        </div>
    )
}

export default Editor
