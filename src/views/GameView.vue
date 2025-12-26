<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useQuizStore } from '@/stores/quiz'

const router = useRouter()
const store = useQuizStore()

const selectedOption = ref(null)

// Redirect if no questions (reload)
if (store.questions.length === 0) {
    router.push('/')
}

const currentQ = computed(() => store.currentQuestion)
const isLast = computed(() => store.isLastQuestion)

// Reset selection on question change
watch(currentQ, () => {
    selectedOption.value = store.answers[currentQ.value.id] || null
})

const handleSelect = (optionKey) => {
    selectedOption.value = optionKey
    store.registerAnswer(currentQ.value.id, optionKey)
}

const handleNext = async () => {
    if (!selectedOption.value) return
    
    if (isLast.value) {
        // Submit
        const success = await store.submitResults()
        if (success) {
            router.push('/result')
        }
    } else {
        store.nextQuestion()
    }
}
</script>

<template>
<div class="game-container" v-if="currentQ">
    
    <div class="hud-top">
        <div class="hud-item left">
            <span class="hud-label">DRIVER</span>
            <span class="hud-value">{{ store.userId }}</span>
        </div>
        <div class="hud-item right">
            <span class="hud-label">LAP</span>
            <span class="hud-value">{{ store.currentQuestionIndex + 1 }}<span class="small">/{{ store.totalQuestions }}</span></span>
        </div>
    </div>

    <!-- Boss/Avatar Area as "Rival" -->
    <div class="boss-stage">
        <div class="rival-tag">RIVAL KART</div>
        <div class="boss-avatar-wrapper">
             <img :src="currentQ.avatarUrl" alt="Level Boss" class="boss-img" />
        </div>
        <div class="boss-dialogue pixel-box">
             <h2 class="q-text">{{ currentQ.text }}</h2>
        </div>
    </div>
    
    <!-- Options Area -->
    <div class="options-grid">
        <button 
            v-for="(text, key) in currentQ.options" 
            :key="key"
            class="pixel-btn option-btn"
            :class="{ selected: selectedOption === key }"
            @click="handleSelect(key)"
        >
            <div class="item-box">
                <span class="opt-key">{{ key }}</span>
            </div>
            <span class="opt-text">{{ text }}</span>
        </button>
    </div>
    
    <!-- Action Bar -->
    <div class="actions">
        <button 
            class="pixel-btn action-btn primary" 
            :class="{ 'disabled': !selectedOption }"
            @click="handleNext"
            :disabled="!selectedOption || store.isLoading"
        >
            {{ store.isLoading ? 'NITRO BOOST...' : (isLast ? 'FINISH LINE!' : 'NEXT LAP >') }}
        </button>
    </div>

</div>
<div v-else class="loading-screen">
    <h2 class="blink">REVING UP ENGINES...</h2>
</div>
</template>

<style scoped>
.game-container {
    width: 100%;
    max-width: 800px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.hud-top {
    display: flex;
    justify-content: space-between;
    margin-bottom: 1rem;
}

.hud-item {
    background: rgba(0,0,0,0.8);
    color: #fff;
    padding: 10px 15px;
    border-radius: 20px;
    border: 2px solid #fff;
    display: flex;
    flex-direction: column;
    min-width: 120px;
    box-shadow: 4px 4px 0 rgba(0,0,0,0.5);
    transform: skew(-10deg);
}

.hud-label {
    font-size: 0.6rem;
    color: var(--mk-yellow);
    letter-spacing: 1px;
}

.hud-value {
    font-size: 1.2rem;
    font-weight: bold;
    text-shadow: 2px 2px 0 #000;
}
.small { font-size: 0.8rem; color: #ccc; }

.boss-stage {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    position: relative;
}

.rival-tag {
    background: var(--mk-red);
    color: #fff;
    padding: 2px 8px;
    font-size: 0.7rem;
    border-radius: 4px;
    border: 2px solid #fff;
    transform: translateY(10px);
    z-index: 2;
}

.boss-avatar-wrapper {
    width: 100px;
    height: 100px;
    background: #fff;
    border-radius: 50%;
    border: 4px solid var(--mk-black);
    overflow: hidden;
    position: relative;
    box-shadow: 0 4px 0 rgba(0,0,0,0.3);
    z-index: 1;
}

.boss-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    image-rendering: pixelated;
}

.boss-dialogue {
    width: 100%;
    min-height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    background: rgba(255, 255, 255, 0.95);
    color: var(--mk-black);
}

.q-text {
    font-size: 1.1rem;
    margin: 0;
    line-height: 1.4;
}

.options-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
}

@media (min-width: 600px) {
    .options-grid {
        grid-template-columns: 1fr 1fr;
    }
}

.option-btn {
    text-align: left;
    display: flex;
    align-items: center;
    gap: 1rem;
    transition: all 0.2s;
    background: #fff; /* Default white card */
    color: var(--mk-black);
    border: 3px solid var(--mk-black);
}

.option-btn:hover {
    background: #f0f0f0;
    transform: scale(1.02);
}

.option-btn.selected {
    background: var(--mk-yellow);
    border-color: #e6b800;
    transform: scale(1.05);
    box-shadow: 0 0 15px var(--mk-yellow);
}

.item-box {
    width: 32px;
    height: 32px;
    background: var(--mk-black);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    flex-shrink: 0;
}

.opt-key {
    font-size: 1rem;
    font-weight: bold;
}

.actions {
    display: flex;
    justify-content: center;
    margin-top: 0.5rem;
}

.action-btn {
    padding: 15px 40px;
    font-size: 1.2rem;
    border-radius: 25px; /* Pill shape */
    border-width: 4px;
}

.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: #999;
    box-shadow: none;
    transform: none;
}

.loading-screen {
    color: #fff;
    text-shadow: 2px 2px 0 var(--mk-black);
    text-align: center;
}
</style>
