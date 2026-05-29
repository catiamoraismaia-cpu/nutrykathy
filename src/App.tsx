import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './pages/Login';
import Cadastro from './pages/Cadastro';
import Dashboard from './pages/Dashboard';
import Layout from './components/Layout';
import PacientesListagem from './pages/PacientesListagem';
import PacientesCadastro from './pages/PacientesCadastro';
import PacientePerfil from './pages/PacientePerfil';
import PerfilNutricionista from './pages/PerfilNutricionista';
import Home from './pages/Home';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          
          {/* Rotas Protegidas com Menu Lateral Sidebar */}
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/pacientes" element={<PacientesListagem />} />
            <Route path="/pacientes/novo" element={<PacientesCadastro />} />
            <Route path="/pacientes/:id" element={<PacientePerfil />} />
            <Route path="/perfil" element={<PerfilNutricionista />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
