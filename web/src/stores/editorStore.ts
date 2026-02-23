import { create } from 'zustand'

export interface Annotation {
    id: string
    type: 'arrow' | 'rect' | 'text'
    x: number
    y: number
    width?: number
    height?: number
    color: string
    text?: string
    rotation?: number
    strokeWidth?: number
    fontSize?: number
    endX?: number
    endY?: number
    scaleX?: number
    scaleY?: number
}

export interface Step {
    _id: string
    order: number
    timestamp: string
    url: string
    title: string
    description: string
    screenshotUrl: string
    elementLabel: string
    selector: string
    elementTag: string
    clickX?: number
    clickY?: number
    annotations: Annotation[]
}

export interface Guide {
    _id: string
    title: string
    description: string
    userId: string
    shareId: string
    isPublic: boolean
    status: 'draft' | 'published' | 'archived'
    steps: Step[]
    coverImageUrl?: string
    viewCount: number
    createdAt: string
    updatedAt: string
}

interface EditorState {
    guide: Guide | null
    selectedStepId: string | null
    selectedAnnotationId: string | null
    isDirty: boolean
    isSaving: boolean
    annotationTool: 'select' | 'arrow' | 'rect' | 'text' | null
    annotationColor: string

    // Actions
    setGuide: (guide: Guide) => void
    selectStep: (stepId: string | null) => void
    selectAnnotation: (annotationId: string | null) => void
    setAnnotationTool: (tool: 'select' | 'arrow' | 'rect' | 'text' | null) => void
    setAnnotationColor: (color: string) => void
    updateGuide: (updates: Partial<Guide>) => void
    updateStep: (stepId: string, updates: Partial<Step>) => void
    addAnnotation: (stepId: string, annotation: Annotation) => void
    updateAnnotation: (stepId: string, annotationId: string, updates: Partial<Annotation>) => void
    deleteAnnotation: (stepId: string, annotationId: string) => void
    reorderSteps: (stepIds: string[]) => void
    deleteStep: (stepId: string) => void
    setIsSaving: (saving: boolean) => void
    setIsDirty: (dirty: boolean) => void
    reset: () => void
}

const initialState = {
    guide: null,
    selectedStepId: null,
    selectedAnnotationId: null,
    isDirty: false,
    isSaving: false,
    annotationTool: null as 'select' | 'arrow' | 'rect' | 'text' | null,
    annotationColor: '#ef4444',
}

export const useEditorStore = create<EditorState>((set, get) => ({
    ...initialState,

    setGuide: (guide) => {
        set({
            guide,
            selectedStepId: guide.steps[0]?._id || null,
            isDirty: false,
        })
    },

    selectStep: (stepId) => {
        set({ selectedStepId: stepId, selectedAnnotationId: null })
    },

    selectAnnotation: (annotationId) => {
        set({ selectedAnnotationId: annotationId })
    },

    setAnnotationTool: (tool) => {
        set({ annotationTool: tool, selectedAnnotationId: null })
    },

    setAnnotationColor: (color) => {
        set({ annotationColor: color })
    },

    updateGuide: (updates) => {
        const { guide } = get()
        if (!guide) return
        set({
            guide: { ...guide, ...updates },
            isDirty: true,
        })
    },

    updateStep: (stepId, updates) => {
        const { guide } = get()
        if (!guide) return
        set({
            guide: {
                ...guide,
                steps: guide.steps.map((step) =>
                    step._id === stepId ? { ...step, ...updates } : step
                ),
            },
            isDirty: true,
        })
    },

    addAnnotation: (stepId, annotation) => {
        const { guide } = get()
        if (!guide) return
        set({
            guide: {
                ...guide,
                steps: guide.steps.map((step) =>
                    step._id === stepId
                        ? { ...step, annotations: [...step.annotations, annotation] }
                        : step
                ),
            },
            isDirty: true,
            selectedAnnotationId: annotation.id,
        })
    },

    updateAnnotation: (stepId, annotationId, updates) => {
        const { guide } = get()
        if (!guide) return
        
        console.log('Updating annotation:', { stepId, annotationId, updates })
        
        set({
            guide: {
                ...guide,
                steps: guide.steps.map((step) =>
                    step._id === stepId
                        ? {
                            ...step,
                            annotations: step.annotations.map((ann) =>
                                ann.id === annotationId ? { ...ann, ...updates } : ann
                            ),
                        }
                        : step
                ),
            },
            isDirty: true,
        })
        
        console.log('isDirty set to true')
    },

    deleteAnnotation: (stepId, annotationId) => {
        const { guide, selectedAnnotationId } = get()
        if (!guide) return
        set({
            guide: {
                ...guide,
                steps: guide.steps.map((step) =>
                    step._id === stepId
                        ? {
                            ...step,
                            annotations: step.annotations.filter((ann) => ann.id !== annotationId),
                        }
                        : step
                ),
            },
            isDirty: true,
            selectedAnnotationId:
                selectedAnnotationId === annotationId ? null : selectedAnnotationId,
        })
    },

    reorderSteps: (stepIds) => {
        const { guide } = get()
        if (!guide) return

        const stepMap = new Map(guide.steps.map((step) => [step._id, step]))
        const reorderedSteps = stepIds
            .map((id, index) => {
                const step = stepMap.get(id)
                return step ? { ...step, order: index } : null
            })
            .filter((step): step is Step => step !== null)

        set({
            guide: { ...guide, steps: reorderedSteps },
            isDirty: true,
        })
    },

    deleteStep: (stepId) => {
        const { guide, selectedStepId } = get()
        if (!guide) return

        const newSteps = guide.steps
            .filter((step) => step._id !== stepId)
            .map((step, index) => ({ ...step, order: index }))

        let newSelectedId = selectedStepId
        if (selectedStepId === stepId) {
            const deletedIndex = guide.steps.findIndex((s) => s._id === stepId)
            const newIndex = Math.min(deletedIndex, newSteps.length - 1)
            newSelectedId = newSteps[newIndex]?._id || null
        }

        set({
            guide: { ...guide, steps: newSteps },
            selectedStepId: newSelectedId,
            isDirty: true,
        })
    },

    setIsSaving: (saving) => set({ isSaving: saving }),

    setIsDirty: (dirty) => set({ isDirty: dirty }),

    reset: () => set(initialState),
}))
