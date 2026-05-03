import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Minus, Plus, Replace, X } from "lucide-react";

/** İki sürümün metin olarak aynı olduğunu gösteren satır içi illüstrasyon (currentColor). */
function CompareNoDiffIllustration() {
  return (
    <svg className="compareIdenticalSvg" viewBox="0 0 72 52" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="6" width="28" height="40" rx="3" />
        <line x1="11" y1="16" x2="25" y2="16" strokeWidth="1.75" opacity="0.92" />
        <line x1="11" y1="23" x2="27" y2="23" strokeWidth="1.75" opacity="0.92" />
        <line x1="11" y1="30" x2="22" y2="30" strokeWidth="1.75" opacity="0.92" />
        <line x1="11" y1="37" x2="24" y2="37" strokeWidth="1.75" opacity="0.92" />

        <rect x="40" y="6" width="28" height="40" rx="3" />
        <line x1="47" y1="16" x2="61" y2="16" strokeWidth="1.75" opacity="0.92" />
        <line x1="47" y1="23" x2="63" y2="23" strokeWidth="1.75" opacity="0.92" />
        <line x1="47" y1="30" x2="58" y2="30" strokeWidth="1.75" opacity="0.92" />
        <line x1="47" y1="37" x2="60" y2="37" strokeWidth="1.75" opacity="0.92" />

        <line x1="32" y1="24" x2="40" y2="24" strokeWidth="2.2" />
        <line x1="32" y1="30" x2="40" y2="30" strokeWidth="2.2" />
      </g>
    </svg>
  );
}

function toNumber(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getClauseNo(clause) {
  return toNumber(clause?.order_index ?? clause?.clause_no, null);
}

function toText(value) {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  return String(value);
}

function tokenize(text) {
  return toText(text)
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

// LCS tabanlı basit kelime diff: ortak olmayan kelimeleri "degisti" olarak işaretler.
function diffWords(oldText, newText) {
  const a = tokenize(oldText);
  const b = tokenize(newText);
  const n = a.length;
  const m = b.length;

  if (!n && !m) {
    return { left: [], right: [] };
  }

  // dp[i][j] = LCS length for a[i:] and b[j:]
  const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? 1 + dp[i + 1][j + 1] : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const commonA = new Set();
  const commonB = new Set();
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      commonA.add(i);
      commonB.add(j);
      i++;
      j++;
      continue;
    }
    if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }

  const left = a.map((w, idx) => ({ text: w, changed: !commonA.has(idx) }));
  const right = b.map((w, idx) => ({ text: w, changed: !commonB.has(idx) }));
  return { left, right };
}

function formatCount(value) {
  return new Intl.NumberFormat("tr-TR").format(Number(value ?? 0));
}

function getRiskScore(clause) {
  const score = Number(clause?.ml_risk_score ?? clause?.risk_score ?? 0);
  return Number.isFinite(score) ? score : 0;
}

function buildClauseMap(clauses) {
  const map = new Map();
  (Array.isArray(clauses) ? clauses : []).forEach((clause) => {
    const no = getClauseNo(clause);
    if (no === null) return;
    map.set(no, clause);
  });
  return map;
}

function listUnionSorted(a, b) {
  const set = new Set();
  [...a.keys(), ...b.keys()].forEach((k) => set.add(k));
  return [...set].sort((x, y) => x - y);
}

function getRowKind(leftClause, rightClause) {
  if (leftClause && !rightClause) return "removed";
  if (!leftClause && rightClause) return "added";
  if (!leftClause && !rightClause) return "empty";
  const leftText = toText(leftClause?.clause_text);
  const rightText = toText(rightClause?.clause_text);
  return leftText.trim() === rightText.trim() ? "same" : "modified";
}

function pickBestDetail(leftClause, rightClause) {
  if (!leftClause && !rightClause) return null;
  const leftScore = getRiskScore(leftClause);
  const rightScore = getRiskScore(rightClause);
  if (rightClause && rightScore >= leftScore) return rightClause;
  return leftClause || rightClause;
}

