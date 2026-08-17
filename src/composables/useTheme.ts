import { ref } from 'vue'

export type Theme = 'light' | 'dark'

const THEME_STORAGE_KEY = 'freedomport-theme'

/* 与 style.css 中两套主题的 --bg 令牌保持一致，用于同步浏览器 UI 配色 */
const THEME_COLORS: Record<Theme, string> = {
  light: '#f4f3ef',
  dark: '#131415',
}

function readSavedTheme(): Theme | null {
  try {
    const saved = window.sessionStorage.getItem(THEME_STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // sessionStorage 不可用时视为未选择
  }
  return null
}

function systemTheme(): Theme {
  if (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark'
  }
  return 'light'
}

/* index.html 的内联脚本已在首帧前写入 data-theme，以其为当前事实；
   属性缺失时（如测试环境）回退到系统偏好 */
function currentTheme(): Theme {
  if (typeof document === 'undefined') return 'light'
  const attr = document.documentElement.getAttribute('data-theme')
  if (attr === 'dark' || attr === 'light') return attr
  return systemTheme()
}

const theme = ref<Theme>(currentTheme())
let initialized = false
let mediaQuery: MediaQueryList | null = null

function applyTheme(next: Theme): void {
  theme.value = next
  document.documentElement.setAttribute('data-theme', next)
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.appendChild(meta)
  }
  meta.content = THEME_COLORS[next]
}

function onSystemChange(event: MediaQueryListEvent): void {
  applyTheme(event.matches ? 'dark' : 'light')
}

function followSystem(): void {
  if (typeof window.matchMedia !== 'function') return
  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', onSystemChange)
}

function stopFollowSystem(): void {
  mediaQuery?.removeEventListener('change', onSystemChange)
  mediaQuery = null
}

function init(): void {
  if (initialized || typeof document === 'undefined') return
  initialized = true
  applyTheme(currentTheme())
  // 用户未手动选择过主题时，跟随系统偏好实时切换
  if (readSavedTheme() === null) followSystem()
}

/**
 * 明暗主题切换。用户手动选择后写入 sessionStorage（仅当前标签页会话），
 * 并停止跟随系统偏好；未选择时始终跟随系统。
 */
export function useTheme() {
  init()

  function toggleTheme(): void {
    const next: Theme = theme.value === 'dark' ? 'light' : 'dark'
    stopFollowSystem()
    applyTheme(next)
    try {
      window.sessionStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // 存储不可用不影响切换本身
    }
  }

  return { theme, toggleTheme }
}
