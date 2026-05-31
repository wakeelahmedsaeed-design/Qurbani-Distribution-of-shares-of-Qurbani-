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
  Key,
  Check,
  Move,
  PlusCircle,
  Building
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
  customReceiptId?: string;
  qurbaniType?: 'standard' | 'waqf';
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
  collectorBranchId?: string;
}

interface ActivityLog {
  id: string;
  timestamp: string;
  branch: string;
  type: 'payment' | 'distribution' | 'add_animal' | 'remove_animal' | 'deposit' | 'transfer' | 'hide_received';
  details: string;
}

interface HideCollection {
  id: string;
  date: string;
  donorName: string;
  donorPhone: string;
  donorAddress?: string;
  camelCount: number;
  cowCount: number;
  goatCount: number;
  collectedByBranchId: string;
  collectedByBranchLabel: string;
  centerId: string;
  year: string;
}

const SHARES_PER_ANIMAL = 7;
const DEFAULT_SHARE_AMOUNT = 45000;

interface Branch {
  id: string; // e.g. "jauhar_nazim", "jauhar_naveed"
  centerId: string; // e.g. "jauhar", "gulshan"
  centerLabel: string; // e.g. "مرکز گلستان جوہر"
  label: string; // e.g. "ناظم مدرسہ" یا "قاری محمد نوید"
  role: 'super_admin' | 'nazim' | 'qari';
  color: string;
  textColor: string;
  accent: string;
  password?: string;
  isCustom?: boolean;
}

const DEFAULT_BRANCHES: Branch[] = [
  // Super Admin
  { id: 'super_admin', centerId: 'markaz_e_ala', centerLabel: 'مرکزی ہیڈکوارٹر', label: 'سپر ایڈمن (مرکزی)', role: 'super_admin', color: 'bg-rose-700', textColor: 'text-rose-700', accent: 'rose', password: '1122' },

  // Jauhar
  { id: 'jauhar_nazim', centerId: 'jauhar', centerLabel: 'مرکز گلستان جوہر', label: 'ناظم مدرسہ', role: 'nazim', color: 'bg-slate-700', textColor: 'text-slate-700', accent: 'slate', password: '9211' },
  { id: 'jauhar_naveed', centerId: 'jauhar', centerLabel: 'مرکز گلستان جوہر', label: 'قاری محمد نوید', role: 'qari', color: 'bg-teal-600', textColor: 'text-teal-700', accent: 'teal', password: '123' },
  { id: 'jauhar_ali', centerId: 'jauhar', centerLabel: 'مرکز گلستان جوہر', label: 'قاری محمد علی', role: 'qari', color: 'bg-teal-600', textColor: 'text-teal-700', accent: 'teal', password: '123' },
  { id: 'jauhar_rahmat', centerId: 'jauhar', centerLabel: 'مرکز گلستان جوہر', label: 'قاری رحمت', role: 'qari', color: 'bg-teal-600', textColor: 'text-teal-700', accent: 'teal', password: '123' },

  // Gulshan
  { id: 'gulshan_nazim', centerId: 'gulshan', centerLabel: 'مرکز گلشن اقبال', label: 'ناظم مدرسہ', role: 'nazim', color: 'bg-slate-700', textColor: 'text-slate-700', accent: 'slate', password: '9211' },
  { id: 'gulshan_saleem', centerId: 'gulshan', centerLabel: 'مرکز گلشن اقبال', label: 'قاری سلیم اللہ', role: 'qari', color: 'bg-blue-600', textColor: 'text-blue-700', accent: 'blue', password: '123' },
  { id: 'gulshan_husain', centerId: 'gulshan', centerLabel: 'مرکز گلشن اقبال', label: 'قاری محمد حسین', role: 'qari', color: 'bg-blue-600', textColor: 'text-blue-700', accent: 'blue', password: '123' },
  { id: 'gulshan_muhsin', centerId: 'gulshan', centerLabel: 'مرکز گلشن اقبال', label: 'قاری محسن', role: 'qari', color: 'bg-blue-600', textColor: 'text-blue-700', accent: 'blue', password: '123' },

  // Korangi
  { id: 'korangi_nazim', centerId: 'korangi', centerLabel: 'کورنگی', label: 'ناظم مدرسہ', role: 'nazim', color: 'bg-slate-700', textColor: 'text-slate-700', accent: 'slate', password: '9211' },
  { id: 'korangi_javed', centerId: 'korangi', centerLabel: 'کورنگی', label: 'قاری محمد جاوید', role: 'qari', color: 'bg-emerald-600', textColor: 'text-emerald-700', accent: 'emerald', password: '123' },
  { id: 'korangi_noor', centerId: 'korangi', centerLabel: 'کورنگی', label: 'قاری سید نور', role: 'qari', color: 'bg-emerald-600', textColor: 'text-emerald-700', accent: 'emerald', password: '123' },
  { id: 'korangi_shahzad', centerId: 'korangi', centerLabel: 'کورنگی', label: 'قاری شہزاد', role: 'qari', color: 'bg-emerald-600', textColor: 'text-emerald-700', accent: 'emerald', password: '123' },

  // Landhi
  { id: 'landhi_nazim', centerId: 'landhi', centerLabel: 'لانڈھی', label: 'ناظم مدرسہ', role: 'nazim', color: 'bg-slate-700', textColor: 'text-slate-700', accent: 'slate', password: '9211' },
  { id: 'landhi_jabir', centerId: 'landhi', centerLabel: 'لانڈھی', label: 'قاری جابر', role: 'qari', color: 'bg-indigo-600', textColor: 'text-indigo-700', accent: 'indigo', password: '123' },
  { id: 'landhi_alamin', centerId: 'landhi', centerLabel: 'لانڈھی', label: 'قاری نور الامین', role: 'qari', color: 'bg-indigo-600', textColor: 'text-indigo-700', accent: 'indigo', password: '123' },
  { id: 'landhi_shafique', centerId: 'landhi', centerLabel: 'لانڈھی', label: 'قاری شفیق', role: 'qari', color: 'bg-indigo-600', textColor: 'text-indigo-700', accent: 'indigo', password: '123' },

  // Qayyumabad
  { id: 'qayyumabad_nazim', centerId: 'qayyumabad', centerLabel: 'قیوم آباد', label: 'ناظم مدرسہ', role: 'nazim', color: 'bg-slate-700', textColor: 'text-slate-700', accent: 'slate', password: '9211' },
  { id: 'qayyumabad_sabir', centerId: 'qayyumabad', centerLabel: 'قیوم آباد', label: 'قاری صابر', role: 'qari', color: 'bg-sky-600', textColor: 'text-sky-700', accent: 'sky', password: '123' },
  { id: 'qayyumabad_tauqeer', centerId: 'qayyumabad', centerLabel: 'قیوم آباد', label: 'قاری توقیر', role: 'qari', color: 'bg-sky-600', textColor: 'text-sky-700', accent: 'sky', password: '123' },
  { id: 'qayyumabad_iqbal', centerId: 'qayyumabad', centerLabel: 'قیوم آباد', label: 'قاری اقبال', role: 'qari', color: 'bg-sky-600', textColor: 'text-sky-700', accent: 'sky', password: '123' }
];

