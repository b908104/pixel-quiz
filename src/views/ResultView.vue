<script setup>
import { computed, ref, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useQuizStore } from '@/stores/quiz'

const router = useRouter()
const store = useQuizStore()

const showReview = ref(false)
const aiMsg = ref('')

// Scratch Card State
const showScratchModal = ref(false)
const cardCanvas = ref(null)
const cardImage = ref(null)
const currentCardUrl = ref('')
const isRevealed = ref(false)

if (!store.gameResult) {
    router.push('/')
}

const result = computed(() => store.gameResult || { score: 0, passed: false, review: [], wrongQuestions: [] })
const canExpand = computed(() => result.value.wrongQuestions && result.value.wrongQuestions.length > 0)

const handleRetry = () => {
    router.push('/')
}

const handleAiExpand = async () => {
    aiMsg.value = 'Asking Pit Crew (AI)...'
    const res = await store.generateRemedialQuestions();
    if (res.success) {
        aiMsg.value = `ADDED ${res.count} NEW PRACTICE TRACKS!`
    } else {
        aiMsg.value = `PIT STOP ERROR: ${res.message || 'Unknown'}`
    }
}

// Scratch Card Logic
const openScratchCard = async () => {
    if (store.hasScratched) return;
    
    // Pick random card from 10001 to 10149
    // Update MAX_CARD_ID when you add more cards (e.g. 10150, 10151...)
    const MIN_CARD_ID = 10001;
    const MAX_CARD_ID = 10149;
    
    const randomNum = Math.floor(Math.random() * (MAX_CARD_ID - MIN_CARD_ID + 1)) + MIN_CARD_ID;
    currentCardUrl.value = `/pixel-quiz/BTS-Cards/${randomNum}.jpg`;
    
    showScratchModal.value = true;
    store.markScratched();
    
    await nextTick();
    initCanvas();
}

const initCanvas = () => {
    const canvas = cardCanvas.value;
    const ctx = canvas.getContext('2d');
    const width = canvas.width = 300;
    const height = canvas.height = 300;
    
    // Fill with silver scratch layer
    ctx.fillStyle = '#C0C0C0';
    ctx.fillRect(0, 0, width, height);
    
    // Add text "SCRATCH ME!"
    ctx.fillStyle = '#000';
    ctx.font = '24px "Press Start 2P", cursive';
    
    let isDrawing = false;
    
    const getPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
        const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
        return { x, y };
    }
    
    const scratch = (x, y) => {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.fill();
        checkReveal(ctx, width, height);
    }
    
    const startDraw = (e) => {
        isDrawing = true;
        const { x, y } = getPos(e);
        scratch(x, y);
    }
    
    const stopDraw = () => isDrawing = false;
    
    const moveDraw = (e) => {
        if (!isDrawing) return;
        e.preventDefault(); // Prevent scroll on touch
        const { x, y } = getPos(e);
        scratch(x, y);
    }
    
    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', moveDraw);
    canvas.addEventListener('mouseup', stopDraw);
    canvas.addEventListener('mouseleave', stopDraw);
    
    canvas.addEventListener('touchstart', startDraw);
    canvas.addEventListener('touchmove', moveDraw);
    canvas.addEventListener('touchend', stopDraw);
}

const checkReveal = (ctx, width, height) => {
    if (isRevealed.value) return;
    
    // Check pixel data
    // Sample every 10th pixel for performance
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;
    let transparent = 0;
    const total = pixels.length / 4;
    
    for (let i = 0; i < total; i += 10) {
        if (pixels[i * 4 + 3] === 0) {
            transparent++;
        }
    }
    
    if (transparent > (total / 10) * 0.5) { // 50% scratched
        isRevealed.value = true;
        
        // Clear entire canvas
        ctx.clearRect(0, 0, width, height);
    }
}

const closeScratch = () => {
    showScratchModal.value = false;
}

onMounted(() => {
    if (canExpand.value) {
        handleAiExpand()
    }
})
</script>

