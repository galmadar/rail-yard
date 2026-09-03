import { describe, expect, it } from 'vitest'
import { loco, wagon } from './vehicles'

describe('vehicles', () => {
  it('carries what it is, so the renderer never has to guess from the name', () => {
    expect(wagon('t', 'the tanker', '#000', 'tanker').body).toBe('tanker')
    expect(loco('l').body).toBe('loco')
  })

  it('is still a wagon whatever shape it is', () => {
    expect(wagon('b', 'the brake van', '#000', 'brake-van').kind).toBe('wagon')
  })
})
