import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { HashRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { User, ActivityReport } from './types';
import { RANKS, PLATOONS, PLATOONS_INTEGRATED, PLATOONS_FORM, SCALE_TYPES, NUMERIC_OPTIONS_1_TO_10, SilverStar } from './constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import * as XLSX from 'xlsx';
import { auth, db } from './firebase';
import { 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    updatePassword,
    AuthErrorCodes
} from 'firebase/auth';
import { doc, setDoc, getDoc, addDoc, collection, getDocs, query, where, writeBatch, updateDoc } from 'firebase/firestore';


// --- Authentication Context ---
const AuthContext = React.createContext<{
  currentUser: User | null;
  loading: boolean;
  logout: () => void;
} | null>(null);

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in, see docs for a list of available properties
        // https://firebase.google.com/docs/reference/js/firebase.User
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setCurrentUser({
            id: user.uid,
            username: userData.username,
            rank: userData.rank,
            platoon: userData.platoon,
          });
        } else if (user.email === 'adm@siopamb.com') { // Handle admin case
           setCurrentUser({ id: 'admin', username: 'adm', rank: 'Admin', platoon: 'Admin' });
        }
      } else {
        // User is signed out
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ currentUser, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// --- Main Layout Component ---
const Layout: React.FC<{children: React.ReactNode}> = ({ children }) => {
  return (
    <div 
      className="min-h-screen bg-center bg-fixed bg-cover bg-no-repeat text-white flex flex-col items-center justify-center p-4"
      style={{ 
          backgroundColor: '#080c1f',
          backgroundImage: `url('https://www.adepom.org.br/wp-content/uploads/2023/01/PMESP_logo.jpg')` 
      }}
    >
      <main className="w-full h-full flex flex-col items-center justify-center">
        {children}
      </main>
      <footer className="absolute bottom-4 right-4 text-white text-sm">
        <p className="font-bold italic">
          Developer: 1º Ten PM Jocemar <SilverStar /> <SilverStar />
        </p>
      </footer>
    </div>
  );
};

// --- Reusable Form Components ---
const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { label: string }>(({ label, ...props }, ref) => (
  <div className="w-full">
    <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
    <input
      {...props}
      ref={ref}
      className="w-full bg-gray-700/50 border border-gray-500 rounded-md p-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
    />
  </div>
));

const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: React.ReactNode }>(({ label, children, ...props }, ref) => (
    <div className="w-full">
        <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
        <select
            {...props}
            ref={ref}
            className="w-full bg-gray-700/50 border border-gray-500 rounded-md p-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
        >
            {children}
        </select>
    </div>
));

// --- Reusable Modal Component ---
const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md border border-gray-600 relative">
            <h2 className="text-2xl font-bold mb-6 text-white text-center">{title}</h2>
            <button onClick={onClose} className="absolute top-3 right-3 text-2xl text-gray-400 hover:text-white leading-none">&times;</button>
            <div>{children}</div>
        </div>
    </div>
);


// --- Page Components ---
const LoginPage = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        // Use a dummy domain for email-based auth
        const email = username.toLowerCase() === 'adm' 
            ? 'adm@siopamb.com'
            : `${username.toLowerCase()}@siopamb.com`;

        try {
            await signInWithEmailAndPassword(auth, email, password);
            // onAuthStateChanged will handle navigation
        } catch (err: any) {
            if (err.code === AuthErrorCodes.INVALID_PASSWORD || err.code === AuthErrorCodes.USER_DELETED) {
                setError('Nome de guerra ou senha inválidos.');
            } else {
                setError('Ocorreu um erro ao tentar fazer login.');
            }
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md bg-black/60 backdrop-blur-sm p-8 rounded-lg shadow-2xl border border-gray-700">
            <div className="text-center mb-6">
                <h1 className="text-3xl font-bold text-white">SIOPAmb</h1>
                <p className="text-gray-300">Sistema de Informações Operacionais do Policiamento Ambiental</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-6">
                {error && <p className="text-red-400 text-center">{error}</p>}
                <Input label="Nome de Guerra" type="text" value={username} onChange={e => setUsername(e.target.value)} required />
                <Input label="Senha" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-300 disabled:bg-gray-500">
                    {loading ? 'Entrando...' : 'Entrar'}
                </button>
                <button type="button" onClick={() => navigate('/signup')} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-300 mt-2">
                    Cadastre-se
                </button>
            </form>
        </div>
    );
};