<template>
<div class="result-container">
    <h1 class="blink rank-title">{{ result.passed ? '1st PLACE!' : 'GAME OVER' }}</h1>
    
    <div class="trophy-stage" :class="{ 'gold': result.passed, 'shame': !result.passed }">
        <div class="score-label">FINAL SCORE</div>
        <div class="score-value">{{ result.score }}</div>
        
        <div class="status-badge">
            {{ result.passed ? '棒，通過測試!!' : '再接再勵!!' }}
        </div>
        
        <div class="stats">
            <p>CORRECT LAPS: {{ result.correctCount }} / {{ result.total }}</p>
        </div>
        
        <!-- Toggle Review -->
        <button class="pixel-btn secondary small-btn" @click="showReview = !showReview">
            {{ showReview ? '關閉答案' : '檢視答案' }}
        </button>
        
        <!-- Lucky Draw Button (Only if passed and not scratched yet) -->
        <button 
            v-if="result.passed && !store.hasScratched" 
            class="pixel-btn primary small-btn bounce" 
            style="background: #FFD700; color: #000; margin-top: 10px;"
            @click="openScratchCard"
        >
            🎁 領取通關獎勵 (抽小卡)
        </button>
        <div v-if="store.hasScratched && !showScratchModal" style="margin-top: 10px; font-size: 0.8rem; color: var(--mk-green);">
           ✨ 獎勵已領取 ✨
        </div>
        
        <!-- AI Expansion -->
        <div v-if="canExpand" class="ai-section">
            <p class="ai-status" v-if="store.isLoading">🏎️ PIT CREW IS ANALYZING YOUR RACE... (Generating Questions)</p>
            <p v-if="aiMsg" class="ai-msg">{{ aiMsg }}</p>
        </div>
    </div>

    <!-- Review List -->
    <div v-if="showReview" class="review-box pixel-box">
        <h3>檢視答案</h3>
        <div v-for="item in result.review" :key="item.id" class="review-item" :class="{ 'correct': item.isCorrect, 'wrong': !item.isCorrect }">
            <div class="q-row">
                <span class="q-text">
                    <span v-if="item.wrongCount >= 2" class="fail-count-badge">粗心 {{ item.wrongCount }} 次</span>
                    {{ item.text }}
                </span>
                <span class="status-icon">{{ item.isCorrect ? '✔' : '✘' }}</span>
            </div>
            <div class="ans-row">
                <div class="ans-block u-ans">
                    <span class="ans-label">你的答案:</span>
                    <span class="ans-val">{{ item.userAnswer }} <small v-if="item.userAnswerText">({{ item.userAnswerText }})</small></span>
                </div>
                <div class="ans-block c-ans" v-if="!item.isCorrect">
                    <span class="ans-label">正確答案:</span>
                    <span class="ans-val">{{ item.correctAnswer }} <small v-if="item.correctAnswerText">({{ item.correctAnswerText }})</small></span>
                </div>
            </div>
            <!-- Explanation Section -->
            <div class="explanation-box" v-if="item.explanation && !item.isCorrect">
                <span class="exp-label">💡 解析:</span>
                <p class="exp-text">{{ item.explanation }}</p>
            </div>
        </div>
    </div>
    
    <button class="pixel-btn primary" @click="handleRetry">
        重新測驗
    </button>
    
    <!-- Scratch Card Modal -->
    <div v-if="showScratchModal" class="modal-overlay">
        <div class="modal-content pixel-box">
            <h3>🎊 恭禧!!刮開小卡領取獎勵 🎊</h3>
            
            <div class="scratch-container">
                <img :src="currentCardUrl" class="card-img" />
                <canvas ref="cardCanvas" class="scratch-canvas"></canvas>
            </div>
            
            <button class="pixel-btn secondary small-btn" @click="closeScratch" style="margin-top: 15px;">
                關閉
            </button>
        </div>
    </div>
</div>
</template>

<style scoped>
.result-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    width: 100%;
    animation: slideUp 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    padding-bottom: 50px;
}

