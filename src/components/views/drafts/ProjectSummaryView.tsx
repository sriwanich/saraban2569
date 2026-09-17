import React, { useState, useEffect } from 'react';
import { 
  BarChart3, Plus, Trash2, Eye, Save, Printer, FileDown, 
  Sparkles, RotateCcw, FileText, CheckCircle2, AlertCircle, 
  HelpCircle, ChevronRight, Users, FolderOpen, Edit3, Loader2
} from 'lucide-react';
import { thDate, downloadAsDoc, getLogoHTML } from './draftData';
import { useConfirm } from '../../../context/ConfirmContext';
import A4PaperPreview from '../../A4PaperPreview';

export interface ProjectSummaryItem {
  id?: number;
  name: string;
  year: string;
  type: string;
  owner: string;
  principal?: string;
  dateStart?: string;
  dateEnd?: string;
  venue?: string;
  budget?: string | number;
  budgetPlan?: string | number;
  target?: string;
  participants?: string | number;
  grade?: string;
  speaker?: string;
  objectives?: string;
  activities?: string;
  resultQty?: string;
  resultQl?: string;
  problems?: string;
  suggestions?: string;
  success?: string;
  satisfaction?: string;
  policy?: string;
  html?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

const PROJECT_TEMPLATES = [
  { group: '🚨 ป้องกันและระงับสาธารณภัย / อัคคีภัย / อุทกภัย (ปภ.)', items: [
    { id: 'fire_prevention', name: 'โครงการฝึกอบรมการป้องกันและระงับอัคคีภัยเบื้องต้น และฝึกซ้อมแผนเผชิญเหตุอัคคีภัยในสถานศึกษาและชุมชนเสี่ยง',
      type: 'การป้องกันและบรรเทาสาธารณภัย', target: 'นักเรียน ครู บุคลากร และประชาชนในชุมชนเสี่ยงภัย',
      obj: '๑. เพื่อให้ผู้เข้ารับการอบรมมีความรู้ ความเข้าใจ เรื่องการป้องกันและระงับอัคคีภัยเบื้องต้น\n๒. เพื่อซักซ้อมแผนเผชิญเหตุและการอพยพหนีไฟอย่างถูกต้อง ถูกวิธี และปลอดภัย\n๓. เพื่อลดความสูญเสียต่อชีวิตและทรัพย์สินอันเกิดจากอัคคีภัยในพื้นที่',
      act: '- บรรยายให้ความรู้ด้านทฤษฎีการเกิดไฟและชนิดของเพลิงไหม้\n- ฝึกปฏิบัติการใช้อุปกรณ์ดับเพลิงเบื้องต้น (ถังดับเพลิงเคมีแห้ง/สายฉีดน้ำ)\n- จำลองสถานการณ์อพยพหนีไฟและการปฐมพยาบาลเบื้องต้น\n- ประเมินผลการฝึกซ้อมและสรุปบทเรียน (After Action Review)',
      policy: 'แผนป้องกันและบรรเทาสาธารณภัยแห่งชาติ พ.ศ. ๒๕๖๔–๒๕๗๐ และแผนป้องกันและบรรเทาสาธารณภัยจังหวัด' },
    { id: 'flood_prevention', name: 'โครงการเตรียมความพร้อมรับมืออุทกภัย วาตภัย และดินโคลนถล่ม ประจำปีงบประมาณ',
      type: 'การป้องกันและบรรเทาสาธารณภัย', target: 'เจ้าหน้าที่ผู้ปฏิบัติงาน เครือข่ายจิตอาสา และประชาชนในพื้นที่เสี่ยงภัย',
      obj: '๑. เพื่อเตรียมความพร้อมของเครื่องจักรกล เครื่องมือ อุปกรณ์ และกำลังพลในการรับมืออุทกภัย\n๒. เพื่อสร้างความตระหนักและเตรียมความพร้อมให้กับชุมชนในพื้นที่เสี่ยงภัยอุทกภัยและดินโคลนถล่ม\n๓. เพื่อบูรณาการการทำงานร่วมกันระหว่างหน่วยงานภาคีเครือข่ายทุกภาคส่วนในจังหวัด',
      act: '- ตรวจสอบและเตรียมความพร้อมเครื่องจักรกลสาธารณภัยและเรือกู้ภัย\n- จัดทำและปรับปรุงระบบข้อมูลพื้นที่เสี่ยงภัย (Hazard Map) ระดับจังหวัด\n- อบรมเชิงปฏิบัติการให้ความรู้แก่ผู้นำชุมชนและเครือข่ายเตือนภัยหมู่บ้าน\n- จัดตั้งศูนย์บัญชาการเหตุการณ์จังหวัด (EOC) เพื่อติดตามสถานการณ์',
      policy: 'แผนป้องกันและบรรเทาสาธารณภัยจังหวัด และนโยบายกองอำนวยการป้องกันและบรรเทาสาธารณภัยแห่งชาติ' },
    { id: 'evacuation_drill', name: 'โครงการฝึกซ้อมแผนเผชิญเหตุและอพยพประชาชนกรณีภัยพิบัติร้ายแรง (สึนามิ/แผ่นดินไหว/ดินโคลนถล่ม)',
      type: 'การป้องกันและบรรเทาสาธารณภัย', target: 'ประชาชน ชุมชนเสี่ยงภัย และหน่วยงานกู้ภัยในพื้นที่',
      obj: '๑. เพื่อทดสอบระบบการแจ้งเตือนภัยและสัญญาณเตือนภัยพิบัติในระดับพื้นที่\n๒. เพื่อทดสอบขั้นตอนการปฏิบัติงานตามแผนเผชิญเหตุและการอพยพประชาชนไปยังศูนย์พักพิงชั่วคราว\n๓. เพื่อซักซ้อมความเข้าใจและการประสานการปฏิบัติระหว่าง ปภ. อำเภอ ท้องถิ่น และมูลนิธิกู้ภัย',
      act: '- สมมุติสถานการณ์การเกิดภัยพิบัติร้ายแรงในระดับเตือนภัยสูง\n- ทดสอบการส่งสัญญาณเตือนภัยและการกระจายข่าวสารผ่านเครือข่าย\n- อพยพประชาชนกลุ่มเป้าหมายรวมถึงกลุ่มเปราะบางไปยังศูนย์พักพิงชั่วคราว\n- สาธิตการจัดระบบศูนย์พักพิง การลงทะเบียน และการแจกจ่ายสิ่งของถุงยังชีพ',
      policy: 'แผนป้องกันและบรรเทาสาธารณภัยจังหวัด' },
    { id: 'drought_management', name: 'โครงการบริหารจัดการน้ำและเตรียมความพร้อมป้องกันและแก้ไขปัญหาภัยแล้งจังหวัด',
      type: 'การป้องกันและบรรเทาสาธารณภัย', target: 'ประชาชนในพื้นที่ประสบปัญหาขาดแคลนน้ำอุปโภคบริโภค',
      obj: '๑. เพื่อช่วยเหลือประชาชนที่ประสบปัญหาขาดแคลนน้ำอุปโภคบริโภคในช่วงฤดูกาลผันผวน\n๒. เพื่อสำรวจและวางแผนการจัดสรรทรัพยากรน้ำและรถแจกจ่ายน้ำอย่างทั่วถึง\n๓. เพื่อส่งเสริมการมีส่วนร่วมของชุมชนในการอนุรักษ์และบริหารจัดการแหล่งน้ำ',
      act: '- สำรวจพื้นที่ประเมินสภาวะขาดแคลนน้ำอุปโภคบริโภคระดับหมู่บ้าน\n- สนับสนุนรถบรรทุกน้ำและเครื่องสูบน้ำส่งไปยังจุดบริการประชาชน\n- ประสานงานชลประทานและองค์กรปกครองส่วนท้องถิ่นจัดหาแหล่งน้ำสำรอง\n- ประชาสัมพันธ์รณรงค์การใช้น้ำอย่างประหยัดและคุ้มค่า',
      policy: 'แผนบัญชาการป้องกันและแก้ไขปัญหาภัยแล้งจังหวัด' }
  ]},
  { group: '🚗 ป้องกันและลดอุบัติเหตุทางถนน (ศปถ.จ.)', items: [
    { id: 'road_safety_festival', name: 'โครงการป้องกันและลดอุบัติเหตุทางถนนช่วงเทศกาลปีใหม่และเทศกาลสงกรานต์ (ศปถ.จ.)',
      type: 'ความปลอดภัยทางถนน (ศปถ.จ.)', target: 'ผู้ใช้รถใช้ถนน ประชาชนทั่วไป และนักท่องเที่ยว',
      obj: '๑. เพื่อลดจำนวนครั้งการเกิดอุบัติเหตุ จำนวนผู้เสียชีวิต และผู้บาดเจ็บช่วงเทศกาลให้ได้ตามเป้าหมาย\n๒. เพื่อบูรณาการการตั้งจุดตรวจ/จุดบริการร่วม และด่านชุมชนเข้มแข็งในระดับพื้นที่\n๓. เพื่อสร้างกระแสการรับรู้และความตระหนักด้านความปลอดภัยทางถนนตลอดช่วงควบคุมเข้มข้น',
      act: '- จัดตั้งศูนย์ปฏิบัติการป้องกันและลดอุบัติเหตุทางถนนช่วงเทศกาลระดับจังหวัด\n- สนับสนุนและตรวจเยี่ยมจุดตรวจร่วม ด่านชุมชน และจุดบริการประชาชน\n- บังคับใช้กฎหมายอย่างเข้มงวด (ขับรถเร็ว ดื่มไม่ขับ ไม่สวมหมวกนิรภัย)\n- สรุปและรายงานผลการดำเนินงานประจำวันเสนอผู้บริหารจังหวัด',
      policy: 'แผนแม่บทความปลอดภัยทางถนน พ.ศ. ๒๕๖๕–๒๕๗๐ และศูนย์อำนวยการความปลอดภัยทางถนน (ศปถ.)' },
    { id: 'helmet_100', name: 'โครงการส่งเสริมมาตรการองค์กรและรณรงค์การสวมหมวกนิรภัย 100% ในหน่วยงานและสถานศึกษา',
      type: 'ความปลอดภัยทางถนน (ศปถ.จ.)', target: 'ข้าราชการ พนักงาน เจ้าหน้าที่ บุคลากร และนักเรียนนักศึกษา',
      obj: '๑. เพื่อกำหนดมาตรการองค์กรด้านความปลอดภัยทางถนนในหน่วยงานภาครัฐและสถานศึกษา\n๒. เพื่อรณรงค์และส่งเสริมพฤติกรรมการสวมหมวกนิรภัยขณะขับขี่และโดยสารรถจักรยานยนต์ ๑๐๐%\n๓. เพื่อลดความรุนแรงของการบาดเจ็บที่ศีรษะจากอุบัติเหตุรถจักรยานยนต์',
      act: '- ประกาศนโยบายมาตรการองค์กรหมวกนิรภัย ๑๐๐% ประจำหน่วยงาน\n- จัดกิจกรรมรณรงค์แจกหมวกนิรภัยและสาธิตการสวมอย่างถูกวิธี\n- สุ่มตรวจพฤติกรรมการสวมหมวกนิรภัยบริเวณทางเข้า-ออกสถานที่ราชการ\n- ประเมินและมอบเกียรติบัตรแก่หน่วยงาน/สถานศึกษาแบบอย่าง',
      policy: 'วาระจังหวัดด้านความปลอดภัยทางถนน และนโยบายกระทรวงมหาดไทย' },
    { id: 'blackspot_fix', name: 'โครงการสำรวจและแก้ไขจุดเสี่ยงอุบัติเหตุทางถนนเชิงรุกในระดับพื้นที่จังหวัด',
      type: 'ความปลอดภัยทางถนน (ศปถ.จ.)', target: 'จุดเสี่ยงจุดอันตรายบนสายทาง และผู้ใช้เส้นทางคมนาคม',
      obj: '๑. เพื่อสำรวจ ค้นหา และวิเคราะห์ปัจจัยเสี่ยงของการเกิดอุบัติเหตุทางถนนบนสายทางสำคัญ\n๒. เพื่อแก้ไขจุดเสี่ยงและปรับปรุงสิ่งอำนวยความปลอดภัย (ป้ายเตือน/สัญญาณไฟ/ตีเส้นจราจร)\n๓. เพื่อลดสถิติการเกิดอุบัติเหตุซ้ำซ้อนบริเวณจุดเสี่ยงอันตราย',
      act: '- ลงพื้นที่สำรวจจุดเสี่ยงอุบัติเหตุร่วมกับตำรวจ แขวงทางหลวง และท้องถิ่น\n- วิเคราะห์สาเหตุและจัดทำข้อเสนอแนะปรับปรุงกายภาพทางถนน\n- สนับสนุนการติดตั้งป้ายเตือน แผงกั้น สัญญาณไฟวับวาบ และกระจกโค้งจราจร\n- ติดตามประเมินสถิติการเกิดอุบัติเหตุหลังดำเนินการแก้ไข',
      policy: 'แผนป้องกันและลดอุบัติเหตุทางถนนจังหวัด' }
  ]},
  { group: '🧑‍🚒 ฝึกอบรมกำลังพล อปพร. และชุดกู้ภัย (ERT)', items: [
    { id: 'oppor_training', name: 'โครงการฝึกอบรมจัดตั้งและเพิ่มประสิทธิภาพอาสาสมัครป้องกันภัยฝ่ายพลเรือน (อปพร.)',
      type: 'การฝึกอบรมและพัฒนาศักยภาพกู้ภัย', target: 'สมาชิก อปพร. ทบทวนและจัดตั้งใหม่ ในสังกัด อปท. และจังหวัด',
      obj: '๑. เพื่อฝึกอบรมให้ความรู้ ระเบียบ กฎหมาย และทักษะการปฏิบัติงานสาธารณภัยแก่สมาชิก อปพร.\n๒. เพื่อเพิ่มศักยภาพกำลังพล อปพร. ให้สามารถช่วยเหลือเจ้าหน้าที่ในการป้องกันภัยได้อย่างมีประสิทธิภาพ\n๓. เพื่อสร้างความสามัคคีและเครือข่ายความร่วมมือ อปพร. ในระดับจังหวัด',
      act: '- ฝึกอบรมภาคทฤษฎีตามหลักสูตร อปพร. ของกรมป้องกันและบรรเทาสาธารณภัย\n- ฝึกภาคปฏิบัติการระงับอัคคีภัย การกู้ชีพเบื้องต้น การค้นหาและช่วยเหลือ\n- การฝึกระเบียบแถว ยุทธวิธีการตั้งจุดตรวจร่วมและการจราจร\n- ประเมินผลทดสอบภาคทฤษฎีและปฏิบัติ มอบเกียรติบัตรและบัตรประจำตัว อปพร.',
      policy: 'ระเบียบกระทรวงมหาดไทยว่าด้วยอาสาสมัครป้องกันภัยฝ่ายพลเรือน พ.ศ. ๒๕๕๓' },
    { id: 'ert_rescue', name: 'โครงการฝึกซ้อมชุดปฏิบัติการกู้ภัยฉุกเฉิน (ERT) และการช่วยเหลือผู้ประสบภัยทางน้ำ',
      type: 'การฝึกอบรมและพัฒนาศักยภาพกู้ภัย', target: 'ชุดปฏิบัติการกู้ภัยฉุกเฉิน (ERT) ปภ. และเจ้าหน้าที่กู้ภัยมูลนิธิ',
      obj: '๑. เพื่อพัฒนาทักษะการค้นหาและช่วยเหลือผู้ประสบภัยขั้นสูงให้แก่ชุด ERT และเครือข่ายกู้ภัย\n๒. เพื่อฝึกทบทวนการใช้อุปกรณ์กู้ภัยทางน้ำ เรือยาง เครื่องสูบน้ำ และชุดดำน้ำอย่างถูกวิธี\n๓. เพื่อสร้างมาตรฐานการปฏิบัติงานกู้ภัยที่เป็นเอกภาพและปลอดภัย',
      act: '- ทบทวนการใช้งานเครื่องมือกู้ภัยและเทคนิคการเข้าช่วยเหลือผู้ประสบภัย\n- ฝึกจำลองสถานการณ์กู้ภัยทางน้ำและการช่วยเหลือน้ำป่าไหลหลาก\n- ฝึกการปฐมพยาบาลเคลื่อนย้ายผู้บาดเจ็บทางน้ำอย่างปลอดภัย\n- ทบทวนระบบการสั่งการในภาวะฉุกเฉิน (ICS / Incident Command System)',
      policy: 'มาตรฐานการปฏิบัติงานกู้ภัย กรมป้องกันและบรรเทาสาธารณภัย (DDPM)' },
    { id: 'eoc_management', name: 'โครงการเพิ่มประสิทธิภาพการบริหารจัดการศูนย์บัญชาการเหตุการณ์จังหวัด (EOC)',
      type: 'การฝึกอบรมและพัฒนาศักยภาพกู้ภัย', target: 'คณะกรรมการศูนย์บัญชาการเหตุการณ์จังหวัด และเจ้าหน้าที่ ปภ.',
      obj: '๑. เพื่อเพิ่มประสิทธิภาพระบบการบริหารจัดการข้อมูลสาธารณภัยและการตัดสินใจในภาวะฉุกเฉิน\n๒. เพื่อทดสอบระบบการสื่อสารและเชื่อมโยงข้อมูลระหว่างศูนย์ EOC จังหวัดกับอำเภอและท้องถิ่น\n๓. เพื่อพัฒนาทักษะบุคลากรในการแถลงข่าวและการสื่อสารความเสี่ยงในภาวะวิกฤต',
      act: '- จัดอบรมการใช้งานระบบสารสนเทศและการรายงานสถานการณ์ภัย (GIS/Single Command Portal)\n- ฝึกซ้อมแผนบนโต๊ะ (Table Top Exercise - TTX) การบัญชาการเหตุการณ์กรณีภัยพิบัติใหญ่\n- ทดสอบข่ายวิทยุสื่อสารและระบบประชุมทางไกล (VDO Conference)\n- ทบทวน SOP และแต่งตั้งคณะทำงาน EOC ให้เป็นปัจจุบัน',
      policy: 'แผนป้องกันและบรรเทาสาธารณภัยแห่งชาติ และคู่มือการจัดตั้งศูนย์ EOC' }
  ]},
  { group: '📢 แผนงาน พรบ. และระบบเตือนภัย', items: [
    { id: 'provincial_disaster_plan', name: 'โครงการจัดทำและทบทวนแผนป้องกันและบรรเทาสาธารณภัยจังหวัด พ.ศ. ๒๕๖๖–๒๕๗โ',
      type: 'การจัดทำแผนและระบบเตือนภัย', target: 'คณะกรรมการป้องกันและบรรเทาสาธารณภัยจังหวัด และหน่วยงานภาคี',
      obj: '๑. เพื่อจัดทำและปรับปรุงแผนป้องกันและบรรเทาสาธารณภัยจังหวัดให้สอดคล้องกับสภาวะภัยปัจจุบัน\n๒. เพื่อกำหนดบทบาท หน้าที่ และขั้นตอนการปฏิบัติงานของหน่วยงานต่างๆ ให้ชัดเจน\n๓. เพื่อให้จังหวัดมีแผนยุทธศาสตร์สาธารณภัยที่ครอบคลุมทุกมิติ (ก่อนเกิดภัย - ขณะเกิดภัย - หลังเกิดภัย)',
      act: '- รวบรวมข้อมูลสถิติสาธารณภัย และวิเคราะห์ความเสี่ยงภัยประจำจังหวัด\n- จัดประชุมเชิงปฏิบัติการร่วมกับหน่วยงานทหาร ตำรวจ ท้องถิ่น และภาคประชาชน\n- ยกร่างแผนป้องกันและบรรเทาสาธารณภัยจังหวัดเสนอคณะกรรมการอนุมัติ\n- จัดพิมพ์และจัดส่งแผนฯ ให้หน่วยงานที่เกี่ยวข้องใช้เป็นแนวทางปฏิบัติ',
      policy: 'พระราชบัญญัติป้องกันและบรรเทาสาธารณภัย พ.ศ. ๒๕๕๐ มาตรา ๑๕' },
    { id: 'warning_system', name: 'โครงการพัฒนาระบบการแจ้งเตือนภัยและเครือข่ายการสื่อสารกู้ภัยสำรองประจำจังหวัด',
      type: 'การจัดทำแผนและระบบเตือนภัย', target: 'ศูนย์เตือนภัยจังหวัด หอเตือนภัยชุมชน และข่ายวิทยุสื่อสาร',
      obj: '๑. เพื่อพัฒนาระบบการกระจายสัญญาณเตือนภัยให้มีความพร้อมใช้งานตลอด ๒๔ ชั่วโมง\n๒. เพื่อจัดตั้งและฟื้นฟูข่ายวิทยุสื่อสารสำรองกรณีระบบสื่อสารหลักขัดข้องจากภัยพิบัติ\n๓. เพื่อให้ประชาชนในพื้นที่เสี่ยงภัยได้รับข่าวสารเตือนภัยได้อย่างรวดเร็วและแม่นยำ',
      act: '- ตรวจสอบและบำรุงรักษาหอเตือนภัย หอขยายข่าว และแม่ข่ายวิทยุสื่อสารประจำจังหวัด\n- จัดอบรมการใช้งานวิทยุสังเคราะห์ความถี่และนามเรียกขานแก่เครือข่ายเฝ้าระวังภัย\n- ทดสอบการส่งข้อความเตือนภัยและระบบหอเตือนภัยประจำเดือน\n- ประสานงานศูนย์เตือนภัยพิบัติแห่งชาติ (ศพภ.) ในการเชื่อมโยงสัญญาณ',
      policy: 'ระเบียบสำนักนายกรัฐมนตรีว่าด้วยการบริหารระบบการเตือนภัยพิบัติแห่งชาติ' }
  ]},
  { group: '🏫 ชุมชนและโรงเรียนปลอดภัยจากภัยพิบัติ (Safe School / CBDRM)', items: [
    { id: 'cbdrm_community', name: 'โครงการเสริมสร้างศักยภาพชุมชนด้านการจัดการภัยพิบัติโดยอาศัยชุมชนเป็นฐาน (CBDRM)',
      type: 'การเสริมสร้างความตระหนักรู้และชุมชนปลอดภัย', target: 'ผู้นำชุมชน อาสาสมัคร และประชาชนในหมู่บ้านเสี่ยงภัยสูง',
      obj: '๑. เพื่อส่งเสริมให้ชุมชนมีความรู้และสามารถบริหารจัดการภัยพิบัติได้ด้วยตนเองในเบื้องต้น\n๒. เพื่อจัดทำแผนผังชุมชนเสี่ยงภัยและแผนเผชิญเหตุระดับหมู่บ้าน/ชุมชน\n๓. เพื่อจัดตั้งทีมกู้ชีพกู้ภัยประจำหมู่บ้าน (VMR Team) สำหรับช่วยเหลือเพื่อนบ้าน',
      act: '- จัดกระบวนการเรียนรู้ CBDRM ๕ ขั้นตอน ร่วมกับวิทยากร ปภ.\n- สำรวจและจัดทำแผนที่กักกันความเสี่ยง จุดปลอดภัย และเส้นทางอพยพประจำชุมชน\n- ซ้อมแผนเผชิญเหตุระดับหมู่บ้านอย่างน้อยปีละ ๑ ครั้ง\n- สนับสนุนอุปกรณ์กู้ภัยเบื้องต้นประจำชุมชน (เสื้อชูชีพ/เชือก/นกหวีด/ไฟฉาย)',
      policy: 'นโยบายการจัดการภัยพิบัติโดยอาศัยชุมชนเป็นฐาน กรมป้องกันและบรรเทาสาธารณภัย' },
    { id: 'safe_school_pdp', name: 'โครงการสร้างภูมิคุ้มกันและส่งเสริมความปลอดภัยจากภัยพิบัติในสถานศึกษา (Safe School)',
      type: 'การเสริมสร้างความตระหนักรู้และชุมชนปลอดภัย', target: 'นักเรียน ครู และบุคลากรในโรงเรียนสังกัด สพฐ. และ อปท.',
      obj: '๑. เพื่อสร้างความตระหนักและทักษะการเอาชีวิตรอดจากภัยพิบัติใกล้ตัวให้แก่เด็กและเยาวชน\n๒. เพื่อสนับสนุนให้โรงเรียนจัดทำแผนความปลอดภัยในสถานศึกษาและแผนอพยพ\n๓. เพื่อปรับปรุงสภาพแวดล้อมและจุดเสี่ยงอันตรายภายในโรงเรียนให้มีความปลอดภัย',
      act: '- จัดฐานเรียนรู้ความปลอดภัย ๔ ฐาน (อัคคีภัย/การจมน้ำ/แผ่นดินไหว/อุบัติเหตุทางถนน)\n- สอนทักษะ "หมอบ ปลอดภัย ยึดไว้" (Drop, Cover, Hold on) เมื่อเกิดแผ่นดินไหว\n- ฝึกการสังเกตจุดเสี่ยงในโรงเรียนและแนวทางแก้ไขร่วมกัน\n- จัดทำแผนผังทางหนีไฟและซ้อมอพยพประจำสถานศึกษา',
      policy: 'กรอบการดำเนินงานโรงเรียนปลอดภัย (Safety in Schools Framework) กรม ปภ.' }
  ]}
];

interface Props {
  user: any;
}

export default function ProjectSummaryView({ user }: Props) {
  const { confirm } = useConfirm();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form states
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [name, setName] = useState('');
  const [year, setYear] = useState((new Date().getFullYear() + 543).toString());
  const [type, setType] = useState('การป้องกันและบรรเทาสาธารณภัย');
  const [owner, setOwner] = useState(user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'ณัฐพันธุ์ ศรีวนิช');
  const [principal, setPrincipal] = useState('หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง');
  const [dateStart, setDateStart] = useState(new Date().toISOString().split('T')[0]);
  const [dateEnd, setDateEnd] = useState(new Date().toISOString().split('T')[0]);
  const [venue, setVenue] = useState(user?.department || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัด');
  const [budget, setBudget] = useState('0');
  const [budgetPlan, setBudgetPlan] = useState('0');
  const [target, setTarget] = useState('ประชาชนในพื้นที่เสี่ยงภัยและเครือข่าย ปภ.');
  const [participants, setParticipants] = useState('100');
  const [grade, setGrade] = useState('');
  const [speaker, setSpeaker] = useState('วิทยากรผู้เชี่ยวชาญจากสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัด / กรม ปภ.');
  const [objectives, setObjectives] = useState('');
  const [activities, setActivities] = useState('');
  const [resultQty, setResultQty] = useState('');
  const [resultQl, setResultQl] = useState('');
  const [problems, setProblems] = useState('ไม่มีปัญหาอุปสรรคสำคัญ การดำเนินงานเป็นไปด้วยความเรียบร้อย');
  const [suggestions, setSuggestions] = useState('ควรจัดโครงการฝึกอบรมทบทวนอย่างต่อเนื่องเป็นประจำทุกปีงบประมาณ');
  const [success, setSuccess] = useState('สูงมาก (90-100%)');
  const [satisfaction, setSatisfaction] = useState('4.88 / 5.00 (97.6%)');
  const [policy, setPolicy] = useState('แผนป้องกันและบรรเทาสาธารณภัยแห่งชาติ / จังหวัด');

  // Generated Result & Saved List
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [savedSummaries, setSavedSummaries] = useState<ProjectSummaryItem[]>([]);

  // Searching & Filtering States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterYear, setFilterYear] = useState('');

  // Fetch summaries on mount
  useEffect(() => {
    fetchSummaries();
  }, []);

  const fetchSummaries = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/project-summaries');
      if (res.ok) {
        const data = await res.json();
        setSavedSummaries(data);
      } else {
        const local = localStorage.getItem('moi_summaries');
        if (local) setSavedSummaries(JSON.parse(local));
      }
    } catch (err) {
      const local = localStorage.getItem('moi_summaries');
      if (local) setSavedSummaries(JSON.parse(local));
    } finally {
      setLoading(false);
    }
  };

