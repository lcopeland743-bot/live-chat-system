/**
 * Meridian Conversation Language Service
 *
 * Version:
 * v2.3.4
 *
 * Purpose:
 * - Detect the latest customer language before the OpenAI call
 * - Lock all customer-facing text to that language
 * - Provide deterministic localized fifth-reply WhatsApp endings
 */

const SCRIPT_PATTERNS = {
    han: /[\u3400-\u9fff]/u,
    japanese: /[\u3040-\u30ff]/u,
    korean: /[\uac00-\ud7af]/u,
    arabic: /[\u0600-\u06ff]/u,
    cyrillic: /[\u0400-\u04ff]/u,
    devanagari: /[\u0900-\u097f]/u,
    thai: /[\u0e00-\u0e7f]/u,
    hebrew: /[\u0590-\u05ff]/u,
    greek: /[\u0370-\u03ff]/u,
    latin: /[A-Za-zÀ-ÖØ-öø-ÿĀ-ž]/u
};


const LANGUAGE_DEFINITIONS = {
    en: {
        name: "English",
        script: "latin",
        markers: [
            "the", "and", "is", "are", "how", "today",
            "stock", "market", "price", "holding", "trading",
            "please", "what", "should", "thanks"
        ]
    },

    es: {
        name: "Spanish",
        script: "latin",
        markers: [
            "el", "la", "los", "las", "que", "cómo",
            "hoy", "acción", "mercado", "precio", "tengo",
            "quiero", "estoy", "gracias", "debo"
        ]
    },

    pt: {
        name: "Portuguese",
        script: "latin",
        markers: [
            "o", "a", "os", "as", "que", "como",
            "hoje", "ação", "mercado", "preço", "tenho",
            "quero", "estou", "obrigado", "devo"
        ]
    },

    fr: {
        name: "French",
        script: "latin",
        markers: [
            "le", "la", "les", "que", "comment",
            "aujourd'hui", "action", "marché", "prix",
            "je", "vous", "merci", "dois"
        ]
    },

    de: {
        name: "German",
        script: "latin",
        markers: [
            "der", "die", "das", "wie", "heute",
            "aktie", "markt", "preis", "ich", "sie",
            "danke", "sollte"
        ]
    },

    it: {
        name: "Italian",
        script: "latin",
        markers: [
            "il", "lo", "la", "come", "oggi",
            "azione", "mercato", "prezzo", "sono",
            "voglio", "grazie", "dovrei"
        ]
    },

    tr: {
        name: "Turkish",
        script: "latin",
        markers: [
            "bugün", "hisse", "piyasa", "fiyat",
            "nasıl", "tutuyorum", "işlem", "teşekkür",
            "ne", "gerekir"
        ]
    },

    vi: {
        name: "Vietnamese",
        script: "latin",
        markers: [
            "hôm", "nay", "cổ", "phiếu", "thị",
            "trường", "giá", "như", "thế", "nào",
            "cảm", "ơn", "tôi"
        ]
    },

    id: {
        name: "Indonesian",
        script: "latin",
        markers: [
            "hari", "ini", "saham", "pasar", "harga",
            "bagaimana", "saya", "memegang", "terima",
            "kasih", "apa"
        ]
    },

    zh: {
        name: "Chinese",
        script: "han",
        markers: []
    },

    ja: {
        name: "Japanese",
        script: "japanese",
        markers: []
    },

    ko: {
        name: "Korean",
        script: "korean",
        markers: []
    },

    ar: {
        name: "Arabic",
        script: "arabic",
        markers: []
    },

    ru: {
        name: "Russian",
        script: "cyrillic",
        markers: []
    },

    hi: {
        name: "Hindi",
        script: "devanagari",
        markers: []
    },

    th: {
        name: "Thai",
        script: "thai",
        markers: []
    },

    he: {
        name: "Hebrew",
        script: "hebrew",
        markers: []
    },

    el: {
        name: "Greek",
        script: "greek",
        markers: []
    }
};


