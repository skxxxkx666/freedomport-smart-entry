import { describe, it, expect } from 'vitest'
import { computeMedian } from '@/utils/median'

describe('computeMedian', () => {
  it('一个样本', () => {
    expect(computeMedian([42])).toBe(42)
  })

  it('两个样本', () => {
    expect(computeMedian([10, 20])).toBe(15)
  })

  it('三个样本', () => {
    expect(computeMedian([10, 20, 30])).toBe(20)
  })

  it('偶数样本', () => {
    expect(computeMedian([10, 20, 30, 40])).toBe(25)
  })

  it('无样本', () => {
    expect(computeMedian([])).toBeNull()
  })

  it('未排序样本', () => {
    expect(computeMedian([30, 10, 20])).toBe(20)
  })
})
