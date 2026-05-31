import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Plus, Trash2, Printer, ChevronLeft, Save, FileSpreadsheet, Edit3, ArrowRight } from 'lucide-react';

interface ExpenseItem {
  id: string; // unique row id
  serialNum: number; // sequence index
  description: string; // اخراجات کی تفصیل
  natureOfWork: string; // کام کی نوعیت
  wage: string | number; // اجرت (rate or text)
  total: number; // میزان (line total)
}

interface CenterExpenses {
  centerId: string;
  year: string;
  supervisorName: string; // e.g. "مولانا عبد المستعان صاحب"
  items: ExpenseItem[];
}

interface ExpensesViewProps {
  activeYear: string;
  branches: any[];
  animals: any[];
  activeBranchObj: any;
  isSuperAdmin: boolean;
  centerExpensesList: CenterExpenses[];
  setCenterExpensesList: React.Dispatch<React.SetStateAction<CenterExpenses[]>>;
}

export const toUrduDigits = (numStr: string | number): string => {
  const urduMap = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(numStr).replace(/\d/g, (d) => urduMap[parseInt(d)]);
};

export const getIslamicYear = (engYearStr: string): string => {
  const engYear = parseInt(engYearStr);
  if (!isNaN(engYear)) {
    const hijri = engYear - 579;
    return toUrduDigits(hijri) + 'ھ';
  }
  return '۱۴۴۷ھ';
};

