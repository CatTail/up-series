import type { Bilingual, Participation } from './types.ts'

/** Display text for each participation status. ui.json's `status.<p>` keys must match (tested). */
export const PARTICIPATION_TEXT: Record<Participation, Bilingual> = {
  present: { zh: '出镜', en: 'Filmed' },
  absent: { zh: '未出镜', en: 'Not filmed' },
  audio_only: { zh: '仅录音和照片', en: 'Audio and photos only' },
  archival_interview: { zh: '生前录制的访谈', en: 'Interview recorded before death' },
  footage_only: { zh: '只出现在旧片段中', en: 'Archive footage only' },
  deceased: { zh: '已去世', en: 'Deceased' },
}
