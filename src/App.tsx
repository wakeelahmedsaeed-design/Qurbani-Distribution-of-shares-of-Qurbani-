import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toBlob } from 'html-to-image';
import { 
  Beef, 
  Search, 
  CheckCircle2, 
  Circle, 
  LayoutDashboard, 
  ScrollText, 
  Settings,
  ChevronLeft,
  Filter,
  Users,
  Database,
  History,
  Info,
  Plus,
  Clock,
  Receipt,
  Coins,
  Printer,
  Trash2,
  MapPin,
  Activity,
  RotateCw,
  CreditCard,
  Briefcase,
  PiggyBank,
  Lock,
  Calendar,
  LogIn,
  LogOut,
  Key
} from 'lucide-react';

interface Share {
  id: string; // "animalId-shareIdx"
  name: string;
  phone?: string;
  address?: string;
  isDistributed: boolean;
  distributionTime?: string;
  isPaid: boolean;
  amountPaid: number;
  expectedDeliveryTime: string;
  paidByBranchId?: string;
  paidByBranchLabel?: string;
}

interface Animal {
  id: number;
  label: string;
  shares: Share[];
}

interface DepositRecord {
  id: string;
  date: string;
  animalNames: string[];
  totalAmount: number;
  reference: string;
  destination: 'bank' | 'counter';
  collectorBranch?: string;
}

interface ActivityLog {
  id: string;
  timestamp: string;
  branch: string;
  type: 'payment' | 'distribution' | 'add_animal' | 'remove_animal' | 'deposit';
  details: string;
}

const SHARES_PER_ANIMAL = 7;
const DEFAULT_SHARE_AMOUNT = 45000;

interface Branch {
  id: string;
  label: string;
  color: string;
  textColor: string;
  accent: string;
  isCustom?: boolean;
  password?: string;
}

const DEFAULT_BRANCHES: Branch[] = [
  { id: 'nazim', label: 'ناظم مدرسہ', color: 'bg-slate-700', textColor: 'text-slate-705 text-slate-700', accent: 'slate', password: '9211' },
  { id: 'korangi', label: 'کورنگی کاؤنٹر', color: 'bg-emerald-600', textColor: 'text-emerald-700', accent: 'emerald', password: '123' },
  { id: 'landhi', label: 'لانڈھی کاؤنٹر', color: 'bg-indigo-600', textColor: 'text-indigo-700', accent: 'indigo', password: '123' },
  { id: 'qayyumabad', label: 'قیوم آباد کاؤنٹر', color: 'bg-sky-600', textColor: 'text-sky-700', accent: 'sky', password: '123' }
];

