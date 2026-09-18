import React, { useState, useMemo } from 'react';
import { 
  HelpCircle, BookOpen, Search, Shield, FileText, Send, Sparkles, 
  ChevronRight, ChevronLeft, ArrowRight, Printer, Download, Star, Info, CheckCircle2, 
  AlertTriangle, Lock, Key, Eye, HelpCircle as HelpIcon, FileEdit, 
  Workflow, QrCode, ClipboardList, RefreshCw, Layers, Check, ExternalLink,
  ChevronDown, Book, UserCheck, MessageSquare, Terminal, MapPin, User, Users
} from 'lucide-react';

// Import generated illustration images
import workflowImg from '../../assets/images/edms_workflow_illustration_1789647784159.jpg';
import aiCompanionImg from '../../assets/images/ai_writing_companion_1789647800816.jpg';
import signatureSealImg from '../../assets/images/digital_signature_seal_1789647815711.jpg';

interface UserManualViewProps {
  user?: any;
  onNavigateToTab?: (tab: string) => void;
}

export default function UserManualView({ user, onNavigateToTab }: UserManualViewProps) {
  const [activeChapter, setActiveChapter] = useState('intro');
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  
  // Guided Tour States
  const [selectedTour, setSelectedTour] = useState<'receive' | 'draft_ai' | 'sign'>('receive');
  const [tourStep, setTourStep] = useState(0);

  // Chapters & Sections Content Data with detailed Thai context for ปภ. ระยอง
  const chapters = useMemo(() => [
    {
      id: 'intro',
      title: 'บทนำและสิทธิ์การใช้งาน',
      icon: BookOpen,
      description: 'ภาพรวมระบบและสิทธิ์ผู้ใช้งานในการจัดการงานสารบรรณ ปภ.ระยอง',
      image: workflowImg,
      imageCaption: 'แผนภาพความเชื่อมโยงระบบการทำงานแบบบูรณาการและฐานข้อมูลคลาวด์',
      sections: [
        {
          title: 'เกี่ยวกับระบบ EDMS Saraban ปภ. ระยอง',
          content: 'ระบบงานสารบรรณอิเล็กทรอนิกส์ (Electronic Document Management System - EDMS Saraban) เป็นระบบหลักที่พัฒนาขึ้นสำหรับสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง (ปภ. ระยอง) โดยประสานงานกับส่วนราชการอื่นๆ ทั้งในจังหวัดและส่วนกลาง เพื่อปรับปรุงการรับ-ส่งเอกสาร ร่างหนังสือราชการ และจัดระบบการเก็บแฟ้มเอกสารดิจิทัลให้สะดวกรวดเร็ว ปลอดภัย และเป็นไปตาม พ.ร.บ. การปฏิบัติราชการทางอิเล็กทรอนิกส์ พ.ศ. 2565'
        },
        {
          title: 'สิทธิ์และการกำหนดบทบาทหน้าที่ (User Roles & Matrix)',
          content: 'ระบบทำงานบนฐานโครงสร้างของสิทธิ์แบบ Role-Based Access Control (RBAC) เพื่อป้องกันการเข้าถึงข้อมูลลับเฉพาะของกองงานและกลุ่มงานต่างๆ โดยจำแนกสิทธิ์การทำธุรกรรมสารบรรณออกเป็น 3 บทบาทหลักดังนี้:',
          badgeList: [
            { label: 'ผู้ดูแลระบบ (Admin)', desc: 'มีสิทธิ์สูงสุดในการเข้าถึงทุกส่วนงาน ปรับเปลี่ยน Feature Flags ตั้งค่าฝ่ายงาน/กลุ่มงาน นำเข้าพนักงานใหม่ และเรียกดูประวัติล็อกระบบเชิงลึก (Audit Logs)' },
            { label: 'ผู้ตรวจสอบ/หัวหน้าฝ่าย (Moderator)', desc: 'อนุมัติการออกเลขหนังสือส่ง ตรวจสอบความถูกต้องของการลงชื่อ มอบหมายงานให้ฝ่ายย่อย ปักหมุดงานเร่งด่วน และเข้าถึงประวัติตราประทับ' },
            { label: 'เจ้าหน้าที่ปฏิบัติงาน (User)', desc: 'ลงทะเบียนรับหนังสือใหม่ ร่างเอกสารราชการทั่วไป ใช้งานระบบ AI เขียนรายงานเหตุด่วนสาธารณภัย และยื่นขออนุมัติลายมือชื่อ' }
          ]
        },
        {
          title: 'สถาปัตยกรรมและความปลอดภัยของข้อมูล',
          content: 'ความปลอดภัยในการรับ-ส่งข้อมูลระหว่างหน่วยงานในระดับท้องถิ่นและจังหวัด ได้รับการคุ้มครองตามเกณฑ์ความปลอดภัยเทคโนโลยีสารสนเทศ การล็อกอินผ่านระบบของ ปภ. ระยอง จะเชื่อมเข้ากับ Session สิทธิ์เฉพาะกลุ่มงาน ประวัติกิจกรรมที่ละเอียดอ่อนทั้งหมดจะถูกบันทึกไว้ใน Audit Logs และไม่สามารถลบหรือดัดแปลงได้โดยผู้ใช้งานทั่วไป'
        }
      ]
    },
    {
      id: 'inbox',
      title: 'ทะเบียนหนังสือรับ',
      icon: FileText,
      description: 'ขั้นตอนและวิธีบันทึกรับหนังสือราชการเข้าสู่ฝ่ายงาน',
      image: workflowImg,
      imageCaption: 'แผนผังกระบวนการรับเอกสาร สแกน และจัดระบบทะเบียนรับเอกสารกลาง',
      sections: [
        {
          title: 'การลงทะเบียนหนังสือรับเข้าฝ่าย (Inbox Registration)',
          content: 'เมื่อมีจดหมาย คำสั่ง ประกาศ หรือหนังสือราชการส่งเข้ามาจากส่วนราชการภายนอก จังหวัด หรืออำเภอ เจ้าหน้าที่สารบรรณจะต้องบันทึกเข้าระบบทันที โดยการไปที่เมนู "ทะเบียนหนังสือรับ" และกดปุ่ม "ลงทะเบียนรับเอกสาร" เพื่อป้อนข้อมูลสำคัญ ได้แก่ เลขที่เอกสาร, ลงวันที่, เรื่องย่อ, หน่วยงานผู้ส่ง (จาก), และหน่วยงานผู้รับ (ถึง) พร้อมทั้งทำการแนบไฟล์สแกน PDF ของหนังสือราชการนั้นเข้าสู่ระบบ'
        },
        {
          title: 'การคัดกรองความเร่งด่วนและความปลอดภัย',
          content: 'ระบบกำหนดให้ระบุ ระดับความเร็ว (ปกติ, ด่วน, ด่วนมาก, ด่วนที่สุด) และระดับความลับ เพื่อให้ระบบส่งสัญญาณและแจ้งเตือนผ่านหน้าจอหลักของผู้เกี่ยวข้องโดยทันที โดยเอกสารด่วนมากจะได้รับการติดริบบอนสีแดงที่แถบรายการเพื่อให้ง่ายต่อการสังเกต'
        },
        {
          title: 'การมอบหมายผู้รับผิดชอบหลัก (Assignee Workflow)',
          content: 'ระบบสารบรรณ EDMS ปภ.ระยอง มีระบบ Workflow จัดส่งต่อหนังสืออัจฉริยะ (Forward) โดยหัวหน้ากลุ่มงานสามารถระบุชื่อเจ้าหน้าที่รับผิดชอบหลัก (Assignee) หรือระบุผู้ร่วมดำเนินการเพื่อส่งเอกสารเข้าสู่แฟ้มปฏิบัติงานของเจ้าหน้าที่รายบุคคล ซึ่งผู้ปฏิบัติงานจะได้รับการแจ้งเตือนเรียลไทม์ทันที'
        }
      ]
    },
    {
      id: 'outbox',
      title: 'ทะเบียนหนังสือส่ง',
      icon: Send,
      description: 'กระบวนการออกเลขหนังสือราชการและออกหนังสือส่งหน่วยงานภายนอก',
      image: workflowImg,
      imageCaption: 'การรันเลขที่หนังสือส่งและระบบประทับตราสัญลักษณ์สารบรรณดิจิทัล',
      sections: [
        {
          title: 'การขอออกเลขหนังสือราชการส่ง (Outbox Numbering)',
          content: 'เอกสารที่จะส่งออกไปยังภายนอก ปภ. ระยอง จะต้องได้รับอนุมัติจากผู้บังคับบัญชาเสียก่อน จากนั้นเจ้าหน้าที่สามารถเข้าไปที่ทะเบียนหนังสือส่งและทำการคลิก "ขอออกเลขหนังสือส่ง" ระบบจะสุ่มหรือรันเลขตามหมวดหมู่ฝ่ายงานและรหัสจังหวัดระยองอย่างแม่นยำ (เช่น มท 0618.3/วXXXX) โดยเลขนี้จะล็อคเข้าระบบและไม่สามารถดึงซ้ำกันได้'
        },
        {
          title: 'การประทับตราสัญลักษณ์ (Digital Seal Stamper)',
          content: 'ผู้ใช้งานมีสิทธิ์สามารถเข้าสู่โหมดประทับตรา เพื่อเลือกตราสัญลักษณ์ครุฑทางการที่มีขนาดถูกต้อง (1.5 ซม. สำหรับบันทึกข้อความ / 3 ซม. สำหรับหนังสือภายนอก) หรือตราประทับประจำสำนักงาน ปภ. จังหวัดระยอง วางลงบนตำแหน่งที่กำหนดในไฟล์เอกสาร PDF'
        },
        {
          title: 'การป้องกันเอกสารปลอมแปลงด้วยระบบ QR Code สารบรรณ',
          content: 'เมื่อระบบดำเนินการปิดงานเอกสารเรียบร้อยแล้ว ระบบจะทำการเจนเนอเรท QR Code เอกลักษณ์ประจำหนังสือราชการฉบับนั้นโดยอัตโนมัติ เพื่อนำไปแนบไว้ที่ส่วนท้ายของจดหมาย ทำให้บุคคลภายนอกหรือผู้รับปลายทางสามารถสแกน QR Code นี้เพื่อเปิดลิ้งค์ตรวจสอบเอกสารต้นฉบับในระบบเพื่อยืนยันว่าหนังสือไม่ได้ถูกปลอมแปลงเนื้อหา'
        }
      ]
    },
    {
      id: 'draft_ai',
      title: 'การร่างหนังสือและผู้ช่วย AI',
      icon: Sparkles,
      description: 'วิธีจัดทำร่างหนังสือราชการ และเรียกใช้งานปัญญาประดิษฐ์ (Smart AI)',
      image: aiCompanionImg,
      imageCaption: 'จำลองการใช้โมเดล Google Gemini API ในการปรับระดับภาษาให้ถูกระเบียบสารบรรณ',
      sections: [
        {
          title: 'เครื่องมือร่างเอกสารมาตรฐาน (Drafting Center)',
          content: 'ในระบบประกอบด้วยศูนย์ร่างหนังสือราชการที่มีเครื่องมือแก้ไขข้อความครบครัน พร้อมชุดเทมเพลตมาตรฐานตามระเบียบสำนักนายกรัฐมนตรี เช่น บันทึกข้อความภายใน และหนังสือราชการภายนอก ทำให้จัดหน้าและสัดส่วนได้ง่าย ไม่สะดุด'
        },
        {
          title: 'ปัญญาประดิษฐ์ผู้ช่วยร่างหนังสือ (Gemini AI Smart Assistant)',
          content: 'ระบบได้ผสานการทำงานร่วมกับ Google Gemini API เพื่อช่วยข้าราชการในการจัดเตรียมข้อความที่ถูกต้องตามรูปแบบจดหมายราชการ โดยมีคำสั่งสำเร็จรูปให้กดใช้งาน:',
          bulletList: [
            '**ปุ่มช่วยเขียนร่างหนังสือราชการ**: ระบุความต้องการสั้นๆ เช่น "ขอความร่วมมือประชาสัมพันธ์ซักซ้อมแผนรับมืออุทกภัย" AI จะประมวลผลคำนำ คำกล่าวอ้าง และเนื้อหาที่สุภาพเป็นทางการให้อย่างรวดเร็ว',
            '**ปุ่มเกลาภาษาทางการ**: เปลี่ยนข้อความทั่วไปหรือภาษาเขียนแบบเดิมๆ ให้มีความเป็นภาษาทางการที่สละสลวย ถูกระเบียบวินัยสารบรรณอย่างเป็นทางการ',
            '**ปุ่มสรุปประเด็นสาระสำคัญ**: สกัดข้อความที่ได้รับจากหนังสือรับภายนอกที่มีความยาวมากๆ ให้เหลือเพียงใจความหลักและสรุปคำสั่งที่จำเป็นต้องให้หัวหน้างานอนุมัติ'
          ]
        },
        {
          title: 'ระบบทดลองพิมพ์และการจัดระเบียบหน้า (Interactive A4 Paper Preview)',
          content: 'เพื่อให้มั่นใจว่าโครงสร้างเอกสารมีระยะกั้นหน้า ระยะกั้นหลัง และการวางตำแหน่งที่ได้สัดส่วนงามตา ระบบมีเครื่องมือจำลองหน้ากระดาษ A4 เสมือนจริง (A4 Paper Preview) ที่จะสะท้อนสัดส่วนที่ปรากฏเมื่อถูกปริ้นต์ออกมา หรือบันทึกเป็นไฟล์ .docx และ PDF'
        }
      ]
    },
    {
      id: 'design_info',
      title: 'เครื่องมือออกแบบ Infographics',
      icon: Layers,
      description: 'คู่มือการใช้โปรแกรม CanvaKit เพื่อออกแบบสื่อประชาสัมพันธ์และการแจ้งเตือนภัย',
      image: aiCompanionImg,
      imageCaption: 'การออกแบบประกาศเหตุเตือนภัยด่วนด้วย CanvaKit และอินโฟกราฟิกสำเร็จรูป',
      sections: [
        {
          title: 'โปรแกรมออกแบบสื่อ CanvaKit ของ ปภ.ระยอง',
          content: 'สำนักงาน ปภ.ระยอง มักมีภารกิจเตือนภัยล่วงหน้าแก่พี่น้องประชาชนในพื้นที่ รวมถึงกลุ่มโรงงานอุตสาหกรรมในพื้นที่เขตพัฒนาพิเศษภาคตะวันออก (EEC) ระบบจึงมีการติดตั้ง "CanvaKit Editor" เครื่องมือออกแบบกราฟิกเต็มรูปแบบบนหน้าเว็บโดยตรง ไม่จำเป็นต้องสมัครแอปพลิเคชันอื่นภายนอก'
        },
        {
          title: 'เครื่องมือช่วยลบภาพพื้นหลังและการจัดวางเลเยอร์',
          content: 'ผู้ใช้งานสามารถควบคุมการลากวางรูปภาพ ปรับขนาดอักษร และเลือกจัดสีพื้นหลังตามเกณฑ์สีแจ้งเตือนระดับวิกฤต (เช่น สีแดง-ส้ม สำหรับภัยพิบัติรุนแรง) โดยมีฟีเจอร์ "ลบฉากหลังอัจฉริยะ" ช่วยในการตัดภาพตราประทับ ตราครุฑ หรือบุคคลสำคัญได้อย่างเนียนตาภายในคลิกเดียว'
        },
        {
          title: 'การดึง Widget สภาพภูมิอากาศและรายงานภัยเรียลไทม์',
          content: 'จุดเด่นของ CanvaKit คือความสามารถในการดึงข้อมูลสด เช่น EecWeatherWidget (สภาพอากาศปัจจุบัน ข้อมูลค่าฝุ่น คลื่นทะเล ข้อมูลพายุ) เข้ามาจัดวางร่วมกับอินโฟกราฟิกเพื่อนำไปใช้ในการแจ้งเตือนแบบด่วนที่สุดผ่านกลุ่มไลน์และโซเชียลมีเดียได้อย่างรวดเร็ว'
        }
      ]
    },
    {
      id: 'signatures',
      title: 'การลงนามดิจิทัล (ETDA)',
      icon: Shield,
      description: 'วิธีการเตรียมใบรับรองและลงชื่อผ่านระบบเซ็นลายเซ็นอิเล็กทรอนิกส์มาตรฐานสูง',
      image: signatureSealImg,
      imageCaption: 'กระบวนการลงลายมือชื่อแบบเข้ารหัสกุญแจคู่ และการบันทึกเอกสารที่ไม่มีวันเปลี่ยนแปลง',
      sections: [
        {
          title: 'มาตรฐานลายเซ็นดิจิทัลตามพระราชบัญญัติธุรกรรมฯ',
          content: 'ระบบนี้ออกแบบโครงสร้างตามแนวทางของสำนักงานพัฒนาธุรกรรมทางอิเล็กทรอนิกส์ (ETDA) ลายมือชื่ออิเล็กทรอนิกส์ที่ถูกลงนามในระบบจะมีการแนบรหัสตรวจสอบที่ได้จากการแฮชไฟล์เอกสาร (Hash Certification) เพื่อเป็นหลักประกันทางกฎหมายว่าเนื้อหาจดหมายจะไม่สามารถถูกลักลอบเปลี่ยนแปลงแก้ไขได้ภายหลังการอนุมัติเซ็นชื่อสำเร็จ'
        },
        {
          title: 'วิธีการลงชื่อเสนอลงนามและลงรหัสพินโค้ด',
          content: 'ผู้บังคับบัญชาหรือผู้รับมอบอำนาจสามารถเรียกดูรายการ "หนังสือที่รอคุณลงนาม" จากนั้นลากและย่อขยายกรอบลายมือชื่อเพื่อกำหนดจุดลงนามบนหน้าเอกสาร PDF ได้อย่างอิสระ จากนั้นกรอกรหัส PIN ประจำตัวจำนวน 6 หลัก ลายเซ็นสดพร้อมข้อมูลการเข้ารหัสก็จะประทับลงในเนื้อไฟล์อย่างปลอดภัย'
        },
        {
          title: 'ระบบ Log และเครื่องมือตรวจเช็คความผิดพลาด',
          content: 'เอกสารที่ผ่านการลงลายมือชื่อดิจิทัลจะมีบันทึกการจัดเก็บอยู่ใน Digital Signatures Log View ซึ่งสามารถเรียกตรวจสอบ วันเวลา บัญชี และรหัสแฮชเพื่อใช้พิสูจน์ตามกฎหมายได้อย่างโปร่งใส และป้องกันการปฏิเสธความรับผิดชอบ (Non-repudiation)'
        }
      ]
    },
    {
      id: 'disaster_report',
      title: 'แบบรายงานเหตุด่วนสาธารณภัย',
      icon: AlertTriangle,
      description: 'คู่มือการเขียนรายงานภัยพิบัติเร่งด่วนเพื่อจัดส่งผู้ว่าราชการจังหวัด',
      image: signatureSealImg,
      imageCaption: 'ขั้นตอนการรับข้อมูลเหตุภัยพิบัติ สรุปสถิติ และการส่งต่อเพื่อจัดตั้งหน่วยช่วยเหลือ',
      sections: [
        {
          title: 'การเขียนรายงานเหตุฉุกเฉินเบื้องต้น (Incident Logging)',
          content: 'เมื่อเกิดภัยพิบัติฉุกเฉิน เช่น เหตุอุทกภัย วาตภัย อัคคีภัย สารเคมีโรงงานรั่วไหล หรือการระบายน้ำอ่างเก็บน้ำ เจ้าหน้าที่ ปภ.ระยอง จะต้องกรอกแบบรายงานเหตุด่วนผ่านหัวข้อ "แบบรายงานเหตุด่วน" เพื่อนำเข้าระบบจัดทำแผนที่สาธารณภัย'
        },
        {
          title: 'ข้อมูลที่จำเป็นและพิกัดแผนที่สารบรรณ',
          content: 'ให้ระบุรายละเอียดประเภทภัย วันและเวลาเกิดเหตุ สถานที่ที่ได้รับความเสียหาย (ตำบล, อำเภอ, และพิกัดละติจูด/ลองจิจูด เพื่อเชื่อมต่อแผนที่ความช่วยเหลือ) ตลอดจนจำนวนผู้ได้รับผลกระทบ คาดการณ์สถานการณ์ปัจจุบัน และหน่วยงานสนับสนุนที่เข้าร่วมระงับเหตุ'
        },
        {
          title: 'การแปลงเป็นจดหมายบันทึกรายงานเสนอผู้บังคับบัญชาแบบอัตโนมัติ',
          content: 'ทันทีที่กดยืนยันบันทึกรายงานระบบจะประมวลผลข้อมูลภัยทั้งหมดแล้วแปลงสภาพเป็น "ร่างจดหมายราชการบันทึกข้อความ" เสนอรายงานเร่งด่วนส่งตรงไปยังระบบ "ร่างเอกสาร" ทันที เพื่อประหยัดเวลาการพิมพ์และจัดส่งให้ผู้ว่าราชการจังหวัดหรืออธิบดีกรม ปภ. ได้ภายในกรอบเวลาวิกฤต'
        }
      ]
    }
  ], []);

  // FAQs List Data
  const faqs = [
    {
      q: 'ค้นหาเลขรับหรือเลขส่งเอกสารย้อนหลังได้อย่างไร?',
      a: 'ผู้ใช้งานสามารถเข้าไปที่เมนู "ทะเบียนหนังสือรับ" หรือ "ทะเบียนหนังสือส่ง" จากนั้นพิมพ์รายละเอียด เช่น เลขที่หนังสือ, ชื่อเรื่อง, วันที่ลงทะเบียน, หรือชื่อผู้ส่ง ลงในช่องค้นหาด้านบน ระบบจะทำกรองข้อมูลแบบเรียลไทม์เพื่อแสดงประวัติเอกสารที่ถูกต้องอย่างรวดเร็ว'
    },
    {
      q: 'AI ช่วยร่างหนังสือราชการมีความถูกต้องและเสถียรแค่ไหน?',
      a: 'โมเดล Google Gemini API ได้รับการออกแบบให้ช่วยยกร่างข้อความตามรูปแบบสำนวนทางราชการอย่างสละสลวย อย่างไรก็ตาม เพื่อความถูกต้องในแง่ของกฎหมาย ข้อกฎหมาย และข้อเท็จจริงเฉพาะพื้นที่ ปภ.ระยอง ผู้ใช้งานมีความจำเป็นต้องตรวจสอบเนื้อหาโดยละเอียดอีกครั้งก่อนที่จะยื่นเสนอหัวหน้างานอนุมัติ'
    },
    {
      q: 'ทำไมระบบถึงไม่อนุญาตให้แก้ไขไฟล์ PDF ที่ลงนามดิจิทัลสำเร็จแล้ว?',
      a: 'เพราะเป็นข้อกำหนดมาตรฐานความปลอดภัยทางอิเล็กทรอนิกส์ของ ETDA เพื่อป้องกันการบิดเบือนข้อมูล การแก้ไขเนื้อหาใดๆ จะส่งผลให้รหัส Hash ของเอกสารเปลี่ยนไป และส่งผลให้ลายเซ็นดิจิทัลนั้นถือว่าใช้งานไม่ได้ หากต้องแก้ไข คุณจะต้องจัดทำร่างฉบับปรับปรุงใหม่และเสนอขอลายมือชื่อใหม่อีกครั้ง'
    },
    {
      q: 'สิทธิ์ทั่วไป (User) แตกต่างจากหัวหน้าฝ่าย (Moderator) อย่างไรบ้าง?',
      a: 'เจ้าหน้าที่ทั่วไป (User) สามารถร่างเอกสาร บันทึกเอกสารรับเข้า และจัดทำรายงานข้อมูลภัยได้ แต่ไม่สามารถเข้าไป "อนุมัติเลขส่งเอกสาร" หรือประทับตราสัญลักษณ์ระดับหน่วยงานได้ ส่วนผู้ดูแลระบบ (Admin) จะดูแลด้านโครงสร้างพนักงานทั้งหมดและการเปิดปิดการทำงานของฟังก์ชันหลักในแอปพลิเคชัน'
    },
    {
      q: 'เมื่อระบบแจ้งเตือนล่าช้า หรือซิงค์ข้อมูลไม่ตรงกับเพื่อนร่วมงาน ควรแก้อย่างไร?',
      a: 'ระบบ EDMS ของ ปภ.ระยอง ทำงานด้วยฟีเจอร์ซิงค์ข้อมูลเรียลไทม์ (Server-Sent Events) หากพบอาการข้อมูลล่าช้า ให้กดปุ่ม "อัปเดตระบบเรียลไทม์" หรือกดยกเลิกแคชบนเบราว์เซอร์ เพื่อดึงข้อมูลล่าสุดจากเซิร์ฟเวอร์หลัก'
    }
  ];

  // Guided Tour Data Simulation
  const tourData = {
    receive: [
      { step: '1. ไปที่เมนูหนังสือรับ', text: 'คลิกเข้าสู่หน้า "ทะเบียนหนังสือรับ" จากแผงควบคุมหลักทางด้านซ้ายเพื่อเปิดคิวหนังสือขาเข้า' },
      { step: '2. ลงทะเบียนรับข้อมูลใหม่', text: 'คลิกปุ่มสีน้ำเงินขวาบน "ลงทะเบียนรับเอกสาร" จากนั้นกรอกรายละเอียดสำคัญของจดหมายหรือประกาศที่รับเข้ามา' },
      { step: '3. อัปโหลดเอกสารต้นฉบับ', text: 'แนบไฟล์ PDF หรือรูปภาพของจดหมายต้นฉบับที่ประทับตรา เพื่อรักษาระบบเอกสารดิจิทัลทดแทนกระดาษ' },
      { step: '4. มอบหมายผู้ดูแลรับภารกิจ', text: 'เลือกหัวหน้ากลุ่มงานหรือผู้ปฏิบัติดำเนินการหลัก (Assignee) เพื่อจัดคิวงานส่งและกด "บันทึก" เพื่อกระจายการแจ้งเตือน' }
    ],
    draft_ai: [
      { step: '1. เริ่มต้นร่างหนังสือราชการใหม่', text: 'เลือกแท็บ "ร่างเอกสาร" และคลิกที่ปุ่ม "สร้างเอกสารร่างใหม่" เพื่อเปิดใช้งานแบบฟอร์มเปล่า' },
      { step: '2. เรียกใช้งานตัวช่วย AI แสนฉลาด', text: 'คลิกที่แท็บ "ผู้ช่วย AI Smart" เพื่อเปิดหน้าเครื่องมือประมวลผลคำสั่งของโมเดล Google Gemini' },
      { step: '3. พิมพ์หัวเรื่องหรือป้อนความต้องการ', text: 'พิมพ์วัตถุประสงค์สั้นๆ เช่น "ต้องการร่างคำอธิบายมาตรการระงับเหตุอัคคีภัยในชุมชนเมือง" และกดสั่งปัญญาประดิษฐ์' },
      { step: '4. คัดลอกสู่กระดาษจำลอง A4', text: 'กดปุ่มเพื่อคัดลอกร่างของ AI ไปยังกระดาษพรีวิวจำลองหน้าเว็บ และสลับไปตรวจสอบการจัดเรียงระยะห่างตราครุฑและลายเซ็น' }
    ],
    sign: [
      { step: '1. ค้นหารายการหนังสือรอเซ็น', text: 'เข้าสู่เมนู "ศูนย์ลงนามดิจิทัล" และค้นหาหนังสือที่ระบุว่า "รอคุณลงนาม"' },
      { step: '2. จัดวางพื้นที่ลายมือชื่อผู้บริหาร', text: 'คลิกเปิดดูเอกสาร PDF แล้วลากตำแหน่งที่ต้องการประทับบล็อกลายมือชื่ออิเล็กทรอนิกส์' },
      { step: '3. ยืนยันพินโค้ดความปลอดภัย', text: 'ระบุพินโค้ดลับ 6 หลักประจำตัวเพื่อเป็นมาตรการยืนยันว่าคุณคือบุคคลตัวจริงตามข้อมูลใบรับรองราชการ' },
      { step: '4. ตรวจสอบความถูกต้องและเสร็จงาน', text: 'กดยืนยันเซ็น ลายเซ็นประทับลงหน้าเอกสารอย่างเหนียวแน่นพร้อมตรา ETDA และเลข Hash เพื่อบันทึกเสร็จสิ้นภารกิจ' }
    ]
  };

  const activeTourSteps = tourData[selectedTour];

  // Search logic
  const filteredChapters = useMemo(() => {
    if (!searchQuery.trim()) return chapters;
    const q = searchQuery.toLowerCase();
    return chapters.map(ch => {
      // Find matching sections
      const matchingSections = ch.sections.filter(
        sec => sec.title.toLowerCase().includes(q) || sec.content.toLowerCase().includes(q)
      );
      const isTitleMatch = ch.title.toLowerCase().includes(q) || ch.description.toLowerCase().includes(q);
      
      if (isTitleMatch || matchingSections.length > 0) {
        return {
          ...ch,
          sections: isTitleMatch ? ch.sections : matchingSections
        };
      }
      return null;
    }).filter(Boolean) as typeof chapters;
  }, [searchQuery, chapters]);

  // Sequential pagination
  const currentChapterIndex = chapters.findIndex(ch => ch.id === activeChapter);
  
  const handlePrevChapter = () => {
    if (currentChapterIndex > 0) {
      setActiveChapter(chapters[currentChapterIndex - 1].id);
    }
  };

  const handleNextChapter = () => {
    if (currentChapterIndex < chapters.length - 1) {
      setActiveChapter(chapters[currentChapterIndex + 1].id);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleStartTour = (tourType: 'receive' | 'draft_ai' | 'sign') => {
    setSelectedTour(tourType);
    setTourStep(0);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar bg-[var(--bg-base)] text-[var(--text-primary)] space-y-8 print:p-0 print:bg-white print:text-black">
      
      {/* 1. HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-[var(--border-light)] pb-6 print:hidden">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-500/15 text-indigo-600 rounded-lg dark:text-indigo-400">
              <BookOpen className="w-5 h-5 animate-pulse" />
            </span>
            <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 tracking-wider uppercase">คู่มือการปฏิบัติงานระบบสารบรรณ ปภ.ระยอง</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-sans tracking-tight text-[var(--text-primary)] leading-tight">
            ศูนย์การเรียนรู้ระบบสารบรรณอิเล็กทรอนิกส์ (EDMS)
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed max-w-3xl">
            คู่มือปฏิบัติงานระบบทะเบียนรับ-ส่ง, เทคนิคการใช้ผู้ช่วย Smart AI (Gemini) และระบบการเซ็นอนุมัติลงนามดิจิทัลที่ผ่านการคุ้มครองตามเกณฑ์ ETDA
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2.5 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] text-xs font-bold border border-[var(--border-light)] text-[var(--text-primary)] flex items-center gap-2 cursor-pointer shadow-xs transition-all duration-200 active:scale-95"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            พิมพ์คู่มือเล่มจริง (Print)
          </button>
          
          <button
            type="button"
            onClick={() => {
              if (onNavigateToTab) onNavigateToTab('overview');
            }}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold flex items-center gap-2 cursor-pointer shadow-sm hover:shadow transition-all duration-200 active:scale-95"
          >
            ไปที่หน้าบอร์ดทำงานหลัก
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* PRINT-ONLY OFFICIAL HEADER (Invisible on screen) */}
      <div className="hidden print:block text-center border-b-2 border-black pb-6 mb-8">
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/0/0a/Seal_Rayong_Province.png"
          className="w-20 h-20 mx-auto object-contain mb-4"
          alt="Rayong Seal"
          referrerPolicy="no-referrer"
        />
        <h1 className="text-2xl font-bold font-sans text-black">คู่มือการใช้งานระบบสารบรรณอิเล็กทรอนิกส์ (EDMS Saraban)</h1>
        <h2 className="text-md font-medium text-slate-700 mt-1">สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง (ปภ. ระยอง)</h2>
        <p className="text-xs text-slate-500 mt-2">ประทับตรา ณ วันที่: {new Date().toLocaleDateString('th-TH')} • เอกสารคู่มือสำหรับบุคลากรภายในระบบ ปภ.ระยอง</p>
      </div>

      {/* 2. SEARCH BAR & GLOBAL METRIC */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 print:hidden">
        {/* Search Input Box */}
        <div className="lg:col-span-3 relative">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-[var(--text-muted)]">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            placeholder="ค้นหาข้อความ ขั้นตอนการทำสารบรรณ หรือคำสำคัญ (เช่น ดิจิทัล, สิทธิ์, คัดแยก, AI, รายงานภัย...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-16 py-3.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-medium)] placeholder-[var(--text-muted)] text-[var(--text-primary)] focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm shadow-2xs transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-3 px-2.5 py-1 text-[10px] font-bold text-slate-400 hover:text-indigo-600 bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              เคลียร์ผลค้นหา
            </button>
          )}
        </div>

        {/* Current Role Banner */}
        <div className="bg-gradient-to-r from-indigo-500/10 to-blue-500/10 border border-indigo-500/10 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="block text-[10px] font-extrabold text-indigo-500 tracking-wider uppercase">สิทธิ์ปัจจุบันของคุณ</span>
            <span className="text-xs font-bold text-[var(--text-primary)] block truncate mt-0.5">
              {user?.firstName || 'ผู้ใช้บริการทั่วไป'} ({user?.role === 'admin' ? 'ผู้ดูแลระบบสูงสุด' : user?.role === 'moderator' ? 'หัวหน้าฝ่าย' : 'พนักงานเจ้าหน้าที่'})
            </span>
          </div>
        </div>
      </div>

      {/* 3. MOBILE & PC RESPONSIVE NAVIGATION CAROUSEL */}
      <div className="print:hidden">
        {/* Mobile Horizontal Carousel Tabs (Shown on screens < lg) */}
        <div className="lg:hidden">
          <span className="block text-[10px] font-bold text-[var(--text-muted)] tracking-wider uppercase mb-2 px-1">
            เลือกหัวข้อเรียนรู้
          </span>
          <div className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-none snap-x snap-mandatory">
            {chapters.map((ch) => {
              const isActive = activeChapter === ch.id && !searchQuery;
              const Icon = ch.icon;
              return (
                <button
                  key={ch.id}
                  onClick={() => {
                    setActiveChapter(ch.id);
                    setSearchQuery('');
                  }}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold shrink-0 snap-align-none transition-all cursor-pointer border ${
                    isActive 
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/10' 
                      : 'bg-[var(--bg-surface)] border-[var(--border-light)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{ch.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. CORE INTERACTIVE WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* DESKTOP SIDEBAR NAVIGATION (Hides on mobile / screens < lg, and print) */}
        <div className="hidden lg:block lg:col-span-1 space-y-4 sticky top-6 self-start print:hidden">
          <div className="p-4 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl shadow-2xs">
            <h3 className="text-[10px] font-bold text-[var(--text-muted)] tracking-wider uppercase px-2 mb-4 flex items-center gap-1.5">
              <Book className="w-4 h-4 text-indigo-500" />
              สารบัญบทเรียนสารบรรณ
            </h3>
            
            <div className="space-y-1.5">
              {chapters.map((ch) => {
                const isActive = activeChapter === ch.id && !searchQuery;
                const ChapterIcon = ch.icon;
                return (
                  <button
                    key={ch.id}
                    onClick={() => {
                      setActiveChapter(ch.id);
                      setSearchQuery('');
                    }}
                    className={`w-full text-left px-3.5 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between gap-3 cursor-pointer ${
                      isActive 
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' 
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ChapterIcon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span className="truncate">{ch.title}</span>
                    </div>
                    <ChevronRight className={`w-4 h-4 shrink-0 opacity-70 transition-transform ${isActive ? 'translate-x-1' : ''}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick FAQ navigation shortcut */}
          <div className="p-4 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl shadow-2xs text-center space-y-3.5">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <HelpIcon className="w-5 h-5 animate-bounce" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-[var(--text-primary)]">ข้อคำถามพบบ่อย (FAQs)</h4>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                ไขข้อซักถามในการลงลายมือชื่อดิจิทัลและวิธีแก้ไขความหน่วงคิวส่งหนังสือ
              </p>
            </div>
            <a
              href="#faqs-section"
              className="inline-flex px-3.5 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-light)] text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
            >
              ข้ามไปดูตารางถาม-ตอบ
            </a>
          </div>
        </div>

        {/* RIGHT AREA: View Manual Contents */}
        <div className="lg:col-span-3 space-y-8">
          
          {/* SEARCH RESULTS MODE (Active when searchQuery is present) */}
          {searchQuery ? (
            <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-[var(--border-light)] pb-4">
                <div className="flex items-center gap-2">
                  <Search className="w-5 h-5 text-indigo-500" />
                  <h2 className="text-md font-bold text-[var(--text-primary)]">
                    ผลการค้นพบสำหรับ: <span className="text-indigo-600 dark:text-indigo-400">"{searchQuery}"</span>
                  </h2>
                </div>
                <div className="text-xs font-bold text-[var(--text-muted)]">
                  พบข้อมูล {filteredChapters.length} หมวดที่เกี่ยวข้อง
                </div>
              </div>

              {filteredChapters.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <div className="w-14 h-14 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto">
                    <AlertTriangle className="w-7 h-7" />
                  </div>
                  <div className="space-y-1 max-w-md mx-auto">
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">ไม่พบประโยคที่ตรงกับข้อมูลค้นหา</h3>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                      กรุณาลองเปลี่ยนคำค้นหาอื่น เช่น "AI" "ลงชื่อ" "ความลับ" "สิทธิ์" หรือใช้แถบทางเลือกขวาเพื่อเลือกอ่านบทเรียนราชการแบบแยกย่อย
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  {filteredChapters.map((ch) => {
                    const ChapterIcon = ch.icon;
                    return (
                      <div key={ch.id} className="border-b border-[var(--border-lighter)] last:border-0 pb-6 last:pb-0 space-y-4">
                        <div className="flex items-center gap-2.5">
                          <span className="p-1.5 bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 rounded-lg">
                            <ChapterIcon className="w-4 h-4" />
                          </span>
                          <h3 className="text-sm font-bold text-[var(--text-primary)]">{ch.title}</h3>
                        </div>

                        <div className="space-y-4 pl-0 sm:pl-8">
                          {ch.sections.map((sec, idx) => (
                            <div key={idx} className="bg-[var(--bg-canvas)] p-4 rounded-xl border border-[var(--border-lighter)] space-y-2">
                              <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{sec.title}</h4>
                              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{sec.content}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* STANDARD LAYOUT (Show active chapter & Sequential navigation) */
            <div className="space-y-8">
              
              {chapters.map((ch) => {
                const isCurrent = activeChapter === ch.id;
                const ChapterIcon = ch.icon;
                
                return (
                  <div 
                    key={ch.id} 
                    className={`
                      bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-5 sm:p-8 shadow-2xs space-y-6
                      print:block print:border-none print:shadow-none print:p-0 print:mb-12
                      ${isCurrent ? 'block animate-fadeIn' : 'hidden print:block'}
                    `}
                  >
                    {/* Chapter Title Block */}
                    <div className="flex items-center gap-3.5 border-b border-[var(--border-light)] pb-5 print:pb-2 print:border-black">
                      <span className="p-2.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl print:hidden">
                        <ChapterIcon className="w-5 h-5" />
                      </span>
                      <div className="space-y-1">
                        <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] font-sans print:text-black">
                          {ch.title}
                        </h2>
                        <p className="text-xs text-[var(--text-muted)] print:hidden">
                          {ch.description}
                        </p>
                      </div>
                    </div>

                    {/* TOP ILLUSTRATION EMBEDDED WITH STYLE */}
                    {ch.image && (
                      <div className="space-y-2.5 print:hidden">
                        <div className="overflow-hidden rounded-xl border border-[var(--border-lighter)] bg-[var(--bg-canvas)] max-h-56 sm:max-h-72">
                          <img 
                            src={ch.image} 
                            alt={ch.title}
                            className="w-full h-full object-cover hover:scale-[1.01] transition-transform duration-300"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)] font-bold pl-1">
                          <Info className="w-3.5 h-3.5 text-indigo-500" />
                          <span>{ch.imageCaption}</span>
                        </div>
                      </div>
                    )}

                    {/* INTERACTIVE WORKFLOW CHART DIAGRAMS (Added to increase beauty and usability) */}
                    {ch.id === 'intro' && (
                      <div className="p-4 bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-lighter)] space-y-3.5 print:hidden">
                        <h4 className="text-xs font-extrabold text-[var(--text-primary)] flex items-center gap-1.5">
                          <Terminal className="w-4 h-4 text-indigo-500" />
                          <span>โครงสร้างสิทธิ์การบริหารระบบและคลังเอกสาร</span>
                        </h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                          <div className="bg-[var(--bg-surface)] p-3 rounded-lg border border-[var(--border-light)] space-y-1 text-center">
                            <span className="text-2xl">⚙️</span>
                            <h5 className="text-[11px] font-extrabold text-[var(--text-primary)]">ผู้บริหารระบบสารบรรณ</h5>
                            <p className="text-[10px] text-[var(--text-muted)]">ควบคุมความเสถียร ตั้งคิวโครงสร้างพนักงาน จังหวัด-อำเภอ</p>
                          </div>
                          
                          <div className="bg-[var(--bg-surface)] p-3 rounded-lg border border-[var(--border-light)] space-y-1 text-center">
                            <span className="text-2xl">📋</span>
                            <h5 className="text-[11px] font-extrabold text-[var(--text-primary)]">หัวหน้ากลุ่มงาน (Moderator)</h5>
                            <p className="text-[10px] text-[var(--text-muted)]">กรองข้อมูลหนังสือราชการ ลงนาม ตรวจรับ และออกคิวส่งด่วน</p>
                          </div>

                          <div className="bg-[var(--bg-surface)] p-3 rounded-lg border border-[var(--border-light)] space-y-1 text-center">
                            <span className="text-2xl">👨‍💻</span>
                            <h5 className="text-[11px] font-extrabold text-[var(--text-primary)]">เจ้าหน้าที่ (User)</h5>
                            <p className="text-[10px] text-[var(--text-muted)]">ลงรับ บันทึกเสนอ ป้อนข้อมูลรายงาน ดึงรายงาน และขอออกเลข</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {ch.id === 'inbox' && (
                      <div className="p-4 bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-lighter)] space-y-3 print:hidden">
                        <h4 className="text-xs font-extrabold text-[var(--text-primary)]">
                          สายการเดินหนังสือราชการรับเข้า (Incident Doc Flow)
                        </h4>
                        
                        {/* Flowchart stepper */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-1">
                          <div className="w-full sm:w-1/4 bg-[var(--bg-surface)] p-2.5 rounded-lg border border-[var(--border-light)] text-center text-[10px] font-bold">
                            <div className="text-indigo-500 font-extrabold mb-0.5">1. บันทึกรับหนังสือ</div>
                            เจ้าหน้าที่สแกน & กรอกข้อมูลเรื่อง
                          </div>
                          <span className="hidden sm:block text-slate-400">➔</span>
                          <span className="sm:hidden text-slate-400">▼</span>

                          <div className="w-full sm:w-1/4 bg-[var(--bg-surface)] p-2.5 rounded-lg border border-[var(--border-light)] text-center text-[10px] font-bold">
                            <div className="text-indigo-500 font-extrabold mb-0.5">2. คัดกรอง / มอบงาน</div>
                            หัวหน้าฝ่ายกระจายสู่บุคคลรับผิดชอบ
                          </div>
                          <span className="hidden sm:block text-slate-400">➔</span>
                          <span className="sm:hidden text-slate-400">▼</span>

                          <div className="w-full sm:w-1/4 bg-[var(--bg-surface)] p-2.5 rounded-lg border border-[var(--border-light)] text-center text-[10px] font-bold">
                            <div className="text-indigo-500 font-extrabold mb-0.5">3. ตรวจดำเนินการ</div>
                            ผู้ปฏิบัติลงนามรับทราบ ติ๊กดำเนินการ
                          </div>
                          <span className="hidden sm:block text-slate-400">➔</span>
                          <span className="sm:hidden text-slate-400">▼</span>

                          <div className="w-full sm:w-1/4 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20 text-center text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            <div className="font-extrabold mb-0.5">4. ยุติสถานะและจัดแฟ้ม</div>
                            จัดเก็บหนังสือประวัติลงสารบรรณกลาง
                          </div>
                        </div>
                      </div>
                    )}

                    {ch.id === 'outbox' && (
                      <div className="p-4 bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-lighter)] space-y-3.5 print:hidden">
                        <h4 className="text-xs font-extrabold text-[var(--text-primary)]">
                          จำลองเอกสารส่งออกที่มีความน่าเชื่อถือสูง
                        </h4>
                        
                        <div className="bg-[var(--bg-surface)] p-4 rounded-xl border border-[var(--border-light)] space-y-3 max-w-md mx-auto shadow-2xs">
                          <div className="flex items-center justify-between border-b border-[var(--border-lighter)] pb-2.5">
                            <span className="text-[9px] font-extrabold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-md">
                              เลขเอกสารส่ง มท 0618.3/ว๑๐๙
                            </span>
                            <span className="text-[9px] font-bold text-slate-400">ปภ. จังหวัดระยอง</span>
                          </div>

                          <div className="text-center py-4 text-slate-300 dark:text-slate-600 font-serif">
                            ( ตราสัญลักษณ์ครุฑ 3 ซม. )
                          </div>

                          <div className="flex items-end justify-between text-[9px] border-t border-[var(--border-lighter)] pt-2.5">
                            <div className="space-y-1 text-slate-400">
                              <p>รับรองด้วยลายเซ็นอิเล็กทรอนิกส์</p>
                              <p className="font-mono text-[8px]">Hash ID: 7a83bf...324d</p>
                            </div>
                            <div className="text-center">
                              <div className="w-9 h-9 bg-slate-200 dark:bg-slate-700 flex items-center justify-center rounded-xs mx-auto mb-1 text-[8px] font-mono">
                                [ QR ]
                              </div>
                              <span className="text-[8px] text-[var(--text-muted)] font-bold">สแกนตรวจสอบ</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {ch.id === 'draft_ai' && (
                      <div className="p-4 bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-lighter)] space-y-3 print:hidden">
                        <h4 className="text-xs font-extrabold text-[var(--text-primary)]">
                          หน้าต่างจำลองระบบประมวลคำสั่ง AI ช่วยยกร่างจดหมายราชการ
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Prompt Input Block */}
                          <div className="bg-[var(--bg-surface)] p-3.5 rounded-lg border border-[var(--border-light)] space-y-2.5">
                            <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-indigo-500">
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>ป้อนความต้องการแก่ AI</span>
                            </div>
                            <div className="p-2.5 bg-[var(--bg-canvas)] text-[10px] text-[var(--text-primary)] rounded-lg font-bold leading-normal min-h-[48px] border border-[var(--border-lighter)]">
                              "ช่วยเขียนร่างหนังสือด่วนที่สุด ชี้แจงซ้อมแผนป้องกันภัยสึนามิตำบลเพ อำเภอเมืองระยอง"
                            </div>
                            <div className="text-right">
                              <span className="text-[9px] bg-indigo-600 text-white font-extrabold px-2.5 py-1 rounded-md">ประมวลผลทันที ➔</span>
                            </div>
                          </div>

                          {/* AI Generated output Block */}
                          <div className="bg-[var(--bg-surface)] p-3.5 rounded-lg border border-[var(--border-light)] space-y-2 relative overflow-hidden">
                            <div className="absolute top-2 right-2 flex items-center gap-1 text-[8px] font-extrabold bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded-sm">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              <span>สำเร็จโดย Gemini</span>
                            </div>
                            <span className="block text-[10px] font-extrabold text-emerald-600">จดหมายราชการส่งร่างด่วนที่สุด</span>
                            <div className="text-[9px] text-[var(--text-secondary)] leading-relaxed space-y-1.5 font-sans pt-1 border-t border-[var(--border-lighter)]">
                              <p className="font-bold">เรื่อง: ขอเชิญร่วมซักซ้อมแผนป้องกันภัยสึนามิในเขตภัยพิบัติ</p>
                              <p>เรียน: ผู้ใหญ่บ้าน และผู้นำชุมชนในเขตเทศบาลตำบลเพ...</p>
                              <p>ด้วย สำนักงานป้องกันและบรรเทาสาธารณภัยระยอง กำหนดให้จัดการซ้อมฯ...</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {ch.id === 'disaster_report' && (
                      <div className="p-4 bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-lighter)] space-y-3 print:hidden">
                        <h4 className="text-xs font-extrabold text-[var(--text-primary)]">
                          ขั้นตอนการดึงข้อมูลเหตุภัยพิบัติ สู่จดหมายรายงานเบื้องต้น
                        </h4>
                        
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-2">
                          <div className="bg-[var(--bg-surface)] p-3 rounded-xl border border-[var(--border-light)] text-center w-full sm:w-1/3">
                            <div className="text-lg mb-1">🚨</div>
                            <h5 className="text-[10px] font-extrabold text-[var(--text-primary)]">1. กรอกฟอร์มข้อมูลเหตุ</h5>
                            <p className="text-[8px] text-[var(--text-muted)] mt-0.5">ระบุพิกัดภัย ปริมาณ และความต้องการช่วยเหลือด่วน</p>
                          </div>
                          
                          <span className="text-slate-400 transform rotate-90 sm:rotate-0">➔</span>

                          <div className="bg-[var(--bg-surface)] p-3 rounded-xl border border-[var(--border-light)] text-center w-full sm:w-1/3">
                            <div className="text-lg mb-1">✍️</div>
                            <h5 className="text-[10px] font-extrabold text-[var(--text-primary)]">2. แปลงร่างหนังสือ</h5>
                            <p className="text-[8px] text-[var(--text-muted)] mt-0.5">ระบบจะดึงตัวแปรและจัดเข้าบันทึกข้อความเสนอรายงาน</p>
                          </div>

                          <span className="text-slate-400 transform rotate-90 sm:rotate-0">➔</span>

                          <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 text-center w-full sm:w-1/3 text-emerald-600 dark:text-emerald-400">
                            <div className="text-lg mb-1">📬</div>
                            <h5 className="text-[10px] font-extrabold">3. เสนออนุมัติ</h5>
                            <p className="text-[8px] text-emerald-700 dark:text-emerald-500 mt-0.5">ส่งเข้าระบบร่างเตรียมลงลายมือชื่อดิจิทัลได้ทันที</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Chapter Sections Loop */}
                    <div className="space-y-6">
                      {ch.sections.map((sec, idx) => (
                        <div key={idx} className="space-y-3.5 print:break-inside-avoid">
                          <h3 className="text-xs sm:text-sm font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2 print:text-black print:text-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 print:bg-black shrink-0" />
                            {sec.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed pl-3.5 print:text-black print:text-xs">
                            {sec.content}
                          </p>

                          {/* Render Bullet lists if exists */}
                          {sec.bulletList && (
                            <ul className="space-y-3 pl-7 mt-3">
                              {sec.bulletList.map((item, bIdx) => {
                                const parts = item.split(':');
                                return (
                                  <li key={bIdx} className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed list-disc">
                                    {parts.length > 1 ? (
                                      <span>
                                        <strong className="text-[var(--text-primary)] font-extrabold">{parts[0]}:</strong>
                                        {parts.slice(1).join(':')}
                                      </span>
                                    ) : (
                                      item
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          )}

                          {/* Render Badge List */}
                          {sec.badgeList && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-3.5 pt-3">
                              {sec.badgeList.map((badge, bIdx) => (
                                <div key={bIdx} className="p-4 bg-[var(--bg-canvas)] border border-[var(--border-lighter)] rounded-xl space-y-2 shadow-3xs hover:border-indigo-500/20 transition-all print:border-slate-300">
                                  <div className="inline-block text-[9px] font-extrabold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-md print:border print:text-black">
                                    {badge.label}
                                  </div>
                                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                                    {badge.desc}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* PAGINATION: PREV / NEXT NAV BUTTONS (Hides on print) */}
                    <div className="flex items-center justify-between border-t border-[var(--border-light)] pt-5 mt-8 print:hidden">
                      <button
                        type="button"
                        disabled={currentChapterIndex === 0}
                        onClick={handlePrevChapter}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold text-[var(--text-secondary)] bg-[var(--bg-elevated)] border border-[var(--border-light)] disabled:opacity-40 transition-opacity flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed hover:text-[var(--text-primary)]"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        ย้อนกลับบทก่อนหน้า
                      </button>

                      <button
                        type="button"
                        disabled={currentChapterIndex === chapters.length - 1}
                        onClick={handleNextChapter}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 transition-colors flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                      >
                        บทถัดไป
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

          {/* 5. INTERACTIVE WORKFLOW TUTORIAL WIZARD */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-5 sm:p-7 shadow-xs space-y-6 print:hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-light)] pb-4.5">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  <UserCheck className="w-4 h-4" />
                  <span>โปรแกรมจำลองสอนระบบการทำงานสารบรรณ (Interactive Guide Tour)</span>
                </div>
                <h3 className="text-md sm:text-base font-bold text-[var(--text-primary)]">
                  เรียนรู้ขั้นตอนระบบอย่างละเอียดยิบ ทีละหัวข้อหลัก
                </h3>
              </div>

              {/* Tour Option Buttons */}
              <div className="flex gap-1.5 bg-[var(--bg-elevated)] p-1 rounded-xl border border-[var(--border-light)] self-start sm:self-auto">
                <button
                  onClick={() => handleStartTour('receive')}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-lg cursor-pointer transition-all ${selectedTour === 'receive' ? 'bg-indigo-600 text-white shadow-xs' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                  ขั้นตอนรับจดหมาย
                </button>
                <button
                  onClick={() => handleStartTour('draft_ai')}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-lg cursor-pointer transition-all ${selectedTour === 'draft_ai' ? 'bg-indigo-600 text-white shadow-xs' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                  ยกร่างด้วย AI
                </button>
                <button
                  onClick={() => handleStartTour('sign')}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-lg cursor-pointer transition-all ${selectedTour === 'sign' ? 'bg-indigo-600 text-white shadow-xs' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                  ลงชื่ออนุมัติ
                </button>
              </div>
            </div>

            {/* Stepper Wizard Display */}
            <div className="bg-[var(--bg-canvas)] rounded-2xl border border-[var(--border-lighter)] p-4 sm:p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
              
              {/* Steppers Steps timeline */}
              <div className="md:col-span-1 flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible gap-2 pb-2 md:pb-0 scrollbar-none">
                {activeTourSteps.map((step, idx) => (
                  <button
                    key={idx}
                    onClick={() => setTourStep(idx)}
                    className={`p-3.5 rounded-xl text-left text-[11px] font-bold border transition-all shrink-0 md:shrink-1 cursor-pointer w-32 md:w-full ${
                      tourStep === idx
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-xs'
                        : 'bg-[var(--bg-surface)] border-[var(--border-light)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
                    }`}
                  >
                    <span className="block opacity-75 text-[9px] uppercase tracking-wide">ขั้นตอนที่ {idx + 1}</span>
                    <span className="block mt-0.5 truncate">{step.step.split('. ')[1]}</span>
                  </button>
                ))}
              </div>

              {/* Display Information box */}
              <div className="md:col-span-3 bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border-light)] flex flex-col justify-between space-y-6">
                <div className="space-y-3">
                  <div className="inline-block px-2.5 py-1 text-[10px] font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 rounded-md">
                    {activeTourSteps[tourStep].step}
                  </div>
                  <p className="text-xs sm:text-sm text-[var(--text-primary)] leading-relaxed">
                    {activeTourSteps[tourStep].text}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-[var(--border-lighter)] pt-4">
                  <button
                    disabled={tourStep === 0}
                    onClick={() => setTourStep(prev => Math.max(0, prev - 1))}
                    className="px-3.5 py-2 text-xs font-bold rounded-lg bg-[var(--bg-elevated)] text-[var(--text-secondary)] disabled:opacity-40 transition-opacity cursor-pointer disabled:cursor-not-allowed border border-[var(--border-light)]"
                  >
                    ขั้นตอนก่อนหน้า
                  </button>

                  <span className="text-xs text-[var(--text-muted)] font-bold">
                    หน้า {tourStep + 1} / {activeTourSteps.length}
                  </span>

                  {tourStep < activeTourSteps.length - 1 ? (
                    <button
                      onClick={() => setTourStep(prev => prev + 1)}
                      className="px-4 py-2 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors cursor-pointer"
                    >
                      ขั้นตอนถัดไป
                    </button>
                  ) : (
                    <button
                      onClick={() => setTourStep(0)}
                      className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      จบทัวร์/เริ่มใหม่
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* 6. COLLAPSIBLE ACCORDION FOR FAQs */}
          <div id="faqs-section" className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-5 sm:p-8 shadow-2xs space-y-6 print:break-inside-avoid">
            <div className="flex items-center gap-3 border-b border-[var(--border-light)] pb-5 print:pb-2 print:border-black">
              <span className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl print:hidden">
                <HelpIcon className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)] print:text-black">
                  คำถามที่พบบ่อย (FAQs) & แนวทางแก้ปัญหาด่วน
                </h3>
                <p className="text-xs text-[var(--text-muted)] print:hidden">
                  ตอบคำถามที่พบบ่อยเกี่ยวกับการออกเลขสารบรรณและใบอนุมัติดิจิทัล
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div 
                    key={idx} 
                    className="border border-[var(--border-medium)] rounded-xl overflow-hidden bg-[var(--bg-canvas)] transition-all duration-200 print:border-none print:shadow-none print:bg-white print:mb-4"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer print:p-0 print:hover:bg-transparent print:text-black"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-5.5 h-5.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold text-[10px] flex items-center justify-center shrink-0 print:border print:text-black">
                          Q
                        </span>
                        <span className="leading-snug">{faq.q}</span>
                      </div>
                      <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-200 print:hidden ${isOpen ? 'rotate-180 text-emerald-600' : 'text-slate-400'}`} />
                    </button>

                    <div 
                      className={`
                        transition-all duration-200 overflow-hidden
                        print:block print:max-h-full print:opacity-100
                        ${isOpen ? 'max-h-[350px] opacity-100 border-t border-[var(--border-lighter)]' : 'max-h-0 opacity-0'}
                      `}
                    >
                      <div className="p-4 sm:p-5 bg-[var(--bg-surface)] text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed flex gap-3 print:p-0 print:mt-1.5 print:bg-transparent print:text-black">
                        <span className="w-5.5 h-5.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-extrabold text-[10px] flex items-center justify-center shrink-0 print:border print:text-black print:bg-transparent">
                          A
                        </span>
                        <p className="flex-1 leading-relaxed">{faq.a}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 7. SECURE SUPPORT & CONTACT CARDS (Hides on print) */}
          <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden print:hidden shadow-lg">
            {/* Background absolute decor elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-2xl transform translate-x-20 -translate-y-16 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-xl transform -translate-x-10 translate-y-10 pointer-events-none" />

            <div className="space-y-4 relative z-10">
              <span className="inline-block px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] font-extrabold tracking-wider uppercase">
                ศูนย์ช่วยเหลือด้านเทคนิค ปภ.ระยอง (Technical Assistance Service Desk)
              </span>
              
              <div className="space-y-1.5">
                <h3 className="text-base sm:text-lg font-bold font-sans">
                  ต้องการคำอธิบายเพิ่มเติม หรือรายงานบั๊กของแอปพลิเคชัน?
                </h3>
                <p className="text-xs sm:text-sm text-white/80 max-w-2xl leading-relaxed">
                  หากท่านประสบปัญหาระหว่างเซ็นชื่อดิจิทัล, บัญชีผู้ปฏิบัติไม่มีสิทธิ์เปิดฟีเจอร์, หรือต้องการแก้ไขข้อมูลฝ่ายงานในจังหวัดระยอง ฝ่ายเทคโนโลยีและงานยุทธศาสตร์ ยินดีบริการและให้คำปรึกษาตลอดเวลาทำงานราชการ
                </p>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-x-8 gap-y-3.5 pt-4.5 border-t border-white/15 text-xs text-white/90">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
                  <span>เบอร์สำนักงานหลัก: <strong>038694129</strong> (ฝ่ายป้องกันและปฏิบัติการ)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="opacity-75">ส่งเมล์ตรง:</span>
                  <strong className="underline decoration-indigo-300">rayong@disaster.go.th</strong>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
