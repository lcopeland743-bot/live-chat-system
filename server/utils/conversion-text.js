/**
 * Meridian Conversion Text Utilities
 *
 * Version:
 * v2.3.0
 */

function getGraphemes(value) {
    const text = String(value || "");

    if (
        typeof Intl !== "undefined"
        && typeof Intl.Segmenter === "function"
    ) {
        const segmenter = new Intl.Segmenter(
            undefined,
            { granularity: "grapheme" }
        );

        return Array.from(
            segmenter.segment(text),
            item => item.segment
        );
    }

    return Array.from(text);
}

function countCharacters(value) {
    return getGraphemes(value).length;
}

function containsCjk(value) {
    return /[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/u.test(
        String(value || "")
    );
}

function cleanReplyText(value) {
    return String(value || "")
        .replace(/```(?:json)?/gi, "")
        .replace(/cite[^]*/g, "")
        .replace(/【[^】]{0,200}】/g, "")
        .replace(
            /\[([^\]]{1,120})\]\(https?:\/\/[^)]+\)/g,
            "$1"
        )
        .replace(/https?:\/\/\S+/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function countQuestions(value) {
    const matches = String(value || "").match(/[?？]/g);
    return matches ? matches.length : 0;
}

function limitCharacters(value, limit) {
    const graphemes = getGraphemes(
        cleanReplyText(value)
    );

    if (graphemes.length <= limit) {
        return graphemes.join("");
    }

    const reserved = limit > 1 ? 1 : 0;
    const candidate = graphemes
        .slice(0, Math.max(1, limit - reserved))
        .join("");

    const minimumCut = Math.floor(limit * 0.62);
    let cutIndex = -1;

    for (
        let index = candidate.length - 1;
        index >= minimumCut;
        index -= 1
    ) {
        if (/[。！？.!?；;，,\s]/u.test(candidate[index])) {
            cutIndex = index;
            break;
        }
    }

    const shortened = (
        cutIndex >= minimumCut
        ? candidate.slice(0, cutIndex + 1)
        : candidate
    ).trim();

    return reserved ? `${shortened}…` : shortened;
}

function stripWhatsappLanguage(value) {
    const sentences = cleanReplyText(value)
        .split(/(?<=[。！？.!?])\s*/u)
        .filter(Boolean);

    const filtered = sentences.filter(sentence => {
        return !(
            /whats\s*app|wa\.me|私域|加我(?:们)?|进入\s*wa|点击.*(?:领取|查看)/iu
            .test(sentence)
        );
    });

    return filtered.join(" ").trim();
}

function safeInternalText(value, limit = 240) {
    return limitCharacters(
        String(value || "")
            .replace(/https?:\/\/\S+/g, "")
            .replace(/\s+/g, " ")
            .trim(),
        limit
    );
}

module.exports = {
    getGraphemes,
    countCharacters,
    containsCjk,
    cleanReplyText,
    countQuestions,
    limitCharacters,
    stripWhatsappLanguage,
    safeInternalText
};
