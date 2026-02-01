import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { customAlphabet } from 'nanoid';
import { Guide, GuideDocument } from './schemas/guide.schema';
import { CreateGuideDto, UpdateGuideDto } from './dto/guide.dto';
import {
    CreateStepDto,
    UpdateStepDto,
    ReorderStepsDto,
    BulkCreateStepsDto,
} from './dto/step.dto';
import { UploadsService } from '../uploads/uploads.service';

// Generate short, URL-safe IDs for sharing
const generateShareId = customAlphabet(
    '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
    10,
);

@Injectable()
export class GuidesService {
    private readonly logger = new Logger(GuidesService.name);

    constructor(
        @InjectModel(Guide.name) private guideModel: Model<GuideDocument>,
        private uploadsService: UploadsService,
    ) { }

    // ============ GUIDE OPERATIONS ============

    async create(
        userId: string,
        createGuideDto: CreateGuideDto,
    ): Promise<GuideDocument> {
        const guide = new this.guideModel({
            ...createGuideDto,
            userId: new Types.ObjectId(userId),
            shareId: generateShareId(),
        });
        return guide.save();
    }

    async findAllByUser(userId: string): Promise<GuideDocument[]> {
        return this.guideModel
            .find({ userId: new Types.ObjectId(userId) })
            .sort({ createdAt: -1 })
            .exec();
    }

    async findById(guideId: string, userId?: string): Promise<GuideDocument> {
        const guide = await this.guideModel.findById(guideId).exec();
        if (!guide) {
            throw new NotFoundException('Guide not found');
        }

        // Check access if userId provided
        if (userId && !guide.isPublic && guide.userId.toString() !== userId) {
            throw new ForbiddenException('You do not have access to this guide');
        }

        return guide;
    }

    async findByShareId(shareId: string, userId?: string): Promise<GuideDocument> {
        const guide = await this.guideModel.findOne({ shareId }).exec();
        if (!guide) {
            throw new NotFoundException('Guide not found');
        }

        // Allow access if guide is public OR if user is the owner
        if (!guide.isPublic && (!userId || guide.userId.toString() !== userId)) {
            throw new ForbiddenException('This guide is private');
        }

        // Increment view count for public guides
        if (guide.isPublic) {
            guide.viewCount += 1;
            await guide.save();
        }

        return guide;
    }

    async update(
        guideId: string,
        userId: string,
        updateGuideDto: UpdateGuideDto,
    ): Promise<GuideDocument> {
        const guide = await this.findById(guideId);
        this.verifyOwnership(guide, userId);

        Object.assign(guide, updateGuideDto);
        return guide.save();
    }

    async delete(guideId: string, userId: string): Promise<void> {
        const guide = await this.findById(guideId);
        this.verifyOwnership(guide, userId);

        // Delete all screenshots from S3
        for (const step of guide.steps) {
            if (step.screenshotUrl) {
                await this.uploadsService.deleteFile(step.screenshotUrl);
            }
        }

        await this.guideModel.findByIdAndDelete(guideId).exec();
    }

    // ============ STEP OPERATIONS ============

    async addStep(
        guideId: string,
        userId: string,
        createStepDto: CreateStepDto,
    ): Promise<GuideDocument> {
        const guide = await this.findById(guideId);
        this.verifyOwnership(guide, userId);

        // Upload screenshot to S3
        const screenshotUrl = await this.uploadsService.uploadBase64Image(
            createStepDto.screenshotData,
            `guides/${guideId}/steps`,
        );

        const newStep = {
            _id: new Types.ObjectId(),
            order: guide.steps.length,
            timestamp: createStepDto.timestamp
                ? new Date(createStepDto.timestamp)
                : new Date(),
            url: createStepDto.url,
            title: createStepDto.title || '',
            description: createStepDto.description || '',
            screenshotUrl,
            elementLabel: createStepDto.elementLabel || '',
            selector: createStepDto.selector || '',
            elementTag: createStepDto.elementTag || '',
            clickX: createStepDto.clickX,
            clickY: createStepDto.clickY,
            annotations: [],
        };

        guide.steps.push(newStep);

        // Set first screenshot as cover if none exists
        if (!guide.coverImageUrl && guide.steps.length === 1) {
            guide.coverImageUrl = screenshotUrl;
        }

        return guide.save();
    }

    async addBulkSteps(
        guideId: string,
        userId: string,
        bulkDto: BulkCreateStepsDto,
    ): Promise<GuideDocument> {
        const guide = await this.findById(guideId);
        this.verifyOwnership(guide, userId);

        let order = guide.steps.length;

        for (const stepDto of bulkDto.steps) {
            const screenshotUrl = await this.uploadsService.uploadBase64Image(
                stepDto.screenshotData,
                `guides/${guideId}/steps`,
            );

            guide.steps.push({
                _id: new Types.ObjectId(),
                order: order++,
                timestamp: stepDto.timestamp ? new Date(stepDto.timestamp) : new Date(),
                url: stepDto.url,
                title: stepDto.title || '',
                description: stepDto.description || '',
                screenshotUrl,
                elementLabel: stepDto.elementLabel || '',
                selector: stepDto.selector || '',
                elementTag: stepDto.elementTag || '',
                clickX: stepDto.clickX,
                clickY: stepDto.clickY,
                annotations: [],
            });
        }

        // Set cover image
        if (!guide.coverImageUrl && guide.steps.length > 0) {
            guide.coverImageUrl = guide.steps[0].screenshotUrl;
        }

        return guide.save();
    }

