<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuizStore } from '@/stores/quiz'

const router = useRouter()
const store = useQuizStore()
const userId = ref('')
const subject = ref('歷史')
const questionCount = ref(10)
const error = ref('')

const handleStart = async () => {
    if (!userId.value.trim()) {
        error.value = 'PLEASE ENTER PLAYER ID'
        return
    }
    
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
                <p class="label-text">SUBJECT</p>
                <select v-model="subject" class="pixel-input">
                    <option value="歷史">歷史</option>
                    <option value="地理">地理</option>
                    <option value="公民">公民</option>
                </select>
            </div>
            
            <div class="setting-group">
                <p class="label-text">題數</p>
                <select v-model="questionCount" class="pixel-input">
                    <option :value="10">10題</option>
                    <option :value="20">20題</option>
                </select>
            </div>
        </div>
        
        <p v-if="error" class="error-msg">{{ error }}</p>
        
        <div style="text-align: center; margin-top: 20px;">
            <button 
                class="pixel-btn primary" 
                @click="handleStart" 
                :disabled="store.isLoading"
            >
                {{ store.isLoading ? 'Starting Engine...' : 'START RACE' }}
            </button>
        </div>
    </div>
    
    <div class="footer-credits">
        © 2025 PIXEL CUP
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
</style>
