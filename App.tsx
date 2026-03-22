import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, Appointment, Report, Department } from './types';
import { 
  Menu, 
  X, 
  LogOut, 
  User as UserIcon, 
  Calendar, 
  FileText, 
  Plus, 
  ChevronRight, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  HardHat,
  Construction,
  Hammer,
  PencilRuler,
  Wind,
  Cog,
  Lightbulb,
  Building2,
  Search,
  Filter,
  Download,
  Upload,
  ArrowRight,
  Trash2,
  Wrench,
  Zap,
  Truck,
  Drill
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
  }
}

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'confirmed':
      return 'bg-emerald-100 text-emerald-700';
    case 'pending':
      return 'bg-amber-100 text-amber-700';
    case 'completed':
      return 'bg-blue-100 text-blue-700';
    case 'cancelled':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-slate-100 text-slate-600';
  }
};

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
          <div className="max-w-md w-full glass-card p-8 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h2 className="text-2xl font-bold text-slate-900">Something went wrong</h2>
            <p className="text-slate-600">We encountered an error. Please try refreshing the page.</p>
            <button 
              onClick={() => window.location.reload()}
              className="btn-primary w-full"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Auth Context ---
interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  logout: async () => {},
});

const useAuth = () => useContext(AuthContext);

// --- Components ---

const Logo = ({ className = "w-12 h-12", dark = false }: { className?: string, dark?: boolean }) => (
  <div className="flex items-center space-x-3 group">
    <div className={`${className} relative flex items-center justify-center`}>
      <div className="absolute inset-0 bg-slate-200 rounded-xl transform rotate-3 group-hover:rotate-6 transition-transform duration-300"></div>
      <div className="absolute inset-0 bg-white rounded-xl shadow-md border border-slate-100 flex items-center justify-center overflow-hidden">
        <div className="relative w-full h-full flex items-center justify-center bg-slate-50">
          <Cog className="w-10 h-10 text-slate-400/50 animate-spin-slow" />
          <Wrench className="absolute w-5 h-5 text-emerald-600 transform -rotate-45 drop-shadow-lg" />
        </div>
      </div>
    </div>
    <div className="flex flex-col">
      <span className={`text-xl font-black tracking-tight leading-none ${dark ? 'text-white' : 'text-slate-900'} uppercase`}>
        NIJAMALIJO
      </span>
      <span className={`text-[9px] font-black tracking-[0.25em] uppercase mt-1 ${dark ? 'text-emerald-500' : 'text-emerald-600'}`}>
        General Engineering
      </span>
    </div>
  </div>
);

