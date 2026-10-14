// Record：完整记录表单（地点 + 日期 + 评分 + 预算 + 私密感受 + 公开理由 + 标签多选 + 媒体链）。
// 全程本地：照片在「选中时」就复制进 App 私有持久目录（L3-19），表单与照片快照落既有
// `meta` 表草稿键，进程被杀 / Activity 回收后重启可恢复；保存时才把暂存照片转成正式
// media 行 + outbox，再与记录一起落 SQLite；全程不接网络。
// 「交给 AI 整理 →」把当前表单存成内存草稿后进 ai-confirm（对标 Web Record → /confirm）；
// 「不整理，直接保存记录」为不阻断的手工路径。

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { router, useFocusEffect } from 'expo-router'

import { getAppRepository } from '@/db/app'
import { newUuid } from '@/domain/ids'
import {
  createExpoMediaPicker,
  MediaPickerError,
  type MediaPicker,
  type PickedAsset,
} from '@/media/picker'
import { createExpoMediaFileSystem } from '@/media/localFiles'
import { createExpoImageProcessor } from '@/media/processImage'
import { discardDraftAssets, stageDraftAssets } from '@/media/draftMedia'
import { persistPickedMedia } from '@/media/mediaService'
import {
  AppButton,
  Card,
  Chip,
  ErrorState,
  GroupedTagPicker,
  InlineTagCreator,
  SectionTitle,
  Stars,
  TextField,
} from '@/components/ui'
import { Lightbox } from '@/components/Lightbox'
import { consumeDraftSaved, setDraft } from '@/features/draft'
import { clearPersistedDraft, loadPersistedDraft, savePersistedDraft } from '@/features/draftStore'
import { aiNextGate, toggleTagId, validateRecordForm } from '@/features/form'
import { listPlaceOptions, listTagsGrouped, type PlaceOption, type TagGroup } from '@/features/queries'
import { todayIso, parseOptionalBudget } from '@/features/format'
import { createTagNamed, saveRecord } from '@/features/recordActions'
import { colors } from '@/theme'
import { themedStyles } from '@/theme'
import { useThemeSubscription } from '@/themeProvider'

const MAX_PHOTOS = 9