const SignUpPage = () => {
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const username = formData.get('username') as string;
        const password = formData.get('password') as string;
        const rank = formData.get('rank') as string;
        const platoon = formData.get('platoon') as string;

        if (!username || !password || !rank || !platoon) {
            setError('Todos os campos são obrigatórios.');
            setLoading(false);
            return;
        }

        const formatUsername = (name: string) => {
            return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
        };
        const formattedUsername = formatUsername(username);
        const email = `${formattedUsername.toLowerCase()}@siopamb.com`;

        try {
            // Check if username already exists in Firestore
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("username", "==", formattedUsername));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                setError('Este nome de guerra já está em uso.');
                setLoading(false);
                return;
            }

            // Create user in Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Store additional user info in Firestore
            await setDoc(doc(db, "users", user.uid), {
                username: formattedUsername,
                rank,
                platoon,
            });

            setSuccess('Cadastro realizado com sucesso! Você será redirecionado para o login.');
            setTimeout(() => navigate('/'), 2000);

        } catch (err: any) {
            if (err.code === AuthErrorCodes.EMAIL_EXISTS) {
                 setError('Este nome de guerra já está em uso.');
            } else if (err.code === AuthErrorCodes.WEAK_PASSWORD) {
                setError('A senha deve ter pelo menos 6 caracteres.');
            } else {
                setError('Ocorreu um erro ao criar a conta.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-lg bg-black/60 backdrop-blur-sm p-8 rounded-lg shadow-2xl border border-gray-700">
            <h1 className="text-3xl font-bold text-white text-center mb-6">Cadastro de Usuário</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <p className="text-red-400 text-center">{error}</p>}
                {success && <p className="text-green-400 text-center">{success}</p>}
                <Input label="Nome de Guerra" name="username" type="text" pattern="[A-Za-z\s]+" title="Apenas letras são permitidas" required />
                <Input label="Senha (mínimo 6 caracteres)" name="password" type="password" required />
                <Select label="Graduação/Posto" name="rank" required>
                    <option value="">Selecione...</option>
                    {RANKS.map(r => <option key={r} value={r}>{r}</option>)}
                </Select>
                <Select label="Pelotão" name="platoon" required>
                    <option value="">Selecione...</option>
                    {PLATOONS.map(p => <option key={p} value={p}>{p}</option>)}
                </Select>
                <div className="flex items-center space-x-4 pt-4">
                    <button type="button" onClick={() => navigate('/')} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-300">
                      Voltar
                    </button>
                    <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-300 disabled:bg-gray-500">
                      {loading ? 'Cadastrando...' : 'Cadastrar'}
                    </button>
                </div>
            </form>
        </div>
    );
};