@keyframes slideUp {
    from { transform: translateY(100px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
}

.rank-title {
    font-size: 3rem;
    color: var(--mk-yellow);
    text-shadow: 4px 4px 0 var(--mk-black);
    font-style: italic;
    transform: skew(-10deg);
}

.trophy-stage {
    background: rgba(255,255,255,0.9);
    border: 6px solid var(--mk-black);
    border-radius: 20px;
    padding: 30px;
    text-align: center;
    position: relative;
    box-shadow: 0 10px 0 rgba(0,0,0,0.5);
    width: 90%;
    max-width: 400px;
}

.trophy-stage.gold {
    border-color: var(--mk-yellow);
    box-shadow: 0 0 50px rgba(255, 215, 0, 0.5);
}

.trophy-stage.shame {
    border-color: var(--mk-blue);
    filter: grayscale(0.2);
}

.score-label {
    font-size: 1rem;
    color: var(--mk-black);
    font-weight: bold;
    margin-bottom: 0.5rem;
}

.score-value {
    font-size: 5rem;
    margin-bottom: 1rem;
    color: var(--mk-red);
    text-shadow: 2px 2px 0 var(--mk-black);
}

.gold .score-value { color: var(--mk-yellow); text-shadow: 3px 3px 0 var(--mk-black); }

.status-badge {
    display: inline-block;
    font-size: 1.2rem;
    padding: 8px 16px;
    background: var(--mk-black);
    color: #fff;
    border-radius: 8px;
    margin-bottom: 20px;
    transform: skew(-10deg);
}

.stats {
    color: var(--mk-black);
    font-size: 0.9rem;
    font-weight: bold;
    margin-bottom: 1rem;
}

.small-btn {
    font-size: 0.8rem;
    padding: 10px 15px;
    margin: 5px;
}

.ai-section {
    margin-top: 10px;
    border-top: 2px dashed #ccc;
    padding-top: 10px;
}

.ai-status {
    font-size: 0.8rem;
    color: var(--mk-blue);
    font-weight: bold;
    animation: blink 2s infinite;
}

.ai-msg {
    font-size: 0.7rem;
    color: var(--mk-black);
    margin-top: 5px;
    font-weight: bold;
    background: #fff;
    padding: 2px;
}

/* Review Box */
.review-box {
    width: 80%;
    max-width: 1200px;
    max-height: 400px;
    overflow-y: auto;
    background: #fff;
    border: 4px solid var(--mk-black);
    padding: 10px;
}

.review-box h3 {
    text-align: center;
    margin-top: 0;
    color: var(--mk-red);
    font-style: italic;
    border-bottom: 2px solid #ccc;
    padding-bottom: 5px;
}

.review-item {
    border-bottom: 1px solid #eee;
    padding: 8px;
    text-align: left;
}

.review-item.correct { background: rgba(0, 255, 0, 0.1); }
.review-item.wrong { background: rgba(255, 0, 0, 0.1); }

.q-row {
    display: flex;
    justify-content: space-between;
    font-weight: bold;
    margin-bottom: 4px;
    font-size: 0.9rem;
}

.fail-count-badge {
    background: var(--mk-red);
    color: #fff;
    font-size: 0.7rem;
    padding: 2px 4px;
    border-radius: 4px;
    margin-right: 5px;
    vertical-align: middle;
}

.ans-row {
    font-size: 0.8rem;
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin-top: 5px;
}

.explanation-box {
    margin-top: 8px;
    background: rgba(255, 255, 0, 0.2);
    padding: 5px;
    border-left: 3px solid var(--mk-yellow);
    font-size: 0.8rem;
}

.exp-label {
    font-weight: bold;
    color: #555;
    display: block;
    margin-bottom: 2px;
}

.exp-text {
    margin: 0;
    color: #333;
}

.ans-block {
    display: flex;
    gap: 5px;
}

.ans-label {
    font-weight: bold;
    min-width: 40px;
}

.ans-val small {
    opacity: 0.8;
    font-size: 0.75rem;
    font-weight: normal;
}

.u-ans { color: var(--mk-black); }
.c-ans { color: var(--mk-green); font-weight: bold; }
.review-item.wrong .u-ans { color: var(--mk-red); text-decoration: line-through; }

/* Scratch Card Modal */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 999;
}

.modal-content {
    background: #fff;
    padding: 20px;
    text-align: center;
    border: 4px solid var(--mk-black);
    max-width: 90%;
}

.scratch-container {
    position: relative;
    width: 300px;
    height: 300px;
    margin: 0 auto;
    border: 4px solid #000;
}

.card-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    position: absolute;
    top: 0;
    left: 0;
}

.scratch-canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="gray" stroke="black"/></svg>') 12 12, auto;
}
</style>
