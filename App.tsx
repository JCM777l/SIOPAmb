
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { HashRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { User, ActivityReport } from './types';
import { RANKS, PLATOONS, PLATOONS_INTEGRATED, PLATOONS_FORM, SCALE_TYPES, NUMERIC_OPTIONS_1_TO_10, SilverStar } from './constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import * as XLSX from 'xlsx';


// --- Authentication Context ---
const AuthContext = React.createContext<{
  currentUser: User | null;
  login: (user: User) => void;
  logout: () => void;
} | null>(null);

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('currentUser');
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const login = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout }}>
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
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Admin Login
    if (username.toLowerCase() === 'adm') {
      const adminPassword = localStorage.getItem('adminPassword') || 'adm';
      if (password === adminPassword) {
        const adminUser: User = { id: 'admin', username: 'adm', rank: 'Admin', platoon: 'Admin' };
        login(adminUser);
        navigate('/admin');
        return;
      }
    }

    // Regular User Login
    const users: User[] = JSON.parse(localStorage.getItem('users') || '[]');
    const storedPasswords = JSON.parse(localStorage.getItem('userPasswords') || '{}');
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());

    if (user && storedPasswords[user.id] === password) {
      login(user);
      navigate('/dashboard');
    } else {
      setError('Nome de usuário ou senha inválidos.');
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
        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-300">
          Entrar
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

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const username = formData.get('username') as string;
        const password = formData.get('password') as string;
        const rank = formData.get('rank') as string;
        const platoon = formData.get('platoon') as string;

        if (!username || !password || !rank || !platoon) {
            setError('Todos os campos são obrigatórios.');
            return;
        }

        const formatUsername = (name: string) => {
            return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
        };

        const formattedUsername = formatUsername(username);

        const users: User[] = JSON.parse(localStorage.getItem('users') || '[]');
        if (users.some(u => u.username.toLowerCase() === formattedUsername.toLowerCase())) {
            setError('Este nome de guerra já está em uso.');
            setSuccess('');
            return;
        }

        const newUser: User = {
            id: crypto.randomUUID(),
            username: formattedUsername,
            rank,
            platoon,
        };
        
        const storedPasswords = JSON.parse(localStorage.getItem('userPasswords') || '{}');
        storedPasswords[newUser.id] = password;

        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));
        localStorage.setItem('userPasswords', JSON.stringify(storedPasswords));

        setError('');
        setSuccess('Cadastro realizado com sucesso! Você será redirecionado para o login.');
        setTimeout(() => navigate('/'), 2000);
    };


    return (
        <div className="w-full max-w-lg bg-black/60 backdrop-blur-sm p-8 rounded-lg shadow-2xl border border-gray-700">
            <h1 className="text-3xl font-bold text-white text-center mb-6">Cadastro de Usuário</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <p className="text-red-400 text-center">{error}</p>}
                {success && <p className="text-green-400 text-center">{success}</p>}
                <Input label="Nome de Guerra" name="username" type="text" pattern="[A-Za-z\s]+" title="Apenas letras são permitidas" required />
                <Input label="Senha" name="password" type="password" required />
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
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-300">
                      Cadastrar
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

    const handleActivitySubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!currentUser || isSubmitting) return;
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);
        const report: ActivityReport = {
            id: crypto.randomUUID(),
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

        const reports: ActivityReport[] = JSON.parse(localStorage.getItem('activityReports') || '[]');
        reports.push(report);
        localStorage.setItem('activityReports', JSON.stringify(reports));

        setSubmitMessage('Atividade registrada com sucesso! Redirecionando para o login...');
        setTimeout(() => {
            logout();
            navigate('/');
        }, 2000);
    };

    const handleChangePassword = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');

        if (newPassword !== confirmPassword) {
            setPasswordError('As senhas não coincidem.');
            return;
        }
        if (newPassword.length < 4) {
            setPasswordError('A senha deve ter pelo menos 4 caracteres.');
            return;
        }
        if (!currentUser) {
            setPasswordError('Usuário não encontrado. Por favor, faça login novamente.');
            return;
        }

        const storedPasswords = JSON.parse(localStorage.getItem('userPasswords') || '{}');
        storedPasswords[currentUser.id] = newPassword;
        localStorage.setItem('userPasswords', JSON.stringify(storedPasswords));

        setPasswordSuccess('Senha alterada com sucesso! Você será redirecionado para fazer login.');
        setNewPassword('');
        setConfirmPassword('');

        setTimeout(() => {
            setIsChangingPassword(false);
            logout();
            navigate('/');
        }, 2500);
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
                        <Input label="Nova Senha" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
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
                        {/* Row 1 */}
                        <Select name="equipesIntegradas" label="Equipes Integradas"><option value="">Selecione</option>{PLATOONS_INTEGRATED.map(p => <option key={p} value={p}>{p}</option>)}</Select>
                        <Input name="numeroRso" label="Número do RSO" type="text" maxLength={6} pattern="\d{0,6}" title="Máximo 6 dígitos numéricos" />
                        <Select name="tipoEscala" label="Tipo de Escala"><option value="">Selecione</option>{SCALE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}</Select>
                        <Input name="tempoTrabalho" label="Tempo de Trabalho" type="number" step="0.1" max="999" />

                        {/* Row 2 */}
                        <Select name="pelotao" label="Pelotão"><option value="">Selecione</option>{PLATOONS_FORM.map(p => <option key={p} value={p}>{p}</option>)}</Select>
                        <Input name="encarregadoEquipe" label="Encarregado da Equipe" type="text" pattern="[A-Za-z\s]+" title="Apenas letras" />
                        <Input name="primeiroAuxiliar" label="1º Auxiliar" type="text" pattern="[A-Za-z\s]+" title="Apenas letras" />
                        <Input name="segundoAuxiliar" label="2º Auxiliar" type="text" pattern="[A-Za-z\s]+" title="Apenas letras" />

                        {/* Fiscalizações */}
                        <NumberSelect name="fiscalizacaoTCRA" label="Fiscalização de TCRA (un.)" />
                        <NumberSelect name="fiscalizacoesPatioMadeireiro" label="Fisc. Pátio Madeireiro (un.)" />
                        <NumberSelect name="fiscalizacoesUC" label="Fisc. UC (exceto RPPN) (un.)" />
                        <NumberSelect name="fiscalizacoesRPPN" label="Fisc. RPPN (un.)" />
                        <NumberSelect name="fiscalizacoesCriadorAmador" label="Fisc. Criador Amador (un.)" />
                        <NumberSelect name="fiscalizacoesCaca" label="Fisc. Caça (em AISPA) (un.)" />
                        <NumberSelect name="fiscalizacoesPesca" label="Fisc. Pesca (em AISPA) (un.)" />
                        <NumberSelect name="fiscalizacoesPiracema" label="Fisc. em Piracema (un.)" />
                        
                        {/* Ocorrências */}
                        <NumberSelect name="tva" label="TVA (un.)" />
                        <NumberSelect name="boPamb" label="BO/PAmb (un.)" />
                        <NumberSelect name="aia" label="AIA (un.)" />
                        <Input name="multaArbitrada" label="Multa Arbitrada (R$)" type="number" step="0.01" max="999.99" />
                        <NumberSelect name="areaAutuada" label="Área Autuada (ha)" />
                        <NumberSelect name="palmitoInNatura" label="Palmito in natura (un.)" />
                        <Input name="palmitoBeneficiado" label="Palmito beneficiado (kg)" type="number" step="0.01" max="999.99" />
                        <Input name="pescadoApreendido" label="Pescado Apreendido (kg)" type="number" step="0.01" max="999.99" />
                        
                        {/* Apreensões e Abordagens */}
                        <NumberSelect name="animaisApreendidos" label="Animais Apreendidos (un.)" />
                        <NumberSelect name="pessoasAbordadas" label="Pessoas Abordadas (un.)" />
                        <NumberSelect name="pessoasAutuadasAIA" label="Pessoas Autuadas em AIA (un.)" />
                        <NumberSelect name="pessoasPresas" label="Pessoas Presas (un.)" />
                        <NumberSelect name="pessoasForagidas" label="Foragidos Capturados (un.)" />
                        <NumberSelect name="armasFogoApreendidas" label="Armas de Fogo Apreendidas (un.)" />
                        <NumberSelect name="armasBrancasApreendidas" label="Armas Brancas Apreendidas (un.)" />
                        <NumberSelect name="municoesApreendidas" label="Munições Apreendidas (un.)" />
                        <Input name="entorpecentesApreendidos" label="Entorpecentes Apreendidos (kg)" type="number" step="0.01" max="999.99" />
                        
                        {/* Vistorias */}
                        <NumberSelect name="embarcacoesVistoriadas" label="Embarcações Vistoriadas (un.)" />
                        <NumberSelect name="embarcacoesApreendidas" label="Embarcações Apreendidas (un.)" />
                        <NumberSelect name="veiculosVistoriados" label="Veículos Vistoriados (un.)" />
                        <NumberSelect name="veiculosApreendidos" label="Veículos Apreendidos (un.)" />
                        <NumberSelect name="veiculosRecuperados" label="Veículos Recuperados (un.)" />

                        {/* Outros */}
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

        const allUsers: User[] = JSON.parse(localStorage.getItem('users') || '[]');
        if (!userToEdit && allUsers.some(u => u.username.toLowerCase() === username.toLowerCase())) {
            setError('Este nome de guerra já está em uso.');
            return;
        }

        const formattedUsername = username.charAt(0).toUpperCase() + username.slice(1).toLowerCase();

        const userData: User = {
            id: userToEdit?.id || crypto.randomUUID(),
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
            <Input label={`Senha ${userToEdit ? '(deixe em branco para não alterar)' : ''}`} name="password" type="password" />
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
    const [reports, setReports] = useState<ActivityReport[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [view, setView] = useState<'dashboard' | 'users'>('dashboard');
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isCreatingUser, setIsCreatingUser] = useState(false);
    const [deletingUser, setDeletingUser] = useState<User | null>(null);
    const [isChangingAdminPassword, setIsChangingAdminPassword] = useState(false);
    
    useEffect(() => {
        loadData();
    }, []);

    const loadData = useCallback(() => {
        const storedReports = JSON.parse(localStorage.getItem('activityReports') || '[]') as ActivityReport[];
        const storedUsers = JSON.parse(localStorage.getItem('users') || '[]') as User[];
        setReports(storedReports);
        setUsers(storedUsers);
    }, []);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            if (bstr) {
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws) as any[];
                
                const newReports: ActivityReport[] = data.map(row => ({...row, id: crypto.randomUUID()}));
                const allReports = [...reports, ...newReports];
                localStorage.setItem('activityReports', JSON.stringify(allReports));
                setReports(allReports);
                alert(`${data.length} registros importados com sucesso!`);
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleDownload = () => {
        const ws = XLSX.utils.json_to_sheet(reports);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Relatorios");
        XLSX.writeFile(wb, "relatorio_atividades.xlsx");
    };

    const handleSaveUser = (user: User, password?: string) => {
        const isNewUser = !users.some(u => u.id === user.id);
        let updatedUsers: User[];
        const storedPasswords = JSON.parse(localStorage.getItem('userPasswords') || '{}');

        if (isNewUser) {
            updatedUsers = [...users, user];
        } else {
            updatedUsers = users.map(u => (u.id === user.id ? user : u));
        }

        if (password) {
            storedPasswords[user.id] = password;
        }

        setUsers(updatedUsers);
        localStorage.setItem('users', JSON.stringify(updatedUsers));
        localStorage.setItem('userPasswords', JSON.stringify(storedPasswords));

        setIsCreatingUser(false);
        setEditingUser(null);
    };

    const handleDeleteUser = () => {
        if (!deletingUser) return;

        const updatedUsers = users.filter(u => u.id !== deletingUser.id);
        const updatedReports = reports.filter(r => r.userId !== deletingUser.id);
        const storedPasswords = JSON.parse(localStorage.getItem('userPasswords') || '{}');
        delete storedPasswords[deletingUser.id];

        setUsers(updatedUsers);
        setReports(updatedReports);
        localStorage.setItem('users', JSON.stringify(updatedUsers));
        localStorage.setItem('activityReports', JSON.stringify(updatedReports));
        localStorage.setItem('userPasswords', JSON.stringify(storedPasswords));

        setDeletingUser(null);
    };

    const handleChangeAdminPassword = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const newPassword = formData.get('newPassword') as string;
        const confirmPassword = formData.get('confirmPassword') as string;

        if (newPassword !== confirmPassword) {
            alert('As senhas não coincidem.');
            return;
        }
        if (newPassword.length < 4) {
             alert('A senha deve ter pelo menos 4 caracteres.');
            return;
        }

        localStorage.setItem('adminPassword', newPassword);
        setIsChangingAdminPassword(false);
        alert('Senha do administrador alterada com sucesso!');
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
            {deletingUser && (
                <Modal title="Confirmar Exclusão" onClose={() => setDeletingUser(null)}>
                    <p className="text-center text-gray-300">
                        Tem certeza que deseja excluir o usuário <strong>{deletingUser.username}</strong>?
                        <br />
                        Todos os seus registros de atividade também serão apagados.
                    </p>
                    <div className="flex items-center space-x-4 pt-6">
                        <button onClick={() => setDeletingUser(null)} className="w-full bg-gray-600 hover:bg-gray-700 font-bold py-2 px-4 rounded-md">Cancelar</button>
                        <button onClick={handleDeleteUser} className="w-full bg-red-600 hover:bg-red-700 font-bold py-2 px-4 rounded-md">Excluir</button>
                    </div>
                </Modal>
            )}
            {isChangingAdminPassword && (
                 <Modal title="Alterar Senha do Administrador" onClose={() => setIsChangingAdminPassword(false)}>
                    <form onSubmit={handleChangeAdminPassword} className="space-y-4">
                        <Input label="Nova Senha" name="newPassword" type="password" required />
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
                {view === 'dashboard' && (
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
                )}
                {view === 'users' && (
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
                                                <button onClick={() => setDeletingUser(user)} className="text-red-400 hover:text-red-300 font-semibold">Excluir</button>
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
    const { currentUser } = useAuth();
    const location = useLocation();

    // Redirect logic
    if (currentUser) {
        if (currentUser.username === 'adm' && location.pathname !== '/admin') {
            return <Navigate to="/admin" replace />;
        }
        if (currentUser.username !== 'adm' && (location.pathname === '/admin' || location.pathname === '/')) {
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
