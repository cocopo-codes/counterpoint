<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { format } from 'date-fns'
import { debounce } from 'lodash-es'

// More robust word counting function
const countWords = (text: string): number => {
  return text
    .trim()
    .replace(/[^\w\s'-]/g, '') // Remove special characters
    .split(/\s+/)
    .filter(word => {
      // Ensure word is meaningful (handles contractions, hyphenated words)
      return word.length > 1 || /^[aAiI]$/.test(word)
    }).length
}

// Reactive variables
const totalWordCount = ref(0)
const todayWordCount = ref(0)
const currentText = ref('')
const newGoal = ref<number | null>(null)
const totalWordCountGoal = ref(0)
const isGoalMet = ref(false)
const goalError = ref('')

// Local storage key
const STORAGE_KEY = 'counterpoint-word-count'

// Debounced save function to reduce localStorage writes
const debouncedSave = debounce((data: any) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}, 500)

// Function to save data to local storage and text file
const saveData = () => {
  const data = {
    totalWordCount: totalWordCount.value,
    todayWordCount: todayWordCount.value,
    totalWordCountGoal: totalWordCountGoal.value,
    date: format(new Date(), 'yyyy-MM-dd')
  }

  // Debounced local storage save
  debouncedSave(data)

  // Create and download text file
  const dataStr = `Counterpoint Word Count Backup
Date: ${data.date}
Total Word Count: ${data.totalWordCount}
Today's Word Count: ${data.todayWordCount}
Word Count Goal: ${data.totalWordCountGoal || 'Not set'}`

  const blob = new Blob([dataStr], { type: 'text/plain' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `counterpoint_wordcount_${data.date}.txt`
  link.click()
}

// Improved goal setting with validation
const setTotalWordCountGoal = () => {
  goalError.value = '' // Reset any previous errors

  if (!newGoal.value) {
    goalError.value = 'Please enter a goal'
    return
  }

  const goal = Number(newGoal.value)

  if (isNaN(goal)) {
    goalError.value = 'Goal must be a number'
    return
  }

  if (goal <= 0) {
    goalError.value = 'Goal must be greater than 0'
    return
  }

  if (goal > 1000000) {
    goalError.value = 'Goal cannot exceed 1,000,000 words'
    return
  }

  totalWordCountGoal.value = Math.floor(goal)
  saveData()
}

// Word count submission with improved counting
const submitWordCount = () => {
  const words = countWords(currentText.value)
  
  totalWordCount.value += words
  todayWordCount.value += words
  
  // Check goal progress
  if (totalWordCountGoal.value > 0) {
    isGoalMet.value = totalWordCount.value >= totalWordCountGoal.value
  }
  
  // Save data after updating
  saveData()
  
  // Clear textarea
  currentText.value = ''
}

// Goal progress calculation
const goalProgress = computed(() => {
  if (totalWordCountGoal.value > 0) {
    return Math.min((totalWordCount.value / totalWordCountGoal.value) * 100, 100)
  }
  return 0
})

// Reset word count
const resetWordCount = () => {
  totalWordCount.value = 0
  todayWordCount.value = 0
  totalWordCountGoal.value = 0
  isGoalMet.value = false
  goalError.value = ''
  
  // Clear local storage
  localStorage.removeItem(STORAGE_KEY)
}

// Function to load data from local storage
const loadData = () => {
  const savedData = localStorage.getItem(STORAGE_KEY)
  if (savedData) {
    const parsedData = JSON.parse(savedData)
    const savedDate = parsedData.date || format(new Date(), 'yyyy-MM-dd')
    const today = format(new Date(), 'yyyy-MM-dd')

    // Reset today's word count if it's a new day
    totalWordCount.value = parsedData.totalWordCount || 0
    todayWordCount.value = savedDate === today ? (parsedData.todayWordCount || 0) : 0
    totalWordCountGoal.value = parsedData.totalWordCountGoal || 0
  }
}

// Load data when component mounts
onMounted(loadData)

// Watch for changes to save periodically
watch([totalWordCount, todayWordCount, totalWordCountGoal], saveData)
</script>

<template>
  <div class="word-counter">
    <h1>Counterpoint</h1>
    
    <div class="instructions">
      Track your writing progress by entering text.
      <br />
      Set a goal, count words, and watch your creativity unfold.
    </div>
    
    <div class="stats">
      <p>Total Word Count: {{ totalWordCount }}</p>
      <p>Today's Word Count: {{ todayWordCount }}</p>
      
      <div class="goal-section">
        <div class="goal-input">
          <input 
            v-model="newGoal" 
            type="number" 
            placeholder="Set total word count goal" 
            aria-label="Word count goal input"
          />
          <button 
            @click="setTotalWordCountGoal" 
            aria-label="Set word count goal"
          >
            Set Goal
          </button>
        </div>
        
        <div v-if="goalError" class="goal-error">
          {{ goalError }}
        </div>
        
        <div v-if="totalWordCountGoal > 0" class="goal-progress">
          <p>Total Goal: {{ totalWordCountGoal }} words</p>
          <div class="progress-bar-container">
            <div 
              class="progress-bar" 
              :style="{ width: `${goalProgress}%` }" 
              :aria-valuenow="Math.round(goalProgress)"
              aria-valuemin="0"
              aria-valuemax="100"
              role="progressbar"
            ></div>
          </div>
          <p>{{ Math.round(goalProgress) }}% Complete</p>
          <p>{{ totalWordCountGoal - totalWordCount }} words remaining</p>
          
          <!-- Goal Met Reset Button -->
          <div v-if="isGoalMet" class="goal-met-section">
            <p class="goal-met-message">🎉 Congratulations! You've met your writing goal! 🎉</p>
            <button 
              class="reset-button" 
              @click="resetWordCount"
              aria-label="Reset word count"
            >
              Reset Word Count
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="session-warning">
      <p>⚠️ Note: This app saves data only in your current browser session. Refreshing or closing the page will reset your progress.</p>
    </div>
    
    <div class="input-section">
      <textarea 
        v-model="currentText" 
        placeholder="Enter your text here"
        rows="5"
        aria-label="Text input for word counting"
      ></textarea>
      
      <button 
        @click="submitWordCount"
        aria-label="Count words in text"
      >
        Count Words
      </button>
    </div>

    <footer class="app-footer">
      <div class="footer-content">
        <div class="copyright">
          <p>2024 Counterpoint by Coco Poley</p>
          <p>
            Developed with
            <a
              href="https://windsurf.ai"
              target="_blank"
              rel="noopener noreferrer"
              class="windsurf-link"
              >Windsurf AI</a
            >
          </p>
          <p>
            <a
              href="https://opensource.org/licenses/MIT"
              target="_blank"
              rel="noopener noreferrer"
              class="license-link"
              >MIT License</a
            >
            | Open Source
          </p>
        </div>
        <div class="footer-links">
          <a
            href="https://github.com/cocopo-codes"
            target="_blank"
            rel="noopener noreferrer"
            class="github-link"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="white"
            >
              <path
                d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
              />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
body {
  background-color: #1a1a1a;
  font-family: 'IM Fell English', serif;
  color: #e0e0e0;
}

#app {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #1a1a1a;
  padding: 0;
  margin: 0;
}

.word-counter {
  width: 50%;
  max-width: 800px;
  padding: 20px;
  text-align: center;
  color: #e0e0e0;
  box-sizing: border-box;
}

h1 {
  color: #4db8b8;
  font-size: 2.5em;
  margin-bottom: 20px;
}

.stats {
  background-color: #2a2a2a;
  padding: 15px;
  margin-bottom: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  color: #e0e0e0;
}

.goal-section {
  margin-top: 15px;
}

.goal-input {
  display: flex;
  justify-content: center;
  margin-bottom: 15px;
}

.goal-input input {
  padding: 8px;
  margin-right: 10px;
  width: 200px;
  border: 2px solid #4db8b8;
  border-radius: 4px;
  font-family: 'IM Fell English', serif;
  background-color: #2a2a2a;
  color: #e0e0e0;
}

.progress-bar-container {
  width: 100%;
  background-color: #3a3a3a;
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar {
  background-color: #4db8b8;
  height: 10px;
}

textarea {
  width: 100%;
  margin-bottom: 10px;
  padding: 10px;
  border: 2px solid #4db8b8;
  border-radius: 4px;
  font-family: 'IM Fell English', serif;
  resize: vertical;
  background-color: #2a2a2a;
  color: #e0e0e0;
  box-sizing: border-box;
}

button {
  background-color: #4db8b8;
  color: #1a1a1a;
  border: none;
  padding: 10px 20px;
  cursor: pointer;
  border-radius: 5px;
  font-family: 'IM Fell English', serif;
  transition: background-color 0.3s ease;
}

button:hover {
  background-color: #3a9999;
}

p {
  color: #e0e0e0;
}

.instructions {
  background-color: #2a2a2a;
  color: #e0e0e0;
  padding: 15px;
  margin-bottom: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  font-family: 'IM Fell English', serif;
  text-align: center;
  font-size: 1em;
  line-height: 1.6;
}

.input-section {
  margin-bottom: 60px;
}

.app-footer {
  margin-top: 0;
  padding: 10px 0;
  color: #e0e0e0;
  font-family: 'IM Fell English', serif;
  opacity: 0.7;
}

.footer-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 800px;
  margin: 0 auto;
}

.copyright {
  text-align: left;
}

.copyright p {
  margin: 2px 0;
  font-size: 0.8em;
}

.footer-links {
  display: flex;
  align-items: center;
}

.windsurf-link,
.license-link {
  color: #e0e0e0;
  text-decoration: underline;
  transition: transform 0.3s ease;
}

.windsurf-link:hover,
.license-link:hover {
  transform: scale(1.1);
}

.github-link {
  display: flex;
  align-items: center;
  color: #e0e0e0;
  text-decoration: none;
  transition: transform 0.3s ease;
}

.github-link:hover {
  transform: scale(1.1);
}

.github-link svg {
  width: 20px;
  height: 20px;
}

.session-warning {
  background-color: #2a2a2a;
  color: #e0e0e0;
  padding: 10px;
  border-radius: 8px;
  margin: 20px 0;
  font-size: 0.8em;
  text-align: center;
  border: 1px solid #4db8b8;
  opacity: 0.9;
}

.goal-error {
  color: #ff4d4d;
  margin: 10px 0;
  font-size: 0.9em;
}

/* Responsive Design */
@media screen and (max-width: 1280px) {
  .word-counter {
    width: 90%;
    max-width: 800px;
    margin: 0 auto;
    padding: 0 15px;
    box-sizing: border-box;
  }

  textarea {
    width: 100%;
    max-width: 100%;
  }

  .stats {
    padding: 10px;
  }

  .goal-input input {
    width: 150px;
  }

  .footer-content {
    flex-direction: column;
    text-align: center;
    gap: 10px;
  }

  .copyright {
    text-align: center;
  }

  .footer-links {
    margin-top: 5px;
  }
}

@media screen and (max-width: 768px) {
  .word-counter {
    width: 95%;
    padding: 0 10px;
  }

  h1 {
    font-size: 2em;
  }

  .instructions {
    padding: 10px;
    font-size: 0.9em;
  }

  .stats p {
    font-size: 0.9em;
  }

  .goal-input {
    flex-direction: column;
    align-items: center;
  }

  .goal-input input {
    margin-bottom: 10px;
    margin-right: 0;
  }
}
</style>
