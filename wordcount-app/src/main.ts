import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// Disable Vue DevTools in production
if (process.env.NODE_ENV === 'production') {
  ;(app.config as any).devtools = false
}

app.mount('#app')
