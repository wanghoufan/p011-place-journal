// 找地点：自然语言 → 确定性筛选条件（本地启发式，离线可用）；结构化筛选共用同一套条件
import type { Entry, Place, Tag, Dimension, MediaItem } from './types'
import { cnToNumber } from './organize'

export interface Filters {
  areaTagIds: string[]      // 地区（含子级展开）
  typeTagIds: string[]
  sceneTagIds: string[]
  crowdTagIds: string[]
  maxBudget?: number
  minRating?: number
  text?: string
}

export interface Hit { place: Place; entries: Entry[]; best: Entry }

export function expandTagIds(rootIds: string[], tags: Tag[]): string[] {
  const out = new Set<string>()
  const walk = (id: string) => { out.add(id); for (const t of tags) if (t.parentId === id) walk(t.id) }
  rootIds.forEach(walk)
  return [...out]
}

/**
 * 合并同类系统维度：同一 kind（region/type/scene/crowd）只保留一个展示组，组内为同 kind 的全部维度 id；
 * custom 维度各自独立。返回按首次出现顺序排列，`dim` 为组内代表（首个）维度。
 *
 * 系统维度语义唯一（全站按 kind 取用），但多来源各自可能建出同 kind 的维度行——网页首启播种、
 * 演示数据播种、以及现场新建标签默认并入 scene，云端又按 id 合并，本机遂残留同 kind 重复行
 * （表现为标签页并列两个「场景」）。展示前用本函数归并，标签全部并入，避免同名系统维度重复并列。
 */
export function mergeDimensionGroups(dims: Dimension[]): { dim: Dimension; ids: string[] }[] {
  const byKey = new Map<string, { dim: Dimension; ids: string[] }>()
  const groups: { dim: Dimension; ids: string[] }[] = []
  for (const d of dims) {
    const key = d.kind === 'custom' ? `id:${d.id}` : `kind:${d.kind}`
    const hit = byKey.get(key)
    if (hit) hit.ids.push(d.id)
    else {
      const g = { dim: d, ids: [d.id] }
      byKey.set(key, g)
      groups.push(g)
    }
  }
  return groups
}

// 自然语言解析：预算 / 星级 / 标签名匹配；查父标签自动包含子标签
export function parseQueryWithKinds(q: string, tags: Tag[], kindOf: (tag: Tag) => string): Filters {
  const f: Filters = { areaTagIds: [], typeTagIds: [], sceneTagIds: [], crowdTagIds: [], text: q.trim() || undefined }
  if (!q.trim()) return f
  const n = (s: string) => cnToNumber(s) ?? NaN
  const budget = q.match(/(?:人均|预算|花费|消费)(?:不超过|以内|之内|低于)?\s*([0-9０-９一二三四五六七八九十百]+)/)
  const budget2 = q.match(/([0-9０-９一二三四五六七八九十百]+)\s*(?:以内|以下)/)
  if (budget) f.maxBudget = n(budget[1]); else if (budget2) f.maxBudget = n(budget2[1])
  const star = q.match(/([0-9０-９一二三四五六七八九])\s*星(?:以上|及以上)?/)
  if (star && !Number.isNaN(n(star[1]))) f.minRating = n(star[1])
  const tokens = q.split(/[，,、。\s？?]+/).filter((w) => w.length >= 2)
  const tagMatched = (t: Tag) => q.includes(t.name) || tokens.some((w) => t.name.includes(w) || w.includes(t.name))
  for (const t of tags) {
    if (t.name.length < 2 || !tagMatched(t)) continue
    const k = kindOf(t)
    const bucket = k === 'region' ? f.areaTagIds : k === 'type' ? f.typeTagIds : k === 'scene' ? f.sceneTagIds : k === 'crowd' ? f.crowdTagIds : null
    bucket?.push(t.id)
  }
  return f
}

export function matchEntries(
  filters: Filters, entries: Entry[], places: Place[], tags: Tag[], media: MediaItem[],
): Hit[] {
  const area = expandTagIds(filters.areaTagIds, tags)
  const type = expandTagIds(filters.typeTagIds, tags)
  const scene = expandTagIds(filters.sceneTagIds, tags)
  const crowd = expandTagIds(filters.crowdTagIds, tags)
  const structural = !!(area.length || type.length || scene.length || crowd.length || filters.maxBudget != null || filters.minRating != null)
  const tokens = (filters.text ?? '').split(/[，,、。\s？?]+/).filter((w) => w.length >= 2)
  const tagNameOf = (id: string) => tags.find((t) => t.id === id)?.name ?? ''

  const hits: Hit[] = []
  for (const place of places) {
    const pes = entries
      .filter((e) => e.placeId === place.id)
      .sort((a, b) => b.visitDate.localeCompare(a.visitDate))
    if (!pes.length) continue

    // 文本兜底：仅在无法解析出结构化条件时，直接做文本包含匹配
    if (!structural && tokens.length) {
      const hay = pes.map((e) => [e.summary, e.notePublic, e.transcript].join(' ') + ' ' + pes.flatMap((e) => e.tagIds.map(tagNameOf)).join(' ') + ' ' + place.name + ' ' + (place.area ?? ''))
      const hit = hay.some((h) => tokens.some((w) => h.includes(w) || w.includes(place.name)))
      if (!hit) continue
    }

    const matched = pes.filter((e) => {
      if (filters.maxBudget != null && (e.budget ?? 0) > filters.maxBudget) return false
      if (filters.minRating != null && (e.rating ?? 0) < filters.minRating) return false
      const ids = new Set(e.tagIds)
      if (area.length && !area.some((id) => ids.has(id))) return false
      if (type.length && !type.some((id) => ids.has(id))) return false
      if (scene.length && !scene.some((id) => ids.has(id))) return false
      if (crowd.length && !crowd.some((id) => ids.has(id))) return false
      return true
    })
    if (matched.length) hits.push({ place, entries: matched, best: matched[0] })
  }
  return hits.sort((a, b) => b.best.visitDate.localeCompare(a.best.visitDate))
}

export function coverUri(entry: Entry, media: MediaItem[]): string | undefined {
  const m = media.find((x) => x.id === entry.coverMediaId) ?? media.find((x) => x.entryId === entry.id)
  return m?.demoUri
}
