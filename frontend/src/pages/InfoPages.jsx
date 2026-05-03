import { Mail, Users, BookOpen, ShieldCheck } from "lucide-react";

/** Geçerli bilgi sayfası URL parçaları (App.jsx ile senkron) */
export const INFO_SLUGS = ["ekip", "gelecek-ozellikler", "nasil-kullanilir", "destek", "vizyon", "platform"];

export function parseInfoSlug(pathname) {
  if (!pathname.startsWith("/bilgi")) return null;
  const raw = pathname.replace(/^\/bilgi\/?/, "").split("/").filter(Boolean)[0];
  if (!raw) return "ekip";
  return INFO_SLUGS.includes(raw) ? raw : "ekip";
}

export function isInfoPath(pathname) {
  return pathname.startsWith("/bilgi");
}

const SIBLING_NAV_TIGHT_ROW_LABELS = new Set(["Hakkında", "Platform"]);

const NAV_GROUPS = [
  {
    label: "Hakkında",
    items: [
      { slug: "vizyon", label: "Vizyon" },
      { slug: "ekip", label: "Ekip" },
    ],
  },
  {
    label: "Platform",
    items: [
      { slug: "platform", label: "Özellikler" },
      { slug: "nasil-kullanilir", label: "Nasıl kullanılır" },
      { slug: "gelecek-ozellikler", label: "Gelecek özellikler" },
    ],
  },
  {
    label: "Destek",
    items: [
      { slug: "destek", label: "İletişim" },
    ],
  },
];

/** Sözleşme hazırlama: katlanmış köşeli belge + madde satırları + taslak kalemi */
function ContractDraftGlyph() {
  return (
    <svg
      className="infoContractDraftGlyph"
      viewBox="0 0 24 24"
      width={24}
      height={24}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M8 12.5h7M8 16h5M8 19.5h5" />
      <path d="M17.2 8.8 21 12.6l-6.8 6.8-3.4.6.6-3.4 6.8-6.8z" />
    </svg>
  );
}

