import { useEffect, useId, useRef, useState } from "react";
import {
  analyzeContract,
  buildContractTextForChat,
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  uploadContract,
} from "./Services";
import { ContractChatDrawer } from "./components/chat/ContractChatDrawer";
import ClauseList from "./components/Detail/ClauseList";
import RiskSummary from "./components/Detail/RiskSummary";
import LoginContractShowcase from "./components/auth/LoginContractShowcase";
import ComparePanel from "./components/Compare/ComparePanel";
import { InfoPageTemplate, INFO_SLUGS, isInfoPath, parseInfoSlug } from "./pages/InfoPages";
import { CountUp, DarkVeil, SplitText } from "./components/animations";
import brandLogo from "./Logo/logo.png";
import chatbotIcon from "./Logo/logo_icon.png";
import { MOCK_ANALYSIS_RESPONSE } from "./mockData";

const AUTH_TOKEN_STORAGE_KEY = "contract_ai_auth_token";
const AUTH_USER_STORAGE_KEY = "contract_ai_user";
/** Detay / sonuc arasi tam sayfa yenilemesinde analiz sonucunu korumak icin */
const SESSION_ANALYSIS_KEY = "contract_ai_analysis_session";
/** V1 baseline saklamak icin (Version Comparison akisi) */
const COMPARE_BASELINE_KEY = "contract_ai_compare_baseline";

function readStoredAnalysis() {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_ANALYSIS_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data && typeof data === "object" ? data : null;
  } catch {
    return null;
  }
}

const LOADING_STAGES = [
  "Yukleme (Upload)",
  "Ayristirma (Segmentation)",
  "Siniflandirma (Classification)",
  "Veri Cikarimi (Extraction)",
  "Kural Kontrolu (Rule Checking)",
  "ML Risk Puanlama (Scoring)",
  "Ozet Sunumu (Summary)",
  "Detayli Rapor (Detailed View)",
];

function getRiskLevel(score) {
  if (score >= 0.7) return "Yuksek";
  if (score >= 0.3) return "Orta";
  return "Dusuk";
}

function formatAnalysisSource(source) {
  const normalized = String(source || "").toLowerCase();
  if (normalized === "ai_pipeline") return "AI Pipeline";
  if (normalized === "backend_fallback") return "Yerel Fallback";
  return source || "Bilinmiyor";
}

function getAnalysisSourceClassName(source) {
  const normalized = String(source || "").toLowerCase();
  if (normalized === "ai_pipeline") return "sourceAi";
  if (normalized === "backend_fallback") return "sourceFallback";
  return "sourceNeutral";
}

function formatCount(value) {
  return new Intl.NumberFormat("tr-TR").format(Number(value ?? 0));
}

function readCompareBaseline() {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(COMPARE_BASELINE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data && typeof data === "object" ? data : null;
  } catch {
    return null;
  }
}

