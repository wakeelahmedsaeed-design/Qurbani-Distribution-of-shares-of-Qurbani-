import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  PiggyBank
} from 'lucide-react';

interface Share {
  id: string; // "animalId-shareIdx"
  name: string;
  isDistributed: boolean;
  distributionTime?: string;
  isPaid: boolean;
  amountPaid: number;
  expectedDeliveryTime: string;
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
}

const DEFAULT_BRANCHES: Branch[] = [
  { id: 'nazim', label: 'ناظم مدرسہ', color: 'bg-slate-700', textColor: 'text-slate-705 text-slate-700', accent: 'slate' },
  { id: 'korangi', label: 'کورنگی کاؤنٹر', color: 'bg-emerald-600', textColor: 'text-emerald-700', accent: 'emerald' },
  { id: 'landhi', label: 'لانڈھی کاؤنٹر', color: 'bg-indigo-600', textColor: 'text-indigo-700', accent: 'indigo' },
  { id: 'qayyumabad', label: 'قیوم آباد کاؤنٹر', color: 'bg-sky-600', textColor: 'text-sky-700', accent: 'sky' }
];

export default function App() {
  const [view, setView] = useState<'dashboard' | 'list' | 'detail' | 'settings' | 'deposits'>('dashboard');
  const [selectedAnimalId, setSelectedAnimalId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // dynamic branches list
  const [branches, setBranches] = useState<Branch[]>(() => {
    const saved = localStorage.getItem('qurbani_branches_v5');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
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

  // Recent Global Activities logs for multi-branch monitoring
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => {
    const saved = localStorage.getItem('qurbani_activity_logs_v4');
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
        details: 'ابتدائی 60 گائے کا اندراج کامیابی سے کیا گیا'
      },
      {
        id: '2',
        timestamp: '09:12 AM',
        branch: 'لانڈھی کاؤنٹر',
        type: 'payment',
        details: 'گائے نمبر 1 کے حصہ دار 1 کی رقم (45,000) موصول ہوئی'
      },
      {
        id: '3',
        timestamp: '10:05 AM',
        branch: 'قیوم آباد کاؤنٹر',
        type: 'payment',
        details: 'گائے نمبر 5 کے حصہ دار 4 کی رقم (45,000) موصول ہوئی'
      }
    ];
  });

  // custom animal adding inputs (Settings view)
  const [customAnimalIdInput, setCustomAnimalIdInput] = useState<string>('');
  const [customAnimalLabelInput, setCustomAnimalLabelInput] = useState<string>('');

  // slip state
  const [activeSlip, setActiveSlip] = useState<{ animal: Animal; share: Share; index: number } | null>(null);

  // loading animals with migration fallbacks
  const [animals, setAnimals] = useState<Animal[]>(() => {
    const saved = localStorage.getItem('qurbani_data_v4');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((animal: any) => ({
            ...animal,
            shares: Array.isArray(animal.shares) ? animal.shares.map((share: any) => ({
              id: share.id,
              name: share.name || '',
              isDistributed: !!share.isDistributed,
              distributionTime: share.distributionTime || undefined,
              isPaid: typeof share.isPaid === 'boolean' ? share.isPaid : false,
              amountPaid: typeof share.amountPaid === 'number' ? share.amountPaid : DEFAULT_SHARE_AMOUNT,
              expectedDeliveryTime: share.expectedDeliveryTime || '01:00 PM',
            })) : []
          })).sort((a: any, b: any) => a.id - b.id);
        }
      } catch (e) {
        console.error(e);
      }
    }

    // Default 60 animals as community benchmark
    return Array.from({ length: 60 }, (_, i) => ({
      id: i + 1,
      label: `گائے نمبر ${i + 1}`,
      shares: Array.from({ length: SHARES_PER_ANIMAL }, (_, j) => ({
        id: `${i + 1}-${j + 1}`,
        name: `حصہ دار ${j + 1}`,
        isDistributed: false,
        isPaid: false,
        amountPaid: DEFAULT_SHARE_AMOUNT,
        expectedDeliveryTime: '01:00 PM'
      }))
    }));
  });

  // accounts ledger state
  const [deposits, setDeposits] = useState<DepositRecord[]>(() => {
    const saved = localStorage.getItem('qurbani_deposits_v4');
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
  const broadcastSync = (updatedAnimals: Animal[], updatedDeposits: DepositRecord[], updatedLogs: ActivityLog[], updatedBranches?: Branch[]) => {
    try {
      const channel = new BroadcastChannel('qurbani_realtime_sync');
      channel.postMessage({
        animals: updatedAnimals,
        deposits: updatedDeposits,
        logs: updatedLogs,
        branches: updatedBranches || branches
      });
      channel.close();
    } catch (e) {
      console.warn('Sync broadcast not supported in sandbox context', e);
    }
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
      localStorage.setItem('qurbani_activity_logs_v4', JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    localStorage.setItem('qurbani_data_v4', JSON.stringify(animals));
    broadcastSync(animals, deposits, activityLogs);
  }, [animals]);

  useEffect(() => {
    localStorage.setItem('qurbani_deposits_v4', JSON.stringify(deposits));
    broadcastSync(animals, deposits, activityLogs);
  }, [deposits]);

  useEffect(() => {
    localStorage.setItem('qurbani_activity_logs_v4', JSON.stringify(activityLogs));
    broadcastSync(animals, deposits, activityLogs);
  }, [activityLogs]);

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
        const { animals: incomingAnimals, deposits: incomingDeposits, logs: incomingLogs, branches: incomingBranches } = event.data;
        if (incomingAnimals && JSON.stringify(incomingAnimals) !== localStorage.getItem('qurbani_data_v4')) {
          setAnimals(incomingAnimals);
        }
        if (incomingDeposits && JSON.stringify(incomingDeposits) !== localStorage.getItem('qurbani_deposits_v4')) {
          setDeposits(incomingDeposits);
        }
        if (incomingLogs && JSON.stringify(incomingLogs) !== localStorage.getItem('qurbani_activity_logs_v4')) {
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
  }, [branches]);

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
        amountPaid: DEFAULT_SHARE_AMOUNT,
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
    if (window.confirm(`کیا آپ واقعی ${animalObj.label} اور اس کا تمام ریکارڈ خارج کرنا چاہتے ہیں؟`)) {
      setAnimals(prev => prev.filter(a => a.id !== id));
      if (selectedAnimalId === id) setView('list');
      logActivity('remove_animal', `خارج شدہ: ${animalObj.label} کو سسٹم سے خارج کر دیا گیا`);
    }
  };

  const updateAnimalLabel = (id: number, label: string) => {
    setAnimals(prev => prev.map(a => a.id === id ? { ...a, label } : a));
  };

  const updateShareName = (animalId: number, shareId: string, name: string) => {
    setAnimals(prev => prev.map(a => {
      if (a.id !== animalId) return a;
      return {
        ...a,
        shares: a.shares.map(s => s.id === shareId ? { ...s, name } : s)
      };
    }));
  };

  const updateShareAmount = (animalId: number, shareId: string, amount: number) => {
    setAnimals(prev => prev.map(a => {
      if (a.id !== animalId) return a;
      return {
        ...a,
        shares: a.shares.map(s => s.id === shareId ? { ...s, amountPaid: amount } : s)
      };
    }));
  };

  const updateShareDeliveryTime = (animalId: number, shareId: string, time: string) => {
    setAnimals(prev => prev.map(a => {
      if (a.id !== animalId) return a;
      return {
        ...a,
        shares: a.shares.map(s => s.id === shareId ? { ...s, expectedDeliveryTime: time } : s)
      };
    }));
  };

  const togglePayment = (animalId: number, shareId: string) => {
    let oldPaid = false;
    let shareName = '';
    let shareAmount = 0;
    let animLabel = '';

    setAnimals(prev => prev.map(a => {
      if (a.id !== animalId) return a;
      animLabel = a.label;
      return {
        ...a,
        shares: a.shares.map(s => {
          if (s.id !== shareId) return s;
          oldPaid = s.isPaid;
          shareName = s.name;
          shareAmount = s.amountPaid;
          return { ...s, isPaid: !s.isPaid };
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

  const filteredAnimals = animals.filter(a => 
    a.label.includes(searchQuery) || 
    a.shares.some(s => s.name.includes(searchQuery))
  );

  const selectedAnimal = animals.find(a => a.id === selectedAnimalId);

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
                {view === 'dashboard' ? 'مرکزی ڈیش بورڈ (اجتماعی قربانی)' 
                  : view === 'list' ? 'تمام جانوروں کی فہرست' 
                  : view === 'deposits' ? 'بینک ٹرانسفر / فنڈز مینیجر'
                  : view === 'settings' ? 'جانوروں کا نیا اندراج' 
                  : selectedAnimal?.label}
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${branches.find(b => b.id === activeBranch)?.color || 'bg-slate-500'}`}>
                  {branches.find(b => b.id === activeBranch)?.label}
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                {view === 'detail' ? 'حصہ داروں کی تفصیل، رقم کی وصولی اور رسید' : 'مدرسہ اجتماعی انتظامِ فنڈز و قربانی'}
              </p>
            </div>
          </div>

          {/* Active Branch and Sync Selector */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 font-bold px-2">کاؤنٹر منتخب کریں:</span>
              <select
                value={activeBranch}
                onChange={(e) => {
                  setActiveBranch(e.target.value);
                  const selectedName = branches.find(b => b.id === e.target.value)?.label || 'کاؤنٹر';
                  alert(`کامیابی سے "${selectedName}" پر سوئچ کر دیا گیا۔ اب آپ اس کاؤنٹر سے مندرج کریں گے!`);
                }}
                className="text-xs font-bold bg-white text-slate-800 border-none rounded-lg px-2 py-1 outline-none cursor-pointer focus:ring-1 focus:ring-emerald-500"
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </select>
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
                      <h3 className="text-xl font-black text-slate-800">قربانی مہم کے لیے مشترکہ انتظام</h3>
                      <p className="text-slate-500 max-w-lg mt-1.5 leading-relaxed text-xs">
                        ہر برانچ (کورنگی، لانڈھی، قیوم آباد، ہیڈ آفس) کے وصول کنندگان اسی سافٹ وئیر پر بیک وقت کام کرسکتے ہیں۔ جوں ہی کوئی وصولی ہوگی، مانیٹر پر لائیو سنک ہوگی!
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3 justify-center">
                      <button 
                        onClick={() => setView('list')}
                        className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center gap-1.5 text-xs shadow-md"
                      >
                        <ScrollText size={16} /> گائے کی لسٹ اور ٹریکنگ
                      </button>
                      <button 
                        onClick={() => setView('deposits')}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-1.5 text-xs"
                      >
                        <Coins size={16} /> بینک و کیش دراز منتقلی
                      </button>
                    </div>
                  </div>

                  {/* Synchronized Multi-branch Activities Feed */}
                  <div className="bg-slate-900 text-slate-100 rounded-2xl p-5 flex flex-col border border-slate-800">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3 shrink-0">
                      <div className="flex items-center gap-2">
                        <Activity className="text-emerald-400 animate-pulse" size={16} />
                        <span className="text-xs font-black tracking-wide text-white">حالیہ سرگرمیاں (لائیو برانچ سنک)</span>
                      </div>
                      <span className="text-[9px] bg-emerald-950 text-emerald-300 font-bold px-1.5 py-0.5 rounded border border-emerald-900 shrink-0">
                        سسٹم لائیو
                      </span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto max-h-[160px] pr-1 space-y-2.5">
                      {activityLogs.map((log) => (
                        <div key={log.id} className="text-[11px] leading-relaxed border-b border-slate-800/40 pb-2 last:border-none">
                          <div className="flex justify-between items-center text-slate-500 text-[9px] mb-0.5 font-bold">
                            <span className="text-emerald-400">{log.branch}</span>
                            <span>{log.timestamp}</span>
                          </div>
                          <p className="text-slate-200">{log.details}</p>
                        </div>
                      ))}
                      {activityLogs.length === 0 && (
                        <p className="text-slate-500 text-center text-xs py-4">اب تک کوئی لائیو سرگرمی نہیں ہوئی ہے۔</p>
                      )}
                    </div>
                  </div>
                </div>                  {/* Urdu Guidelines & Help info */}
                  <div className="bg-emerald-900 rounded-2xl p-6 text-white flex flex-col justify-between relative overflow-hidden">
                    <div className="relative z-10 space-y-4">
                      <div className="flex items-center gap-2 text-emerald-400">
                        <Info size={18} />
                        <span className="text-[10px] font-bold uppercase tracking-widest leading-none">مدد اور طریقہ کار</span>
                      </div>
                      <h3 className="text-lg font-bold">بیک وقت انتظام اور رسیدیں</h3>
                      <ul className="text-emerald-100/70 text-xs list-disc pr-4 space-y-2">
                        <li>ہر حصہ دار کی باری باری 45,000 روپے (یا مرضی کی رقم) بک کریں۔</li>
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
                    {selectedAnimal.shares.map((s, idx) => (
                      <div key={s.id} className="p-4 lg:p-6 flex flex-col space-y-4 hover:bg-slate-50/50 transition-colors">
                        <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                          
                          {/* Left column: ID & core details, inputs */}
                          <div className="flex items-start gap-3 flex-1">
                            <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-400 shrink-0 mt-2">{idx + 1}</span>
                            <div className="flex-1 space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <div className="col-span-1">
                                  <label className="text-[10px] text-slate-400 font-bold block mb-0.5">حصہ دار کا نام</label>
                                  <input 
                                    type="text" 
                                    value={s.name}
                                    onChange={(e) => updateShareName(selectedAnimal.id, s.id, e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none text-sm"
                                    placeholder="نام درج کریں"
                                  />
                                </div>

                                <div>
                                  <label className="text-[10px] text-slate-400 font-bold block mb-0.5">رقم (روپے)</label>
                                  <input 
                                    type="number" 
                                    value={s.amountPaid}
                                    onChange={(e) => updateShareAmount(selectedAnimal.id, s.id, Number(e.target.value))}
                                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl font-bold font-mono text-slate-800 text-sm focus:ring-1 focus:ring-emerald-500 outline-none"
                                    placeholder="رقم درج کریں"
                                  />
                                </div>

                                <div>
                                  <label className="text-[10px] text-slate-400 font-bold block mb-0.5">توقعِ فراہمیِ گوشت کا وقت</label>
                                  <div className="relative">
                                    <input 
                                      type="text" 
                                      value={s.expectedDeliveryTime}
                                      onChange={(e) => updateShareDeliveryTime(selectedAnimal.id, s.id, e.target.value)}
                                      className="w-full bg-slate-50 border border-slate-200 p-2.5 pr-8 rounded-xl font-bold text-slate-800 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                                      placeholder="مثلاً 12:30 PM یا عید کا پہلا دن"
                                    />
                                    <Clock className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-4 flex-wrap">
                                <span className="text-[10px] text-slate-400 font-bold">شناخت: {s.id}</span>
                                {s.isDistributed && s.distributionTime && (
                                  <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                    <CheckCircle2 size={12} /> تقسیم شدہ بروقت: {s.distributionTime}
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
                              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all flex-1 md:flex-initial ${
                                s.isPaid 
                                  ? 'bg-blue-50 border-blue-200 text-blue-700' 
                                  : 'bg-white border-slate-200 text-slate-400 hover:border-blue-200'
                              }`}
                            >
                              {s.isPaid ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                              {s.isPaid ? `رقم موصول: ${s.amountPaid.toLocaleString('ur-PK')}` : 'ادائیگی وصول کریں'}
                            </button>

                            {/* View printable Receipt slip */}
                            <button
                              onClick={() => setActiveSlip({ animal: selectedAnimal, share: s, index: idx + 1 })}
                              className="bg-slate-100 border border-slate-200 text-slate-800 px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-slate-200 transition-all active:scale-95 flex-1 md:flex-initial"
                            >
                              <Receipt size={16} className="text-slate-500" />
                              رسید جاری کریں 
                            </button>

                            {/* Toggle distributed meat status */}
                            <button 
                              onClick={() => toggleDistribution(selectedAnimal.id, s.id)}
                              className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all flex-1 md:flex-initial ${
                                s.isDistributed 
                                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' 
                                  : 'bg-white border-slate-200 text-slate-400 hover:border-emerald-200'
                              }`}
                            >
                              {s.isDistributed ? 'گوشت مل گیا (سبز)' : 'گوشت ٹوکرا دیا (باقی)'}
                            </button>

                          </div>
                        </div>
                      </div>
                    ))}
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
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      const formData = new FormData(form);
                      const label = formData.get('label')?.toString().trim();
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
                        color: randomStyle.color,
                        textColor: randomStyle.textColor,
                        accent: randomStyle.accent,
                        isCustom: true
                      };

                      setBranches(prev => [...prev, newBranch]);
                      form.reset();
                      alert(`موصول کنندہ کاؤنٹر "${label}" کامیابی سے شامل کر دیا گیا۔ اب یہ باقاعدہ اوپر مینیو میں منتخب کیا جا سکے گا!`);
                    }}
                    className="grid grid-cols-1 sm:grid-cols-3 gap-4"
                  >
                    <div className="sm:col-span-2">
                      <input 
                        type="text"
                        name="label"
                        required
                        placeholder="نئے کاؤنٹر کا نام درج کریں (مثلاً: قاری جاوید صاحب یا صدر برانچ)"
                        className="w-full bg-white border border-slate-200 p-2.5 rounded-xl font-bold text-slate-800 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
                    >
                      <Plus size={16} /> نیا کاؤنٹر شامل کریں
                    </button>
                  </form>

                  {/* Table to edit/list/delete counters */}
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-100 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="p-3">کاؤنٹر کی شناخت</th>
                          <th className="p-3">نام / لیبل (ترمیم کریں)</th>
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
                                onChange={(e) => {
                                  const updatedLabel = e.target.value;
                                  setBranches(prev => prev.map(item => item.id === b.id ? { ...item, label: updatedLabel } : item));
                                }}
                                className="w-full bg-transparent border-none outline-none font-bold text-slate-800 focus:text-emerald-600"
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
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm(`کیا آپ واقعی کاؤنٹر "${b.label}" خارج کرنا چاہتے ہیں؟`)) {
                                      setBranches(prev => prev.filter(item => item.id !== b.id));
                                      if (activeBranch === b.id) {
                                        setActiveBranch('nazim');
                                      }
                                    }
                                  }}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2.5 py-1 rounded"
                                >
                                  حذف کریں
                                </button>
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
              <div id="printable-area" className="border-4 border-double border-emerald-900/30 p-4 rounded-xl space-y-4">
                <div className="text-center border-b border-slate-200 pb-3">
                  <Beef className="mx-auto text-emerald-600 mb-1" size={32} />
                  <h3 className="text-xl font-black text-slate-900">اجتماعی قربانی سوسائٹی</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Qurbani Management Office Receipt</p>
                </div>

                <div className="flex justify-between items-center text-xs text-slate-500 font-bold">
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

                <div className="flex justify-between items-end pt-6 text-[10px] text-slate-400 font-bold">
                  <div>
                    <span className="block border-t border-slate-200 w-24 text-center mt-3 pt-1">دستخط وصول کنندہ</span>
                  </div>
                  <div className="italic">
                    اجتماعی قربانی مینیجر پرو
                  </div>
                </div>
              </div>

              {/* Action buttons inside slip modal */}
              <div className="flex gap-3 mt-6">
                <button 
                  onClick={() => {
                    const printable = document.getElementById('printable-area');
                    if (printable) {
                      const printContent = printable.innerHTML;
                      const originalContent = document.body.innerHTML;
                      document.body.innerHTML = printContent;
                      window.print();
                      document.body.innerHTML = originalContent;
                      window.location.reload(); // simple page restore after system print UI dismiss
                    }
                  }}
                  className="flex-1 bg-emerald-600 font-bold hover:bg-emerald-700 text-white py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm shadow-md"
                >
                  <Printer size={16} /> رسید پرنٹ کریں
                </button>
                <button 
                  onClick={() => setActiveSlip(null)}
                  className="flex-1 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-sm"
                >
                  بند کریں
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
