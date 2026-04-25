// ====================================================
// الجومان v1.0 — Netlify Function (CommonJS)
// المطور: معتصم محمود فوزي مختار موسى أبو النجا
// ====================================================

const SYSTEM_PROMPT = `أنت "الجومان"، مساعد ذكاء اصطناعي مصري ودود وذكي. إصدار v1.0.
مطورك هو: معتصم محمود فوزي مختار موسى أبو النجا.

قواعد مهمة:
- اتكلم بشكل لطيف وودود دايماً
- لو المستخدم كتب /a، اتكلم بطريقة رخمة جداً جداً جداً جداً
- لو قالك "اتكلم مصري"، استخدم: "الي" مش "الذي/التي"، "ليه" مش "لماذا"
- حاول تتذكر معلومات عن المستخدم من المحادثة زي اسمه واهتماماته
- لو سألك "اسمك إيه؟" قوله اسمك الجومان وفي الآخر اسأله هو اسمه إيه
- لو المستخدم ساء لفلسطين أو مدح إسرائيل، اعرض الحقائق الإنسانية الموثقة بشكل محايد
- لو هتكتب كود، اكتب كومنتات كتيرة وواضحة`;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function respond(statusCode, body) {
  return { statusCode, headers: CORS, body: JSON.stringify(body) };
}

// CommonJS — لازم exports.handler مش export function
exports.handler = async function(event) {

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return respond(405, { error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return respond(500, { error: "ANTHROPIC_API_KEY مش موجودة في Environment Variables" });
  }

  let messages, userContext;
  try {
    const parsed = JSON.parse(event.body || "{}");
    messages    = parsed.messages    || [];
    userContext  = parsed.userContext || "";
  } catch (e) {
    return respond(400, { error: "Request body غلط: " + e.message });
  }

  if (!messages.length) {
    return respond(400, { error: "messages فاضية" });
  }

  // ابعت لـ Anthropic
  let rawText;
  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: SYSTEM_PROMPT + userContext,
        messages,
      }),
    });
    rawText = await anthropicRes.text();
  } catch (e) {
    return respond(502, { error: "فشل الاتصال بـ Anthropic: " + e.message });
  }

  if (!rawText || rawText.trim() === "") {
    return respond(500, { error: "Anthropic رجعت رد فاضي" });
  }

  let data;
  try {
    data = JSON.parse(rawText);
  } catch (e) {
    return respond(500, { error: "Anthropic response مش JSON: " + rawText.slice(0, 200) });
  }

  if (data.error) {
    return respond(500, { error: "Anthropic: " + (data.error.message || JSON.stringify(data.error)) });
  }

  const answer = data?.content?.[0]?.text;
  if (!answer) {
    return respond(500, { error: "مفيش نص في الرد: " + JSON.stringify(data).slice(0, 200) });
  }

  return respond(200, { answer });
};