const LOCALIZED = {
    en: {
        fallback:
            "The key signal is confirmation, not price alone. Check timing and risk before acting.",
        currentUnavailable:
            "Current data could not be verified. Confirm the live signal before making a decision.",
        refusal:
            "Understood. We can continue here, and I will not send another WhatsApp invitation.",
        finalClose:
            "Continue on WhatsApp for the complete plan.",
        finalTitle:
            "Your complete decision plan",
        finalButton:
            "Continue on WhatsApp",
        prefill:
            "Hi, I want the complete {asset} plan, key levels, and risk conditions."
    },

    zh: {
        fallback:
            "关键不只看价格，还要确认量能、时机和风险条件。",
        currentUnavailable:
            "暂时无法核实最新数据，请先确认实时信号再做决定。",
        refusal:
            "明白，我们继续在这里沟通，不再发送WhatsApp邀请。",
        finalClose:
            "点击WhatsApp继续查看完整方案。",
        finalTitle:
            "查看完整决策方案",
        finalButton:
            "进入WhatsApp",
        prefill:
            "你好，我想查看{asset}的完整方案、关键位置和风险条件。"
    },

    es: {
        fallback:
            "La clave es la confirmación, no solo el precio. Revise momento y riesgo antes de actuar.",
        currentUnavailable:
            "No pude verificar los datos actuales. Confirme la señal en vivo antes de decidir.",
        refusal:
            "Entendido. Seguimos aquí y no enviaré otra invitación de WhatsApp.",
        finalClose:
            "Continúa en WhatsApp para ver el plan completo.",
        finalTitle:
            "Tu plan de decisión completo",
        finalButton:
            "Continuar en WhatsApp",
        prefill:
            "Hola, quiero el plan completo de {asset}, niveles clave y condiciones de riesgo."
    },

    pt: {
        fallback:
            "A confirmação importa mais que o preço. Verifique momento e risco antes de agir.",
        currentUnavailable:
            "Não consegui verificar os dados atuais. Confirme o sinal ao vivo antes de decidir.",
        refusal:
            "Entendido. Continuamos aqui e não enviarei outro convite do WhatsApp.",
        finalClose:
            "Continue no WhatsApp para ver o plano completo.",
        finalTitle:
            "Seu plano de decisão completo",
        finalButton:
            "Continuar no WhatsApp",
        prefill:
            "Olá, quero o plano completo de {asset}, níveis-chave e condições de risco."
    },

    fr: {
        fallback:
            "La confirmation compte plus que le prix. Vérifiez timing et risque avant d’agir.",
        currentUnavailable:
            "Les données actuelles n’ont pas pu être vérifiées. Confirmez le signal en direct.",
        refusal:
            "Compris. Nous continuons ici sans autre invitation WhatsApp.",
        finalClose:
            "Continuez sur WhatsApp pour voir le plan complet.",
        finalTitle:
            "Votre plan de décision complet",
        finalButton:
            "Continuer sur WhatsApp",
        prefill:
            "Bonjour, je veux le plan complet de {asset}, les niveaux clés et les risques."
    },

    de: {
        fallback:
            "Bestätigung zählt mehr als der Preis. Prüfen Sie Timing und Risiko vor einer Entscheidung.",
        currentUnavailable:
            "Aktuelle Daten konnten nicht bestätigt werden. Prüfen Sie zuerst das Live-Signal.",
        refusal:
            "Verstanden. Wir bleiben hier und senden keine weitere WhatsApp-Einladung.",
        finalClose:
            "Auf WhatsApp finden Sie den vollständigen Plan.",
        finalTitle:
            "Ihr vollständiger Entscheidungsplan",
        finalButton:
            "Auf WhatsApp fortfahren",
        prefill:
            "Hallo, ich möchte den vollständigen {asset}-Plan, Schlüsselmarken und Risiken."
    },

    it: {
        fallback:
            "Conta la conferma, non solo il prezzo. Verifica timing e rischio prima di agire.",
        currentUnavailable:
            "Non ho potuto verificare i dati attuali. Conferma il segnale live prima di decidere.",
        refusal:
            "Capito. Continuiamo qui senza altri inviti WhatsApp.",
        finalClose:
            "Continua su WhatsApp per il piano completo.",
        finalTitle:
            "Il tuo piano decisionale completo",
        finalButton:
            "Continua su WhatsApp",
        prefill:
            "Ciao, voglio il piano completo di {asset}, livelli chiave e condizioni di rischio."
    },

    ja: {
        fallback:
            "価格だけでなく確認シグナルが重要です。行動前に時期とリスクを確認してください。",
        currentUnavailable:
            "最新データを確認できませんでした。判断前にリアルタイムのシグナルを確認してください。",
        refusal:
            "承知しました。ここで続け、WhatsAppの案内は送信しません。",
        finalClose:
            "WhatsAppで完全なプランを確認してください。",
        finalTitle:
            "完全な意思決定プラン",
        finalButton:
            "WhatsAppで続ける",
        prefill:
            "こんにちは。{asset}の完全なプラン、重要水準、リスク条件を確認したいです。"
    },

    ko: {
        fallback:
            "가격보다 확인 신호가 중요합니다. 행동 전 시점과 위험을 확인하세요.",
        currentUnavailable:
            "최신 데이터를 확인하지 못했습니다. 결정 전 실시간 신호를 확인하세요.",
        refusal:
            "알겠습니다. 여기서 계속하며 WhatsApp 안내는 더 보내지 않겠습니다.",
        finalClose:
            "WhatsApp에서 전체 계획을 확인하세요.",
        finalTitle:
            "전체 의사결정 계획",
        finalButton:
            "WhatsApp에서 계속",
        prefill:
            "안녕하세요. {asset}의 전체 계획, 핵심 수준과 위험 조건을 보고 싶습니다."
    },

    ar: {
        fallback:
            "التأكيد أهم من السعر وحده. راجع التوقيت والمخاطر قبل اتخاذ القرار.",
        currentUnavailable:
            "تعذر التحقق من البيانات الحالية. أكد الإشارة المباشرة قبل اتخاذ القرار.",
        refusal:
            "مفهوم. سنواصل هنا ولن أرسل دعوة واتساب أخرى.",
        finalClose:
            "تابع على واتساب للاطلاع على الخطة الكاملة.",
        finalTitle:
            "خطة القرار الكاملة",
        finalButton:
            "المتابعة على واتساب",
        prefill:
            "مرحبًا، أريد خطة {asset} الكاملة والمستويات الرئيسية وشروط المخاطر."
    },

    ru: {
        fallback:
            "Подтверждение важнее одной цены. Проверьте момент и риск перед решением.",
        currentUnavailable:
            "Текущие данные не подтверждены. Проверьте сигнал в реальном времени.",
        refusal:
            "Понятно. Продолжим здесь без новых приглашений в WhatsApp.",
        finalClose:
            "Продолжите в WhatsApp, чтобы получить полный план.",
        finalTitle:
            "Полный план решения",
        finalButton:
            "Продолжить в WhatsApp",
        prefill:
            "Здравствуйте, мне нужен полный план по {asset}, ключевые уровни и риски."
    },

    tr: {
        fallback:
            "Fiyattan çok teyit önemlidir. Karar öncesi zamanlama ve riski kontrol edin.",
        currentUnavailable:
            "Güncel veri doğrulanamadı. Karar vermeden önce canlı sinyali doğrulayın.",
        refusal:
            "Anlaşıldı. Burada devam edeceğiz ve yeni WhatsApp daveti göndermeyeceğim.",
        finalClose:
            "Tam plan için WhatsApp'ta devam edin.",
        finalTitle:
            "Eksiksiz karar planınız",
        finalButton:
            "WhatsApp'ta devam et",
        prefill:
            "Merhaba, {asset} için tam planı, önemli seviyeleri ve risk koşullarını istiyorum."
    },

    vi: {
        fallback:
            "Xác nhận quan trọng hơn giá. Hãy kiểm tra thời điểm và rủi ro trước khi hành động.",
        currentUnavailable:
            "Không thể xác minh dữ liệu hiện tại. Hãy kiểm tra tín hiệu trực tiếp trước khi quyết định.",
        refusal:
            "Đã hiểu. Chúng ta tiếp tục tại đây và tôi sẽ không gửi thêm lời mời WhatsApp.",
        finalClose:
            "Tiếp tục trên WhatsApp để xem kế hoạch đầy đủ.",
        finalTitle:
            "Kế hoạch quyết định đầy đủ",
        finalButton:
            "Tiếp tục trên WhatsApp",
        prefill:
            "Xin chào, tôi muốn kế hoạch đầy đủ cho {asset}, mức quan trọng và điều kiện rủi ro."
    },

    id: {
        fallback:
            "Konfirmasi lebih penting daripada harga. Periksa waktu dan risiko sebelum bertindak.",
        currentUnavailable:
            "Data saat ini tidak dapat diverifikasi. Konfirmasi sinyal langsung sebelum memutuskan.",
        refusal:
            "Dipahami. Kita lanjut di sini tanpa undangan WhatsApp lain.",
        finalClose:
            "Lanjutkan di WhatsApp untuk rencana lengkap.",
        finalTitle:
            "Rencana keputusan lengkap",
        finalButton:
            "Lanjutkan di WhatsApp",
        prefill:
            "Halo, saya ingin rencana lengkap {asset}, level penting, dan kondisi risiko."
    }
};