export default function ExpensesView({
  activeYear,
  branches,
  animals,
  activeBranchObj,
  isSuperAdmin,
  centerExpensesList,
  setCenterExpensesList
}: ExpensesViewProps) {
  // Determine if the current user has central/consoldiated dashboard authorization
  const isCentralAdmin = useMemo(() => {
    return isSuperAdmin || activeBranchObj?.id === 'jauhar_nazim' || activeBranchObj?.id === 'gulshan_nazim';
  }, [isSuperAdmin, activeBranchObj]);

  // All active centers except markaz_e_ala
  const centers = useMemo(() => {
    const list: { id: string; label: string }[] = [];
    const seen = new Set<string>();
    branches.forEach(b => {
      if (b.centerId && b.centerId !== 'markaz_e_ala' && !seen.has(b.centerId)) {
        seen.add(b.centerId);
        list.push({ id: b.centerId, label: b.centerLabel });
      }
    });
    return list;
  }, [branches]);

  // Which center are we currently viewing/editing?
  // If central admin, they default to list view. Else, Nazims directly go to their own center.
  const myCenterId = activeBranchObj?.centerId || 'jauhar';
  const [selectedCenterId, setSelectedCenterId] = useState<string | null>(() => {
    if (isCentralAdmin) return null; // opens consolidated list first
    return myCenterId;
  });

  // State to toggle between feeding (editing) and non-editable drill-down report view
  const [isEditing, setIsEditing] = useState<boolean>(() => {
    // Nazim can edit by default. Central Admin is usually in read-only drilldown unless editing their own
    if (!isCentralAdmin) return true;
    return false;
  });

  // Map center IDs to standard romantic default Nazim/Supervisor names
  const getDefaultSupervisorName = (cId: string): string => {
    const nazimBranch = branches.find(b => b.centerId === cId && b.role === 'nazim');
    if (nazimBranch && nazimBranch.label !== 'ناظم مدرسہ' && nazimBranch.label !== 'ناظمِ شاخ کلاں') {
      return `ناظم ${nazimBranch.centerLabel} ${nazimBranch.label}`;
    }
    // Static fallbacks
    if (cId === 'korangi') return 'ناظم کورنگی مولانا عبد المستعان صاحب';
    if (cId === 'landhi') return 'ناظم لانڈھی مولانا قاری نور الامین صاحب';
    if (cId === 'qayyumabad') return 'ناظم قیوم آباد مولانا قاری صابر صاحب';
    if (cId === 'gulshan') return 'ناظم گلشن قاری سلیم اللہ صاحب';
    if (cId === 'jauhar') return 'ناظم جوہر قاری محمد نوید صاحب';
    return 'ناظمِ شاخ محترم';
  };

  // Booked animals count for a specific center
  const getBookedAnimalsCount = (cId: string): number => {
    const centerBranchIds = branches.filter(b => b.centerId === cId).map(b => b.id);
    return animals.filter(a => 
      a.shares.some(s => s.isPaid && s.paidByBranchId && centerBranchIds.includes(s.paidByBranchId))
    ).length;
  };

  // Get active editing center object
  const targetCenterId = selectedCenterId || myCenterId;
  const bookedAnimals = useMemo(() => getBookedAnimalsCount(targetCenterId), [targetCenterId, animals, branches]);

  // Standard initial expense template items
  const getInitialExpenseRows = (count: number): ExpenseItem[] => [
    {
      id: 'r_1',
      serialNum: 1,
      description: `قصائی اجرت ${count} جانور`,
      natureOfWork: 'ذبح و کٹائی',
      wage: 7000,
      total: count * 7000
    },
    {
      id: 'r_2',
      serialNum: 2,
      description: 'چارہ، بھوسہ وغیرہ ابتدائی دو دن',
      natureOfWork: '...',
      wage: '...',
      total: 10000
    },
    {
      id: 'r_3',
      serialNum: 3,
      description: 'تواضع، چائے، کھانا، ناشتہ، شربت، پان وغیرہ',
      natureOfWork: '۲ دن',
      wage: '...',
      total: 30000
    },
    {
      id: 'r_4',
      serialNum: 4,
      description: 'آمد و رفت رقوم بعد قربانی اور موبائل خرچ',
      natureOfWork: 'کئی بار',
      wage: '...',
      total: 6000
    },
    {
      id: 'r_5',
      serialNum: 5,
      description: 'شامیانہ ۴ عدد، کرسیان ۳۰ عدد، ٹیبلیں ۴ عدد کور سمیت، قنات ۳ عدد، پنکھے ۳ عدد کرایہ سمیت',
      natureOfWork: '۲ دن',
      wage: '...',
      total: 32420
    },
    {
      id: 'r_6',
      serialNum: 6,
      description: 'آجائشیں اٹھانے کی اجرت (برائے صفائی)',
      natureOfWork: '...',
      wage: '...',
      total: 4000
    },
    {
      id: 'r_7',
      serialNum: 7,
      description: 'قربانی اور کھالوں کی جگہ پر روشنی کا انتظام کیا گیا',
      natureOfWork: '...',
      wage: '...',
      total: 2000
    },
    {
      id: 'r_8',
      serialNum: 8,
      description: 'کھالیں جمع کرنے والے افراد کا ناشتہ، موٹر سائیکل پٹرول اور یومیہ خرچہ',
      natureOfWork: '...',
      wage: '...',
      total: 7800
    },
    {
      id: 'r_9',
      serialNum: 9,
      description: 'چھریاں ۲ عدد اور مڈھی ایک عدد',
      natureOfWork: '...',
      wage: '...',
      total: 3300
    },
    {
      id: 'r_10',
      serialNum: 10,
      description: 'کولڈ ڈرنک (جمبو)، سلائس جوس',
      natureOfWork: 'کل چار پیک',
      wage: '...',
      total: 2820
    },
    {
      id: 'r_11',
      serialNum: 11,
      description: 'شاپر 12x16, 24x36',
      natureOfWork: '7 کلو',
      wage: '...',
      total: 2150
    },
    {
      id: 'r_12',
      serialNum: 12,
      description: 'سیمنٹ بوری برائے فرش مرمت',
      natureOfWork: '...',
      wage: '...',
      total: 1000
    }
  ];

  // Retrieve existing record or build transient state
  const centerRecord = useMemo(() => {
    const existing = centerExpensesList.find(e => e.centerId === targetCenterId && e.year === activeYear);
    if (existing) return existing;
    return {
      centerId: targetCenterId,
      year: activeYear,
      supervisorName: getDefaultSupervisorName(targetCenterId),
      items: getInitialExpenseRows(bookedAnimals)
    };
  }, [centerExpensesList, targetCenterId, activeYear, bookedAnimals]);

  // Transient local edit states to verify before saving
  const [supervisorName, setSupervisorName] = useState(centerRecord.supervisorName);
  const [items, setItems] = useState<ExpenseItem[]>(centerRecord.items);

  // Sync state if center record or booked animals changes
  React.useEffect(() => {
    setSupervisorName(centerRecord.supervisorName);
    // If the record was just generated transiently, customize its butcher description dynamically to reflect correct animal list
    const updatedItems = centerRecord.items.map((item, idx) => {
      if (idx === 0) {
        return {
          ...item,
          description: `قصائی اجرت ${bookedAnimals} جانور`,
          total: bookedAnimals * (Number(item.wage) || 7000)
        };
      }
      return item;
    });
    setItems(updatedItems);
  }, [centerRecord, bookedAnimals]);

  // Dynamic values helper
  const grandTotal = useMemo(() => {
    return items.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
  }, [items]);

  // Handle changing inputs inside rows dynamically
  const handleRowChange = (id: string, field: keyof ExpenseItem, value: any) => {
    setItems(prev => prev.map((item, idx) => {
      if (item.id !== id) return item;

      const updated = { ...item, [field]: value };

      // Butcher special handling trigger
      if (idx === 0) {
        if (field === 'wage') {
          const wageNum = Number(value) || 0;
          updated.total = bookedAnimals * wageNum;
        }
      } else {
        if (field === 'wage' && !isNaN(Number(value))) {
          // If they typed a numeric rate, multiply we can set total as rate * count, else let total edit
          updated.total = Number(value) || 0;
        } else if (field === 'total') {
          updated.total = Number(value) || 0;
        }
      }
      return updated;
    }));
  };

  // Add empty row
  const addRow = () => {
    setItems(prev => {
      const nextSerial = prev.length + 1;
      const newRow: ExpenseItem = {
        id: `custom_${Date.now()}_${Math.random()}`,
        serialNum: nextSerial,
        description: '',
        natureOfWork: '...',
        wage: '...',
        total: 1000
      };
      return [...prev, newRow];
    });
  };

  // Delete row
  const deleteRow = (id: string) => {
    setItems(prev => {
      const filtered = prev.filter(item => item.id !== id);
      // Re-index serialNum
      return filtered.map((item, index) => ({
        ...item,
        serialNum: index + 1
      }));
    });
  };

  // Save the modified record to global system list
  const saveRecord = () => {
    const finalRecord: CenterExpenses = {
      centerId: targetCenterId,
      year: activeYear,
      supervisorName: supervisorName.trim() || getDefaultSupervisorName(targetCenterId),
      items: items.map((item, idx) => {
        if (idx === 0) {
          return {
            ...item,
            description: `قصائی اجرت ${bookedAnimals} جانور`,
            total: bookedAnimals * (Number(item.wage) || 0)
          };
        }
        return item;
      })
    };

    setCenterExpensesList(prev => {
      const filtered = prev.filter(e => !(e.centerId === targetCenterId && e.year === activeYear));
      return [...filtered, finalRecord];
    });

    alert('اخراجات کا ریکارڈ کامیابی سے محفوظ کر لیا گیا ہے!');
    if (isCentralAdmin) {
      setIsEditing(false); // return to read-only drilldown view
    }
  };

  // Reset to default template values
  const handleResetToDefaults = () => {
    if (confirm('کیا آپ واقعی اس شاخ کے اخراجات کو ابتدائی مینوئل فارمیٹ پر بحال کرنا چاہتے ہیں؟ موجودہ تبدیلیاں ختم ہو جائیں گی۔')) {
      setItems(getInitialExpenseRows(bookedAnimals));
    }
  };

  // Get center-specific totals for the consolidated panel
  const getCenterExpensesSum = (cId: string): number => {
    const found = centerExpensesList.find(e => e.centerId === cId && e.year === activeYear);
    if (found) {
      return found.items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
    }
    // calculate default total if none entered
    const defaultAnimals = getBookedAnimalsCount(cId);
    return getInitialExpenseRows(defaultAnimals).reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  };

  // Perfect A4 Printing Trigger
  const triggerPrintReceipt = () => {
    const printableArea = document.getElementById('a4-printable-costs');
    if (!printableArea) return;

    const styleContent = `
      @media print {
        @page {
          size: A4 portrait;
          margin: 15mm;
        }
        body {
          direction: rtl !important;
          background: #ffffff !important;
          color: #000000 !important;
          font-family: "Alvi Lahori Nastaleeq", "Jameel Noori Nastaliq", "Mehr Nastaliq Urdu", "Noto Nastaliq Urdu", "Noto Sans Arabic", serif !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .no-print {
          display: none !important;
        }
        .print-only {
          display: block !important;
        }
        .print-border-double {
          border: 4px double #000000 !important;
          padding: 24px !important;
        }
      }
    `;

    // Create a headless print frame
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <html>
          <head>
            <title>اخراجات رپورٹ - ${activeYear}</title>
            <style>
              ${styleContent}
              tr, td, th {
                border: 1px solid #000000 !important;
                padding: 8px !important;
                text-align: right !important;
              }
              table {
                width: 100% !important;
                border-collapse: collapse !important;
                margin-top: 16px !important;
              }
              .center-label-badge {
                border: 1px solid #000000;
                padding: 2px 8px;
                font-size: 11px;
                font-weight: bold;
              }
            </style>
          </head>
          <body dir="rtl" style="margin:0; padding:10px;">
            <div class="print-border-double" style="direction: rtl; text-align: right;">
              ${printableArea.innerHTML}
            </div>
            <script>
              window.onload = function() {
                window.print();
                setTimeout(() => {
                  window.parent.document.body.removeChild(window.frameElement);
                }, 500);
              };
            </script>
          </body>
        </html>
      `);
      doc.close();
    }
  };

  // If central admin and hasn't highlighted a specific center, display the 3-column consolidated ledger board!
  if (isCentralAdmin && selectedCenterId === null) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-900 rounded-3xl p-6 lg:p-8 text-white border border-slate-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-right">
            <h3 className="text-xl md:text-2xl font-black font-sans text-amber-400">تمام شاخوں کے اجتماعی اخراجات کا ریکارڈ</h3>
            <p className="text-xs text-slate-350 font-bold max-w-xl">
              یہاں سے تمام تفویض کردہ مراکز کے مالیاتی میزانیہ، بک شدہ کل قصائی اور متفرق اخراجات کے اعداد و شمار کا موازنہ اور مشاہدہ کریں۔
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Quick action to allow Central Nazim to jump to their own edit pane easily */}
            <button
              onClick={() => {
                setSelectedCenterId(myCenterId);
                setIsEditing(true);
              }}
              className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg transition-all"
            >
              <Edit3 size={16} />
              <span>اپنے مَرکز ({activeBranchObj.centerLabel}) کے اخراجات درج کریں</span>
            </button>
          </div>
        </div>

        {/* 3 Column Consolidated Grid Table */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h4 className="font-extrabold text-slate-800 text-sm">شاخ وار مجموعی بجٹ و اخراجات (سال {activeYear})</h4>
            <span className="text-[10px] text-slate-400 font-bold">تمام فعال مراکز پر تبادلہ کیلئے کلک کریں</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 font-black text-slate-500">
                  <th className="py-4 px-6 text-center w-24">نمبر شمار</th>
                  <th className="py-4 px-6 text-right">علاقہ / شاخ</th>
                  <th className="py-4 px-6 text-left w-52">اخراجات کا گرانڈ ٹوٹل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                {centers.map((center, index) => {
                  const centerSum = getCenterExpensesSum(center.id);
                  return (
                    <tr
                      key={center.id}
                      onClick={() => {
                        setSelectedCenterId(center.id);
                        setIsEditing(false); // open view only display drill down
                      }}
                      className="hover:bg-slate-50 cursor-pointer transition-colors group"
                    >
                      <td className="py-4 px-6 text-center font-mono text-slate-400 group-hover:text-amber-600 transition-colors">
                        {toUrduDigits(index + 1)}
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-slate-900 font-extrabold block text-sm group-hover:text-amber-600 transition-colors">
                          {center.label}
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          کُل رجسٹرڈ جانور: {toUrduDigits(getBookedAnimalsCount(center.id))} گائے
                        </span>
                      </td>
                      <td className="py-4 px-6 text-left font-mono font-black text-emerald-600 text-sm group-hover:scale-[1.01] transition-all">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-[10px] text-slate-400 font-black font-sans group-hover:translate-x-[-4px] transition-transform">تفصیل دیکھیں ←</span>
                          <span>{toUrduDigits(centerSum.toLocaleString('ur-PK'))} روپے</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Individual Center Details Screen (Editable dynamic Excel Grid or read-only display + printing)
  const viewCenterLabel = branches.find(b => b.centerId === targetCenterId)?.centerLabel || 'مرکز';

  return (
    <div className="space-y-6">
      {/* Upper Navigation & State Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          {isCentralAdmin && (
            <button
              onClick={() => setSelectedCenterId(null)}
              className="p-2 hover:bg-slate-100 rounded-xl border border-slate-100 text-slate-500 flex items-center justify-center transition-all bg-white"
              title="واپس Consolidated فہرست پر جائیں"
            >
              <ChevronLeft size={20} className="rotate-180" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
              <h3 className="font-black text-slate-800 text-base">{viewCenterLabel} کے اخراجات کا تفصیلی چارت</h3>
            </div>
            <p className="text-[10px] text-slate-400 font-bold block mt-0.5">
              قربانی سیشن: {toUrduDigits(activeYear)}ء — اسلامی سال: {getIslamicYear(activeYear)} (ڈیٹا فیڈ اور پرنٹ آؤٹ پیج)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isEditing ? (
            <>
              <button
                onClick={saveRecord}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-2 shadow transition-all"
              >
                <Save size={15} />
                <span>ریکارڈ محفوظ کریں</span>
              </button>
              <button
                onClick={handleResetToDefaults}
                className="px-4 py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-extrabold text-xs transition-all"
              >
                ری سیٹ کریں
              </button>
            </>
          ) : (
            // Only allow editing if user is Korangi Nazim on their own center, OR Central Admin on their own center
            (activeBranchObj?.centerId === targetCenterId && activeBranchObj?.role === 'nazim') && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs flex items-center gap-2 shadow transition-all"
              >
                <Edit3 size={15} />
                <span>ایڈٹ کریں / ڈیٹا فیڈ کریں</span>
              </button>
            )
          )}

          <button
            onClick={triggerPrintReceipt}
            className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs flex items-center gap-2 shadow transition-all"
          >
            <Printer size={15} />
            <span>رپورٹ پرنٹ کریں (A4)</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* EDITABLE INPUT INTERFACE */}
        {isEditing && (
          <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h4 className="font-extrabold text-slate-800 text-sm">ڈیٹا فیڈنگ کنٹرول پینل</h4>
              <p className="text-[10px] text-slate-400 font-bold mt-1">
                یہاں سے نگرانِ شاخ کا نام اور دیگر متفرق اخراجات درج فرما کر محفوظ کا بٹن دبائیں۔
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10.5px] font-black text-slate-500 block mb-1.5 label-required">
                  نگرانِ شاخ کا نام مَع علاقہ (ڈائنامک):
                </label>
                <input
                  type="text"
                  value={supervisorName}
                  onChange={(e) => setSupervisorName(e.target.value)}
                  placeholder="مثال: ناظم کورنگی 6مولانا عبد المستعان صاحب"
                  className="w-full text-xs font-bold border border-slate-200 px-3 py-2.5 rounded-xl outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[10.5px] font-black text-slate-500 block mb-1">
                  کُل فعال بک شدہ جانور (شاخ وار):
                </label>
                <div className="bg-amber-50/50 border border-amber-100 px-3 py-2 rounded-xl text-xs font-black text-amber-800 font-sans flex justify-between items-center">
                  <span>میزان جانور:</span>
                  <span className="font-mono text-sm">{bookedAnimals} جانور</span>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/50 text-[10.5px] text-slate-500 leading-relaxed font-semibold">
                🟢 <strong>قصائی اجرت (فارمولا):</strong> پہلی رو کی اجرت رقم کو بک شدہ جانوروں سے ضرب دیا جاتا ہے۔ مثال کے طور پر اگر اجرت ۷۰۰۰ روپے ہے تو میزان خودکار طریقے پر (<strong>{toUrduDigits(bookedAnimals)} × ۷۰۰۰ = {toUrduDigits((bookedAnimals * 7000).toLocaleString('ur-PK'))}</strong>) بنے گی۔
              </div>

              <button
                onClick={addRow}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold font-sans text-xs flex items-center justify-center gap-2 border border-slate-200 transition-all shadow-sm"
              >
                <Plus size={16} />
                <span>نیا خرچہ رو شامل کریں +</span>
              </button>
            </div>
          </div>
        )}

        {/* PRINTABLE A4 PREVIEW WORKSPACE */}
        <div className={`${isEditing ? 'lg:col-span-8' : 'lg:col-span-12'} bg-slate-50/20 rounded-3xl border border-slate-200 p-4 md:p-8 flex justify-center`}>
          <div
            id="a4-printable-costs"
            dir="rtl"
            className="w-full max-w-[760px] bg-white border-2 border-slate-200 shadow-md rounded-2xl p-6 md:p-12 space-y-6 text-right selection:bg-amber-100 print-border-double"
            style={{ fontFamily: 'var(--font-urdu)' }}
          >
            {/* Headers exactly as photo */}
            <div className="text-center space-y-1 border-b-2 border-black pb-4">
              <h2 className="text-lg md:text-xl font-bold leading-normal text-black font-sans">
                اجتماعی قربانی مدرسہ قاسم العلوم {activeBranchObj?.centerId === targetCenterId ? activeBranchObj?.centerLabel : viewCenterLabel} شاخ جامعہ اشرف المدارس {getIslamicYear(activeYear)}ء {toUrduDigits(activeYear)}ء
              </h2>
              <p className="text-[11px] md:text-xs font-bold text-black font-sans leading-normal">
                زیر سرپرستی: حضرت اقدس عارف باللہ شاہ مولانا حکیم محمد مظہر صاحب دامت برکاتہم
              </p>
              <p className="text-[11px] md:text-xs font-bold text-black font-sans leading-normal">
                نگرانِ اعلیٰ: حضرت مولانا شاہ محمد اسحاق صاحب دامت برکاتہم
              </p>
              <p className="text-xs md:text-sm font-bold text-black font-sans pt-1 leading-normal">
                نگرانِ شاخ: {supervisorName}
              </p>
            </div>

            {/* Expenses Table Form */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right border-collapse" style={{ border: '1px solid #000000' }}>
                <thead>
                  <tr className="bg-slate-50 text-black leading-normal border-b border-black font-bold">
                    <th className="py-2.5 px-3 border border-black text-center w-14">نمبر شمار</th>
                    <th className="py-2.5 px-3 border border-black text-right">اخراجات کی تفصیل</th>
                    <th className="py-2.5 px-3 border border-black text-center w-28">کام کی نوعیت</th>
                    <th className="py-2.5 px-3 border border-black text-center w-24">اجرت</th>
                    <th className="py-2.5 px-3 border border-black text-left w-28">میزان</th>
                    {isEditing && <th className="py-2.5 px-2 border border-black text-center w-10 no-print">حذف</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-black font-bold">
                  {items.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 px-3 border border-black text-center font-mono">
                        {toUrduDigits(item.serialNum)}
                      </td>
                      <td className="py-2 px-3 border border-black font-sans">
                        {isEditing && idx !== 0 ? (
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleRowChange(item.id, 'description', e.target.value)}
                            className="bg-transparent font-bold border-none underline outline-none focus:ring-1 focus:ring-amber-300 w-full text-xs font-sans text-right"
                            placeholder="تفصیل لکھیں..."
                          />
                        ) : (
                          <span>{item.description}</span>
                        )}
                      </td>
                      <td className="py-2 px-3 border border-black text-center">
                        {isEditing ? (
                          <input
                            type="text"
                            value={item.natureOfWork}
                            onChange={(e) => handleRowChange(item.id, 'natureOfWork', e.target.value)}
                            className="bg-transparent font-bold text-center border-none underline outline-none focus:ring-1 focus:ring-amber-300 w-full text-xs"
                          />
                        ) : (
                          <span>{item.natureOfWork}</span>
                        )}
                      </td>
                      <td className="py-2 px-3 border border-black text-center font-mono">
                        {isEditing ? (
                          <input
                            type="text"
                            value={item.wage}
                            onChange={(e) => handleRowChange(item.id, 'wage', e.target.value)}
                            className="bg-transparent text-center font-bold font-mono border-none underline outline-none focus:ring-1 focus:ring-amber-300 w-full text-xs"
                          />
                        ) : (
                          <span>{typeof item.wage === 'number' ? toUrduDigits(item.wage) : item.wage}</span>
                        )}
                      </td>
                      <td className="py-2 px-3 border border-black text-left font-mono text-xs font-black">
                        {isEditing && idx !== 0 ? (
                          <input
                            type="number"
                            value={item.total === 0 ? '' : item.total}
                            onChange={(e) => handleRowChange(item.id, 'total', e.target.value)}
                            className="bg-transparent font-black text-left border-none underline outline-none focus:ring-1 focus:ring-amber-300 w-full text-xs font-mono"
                            placeholder="میزان درج کریں"
                          />
                        ) : (
                          <span>{toUrduDigits(item.total.toLocaleString('ur-PK'))}</span>
                        )}
                      </td>
                      {isEditing && (
                        <td className="py-2 px-2 border border-black text-center no-print">
                          <button
                            disabled={idx === 0} // butcher wages are locked to layout
                            onClick={() => deleteRow(item.id)}
                            className="text-red-500 hover:text-red-700 disabled:opacity-20 transition-colors"
                          >
                            <Trash2 size={13} className="mx-auto" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}

                  {/* Cumulative Grand Total Row */}
                  <tr className="bg-slate-900 text-white font-bold text-sm">
                    <td className="py-3 px-3 border border-black text-center" colSpan={2}>
                      کُل میزان اخراجات
                    </td>
                    <td className="py-3 px-3 border border-black text-center" colSpan={isEditing ? 4 : 3}>
                      <div className="flex justify-between items-center w-full px-2">
                        <span className="text-[10px] font-normal font-sans text-slate-400">تمام میزانوں کا مجموعہ</span>
                        <strong className="text-amber-400 font-extrabold font-mono text-base">
                          {toUrduDigits(grandTotal.toLocaleString('ur-PK'))} روپے
                        </strong>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Authentic Urdu Stamp & Sign placeholders */}
            <div className="pt-12 grid grid-cols-2 text-center text-xs text-black font-bold">
              <div>
                <p className="border-t border-dashed border-black pt-2 w-36 mx-auto">دستخط ناظمِ شاخ</p>
              </div>
              <div>
                <p className="border-t border-dashed border-black pt-2 w-36 mx-auto">دستخط مرکزی نگران</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
