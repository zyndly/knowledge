//console.log

import { useEffect, useRef, useState, useCallback } from 'react'
import { fabric } from 'fabric'
import type { Step, Annotation } from '../../stores/editorStore'
import { useEditorStore } from '../../stores/editorStore'
import './AnnotationCanvas.css'

interface AnnotationCanvasProps {
    step: Step
}

function AnnotationCanvas({ step }: AnnotationCanvasProps) {
    console.log('AnnotationCanvas rendering')
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const fabricRef = useRef<fabric.Canvas | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [isLoading, setIsLoading] = useState(true)

    const {
        annotationTool,
        annotationColor,
        selectedAnnotationId,
        addAnnotation,
        updateAnnotation,
        selectAnnotation,
        setAnnotationTool,
    } = useEditorStore()

    // Initialize canvas
    useEffect(() => {
        if (!canvasRef.current) return

        const canvas = new fabric.Canvas(canvasRef.current, {
            selection: true,
            preserveObjectStacking: true,
        })

        fabricRef.current = canvas

        return () => {
            canvas.dispose()
        }
    }, [])

    // Setup event handlers separately
    useEffect(() => {
        const canvas = fabricRef.current
        if (!canvas) return

        // Handle selection
        const handleSelectionCreated = (e: any) => {
            console.log('handleSelectionCreated called', e)
            const obj = e.selected?.[0]
            if (obj?.data?.id) {
                selectAnnotation(obj.data.id)
            }
        }

        const handleSelectionCleared = () => {
            console.log('handleSelectionCleared called')
            selectAnnotation(null)
        }

        // Handle object modification
        const handleObjectModified = (e: any) => {
            console.log('handleObjectModified called', e)
            const obj = e.target
            if (!obj?.data?.id) return

            console.log('Object modified:', obj.type, obj.data?.type, obj.data.id)

            const updates: Partial<Annotation> = {
                x: obj.left || 0,
                y: obj.top || 0,
                rotation: obj.angle || 0,
            }

            // Handle rectangles
            if (obj.data?.type === 'rect') {
                updates.width = (obj.width || 0) * (obj.scaleX || 1)
                updates.height = (obj.height || 0) * (obj.scaleY || 1)
            }

            // Handle arrows (which are groups)
        if (obj.data?.type === 'arrow' && obj.type === 'group') {
            console.log('Arrow being resized:', {
                groupLeft: obj.left,
                groupTop: obj.top,
                groupScaleX: obj.scaleX,
                groupScaleY: obj.scaleY,
                originX: obj.originX,
                originY: obj.originY,
            });
            
            // For groups, we need to calculate the end position based on the group's transformation
            const items = obj.getObjects()
            if (items.length > 0) {
                const line = items[0] as fabric.Line
                
                console.log('Line properties:', {
                    x1: line.x1,
                    y1: line.y1,
                    x2: line.x2,
                    y2: line.y2,
                    lineLeft: line.left,
                    lineTop: line.top,
                });
                
                // Calculate actual end position considering group transformation
                const endX = (line.x2 || 0) * (obj.scaleX || 1) + (obj.left || 0)
                const endY = (line.y2 || 0) * (obj.scaleY || 1) + (obj.top || 0)
                
                console.log('Calculated end position:', { endX, endY });
                
                updates.endX = endX
                updates.endY = endY
            }
        }

            // Handle text
            if (obj.data?.type === 'text' && (obj.type === 'i-text' || obj.type === 'text')) {
                const textObj = obj as fabric.IText
                updates.text = textObj.text
                updates.fontSize = textObj.fontSize
                updates.scaleX = textObj.scaleX || 1
                updates.scaleY = textObj.scaleY || 1
            }

            console.log('Calling updateAnnotation with:', step._id, obj.data.id, updates)
            updateAnnotation(step._id, obj.data.id, updates)
        }

        // Handle text changes
        const handleTextChanged = (e: any) => {
            console.log('handleTextChanged called', e)
            const obj = e.target
            if (!obj?.data?.id) return

            console.log('Text changed:', obj.data.id)
            const textObj = obj as fabric.IText
            updateAnnotation(step._id, obj.data.id, {
                text: textObj.text,
            })
        }

        canvas.on('selection:created', handleSelectionCreated)
        canvas.on('selection:cleared', handleSelectionCleared)
        canvas.on('object:modified', handleObjectModified)
        canvas.on('text:changed', handleTextChanged)

        return () => {
            canvas.off('selection:created', handleSelectionCreated)
            canvas.off('selection:cleared', handleSelectionCleared)
            canvas.off('object:modified', handleObjectModified)
            canvas.off('text:changed', handleTextChanged)
        }
    }, [step._id, updateAnnotation, selectAnnotation])

    // Load screenshot
    useEffect(() => {
        const canvas = fabricRef.current
        if (!canvas) return

        setIsLoading(true)

        // Use proxy URL to bypass S3 CORS issues  
        const getProxiedUrl = (url: string) => {
            console.log('getProxiedUrl called with:', url)
            if (url.includes('s3.') && url.includes('amazonaws.com')) {
                // Single encode - browser will handle the rest
                return `/api/uploads/proxy/${encodeURIComponent(url)}`
            }
            return url
        }

        fabric.Image.fromURL(
            getProxiedUrl(step.screenshotUrl),
            (img) => {
                // Check if canvas still exists and is valid
                const currentCanvas = fabricRef.current
                if (!currentCanvas || !currentCanvas.getContext()) {
                    console.log('Canvas disposed or invalid before image loaded')
                    return
                }

                try {
                    currentCanvas.clear()
                } catch (err) {
                    console.error('Error clearing canvas:', err)
                    return
                }

                // Calculate scale to fit container
                const containerWidth = containerRef.current?.clientWidth || 800
                const containerHeight = containerRef.current?.clientHeight || 600
                const imgWidth = img.width || 800
                const imgHeight = img.height || 600

                const scale = Math.min(
                    containerWidth / imgWidth,
                    containerHeight / imgHeight,
                    1
                )

                canvas.setWidth(imgWidth * scale)
                canvas.setHeight(imgHeight * scale)
                canvas.setZoom(scale)

                img.set({
                    left: 0,
                    top: 0,
                    selectable: false,
                    evented: false,
                })

                canvas.add(img)
                canvas.sendToBack(img)

                // Add existing annotations
                step.annotations.forEach((ann) => {
                    const obj = createAnnotationObject(ann)
                    if (obj) {
                        canvas.add(obj)
                    }
                })

                canvas.renderAll()
                setIsLoading(false)
            },
            { crossOrigin: 'anonymous' }
        )
    }, [step._id, step.screenshotUrl])

    // Handle tool changes
    useEffect(() => {
        const canvas = fabricRef.current
        if (!canvas) return

        if (annotationTool === 'select' || !annotationTool) {
            canvas.isDrawingMode = false
            canvas.selection = true
            canvas.defaultCursor = 'default'
        } else {
            canvas.isDrawingMode = false
            canvas.selection = false
            canvas.defaultCursor = 'crosshair'
        }
    }, [annotationTool])

    // Create annotation object from data
    const createAnnotationObject = useCallback(
        (ann: Annotation): fabric.Object | null => {
            console.log('createAnnotationObject called with:', ann)
            let obj: fabric.Object | null = null

            switch (ann.type) {
                case 'rect':
                    obj = new fabric.Rect({
                        left: ann.x,
                        top: ann.y,
                        width: ann.width || 100,
                        height: ann.height || 60,
                        fill: 'transparent',
                        stroke: ann.color,
                        strokeWidth: ann.strokeWidth || 3,
                        rx: 4,
                        ry: 4,
                    })
                    break

                case 'arrow':
                    // Create arrow as a group with line and triangle
                    // Coordinates should be RELATIVE to the group, not absolute
                    const endX = ann.endX || ann.x + 100
                    const endY = ann.endY || ann.y
                    const lineEndX = endX - ann.x
                    const lineEndY = endY - ann.y
                    const line = new fabric.Line(
                        [0, 0, lineEndX, lineEndY],
                        {
                            stroke: ann.color,
                            strokeWidth: ann.strokeWidth || 3,
                            selectable: false,
                        }
                    )

                    const angle = Math.atan2(lineEndY, lineEndX)
                    const arrowHead = new fabric.Triangle({
                        left: lineEndX,
                        top: lineEndY,
                        fill: ann.color,
                        width: 16,
                        height: 16,
                        angle: (angle * 180) / Math.PI + 90,
                        originX: 'center',
                        originY: 'center',
                        selectable: false,
                    })

                    obj = new fabric.Group([line, arrowHead], {
                        left: ann.x,
                        top: ann.y,
                    })
                    break


                case 'text':
                    obj = new fabric.IText(ann.text || 'Text', {
                        left: ann.x,
                        top: ann.y,
                        fontFamily: 'Inter, sans-serif',
                        fontSize: ann.fontSize || 20,
                        fontWeight: 'bold',
                        fill: ann.color,
                        scaleX: ann.scaleX || 1,
                        scaleY: ann.scaleY || 1,
                        shadow: new fabric.Shadow({
                            color: 'rgba(0,0,0,0.5)',
                            blur: 3,
                            offsetX: 1,
                            offsetY: 1,
                        }),
                    })
                    break
            }

            if (obj) {
                obj.set({
                    data: { id: ann.id, type: ann.type },
                    angle: ann.rotation || 0,
                })
            }

            return obj
        },
        []
    )

    // Handle canvas click for adding annotations
    const handleCanvasClick = useCallback(
        (e: React.MouseEvent) => {
            console.log('handleCanvasClick called')
            if (!annotationTool || annotationTool === 'select') return

            const canvas = fabricRef.current
            if (!canvas) return

            const rect = canvasRef.current?.getBoundingClientRect()
            if (!rect) return

            const zoom = canvas.getZoom()
            const x = (e.clientX - rect.left) / zoom
            const y = (e.clientY - rect.top) / zoom

            const id = `ann-${Date.now()}`
            const annotation: Annotation = {
                id,
                type: annotationTool,
                x,
                y,
                color: annotationColor,
                width: annotationTool === 'rect' ? 120 : undefined,
                height: annotationTool === 'rect' ? 80 : undefined,
                endX: annotationTool === 'arrow' ? x + 100 : undefined,
                endY: annotationTool === 'arrow' ? y - 50 : undefined,
                text: annotationTool === 'text' ? 'Click here' : undefined,
                strokeWidth: 3,
                fontSize: 20,
            }

            // Add to canvas
            const obj = createAnnotationObject(annotation)
            if (obj) {
                canvas.add(obj)
                canvas.setActiveObject(obj)
                canvas.renderAll()
            }

            // Add to store
            addAnnotation(step._id, annotation)

            // Reset tool
            setAnnotationTool('select')
        },
        [annotationTool, annotationColor, step._id, addAnnotation, setAnnotationTool, createAnnotationObject]
    )

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            console.log('handleKeyDown called:', e.key)
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return
            }

            switch (e.key.toLowerCase()) {
                case 'v':
                    setAnnotationTool('select')
                    break
                case 'r':
                    setAnnotationTool('rect')
                    break
                case 'a':
                    setAnnotationTool('arrow')
                    break
                case 't':
                    setAnnotationTool('text')
                    break
                case 'delete':
                case 'backspace':
                    if (selectedAnnotationId) {
                        const canvas = fabricRef.current
                        const activeObj = canvas?.getActiveObject()
                        if (activeObj && activeObj.data?.id === selectedAnnotationId) {
                            canvas?.remove(activeObj)
                            canvas?.renderAll()
                        }
                        useEditorStore.getState().deleteAnnotation(step._id, selectedAnnotationId)
                    }
                    break
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [selectedAnnotationId, step._id])

    return (
        <div className="annotation-canvas-container" ref={containerRef}>
            {isLoading && (
                <div className="canvas-loading">
                    <div className="loading-spinner"></div>
                </div>
            )}
            <div
                className="canvas-wrapper"
                onClick={handleCanvasClick}
                style={{ cursor: annotationTool && annotationTool !== 'select' ? 'crosshair' : 'default' }}
            >
                <canvas ref={canvasRef} />
            </div>
            <div className="canvas-hint">
                {annotationTool === 'rect' && 'Click to add a rectangle highlight'}
                {annotationTool === 'arrow' && 'Click to add an arrow'}
                {annotationTool === 'text' && 'Click to add text'}
                {(!annotationTool || annotationTool === 'select') &&
                    'Select an annotation tool from the toolbar'}
            </div>
        </div>
    )
}

export default AnnotationCanvas
