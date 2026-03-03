import ContactForm from '@/app/components/ContactForm'

export const metadata = {
  title: 'Skilmálar — Handriti',
  description: 'Notkunarskilmálar Handriti',
}

export default function SkilmalarPage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-bold text-zinc-100 mb-2">Notkunarskilmálar</h1>
        <p className="text-sm text-zinc-500 mb-10">Síðast uppfært: 1. mars 2026</p>

        <div className="space-y-8 text-sm text-zinc-300 leading-relaxed">
          {/* 1. Almennt */}
          <section>
            <h2 className="text-lg font-semibold text-zinc-100 mb-3">1. Almennt</h2>
            <p>
              Handriti (hér eftir „þjónustan") er hugbúnaður sem veitir gervigreindarstudda
              hljóðritun og samantekt á íslensku tali. Þjónustan er rekin af Cognia ehf.
              (netfang: handriti@gmail.com), hér eftir „rekstraraðili".
            </p>
            <p className="mt-2">
              Með því að nota þjónustuna samþykkir þú þessa skilmála í heild sinni. Ef þú
              samþykkir ekki skilmálana skaltu hætta notkun þjónustunnar.
            </p>
          </section>

          {/* 2. Þjónustan */}
          <section>
            <h2 className="text-lg font-semibold text-zinc-100 mb-3">2. Lýsing á þjónustu</h2>
            <p>Handriti býður upp á eftirfarandi eiginleika:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Hljóðritun tals (speech-to-text) á íslensku</li>
              <li>Sjálfvirka samantekt og glósugerð</li>
              <li>Beinlínu (realtime) samtalsaðstoð</li>
              <li>Vistun og yfirlit yfir fyrri lotur</li>
            </ul>
            <p className="mt-3 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-amber-300/90">
              <strong>Fyrirvari um gervigreind:</strong> Allt efni sem þjónustan framleiðir er
              búið til af gervigreind og getur innihaldið villur, misskilning eða ónákvæmni.
              Notandi ber ábyrgð á að yfirfara og staðfesta allt efni áður en það er notað í
              opinberum eða faglegum tilgangi. Rekstraraðili ábyrgist ekki nákvæmni eða
              áreiðanleika gervigreindarvinnslunnar.
            </p>
          </section>

          {/* 3. Notkunarskilmálar */}
          <section>
            <h2 className="text-lg font-semibold text-zinc-100 mb-3">3. Notkunarskilmálar</h2>
            <p>Notandi skuldbindur sig til að:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Nota þjónustuna eingöngu í löglegum tilgangi</li>
              <li>Hljóðrita ekki samtöl án samþykkis allra aðila þar sem slíkt er áskilið samkvæmt lögum</li>
              <li>Deila ekki aðgangsupplýsingum sínum með öðrum</li>
              <li>Hlíta takmörkunum á notkun sem tilgreindar eru í áskriftaráætlun</li>
              <li>Misnota ekki þjónustuna með því að senda skaðlegt, ólöglegt eða villandi efni</li>
            </ul>
            <p className="mt-2">
              Notandi ber fulla ábyrgð á öllu efni sem hann hleður upp eða hljóðritar með
              þjónustunni. Rekstraraðili ber enga ábyrgð á efni notenda.
            </p>
          </section>

          {/* 4. Áskrift og greiðslur */}
          <section>
            <h2 className="text-lg font-semibold text-zinc-100 mb-3">4. Áskrift og greiðslur</h2>
            <p>
              Greiðslur eru unnar af <strong>Paddle.com Market Limited</strong> sem starfar sem
              viðurkenndur söluaðili (Merchant of Record). Paddle sér um alla greiðsluvinnslu,
              virðisaukaskatt (VSK) og skattameðhöndlun.
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Áskrift endurnýjast sjálfkrafa í hverjum mánuði nema henni sé sagt upp</li>
              <li>Verð getur breyst með minnst 30 daga fyrirvara</li>
              <li>Uppsögn tekur gildi í lok yfirstandandi greiðslutímabils</li>
              <li>Notandi hefur áfram aðgang að þjónustunni til loka greidds tímabils</li>
            </ul>
          </section>

          {/* 5. Prufutímabil */}
          <section>
            <h2 className="text-lg font-semibold text-zinc-100 mb-3">5. Prufutímabil</h2>
            <p>
              Nýir notendur geta fengið prufutímabil með takmarkaðri notkun. Að prufutímabili
              loknu þarf notandi að skrá sig í áskrift til að halda áfram notkun. Notkun á
              prufutímabili er háð sömu takmörkunum og aðrar áskriftaráætlanir.
            </p>
          </section>

          {/* 6. Endurgreiðslur */}
          <section>
            <h2 className="text-lg font-semibold text-zinc-100 mb-3">6. Endurgreiðslur</h2>
            <p>
              Notandi getur óskað eftir endurgreiðslu innan <strong>14 daga</strong> frá
              greiðslu ef þjónustan uppfyllir ekki væntingar. Endurgreiðslubeiðnir skulu
              sendar á handriti@gmail.com. Eftir 14 daga er greiðsla óafturkræf fyrir
              viðkomandi tímabil.
            </p>
            <p className="mt-2">
              Endurgreiðslur eru unnar af Paddle í samræmi við greiðsluskilmála þeirra.
            </p>
          </section>

          {/* 7. Notkunartakmarkanir */}
          <section>
            <h2 className="text-lg font-semibold text-zinc-100 mb-3">7. Notkunartakmarkanir</h2>
            <p>
              Hver áskriftaráætlun hefur skilgreind takmörk á fjölda mínútna sem hægt er að
              hljóðrita á hverju greiðslutímabili. Þegar takmörkum er náð getur notandi ekki
              hljóðritað frekar fyrr en nýtt tímabil hefst eða áskrift er uppfærð.
            </p>
            <p className="mt-2">
              Rekstraraðili áskilur sér rétt til að breyta notkunartakmörkunum með hæfilegum
              fyrirvara.
            </p>
          </section>

          {/* 8. Takmörkun á ábyrgð */}
          <section>
            <h2 className="text-lg font-semibold text-zinc-100 mb-3">8. Takmörkun á ábyrgð</h2>
            <p>
              Þjónustan er veitt „eins og hún er" (as is) án nokkurrar ábyrgðar, hvort sem
              hún er bein eða óbein. Rekstraraðili ábyrgist ekki:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Að þjónustan verði alltaf tiltæk eða án truflana</li>
              <li>Nákvæmni, réttmæti eða fullnægjandi gæði gervigreindarvinnslunnar</li>
              <li>Að þjónustan henti tilteknum tilgangi notanda</li>
              <li>Varðveislu gagna ef bilun verður í kerfi eða hjá þriðju aðilum</li>
            </ul>
            <p className="mt-2">
              Rekstraraðili ber ekki ábyrgð á neinu óbeinu, tilfallandi eða afleiddu tjóni
              sem hlýst af notkun þjónustunnar, þ.m.t. tapi á gögnum eða tekjumissi.
              Heildarábyrgð rekstraraðila skal aldrei fara fram úr þeirri upphæð sem notandi
              hefur greitt á síðustu 3 mánuðum.
            </p>
          </section>

          {/* 9. Persónuvernd */}
          <section>
            <h2 className="text-lg font-semibold text-zinc-100 mb-3">9. Persónuvernd</h2>
            <p>
              Vinnsla persónuupplýsinga fer fram í samræmi við persónuverndarstefnu okkar sem
              er aðgengileg á{' '}
              <a href="/personuvernd" className="text-indigo-400 hover:text-indigo-300 underline">
                handriti.is/personuvernd
              </a>.
            </p>
          </section>

          {/* 10. Breytingar á skilmálum */}
          <section>
            <h2 className="text-lg font-semibold text-zinc-100 mb-3">10. Breytingar á skilmálum</h2>
            <p>
              Rekstraraðili áskilur sér rétt til að breyta þessum skilmálum hvenær sem er.
              Verulegar breytingar verða tilkynntar notendum með minnst 30 daga fyrirvara
              í tölvupósti eða með tilkynningu á vefsíðunni. Áframhaldandi notkun þjónustunnar
              eftir gildistöku breytinga telst samþykki á nýjum skilmálum.
            </p>
          </section>

          {/* 11. Uppsögn */}
          <section>
            <h2 className="text-lg font-semibold text-zinc-100 mb-3">11. Uppsögn og lokun</h2>
            <p>
              Rekstraraðili áskilur sér rétt til að loka eða fresta aðgangi notenda sem brjóta
              gegn þessum skilmálum, án fyrirvara ef brot er alvarlegt. Notandi getur hvenær
              sem er sagt upp áskrift sinni og óskað eftir eyðingu gagna sinna.
            </p>
          </section>

          {/* 12. Löggjöf */}
          <section>
            <h2 className="text-lg font-semibold text-zinc-100 mb-3">12. Löggjöf og varnarþing</h2>
            <p>
              Um þessa skilmála gilda íslensk lög. Ef upp kemur ágreiningur sem ekki er hægt
              að leysa með samningaviðræðum skal hann lagður fyrir Héraðsdóm Reykjavíkur.
            </p>
          </section>

          {/* Tengiliðir */}
          <section className="border-t border-zinc-800 pt-6">
            <h2 className="text-lg font-semibold text-zinc-100 mb-3">Tengiliðaupplýsingar</h2>
            <p>
              Cognia ehf.<br />
              Netfang:{' '}
              <a href="mailto:handriti@gmail.com" className="text-indigo-400 hover:text-indigo-300 underline">
                handriti@gmail.com
              </a>
            </p>
            <ContactForm />
          </section>
        </div>
      </div>
    </div>
  )
}