function InfoSiblingNav({ activeSlug, onNavigateInfo }) {
  return (
    <nav className="infoSiblingNav" aria-label="Bilgi sayfaları">
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="infoSiblingNavGroup">
          <span className="infoSiblingNavGroupLabel">{group.label}</span>
          <ul
            className={
              SIBLING_NAV_TIGHT_ROW_LABELS.has(group.label)
                ? "infoSiblingNavList infoSiblingNavList--tightRow"
                : "infoSiblingNavList"
            }
          >
            {group.items.map((item) => (
              <li key={item.slug}>
                <button
                  type="button"
                  className={item.slug === activeSlug ? "infoSiblingNavBtn is-active" : "infoSiblingNavBtn"}
                  onClick={() => onNavigateInfo(item.slug)}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function TeamBody() {
  const members = [
    {
      name: "Oğuzhan",
      role: "Yönetici",
      note: "Ürün yönü, öncelikler ve ekip koordinasyonu.",
    },
    {
      name: "Tuğfan Çalışkan",
      role: "Frontend",
      note: "Arayüz, deneyim ve istemci tarafı entegrasyonları.",
    },
    {
      name: "Yağmur Direk",
      role: "Backend",
      note: "API, veri akışı ve güvenli sunucu mimarisi.",
    },
    {
      name: "Zeynep",
      role: "AI",
      note: "Model akışları, analiz kalitesi ve prompt stratejileri.",
    },
  ];
  return (
    <div className="infoTeamGrid">
      {members.map((m) => (
        <article key={m.name} className="infoCard infoCardTeam">
          <div className="infoCardIcon" aria-hidden>
            <Users size={22} strokeWidth={1.75} />
          </div>
          <h2 className="infoCardTitle">{m.name}</h2>
          <p className="infoCardRole">{m.role}</p>
          <p className="infoCardNote">{m.note}</p>
        </article>
      ))}
    </div>
  );
}

function RoadmapBody() {
  return (
    <div className="infoRichStack infoSpreadRoadmap">
      <section className="infoHighlight">
        <div className="infoHighlightIcon" aria-hidden>
          <ContractDraftGlyph />
        </div>
        <div>
          <h2 className="infoSectionTitle">Sözleşme hazırlama</h2>
          <p className="infoSectionText">
            Yakın dönemde ContratAi yalnızca analiz ve uyum odaklı kalmayacak; seçeceğiniz şablon ve politika setiyle
            taslak sözleşme üretimi, madde önerileri ve hukuki dil tutarlılığı için asistan desteği planlanıyor.
          </p>
        </div>
      </section>
      <ul className="infoBulletList infoBulletList--roadmapCols">
        <li>Şablon kütüphanesi ve sektör paketleri (hizmet, gizlilik, çalışan sözleşmesi vb.)</li>
        <li>Mevcut analiz sonuçlarından “güvenli madde” önerileriyle otomatik taslak oluşturma</li>
        <li>Versiyonlama ve karşılaştırma ile taslak revizyonlarını izleme</li>
      </ul>
    </div>
  );
}

function HowToBody() {
  const steps = [
    {
      title: "Dosya yükleyin",
      text: "PDF, Word veya metin sözleşmenizi ana ekrandaki yükleme alanından seçin veya sürükleyip bırakın.",
    },
    {
      title: "Analizi başlatın",
      text: "“Sözleşmeyi yükle ve analiz et” ile pipeline çalışır; işlem adımları ekranda takip edilir.",
    },
    {
      title: "Özet ve riskleri inceleyin",
      text: "Sonuç panelinde toplam madde, ihlal ve yüksek risk sayılarına göz atın; detay için maddeler sayfasına geçin.",
    },
    {
      title: "Maddeler ve sohbet",
      text: "Madde listesinde uyarı ve risk etiketlerini kullanın; gerektiğinde AI-Services sohbetiyle metin üzerinde soru sorun.",
    },
    {
      title: "Karşılaştırma (isteğe bağlı)",
      text: "Önceki sürümü V1 olarak kaydedip yeni dosyayı analiz ederek sözleşme sürümlerini yan yana görebilirsiniz.",
    },
  ];
  return (
    <ol className="infoSteps">
      {steps.map((s, i) => (
        <li key={s.title} className="infoStep">
          <span className="infoStepNum">{i + 1}</span>
          <div>
            <h2 className="infoStepTitle">{s.title}</h2>
            <p className="infoStepText">{s.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function SupportBody() {
  const email = "tufancaliskan12@gmail.com";
  return (
    <div className="infoRichStack">
      <a className="infoMailCard" href={`mailto:${email}`}>
        <span className="infoMailCardIcon" aria-hidden>
          <Mail size={22} strokeWidth={1.75} />
        </span>
        <span className="infoMailCardLabel">Destek e-postası</span>
        <span className="infoMailCardAddr">{email}</span>
      </a>
      <p className="infoSectionText">
        Teknik sorunlar, erişim veya iş birliği talepleri için bu adrese yazabilirsiniz. Mümkün olan en kısa sürede
        dönüş yapılır; acil üretim sorunlarında lütfen konu satırında <strong>ContratAi</strong> ve kısa özet belirtin.
      </p>
      <section className="infoFaqMini" aria-labelledby="info-faq-h">
        <h2 id="info-faq-h" className="infoSectionTitle">
          Sık sorulanlar
        </h2>
        <dl className="infoFaqList">
          <dt>Analiz ne kadar sürer?</dt>
          <dd>Dosya boyutuna ve sunucu yüküne bağlıdır; adım adım ilerleme ekranda gösterilir.</dd>
          <dt>Verilerim nerede işlenir?</dt>
          <dd>Analiz, tanımlı backend ve AI servisleri üzerinden yürütülür; kurumsal kullanımda ek politikalar için iletişime geçin.</dd>
        </dl>
      </section>
    </div>
  );
}

/** Vizyon hero: belge + büyüteç — netlik ve inceleme */
function VisionHeroGlyph() {
  return (
    <svg
      className="infoVisionHeroGlyph"
      viewBox="0 0 24 24"
      width={28}
      height={28}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M7 3.5h7.5L17 5.5v14.5a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 20V5A1.5 1.5 0 0 1 7 3.5z" />
      <path d="M14.5 3.5V6h2.5" />
      <path d="M8.5 10h4.5M8.5 13h3M8.5 16h5" strokeWidth="1.5" opacity="0.9" />
      <circle cx="16.25" cy="9.25" r="3.25" />
      <path d="M18.4 11.4 21 14" strokeWidth="1.65" />
    </svg>
  );
}

/** Odak: hedef halkaları + merkez nokta */
function VisionFocusGlyph() {
  return (
    <svg
      className="infoVisionCustomGlyph"
      viewBox="0 0 24 24"
      width={20}
      height={20}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="8" opacity="0.35" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.75" fill="currentColor" stroke="none" />
      <path d="M12 4v1.5M12 18.5V20M4 12h1.5M18.5 12H20" opacity="0.45" />
    </svg>
  );
}

/** Birlikte değer: çift silüet — uzman + sistem aynı akışta */
function VisionSynergyGlyph() {
  return (
    <svg
      className="infoVisionCustomGlyph"
      viewBox="0 0 24 24"
      width={20}
      height={20}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="9" cy="8" r="2.85" />
      <path d="M3.75 20.25v-.65a4.25 4.25 0 0 1 4.25-4.25h2a4.25 4.25 0 0 1 4.25 4.25v.65" />
      <circle cx="16.25" cy="8" r="2.85" />
      <path d="M20.25 20.25v-.65a4.25 4.25 0 0 0-3.1-4.08" />
    </svg>
  );
}

function VisionBody() {
  const pillars = [
    {
      title: "Odak",
      text: "Uyarı, ihlal ve politika sinyallerini madde düzeyinde toplar; dikkatinizi doğru paragrafa taşır.",
      renderIcon: () => <VisionFocusGlyph />,
    },
    {
      title: "Güvenilir uyum",
      text: "Özetler, kontrol listeleri ve sürüm karşılaştırmasıyla tekrarlanabilir bir inceleme ritmi sunar.",
      renderIcon: () => <ShieldCheck size={20} strokeWidth={1.75} />,
    },
    {
      title: "Birlikte değer",
      text: "Uzman yorumu ile model çıktısını aynı akışta harmanlar; ürün yol haritası zaman içinde genişler.",
      renderIcon: () => <VisionSynergyGlyph />,
    },
  ];

  return (
    <div className="infoVisionPage">
      <section className="infoVisionHero" aria-labelledby="vision-hero-title">
        <div className="infoVisionHeroInner">
          <div className="infoVisionHeroIcon">
            <VisionHeroGlyph />
          </div>
          <h2 id="vision-hero-title" className="infoVisionHeroTitle">
            Sözleşmelerde netlik ve kontrol
          </h2>
          <p className="infoVisionHeroLead">
            ContratAi, hukuk ve uyum ekiplerinin metinleri hızlı okumasına, riskleri tek ekranda görmesine ve politika
            uyumunu sürdürülebilir kılmaya yardımcı olmak için tasarlanmıştır. Amaç, dağınık dosya ve e-posta
            döngülerini azaltıp karar verilebilir bir çalışma masası sunmaktır.
          </p>
        </div>
      </section>

      <div className="infoVisionPillars">
        {pillars.map(({ title, text, renderIcon }) => (
          <article key={title} className="infoVisionPillar">
            <div className="infoVisionPillarIcon" aria-hidden>
              {renderIcon()}
            </div>
            <h3 className="infoVisionPillarTitle">{title}</h3>
            <p className="infoVisionPillarText">{text}</p>
          </article>
        ))}
      </div>

      <p className="infoVisionFoot">
        ContratAi Workbench vizyonu: analizden aksiyona giden kısa ve izlenebilir bir yol.
      </p>
    </div>
  );
}

function PlatformBody() {
  return (
    <ul className="infoFeatureGrid">
      {[
        { t: "Yükle ve analiz et", d: "Çoklu format desteği ve aşamalı işlem durumu." },
        { t: "Madde bazlı risk", d: "Uyarı, ihlal ve yüksek risk etiketleriyle odaklanma." },
        { t: "Özet panelleri", d: "Yönetici özeti ve istatistik kartları." },
        { t: "Sürüm karşılaştırma", d: "V1 / V2 anlamsal karşılaştırma akışı." },
        { t: "Sözleşme asistanı", d: "Yüklenen metin bağlamında sohbet ile soru-cevap." },
        { t: "Tema ve profil", d: "Aydınlık / karanlık tema ve hesap menüsü." },
      ].map((x) => (
        <li key={x.t} className="infoFeatureCell">
          <h2 className="infoFeatureTitle">{x.t}</h2>
          <p className="infoFeatureDesc">{x.d}</p>
        </li>
      ))}
    </ul>
  );
}

const PAGE_BODIES = {
  ekip: TeamBody,
  "gelecek-ozellikler": RoadmapBody,
  "nasil-kullanilir": HowToBody,
  destek: SupportBody,
  vizyon: VisionBody,
  platform: PlatformBody,
};

/**
 * Tüm bilgi sayfaları için ortak şablon + slug’a göre içerik.
 */
export function InfoPageTemplate({ slug, onNavigateInfo }) {
  const safe = INFO_SLUGS.includes(slug) ? slug : "ekip";
  const Body = PAGE_BODIES[safe] || TeamBody;

  return (
    <article className="infoPageArticle">
      <InfoSiblingNav activeSlug={safe} onNavigateInfo={onNavigateInfo} />

      <div className="infoPageContent">
        <Body />
      </div>
    </article>
  );
}
