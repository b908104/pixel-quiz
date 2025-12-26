import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import GameView from '../views/GameView.vue'
import ResultView from '../views/ResultView.vue'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            name: 'home',
            component: HomeView
        },
        {
            path: '/game',
            name: 'game',
            component: GameView,
            beforeEnter: (to, from, next) => {
                // Guard: Logic to prevent direct access if no ID? 
                // For simplicity, just let it be or check store.
                next()
            }
        },
        {
            path: '/result',
            name: 'result',
            component: ResultView
        }
    ]
})

export default router
