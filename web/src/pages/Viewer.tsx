import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { guidesApi } from "../services/api";
import type { Guide, Step } from "../stores/editorStore";
import "./Viewer.css";

function Viewer() {
  const { shareId } = useParams<{ shareId: string }>();
  const [guide, setGuide] = useState<Guide | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Use proxy URL for S3 images to bypass CORS
  const getProxiedUrl = (url: string) => {
    if (url.includes("s3.") && url.includes("amazonaws.com")) {
      return `/api/uploads/proxy/${encodeURIComponent(url)}`;
    }
    return url;
  };

  useEffect(() => {
    if (shareId) {
      loadGuide(shareId);
    }
  }, [shareId]);

  const loadGuide = async (id: string) => {
    try {
      setIsLoading(true);
      const data = await guidesApi.getByShareId(id);
      console.log("Loaded guide:", data);
      console.log(
        "Steps with annotations:",
        data.steps.map((s: any) => ({
          id: s._id,
          title: s.title,
          annotations: s.annotations,
        })),
      );
      // Allow viewing - the API will handle permissions
      setGuide(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Guide not found");
    } finally {
      setIsLoading(false);
    }
  };

  const goToStep = (index: number) => {
    if (guide) {
      setCurrentStepIndex(Math.max(0, Math.min(index, guide.steps.length - 1)));
    }
  };

  const sortedSteps = guide?.steps.sort((a, b) => a.order - b.order) || [];
  const currentStep: Step | undefined = sortedSteps[currentStepIndex];
  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        goToStep(currentStepIndex - 1);
      } else if (e.key === "ArrowRight") {
        goToStep(currentStepIndex + 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentStepIndex, guide]);

  if (isLoading) {
    return (
      <div className="viewer-loading">
        <div className="loading-spinner"></div>
        <p>Loading guide...</p>
      </div>
    );
  }

  if (error || !guide) {
    return (
      <div className="viewer-error">
        <div className="error-icon">😕</div>
        <h1>{error || "Guide not found"}</h1>
        <p>The guide you're looking for doesn't exist or is not accessible.</p>
        <Link to="/" className="btn btn-primary">
          Go to GuideScribe
        </Link>
      </div>
    );
  }

  return (
    <div className="viewer">
      {/* Header */}
      <header className="viewer-header">
        <div className="header-left">
          <Link to="/" className="viewer-logo">
            <span className="logo-icon">📸</span>
            <span className="logo-text">GuideScribe</span>
          </Link>
        </div>
        <div className="header-center">
          <h1 className="guide-title">{guide.title}</h1>
        </div>
        <div className="header-right">
          <span className="step-indicator">
            Step {currentStepIndex + 1} of {sortedSteps.length}
          </span>
        </div>
      </header>

      {/* Progress bar */}
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{
            width: `${((currentStepIndex + 1) / sortedSteps.length) * 100}%`,
          }}
        />
      </div>

      {/* Main content */}
      <main className="viewer-main">
        <div className="viewer-layout">
          {/* Steps sidebar */}
          <aside className="viewer-sidebar">
            <h3 className="sidebar-title">Steps</h3>
            <nav className="steps-nav">
              {sortedSteps.map((step, index) => (
                <button
                  key={step._id}
                  className={`step-nav-item ${index === currentStepIndex ? "active" : ""}`}
                  onClick={() => goToStep(index)}
                >
                  <span className="step-nav-number">{index + 1}</span>
                  <span className="step-nav-title">
                    {step.title || step.elementLabel || `Step ${index + 1}`}
                  </span>
                </button>
              ))}
            </nav>
          </aside>

          {/* Step content */}
          <div className="step-content">
            {currentStep && (
              <>
                <div className="step-header">
                  <span className="step-number">
                    Step {currentStepIndex + 1}
                  </span>
                  <h2 className="step-title-viewer">
                    {currentStep.title ||
                      currentStep.elementLabel ||
                      `Step ${currentStepIndex + 1}`}
                  </h2>
                </div>

                <div className="screenshot-container">
                  <img
                    src={getProxiedUrl(currentStep.screenshotUrl)}
                    alt={`Step ${currentStepIndex + 1}`}
                    className="screenshot"
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      setImageDimensions({
                        width: img.naturalWidth,
                        height: img.naturalHeight,
                      });
                    }}
                  />

                  {imageDimensions && (
                    <svg
                      className="annotations-overlay"
                      viewBox={`0 0 ${imageDimensions.width} ${imageDimensions.height}`}
                      preserveAspectRatio="xMidYMid meet"
                    >
                      {currentStep.annotations.map((ann) => {
                        // ARROW
                        if (
                          ann.type === "arrow" &&
                          ann.endX !== undefined &&
                          ann.endY !== undefined
                        ) {
                          const dx = ann.endX - ann.x;
                          const dy = ann.endY - ann.y;
                          const angle = Math.atan2(dy, dx);
                          const arrowSize = 12;

                          return (
                            <g key={ann.id}>
                              <line
                                x1={ann.x}
                                y1={ann.y}
                                x2={ann.endX}
                                y2={ann.endY}
                                stroke={ann.color}
                                strokeWidth={ann.strokeWidth || 3}
                                strokeLinecap="round"
                              />
                              <polygon
                                points={`0,${-arrowSize / 2} ${arrowSize},0 0,${arrowSize / 2}`}
                                fill={ann.color}
                                transform={`translate(${ann.endX}, ${ann.endY}) rotate(${(angle * 180) / Math.PI})`}
                              />
                            </g>
                          );
                        }

                        // RECTANGLE
                        if (ann.type === "rect") {
                          return (
                            <rect
                              key={ann.id}
                              x={ann.x}
                              y={ann.y}
                              width={ann.width || 0}
                              height={ann.height || 0}
                              fill="transparent"
                              stroke={ann.color}
                              strokeWidth={ann.strokeWidth || 3}
                              transform={
                                ann.rotation
                                  ? `rotate(${ann.rotation}, ${ann.x}, ${ann.y})`
                                  : undefined
                              }
                            />
                          );
                        }

                        // TEXT
                        if (ann.type === "text") {
                          return (
                            <text
                              key={ann.id}
                              x={ann.x}
                              y={ann.y}
                              dy={-(ann.fontSize || 20) * 0.1}
                              fill={ann.color}
                              fontSize={ann.fontSize || 20}
                              fontWeight="bold"
                              dominantBaseline="text-before-edge"
                              textAnchor="start"
                              transform={
                                ann.rotation
                                  ? `rotate(${ann.rotation}, ${ann.x}, ${ann.y})`
                                  : undefined
                              }
                            >
                              {ann.text}
                            </text>
                          );
                        }
                        return null;
                      })}
                    </svg>
                  )}
                </div>

                {currentStep.description && (
                  <p className="step-description">{currentStep.description}</p>
                )}

                <div className="step-meta">
                  {currentStep.elementLabel && (
                    <span className="meta-item">
                      🎯 <strong>{currentStep.elementLabel}</strong>
                    </span>
                  )}
                </div>

                <div className="navigation-buttons">
                  <button
                    className="btn btn-secondary"
                    onClick={() => goToStep(currentStepIndex - 1)}
                    disabled={currentStepIndex === 0}
                  >
                    ← Previous
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => goToStep(currentStepIndex + 1)}
                    disabled={currentStepIndex === sortedSteps.length - 1}
                  >
                    Next →
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="viewer-footer">
        <p>
          Created with <Link to="/">GuideScribe</Link>
        </p>
      </footer>
    </div>
  );
}

export default Viewer;
