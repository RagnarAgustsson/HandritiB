import ContactForm from '@/app/components/ContactForm'

export const metadata = {
  title: 'Persónuvernd — Handriti',
  description: 'Persónuverndarstefna Handriti',
}

export default function PersonuverndPage() {
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
              <a href="mailto:hallo@handriti.is" className="text-indigo-400 hover:text-indigo-300 underline">
                hallo@handriti.is
              </a>
              ). Hægt er að hafa samband varðandi allar fyrirspurnir sem varða persónuvernd.
            </p>
          </section>

          {/* 2. Hvaða gögnum er safnað */}
          <section>
            <h2 className="text-lg font-semibold text-zinc-100 mb-3">2. Hvaða gögnum er safnað</h2>

            <h3 className="font-medium text-zinc-200 mt-4 mb-2">2.1 Notandaupplýsingar</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Nafn og netfang (frá innskráningarþjónustu Clerk)</li>
              <li>Notandanúmer (Clerk user ID)</li>
              <li>Innskráningarsaga og tímasetningar</li>
            </ul>

            <h3 className="font-medium text-zinc-200 mt-4 mb-2">2.2 Hljóðgögn og uppskriftir</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Hljóðskrár sem notandi hleður upp eða hljóðritar — þessar eru sendar beint til OpenAI til vinnslu og eru <strong>ekki vistaðar varanlega</strong> á þjónum okkar</li>
              <li>Uppskriftir (transcripts) — textaútgáfa hljóðsins, vistuð í gagnagrunni</li>
              <li>Samantektir og glósur búnar til af gervigreind</li>
            </ul>

            <h3 className="font-medium text-zinc-200 mt-4 mb-2">2.3 Notkunargögn</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Fjöldi mínútna sem hljóðritaðar eru (til notkunarmælinga og innheimtu)</li>
              <li>Aðgerðaskrá (audit log) — hvaða aðgerðir notandi framkvæmir</li>
              <li>Áskriftarstaða og greiðsluupplýsingar (unnið af Paddle)</li>
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

          {/* 4. Þriðju aðilar */}
          <section>
            <h2 className="text-lg font-semibold text-zinc-100 mb-3">4. Þriðju aðilar og vinnsluaðilar</h2>
            <p>Eftirfarandi þriðju aðilar fá aðgang að gögnum sem hluti af þjónustuveitingu:</p>

            <div className="mt-3 space-y-3">
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                <div className="font-medium text-zinc-200">OpenAI</div>
                <div className="text-zinc-400 mt-1">Hljóðvinnsla (speech-to-text) og gervigreindarsamantekt. Gögn eru send til OpenAI API og eru ekki notuð til þjálfunar samkvæmt API-skilmálum þeirra. Við notum <code className="text-zinc-300">store: false</code> á öllum API-köllum sem þýðir að OpenAI geymir hvorki inntak né úttak kalla okkar — ekki einu sinni tímabundið til eftirlits (zero data retention).</div>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                <div className="font-medium text-zinc-200">Clerk</div>
                <div className="text-zinc-400 mt-1">Auðkenning og innskráning. Geymir nafn, netfang og innskráningarsögu.</div>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                <div className="font-medium text-zinc-200">Neon (PostgreSQL)</div>
                <div className="text-zinc-400 mt-1">Gagnagrunnshýsing. Uppskriftir, samantektir og notkunargögn eru geymd í dulkóðuðum gagnagrunni.</div>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                <div className="font-medium text-zinc-200">Paddle</div>
                <div className="text-zinc-400 mt-1">Greiðsluvinnsla sem viðurkenndur söluaðili (Merchant of Record). Paddle safnar og varðveitir greiðsluupplýsingar í samræmi við eigin persónuverndarstefnu.</div>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                <div className="font-medium text-zinc-200">Resend</div>
                <div className="text-zinc-400 mt-1">Sendingar á samantektum í tölvupósti. Fær aðgang að netfangi notanda og efni samantektar.</div>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                <div className="font-medium text-zinc-200">Vercel</div>
                <div className="text-zinc-400 mt-1">Vefhýsing og keyrsla hugbúnaðar. Aðgangur að serverless keyrslu og umferðargögnum.</div>
              </div>
            </div>
          </section>

          {/* 5. Varðveisla */}
          <section>
            <h2 className="text-lg font-semibold text-zinc-100 mb-3">5. Varðveisla gagna</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Hljóðskrár:</strong> Sendar beint til OpenAI og ekki geymdar varanlega á okkar þjónum. Hljóðskrár sem hlaðið er upp eru eytt úr tímabundinni geymslu strax eftir vinnslu.</li>
              <li><strong>Uppskriftir og samantektir:</strong> Geymdar þar til notandi eyðir þeim. Notandi getur eytt hverri lotu sjálfur í lotuyfirliti.</li>
              <li><strong>Tímabundnar lotur:</strong> Ef notandi velur &ldquo;tímabundna lotu&rdquo; eru niðurstöður aldrei vistaðar í gagnagrunn. Þær birtast eingöngu á skjá og eru sendar í tölvupóst notanda. Þegar glugganum er lokað hverfa gögnin.</li>
              <li><strong>Notkunargögn:</strong> Geymd á meðan áskrift er virk og í allt að 12 mánuði eftir uppsögn (vegna innheimtu og bókhalds)</li>
              <li><strong>Notandaupplýsingar:</strong> Geymdar hjá Clerk þar til notandi eyðir reikningi sínum</li>
            </ul>
          </section>

          {/* 6. Réttindi notenda */}
          <section>
            <h2 className="text-lg font-semibold text-zinc-100 mb-3">6. Réttindi notenda (GDPR)</h2>
            <p>Samkvæmt persónuverndarlögum átt þú rétt á:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Aðgangsrétti:</strong> Að fá upplýsingar um hvaða gögn eru geymd um þig</li>
              <li><strong>Leiðréttingarrétti:</strong> Að fá rangar upplýsingar leiðréttar</li>
              <li><strong>Eyðingarrétti:</strong> Að biðja um að gögn þín séu eytt („réttur til að gleymast")</li>
              <li><strong>Flutningsrétti:</strong> Að fá gögn þín afhent á véllæsilegu formi</li>
              <li><strong>Andmælarétti:</strong> Að andmæla vinnslu gagna sem byggir á lögmætum hagsmunum</li>
              <li><strong>Takmörkunarrétti:</strong> Að biðja um takmörkun á vinnslu gagna í ákveðnum tilvikum</li>
            </ul>
            <p className="mt-3">
              Til að nýta réttindi þín skaltu senda tölvupóst á{' '}
              <a href="mailto:hallo@handriti.is" className="text-indigo-400 hover:text-indigo-300 underline">
                hallo@handriti.is
              </a>
              . Við munum svara beiðni þinni innan 30 daga.
            </p>
            <p className="mt-2">
              Þú átt einnig rétt á að leggja fram kvörtun til Persónuverndar (personuvernd.is)
              ef þú telur að vinnsla gagna þinna brjóti gegn persónuverndarlögum.
            </p>
          </section>

          {/* 7. Vafrakökur */}
          <section>
            <h2 className="text-lg font-semibold text-zinc-100 mb-3">7. Vafrakökur (cookies)</h2>
            <p>Handriti notar eftirfarandi vafrakökur:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Lotukökur (Clerk):</strong> Nauðsynlegar fyrir innskráningu og auðkenningu. Þessar kökur eru tæknilega nauðsynlegar og krefjast ekki sérstaks samþykkis.</li>
              <li><strong>Greiðslukökur (Paddle):</strong> Notaðar við greiðsluferli. Settar af Paddle og háðar persónuverndarstefnu þeirra.</li>
            </ul>
            <p className="mt-2">
              Handriti notar <strong>ekki</strong> greiningarkökur (analytics), auglýsingakökur
              eða þriðja aðila rakningarkökur.
            </p>
          </section>

          {/* 8. Öryggi */}
          <section>
            <h2 className="text-lg font-semibold text-zinc-100 mb-3">8. Öryggi og tæknilegar ráðstafanir</h2>
            <p>Við leggjum áherslu á öryggi gagna:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Öll samskipti fara um HTTPS dulkóðaða tengingu</li>
              <li>Gagnagrunnur er dulkóðaður í hvíld (encryption at rest)</li>
              <li>Aðgangsstýring er í höndum Clerk með öruggri auðkenningu</li>
              <li>API-lyklar og viðkvæmar upplýsingar eru geymdar í umhverfisbreytum, aldrei í frumkóða</li>
              <li>OpenAI API-köll nota <code className="text-zinc-300">store: false</code> — engin gögn geymd hjá OpenAI, ekki einu sinni til eftirlits (zero data retention)</li>
              <li>Hljóðskrár eru eytt úr tímabundinni geymslu (Vercel Blob) strax eftir vinnslu</li>
              <li>Notendur geta eytt lotum sínum hvenær sem er, og valið tímabundnar lotur sem vistast aldrei í kerfinu</li>
            </ul>
          </section>

          {/* 9. Breytingar */}
          <section>
            <h2 className="text-lg font-semibold text-zinc-100 mb-3">9. Breytingar á stefnu</h2>
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
              <a href="mailto:hallo@handriti.is" className="text-indigo-400 hover:text-indigo-300 underline">
                hallo@handriti.is
              </a>
            </p>
            <ContactForm />
          </section>
        </div>
      </div>
    </div>
  )
}