function normalizeText(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/[^\p{L}\p{N}'’]+/gu, " ")
        .trim();
}


function markerScore(text, markers) {
    const words =
        new Set(
            normalizeText(text)
            .split(/\s+/u)
            .filter(Boolean)
        );

    let score =
        0;

    markers.forEach(marker => {
        const normalized =
            normalizeText(marker);

        if (
            normalized.includes(" ")
            ? normalizeText(text).includes(normalized)
            : words.has(normalized)
        ) {
            score += normalized.length > 4
                ? 2
                : 1;
        }
    });

    return score;
}


function createLanguage(code, confidence = 1) {
    const definition =
        LANGUAGE_DEFINITIONS[code]
        || LANGUAGE_DEFINITIONS.en;

    return {
        code:
            LANGUAGE_DEFINITIONS[code]
            ? code
            : "en",
        name:
            definition.name,
        script:
            definition.script,
        confidence
    };
}


function detectLanguage(value) {
    const text =
        String(value || "").trim();

    if (!text) {
        return createLanguage("en", 0);
    }

    if (SCRIPT_PATTERNS.japanese.test(text)) {
        return createLanguage("ja");
    }

    if (SCRIPT_PATTERNS.korean.test(text)) {
        return createLanguage("ko");
    }

    if (SCRIPT_PATTERNS.han.test(text)) {
        return createLanguage("zh");
    }

    if (SCRIPT_PATTERNS.arabic.test(text)) {
        return createLanguage("ar");
    }

    if (SCRIPT_PATTERNS.cyrillic.test(text)) {
        return createLanguage("ru");
    }

    if (SCRIPT_PATTERNS.devanagari.test(text)) {
        return createLanguage("hi");
    }

    if (SCRIPT_PATTERNS.thai.test(text)) {
        return createLanguage("th");
    }

    if (SCRIPT_PATTERNS.hebrew.test(text)) {
        return createLanguage("he");
    }

    if (SCRIPT_PATTERNS.greek.test(text)) {
        return createLanguage("el");
    }

    const latinCodes = [
        "en",
        "es",
        "pt",
        "fr",
        "de",
        "it",
        "tr",
        "vi",
        "id"
    ];

    const scores =
        latinCodes
        .map(code => ({
            code,
            score:
                markerScore(
                    text,
                    LANGUAGE_DEFINITIONS[code].markers
                )
        }))
        .sort((a, b) => b.score - a.score);

    const best =
        scores[0];

    const second =
        scores[1];

    if (
        best
        && best.score >= 2
        && (
            !second
            || best.score > second.score
        )
    ) {
        return createLanguage(
            best.code,
            Math.min(
                1,
                0.55 + best.score * 0.08
            )
        );
    }

    return createLanguage(
        "en",
        best && best.score > 0
        ? 0.45
        : 0.25
    );
}


function detectConversationLanguage(
    latestMessage,
    messages = []
) {
    const latest =
        detectLanguage(latestMessage);

    if (
        latest.script !== "latin"
        || latest.confidence >= 0.6
    ) {
        return latest;
    }

    const recentUserMessages =
        (messages || [])
        .filter(message => {
            return (
                message
                && message.sender === "user"
                && typeof message.content === "string"
            );
        })
        .slice(-8)
        .reverse();

    for (const message of recentUserMessages) {
        const detected =
            detectLanguage(
                message.content
            );

        if (
            detected.script !== "latin"
            || detected.confidence >= 0.6
        ) {
            return detected;
        }
    }

    return latest;
}


function containsForeignScript(
    text,
    expectedScript
) {
    return Object.entries(
        SCRIPT_PATTERNS
    )
    .some(([script, pattern]) => {
        return (
            script !== expectedScript
            && script !== "latin"
            && pattern.test(text)
        );
    });
}


function isTextCompatible(
    value,
    language
) {
    const text =
        String(value || "").trim();

    if (!text) {
        return true;
    }

    const expected =
        language
        && LANGUAGE_DEFINITIONS[language.code]
        ? language
        : createLanguage("en");

    if (expected.script !== "latin") {
        return (
            SCRIPT_PATTERNS[
                expected.script
            ].test(text)
        );
    }

    if (
        containsForeignScript(
            text,
            expected.script
        )
    ) {
        return false;
    }

    const detected =
        detectLanguage(text);

    if (
        detected.script === "latin"
        && detected.confidence >= 0.68
        && expected.confidence >= 0.6
    ) {
        return detected.code === expected.code;
    }

    return true;
}


function templateFor(language) {
    return (
        LOCALIZED[
            language
            && language.code
            ? language.code
            : "en"
        ]
        || LOCALIZED.en
    );
}


function interpolate(
    template,
    values = {}
) {
    return String(template || "")
        .replace(
            /\{([a-zA-Z0-9_]+)\}/g,
            (match, key) => {
                return values[key] !== undefined
                    && values[key] !== null
                    && values[key] !== ""
                    ? String(values[key])
                    : "";
            }
        )
        .replace(/\s{2,}/g, " ")
        .replace(/\s+([,.!?。！？])/g, "$1")
        .trim();
}


function getLocalized(
    key,
    language,
    values = {}
) {
    const localized =
        templateFor(language);

    return interpolate(
        localized[key]
        || LOCALIZED.en[key]
        || "",
        values
    );
}


function getLanguageInstruction(language) {
    const value =
        language
        && language.name
        ? language
        : createLanguage("en");

    return (
        `${value.name} (${value.code}); `
        + `write every customer-facing field only in ${value.name}.`
    );
}


module.exports = {
    detectLanguage,
    detectConversationLanguage,
    isTextCompatible,
    getLocalized,
    getLanguageInstruction,
    createLanguage
};
