import { AlertTriangle, Check, ShieldAlert } from "lucide-react";

const ROW_COUNT = 5;

/**
 * Login sol panel: sağ sütun gibi doğrudan DarkVeil üzerinde; ortada A4 beyaz kart.
 */
export default function LoginContractShowcase() {
  // Login ekranındaki taslak liste: 2 uyarı + 1 risk örneği.
  const clauseKinds = ["safe", "warning", "safe", "risk", "warning"];

  const getKindMeta = (kind) => {
    if (kind === "risk") {
      return {
        label: "Riskli",
        pillBorder: "border-red-500/40",
        pillText: "text-red-400",
        pillShadow: "shadow-[0_10px_28px_-8px_rgba(239,68,68,0.55)]",
        pillHoverOpacity: "group-hover:opacity-100",
        barHover: "group-hover:bg-red-500",
        barShadowHover: "group-hover:shadow-[0_8px_28px_-4px_rgba(239,68,68,0.35)]",
        Icon: ShieldAlert,
      };
    }

    if (kind === "warning") {
      return {
        label: "Uyarı",
        pillBorder: "border-amber-400/40",
        pillText: "text-amber-300",
        pillShadow: "shadow-[0_10px_28px_-8px_rgba(245,158,11,0.55)]",
        pillHoverOpacity: "group-hover:opacity-100",
        barHover: "group-hover:bg-amber-400",
        barShadowHover: "group-hover:shadow-[0_8px_28px_-4px_rgba(245,158,11,0.32)]",
        Icon: AlertTriangle,
      };
    }

    return {
      label: "Güvenli",
      pillBorder: "border-[#00D09C]/40",
      pillText: "text-[#00D09C]",
      pillShadow: "shadow-lg",
      pillHoverOpacity: "group-hover:opacity-100",
      barHover: "group-hover:bg-[#00D09C]",
      barShadowHover: "group-hover:shadow-[0_8px_28px_-4px_rgba(0,208,156,0.35)]",
      Icon: Check,
    };
  };

  return (
    <div className="relative z-[1] flex h-full min-h-0 w-full flex-1 flex-col">
      <div className="relative flex h-full min-h-0 w-full flex-1 items-center justify-center overflow-hidden px-4 py-6">
        <div className="relative flex max-h-[min(560px,calc(100vh-3rem))] w-[450px] max-w-[calc(100vw-2rem)] min-h-0 flex-col gap-5 overflow-visible rounded-2xl bg-white p-7 shadow-2xl transition-shadow duration-700 ease-in-out">
        <div className="shrink-0 select-none border-b border-slate-100 pb-3">
          <div className="text-[13px] font-extrabold tracking-wide text-slate-900">Contrat AI</div>
          <div className="mt-2 text-[14px] font-semibold text-slate-500">Sözleşmeleriniz Güvende</div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col justify-center gap-5">
          {Array.from({ length: ROW_COUNT }, (_, i) => {
            const kind = clauseKinds[i] ?? "safe";
            const meta = getKindMeta(kind);
            const PillIcon = meta.Icon;

            return (
            <div key={i} className="group relative w-full">
              <p className="mb-2 text-sm font-medium text-gray-400">Madde {i + 1}</p>
              <div className="relative">
                <div
                  className={[
                    "h-8 w-full rounded-md bg-slate-100 shadow-sm shadow-slate-200/60 transition-[background-color,box-shadow] duration-500 ease-out",
                    meta.barHover,
                    meta.barShadowHover,
                  ].join(" ")}
                  aria-hidden
                />
                <div
                  className={[
                    "pointer-events-none absolute right-2 top-0 z-20 flex -translate-y-[calc(100%+8px)] items-center gap-1.5 whitespace-nowrap rounded-full border bg-[#0D121F] px-3 py-1.5 text-[11px] font-semibold tracking-wide opacity-0 transition-opacity duration-400 ease-out",
                    meta.pillBorder,
                    meta.pillText,
                    meta.pillShadow,
                    meta.pillHoverOpacity,
                  ].join(" ")}
                  role="status"
                >
                  <PillIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} aria-hidden />
                  <span>{meta.label}</span>
                </div>
              </div>
            </div>
            );
          })}
        </div>

        <div className="pointer-events-none mt-auto flex shrink-0 justify-center gap-2 border-t border-slate-100 pt-3">
          <div className="h-2 w-32 rounded-full bg-slate-100" aria-hidden />
        </div>
        </div>
      </div>
    </div>
  );
}