function DetailPanel({ clause, onClose }) {
  const clauseNo = getClauseNo(clause);
  const clauseType = toText(clause?.clause_type || "Belirsiz");
  const riskScore = getRiskScore(clause);
  const ambiguous = Array.isArray(clause?.ambiguous_terms) ? clause.ambiguous_terms : [];
  const ruleResults = Array.isArray(clause?.rule_results) ? clause.rule_results : [];
  const suggestion = toText(clause?.suggestion || "");

  return (
    <motion.div
      className="compareDetail"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.18 }}
    >
      <div className="compareDetailHeader">
        <div className="compareDetailTitle">
          <strong>Madde {clauseNo ?? "-"}</strong>
          <span className="compareDetailMeta">
            {clauseType} · Risk: {riskScore.toFixed(2)}
          </span>
        </div>
        <button type="button" className="compareIconButton" onClick={onClose} aria-label="Kapat">
          <X size={16} />
        </button>
      </div>

      {suggestion ? (
        <div className="compareDetailBlock">
          <div className="compareDetailBlockTitle">Önerilen Yeni Metin</div>
          <p className="compareDetailText">{suggestion}</p>
        </div>
      ) : null}

      {ruleResults.length ? (
        <div className="compareDetailBlock">
          <div className="compareDetailBlockTitle">Neden Riskli? (Kural Sonuçları)</div>
          <ul className="compareDetailList">
            {ruleResults.slice(0, 4).map((rule, idx) => (
              <li key={`${rule?.rule_name || "rule"}-${idx}`}>
                <strong>{toText(rule?.rule_name || "Kural")}</strong>
                {rule?.recommendation ? <span> — {toText(rule.recommendation)}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {ambiguous.length ? (
        <div className="compareDetailBlock">
          <div className="compareDetailBlockTitle">Belirsiz İfadeler</div>
          <div className="comparePillRow">
            {ambiguous.slice(0, 10).map((term, idx) => (
              <span key={`amb-${idx}`} className="comparePill">
                {toText(term)}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {!suggestion && !ruleResults.length && !ambiguous.length ? (
        <div className="compareDetailEmpty">Bu madde için ek detay bulunamadı.</div>
      ) : null}
    </motion.div>
  );
}

function ClauseCell({ side, kind, clause, otherClause }) {
  const clauseNo = clause ? getClauseNo(clause) : getClauseNo(otherClause);
  const text = toText(clause?.clause_text);

  if (!clause) {
    return (
      <div className={`compareCell compareCellPlaceholder ${side === "left" ? "left" : "right"}`}>
        <div className="compareCellTop">
          <span className="compareCellNo">Madde {clauseNo ?? "-"}</span>
          <span className="compareCellTag">{kind === "added" ? "Boş" : "Silindi"}</span>
        </div>
        <div className="compareCellBody compareCellMuted">—</div>
      </div>
    );
  }

  const modified = kind === "modified";
  const removed = kind === "removed";
  const added = kind === "added";
  const wordDiff = modified ? diffWords(leftTextFor(side, clause, otherClause), rightTextFor(side, clause, otherClause)) : null;

  return (
    <div
      className={[
        "compareCell",
        removed ? "compareCellRemoved" : "",
        added ? "compareCellAdded" : "",
        modified ? "compareCellModified" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="compareCellTop">
        <span className="compareCellNo">Madde {clauseNo ?? "-"}</span>
        <span className="compareCellScore">Risk: {getRiskScore(clause).toFixed(2)}</span>
      </div>
      <div className={`compareCellBody ${removed ? "compareStrikethrough" : ""}`}>
        {modified && wordDiff ? (
          <p className="compareCellText">
            {(side === "left" ? wordDiff.left : wordDiff.right).map((tok, idx) => (
              <span key={idx} className={tok.changed ? "compareWordChanged" : ""}>
                {tok.text}
                {idx < (side === "left" ? wordDiff.left.length : wordDiff.right.length) - 1 ? " " : ""}
              </span>
            ))}
          </p>
        ) : (
          <p className="compareCellText">{text || "Madde metni bulunamadı."}</p>
        )}
      </div>
    </div>
  );
}

function leftTextFor(side, clause, otherClause) {
  // side paramı ile tek fonksiyonda diff hesaplamak için küçük yardımcı
  if (side === "left") return toText(clause?.clause_text);
  return toText(otherClause?.clause_text);
}

function rightTextFor(side, clause, otherClause) {
  if (side === "left") return toText(otherClause?.clause_text);
  return toText(clause?.clause_text);
}

export default function ComparePanel({ v1, v2, onBack, identicalSnapshots = false, toolbarRight = null }) {
  const v1Clauses = Array.isArray(v1?.clauses) ? v1.clauses : [];
  const v2Clauses = Array.isArray(v2?.clauses) ? v2.clauses : [];

  const leftMap = useMemo(() => buildClauseMap(v1Clauses), [v1Clauses]);
  const rightMap = useMemo(() => buildClauseMap(v2Clauses), [v2Clauses]);
  const allNos = useMemo(() => listUnionSorted(leftMap, rightMap), [leftMap, rightMap]);

  const rows = useMemo(() => {
    return allNos.map((no) => {
      const left = leftMap.get(no) || null;
      const right = rightMap.get(no) || null;
      const kind = getRowKind(left, right);
      const leftScore = getRiskScore(left);
      const rightScore = getRiskScore(right);
      const riskDelta = rightScore - leftScore;
      return { no, left, right, kind, riskDelta };
    });
  }, [allNos, leftMap, rightMap]);

  const metrics = useMemo(() => {
    const changed = rows.filter((r) => r.kind !== "same").length;
    const added = rows.filter((r) => r.kind === "added").length;
    const removed = rows.filter((r) => r.kind === "removed").length;
    const modified = rows.filter((r) => r.kind === "modified").length;
    const avg1 =
      v1Clauses.length > 0 ? v1Clauses.reduce((sum, c) => sum + getRiskScore(c), 0) / v1Clauses.length : 0;
    const avg2 =
      v2Clauses.length > 0 ? v2Clauses.reduce((sum, c) => sum + getRiskScore(c), 0) / v2Clauses.length : 0;
    return {
      changed,
      added,
      removed,
      modified,
      avgDelta: avg2 - avg1,
      avg1,
      avg2,
    };
  }, [rows, v1Clauses, v2Clauses]);

  const [openNo, setOpenNo] = useState(null);
  const detailScrollRef = useRef(null);

  useEffect(() => {
    if (openNo == null) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const behavior = reduceMotion ? "auto" : "smooth";
    const runScroll = () => {
      detailScrollRef.current?.scrollIntoView({
        behavior,
        block: "start",
        inline: "nearest",
      });
    };
    const t1 = window.setTimeout(runScroll, 0);
    const t2 = window.setTimeout(runScroll, 220);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [openNo]);

  return (
    <section className="comparePage">
      <header className="compareTopbar">
        <div className="compareTopbarActions">
          <button type="button" className="secondaryButton navButton" onClick={onBack}>
            Geri
          </button>
        </div>
        {toolbarRight ? <div className="compareTopbarProfileSlot">{toolbarRight}</div> : null}
      </header>

      {identicalSnapshots ? (
        <div className="compareIdenticalNotice" role="status">
          <div className="compareIdenticalIcon" aria-hidden="true">
            <CompareNoDiffIllustration />
          </div>
          <h2 className="compareIdenticalTitle">Sözleşmede değişiklik yok</h2>
          <p className="compareIdenticalText">
            Kayıtlı önceki sürüm (V1) ile güncel analiz (V2) aynı madde metinlerine sahip. Karşılaştırmak için
            farklı bir sözleşme yükleyip yeniden analiz edin; veya ana sayfadan V1 kaydını temizleyip akışı
            sıfırlayın.
          </p>
        </div>
      ) : null}

      {!identicalSnapshots ? (
        <>
      <div className="compareSummaryBar">
        <div className="compareStat">
          <div className="compareStatN">{formatCount(metrics.changed)}</div>
          <div className="compareStatL">Değişen Madde Sayısı</div>
        </div>
        <div className="compareStat">
          <div className="compareStatN">{formatCount(metrics.modified)}</div>
          <div className="compareStatL">İçeriği Değişen</div>
        </div>
        <div className="compareStat">
          <div className="compareStatN">
            {metrics.avgDelta >= 0 ? "+" : ""}
            {metrics.avgDelta.toFixed(2)}
          </div>
          <div className="compareStatL">Risk Skoru Farkı (Ort.)</div>
        </div>
        <div className="compareStat">
          <div className="compareStatN">
            <span className="compareMini">
              V1 {metrics.avg1.toFixed(2)} → V2 {metrics.avg2.toFixed(2)}
            </span>
          </div>
          <div className="compareStatL">Ortalama Risk</div>
        </div>
      </div>

      <div className="compareLegend">
        <span className="compareLegendItem compareLegendAdded">
          <Plus size={14} /> Yeni eklenen
        </span>
        <span className="compareLegendItem compareLegendRemoved">
          <Minus size={14} /> Silinen
        </span>
        <span className="compareLegendItem compareLegendModified">
          <Replace size={14} /> İçerik değişti
        </span>
      </div>

      <div className="compareGridHead">
        <div className="compareColHead">
          <span className="compareColTag">V1</span>
          <span className="compareColName">{toText(v1?.name || "Önceki Sürüm")}</span>
        </div>
        <div className="compareColHead">
          <span className="compareColTag">V2</span>
          <span className="compareColName">{toText(v2?.name || "Yeni Sürüm")}</span>
        </div>
      </div>

      <div className="compareRows">
        {rows.map((row) => {
          const detailClause = pickBestDetail(row.left, row.right);
          const isInteractive = Boolean(detailClause);
          const isOpen = openNo === row.no;

          return (
            <div key={`row-${row.no}`} className="compareRowWrap">
              <button
                type="button"
                className={[
                  "compareRow",
                  row.kind === "added" ? "is-added" : "",
                  row.kind === "removed" ? "is-removed" : "",
                  row.kind === "modified" ? "is-modified" : "",
                  row.kind === "same" ? "is-same" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => {
                  if (!isInteractive) return;
                  setOpenNo((prev) => (prev === row.no ? null : row.no));
                }}
                aria-expanded={isOpen}
              >
                <div className="compareRowCells">
                  <ClauseCell side="left" kind={row.kind} clause={row.left} otherClause={row.right} />
                  <ClauseCell side="right" kind={row.kind} clause={row.right} otherClause={row.left} />
                </div>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && detailClause ? (
                  <div ref={detailScrollRef} className="compareDetailScrollAnchor">
                    <DetailPanel clause={detailClause} onClose={() => setOpenNo(null)} />
                  </div>
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
        </>
      ) : null}
    </section>
  );
}

