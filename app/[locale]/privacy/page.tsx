import { setRequestLocale } from 'next-intl/server'
import ContactForm from '@/app/components/ContactForm'

// TODO: Add translated legal text for nb, da, sv locales.
// For now, Icelandic text is shown for all locales since legal translations
// require proper legal review before publishing.

interface Props {
  params: Promise<{ locale: string }>
}

export default async function PersonuverndPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-bold text-zinc-100 mb-2">Persónuverndarstefna</h1>
        <p className="text-sm text-zinc-500 mb-10">Síðast uppfært: 2. mars 2026</p>

        <div className="space-y-8 text-sm text-zinc-300 leading-relaxed">
          {/* 1. Ábyrgðaraðili */}
          <section>
            <h2 className="text-lg font-semibold text-zinc-100 mb-3">1. Ábyrgðaraðili</h2>
            <p>
              Ábyrgðaraðili fyrir vinnslu persónuupplýsinga er Cognia ehf.
              (netfang:{' '}
              <a href="mailto:handriti@gmail.com" className="text-indigo-400 hover:text-indigo-300 underline">
                handriti@gmail.com
              </a>
              ). Hægt er að hafa samband varðandi allar fyrirspurnir sem varða persónuvernd.
            </p>
          </section>

          {/* 2. Hvaða gögnum er safnað */}
          <section>
            <h2 className="text-lg font-semibold text-zinc-100 mb-3">2. Hvaða gögnum er safnað</h2>

            <h3 className="font-medium text-zinc-200 mt-4 mb-2">2.1 Notandaupplýsingar</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Nafn og netfang (frá innskráningarþjónustu)</li>
              <li>Notandanúmer</li>
              <li>Innskráningarsaga og tímasetningar</li>
            </ul>

            <h3 className="font-medium text-zinc-200 mt-4 mb-2">2.2 Hljóðgögn og uppskriftir</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Hljóðskrár sem notandi hleður upp eða hljóðritar — þessar eru sendar til vinnslu og eru <strong>ekki vistaðar varanlega</strong> á þjónum okkar</li>
              <li>Uppskriftir (transcripts) — textaútgáfa hljóðsins, vistuð í gagnagrunni</li>
              <li>Samantektir og glósur búnar til af gervigreind</li>
            </ul>

            <h3 className="font-medium text-zinc-200 mt-4 mb-2">2.3 Notkunargögn</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Fjöldi mínútna sem hljóðritaðar eru (til notkunarmælinga og innheimtu)</li>
              <li>Aðgerðaskrá (audit log) — hvaða aðgerðir notandi framkvæmir</li>
              <li>Áskriftarstaða og greiðsluupplýsingar (unnið af greiðsluþjónustu)</li>
            </ul>
          </section>

          {/* 3. Tilgangur vinnslu */}
          <section>
            <h2 className="text-lg font-semibold text-zinc-100 mb-3">3. Tilgangur vinnslu</h2>
            <p>Persónuupplýsingar eru unnar í eftirfarandi tilgangi:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Þjónustuveitingar:</strong> Til að veita hljóðritun, samantekt og aðra eiginleika þjónustunnar</li>
              <li><strong>Innheimta:</strong> Til að halda utan um áskrift, notkun og greiðslur</li>
              <li><strong>Öryggi:</strong> Til að vernda þjónustuna og koma í veg fyrir misnotkun</li>
              <li><strong>Umbætur:</strong> Til að bæta þjónustuna á grundvelli notkunarmynsturs (án persónugreinanlegra gagna)</li>
            </ul>
            <p className="mt-2">
              Lagalegur grundvöllur vinnslu er samningur (GDPR 6(1)(b)) fyrir þjónustuveitingar
              og innheimtu, og lögmætir hagsmunir (GDPR 6(1)(f)) fyrir öryggi og umbætur.
            </p>
          </section>

          {/* 4. Varðveisla */}
          <section>
            <h2 className="text-lg font-semibold text-zinc-100 mb-3">4. Varðveisla gagna</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Hljóðskrár:</strong> Sendar til vinnslu og ekki geymdar varanlega á okkar þjónum. Hljóðskrám sem hlaðið er upp er eytt úr tímabundinni geymslu strax eftir vinnslu.</li>
              <li><strong>Uppskriftir og samantektir:</strong> Geymdar þar til notandi eyðir þeim. Notandi getur eytt hverri lotu sjálfur í lotuyfirliti.</li>
              <li><strong>Tímabundnar lotur:</strong> Ef notandi velur &ldquo;tímabundna lotu&rdquo; eru niðurstöður aldrei vistaðar í gagnagrunn. Þær birtast eingöngu á skjá og eru sendar í tölvupósti notanda. Þegar glugganum er lokað hverfa gögnin.</li>
              <li><strong>Notkunargögn:</strong> Geymd á meðan áskrift er virk og í allt að 12 mánuði eftir uppsögn (vegna innheimtu og bókhalds)</li>
              <li><strong>Notandaupplýsingar:</strong> Geymdar hjá innskráningarþjónustu þar til notandi eyðir reikningi sínum</li>
            </ul>
          </section>

          {/* 5. Réttindi notenda */}
          <section>
            <h2 className="text-lg font-semibold text-zinc-100 mb-3">5. Réttindi notenda (GDPR)</h2>
            <p>Samkvæmt persónuverndarlögum átt þú rétt á:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Aðgangsrétti:</strong> Að fá upplýsingar um hvaða gögn eru geymd um þig</li>
              <li><strong>Leiðréttingarrétti:</strong> Að fá rangar upplýsingar leiðréttar</li>
              <li><strong>Eyðingarrétti:</strong> Að biðja um að gögnum þínum sé eytt (&ldquo;réttur til að gleymast&rdquo;)</li>
              <li><strong>Flutningsrétti:</strong> Að fá gögn þín afhent á véllæsilegu formi</li>
              <li><strong>Andmælarétti:</strong> Að andmæla vinnslu gagna sem byggir á lögmætum hagsmunum</li>
              <li><strong>Takmörkunarrétti:</strong> Að biðja um takmörkun á vinnslu gagna í ákveðnum tilvikum</li>
            </ul>
            <p className="mt-3">
              Til að nýta réttindi þín skaltu senda tölvupóst á{' '}
              <a href="mailto:handriti@gmail.com" className="text-indigo-400 hover:text-indigo-300 underline">
                handriti@gmail.com
              </a>
              . Við munum svara beiðni þinni innan 30 daga.
            </p>
            <p className="mt-2">
              Þú átt einnig rétt á að leggja fram kvörtun til Persónuverndar (personuvernd.is)
              ef þú telur að vinnsla gagna þinna brjóti gegn persónuverndarlögum.
            </p>
          </section>

          {/* 6. Vafrakökur */}
          <section>
            <h2 className="text-lg font-semibold text-zinc-100 mb-3">6. Vafrakökur (cookies)</h2>
            <p>Handriti notar eftirfarandi vafrakökur:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Lotukökur:</strong> Nauðsynlegar fyrir innskráningu og auðkenningu. Þessar kökur eru tæknilega nauðsynlegar og krefjast ekki sérstaks samþykkis.</li>
              <li><strong>Greiðslukökur:</strong> Notaðar við greiðsluferli. Settar af greiðsluþjónustu og háðar persónuverndarstefnu þeirra.</li>
            </ul>
            <p className="mt-2">
              Handriti notar <strong>ekki</strong> greiningarkökur (analytics), auglýsingakökur
              eða þriðja aðila rakningarkökur.
            </p>
          </section>

          {/* 7. Öryggi */}
          <section>
            <h2 className="text-lg font-semibold text-zinc-100 mb-3">7. Öryggi og tæknilegar ráðstafanir</h2>
            <p>Við leggjum áherslu á öryggi gagna:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Öll samskipti fara um HTTPS dulkóðaða tengingu</li>
              <li>Gagnagrunnur er dulkóðaður í hvíld (encryption at rest)</li>
              <li>Örugg aðgangsstýring og auðkenning</li>
              <li>Viðkvæmar upplýsingar eru geymdar í umhverfisbreytum, aldrei í frumkóða</li>
              <li>Hljóðvinnsluþjónusta geymir engin gögn — hvorki inntak né úttak (zero data retention)</li>
              <li>Hljóðskrám er eytt úr tímabundinni geymslu strax eftir vinnslu</li>
              <li>Notendur geta eytt lotum sínum hvenær sem er, og valið tímabundnar lotur sem vistast aldrei í kerfinu</li>
            </ul>
          </section>

          {/* 8. Breytingar */}
          <section>
            <h2 className="text-lg font-semibold text-zinc-100 mb-3">8. Breytingar á stefnu</h2>
            <p>
              Rekstraraðili áskilur sér rétt til að uppfæra þessa persónuverndarstefnu.
              Verulegar breytingar verða tilkynntar notendum í tölvupósti eða með tilkynningu
              á vefsíðunni. Dagsetning síðustu uppfærslu birtist efst á síðunni.
            </p>
          </section>

          {/* Tengiliðir */}
          <section className="border-t border-zinc-800 pt-6">
            <h2 className="text-lg font-semibold text-zinc-100 mb-3">Tengiliðaupplýsingar</h2>
            <p>
              Ef þú hefur spurningar um persónuvernd eða vilt nýta réttindi þín:<br />
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
