import { defineStore } from 'pinia'
import axios from 'axios'
import { useRouter } from 'vue-router'

export const useQuizStore = defineStore('quiz', {
    state: () => ({
        userId: '',
        subject: '歷史', // Default
        questions: [],
        currentQuestionIndex: 0,
        answers: {}, // { questionId: selectedOption }
        score: 0,
        correctCount: 0,
        totalQuestions: 0,
        isLoading: false,
        error: null,
        gameResult: null, // { score, pass }
        hasScratched: false, // Track if reward collected for current game
        collectedCards: [], // List of card IDs
    }),

    getters: {
        currentQuestion: (state) => state.questions[state.currentQuestionIndex],
        isLastQuestion: (state) => state.currentQuestionIndex >= state.questions.length - 1,
        progress: (state) => {
            if (state.questions.length === 0) return 0;
            return ((state.currentQuestionIndex + 1) / state.questions.length) * 100;
        }
    },

    actions: {
        async fetchUserCards(id) {
            try {
                const gasUrl = import.meta.env.GOOGLE_APP_SCRIPT_URL;
                const response = await axios.post(gasUrl, JSON.stringify({
                    action: 'getCollection',
                    id: id
                }));
                if (response.data.status === 'success') {
                    this.collectedCards = response.data.cards || [];
                }
            } catch (err) {
                console.error('Failed to fetch cards', err);
            }
        },

        async saveCard(id, cardId) {
            try {
                // Optimistic update
                if (!this.collectedCards.includes(cardId)) {
                    this.collectedCards.push(cardId);
                }

                const gasUrl = import.meta.env.GOOGLE_APP_SCRIPT_URL;
                await axios.post(gasUrl, JSON.stringify({
                    action: 'updateCollection',
                    id: id,
                    cardId: cardId
                }));
            } catch (err) {
                console.error('Failed to save card', err);
            }
        },

        async startGame(id, subject = '歷史', count = 10) {
            this.userId = id;
            this.subject = subject;
            this.isLoading = true;
            this.error = null;
            this.answers = {};
            this.currentQuestionIndex = 0;
            this.gameResult = null;
            this.hasScratched = false;

            try {
                const gasUrl = import.meta.env.GOOGLE_APP_SCRIPT_URL;

                // Fetch Questions
                // Use timeout to prevent hanging
                const response = await axios.get(`${gasUrl}?action=getQuestions&subject=${subject}&count=${count}`);

                if (response.data.status === 'success') {
                    this.questions = response.data.questions.map((q, index) => ({
                        ...q,
                        // Assign a random avatar for this question (Level Boss)
                        avatarUrl: `https://api.dicebear.com/9.x/pixel-art/svg?seed=${encodeURIComponent(q.id + '_' + index)}`
                    }));
                    this.totalQuestions = this.questions.length;
                    return true;
                } else {
                    this.error = response.data.message || 'Failed to fetch questions';
                    return false;
                }
            } catch (err) {
                console.error(err);
                this.error = 'Network Error: Could not connect to game server.';
                return false;
            } finally {
                this.isLoading = false;
            }
        },

        registerAnswer(questionId, selectedOption) {
            this.answers[questionId] = selectedOption;
        },

        nextQuestion() {
            if (!this.isLastQuestion) {
                this.currentQuestionIndex++;
            }
        },

        markScratched() {
            this.hasScratched = true;
        },

        async submitResults() {
            this.isLoading = true;
            try {
                const gasUrl = import.meta.env.GOOGLE_APP_SCRIPT_URL;
                const threshold = import.meta.env.PASS_THRESHOLD || 60;

                const payload = JSON.stringify({
                    action: 'submitResult',
                    id: this.userId,
                    subject: this.subject, // Pass Subject
                    answers: this.answers,
                    passThresholdCount: Math.ceil((this.totalQuestions * threshold) / 100)
                });

                const response = await axios.post(gasUrl, payload, {
                    headers: {
                        'Content-Type': 'text/plain;charset=utf-8',
                    }
                });

                if (response.data.status === 'success') {
                    this.score = response.data.score;
                    this.correctCount = response.data.correctCount;

                    this.gameResult = {
                        score: this.score,
                        correctCount: this.correctCount,
                        total: this.totalQuestions,
                        passed: this.score >= threshold,
                        review: response.data.review,
                        wrongQuestions: response.data.wrongQuestions
                    };
                    return true;
                } else {
                    this.error = response.data.message;
                    return false;
                }
            } catch (err) {
                console.error(err);
                this.error = 'Failed to submit results.';
                return false;
            } finally {
                this.isLoading = false;
            }
        },

        async generateRemedialQuestions() {
            if (!this.gameResult || !this.gameResult.wrongQuestions || this.gameResult.wrongQuestions.length === 0) {
                return false;
            }
            this.isLoading = true;
            try {
                const gasUrl = import.meta.env.GOOGLE_APP_SCRIPT_URL;
                const payload = JSON.stringify({
                    action: 'generateQuestions',
                    subject: this.subject, // Pass Subject
                    wrongQuestions: this.gameResult.wrongQuestions
                });

                const response = await axios.post(gasUrl, payload, {
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' }
                });

                if (response.data.status === 'success') {
                    return { success: true, count: response.data.count };
                } else {
                    return { success: false, message: response.data.message };
                }
            } catch (err) {
                return { success: false, message: 'Network Error' };
            } finally {
                this.isLoading = false;
            }
        }
    }
})