const UserDashboard = () => {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();
    
    // --- State Management ---
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitMessage, setSubmitMessage] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');

    const handleActivitySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!currentUser || isSubmitting) return;
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);
        const reportData = {
            userId: currentUser.id,
            submittedBy: currentUser.username,
            submittedAt: new Date().toISOString(),
            equipesIntegradas: formData.get('equipesIntegradas') as string,
            numeroRso: formData.get('numeroRso') as string,
            tipoEscala: formData.get('tipoEscala') as string,
            tempoTrabalho: formData.get('tempoTrabalho') as string,
            pelotao: formData.get('pelotao') as string,
            encarregadoEquipe: formData.get('encarregadoEquipe') as string,
            primeiroAuxiliar: formData.get('primeiroAuxiliar') as string,
            segundoAuxiliar: formData.get('segundoAuxiliar') as string,
            fiscalizacaoTCRA: Number(formData.get('fiscalizacaoTCRA')),
            fiscalizacoesPatioMadeireiro: Number(formData.get('fiscalizacoesPatioMadeireiro')),
            fiscalizacoesUC: Number(formData.get('fiscalizacoesUC')),
            fiscalizacoesRPPN: Number(formData.get('fiscalizacoesRPPN')),
            fiscalizacoesCriadorAmador: Number(formData.get('fiscalizacoesCriadorAmador')),
            fiscalizacoesCaca: Number(formData.get('fiscalizacoesCaca')),
            fiscalizacoesPesca: Number(formData.get('fiscalizacoesPesca')),
            fiscalizacoesPiracema: Number(formData.get('fiscalizacoesPiracema')),
            tva: Number(formData.get('tva')),
            boPamb: Number(formData.get('boPamb')),
            aia: Number(formData.get('aia')),
            multaArbitrada: formData.get('multaArbitrada') as string,
            areaAutuada: Number(formData.get('areaAutuada')),
            palmitoInNatura: Number(formData.get('palmitoInNatura')),
            palmitoBeneficiado: formData.get('palmitoBeneficiado') as string,
            pescadoApreendido: formData.get('pescadoApreendido') as string,
            animaisApreendidos: Number(formData.get('animaisApreendidos')),
            pessoasAbordadas: Number(formData.get('pessoasAbordadas')),
            pessoasAutuadasAIA: Number(formData.get('pessoasAutuadasAIA')),
            pessoasPresas: Number(formData.get('pessoasPresas')),
            pessoasForagidas: Number(formData.get('pessoasForagidas')),
            armasFogoApreendidas: Number(formData.get('armasFogoApreendidas')),
            armasBrancasApreendidas: Number(formData.get('armasBrancasApreendidas')),
            municoesApreendidas: Number(formData.get('municoesApreendidas')),
            entorpecentesApreendidos: formData.get('entorpecentesApreendidos') as string,
            embarcacoesVistoriadas: Number(formData.get('embarcacoesVistoriadas')),
            embarcacoesApreendidas: Number(formData.get('embarcacoesApreendidas')),
            veiculosVistoriados: Number(formData.get('veiculosVistoriados')),
            veiculosApreendidos: Number(formData.get('veiculosApreendidos')),
            veiculosRecuperados: Number(formData.get('veiculosRecuperados')),
            horasPoliciamentoNautico: formData.get('horasPoliciamentoNautico') as string,
        };

        try {
            await addDoc(collection(db, "reports"), reportData);
            setSubmitMessage('Atividade registrada com sucesso! Redirecionando para o login...');
            setTimeout(() => {
                logout();
                navigate('/');
            }, 2000);
        } catch (error) {
            setSubmitMessage('Falha ao registrar atividade. Tente novamente.');
            setIsSubmitting(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');

        if (newPassword !== confirmPassword) {
            setPasswordError('As senhas não coincidem.');
            return;
        }
        if (newPassword.length < 6) {
            setPasswordError('A senha deve ter pelo menos 6 caracteres.');
            return;
        }
        if (!auth.currentUser) {
            setPasswordError('Usuário não encontrado. Por favor, faça login novamente.');
            return;
        }
        
        try {
            await updatePassword(auth.currentUser, newPassword);
            setPasswordSuccess('Senha alterada com sucesso! Você será redirecionado para fazer login.');
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(() => {
                setIsChangingPassword(false);
                logout();
                navigate('/');
            }, 2500);
        } catch (error: any) {
            // Re-authentication might be required for this operation.
            // For simplicity, we just show an error.
            setPasswordError('Erro ao alterar a senha. Tente fazer logout e login novamente.');
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const NumberSelect: React.FC<{name: string, label: string}> = ({name, label}) => (
        <Select label={label} name={name} defaultValue={0}>
            <option value="0">0</option>
            {NUMERIC_OPTIONS_1_TO_10.map(n => <option key={n} value={n}>{n}</option>)}
        </Select>
    );

    return (
        <div className="w-full max-w-6xl bg-black/70 backdrop-blur-sm p-8 rounded-lg shadow-2xl border border-gray-700 max-h-[90vh] flex flex-col">
            {isChangingPassword && (
                <Modal title="Alterar sua Senha" onClose={() => setIsChangingPassword(false)}>
                    <form onSubmit={handleChangePassword} className="space-y-4">
                        {passwordError && <p className="text-red-400 text-center">{passwordError}</p>}
                        {passwordSuccess && <p className="text-green-400 text-center">{passwordSuccess}</p>}
                        <Input label="Nova Senha (mínimo 6 caracteres)" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                        <Input label="Confirmar Nova Senha" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-300 mt-2">
                            Salvar Nova Senha
                        </button>
                    </form>
                </Modal>
            )}

            <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <h1 className="text-3xl font-bold text-white">Painel do Policial</h1>
                <div className="flex items-center space-x-4">
                    <span className="text-gray-300">Olá, {currentUser?.rank} {currentUser?.username}</span>
                    <button onClick={() => setIsChangingPassword(true)} className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-300">
                        Alterar Senha
                    </button>
                    <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-300">
                        Sair
                    </button>
                </div>
            </div>

            <div className="flex-grow overflow-y-auto pr-4 -mr-4">
                {submitMessage ? 
                    <div className="flex items-center justify-center h-full">
                        <p className="bg-green-600 text-white p-4 rounded-md text-center">{submitMessage}</p>
                    </div>
                    :
                    <form onSubmit={handleActivitySubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                         {/* Fields remain the same */}
                        <Select name="equipesIntegradas" label="Equipes Integradas"><option value="">Selecione</option>{PLATOONS_INTEGRATED.map(p => <option key={p} value={p}>{p}</option>)}</Select>
                        <Input name="numeroRso" label="Número do RSO" type="text" maxLength={6} pattern="\d{0,6}" title="Máximo 6 dígitos numéricos" />
                        <Select name="tipoEscala" label="Tipo de Escala"><option value="">Selecione</option>{SCALE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}</Select>
                        <Input name="tempoTrabalho" label="Tempo de Trabalho" type="number" step="0.1" max="999" />
                        <Select name="pelotao" label="Pelotão"><option value="">Selecione</option>{PLATOONS_FORM.map(p => <option key={p} value={p}>{p}</option>)}</Select>
                        <Input name="encarregadoEquipe" label="Encarregado da Equipe" type="text" pattern="[A-Za-z\s]+" title="Apenas letras" />
                        <Input name="primeiroAuxiliar" label="1º Auxiliar" type="text" pattern="[A-Za-z\s]+" title="Apenas letras" />
                        <Input name="segundoAuxiliar" label="2º Auxiliar" type="text" pattern="[A-Za-z\s]+" title="Apenas letras" />
                        <NumberSelect name="fiscalizacaoTCRA" label="Fiscalização de TCRA (un.)" />
                        <NumberSelect name="fiscalizacoesPatioMadeireiro" label="Fisc. Pátio Madeireiro (un.)" />
                        <NumberSelect name="fiscalizacoesUC" label="Fisc. UC (exceto RPPN) (un.)" />
                        <NumberSelect name="fiscalizacoesRPPN" label="Fisc. RPPN (un.)" />
                        <NumberSelect name="fiscalizacoesCriadorAmador" label="Fisc. Criador Amador (un.)" />
                        <NumberSelect name="fiscalizacoesCaca" label="Fisc. Caça (em AISPA) (un.)" />
                        <NumberSelect name="fiscalizacoesPesca" label="Fisc. Pesca (em AISPA) (un.)" />
                        <NumberSelect name="fiscalizacoesPiracema" label="Fisc. em Piracema (un.)" />
                        <NumberSelect name="tva" label="TVA (un.)" />
                        <NumberSelect name="boPamb" label="BO/PAmb (un.)" />
                        <NumberSelect name="aia" label="AIA (un.)" />
                        <Input name="multaArbitrada" label="Multa Arbitrada (R$)" type="number" step="0.01" max="999.99" />
                        <NumberSelect name="areaAutuada" label="Área Autuada (ha)" />
                        <NumberSelect name="palmitoInNatura" label="Palmito in natura (un.)" />
                        <Input name="palmitoBeneficiado" label="Palmito beneficiado (kg)" type="number" step="0.01" max="999.99" />
                        <Input name="pescadoApreendido" label="Pescado Apreendido (kg)" type="number" step="0.01" max="999.99" />
                        <NumberSelect name="animaisApreendidos" label="Animais Apreendidos (un.)" />
                        <NumberSelect name="pessoasAbordadas" label="Pessoas Abordadas (un.)" />
                        <NumberSelect name="pessoasAutuadasAIA" label="Pessoas Autuadas em AIA (un.)" />
                        <NumberSelect name="pessoasPresas" label="Pessoas Presas (un.)" />
                        <NumberSelect name="pessoasForagidas" label="Foragidos Capturados (un.)" />
                        <NumberSelect name="armasFogoApreendidas" label="Armas de Fogo Apreendidas (un.)" />
                        <NumberSelect name="armasBrancasApreendidas" label="Armas Brancas Apreendidas (un.)" />
                        <NumberSelect name="municoesApreendidas" label="Munições Apreendidas (un.)" />
                        <Input name="entorpecentesApreendidos" label="Entorpecentes Apreendidos (kg)" type="number" step="0.01" max="999.99" />
                        <NumberSelect name="embarcacoesVistoriadas" label="Embarcações Vistoriadas (un.)" />
                        <NumberSelect name="embarcacoesApreendidas" label="Embarcações Apreendidas (un.)" />
                        <NumberSelect name="veiculosVistoriados" label="Veículos Vistoriados (un.)" />
                        <NumberSelect name="veiculosApreendidos" label="Veículos Apreendidos (un.)" />
                        <NumberSelect name="veiculosRecuperados" label="Veículos Recuperados (un.)" />
                        <div className="lg:col-span-3">
                            <Input name="horasPoliciamentoNautico" label="Horas de Policiamento Náutico" type="number" step="0.1" max="999.9" />
                        </div>
                        
                        <div className="lg:col-span-4 flex justify-end mt-4">
                            <button type="submit" disabled={isSubmitting} className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-md transition-colors duration-300 disabled:bg-gray-500">
                                {isSubmitting ? 'Enviando...' : 'Registrar Atividade'}
                            </button>
                        </div>
                    </form>
                }
            </div>
        </div>
    );
};

// --- Admin Dashboard & User Management ---
const UserForm: React.FC<{
    userToEdit?: User | null;
    onSave: (user: User, password?: string) => void;
    onCancel: () => void;
}> = ({ userToEdit, onSave, onCancel }) => {
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const username = formData.get('username') as string;
        const password = formData.get('password') as string;
        const rank = formData.get('rank') as string;
        const platoon = formData.get('platoon') as string;

        if (!userToEdit && (!username || !password)) {
            setError('Nome de guerra e senha são obrigatórios para novos usuários.');
            return;
        }

        const formattedUsername = username.charAt(0).toUpperCase() + username.slice(1).toLowerCase();

        const userData: User = {
            id: userToEdit?.id || '', // ID will be set on creation
            username: userToEdit ? userToEdit.username : formattedUsername,
            rank,
            platoon,
        };

        onSave(userData, password || undefined);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-red-400 text-center mb-2">{error}</p>}
            <Input label="Nome de Guerra" name="username" type="text" defaultValue={userToEdit?.username} disabled={!!userToEdit} required />
             {!userToEdit && (
                <Input label="Senha (mínimo 6 caracteres)" name="password" type="password" required />
            )}
            <Select label="Graduação/Posto" name="rank" defaultValue={userToEdit?.rank} required>
                {RANKS.map(r => <option key={r} value={r}>{r}</option>)}
            </Select>
            <Select label="Pelotão" name="platoon" defaultValue={userToEdit?.platoon} required>
                {PLATOONS.map(p => <option key={p} value={p}>{p}</option>)}
            </Select>
            <div className="flex items-center space-x-4 pt-4">
                <button type="button" onClick={onCancel} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md">Cancelar</button>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md">Salvar</button>
            </div>
        </form>
    );
};


const AdminDashboard = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [reports, setReports] = useState<(ActivityReport & {id: string})[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [view, setView] = useState<'dashboard' | 'users'>('dashboard');
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isCreatingUser, setIsCreatingUser] = useState(false);
    const [isChangingAdminPassword, setIsChangingAdminPassword] = useState(false);
    const [loadingData, setLoadingData] = useState(true);
    
    const loadData = useCallback(async () => {
        setLoadingData(true);
        const reportsQuerySnapshot = await getDocs(collection(db, "reports"));
        const reportsData = reportsQuerySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as (ActivityReport & {id: string})[];
        
        const usersQuerySnapshot = await getDocs(collection(db, "users"));
        const usersData = usersQuerySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as User[];
        
        setReports(reportsData);
        setUsers(usersData);
        setLoadingData(false);
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);


    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        // This function would need significant changes to map excel columns to the new data structure
        // and handle potential duplicates. For now, it's kept as a placeholder.
        alert("A importação de XLS foi desativada temporariamente na migração para o Firebase.");
    };

    const handleDownload = () => {
        const ws = XLSX.utils.json_to_sheet(reports);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Relatorios");
        XLSX.writeFile(wb, "relatorio_atividades.xlsx");
    };

    const handleSaveUser = async (userData: User, password?: string) => {
        const isNewUser = !editingUser;

        if (isNewUser) {
            // Create new user
            if (!password) {
                alert("Senha é obrigatória para novos usuários.");
                return;
            }
            try {
                // We must create the auth user first
                 const userCredential = await createUserWithEmailAndPassword(auth, `${userData.username.toLowerCase()}@siopamb.com`, password);
                 // Then save their data in firestore
                 await setDoc(doc(db, "users", userCredential.user.uid), {
                    username: userData.username,
                    rank: userData.rank,
                    platoon: userData.platoon
                 });
            } catch (error: any) {
                if (error.code === AuthErrorCodes.EMAIL_EXISTS) {
                    alert("Este nome de guerra já está em uso.");
                } else {
                    alert("Erro ao criar usuário.");
                }
            }
        } else {
            // Update existing user
            if (editingUser) {
                 const userDocRef = doc(db, 'users', editingUser.id);
                 await updateDoc(userDocRef, {
                    rank: userData.rank,
                    platoon: userData.platoon,
                 });
            }
        }

        setIsCreatingUser(false);
        setEditingUser(null);
        await loadData(); // Reload data to show changes
    };


    const handleChangeAdminPassword = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const newPassword = formData.get('newPassword') as string;
        const confirmPassword = formData.get('confirmPassword') as string;

        if (newPassword !== confirmPassword) {
            alert('As senhas não coincidem.');
            return;
        }
        if (newPassword.length < 6) {
             alert('A senha deve ter pelo menos 6 caracteres.');
            return;
        }
        
        if (auth.currentUser) {
            try {
                await updatePassword(auth.currentUser, newPassword);
                alert('Senha do administrador alterada com sucesso!');
                setIsChangingAdminPassword(false);
            } catch (error) {
                alert('Erro ao alterar senha. Tente fazer logout e login novamente.');
            }
        }
    };


    const chartData = useMemo(() => {
        const dataByPlatoon: {[key: string]: number} = {};
        PLATOONS_INTEGRATED.forEach(p => dataByPlatoon[p] = 0);
        
        reports.forEach(r => {
            if (dataByPlatoon[r.equipesIntegradas] !== undefined) {
                dataByPlatoon[r.equipesIntegradas]++;
            }
        });

        const scaleTypeData: {[key: string]: number} = {};
        SCALE_TYPES.forEach(s => scaleTypeData[s] = 0);
        reports.forEach(r => {
            if (scaleTypeData[r.tipoEscala] !== undefined) {
                scaleTypeData[r.tipoEscala]++;
            }
        });

        return {
            platoon: Object.entries(dataByPlatoon).map(([name, value]) => ({ name, value })),
            scaleType: Object.entries(scaleTypeData).map(([name, value]) => ({ name, value }))
        };
    }, [reports]);

    const PIE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

    return (
        <div className="w-full max-w-7xl bg-black/70 backdrop-blur-sm p-6 rounded-lg shadow-2xl border border-gray-700 max-h-[90vh] flex flex-col">
            {isCreatingUser && (
                <Modal title="Criar Novo Usuário" onClose={() => setIsCreatingUser(false)}>
                    <UserForm onSave={handleSaveUser} onCancel={() => setIsCreatingUser(false)} />
                </Modal>
            )}
            {editingUser && (
                <Modal title="Editar Usuário" onClose={() => setEditingUser(null)}>
                    <UserForm userToEdit={editingUser} onSave={handleSaveUser} onCancel={() => setEditingUser(null)} />
                </Modal>
            )}
            {isChangingAdminPassword && (
                 <Modal title="Alterar Senha do Administrador" onClose={() => setIsChangingAdminPassword(false)}>
                    <form onSubmit={handleChangeAdminPassword} className="space-y-4">
                        <Input label="Nova Senha (mínimo 6 caracteres)" name="newPassword" type="password" required />
                        <Input label="Confirmar Nova Senha" name="confirmPassword" type="password" required />
                        <div className="flex items-center space-x-4 pt-4">
                            <button type="button" onClick={() => setIsChangingAdminPassword(false)} className="w-full bg-gray-600 hover:bg-gray-700 font-bold py-2 px-4 rounded-md">Cancelar</button>
                            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 font-bold py-2 px-4 rounded-md">Alterar</button>
                        </div>
                    </form>
                 </Modal>
            )}

            <div className="flex justify-between items-center mb-4 flex-shrink-0">
                <h1 className="text-3xl font-bold text-white">Painel do Administrador</h1>
                <div className="flex items-center space-x-2">
                     <button onClick={() => setIsChangingAdminPassword(true)} className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-300 text-sm">
                        Alterar Senha
                    </button>
                    <button onClick={() => { logout(); navigate('/'); }} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-300 text-sm">
                        Sair
                    </button>
                </div>
            </div>

            <div className="border-b border-gray-600 mb-4 flex-shrink-0">
                <nav className="flex space-x-4">
                    <button onClick={() => setView('dashboard')} className={`py-2 px-3 font-medium ${view === 'dashboard' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}>Dashboard</button>
                    <button onClick={() => setView('users')} className={`py-2 px-3 font-medium ${view === 'users' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}>Gerenciar Usuários</button>
                </nav>
            </div>
            
            <div className="flex-grow overflow-y-auto">
                 {loadingData ? <p className="text-center">Carregando dados...</p> : 
                    view === 'dashboard' ? (
                    <>
                         <div className="flex space-x-4 mb-6">
                            <label className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md cursor-pointer">
                                <span>Importar XLS</span>
                                <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} />
                            </label>
                            <button onClick={handleDownload} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md">
                                Baixar XLS
                            </button>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            <div className="bg-gray-800/50 p-4 rounded-lg">
                                <h2 className="text-xl font-semibold mb-2 text-center">Atividades por Pelotão</h2>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={chartData.platoon}>
                                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2}/>
                                        <XAxis dataKey="name" stroke="#9ca3af" />
                                        <YAxis stroke="#9ca3af" allowDecimals={false}/>
                                        <Tooltip contentStyle={{ backgroundColor: '#374151', border: 'none' }} />
                                        <Legend />
                                        <Bar dataKey="value" fill="#3b82f6" name="Nº Atividades" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="bg-gray-800/50 p-4 rounded-lg">
                                <h2 className="text-xl font-semibold mb-2 text-center">Distribuição por Tipo de Escala</h2>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie data={chartData.scaleType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                                            {chartData.scaleType.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ backgroundColor: '#374151', border: 'none' }} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-gray-800/50 p-4 rounded-lg">
                            <h2 className="text-xl font-semibold mb-4">Últimos Registros</h2>
                            <div className="overflow-x-auto max-h-96">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-700/50 sticky top-0">
                                        <tr>
                                            <th className="p-2">Data</th>
                                            <th className="p-2">Policial</th>
                                            <th className="p-2">RSO</th>
                                            <th className="p-2">Pelotão</th>
                                            <th className="p-2">BO/PAmb</th>
                                            <th className="p-2">Pessoas Abordadas</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reports.slice().reverse().map(r => (
                                            <tr key={r.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                                                <td className="p-2">{new Date(r.submittedAt).toLocaleString('pt-BR')}</td>
                                                <td className="p-2">{r.submittedBy}</td>
                                                <td className="p-2">{r.numeroRso}</td>
                                                <td className="p-2">{r.pelotao}</td>
                                                <td className="p-2 text-center">{r.boPamb}</td>
                                                <td className="p-2 text-center">{r.pessoasAbordadas}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="bg-gray-800/50 p-4 rounded-lg">
                        <div className="flex justify-between items-center mb-4">
                             <h2 className="text-xl font-semibold">Usuários Cadastrados ({users.length})</h2>
                             <button onClick={() => setIsCreatingUser(true)} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md">
                                Criar Novo Usuário
                             </button>
                        </div>
                        <div className="overflow-x-auto max-h-[60vh]">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-700/50 sticky top-0">
                                    <tr>
                                        <th className="p-3">Nome de Guerra</th>
                                        <th className="p-3">Posto/Grad.</th>
                                        <th className="p-3">Pelotão</th>
                                        <th className="p-3 text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(user => (
                                        <tr key={user.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                                            <td className="p-3">{user.username}</td>
                                            <td className="p-3">{user.rank}</td>
                                            <td className="p-3">{user.platoon}</td>
                                            <td className="p-3 text-center">
                                                <button onClick={() => setEditingUser(user)} className="text-blue-400 hover:text-blue-300 font-semibold mr-4">Editar</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};


// --- App Router ---
const AppRouter = () => {
    const { currentUser, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <Layout>
                <div className="text-white text-2xl">Carregando...</div>
            </Layout>
        );
    }
    
    if (currentUser) {
        if (currentUser.username === 'adm' && location.pathname !== '/admin') {
            return <Navigate to="/admin" replace />;
        }
        if (currentUser.username !== 'adm' && (location.pathname === '/admin' || location.pathname === '/' || location.pathname === '/signup')) {
            return <Navigate to="/dashboard" replace />;
        }
    } else {
        if (location.pathname !== '/' && location.pathname !== '/signup') {
            return <Navigate to="/" replace />;
        }
    }

    return (
        <Layout>
            <Routes>
                <Route path="/" element={<LoginPage />} />
                <Route path="/signup" element={<SignUpPage />} />
                <Route path="/dashboard" element={<UserDashboard />} />
                <Route path="/admin" element={<AdminDashboard />} />
            </Routes>
        </Layout>
    );
}

// --- Main App Component ---
export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <AppRouter />
      </HashRouter>
    </AuthProvider>
  );
}
