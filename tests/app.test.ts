// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import App from '@/App.vue'
import { redirectTo } from '@/utils/redirect'

vi.mock('@/utils/redirect', () => ({
  redirectTo: vi.fn(),
}))

interface PendingCall {
  done: boolean
  url: string
  resolve: (value: Response) => void
  reject: (reason: unknown) => void
}

let pendingCalls: PendingCall[] = []

function deferred() {
  let resolve!: (value: Response) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<Response>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

beforeEach(() => {
  pendingCalls = []
  vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
    const call = deferred()
    const entry: PendingCall = { done: false, url, resolve: call.resolve, reject: call.reject }
    pendingCalls.push(entry)
    const signal = init?.signal
    if (signal?.aborted) {
      entry.done = true
      call.reject(new DOMException('The operation was aborted.', 'AbortError'))
      return call.promise
    }
    signal?.addEventListener('abort', () => {
      entry.done = true
      call.reject(new DOMException('The operation was aborted.', 'AbortError'))
    })
    return call.promise
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

function resolveAllPending() {
  for (const call of pendingCalls) {
    if (!call.done) {
      call.done = true
      call.resolve(new Response('ok', { status: 200 }))
    }
  }
}

async function resolveAllUntilDone() {
  for (let i = 0; i < 12; i += 1) {
    const before = pendingCalls.filter((c) => !c.done).length
    resolveAllPending()
    await flushPromises()
    const after = pendingCalls.filter((c) => !c.done).length
    if (after === 0 && before === 0) break
  }
}

describe('App 测速编排', () => {
  it('测速完成后展示推荐结果并开始倒计时', async () => {
    const wrapper = mount(App)
    await flushPromises()
    expect(wrapper.text()).toContain('正在测速')

    await resolveAllUntilDone()

    expect(wrapper.text()).toContain('推荐进入')
    expect(wrapper.text()).toContain('将在')
    expect(redirectTo).not.toHaveBeenCalled()

    wrapper.unmount()
  })

  it('重新测速后新一轮结果生效，旧请求不影响状态', async () => {
    const wrapper = mount(App)
    await flushPromises()
    expect(wrapper.text()).toContain('正在测速')

    await resolveAllUntilDone()
    expect(wrapper.text()).toContain('推荐进入')

    // 取消自动跳转后，结果面板中才出现「重新测速」
    const cancelBtn = wrapper
      .findAll('button')
      .find((b) => b.text() === '取消自动跳转')
    expect(cancelBtn).toBeDefined()
    await cancelBtn!.trigger('click')

    const retestBtn = wrapper
      .findAll('button')
      .find((b) => b.text() === '重新测速')
    expect(retestBtn).toBeDefined()

    const firstRunCalls = [...pendingCalls]
    expect(firstRunCalls.length).toBeGreaterThan(0)

    await retestBtn!.trigger('click')
    await flushPromises()

    // 新一轮测速已开始
    const secondRunCalls = pendingCalls.filter((c) => !firstRunCalls.includes(c))
    expect(secondRunCalls.length).toBeGreaterThan(0)
    expect(wrapper.text()).toContain('正在测速')

    await resolveAllUntilDone()

    // 新测速结果生效
    expect(wrapper.text()).toContain('推荐进入')
    expect(wrapper.text()).toContain('国内入口')
    expect(redirectTo).not.toHaveBeenCalled()

    // 再触发一次旧请求的 resolve，确认不会影响当前状态
    resolveAllPending()
    await flushPromises()
    expect(wrapper.text()).toContain('推荐进入')

    wrapper.unmount()
  })

  it('组件卸载后不更新状态且无未处理错误', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const wrapper = mount(App)
    await flushPromises()
    expect(wrapper.text()).toContain('正在测速')

    wrapper.unmount()
    await flushPromises()

    // 卸载后仍有挂起的请求完成，不应报错或更新状态
    resolveAllPending()
    await flushPromises()

    expect(errorSpy).not.toHaveBeenCalled()
    errorSpy.mockRestore()
  })
})
