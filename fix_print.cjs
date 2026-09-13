const fs = require('fs');
let content = fs.readFileSync('src/components/views/disaster/UrgentIncidentReportView.tsx', 'utf8');

const printDocumentFn = `
  const printDocument = (report: UrgentIncident) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('กรุณาอนุญาต Pop-up เพื่อพิมพ์เอกสาร');
      return;
    }
    
    // Helper function to format dotted lines
    const fill = (text, length = 20) => {
      if (!text) return '<span class="dotted-line" style="min-width: ' + length + 'px;"></span>';
      return '<span class="filled-text">' + text + '</span>';
    };

    const html = \`
      <html>
        <head>
          <title>แบบรายงานเหตุด่วนสาธารณภัย</title>
          <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
          <style>
            @page { size: A4; margin: 20mm 15mm 20mm 20mm; }
            body { 
              font-family: 'Sarabun', sans-serif; 
              font-size: 16pt; 
              line-height: 1.4; 
              color: #000; 
              max-width: 210mm; 
              margin: 0 auto;
              padding: 20px;
            }
            * { box-sizing: border-box; }
            h1 { font-size: 20pt; font-weight: bold; text-align: center; margin: 15px 0 25px 0; }
            .urgent-stamp { color: red; font-size: 24pt; font-weight: bold; line-height: 1; margin-bottom: 15px; display: inline-block;}
            .flex-between { display: flex; justify-content: space-between; align-items: flex-end; }
            .flex-start { display: flex; justify-content: flex-start; align-items: flex-end; gap: 10px; flex-wrap: wrap; }
            .mb-2 { margin-bottom: 8px; }
            .mb-4 { margin-bottom: 16px; }
            .indent-1 { padding-left: 2.5em; }
            .indent-2 { padding-left: 5em; }
            
            .checkbox { 
              display: inline-block; 
              width: 14px; height: 14px; 
              border: 1px solid #000; 
              margin-right: 5px; 
              position: relative; 
              top: 2px; 
            }
            .checked::after { 
              content: '✓'; 
              position: absolute; 
              top: -8px; left: 1px; 
              font-size: 18px; 
              font-weight: bold; 
            }
            
            .dotted-line {
              display: inline-block;
              border-bottom: 1px dotted #000;
              height: 1.2em;
              min-width: 50px;
            }
            .filled-text {
              display: inline-block;
              border-bottom: 1px dotted #000;
              color: #000;
              padding: 0 5px;
            }
            
            .row { display: flex; flex-wrap: wrap; align-items: baseline; }
            .item { margin-right: 15px; white-space: nowrap; }
            .signature-box { margin-top: 50px; display: flex; flex-direction: column; align-items: flex-end; padding-right: 40px; }
            .text-center { text-align: center; }
          </style>
        </head>
        <body onload="window.print()">
          <div class="flex-between">
            <span class="urgent-stamp">ด่วนที่</span>
            <div class="text-center" style="margin-right: 20px;">
              <div>กรณี อำเภอ</div>
              <div>ครั้งที่ \${fill('', 40)} / ๒๕\${fill('', 40)}</div>
            </div>
          </div>
          
          <h1>แบบรายงานเหตุด่วนสาธารณภัย</h1>
          
          <div class="flex-between mb-2">
            <div>ที่ สส \${fill(report.docNumber, 150)}</div>
            <div>วันที่ \${fill(report.docDate, 200)}</div>
          </div>
          <div class="mb-2">จาก \${fill(report.fromPerson, 300)}</div>
          <div class="mb-4">ถึง \${fill(report.toPerson, 300)}</div>
          
          <div class="mb-2"><strong>๑. ชนิดของภัย</strong></div>
          <div class="indent-1 mb-2 row">
            \${INCIDENT_TYPES.map(t => \`<div class="item"><span class="checkbox \${report.incidentTypes.includes(t) ? 'checked' : ''}"></span> \${t}</div>\`).join('')}
            <div class="item"><span class="checkbox \${report.incidentTypes.includes('อื่นๆ') ? 'checked' : ''}"></span> อื่นๆ \${fill(report.incidentTypeOther, 150)}</div>
          </div>
          <div class="indent-1 mb-4 row">
            <span style="margin-right:15px;">ความรุนแรงและลักษณะของภัย</span>
            <div class="item"><span class="checkbox \${report.severity === 'เล็กน้อย' ? 'checked' : ''}"></span> เล็กน้อย</div>
            <div class="item"><span class="checkbox \${report.severity === 'ปานกลาง' ? 'checked' : ''}"></span> ปานกลาง</div>
            <div class="item"><span class="checkbox \${report.severity === 'รุนแรง' ? 'checked' : ''}"></span> รุนแรง</div>
          </div>

          <div class="mb-4">
            <strong>๒. วันเวลาที่เกิดภัย</strong><br>
            <div class="indent-1">
              เกิดวันที่ \${fill(report.startDate, 120)} เวลา \${fill(report.startTime, 60)} น. 
              สิ้นสุดวันที่ \${fill(report.endDate, 120)} เวลา \${fill(report.endTime, 60)} น.
            </div>
          </div>
          
          <div class="mb-4"><strong>๓. สถานที่เกิดภัย</strong> \${fill(report.location, 500)}</div>
          
          <div class="mb-2"><strong>๔. ราษฎรที่ประสบภัย</strong></div>
          <div class="indent-1 mb-4">
            <div class="row">
              <span class="item">๔.๑ ราษฎรที่ได้รับความเดือดร้อน \${fill(report.affectedPeople, 80)} คน</span>
              <span class="item">\${fill(report.affectedHouseholds, 80)} ครัวเรือน</span>
            </div>
            <div class="row">
              <span class="item">๔.๒ บาดเจ็บ \${fill(report.injured, 80)} คน</span>
              <span class="item">๔.๓ เสียชีวิต \${fill(report.dead, 80)} คน</span>
              <span class="item">๔.๔ สูญหาย \${fill(report.missing, 80)} คน</span>
            </div>
            <div class="row">
              <span class="item">๔.๕ อพยพที่ปลอดภัย \${fill(report.evacuatedPeople, 80)} คน</span>
              <span class="item">\${fill(report.evacuatedHouseholds, 80)} ครัวเรือน</span>
            </div>
          </div>

          <div class="mb-2"><strong>๕. พื้นที่ประสบภัยและความเสียหาย</strong></div>
          <div class="indent-1 mb-4">
            <div class="row">
              <span class="item">๕.๑ อาคารสิ่งก่อสร้าง / บ้านพักอาศัย \${fill(report.damageHouses, 60)} หลัง</span>
            </div>
            <div class="indent-1 row">
              <span class="item">อาคารโรงงาน \${fill(report.damageFactories, 60)} แห่ง</span>
              <span class="item">วัด \${fill(report.damageTemples, 60)} แห่ง</span>
              <span class="item">สถานที่ราชการ \${fill(report.damageGovBuildings, 60)} แห่ง</span>
            </div>
            <div class="indent-1 row">
              <span class="item">อื่นๆ \${fill(report.damageOtherBuildings, 100)}</span>
              <span class="item">ความเสียหายประมาณ \${fill(report.damageBuildingCost, 120)} บาท</span>
            </div>
            
            <div class="row" style="margin-top: 8px;">
              <span class="item">๕.๒ พื้นที่และทรัพย์สินทางการเกษตร พืชไร่ \${fill(report.damageAgricultureCrops, 60)} ไร่</span>
              <span class="item">นา \${fill(report.damageAgricultureRice, 60)} ไร่</span>
              <span class="item">สวน \${fill(report.damageAgricultureOrchard, 60)} ไร่</span>
            </div>
            <div class="indent-1 row">
              <span class="item">บ่อปลา \${fill(report.damageAgricultureFish, 60)} ไร่</span>
              <span class="item">บ่อกุ้ง \${fill(report.damageAgricultureShrimp, 60)} ไร่</span>
            </div>
            <div class="indent-1 row">
              <span class="item">สัตว์เลี้ยง (โค/กระบือ \${fill(report.damageLivestockCow, 60)} ตัว</span>
              <span class="item">สุกร \${fill(report.damageLivestockPig, 60)} ตัว</span>
              <span class="item">เป็ด/ไก่ \${fill(report.damageLivestockPoultry, 60)} ตัว)</span>
            </div>
            <div class="indent-1 row">
              <span class="item">อื่นๆ \${fill(report.damageLivestockOther, 100)}</span>
              <span class="item">ความเสียหายประมาณ \${fill(report.damageAgricultureCost, 120)} บาท</span>
            </div>

            <div class="row" style="margin-top: 8px;">
              <span class="item">๕.๓ สิ่งสาธารณประโยชน์ ถนน \${fill(report.damagePublicRoads, 60)} สาย</span>
              <span class="item">สะพาน \${fill(report.damagePublicBridges, 60)} แห่ง</span>
              <span class="item">คอสะพาน \${fill(report.damagePublicBridgeApproaches, 60)} แห่ง</span>
            </div>
            <div class="indent-1 row">
              <span class="item">ฝาย \${fill(report.damagePublicWeirs, 60)} แห่ง</span>
              <span class="item">อื่นๆ \${fill(report.damagePublicOther, 100)}</span>
              <span class="item">ความเสียหายประมาณ \${fill(report.damagePublicCost, 120)} บาท</span>
            </div>
            <div class="row" style="margin-top: 8px; font-weight: bold;">
              <span class="item">รวมความเสียหายเบื้องต้น \${fill(report.totalDamageCost, 150)} บาท</span>
            </div>
          </div>

          <div class="mb-4"><strong>๖. การบรรเทาภัย</strong> \${fill(report.mitigation, 500)}</div>
          
          <div class="mb-2"><strong>๗. เครื่องมือ/อุปกรณ์ที่ใช้</strong></div>
          <div class="indent-1 mb-4 row">
            <span class="item">รถดับเพลิง \${fill(report.toolsFireTrucks, 50)} คัน</span>
            <span class="item">รถบรรทุกน้ำ \${fill(report.toolsWaterTrucks, 50)} คัน</span>
            <span class="item">รถกู้ภัย \${fill(report.toolsRescueTrucks, 50)} คัน</span>
            <span class="item">เรือดับเพลิง \${fill(report.toolsFireBoats, 50)} ลำ</span>
            <span class="item">เครื่องสูบน้ำ \${fill(report.toolsWaterPumps, 50)} เครื่อง</span>
            <span class="item">อื่นๆ \${fill(report.toolsOther, 100)}</span>
          </div>
          <div class="indent-1 mb-4 row">
            <span class="item">๗.๑ ส่วนราชการ \${fill(report.opsGovAgencies, 80)} หน่วยงาน</span>
            <span class="item">๗.๒ เอกชน/ประชาชน \${fill(report.opsPrivateSector, 80)} กลุ่ม/คน</span>
          </div>

          <div class="mb-2"><strong>๘. การดำเนินงานของส่วนราชการ หน่วยอาสาสมัคร มูลนิธิในพื้นที่</strong></div>
          <div class="indent-1 mb-4">
            <div class="row"><span class="checkbox"></span> ส่วนราชการอื่นๆ\${fill('', 300)}</div>
            <div class="row"><span class="checkbox"></span> ภาคเอกชน\${fill('', 300)}</div>
          </div>

          <div class="mb-2"><strong>๙. ข้อเสนอ</strong></div>
          <div class="indent-1 mb-4">
            \${PROPOSALS.map(p => \`<div class="row"><span class="checkbox \${report.proposals.includes(p) ? 'checked' : ''}"></span> \${p}</div>\`).join('')}
          </div>

          <div class="signature-box">
            <div class="text-center">
              <div>(ลงชื่อ)\${fill('', 150)}ผู้รายงาน</div>
              <div style="margin-top: 5px;">(\${fill(report.reporterName, 180)})</div>
              <div style="margin-top: 5px;">\${fill(report.reporterPosition, 200)}</div>
            </div>
          </div>
        </body>
      </html>
    \`;
    printWindow.document.write(html);
    printWindow.document.close();
  };
`;

const startIndex = content.indexOf('const printDocument = (report: UrgentIncident) => {');
const endIndex = content.indexOf('};', startIndex) + 2;

if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + printDocumentFn + content.substring(endIndex);
  fs.writeFileSync('src/components/views/disaster/UrgentIncidentReportView.tsx', content, 'utf8');
}
