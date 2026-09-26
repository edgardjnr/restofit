import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { matchExercise, normalizeStr, videoSrc, posterSrc, ATLAS_VIDEO_IDS, ATLAS_POSTER_IDS, EXIDX } from './exercises.js'
import { _setLangState } from './i18n-core.js'

describe('normalizeStr', () => {
  it('handles null, undefined and empty strings', () => {
    expect(normalizeStr(null)).toBe('')
    expect(normalizeStr(undefined)).toBe('')
    expect(normalizeStr('')).toBe('')
  })

  it('lowercases text and removes diacritics / accents', () => {
    expect(normalizeStr('Elevação Lateral')).toBe('elevacao lateral')
    expect(normalizeStr('SUPINO INCLINADO COM HALTERES')).toBe('supino inclinado com halteres')
    expect(normalizeStr('Tríceps & Panturrilhas')).toBe('triceps & panturrilhas')
    expect(normalizeStr('Quadríceps / Glúteos')).toBe('quadriceps / gluteos')
  })
})

describe('matchExercise', () => {
  const benchPress = {
    id: '0025',
    n: 'barbell bench press',
    bp: 'chest',
    tg: 'pectorals',
    eq: 'barbell',
    sm: ['triceps', 'deltoids'],
    desc: 'Classic chest exercise using a barbell on a flat bench.'
  }

  const lateralRaise = {
    id: '0283',
    n: 'dumbbell lateral raise',
    bp: 'shoulders',
    tg: 'delts',
    eq: 'dumbbell',
    sm: ['traps'],
    desc: 'Shoulder isolation movement.'
  }

  it('returns true for empty or whitespace-only query', () => {
    expect(matchExercise(benchPress, '')).toBe(true)
    expect(matchExercise(benchPress, '   ')).toBe(true)
    expect(matchExercise(benchPress, null)).toBe(true)
  })

  it('matches exact and partial words in exercise name regardless of case', () => {
    expect(matchExercise(benchPress, 'bench')).toBe(true)
    expect(matchExercise(benchPress, 'BENCH')).toBe(true)
    expect(matchExercise(benchPress, 'barbell')).toBe(true)
    expect(matchExercise(benchPress, 'press')).toBe(true)
    expect(matchExercise(benchPress, 'squat')).toBe(false)
  })

  it('matches multiple tokens in ANY order (not just sequential)', () => {
    // "bench barbell" is reversed order compared to "barbell bench press"
    expect(matchExercise(benchPress, 'bench barbell')).toBe(true)
    expect(matchExercise(benchPress, 'press bench barbell')).toBe(true)
    expect(matchExercise(benchPress, 'barbell press chest')).toBe(true)
    expect(matchExercise(benchPress, 'bench squat')).toBe(false)
  })

  it('matches target muscle, equipment, secondary muscles and description', () => {
    expect(matchExercise(benchPress, 'pectorals')).toBe(true)
    expect(matchExercise(benchPress, 'triceps barbell')).toBe(true)
    expect(matchExercise(benchPress, 'flat bench')).toBe(true)
    expect(matchExercise(lateralRaise, 'dumbbell shoulder')).toBe(true)
  })

  it('matches accent-insensitively', () => {
    const customEx = {
      id: 'custom-1',
      n: 'Elevação de Panturrilha',
      bp: 'lower legs',
      tg: 'calves',
      eq: 'body weight',
      desc: 'Exercício para panturrilhas em pé.'
    }

    expect(matchExercise(customEx, 'elevacao')).toBe(true)
    expect(matchExercise(customEx, 'elevação')).toBe(true)
    expect(matchExercise(customEx, 'panturrilha elevacao')).toBe(true)
    expect(matchExercise(customEx, 'ELEVACAO PE')).toBe(true)
  })

  it('matches translated UI terms when a language is active', () => {
    _setLangState('pt', {
      chest: 'peito',
      barbell: 'barra',
      dumbbell: 'halteres',
      shoulders: 'ombros'
    }, null)

    // "peito" is the translated bp, "barra" is the translated eq
    expect(matchExercise(benchPress, 'peito')).toBe(true)
    expect(matchExercise(benchPress, 'barra')).toBe(true)
    expect(matchExercise(benchPress, 'peito barra bench')).toBe(true)
    expect(matchExercise(lateralRaise, 'halteres ombros')).toBe(true)
  })

  // The pt-BR exercise-name pack (!16) renames the catalogue in the UI. Searching has to reach
  // that name as well as the canonical English one, or the library goes dark for pt-BR profiles
  // the moment they type what they see on screen.
  it('matches the localized exercise name as well as the English one', () => {
    _setLangState('pt-BR', {}, null, { '0025': 'supino reto com barra' })

    expect(matchExercise(benchPress, 'supino')).toBe(true)
    expect(matchExercise(benchPress, 'supino barra')).toBe(true)
    expect(matchExercise(benchPress, 'bench press')).toBe(true)   // English still reaches it
    expect(matchExercise(lateralRaise, 'supino')).toBe(false)     // untranslated entry unaffected
  })

  it('rebuilds the cached haystack when the language changes', () => {
    _setLangState('pt-BR', {}, null, { '0025': 'supino reto com barra' })
    expect(matchExercise(benchPress, 'supino')).toBe(true)

    _setLangState('en', null, null, null)
    expect(matchExercise(benchPress, 'supino')).toBe(false)
    expect(matchExercise(benchPress, 'bench')).toBe(true)
  })
})

describe('videoSrc', () => {
  it('points ATLAS-01 exercises at their bundled mp4', () => {
    expect(videoSrc({ id: '0001' })).toBe('atlas/0001.mp4?v=2')
  })

  it('returns null for exercises without a video and for custom ones', () => {
    expect(videoSrc({ id: '0025' })).toBe(null)
    expect(videoSrc({ n: 'custom' })).toBe(null)
    expect(videoSrc(undefined)).toBe(null)
  })

  it('gives a webp poster to every video and to poster-only exercises, and nothing else', () => {
    expect(posterSrc({ id: '0001' })).toBe('atlas/0001.webp?v=2')
    expect(posterSrc({ id: '0002' })).toBe(null)
    expect(posterSrc({ id: '0025' })).toBe(null)
    expect(posterSrc(undefined)).toBe(null)
    for (const id of ATLAS_VIDEO_IDS) expect(ATLAS_POSTER_IDS.has(id)).toBe(true)
  })

  it('only lists ids that exist in the exercise library', () => {
    for (const id of ATLAS_POSTER_IDS) expect(EXIDX[id]).toBeTruthy()
  })

  it('has the files in public/atlas for every listed id', () => {
    for (const id of ATLAS_VIDEO_IDS) {
      expect(existsSync(new URL(`../../public/atlas/${id}.mp4`, import.meta.url))).toBe(true)
    }
    for (const id of ATLAS_POSTER_IDS) {
      expect(existsSync(new URL(`../../public/atlas/${id}.webp`, import.meta.url))).toBe(true)
    }
  })
})
