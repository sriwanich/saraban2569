const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

const route = `
// ==========================================
// AI URGENT INCIDENT SCAN ROUTE
// ==========================================
app.post('/api/ai/scan-urgent-incident', async (req, res) => {
  try {
    const { fileBase64, mimeType } = req.body;
    if (!fileBase64) {
      return res.status(400).json({ success: false, error: 'No file provided' });
    }

    let apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Try to get from settings table
      try {
        if (typeof pool !== 'undefined' && isMysqlOnline) {
          const [rows] = await pool.query('SELECT geminiApiKey FROM settings LIMIT 1');
          if (rows && rows.length > 0 && rows[0].geminiApiKey) {
            apiKey = rows[0].geminiApiKey.trim();
          }
        } else if (typeof localDb !== 'undefined' && localDb.settings && localDb.settings.length > 0) {
          apiKey = localDb.settings[0].geminiApiKey?.trim();
        }
      } catch (e) {
        // ignore
      }
    }

    if (!apiKey) {
      return res.status(500).json({ success: false, error: 'ไม่พบ Gemini API Key ในระบบ' });
    }

    const { GoogleGenAI } = require('@google/genai');
    const client = new GoogleGenAI({ apiKey });

    const prompt = \`คุณคือผู้ช่วยถอดความแบบรายงานเหตุด่วนสาธารณภัย (Urgent Incident Report)
ให้ดึงข้อมูลจากเอกสารรูปภาพ หรือ PDF ที่แนบมา แล้วส่งกลับมาเป็น JSON ตาม schema ดังนี้:
{
  "docNumber": "เลขที่หนังสือที่ สส ... (ถ้ามี)",
  "docDate": "วันที่หนังสือ (ถ้ามี)",
  "fromPerson": "จากใคร (ถ้ามี)",
  "toPerson": "ถึงใคร (ถ้ามี)",
  "incidentTypes": ["อุทกภัย", "วาตภัย", "อัคคีภัย", "ภัยแล้ง", "โรคระบาด"], // เลือกชนิดภัยที่ระบุในเอกสารเป็น array ของ string
  "incidentTypeOther": "ภัยอื่นๆ นอกเหนือจากตัวเลือก (ถ้ามี)",
  "severity": "เล็กน้อย" หรือ "ปานกลาง" หรือ "รุนแรง",
  "startDate": "วันที่เกิดภัย",
  "startTime": "เวลาที่เกิดภัย (HH:MM)",
  "endDate": "วันที่สิ้นสุดภัย",
  "endTime": "เวลาที่สิ้นสุดภัย (HH:MM)",
  "location": "สถานที่เกิดภัยแบบเต็ม",
  "affectedPeople": "จำนวนคนเดือดร้อน (ตัวเลข)",
  "affectedHouseholds": "จำนวนครัวเรือนที่เดือดร้อน (ตัวเลข)",
  "injured": "บาดเจ็บกี่คน (ตัวเลข)",
  "dead": "เสียชีวิตกี่คน (ตัวเลข)",
  "missing": "สูญหายกี่คน (ตัวเลข)",
  "evacuatedPeople": "อพยพกี่คน (ตัวเลข)",
  "evacuatedHouseholds": "อพยพกี่ครัวเรือน (ตัวเลข)",
  "damageHouses": "จำนวนบ้านพักเสียหาย (ตัวเลข)",
  "damageFactories": "จำนวนโรงงานเสียหาย (ตัวเลข)",
  "damageBuildingCost": "มูลค่าความเสียหายสิ่งก่อสร้าง (ตัวเลข)",
  "damageAgricultureCost": "มูลค่าความเสียหายเกษตร (ตัวเลข)",
  "damagePublicCost": "มูลค่าความเสียหายสาธารณะ (ตัวเลข)",
  "totalDamageCost": "รวมมูลค่าความเสียหายเบื้องต้น (ตัวเลข)",
  "mitigation": "การบรรเทาภัย (ข้อความ)",
  "reporterName": "ชื่อผู้รายงาน",
  "reporterPosition": "ตำแหน่งผู้รายงาน"
}
* หมายเหตุ: ดึงเฉพาะข้อมูลที่มีในเอกสารเท่านั้น ถ้าฟิลด์ไหนไม่มีให้เป็น string ว่าง "" หรือ array ว่าง []
* ห้ามตอบอย่างอื่นนอกจากโค้ด JSON (ห้ามมี markdown \`\`\`json)\`;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { text: prompt },
        { inlineData: { data: fileBase64.split(',')[1] || fileBase64, mimeType: mimeType || 'image/jpeg' } }
      ],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1
      }
    });

    let resultText = response.text || '{}';
    // Clean up if the model still wraps in markdown
    resultText = resultText.replace(/^\\s*\`\`\`json\\s*/i, '').replace(/\\s*\`\`\`\\s*$/i, '');
    
    const parsedData = JSON.parse(resultText);

    res.json({ success: true, data: parsedData });

  } catch (err) {
    console.error('Scan Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});
`;

content += route;
fs.writeFileSync('server.ts', content, 'utf8');