    async updateStep(
        guideId: string,
        stepId: string,
        userId: string,
        updateStepDto: UpdateStepDto,
    ): Promise<GuideDocument> {
        const guide = await this.findById(guideId);
        this.verifyOwnership(guide, userId);

        this.logger.log(`Updating step ${stepId} in guide ${guideId}`);
        this.logger.log(`Available step IDs: ${guide.steps.map(s => s._id.toString()).join(', ')}`);

        const step = guide.steps.find((s) => s._id.toString() === stepId);
        if (!step) {
            this.logger.error(`Step ${stepId} not found in guide ${guideId}`);
            throw new NotFoundException('Step not found');
        }

        Object.assign(step, updateStepDto);
        return guide.save();
    }

    async deleteStep(
        guideId: string,
        stepId: string,
        userId: string,
    ): Promise<GuideDocument> {
        const guide = await this.findById(guideId);
        this.verifyOwnership(guide, userId);

        const stepIndex = guide.steps.findIndex((s) => s._id.toString() === stepId);
        if (stepIndex === -1) {
            throw new NotFoundException('Step not found');
        }

        // Delete screenshot from S3
        const step = guide.steps[stepIndex];
        if (step.screenshotUrl) {
            await this.uploadsService.deleteFile(step.screenshotUrl);
        }

        // Remove step and reorder remaining
        guide.steps.splice(stepIndex, 1);
        guide.steps.forEach((s, index) => {
            s.order = index;
        });

        return guide.save();
    }

    async reorderSteps(
        guideId: string,
        userId: string,
        reorderDto: ReorderStepsDto,
    ): Promise<GuideDocument> {
        const guide = await this.findById(guideId);
        this.verifyOwnership(guide, userId);

        // Validate all step IDs exist
        const stepMap = new Map(
            guide.steps.map((step) => [step._id.toString(), step]),
        );
        for (const stepId of reorderDto.stepIds) {
            if (!stepMap.has(stepId)) {
                throw new NotFoundException(`Step ${stepId} not found`);
            }
        }

        // Reorder steps
        guide.steps = reorderDto.stepIds.map((stepId, index) => {
            const step = stepMap.get(stepId)!;
            step.order = index;
            return step;
        });

        return guide.save();
    }

    // ============ EXPORT ============

    async exportAsHtml(guideId: string, userId?: string): Promise<string> {
        const guide = await this.findById(guideId, userId);

        // Check access for private guides
        if (!guide.isPublic && userId && guide.userId.toString() !== userId) {
            throw new ForbiddenException('You do not have access to this guide');
        }

        return this.generateHtmlExport(guide);
    }

    // ============ HELPERS ============

    private verifyOwnership(guide: GuideDocument, userId: string): void {
        if (guide.userId.toString() !== userId) {
            throw new ForbiddenException('You do not own this guide');
        }
    }

