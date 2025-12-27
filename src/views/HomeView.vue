<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useQuizStore } from '@/stores/quiz'

const router = useRouter()
const store = useQuizStore()
const userId = ref('')
const subject = ref('歷史')
const questionCount = ref(10)
const error = ref('')

// Card Gallery State
const showGallery = ref(false)
const MIN_CARD_ID = 10001;
const MAX_CARD_ID = 10156;

const allCards = computed(() => {
    const cards = [];
    for (let i = MIN_CARD_ID; i <= MAX_CARD_ID; i++) {
        const isOwned = store.collectedCards.includes(i);
        cards.push({
            id: i,
            url: isOwned ? `/pixel-quiz/BTS-Cards/${i}.jpg` : '/pixel-quiz/BTS-Cards/BTS_Back.jpg',
            owned: isOwned
        });
    }
    return cards;
})

const toggleGallery = async () => {
    if (!showGallery.value && userId.value) {
        // Opening: Fetch User's Collection FIRST
        // Add loading state if you want, but await is simple for now
        await store.fetchUserCards(userId.value);
    }
    showGallery.value = !showGallery.value;
}

onMounted(() => {
    // Load last player ID
    const savedId = localStorage.getItem('pixel_quiz_player_id');
    if (savedId) {
        userId.value = savedId;
    }
})

const handleStart = async () => {
    if (!userId.value.trim()) {
        error.value = 'PLEASE ENTER PLAYER ID'
        return
    }
    
    // Save Player ID
    localStorage.setItem('pixel_quiz_player_id', userId.value);
    
    // Store handles fetching.
    const success = await store.startGame(userId.value, subject.value, questionCount.value)
    if (success) {
        router.push('/game')
    } else {
        error.value = store.error || 'CONNECTION FAILED'
    }
}
</script>

<template>
<div class="home-container">
    <div class="logo-area bounce">
        <h1 class="title-text">MARIO KART</h1>
        <h2 class="subtitle-text">QUIZ GP</h2>
    </div>
    
    <div class="pixel-box intro-box">
        <p class="label-text">輸入玩家 ID</p>
        <input 
            v-model="userId" 
            type="text" 
            class="pixel-input" 
            placeholder="PLAYER 1" 
        />
        
        <div class="settings-row">
            <div class="setting-group">
                <p class="label-text">科目</p>
                <select v-model="subject" class="pixel-input">
                    <option value="歷史">歷史</option>
                    <option value="地理">地理</option>
                    <option value="公民">公民</option>
                </select>
            </div>
            
            <div class="setting-group">
                <p class="label-text">題數</p>
                <select v-model="questionCount" class="pixel-input">
                    <option :value="10">10</option>
                    <option :value="20">20</option>
                    <option :value="50">50</option>
                </select>
            </div>
        </div>
        
        <p v-if="error" class="error-msg">{{ error }}</p>
        
        <div style="text-align: center; margin-top: 20px; display: flex; flex-direction: column; gap: 10px;">
            <button 
                class="pixel-btn primary" 
                @click="handleStart" 
                :disabled="store.isLoading"
            >
                {{ store.isLoading ? 'Starting Engine...' : '開始作答' }}
            </button>
            
             <button 
                class="pixel-btn secondary" 
                @click="toggleGallery"
                style="font-size: 0.8rem;"
            >
                🎴 全部小卡
            </button>
        </div>
    </div>
    
    <div class="footer-credits">
        © 2025 PIXEL CUP
    </div>
    
    <!-- Gallery Modal -->
    <div v-if="showGallery" class="gallery-overlay">
        <div class="gallery-container">
            <h2 class="gallery-title">收集小卡</h2>
            <div class="gallery-grid">
                <div v-for="card in allCards" :key="card.id" class="card-item" :class="{ 'unowned': !card.owned }">
                     <span class="card-id">#{{ card.id }}</span>
                     <div class="card-img-wrapper">
                        <img :src="card.url" loading="lazy" />
                     </div>
                </div>
            </div>
            <button class="pixel-btn primary close-btn" @click="toggleGallery">
                關閉
            </button>
        </div>
    </div>
</div>
</template>

<style scoped>
.home-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    width: 100%;
}

.logo-area {
    text-align: center;
    margin-bottom: 1rem;
}

.title-text {
    font-size: 4.5rem;
    font-family: var(--font-race);
    color: var(--mk-red);
    text-shadow: 
        4px 4px 0px #fff,
        8px 8px 0px var(--mk-black);
    margin: 0;
    font-style: italic;
    transform: skew(-10deg);
}

.subtitle-text {
    font-size: 2.5rem;
    font-family: var(--font-race);
    color: var(--mk-orange);
    text-shadow: 
        3px 3px 0px #fff,
        6px 6px 0px var(--mk-black);
    margin: 5px 0 0 0;
    font-style: italic;
    transform: skew(-10deg);
}

.intro-box {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 16px;
    max-width: 500px;
}

.label-text {
    font-size: 0.8rem;
    color: var(--mk-black);
    text-transform: uppercase;
    margin-bottom: 0.5rem;
    font-weight: bold;
}

.error-msg {
    color: var(--mk-red);
    margin-bottom: 1rem;
    background: #ffe6e6;
    padding: 10px;
    border-radius: 4px;
    border: 2px solid var(--mk-red);
}

.footer-credits {
    margin-top: 2rem;
    color: #fff;
    font-size: 0.8rem;
    text-shadow: 2px 2px 0 #000;
}

.settings-row {
    display: flex;
    gap: 15px;
    margin-top: 15px;
}

.setting-group {
    flex: 1;
}

.pixel-input option {
    color: #000;
}

/* Gallery Styles */
.gallery-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    z-index: 1000;
    display: flex;
    justify-content: center;
    padding: 20px;
    overflow: hidden;
}

.gallery-container {
    background: #fff;
    width: 100%;
    max-width: 1400px; /* Large width for 10 cols */
    height: 100%;
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    padding: 20px;
    border: 4px solid var(--mk-yellow);
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
}

.gallery-title {
    text-align: center;
    color: var(--mk-black);
    font-style: italic;
    margin-top: 0;
    margin-bottom: 20px;
    border-bottom: 4px solid var(--mk-black);
    padding-bottom: 10px;
}

.gallery-grid {
    flex: 1;
    overflow-y: auto;
    display: grid;
    /* Desktop: 10 columns */
    grid-template-columns: repeat(10, 1fr); 
    gap: 10px;
    padding: 10px;
    background: #eee;
    border: 2px inset #ccc;
}

/* Responsive Grid */
@media (max-width: 1200px) {
    .gallery-grid { grid-template-columns: repeat(6, 1fr); }
}
@media (max-width: 768px) {
    .gallery-grid { grid-template-columns: repeat(4, 1fr); }
}
@media (max-width: 480px) {
    .gallery-grid { grid-template-columns: repeat(3, 1fr); }
}

.card-item {
    background: #fff;
    border: 2px solid #000;
    padding: 5px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.card-id {
    font-size: 0.7rem;
    font-weight: bold;
    margin-bottom: 2px;
    color: #555;
    background: #ddd;
    width: 100%;
    display: block;
}

.card-img-wrapper {
    width: 100%;
    aspect-ratio: 1/1; /* Square cards */
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    background: #ccc;
}

.card-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.2s;
}

/* Unowned cards show back, no need for grayscale */
.card-item.unowned img {
    /* Optional: maybe slightly dim to show it's locked? */
    /* opacity: 0.8; */
}

.card-item:hover img {
    transform: scale(1.1);
}

.close-btn {
    margin-top: 20px;
    align-self: center;
    width: 200px;
}
</style>
