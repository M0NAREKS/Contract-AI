export const MOCK_ANALYSIS_RESPONSE = {
  summary: {
    violation_count: 6,
    warning_count: 6,
    average_ml_risk_score: 0.79,
  },
  clauses: [
    {
      order_index: 1,
      clause_text:
        "Proje kapsaminda yer almayan ek ozellik talepleri, yeni teklif ve onay sureci olmadan is kapsaminda degerlendirilecektir.",
      clause_type: "Kapsam Yonetimi",
      ml_risk_score: 0.91,
      ml_risk_level: "high",
      overall_status: "violation",
      ambiguous_terms: ["uygun goruldugunde", "ek ozellik talepleri"],
      extracted_fields: {
        change_request_process: "Belirtilmemis",
        approval_flow: "Belirtilmemis",
        scope_boundary: "Net degil",
      },
      rule_results: [
        {
          rule_name: "ScopeChangeApprovalRequired",
          severity: "high",
          matched_phrases: ["yeni teklif ve onay sureci olmadan"],
          recommendation: "Degisiklik talebi icin yazili onay ve kapsam revizyon adimlari eklenmeli.",
        },
      ],
    },
    {
      order_index: 2,
      clause_text:
        "ML modelinin egitimi icin gerekli veri setlerinin dogrulugu Musteri tarafindan saglanacaktir.",
      clause_type: "Veri ve ML",
      ml_risk_score: 0.87,
      ml_risk_level: "high",
      overall_status: "violation",
      ambiguous_terms: ["dogrulugu Musteri tarafindan saglanacaktir"],
      extracted_fields: {
        data_quality_owner: "Musteri",
        validation_method: "Belirtilmemis",
        model_retraining: "Belirtilmemis",
      },
      rule_results: [
        {
          rule_name: "SharedDataResponsibility",
          severity: "high",
          matched_phrases: ["Musteri tarafindan saglanacaktir"],
          recommendation: "Veri sorumlulugu taraflar arasinda paylastirilmali ve validasyon kriterleri netlestirilmeli.",
        },
      ],
    },
    {
      order_index: 3,
      clause_text:
        "Odeme, fatura kesim tarihinden itibaren 90 gun sonra ve tek kalemde yapilacaktir.",
      clause_type: "Odeme",
      ml_risk_score: 0.74,
      ml_risk_level: "high",
      overall_status: "violation",
      ambiguous_terms: [],
      extracted_fields: {
        payment_term_days: 90,
        payment_currency: "TRY",
        installment_plan: "Yok",
      },
      rule_results: [
        {
          rule_name: "PaymentTermLimit",
          severity: "high",
          matched_phrases: ["90 gun sonra"],
          recommendation: "Odeme vadesi 30-45 gun araligina cekilmeli veya taksitli plan eklenmeli.",
        },
      ],
    },
    {
      order_index: 4,
      clause_text:
        "Hizmet seviyesi hedefleri iyi niyet esasinda takip edilir; kesinti durumunda ceza uygulanmaz.",
      clause_type: "SLA",
      ml_risk_score: 0.67,
      ml_risk_level: "medium",
      overall_status: "warning",
      ambiguous_terms: ["iyi niyet esasinda"],
      extracted_fields: {
        uptime_target: "Belirtilmemis",
        penalty_clause: "Yok",
        incident_response_time: "Belirtilmemis",
      },
      rule_results: [
        {
          rule_name: "SlaPenaltyRequired",
          severity: "warning",
          matched_phrases: ["ceza uygulanmaz"],
          recommendation: "SLA hedefleri olculebilir KPI'larla ve cezai sartlarla yeniden yazilmali.",
        },
      ],
    },
    {
      order_index: 5,
      clause_text:
        "Taraflardan biri istedigi zaman tek tarafli bildirimle sozlesmeyi derhal sona erdirebilir.",
      clause_type: "Fesih",
      ml_risk_score: 0.82,
      ml_risk_level: "high",
      overall_status: "violation",
      ambiguous_terms: ["istedigi zaman", "derhal"],
      extracted_fields: {
        termination_notice_days: 0,
        cure_period: "Yok",
        early_termination_fee: "Belirtilmemis",
      },
      rule_results: [
        {
          rule_name: "TerminationNoticeRequired",
          severity: "high",
          matched_phrases: ["tek tarafli bildirimle", "derhal"],
          recommendation: "En az 30 gun ihbar suresi ve duzeltme (cure) periyodu eklenmeli.",
        },
      ],
    },
    {
      order_index: 6,
      clause_text:
        "Tazminat sorumlulugu toplam sozlesme bedeli ile sinirlandirilmaz ve dolayli zararlar da kapsamdadir.",
      clause_type: "Sorumluluk",
      ml_risk_score: 0.93,
      ml_risk_level: "high",
      overall_status: "violation",
      ambiguous_terms: ["dolayli zararlar da kapsamdadir"],
      extracted_fields: {
        liability_cap: "Yok",
        indirect_damages: "Kapsam dahil",
        indemnity_scope: "Genis",
      },
      rule_results: [
        {
          rule_name: "LiabilityCapRequired",
          severity: "high",
          matched_phrases: ["sinirlandirilmaz", "dolayli zararlar da kapsamdadir"],
          recommendation: "Sorumluluk limiti sozlesme bedeliyle sinirlanmali ve dolayli zarar kapsami daraltilmali.",
        },
      ],
    },
  ],
};