export default function App() {
  const [view, setView] = useState<'dashboard' | 'list' | 'detail' | 'settings' | 'deposits'>('dashboard');
  const [selectedAnimalId, setSelectedAnimalId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // active year / session state
  const [activeYear, setActiveYear] = useState<string>(() => {
    return localStorage.getItem('qurbani_active_year_v2') || '2026';
  });

  const [years, setYears] = useState<string[]>(() => {
    const saved = localStorage.getItem('qurbani_years_list_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return ['2026'];
  });

  const [newYearInput, setNewYearInput] = useState('');

  // default global share amount managed by Nazim, specific to active year
  const [globalShareAmount, setGlobalShareAmount] = useState<number>(() => {
    const activeYr = localStorage.getItem('qurbani_active_year_v2') || '2026';
    const saved = localStorage.getItem(`qurbani_global_share_amount_v5_${activeYr}`);
    if (saved) {
      const parsed = parseInt(saved);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return 45000; // standard default
  });
  
  // dynamic branches list
  const [branches, setBranches] = useState<Branch[]>(() => {
    const saved = localStorage.getItem('qurbani_branches_v5');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // ensure passwords exist mapping defaults if legacy
          return parsed.map((b: any) => ({
            ...b,
            password: b.password || (b.id === 'nazim' ? '9211' : '123')
          }));
        }
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_BRANCHES;
  });

  // active branch / location state
  const [activeBranch, setActiveBranch] = useState<string>(() => {
    const val = localStorage.getItem('qurbani_active_branch_v4');
    if (val === 'headoffice') return 'nazim'; // migrate old headoffice role to nazim
    return val || 'nazim'; // default to nazim
  });

  // Authentication Pin state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('qurbani_is_authenticated_v5') === 'true';
  });
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [pendingActiveBranch, setPendingActiveBranch] = useState<string>('nazim');

  // WhatsApp receipt capture states
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [showCopiedAlert, setShowCopiedAlert] = useState(false);

  // Dialog state for notifications and confirmations (solves secure sandboxed iframe prompt blocks)
  const [appDialog, setAppDialog] = useState<{
    isOpen: boolean;
    type: 'alert' | 'confirm';
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
  } | null>(null);

  const triggerAlert = (message: string, title = 'اطلاع') => {
    setAppDialog({
      isOpen: true,
      type: 'alert',
      title,
      message,
      onConfirm: () => setAppDialog(null),
      confirmText: 'ٹھیک ہے'
    });
  };

  const triggerConfirm = (message: string, onConfirm: () => void, title = 'تصدیق مطلوب ہے') => {
    setAppDialog({
      isOpen: true,
      type: 'confirm',
      title,
      message,
      onConfirm: () => {
        setAppDialog(null);
        onConfirm();
      },
      onCancel: () => setAppDialog(null),
      confirmText: 'جی ہاں، بدلیں',
      cancelText: 'منسوخ کریں'
    });
  };

  // Recent Global Activities logs for multi-branch monitoring, specific to active year
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => {
    const activeYr = localStorage.getItem('qurbani_active_year_v2') || '2026';
    const saved = localStorage.getItem(`qurbani_activity_logs_v5_${activeYr}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [
      {
        id: '1',
        timestamp: '08:45 AM',
        branch: 'کورنگی کاؤنٹر',
        type: 'add_animal',
        details: `سال ${activeYr} کا لائیو کام کامیابی سے شروع کیا گیا`
      }
    ];
  });

  // custom animal adding inputs (Settings view)
  const [customAnimalIdInput, setCustomAnimalIdInput] = useState<string>('');
  const [customAnimalLabelInput, setCustomAnimalLabelInput] = useState<string>('');

  // slip state
  const [activeSlip, setActiveSlip] = useState<{ animal: Animal; share: Share; index: number } | null>(null);

  // loading animals with migration fallbacks, specific to active year
  const [animals, setAnimals] = useState<Animal[]>(() => {
    const activeYr = localStorage.getItem('qurbani_active_year_v2') || '2026';
    const savedAmount = localStorage.getItem(`qurbani_global_share_amount_v5_${activeYr}`);
    const initialGlobalAmount = savedAmount ? (parseInt(savedAmount) || 45000) : 45000;
    
    const saved = localStorage.getItem(`qurbani_data_v4_${activeYr}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((animal: any) => ({
            ...animal,
            shares: Array.isArray(animal.shares) ? animal.shares.map((share: any) => ({
              id: share.id,
              name: share.name || '',
              phone: share.phone || '',
              address: share.address || '',
              isDistributed: !!share.isDistributed,
              distributionTime: share.distributionTime || undefined,
              isPaid: typeof share.isPaid === 'boolean' ? share.isPaid : false,
              amountPaid: typeof share.amountPaid === 'number' ? share.amountPaid : initialGlobalAmount,
              expectedDeliveryTime: share.expectedDeliveryTime || '01:00 PM',
              paidByBranchId: share.paidByBranchId || undefined,
              paidByBranchLabel: share.paidByBranchLabel || undefined
            })) : []
          })).sort((a: any, b: any) => a.id - b.id);
        }
      } catch (e) {
        console.error(e);
      }
    }

    // Default 60 animals as community benchmark for the active year
    return Array.from({ length: 60 }, (_, i) => ({
      id: i + 1,
      label: `گائے نمبر ${i + 1}`,
      shares: Array.from({ length: SHARES_PER_ANIMAL }, (_, j) => ({
        id: `${i + 1}-${j + 1}`,
        name: `حصہ دار ${j + 1}`,
        phone: '',
        address: '',
        isDistributed: false,
        isPaid: false,
        amountPaid: initialGlobalAmount,
        expectedDeliveryTime: '01:00 PM'
      }))
    }));
  });

  // accounts ledger state, specific to active year
  const [deposits, setDeposits] = useState<DepositRecord[]>(() => {
    const activeYr = localStorage.getItem('qurbani_active_year_v2') || '2026';
    const saved = localStorage.getItem(`qurbani_deposits_v4_${activeYr}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((dep: any) => ({
            ...dep,
            destination: dep.destination || 'bank' // safe fallback for migrated records
          }));
        }
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  // accounts destination choice: bank (بینک اکاؤنٹ) or counter (کاؤنٹر کیش دفتری)
  const [depositDestination, setDepositDestination] = useState<'bank' | 'counter'>('bank');

  // selection for new deposit flow
  const [selectedAnimalsForDeposit, setSelectedAnimalsForDeposit] = useState<number[]>([]);
  const [depositReference, setDepositReference] = useState('');

  // broadcast synchronization channel
  const broadcastSync = (updatedAnimals: Animal[], updatedDeposits: DepositRecord[], updatedLogs: ActivityLog[], updatedBranches?: Branch[], updatedYear?: string) => {
    try {
      const channel = new BroadcastChannel('qurbani_realtime_sync');
      channel.postMessage({
        animals: updatedAnimals,
        deposits: updatedDeposits,
        logs: updatedLogs,
        branches: updatedBranches || branches,
        year: updatedYear || activeYear
      });
      channel.close();
    } catch (e) {
      console.warn('Sync broadcast not supported in sandbox context', e);
    }
  };

  // Synchronous and complete dynamic Year switcher
  const changeYear = (newYear: string) => {
    setActiveYear(newYear);
    localStorage.setItem('qurbani_active_year_v2', newYear);
    
    // Load new year global nominal share amount
    const savedAmount = localStorage.getItem(`qurbani_global_share_amount_v5_${newYear}`);
    let newAmount = 45000;
    if (savedAmount) {
      const parsed = parseInt(savedAmount);
      if (!isNaN(parsed) && parsed > 0) newAmount = parsed;
    }
    setGlobalShareAmount(newAmount);

    // Load new year animals
    const savedData = localStorage.getItem(`qurbani_data_v4_${newYear}`);
    let loadedAnimals: Animal[] = [];
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (Array.isArray(parsed)) {
          loadedAnimals = parsed.map((animal: any) => ({
            ...animal,
            shares: Array.isArray(animal.shares) ? animal.shares.map((share: any) => ({
              id: share.id,
              name: share.name || '',
              phone: share.phone || '',
              address: share.address || '',
              isDistributed: !!share.isDistributed,
              distributionTime: share.distributionTime || undefined,
              isPaid: typeof share.isPaid === 'boolean' ? share.isPaid : false,
              amountPaid: typeof share.amountPaid === 'number' ? share.amountPaid : newAmount,
              expectedDeliveryTime: share.expectedDeliveryTime || '01:00 PM',
              paidByBranchId: share.paidByBranchId || undefined,
              paidByBranchLabel: share.paidByBranchLabel || undefined
            })) : []
          })).sort((a: any, b: any) => a.id - b.id);
        }
      } catch (e) {
        console.error(e);
      }
    }
    if (loadedAnimals.length === 0) {
      loadedAnimals = Array.from({ length: 60 }, (_, i) => ({
        id: i + 1,
        label: `گائے نمبر ${i + 1}`,
        shares: Array.from({ length: SHARES_PER_ANIMAL }, (_, j) => ({
          id: `${i + 1}-${j + 1}`,
          name: `حصہ دار ${j + 1}`,
          phone: '',
          address: '',
          isDistributed: false,
          isPaid: false,
          amountPaid: newAmount,
          expectedDeliveryTime: '01:00 PM'
        }))
      }));
    }
    setAnimals(loadedAnimals);

    // Load new year deposits
    const savedDeps = localStorage.getItem(`qurbani_deposits_v4_${newYear}`);
    let newDeps: DepositRecord[] = [];
    if (savedDeps) {
      try {
        const parsed = JSON.parse(savedDeps);
        if (Array.isArray(parsed)) {
          newDeps = parsed.map((dep: any) => ({
            ...dep,
            destination: dep.destination || 'bank'
          }));
        }
      } catch (e) {
        console.error(e);
      }
    }
    setDeposits(newDeps);

    // Load new year activity logs
    const savedLogs = localStorage.getItem(`qurbani_activity_logs_v5_${newYear}`);
    let newLogs: ActivityLog[] = [];
    if (savedLogs) {
      try {
        newLogs = JSON.parse(savedLogs);
      } catch (e) {
        console.error(e);
      }
    }
    if (newLogs.length === 0) {
      newLogs = [
        {
          id: '1',
          timestamp: '08:45 AM',
          branch: 'کورنگی کاؤنٹر',
          type: 'add_animal',
          details: `سال ${newYear} کے لائیو نظام کا آغاز از خود کار طریقے سے ہو گیا`
        }
      ];
    }
    setActivityLogs(newLogs);
    
    // Broadcast changes with activeYear included in sync sequence
    broadcastSync(loadedAnimals, newDeps, newLogs, branches, newYear);
  };

  // logger helper
  const logActivity = (type: ActivityLog['type'], details: string) => {
    const bObj = branches.find(b => b.id === activeBranch) || branches[0];
    const timestamp = new Date().toLocaleTimeString('ur-PK', { hour: '2-digit', minute: '2-digit', hour12: true });
    
    setActivityLogs(prev => {
      const newLog: ActivityLog = {
        id: Math.random().toString(36).substr(2, 9).toUpperCase(),
        timestamp,
        branch: bObj ? bObj.label : 'نامعلوم کاؤنٹر',
        type,
        details
      };
      const updated = [newLog, ...prev].slice(0, 50);
      localStorage.setItem(`qurbani_activity_logs_v5_${activeYear}`, JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    localStorage.setItem(`qurbani_data_v4_${activeYear}`, JSON.stringify(animals));
    broadcastSync(animals, deposits, activityLogs);
  }, [animals, activeYear]);

  useEffect(() => {
    localStorage.setItem(`qurbani_deposits_v4_${activeYear}`, JSON.stringify(deposits));
    broadcastSync(animals, deposits, activityLogs);
  }, [deposits, activeYear]);

  useEffect(() => {
    localStorage.setItem(`qurbani_activity_logs_v5_${activeYear}`, JSON.stringify(activityLogs));
    broadcastSync(animals, deposits, activityLogs);
  }, [activityLogs, activeYear]);

  useEffect(() => {
    localStorage.setItem(`qurbani_global_share_amount_v5_${activeYear}`, globalShareAmount.toString());
  }, [globalShareAmount, activeYear]);

  useEffect(() => {
    localStorage.setItem('qurbani_years_list_v1', JSON.stringify(years));
  }, [years]);

  useEffect(() => {
    localStorage.setItem('qurbani_branches_v5', JSON.stringify(branches));
    broadcastSync(animals, deposits, activityLogs, branches);
  }, [branches]);

  useEffect(() => {
    localStorage.setItem('qurbani_active_branch_v4', activeBranch);
  }, [activeBranch]);

  // Listen for broadcast sync across windows / tabs
  useEffect(() => {
    try {
      const channel = new BroadcastChannel('qurbani_realtime_sync');
      channel.onmessage = (event) => {
        const { animals: incomingAnimals, deposits: incomingDeposits, logs: incomingLogs, branches: incomingBranches, year: incomingYear } = event.data;
        if (incomingYear && incomingYear !== activeYear) {
          changeYear(incomingYear);
          return;
        }
        if (incomingAnimals && JSON.stringify(incomingAnimals) !== localStorage.getItem(`qurbani_data_v4_${activeYear}`)) {
          setAnimals(incomingAnimals);
        }
        if (incomingDeposits && JSON.stringify(incomingDeposits) !== localStorage.getItem(`qurbani_deposits_v4_${activeYear}`)) {
          setDeposits(incomingDeposits);
        }
        if (incomingLogs && JSON.stringify(incomingLogs) !== localStorage.getItem(`qurbani_activity_logs_v5_${activeYear}`)) {
          setActivityLogs(incomingLogs);
        }
        if (incomingBranches && JSON.stringify(incomingBranches) !== localStorage.getItem('qurbani_branches_v5')) {
          setBranches(incomingBranches);
        }
      };
      return () => {
        channel.close();
      };
    } catch (e) {
      console.warn('Broadcast channel listener failed', e);
    }
  }, [branches, activeYear]);

  // Suggested ID is the first missing ID or next max number
  const suggestedNextId = useMemo(() => {
    const ids = animals.map(a => a.id).sort((a, b) => a - b);
    let suggested = 1;
    for (const id of ids) {
      if (id === suggested) {
        suggested++;
      } else if (id > suggested) {
        break;
      }
    }
    return suggested;
  }, [animals]);

  // Sync inputs with suggested ID helper
  useEffect(() => {
    if (!customAnimalIdInput) {
      setCustomAnimalIdInput(suggestedNextId.toString());
    }
    if (!customAnimalLabelInput || customAnimalLabelInput.startsWith('گائے نمبر ')) {
      setCustomAnimalLabelInput(`گائے نمبر ${customAnimalIdInput || suggestedNextId}`);
    }
  }, [suggestedNextId]);

  // General operations
  const addAnimal = () => {
    const nextId = animals.length > 0 ? Math.max(...animals.map(a => a.id)) + 1 : 1;
    addAnimalCustom(nextId, `گائے نمبر ${nextId}`);
  };

  const addAnimalCustom = (id: number, customLabel: string) => {
    if (animals.some(a => a.id === id)) {
      alert(`گائے نمبر ${id} پہلے سے ہی فہرست میں موجود ہے!`);
      return false;
    }
    const label = customLabel || `گائے نمبر ${id}`;
    const newAnimal: Animal = {
      id: id,
      label: label,
      shares: Array.from({ length: SHARES_PER_ANIMAL }, (_, j) => ({
        id: `${id}-${j + 1}`,
        name: `حصہ دار ${j + 1}`,
        isDistributed: false,
        isPaid: false,
        amountPaid: globalShareAmount,
        expectedDeliveryTime: '01:00 PM'
      }))
    };
    
    const updated = [...animals, newAnimal].sort((a, b) => a.id - b.id);
    setAnimals(updated);
    logActivity('add_animal', `نیا اندراج: ${label} (شناخت #${id}) شامل کر دی گئی`);
    return true;
  };

  const removeAnimal = (id: number) => {
    const animalObj = animals.find(a => a.id === id);
    if (!animalObj) return;
    triggerConfirm(
      `کیا آپ واقعی ${animalObj.label} اور اس کا تمام ریکارڈ خارج کرنا چاہتے ہیں؟`,
      () => {
        setAnimals(prev => prev.filter(a => a.id !== id));
        if (selectedAnimalId === id) setView('list');
        logActivity('remove_animal', `خارج شدہ: ${animalObj.label} کو سسٹم سے خارج کر دیا گیا`);
        triggerAlert(`${animalObj.label} کو کامیابی سے خارج کر دیا گیا ہے۔`, 'کامیابی');
      },
      'جانور کو خارج کریں'
    );
  };

  const updateAnimalLabel = (id: number, label: string) => {
    setAnimals(prev => prev.map(a => a.id === id ? { ...a, label } : a));
  };

  const updateShareName = (animalId: number, shareId: string, name: string) => {
    const targetAnimal = animals.find(a => a.id === animalId);
    if (targetAnimal) {
      const sh = targetAnimal.shares.find(s => s.id === shareId);
      if (sh && sh.isPaid && activeBranch !== 'nazim' && sh.paidByBranchId && sh.paidByBranchId !== activeBranch) {
        return; // secure lock
      }
    }
    setAnimals(prev => prev.map(a => {
      if (a.id !== animalId) return a;
      return {
        ...a,
        shares: a.shares.map(s => s.id === shareId ? { ...s, name } : s)
      };
    }));
  };

  const updateShareAmount = (animalId: number, shareId: string, amount: number) => {
    const targetAnimal = animals.find(a => a.id === animalId);
    if (targetAnimal) {
      const sh = targetAnimal.shares.find(s => s.id === shareId);
      if (sh && sh.isPaid && activeBranch !== 'nazim' && sh.paidByBranchId && sh.paidByBranchId !== activeBranch) {
        return; // secure lock
      }
    }
    setAnimals(prev => prev.map(a => {
      if (a.id !== animalId) return a;
      return {
        ...a,
        shares: a.shares.map(s => s.id === shareId ? { ...s, amountPaid: amount } : s)
      };
    }));
  };

  const updateShareDeliveryTime = (animalId: number, shareId: string, time: string) => {
    const targetAnimal = animals.find(a => a.id === animalId);
    if (targetAnimal) {
      const sh = targetAnimal.shares.find(s => s.id === shareId);
      if (sh && sh.isPaid && activeBranch !== 'nazim' && sh.paidByBranchId && sh.paidByBranchId !== activeBranch) {
        return; // secure lock
      }
    }
    setAnimals(prev => prev.map(a => {
      if (a.id !== animalId) return a;
      return {
        ...a,
        shares: a.shares.map(s => s.id === shareId ? { ...s, expectedDeliveryTime: time } : s)
      };
    }));
  };

  const handleCaptureAndShare = async () => {
    if (!activeSlip) return;
    setIsGeneratingImage(true);
    
    // Tiny delay to let any rendering changes settle
    setTimeout(async () => {
      const element = document.getElementById('printable-area');
      if (!element) {
        setIsGeneratingImage(false);
        triggerAlert('سستم کی خرابی کی وجہ سے تصویر حاصل نہ کی جا سکی۔', 'غلطی');
        return;
      }

      try {
        // Render directly using html-to-image toBlob helper which handles sandbox frames and CSS/fonts perfectly
        const blob = await toBlob(element, {
          cacheBust: true,
          pixelRatio: 2.5,
          style: {
            transform: 'scale(1)',
          }
        });

        if (!blob) {
          setIsGeneratingImage(false);
          triggerAlert('تصویر رینڈر کرنے میں ناکامی پیش آئی۔', 'غلطی');
          return;
        }

        let cleanNumber = activeSlip.share.phone ? activeSlip.share.phone.replace(/[-\s]/g, '') : '';
        if (cleanNumber.startsWith('0')) {
          cleanNumber = '92' + cleanNumber.substring(1);
        }

        const issuingBranchName = activeSlip.share.paidByBranchLabel || branches.find(b => b.id === activeBranch)?.label || 'کاؤنٹر';
        const msg = `*اجتماعی قربانی مدرسہ قاسم العلوم کورنگی 6 - رسید بکنگ* 🌸\n\n` +
                    `*رسید نمبر:* S-${activeSlip.share.id}\n` +
                    `*تفصیل جانور:* ${activeSlip.animal.label}\n` +
                    `*حصہ مہر:* حصہ ${activeSlip.index}\n` +
                    `*نام صاحبِ حصہ:* ${activeSlip.share.name || '---'}\n` +
                    `*سال سیشن:* ${activeYear}\n` +
                    `*وصول شدہ فنڈ رقم:* ${activeSlip.share.amountPaid.toLocaleString('ur-PK')} روپے\n` +
                    `*وصولی اسٹیٹس:* ${activeSlip.share.isPaid ? 'مکمل وصول شدہ ✅' : 'باقی فنڈ غیر ادا شدہ ❌'}\n` +
                    `*جاری کنندہ کاؤنٹر:* ${issuingBranchName}\n` +
                    `*توقع فراہمی گوشت:* ${activeSlip.share.expectedDeliveryTime || 'عیدِ سعید'}\n\n` +
                    `------------------------------------\n` +
                    `*ہدایت:* رسید کی مکمل خوبصورت تصویر آپ کے کلپ بورڈ پر خودکار طریقے سے کاپی کر دی گئی ہے۔ چونکہ واٹس ایپ براہِ راست تصویر نہیں بھیج سکے گا، اس لیے چیٹ ونڈو کھلتے ہی وہاں *Ctrl+V* دبا کر یا دبا کے رکھ کر *Paste* کریں اور تصویر روانہ کر دیں۔ جزاک اللہ خیرا!`;

        try {
          // Write to system clipboard as image stream
          const data = [new ClipboardItem({ 'image/png': blob })];
          await navigator.clipboard.write(data);
          
          setIsGeneratingImage(false);
          setShowCopiedAlert(true);

          // Open WhatsApp chat
          if (cleanNumber) {
            setTimeout(() => {
              window.open(`https://wa.me/${cleanNumber}?text=${encodeURIComponent(msg)}`, '_blank', 'noreferrer');
            }, 2000);
          }
        } catch (clipboardError) {
          console.warn('Clipboard copy rejected, running download fallback...', clipboardError);
          
          // Safe fallback: trigger image file download
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `Receipt-S-${activeSlip.share.id}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          setIsGeneratingImage(false);
          triggerAlert(
            `رسید کی آفیشل تصویر کامیابی سے ڈاؤن لوڈ ہو گئی ہے! واٹس ایپ کھلتے ہی گیلری اٹیچمنٹ سے ڈاؤن لوڈ کی گئی یہ تصویر منتخب کر کے روانہ فرما دیں۔`,
            'تصویر ڈاؤن لوڈ ہو گئی!'
          );

          if (cleanNumber) {
            setTimeout(() => {
              window.open(`https://wa.me/${cleanNumber}?text=${encodeURIComponent(msg)}`, '_blank', 'noreferrer');
            }, 2000);
          }
        }

      } catch (err: any) {
        console.error('Canvas capture failed', err);
        setIsGeneratingImage(false);
        triggerAlert('تصویر رینڈر کرنے میں کوئی فنی خرابی پیش آئی ہے: ' + (err.message || String(err)), 'غلطی');
      }
    }, 100);
  };

  const updateSharePhone = (animalId: number, shareId: string, phone: string) => {
    const targetAnimal = animals.find(a => a.id === animalId);
    if (targetAnimal) {
      const sh = targetAnimal.shares.find(s => s.id === shareId);
      if (sh && sh.isPaid && activeBranch !== 'nazim' && sh.paidByBranchId && sh.paidByBranchId !== activeBranch) {
        return; // secure lock
      }
    }
    // Automatically sanitize phone input to remove spaces and dashes
    const cleanPhone = phone.replace(/[-\s]/g, '');
    setAnimals(prev => prev.map(a => {
      if (a.id !== animalId) return a;
      return {
        ...a,
        shares: a.shares.map(s => s.id === shareId ? { ...s, phone: cleanPhone } : s)
      };
    }));
  };

  const updateShareAddress = (animalId: number, shareId: string, address: string) => {
    const targetAnimal = animals.find(a => a.id === animalId);
    if (targetAnimal) {
      const sh = targetAnimal.shares.find(s => s.id === shareId);
      if (sh && sh.isPaid && activeBranch !== 'nazim' && sh.paidByBranchId && sh.paidByBranchId !== activeBranch) {
        return; // secure lock
      }
    }
    setAnimals(prev => prev.map(a => {
      if (a.id !== animalId) return a;
      return {
        ...a,
        shares: a.shares.map(s => s.id === shareId ? { ...s, address } : s)
      };
    }));
  };

  const togglePayment = (animalId: number, shareId: string) => {
    let oldPaid = false;
    let shareName = '';
    let shareAmount = 0;
    let animLabel = '';
    let paidByOther = false;
    let otherBranchName = '';

    const targetAnimal = animals.find(a => a.id === animalId);
    if (targetAnimal) {
      const targetShare = targetAnimal.shares.find(s => s.id === shareId);
      if (targetShare && targetShare.isPaid) {
        if (activeBranch !== 'nazim' && targetShare.paidByBranchId && targetShare.paidByBranchId !== activeBranch) {
          paidByOther = true;
          otherBranchName = targetShare.paidByBranchLabel || 'متبادل کاؤنٹر';
        }
      }
    }

    if (paidByOther) {
      alert(`معذرت! یہ حصہ پہلے ہی "${otherBranchName}" کی طرف سے بک ہو چکا ہے اور لاک ہے۔ کوئی اور کاؤنٹر اسے ترمیم یا تبدیل نہیں کر سکتا۔`);
      return;
    }

    setAnimals(prev => prev.map(a => {
      if (a.id !== animalId) return a;
      animLabel = a.label;
      return {
        ...a,
        shares: a.shares.map(s => {
          if (s.id !== shareId) return s;
          oldPaid = s.isPaid;
          shareName = s.name;
          const isNowPaid = !s.isPaid;
          const newAmount = isNowPaid ? globalShareAmount : s.amountPaid;
          shareAmount = newAmount;
          return { 
            ...s, 
            isPaid: isNowPaid,
            amountPaid: newAmount,
            paidByBranchId: isNowPaid ? activeBranch : undefined,
            paidByBranchLabel: isNowPaid ? (branches.find(b => b.id === activeBranch)?.label || 'کاؤنٹر') : undefined
          };
        })
      };
    }));

    const isNowPaid = !oldPaid;
    const detailText = isNowPaid
      ? `${animLabel} کے ${shareName} کی رقم (${shareAmount.toLocaleString('ur-PK')} روپے) وصول کر لی گئی`
      : `${animLabel} کے ${shareName} کی رقم کی وصولی منسوخ کر دی گئی`;
    logActivity('payment', detailText);
  };

  const toggleDistribution = (animalId: number, shareId: string) => {
    const now = new Date().toLocaleTimeString('ur-PK', { hour: '2-digit', minute: '2-digit', hour12: true });
    let oldDistributed = false;
    let shareName = '';
    let animLabel = '';

    setAnimals(prev => prev.map(a => {
      if (a.id !== animalId) return a;
      animLabel = a.label;
      return {
        ...a,
        shares: a.shares.map(s => {
          if (s.id !== shareId) return s;
          oldDistributed = s.isDistributed;
          shareName = s.name;
          const isMarkedChange = !s.isDistributed;
          return { 
            ...s, 
            isDistributed: isMarkedChange,
            distributionTime: isMarkedChange ? now : undefined
          };
        })
      };
    }));

    const isNowDistributed = !oldDistributed;
    const detailText = isNowDistributed
      ? `${animLabel} - ${shareName} کو گوشت فراہم کر دیا گیا`
      : `${animLabel} - ${shareName} کو گوشت کی فراہمی منسوخ کر دی گئی`;
    logActivity('distribution', detailText);
  };

  // Deposit logic
  // Which animals are not already deposited yet fully paid?
  // Let's count payments generated per animal:
  const animalRevenues = useMemo(() => {
    return animals.map(a => {
      const totalCollected = a.shares.reduce((sum, s) => sum + (s.isPaid ? s.amountPaid : 0), 0);
      const isPaidAll = a.shares.every(s => s.isPaid);
      return {
        id: a.id,
        label: a.label,
        collected: totalCollected,
        isFullyPaid: isPaidAll
      };
    });
  }, [animals]);

  // Track which animals have been accounted for in the historic deposits
  const alreadyDepositedAnimalNames = useMemo(() => {
    const set = new Set<string>();
    deposits.forEach(dep => {
      dep.animalNames.forEach(name => set.add(name));
    });
    return set;
  }, [deposits]);

  const depositAbleAnimals = useMemo(() => {
    return animalRevenues.filter(ar => ar.collected > 0 && !alreadyDepositedAnimalNames.has(ar.label));
  }, [animalRevenues, alreadyDepositedAnimalNames]);

  const handleCreateDeposit = () => {
    if (selectedAnimalsForDeposit.length === 0) {
      alert('براہ کرم فنڈ منتقل کرنے کے لیے کم سے کم ایک گائے منتخب کریں۔');
      return;
    }
    const selectedList = animalRevenues.filter(ar => selectedAnimalsForDeposit.includes(ar.id));
    const totalSelectedAmount = selectedList.reduce((sum, ar) => sum + ar.collected, 0);
    const names = selectedList.map(item => item.label);

    const newDep: DepositRecord = {
      id: Math.random().toString(36).substr(2, 9).toUpperCase(),
      date: new Date().toLocaleDateString('ur-PK', { year: 'numeric', month: 'long', day: 'numeric' }) + ' ' + new Date().toLocaleTimeString('ur-PK', { hour: '2-digit', minute: '2-digit' }),
      animalNames: names,
      totalAmount: totalSelectedAmount,
      reference: depositReference || (depositDestination === 'bank' ? 'نقد رقم بینک اکاؤنٹ ٹرانسفر' : 'کاؤنٹر نقد دراز جمع'),
      destination: depositDestination,
      collectorBranch: branches.find(b => b.id === activeBranch)?.label || 'کاؤنٹر'
    };

    setDeposits([newDep, ...deposits]);
    
    // Log active deposit action
    const destName = depositDestination === 'bank' ? 'بینک اکاؤنٹ' : 'کاؤنٹر کیش دراز';
    logActivity('deposit', `ڈپازٹ: ${names.join(', ')} کے فنڈز (${totalSelectedAmount.toLocaleString('ur-PK')} روپے) کو ${destName} منتقل کر دیا گیا`);

    setSelectedAnimalsForDeposit([]);
    setDepositReference('');
    alert('رقم کامیابی کے ساتھ متعلقہ جگہ پر منتقل درج کر لی گئی ہے۔');
  };

  // General Stats
  const stats = useMemo(() => {
    let totalShares = animals.length * SHARES_PER_ANIMAL;
    let distributedCount = 0;
    let paidCount = 0;
    let totalCashReceived = 0;
    
    animals.forEach(a => {
      a.shares.forEach(s => {
        if (s.isDistributed) distributedCount++;
        if (s.isPaid) {
          paidCount++;
          totalCashReceived += s.amountPaid;
        }
      });
    });

    const bankDepositedAmount = deposits
      .filter(dep => dep.destination === 'bank')
      .reduce((sum, dep) => sum + dep.totalAmount, 0);

    const counterDepositedAmount = deposits
      .filter(dep => dep.destination === 'counter')
      .reduce((sum, dep) => sum + dep.totalAmount, 0);

    const cashOnHand = totalCashReceived - bankDepositedAmount - counterDepositedAmount;

    return {
      totalAnimals: animals.length,
      totalShares,
      distributed: distributedCount,
      paid: paidCount,
      totalCashReceived,
      bankDepositedAmount,
      counterDepositedAmount,
      cashOnHand,
      pending: totalShares - distributedCount,
      percentage: totalShares > 0 ? Math.round((distributedCount / totalShares) * 100) : 0,
      paymentPercentage: totalShares > 0 ? Math.round((paidCount / totalShares) * 100) : 0
    };
  }, [animals, deposits]);

  // Dynamic collections per branch
  const branchCollections = useMemo(() => {
    const collections: { [branchId: string]: { amount: number; count: number } } = {};
    
    // Initialize standard branches
    branches.forEach(b => {
      collections[b.id] = { amount: 0, count: 0 };
    });
    
    // Add default fallbacks
    DEFAULT_BRANCHES.forEach(b => {
      if (!collections[b.id]) {
        collections[b.id] = { amount: 0, count: 0 };
      }
    });

    // Handle unknown branch
    collections['unknown'] = { amount: 0, count: 0 };

    // Group animals shares by branch
    animals.forEach(animal => {
      animal.shares.forEach(share => {
        if (share.isPaid) {
          const bId = share.paidByBranchId || 'unknown';
          if (!collections[bId]) {
            collections[bId] = { amount: 0, count: 0 };
          }
          collections[bId].amount += share.amountPaid;
          collections[bId].count += 1;
        }
      });
    });

    return collections;
  }, [animals, branches]);

  const grandTotalAmount = useMemo(() => {
    let total = 0;
    animals.forEach(animal => {
      animal.shares.forEach(share => {
        if (share.isPaid) {
          total += share.amountPaid;
        }
      });
    });
    return total;
  }, [animals]);

  const grandTotalCount = useMemo(() => {
    let count = 0;
    animals.forEach(animal => {
      animal.shares.forEach(share => {
        if (share.isPaid) {
          count += 1;
        }
      });
    });
    return count;
  }, [animals]);

  const filteredAnimals = animals.filter(a => 
    a.label.includes(searchQuery) || 
    a.shares.some(s => s.name.includes(searchQuery))
  );

  const selectedAnimal = animals.find(a => a.id === selectedAnimalId);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const branchToAuth = branches.find(b => b.id === pendingActiveBranch);
    if (!branchToAuth) {
      setLoginError('منتخب کردہ کاؤنٹر ریکارڈ میں نہیں ملا۔');
      return;
    }
    const entered = loginPassword.trim();
    const correct = (branchToAuth.password || (branchToAuth.id === 'nazim' ? '9211' : '123')).trim();

    if (entered === correct) {
      setIsAuthenticated(true);
      setActiveBranch(pendingActiveBranch);
      localStorage.setItem('qurbani_is_authenticated_v5', 'true');
      localStorage.setItem('qurbani_active_branch_v4', pendingActiveBranch);
      setLoginPassword('');
      setLoginError('');
    } else {
      setLoginError('درج کردہ پاسورڈ/PIN درست نہیں ہے۔ براہِ مہربانی ناظم سے رجوع کریں۔');
    }
  };

  useEffect(() => {
    localStorage.setItem('qurbani_is_authenticated_v5', isAuthenticated ? 'true' : 'false');
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 urdu-text" dir="rtl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-emerald-800/20"
        >
          {/* Top visual banner */}
          <div className="bg-emerald-800 p-8 text-center text-white relative">
            <div className="absolute top-3 right-3 bg-emerald-700/50 text-[10px] uppercase font-bold px-2.5 py-1 rounded-full text-emerald-300">
              قربانی فنڈ مینیجر v5
            </div>
            <div className="w-16 h-16 bg-white/10 rounded-2xl mx-auto flex items-center justify-center mb-4 backdrop-blur-sm">
              <Lock className="text-white" size={32} />
            </div>
            <h2 className="text-2xl font-black tracking-tight font-sans">کاؤنٹر لاگ ان سروس</h2>
            <p className="text-xs text-emerald-100/80 mt-1 font-bold">اجتماعی قربانی بکنگ اور کیش وصولی کے لیے منتخب کاؤنٹر سے لاگ ان کریں</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="p-8 space-y-6">
            {loginError && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-50 text-red-700 text-xs font-bold p-3.5 rounded-xl border border-red-100 flex items-center gap-2"
              >
                <Info size={16} className="shrink-0 animate-bounce" />
                <span className="font-bold">{loginError}</span>
              </motion.div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block text-right">آپ کا کاؤنٹر / شناخت منتخب کریں:</label>
              <div className="relative">
                <select
                  value={pendingActiveBranch}
                  onChange={(e) => {
                    setPendingActiveBranch(e.target.value);
                    setLoginError('');
                  }}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer appearance-none text-right pr-4"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.label} {b.id === 'nazim' ? ' (اعلیٰ ایڈمن)' : ''}
                    </option>
                  ))}
                </select>
                <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block text-right">کاؤنٹر پاسورڈ / لاگ ان PIN درج کریں:</label>
              <div className="relative">
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => {
                    setLoginPassword(e.target.value);
                    setLoginError('');
                  }}
                  required
                  placeholder="لاگ ان PIN درج کریں"
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl font-bold text-center text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 tracking-widest placeholder:tracking-normal font-mono"
                />
                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold py-3.5 rounded-2xl text-sm transition-all shadow-lg flex items-center justify-center gap-2 shadow-emerald-600/20 shadow-md"
            >
              <LogIn size={18} /> اکاؤنٹ لاگ ان کریں
            </button>

            {/* Standard developer utility guidelines to avoid forgetting passwords */}
            <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl space-y-2">
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">نئے یوزرز کے لیے آزمائشی لاگ ان PINز:</h4>
              <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 font-bold">
                <div className="p-1.5 bg-white rounded border border-slate-200/50">
                  <span className="text-slate-400">ناظم مدرسہ:</span> <code className="text-emerald-700 font-mono">9211</code>
                </div>
                <div className="p-1.5 bg-white rounded border border-slate-200/50">
                  <span className="text-slate-400">دیگر کاؤنٹرز:</span> <code className="text-emerald-700 font-mono">123</code>
                </div>
              </div>
              <p className="text-[9px] text-slate-400 font-medium leading-relaxed">
                * ناظم مدرسہ لاگ ان کرکے "گائے کا اندراج" مینو کے تحت دیگر کاؤنٹرز کے نام اور ان کے پاسورڈز تبدیل یا نئے شامل بھی کر سکتا ہے۔
              </p>
            </div>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 urdu-text" dir="rtl">
      {/* Sidebar Navigation */}
      <aside className="w-20 lg:w-64 bg-emerald-950 text-white flex flex-col shrink-0 transition-all border-l border-emerald-900/50">
        <div className="p-4 lg:p-6 flex items-center gap-3 border-b border-emerald-900/40">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shrink-0">
            <Beef className="text-white" size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-emerald-50 hidden lg:block">اجتماعی قربانی مینیجر</h1>
        </div>
        
        <nav className="flex-1 p-3 space-y-1">
          <button 
            onClick={() => setView('dashboard')}
            className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all ${view === 'dashboard' ? 'bg-emerald-600 text-white font-bold' : 'text-emerald-300/60 hover:bg-emerald-900/50 hover:text-white'}`}
          >
            <LayoutDashboard size={22} />
            <span className="hidden lg:block text-sm">ڈیش بورڈ</span>
          </button>
          
          <button 
            onClick={() => setView('list')}
            className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all ${view === 'list' ? 'bg-emerald-600 text-white font-bold' : 'text-emerald-300/60 hover:bg-emerald-900/50 hover:text-white'}`}
          >
            <ScrollText size={22} />
            <span className="hidden lg:block text-sm">گائے کی لسٹ دیکھیں</span>
          </button>

          <button 
            onClick={() => setView('deposits')}
            className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all ${view === 'deposits' ? 'bg-emerald-600 text-white font-bold' : 'text-emerald-300/60 hover:bg-emerald-900/50 hover:text-white'}`}
          >
            <Coins size={22} />
            <span className="hidden lg:block text-sm">بینک میں رقم جمع</span>
          </button>

          <button 
            onClick={() => setView('settings')}
            className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all ${view === 'settings' ? 'bg-emerald-600 text-white font-bold' : 'text-emerald-300/60 hover:bg-emerald-900/50 hover:text-white'}`}
          >
            <Settings size={22} />
            <span className="hidden lg:block text-sm">گائے کا اندراج</span>
          </button>
        </nav>

        <div className="p-6 border-t border-emerald-900/40 text-[10px] text-emerald-500/50 text-center hidden lg:block uppercase font-bold">
          QURBANI ADVANCE SYSTEM
          <br/>© 2026 Admin Dashboard
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-4">
            {(view === 'detail' || view === 'settings' || view === 'deposits') && (
              <button 
                onClick={() => setView(view === 'detail' ? 'list' : 'dashboard')}
                className="w-10 h-10 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 transition-all font-bold shrink-0"
              >
                <ChevronLeft size={24} />
              </button>
            )}
            <div>
              <h2 className="text-lg lg:text-xl font-black text-slate-800 flex items-center gap-2">
                {view === 'dashboard' ? 'اجتماعی قربانی مدرسہ قاسم العلوم کورنگی نمبر 6' 
                  : view === 'list' ? 'تمام جانوروں کی فہرست' 
                  : view === 'deposits' ? 'بینک ٹرانسفر / فنڈز مینیجر'
                  : view === 'settings' ? 'جانوروں کا نیا اندراج' 
                  : selectedAnimal?.label}
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${branches.find(b => b.id === activeBranch)?.color || 'bg-slate-500'}`}>
                  {branches.find(b => b.id === activeBranch)?.label}
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-2.5">
                {view === 'detail' ? 'حصہ داروں کی تفصیل، رقم کی وصولی اور رسید' : 'مدرسہ اجتماعی انتظامِ فنڈز و قربانی'}
              </p>
            </div>
          </div>

          {/* Active Branch and Log out */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-bold block text-left">لاگ ان سیشن بابت:</span>
              <span className={`text-xs font-black px-3 py-1.5 rounded-xl text-white flex items-center gap-1.5 shadow-sm ${branches.find(b => b.id === activeBranch)?.color || 'bg-slate-700'}`}>
                {branches.find(b => b.id === activeBranch)?.label}
              </span>
            </div>

            <button
              onClick={() => {
                triggerConfirm(
                  'کیا آپ واقعی اپنے لاگ ان سیشن سے لاگ آؤٹ ہو کر دوسرا اکاؤنٹ منتخب کرنا چاہتے ہیں؟',
                  () => {
                    setIsAuthenticated(false);
                    localStorage.setItem('qurbani_is_authenticated_v5', 'false');
                    setLoginPassword('');
                    setLoginError('');
                  },
                  'لاگ آؤٹ تصدیق'
                );
              }}
              className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 px-3.5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
              title="سیشن سے لاگ آؤٹ کر کے دوسرے کاؤنٹر میں منتخب لاگ ان کریں"
            >
              <LogOut size={14} /> سیشن لاگ آؤٹ / تبدیل کریں
            </button>

            <div className="flex items-center gap-1.5 bg-indigo-50 text-indigo-800 border border-indigo-100 rounded-xl px-3 py-1.5 shadow-sm font-bold">
              <Calendar size={14} className="text-indigo-500" />
              <span className="text-[10px] text-indigo-400 block font-bold leading-none">سال:</span>
              <span className="text-xs font-black text-indigo-950 font-mono leading-none">{activeYear}</span>
            </div>

            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl px-3 py-1.5">
              <RotateCw className="text-emerald-500 animate-spin" size={14} />
              <span className="text-[10px] font-bold">لائیو کلاؤڈ سنک فعال ہے</span>
            </div>
          </div>
        </header>

        {/* Content Panel */}
        <div className="flex-1 overflow-auto p-4 lg:p-8">
          <AnimatePresence mode="wait">
            {view === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Stats row with payment detail integration */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                    <p className="text-slate-500 text-xs font-bold mb-1">کُل فعال گائے/بیل</p>
                    <div className="flex items-end justify-between">
                      <h4 className="text-3xl font-black text-slate-800">{stats.totalAnimals}</h4>
                      <Beef className="text-emerald-100 shrink-0" size={32} />
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                    <p className="text-emerald-600 text-xs font-bold mb-1">وصول شدہ کُل فنڈز</p>
                    <div className="flex items-end justify-between">
                      <h4 className="text-xl font-black text-emerald-600">
                        {stats.totalCashReceived.toLocaleString('ur-PK')}<span className="text-[10px] text-slate-400 font-normal"> روپے</span>
                      </h4>
                      <Coins className="text-emerald-100 shrink-0" size={32} />
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                    <p className="text-blue-600 text-xs font-bold mb-1">بینک اکاؤنٹ میں منتقل</p>
                    <div className="flex items-end justify-between">
                      <h4 className="text-xl font-black text-blue-600">
                        {stats.bankDepositedAmount.toLocaleString('ur-PK')}<span className="text-[10px] text-slate-400 font-normal"> روپے</span>
                      </h4>
                      <CreditCard className="text-blue-100 shrink-0" size={32} />
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                    <p className="text-indigo-600 text-xs font-bold mb-1">مرکزی کاؤنٹر دراز والٹ</p>
                    <div className="flex items-end justify-between">
                      <h4 className="text-xl font-black text-indigo-700">
                        {stats.counterDepositedAmount.toLocaleString('ur-PK')}<span className="text-[10px] text-slate-400 font-normal"> روپے</span>
                      </h4>
                      <Briefcase className="text-indigo-100 shrink-0" size={32} />
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                    <p className="text-orange-500 text-xs font-bold mb-1">کیش آف ہینڈ (غیر منتقل)</p>
                    <div className="flex items-end justify-between">
                      <h4 className="text-xl font-black text-orange-600">
                        {stats.cashOnHand.toLocaleString('ur-PK')}<span className="text-[10px] text-slate-400 font-normal"> روپے</span>
                      </h4>
                      <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 font-extrabold text-[10px] shrink-0">{stats.paymentPercentage}%</div>
                    </div>
                  </div>
                </div>

                {/* Grid controls */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col items-center justify-center text-center space-y-6">
                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 shrink-0">
                      <ScrollText size={32} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-800 font-sans">قربانی مہم کے لیے مشترکہ انتظام</h3>
                      <p className="text-slate-500 max-w-lg mt-1.5 leading-relaxed text-xs font-sans">
                        ہر برانچ (کورنگی، لانڈھی، قیوم آباد، ہیڈ آفس) کے وصول کنندگان اسی سافٹ وئیر پر بیک وقت کام کرسکتے ہیں۔ جوں ہی کوئی وصولی ہوگی، مانیٹر پر لائیو سنک ہوگی!
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3 justify-center">
                      <button 
                        onClick={() => setView('list')}
                        className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center gap-1.5 text-xs shadow-md active:scale-95"
                      >
                        <ScrollText size={16} /> گائے کی لسٹ اور ٹریکنگ
                      </button>
                      <button 
                        onClick={() => setView('deposits')}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-1.5 text-xs active:scale-95"
                      >
                        <Coins size={16} /> بینک و کیش دراز منتقلی
                      </button>
                    </div>
                  </div>

                  {/* Synchronized Multi-branch Collections & Activities Feed with Light Green Background & Thick Black Border */}
                  <div className="bg-[#E8F5E9] text-slate-900 rounded-2xl p-5 flex flex-col border-4 border-slate-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" dir="rtl">
                    <div className="flex items-center justify-between border-b-2 border-slate-950 pb-2.5 mb-3 shrink-0">
                      <div className="flex items-center gap-2">
                        <Activity className="text-emerald-800 animate-pulse" size={18} />
                        <span className="text-xs font-black tracking-wide text-slate-900 font-sans">کاؤنٹر وار وصولی رپورٹ (لائیو سنک)</span>
                      </div>
                      <span className="text-[9px] bg-emerald-800 text-white font-black px-2 py-0.5 rounded-full uppercase shrink-0">
                        لائیو
                      </span>
                    </div>
                    
                    {/* Collections Summary Table */}
                    <div className="space-y-2 mb-4">
                      <div className="bg-white/90 rounded-xl p-3 border-2 border-slate-950">
                        <table className="w-full text-xs text-right">
                          <thead>
                            <tr className="border-b-2 border-slate-900 text-slate-600 font-black text-[10px]">
                              <th className="pb-1 text-right font-black">کاؤنٹر ریکارڈ</th>
                              <th className="pb-1 text-center font-black">حصے</th>
                              <th className="pb-1 text-left font-black">وصول شدہ رقم</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {branches.map((b) => {
                              const bCol = branchCollections[b.id] || { amount: 0, count: 0 };
                              return (
                                <tr key={b.id} className="hover:bg-emerald-100/30 transition-colors">
                                  <td className="py-2 flex items-center gap-1.5 font-bold text-slate-900 text-[11px]">
                                    <span className={`w-2.5 h-2.5 rounded-full ${b.color} border border-slate-950 shrink-0`}></span>
                                    {b.label}
                                  </td>
                                  <td className="py-2 text-center font-extrabold font-mono text-slate-700">{bCol.count}</td>
                                  <td className="py-2 text-left font-black font-mono text-emerald-800">
                                    {bCol.amount.toLocaleString('ur-PK')} <span className="text-[9px] font-bold text-slate-500">روپے</span>
                                  </td>
                                </tr>
                              );
                            })}
                            {/* Unknown fallbacks */}
                            {branchCollections['unknown'] && branchCollections['unknown'].amount > 0 && (
                              <tr className="hover:bg-emerald-100/30 transition-colors">
                                <td className="py-2 flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
                                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400 border border-slate-950 shrink-0"></span>
                                  نامعلوم کاؤنٹر
                                </td>
                                <td className="py-2 text-center font-extrabold font-mono text-slate-700">{branchCollections['unknown'].count}</td>
                                <td className="py-2 text-left font-black font-mono text-emerald-800">
                                  {branchCollections['unknown'].amount.toLocaleString('ur-PK')} <span className="text-[9px] font-bold text-slate-500">روپے</span>
                                </td>
                              </tr>
                            )}
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2 border-slate-950">
                              <td className="pt-2 font-black text-slate-900 text-xs">گرانڈ ٹوٹل:</td>
                              <td className="pt-2 text-center font-black font-mono text-slate-800 text-xs">{grandTotalCount} / {animals.length * SHARES_PER_ANIMAL}</td>
                              <td className="pt-2 text-left font-black font-mono text-emerald-900 text-xs sm:text-sm">
                                {grandTotalAmount.toLocaleString('ur-PK')}{' '}
                                <span className="text-[9px] font-extrabold text-slate-650">روپے</span>
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {/* Activities Log sub-panel */}
                    <div className="border-t-2 border-slate-950 pt-2.5 relative">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-black uppercase text-slate-655">سرگرمی لاگ (آخری تبدیلیاں):</span>
                      </div>
                      <div className="overflow-y-auto max-h-[95px] pr-1 space-y-1.5 bg-white/70 rounded-xl p-2 border border-slate-400">
                        {activityLogs.map((log) => (
                          <div key={log.id} className="text-[10px] leading-relaxed border-b border-slate-200 pb-1 last:border-none last:pb-0">
                            <div className="flex justify-between items-center text-slate-500 text-[8px] mb-0.5 font-bold">
                              <span className="text-emerald-800 font-black">{log.branch}</span>
                              <span>{log.timestamp}</span>
                            </div>
                            <p className="text-slate-805 font-medium">{log.details}</p>
                          </div>
                        ))}
                        {activityLogs.length === 0 && (
                          <p className="text-slate-400 text-center text-[10px] py-1">اب تک کوئی لائیو سرگرمی نہیں ہوئی ہے۔</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                  <div className="bg-emerald-900 rounded-2xl p-6 text-white flex flex-col justify-between relative overflow-hidden">
                    <div className="relative z-10 space-y-4">
                      <div className="flex items-center gap-2 text-emerald-400">
                        <Info size={18} />
                        <span className="text-[10px] font-bold uppercase tracking-widest leading-none">مدد اور طریقہ کار</span>
                      </div>
                      <h3 className="text-lg font-bold">بیک وقت انتظام اور رسیدیں</h3>
                      <ul className="text-emerald-100/70 text-xs list-disc pr-4 space-y-2">
                        <li>ہر حصہ دار کا حصہ/رقم بک کریں۔</li>
                        <li>وہیں سے وصولی پر پرنٹ ایبل رسید حاصل کریں۔</li>
                        <li>ایک سے زیادہ گائے کی رقم اکٹھی ہو جانے پر اکاؤنٹ مینیجر سے بینک ڈپازٹ درج کریں۔</li>
                      </ul>
                    </div>
                    <Beef className="absolute -bottom-10 -right-10 text-emerald-800 opacity-20" size={160} />
                  </div>
              </motion.div>
            )}

            {/* Deposits Management View */}
            {view === 'deposits' && (
              <motion.div 
                key="deposits"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-4xl mx-auto space-y-8 pb-32"
              >
                <div className="bg-white rounded-3xl p-6 lg:p-8 border border-slate-200 shadow-sm">
                  <h3 className="text-2xl font-black text-slate-800 mb-2 flex items-center gap-2">
                    <Coins className="text-emerald-600" size={26} />
                    بینک اکاؤنٹ ڈپازٹ مینیجر
                  </h3>
                  <p className="text-slate-500 text-sm">
                    جب آپ کے پاس ۳ گائے یا کسی گائے کا فنڈ جمیع ہو جائے تو آپ ان کی رقم کو بینک میں بھیج کر یہاں ایک جتھا (Batch) ٹرانسفر ریکارڈ کر سکتے ہیں۔
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-6 border-y border-slate-100 py-6 bg-slate-50/50 rounded-2xl p-4">
                    <div className="text-center">
                      <span className="text-slate-400 text-xs font-bold block mb-1">کُل وصول شدہ کیش</span>
                      <strong className="text-xl font-extrabold text-slate-800">{stats.totalCashReceived.toLocaleString('ur-PK')} روپیہ</strong>
                    </div>
                    <div className="text-center border-x border-slate-200">
                      <span className="text-slate-400 text-xs font-bold block mb-1">اکاؤنٹس میں منتقل شدہ</span>
                      <strong className="text-xl font-extrabold text-blue-600">{stats.bankDepositedAmount.toLocaleString('ur-PK')} روپیہ</strong>
                    </div>
                    <div className="text-center">
                      <span className="text-slate-400 text-xs font-bold block mb-1">باقی کیش آن ہینڈ</span>
                      <strong className="text-xl font-extrabold text-orange-600">{stats.cashOnHand.toLocaleString('ur-PK')} روپیہ</strong>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h4 className="font-bold text-slate-700 text-lg">نیا بینک چالان / فنڈ ڈپازٹ بنائیں</h4>
                    
                    {depositAbleAnimals.length === 0 ? (
                      <div className="p-4 bg-orange-50 border border-orange-100 text-orange-800 rounded-xl text-sm">
                         کوئی نیا فنڈ والا جانور دستیاب نہیں ہے جس کی رقم اب تک بینک ڈپازٹ نہ کی گئی ہو۔
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-xs text-slate-400 font-bold">ان جانوروں کو منتخب کریں جن کا کیش آپ بینک بھیج رہے ہیں:</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {depositAbleAnimals.map(ar => (
                            <label 
                              key={ar.id}
                              className={`p-3 rounded-xl border-2 transition-all flex items-center justify-between cursor-pointer ${
                                selectedAnimalsForDeposit.includes(ar.id)
                                  ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold'
                                  : 'border-slate-100 bg-white text-slate-700 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex flex-col">
                                <span className="text-sm">{ar.label}</span>
                                <span className="text-xs text-slate-400 font-normal">{ar.collected.toLocaleString('ur-PK')} روپے</span>
                              </div>
                              <input 
                                type="checkbox"
                                checked={selectedAnimalsForDeposit.includes(ar.id)}
                                onChange={() => {
                                  if (selectedAnimalsForDeposit.includes(ar.id)) {
                                    setSelectedAnimalsForDeposit(selectedAnimalsForDeposit.filter(id => id !== ar.id));
                                  } else {
                                    setSelectedAnimalsForDeposit([...selectedAnimalsForDeposit, ar.id]);
                                  }
                                }}
                                className="w-5 h-5 accent-emerald-600 cursor-pointer"
                              />
                            </label>
                          ))}
                        </div>

                        {/* Choose Destination: Bank Account vs Counter Cash Drawer */}
                        <div className="space-y-2">
                          <p className="text-xs text-slate-500 font-bold">منتقلی کی جگہ منتخب کریں (فنڈز متبادل):</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button
                              type="button"
                              onClick={() => setDepositDestination('bank')}
                              className={`p-4 rounded-2xl border-2 text-right transition-all flex items-center justify-between ${
                                depositDestination === 'bank'
                                  ? 'border-blue-600 bg-blue-50/50 text-blue-950 font-bold'
                                  : 'border-slate-100 bg-white text-slate-700 hover:border-slate-200'
                              }`}
                            >
                              <div>
                                <h5 className="text-sm font-bold flex items-center gap-2">
                                  <CreditCard className="text-blue-600" size={16} />
                                  بینک اکاؤنٹ ٹرانسفر (رقم جمع کروائیں)
                                </h5>
                                <p className="text-[11px] text-slate-400 font-normal mt-0.5">اکاؤنٹس میں باقاعدہ بینک سلپ پر جمع کروانا</p>
                              </div>
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${depositDestination === 'bank' ? 'border-blue-650 bg-blue-600' : 'border-slate-300'}`}>
                                {depositDestination === 'bank' && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => setDepositDestination('counter')}
                              className={`p-4 rounded-2xl border-2 text-right transition-all flex items-center justify-between ${
                                depositDestination === 'counter'
                                  ? 'border-indigo-600 bg-indigo-50/55 text-indigo-950 font-bold'
                                  : 'border-slate-100 bg-white text-slate-700 hover:border-slate-200'
                              }`}
                            >
                              <div>
                                <h5 className="text-sm font-bold flex items-center gap-2">
                                  <Briefcase className="text-indigo-600" size={16} />
                                  کیش دراز کاؤنٹر نقد درج (کیش ٹرانسفر)
                                </h5>
                                <p className="text-[11px] text-slate-400 font-normal mt-0.5">دفتر کے نقد دراز یا کیشئیر کے حوالے کرنا</p>
                              </div>
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${depositDestination === 'counter' ? 'border-indigo-650 bg-indigo-600' : 'border-slate-300'}`}>
                                {depositDestination === 'counter' && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
                              </div>
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                          <div className="space-y-1">
                            <label className="text-xs text-slate-500 font-bold">
                              {depositDestination === 'bank' 
                                ? 'بینک تفصیل / حوالہ (مثلاً میزان بینک لمیٹڈ - سلپ نمبر ۹۰۸)' 
                                : 'کاؤنٹر نقد تفصیل (مثلاً مینیجر دراز کیش / رسید نمبر ۴۵۳)'
                              }
                            </label>
                            <input 
                              type="text"
                              value={depositReference}
                              onChange={(e) => setDepositReference(e.target.value)}
                              placeholder={depositDestination === 'bank' ? 'میزان بینک، چالان سلپ ۴۳۲' : 'ہیڈ کیشئیر دراز جمع'}
                              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 outline-none text-xs focus:ring-2 focus:ring-emerald-500 font-bold"
                            />
                          </div>
                          <div className="flex items-end">
                            <button
                              onClick={handleCreateDeposit}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md"
                            >
                              <Database size={16} /> 
                              {depositDestination === 'bank' ? 'بینک منتقلی درج کریں' : 'کاؤنٹر کیش ٹرانسفر درج کریں'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Deposits History List */}
                <div className="bg-white rounded-3xl p-6 lg:p-8 border border-slate-200 shadow-sm">
                  <h3 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2">
                    <History size={20} className="text-slate-500" />
                    اکاؤنٹ میں رقم بھیجنے کی منتقلی کا ریکارڈ
                  </h3>

                  {deposits.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      اب تک کوئی بینک ڈپازٹ ریکارڈ نہیں کیا گیا ہے۔
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {deposits.map(dep => (
                        <div key={dep.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-bold px-2.5 py-1 rounded bg-slate-200 text-slate-700 font-mono uppercase">
                                ٹرانزیکشن ID: {dep.id}
                              </span>
                              <span className={`text-[10px] font-bold px-2.5 py-1 rounded ${
                                dep.destination === 'counter' 
                                  ? 'bg-indigo-150 bg-indigo-100 text-indigo-800 border border-indigo-200' 
                                  : 'bg-blue-150 bg-blue-100 text-blue-800 border border-blue-200'
                              }`}>
                                {dep.destination === 'counter' ? 'کاؤنٹر نقد دراز' : 'بینک اکاؤنٹ ٹرانسفر'}
                              </span>
                              {dep.collectorBranch && (
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200/50">
                                  وصول کنندہ: {dep.collectorBranch}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2.5">
                              {dep.animalNames.map((name, i) => (
                                <span key={i} className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                                  {name}
                                </span>
                              ))}
                            </div>
                            <p className="text-xs text-slate-500 font-bold mt-1 text-right sm:text-left">حوالہ: {dep.reference}</p>
                          </div>
                          <div className="text-right flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto mt-2 sm:mt-0 border-t sm:border-t-0 border-slate-200/60 pt-2 sm:pt-0">
                            <strong className="text-lg font-black text-slate-800">{dep.totalAmount.toLocaleString('ur-PK')} روپے</strong>
                            <span className="text-xs text-slate-400 font-bold">{dep.date}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Animals list manager */}
            {view === 'list' && (
              <motion.div 
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Search & Filter */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <input 
                      type="text" 
                      placeholder="گائے نمبر یا حصہ دار کا نام تلاش کریں..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-2xl py-4 pr-12 pl-4 focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                    />
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  </div>
                  <button className="bg-white border border-slate-200 p-4 rounded-2xl text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2 font-bold px-6">
                    <Filter size={20} /> فلٹر
                  </button>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 pb-20">
                  {filteredAnimals.map(a => {
                    const distributedCount = a.shares.filter(s => s.isDistributed).length;
                    const isFullyDistributed = distributedCount === SHARES_PER_ANIMAL;
                    const totalPaidCount = a.shares.filter(s => s.isPaid).length;

                    return (
                      <button
                        key={a.id}
                        onClick={() => {
                          setSelectedAnimalId(a.id);
                          setView('detail');
                        }}
                        className={`p-4 rounded-2xl border transition-all text-right flex flex-col justify-between h-40 relative group ${
                          isFullyDistributed 
                            ? 'bg-emerald-50 border-emerald-200' 
                            : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-center justify-between pointer-events-none">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${isFullyDistributed ? 'bg-emerald-200 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            #{a.id}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${totalPaidCount === 7 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
                            {totalPaidCount}/7 وصولی  
                          </span>
                        </div>
                        <div className="mt-2 pointer-events-none">
                          <h4 className="font-black text-slate-800 text-base">{a.label}</h4>
                          <div className="flex items-center gap-2 mt-2">
                             <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                               <div 
                                className="h-full bg-emerald-500 transition-all" 
                                style={{ width: `${(distributedCount/SHARES_PER_ANIMAL)*100}%` }}
                               />
                             </div>
                             <span className="text-[10px] font-bold text-slate-500">{distributedCount}/7 تقسیم</span>
                          </div>
                        </div>
                        <div className="absolute inset-0 bg-emerald-500/0 group-hover:bg-emerald-500/5 transition-all rounded-2xl"></div>
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* Shareholder actions & receipt issuing view */}
            {view === 'detail' && selectedAnimal && (
              <motion.div 
                key="detail"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="max-w-4xl mx-auto space-y-8 pb-32"
              >
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-6 lg:p-8 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                      <h3 className="text-2xl font-black text-slate-800 tracking-tight">{selectedAnimal.label}</h3>
                      <p className="text-slate-400 text-sm font-bold flex items-center gap-1.5 mt-1">
                        <Users size={14} /> کُل حصہ دار: {SHARES_PER_ANIMAL} | وصول ہو گئے: {selectedAnimal.shares.filter(s => s.isPaid).length}
                      </p>
                    </div>
                    <div className="text-right">
                       <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">سٹیٹس</span>
                       <span className="text-emerald-700 font-extrabold text-lg">تقسیم و ادائیگی مانیٹر</span>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {selectedAnimal.shares.map((s, idx) => {
                      const isShareLocked = s.isPaid && activeBranch !== 'nazim' && s.paidByBranchId && s.paidByBranchId !== activeBranch;
                      return (
                        <div key={s.id} className="p-4 lg:p-6 flex flex-col space-y-4 hover:bg-slate-50/50 transition-colors">
                          <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                            
                            {/* Left column: ID & core details, inputs */}
                            <div className="flex items-start gap-3 flex-1">
                              <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-400 shrink-0 mt-2">{idx + 1}</span>
                              <div className="flex-1 space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                                  <div className="col-span-1">
                                    <label className="text-[10px] text-slate-400 font-bold block mb-0.5">حصہ دار کا نام</label>
                                    <input 
                                      type="text" 
                                      value={s.name}
                                      disabled={isShareLocked}
                                      onChange={(e) => updateShareName(selectedAnimal.id, s.id, e.target.value)}
                                      className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none text-xs disabled:opacity-70 disabled:bg-slate-100/70 disabled:cursor-not-allowed"
                                      placeholder="نام درج کریں"
                                    />
                                  </div>

                                  <div className="col-span-1">
                                    <label className="text-[10px] text-slate-400 font-bold block mb-0.5">واٹس ایپ نمبر (بغیر ڈیش)</label>
                                    <input 
                                      type="text" 
                                      value={s.phone || ''}
                                      disabled={isShareLocked}
                                      onChange={(e) => updateSharePhone(selectedAnimal.id, s.id, e.target.value)}
                                      className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl font-bold font-mono text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none text-xs disabled:opacity-70 disabled:bg-slate-100/70 disabled:cursor-not-allowed"
                                      placeholder="مثلاً 03001234567"
                                    />
                                  </div>

                                  <div className="col-span-1">
                                    <label className="text-[10px] text-slate-400 font-bold block mb-0.5">پتہ (اختیاری)</label>
                                    <input 
                                      type="text" 
                                      value={s.address || ''}
                                      disabled={isShareLocked}
                                      onChange={(e) => updateShareAddress(selectedAnimal.id, s.id, e.target.value)}
                                      className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none text-xs disabled:opacity-70 disabled:bg-slate-100/70 disabled:cursor-not-allowed"
                                      placeholder="پتہ درج کریں"
                                    />
                                  </div>

                                  <div className="col-span-1">
                                    <label className="text-[10px] text-slate-400 font-bold block mb-0.5">رقم (روپے)</label>
                                    <input 
                                      type="number" 
                                      value={s.amountPaid}
                                      disabled={isShareLocked || activeBranch !== 'nazim'}
                                      onChange={(e) => updateShareAmount(selectedAnimal.id, s.id, Number(e.target.value))}
                                      className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl font-bold font-mono text-slate-800 text-xs focus:ring-1 focus:ring-emerald-500 outline-none disabled:opacity-70 disabled:bg-slate-100/70 disabled:cursor-not-allowed"
                                      placeholder="رقم درج کریں"
                                    />
                                  </div>

                                  <div className="col-span-1">
                                    <label className="text-[10px] text-slate-400 font-bold block mb-0.5">وقتِ فراہمیِ گوشت</label>
                                    <div className="flex bg-slate-50 border border-slate-200 rounded-xl overflow-hidden items-center focus-within:ring-1 focus-within:ring-emerald-500">
                                      <input 
                                        type="text" 
                                        value={(() => {
                                          const parts = s.expectedDeliveryTime ? s.expectedDeliveryTime.split(' ') : ['01:00', 'PM'];
                                          if (parts.length > 2) return s.expectedDeliveryTime;
                                          return parts[0] || '';
                                        })()}
                                        disabled={isShareLocked}
                                        onChange={(e) => {
                                          const inputVal = e.target.value;
                                          const parts = s.expectedDeliveryTime ? s.expectedDeliveryTime.split(' ') : ['01:00', 'PM'];
                                          const period = parts[1] || 'PM';
                                          updateShareDeliveryTime(selectedAnimal.id, s.id, `${inputVal} ${period}`);
                                        }}
                                        className="w-full bg-transparent p-2 rounded-l-none font-bold text-slate-800 text-xs outline-none disabled:opacity-70 disabled:bg-slate-100/70"
                                        placeholder="مثلاً 01:00"
                                      />
                                      <div className="flex border-r border-slate-200 h-full shrink-0">
                                        <button
                                          type="button"
                                          disabled={isShareLocked}
                                          onClick={() => {
                                            const parts = s.expectedDeliveryTime ? s.expectedDeliveryTime.split(' ') : ['01:05', 'PM'];
                                            const time = parts[0] || '01:00';
                                            updateShareDeliveryTime(selectedAnimal.id, s.id, `${time} AM`);
                                          }}
                                          className={`px-1.5 py-2 text-[8px] font-black transition-colors ${s.expectedDeliveryTime && s.expectedDeliveryTime.endsWith('AM') ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                        >
                                          AM
                                        </button>
                                        <button
                                          type="button"
                                          disabled={isShareLocked}
                                          onClick={() => {
                                            const parts = s.expectedDeliveryTime ? s.expectedDeliveryTime.split(' ') : ['01:05', 'PM'];
                                            const time = parts[0] || '01:00';
                                            updateShareDeliveryTime(selectedAnimal.id, s.id, `${time} PM`);
                                          }}
                                          className={`px-1.5 py-2 text-[8px] font-black transition-colors ${s.expectedDeliveryTime && s.expectedDeliveryTime.endsWith('PM') ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                        >
                                          PM
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 flex-wrap">
                                  <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded leading-none">ID: {s.id}</span>
                                  
                                  {s.isPaid && s.paidByBranchLabel && (
                                    <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 font-bold flex items-center gap-1 leading-none">
                                      <Lock size={10} className="text-blue-500 shrink-0" /> کاؤنٹر مہر: {s.paidByBranchLabel}
                                    </span>
                                  )}

                                  {s.isDistributed && s.distributionTime && (
                                    <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100 font-bold flex items-center gap-1 leading-none">
                                      <CheckCircle2 size={10} className="text-emerald-500 shrink-0" /> گوشت ٹوکرا تقسیم شدہ: {s.distributionTime}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right column: Action buttons for payments, receipts, distribution */}
                            <div className="flex flex-row md:flex-col items-stretch gap-2 shrink-0 md:min-w-[200px] border-t md:border-t-0 border-slate-100 pt-3 md:pt-0">
                              
                              {/* Toggle Payment */}
                              <button
                                onClick={() => togglePayment(selectedAnimal.id, s.id)}
                                disabled={isShareLocked}
                                className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all flex-1 md:flex-initial shadow-sm ${
                                  isShareLocked
                                    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                                    : s.isPaid 
                                      ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' 
                                      : 'bg-white border-slate-200 text-slate-500 hover:border-blue-200 hover:bg-slate-50'
                                }`}
                              >
                                {isShareLocked ? (
                                  <>
                                    <Lock size={14} className="text-slate-400 shrink-0 animate-pulse" />
                                    <span>دیگر کاؤنٹر سے مربوط</span>
                                  </>
                                ) : (
                                  <>
                                    {s.isPaid ? <CheckCircle2 size={14} className="text-blue-600 shrink-0" /> : <Circle size={14} className="text-slate-300 shrink-0" />}
                                    {s.isPaid ? `رقم موصول: ${s.amountPaid.toLocaleString('ur-PK')}` : 'ادائیگی وصول کریں'}
                                  </>
                                )}
                              </button>

                              {/* View printable Receipt slip */}
                              <button
                                onClick={() => setActiveSlip({ animal: selectedAnimal, share: s, index: idx + 1 })}
                                className="bg-slate-100 border border-slate-200 text-slate-800 px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-slate-200 transition-all active:scale-95 flex-1 md:flex-initial shadow-sm"
                              >
                                <Receipt size={14} className="text-slate-500" />
                                رسید جاری کریں 
                              </button>

                              {/* Toggle distributed meat status */}
                              <button 
                                onClick={() => toggleDistribution(selectedAnimal.id, s.id)}
                                className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border-2 transition-all flex-1 md:flex-initial shadow-sm ${
                                  s.isDistributed 
                                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-md hover:bg-emerald-700' 
                                    : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-250 hover:bg-slate-50'
                                }`}
                              >
                                {s.isDistributed ? 'گوشت مل گیا (سبز)' : 'گوشت ٹوکرا دیا (باقی)'}
                              </button>

                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                    <Info size={24} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-black text-blue-900 mb-1">ہدایات برائے رسید و وصولی وقت</h4>
                    <p className="text-blue-700/80 text-xs leading-relaxed">
                      جب کوئی حصہ دار رقم جمع کروائے، تو اس کے "رقم وصول" بٹن پر کلک کریں۔ سائیڈ میں "توقعِ فراہمیِ گوشت کا وقت" (مثلاً صبح 11:30 بجے) درج ضرور کریں، پھر **رسید جاری کریں** کے بٹن پر دبا کر انھیں باضابطہ ڈیجیٹل سلپ/رسیپٹ پیش کریں۔
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* settings view to rename animals/register etc */}
            {view === 'settings' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="max-w-4xl mx-auto space-y-8 pb-32"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black text-slate-800">قربانی جانوروں کا اندراج و بحالی</h3>
                  <button 
                    onClick={addAnimal}
                    className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-md"
                  >
                    <Plus size={20} /> اگلی گائے شامل کریں +
                  </button>
                </div>

                {/* Year Management Card */}
                <div className="bg-indigo-50 border border-indigo-200 p-6 rounded-3xl space-y-4">
                  <div className="flex items-center gap-2 text-indigo-900">
                    <Calendar className="text-indigo-700" size={22} />
                    <h4 className="font-extrabold text-sm font-sans">سالانہ سیشن اور عید ریکارڈ مینیجر (سال وار انتظام):</h4>
                  </div>
                  <p className="text-xs text-indigo-700/80 leading-relaxed font-bold">
                    یہاں سے ناظمِ مدرسہ (ایڈمن) ہر سال قربانی سوسائٹی کے کُل حسابات کا الگ سالانہ سیشن متعین کر سکتا ہے۔ سال تبدیل کرنے سے سابقہ سال کا تمام ڈیٹا بیک گراؤنڈ میں محفوظ رہے گا اور دوسرے کاؤنٹرز پر بھی منتخب کردہ سال کا نیا از سر نو صاف ڈیٹا خودکار لائیو سنک کے ذریعے لاگو ہو جائے گا۔
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Switch Year Selection */}
                    <div className="space-y-2 bg-white/50 p-4 rounded-2xl border border-indigo-100">
                      <label className="text-xs text-indigo-950 font-black block">موجودہ فعال سال تبدیل کریں:</label>
                      <div className="flex gap-2">
                        <select
                          value={activeYear}
                          disabled={activeBranch !== 'nazim'}
                          onChange={(e) => changeYear(e.target.value)}
                          className="flex-1 bg-white border border-indigo-200/50 p-2.5 rounded-xl font-bold font-mono text-indigo-950 text-sm focus:ring-1 focus:ring-indigo-500 outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
                        >
                          {years.map(yr => (
                            <option key={yr} value={yr}>سالِ قربانی: {yr}</option>
                          ))}
                        </select>
                        <span className="bg-indigo-600 text-white font-extrabold px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-center">
                          فعال سیشن
                        </span>
                      </div>
                      <p className="text-[10px] text-indigo-500 font-medium">
                        * ناظم کے اکاؤنٹ سے تبدیل کیا جانے والا سال تمام کاؤنٹرز کے کمپیوٹرز پر لائیو لاگو ہوگا۔
                      </p>
                    </div>

                    {/* Add New Year */}
                    <div className="space-y-2 bg-white/50 p-4 rounded-2xl border border-indigo-100">
                      <label className="text-xs text-indigo-950 font-black block">نیا سال/سیشن متعین کریں (از سر نو آغاز):</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newYearInput}
                          disabled={activeBranch !== 'nazim'}
                          onChange={(e) => setNewYearInput(e.target.value)}
                          placeholder="مثلاً: 2027 یا 1448"
                          className="flex-1 bg-white border border-indigo-200/50 p-2.5 rounded-xl font-bold font-mono text-slate-800 text-sm focus:ring-1 focus:ring-indigo-500 outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
                        />
                        <button
                          type="button"
                          disabled={activeBranch !== 'nazim'}
                          onClick={() => {
                            const yr = newYearInput.trim();
                            if (!yr) {
                              triggerAlert('براہ کرم کوئی سال درج کریں، جیسے 2027 یا 1448 ہجری۔', 'غلطی');
                              return;
                            }
                            if (years.includes(yr)) {
                              triggerAlert('یہ سال پہلے سے شامل ہے۔ براہ کرم فہرست میں سے منتخب کریں یا نیا سال لکھیں۔', 'اطلاع');
                              return;
                            }
                            triggerConfirm(
                              `کیا آپ واقعی سال "${yr}" کا اضافہ کر کے اسے ابھی سے لائیو لاگو کرنا چاہتے ہیں؟ اس سے تمام 60 گایوں کے حصے بالکل خالی اور تازہ سالانہ شیٹ کے بابت تیار شروع ہوں گے!`,
                              () => {
                                const updatedYears = [...years, yr];
                                setYears(updatedYears);
                                localStorage.setItem('qurbani_years_list_v1', JSON.stringify(updatedYears));
                                changeYear(yr);
                                setNewYearInput('');
                                triggerAlert(`کامیابی! سال ${yr} کا لائیو سیشن متعین ہو چکا ہے اور دیگر مفتحہ کاؤنٹربکنگ سیکشنز کو بھی اس کا ریفرنس روانہ کر دیا گیا ہے۔`, 'کامیابی عظمیٰ');
                              },
                              'عید سیشن لاگو کریں'
                            );
                          }}
                          className="bg-indigo-700 hover:bg-indigo-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          + نیا سال شروع کریں
                        </button>
                      </div>
                      <p className="text-[10px] text-indigo-500 font-medium">
                        * نیا عید سال شروع کرنے سے تمام کاؤنٹرز پر مہم بالکل از سر نو شروع ہوگی۔
                      </p>
                    </div>
                  </div>
                </div>

                {/* Global default Share Amount card */}
                <div className="bg-blue-50 border border-blue-200 p-6 rounded-3xl space-y-4">
                  <div className="flex items-center gap-2 text-blue-900">
                    <Coins className="text-blue-700" size={22} />
                    <h4 className="font-extrabold text-sm font-sans">مرکزی طے شدہ بنیادی حصہ رقم (فیس فی حصہ):</h4>
                  </div>
                  <p className="text-xs text-blue-700/80 leading-relaxed font-bold">
                    یہاں سے ناظمِ مدرسہ تمام کاؤنٹربکنگ مینوئل فیس کے تفاوت سے بچنے کے لیے ایک دفعہ کُل حصہ فیس متعین کر سکتا ہے۔ نئے شامل ہونے والے جانوروں کے تمام حصوں کی قیمت خودکار طور پر یہی رقم لاگو ہوگی۔
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1 sm:col-span-1">
                      <label className="text-xs text-blue-900/70 font-bold block">متعین رقم برائے حصہ (روپے):</label>
                      <input 
                        type="number"
                        value={globalShareAmount}
                        disabled={activeBranch !== 'nazim'}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (!isNaN(val) && val >= 0) {
                            setGlobalShareAmount(val);
                          }
                        }}
                        className="w-full bg-white border border-blue-200/50 p-2.5 rounded-xl font-bold font-mono text-slate-800 text-sm focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
                        placeholder="مثال: 24500"
                      />
                    </div>
                    <div className="flex items-end sm:col-span-2 gap-2">
                      {activeBranch === 'nazim' ? (
                        <button
                          type="button"
                          onClick={() => {
                            // Retroactively apply to ALL unpaid shares
                            triggerConfirm(
                              `کیا آپ واقعی تمام موجودہ گایوں کے "غیر ادا شدہ" (unpaid) حصوں کی رقم تبدیل کر کے ${globalShareAmount.toLocaleString('ur-PK')} روپے کرنا چاہتے ہیں؟`,
                              () => {
                                setAnimals(prev => {
                                  const updated = prev.map(a => ({
                                    ...a,
                                    shares: a.shares.map(s => s.isPaid ? s : { ...s, amountPaid: globalShareAmount })
                                  }));
                                  localStorage.setItem('qurbani_data_v4', JSON.stringify(updated));
                                  broadcastSync(updated, deposits, activityLogs);
                                  return updated;
                                });
                                triggerAlert('کامیابی! تمام غیر ادا شدہ حصوں کی رقم نئی رقم کے مطابق یکمشت تبدیل کر دی گئی ہے۔', 'کامیابی');
                                logActivity('add_animal', `تمام غیر ادا شدہ حصوں کی رقم یکمشت تبدیل کر کے ${globalShareAmount.toLocaleString('ur-PK')} روپے مقرر کی گئی`);
                              },
                              'رقم یکمشت تبدیل کریں'
                            );
                          }}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-md text-center"
                        >
                          تمام غیر ادا شدہ حصوں کی رقم یکمشت اپ ڈیٹ کریں ✨
                        </button>
                      ) : (
                        <div className="text-xs text-amber-700 font-bold p-3 bg-amber-50 rounded-xl border border-amber-200/40 w-full text-center">
                          ⚠️ ترمیم اور یکمشت اپ ڈیٹ کی صلاحیت صرف ناظم مدرسہ اکاؤنٹ کے پاس دستیاب ہے۔
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Custom Animal ID restore utility card */}
                <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl space-y-4">
                  <h4 className="font-bold text-emerald-950 text-sm flex items-center gap-2">
                    <RotateCw className="text-emerald-700" size={18} />
                    مخصوص گائے بحالی مرکز (مثال کے طور پر اگر درمیان سے کسی گائے کا نمبر غلطی سے حذف ہوگیا ہو تو اسے دوبارہ یہاں سے مخصوص نمبر دے کر شامل کریں):
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-emerald-900/70 font-bold block">جانور نمبر (آئی ڈی)</label>
                      <input 
                        type="number"
                        value={customAnimalIdInput}
                        onChange={(e) => setCustomAnimalIdInput(e.target.value)}
                        placeholder="مثال: 5"
                        className="w-full bg-white border border-emerald-200/50 p-2.5 rounded-xl font-bold text-slate-800 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-emerald-900/70 font-bold block">جانور کا نام / لیبل</label>
                      <input 
                        type="text"
                        value={customAnimalLabelInput}
                        onChange={(e) => setCustomAnimalLabelInput(e.target.value)}
                        placeholder="مثال: گائے نمبر 5"
                        className="w-full bg-white border border-emerald-200/50 p-2.5 rounded-xl font-bold text-slate-800 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={() => {
                          const customId = parseInt(customAnimalIdInput);
                          if (!customId || isNaN(customId)) {
                            alert('براہ کرم صحیح جانور نمبر درج کریں۔');
                            return;
                          }
                          const success = addAnimalCustom(customId, customAnimalLabelInput);
                          if (success) {
                            alert(`گائے نمبر ${customId} کو کامیابی سے دوبارہ بحال کر دیا گیا ہے!`);
                          }
                        }}
                        className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
                      >
                        <Plus size={16} /> گائے بحال/شامل کریں
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  <table className="w-full text-right">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-xs uppercase tracking-widest">
                      <tr>
                        <th className="p-4 text-center w-24">گائے ID</th>
                        <th className="p-4">جانور کی تفصیل / لیبل</th>
                        {activeBranch === 'nazim' && <th className="p-4 text-center w-36">کارروائی</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-bold">
                      {animals.map((a) => (
                        <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 text-center text-slate-400 font-mono">#{a.id}</td>
                          <td className="p-4">
                            <input 
                              type="text" 
                              value={a.label}
                              onChange={(e) => updateAnimalLabel(a.id, e.target.value)}
                              disabled={activeBranch !== 'nazim'}
                              className="w-full bg-transparent border-none outline-none font-bold text-lg text-slate-800 focus:text-emerald-600 transition-colors disabled:cursor-not-allowed disabled:text-slate-500"
                            />
                          </td>
                          {activeBranch === 'nazim' && (
                            <td className="p-4 text-center">
                              <button 
                                onClick={() => removeAnimal(a.id)}
                                className="text-red-400 hover:text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-50 transition-all shadow-sm"
                              >
                                خارج کریں
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {animals.length === 0 && (
                    <div className="p-12 text-center text-slate-400">
                       کوئی جانور موجود نہیں ہے، اوپر بٹن سے نئی گائے رجسٹر کریں۔
                    </div>
                  )}
                  {activeBranch !== 'nazim' && (
                    <div className="p-4 bg-amber-50 text-amber-800 text-[11px] font-bold text-center border-t border-slate-100">
                      ⚠️ توجہ: جانور خارج یا حذف کرنے کا اختیار اور لیبل کی براہِ راست تبدیلی صرف "ناظم مدرسہ" کے لاگ ان اکاؤنٹ کے پاس ہے۔
                    </div>
                  )}
                </div>

                {/* Branches / Counter Manager Section */}
                <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-6">
                  <div>
                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                      <Users className="text-emerald-600" size={20} />
                      کاؤنٹرز اور وصول کنندگان کا انتظام
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      یہاں سے آپ نئے وصول کنندہ افراد یا مختلف کاؤنٹرز (جیسے لانڈھی، کورنگی، یا کسی شخصیت کا نام جیسے قاری جاوید صاحب) شامل اور ترمیم کرسکتے ہیں۔
                    </p>
                  </div>

                  {/* Form to add a new counter */}
                  {activeBranch === 'nazim' ? (
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        const form = e.currentTarget;
                        const formData = new FormData(form);
                        const label = formData.get('label')?.toString().trim();
                        const password = formData.get('password')?.toString().trim() || '123';
                        if (!label) return;

                        // Check duplicate
                        if (branches.some(b => b.label === label)) {
                          alert('یہ کاؤنٹر پہلے سے ہی موجود ہے!');
                          return;
                        }

                        const randomColors = [
                          { color: 'bg-emerald-600', textColor: 'text-emerald-700', accent: 'emerald' },
                          { color: 'bg-indigo-600', textColor: 'text-indigo-700', accent: 'indigo' },
                          { color: 'bg-sky-600', textColor: 'text-sky-700', accent: 'sky' },
                          { color: 'bg-amber-600', textColor: 'text-amber-700', accent: 'amber' },
                          { color: 'bg-rose-600', textColor: 'text-rose-700', accent: 'rose' },
                          { color: 'bg-teal-600', textColor: 'text-teal-700', accent: 'teal' }
                        ];
                        const randomStyle = randomColors[Math.floor(Math.random() * randomColors.length)];

                        const newBranchId = 'branch_' + Math.random().toString(36).substr(2, 9);
                        const newBranch: Branch = {
                          id: newBranchId,
                          label,
                          password,
                          color: randomStyle.color,
                          textColor: randomStyle.textColor,
                          accent: randomStyle.accent,
                          isCustom: true
                        };

                        setBranches(prev => [...prev, newBranch]);
                        form.reset();
                        alert(`موصول کنندہ کاؤنٹر "${label}" کامیابی سے شامل کر دیا گیا۔ اب یہ باقاعدہ اکاؤنٹ لاگ ان کے طور پر منتخب کیا جا سکے گا!`);
                      }}
                      className="grid grid-cols-1 sm:grid-cols-4 gap-4"
                    >
                      <div className="sm:col-span-2">
                        <input 
                          type="text"
                          name="label"
                          required
                          placeholder="نئے کاؤنٹر کا نام درج کریں (مثلاً: قاری جاوید صاحب)"
                          className="w-full bg-white border border-slate-200 p-2.5 rounded-xl font-bold text-slate-800 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                      <div>
                        <input 
                          type="text"
                          name="password"
                          placeholder="پاسورڈ درج کریں (ڈیفالٹ: 123)"
                          className="w-full bg-white border border-slate-200 p-2.5 rounded-xl font-bold text-slate-800 text-xs focus:ring-1 focus:ring-emerald-500 outline-none text-center"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
                      >
                        <Plus size={16} /> کاؤنٹر شامل کریں
                      </button>
                    </form>
                  ) : (
                    <div className="p-4 bg-amber-50 rounded-2xl text-amber-800 text-xs font-bold border border-amber-200/50">
                      ⚠️ توجہ: کاؤنٹرز کی معلومات شامل کرنا یا ان کے پاسورڈز تبدیل کرنا صرف "ناظم مدرسہ" کے انتظامی اکاؤنٹ سے ہی ممکن ہے۔
                    </div>
                  )}

                  {/* Table to edit/list/delete counters */}
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-100 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="p-3">کاؤنٹر کی شناخت</th>
                          <th className="p-3">نام / لیبل (ترمیم کریں)</th>
                          <th className="p-3">پاسورڈ / PIN (ترمیم کریں)</th>
                          <th className="p-3 text-center">نوعیت / اختیار</th>
                          <th className="p-3 text-center w-24">کارروائی</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-bold">
                        {branches.map((b) => (
                          <tr key={b.id} className="hover:bg-slate-50/40">
                            <td className="p-3 font-mono text-slate-400">#{b.id}</td>
                            <td className="p-3">
                              <input 
                                type="text"
                                value={b.label}
                                disabled={activeBranch !== 'nazim'}
                                onChange={(e) => {
                                  const updatedLabel = e.target.value;
                                  setBranches(prev => prev.map(item => item.id === b.id ? { ...item, label: updatedLabel } : item));
                                }}
                                className="w-full bg-transparent border-none outline-none font-bold text-slate-800 focus:text-emerald-600 disabled:text-slate-500"
                              />
                            </td>
                            <td className="p-3">
                              <input 
                                type="text"
                                value={b.password || (b.id === 'nazim' ? '9211' : '123')}
                                disabled={activeBranch !== 'nazim'}
                                onChange={(e) => {
                                  const updatedPass = e.target.value;
                                  setBranches(prev => prev.map(item => item.id === b.id ? { ...item, password: updatedPass } : item));
                                }}
                                className="w-full bg-slate-50/50 border border-slate-200/50 rounded-lg px-2.5 py-1.5 font-bold font-mono text-slate-800 focus:text-emerald-600 outline-none focus:ring-1 focus:ring-emerald-500 disabled:text-slate-400 disabled:bg-transparent disabled:border-none"
                              />
                            </td>
                            <td className="p-3 text-center">
                              {b.id === 'nazim' ? (
                                <span className="bg-red-50 text-red-700 border border-red-100 text-[10px] px-2 py-0.5 rounded-full">
                                  ناظمِ اعلیٰ (حذف اختیار)
                                </span>
                              ) : (
                                <span className="bg-slate-100 text-slate-600 border border-slate-200 text-[10px] px-2 py-0.5 rounded-full">
                                  عام وصول کنندہ
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {b.id === 'nazim' ? (
                                <span className="text-slate-400 text-[10px]">مستقل</span>
                              ) : (
                                activeBranch === 'nazim' ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      triggerConfirm(
                                        `کیا آپ واقعی کاؤنٹر "${b.label}" خارج کرنا چاہتے ہیں؟`,
                                        () => {
                                          setBranches(prev => prev.filter(item => item.id !== b.id));
                                          if (activeBranch === b.id) {
                                            setActiveBranch('nazim');
                                          }
                                          triggerAlert(`کاؤنٹر "${b.label}" کامیابی سے حذف ہو گیا ہے۔`, 'کامیابی');
                                        },
                                        'کاؤنٹر حذف کریں'
                                      );
                                    }}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2.5 py-1 rounded"
                                  >
                                    حذف کریں
                                  </button>
                                ) : (
                                  <span className="text-slate-400 text-[10px]">محفوظ</span>
                                )
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Dynamic Printable Slip Modal Overlay */}
        {activeSlip && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 relative flex flex-col justify-between"
            >
              {/* Slip Layout to show printable format */}
              <div id="printable-area" dir="rtl" className="border-4 border-double border-emerald-900/30 p-6 rounded-xl space-y-4 text-right bg-white" style={{ direction: 'rtl', textAlign: 'right' }}>
                <div className="text-center border-b border-slate-200 pb-3">
                  <Beef className="mx-auto text-emerald-600 mb-1" size={32} />
                  <h3 className="text-xl font-black text-slate-900">اجتماعی قربانی مدرسہ قاسم العلوم کورنگی 6</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Qurbani Management Office Receipt</p>
                </div>

                <div className="flex justify-between items-center text-xs text-slate-500 font-bold" dir="rtl" style={{ direction: 'rtl' }}>
                  <span>رسید نمبر: S-{activeSlip.share.id}</span>
                  <span>تاریخ: {new Date().toLocaleDateString('ur-PK') || '2026'}</span>
                </div>

                <div className="space-y-2.5 text-sm pt-2">
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-400 font-bold">گائے نمبر/تفصیل:</span>
                    <strong className="text-slate-800">{activeSlip.animal.label}</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-400 font-bold">حصہ نمبر:</span>
                    <strong className="text-slate-800">حصہ {activeSlip.index}</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-400 font-bold">نام حصہ دار:</span>
                    <strong className="text-emerald-700 text-base">{activeSlip.share.name || '---'}</strong>
                  </div>
                  {activeSlip.share.phone && (
                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-400 font-bold">واٹس ایپ نمبر:</span>
                      <strong className="text-slate-800 font-mono">{activeSlip.share.phone}</strong>
                    </div>
                  )}
                  {activeSlip.share.address && (
                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-400 font-bold">پتہ تلاش فرماویں:</span>
                      <strong className="text-slate-800">{activeSlip.share.address}</strong>
                    </div>
                  )}
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-400 font-bold">وصول شدہ رقم:</span>
                    <strong className="text-slate-800 text-lg font-mono">{activeSlip.share.amountPaid.toLocaleString('ur-PK')} روپے</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-400 font-bold">ادائیگی اسٹیٹس:</span>
                    <span className={`font-bold text-xs px-2.5 py-0.5 rounded ${activeSlip.share.isPaid ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                      {activeSlip.share.isPaid ? 'مکمل وصول ہو چکی ہے' : 'باقی / غیر ادا شدہ'}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-400 font-bold">گوشت فراہمی کا متوقع وقت:</span>
                    <strong className="text-emerald-800 font-extrabold flex items-center gap-1">
                      <Clock size={14} />
                      {activeSlip.share.expectedDeliveryTime}
                    </strong>
                  </div>
                </div>

                {/* Footnotes instruction */}
                <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl text-center text-[10px] leading-relaxed mt-4">
                  براہ کرم عید والے دن یہ رسید اپنے ہمراہ لائیں اور وقتِ مقررہ پر تشریف لائیں تاکہ گوشت کا ٹوکرا بآسانی وصول کیا جا سکے۔
                </div>

                <div className="flex justify-between items-end pt-6 text-[10px] text-slate-400 font-bold font-sans">
                  <div className="text-center min-w-[124px]">
                    <span className="block text-black font-black text-sm mb-1" style={{ color: '#000000', fontWeight: '900' }}>
                      {activeSlip.share.paidByBranchLabel || branches.find(b => b.id === activeBranch)?.label || 'کاؤنٹر'}
                    </span>
                    <span className="block border-t border-slate-200 w-full text-center mt-2 pt-1 font-bold text-slate-500">دستخط وصول کنندہ</span>
                  </div>
                  <div className="italic text-slate-400 font-bold">
                    اجتماعی قربانی مینیجر پرو ({activeYear})
                  </div>
                </div>
              </div>

              {/* Action buttons inside slip modal */}
              <div className="flex flex-col gap-2 mt-6">
                <div className="flex gap-2 w-full">
                  <button 
                    onClick={() => {
                      const printable = document.getElementById('printable-area');
                      if (printable) {
                        const origBodyDir = document.body.getAttribute('dir');
                        const origBodyClass = document.body.className;
                        
                        // Solidified media print rules to secure RTL block orientation (titles right, entries left) globally in all browsers
                        const styleBlock = `
                          <style>
                            @media print {
                              body {
                                direction: rtl !important;
                                text-align: right !important;
                                margin: 0 !important;
                                padding: 24px !important;
                                color: #000000 !important;
                                background-color: #ffffff !important;
                                -webkit-print-color-adjust: exact !important;
                                print-color-adjust: exact !important;
                              }
                              #printable-area {
                                border: 4px double #064e3b !important;
                                padding: 24px !important;
                                margin: 0 auto !important;
                                width: 100% !important;
                                max-width: 480px !important;
                                direction: rtl !important;
                                text-align: right !important;
                                display: block !important;
                              }
                              .flex {
                                display: flex !important;
                                flex-direction: row !important;
                                justify-content: space-between !important;
                                align-items: center !important;
                              }
                              .justify-between {
                                justify-content: space-between !important;
                              }
                              .space-y-4 > * + * {
                                margin-top: 1rem !important;
                              }
                              .space-y-2\\.5 > * + * {
                                margin-top: 0.625rem !important;
                              }
                              .pb-3 {
                                padding-bottom: 0.75rem !important;
                              }
                              .pb-1\\.5 {
                                padding-bottom: 0.375rem !important;
                              }
                              .mt-0\\.5 {
                                margin-top: 0.125rem !important;
                              }
                              .pt-2 {
                                padding-top: 0.5rem !important;
                              }
                              .pt-6 {
                                padding-top: 1.5rem !important;
                              }
                              .border-b {
                                border-bottom: 1px solid #e2e8f0 !important;
                              }
                              .border-t {
                                border-top: 1px solid #e2e8f0 !important;
                              }
                              .text-center {
                                text-align: center !important;
                              }
                              .text-right {
                                text-align: right !important;
                              }
                              .text-left {
                                text-align: left !important;
                              }
                              .text-slate-400 {
                                color: #64748b !important;
                              }
                              .text-slate-500 {
                                color: #64748b !important;
                              }
                              .text-slate-800 {
                                color: #1e293b !important;
                              }
                              .text-slate-900 {
                                color: #0f172a !important;
                              }
                              .text-emerald-600 {
                                color: #059669 !important;
                              }
                              .text-emerald-700 {
                                color: #047857 !important;
                              }
                              .text-emerald-800 {
                                color: #065f46 !important;
                              }
                              .text-black {
                                color: #000000 !important;
                              }
                              /* Force flex flow correctly so left is value and right is label under all engine versions */
                              .flex.justify-between > * {
                                display: inline-block !important;
                              }
                              .flex.justify-between {
                                display: flex !important;
                                flex-direction: row !important;
                              }
                              @page {
                                size: auto;
                                margin: 4mm 8mm 4mm 8mm;
                              }
                            }
                          </style>
                        `;

                        // Compose full outer HTML so class lists and IDs are maintained
                        const printFrameContent = `
                          <div dir="rtl" class="urdu-text" style="direction: rtl; text-align: right; width: 100%; min-height: 100%; background: white;">
                            ${printable.outerHTML}
                            ${styleBlock}
                          </div>
                        `;

                        const originalContent = document.body.innerHTML;
                        document.body.innerHTML = printFrameContent;
                        document.body.setAttribute('dir', 'rtl');
                        document.body.className = "urdu-text bg-white";
                        
                        setTimeout(() => {
                          window.print();
                          
                          document.body.innerHTML = originalContent;
                          if (origBodyDir) {
                            document.body.setAttribute('dir', origBodyDir);
                          } else {
                            document.body.removeAttribute('dir');
                          }
                          document.body.className = origBodyClass;
                          
                          window.location.reload();
                        }, 50);
                      }
                    }}
                    className="flex-1 bg-emerald-600 font-bold hover:bg-emerald-700 text-white py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    <Printer size={16} /> رسید پرنٹ کریں
                  </button>

                  <button 
                    onClick={() => setActiveSlip(null)}
                    className="bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-sm transition-all active:scale-95 cursor-pointer"
                  >
                    بند کریں
                  </button>
                </div>

                {activeSlip.share.phone && (
                  <button 
                    type="button"
                    disabled={isGeneratingImage}
                    onClick={handleCaptureAndShare}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 text-sm shadow-md transition-all active:scale-95 text-center mt-1 cursor-pointer"
                  >
                    {isGeneratingImage ? (
                      <>
                        <RotateCw size={16} className="animate-spin text-white" />
                        <span>رسید کی تصویر تیار کی جا رہی ہے...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 text-white fill-current shrink-0" viewBox="0 0 24 24">
                          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.003  5.324 5.328 0 11.91 0c3.19.001 6.189 1.242 8.444 3.498 2.256 2.256 3.497 5.255 3.497  8.447 0 6.586-5.322 11.91-11.905 11.91-2.002-.001-3.973-.504-5.714-1.46L0 24zm6.59-4.846c1.6.95 3.488 1.451  5.312 1.452 5.385 0 9.766-4.38 9.771-9.768.002-2.61-1.015-5.064-2.864-6.914C17.017 2.073  14.565 1.056 11.956 1.056c-5.388 0-9.773 4.382-9.778  9.771-.001 1.93.498 3.816 1.446 5.485L2.642 21.31l5.005-1.314z"/>
                        </svg>
                        <span>واٹس ایپ رسید بطور تصویر بھیجیں (ون کلک کاپی)</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Clipboard copy beautiful notification overlay */}
              <AnimatePresence>
                {showCopiedAlert && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute inset-0 bg-white/98 backdrop-blur-sm z-30 rounded-2xl flex flex-col items-center justify-center p-6 text-center space-y-4"
                  >
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shadow-inner">
                      <CheckCircle2 size={36} className="text-emerald-500 animate-bounce" />
                    </div>
                    <h4 className="text-lg font-black text-slate-900" style={{ fontFamily: 'sans-serif' }}>رسید کی تصویر کاپی ہو گئی! ✅</h4>
                    <p className="text-xs text-slate-600 leading-relaxed max-w-xs font-bold Urdu">
                      رسید کی آفیشل تصوریری رسید کامیابی سے آپ کے فون/کمپیوٹر کے کلپ بورڈ پر محفوظ کر دی گئی ہے۔
                    </p>
                    <div className="bg-amber-50 text-amber-900 border border-amber-200 rounded-xl p-3 text-[11px] leading-relaxed font-bold max-w-xs text-center">
                       واٹس ایپ چیٹ کھلتے ہی وہاں صرف <span className="font-mono bg-amber-200 px-1 py-0.5 rounded text-xs font-black">Ctrl + V</span> یا <span className="bg-amber-200 px-1 py-0.5 rounded text-xs font-black">Paste</span> کا بٹن دبائیں تاکہ رسید تصویر کی شکل میں روانہ ہو جائے۔
                    </div>
                    <div className="pt-2 flex gap-2 w-full">
                      <button
                        onClick={() => {
                          setShowCopiedAlert(false);
                        }}
                        className="flex-1 bg-slate-900 text-white font-extrabold py-3 rounded-xl text-xs transition-all hover:bg-slate-800 cursor-pointer"
                      >
                        بند کریں
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}

        {/* Custom Confirmation/Notification Dialog Overlay */}
        {appDialog && appDialog.isOpen && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] overflow-y-auto" dir="rtl">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 relative flex flex-col space-y-4 border border-slate-100"
            >
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3 justify-start">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${appDialog.type === 'confirm' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                  <Info size={20} />
                </div>
                <h4 className="text-base font-black text-slate-800 font-sans">{appDialog.title}</h4>
              </div>

              <p className="text-sm text-slate-600 font-bold leading-relaxed text-right">
                {appDialog.message}
              </p>

              <div className="flex gap-2 pt-2">
                {appDialog.type === 'confirm' && (
                  <button 
                    onClick={() => {
                      if (appDialog.onCancel) appDialog.onCancel();
                      setAppDialog(null);
                    }}
                    className="flex-1 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-sm transition-all active:scale-95"
                  >
                    {appDialog.cancelText || 'منسوخ کریں'}
                  </button>
                )}
                <button 
                  onClick={() => {
                    appDialog.onConfirm();
                  }}
                  className={`flex-1 font-bold py-2.5 rounded-xl text-sm text-white transition-all active:scale-95 shadow-md ${appDialog.type === 'confirm' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/15' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/15'}`}
                >
                  {appDialog.confirmText || 'ٹھیک ہے'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 p-4 px-8 flex justify-between items-center text-[10px] text-slate-400 shrink-0">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span className="font-bold uppercase tracking-wider">لوکل سٹوریج محفوظ ہے</span>
            </div>
          </div>
          <div className="font-black tracking-[0.2em] text-slate-300 italic uppercase">QURBANI ADVANCE ENGINE V2.0</div>
        </footer>
      </main>
    </div>
  );
}