function writeCompareBaseline(payload) {
  if (typeof window === "undefined") return;
  try {
    if (!payload) {
      sessionStorage.removeItem(COMPARE_BASELINE_KEY);
      return;
    }
    sessionStorage.setItem(COMPARE_BASELINE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

function getClauseNoForCompareSnap(clause) {
  if (!clause || typeof clause !== "object") return null;
  const n = Number(clause.order_index ?? clause.clause_no);
  return Number.isFinite(n) ? n : null;
}

function normalizeClauseTextForCompare(text) {
  return String(text ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Madde numaralari ve metinleri ayniysa true (risk / oneri alanlari yoksayilir). */
function compareAnalysisSnapshotsEqual(a, b) {
  const listA = Array.isArray(a?.clauses) ? a.clauses : [];
  const listB = Array.isArray(b?.clauses) ? b.clauses : [];
  const mapA = new Map();
  const mapB = new Map();
  for (const c of listA) {
    const n = getClauseNoForCompareSnap(c);
    if (n === null) continue;
    mapA.set(n, normalizeClauseTextForCompare(c?.clause_text));
  }
  for (const c of listB) {
    const n = getClauseNoForCompareSnap(c);
    if (n === null) continue;
    mapB.set(n, normalizeClauseTextForCompare(c?.clause_text));
  }
  if (mapA.size !== mapB.size) return false;
  for (const [n, text] of mapA) {
    if (mapB.get(n) !== text) return false;
  }
  return true;
}

function buildDemoComparisonData(analysis) {
  const base = analysis && typeof analysis === "object" ? analysis : null;
  const safeBase = base?.clauses?.length ? base : MOCK_ANALYSIS_RESPONSE;
  const clauses = Array.isArray(safeBase?.clauses) ? safeBase.clauses : [];
  const summary = safeBase?.summary || {};

  // V2 = güncel analiz (mevcut)
  const v2 = {
    name: "V2 (Güncel)",
    summary,
    clauses,
  };

  // V1 = aynı verinin "eski sürüm" simülasyonu:
  // - 1 madde silinsin
  // - 1 madde eklensin
  // - 1 madde metni + risk skoru değişsin
  const cloned = clauses.map((c) => ({ ...c }));
  const v1Clauses = cloned
    .filter((c) => Number(c?.order_index ?? c?.clause_no) !== 4) // madde 4 "silindi"
    .map((c) => {
      const no = Number(c?.order_index ?? c?.clause_no);
      if (no === 3) {
        return {
          ...c,
          clause_text:
            "Odeme, fatura kesim tarihinden itibaren 60 gun sonra yapilacaktir.",
          ml_risk_score: 0.58,
          rule_results: Array.isArray(c?.rule_results)
            ? c.rule_results.map((r) => ({
                ...r,
                recommendation:
                  "Odeme vadesi 30-45 gun araligina cekilmeli veya taksitli plan eklenmeli.",
              }))
            : c?.rule_results,
          suggestion:
            "Öneri: Ödeme vadesini 30-45 güne çekin ve gecikme cezalarını netleştirin.",
        };
      }
      return c;
    });

  v1Clauses.push({
    order_index: 7,
    clause_text:
      "Taraflar, gizlilik kapsaminda paylasilan tum bilgileri en az 2 yil boyunca korumayi kabul eder.",
    clause_type: "Gizlilik",
    ml_risk_score: 0.22,
    overall_status: "ok",
    ambiguous_terms: [],
    extracted_fields: { confidentiality_term_years: 2 },
    rule_results: [],
    suggestion:
      "Öneri: Gizlilik süresini 3-5 yıl aralığına çıkarın ve istisnaları açıkça tanımlayın.",
  });

  const v1 = {
    name: "V1 (Önceki)",
    summary,
    clauses: v1Clauses,
  };

  return { v1, v2 };
}

function readStoredUser() {
  try {
    const value = window.localStorage.getItem(AUTH_USER_STORAGE_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function getAccountTypeLabel(type) {
  return type === "corporate" ? "Kurumsal" : "Bireysel";
}

/** Profil menusu: yarn yari koyu yarn acik daire + ince halka (tema gorseli) */
function ThemeSplitIcon() {
  return (
    <span className="headerThemeSplitWrap" aria-hidden>
      <svg className="headerThemeSplitSvg" viewBox="0 0 24 24">
        <path className="headerThemeSplitL" d="M12 2A10 10 0 0 0 12 22Z" />
        <path className="headerThemeSplitR" d="M12 2A10 10 0 0 1 12 22Z" />
        <circle className="headerThemeSplitRing" cx="12" cy="12" r="10" fill="none" />
      </svg>
    </span>
  );
}

function ThemeSunGlyph() {
  return (
    <svg
      className="headerThemeGlyph"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.25v2.5M12 19.25v2.5M4.25 4.25l1.75 1.75M18 18l1.75 1.75M2.25 12h2.5M19.25 12h2.5M4.25 19.75l1.75-1.75M18 6l1.75-1.75" />
    </svg>
  );
}

function ThemeMoonGlyph() {
  return (
    <svg
      className="headerThemeGlyph"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M21 12.8A8.8 8.8 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" strokeLinejoin="round" />
    </svg>
  );
}

function HeaderThemeMenu({ theme, onSetTheme }) {
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const themePanelId = useId();

  const applyTheme = (next) => {
    onSetTheme(next);
    setThemePickerOpen(false);
  };

  return (
    <div className={`headerThemeHost${themePickerOpen ? " is-open" : ""}`}>
      <button
        type="button"
        className="headerThemeTrigger"
        aria-expanded={themePickerOpen}
        aria-controls={themePanelId}
        onClick={() => setThemePickerOpen((open) => !open)}
      >
        <ThemeSplitIcon />
        <span className="headerThemeTriggerMeta">
          <span className="headerThemeTriggerLabel">Tema</span>
          <span className="headerThemeTriggerValue">{theme === "light" ? "Aydınlık" : "Karanlık"}</span>
        </span>
        <svg
          className="headerThemeTriggerChevron"
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {themePickerOpen ? (
        <div id={themePanelId} className="headerThemePanel" role="group" aria-label="Tema secimi">
          <button
            type="button"
            className={`headerThemeOption${theme === "light" ? " is-selected" : ""}`}
            role="menuitemradio"
            aria-checked={theme === "light"}
            onClick={() => applyTheme("light")}
          >
            <ThemeSunGlyph />
            <span className="headerThemeOptionLabel">Aydınlık</span>
            {theme === "light" ? (
              <span className="headerThemeCheck" aria-hidden>
                ✓
              </span>
            ) : null}
          </button>
          <button
            type="button"
            className={`headerThemeOption${theme === "dark" ? " is-selected" : ""}`}
            role="menuitemradio"
            aria-checked={theme === "dark"}
            onClick={() => applyTheme("dark")}
          >
            <ThemeMoonGlyph />
            <span className="headerThemeOptionLabel">Karanlık</span>
            {theme === "dark" ? (
              <span className="headerThemeCheck" aria-hidden>
                ✓
              </span>
            ) : null}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ProfileMenu({ theme, onSetTheme, currentUser, onLogout, idPrefix = "header" }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const profileWrapRef = useRef(null);
  const triggerId = `${idPrefix}-profile-trigger`;
  const menuId = `${idPrefix}-profile-menu`;

  useEffect(() => {
    if (!profileOpen) return;
    const onPointerDown = (event) => {
      if (profileWrapRef.current && !profileWrapRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    const onKey = (event) => {
      if (event.key === "Escape") setProfileOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [profileOpen]);

  const handleProfileLogout = () => {
    setProfileOpen(false);
    onLogout();
  };

  if (!currentUser) return null;

  return (
    <div className="userMenuWrap" ref={profileWrapRef}>
      <button
        type="button"
        className={`userMenuTrigger${profileOpen ? " userMenuTriggerOpen" : ""}`}
        onClick={() => setProfileOpen((open) => !open)}
        aria-expanded={profileOpen}
        aria-haspopup="menu"
        aria-controls={menuId}
        id={triggerId}
      >
        <span className="userAvatar">{currentUser.full_name?.charAt(0)?.toUpperCase() || "U"}</span>
        <span className="userMenuTriggerText">
          <strong>{currentUser.full_name}</strong>
          <small>{getAccountTypeLabel(currentUser.account_type)}</small>
        </span>
        <svg
          className="userMenuChevron"
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {profileOpen && (
        <div className="userMenuDropdown" id={menuId} role="menu" aria-labelledby={triggerId}>
          <div className="userMenuDropdownSummary" role="none">
            <span className="userAvatar userAvatarLg">{currentUser.full_name?.charAt(0)?.toUpperCase() || "U"}</span>
            <div className="userMenuDropdownMeta">
              <strong>{currentUser.full_name}</strong>
              <small>{getAccountTypeLabel(currentUser.account_type)}</small>
            </div>
          </div>
          <HeaderThemeMenu theme={theme} onSetTheme={onSetTheme} />
          <button type="button" className="userMenuLogout" role="menuitem" onClick={handleProfileLogout}>
            Cikis
          </button>
        </div>
      )}
    </div>
  );
}

function HeaderNav({ theme, onSetTheme, currentUser, onLogout, onOpenChat, onGoHome }) {
  const handleBrandClick = (e) => {
    if (e.defaultPrevented) return;
    if (e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    onGoHome();
  };

  return (
    <header className="topHeader">
      <div className="topHeaderLeft">
        <a href="/" className="brand" onClick={handleBrandClick} aria-label="Ana sayfaya git" title="Ana sayfa">
          <img src={brandLogo} alt="ContratAi" className="brandLogoImg" />
        </a>
      </div>
      <nav className="topNav">
        <div className="headerAiServicesSlot">
          <button
            type="button"
            className="headerAiServicesBtn"
            onClick={onOpenChat}
            aria-label="Sozlesme asistanini ac"
            title="Sozlesme asistani"
          >
            <span className="headerAiServicesIconWrap" aria-hidden="true">
              <img src={chatbotIcon} alt="" className="headerAiServicesIcon" width={36} height={36} />
            </span>
          </button>
          <span className="headerAiServicesCaption">AI-Services</span>
        </div>
        <ProfileMenu theme={theme} onSetTheme={onSetTheme} currentUser={currentUser} onLogout={onLogout} idPrefix="header" />
      </nav>
    </header>
  );
}

function deriveAppPage(pathname) {
  if (pathname === "/maddeler") return { page: "clauses", infoSlug: null };
  if (pathname === "/karsilastir") return { page: "compare", infoSlug: null };
  if (isInfoPath(pathname)) return { page: "info", infoSlug: parseInfoSlug(pathname) };
  return { page: "home", infoSlug: null };
}

function FooterNav({ onNavigateInfo }) {
  const supportEmail = "tufancaliskan12@gmail.com";
  return (
    <footer className="siteFooter">
      <div className="footerGrid">
        <div className="footerCol">
          <h4>ContratAi</h4>
          <p>Yapay zeka destekli sözleşme analizi, politika uyumu ve risk görünürlüğü için çalışma masanız.</p>
        </div>
        <div className="footerCol">
          <h4>Hakkında</h4>
          <button type="button" className="footerLinkButton" onClick={() => onNavigateInfo("vizyon")}>
            Vizyon
          </button>
          <button type="button" className="footerLinkButton" onClick={() => onNavigateInfo("ekip")}>
            Ekip
          </button>
        </div>
        <div className="footerCol">
          <h4>Platform</h4>
          <button type="button" className="footerLinkButton" onClick={() => onNavigateInfo("platform")}>
            Özellikler
          </button>
          <button type="button" className="footerLinkButton" onClick={() => onNavigateInfo("nasil-kullanilir")}>
            Nasıl kullanılır
          </button>
          <button type="button" className="footerLinkButton" onClick={() => onNavigateInfo("gelecek-ozellikler")}>
            Gelecek özellikler
          </button>
        </div>
        <div className="footerCol">
          <h4>Destek</h4>
          <a className="footerColLink" href={`mailto:${supportEmail}`}>
            {supportEmail}
          </a>
          <button type="button" className="footerLinkButton" onClick={() => onNavigateInfo("destek")}>
            İletişim ve SSS
          </button>
          <button type="button" className="footerLinkButton" onClick={() => onNavigateInfo("nasil-kullanilir")}>
            Yardım merkezi
          </button>
        </div>
      </div>
      <div className="footerBottom">© 2026 ContratAi. Tum haklari saklidir.</div>
    </footer>
  );
}

function AuthScreen({ theme, onToggleTheme, onSubmit, errorMessage, isSubmitting, darkVeilPreset }) {
  const [mode, setMode] = useState("login");
  const [accountType, setAccountType] = useState("individual");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const isRegisterMode = mode === "register";
  const isCorporate = accountType === "corporate";

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({
      mode,
      full_name: fullName,
      company_name: companyName,
      email,
      password,
      account_type: accountType,
    });
  };

  return (
    <div className="appRoot authRoot clausesPageTransition">
      <div className="authSplit">
        <aside className="authVisual" aria-label="Sozlesme analizi onizlemesi">
          <div className="authVisualVeil" aria-hidden="true">
            <DarkVeil
              hueShift={darkVeilPreset.hueShift}
              noiseIntensity={darkVeilPreset.noiseIntensity}
              scanlineIntensity={darkVeilPreset.scanlineIntensity}
              scanlineFrequency={darkVeilPreset.scanlineFrequency}
              speed={darkVeilPreset.speed}
              warpAmount={darkVeilPreset.warpAmount}
              resolutionScale={darkVeilPreset.resolutionScale}
            />
          </div>
          <LoginContractShowcase />
        </aside>

        <div className="authFormColumn">
          <div className="authFormVeil" aria-hidden="true">
            <DarkVeil
              hueShift={darkVeilPreset.hueShift}
              noiseIntensity={darkVeilPreset.noiseIntensity}
              scanlineIntensity={darkVeilPreset.scanlineIntensity}
              scanlineFrequency={darkVeilPreset.scanlineFrequency}
              speed={darkVeilPreset.speed}
              warpAmount={darkVeilPreset.warpAmount}
              resolutionScale={darkVeilPreset.resolutionScale}
            />
          </div>
          <main className="authFormInner">
            <div className="authFormToolbar">
              <button
                type="button"
                className="themeToggleButton"
                onClick={onToggleTheme}
                aria-label={theme === "light" ? "Koyu temaya gec" : "Acik temaya gec"}
                title={theme === "light" ? "Koyu tema" : "Acik tema"}
              >
                {theme === "light" ? "D" : "L"}
              </button>
            </div>
            <form className="authPanel" onSubmit={handleSubmit}>
            <div className="authRightHead">
              <div className="authRightLogoWrap">
                <img src={brandLogo} alt="ContratAi" className="authRightLogo" />
              </div>
            </div>

            <div className="authRightEntry">
              <div key={mode} className="authRightCopy authModeCopyEnter">
                <h2 className="authRightTitle">{isRegisterMode ? "Hesap olustur" : "Giris yap"}</h2>
                <p className="authRightSubtitle">
                  {isRegisterMode ? "Kullanici tipini secip kayit ol." : "Kayitli hesabina devam et."}
                </p>
              </div>
              <div className="authModeSwitch" role="tablist" aria-label="Giris modu">
                <button
                  type="button"
                  className={mode === "login" ? "active" : ""}
                  onClick={() => setMode("login")}
                >
                  Giris
                </button>
                <button
                  type="button"
                  className={mode === "register" ? "active" : ""}
                  onClick={() => setMode("register")}
                >
                  Kayit
                </button>
              </div>
            </div>

            {isRegisterMode && (
              <div className="accountTypeGrid">
                <button
                  type="button"
                  className={accountType === "individual" ? "selected" : ""}
                  onClick={() => setAccountType("individual")}
                >
                  <strong>Bireysel</strong>
                  <span>Tek kullanici</span>
                </button>
                <button
                  type="button"
                  className={accountType === "corporate" ? "selected" : ""}
                  onClick={() => setAccountType("corporate")}
                >
                  <strong>Kurumsal</strong>
                  <span>Sirket hesabi</span>
                </button>
              </div>
            )}

            {isRegisterMode && (
              <label className="authField">
                <span>Ad Soyad</span>
                <input
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  minLength={2}
                  maxLength={255}
                  required
                />
              </label>
            )}

            {isRegisterMode && isCorporate && (
              <label className="authField">
                <span>Sirket Adi</span>
                <input
                  type="text"
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  maxLength={255}
                  required
                />
              </label>
            )}

            <label className="authField">
              <span>E-posta</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </label>

            <label className="authField">
              <span>Sifre</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={isRegisterMode ? "new-password" : "current-password"}
                minLength={isRegisterMode ? 6 : 1}
                required
              />
            </label>

            {errorMessage && (
              <div className="authError" role="alert">
                {errorMessage}
              </div>
            )}

            <button type="submit" className="authSubmitButton" disabled={isSubmitting}>
              {isSubmitting ? "Isleniyor..." : isRegisterMode ? "Hesap olustur" : "Giris yap"}
            </button>

            <div className="authPanelExtras">
              {isRegisterMode ? (
                <p className="authPanelExtrasNote">
                  Zaten hesabin var mi?{" "}
                  <button type="button" className="authLinkButton" onClick={() => setMode("login")}>
                    Giris yap
                  </button>
                </p>
              ) : (
                <p className="authPanelExtrasNote">
                  Hesabin yok mu?{" "}
                  <button type="button" className="authLinkButton" onClick={() => setMode("register")}>
                    Kaydol
                  </button>
                </p>
              )}
              {!isRegisterMode && (
                <a className="authForgotLink" href="#" onClick={(e) => e.preventDefault()}>
                  Parolami unuttum
                </a>
              )}
            </div>
            </form>
          </main>
        </div>
      </div>
    </div>
  );
}

function ContractMetaPanel({ responseData, summary, totalClauses }) {
  if (!responseData) return null;

  const dateText = responseData.date
    ? new Date(responseData.date).toLocaleString("tr-TR", { hour12: false })
    : "-";
  const riskScore = Number(summary?.average_ml_risk_score ?? 0);
  const supportsCoverageAnalysis = String(responseData.analysis_source || "").toLowerCase() === "ai_pipeline";
  const missingClauses = Array.isArray(summary?.missing_clauses) ? summary.missing_clauses : [];
  const executiveSummary =
    summary?.executive_summary?.trim() || "Bu analiz icin yonetici ozeti uretilmedi.";
  const categoryText = summary?.contract_category?.trim() || "Belirlenemedi";
  const analysisSource = formatAnalysisSource(responseData.analysis_source);
  const analysisSourceClassName = getAnalysisSourceClassName(responseData.analysis_source);
  const violationCount = Number(summary?.violation_count ?? 0);
  const hasViolations = violationCount > 0;

  const coverageTitle = supportsCoverageAnalysis
    ? missingClauses.length
      ? "Kapsam Bosluklari"
      : "Kapsam Kontrolu"
    : "Kapsam Analizi";
  const coverageText = supportsCoverageAnalysis
    ? missingClauses.length
      ? null
      : "Eksik ana baslik tespit edilmedi."
    : "Yerel fallback modunda eksik baslik kontrolu calistirilmaz.";

  const compactStats = [
    { key: "warn", label: "Uyari", value: formatCount(summary?.warning_count ?? 0), tone: "warning" },
    {
      key: "hirisk",
      label: "Y.Risk Madde",
      value: formatCount(summary?.high_risk_clause_count ?? 0),
      tone: "highRisk",
    },
    { key: "total", label: "Madde", value: formatCount(totalClauses ?? 0) },
    { key: "len", label: "Metin", value: `${formatCount(responseData.text_length ?? 0)} kr.` },
    { key: "date", label: "Tarih", value: dateText },
  ];

  if (supportsCoverageAnalysis) {
    compactStats.splice(3, 0, {
      key: "cov",
      label: "Kapsam",
      value: formatCount(missingClauses.length),
      tone: missingClauses.length > 0 ? "warning" : "neutral",
    });
  }

  return (
    <section className="panel contractMetaPanel contractMetaPanelCompact softReveal metaReveal">
      <article className="metaUnifiedCard">
        <header className="metaUnifiedHeader">
          <h2 className="metaUnifiedTitle">Analiz Metaverisi</h2>
          <span className={`metaSourceBadge ${analysisSourceClassName}`}>{analysisSource}</span>
        </header>

        <div className="metaUnifiedRow">
          <div className="metaUnifiedCol metaUnifiedColDoc">
            <span className="metaUnifiedEyebrow">Belge Ozeti</span>
            <strong className="metaUnifiedDocTitle">{responseData.name || "Adsiz sozlesme"}</strong>
            <div className="metaBadgeRow metaBadgeRowTight">
              <span className="metaInlineBadge">{categoryText}</span>
              <span className="metaInlineBadge">#{responseData.id ?? "-"}</span>
            </div>
            <p className="metaExecutiveText metaExecutiveTextCompact">{executiveSummary}</p>
          </div>
          <div className="metaUnifiedCol metaUnifiedColCoverage">
            <span className="metaUnifiedEyebrow">{coverageTitle}</span>
            {supportsCoverageAnalysis && missingClauses.length ? (
              <ul className="metaMissingList metaMissingListCompact">
                {missingClauses.map((clauseName) => (
                  <li key={clauseName}>{clauseName}</li>
                ))}
              </ul>
            ) : (
              <p className="metaExecutiveText metaExecutiveTextCompact">{coverageText}</p>
            )}
          </div>
        </div>

        <div className="metaStatsRow" role="list">
          <article
            className={[
              "metaStatChip",
              "metaStatChipEmphasis",
              hasViolations ? "metaStatViolationActive" : "metaStatViolationClear",
            ].join(" ")}
            role="listitem"
          >
            <span className="metaStatChipLabel">Toplam Ihlal</span>
            <span className="metaStatChipValue">{formatCount(violationCount)}</span>
          </article>
          <article className="metaStatChip metaStatChipEmphasis metaStatRiskEmphasis" role="listitem">
            <span className="metaStatChipLabel">Genel Risk Skoru</span>
            <span className="metaStatChipValue">
              {Math.round(riskScore * 100)}% <span className="metaStatChipSub">{getRiskLevel(riskScore)}</span>
            </span>
          </article>
          {compactStats.map((row) => (
            <article
              key={row.key}
              className={[
                "metaStatChip",
                "metaStatChipCompact",
                row.tone ? `metaStatTone${row.tone[0].toUpperCase()}${row.tone.slice(1)}` : "",
              ]
                .filter(Boolean)
                .join(" ")}
              role="listitem"
            >
              <span className="metaStatChipLabel">{row.label}</span>
              <span className="metaStatChipValue metaStatChipValueSm">{row.value}</span>
            </article>
          ))}
        </div>
      </article>
    </section>
  );
}

function App() {
  const [authToken, setAuthToken] = useState(() => window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || "");
  const [currentUser, setCurrentUser] = useState(() => readStoredUser());
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [authErrorMessage, setAuthErrorMessage] = useState("");
  const [isSessionChecking, setIsSessionChecking] = useState(() =>
    Boolean(window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY))
  );
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStageIndex, setLoadingStageIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [responseData, setResponseData] = useState(() => readStoredAnalysis());
  const [compareBaseline, setCompareBaseline] = useState(() => readCompareBaseline());
  const [scrollToClauseNo, setScrollToClauseNo] = useState(null);
  const [theme, setTheme] = useState(() => {
    const stored = window.localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") return stored;
    return "dark";
  });
  const [currentPage, setCurrentPage] = useState(() => deriveAppPage(window.location.pathname).page);
  const [infoSlug, setInfoSlug] = useState(() => deriveAppPage(window.location.pathname).infoSlug);
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);

  const darkVeilPreset =
    theme === "light"
      ? {
          hueShift: 0,
          noiseIntensity: 0.025,
          scanlineIntensity: 0.03,
          scanlineFrequency: 1.05,
          speed: 0.36,
          warpAmount: 0.065,
          resolutionScale: 1,
        }
      : {
          hueShift: -20,
          noiseIntensity: 0.04,
          scanlineIntensity: 0.05,
          scanlineFrequency: 1.2,
          speed: 0.4,
          warpAmount: 0.08,
          resolutionScale: 1,
        };

  useEffect(() => {
    const onPopState = () => {
      const next = deriveAppPage(window.location.pathname);
      setCurrentPage(next.page);
      setInfoSlug(next.infoSlug);
      setScrollToClauseNo(null);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (currentPage !== "info" || !infoSlug) return;
    const parts = window.location.pathname.replace(/^\/bilgi\/?/, "").split("/").filter(Boolean);
    const raw = parts[0];
    if (raw && !INFO_SLUGS.includes(raw)) {
      window.history.replaceState({ page: "info", slug: "ekip" }, "", "/bilgi/ekip");
      setInfoSlug("ekip");
    }
  }, [currentPage, infoSlug]);

  useEffect(() => {
    try {
      if (responseData) {
        sessionStorage.setItem(SESSION_ANALYSIS_KEY, JSON.stringify(responseData));
      } else {
        sessionStorage.removeItem(SESSION_ANALYSIS_KEY);
      }
    } catch {
      /* depolama kotasi vb. */
    }
  }, [responseData]);

  useEffect(() => {
    writeCompareBaseline(compareBaseline);
  }, [compareBaseline]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!authToken) {
      setIsSessionChecking(false);
      return undefined;
    }

    let isMounted = true;
    setIsSessionChecking(true);
    getCurrentUser(authToken)
      .then((user) => {
        if (!isMounted) return;
        setCurrentUser(user);
        window.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
      })
      .catch(() => {
        if (!isMounted) return;
        setAuthToken("");
        setCurrentUser(null);
        window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
        window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
      })
      .finally(() => {
        if (isMounted) setIsSessionChecking(false);
      });

    return () => {
      isMounted = false;
    };
  }, [authToken]);

  useEffect(() => {
    if (currentPage !== "clauses") return;
    // Ensure we start at top when entering detail page.
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [currentPage]);

  useEffect(() => {
    if (!isLoading) return undefined;

    setLoadingStageIndex(0);
    const stageTimer = window.setInterval(() => {
      setLoadingStageIndex((prev) => Math.min(prev + 1, LOADING_STAGES.length - 1));
    }, 950);

    return () => window.clearInterval(stageTimer);
  }, [isLoading]);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    setErrorMessage("");
  };
  const handleDragOver = (e) => {
    e.preventDefault(); // Tarayıcının varsayılan davranışını (dosyayı açmasını) engeller
    setIsDragging(true); // Kutuya yeşil bir "hover" efekti vermek için state'i true yapar
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false); // Sürükleme kutudan çıkınca state'i false yapar
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    // Bırakılan dosyayı alır ve state'e kaydeder
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      setErrorMessage("");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setResponseData(null);

    if (!selectedFile) {
      setErrorMessage("Lutfen once bir dosya secin.");
      return;
    }

    setIsLoading(true);
    try {
      await uploadContract(selectedFile, authToken);
      const data = await analyzeContract(selectedFile, authToken);
      setResponseData(data);

      // Eğer kullanıcı Compare akışındaysa (V1 baseline var), V2 analizi biter bitmez compare sayfasına geç.
      const baseline = compareBaseline || readCompareBaseline();
      if (baseline) {
        setCurrentPage("compare");
        setInfoSlug(null);
        window.history.pushState({ page: "compare" }, "", "/karsilastir");
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      }
    } catch (error) {
      setErrorMessage(error.message || "Beklenmeyen bir hata olustu.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthSubmit = async (payload) => {
    setAuthErrorMessage("");
    setIsAuthSubmitting(true);

    try {
      const response =
        payload.mode === "register"
          ? await registerUser({
              full_name: payload.full_name,
              email: payload.email,
              password: payload.password,
              account_type: payload.account_type,
              company_name: payload.company_name,
            })
          : await loginUser({
              email: payload.email,
              password: payload.password,
            });

      setAuthToken(response.access_token);
      setCurrentUser(response.user);
      window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, response.access_token);
      window.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(response.user));
    } catch (error) {
      setAuthErrorMessage(error.message || "Giris islemi basarisiz oldu.");
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    const token = authToken;
    setAuthToken("");
    setCurrentUser(null);
    setResponseData(null);
    setSelectedFile(null);
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    try {
      sessionStorage.removeItem(SESSION_ANALYSIS_KEY);
    } catch {
      /* ignore */
    }

    try {
      await logoutUser(token);
    } catch {
      // Local session cleanup already completed.
    }
  };

  const clauses = Array.isArray(responseData?.clauses) ? responseData.clauses : [];
  const totalClauses = Number(responseData?.clause_count ?? clauses.length ?? 0);
  const summary = responseData?.summary || {
    contract_category: "",
    executive_summary: "",
    missing_clauses: [],
    violation_count: 0,
    warning_count: 0,
    high_risk_clause_count: 0,
    average_ml_risk_score: 0,
  };

  const navigateToClausesPage = () => {
    setScrollToClauseNo(null);
    setCurrentPage("clauses");
    setInfoSlug(null);
    window.history.pushState({ page: "clauses" }, "", "/maddeler");
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  };

  const navigateToComparePage = () => {
    setScrollToClauseNo(null);
    setCurrentPage("compare");
    setInfoSlug(null);
    window.history.pushState({ page: "compare" }, "", "/karsilastir");
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  };

  const navigateToInfoPage = (slug) => {
    const safe = INFO_SLUGS.includes(slug) ? slug : "ekip";
    setScrollToClauseNo(null);
    setCurrentPage("info");
    setInfoSlug(safe);
    window.history.pushState({ page: "info", slug: safe }, "", `/bilgi/${safe}`);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  };

  const startCompareFlowFromCurrentAnalysis = () => {
    if (!responseData?.clauses?.length) return;
    const existingBaseline = compareBaseline || readCompareBaseline();
    if (
      existingBaseline?.clauses?.length &&
      compareAnalysisSnapshotsEqual(existingBaseline, responseData)
    ) {
      return;
    }
    setCompareBaseline({
      name: responseData?.name || "V1 (Önceki)",
      summary: responseData?.summary || null,
      clauses: responseData?.clauses || [],
    });
    // Kullanıcı V2 yükleyip analiz etsin diye ana ekrana dön.
    navigateToHomePage();
  };

  const navigateToHomePage = () => {
    setScrollToClauseNo(null);
    setCurrentPage("home");
    setInfoSlug(null);
    window.history.pushState({ page: "home" }, "", "/");
  };

  if (isSessionChecking && authToken && !currentUser) {
    return (
      <div className="appRoot">
        <div className="sessionLoading">Oturum kontrol ediliyor...</div>
      </div>
    );
  }

  if (!authToken || !currentUser) {
    return (
      <AuthScreen
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === "light" ? "dark" : "light"))}
        onSubmit={handleAuthSubmit}
        errorMessage={authErrorMessage}
        isSubmitting={isAuthSubmitting}
        darkVeilPreset={darkVeilPreset}
      />
    );
  }

  const baselineForCompare = compareBaseline || readCompareBaseline();
  const compareSameAsBaseline =
    Boolean(baselineForCompare?.clauses?.length) &&
    Boolean(responseData?.clauses?.length) &&
    compareAnalysisSnapshotsEqual(baselineForCompare, responseData);

  if (currentPage === "clauses") {
    return (
      <div className="appRoot">
        <div className="darkVeilLayer" aria-hidden="true">
          <DarkVeil
            hueShift={darkVeilPreset.hueShift}
            noiseIntensity={darkVeilPreset.noiseIntensity}
            scanlineIntensity={darkVeilPreset.scanlineIntensity}
            scanlineFrequency={darkVeilPreset.scanlineFrequency}
            speed={darkVeilPreset.speed}
            warpAmount={darkVeilPreset.warpAmount}
            resolutionScale={darkVeilPreset.resolutionScale}
          />
        </div>

        <main key="clauses-page" className="page clausesPageTransition clausesPage">
          <section className="hero clausesPageHero">
            <div className="clausePageActions">
              <button type="button" className="secondaryButton navButton clauseNavButton" onClick={navigateToHomePage}>
                Sonuc Ekranina Don
              </button>
              <button
                type="button"
                className="secondaryButton navButton clauseNavButton"
                onClick={startCompareFlowFromCurrentAnalysis}
                disabled={compareSameAsBaseline}
                title={
                  compareSameAsBaseline
                    ? "Kayitli V1 ile bu analiz ayni madde metinlerine sahip. Farkli bir sozlesme yukleyip analiz edin."
                    : undefined
                }
              >
                Karsilastir
              </button>
            </div>
            <div className="clausePageProfileSlot">
              <ProfileMenu
                theme={theme}
                onSetTheme={setTheme}
                currentUser={currentUser}
                onLogout={handleLogout}
                idPrefix="clauses"
              />
            </div>
          </section>

          {responseData && (
            <ContractMetaPanel responseData={responseData} summary={summary} totalClauses={totalClauses} />
          )}

          <section className="panel resultPanel">
            {clauses.length ? (
              <ClauseList clauses={clauses} scrollToClauseNo={scrollToClauseNo} />
            ) : (
              <div className="emptyResult">
                <p>Henuz madde bulunmuyor. Ana sayfadan sozlesme yukleyebilirsin.</p>
              </div>
            )}
          </section>

          {responseData && (
            <RiskSummary
              clauses={clauses}
              onSelectClause={(clauseNo) => {
                setScrollToClauseNo(clauseNo);
              }}
            />
          )}
        </main>
      </div>
    );
  }

  if (currentPage === "compare") {
    const baseline = compareBaseline || readCompareBaseline();
    const hasBaseline = Boolean(baseline?.clauses?.length);
    const hasV2 = Boolean(responseData?.clauses?.length);

    const v1 = hasBaseline ? { ...baseline, name: baseline?.name || "V1 (Önceki)" } : null;
    const v2 = hasV2 ? { ...responseData, name: responseData?.name || "V2 (Güncel)" } : null;

    const identicalSnapshots =
      hasBaseline && hasV2 && compareAnalysisSnapshotsEqual(baseline, responseData);

    // Eğer hiç veri yoksa, demo kalsın (geliştirme kolaylığı).
    const demo = buildDemoComparisonData(responseData);
    const effectiveV1 = v1 || demo.v1;
    const effectiveV2 = v2 || demo.v2;

    return (
      <div className="appRoot">
        <div className="darkVeilLayer" aria-hidden="true">
          <DarkVeil
            hueShift={darkVeilPreset.hueShift}
            noiseIntensity={darkVeilPreset.noiseIntensity}
            scanlineIntensity={darkVeilPreset.scanlineIntensity}
            scanlineFrequency={darkVeilPreset.scanlineFrequency}
            speed={darkVeilPreset.speed}
            warpAmount={darkVeilPreset.warpAmount}
            resolutionScale={darkVeilPreset.resolutionScale}
          />
        </div>

        <ComparePanel
          key="compare-page"
          v1={effectiveV1}
          v2={effectiveV2}
          identicalSnapshots={identicalSnapshots}
          onBack={() => {
            // Compare genelde maddelerden açılacak; veri yoksa ana sayfaya dönelim.
            if (responseData?.clauses?.length) {
              navigateToClausesPage();
            } else {
              navigateToHomePage();
            }
          }}
          toolbarRight={
            currentUser ? (
              <ProfileMenu
                theme={theme}
                onSetTheme={setTheme}
                currentUser={currentUser}
                onLogout={handleLogout}
                idPrefix="compare"
              />
            ) : null
          }
        />
      </div>
    );
  }

  if (currentPage === "info") {
    const effectiveInfoSlug = infoSlug || "ekip";
    return (
      <div className="appRoot">
        <div className="darkVeilLayer" aria-hidden="true">
          <DarkVeil
            hueShift={darkVeilPreset.hueShift}
            noiseIntensity={darkVeilPreset.noiseIntensity}
            scanlineIntensity={darkVeilPreset.scanlineIntensity}
            scanlineFrequency={darkVeilPreset.scanlineFrequency}
            speed={darkVeilPreset.speed}
            warpAmount={darkVeilPreset.warpAmount}
            resolutionScale={darkVeilPreset.resolutionScale}
          />
        </div>

        <main key={`info-${effectiveInfoSlug}`} className="page clausesPageTransition infoSitePage">
          <header className="infoPageTopBar" aria-label="Bilgi sayfasi ust cubugu">
            <button type="button" className="secondaryButton infoPageBackBtn" onClick={navigateToHomePage}>
              Ana Sayfaya Dön
            </button>
            <ProfileMenu
              theme={theme}
              onSetTheme={setTheme}
              currentUser={currentUser}
              onLogout={handleLogout}
              idPrefix="info"
            />
          </header>

          <InfoPageTemplate slug={effectiveInfoSlug} onNavigateInfo={navigateToInfoPage} />
        </main>
      </div>
    );
  }

  return (
    <div className="appRoot">
      <div className="darkVeilLayer" aria-hidden="true">
        <DarkVeil
          hueShift={darkVeilPreset.hueShift}
          noiseIntensity={darkVeilPreset.noiseIntensity}
          scanlineIntensity={darkVeilPreset.scanlineIntensity}
          scanlineFrequency={darkVeilPreset.scanlineFrequency}
          speed={darkVeilPreset.speed}
          warpAmount={darkVeilPreset.warpAmount}
          resolutionScale={darkVeilPreset.resolutionScale}
        />
      </div>

      <main key="home-page" className="page clausesPageTransition">
        <HeaderNav
          theme={theme}
          onSetTheme={setTheme}
          currentUser={currentUser}
          onLogout={handleLogout}
          onOpenChat={() => setChatDrawerOpen(true)}
          onGoHome={navigateToHomePage}
        />

        <ContractChatDrawer
          key={responseData?.id ?? "no-contract"}
          open={chatDrawerOpen}
          onClose={() => setChatDrawerOpen(false)}
          contractId={responseData?.id ?? 1}
          contractText={buildContractTextForChat(responseData)}
        />

        <section className="landingShowcase">
          <div className="showcaseTitle" role="heading" aria-level={1}>
            <SplitText
              tag="p"
              text="Sözleşmeleri hızlı analiz edin,"
              delay={44}
              duration={0.96}
              ease="power3.out"
              splitType="chars"
              from={{ opacity: 0, y: 34 }}
              to={{ opacity: 1, y: 0 }}
              threshold={0.2}
              rootMargin="-80px"
              textAlign="center"
              className="showcaseTitleBlur"
            />
            <SplitText
              tag="p"
              text="politika uyumunu güvenceye alın."
              delay={44}
              duration={0.96}
              ease="power3.out"
              splitType="chars"
              from={{ opacity: 0, y: 34 }}
              to={{ opacity: 1, y: 0 }}
              threshold={0.2}
              rootMargin="-80px"
              textAlign="center"
              className="showcaseTitleBlur showcaseTitleBlurAccent"
            />
          </div>
        </section>

        {compareBaseline?.clauses?.length ? (
          <section className="compareFlowBanner" role="status" aria-live="polite">
            <div className="compareFlowBannerBody">
              <strong>V1 kaydedildi.</strong> Şimdi V2 dosyasını yükleyip analiz et; analiz bitince karşılaştırma otomatik açılacak.
            </div>
            <div className="compareFlowBannerActions">
              <button
                type="button"
                className="secondaryButton navButton"
                onClick={() => setCompareBaseline(null)}
                title="V1 baseline temizle"
              >
                Iptal
              </button>
              {responseData?.clauses?.length ? (
                <button
                  type="button"
                  className="secondaryButton navButton"
                  onClick={navigateToComparePage}
                  title="Karsilastirma ekranini ac"
                >
                  Karsilastirmayi Ac
                </button>
              ) : null}
            </div>
          </section>
        ) : null}

        <div className="grid">
          <section className="panel">
            <h2>Dosya Yükleme</h2>
            <p className="panelText">Desteklenen formatlar: .pdf, .doc, .docx, .txt</p>

            <form onSubmit={handleSubmit} className="uploadForm">
            <label 
                className={`fileInputWrap ${isDragging ? "dragging" : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="uploadPlaceholder">
                  {/* Premium Yükleme İkonu (SVG) */}
                  <svg 
                    viewBox="0 0 24 24" 
                    width="42" 
                    height="42" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="1.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className="docSvg"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <path d="M12 18v-6"></path>
                    <path d="M9 15l3-3 3 3"></path>
                  </svg>
                  {/* Buton yerine sadece şık bir metin */}
                  <span>Dosya seçmek için tıklayın</span>
                </div>
                
                {/* SİHİRLİ DOKUNUŞ: Asıl dosya seçiciyi tamamen görünmez yapıyoruz */}
                <input 
                  type="file" 
                  accept=".pdf,.doc,.docx,.txt" 
                  onChange={handleFileChange} 
                  style={{ display: "none" }} 
                />
              </label>

              <button type="submit" disabled={isLoading}>
                {isLoading ? "Analiz sürüyor..." : "Sözleşmeyi Yükle ve Analiz Et"}
              </button>

            </form>

            {selectedFile && (
              <div className="fileInfo">
                <span className="status success">Hazır</span>
                <p>{selectedFile.name}</p>
              </div>
            )}

            {errorMessage && (
              <div className="fileInfo">
                <span className="status errorTag">Hata</span>
                <p className="error">{errorMessage}</p>
              </div>
            )}

            {isLoading && (
              <div className="loadingSteps" aria-live="polite">
                <strong>Islem Durumu</strong>
                <ol>
                  {LOADING_STAGES.map((stage, index) => {
                    let stageClass = "";
                    if (index < loadingStageIndex) stageClass = "done";
                    if (index === loadingStageIndex) stageClass = "active";
                    return (
                      <li key={stage} className={stageClass}>
                        {stage}
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </section>

          <section className="panel">
            <h2>Sonuç Görünümü</h2>
            {!responseData && (
              <p className="panelText">Yükleme sonrası backend cevabı burada gösterilecek.</p>
            )}

            {/* YENİ EKLENEN KISIM: Eski metinler yerine 3'lü dinamik grid yapısı */}
            {responseData && (
              <div className="resultArea">
               <div className="resultSummaryGrid">
                  {/* 1. TOPLAM MADDE KARTI */}
                  <article className="resultStatCard safeCard">
                    <div className="cardIconWrap">
                      {/* Döküman İkonu */}
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                      </svg>
                    </div>
                    <div className="cardContent">
                      <h4>Toplam Madde</h4>
                      <p>{totalClauses}</p>
                    </div>
                  </article>

                  {/* 2. TOPLAM İHLAL KARTI (Sıfırdan büyükse kırmızı olur) */}
                  <article className={`resultStatCard ${summary.violation_count > 0 ? "dangerCard" : "safeCard"}`}>
                    <div className="cardIconWrap">
                      {/* Çarpı/İhlal İkonu */}
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                      </svg>
                    </div>
                    <div className="cardContent">
                      <h4>Toplam İhlal</h4>
                      <p className={summary.violation_count > 0 ? "textViolation" : ""}>
                        {summary.violation_count}
                      </p>
                    </div>
                  </article>

                  {/* 3. YÜKSEK RİSK KARTI (Sıfırdan büyükse turuncu olur) */}
                  <article className={`resultStatCard ${summary.high_risk_clause_count > 0 ? "highRiskCard" : "safeCard"}`}>
                    <div className="cardIconWrap">
                      {/* Uyarı/Risk İkonu */}
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                      </svg>
                    </div>
                    <div className="cardContent">
                      <h4>Yüksek Risk</h4>
                      <p className={summary.high_risk_clause_count > 0 ? "textHighRisk" : ""}>
                        {summary.high_risk_clause_count}
                      </p>
                    </div>
                  </article>
                </div>
              </div>
            )}
            
            {responseData && (
              <div className="resultPanelFooter">
                <button type="button" className="openClausesButton" onClick={navigateToClausesPage}>
                  Sozlesme maddelerine ulasin
                </button>
              </div>
            )}
          </section>
        </div>

        <section className="impactPanel">
          <article className="impactItem">
            <div className="impactIcon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="8" fill="none" />
                <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3>
              <CountUp from={0} to={100} duration={1.8} className="countUpText" />%
            </h3>
            <p>Inceleme ve onay sureclerinde zaman tasarrufu saglar.</p>
          </article>

          <article className="impactItem">
            <div className="impactIcon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path
                  d="M13 2 5 13h5l-1 9 8-11h-5l1-9z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3>
              <CountUp from={0} to={3} duration={1.8} className="countUpText" />x
            </h3>
            <p>Sozlesme maddelerini manuel yaklasima gore daha hizli analiz eder.</p>
          </article>

          <article className="impactItem">
            <div className="impactIcon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path
                  d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="12" r="2.5" fill="none" />
              </svg>
            </div>
            <h3>
              <CountUp from={0} to={90} duration={1.8} className="countUpText" />%
            </h3>
            <p>Politika ihlallerini erken tespit ederek maliyet riskini azaltir.</p>
          </article>

          <article className="impactItem">
            <div className="impactIcon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 6a9 9 0 0 0-9 9V3" />
                <circle cx="18" cy="6" r="3" fill="none" />
                <circle cx="6" cy="18" r="3" fill="none" />
              </svg>
            </div>
            <h3>
              <CountUp from={0} to={80} duration={1.8} className="countUpText" />%
            </h3>
            <p>Belirsiz degisikliklerin kaybolmasini onleyerek kontrol saglar.</p>
          </article>
        </section>

        <section className="flowPanel">
          <h2 className="flowTitle">
            Tum surec tek yerde, <em>hizli ve kontrollu</em>
          </h2>

          <div className="flowGrid top">
            <div className="flowStep">
              <div className="flowStepIcon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="10.5" cy="10.5" r="5.5" strokeLinecap="round" />
                  <path d="m15.5 15.5 4 4" strokeLinecap="round" />
                  <path d="M8 10.5h5" strokeLinecap="round" opacity="0.45" />
                </svg>
              </div>
              <span>Arastir</span>
            </div>
            <div className="flowConnector">→</div>
            <div className="flowStep">
              <div className="flowStepIcon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path
                    d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path d="M15 2H9a1 1 0 0 0-1 1v2h8V3a1 1 0 0 0-1-1z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M8 10h8M8 14h5M8 18h6" strokeLinecap="round" />
                </svg>
              </div>
              <span>Incele</span>
            </div>
            <div className="flowConnector">→</div>
            <div className="flowStep">
              <div className="flowStepIcon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
                  <path d="M7 10v12" />
                </svg>
              </div>
              <span>Onayla</span>
            </div>
          </div>

          <div className="flowCenterBadge">ContratAi Workbench</div>

          <div className="flowGrid bottom">
            <div className="flowStep">
              <div className="flowStepIcon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3.34 19a10 10 0 1 1 17.32 0" />
                  <path d="m12 14 4-4" />
                </svg>
              </div>
              <span>Optimize</span>
            </div>
            <div className="flowConnector">←</div>
            <div className="flowStep">
              <div className="flowStepIcon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M7 18V9" strokeLinecap="round" />
                  <path d="M12 18v-7" strokeLinecap="round" />
                  <path d="M17 18V5" strokeLinecap="round" />
                  <path d="M5 18h14" strokeLinecap="round" opacity="0.45" />
                </svg>
              </div>
              <span>Analiz Et</span>
            </div>
            <div className="flowConnector">←</div>
            <div className="flowStep">
              <div className="flowStepIcon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="12" r="9" />
                  <path d="m8 12 2.5 2.5L16 9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span>Tamamla</span>
            </div>
          </div>
        </section>

        <FooterNav onNavigateInfo={navigateToInfoPage} />
      </main>
    </div>
  );
}

export default App;