  const handleApplyTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    if (!templateId) return;

    let foundItem: any = null;
    PROJECT_TEMPLATES.forEach(g => {
      g.items.forEach(item => {
        if (item.id === templateId) foundItem = item;
      });
    });

    if (foundItem) {
      setName(foundItem.name);
      setType(foundItem.type);
      setTarget(foundItem.target);
      setObjectives(foundItem.obj || '');
      setActivities(foundItem.act || '');
      setPolicy(foundItem.policy || 'แผนปฏิบัติราชการประจำปี');
      setResultQty(`- มีผู้เข้าร่วมโครงการทั้งสิ้น ${participants} คน คิดเป็นร้อยละ ๑๐๐ ของเป้าหมาย\n- ดำเนินการเสร็จสิ้นตามกรอบระยะเวลาที่กำหนด`);
      setResultQl(`- ประชาชนและผู้เข้าร่วมมีความรู้ ความเข้าใจ และได้รับประโยชน์สูงสุด\n- การดำเนินงานเป็นไปด้วยความเรียบร้อยและมีประสิทธิภาพ`);
    }
  };

  const handleClearForm = () => {
    setEditingId(null);
    setSelectedTemplate('');
    setName('');
    setYear((new Date().getFullYear() + 543).toString());
    setType('การป้องกันและบรรเทาสาธารณภัย');
    setOwner(user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'ณัฐพันธุ์ ศรีวนิช');
    setPrincipal('หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง');
    setDateStart(new Date().toISOString().split('T')[0]);
    setDateEnd(new Date().toISOString().split('T')[0]);
    setVenue(user?.department || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัด');
    setBudget('0');
    setBudgetPlan('0');
    setTarget('ประชาชนในพื้นที่เสี่ยงภัยและเครือข่าย ปภ.');
    setParticipants('100');
    setGrade('');
    setSpeaker('วิทยากรผู้เชี่ยวชาญจากสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัด / กรม ปภ.');
    setObjectives('');
    setActivities('');
    setResultQty('');
    setResultQl('');
    setProblems('ไม่มีปัญหาอุปสรรคสำคัญ การดำเนินงานเป็นไปด้วยความเรียบร้อย');
    setSuggestions('ควรจัดโครงการฝึกอบรมทบทวนอย่างต่อเนื่องเป็นประจำทุกปีงบประมาณ');
    setSuccess('สูงมาก (90-100%)');
    setSatisfaction('4.88 / 5.00 (97.6%)');
    setPolicy('แผนป้องกันและบรรเทาสาธารณภัยแห่งชาติ / จังหวัด');
    setGeneratedHtml(null);
  };

  const getFormDataObj = () => {
    const org = user?.department || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัด';
    return {
      school: org,
      principal: principal || 'หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง',
      name, year, type, owner: owner || 'ณัฐพันธุ์ ศรีวนิช',
      dateStart: thDate(dateStart),
      dateEnd: thDate(dateEnd),
      venue: venue || org,
      budget: budget || '0',
      budgetPlan: budgetPlan || '0',
      target, participants: participants || '0', grade, speaker,
      objectives, activities, resultQty, resultQl, problems, suggestions,
      success, satisfaction, policy
    };
  };

  const buildManualSummaryHtml = () => {
    if (!name) return '';
    const d = getFormDataObj();
    const budgetNum = Number(String(d.budget || 0).replace(/,/g, '')) || 0;
    const budgetPlanNum = Number(String(d.budgetPlan || 0).replace(/,/g, '')) || 0;
    const budgetRemain = (budgetPlanNum - budgetNum).toLocaleString();

    const objLines = d.objectives
      ? d.objectives.split('\n').filter(x => x.trim()).map(l => `<p style="text-indent:3em; margin-bottom:4px;">${l.trim().startsWith('เพื่อ') || l.trim().match(/^\d/) ? l.trim() : 'เพื่อ' + l.trim()}</p>`).join('')
      : '<p style="text-indent:3em;">เพื่อการป้องกันและบรรเทาสาธารณภัย เสริมสร้างความปลอดภัยให้แก่ประชาชน</p>';

    const actLines = d.activities
      ? d.activities.split('\n').filter(x => x.trim()).map(l => `<li style="margin-bottom:4px;">${l.replace(/^-\s*/, '')}</li>`).join('')
      : '<li>จัดกิจกรรมและฝึกอบรมตามแผนงานโครงการ</li>';

    const rqLines = d.resultQty
      ? d.resultQty.split('\n').filter(x => x.trim()).map(l => `<li>${l.replace(/^-\s*/, '')}</li>`).join('')
      : '<li>ผู้เข้าร่วมโครงการครบตามจำนวนเป้าหมายที่กำหนด</li>';

    const rlLines = d.resultQl
      ? d.resultQl.split('\n').filter(x => x.trim()).map(l => `<li>${l.replace(/^-\s*/, '')}</li>`).join('')
      : '<li>ผู้เข้าร่วมมีความรู้ ความเข้าใจ ทักษะ และความพร้อมในการปฏิบัติงานและเผชิญเหตุอย่างมีประสิทธิภาพ</li>';

    const sugLines = d.suggestions
      ? d.suggestions.split('\n').filter(x => x.trim()).map(l => `<li>${l.replace(/^-\s*/, '')}</li>`).join('')
      : '<li>ควรจัดโครงการฝึกอบรมและทบทวนทักษะอย่างต่อเนื่องในปีงบประมาณถัดไป</li>';

    return `
<div style="font-family:'TH SarabunPSK','Sarabun',sans-serif; font-size:16pt; line-height:1.5; color:#1e293b; max-width:800px; margin:0 auto; padding:20px;">
  <!-- HEADER -->
  <div style="text-align:center; border-bottom:3px solid #0f1f44; padding-bottom:12px; margin-bottom:16px;">
    <div style="font-size:14pt; color:#475569; font-weight:600;">${d.school}</div>
    <div style="font-size:18pt; font-weight:bold; color:#0f1f44; margin-top:2px;">รายงานสรุปผลการดำเนินโครงการ</div>
    <div style="font-size:16pt; font-weight:bold; color:#1d4ed8; margin-top:2px;">"${d.name}"</div>
    <div style="font-size:14pt; color:#475569;">ประจำปีงบประมาณ พ.ศ. ${d.year}</div>
  </div>

  <!-- ข้อมูลพื้นฐาน -->
  <p style="font-size:15pt; font-weight:bold; color:#0f1f44; border-left:4px solid #1d4ed8; padding-left:8px; margin-bottom:8px;">๑. ข้อมูลพื้นฐานโครงการ</p>
  <table style="width:100%; border-collapse:collapse; margin-bottom:16px; font-size:14pt;">
    <tr><td style="padding:6px 10px; border:1px solid #cbd5e1; background:#f8fafc; font-weight:bold; width:35%;">ชื่อโครงการ</td><td style="padding:6px 10px; border:1px solid #cbd5e1; font-weight:bold; color:#0f1f44;">${d.name}</td></tr>
    <tr><td style="padding:6px 10px; border:1px solid #cbd5e1; background:#f8fafc; font-weight:bold;">ประเภทโครงการ</td><td style="padding:6px 10px; border:1px solid #cbd5e1;">${d.type}</td></tr>
    <tr><td style="padding:6px 10px; border:1px solid #cbd5e1; background:#f8fafc; font-weight:bold;">ผู้รับผิดชอบโครงการ</td><td style="padding:6px 10px; border:1px solid #cbd5e1;">${d.owner}</td></tr>
    <tr><td style="padding:6px 10px; border:1px solid #cbd5e1; background:#f8fafc; font-weight:bold;">ระยะเวลาดำเนินการ</td><td style="padding:6px 10px; border:1px solid #cbd5e1;">${d.dateStart} ถึง ${d.dateEnd}</td></tr>
    <tr><td style="padding:6px 10px; border:1px solid #cbd5e1; background:#f8fafc; font-weight:bold;">สถานที่ดำเนินการ</td><td style="padding:6px 10px; border:1px solid #cbd5e1;">${d.venue}</td></tr>
    <tr><td style="padding:6px 10px; border:1px solid #cbd5e1; background:#f8fafc; font-weight:bold;">กลุ่มเป้าหมาย</td><td style="padding:6px 10px; border:1px solid #cbd5e1;">${d.target} ${d.grade ? '(' + d.grade + ')' : ''}</td></tr>
    <tr><td style="padding:6px 10px; border:1px solid #cbd5e1; background:#f8fafc; font-weight:bold;">จำนวนผู้เข้าร่วม</td><td style="padding:6px 10px; border:1px solid #cbd5e1; font-weight:bold; color:#16a34a;">${Number(String(d.participants || 0).replace(/,/g, '')).toLocaleString()} คน</td></tr>
    <tr><td style="padding:6px 10px; border:1px solid #cbd5e1; background:#f8fafc; font-weight:bold;">วิทยากร / ผู้สนับสนุน</td><td style="padding:6px 10px; border:1px solid #cbd5e1;">${d.speaker}</td></tr>
    <tr><td style="padding:6px 10px; border:1px solid #cbd5e1; background:#f8fafc; font-weight:bold;">งบประมาณอนุมัติ</td><td style="padding:6px 10px; border:1px solid #cbd5e1;">${budgetPlanNum.toLocaleString()} บาท</td></tr>
    <tr><td style="padding:6px 10px; border:1px solid #cbd5e1; background:#f8fafc; font-weight:bold;">งบประมาณใช้จริง</td><td style="padding:6px 10px; border:1px solid #cbd5e1;">${budgetNum.toLocaleString()} บาท <span style="color:#64748b; font-size:12pt;">(คงเหลือ ${budgetRemain} บาท)</span></td></tr>
    <tr><td style="padding:6px 10px; border:1px solid #cbd5e1; background:#f8fafc; font-weight:bold;">สอดคล้องกับนโยบาย/แผน</td><td style="padding:6px 10px; border:1px solid #cbd5e1;">${d.policy}</td></tr>
  </table>

  <!-- วัตถุประสงค์ -->
  <p style="font-size:15pt; font-weight:bold; color:#0f1f44; border-left:4px solid #1d4ed8; padding-left:8px; margin-bottom:8px;">๒. วัตถุประสงค์ของโครงการ</p>
  <div style="margin-bottom:16px;">${objLines}</div>

  <!-- กิจกรรม -->
  <p style="font-size:15pt; font-weight:bold; color:#0f1f44; border-left:4px solid #1d4ed8; padding-left:8px; margin-bottom:8px;">๓. กิจกรรมที่ดำเนินการ</p>
  <ol style="margin-bottom:16px; padding-left:28px; line-height:1.6;">${actLines}</ol>

  <!-- ผลการดำเนินงาน -->
  <p style="font-size:15pt; font-weight:bold; color:#0f1f44; border-left:4px solid #16a34a; padding-left:8px; margin-bottom:8px;">๔. ผลการดำเนินงาน</p>
  <p style="font-weight:bold; color:#0f1f44; margin-bottom:4px;">๔.๑ เชิงปริมาณ</p>
  <ul style="padding-left:28px; line-height:1.6; margin-bottom:8px;">${rqLines}</ul>
  <p style="font-weight:bold; color:#0f1f44; margin-bottom:4px;">๔.๒ เชิงคุณภาพ</p>
  <ul style="padding-left:28px; line-height:1.6; margin-bottom:12px;">${rlLines}</ul>

  <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:12px; margin-bottom:16px;">
    <table style="width:100%; font-size:14pt;">
      <tr>
        <td style="padding:4px 8px; font-weight:bold;">ระดับความสำเร็จ:</td>
        <td style="padding:4px 8px; font-weight:bold; color:#16a34a;">${d.success}</td>
        <td style="padding:4px 8px; font-weight:bold;">ความพึงพอใจเฉลี่ย:</td>
        <td style="padding:4px 8px; font-weight:bold; color:#1d4ed8;">${d.satisfaction || '-'}</td>
      </tr>
    </table>
  </div>

  <!-- ปัญหา/ข้อเสนอแนะ -->
  <p style="font-size:15pt; font-weight:bold; color:#0f1f44; border-left:4px solid #d97706; padding-left:8px; margin-bottom:8px;">๕. ปัญหา อุปสรรค และข้อเสนอแนะ</p>
  <p style="margin-bottom:4px; font-weight:bold;">ปัญหา / อุปสรรค:</p>
  <p style="text-indent:3em; margin-bottom:8px;">${d.problems || 'ไม่มี'}</p>
  <p style="margin-bottom:4px; font-weight:bold;">ข้อเสนอแนะ / แนวทางพัฒนา:</p>
  <ul style="padding-left:28px; line-height:1.6; margin-bottom:16px;">${sugLines}</ul>

  <!-- สรุป -->
  <p style="font-size:15pt; font-weight:bold; color:#0f1f44; border-left:4px solid #7c3aed; padding-left:8px; margin-bottom:8px;">๖. สรุปผลโดยรวม</p>
  <p style="text-indent:3em; margin-bottom:24px;">
    โครงการ "${d.name}" ประจำปีงบประมาณ พ.ศ. ${d.year} ได้ดำเนินการเสร็จสิ้นเรียบร้อยแล้ว
    มีผู้เข้าร่วมโครงการทั้งสิ้น ${Number(String(d.participants || 0).replace(/,/g, '')).toLocaleString()} คน
    ระดับความสำเร็จโดยรวมอยู่ในระดับ <strong>${d.success}</strong>
    ${d.satisfaction ? 'ระดับความพึงพอใจเฉลี่ย <strong>' + d.satisfaction + '</strong>' : ''}
    โครงการสามารถบรรลุเป้าหมายและเกิดประโยชน์ตามวัตถุประสงค์ทุกประการ
  </p>

  <!-- SIGNATURES -->
  <table width="100%" cellpadding="0" cellspacing="0" style="border:none; margin-top:36px;">
    <tr>
      <td width="50%" style="border:none; text-align:center; vertical-align:bottom; padding-right:16px;">
        <div style="font-size:13pt; color:#475569; margin-bottom:4px;">(ลงชื่อ) .......................................................</div>
        <div style="font-size:14pt; font-weight:bold; margin-top:4px;">(${d.owner || '...................................'})</div>
        <div style="font-size:13pt; color:#475569;">ผู้รับผิดชอบโครงการ</div>
        <div style="font-size:12pt; color:#94a3b8; margin-top:2px;">วันที่ ......./......./.......</div>
      </td>
      <td width="50%" style="border:none; text-align:center; vertical-align:bottom; padding-left:16px;">
        <div style="font-size:13pt; color:#475569; margin-bottom:4px;">(ลงชื่อ) .......................................................</div>
        <div style="font-size:14pt; font-weight:bold; margin-top:4px;">(${d.principal || '...................................'})</div>
        <div style="font-size:13pt; color:#475569;">ผู้บังคับบัญชา / ผู้รับทราบ</div>
        <div style="font-size:12pt; color:#94a3b8; margin-top:2px;">วันที่ ......./......./.......</div>
      </td>
    </tr>
  </table>
</div>
    `;
  };

  const generateManualSummary = () => {
    if (!name) {
      alert('กรุณากรอกชื่อโครงการก่อน');
      return;
    }
    const html = buildManualSummaryHtml();
    setGeneratedHtml(html);
  };

  const generateAiSummary = async () => {
    if (!name) {
      alert('กรุณากรอกชื่อโครงการก่อน');
      return;
    }
    setIsAiGenerating(true);
    const formData = getFormDataObj();

    try {
      const res = await fetch('/api/ai/summarize-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const result = await res.json();
      if (res.ok && result.success && result.html) {
        setGeneratedHtml(result.html);
      } else {
        alert(result.error || 'ไม่สามารถประมวลผล AI ได้ จะสร้างสรุปรูปแบบมาตรฐานให้แทน');
        generateManualSummary();
      }
    } catch (err: any) {
      console.warn('AI summarize request error:', err);
      generateManualSummary();
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleSaveSummary = async () => {
    if (!name) {
      alert('กรุณากรอกชื่อโครงการ');
      return;
    }

    const confirmed = await confirm({
      title: editingId ? 'ยืนยันการบันทึกแก้ไขสรุปโครงการ' : 'ยืนยันการบันทึกสรุปโครงการใหม่',
      message: `คุณต้องการบันทึกรายงานสรุปโครงการ "${name}" ใช่หรือไม่?`,
      type: editingId ? 'edit' : 'info',
      confirmText: 'ยืนยันการบันทึก',
      cancelText: 'ยกเลิก'
    });
    if (!confirmed) return;

    let htmlToSave = generatedHtml;
    if (!htmlToSave) {
      htmlToSave = buildManualSummaryHtml();
      setGeneratedHtml(htmlToSave);
    }

    const payload = {
      name, year, type, owner, principal, dateStart, dateEnd, venue, budget, budgetPlan,
      target, participants, grade, speaker, objectives, activities, resultQty,
      resultQl, problems, suggestions, success, satisfaction, policy,
      html: htmlToSave,
      createdBy: user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'ผู้ใช้งาน'
    };

    try {
      if (editingId) {
        const res = await fetch(`/api/project-summaries/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('API Save Failed');
        alert('แก้ไขสรุปโครงการเรียบร้อยแล้ว');
      } else {
        const res = await fetch('/api/project-summaries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('API Save Failed');
        alert('บันทึกสรุปโครงการเรียบร้อยแล้ว');
      }
      await fetchSummaries();
      setShowForm(false);
      handleClearForm();
    } catch (err: any) {
      console.warn('API Save failed, falling back to Local Storage:', err);
      const item: ProjectSummaryItem = {
        id: editingId || Date.now(),
        ...payload,
        createdAt: new Date().toISOString()
      };
      let list = [...savedSummaries];
      if (editingId) {
        list = list.map(x => x.id === editingId ? item : x);
      } else {
        list.unshift(item);
      }
      setSavedSummaries(list);
      localStorage.setItem('moi_summaries', JSON.stringify(list));
      alert('บันทึกข้อมูลเรียบร้อยแล้ว');
      setShowForm(false);
      handleClearForm();
    }
  };

  const handleEditSaved = (item: ProjectSummaryItem) => {
    setEditingId(item.id || null);
    setName(item.name || '');
    setYear(item.year || (new Date().getFullYear() + 543).toString());
    setType(item.type || 'วิชาการ');
    setOwner(item.owner || 'ณัฐพันธุ์ ศรีวนิช');
    setPrincipal(item.principal || 'หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง');
    setDateStart(item.dateStart || '');
    setDateEnd(item.dateEnd || '');
    setVenue(item.venue || '');
    setBudget(String(item.budget || '0'));
    setBudgetPlan(String(item.budgetPlan || '0'));
    setTarget(item.target || 'ประชาชน');
    setParticipants(String(item.participants || '100'));
    setGrade(item.grade || '');
    setSpeaker(item.speaker || '');
    setObjectives(item.objectives || '');
    setActivities(item.activities || '');
    setResultQty(item.resultQty || '');
    setResultQl(item.resultQl || '');
    setProblems(item.problems || 'ไม่มี');
    setSuggestions(item.suggestions || '');
    setSuccess(item.success || 'สูงมาก (90-100%)');
    setSatisfaction(item.satisfaction || '');
    setPolicy(item.policy || '');
    setGeneratedHtml(item.html || null);
    setShowForm(true);
  };

  const handleDeleteSaved = async (id?: number) => {
    if (!id) return;
    const item = savedSummaries.find(s => s.id === id);
    const confirmed = await confirm({
      title: 'ยืนยันการลบรายงานสรุปโครงการ',
      message: `คุณต้องการลบรายงานสรุปโครงการ "${item?.name || ''}" นี้ใช่หรือไม่?`,
      type: 'delete',
      confirmText: 'ยืนยันการลบ',
      cancelText: 'ยกเลิก'
    });
    if (!confirmed) return;
    try {
      await fetch(`/api/project-summaries/${id}`, { method: 'DELETE' });
    } catch (err) {}
    const updated = savedSummaries.filter(s => s.id !== id);
    setSavedSummaries(updated);
    localStorage.setItem('moi_summaries', JSON.stringify(updated));
  };

  const handlePrint = () => {
    if (!generatedHtml) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>รายงานสรุปโครงการ_${name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap');
            @page { size: A4; margin: 25mm 20mm 20mm 25mm; }
            body { font-family: 'Sarabun', sans-serif; margin: 0; padding: 0; color: #000; }
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          ${generatedHtml}
          <script>
            window.onload = () => { setTimeout(() => window.print(), 200); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleExportWord = () => {
    if (!generatedHtml) return;
    downloadAsDoc(generatedHtml, `สรุปโครงการ_${name || 'รายงาน'}`);
  };

  const uniqueTypes = Array.from(new Set(savedSummaries.map(s => s.type).filter(Boolean)));
  const uniqueYears = Array.from(new Set(savedSummaries.map(s => s.year).filter(Boolean)));

  const filteredSummaries = savedSummaries.filter(item => {
    const matchesSearch = !searchTerm || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.owner && item.owner.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.venue && item.venue.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = !filterType || item.type === filterType;
    const matchesYear = !filterYear || item.year === filterYear;
    
    return matchesSearch && matchesType && matchesYear;
  });

  return (
    <div className="space-y-6">
      {/* Header Info Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 rounded-2xl shadow-lg border border-blue-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/10">
            <BarChart3 className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold">ระบบสร้างรายงานสรุปโครงการอัตโนมัติ (สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัด)</h2>
            <p className="text-xs text-blue-200/80 mt-0.5">
              สร้างรายงานสรุปผลการดำเนินงานโครงการด้านการป้องกันและบรรเทาสาธารณภัย ความปลอดภัยทางถนน และการฝึกอบรมกู้ภัย ตามแบบฟอร์มราชการไทย
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            if (showForm) {
              setShowForm(false);
            } else {
              handleClearForm();
              setShowForm(true);
            }
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all duration-150 cursor-pointer self-start md:self-auto"
        >
          {showForm ? (
            <>
              <FolderOpen className="w-4 h-4" />
              <span>ดูรายการที่บันทึกไว้</span>
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              <span>สร้างสรุปโครงการใหม่</span>
            </>
          )}
        </button>
      </div>

      {/* Main Content: Form or Saved List */}
      {showForm ? (
        <div className="space-y-6">
          {/* Template Selection Box */}
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-4 shadow-md border border-indigo-800/30">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span className="text-xs font-bold text-amber-300">
                  ⚡ เลือกเทมเพลตโครงการ ปภ.จ. สำเร็จรูป (ภัยพิบัติ, ศปถ., อปพร., กู้ภัย, CBDRM) เพื่อเติมข้อมูลอัตโนมัติ
                </span>
              </div>
              <button
                onClick={handleClearForm}
                className="text-xs text-slate-300 hover:text-white underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> ล้างฟอร์ม
              </button>
            </div>
            <select
              value={selectedTemplate}
              onChange={(e) => handleApplyTemplate(e.target.value)}
              className="mt-3 w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
            >
              <option value="" className="text-slate-900">-- เลือกประเภทโครงการแล้วกรอกข้อมูลอัตโนมัติ --</option>
              {PROJECT_TEMPLATES.map((group, idx) => (
                <optgroup key={idx} label={group.group} className="text-slate-900 font-bold">
                  {group.items.map(item => (
                    <option key={item.id} value={item.id} className="text-slate-900">
                      {item.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Form Card */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-2xl p-6 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-[var(--text-primary)] border-b border-[var(--border-lighter)] pb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[var(--primary-color)]" />
              <span>กรอกข้อมูลรายละเอียดโครงการ</span>
            </h3>

            {/* Section 1 */}
            <div className="bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--border-lighter)] space-y-4">
              <div className="text-xs font-bold text-[var(--primary-color)] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[var(--primary-color)]"></span>
                <span>ส่วนที่ ๑ — ข้อมูลพื้นฐานโครงการ</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    ชื่อโครงการ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="เช่น โครงการฝึกอบรมเตรียมพร้อมรับมือภัยพิบัติ"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-lighter)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">ปีงบประมาณ</label>
                  <input
                    type="text"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-lighter)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">ประเภทโครงการ</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-lighter)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                  >
                    <option value="การป้องกันและบรรเทาสาธารณภัย">การป้องกันและบรรเทาสาธารณภัย</option>
                    <option value="ความปลอดภัยทางถนน (ศปถ.จ.)">ความปลอดภัยทางถนน (ศปถ.จ.)</option>
                    <option value="การฝึกอบรมและพัฒนาศักยภาพกู้ภัย">การฝึกอบรมและพัฒนาศักยภาพกู้ภัย</option>
                    <option value="การจัดทำแผนและระบบเตือนภัย">การจัดทำแผนและระบบเตือนภัย</option>
                    <option value="การเสริมสร้างความตระหนักรู้และชุมชนปลอดภัย">การเสริมสร้างความตระหนักรู้และชุมชนปลอดภัย</option>
                    <option value="บริหารจัดการและเทคโนโลยีสาธารณภัย">บริหารจัดการและเทคโนโลยีสาธารณภัย</option>
                    <option value="อื่นๆ">อื่นๆ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">ผู้รับผิดชอบโครงการ</label>
                  <input
                    type="text"
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    placeholder="ชื่อ-นามสกุล / ตำแหน่ง"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-lighter)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">ผู้บังคับบัญชา / ผู้รับทราบ</label>
                  <input
                    type="text"
                    value={principal}
                    onChange={(e) => setPrincipal(e.target.value)}
                    placeholder="ชื่อ-นามสกุล / ตำแหน่งผู้รับทราบ"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-lighter)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">สถานที่ดำเนินการ</label>
                  <input
                    type="text"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-lighter)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">วันที่เริ่มโครงการ</label>
                  <input
                    type="date"
                    value={dateStart}
                    onChange={(e) => setDateStart(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-lighter)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">วันที่สิ้นสุดโครงการ</label>
                  <input
                    type="date"
                    value={dateEnd}
                    onChange={(e) => setDateEnd(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-lighter)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">งบอนุมัติ (บาท)</label>
                  <input
                    type="number"
                    value={budgetPlan}
                    onChange={(e) => setBudgetPlan(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-lighter)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">งบใช้จริง (บาท)</label>
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-lighter)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">สอดคล้องกับนโยบาย / แผนงาน</label>
                  <input
                    type="text"
                    value={policy}
                    onChange={(e) => setPolicy(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-lighter)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                  />
                </div>
              </div>
            </div>

            {/* Section 2 */}
            <div className="bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--border-lighter)] space-y-4">
              <div className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>ส่วนที่ ๒ — กลุ่มเป้าหมายและผู้เข้าร่วม</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">กลุ่มเป้าหมาย</label>
                  <select
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-lighter)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                  >
                    <option value="ประชาชน">ประชาชน</option>
                    <option value="เจ้าหน้าที่/บุคลากร">เจ้าหน้าที่/บุคลากร</option>
                    <option value="ประชาชนและเจ้าหน้าที่">ประชาชนและเจ้าหน้าที่</option>
                    <option value="เยาวชน">เยาวชน</option>
                    <option value="ผู้สูงอายุ">ผู้สูงอายุ</option>
                    <option value="ทุกกลุ่ม">ทุกกลุ่ม</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">จำนวนผู้เข้าร่วม (คน)</label>
                  <input
                    type="number"
                    value={participants}
                    onChange={(e) => setParticipants(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-lighter)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">ระดับ/พื้นที่ (ถ้ามี)</label>
                  <input
                    type="text"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    placeholder="เช่น อำเภอเมืองระยอง"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-lighter)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">วิทยากร/ผู้สนับสนุน</label>
                  <input
                    type="text"
                    value={speaker}
                    onChange={(e) => setSpeaker(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-lighter)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                  />
                </div>
              </div>
            </div>

            {/* Section 3 */}
            <div className="bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--border-lighter)] space-y-4">
              <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>ส่วนที่ ๓ — วัตถุประสงค์และกิจกรรมที่ดำเนินการ</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">วัตถุประสงค์หลัก</label>
                  <textarea
                    rows={4}
                    value={objectives}
                    onChange={(e) => setObjectives(e.target.value)}
                    placeholder="๑. เพื่อ...\n๒. เพื่อ..."
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-lighter)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">กิจกรรมที่ดำเนินการ</label>
                  <textarea
                    rows={4}
                    value={activities}
                    onChange={(e) => setActivities(e.target.value)}
                    placeholder="- จัดการอบรมเชิงปฏิบัติการ\n- ทดสอบประเมินผล"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-lighter)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                  />
                </div>
              </div>
            </div>

            {/* Section 4 */}
            <div className="bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--border-lighter)] space-y-4">
              <div className="text-xs font-bold text-violet-600 dark:text-violet-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-violet-500"></span>
                <span>ส่วนที่ ๔ — ผลการดำเนินงาน ปัญหา และข้อเสนอแนะ</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">ผลเชิงปริมาณ</label>
                  <textarea
                    rows={3}
                    value={resultQty}
                    onChange={(e) => setResultQty(e.target.value)}
                    placeholder="- มีผู้เข้าร่วม 100 คน"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-lighter)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">ผลเชิงคุณภาพ</label>
                  <textarea
                    rows={3}
                    value={resultQl}
                    onChange={(e) => setResultQl(e.target.value)}
                    placeholder="- ประชาชนมีความพึงพอใจอย่างยิ่ง"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-lighter)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">ปัญหาและอุปสรรค</label>
                  <textarea
                    rows={2}
                    value={problems}
                    onChange={(e) => setProblems(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-lighter)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">ข้อเสนอแนะแนวทางพัฒนา</label>
                  <textarea
                    rows={2}
                    value={suggestions}
                    onChange={(e) => setSuggestions(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-lighter)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                  />
                </div>
              </div>
            </div>

            {/* Section 5 */}
            <div className="bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--border-lighter)] space-y-4">
              <div className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span>ส่วนที่ ๕ — ระดับความสำเร็จและความพึงพอใจ</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">ระดับความสำเร็จ</label>
                  <select
                    value={success}
                    onChange={(e) => setSuccess(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-lighter)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                  >
                    <option value="สูงมาก (90-100%)">⭐⭐⭐⭐⭐ สูงมาก (90-100%)</option>
                    <option value="สูง (75-89%)">⭐⭐⭐⭐ สูง (75-89%)</option>
                    <option value="ปานกลาง (60-74%)">⭐⭐⭐ ปานกลาง (60-74%)</option>
                    <option value="ต้องปรับปรุง (ต่ำกว่า 60%)">⭐⭐ ต้องปรับปรุง</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">คะแนนความพึงพอใจเฉลี่ย</label>
                  <input
                    type="text"
                    value={satisfaction}
                    onChange={(e) => setSatisfaction(e.target.value)}
                    placeholder="เช่น 4.85 / 5.00 (97.0%)"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-lighter)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={generateAiSummary}
                disabled={isAiGenerating}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all duration-150 cursor-pointer disabled:opacity-50"
              >
                {isAiGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังสร้างสรุปด้วย AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>สร้างสรุปโครงการด้วย AI</span>
                  </>
                )}
              </button>

              <button
                onClick={generateManualSummary}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-elevated)] hover:bg-[var(--border-lighter)] text-[var(--text-primary)] border border-[var(--border-lighter)] font-semibold text-xs rounded-xl transition-all duration-150 cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>สร้างแบบมาตรฐาน</span>
              </button>

              <button
                onClick={handleClearForm}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer ml-auto"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>รีเซ็ต</span>
              </button>
            </div>
          </div>

          {/* Generated Result Preview Card */}
          {generatedHtml && (
            <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-2xl p-4 sm:p-6 shadow-md space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-lighter)] pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span className="text-sm font-bold text-[var(--text-primary)]">ผลลัพธ์รายงานสรุปโครงการ (A4 Official Preview)</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveSummary}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer transition-all"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>บันทึกสรุปโครงการ</span>
                  </button>
                </div>
              </div>

              <div className="bg-slate-100 dark:bg-slate-900/60 p-2 sm:p-4 rounded-xl border border-[var(--border-lighter)]">
                <A4PaperPreview
                  title={`รายงานสรุปผลการดำเนินงานโครงการ: ${name || 'โครงการ'}`}
                  subtitle={`แบบประเมินและสรุปโครงการตามกรอบยุทธศาสตร์ ประจำปีงบประมาณ พ.ศ. ${year}`}
                  htmlContent={generatedHtml}
                  onPrint={handlePrint}
                  paperClassName="p-[25mm_20mm_20mm_25mm]"
                  extraActions={
                    <button
                      onClick={handleExportWord}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer transition-all"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      <span>ส่งออก Word (.docx)</span>
                    </button>
                  }
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Saved Summaries List View */
        <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[var(--border-lighter)] pb-3 gap-3">
            <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-amber-500" />
              <span>รายการรายงานสรุปโครงการที่บันทึกไว้</span>
            </h3>
            <span className="text-xs text-[var(--text-secondary)] font-medium">
              ทั้งหมด {filteredSummaries.length} จาก {savedSummaries.length} รายการ
            </span>
          </div>

          {savedSummaries.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-[var(--bg-elevated)]/50 p-3.5 rounded-xl border border-[var(--border-lighter)]">
              <div className="md:col-span-2 relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ค้นหาชื่อโครงการ, ผู้รับผิดชอบ, สถานที่..."
                  className="w-full pl-3 pr-3 py-1.5 rounded-lg border border-[var(--border-lighter)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)]"
                />
              </div>
              <div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg border border-[var(--border-lighter)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)]"
                >
                  <option value="">ทุกประเภทโครงการ</option>
                  {uniqueTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="flex-1 px-2 py-1.5 rounded-lg border border-[var(--border-lighter)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)]"
                >
                  <option value="">ทุกปีงบประมาณ</option>
                  {uniqueYears.map((y) => (
                    <option key={y} value={y}>พ.ศ. {y}</option>
                  ))}
                </select>
                {(searchTerm || filterType || filterYear) && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setFilterType('');
                      setFilterYear('');
                    }}
                    className="px-2.5 py-1.5 bg-[var(--bg-surface)] hover:bg-[var(--border-lighter)] text-rose-500 hover:text-rose-600 rounded-lg border border-[var(--border-lighter)] text-xs font-semibold cursor-pointer transition-colors"
                    title="ล้างตัวกรอง"
                  >
                    ล้าง
                  </button>
                )}
              </div>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-xs text-[var(--text-secondary)] flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[var(--primary-color)]" />
              <span>กำลังโหลดข้อมูล...</span>
            </div>
          ) : savedSummaries.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-lighter)] flex items-center justify-center mx-auto text-[var(--text-muted)]">
                <BarChart3 className="w-6 h-6" />
              </div>
              <p className="text-xs text-[var(--text-secondary)] font-medium">
                ยังไม่มีรายงานสรุปโครงการที่บันทึกไว้
              </p>
              <button
                onClick={() => {
                  handleClearForm();
                  setShowForm(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--primary-color)] text-white font-bold text-xs rounded-xl shadow-sm hover:opacity-90 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>เริ่มสร้างรายงานสรุปโครงการ</span>
              </button>
            </div>
          ) : filteredSummaries.length === 0 ? (
            <div className="py-12 text-center space-y-3 border border-dashed border-[var(--border-lighter)] rounded-xl bg-[var(--bg-elevated)]/20">
              <p className="text-xs text-[var(--text-secondary)] font-medium">
                ไม่พบข้อมูลที่ตรงกับการค้นหาและตัวกรองของคุณ
              </p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterType('');
                  setFilterYear('');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-lighter)] text-[11px] font-semibold rounded-lg transition-colors cursor-pointer"
              >
                ล้างข้อมูลการค้นหา
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-elevated)] border-b border-[var(--border-lighter)] text-[var(--text-secondary)]">
                    <th className="py-3 px-3 w-10 text-center font-bold">#</th>
                    <th className="py-3 px-3 font-bold">ชื่อโครงการ</th>
                    <th className="py-3 px-3 font-bold">ประเภท</th>
                    <th className="py-3 px-3 text-center font-bold">ปีงบฯ</th>
                    <th className="py-3 px-3 font-bold">ผู้รับผิดชอบ</th>
                    <th className="py-3 px-3 text-center font-bold">ผู้เข้าร่วม</th>
                    <th className="py-3 px-3 text-center font-bold">ระดับสำเร็จ</th>
                    <th className="py-3 px-3 text-center font-bold">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-lighter)]">
                  {filteredSummaries.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-[var(--bg-elevated)]/50 transition-colors">
                      <td className="py-3 px-3 text-center font-semibold text-[var(--text-muted)]">{idx + 1}</td>
                      <td className="py-3 px-3 font-bold text-[var(--text-primary)] max-w-[220px] truncate" title={item.name}>
                        {item.name}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                          {item.type || 'วิชาการ'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-medium">{item.year}</td>
                      <td className="py-3 px-3 text-[var(--text-secondary)]">{item.owner || '-'}</td>
                      <td className="py-3 px-3 text-center font-semibold text-emerald-600 dark:text-emerald-400">
                        {Number(item.participants || 0).toLocaleString()} คน
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          {(item.success || 'สูงมาก').split('(')[0].trim()}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEditSaved(item)}
                            title="ดู/แก้ไข"
                            className="p-1.5 hover:bg-blue-500/10 text-blue-600 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSaved(item.id)}
                            title="ลบ"
                            className="p-1.5 hover:bg-rose-500/10 text-rose-600 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
