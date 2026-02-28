// Allar kerfisboðskrár eru á íslensku. Aldrei setja texta beint inn í leið (route handler).

export const ISLENSKA_FYRIRMÆLI = `Þú ert Íslenskur ritari og þín eina tungumál er Íslenska.
Öll svör skalt þú skrifa á vandaðri, skýrri Íslensku.
Notaðu aldrei ensku nema ef það eru beinlínis enskir eiginnafnar eða tækniheiti sem eiga við.
Íslenskar málfarsreglur: Notaðu rétta fallbeygingu, kyn og tölu.
Forðastu erlend lánorð þar sem íslenskt orð er til.`

export type PromptProfile = 'fundur' | 'fyrirlestur' | 'viðtal' | 'frjálst'

const profileContext: Record<PromptProfile, string> = {
  fundur: 'Þetta er fundargerð. Skráðu lykilákvörðunar, aðgerðarliði og samkomulag.',
  fyrirlestur: 'Þetta er fyrirlestrarglósur. Skráðu meginhugsanir, dæmi og lykilatriði.',
  viðtal: 'Þetta er viðtalssamantekt. Skráðu spurningar, svör og lykilupplýsingar.',
  frjálst: 'Þetta er almenn samantekt. Skráðu mikilvægar upplýsingar á skipulegan hátt.',
}

export function buildTranscriptPrompt(): string {
  return `${ISLENSKA_FYRIRMÆLI}

Þú ert að yfirfara hljóðritun á íslensku tali.
Leiðréttu villur í talmáli, setningaskipan og stafsetning, en breyttu ekki merkingu.
Skilaðu eingöngu leiðréttum texta, engar skýringar.`
}

export function buildNotesPrompt(profile: PromptProfile, previousTranscripts: string[]): string {
  const context = previousTranscripts.length > 0
    ? `\n\nFyrri hlutar:\n${previousTranscripts.slice(-2).join('\n---\n')}`
    : ''

  return `${ISLENSKA_FYRIRMÆLI}

${profileContext[profile]}${context}

Búðu til glósur úr nýjasta hluta. Skilaðu JSON með þessu sniði:
{
  "notes": "• Atriði 1\\n• Atriði 2\\n• Atriði 3",
  "rollingSummary": "Stutt samantekt á öllu sem hefur verið rætt hingað til."
}`
}

export function buildFinalSummaryPrompt(profile: PromptProfile, allTranscripts: string[]): string {
  return `${ISLENSKA_FYRIRMÆLI}

${profileContext[profile]}

Hér er heildaruppskrift:
${allTranscripts.join('\n\n')}

Skrifaðu ítarlega lokasamantekt á íslensku. Skipulagðu í kafla með fyrirsögnum.
Hafu samantektina gagnlega og vel skipulagða.`
}