    private generateHtmlExport(guide: GuideDocument): string {
        const stepsHtml = guide.steps
            .sort((a, b) => a.order - b.order)
            .map(
                (step, index) => `
        <div class="step" data-step="${index + 1}">
          <div class="step-header">
            <span class="step-number">${index + 1}</span>
            <h3 class="step-title">${this.escapeHtml(step.title || `Step ${index + 1}`)}</h3>
          </div>
          <div class="step-content">
            <div class="screenshot-container">
              <img src="${step.screenshotUrl}" alt="Step ${index + 1}" class="screenshot" />
              ${this.renderAnnotations(step.annotations)}
            </div>
            ${step.description ? `<p class="step-description">${this.escapeHtml(step.description)}</p>` : ''}
            <div class="step-meta">
              ${step.elementLabel ? `<span class="element-label">📌 ${this.escapeHtml(step.elementLabel)}</span>` : ''}
              <span class="step-url">🔗 ${this.escapeHtml(step.url)}</span>
            </div>
          </div>
        </div>
      `,
            )
            .join('\n');

        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(guide.title)} - GuideScribe</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #e4e4e7;
      min-height: 100vh;
      line-height: 1.6;
    }
    .container { max-width: 900px; margin: 0 auto; padding: 2rem; }
    .guide-header {
      text-align: center;
      margin-bottom: 3rem;
      padding: 2rem;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      backdrop-filter: blur(10px);
    }
    .guide-title {
      font-size: 2.5rem;
      font-weight: 700;
      background: linear-gradient(90deg, #00d4ff, #7c3aed);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 0.5rem;
    }
    .guide-description { color: #a1a1aa; font-size: 1.1rem; }
    .steps-nav {
      display: flex;
      gap: 0.5rem;
      justify-content: center;
      flex-wrap: wrap;
      margin-bottom: 2rem;
    }
    .nav-btn {
      padding: 0.5rem 1rem;
      border: none;
      background: rgba(255, 255, 255, 0.1);
      color: #e4e4e7;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .nav-btn:hover, .nav-btn.active {
      background: linear-gradient(90deg, #00d4ff, #7c3aed);
      color: white;
    }
    .step {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      padding: 1.5rem;
      margin-bottom: 2rem;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      display: none;
    }
    .step.active { display: block; animation: fadeIn 0.3s ease; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .step-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .step-number {
      width: 40px;
      height: 40px;
      background: linear-gradient(90deg, #00d4ff, #7c3aed);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 1.2rem;
    }
    .step-title { font-size: 1.3rem; font-weight: 600; }
    .screenshot-container {
      position: relative;
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 1rem;
    }
    .screenshot {
      width: 100%;
      height: auto;
      display: block;
    }
    .step-description {
      color: #a1a1aa;
      margin-bottom: 1rem;
    }
    .step-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      font-size: 0.9rem;
      color: #71717a;
    }
    .pagination {
      display: flex;
      justify-content: center;
      gap: 1rem;
      margin-top: 2rem;
    }
    .pagination button {
      padding: 0.75rem 1.5rem;
      border: none;
      background: linear-gradient(90deg, #00d4ff, #7c3aed);
      color: white;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .pagination button:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 20px rgba(0, 212, 255, 0.3);
    }
    .pagination button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }
    .annotation {
      position: absolute;
      pointer-events: none;
    }
    .annotation.rect {
      border: 3px solid;
      border-radius: 4px;
    }
    .annotation.text {
      font-weight: bold;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
    }
    .progress-bar {
      height: 4px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      margin-bottom: 2rem;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #00d4ff, #7c3aed);
      transition: width 0.3s ease;
    }
    .footer {
      text-align: center;
      margin-top: 3rem;
      padding: 1rem;
      color: #71717a;
      font-size: 0.9rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="guide-header">
      <h1 class="guide-title">${this.escapeHtml(guide.title)}</h1>
      ${guide.description ? `<p class="guide-description">${this.escapeHtml(guide.description)}</p>` : ''}
      <p style="color: #71717a; margin-top: 1rem;">${guide.steps.length} steps</p>
    </header>

    <div class="progress-bar">
      <div class="progress-fill" id="progress" style="width: ${100 / guide.steps.length}%"></div>
    </div>

    <nav class="steps-nav" id="stepsNav">
      ${guide.steps.map((_, i) => `<button class="nav-btn${i === 0 ? ' active' : ''}" data-step="${i + 1}">${i + 1}</button>`).join('')}
    </nav>

    <main id="stepsContainer">
      ${stepsHtml}
    </main>

    <div class="pagination">
      <button id="prevBtn" disabled>← Previous</button>
      <button id="nextBtn">Next →</button>
    </div>

    <footer class="footer">
      Created with GuideScribe
    </footer>
  </div>

  <script>
    (function() {
      const steps = document.querySelectorAll('.step');
      const navBtns = document.querySelectorAll('.nav-btn');
      const prevBtn = document.getElementById('prevBtn');
      const nextBtn = document.getElementById('nextBtn');
      const progress = document.getElementById('progress');
      let currentStep = 1;
      const totalSteps = steps.length;

      function showStep(n) {
        currentStep = Math.max(1, Math.min(n, totalSteps));
        steps.forEach((step, i) => {
          step.classList.toggle('active', i + 1 === currentStep);
        });
        navBtns.forEach((btn, i) => {
          btn.classList.toggle('active', i + 1 === currentStep);
        });
        prevBtn.disabled = currentStep === 1;
        nextBtn.disabled = currentStep === totalSteps;
        progress.style.width = (currentStep / totalSteps * 100) + '%';
      }

      prevBtn.addEventListener('click', () => showStep(currentStep - 1));
      nextBtn.addEventListener('click', () => showStep(currentStep + 1));
      navBtns.forEach(btn => {
        btn.addEventListener('click', () => showStep(parseInt(btn.dataset.step)));
      });

      // Keyboard navigation
      document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') showStep(currentStep - 1);
        if (e.key === 'ArrowRight') showStep(currentStep + 1);
      });

      showStep(1);
    })();
  </script>
</body>
</html>`;
    }

    private renderAnnotations(annotations: any[]): string {
        if (!annotations || annotations.length === 0) return '';

        return annotations
            .map((ann) => {
                const style = `left:${ann.x}px;top:${ann.y}px;color:${ann.color};`;

                switch (ann.type) {
                    case 'rect':
                        return `<div class="annotation rect" style="${style}width:${ann.width}px;height:${ann.height}px;border-color:${ann.color};"></div>`;
                    case 'text':
                        return `<div class="annotation text" style="${style}font-size:${ann.fontSize || 16}px;">${this.escapeHtml(ann.text || '')}</div>`;
                    case 'arrow':
                        // SVG arrow would be rendered here in a full implementation
                        return '';
                    default:
                        return '';
                }
            })
            .join('');
    }

    private escapeHtml(text: string): string {
        const map: Record<string, string> = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;',
        };
        return text.replace(/[&<>"']/g, (c) => map[c]);
    }
}