const CompactStepper = ({ 
  value, 
  onChange, 
  disabled, 
  min = 0, 
  max = 999 
}: { 
  value: number; 
  onChange: (val: number) => void; 
  disabled?: boolean; 
  min?: number; 
  max?: number; 
}) => {
  return (
    <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg px-1 py-0.5 max-w-[84px] justify-between shadow-inner">
      <button
        type="button"
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="w-4 h-4 bg-slate-900 hover:bg-slate-700 disabled:opacity-20 text-slate-300 rounded text-center flex items-center justify-center font-bold text-[9px] select-none transition-colors"
      >
        -
      </button>
      <input
        type="number"
        min={min}
        max={max}
        disabled={disabled}
        value={value}
        onChange={(e) => {
          const v = Math.max(min, Math.min(max, Number(e.target.value) || 0));
          onChange(v);
        }}
        className="w-8 bg-transparent text-center text-white font-mono text-[10px] font-black focus:outline-none focus:ring-0 p-0 border-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none min-w-0"
      />
      <button
        type="button"
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="w-4 h-4 bg-slate-900 hover:bg-slate-700 disabled:opacity-20 text-slate-300 rounded text-center flex items-center justify-center font-bold text-[9px] select-none transition-colors"
      >
        +
      </button>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState<'dashboard' | 'list' | 'detail' | 'settings' | 'deposits' | 'tags' | 'records' | 'ledger' | 'hides'>(() => {
    return (sessionStorage.getItem('qurbani_active_view') as any) || 'dashboard';
  });
  const [selectedAnimalId, setSelectedAnimalId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // active year / session state
  const [activeYear, setActiveYear] = useState<string>(() => {
    return localStorage.getItem('qurbani_active_year_v2') || '2026';
  });

  // Hides Collections list
  const [hides, setHides] = useState<HideCollection[]>(() => {
    const activeYr = localStorage.getItem('qurbani_active_year_v2') || '2026';
    const saved = localStorage.getItem(`qurbani_hides_v1_${activeYr}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  // Wage parameters (configured only by super_admin)
  const [wageRates, setWageRates] = useState<{
    camelRate: number;
    cowRate: number;
    goatRate: number;
    dailyRate: number;
    nazimDailyRate: number;
    ustadhDailyRate: number;
    studentDailyRate: number;
    workerDutyDays: { [branchId: string]: number };
    nazimDutyDays: { [branchId: string]: number };
    ustadhDutyDays: { [branchId: string]: number };
    studentDutyDays: { [branchId: string]: number };
    nazimCounts: { [branchId: string]: number };
    ustadhCounts: { [branchId: string]: number };
    studentCounts: { [branchId: string]: number };
  }>(() => {
    const activeYr = localStorage.getItem('qurbani_active_year_v2') || '2026';
    const saved = localStorage.getItem(`qurbani_wage_rates_v1_${activeYr}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          camelRate: typeof parsed.camelRate === 'number' ? parsed.camelRate : 500,
          cowRate: typeof parsed.cowRate === 'number' ? parsed.cowRate : 300,
          goatRate: typeof parsed.goatRate === 'number' ? parsed.goatRate : 150,
          dailyRate: typeof parsed.dailyRate === 'number' ? parsed.dailyRate : 2000,
          nazimDailyRate: typeof parsed.nazimDailyRate === 'number' ? parsed.nazimDailyRate : 2500,
          ustadhDailyRate: typeof parsed.ustadhDailyRate === 'number' ? parsed.ustadhDailyRate : 1800,
          studentDailyRate: typeof parsed.studentDailyRate === 'number' ? parsed.studentDailyRate : 1000,
          workerDutyDays: parsed.workerDutyDays || {},
          nazimDutyDays: parsed.nazimDutyDays || {},
          ustadhDutyDays: parsed.ustadhDutyDays || {},
          studentDutyDays: parsed.studentDutyDays || {},
          nazimCounts: parsed.nazimCounts || {},
          ustadhCounts: parsed.ustadhCounts || {},
          studentCounts: parsed.studentCounts || {},
        };
      } catch (e) {
        console.error(e);
      }
    }
    return {
      camelRate: 500,
      cowRate: 300,
      goatRate: 150,
      dailyRate: 2000,
      nazimDailyRate: 2500,
      ustadhDailyRate: 1800,
      studentDailyRate: 1000,
      workerDutyDays: {},
      nazimDutyDays: {},
      ustadhDutyDays: {},
      studentDutyDays: {},
      nazimCounts: {},
      ustadhCounts: {},
      studentCounts: {}
    };
  });

  // Form states for adding a hide collection
  const [hideDonorName, setHideDonorName] = useState('');
  const [hideDonorPhone, setHideDonorPhone] = useState('');
  const [hideDonorAddress, setHideDonorAddress] = useState('');
  const [hideCamelCount, setHideCamelCount] = useState<number>(0);
  const [hideCowCount, setHideCowCount] = useState<number>(0);
  const [hideGoatCount, setHideGoatCount] = useState<number>(0);

  // Slip printable modal state
  const [activeHideSlip, setActiveHideSlip] = useState<HideCollection | null>(null);

  // Filters for hides view list
  const [hidesSearchQuery, setHidesSearchQuery] = useState('');
  const [hidesBranchFilter, setHidesBranchFilter] = useState('all');

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

  // default global Waqf share amount managed by super_admin
  const [globalWaqfShareAmount, setGlobalWaqfShareAmount] = useState<number>(() => {
    const activeYr = localStorage.getItem('qurbani_active_year_v2') || '2026';
    const saved = localStorage.getItem(`qurbani_global_waqf_share_amount_v5_${activeYr}`);
    if (saved) {
      const parsed = parseInt(saved);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return 35000; // standard default for Waqf (lower rate)
  });
  
  // dynamic branches list
  const [branches, setBranches] = useState<Branch[]>(() => {
    const saved = localStorage.getItem('qurbani_branches_v6');
    let list = DEFAULT_BRANCHES;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          list = parsed.map((savedBranch: any) => {
            const def = DEFAULT_BRANCHES.find(d => d.id === savedBranch.id);
            if (def) {
              return { 
                ...def, 
                ...savedBranch,
                centerId: def.centerId,
                centerLabel: def.centerLabel,
                role: def.role
              };
            }
            
            // For custom ones, infer missing fields or provide fallback
            let centerId = savedBranch.centerId;
            let centerLabel = savedBranch.centerLabel;
            let role = savedBranch.role || 'qari';
            
            if (!centerId) {
              if (savedBranch.id.startsWith('jauhar')) {
                centerId = 'jauhar';
                centerLabel = 'مرکز گلستان جوہر';
              } else if (savedBranch.id.startsWith('gulshan')) {
                centerId = 'gulshan';
                centerLabel = 'مرکز گلشن اقبال';
              } else if (savedBranch.id.startsWith('korangi')) {
                centerId = 'korangi';
                centerLabel = 'کورنگی';
              } else if (savedBranch.id.startsWith('landhi')) {
                centerId = 'landhi';
                centerLabel = 'لانڈھی';
              } else if (savedBranch.id.startsWith('qayyumabad')) {
                centerId = 'qayyumabad';
                centerLabel = 'قیوم آباد';
              } else {
                centerId = 'jauhar';
                centerLabel = 'مرکز گلستان جوہر';
              }
            }
            if (savedBranch.id.includes('_nazim')) {
              role = 'nazim';
            }
            
            return {
              color: 'bg-teal-600',
              textColor: 'text-teal-700',
              accent: 'teal',
              ...savedBranch,
              centerId,
              centerLabel,
              role
            };
          });
        }
      } catch (e) {
        console.error(e);
      }
    }
    // Guarantee super_admin is always present in the list of branches
    if (!list.some(b => b.id === 'super_admin')) {
      const superAdminAcc: Branch = {
        id: 'super_admin',
        centerId: 'markaz_e_ala',
        centerLabel: 'مرکزی ہیڈکوارٹر',
        label: 'سپر ایڈمن (مرکزی)',
        role: 'super_admin',
        color: 'bg-rose-700',
        textColor: 'text-rose-700',
        accent: 'rose',
        password: '1122'
      };
      list = [superAdminAcc, ...list];
    }
    return list;
  });

  // active branch / location state
  const [activeBranch, setActiveBranch] = useState<string>(() => {
    const val = localStorage.getItem('qurbani_active_branch_v6');
    return val || 'super_admin'; // default to super_admin
  });

  const activeBranchObj = useMemo(() => {
    return branches.find(b => b.id === activeBranch) || branches[0];
  }, [branches, activeBranch]);

  const isSuperAdmin = useMemo(() => {
    return activeBranchObj?.role === 'super_admin';
  }, [activeBranchObj]);

  const isNazim = useMemo(() => {
    return activeBranchObj?.role === 'nazim' || activeBranchObj?.role === 'super_admin';
  }, [activeBranchObj]);

  const activeBranchLabel = useMemo(() => {
    if (!activeBranchObj) return '';
    return `${activeBranchObj.centerLabel} - ${activeBranchObj.label}`;
  }, [activeBranchObj]);

  const isGlobalDashboard = useMemo(() => {
    return activeBranchObj?.role === 'super_admin';
  }, [activeBranchObj]);

  const activeCenterBranches = useMemo(() => {
    if (!activeBranchObj) return [];
    return branches.filter(b => b.centerId === activeBranchObj.centerId).map(b => b.id);
  }, [branches, activeBranchObj]);

  const visibleBranches = useMemo(() => {
    if (isGlobalDashboard) return branches;
    return branches.filter(b => b.centerId === activeBranchObj?.centerId);
  }, [branches, isGlobalDashboard, activeBranchObj]);

  // Authentication Pin state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('qurbani_is_authenticated_v5') === 'true';
  });
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginCenterId, setLoginCenterId] = useState<string>('jauhar');
  const [pendingActiveBranch, setPendingActiveBranch] = useState<string>('jauhar_nazim');

  // Compute unique centers list from active branches
  const centersList = useMemo(() => {
    const list: { id: string; label: string }[] = [];
    const seen = new Set<string>();
    branches.forEach(b => {
      if (b.centerId && !seen.has(b.centerId)) {
        seen.add(b.centerId);
        list.push({ id: b.centerId, label: b.centerLabel });
      }
    });
    return list;
  }, [branches]);

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

    const savedWaqfAmount = localStorage.getItem(`qurbani_global_waqf_share_amount_v5_${activeYr}`);
    const initialGlobalWaqfAmount = savedWaqfAmount ? (parseInt(savedWaqfAmount) || 35000) : 35000;
    
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
              amountPaid: typeof share.amountPaid === 'number' ? share.amountPaid : (share.qurbaniType === 'waqf' ? initialGlobalWaqfAmount : initialGlobalAmount),
              expectedDeliveryTime: share.expectedDeliveryTime || '01:00 PM',
              paidByBranchId: share.paidByBranchId || undefined,
              paidByBranchLabel: share.paidByBranchLabel || undefined,
              qurbaniType: share.qurbaniType || 'standard'
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
  const broadcastSync = (updatedAnimals: Animal[], updatedDeposits: DepositRecord[], updatedLogs: ActivityLog[], updatedBranches?: Branch[], updatedYear?: string, updatedHides?: HideCollection[], updatedWageRates?: any) => {
    try {
      const channel = new BroadcastChannel('qurbani_realtime_sync');
      channel.postMessage({
        animals: updatedAnimals,
        deposits: updatedDeposits,
        logs: updatedLogs,
        branches: updatedBranches || branches,
        year: updatedYear || activeYear,
        hides: updatedHides || hides,
        wageRates: updatedWageRates || wageRates
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

    // Load new year global nominal Waqf share amount
    const savedWaqfAmount = localStorage.getItem(`qurbani_global_waqf_share_amount_v5_${newYear}`);
    let newWaqfAmount = 35000;
    if (savedWaqfAmount) {
      const parsed = parseInt(savedWaqfAmount);
      if (!isNaN(parsed) && parsed > 0) newWaqfAmount = parsed;
    }
    setGlobalWaqfShareAmount(newWaqfAmount);

    // Load new year hides
    const savedHides = localStorage.getItem(`qurbani_hides_v1_${newYear}`);
    let loadedHides: HideCollection[] = [];
    if (savedHides) {
      try {
        const parsed = JSON.parse(savedHides);
        if (Array.isArray(parsed)) loadedHides = parsed;
      } catch (e) {
        console.error(e);
      }
    }
    setHides(loadedHides);

    // Load new year wage rates
    const savedWageRates = localStorage.getItem(`qurbani_wage_rates_v1_${newYear}`);
    let loadedWageRates = {
      camelRate: 500,
      cowRate: 300,
      goatRate: 150,
      dailyRate: 2000,
      nazimDailyRate: 2500,
      ustadhDailyRate: 1800,
      studentDailyRate: 1000,
      workerDutyDays: {},
      nazimDutyDays: {},
      ustadhDutyDays: {},
      studentDutyDays: {},
      nazimCounts: {},
      ustadhCounts: {},
      studentCounts: {}
    };
    if (savedWageRates) {
      try {
        const parsed = JSON.parse(savedWageRates);
        loadedWageRates = {
          camelRate: typeof parsed.camelRate === 'number' ? parsed.camelRate : 500,
          cowRate: typeof parsed.cowRate === 'number' ? parsed.cowRate : 300,
          goatRate: typeof parsed.goatRate === 'number' ? parsed.goatRate : 150,
          dailyRate: typeof parsed.dailyRate === 'number' ? parsed.dailyRate : 2000,
          nazimDailyRate: typeof parsed.nazimDailyRate === 'number' ? parsed.nazimDailyRate : 2500,
          ustadhDailyRate: typeof parsed.ustadhDailyRate === 'number' ? parsed.ustadhDailyRate : 1800,
          studentDailyRate: typeof parsed.studentDailyRate === 'number' ? parsed.studentDailyRate : 1000,
          workerDutyDays: parsed.workerDutyDays || {},
          nazimDutyDays: parsed.nazimDutyDays || {},
          ustadhDutyDays: parsed.ustadhDutyDays || {},
          studentDutyDays: parsed.studentDutyDays || {},
          nazimCounts: parsed.nazimCounts || {},
          ustadhCounts: parsed.ustadhCounts || {},
          studentCounts: parsed.studentCounts || {},
        };
      } catch (e) {
        console.error(e);
      }
    }
    setWageRates(loadedWageRates);

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
              amountPaid: typeof share.amountPaid === 'number' ? share.amountPaid : (share.qurbaniType === 'waqf' ? newWaqfAmount : newAmount),
              expectedDeliveryTime: share.expectedDeliveryTime || '01:00 PM',
              paidByBranchId: share.paidByBranchId || undefined,
              paidByBranchLabel: share.paidByBranchLabel || undefined,
              qurbaniType: share.qurbaniType || 'standard'
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
    if (loadedAnimals.length > 0) {
      setTagAnimalId(loadedAnimals[0].id);
    }

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
        branch: bObj ? `${bObj.centerLabel} - ${bObj.label}` : 'نامعلوم کاؤنٹر',
        type,
        details
      };
      const updated = [newLog, ...prev].slice(0, 50);
      localStorage.setItem(`qurbani_activity_logs_v5_${activeYear}`, JSON.stringify(updated));
      return updated;
    });
  };

  // Submit new hides collection record
  const submitHideCollection = () => {
    if (hideCamelCount <= 0 && hideCowCount <= 0 && hideGoatCount <= 0) {
      alert("براہ کرم کوئی ایک قسم کی کھال کی تعداد درج فرمائیں!");
      return;
    }
    const bObj = branches.find(b => b.id === activeBranch) || branches[0];
    const newCollection: HideCollection = {
      id: `H${Math.floor(1000 + Math.random() * 9000)}`, // Urdu / Friendly Slip number
      year: activeYear,
      donorName: hideDonorName.trim() || 'گمنام عطیہ کنندہ',
      donorPhone: hideDonorPhone.trim(),
      donorAddress: hideDonorAddress.trim(),
      camelCount: Number(hideCamelCount) || 0,
      cowCount: Number(hideCowCount) || 0,
      goatCount: Number(hideGoatCount) || 0,
      collectedByBranchId: activeBranch,
      collectedByBranchLabel: bObj ? `${bObj.centerLabel} - ${bObj.label}` : 'کاؤنٹر',
      centerId: bObj ? bObj.centerId : 'default',
      date: new Date().toLocaleString('ur-PK', { hour: '2-digit', minute: '2-digit', hour12: true, day: 'numeric', month: 'short', year: 'numeric' })
    };

    const updated = [newCollection, ...hides];
    setHides(updated);
    
    // reset form inputs
    setHideDonorName('');
    setHideDonorPhone('');
    setHideDonorAddress('');
    setHideCamelCount(0);
    setHideCowCount(0);
    setHideGoatCount(0);

    // log activity
    logActivity('info' as any, `کھالیں وصولی: ${newCollection.donorName} کی جانب سے چرم قربانی کا عطیہ وصول ہوا (اونٹ: ${newCollection.camelCount}، گائے: ${newCollection.cowCount}، بکرا: ${newCollection.goatCount})`);

    // set printable modal
    setActiveHideSlip(newCollection);
  };

  // Delete hides record with counter password confirmation
  const deleteHideCollection = (id: string) => {
    const code = window.prompt("چرم کا ریکارڈ حذف کرنے کے لیے برانچ کا سیکیورٹی پاس ورڈ درج کریں:");
    const activeBranchObj = branches.find(b => b.id === activeBranch);
    if (code === '9211' || (activeBranchObj && code === activeBranchObj.password)) {
      const targetHide = hides.find(h => h.id === id);
      const updated = hides.filter(h => h.id !== id);
      setHides(updated);
      logActivity('info' as any, `چرم ریکارڈ حذف: سلپ ID #${id} (${targetHide?.donorName || ''}) کا ڈیٹا خارج کر دیا گیا`);
    } else {
      alert("غلط پاس ورڈ! سیکیورٹی بوجہ سیکیورٹی تبدیلیاں مسترد کی گئیں۔");
    }
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
    localStorage.setItem(`qurbani_global_waqf_share_amount_v5_${activeYear}`, globalWaqfShareAmount.toString());
  }, [globalWaqfShareAmount, activeYear]);

  useEffect(() => {
    localStorage.setItem(`qurbani_hides_v1_${activeYear}`, JSON.stringify(hides));
    broadcastSync(animals, deposits, activityLogs, branches, activeYear, hides, wageRates);
  }, [hides, activeYear]);

  useEffect(() => {
    localStorage.setItem(`qurbani_wage_rates_v1_${activeYear}`, JSON.stringify(wageRates));
    broadcastSync(animals, deposits, activityLogs, branches, activeYear, hides, wageRates);
  }, [wageRates, activeYear]);

  useEffect(() => {
    localStorage.setItem('qurbani_years_list_v1', JSON.stringify(years));
  }, [years]);

  useEffect(() => {
    localStorage.setItem('qurbani_branches_v6', JSON.stringify(branches));
    broadcastSync(animals, deposits, activityLogs, branches);
  }, [branches]);

  useEffect(() => {
    localStorage.setItem('qurbani_active_branch_v6', activeBranch);
  }, [activeBranch]);

  useEffect(() => {
    sessionStorage.setItem('qurbani_active_view', view);
  }, [view]);

  // Listen for broadcast sync across windows / tabs
  useEffect(() => {
    try {
      const channel = new BroadcastChannel('qurbani_realtime_sync');
      channel.onmessage = (event) => {
        const { animals: incomingAnimals, deposits: incomingDeposits, logs: incomingLogs, branches: incomingBranches, year: incomingYear, hides: incomingHides, wageRates: incomingWageRates } = event.data;
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
        if (incomingBranches && JSON.stringify(incomingBranches) !== localStorage.getItem('qurbani_branches_v6')) {
          setBranches(incomingBranches);
        }
        if (incomingHides && JSON.stringify(incomingHides) !== localStorage.getItem(`qurbani_hides_v1_${activeYear}`)) {
          setHides(incomingHides);
        }
        if (incomingWageRates && JSON.stringify(incomingWageRates) !== localStorage.getItem(`qurbani_wage_rates_v1_${activeYear}`)) {
          setWageRates(incomingWageRates);
        }
      };
      return () => {
        channel.close();
      };
    } catch (e) {
      console.warn('Broadcast channel listener failed', e);
    }
  }, [branches, activeYear, hides, wageRates]);

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

  // States for 'Tag Print' and 'Data Record' features
  const [tagAnimalId, setTagAnimalId] = useState<number | null>(() => {
    return animals.length > 0 ? animals[0].id : null;
  });
  const [selectedTags, setSelectedTags] = useState<boolean[]>([true, true, true, true, true, true, true]);
  const [tagOrientation, setTagOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [transferSource, setTransferSource] = useState<{ animalId: number; shareId: string; shareName: string; shareIndex: number } | null>(null);
  const [transferTargetAnimalId, setTransferTargetAnimalId] = useState<number | null>(null);

  // States for 'Data Record' filters and tables
  const [recordBranchFilter, setRecordBranchFilter] = useState<string>('all');
  const [recordAnimalFilter, setRecordAnimalFilter] = useState<string>('all');
  const [recordPaymentFilter, setRecordPaymentFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [recordSearchQuery, setRecordSearchQuery] = useState<string>('');
  const [recordAddressFilter, setRecordAddressFilter] = useState<string>('all');
  const [recordReceiptSort, setRecordReceiptSort] = useState<'none' | 'asc'>('none');

  // Auto reset selected shares to all true when animal selection changes
  useEffect(() => {
    setSelectedTags([true, true, true, true, true, true, true]);
  }, [tagAnimalId]);

  // Set default target animal when source is selected for transfer
  useEffect(() => {
    if (transferSource) {
      setTransferTargetAnimalId(transferSource.animalId);
    } else {
      setTransferTargetAnimalId(null);
    }
  }, [transferSource]);

  // Format name in majestic style: جناب [Name] صاحب
  const formatShareholderName = (name: string) => {
    if (!name || name.trim() === '') return '_______________';
    let cleanName = name.trim();
    if (cleanName.startsWith('جناب')) {
      cleanName = cleanName.replace(/^جناب\s+/, '');
    }
    if (cleanName.endsWith('صاحب')) {
      cleanName = cleanName.replace(/\s+صاحب$/, '');
    }
    return `جناب ${cleanName} صاحب`;
  };

  // Parse name to extract "معرفت" or "بمعرفت" to a separate line
  const parseShareholderName = (name: string) => {
    if (!name || name.trim() === '') return { main: '_______________', sub: '' };
    const rawName = name.trim();
    const marefatMatch = rawName.match(/\s*(بمعرفت|معرفت)\s*(.*)$/);
    
    let mainPart = rawName;
    let subPart = '';
    
    if (marefatMatch) {
      mainPart = rawName.substring(0, marefatMatch.index).trim();
      subPart = marefatMatch[0].trim();
    }
    
    if (mainPart.startsWith('جناب')) {
      mainPart = mainPart.replace(/^جناب\s+/, '');
    }
    if (mainPart.endsWith('صاحب')) {
      mainPart = mainPart.replace(/\s+صاحب$/, '');
    }
    
    const formattedMain = mainPart === '' ? '_______________' : `جناب ${mainPart} صاحب`;
    return { main: formattedMain, sub: subPart };
  };

  // Chunking helper to divide array into chunks of a given size
  const chunkArray = <T,>(arr: T[], size: number): T[][] => {
    const result: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      result.push(arr.slice(i, i + size));
    }
    return result;
  };

  // Covert printing helper to print beautifully without any sandboxed iframe limitations
  const printElementDirectly = (elementId: string, styleContent: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const origBodyDir = document.body.getAttribute('dir');
    const origBodyClass = document.body.className;
    
    // Ensure the element is visible by copying and adjusting classes
    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.display = 'block';
    clone.className = clone.className.replace(/\bhidden\b/g, '');
    
    const styleBlock = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400..700&family=Noto+Sans+Arabic:wght@100..900&family=Inter:wght@100..900&display=swap');
        ${styleContent}
      </style>
    `;

    const printFrameContent = `
      <div dir="rtl" class="urdu-text" style="direction: rtl; text-align: right; width: 100%; min-height: 100%; background: white;">
        ${clone.outerHTML}
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
  };

  // Trigger tag printing with highly optimized black ink contrast styles and Alvi Nastaleeq fonts
  const handlePrintTags = () => {
    const isLandscape = tagOrientation === 'landscape';
    const styleContent = `
      @media print {
        @page {
          size: A4 ${isLandscape ? 'landscape' : 'portrait'};
          margin: 0.15in !important;
        }
        body {
          margin: 0 !important;
          padding: 0 !important;
          background-color: #ffffff !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .a4-page {
          width: ${isLandscape ? '11.69in' : '8.27in'} !important;
          height: ${isLandscape ? '8.27in' : '11.69in'} !important;
          padding: ${isLandscape ? '0.25in 0.3in' : '0.3in 0.25in'} !important;
          box-sizing: border-box !important;
          page-break-after: always !important;
          break-after: page !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: flex-start !important;
          background: white !important;
          font-family: "Alvi Lahori Nastaliq", "Alvi Nastaliq", "Jameel Noori Nastaliq", "Mehr Nastaliq Urdu", "Noto Nastaliq Urdu", "Noto Sans Arabic", serif !important;
        }
        .tags-grid {
          display: grid !important;
          grid-template-columns: repeat(2, ${isLandscape ? '4.0in' : '3.8in'}) !important;
          grid-template-rows: repeat(2, ${isLandscape ? '3.8in' : '4.0in'}) !important;
          gap: 0.15in !important;
          justify-content: center !important;
          align-content: start !important;
        }
        .tag-card {
          width: ${isLandscape ? '4.0in' : '3.8in'} !important;
          min-width: ${isLandscape ? '4.0in' : '3.8in'} !important;
          max-width: ${isLandscape ? '4.0in' : '3.8in'} !important;
          height: ${isLandscape ? '3.8in' : '4.0in'} !important;
          min-height: ${isLandscape ? '3.8in' : '4.0in'} !important;
          max-height: ${isLandscape ? '3.8in' : '4.0in'} !important;
          border: 4px solid #000000 !important;
          box-sizing: border-box !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: space-between !important;
          padding: 14px !important;
          direction: rtl !important;
          text-align: right !important;
          background-color: #ffffff !important;
          position: relative !important;
          overflow: hidden !important;
          font-family: "Alvi Lahori Nastaliq", "Alvi Nastaliq", "Jameel Noori Nastaliq", "Mehr Nastaliq Urdu", "Noto Nastaliq Urdu", "Noto Sans Arabic", serif !important;
        }
        .tag-card * {
          font-family: "Alvi Lahori Nastaliq", "Alvi Nastaliq", "Jameel Noori Nastaliq", "Mehr Nastaliq Urdu", "Noto Nastaliq Urdu", "Noto Sans Arabic", serif !important;
        }
        .tag-section-top {
          height: 40% !important;
          border-bottom: 2px solid #000000 !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: space-around !important;
          padding-bottom: 6px !important;
        }
        .tag-section-middle {
          height: 20% !important;
          border-bottom: 2px solid #000000 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          direction: rtl !important;
        }
        .tag-section-bottom {
          height: 40% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          text-align: center !important;
          padding-top: 8px !important;
        }
        .tag-row {
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          width: 100% !important;
          direction: rtl !important;
        }
      }
    `;
    printElementDirectly('tags-print-container', styleContent);
  };

  // Trigger ledger list print with beautiful double line border and optimized columns
  const handlePrintRecords = () => {
    const styleContent = `
      @media print {
        @page {
          size: A4 portrait;
          margin: 0.4in 0.3in !important;
        }
        body {
          margin: 0 !important;
          padding: 0 !important;
          background-color: #ffffff !important;
          color: #000000 !important;
          font-family: "Alvi Lahori Nastaliq", "Alvi Nastaliq", "Jameel Noori Nastaliq", "Mehr Nastaliq Urdu", "Noto Nastaliq Urdu", "Noto Sans Arabic", serif !important;
        }
        .print-header {
          text-align: center !important;
          margin-bottom: 24px !important;
          border-bottom: 3px double #000000 !important;
          padding-bottom: 12px !important;
          font-family: "Alvi Lahori Nastaliq", "Alvi Nastaliq", "Jameel Noori Nastaliq", "Mehr Nastaliq Urdu", "Noto Nastaliq Urdu", "Noto Sans Arabic", serif !important;
        }
        .print-title {
          font-size: 20px !important;
          font-weight: bold !important;
          margin: 0 0 4px 0 !important;
          font-family: "Alvi Lahori Nastaliq", "Alvi Nastaliq", "Jameel Noori Nastaliq", "Mehr Nastaliq Urdu", "Noto Nastaliq Urdu", "Noto Sans Arabic", serif !important;
        }
        .print-subtitle {
          font-size: 11px !important;
          color: #333333 !important;
          margin: 0 !important;
          font-family: "Alvi Lahori Nastaliq", "Alvi Nastaliq", "Jameel Noori Nastaliq", "Mehr Nastaliq Urdu", "Noto Nastaliq Urdu", "Noto Sans Arabic", serif !important;
        }
        .report-table {
          width: 100% !important;
          border-collapse: collapse !important;
          direction: rtl !important;
          text-align: right !important;
          font-size: 11px !important;
          font-family: "Alvi Lahori Nastaliq", "Alvi Nastaliq", "Jameel Noori Nastaliq", "Mehr Nastaliq Urdu", "Noto Nastaliq Urdu", "Noto Sans Arabic", serif !important;
        }
        .report-table th, .report-table td {
          border: 1px solid #111111 !important;
          padding: 8px 6px !important;
          font-family: "Alvi Lahori Nastaliq", "Alvi Nastaliq", "Jameel Noori Nastaliq", "Mehr Nastaliq Urdu", "Noto Nastaliq Urdu", "Noto Sans Arabic", serif !important;
        }
        .report-table th {
          background-color: #f3f4f6 !important;
          font-weight: bold !important;
          text-align: center !important;
        }
        .report-table td {
          text-align: center !important;
        }
        .text-right-important {
          text-align: right !important;
        }
      }
    `;
    printElementDirectly('records-print-container', styleContent);
  };

  // Code generator for single Tag Card Item on screen preview
  const renderTagItemCode = (
    animalLabel: string,
    shareIdx: number,
    shareName: string,
    sharePhone: string,
    isScreenPreview: boolean
  ) => {
    const getAnimalNumberOnly = (label: string) => {
      const digits = label.replace(/[^\d]/g, '');
      return digits || label;
    };
    
    const cowNumber = getAnimalNumberOnly(animalLabel);
    const nameParts = parseShareholderName(shareName);
    
    const cardClass = isScreenPreview 
      ? `${tagOrientation === 'landscape' ? 'w-[190px] h-[180px]' : 'w-[180px] h-[190px]'} border-4 border-slate-950 flex flex-col justify-between p-2 select-none bg-white text-right`
      : "tag-card";
      
    return (
      <div className={cardClass} dir="rtl" style={{ direction: 'rtl', textAlign: 'right', fontFamily: '"Alvi Lahori Nastaliq", "Alvi Nastaliq", "Jameel Noori Nastaliq", "Mehr Nastaliq Urdu", "Noto Nastaliq Urdu", sans-serif' }}>
        <div className={isScreenPreview ? "border-b-2 border-slate-950 pb-1 flex flex-col justify-center h-[75px]" : "tag-section-top"}>
          <div className="flex justify-between items-center w-full" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className={`${isScreenPreview ? 'text-[10px]' : 'text-xl'} font-bold text-slate-800`}>گائے نمبر</span>
            <div className={isScreenPreview ? "w-6 h-6 flex items-center justify-center" : "w-12 h-12 flex items-center justify-center"} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <span className={`${isScreenPreview ? 'text-xl' : 'text-[45px]'} font-black text-slate-950 font-mono tracking-tight`} style={{ fontFamily: '"Inter", sans-serif', lineHeight: '1' }}>{cowNumber}</span>
            </div>
          </div>
          <div className="flex justify-between items-center w-full mt-0.5" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className={`${isScreenPreview ? 'text-[10px]' : 'text-xl'} font-bold text-slate-800`}>حصہ نمبر</span>
            <div className={`${isScreenPreview ? 'w-6 h-6 text-xs' : 'w-12 h-12 text-2xl'} border-2 border-slate-950 rounded-full flex items-center justify-center font-black text-slate-950`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Inter", sans-serif', lineHeight: '1', boxSizing: 'border-box' }}>
              {shareIdx}
            </div>
          </div>
        </div>
        
        <div className={isScreenPreview ? "border-b-2 border-slate-950 py-1 flex justify-between items-center h-[30px]" : "tag-section-middle"}>
          <span className={`${isScreenPreview ? 'text-[8px]' : 'text-lg'} font-bold text-slate-700`}>رابطہ نمبر</span>
          <span className={`${isScreenPreview ? 'text-[10px]' : 'text-xl'} font-black text-slate-950 font-mono tracking-wider`} style={{ fontFamily: '"Inter", sans-serif' }}>
            {sharePhone || '_______________'}
          </span>
        </div>
        
        <div className={isScreenPreview ? "flex items-center justify-center text-center py-1 h-[55px]" : "tag-section-bottom"}>
          <div className="w-full text-center flex flex-col justify-center items-center">
            <p className={`${isScreenPreview ? 'text-[9px] leading-snug' : 'text-[22px] font-black'} text-slate-950`} style={{ lineHeight: isScreenPreview ? '1.3' : '1.8', margin: 0, wordBreak: 'break-word', fontFamily: '"Alvi Lahori Nastaliq", "Alvi Nastaliq", "Jameel Noori Nastaliq", "Mehr Nastaliq Urdu", "Noto Nastaliq Urdu", sans-serif' }}>
              {nameParts.main}
            </p>
            {nameParts.sub && (
              <p className={`${isScreenPreview ? 'text-[8px] mt-0.5 leading-snug' : 'text-[17px] font-bold mt-1'} text-slate-700`} style={{ lineHeight: isScreenPreview ? '1.3' : '1.6', margin: 0, wordBreak: 'break-word', fontFamily: '"Alvi Lahori Nastaliq", "Alvi Nastaliq", "Jameel Noori Nastaliq", "Mehr Nastaliq Urdu", "Noto Nastaliq Urdu", sans-serif' }}>
                {nameParts.sub}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

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
      if (sh && sh.isPaid && !isNazim && sh.paidByBranchId && sh.paidByBranchId !== activeBranch) {
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

  const updateShareType = (animalId: number, shareId: string, qurbaniType: 'standard' | 'waqf') => {
    const targetAnimal = animals.find(a => a.id === animalId);
    if (targetAnimal) {
      const sh = targetAnimal.shares.find(s => s.id === shareId);
      if (sh && sh.isPaid && !isNazim && sh.paidByBranchId && sh.paidByBranchId !== activeBranch) {
        return; // secure lock
      }
    }
    setAnimals(prev => prev.map(a => {
      if (a.id !== animalId) return a;
      return {
        ...a,
        shares: a.shares.map(s => {
          if (s.id !== shareId) return s;
          const shouldUpdateAmount = !s.isPaid;
          const newAmount = shouldUpdateAmount 
            ? (qurbaniType === 'waqf' ? globalWaqfShareAmount : globalShareAmount) 
            : s.amountPaid;
          return {
            ...s,
            qurbaniType,
            amountPaid: newAmount
          };
        })
      };
    }));
  };

  const updateShareAmount = (animalId: number, shareId: string, amount: number) => {
    const targetAnimal = animals.find(a => a.id === animalId);
    if (targetAnimal) {
      const sh = targetAnimal.shares.find(s => s.id === shareId);
      if (sh && sh.isPaid && !isNazim && sh.paidByBranchId && sh.paidByBranchId !== activeBranch) {
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
      if (sh && sh.isPaid && !isNazim && sh.paidByBranchId && sh.paidByBranchId !== activeBranch) {
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
        const receiptNumberString = activeSlip.share.customReceiptId || `S-${activeSlip.share.id}`;
        const msg = `*اجتماعی قربانی جامعہ اشرف المدارس کراچی - رسید بکنگ* 🌸\n\n` +
                    `*رسید نمبر:* ${receiptNumberString}\n` +
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
          link.download = `Receipt-${receiptNumberString}.png`;
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
      if (sh && sh.isPaid && !isNazim && sh.paidByBranchId && sh.paidByBranchId !== activeBranch) {
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
      if (sh && sh.isPaid && !isNazim && sh.paidByBranchId && sh.paidByBranchId !== activeBranch) {
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

  const transferShare = (
    sourceAnimalId: number,
    sourceShareId: string,
    targetAnimalId: number,
    targetShareIdx: number
  ) => {
    const sourceAnimal = animals.find(a => a.id === sourceAnimalId);
    if (!sourceAnimal) return { success: false, message: 'Source animal not found' };

    const sourceShare = sourceAnimal.shares.find(s => s.id === sourceShareId);
    if (!sourceShare) return { success: false, message: 'Source share not found' };

    const targetAnimal = animals.find(a => a.id === targetAnimalId);
    if (!targetAnimal) return { success: false, message: 'Target animal not found' };

    if (targetShareIdx < 0 || targetShareIdx >= SHARES_PER_ANIMAL) {
      return { success: false, message: 'Invalid target share index' };
    }

    const targetShare = targetAnimal.shares[targetShareIdx];
    const targetShareId = targetShare.id;

    if (!isNazim) {
      if (sourceShare.isPaid && sourceShare.paidByBranchId && sourceShare.paidByBranchId !== activeBranch) {
        return { success: false, message: 'یہ حصہ دوسرے کاؤنٹر سے ادا شدہ ہے اور مقفل ہے۔' };
      }
      if (targetShare.isPaid && targetShare.paidByBranchId && targetShare.paidByBranchId !== activeBranch) {
        return { success: false, message: 'منتخب ہدف حصہ دوسرے کاؤنٹر سے ادا شدہ ہے اور مقفل ہے۔' };
      }
    }

    const originalReceiptId = sourceShare.customReceiptId || `S-${sourceShare.id}`;

    setAnimals(prev => prev.map(a => {
      // Same Animal
      if (sourceAnimalId === targetAnimalId) {
        if (a.id !== sourceAnimalId) return a;
        
        const newShares = [...a.shares];
        const oldTargetDetails = { ...newShares[targetShareIdx] };
        
        newShares[targetShareIdx] = {
          ...newShares[targetShareIdx],
          name: sourceShare.name,
          phone: sourceShare.phone,
          address: sourceShare.address,
          isDistributed: sourceShare.isDistributed,
          distributionTime: sourceShare.distributionTime,
          isPaid: sourceShare.isPaid,
          amountPaid: sourceShare.amountPaid,
          expectedDeliveryTime: sourceShare.expectedDeliveryTime,
          paidByBranchId: sourceShare.paidByBranchId,
          paidByBranchLabel: sourceShare.paidByBranchLabel,
          customReceiptId: originalReceiptId
        };

        if (oldTargetDetails.name) {
          const srcIndex = a.shares.findIndex(s => s.id === sourceShareId);
          newShares[srcIndex] = {
            ...sourceShare,
            name: oldTargetDetails.name,
            phone: oldTargetDetails.phone,
            address: oldTargetDetails.address,
            isDistributed: oldTargetDetails.isDistributed,
            distributionTime: oldTargetDetails.distributionTime,
            isPaid: oldTargetDetails.isPaid,
            amountPaid: oldTargetDetails.amountPaid,
            expectedDeliveryTime: oldTargetDetails.expectedDeliveryTime,
            paidByBranchId: oldTargetDetails.paidByBranchId,
            paidByBranchLabel: oldTargetDetails.paidByBranchLabel,
            customReceiptId: oldTargetDetails.customReceiptId || `S-${oldTargetDetails.id}`
          };
        } else {
          const srcIndex = a.shares.findIndex(s => s.id === sourceShareId);
          newShares[srcIndex] = {
            id: sourceShareId,
            name: '',
            phone: '',
            address: '',
            isDistributed: false,
            isPaid: false,
            amountPaid: 0,
            expectedDeliveryTime: '01:00 PM'
          };
        }

        return { ...a, shares: newShares };
      }

      // Different Animals
      if (a.id === sourceAnimalId) {
        const oldTarget = targetAnimal.shares[targetShareIdx];
        if (oldTarget.name) {
          return {
            ...a,
            shares: a.shares.map(s => s.id === sourceShareId ? {
              ...s,
              name: oldTarget.name,
              phone: oldTarget.phone,
              address: oldTarget.address,
              isDistributed: oldTarget.isDistributed,
              distributionTime: oldTarget.distributionTime,
              isPaid: oldTarget.isPaid,
              amountPaid: oldTarget.amountPaid,
              expectedDeliveryTime: oldTarget.expectedDeliveryTime,
              paidByBranchId: oldTarget.paidByBranchId,
              paidByBranchLabel: oldTarget.paidByBranchLabel,
              customReceiptId: oldTarget.customReceiptId || `S-${oldTarget.id}`
            } : s)
          };
        } else {
          return {
            ...a,
            shares: a.shares.map(s => s.id === sourceShareId ? {
              id: sourceShareId,
              name: '',
              phone: '',
              address: '',
              isDistributed: false,
              isPaid: false,
              amountPaid: 0,
              expectedDeliveryTime: '01:00 PM'
            } : s)
          };
        }
      }

      if (a.id === targetAnimalId) {
        return {
          ...a,
          shares: a.shares.map(s => s.id === targetShareId ? {
            ...s,
            name: sourceShare.name,
            phone: sourceShare.phone,
            address: sourceShare.address,
            isDistributed: sourceShare.isDistributed,
            distributionTime: sourceShare.distributionTime,
            isPaid: sourceShare.isPaid,
            amountPaid: sourceShare.amountPaid,
            expectedDeliveryTime: sourceShare.expectedDeliveryTime,
            paidByBranchId: sourceShare.paidByBranchId,
            paidByBranchLabel: sourceShare.paidByBranchLabel,
            customReceiptId: originalReceiptId
          } : s)
        };
      }

      return a;
    }));

    const details = `${sourceAnimal.label} کے حصہ ${sourceShare.name || 'خالی'} کو ${targetAnimal.label} کے حصہ نمبر ${targetShareIdx + 1} پر منتقل کر دیا گیا`;
    logActivity('transfer', details);

    return { success: true, message: 'کامیابی سے منتقل کر دیا گیا' };
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
        if (!isNazim && targetShare.paidByBranchId && targetShare.paidByBranchId !== activeBranch) {
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
          const newAmount = isNowPaid ? (s.qurbaniType === 'waqf' ? globalWaqfShareAmount : globalShareAmount) : s.amountPaid;
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
      collectorBranch: branches.find(b => b.id === activeBranch)?.label || 'کاؤنٹر',
      collectorBranchId: activeBranch
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
    // Filter animals with at least one paid/booked share in the visible branches
    const eligibleAnimals = animals.filter(a => {
      if (activeBranchObj?.role === 'super_admin') {
        return a.shares.some(s => s.isPaid);
      }
      return a.shares.some(s => {
        return s.isPaid && s.paidByBranchId && activeCenterBranches.includes(s.paidByBranchId);
      });
    });

    const totalAnimals = eligibleAnimals.length;
    const totalShares = totalAnimals * SHARES_PER_ANIMAL;

    let distributedCount = 0;
    let paidCount = 0;
    let totalCashReceived = 0;
    
    animals.forEach(a => {
      a.shares.forEach(s => {
        const isMatched = isGlobalDashboard || (s.paidByBranchId && activeCenterBranches.includes(s.paidByBranchId));
        if (isMatched) {
          if (s.isDistributed) distributedCount++;
          if (s.isPaid) {
            paidCount++;
            totalCashReceived += s.amountPaid;
          }
        }
      });
    });

    // Filter deposits by region if not global
    const filteredDeposits = deposits.filter(dep => {
      if (isGlobalDashboard) return true;
      if (dep.collectorBranchId) {
        return activeCenterBranches.includes(dep.collectorBranchId);
      }
      // fallback to matching branch label
      const bId = branches.find(b => b.label === dep.collectorBranch)?.id;
      return bId && activeCenterBranches.includes(bId);
    });

    const bankDepositedAmount = filteredDeposits
      .filter(dep => dep.destination === 'bank')
      .reduce((sum, dep) => sum + dep.totalAmount, 0);

    const counterDepositedAmount = filteredDeposits
      .filter(dep => dep.destination === 'counter')
      .reduce((sum, dep) => sum + dep.totalAmount, 0);

    const cashOnHand = totalCashReceived - bankDepositedAmount - counterDepositedAmount;

    return {
      totalAnimals,
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
  }, [animals, deposits, isGlobalDashboard, activeCenterBranches, branches]);

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
          const isMatched = isGlobalDashboard || (share.paidByBranchId && activeCenterBranches.includes(share.paidByBranchId));
          if (isMatched) {
            total += share.amountPaid;
          }
        }
      });
    });
    return total;
  }, [animals, isGlobalDashboard, activeCenterBranches]);

  const grandTotalCount = useMemo(() => {
    let count = 0;
    animals.forEach(animal => {
      animal.shares.forEach(share => {
        if (share.isPaid) {
          const isMatched = isGlobalDashboard || (share.paidByBranchId && activeCenterBranches.includes(share.paidByBranchId));
          if (isMatched) {
            count += 1;
          }
        }
      });
    });
    return count;
  }, [animals, isGlobalDashboard, activeCenterBranches]);

  const grandTotalAnimals = useMemo(() => {
    let count = 0;
    animals.forEach(animal => {
      const hasBooking = animal.shares.some(share => 
        share.isPaid && (isGlobalDashboard || (share.paidByBranchId && activeCenterBranches.includes(share.paidByBranchId)))
      );
      if (hasBooking) {
        count += 1;
      }
    });
    return count;
  }, [animals, isGlobalDashboard, activeCenterBranches]);

  const qurbaniStats = useMemo(() => {
    let standardPaid = 0;
    let standardTotal = 0;
    let standardPaidAmount = 0;
    let waqfPaid = 0;
    let waqfTotal = 0;
    let waqfPaidAmount = 0;

    animals.forEach(animal => {
      const hasCenterBooking = animal.shares.some(share => 
        share.isPaid && (isGlobalDashboard || (share.paidByBranchId && activeCenterBranches.includes(share.paidByBranchId)))
      );

      animal.shares.forEach(share => {
        const isWaqf = share.qurbaniType === 'waqf';
        const isMatched = isGlobalDashboard || (share.paidByBranchId && activeCenterBranches.includes(share.paidByBranchId));
        
        if (isWaqf) {
          if (hasCenterBooking) {
            waqfTotal += 1;
          }
          if (share.isPaid && isMatched) {
            waqfPaid += 1;
            waqfPaidAmount += share.amountPaid;
          }
        } else {
          if (hasCenterBooking) {
            standardTotal += 1;
          }
          if (share.isPaid && isMatched) {
            standardPaid += 1;
            standardPaidAmount += share.amountPaid;
          }
        }
      });
    });

    return {
      standardPaid,
      standardTotal,
      standardPaidAmount,
      waqfPaid,
      waqfTotal,
      waqfPaidAmount
    };
  }, [animals, isGlobalDashboard, activeCenterBranches]);

  const centerTotals = useMemo(() => {
    const totals: { [centerId: string]: { amount: number; count: number } } = {};
    branches.forEach(b => {
      const col = branchCollections[b.id] || { amount: 0, count: 0 };
      if (!totals[b.centerId]) {
        totals[b.centerId] = { amount: 0, count: 0 };
      }
      totals[b.centerId].amount += col.amount;
      totals[b.centerId].count += col.count;
    });
    return totals;
  }, [branches, branchCollections]);

  const centerSupervisors = useMemo(() => {
    const supervisors: Branch[] = [];
    const seenCenters = new Set<string>();

    // First try super_admin (which coordinates centralized actions)
    const sa = branches.find(b => b.role === 'super_admin');
    if (sa) {
      supervisors.push(sa);
      seenCenters.add(sa.centerId);
    }

    // Now get all nazims of centers
    branches.forEach(b => {
      if (!seenCenters.has(b.centerId) && b.role === 'nazim') {
        supervisors.push(b);
        seenCenters.add(b.centerId);
      }
    });

    // Fallback if some center has no supervisor yet for listing
    branches.forEach(b => {
      if (!seenCenters.has(b.centerId)) {
        supervisors.push(b);
        seenCenters.add(b.centerId);
      }
    });

    return supervisors;
  }, [branches]);

  const filteredCenterSupervisors = useMemo(() => {
    if (isGlobalDashboard) return centerSupervisors;
    return centerSupervisors.filter(s => s.centerId === activeBranchObj?.centerId);
  }, [centerSupervisors, isGlobalDashboard, activeBranchObj]);

  const filteredAnimals = animals.filter(a => 
    a.label.includes(searchQuery) || 
    a.shares.some(s => s.name.includes(searchQuery))
  );

  const selectedAnimal = animals.find(a => a.id === selectedAnimalId);

  // Selector to filter and paginate/chunk selected animal shares for Tag Printing
  const chunkedSelectedTags = useMemo(() => {
    const selectedAnimalForTags = animals.find(a => a.id === tagAnimalId);
    if (!selectedAnimalForTags) return [];
    
    const list: { cowNumber: string; shareIdx: number; shareName: string; sharePhone: string; formattedName: string }[] = [];
    
    selectedTags.forEach((isSelected, idx) => {
      if (isSelected) {
        const share = selectedAnimalForTags.shares[idx];
        const shareIdx = idx + 1;
        const getAnimalNumberOnly = (label: string) => {
          const digits = label.replace(/[^\d]/g, '');
          return digits || label;
        };
        const cowNumber = getAnimalNumberOnly(selectedAnimalForTags.label);
        const formattedName = formatShareholderName(share?.name || '');
        list.push({
          cowNumber,
          shareIdx,
          shareName: share?.name || '',
          sharePhone: share?.phone || '',
          formattedName
        });
      }
    });
    
    return chunkArray(list, 4);
  }, [tagAnimalId, selectedTags, animals]);

  // Unique addresses list for filtering (only valid non-empty ones)
  const uniqueAddresses = useMemo(() => {
    const addressesSet = new Set<string>();
    animals.forEach(animal => {
      animal.shares.forEach(share => {
        if (share.address && share.address.trim() !== '') {
          addressesSet.add(share.address.trim());
        }
      });
    });
    return Array.from(addressesSet).sort();
  }, [animals]);

  // Selector to filter flat list of bookings for Data Record spreadsheet
  const filteredSharesForRecords = useMemo(() => {
    const list: { animalId: number; animalLabel: string; share: Share; shareIdx: number }[] = [];
    animals.forEach(animal => {
      animal.shares.forEach((share, idx) => {
        // filter by branch
        if (recordBranchFilter !== 'all') {
          if (share.paidByBranchId !== recordBranchFilter) return;
        } else {
          if (!isGlobalDashboard && (!share.paidByBranchId || !activeCenterBranches.includes(share.paidByBranchId))) return;
        }
        // filter by animal
        if (recordAnimalFilter !== 'all') {
          if (animal.id.toString() !== recordAnimalFilter) return;
        }
        // filter by payment
        if (recordPaymentFilter === 'paid') {
          if (!share.isPaid) return;
        } else if (recordPaymentFilter === 'unpaid') {
          if (share.isPaid) return;
        }
        // filter by address
        if (recordAddressFilter !== 'all') {
          if (!share.address || share.address.trim() !== recordAddressFilter) return;
        }
        // search query
        if (recordSearchQuery.trim() !== '') {
          const query = recordSearchQuery.toLowerCase();
          const nameMatch = share.name ? share.name.toLowerCase().includes(query) : false;
          const phoneMatch = share.phone ? share.phone.toLowerCase().includes(query) : false;
          const addrMatch = share.address ? share.address.toLowerCase().includes(query) : false;
          const labelMatch = animal.label ? animal.label.toLowerCase().includes(query) : false;
          
          if (!nameMatch && !phoneMatch && !addrMatch && !labelMatch) return;
        }
        
        list.push({
          animalId: animal.id,
          animalLabel: animal.label,
          share,
          shareIdx: idx + 1
        });
      });
    });

    // sort by receipt number if requested
    if (recordReceiptSort === 'asc') {
      list.sort((a, b) => {
        const recA = a.share.customReceiptId || `S-${a.share.id}`;
        const recB = b.share.customReceiptId || `S-${b.share.id}`;
        return recA.localeCompare(recB, undefined, { numeric: true, sensitivity: 'base' });
      });
    }

    return list;
  }, [animals, recordBranchFilter, recordAnimalFilter, recordPaymentFilter, recordSearchQuery, recordAddressFilter, recordReceiptSort, isGlobalDashboard, activeCenterBranches]);

  // Employee / Nazim compensation ledger & payroll sheet
  const hidesPayroll = useMemo(() => {
    // Filter branches to only keep the Nazim rows (excluding central HQ and Super Admin)
    const nazimBranches = branches.filter(b => b.role === 'nazim' && b.id !== 'hq' && b.id !== 'super_admin');

    // Group and aggregate skins/hides counts by centerId
    const centerStats: { [centerId: string]: { camel: number; cow: number; goat: number; total: number } } = {};
    branches.forEach(b => {
      if (b.centerId && !centerStats[b.centerId]) {
        centerStats[b.centerId] = { camel: 0, cow: 0, goat: 0, total: 0 };
      }
    });

    hides.filter(h => h.year === activeYear).forEach(h => {
      const bId = h.collectedByBranchId;
      const associatedBranch = branches.find(br => br.id === bId);
      if (associatedBranch && associatedBranch.centerId) {
        const cId = associatedBranch.centerId;
        if (!centerStats[cId]) {
          centerStats[cId] = { camel: 0, cow: 0, goat: 0, total: 0 };
        }
        centerStats[cId].camel += h.camelCount || 0;
        centerStats[cId].cow += h.cowCount || 0;
        centerStats[cId].goat += h.goatCount || 0;
        centerStats[cId].total += (h.camelCount || 0) + (h.cowCount || 0) + (h.goatCount || 0);
      }
    });

    return nazimBranches.map(b => {
      const stats = centerStats[b.centerId] || { camel: 0, cow: 0, goat: 0, total: 0 };
      
      const nazimCount = typeof wageRates.nazimCounts?.[b.id] === 'number'
        ? wageRates.nazimCounts[b.id]
        : (b.role === 'nazim' ? 1 : 0);

      const ustadhCount = typeof wageRates.ustadhCounts?.[b.id] === 'number'
        ? wageRates.ustadhCounts[b.id]
        : (b.id !== 'hq' ? 1 : 0);

      const studentCount = typeof wageRates.studentCounts?.[b.id] === 'number'
        ? wageRates.studentCounts[b.id]
        : (b.id !== 'hq' ? 15 : 0);

      const nazimDays = typeof wageRates.nazimDutyDays?.[b.id] === 'number' 
        ? wageRates.nazimDutyDays[b.id] 
        : (typeof wageRates.workerDutyDays?.[b.id] === 'number' ? wageRates.workerDutyDays[b.id] : (b.role === 'nazim' ? 3 : 0));

      const ustadhDays = typeof wageRates.ustadhDutyDays?.[b.id] === 'number' 
        ? wageRates.ustadhDutyDays[b.id] 
        : (typeof wageRates.workerDutyDays?.[b.id] === 'number' ? wageRates.workerDutyDays[b.id] : 3);

      const studentDays = typeof wageRates.studentDutyDays?.[b.id] === 'number' 
        ? wageRates.studentDutyDays[b.id] 
        : (typeof wageRates.workerDutyDays?.[b.id] === 'number' ? wageRates.workerDutyDays[b.id] : 3);

      const hideCommission = (stats.camel * wageRates.camelRate) + 
                             (stats.cow * wageRates.cowRate) + 
                             (stats.goat * wageRates.goatRate);

      const nazimWages = nazimCount * nazimDays * (wageRates.nazimDailyRate ?? 2500);
      const ustadhWages = ustadhCount * ustadhDays * (wageRates.ustadhDailyRate ?? 1800);
      const studentWages = studentCount * studentDays * (wageRates.studentDailyRate ?? 1000);
      const dailyWages = nazimWages + ustadhWages + studentWages;

      const netPayable = hideCommission + dailyWages;
      return {
        branch: b,
        stats,
        nazimCount,
        ustadhCount,
        studentCount,
        nazimDays,
        ustadhDays,
        studentDays,
        nazimWages,
        ustadhWages,
        studentWages,
        hideCommission,
        dailyWages,
        netPayable
      };
    });
  }, [branches, hides, wageRates, activeYear]);

  // Hides Collections summaries
  const hidesStats = useMemo(() => {
    let camel = 0;
    let cow = 0;
    let goat = 0;
    const currentYrHides = hides.filter(h => h.year === activeYear);
    currentYrHides.forEach(h => {
      camel += (h.camelCount || 0);
      cow += (h.cowCount || 0);
      goat += (h.goatCount || 0);
    });
    return {
      camel,
      cow,
      goat,
      total: camel + cow + goat
    };
  }, [hides, activeYear]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const branchToAuth = branches.find(b => b.id === pendingActiveBranch);
    if (!branchToAuth) {
      setLoginError('منتخب کردہ کاؤنٹر ریکارڈ میں نہیں ملا۔');
      return;
    }
    const entered = loginPassword.trim();
    const correct = (branchToAuth.password || '123').trim();

    if (entered === correct) {
      setIsAuthenticated(true);
      setActiveBranch(pendingActiveBranch);
      localStorage.setItem('qurbani_is_authenticated_v5', 'true');
      localStorage.setItem('qurbani_active_branch_v6', pendingActiveBranch);
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
              جامعہ اشرف المدارس کراچی
            </div>
            <div className="w-16 h-16 bg-white/10 rounded-2xl mx-auto flex items-center justify-center mb-4 backdrop-blur-sm">
              <Lock className="text-white" size={32} />
            </div>
            <h2 className="text-3xl font-bold tracking-tight font-urdu" style={{ fontFamily: '"Alvi Nastaleeq", "Alvi Lahori Nastaliq", "Jameel Noori Nastaliq", "Noto Nastaliq Urdu", serif' }}>کاؤنٹر لاگ ان سروس</h2>
            <p className="text-xs text-emerald-100/80 mt-1 font-bold">اجتماعی قربانی بکنگ اور کیش وصولی کے لیے اپنے مرکز اور اکاؤنٹ سے لاگ ان کریں</p>
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

            {/* Two-tier drop-down selects */}
            <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="space-y-1.5 text-right">
                <label className="text-xs font-bold text-slate-700 block text-right">۱۔ مرکز / علاقہ منتخب کریں:</label>
                <div className="relative">
                  <select
                    value={loginCenterId}
                    onChange={(e) => {
                      const newCenterId = e.target.value;
                      setLoginCenterId(newCenterId);
                      setLoginError('');
                      // Automatically select the first account of this center (prefer Nazim)
                      const centerAccounts = branches.filter(b => b.centerId === newCenterId);
                      const prefAccount = centerAccounts.find(b => b.role === 'nazim') || centerAccounts[0];
                      if (prefAccount) {
                        setPendingActiveBranch(prefAccount.id);
                      }
                    }}
                    className="w-full bg-white border border-slate-200 p-2.5 rounded-xl font-bold text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer text-right appearance-none pr-3"
                  >
                    {centersList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5 text-right">
                <label className="text-xs font-bold text-slate-700 block text-right">۲۔ متعلقہ اکاؤنٹ / قاری صاحب منتخب کریں:</label>
                <div className="relative">
                  <select
                    value={pendingActiveBranch}
                    onChange={(e) => {
                      setPendingActiveBranch(e.target.value);
                      setLoginError('');
                    }}
                    className="w-full bg-white border border-slate-200 p-2.5 rounded-xl font-bold text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer text-right appearance-none pr-3"
                  >
                    {branches
                      .filter((b) => b.centerId === loginCenterId)
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.label} {b.role === 'nazim' ? ' (انتظامیہ ناظم)' : ''}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-right">
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
            <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl space-y-2 text-right text-xs">
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">لاگ ان گائیڈلائنز:</h4>
              <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                سسٹم میں ہر مرکز کے لیے ڈیفالٹ پاس ورڈز درج ذیل ہیں:
              </p>
              <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 font-bold">
                <div className="p-1.5 bg-white rounded border border-slate-200/50 text-center">
                  <span className="text-slate-400">ناظم اکاؤنٹس:</span> <code className="text-emerald-700 font-mono">9211</code>
                </div>
                <div className="p-1.5 bg-white rounded border border-slate-200/50 text-center">
                  <span className="text-slate-400">قاری صاحبان:</span> <code className="text-emerald-700 font-mono">123</code>
                </div>
              </div>
              <p className="text-[9px] text-slate-400 font-medium leading-relaxed mt-2">
                * ہر شاخ کا "ناظم مدرسہ" اکاؤنٹ لاگ ان ہو کر اپنے مرکز کے قاری صاحبان کے نام، پاس ورڈز تبدیل یا نئے اکاؤنٹ شامل کر سکتا ہے۔
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

        <div className="px-4 py-3 border-b border-emerald-900/40 hidden lg:block space-y-1.5 bg-emerald-950/20">
          <span className="text-[10px] text-emerald-400 font-bold block uppercase tracking-wider">مہم کا انتخاب کریں:</span>
          <div className="grid grid-cols-2 bg-emerald-900/60 rounded-xl p-1 border border-emerald-800/20">
            <button 
              onClick={() => {
                setView('dashboard');
              }}
              className={`py-1.5 text-xs font-black rounded-lg transition-all ${view !== 'hides' ? 'bg-emerald-600 text-white shadow font-semibold' : 'text-emerald-300 hover:text-white'}`}
            >
              حصصِ قربانی
            </button>
            <button 
              onClick={() => {
                setView('hides');
              }}
              className={`py-1.5 text-xs font-black rounded-lg transition-all ${view === 'hides' ? 'bg-emerald-600 text-white shadow font-semibold' : 'text-emerald-300 hover:text-white'}`}
            >
              چرم قربانی
            </button>
          </div>
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

          {isNazim && (
            <button 
              onClick={() => setView('deposits')}
              className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all ${view === 'deposits' ? 'bg-emerald-600 text-white font-bold' : 'text-emerald-300/60 hover:bg-emerald-900/50 hover:text-white'}`}
            >
              <Coins size={22} />
              <span className="hidden lg:block text-sm">بینک میں رقم جمع</span>
            </button>
          )}

          <button 
            onClick={() => setView('tags')}
            className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all ${view === 'tags' ? 'bg-emerald-600 text-white font-bold' : 'text-emerald-300/60 hover:bg-emerald-900/50 hover:text-white'}`}
          >
            <Printer size={22} />
            <span className="hidden lg:block text-sm">ٹیگ پرنٹ</span>
          </button>

          <button 
            onClick={() => setView('records')}
            className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all ${view === 'records' ? 'bg-emerald-600 text-white font-bold' : 'text-emerald-300/60 hover:bg-emerald-900/50 hover:text-white'}`}
          >
            <Database size={22} />
            <span className="hidden lg:block text-sm">ڈیٹا ریکارڈ</span>
          </button>

          {isNazim && (
            <button 
              onClick={() => setView('ledger')}
              className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all ${view === 'ledger' ? 'bg-emerald-600 text-white font-bold' : 'text-emerald-300/60 hover:bg-emerald-900/50 hover:text-white'}`}
            >
              <Activity size={22} />
              <span className="hidden lg:block text-sm">جنرل لیجر</span>
            </button>
          )}

          <button 
            onClick={() => setView('hides')}
            className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all ${view === 'hides' ? 'bg-emerald-600 text-white font-bold' : 'text-emerald-300/60 hover:bg-emerald-900/50 hover:text-white'}`}
          >
            <Briefcase size={22} />
            <span className="hidden lg:block text-sm">چرم قربانی</span>
          </button>

          {isNazim && (
            <button 
              onClick={() => setView('settings')}
              className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all ${view === 'settings' ? 'bg-emerald-600 text-white font-bold' : 'text-emerald-300/60 hover:bg-emerald-900/50 hover:text-white'}`}
            >
              <Settings size={22} />
              <span className="hidden lg:block text-sm">گائے کا اندراج</span>
            </button>
          )}
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
            {(view === 'detail' || view === 'settings' || view === 'deposits' || view === 'tags' || view === 'records') && (
              <button 
                onClick={() => setView(view === 'detail' ? 'list' : 'dashboard')}
                className="w-10 h-10 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 transition-all font-bold shrink-0"
              >
                <ChevronLeft size={24} />
              </button>
            )}
            <div>
              {view === 'dashboard' ? (
                <div className="flex flex-col gap-0.5">
                  <h2 className="text-xl lg:text-2xl font-black text-slate-900 font-sans tracking-tight">اجتماعی قربانی</h2>
                  <h3 className="text-base font-extrabold text-emerald-800 font-sans">جامعہ اشرف المدارس کراچی</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[11px] font-black px-4 py-1.5 rounded-xl text-white shadow-sm whitespace-nowrap inline-block text-center leading-normal ${branches.find(b => b.id === activeBranch)?.color || 'bg-slate-500'}`}>
                      {activeBranchObj?.centerLabel || ''} — {activeBranchObj?.label || ''}
                    </span>
                  </div>
                </div>
              ) : (
                <h2 className="text-lg lg:text-xl font-black text-slate-800 flex items-center gap-3">
                  {view === 'list' ? 'تمام جانوروں کی فہرست' 
                    : view === 'deposits' ? 'بینک ٹرانسفر / فنڈز مینیجر'
                    : view === 'settings' ? 'جانوروں کا نیا اندراج' 
                    : view === 'tags' ? 'قربانی جانوروں کے ٹیگ پرنٹ'
                    : view === 'records' ? 'کھاتہ داران ڈیٹا ریکارڈ لسٹ'
                    : view === 'ledger' ? 'جنرل کاؤنٹر لیجر وصولی رپورٹ'
                    : view === 'hides' ? (
                      <span className="flex flex-col text-right leading-tight">
                        <span className="text-base sm:text-lg">چرم قربانی</span>
                        <span className="text-[10px] sm:text-xs font-bold text-slate-500 mt-0.5">(کھال وصولی و ملازمین حساب)</span>
                      </span>
                    )
                    : selectedAnimal?.label}
                  <span className={`text-[11px] md:text-xs font-black px-4 py-1.5 rounded-xl text-white shadow-sm whitespace-nowrap inline-block text-center leading-normal ${branches.find(b => b.id === activeBranch)?.color || 'bg-slate-500'}`}>
                    {activeBranchObj?.centerLabel || ''} — {activeBranchObj?.label || ''}
                  </span>
                </h2>
              )}
              {view !== 'dashboard' && (
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-2.5">
                  {view === 'detail' ? 'حصہ داروں کی تفصیل، رقم کی وصولی اور رسید' : 'مدرسہ اجتماعی انتظامِ فنڈز و قربانی'}
                </p>
              )}
            </div>
          </div>

          {/* Active Branch and Log out */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 bg-indigo-50 text-indigo-800 border border-indigo-100 rounded-xl px-3 py-1.5 shadow-sm font-bold">
              <Calendar size={14} className="text-indigo-500" />
              <span className="text-[10px] text-indigo-400 block font-bold leading-none">سال:</span>
              <span className="text-xs font-black text-indigo-950 font-mono leading-none">{activeYear}</span>
            </div>

            <div className="flex items-center gap-2 font-sans">
              <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-850 border border-emerald-100 rounded-xl px-2.5 py-1.5 shadow-sm shrink-0">
                <RotateCw className="text-emerald-500 animate-spin shrink-0" size={12} />
                <span className="text-[10px] font-black whitespace-nowrap">لائیو کلاؤڈ سنک فعال ہے</span>
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
                className="bg-red-50 hover:bg-red-100 text-red-650 border border-red-100 px-3 py-1.5 rounded-xl font-black text-[10px] sm:text-xs transition-all flex items-center gap-1 active:scale-95 shadow-sm shrink-0"
                title="سیشن سے لاگ آؤٹ کر کے دوسرے کاؤنٹر میں منتخب لاگ ان کریں"
              >
                <LogOut size={12} /> لاگ آؤٹ
              </button>
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
                <div className={`grid grid-cols-1 ${activeBranchObj?.role !== 'qari' ? 'sm:grid-cols-2 lg:grid-cols-5' : 'sm:grid-cols-1 max-w-sm'} gap-4`}>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                    <p className="text-slate-500 text-xs font-bold mb-1">کُل فعال گائے/بیل</p>
                    <div className="flex items-end justify-between">
                      <h4 className="text-3xl font-black text-slate-800">{stats.totalAnimals}</h4>
                      <Beef className="text-emerald-100 shrink-0" size={32} />
                    </div>
                  </div>

                  {activeBranchObj?.role !== 'qari' && (
                    <>
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                        <p className="text-emerald-600 text-xs font-bold mb-1">وصول شدہ کُل فنڈز</p>
                        <div className="flex items-end justify-between">
                          <h4 className="text-xl font-black text-emerald-600 font-mono">
                            {stats.totalCashReceived.toLocaleString('ur-PK')}<span className="text-[10px] text-slate-400 font-normal font-sans"> روپے</span>
                          </h4>
                          <Coins className="text-emerald-100 shrink-0" size={32} />
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                        <p className="text-blue-600 text-xs font-bold mb-1">بینک اکاؤنٹ میں منتقل</p>
                        <div className="flex items-end justify-between">
                          <h4 className="text-xl font-black text-blue-600 font-mono">
                            {stats.bankDepositedAmount.toLocaleString('ur-PK')}<span className="text-[10px] text-slate-400 font-normal font-sans"> روپے</span>
                          </h4>
                          <CreditCard className="text-blue-100 shrink-0" size={32} />
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                        <p className="text-indigo-600 text-xs font-bold mb-1">مرکزی کاؤنٹر دراز والٹ</p>
                        <div className="flex items-end justify-between">
                          <h4 className="text-xl font-black text-indigo-700 font-mono">
                            {stats.counterDepositedAmount.toLocaleString('ur-PK')}<span className="text-[10px] text-slate-400 font-normal font-sans"> روپے</span>
                          </h4>
                          <Briefcase className="text-indigo-100 shrink-0" size={32} />
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                        <p className="text-orange-500 text-xs font-bold mb-1">کیش آف ہینڈ (غیر منتقل)</p>
                        <div className="flex items-end justify-between">
                          <h4 className="text-xl font-black text-orange-600 font-mono">
                            {stats.cashOnHand.toLocaleString('ur-PK')}<span className="text-[10px] text-slate-400 font-normal"> روپے</span>
                          </h4>
                          <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 font-extrabold text-[10px] shrink-0">{stats.paymentPercentage}%</div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Redesigned Branch Ledger Card Deck (شاخ وار مجموعی رپورٹ) */}
                {activeBranchObj?.role !== 'qari' && (
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 lg:p-8 space-y-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-4 gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 bg-emerald-600 rounded-full animate-pulse"></span>
                          <h3 className="text-lg font-black text-slate-900 font-sans tracking-tight">
                            شاخ وار مجموعی رپورٹ (مراکزِ قربانی کا گرانڈ میزانیہ)
                          </h3>
                        </div>
                        <p className="text-slate-500 text-[11px] font-bold">
                          ذیلی برانچز اور ان کے متعلقہ انتظامی ناظمین کی کل وصولی، فیصد پیش رفت اور فنڈز کا خلاصه
                        </p>
                      </div>
                      <span className="text-[10px] bg-emerald-50 text-emerald-800 font-extrabold px-3 py-1.5 rounded-xl border border-emerald-100 shrink-0">
                        کل فعال مراکز: {filteredCenterSupervisors.length}
                      </span>
                    </div>

                    {/* Multi-Column List Format */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredCenterSupervisors.map((supervisor) => {
                        const cTotal = centerTotals[supervisor.centerId] || { amount: 0, count: 0 };
                        const centerBranchIds = branches.filter(b => b.centerId === supervisor.centerId).map(b => b.id);
                        const activeCenterAnimalsCount = animals.filter(a => 
                          a.shares.some(s => s.isPaid && s.paidByBranchId && centerBranchIds.includes(s.paidByBranchId))
                        ).length;

                        const dynamicTotalShares = activeCenterAnimalsCount * SHARES_PER_ANIMAL;

                        const percentage = dynamicTotalShares > 0 
                          ? Math.round((cTotal.count / dynamicTotalShares) * 105) 
                          : 0;

                        return (
                          <div 
                            key={supervisor.centerId} 
                            className="bg-slate-50/50 hover:bg-slate-50 border border-slate-100 hover:border-slate-200/80 rounded-2xl p-5 transition-all flex flex-col justify-between gap-4"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <span className={`w-3.5 h-3.5 rounded-xl ${supervisor.color || 'bg-emerald-600'} border-2 border-white shadow-sm shrink-0`}></span>
                                <div className="space-y-1.5 flex flex-col justify-center">
                                  <h4 className="font-extrabold text-slate-950 text-sm leading-normal">{supervisor.centerLabel || 'مرکزی مقام'}</h4>
                                  <span className="text-[11px] text-slate-500 font-bold block leading-relaxed">انتظامی ناظم: {supervisor.label}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">وصول شدہ فنڈز</span>
                                <strong className="text-emerald-700 font-black font-mono text-base">{cTotal.amount.toLocaleString('ur-PK')}<span className="text-[10px] font-bold font-sans"> روپے</span></strong>
                              </div>
                            </div>

                            <div className="space-y-1.5 pt-2 border-t border-slate-150/50">
                              <div className="flex justify-between items-center text-xs pb-1 border-b border-slate-100/40">
                                <span className="text-slate-500 font-bold">بک شدہ جانور:</span>
                                <span className="font-extrabold text-slate-800 font-mono text-xs">{activeCenterAnimalsCount} <span className="text-[10px] font-sans font-normal text-slate-400">جانور</span></span>
                              </div>

                              <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 font-bold">بک شدہ حصے:</span>
                                <span className="font-black text-slate-800 font-mono text-xs" dir="ltr">{cTotal.count} / {dynamicTotalShares} <span className="text-[10px] font-sans font-normal text-slate-400" dir="rtl">حصہ دار</span></span>
                              </div>
                              
                              <div className="flex items-center gap-3 font-sans">
                                <div className="flex-1 bg-slate-250 h-2 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full ${supervisor.color || 'bg-emerald-600'} rounded-full transition-all duration-500`}
                                    style={{ width: `${Math.min(100, percentage)}%` }}
                                  ></div>
                                </div>
                                <span className="text-[11px] font-mono font-black text-slate-700 shrink-0">{percentage}%</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Grand consolidated bottom row */}
                    <div className="bg-slate-900 text-white rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm border border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center font-extrabold text-white text-base font-sans">∑</div>
                        <div>
                          <strong className="text-slate-200 font-extrabold text-sm block">کُل ملا کر مجموعی گرانڈ رپورٹ:</strong>
                          <span className="text-[10px] text-slate-400 font-bold block">تمام ذیلی کاؤنٹرز و شاخوں کا یکجا میزان</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-8 font-sans">
                        <div className="text-center sm:text-right">
                          <span className="text-[10px] text-slate-400 font-bold block mb-0.5">کُل بک حصے:</span>
                          <strong className="text-amber-400 font-black text-base font-mono leading-none">{grandTotalCount} <span className="text-xs font-normal font-sans text-slate-300">حصے</span></strong>
                        </div>
                        <div className="w-px h-8 bg-slate-800"></div>
                        <div className="text-center sm:text-right">
                          <span className="text-[10px] text-slate-400 font-bold block mb-0.5">کُل بک جانور:</span>
                          <strong className="text-amber-400 font-black text-base font-mono leading-none">{grandTotalAnimals} <span className="text-xs font-normal font-sans text-slate-300">جانور</span></strong>
                        </div>
                        <div className="w-px h-8 bg-slate-800"></div>
                        <div className="text-center sm:text-left">
                          <span className="text-[10px] text-slate-400 font-bold block mb-0.5 font-sans">وصول شدہ کل فنڈز:</span>
                          <strong className="text-emerald-400 font-black text-lg font-mono leading-none">{grandTotalAmount.toLocaleString('ur-PK')} <span className="text-xs font-normal font-sans">روپے</span></strong>
                        </div>
                      </div>
                    </div>

                    {/* Qurbani Share Type Breakdowns */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                        <div className="space-y-1">
                          <span className="text-[11px] font-black text-slate-500 block uppercase">عام حصے (بنیادی / انفرادی)</span>
                          <span className="text-lg font-black text-slate-800 font-mono" dir="ltr">
                            {qurbaniStats.standardPaid} / {qurbaniStats.standardTotal} <span className="text-xs font-bold text-slate-400 font-sans" dir="rtl">حصے بک</span>
                          </span>
                        </div>
                        <div className="text-left">
                          <span className="text-[10px] font-bold text-slate-400 block">وصول شدہ رقم</span>
                          <strong className="text-emerald-600 font-black text-sm font-mono">{qurbaniStats.standardPaidAmount.toLocaleString('ur-PK')} <span className="text-[9px] font-bold font-sans">روپے</span></strong>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-slate-50 to-blue-50/20 border border-blue-200/60 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                        <div className="space-y-1">
                          <span className="text-[11px] font-black text-blue-800 block uppercase">وقف قربانی حصے</span>
                          <span className="text-lg font-black text-blue-900 font-mono" dir="ltr">
                            {qurbaniStats.waqfPaid} / {qurbaniStats.waqfTotal} <span className="text-xs font-bold text-blue-400 font-sans" dir="rtl">وقف بک</span>
                          </span>
                        </div>
                        <div className="text-left">
                          <span className="text-[10px] font-bold text-slate-400 block">وصول شدہ رقم (وقف)</span>
                          <strong className="text-emerald-600 font-black text-sm font-mono">{qurbaniStats.waqfPaidAmount.toLocaleString('ur-PK')} <span className="text-[9px] font-bold font-sans">روپے</span></strong>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* General Ledger View */}
            {view === 'ledger' && (
              <motion.div 
                key="ledger"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-4xl mx-auto space-y-8 pb-32"
              >
                {/* Visual heading with Ledger metadata */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                      <Activity className="text-emerald-600" size={24} />
                      جنرل لیجر وصولی رپورٹ (لائیو اکاؤنٹ بکسنک)
                    </h3>
                    <p className="text-slate-500 text-xs">
                      یہاں تمام کاؤنٹرز (شاخوں اور ان کے ماتحت قاری صاحبان) کی انفرادی پیش رفت مع ان کے ریکارڈ نمبر اور وصول شدہ کل فنڈز بوجہ شفافیت لائیو پیش کی گئی ہے۔
                    </p>
                  </div>
                  <div className="bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-2xl px-4 py-3 text-right flex flex-col justify-center min-w-[170px]">
                    <span className="text-[10px] text-emerald-605 font-bold block mb-0.5">کُل وصول شدہ فنڈز:</span>
                    <strong className="text-lg font-black font-mono leading-none">{stats.totalCashReceived.toLocaleString('ur-PK')}<span className="text-xs font-bold font-sans"> روپے</span></strong>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Ledger Table Section */}
                  <div className="md:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                        <Building size={16} className="text-slate-400" />
                        کاؤنٹر وار پیش رفت (انفرادی فہرست)
                      </h4>
                      <span className="text-[10px] bg-slate-100 text-slate-605 font-bold px-2.5 py-1 rounded-lg">کُل فعال کاؤنٹرز: {visibleBranches.length}</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-right border-collapse">
                        <thead>
                          <tr className="border-b-2 border-slate-900 text-slate-600 font-black text-[10px] bg-slate-50">
                            <th className="py-2.5 px-3 text-right font-black">کاؤنٹر ریکارڈ (برانچ مع کارکن)</th>
                            <th className="py-2.5 px-3 text-center font-black">رول</th>
                            <th className="py-2.5 px-3 text-center font-black">حصے</th>
                            <th className="py-2.5 px-3 text-left font-black">وصول شدہ رقم</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {visibleBranches.map((b) => {
                            const bCol = branchCollections[b.id] || { amount: 0, count: 0 };
                            return (
                              <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                                <td className="py-3 px-3 flex items-center gap-1.5 font-bold text-slate-900">
                                  <span className={`w-2.5 h-2.5 rounded-full ${b.color} border border-slate-950 shrink-0`}></span>
                                  <div className="flex flex-col">
                                    <span className="text-slate-900 text-xs font-black">{b.label}</span>
                                    <span className="text-slate-400 text-[9px] font-bold">{b.centerLabel}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full ${
                                    b.role === 'super_admin' ? 'bg-rose-100 text-rose-800' :
                                    b.role === 'nazim' ? 'bg-slate-100 text-slate-800' : 'bg-teal-100 text-teal-800'
                                  }`}>
                                    {b.role === 'super_admin' ? 'سپر ایڈمن' : b.role === 'nazim' ? 'ناظم علاقہ' : b.role === 'qari' ? 'قاری' : 'صارف'}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-center font-extrabold font-mono text-slate-700">{bCol.count}</td>
                                <td className="py-3 px-3 text-left font-black font-mono text-emerald-800">
                                  {bCol.amount.toLocaleString('ur-PK')} <span className="text-[9px] font-bold text-slate-500">روپے</span>
                                </td>
                              </tr>
                            );
                          })}
                          {branchCollections['unknown'] && branchCollections['unknown'].amount > 0 && (
                            <tr className="hover:bg-slate-50 transition-colors bg-slate-50/50">
                              <td className="py-3 px-3 flex items-center gap-1.5 font-bold text-slate-800">
                                <span className="w-2.5 h-2.5 rounded-full bg-slate-400 border border-slate-950 shrink-0"></span>
                                <div className="flex flex-col">
                                  <span className="text-slate-800 text-xs font-black">نامعلوم کاؤنٹر</span>
                                  <span className="text-slate-400 text-[9px] font-bold">-</span>
                                </div>
                              </td>
                              <td className="py-3 px-3 text-center">-</td>
                              <td className="py-3 px-3 text-center font-extrabold font-mono text-slate-700">{branchCollections['unknown'].count}</td>
                              <td className="py-3 px-3 text-left font-black font-mono text-emerald-800">
                                {branchCollections['unknown'].amount.toLocaleString('ur-PK')} <span className="text-[9px] font-bold text-slate-500">روپے</span>
                              </td>
                            </tr>
                          )}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-slate-950 bg-slate-100/50 font-black">
                            <td colSpan={2} className="py-3 px-3 font-black text-slate-900 text-xs">کُل ملا کر (حسابِ گرانڈ):</td>
                            <td className="py-3 px-3 text-center font-black font-mono text-slate-800 text-xs text-right">
                              <span dir="ltr" className="inline-block">{grandTotalCount} / {grandTotalAnimals * SHARES_PER_ANIMAL}</span>
                            </td>
                            <td className="py-3 px-3 text-left font-black font-mono text-emerald-950 text-xs sm:text-sm">
                              {grandTotalAmount.toLocaleString('ur-PK')}{' '}
                              <span className="text-[9px] font-extrabold text-slate-600">روپے</span>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Right side widgets column */}
                  <div className="space-y-6 md:col-span-1 border-r border-slate-100 pr-0 md:pr-4">
                    {/* Qurbani Types Ledger Breakdown */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
                      <h4 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
                        <Activity size={16} className="text-emerald-600 animate-pulse" />
                        حصہ وار مجموعی میزانیہ (کیٹیگری وار سمری)
                      </h4>
                      
                      <div className="space-y-3">
                        {/* Standard (عام) */}
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                          <div>
                            <strong className="text-xs font-bold text-slate-700 block text-right">عام حصے (بنیادی)</strong>
                            <span className="text-[10px] text-slate-400 font-bold block text-right">کل بک شدہ حصے:</span>
                          </div>
                          <div className="text-left">
                            <span className="text-sm font-black text-slate-800 font-mono block" dir="ltr">
                              {qurbaniStats.standardPaid} / {qurbaniStats.standardTotal}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-600 font-mono block">
                              {qurbaniStats.standardPaidAmount.toLocaleString('ur-PK')} روپے
                            </span>
                          </div>
                        </div>

                        {/* Waqf (وقف) */}
                        <div className="p-3 bg-blue-50/40 rounded-xl border border-blue-100/30 flex items-center justify-between">
                          <div>
                            <strong className="text-xs font-bold text-blue-900 block text-right">وقف قربانی حصے</strong>
                            <span className="text-[10px] text-slate-400 font-bold block text-right font-sans">کل وقف شدہ حصے:</span>
                          </div>
                          <div className="text-left">
                            <span className="text-sm font-black text-blue-900 font-mono block" dir="ltr">
                              {qurbaniStats.waqfPaid} / {qurbaniStats.waqfTotal}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-600 font-mono block">
                              {qurbaniStats.waqfPaidAmount.toLocaleString('ur-PK')} روپے
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Activity and Sync Log Section */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
                      <h4 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
                        <History size={16} className="text-slate-405" />
                        سرگرمی لاگ (آخری تبدیلیاں)
                      </h4>
                      
                      <div className="overflow-y-auto max-h-[250px] space-y-2.5 pr-1">
                        {activityLogs.map((log) => (
                          <div key={log.id} className="text-[10px] leading-relaxed border-b border-slate-200 pb-2.5 last:border-none last:pb-0">
                            <div className="flex justify-between items-center text-slate-500 font-bold mb-1">
                              <span className="text-emerald-800 font-extrabold">{log.branch}</span>
                              <span>{log.timestamp}</span>
                            </div>
                            <p className="text-slate-700 font-bold">{log.details}</p>
                          </div>
                        ))}
                        {activityLogs.length === 0 && (
                          <p className="text-slate-400 text-center text-xs py-8 font-bold">اب تک کوئی لائیو سرگرمی نہیں ہوئی ہے۔</p>
                        )}
                      </div>
                    </div>
                  </div>
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
                      <div className="p-4 bg-orange-50 border border-orange-100 text-orange-850 rounded-xl text-sm">
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
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${depositDestination === 'bank' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'}`}>
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
                                  ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' 
                                  : 'bg-blue-100 text-blue-800 border border-blue-200'
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

                  <div className="flex flex-col">
                    {selectedAnimal.shares.map((s, idx) => {
                      const isShareLocked = s.isPaid && !isNazim && s.paidByBranchId && s.paidByBranchId !== activeBranch;
                      return (
                        <div key={s.id} className="p-4 lg:p-6 flex flex-col space-y-4 hover:bg-slate-50/50 transition-colors border-b-4 border-slate-200/80 last:border-b-0">
                          <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                            
                            {/* Left column: ID & core details, inputs */}
                            <div className="flex items-start gap-3 flex-1">
                              <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-400 shrink-0 mt-2">{idx + 1}</span>
                              <div className="flex-1 space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                                  <div className="md:col-span-4">
                                    <label className="text-[10px] text-slate-400 font-bold block mb-1">قربانی کی قسم</label>
                                    <select
                                      value={s.qurbaniType || 'standard'}
                                      disabled={isShareLocked}
                                      onChange={(e) => updateShareType(selectedAnimal.id, s.id, e.target.value as 'standard' | 'waqf')}
                                      className="w-full bg-slate-50 border border-slate-200 h-10 px-3 rounded-xl font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none text-xs disabled:opacity-70 disabled:bg-slate-100/70 disabled:cursor-not-allowed"
                                    >
                                      <option value="standard">بنیادی حصہ / عام</option>
                                      <option value="waqf">وقف قربانی</option>
                                    </select>
                                  </div>

                                  <div className="md:col-span-4">
                                    <label className="text-[10px] text-slate-400 font-bold block mb-1">حصہ دار کا نام</label>
                                    <input 
                                      type="text" 
                                      value={s.name}
                                      disabled={isShareLocked}
                                      onChange={(e) => updateShareName(selectedAnimal.id, s.id, e.target.value)}
                                      className="w-full bg-slate-50 border border-slate-200 h-10 px-3 rounded-xl font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none text-xs disabled:opacity-70 disabled:bg-slate-100/70 disabled:cursor-not-allowed"
                                      placeholder="نام درج کریں"
                                    />
                                  </div>

                                  <div className="md:col-span-4">
                                    <label className="text-[10px] text-slate-400 font-bold block mb-1">واٹس ایپ نمبر (بغیر ڈیش)</label>
                                    <input 
                                      type="text" 
                                      value={s.phone || ''}
                                      disabled={isShareLocked}
                                      onChange={(e) => updateSharePhone(selectedAnimal.id, s.id, e.target.value)}
                                      className="w-full bg-slate-50 border border-slate-200 h-10 px-3 rounded-xl font-bold font-mono text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none text-xs disabled:opacity-70 disabled:bg-slate-100/70 disabled:cursor-not-allowed"
                                      placeholder="مثلاً 03001234567"
                                    />
                                  </div>

                                  <div className="md:col-span-5">
                                    <label className="text-[10px] text-slate-400 font-bold block mb-1">پتہ (اختیاری)</label>
                                    <input 
                                      type="text" 
                                      value={s.address || ''}
                                      disabled={isShareLocked}
                                      onChange={(e) => updateShareAddress(selectedAnimal.id, s.id, e.target.value)}
                                      className="w-full bg-slate-50 border border-slate-200 h-10 px-3 rounded-xl font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none text-xs disabled:opacity-70 disabled:bg-slate-100/70 disabled:cursor-not-allowed"
                                      placeholder="پتہ درج کریں"
                                    />
                                  </div>

                                  <div className="md:col-span-3">
                                    <label className="text-[10px] text-slate-400 font-bold block mb-1">رقم (روپے)</label>
                                    <input 
                                      type="number" 
                                      value={s.amountPaid}
                                      disabled={isShareLocked || !isNazim}
                                      onChange={(e) => updateShareAmount(selectedAnimal.id, s.id, Number(e.target.value))}
                                      className="w-full bg-slate-50 border border-slate-200 h-10 px-3 rounded-xl font-bold font-mono text-slate-800 text-xs focus:ring-1 focus:ring-emerald-500 outline-none disabled:opacity-70 disabled:bg-slate-100/70 disabled:cursor-not-allowed"
                                      placeholder="رقم درج کریں"
                                    />
                                  </div>

                                  <div className="md:col-span-4">
                                    <label className="text-[10px] text-slate-400 font-bold block mb-1">وقتِ فراہمیِ گوشت</label>
                                    <div className="flex bg-slate-50 border border-slate-200 rounded-xl overflow-hidden items-center h-10 focus-within:ring-1 focus-within:ring-emerald-500">
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
                                        className="w-full h-full bg-transparent px-3 font-bold text-slate-800 text-xs outline-none disabled:opacity-70 disabled:bg-slate-100/70"
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
                                          className={`px-2 h-full text-[9px] font-black transition-colors ${s.expectedDeliveryTime && s.expectedDeliveryTime.endsWith('AM') ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
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
                                          className={`px-2 h-full text-[9px] font-black transition-colors ${s.expectedDeliveryTime && s.expectedDeliveryTime.endsWith('PM') ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
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
                            <div className="flex flex-col gap-2 shrink-0 w-full md:w-[240px] border-t md:border-t-0 border-slate-100 pt-3 md:pt-0 justify-start">
                              
                              {/* Toggle Payment */}
                              <button
                                onClick={() => togglePayment(selectedAnimal.id, s.id)}
                                disabled={isShareLocked}
                                className={`w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all shadow-sm ${
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
                                className="w-full bg-slate-100 border border-slate-200 text-slate-800 px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-slate-200 transition-all active:scale-95 shadow-sm"
                              >
                                <Receipt size={14} className="text-slate-500" />
                                رسید جاری کریں 
                              </button>

                              {/* Row for Transfer & Distribution with reduced width */}
                              <div className="grid grid-cols-2 gap-2 w-full">
                                {s.name ? (
                                  <button
                                    onClick={() => setTransferSource({ animalId: selectedAnimal.id, shareId: s.id, shareName: s.name, shareIndex: idx })}
                                    className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 hover:bg-indigo-100 hover:text-indigo-800 transition-all active:scale-95 shadow-sm overflow-hidden whitespace-nowrap text-ellipsis"
                                    title="حصہ منتقل کریں"
                                  >
                                    <Move size={12} className="text-indigo-500 shrink-0" />
                                    منتقل کریں
                                  </button>
                                ) : (
                                  <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl text-[10px] text-slate-400 flex items-center justify-center font-bold">خالی حصہ</div>
                                )}

                                {s.qurbaniType !== 'waqf' ? (
                                  <button 
                                    onClick={() => toggleDistribution(selectedAnimal.id, s.id)}
                                    className={`flex items-center justify-center gap-1 px-2 py-2 rounded-xl text-[10px] font-bold border transition-all shadow-sm overflow-hidden whitespace-nowrap text-ellipsis ${
                                      s.isDistributed 
                                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-md hover:bg-emerald-700' 
                                        : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-250 hover:bg-slate-50'
                                    }`}
                                    title={s.isDistributed ? 'گوشت مل گیا (سبز)' : 'گوشت ٹوکرا دیا (باقی)'}
                                  >
                                    {s.isDistributed ? 'مل گیا (سبز)' : 'ٹوکرا (باقی)'}
                                  </button>
                                ) : (
                                  <div className="bg-sky-50 text-sky-800 text-[10px] font-extrabold py-2 rounded-xl border border-sky-100 flex items-center justify-center text-center leading-tight">
                                    وقف شدہ
                                  </div>
                                )}
                              </div>

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

            {/* Hides Collection & supervisor reward system view */}
            {view === 'hides' && (
              <motion.div
                key="hides"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-5xl mx-auto space-y-8 pb-32"
              >
                {/* Visual Header with Realtime status */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] bg-amber-50 text-amber-900 border border-amber-200/50 px-2.5 py-1 rounded-lg font-black tracking-wider uppercase font-sans">چرم قربانی انتظام</span>
                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-2 mt-1 font-sans">
                      <Briefcase className="text-emerald-600" size={24} />
                      کھالیں جمع آوری مہم و پے رول انتظام
                    </h3>
                    <p className="text-slate-500 text-xs">
                      یہاں چرم قربانی کی وصولی، رسید جاری کرنا، اور نگرانِ شعبہ کا انعام و اجرت ریکارڈ سنک منظم کریں۔
                    </p>
                  </div>
                  <div className="bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-2xl px-4 py-3 text-right flex flex-col justify-center min-w-[170px]">
                    <span className="text-[10px] text-emerald-605 font-bold block mb-0.5">کُل وصول شدہ کھالیں:</span>
                    <strong className="text-lg font-black font-mono leading-none">{hidesStats.total} <span className="text-xs font-bold font-sans">عدد</span></strong>
                  </div>
                </div>

                {/* Hides Stat Counters Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-50 text-amber-700 rounded-xl flex items-center justify-center font-bold">اونٹ</div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">اونٹ کھالیں</span>
                      <strong className="text-slate-800 font-mono text-base font-black">{hidesStats.camel}</strong>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 text-blue-700 rounded-xl flex items-center justify-center font-bold">گائے</div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">گائے/بیل کھالیں</span>
                      <strong className="text-slate-800 font-mono text-base font-black">{hidesStats.cow}</strong>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center font-bold">بکری</div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">بھیڑ/بکرا/دنبہ</span>
                      <strong className="text-slate-800 font-mono text-base font-black">{hidesStats.goat}</strong>
                    </div>
                  </div>

                  <div className="bg-slate-900 rounded-2xl p-4 text-white flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-800 text-amber-400 rounded-xl flex items-center justify-center font-bold">∑</div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">کُل میزان</span>
                      <strong className="text-white font-mono text-base font-black">{hidesStats.total} <span className="text-[10px] font-sans">کھالیں</span></strong>
                    </div>
                  </div>
                </div>

                {/* Main Action Workspaces */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Hide Collection Entry Form (Col Span 5) */}
                  <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-6 space-y-5">
                    <h4 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
                      <Plus size={18} className="text-emerald-600" />
                      نئی چرم قربانی وصولی کا اندراج
                    </h4>

                    <div className="space-y-4">
                      {/* Donor Name */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600">عطیہ کنندہ کا نام:</label>
                        <input
                          type="text"
                          placeholder="مثلاً محمد اختر صاحب"
                          value={hideDonorName}
                          onChange={(e) => setHideDonorName(e.target.value)}
                          className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold font-sans"
                        />
                      </div>

                      {/* Donor Phone */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600">رابطہ فون نمبر (اختیاری):</label>
                        <input
                          type="text"
                          placeholder="مثلاً 03001234567"
                          value={hideDonorPhone}
                          onChange={(e) => setHideDonorPhone(e.target.value)}
                          className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                        />
                      </div>

                      {/* Donor Address */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600">پتہ مع علاقہ (اختیاری):</label>
                        <input
                          type="text"
                          placeholder="مثلاً مکان نمبر ۴، گلی ۲، کورنگی"
                          value={hideDonorAddress}
                          onChange={(e) => setHideDonorAddress(e.target.value)}
                          className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold"
                        />
                      </div>

                      {/* Hide quantities select */}
                      <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-4 space-y-3.5">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-black block border-b border-slate-200/60 pb-1.5">کھالوں کی اقسام اور تعداد منتخب کرییں</span>
                        
                        {/* Camel */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700">۱. اونٹ کی کھال:</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setHideCamelCount(prev => Math.max(0, prev - 1))}
                              className="w-7 h-7 bg-white hover:bg-slate-100 border border-slate-250 rounded-lg font-bold text-xs flex items-center justify-center shrink-0"
                            >
                              -
                            </button>
                            <span className="text-xs font-mono font-black text-slate-800 w-8 text-center">{hideCamelCount}</span>
                            <button
                              type="button"
                              onClick={() => setHideCamelCount(prev => prev + 1)}
                              className="w-7 h-7 bg-white hover:bg-slate-100 border border-slate-250 rounded-lg font-bold text-xs flex items-center justify-center shrink-0"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Cow */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700">۲. گائے / بیل کی کھال:</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setHideCowCount(prev => Math.max(0, prev - 1))}
                              className="w-7 h-7 bg-white hover:bg-slate-100 border border-slate-250 rounded-lg font-bold text-xs flex items-center justify-center shrink-0"
                            >
                              -
                            </button>
                            <span className="text-xs font-mono font-black text-slate-800 w-8 text-center">{hideCowCount}</span>
                            <button
                              type="button"
                              onClick={() => setHideCowCount(prev => prev + 1)}
                              className="w-7 h-7 bg-white hover:bg-slate-100 border border-slate-250 rounded-lg font-bold text-xs flex items-center justify-center shrink-0"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Goat */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700">۳. بھیڑ / بکری / دنبہ:</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setHideGoatCount(prev => Math.max(0, prev - 1))}
                              className="w-7 h-7 bg-white hover:bg-slate-100 border border-slate-250 rounded-lg font-bold text-xs flex items-center justify-center shrink-0"
                            >
                              -
                            </button>
                            <span className="text-xs font-mono font-black text-slate-800 w-8 text-center">{hideGoatCount}</span>
                            <button
                              type="button"
                              onClick={() => setHideGoatCount(prev => prev + 1)}
                              className="w-7 h-7 bg-white hover:bg-slate-100 border border-slate-250 rounded-lg font-bold text-xs flex items-center justify-center shrink-0"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={submitHideCollection}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white py-3 rounded-xl font-bold transition-all text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-emerald-600/10"
                      >
                        <Receipt size={16} /> چرم وصول کریں اور چرمی چلان پرنٹ کریں
                      </button>
                    </div>
                  </div>

                  {/* Hide Collection History List (Col Span 7) */}
                  <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                        <History size={18} className="text-slate-400" />
                        وصول شدہ کھالیں ریکارڈ لسٹ
                      </h4>
                      <div className="flex gap-2">
                        {/* Branch filter */}
                        <select
                          value={hidesBranchFilter}
                          onChange={(e) => setHidesBranchFilter(e.target.value)}
                          className="text-[10px] px-2 py-1 rounded bg-slate-100 border border-slate-200 font-bold focus:outline-none"
                        >
                          <option value="all">تمام کاؤنٹرز</option>
                          {branches.map(b => (
                            <option key={b.id} value={b.id}>{b.label} ({b.centerLabel})</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Search bar */}
                    <div className="relative">
                      <Search className="absolute right-3 top-2.5 text-slate-400" size={16} />
                      <input
                        type="text"
                        placeholder="عطیہ کنندہ نام، فون یا سلپ ID سے تلاش کریں..."
                        value={hidesSearchQuery}
                        onChange={(e) => setHidesSearchQuery(e.target.value)}
                        className="w-full text-xs pr-9 pl-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold font-sans"
                      />
                    </div>

                    {/* Scrollable list container */}
                    <div className="overflow-y-auto max-h-[440px] space-y-3 pr-1">
                      {hides
                        .filter(h => h.year === activeYear)
                        .filter(h => {
                          if (hidesBranchFilter !== 'all' && h.collectedByBranchId !== hidesBranchFilter) return false;
                          if (!hidesSearchQuery) return true;
                          const q = hidesSearchQuery.toLowerCase();
                          return h.id.toLowerCase().includes(q) || 
                                 h.donorName.toLowerCase().includes(q) || 
                                 (h.donorPhone && h.donorPhone.includes(q));
                        })
                        .map((h) => {
                          const matchesBranch = branches.find(b => b.id === h.collectedByBranchId);
                          return (
                            <div key={h.id} className="bg-slate-50 border border-slate-200/60 rounded-xl p-3.5 space-y-3 hover:bg-slate-100/40 transition-all font-sans">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-lg border border-emerald-200/50 font-black font-mono">ID: {h.id}</span>
                                  <span className="text-[10px] text-slate-400 font-bold">{h.date}</span>
                                </div>
                                <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full ${matchesBranch?.color || 'bg-slate-100'} border border-slate-950/10`}>
                                  {h.collectedByBranchLabel || 'کاؤنٹر'}
                                </span>
                              </div>

                              <div className="flex justify-between items-center bg-white border border-slate-150 rounded-xl p-2">
                                <span className="text-xs font-black text-slate-800">{h.donorName}</span>
                                <div className="flex gap-2">
                                  {h.camelCount > 0 && <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200/60 px-2 py-0.5 rounded font-bold font-sans">اونٹ: {h.camelCount}</span>}
                                  {h.cowCount > 0 && <span className="text-[10px] bg-blue-50 text-blue-800 border border-blue-200/60 px-2 py-0.5 rounded font-bold font-sans">گائے: {h.cowCount}</span>}
                                  {h.goatCount > 0 && <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200/60 px-2 py-0.5 rounded font-bold font-sans">بکری: {h.goatCount}</span>}
                                </div>
                              </div>

                              <div className="flex justify-between items-center text-[10px] pt-1">
                                <span className="text-slate-400 font-bold">{h.donorPhone || 'فون نمبر فراہم نہیں کیا گیا'}</span>
                                <div className="flex gap-2">
                                  {/* Reprint receipt */}
                                  <button
                                    onClick={() => setActiveHideSlip(h)}
                                    className="text-emerald-700 hover:text-emerald-800 font-bold px-2 py-1 rounded bg-white border border-slate-250 hover:bg-slate-50 font-sans"
                                  >
                                    رسیپٹ پرنٹ کریں
                                  </button>
                                  {/* Delete slip */}
                                  <button
                                    onClick={() => deleteHideCollection(h.id)}
                                    className="text-rose-600 hover:text-rose-700 font-bold p-1 rounded hover:bg-rose-50 border border-rose-100"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                      {hides.filter(h => h.year === activeYear).length === 0 && (
                        <p className="text-slate-400 text-center text-xs py-12">چرم مہم میں اب تک کوئی کھال وصول نہیں کی گئی ہے۔</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Supervisor Incentives and Super Admin Wages Configurations */}
                <div className="bg-slate-900 text-white rounded-3xl border border-slate-850 p-6 space-y-6 shadow-xl">
                  {/* Title banner */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-830 pb-4 gap-2">
                    <div className="space-y-1">
                      <h3 className="text-lg font-black text-white flex items-center gap-2 font-sans">
                        <Coins size={22} className="text-amber-400" />
                        مرکزی ہیڈ کوارٹر پے رول شیٹ (کھالیں اجرت و انعام)
                      </h3>
                      <p className="text-slate-400 text-[11px] font-bold leading-relaxed">
                        رول سیکیورٹی ضوابط کے تحت <br />
                        صرف مرکزی سپر ایڈمن کھال کی قیمت اجرت اور فکسڈ ڈیلی ویج کا ریکارڈ درج اور ایڈٹ کرسکتا ہے۔
                      </p>
                    </div>
                    {/* Role badge */}
                    <span className={`text-[10px] font-black px-3 py-1.5 rounded-xl border flex flex-col text-right sm:text-left leading-normal ${
                      isSuperAdmin 
                        ? 'bg-rose-900/40 text-rose-300 border-rose-900/50 animate-pulse' 
                        : isNazim 
                        ? 'bg-amber-900/40 text-amber-300 border-amber-900/60' 
                        : 'bg-slate-800 text-slate-500 border-slate-700'
                    }`}>
                      <span>انتظامی اختیار:</span>
                      <span className="text-xs font-black mt-0.5">
                        {isSuperAdmin ? 'مرکزی سپر ایڈمن' : isNazim ? 'ناظمِ شعبہ' : 'قاری کاؤنٹر'}
                        <span className="block text-[9px] opacity-80 font-normal">
                          {isSuperAdmin ? 'کُل ایڈٹ بحال' : isNazim ? 'اپنے مَرکز کا ایڈٹ بحال' : 'صرف مشاہدہ'}
                        </span>
                      </span>
                    </span>
                  </div>

                  {/* Config Block: editable ONLY by super admin (isSuperAdmin is true) */}
                  <div className="bg-slate-850 rounded-2xl p-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 border border-slate-800">
                    {/* Camel hide wages rate */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-slate-400 block pb-1">اونٹ انعام ریٹ (فی عدد):</span>
                      <input
                        type="number"
                        disabled={!isSuperAdmin}
                        value={wageRates.camelRate}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          setWageRates(prev => ({ ...prev, camelRate: val }));
                        }}
                        className="w-full bg-slate-800 text-white font-mono text-center px-2 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:border-amber-400 disabled:opacity-50 text-xs font-black"
                      />
                    </div>

                    {/* Cow hide reward rate */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-slate-400 block pb-1">گائے انعام ریٹ (فی عدد):</span>
                      <input
                        type="number"
                        disabled={!isSuperAdmin}
                        value={wageRates.cowRate}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          setWageRates(prev => ({ ...prev, cowRate: val }));
                        }}
                        className="w-full bg-slate-800 text-white font-mono text-center px-2 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:border-amber-400 disabled:opacity-50 text-xs font-black"
                      />
                    </div>

                    {/* Goat hide reward rate */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-slate-400 block pb-1">بکری انعام ریٹ (فی عدد):</span>
                      <input
                        type="number"
                        disabled={!isSuperAdmin}
                        value={wageRates.goatRate}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          setWageRates(prev => ({ ...prev, goatRate: val }));
                        }}
                        className="w-full bg-slate-800 text-white font-mono text-center px-2 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:border-amber-400 disabled:opacity-50 text-xs font-black"
                      />
                    </div>

                    {/* Nazim Daily Wage */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-slate-400 block pb-1">ناظم یومیہ اجرت (روپے):</span>
                      <input
                        type="number"
                        disabled={!isSuperAdmin}
                        value={wageRates.nazimDailyRate ?? 2500}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          setWageRates(prev => ({ ...prev, nazimDailyRate: val }));
                        }}
                        className="w-full bg-slate-800 text-white font-mono text-center px-2 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:border-amber-400 disabled:opacity-50 text-xs font-black"
                      />
                    </div>

                    {/* Ustadh Daily Wage */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-slate-400 block pb-1">استاذ یومیہ اجرت (روپے):</span>
                      <input
                        type="number"
                        disabled={!isSuperAdmin}
                        value={wageRates.ustadhDailyRate ?? 1800}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          setWageRates(prev => ({ ...prev, ustadhDailyRate: val }));
                        }}
                        className="w-full bg-slate-800 text-white font-mono text-center px-2 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:border-amber-400 disabled:opacity-50 text-xs font-black"
                      />
                    </div>

                    {/* Student Daily Wage */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-slate-400 block pb-1">طالبعلم یومیہ اجرت (روپے):</span>
                      <input
                        type="number"
                        disabled={!isSuperAdmin}
                        value={wageRates.studentDailyRate ?? 1000}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          setWageRates(prev => ({ ...prev, studentDailyRate: val }));
                        }}
                        className="w-full bg-slate-800 text-white font-mono text-center px-2 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:border-amber-400 disabled:opacity-50 text-xs font-black"
                      />
                    </div>
                  </div>

                  {/* Calculations Cumulative Payroll sheet table */}
                  <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-850">
                    <table className="w-full text-xs text-right border-collapse">
                      <thead>
                        <tr className="bg-slate-800 border-b border-slate-700 text-slate-350 leading-relaxed font-black">
                          <th className="py-3 px-4 text-right">قربانی کاؤنٹر / شاخ</th>
                          <th className="py-3 px-4 text-center">وصول کھالیں</th>
                          <th className="py-3 px-4 text-center">کھال انعام رقم</th>
                          <th className="py-3 px-4 text-center">افرادی قوت کی تعداد (تعداد)</th>
                          <th className="py-3 px-4 text-center">ایامِ کارِ ڈیوٹی (ایام)</th>
                          <th className="py-3 px-4 text-center">اجرت تفصیل (تعداد × ایام × ریٹ)</th>
                          <th className="py-3 px-4 text-left">کُل واجب الادا</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300 font-sans">
                        {hidesPayroll.map((item) => {
                          if (item.branch.id === 'hq') return null; // HQ represents central office, excluding from payroll
                          const branchCenter = String(item.branch.centerId || '').toLowerCase().trim();
                          const activeCenter = String(activeBranchObj?.centerId || '').toLowerCase().trim();
                          
                          // Fallback prefix extraction (e.g. from id: jauhar_nazim -> jauhar)
                          const getPrefix = (id: string) => id.split('_')[0] || '';
                          const isSameCenterPrefix = getPrefix(item.branch.id) === getPrefix(activeBranchObj?.id || '');

                          // Each madrassa's Nazim can only see and feed their own data. They can't see other branches' data.
                          // But Super Admin can see all rows.
                          const isSameCenter = branchCenter === activeCenter || isSameCenterPrefix;
                          if (!isSuperAdmin && isAuthenticated) {
                            if (!isSameCenter) return null;
                          }

                          // Super Admin cannot edit this, only local center Nazim can edit their own center's row
                          const canEdit = isAuthenticated && activeBranchObj && activeBranchObj.role === 'nazim' && (
                            branchCenter === activeCenter || isSameCenterPrefix
                          );
                          return (
                            <tr key={item.branch.id} className="hover:bg-slate-820 transition-all">
                              {/* Branch label */}
                              <td className="py-3.5 px-4 font-black text-slate-100 font-sans">
                                {item.branch.centerLabel || 'مرکز'} — <span className="text-slate-400 text-[10px]">{item.branch.label}</span>
                                <div className="text-[9px] font-normal text-slate-500 mt-0.5">
                                  {item.branch.role === 'nazim' ? 'ناظمِ شاخ کلاں' : 'ماتحت قاری کاؤنٹر'}
                                </div>
                              </td>

                              {/* Hides count split */}
                              <td className="py-3.5 px-4 text-center font-mono font-black text-slate-200">
                                <span className="text-slate-200">{item.stats.total} </span>
                                <span className="text-[9px] text-slate-500 font-normal block">
                                  (اونٹ: {item.stats.camel}، گائے: {item.stats.cow}، بکری: {item.stats.goat})
                                </span>
                              </td>

                              {/* Hide Commission amount */}
                              <td className="py-3.5 px-4 text-center font-mono font-bold text-amber-400">
                                {item.hideCommission.toLocaleString('ur-PK')} <span className="text-[9px] font-sans">روپے</span>
                              </td>

                              {/* Staff counts editable stepper */}
                              <td className="py-3.5 px-4 text-center">
                                <div className="space-y-1.5 flex flex-col items-center">
                                  {/* Nazim Count */}
                                  <div className="flex items-center gap-1.5 justify-between w-full max-w-[130px]">
                                    <span className="text-[10px] text-slate-400 font-bold min-w-[36px]">ناظم:</span>
                                    <CompactStepper
                                      value={item.nazimCount}
                                      disabled={!canEdit}
                                      onChange={(val) => {
                                        setWageRates(prev => ({
                                          ...prev,
                                          nazimCounts: { ...prev.nazimCounts, [item.branch.id]: val }
                                        }));
                                      }}
                                    />
                                  </div>
                                  {/* Ustadh Count */}
                                  <div className="flex items-center gap-1.5 justify-between w-full max-w-[130px]">
                                    <span className="text-[10px] text-slate-400 font-bold min-w-[36px]">استاذ:</span>
                                    <CompactStepper
                                      value={item.ustadhCount}
                                      disabled={!canEdit}
                                      onChange={(val) => {
                                        setWageRates(prev => ({
                                          ...prev,
                                          ustadhCounts: { ...prev.ustadhCounts, [item.branch.id]: val }
                                        }));
                                      }}
                                    />
                                  </div>
                                  {/* Student Count */}
                                  <div className="flex items-center gap-1.5 justify-between w-full max-w-[130px]">
                                    <span className="text-[10px] text-slate-400 font-bold min-w-[36px]">طالب:</span>
                                    <CompactStepper
                                      value={item.studentCount}
                                      disabled={!canEdit}
                                      onChange={(val) => {
                                        setWageRates(prev => ({
                                          ...prev,
                                          studentCounts: { ...prev.studentCounts, [item.branch.id]: val }
                                        }));
                                      }}
                                    />
                                  </div>
                                </div>
                              </td>

                              {/* Duty Days editable stepper */}
                              <td className="py-3.5 px-4 text-center">
                                <div className="space-y-1.5 flex flex-col items-center">
                                  {/* Nazim Days */}
                                  <div className="flex items-center gap-1.5 justify-between w-full max-w-[130px]">
                                    <span className="text-[10px] text-slate-400 font-bold min-w-[36px]">ناظم:</span>
                                    <CompactStepper
                                      value={item.nazimDays}
                                      disabled={!canEdit}
                                      onChange={(val) => {
                                        setWageRates(prev => ({
                                          ...prev,
                                          nazimDutyDays: { ...prev.nazimDutyDays, [item.branch.id]: val }
                                        }));
                                      }}
                                    />
                                  </div>
                                  {/* Ustadh Days */}
                                  <div className="flex items-center gap-1.5 justify-between w-full max-w-[130px]">
                                    <span className="text-[10px] text-slate-400 font-bold min-w-[36px]">استاذ:</span>
                                    <CompactStepper
                                      value={item.ustadhDays}
                                      disabled={!canEdit}
                                      onChange={(val) => {
                                        setWageRates(prev => ({
                                          ...prev,
                                          ustadhDutyDays: { ...prev.ustadhDutyDays, [item.branch.id]: val }
                                        }));
                                      }}
                                    />
                                  </div>
                                  {/* Student Days */}
                                  <div className="flex items-center gap-1.5 justify-between w-full max-w-[130px]">
                                    <span className="text-[10px] text-slate-400 font-bold min-w-[36px]">طالب:</span>
                                    <CompactStepper
                                      value={item.studentDays}
                                      disabled={!canEdit}
                                      onChange={(val) => {
                                        setWageRates(prev => ({
                                          ...prev,
                                          studentDutyDays: { ...prev.studentDutyDays, [item.branch.id]: val }
                                        }));
                                      }}
                                    />
                                  </div>
                                </div>
                              </td>

                              {/* Wages Breakdown Detail */}
                              <td className="py-3.5 px-4">
                                <div className="space-y-1 text-right text-[10px] inline-block bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/80">
                                  {item.nazimCount > 0 && item.nazimDays > 0 && (
                                    <div className="text-slate-400 font-sans flex justify-between gap-3 min-w-[155px]">
                                      <span>ناظم ({item.nazimCount}×{item.nazimDays}د):</span>
                                      <span className="font-mono text-slate-300">{(wageRates.nazimDailyRate ?? 2500).toLocaleString('ur-PK')} = <strong className="text-slate-100 font-black">{item.nazimWages.toLocaleString('ur-PK')}</strong></span>
                                    </div>
                                  )}
                                  {item.ustadhCount > 0 && item.ustadhDays > 0 && (
                                    <div className="text-slate-400 font-sans flex justify-between gap-3 min-w-[155px]">
                                      <span>استاذ ({item.ustadhCount}×{item.ustadhDays}د):</span>
                                      <span className="font-mono text-slate-300">{(wageRates.ustadhDailyRate ?? 1800).toLocaleString('ur-PK')} = <strong className="text-slate-100 font-black">{item.ustadhWages.toLocaleString('ur-PK')}</strong></span>
                                    </div>
                                  )}
                                  {item.studentCount > 0 && item.studentDays > 0 && (
                                    <div className="text-slate-400 font-sans flex justify-between gap-3 min-w-[155px]">
                                      <span>طالب ({item.studentCount}×{item.studentDays}د):</span>
                                      <span className="font-mono text-slate-300">{(wageRates.studentDailyRate ?? 1000).toLocaleString('ur-PK')} = <strong className="text-slate-100 font-black">{item.studentWages.toLocaleString('ur-PK')}</strong></span>
                                    </div>
                                  )}
                                  <div className="border-t border-slate-700/50 pt-1 text-slate-300 font-black font-sans flex justify-between gap-3 mt-1">
                                    <span>میزان اجرت:</span>
                                    <span className="font-mono text-amber-400">{item.dailyWages.toLocaleString('ur-PK')} روپے</span>
                                  </div>
                                </div>
                              </td>

                              {/* Net payable sum */}
                              <td className="py-3.5 px-4 text-left font-black font-mono text-emerald-400 text-sm">
                                {item.netPayable.toLocaleString('ur-PK')}{' '}
                                <span className="text-[10px] font-bold font-sans">روپے</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-slate-850/50 p-4 rounded-2xl flex items-center gap-3 border border-slate-800 text-center justify-center text-xs">
                    <Info size={14} className="text-amber-500 animate-pulse" />
                    <span className="text-slate-400 leading-relaxed font-bold">
                      ایام ڈیوٹی میں تبدیلی اور انعام ریٹ کی سیکیورٹی تبدیلیاں براہ راست لائیو سنکرونائزیشن کے تحت دوسرے کمپیوٹرز پر بھی منعکس ہوتی ہیں۔
                    </span>
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
                    یہاں سے صرف مرکزی سپر ایڈمن ہر سال قربانی سوسائٹی کے کُل حسابات کا الگ سالانہ سیشن متعین یا نیا سال اوپن کر سکتا ہے۔ سال تبدیل کرنے سے سابقہ سال کا تمام ڈیٹا بیک گراؤنڈ میں محفوظ رہے گا اور دوسرے کاؤنٹرز پر بھی منتخب کردہ سال کا نیا از سر نو صاف ڈیٹا خودکار لائیو سنک کے ذریعے لاگو ہو جائے گا۔
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Switch Year Selection */}
                    <div className="space-y-2 bg-white/50 p-4 rounded-2xl border border-indigo-100">
                      <label className="text-xs text-indigo-950 font-black block">موجودہ فعال سال تبدیل کریں:</label>
                      <div className="flex gap-2">
                        <select
                          value={activeYear}
                          disabled={!isSuperAdmin}
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
                        * سپر ایڈمن کے اکاؤنٹ سے تبدیل کیا جانے والا سال تمام کاؤنٹرز کے کمپیوٹرز پر لائیو لاگو ہوگا۔
                      </p>
                    </div>

                    {/* Add New Year */}
                    <div className="space-y-2 bg-white/50 p-4 rounded-2xl border border-indigo-100">
                      <label className="text-xs text-indigo-950 font-black block">نیا سال/سیشن متعین کریں (از سر نو آغاز):</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newYearInput}
                          disabled={!isSuperAdmin}
                          onChange={(e) => setNewYearInput(e.target.value)}
                          placeholder="مثلاً: 2027 یا 1448"
                          className="flex-1 bg-white border border-indigo-200/50 p-2.5 rounded-xl font-bold font-mono text-slate-800 text-sm focus:ring-1 focus:ring-indigo-500 outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
                        />
                        <button
                          type="button"
                          disabled={!isSuperAdmin}
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
                        * نیا عید سال شروع کرنے کا اختیار صرف مرکزی سپر ایڈمن کو ہے اور اس سے تمام کاؤنٹرز پر مہم بالکل از سر نو شروع ہوگی۔
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
                        disabled={!isSuperAdmin}
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
                      {isSuperAdmin ? (
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
                        <div className="text-xs text-amber-700 font-bold bg-amber-50 p-2.5 rounded-xl border border-amber-100 flex items-center justify-center w-full">
                          * صرف سپر ایڈمن ہی طے شدہ فیس کی رقم یکمشت اپ ڈیٹ اور تبدیل کر سکتے ہیں۔
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Global default Waqf Share Amount card */}
                <div className="bg-sky-50 border border-sky-200 p-6 rounded-3xl space-y-4">
                  <div className="flex items-center gap-2 text-sky-900">
                    <Coins className="text-sky-700" size={22} />
                    <h4 className="font-extrabold text-sm font-sans">مرکزی طے شدہ وقف حصہ رقم (وقف قربانی فیس فی حصہ):</h4>
                  </div>
                  <p className="text-xs text-sky-700/80 leading-relaxed font-bold">
                    یہاں سے سپر ایڈمن وقف قربانی (جس کا گوشت حصہ دار کو نہیں دیا جاتا بلکہ مستحقین میں تقسیم ہوتا ہے) کی مستقل رقم متعین کر سکتا ہے۔ نئے شامل ہونے والے وقف حصوں کی قیمت خودکار طور پر یہی رقم لاگو ہوگی۔
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1 sm:col-span-1">
                      <label className="text-xs text-sky-900/70 font-bold block">متعین رقم برائے وقف حصہ (روپے):</label>
                      <input 
                        type="number"
                        value={globalWaqfShareAmount}
                        disabled={!isSuperAdmin}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (!isNaN(val) && val >= 0) {
                            setGlobalWaqfShareAmount(val);
                          }
                        }}
                        className="w-full bg-white border border-sky-200/50 p-2.5 rounded-xl font-bold font-mono text-slate-800 text-sm focus:ring-1 focus:ring-sky-500 outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
                        placeholder="مثال: 35000"
                      />
                    </div>
                    <div className="flex items-end sm:col-span-2 gap-2">
                      {isSuperAdmin ? (
                        <button
                          type="button"
                          onClick={() => {
                            // Retroactively apply to ALL unpaid shares that are of type 'waqf'
                            triggerConfirm(
                              `کیا آپ واقعی تمام موجودہ گایوں کے "غیر ادا شدہ وقف" (unpaid waqf) حصوں کی رقم یکمشت تبدیل کر کے ${globalWaqfShareAmount.toLocaleString('ur-PK')} روپے کرنا چاہتے ہیں؟`,
                              () => {
                                setAnimals(prev => {
                                  const updated = prev.map(a => ({
                                    ...a,
                                    shares: a.shares.map(s => {
                                      if (s.qurbaniType === 'waqf' && !s.isPaid) {
                                        return { ...s, amountPaid: globalWaqfShareAmount };
                                      }
                                      return s;
                                    })
                                  }));
                                  localStorage.setItem('qurbani_data_v4', JSON.stringify(updated));
                                  broadcastSync(updated, deposits, activityLogs);
                                  return updated;
                                });
                                triggerAlert('کامیابی! تمام غیر ادا شدہ وقف حصوں کی رقم نئی رقم کے مطابق یکمشت تبدیل کر دی گئی ہے۔', 'کامیابی');
                                logActivity('add_animal', `تمام غیر ادا شدہ وقف حصوں کی رقم یکمشت تبدیل کر کے ${globalWaqfShareAmount.toLocaleString('ur-PK')} روپے مقرر کی گئی`);
                              },
                              'وقف رقم یکمشت تبدیل کریں'
                            );
                          }}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-md text-center"
                        >
                          وقف حصوں کی رقم یکمشت اپ ڈیٹ کریں ✨
                        </button>
                      ) : (
                        <div className="text-xs text-amber-700 font-bold bg-amber-50 p-2.5 rounded-xl border border-amber-100 flex items-center justify-center w-full">
                          * صرف سپر ایڈمن ہی طے شدہ وقف فیس کی رقم یکمشت اپ ڈیٹ اور تبدیل کر سکتے ہیں۔
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Branches / Counter Manager Section */}
                <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-6">
                  <div>
                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                      <Users className="text-emerald-600" size={20} />
                      مرکز اور کاؤنٹرز (قاری صاحبان) کا انتظام
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      یہاں سے آپ متعلقہ مرکز کے قاری صاحبان کے نام تبدیل کرسکتے ہیں، نئے قاری کا لاگ ان اور PIN شامل کرسکتے ہیں اور ضرورت پڑنے پر نئے مراکز درج کر سکتے ہیں۔
                    </p>
                  </div>

                  {/* FORM 1: Add a new counter under the logged-in Nazim's center */}
                  {isNazim ? (
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-4">
                      <h4 className="text-sm font-black text-emerald-800 flex items-center gap-1.5 border-b border-emerald-50/50 pb-2">
                        <PlusCircle size={16} /> اپنے مَرکز ({activeBranchObj.centerLabel}) میں نیا اکاؤنٹ / قاری صاحب شامل کریں
                      </h4>
                      <form 
                        onSubmit={(e) => {
                          e.preventDefault();
                          const form = e.currentTarget;
                          const formData = new FormData(form);
                          const label = formData.get('label')?.toString().trim();
                          const password = formData.get('password')?.toString().trim() || '123';
                          if (!label) return;

                          // Check duplicate name inside the current center
                          if (branches.some(b => b.centerId === activeBranchObj.centerId && b.label.toLowerCase() === label.toLowerCase())) {
                            alert('اس نام کا قاری اکاؤنٹ آپ کے مرکز میں پہلے سے موجود ہے!');
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

                          const newBranchId = `${activeBranchObj.centerId}_qari_${Math.random().toString(36).substr(2, 5)}`;
                          const newBranch: Branch = {
                            id: newBranchId,
                            centerId: activeBranchObj.centerId,
                            centerLabel: activeBranchObj.centerLabel,
                            label,
                            role: 'qari',
                            password,
                            color: activeBranchObj.color || randomStyle.color,
                            textColor: activeBranchObj.textColor || randomStyle.textColor,
                            accent: activeBranchObj.accent || randomStyle.accent,
                            isCustom: true
                          };

                          setBranches(prev => [...prev, newBranch]);
                          form.reset();
                          triggerAlert(`موصول کنندہ قاری صاحب "${label}" کو مرکز "${activeBranchObj.centerLabel}" میں شامل کر دیا گیا ہے۔`, 'کامیابی');
                        }}
                        className="grid grid-cols-1 sm:grid-cols-4 gap-4"
                      >
                        <div className="sm:col-span-2">
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">قاری صاحب کا نام:</label>
                          <input 
                            type="text"
                            name="label"
                            required
                            placeholder="قاری صاحب کا نام درج کریں (مثلاً: قاری محمد جاوید)"
                            className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl font-bold text-slate-800 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">لاگ ان PIN (پاسورڈ):</label>
                          <input 
                            type="text"
                            name="password"
                            placeholder="پاسورڈ (ڈیفالٹ: 123)"
                            className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl font-bold text-slate-800 text-xs focus:ring-1 focus:ring-emerald-500 outline-none text-center"
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            type="submit"
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 h-[38px]"
                          >
                            <Plus size={16} /> اکاؤنٹ شامل کریں
                          </button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-50 rounded-2xl text-amber-800 text-xs font-bold border border-amber-200/50">
                      ⚠️ توجہ: نئے اکاوٴنٹس شامل کرنا یا تبدیلیاں کرنا صرف متعلقہ "ناظم مدرسہ" کے لاگ ان اکاؤنٹ کے پاس دستیاب ہے۔
                    </div>
                  )}

                  {/* FORM 2: Register a new Center/Area (Allowed ONLY for Super Admins) */}
                  {isSuperAdmin && (
                    <div className="bg-gradient-to-l from-indigo-50 to-white rounded-2xl p-5 border border-indigo-100 space-y-4">
                      <h4 className="text-sm font-black text-indigo-900 flex items-center gap-1.5 border-b border-indigo-100/50 pb-2">
                        <Building size={16} /> نیا علاقہ رجسٹر کریں (صرف سپر ایڈمن کا خصوصی اختیار)
                      </h4>
                      <form 
                        onSubmit={(e) => {
                          e.preventDefault();
                          const form = e.currentTarget;
                          const formData = new FormData(form);
                          const centerName = formData.get('centerLabel')?.toString().trim();
                          const nazimPin = formData.get('nazimPin')?.toString().trim() || '9211';
                          if (!centerName) return;

                          // Check duplicate center label
                          if (branches.some(b => b.centerLabel.toLowerCase() === centerName.toLowerCase())) {
                            alert('یہ علاقہ پہلے سے ہی لسٹ میں موجود ہے!');
                            return;
                          }

                          // Generate dynamic centerId
                          const slugId = 'center_' + Math.random().toString(36).substr(2, 6);

                          // Set up Nazim account for the new center
                          const newCenterNazim: Branch = {
                            id: `${slugId}_nazim`,
                            centerId: slugId,
                            centerLabel: centerName,
                            label: 'ناظم مدرسہ',
                            role: 'nazim',
                            password: nazimPin,
                            color: 'bg-indigo-600',
                            textColor: 'text-indigo-700',
                            accent: 'indigo',
                            isCustom: true
                          };

                          setBranches(prev => [...prev, newCenterNazim]);
                          form.reset();
                          triggerAlert(`نیا علاقہ "${centerName}" کامیابی سے رجسٹر ہوگیا اور اس کا سپروائزر "ناظم مدرسہ" اکاؤنٹ بنا دیا گیا ہے۔ اب وہ PIN: ${nazimPin} کے ذریعے لاگ ان کر سکتے ہیں!`, 'کامیابی');
                        }}
                        className="grid grid-cols-1 sm:grid-cols-4 gap-4"
                      >
                        <div className="sm:col-span-2">
                          <label className="text-[10px] font-bold text-indigo-500 block mb-1">نئے علاقے کا نام درج کریں:</label>
                          <input 
                            type="text"
                            name="centerLabel"
                            required
                            placeholder="مثلاً: جامعہ اشرف العلوم، شاہ فیصل"
                            className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl font-bold text-slate-800 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-indigo-500 block mb-1">ناظم مدرسہ لاگ ان PIN:</label>
                          <input 
                            type="text"
                            name="nazimPin"
                            placeholder="پاسورڈ (ڈیفالٹ: 9211)"
                            className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl font-bold text-slate-800 text-xs focus:ring-1 focus:ring-indigo-500 outline-none text-center"
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            type="submit"
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 h-[38px]"
                          >
                            <Plus size={16} /> نیا علاقہ رجسٹر کریں
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Table to list and update accounts within the logged-in center */}
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 p-3.5 border-b border-slate-200 flex items-center justify-between">
                      <span className="text-xs font-black text-slate-700">مرکز کے فعال اکاؤنٹس کی فہرست ({activeBranchObj.centerLabel})</span>
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-100">
                        کل اکاؤنٹس: {branches.filter(b => b.centerId === activeBranchObj.centerId).length}
                      </span>
                    </div>

                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-100 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="p-3">شناختی ID</th>
                          <th className="p-3">نام / لیبل (ترمیم کریں)</th>
                          <th className="p-3">پاسورڈ / PIN (ترمیم کریں)</th>
                          <th className="p-3 text-center">نوعیت / اختیار</th>
                          <th className="p-3 text-center w-24">کارروائی</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-bold">
                        {branches
                          .filter(b => b.centerId === activeBranchObj.centerId)
                          .map((b) => (
                            <tr key={b.id} className="hover:bg-slate-50/40">
                              <td className="p-3 font-mono text-slate-400">#{b.id}</td>
                              <td className="p-3">
                                <input 
                                  type="text"
                                  value={b.label}
                                  disabled={!isNazim || b.id === activeBranch}
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
                                  value={b.password || '123'}
                                  disabled={!isNazim || b.id === activeBranch}
                                  onChange={(e) => {
                                    const updatedPass = e.target.value;
                                    setBranches(prev => prev.map(item => item.id === b.id ? { ...item, password: updatedPass } : item));
                                  }}
                                  className="w-full bg-slate-50/50 border border-slate-200/50 rounded-lg px-2.5 py-1.5 font-bold font-mono text-slate-800 focus:text-emerald-600 outline-none focus:ring-1 focus:ring-emerald-500 disabled:text-slate-400 disabled:bg-transparent disabled:border-none"
                                />
                              </td>
                              <td className="p-3 text-center">
                                {b.role === 'super_admin' ? (
                                  <span className="bg-rose-50 text-rose-700 border border-rose-100 text-[10px] px-2 py-0.5 rounded-full">
                                    مرکزی سپر ایڈمن
                                  </span>
                                ) : b.role === 'nazim' ? (
                                  <span className="bg-red-50 text-red-700 border border-red-100 text-[10px] px-2 py-0.5 rounded-full">
                                    ناظمِ اعلیٰ (سپروائزر)
                                  </span>
                                ) : (
                                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] px-2 py-0.5 rounded-full">
                                    عام کاؤنٹر / قاری
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                {b.id === activeBranch ? (
                                  <span className="text-slate-400 text-[10px]">آپ خود لاگ ان ہیں</span>
                                ) : (b.role === 'nazim' || b.role === 'super_admin') ? (
                                  <span className="text-slate-400 text-[10px]">مستقل</span>
                                ) : (
                                  isNazim ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        triggerConfirm(
                                          `کیا آپ واقعی کاؤنٹر "${b.label}" خارج کرنا چاہتے ہیں؟`,
                                          () => {
                                            setBranches(prev => prev.filter(item => item.id !== b.id));
                                            triggerAlert(`کاؤنٹر "${b.label}" کامیابی سے حذف ہو گیا ہے۔`, 'کامیابی');
                                          },
                                          'کاؤنٹر حذف کریں'
                                        );
                                      }}
                                      className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2.5 py-1 rounded transition-all active:scale-95"
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

            {view === 'tags' && (
              <motion.div
                key="tags-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6"
              >
                {/* Control Panel Card */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2 flex-1">
                    <h3 className="text-lg font-black text-slate-800">قربانی گائے کے ٹرانزٹ ٹیگ پرنٹ کریں</h3>
                    <p className="text-xs text-slate-500 font-medium">ٹیگ کارڈ کا چوڑائی 3.8 انچ اور اونچائی 4.0 انچ (پورٹریٹ) یا چوڑائی 4.0 انچ اور اونچائی 3.8 انچ (لینڈ اسکیپ) منتخب کیا جا سکتا ہے۔ دونوں صورتوں میں یہ اے فور (A4) پیج پر 4 کی تعداد میں پرنٹ ہوں گے۔</p>
                    
                    <div className="flex flex-wrap items-center gap-4 pt-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-600">گائے منتخب کریں:</span>
                        <select
                          value={tagAnimalId || ''}
                          onChange={(e) => {
                            const val = e.target.value ? parseInt(e.target.value) : null;
                            setTagAnimalId(val);
                          }}
                          className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold font-sans text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="">منتخب کریں...</option>
                          {animals.map(a => (
                            <option key={a.id} value={a.id}>{a.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-2 border-r border-slate-200 pr-4 mr-2">
                        <span className="text-xs font-bold text-slate-600">ٹیگ کا رخ اور سائز:</span>
                        <select
                          value={tagOrientation}
                          onChange={(e) => setTagOrientation(e.target.value as 'portrait' | 'landscape')}
                          className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="portrait">پورٹریٹ (Portrait 3.8 x 4.0 in)</option>
                          <option value="landscape">لینڈ اسکیپ (Landscape 4.0 x 3.8 in)</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedTags([true, true, true, true, true, true, true])}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg transition-all"
                        >
                          تمام منتخب کریں
                        </button>
                        <button
                          onClick={() => setSelectedTags([false, false, false, false, false, false, false])}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg transition-all"
                        >
                          سب صاف کریں
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setView('dashboard')}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition-all"
                    >
                      ڈیش بورڈ پر جائیں
                    </button>
                    <button
                      onClick={handlePrintTags}
                      disabled={chunkedSelectedTags.length === 0}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold rounded-2xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/10"
                    >
                      <Printer size={16} /> ٹیگ پرنٹ نکالیں
                    </button>
                  </div>
                </div>

                {/* Main section: Left-side selectors and Right-side live beautiful layout preview */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                  
                  {/* Select individual shares list (4 columns on desktop) */}
                  <div className="xl:col-span-4 bg-white rounded-3xl p-6 border border-slate-200 space-y-4">
                    <h4 className="text-xs font-bold text-slate-500 border-b border-slate-100 pb-2 flex justify-between items-center">
                      <span>حصہ دار لسٹ (انفرادی انتخاب)</span>
                      <span className="bg-emerald-50 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-sans">کُل منتخب: {selectedTags.filter(Boolean).length}</span>
                    </h4>

                    {tagAnimalId && animals.find(a => a.id === tagAnimalId) ? (
                      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                        {animals.find(a => a.id === tagAnimalId)!.shares.map((share, idx) => (
                          <div 
                            key={share.id}
                            onClick={() => {
                              setSelectedTags(prev => {
                                const next = [...prev];
                                next[idx] = !next[idx];
                                return next;
                              });
                            }}
                            className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${selectedTags[idx] ? 'bg-emerald-50/60 border-emerald-500' : 'bg-slate-50/40 border-slate-200/80 hover:border-slate-300'}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${selectedTags[idx] ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white border-slate-300'}`}>
                                {selectedTags[idx] && <Check size={14} className="stroke-[3]" />}
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-extrabold text-slate-850">{share.name || 'خالی حصہ'}</p>
                                <p className="text-[10px] text-slate-400 font-bold font-sans">حصہ نمبر {idx + 1} {share.phone ? `• ${share.phone}` : ''}</p>
                              </div>
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${share.isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                              {share.isPaid ? 'ادائیگی شدہ' : 'بقایا'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 text-center py-6">کوئی گائے منتخب نہیں کی گئی ہے یا فہرست خالی ہے۔</p>
                    )}
                  </div>

                  {/* Print preview structure (8 columns on desktop) */}
                  <div className="xl:col-span-8 space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-slate-500">مطلوبہ اے فور (A4) پرنٹ پیج کا حقیقی لائیو پری ویو:</h4>
                      <span className="text-[10px] text-slate-400 font-extrabold">کُل صفحات: {chunkedSelectedTags.length} صفحہ</span>
                    </div>

                    <div className="bg-slate-100 flex flex-col items-center gap-8 p-6 shadow-inner rounded-3xl overflow-y-auto max-h-[600px] border border-slate-200/80">
                      {chunkedSelectedTags.map((chunk, chunkIdx) => {
                        const isLandscapeStatus = tagOrientation === 'landscape';
                        return (
                          <div key={chunkIdx} className={`${isLandscapeStatus ? 'w-[600px] min-h-[424px]' : 'w-[450px] min-h-[636px]'} bg-white border border-slate-300 shadow-xl p-6 relative flex flex-col justify-start overflow-hidden rounded-md animate-fade-in shrink-0`}>
                            
                            {/* Cutting Indicator Dashed Line Overlays */}
                            <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-red-300/60 z-10 pointer-events-none" />
                            <div className="absolute left-1/2 top-0 bottom-0 border-l border-dashed border-red-300/60 z-10 pointer-events-none" />
                          
                          {/* Small helper tags */}
                          <span className="absolute top-1 right-2 text-[8px] text-[red]/50 font-sans tracking-widest uppercase select-none">صفحہ #{chunkIdx + 1} کٹنگ لائنز قینچی</span>

                          <div className="grid grid-cols-2 gap-2 h-full justify-center items-start mt-2">
                            {chunk.map((item, itemIdx) => (
                              <div key={itemIdx} className="relative group">
                                {renderTagItemCode(
                                  tagAnimalId && animals.find(a => a.id === tagAnimalId) ? animals.find(a => a.id === tagAnimalId)!.label : '',
                                  item.shareIdx,
                                  item.shareName,
                                  item.sharePhone,
                                  true
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                        );
                      })}
                      {chunkedSelectedTags.length === 0 && (
                        <div className="text-center py-20 text-slate-400 font-medium whitespace-normal">
                          <Printer className="mx-auto mb-3 text-slate-300 stroke-[1.5]" size={42} />
                          <p className="text-xs">پرنٹ کرنے کے لیے کم از کم ایک حصہ کا انتخاب کریں</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Print Layout Hidden Divs */}
                <div id="tags-print-container" className="hidden" dir="rtl" style={{ display: 'none' }}>
                  {chunkedSelectedTags.map((chunk, chunkIdx) => {
                    const isLandscapeMode = tagOrientation === 'landscape';
                    return (
                      <div key={chunkIdx} className="a4-page" style={{ width: isLandscapeMode ? '11.69in' : '8.27in', height: isLandscapeMode ? '8.27in' : '11.69in', padding: isLandscapeMode ? '0.25in 0.3in' : '0.3in 0.25in', boxSizing: 'border-box', pageBreakAfter: 'always', breakAfter: 'page', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', background: 'white' }}>
                        <div className="tags-grid" style={{ display: 'grid', gridTemplateColumns: isLandscapeMode ? 'repeat(2, 4.0in)' : 'repeat(2, 3.8in)', gridTemplateRows: isLandscapeMode ? 'repeat(2, 3.8in)' : 'repeat(2, 4.0in)', gap: '0.15in', justifyContent: 'center', alignContent: 'start' }}>
                          {chunk.map((item, itemIdx) => {
                            const nameParts = parseShareholderName(item.shareName);
                            const cardW = isLandscapeMode ? '4.0in' : '3.8in';
                            const cardH = isLandscapeMode ? '3.8in' : '4.0in';
                            return (
                              <div key={itemIdx} className="tag-card" style={{ width: cardW, height: cardH, minWidth: cardW, maxWidth: cardW, minHeight: cardH, maxHeight: cardH, border: '4px solid #000000', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '14px', direction: 'rtl', textAlign: 'right', backgroundColor: '#ffffff', position: 'relative', overflow: 'hidden' }}>
                                <div className="tag-section-top" style={{ height: '40%', borderBottom: '2px solid #000000', display: 'flex', flexDirection: 'column', justifyContent: 'space-around', paddingBottom: '6px' }}>
                                  <div className="tag-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', direction: 'rtl' }}>
                                    <span style={{ fontSize: '18px', fontWeight: 'bold' }}>گائے نمبر</span>
                                    <div style={{ width: '48px', height: '48px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                      <span style={{ fontSize: '42px', fontWeight: '950', fontFamily: '"Inter", sans-serif', lineHeight: '1' }}>{item.cowNumber}</span>
                                    </div>
                                  </div>
                                  <div className="tag-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', direction: 'rtl', marginTop: '4px' }}>
                                    <span style={{ fontSize: '18px', fontWeight: 'bold' }}>حصہ نمبر</span>
                                    <div style={{ width: '48px', height: '48px', border: '2px solid #000000', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: '950', fontFamily: '"Inter", sans-serif', lineHeight: '1', boxSizing: 'border-box' }}>
                                      {item.shareIdx}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="tag-section-middle" style={{ height: '20%', borderBottom: '2px solid #000000', display: 'flex', alignItems: 'center', justifyContent: 'space-between', direction: 'rtl', padding: '1px 0' }}>
                                  <span style={{ fontSize: '16px', fontWeight: 'bold' }}>رابطہ نمبر</span>
                                  <span style={{ fontSize: '20px', fontWeight: '950', fontFamily: '"Inter", sans-serif' }}>{item.sharePhone || '_______________'}</span>
                                </div>
                                
                                <div className="tag-section-bottom" style={{ height: '40%', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', paddingTop: '8px' }}>
                                  <div style={{ width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                                    <p style={{ fontSize: '22px', fontWeight: '950', margin: 0, lineHeight: '1.8', wordBreak: 'break-word', fontFamily: '"Alvi Lahori Nastaliq", "Alvi Nastaliq", "Jameel Noori Nastaliq", "Mehr Nastaliq Urdu", "Noto Nastaliq Urdu", sans-serif' }}>
                                      {nameParts.main}
                                    </p>
                                    {nameParts.sub && (
                                      <p style={{ fontSize: '17px', fontWeight: 'bold', margin: '4px 0 0 0', lineHeight: '1.6', wordBreak: 'break-word', fontFamily: '"Alvi Lahori Nastaliq", "Alvi Nastaliq", "Jameel Noori Nastaliq", "Mehr Nastaliq Urdu", "Noto Nastaliq Urdu", sans-serif', color: '#475569' }}>
                                        {nameParts.sub}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {view === 'records' && (
              <motion.div
                key="records-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6"
              >
                {/* Control Panel Filter Card */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-lg font-black text-slate-800">کھاتہ داران کا مکمل ڈیٹا ریکارڈ لسٹ</h3>
                      <p className="text-xs text-slate-500 font-medium">یہاں مدرسہ کے تمام رجسٹرڈ حصہ داروں کے کوائف (نام، رسید نمبر، رابطہ وغیرہ) کی لسٹ اور اے فور (A4) پرنٹ ایبل دفتری رپورٹ فارمیٹ حاصل کریں۔</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setView('dashboard')}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition-all"
                      >
                        ڈیش بورڈ پر جائیں
                      </button>
                      <button
                        onClick={handlePrintRecords}
                        disabled={filteredSharesForRecords.length === 0}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold rounded-2xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/10"
                      >
                        <Printer size={16} /> رپورٹ پرنٹ نکالیں
                      </button>
                    </div>
                  </div>

                  {/* Filter panel */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Filter by Counter */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">کاؤنٹر کی بنیاد پر:</label>
                      <select
                        value={recordBranchFilter}
                        onChange={(e) => setRecordBranchFilter(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="all">تمام کاؤنٹرز</option>
                        {visibleBranches.map(b => (
                          <option key={b.id} value={b.id}>{b.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Filter by Animal */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">گائے نمبر کی بنیاد پر:</label>
                      <select
                        value={recordAnimalFilter}
                        onChange={(e) => setRecordAnimalFilter(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="all">تمام گائے</option>
                        {animals.map(a => (
                          <option key={a.id} value={a.id.toString()}>{a.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Filter by payment */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">ادائیگی کا اسٹیٹس:</label>
                      <select
                        value={recordPaymentFilter}
                        onChange={(e) => setRecordPaymentFilter(e.target.value as any)}
                        className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="all">ادائیگی شدہ اور بقایا تمام</option>
                        <option value="paid">صرف ادائیگی شدہ (پیسے وصول)</option>
                        <option value="unpaid">صرف بقایا دھندگان</option>
                      </select>
                    </div>

                    {/* Search bar */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">سیکورٹی / نام سرچ کریں:</label>
                      <input
                        type="text"
                        value={recordSearchQuery}
                        onChange={(e) => setRecordSearchQuery(e.target.value)}
                        placeholder="کھاتہ دار کا نام، پتہ یا فون درج کریں..."
                        className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-emerald-500 placeholder:font-normal"
                      />
                    </div>
                  </div>
                </div>

                {/* Spreadsheet layout */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-500">مجموعی فعال کوائف ریکارڈ لسٹ</span>
                    <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">فلٹر شدہ تعداد: {filteredSharesForRecords.length} کھاتہ جات</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs border-collapse">
                      <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider sticky top-0 text-right">
                        <tr>
                          <th className="p-3 text-center w-14">سیریل #</th>
                          <th className="p-3">کھاتہ دار نام</th>
                          <th className="p-3 text-center">بک نمبر</th>
                          <th 
                            className="p-3 text-center cursor-pointer select-none hover:bg-slate-200 hover:text-slate-800 transition-colors"
                            onClick={() => setRecordReceiptSort(prev => prev === 'asc' ? 'none' : 'asc')}
                            title="رسید نمبر کے مطابق ترتیب دیں"
                          >
                            <div className="flex items-center justify-center gap-1.5 inline-flex">
                              <span>رسید نمبر</span>
                              <span className={`text-base transition-all ${recordReceiptSort === 'asc' ? 'text-indigo-600 font-extrabold scale-110' : 'text-slate-300'}`}>
                                {recordReceiptSort === 'asc' ? '↑' : '↕'}
                              </span>
                            </div>
                          </th>
                          <th className="p-3 text-center">حصے تعداد</th>
                          <th className="p-3">
                            <div className="flex items-center justify-between gap-2">
                              <span>ایڈریس / پتہ</span>
                              <div className="print:hidden" onClick={(e) => e.stopPropagation()}>
                                <select
                                  value={recordAddressFilter}
                                  onChange={(e) => setRecordAddressFilter(e.target.value)}
                                  className="bg-white border border-slate-200 px-2 py-0.5 rounded-lg text-[10px] font-bold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 max-w-[130px] shadow-sm cursor-pointer"
                                >
                                  <option value="all">تمام پتے (سب)</option>
                                  {uniqueAddresses.map(addr => (
                                    <option key={addr} value={addr}>{addr}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </th>
                          <th className="p-3 text-center">موبائل فون</th>
                          <th className="p-3 text-center">ادائیگی حیثیت</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-bold text-slate-800">
                        {filteredSharesForRecords.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-3 text-center font-mono text-slate-400">{idx + 1}</td>
                            <td className="p-3 text-slate-900">{item.share.name || '____________'}</td>
                            <td className="p-3 text-center text-slate-400">—</td>
                            <td className="p-3 text-center font-mono text-emerald-800">{item.share.customReceiptId || `S-${item.share.id}`}</td>
                            <td className="p-3 text-center font-mono">1</td>
                            <td className="p-3 text-slate-500 max-w-xs truncate">{item.share.address || '____________'}</td>
                            <td className="p-3 text-center font-mono text-slate-600 dir-ltr">{item.share.phone || '____________'}</td>
                            <td className="p-3 text-center">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full inline-block ${item.share.isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                {item.share.isPaid ? 'ادائیگی شدہ' : 'بقایا'}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {filteredSharesForRecords.length === 0 && (
                          <tr>
                            <td colSpan={8} className="p-12 text-center text-slate-400">
                              مطلوبہ فلٹرز کے مطابق کوئی ریکارڈ دستیاب نہیں ملا۔
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Print Layout Hidden Divs */}
                <div id="records-print-container" className="hidden" dir="rtl" style={{ display: 'none' }}>
                  <div className="print-header" style={{ textAlign: 'center', marginBottom: '24px', borderBottom: '3px double #000000', paddingBottom: '12px' }}>
                    <h1 className="is-urdu print-title" style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 6px 0' }}>اجتماعی قربانی جامعہ اشرف المدارس کراچی</h1>
                    <p style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 6px 0' }}>کھاتہ داران کا تفصیلی ریکارڈ و دستخط کھاتہ (سال {activeYear})</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '12px' }}>
                      <span>کُل تعداد گائے حصے: {filteredSharesForRecords.length}</span>
                      <span>پرنٹ تاریخ: {new Date().toLocaleDateString('ur-PK')}</span>
                    </div>
                  </div>
                  
                  <table className="report-table" style={{ width: '100%', borderCollapse: 'collapse', direction: 'rtl', textAlign: 'right', fontSize: '11px', color: '#000000' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f3f4f6' }}>
                        <th style={{ border: '1px solid #111111', padding: '6px', fontWeight: 'bold', textAlign: 'center', width: '7%' }}>شمار</th>
                        <th style={{ border: '1px solid #111111', padding: '6px', fontWeight: 'bold', textAlign: 'right', width: '25%' }}>نامِ حصہ دار</th>
                        <th style={{ border: '1px solid #111111', padding: '6px', fontWeight: 'bold', textAlign: 'center', width: '10%' }}>بک نمبر</th>
                        <th style={{ border: '1px solid #111111', padding: '6px', fontWeight: 'bold', textAlign: 'center', width: '12%' }}>رسید نمبر</th>
                        <th style={{ border: '1px solid #111111', padding: '6px', fontWeight: 'bold', textAlign: 'center', width: '10%' }}>تعداد حصے</th>
                        <th style={{ border: '1px solid #111111', padding: '6px', fontWeight: 'bold', textAlign: 'right', width: '22%' }}>ایڈریس / پتہ</th>
                        <th style={{ border: '1px solid #111111', padding: '6px', fontWeight: 'bold', textAlign: 'center', width: '14%' }}>رابطہ نمبر</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSharesForRecords.map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ border: '1px solid #111111', padding: '6px', textAlign: 'center' }}>{idx + 1}</td>
                          <td className="text-right-important" style={{ border: '1px solid #111111', padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>{item.share.name || '____________'}</td>
                          <td style={{ border: '1px solid #111111', padding: '6px', textAlign: 'center' }}></td>
                          <td style={{ border: '1px solid #111111', padding: '6px', textAlign: 'center', fontWeight: 'bold' }}>{item.share.customReceiptId || `S-${item.share.id}`}</td>
                          <td style={{ border: '1px solid #111111', padding: '6px', textAlign: 'center' }}>1</td>
                          <td className="text-right-important" style={{ border: '1px solid #111111', padding: '6px', textAlign: 'right' }}>{item.share.address || '____________'}</td>
                          <td style={{ border: '1px solid #111111', padding: '6px', textAlign: 'center', direction: 'ltr', unicodeBidi: 'embed' }}>{item.share.phone || '____________'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                  <h3 className="text-xl font-black text-slate-900">اجتماعی قربانی جامعہ اشرف المدارس کراچی</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Qurbani Management Office Receipt</p>
                </div>

                <div className="flex justify-between items-center text-xs text-slate-500 font-bold" dir="rtl" style={{ direction: 'rtl' }}>
                  <span>رسید نمبر: {activeSlip.share.customReceiptId || `S-${activeSlip.share.id}`}</span>
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
                  {activeSlip.share.qurbaniType === 'waqf' ? (
                    <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-xs space-y-1">
                      <div className="flex justify-between items-center text-amber-900 font-extrabold">
                        <span>قربانی کی نوعیت:</span>
                        <span>وقف قربانی (صدقہ/خدمتِ خلق)</span>
                      </div>
                      <p className="text-[10px] text-amber-700 font-bold">اس قربانی کا گوشت حصہ دار کو فراہم نہیں کیا جاتا، بلکہ مستحقین میں تقسیم ہوتا ہے۔</p>
                    </div>
                  ) : (
                    <div className="flex justify-between pt-1">
                      <span className="text-slate-400 font-bold">گوشت فراہمی کا متوقع وقت:</span>
                      <strong className="text-emerald-800 font-extrabold flex items-center gap-1">
                        <Clock size={14} />
                        {activeSlip.share.expectedDeliveryTime}
                      </strong>
                    </div>
                  )}
                </div>

                {/* Footnotes instruction */}
                <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl text-center text-[10px] leading-relaxed mt-4">
                  {activeSlip.share.qurbaniType === 'waqf' 
                    ? "اطلاع برائے وقف کنندہ: یہ وقف قربانی ہے۔ اس کا گوشت عید مبارک پر وصول کرنے کی ضرورت نہیں ہے، یہ براہِ راست مستحقینِ کراچی میں تقسیم فرما دیا جائے گا۔"
                    : "براہ کرم عید والے دن یہ رسید اپنے ہمراہ لائیں اور وقتِ مقررہ پر تشریف لائیں تاکہ گوشت کا ٹوکرا بآسانی وصول کیا جا سکے۔"}
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

        {/* Dynamic Hides Printable slip Modal Overlay */}
        {activeHideSlip && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 relative flex flex-col justify-between"
            >
              {/* Slip Layout to show printable format */}
              <div id="printable-hide-area" dir="rtl" className="border-4 border-double border-emerald-950/30 p-6 rounded-xl space-y-4 text-right bg-white" style={{ direction: 'rtl', textAlign: 'right' }}>
                <div className="text-center border-b border-slate-200 pb-3">
                  <Briefcase className="mx-auto text-emerald-700 mb-1" size={32} />
                  <h3 className="text-xl font-black text-slate-900 font-sans">چرمِ قربانی جامعہ اشرف المدارس کراچی</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 font-sans">Sacrificial Hide Collections Receipt</p>
                </div>

                <div className="flex justify-between items-center text-xs text-slate-500 font-bold" dir="rtl" style={{ direction: 'rtl' }}>
                  <span>سلپ نمبر: {activeHideSlip.id}</span>
                  <span>تاریخ/وقت: {activeHideSlip.date}</span>
                </div>

                <div className="space-y-2.5 text-sm pt-2">
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-400 font-bold">بذریعہ شاخ / کاؤنٹر:</span>
                    <strong className="text-slate-800">{activeHideSlip.collectedByBranchLabel}</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-400 font-bold font-bold font-sans">عطیہ کنندہ کا نام:</span>
                    <strong className="text-emerald-700 text-base">{activeHideSlip.donorName || '---'}</strong>
                  </div>
                  {activeHideSlip.donorPhone && (
                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-400 font-bold">فون نمبر / رابطہ:</span>
                      <strong className="text-slate-800 font-mono">{activeHideSlip.donorPhone}</strong>
                    </div>
                  )}
                  {activeHideSlip.donorAddress && (
                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-400 font-bold font-bold font-sans">پتہ تلاش:</span>
                      <strong className="text-slate-800">{activeHideSlip.donorAddress}</strong>
                    </div>
                  )}

                  {/* Received quantities table */}
                  <div className="mt-4 border border-slate-150 rounded-xl overflow-hidden bg-slate-50/50">
                    <div className="bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-705 text-center border-b border-slate-150 font-sans">وصول شدہ چرم تفصیل</div>
                    <div className="divide-y divide-slate-105 text-xs">
                      {activeHideSlip.camelCount > 0 && (
                        <div className="flex justify-between px-3 py-2 font-bold">
                          <span className="text-slate-600">اونٹ کی کھال:</span>
                          <span className="text-slate-900 font-extrabold">{activeHideSlip.camelCount} عدد</span>
                        </div>
                      )}
                      {activeHideSlip.cowCount > 0 && (
                        <div className="flex justify-between px-3 py-2 font-bold">
                          <span className="text-slate-600">گائے / بیل کی کھال:</span>
                          <span className="text-slate-900 font-extrabold">{activeHideSlip.cowCount} عدد</span>
                        </div>
                      )}
                      {activeHideSlip.goatCount > 0 && (
                        <div className="flex justify-between px-3 py-2 font-bold">
                          <span className="text-slate-600">بھیڑ / بکرا / دنبہ کی کھال:</span>
                          <span className="text-slate-900 font-extrabold">{activeHideSlip.goatCount} عدد</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between pt-1 font-bold text-xs text-slate-500">
                    <span>مذکورہ کھالیں رضاکارانہ طور پر برائے صدقاتِ مدارس جمع کر لی گئی ہیں۔</span>
                  </div>
                </div>

                {/* Footnotes instruction */}
                <div className="bg-emerald-50 text-emerald-900 p-3 rounded-xl text-center text-[10px] leading-relaxed mt-4 font-bold select-none">
                  جزاک اللہ! کھال کی کوئی قیمت فروخت یا فیس وصولی نہیں ہوتی۔ لوگ فلاحی و تعلیمی معاونت کے لیے مدارس میں بخوشی جمع کرواتے ہیں۔
                </div>

                <div className="flex justify-between items-end pt-6 text-[10px] text-slate-400 font-bold font-sans">
                  <div className="text-center min-w-[124px]">
                    <span className="block text-black font-black text-sm mb-1" style={{ color: '#000000', fontWeight: '950' }}>
                      {activeHideSlip.collectedByBranchLabel}
                    </span>
                    <span className="block border-t border-slate-200 w-full text-center mt-2 pt-1 font-bold text-slate-500">دستخط نمائندہ جامعہ</span>
                  </div>
                  <div className="italic text-slate-400 font-bold font-sans">
                    اجتماعی قربانی مہم 2026
                  </div>
                </div>
              </div>

              {/* Action utilities */}
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    const printContents = document.getElementById('printable-hide-area')?.innerHTML;
                    if (printContents) {
                      const originalContents = document.body.innerHTML;
                      document.body.innerHTML = printContents;
                      window.print();
                      window.location.reload();
                    }
                  }}
                  className="flex-1 bg-emerald-600 text-white font-extrabold py-3 rounded-xl text-xs transition-all hover:bg-emerald-700 flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                >
                  <Printer size={16} /> Print Receipt (رسید نکالیں)
                </button>
                <button
                  onClick={() => {
                    setActiveHideSlip(null);
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold px-6 py-3 rounded-xl text-xs transition-all flex items-center justify-center cursor-pointer"
                >
                  بند کریں
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Dynamic Share Transfer / Swap Modal Overlay */}
        {transferSource && transferTargetAnimalId && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto" dir="rtl">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 relative flex flex-col space-y-5 border border-slate-100"
            >
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3 justify-start">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                  <Move size={20} />
                </div>
                <div>
                  <h4 className="text-lg font-black text-slate-900">حصہ تبدیل کریں یا منتقل کریں</h4>
                  <p className="text-xs text-slate-400 font-bold">بکنگ منتقل کرنے کا آسان نظام</p>
                </div>
              </div>

              {/* Source Info Panel */}
              <div className="bg-indigo-50/50 border border-indigo-100/60 rounded-2xl p-4 space-y-2">
                <span className="text-[10px] uppercase font-black tracking-wider text-indigo-600 block">منتقل ہونے والا بکنگ کھاتہ:</span>
                <div className="flex justify-between items-center">
                  <div>
                    <strong className="text-base text-indigo-900">{transferSource.shareName}</strong>
                    <div className="text-xs text-indigo-700/80 font-bold mt-0.5">
                      {animals.find(a => a.id === transferSource.animalId)?.label} — حصہ نمبر {transferSource.shareIndex + 1}
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold bg-indigo-100 text-indigo-800 px-3 py-1 rounded-lg">
                    {animals.find(a => a.id === transferSource.animalId)?.shares[transferSource.shareIndex].customReceiptId || `S-${transferSource.shareId}`}
                  </span>
                </div>
              </div>

              {/* Target Selector Dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-600 block">ہدف گائے (جانور) منتخب کریں:</label>
                <select
                  value={transferTargetAnimalId}
                  onChange={(e) => setTransferTargetAnimalId(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl text-xs font-extrabold text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {animals.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.label} ({a.shares.filter(s => s.name).length} / 7 حصے پر)
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Slots List */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-600 block">منتخب گائے میں ہدف حصہ منتخب کریں:</label>
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 border border-slate-100 rounded-2xl p-2 bg-slate-50/50">
                  {animals.find(a => a.id === transferTargetAnimalId)?.shares.map((tShare, tIdx) => {
                    const isSelf = transferSource.animalId === transferTargetAnimalId && transferSource.shareIndex === tIdx;
                    return (
                      <div 
                        key={tShare.id} 
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all text-right ${
                          isSelf 
                            ? 'bg-slate-100 border-slate-200 opacity-60' 
                            : tShare.name 
                              ? 'bg-amber-50/50 border-amber-100 hover:border-amber-300' 
                              : 'bg-white border-slate-200 hover:border-emerald-300'
                        }`}
                      >
                        <div className="text-right">
                          <span className="text-xs font-bold text-slate-700 block">حصہ نمبر {tIdx + 1}</span>
                          <span className={`text-[11px] font-black ${tShare.name ? 'text-amber-800' : 'text-emerald-700'}`}>
                            {isSelf 
                              ? '(یہ خود یہی حصہ ہے)' 
                              : tShare.name 
                                ? `صاحبِ حصہ: ${tShare.name} (آپس میں تبدیل ہو جائے گا)`
                                : '(خالی حصہ — مکمل منتقلی)'}
                          </span>
                        </div>

                        {!isSelf && (
                          <button
                            type="button"
                            onClick={() => {
                              const res = transferShare(transferSource.animalId, transferSource.shareId, transferTargetAnimalId, tIdx);
                              if (res.success) {
                                setTransferSource(null);
                                triggerAlert(res.message, 'منتقلی مکمل');
                              } else {
                                triggerAlert(res.message, 'روکاوٹ');
                              }
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold shadow-sm transition-all text-white active:scale-95 cursor-pointer ${
                              tShare.name 
                                ? 'bg-amber-600 hover:bg-amber-700' 
                                : 'bg-emerald-600 hover:bg-emerald-700'
                            }`}
                          >
                            {tShare.name ? 'تبدیل (Swap) کریں' : 'یہاں لائیں'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTransferSource(null)}
                  className="flex-1 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-750 font-bold py-2.5 rounded-xl text-xs transition-all active:scale-95"
                >
                  منسوخ کریں
                </button>
              </div>
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