const Navbar = () => {
  const { user, profile, isAdmin, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Departments', path: '/departments' },
    { name: 'Contact', path: '/#contact' },
  ];

  if (user) {
    navLinks.push({ name: 'Dashboard', path: '/dashboard' });
    if (isAdmin) {
      navLinks.push({ name: 'Admin', path: '/admin' });
    }
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/">
            <Logo className="w-10 h-10" />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm font-medium transition-colors hover:text-emerald-600 ${
                  location.pathname === link.path ? 'text-emerald-600' : 'text-slate-600'
                }`}
              >
                {link.name}
              </Link>
            ))}
            {user ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-slate-500 font-medium">{profile?.name}</span>
                <button
                  onClick={logout}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <Link to="/login" className="btn-primary py-2 px-4 text-sm">
                Login
              </Link>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-slate-600">
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-slate-200 overflow-hidden"
          >
            <div className="px-4 pt-2 pb-6 space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-50 hover:text-emerald-600"
                >
                  {link.name}
                </Link>
              ))}
              {user ? (
                <button
                  onClick={() => {
                    logout();
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-base font-medium text-red-600 hover:bg-red-50"
                >
                  Logout
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="block px-3 py-2 rounded-lg text-base font-medium text-emerald-600 hover:bg-emerald-50"
                >
                  Login
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Footer = () => (
  <footer className="bg-slate-900 text-white py-12">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="col-span-1 md:col-span-2">
          <Link to="/" className="inline-block mb-6">
            <Logo className="w-12 h-12" dark />
          </Link>
          <p className="text-slate-400 max-w-sm">
            Built on Experience. Driven By excellence. Complete engineering and construction solutions for residential, commercial, and industrial developments.
          </p>
        </div>
        <div>
          <h4 className="text-lg font-semibold mb-4 text-emerald-500">Quick Links</h4>
          <ul className="space-y-2 text-slate-400">
            <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
            <li><Link to="/departments" className="hover:text-white transition-colors">Departments</Link></li>
            <li><Link to="/login" className="hover:text-white transition-colors">Login</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-lg font-semibold mb-4 text-emerald-500">Contact</h4>
          <ul className="space-y-2 text-slate-400">
            <li>Embakasi, Nairobi, Kenya</li>
            <li>+254-714-063-457</li>
            <li>nijamalijo@gmail.com</li>
          </ul>
        </div>
      </div>
      <div className="mt-12 pt-8 border-t border-slate-800 text-center text-slate-500 text-sm">
        &copy; {new Date().getFullYear()} NIJAMALIJO LTD. All rights reserved.
      </div>
    </div>
  </footer>
);

// --- Pages ---

const HomePage = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, you would send this to a backend or Firebase
    console.log('Form submitted:', formData);
    setIsSubmitted(true);
    setFormData({ name: '', email: '', message: '' });
  };

  return (
    <div className="space-y-24 pb-24">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-100 rounded-full blur-3xl opacity-50" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-50" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold tracking-wide uppercase"
            >
              Engineering & Construction Solutions
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-7xl font-bold text-slate-900 tracking-tight leading-tight"
            >
              Built on Experience.<br />
              <span className="text-emerald-600">Driven By Excellence.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed"
            >
              Delivering complete solutions for residential, commercial, and industrial developments with precision and integrity.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link to="/departments" className="btn-primary w-full sm:w-auto flex items-center justify-center">
                Explore Services <ChevronRight className="ml-2 w-5 h-5" />
              </Link>
              <Link to="/login" className="btn-secondary w-full sm:w-auto flex items-center justify-center">
                Book Appointment
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { title: 'Proven Results', desc: 'Decades of industry expertise delivering successful projects.', icon: Hammer },
            { title: 'Strategic Approach', desc: 'Precision-driven planning for every engineering challenge.', icon: PencilRuler },
            { title: 'Expert Team', desc: 'Skilled human capital ready to execute complex mandates.', icon: HardHat },
          ].map((feature, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -5 }}
              className="p-8 glass-card space-y-4"
            >
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">{feature.title}</h3>
              <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="glass-card overflow-hidden grid grid-cols-1 md:grid-cols-2">
          <div className="p-12 space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl font-bold text-slate-900 tracking-tight">Get in Touch</h2>
              <p className="text-slate-600 text-lg">Have a project in mind? Our expert team is ready to help you build your vision.</p>
            </div>

            {isSubmitted ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-8 bg-emerald-50 border border-emerald-100 rounded-2xl text-center space-y-4"
              >
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mx-auto">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">Message Sent!</h3>
                <p className="text-slate-600">Thank you for reaching out. We'll get back to you shortly.</p>
                <button 
                  onClick={() => setIsSubmitted(false)}
                  className="text-emerald-600 font-bold hover:underline"
                >
                  Send another message
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                    <input 
                      type="text" 
                      required 
                      className="input-field" 
                      placeholder="Your Name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input 
                      type="email" 
                      required 
                      className="input-field" 
                      placeholder="your@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                  <textarea 
                    required 
                    rows={4} 
                    className="input-field" 
                    placeholder="Tell us about your project..."
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                  />
                </div>
                <button type="submit" className="btn-primary w-full flex items-center justify-center">
                  Send Message <ArrowRight className="ml-2 w-5 h-5" />
                </button>
              </form>
            )}

            <div className="pt-8 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
                  <UserIcon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email</p>
                  <p className="text-xs text-slate-600 font-medium">nijamalijo@gmail.com</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Call</p>
                  <p className="text-xs text-slate-600 font-medium">+254-714-063-457</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Office</p>
                  <p className="text-xs text-slate-600 font-medium">Nairobi, Kenya</p>
                </div>
              </div>
            </div>
          </div>
          <div className="relative h-64 md:h-auto">
            <img 
              src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80" 
              alt="Construction Site" 
              className="absolute inset-0 w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </section>
    </div>
  );
};

const DepartmentsPage = () => {
  const departments: Department[] = [
    { id: 'hvac', name: 'HVAC & Refrigeration', description: 'Comprehensive installation, repair and maintenance of heating, ventilation and air conditioning systems.', icon: 'Wind', imageUrl: 'https://images.unsplash.com/photo-1581094288338-2314dddb7ecb?auto=format&fit=crop&q=80&w=200&h=200' },
    { id: 'mechanical', name: 'Mechanical & Fluid Systems', description: 'Expertise in plumbing, advanced water drainage systems, and industrial fluid management.', icon: 'Cog', imageUrl: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&q=80&w=200&h=200' },
    { id: 'civil', name: 'Civil & Finishes', description: 'High-precision tile laying, professional painting, and structured demolitions.', icon: 'Construction', imageUrl: 'https://images.unsplash.com/photo-1541888946425-d81bb19480c5?auto=format&fit=crop&q=80&w=200&h=200' },
    { id: 'electrical', name: 'Electrical Engineering', description: 'Professional electrical installations, wiring, system diagnostics, and routine repairs.', icon: 'Lightbulb', imageUrl: 'https://images.unsplash.com/photo-1558403194-611308249627?auto=format&fit=crop&q=80&w=200&h=200' },
  ];

  return (
    <div className="pt-32 pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-16 space-y-4">
        <h2 className="text-4xl font-bold text-slate-900">Our Departments</h2>
        <p className="text-slate-600 max-w-2xl mx-auto">Specialized engineering solutions tailored to your specific needs.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {departments.map((dept) => (
          <motion.div
            key={dept.id}
            whileHover={{ scale: 1.02 }}
            className="p-8 glass-card flex flex-col justify-between"
          >
            <div>
              <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center overflow-hidden mb-6 relative group">
                <img 
                  src={dept.imageUrl} 
                  alt={dept.name} 
                  className="w-full h-full object-cover absolute inset-0 transition-transform duration-500 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <div className="hidden absolute inset-0 items-center justify-center text-emerald-600 bg-emerald-50">
                  {dept.id === 'hvac' && <Wind className="w-8 h-8" />}
                  {dept.id === 'mechanical' && <Cog className="w-8 h-8" />}
                  {dept.id === 'civil' && <Construction className="w-8 h-8" />}
                  {dept.id === 'electrical' && <Lightbulb className="w-8 h-8" />}
                </div>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">{dept.name}</h3>
              <p className="text-slate-600 mb-8 leading-relaxed">{dept.description}</p>
            </div>
            <Link to={`/book?dept=${dept.id}`} className="flex items-center text-emerald-600 font-semibold hover:text-emerald-700">
              Book Consultation <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          name: name,
          role: 'client',
          createdAt: new Date().toISOString()
        });
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          name: user.displayName || 'User',
          role: 'client',
          createdAt: new Date().toISOString()
        });
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-32">
      <div className="max-w-md w-full glass-card p-8 space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-900">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
          <p className="text-slate-500 mt-2">{isLogin ? 'Login to your dashboard' : 'Join NijaMalijo Engineering'}</p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                className="input-field"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              required
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary w-full py-3">
            {isLogin ? 'Login' : 'Sign Up'}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
          <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-slate-500">Or continue with</span></div>
        </div>

        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center px-4 py-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors font-medium text-slate-700"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 mr-3" alt="Google" />
          Google
        </button>

        <p className="text-center text-sm text-slate-600">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-emerald-600 font-semibold hover:underline"
          >
            {isLogin ? 'Sign Up' : 'Login'}
          </button>
        </p>

        <div className="pt-4 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400">
            Need help? Contact support at <a href="mailto:nijamalijo@gmail.com" className="text-emerald-600 hover:underline">nijamalijo@gmail.com</a>
          </p>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user, profile } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'appointments'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsubAppts = onSnapshot(q, (snapshot) => {
      setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'appointments');
    });

    const rq = query(collection(db, 'reports'), where('userId', '==', user.uid), orderBy('uploadedAt', 'desc'));
    const unsubReports = onSnapshot(rq, (snapshot) => {
      setReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'reports');
    });

    return () => {
      unsubAppts();
      unsubReports();
    };
  }, [user]);

  if (loading) return <div className="pt-32 text-center">Loading...</div>;

  return (
    <div className="pt-32 pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Welcome, {profile?.name}</h1>
          <p className="text-slate-500">Manage your engineering projects and appointments.</p>
        </div>
        <Link to="/book" className="btn-primary flex items-center">
          <Plus className="w-5 h-5 mr-2" /> New Appointment
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Appointments List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-emerald-600" /> Recent Appointments
            </h2>
          </div>
          <div className="space-y-4">
            {appointments.length === 0 ? (
              <div className="p-12 glass-card text-center text-slate-500">
                No appointments found. Book your first consultation today!
              </div>
            ) : (
              appointments.map((appt) => (
                <div key={appt.id} className="p-6 glass-card flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900">{appt.department}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(appt.status)}`}>
                        {appt.status}
                      </span>
                    </div>
                    <div className="flex items-center text-sm text-slate-500 space-x-4">
                      <span className="flex items-center"><Calendar className="w-4 h-4 mr-1" /> {appt.date}</span>
                      <span className="flex items-center"><Clock className="w-4 h-4 mr-1" /> {appt.time}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Reports & Upload */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-900 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-emerald-600" /> Project Reports
          </h2>
          <div className="glass-card p-6 space-y-6">
            <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl text-center space-y-2">
              <Upload className="w-8 h-8 mx-auto text-slate-400" />
              <p className="text-sm text-slate-600">Upload new report (PDF/DOC)</p>
              <button className="text-xs font-bold text-emerald-600 hover:underline">Select File</button>
            </div>
            <div className="space-y-4">
              {reports.length === 0 ? (
                <p className="text-sm text-slate-500 text-center">No reports uploaded yet.</p>
              ) : (
                reports.map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-emerald-600" />
                      <span className="text-sm font-medium text-slate-700 truncate max-w-[120px]">{report.fileName}</span>
                    </div>
                    <button className="p-1 text-slate-400 hover:text-emerald-600">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const BookAppointment = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    department: searchParams.get('dept') || 'hvac',
    date: '',
    time: '',
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'appointments'), {
        ...formData,
        userId: user.uid,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      navigate('/dashboard');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'appointments');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pt-32 pb-24 max-w-2xl mx-auto px-4">
      <div className="glass-card p-8 space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-900">Book Consultation</h2>
          <p className="text-slate-500 mt-2">Schedule a meeting with our engineering experts.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
            <select
              className="input-field"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            >
              <option value="hvac">HVAC & Refrigeration</option>
              <option value="mechanical">Mechanical & Fluid Systems</option>
              <option value="civil">Civil & Finishes</option>
              <option value="electrical">Electrical Engineering</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
              <input
                type="date"
                required
                className="input-field"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Preferred Time</label>
              <input
                type="time"
                required
                className="input-field"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Project Description</label>
            <textarea
              rows={4}
              className="input-field"
              placeholder="Tell us about your project requirements..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
            {isSubmitting ? 'Booking...' : 'Confirm Appointment'}
          </button>
        </form>
      </div>
    </div>
  );
};