export default function RecordScreen() {
  // 订阅明暗/配色：本页样式是 themedStyles 代理，不订阅就不会重渲染（我的页切主题后回来即露馅）。
  useThemeSubscription()
  const [places, setPlaces] = useState<PlaceOption[]>([])
  const [tagGroups, setTagGroups] = useState<TagGroup[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  const [placeId, setPlaceId] = useState<string | null>(null)
  const [placeQuery, setPlaceQuery] = useState('')
  const [newMode, setNewMode] = useState(false)
  const [newName, setNewName] = useState('')
  const [newArea, setNewArea] = useState('')

  const [visitDate, setVisitDate] = useState(todayIso())
  const [rating, setRating] = useState<number | undefined>(undefined)
  const [budget, setBudget] = useState('')
  const [notePrivate, setNotePrivate] = useState('')
  const [notePublic, setNotePublic] = useState('')
  const [tagIds, setTagIds] = useState<string[]>([])

  const [assets, setAssets] = useState<PickedAsset[]>([])
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const [creatingTag, setCreatingTag] = useState(false)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedEntryId, setSavedEntryId] = useState<string | null>(null)

  const pickerRef = useRef<MediaPicker | null>(null)
  const getPicker = useCallback(() => {
    if (!pickerRef.current) pickerRef.current = createExpoMediaPicker()
    return pickerRef.current
  }, [])

  // 草稿照片落盘用的依赖（文件系统 + 图片处理器）；保存时的正式落盘复用同一份。
  const mediaDeps = useMemo(
    () => ({ fs: createExpoMediaFileSystem(), images: createExpoImageProcessor() }),
    [],
  )

  /** 当前已选照片的同步引用：异步回调里读最新值，避免闭包拿到旧数组。 */
  const assetsRef = useRef<PickedAsset[]>([])
  useEffect(() => {
    assetsRef.current = assets
  }, [assets])

  const load = useCallback(() => {
    try {
      const { db } = getAppRepository()
      setPlaces(listPlaceOptions(db))
      setTagGroups(listTagsGrouped(db))
      setLoadError(null)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err))
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load]),
  )

  // L3-19：恢复上次未保存的草稿（表单字段 + 已落盘照片）。每次会话只做一次，
  // 且只在当前表单还是空白时恢复，避免覆盖用户正在填的内容或刚被 AI 整理页保存的表单。
  const [hydrated, setHydrated] = useState(false)
  useFocusEffect(
    useCallback(() => {
      if (hydrated) return
      let cancelled = false
      void (async () => {
        try {
          const { db } = getAppRepository()
          const persisted = loadPersistedDraft(db)
          if (!cancelled && persisted) {
            // 文件已被系统清理掉的照片直接剔除：宁可少一张，也不留一张打不开的灰图。
            const usable = persisted.assets.filter((asset) => mediaDeps.fs.exists(asset.uri))
            if (assetsRef.current.length === 0) {
              setPlaceId(persisted.placeId ?? null)
              setNewMode(Boolean(persisted.newPlace))
              setNewName(persisted.newPlace?.name ?? '')
              setNewArea(persisted.newPlace?.area ?? '')
              setVisitDate(persisted.visitDate)
              setRating(persisted.rating)
              setBudget(persisted.budget != null ? String(persisted.budget) : '')
              setNotePrivate(persisted.notePrivate ?? '')
              setNotePublic(persisted.notePublic ?? '')
              setTagIds(persisted.tagIds)
              setAssets(usable)
              setMessage(
                usable.length > 0
                  ? `已恢复上次未保存的草稿，含 ${usable.length} 张照片。`
                  : '已恢复上次未保存的草稿。',
              )
            }
            if (usable.length !== persisted.assets.length) {
              savePersistedDraft(db, { ...persisted, assets: usable })
            }
          }
        } catch {
          // 草稿读不出来不打扰用户，可重新填。
        } finally {
          if (!cancelled) setHydrated(true)
        }
      })()
      return () => {
        cancelled = true
      }
    }, [hydrated, mediaDeps]),
  )

  // T045：Activity 被回收后恢复丢失的 picker 结果（只补媒体，不影响表单字段）。
  // 恢复到的同样是临时 URI，必须过一遍落盘暂存才能进草稿。
  const recoveredRef = useRef(false)
  useFocusEffect(
    useCallback(() => {
      if (recoveredRef.current) return
      recoveredRef.current = true
      let cancelled = false
      void (async () => {
        try {
          const recovered = await getPicker().recoverPending()
          if (cancelled || recovered.length === 0) return
          const staged = await stageDraftAssets(mediaDeps, recovered)
          if (!cancelled && staged.length > 0) {
            setAssets((prev) => [...prev, ...staged].slice(0, MAX_PHOTOS))
            setMessage(`已恢复 ${staged.length} 张待保存照片。`)
          }
        } catch {
          // 恢复失败不打扰用户，可手动重选。
        }
      })()
      return () => {
        cancelled = true
      }
    }, [getPicker, mediaDeps]),
  )

  const pick = useCallback(
    async (source: 'library' | 'camera') => {
      if (saving) return
      try {
        const picker = getPicker()
        setMessage(source === 'camera' ? '正在打开相机…' : '正在打开相册…')
        const picked = source === 'camera' ? await picker.pickFromCamera() : await picker.pickFromLibrary()
        if (picked.length === 0) {
          setMessage('已取消，未选择图片。')
          return
        }
        // 选中即落盘（L3-19）：草稿里只留 App 私有目录的持久路径，不留 content:// 临时 URI。
        const staged = await stageDraftAssets(mediaDeps, picked)
        const room = Math.max(0, MAX_PHOTOS - assetsRef.current.length)
        const kept = staged.slice(0, room)
        const dropped = staged.slice(kept.length)
        if (dropped.length > 0) discardDraftAssets(mediaDeps, dropped)
        setAssets((prev) => [...prev, ...kept].slice(0, MAX_PHOTOS))
        setMessage(
          dropped.length > 0
            ? `已加入 ${kept.length} 张并复制到本机（最多 ${MAX_PHOTOS} 张，多余的已忽略）。`
            : `已加入 ${staged.length} 张，已复制到本机；此时退出 App 也不会丢。`,
        )
      } catch (error) {
        const detail = error instanceof MediaPickerError ? `${error.code}: ${error.message}` : String(error)
        setMessage(`图片选择失败：${detail}。可继续用文字记录。`)
      }
    },
    [getPicker, mediaDeps, saving],
  )

  /** 移除某张照片：连暂存副本一起删，避免残留文件占空间。 */
  const removeAsset = useCallback(
    (index: number) => {
      const removed = assetsRef.current[index]
      if (removed) discardDraftAssets(mediaDeps, [removed])
      setAssets((prev) => prev.filter((_, i) => i !== index))
    },
    [mediaDeps],
  )

  /** 表单复位；`consumed` 为已转存/已放弃的照片，顺手清掉它们的草稿暂存副本与草稿快照。 */
  const resetForm = useCallback(
    (consumed?: PickedAsset[]) => {
      try {
        const { db } = getAppRepository()
        discardDraftAssets(mediaDeps, consumed ?? assetsRef.current)
        clearPersistedDraft(db)
      } catch {
        // 清草稿失败不影响已保存的记录：下次进本页若带出旧草稿，用户手动清空即可。
      }
      setPlaceId(null)
      setPlaceQuery('')
      setNewMode(false)
      setNewName('')
      setNewArea('')
      setVisitDate(todayIso())
      setRating(undefined)
      setBudget('')
      setNotePrivate('')
      setNotePublic('')
      setTagIds([])
      setAssets([])
      setPreviewIndex(null)
      setSavedEntryId(null)
    },
    [mediaDeps],
  )

  // AI 整理页保存成功后回到本页：清空表单一次，避免同一批内容被重复保存
  // （对标 Web Record 路由切换即卸载复位；本页在 tab 栈里常驻，只能靠保存信号显式复位）。
  useFocusEffect(
    useCallback(() => {
      if (consumeDraftSaved()) {
        resetForm(assetsRef.current)
        setMessage('AI 整理页已保存这条记录。')
      }
    }, [resetForm]),
  )

  // 草稿快照落本机 meta（L3-19）：恢复完成后每次变更都覆盖写，进程被杀也不丢已选照片与已填内容。
  useEffect(() => {
    if (!hydrated) return
    const timer = setTimeout(() => {
      try {
        const { db } = getAppRepository()
        const blank =
          assets.length === 0 &&
          !placeId &&
          !newMode &&
          !newName &&
          !budget &&
          !notePrivate &&
          !notePublic &&
          rating === undefined &&
          tagIds.length === 0 &&
          visitDate === todayIso()
        if (blank) {
          clearPersistedDraft(db)
          return
        }
        savePersistedDraft(db, {
          assets,
          placeId: placeId ?? undefined,
          newPlace: newMode ? { name: newName.trim(), area: newArea.trim() || undefined } : undefined,
          visitDate,
          rating,
          budget: parseOptionalBudget(budget),
          notePrivate: notePrivate.trim() || undefined,
          notePublic: notePublic.trim() || undefined,
          tagIds,
        })
      } catch {
        // 写快照失败不打断录入，下次变更会再试。
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [assets, budget, hydrated, newArea, newMode, newName, notePrivate, notePublic, placeId, rating, tagIds, visitDate])

  // 设为封面：把点中的照片移到第一位（首图即封面，与 Web 一致）。
  const setCover = useCallback((index: number) => {
    setAssets((prev) => {
      if (index <= 0 || index >= prev.length) return prev
      const next = [...prev]
      const [picked] = next.splice(index, 1)
      next.unshift(picked)
      return next
    })
  }, [])

  // 现场建标签：同名标签直接复用，建完立刻勾上（对标 Web Record/EntryDetail 的现场建标签）。
  const handleCreateTag = useCallback((name: string) => {
    setCreatingTag(true)
    try {
      const { db, repo } = getAppRepository()
      const created = createTagNamed(db, repo, { name })
      setTagGroups(listTagsGrouped(db))
      setTagIds((ids) => (ids.includes(created.id) ? ids : [...ids, created.id]))
      setMessage(created.created ? `已新建标签「${name}」并勾选。` : `已有标签「${name}」，已直接勾选。`)
    } catch (error) {
      setMessage(`新建标签失败：${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setCreatingTag(false)
    }
  }, [])

  // 下一步：把当前表单存成内存草稿再进 ai-confirm；取不到草稿时那边回退独立输入，不阻断保存。
  // 门槛与按钮文案同出一源（aiNextGate，对标 Web Record）：按钮已按同一口径禁用，
  // 这里的判断只兜住「渲染到点击之间状态变了」的竞态，正常点不到。
  const handleNextToAi = useCallback(() => {
    const validation = validateRecordForm({
      placeId: placeId ?? undefined,
      newPlaceName: newMode ? newName : undefined,
      visitDate,
      tagIds,
    })
    if (validation) {
      setMessage(validation)
      return
    }
    // 地点/日期已过上面那条；这里只可能缺内容（口径与按钮 canNext 完全一致）。
    const gate = aiNextGate({
      placeId: placeId ?? undefined,
      newPlaceName: newMode ? newName : undefined,
      notePrivate,
      notePublic,
      photoCount: assets.length,
    })
    if (!gate.canNext) {
      setMessage('添加照片或写写感受，再交给 AI 整理。')
      return
    }
    setDraft({
      assets,
      placeId: placeId ?? undefined,
      newPlace: newMode ? { name: newName.trim(), area: newArea.trim() || undefined } : undefined,
      visitDate,
      rating,
      budget: parseOptionalBudget(budget),
      notePrivate: notePrivate.trim() || undefined,
      notePublic: notePublic.trim() || undefined,
      tagIds,
    })
    router.push('/ai-confirm')
  }, [assets, budget, newArea, newMode, newName, notePrivate, notePublic, placeId, rating, tagIds, visitDate])

  const handleSave = useCallback(async () => {
    if (saving) return
    const validation = validateRecordForm({
      placeId: placeId ?? undefined,
      newPlaceName: newMode ? newName : undefined,
      visitDate,
      tagIds,
    })
    if (validation) {
      setMessage(validation)
      return
    }
    setSaving(true)
    setMessage('正在保存…')
    const { db, repo } = getAppRepository()
    try {
      const result = saveRecord(db, repo, {
        placeId: placeId ?? undefined,
        newPlace: newMode ? { name: newName, area: newArea } : undefined,
        visitDate,
        rating,
        budget: parseOptionalBudget(budget),
        notePrivate,
        notePublic,
        tagIds,
      })

      let mediaWarning = ''
      if (assets.length > 0) {
        try {
          // assets 的 uri 已是本机持久路径（选中时落盘），这里只做转存：生成正式 media 行 + outbox。
          await persistPickedMedia(
            { ...mediaDeps, newId: newUuid },
            repo,
            { assets, entryId: result.entryId, placeId: result.placeId, dependsOn: [result.entryOpId] },
          )
        } catch (error) {
          mediaWarning = `文字已保存，但图片处理失败：${error instanceof Error ? error.message : String(error)}。`
        }
      }

      resetForm(assets)
      if (mediaWarning) {
        setSavedEntryId(result.entryId)
        setMessage(`${mediaWarning} 可在记录详情查看已保存内容。`)
      } else {
        router.replace(`/entry/${result.entryId}`)
      }
    } catch (error) {
      setMessage(`保存失败：${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setSaving(false)
    }
  }, [assets, budget, mediaDeps, newArea, newMode, newName, notePrivate, notePublic, placeId, rating, resetForm, saving, tagIds, visitDate])

  if (loadError) return <ErrorState message={loadError} onRetry={load} />

  const candidates = placeQuery.trim()
    ? places.filter((p) => `${p.name}${p.area ?? ''}`.includes(placeQuery.trim())).slice(0, 6)
    : places.slice(0, 6)
  const selectedPlace = places.find((p) => p.id === placeId)
  // 按钮三态（文案即门槛，对标 Web Record）：缺地点 → 先选择地点；缺内容 → 添加照片或写写感受。
  const aiGate = aiNextGate({
    placeId: placeId ?? undefined,
    newPlaceName: newMode ? newName : undefined,
    notePrivate,
    notePublic,
    photoCount: assets.length,
  })

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {message ? <Text style={styles.message}>{message}</Text> : null}

      {/* 照片置顶（对标 Web Record）：拍照/多选 → 缩略图 → 点图开灯箱预览，封面走灯箱/角标显式操作 */}
      <Card style={styles.section}>
        <SectionTitle right={<Text style={styles.muted}>{assets.length}/{MAX_PHOTOS}</Text>}>照片（第一张为封面）</SectionTitle>
        <View style={styles.photoGrid}>
          {assets.map((asset, index) => (
            <View key={`${asset.uri}-${index}`} style={styles.photoWrap}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`预览第 ${index + 1} 张照片`}
                onPress={() => setPreviewIndex(index)}
              >
                <Image source={{ uri: asset.uri }} style={styles.photo} contentFit="cover" />
              </Pressable>
              {index === 0 ? (
                <Text style={styles.coverTag}>封面</Text>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="设为封面"
                  onPress={() => setCover(index)}
                  style={styles.setCoverButton}
                  hitSlop={6}
                >
                  <Text style={styles.setCoverText}>设为封面</Text>
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="移除照片"
                onPress={() => removeAsset(index)}
                style={styles.removeButton}
                hitSlop={8}
              >
                <Text style={styles.removeText}>✕</Text>
              </Pressable>
            </View>
          ))}
        </View>
        <View style={styles.photoActions}>
          <AppButton label="选择照片" variant="secondary" onPress={() => pick('library')} style={styles.grow} />
          <AppButton label="拍照" variant="secondary" onPress={() => pick('camera')} style={styles.grow} />
          {saving ? <ActivityIndicator color={colors.terra} /> : null}
        </View>
      </Card>

      <Lightbox
        visible={previewIndex != null}
        images={assets.map((asset) => asset.uri)}
        index={previewIndex ?? 0}
        onIndex={setPreviewIndex}
        onClose={() => setPreviewIndex(null)}
        coverIndex={0}
        onSetCover={setCover}
      />

      <Card style={styles.section}>
        <SectionTitle>地点</SectionTitle>
        {newMode ? (
          <View style={styles.stack}>
            <TextField label="地点名称" value={newName} onChangeText={setNewName} placeholder="如：西海岸日落咖啡" />
            <TextField label="区域" value={newArea} onChangeText={setNewArea} placeholder="如：海口 · 西海岸" />
            <Pressable onPress={() => setNewMode(false)} hitSlop={8}>
              <Text style={styles.link}>← 从已有地点选择</Text>
            </Pressable>
          </View>
        ) : selectedPlace ? (
          <View style={styles.stack}>
            <Text style={styles.selectedPlace}>
              📍 {selectedPlace.name}
              {selectedPlace.area ? ` · ${selectedPlace.area}` : ''}
            </Text>
            <Pressable onPress={() => setPlaceId(null)} hitSlop={8}>
              <Text style={styles.link}>重新选择</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.stack}>
            <TextField
              value={placeQuery}
              onChangeText={setPlaceQuery}
              placeholder="搜索或选择地点"
            />
            <View style={styles.chipWrap}>
              {candidates.map((p) => (
                <Chip key={p.id} label={p.name} onPress={() => setPlaceId(p.id)} />
              ))}
              <Chip label="＋ 新地点" onPress={() => setNewMode(true)} />
            </View>
          </View>
        )}
      </Card>

      <Card style={styles.section}>
        <SectionTitle>日期与评分</SectionTitle>
        <View style={styles.stack}>
          <View style={styles.inlineRow}>
            <View style={styles.grow}>
              <TextField label="到访日期（YYYY-MM-DD）" value={visitDate} onChangeText={setVisitDate} placeholder="2026-09-18" />
            </View>
            <Chip label="今天" onPress={() => setVisitDate(todayIso())} />
          </View>
          <View style={styles.ratingRow}>
            <Text style={styles.ratingLabel}>评分</Text>
            <Stars value={rating} editable size={28} onChange={setRating} />
          </View>
          <TextField
            label="预算（人均元，可空）"
            value={budget}
            onChangeText={setBudget}
            keyboardType="number-pad"
            placeholder="如：45"
          />
        </View>
      </Card>

      <Card style={styles.section}>
        <SectionTitle>感受与公开理由</SectionTitle>
        <View style={styles.stack}>
          <TextField
            label="私密感受（仅自己可见）"
            value={notePrivate}
            onChangeText={setNotePrivate}
            placeholder="用微信语音输入法直接说…"
            multiline
            autoGrow
            minHeight={120}
          />
          <TextField
            label="公开分享理由（分享时展示，可空）"
            value={notePublic}
            onChangeText={setNotePublic}
            placeholder="如：夜景超美，适合拍照，人均也不贵…"
            multiline
            autoGrow
            minHeight={80}
          />
        </View>
      </Card>

      <Card style={styles.section}>
        <SectionTitle right={<Text style={styles.muted}>已选 {tagIds.length}</Text>}>标签</SectionTitle>
        <GroupedTagPicker
          groups={tagGroups}
          selectedIds={tagIds}
          onToggle={(tagId) => setTagIds((ids) => toggleTagId(ids, tagId))}
        />
        <InlineTagCreator busy={creatingTag} onCreate={handleCreateTag} />
      </Card>

      <Card style={styles.section}>
        <SectionTitle right={<Text style={styles.muted}>可改</Text>}>下一步：AI 整理</SectionTitle>
        <Text style={styles.muted}>
          把上面的照片、地点、感受一起带进整理页：AI 清洗感受（仅自己可见）＋ 写一句公开理由，逐项确认后才入库；
          超时或未联网会退回本地推测并明确标注，也可以随时改成「不整理，直接保存」。
        </Text>
        <AppButton label={aiGate.label} onPress={handleNextToAi} disabled={!aiGate.canNext} />
      </Card>

      <AppButton label={saving ? '保存中…' : '不整理，直接保存记录'} variant="secondary" onPress={handleSave} loading={saving} />
      {savedEntryId ? (
        <AppButton label="查看已保存记录" variant="ghost" onPress={() => router.push(`/entry/${savedEntryId}`)} />
      ) : null}
    </ScrollView>
  )
}

const styles = themedStyles(() => StyleSheet.create({
  // screen 供 ScrollView 铺底；grow 只留给子元素撑满（按钮），不带背景，避免盖掉 variant 底色。
  screen: { flex: 1, backgroundColor: colors.paper },
  grow: { flex: 1 },
  container: { padding: 16, gap: 14, paddingBottom: 48 },
  section: { gap: 12 },
  stack: { gap: 10 },
  message: { fontSize: 13, color: colors.terraDeep, lineHeight: 20 },
  link: { fontSize: 13, color: colors.terraDeep },
  selectedPlace: { fontSize: 15, fontWeight: '700', color: colors.ink },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  inlineRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ratingLabel: { fontSize: 13, fontWeight: '700', color: colors.ink },
  muted: { fontSize: 12, color: colors.inkMuted },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoWrap: { position: 'relative' },
  photo: { width: 88, height: 110, borderRadius: 10, backgroundColor: colors.cardDeep },
  coverTag: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: colors.terra,
    color: colors.white,
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  setCoverButton: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  setCoverText: { color: colors.white, fontSize: 10 },
  removeButton: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: { color: colors.white, fontSize: 12, lineHeight: 14 },
  photoActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
}))