const AdminPanel = () => {
  const { isAdmin } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<UserProfile[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [clientToDelete, setClientToDelete] = useState<UserProfile | null>(null);
  const [selectedAppt, setSelectedAppt] = useState<any | null>(null);

  useEffect(() => {
    if (!isAdmin) return;

    const unsubAppts = onSnapshot(query(collection(db, 'appointments'), orderBy('createdAt', 'desc')), (snapshot) => {
      setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'appointments');
    });

    const unsubClients = onSnapshot(collection(db, 'users'), (snapshot) => {
      setClients(snapshot.docs.map(doc => ({ ...doc.data() } as UserProfile)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    return () => {
      unsubAppts();
      unsubClients();
    };
  }, [isAdmin]);

  const updateStatus = async (id: string, status: string) => {
    await updateDoc(doc(db, 'appointments', id), { status });
  };

  const deleteClient = async (uid: string) => {
    try {
      // Delete user document
      await deleteDoc(doc(db, 'users', uid));
      
      // Delete associated appointments
      const apptsQuery = query(collection(db, 'appointments'), where('userId', '==', uid));
      const apptsSnap = await getDocs(apptsQuery);
      await Promise.all(apptsSnap.docs.map(d => deleteDoc(d.ref)));
      
      // Delete associated reports
      const reportsQuery = query(collection(db, 'reports'), where('userId', '==', uid));
      const reportsSnap = await getDocs(reportsQuery);
      await Promise.all(reportsSnap.docs.map(d => deleteDoc(d.ref)));
      
      setClientToDelete(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'users');
    }
  };

  const updateRole = async (uid: string, role: 'admin' | 'client') => {
    try {
      await updateDoc(doc(db, 'users', uid), { role });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'users');
    }
  };

  if (!isAdmin) return <Navigate to="/" />;
  if (loading) return <div className="pt-32 text-center">Loading Admin Panel...</div>;

  const filteredAppts = (filter === 'all' ? appointments : appointments.filter(a => a.status === filter)).map(appt => {
    const client = clients.find(c => c.uid === appt.userId);
    return {
      ...appt,
      userName: client?.name || 'Unknown',
      userEmail: client?.email || 'No email'
    };
  });

  return (
    <div className="pt-32 pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Admin Control Panel</h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2">
            <Filter className="w-4 h-4 mr-2 text-slate-400" />
            <select 
              className="bg-transparent text-sm font-medium outline-none"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-card p-6 text-center">
          <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Total Clients</p>
          <p className="text-4xl font-bold text-emerald-600 mt-2">{clients.length}</p>
        </div>
        <div className="glass-card p-6 text-center">
          <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Pending Appts</p>
          <p className="text-4xl font-bold text-amber-500 mt-2">{appointments.filter(a => a.status === 'pending').length}</p>
        </div>
        <div className="glass-card p-6 text-center">
          <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Confirmed</p>
          <p className="text-4xl font-bold text-blue-500 mt-2">{appointments.filter(a => a.status === 'confirmed').length}</p>
        </div>
        <div className="glass-card p-6 text-center">
          <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Completed</p>
          <p className="text-4xl font-bold text-emerald-600 mt-2">{appointments.filter(a => a.status === 'completed').length}</p>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Department</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date/Time</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAppts.map((appt) => (
                <tr 
                  key={appt.id} 
                  className="hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => setSelectedAppt(appt)}
                >
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-slate-900">{appt.userName || 'Unknown'}</div>
                    <div className="text-xs text-slate-500">{appt.userEmail || 'No email'}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700">{appt.department}</td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-700">{appt.date}</div>
                    <div className="text-xs text-slate-500">{appt.time}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(appt.status)}`}>
                      {appt.status}
                    </span>
                  </td>
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <select
                      className={`text-[10px] font-bold uppercase tracking-wider border border-slate-200 rounded-lg px-2 py-1 outline-none transition-colors ${getStatusColor(appt.status)}`}
                      value={appt.status}
                      onChange={(e) => updateStatus(appt.id!, e.target.value)}
                    >
                      <option value="pending" className="bg-white text-slate-900">Pending</option>
                      <option value="confirmed" className="bg-white text-slate-900">Confirm</option>
                      <option value="completed" className="bg-white text-slate-900">Complete</option>
                      <option value="cancelled" className="bg-white text-slate-900">Cancel</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-bold text-slate-900 flex items-center">
          <FileText className="w-5 h-5 mr-2 text-emerald-600" /> User Management
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map(client => (
            <div key={client.uid} className="glass-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${client.role === 'admin' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    <UserIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 flex items-center">
                      {client.name}
                      {client.role === 'admin' && (
                        <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[8px] font-black uppercase rounded tracking-tighter">Admin</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">{client.email}</div>
                    <div className="mt-1 flex items-center text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                      <Calendar className="w-3 h-3 mr-1" />
                      {appointments.filter(a => a.userId === client.uid).length} Appointments
                    </div>
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Joined</span>
                  <span className="text-xs text-slate-600 font-medium">{new Date(client.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <select
                    className="text-[10px] font-bold uppercase tracking-wider border border-slate-200 rounded-lg px-2 py-1 outline-none transition-colors bg-white text-slate-600"
                    value={client.role}
                    onChange={(e) => updateRole(client.uid, e.target.value as 'admin' | 'client')}
                    disabled={client.email === 'mjshsict@gmail.com'} // Prevent self-demotion of primary admin
                  >
                    <option value="client">Client</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button 
                    onClick={() => setClientToDelete(client)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    disabled={client.email === 'mjshsict@gmail.com'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {clientToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl space-y-6"
            >
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600 mx-auto">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">Delete Client?</h3>
                <p className="text-slate-600">
                  Are you sure you want to delete <span className="font-bold">{clientToDelete.name}</span>? 
                  This action cannot be undone and will delete all associated appointments and reports.
                </p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setClientToDelete(null)}
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteClient(clientToDelete.uid)}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {selectedAppt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl space-y-6 overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">Appointment Details</h3>
                  <p className="text-slate-500">Full consultation information</p>
                </div>
                <button 
                  onClick={() => setSelectedAppt(null)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Client Name</p>
                  <p className="text-slate-900 font-medium">{selectedAppt.userName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Client Email</p>
                  <p className="text-slate-900 font-medium">{selectedAppt.userEmail}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Department</p>
                  <p className="text-slate-900 font-medium">{selectedAppt.department}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status</p>
                  <div>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(selectedAppt.status)}`}>
                      {selectedAppt.status}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Date</p>
                  <p className="text-slate-900 font-medium flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-emerald-600" /> {selectedAppt.date}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Time</p>
                  <p className="text-slate-900 font-medium flex items-center">
                    <Clock className="w-4 h-4 mr-2 text-emerald-600" /> {selectedAppt.time}
                  </p>
                </div>
              </div>

              <div className="space-y-1 pt-4 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Project Description</p>
                <p className="text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl italic">
                  "{selectedAppt.description || 'No description provided.'}"
                </p>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => setSelectedAppt(null)}
                  className="btn-primary"
                >
                  Close Details
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const docRef = doc(db, 'users', u.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const logout = async () => {
    await signOut(auth);
  };

  const isAdmin = profile?.role === 'admin' || user?.email === 'mjshsict@gmail.com';

  return (
    <ErrorBoundary>
      <AuthContext.Provider value={{ user, profile, loading, isAdmin, logout }}>
        <Router>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-grow">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/departments" element={<DepartmentsPage />} />
                <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />
                <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" />} />
                <Route path="/book" element={user ? <BookAppointment /> : <Navigate to="/login" />} />
                <Route path="/admin" element={<AdminPanel />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </Router>
      </AuthContext.Provider>
    </ErrorBoundary>
  );
}
