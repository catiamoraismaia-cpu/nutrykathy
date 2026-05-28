import { Link } from 'react-router-dom';
import { LogIn, UserPlus, FileText, CheckCircle, Sparkles } from 'lucide-react';

export default function Home() {
  return (
    <div className="home-container animate-fade-in">
      {/* Lado Esquerdo: Imagem */}
      <div className="home-hero-image">
        <img 
          src="/healthy_food_table.png" 
          alt="Mesa com alimentos saudáveis" 
          className="hero-img"
        />
        <div className="hero-overlay">
          <div className="hero-quote">
            <Sparkles className="hero-quote-icon" size={24} style={{ color: 'var(--color-primary-light)' }} />
            <p>"Que seu alimento seja seu medicamento, e que seu medicamento seja seu alimento."</p>
            <span>— Hipócrates</span>
          </div>
        </div>
      </div>

      {/* Lado Direito: Conteúdo de Apresentação */}
      <div className="home-content">
        <div className="home-header">
          <div className="home-logo">
            <FileText size={28} className="logo-icon" style={{ color: 'var(--color-primary)' }} />
            <span className="logo-text">Nutri Kathy</span>
          </div>
        </div>

        <div className="home-body">
          <h1 className="home-title">
            Simplifique sua gestão <span>nutricional</span>
          </h1>
          <p className="home-subtitle">
            A plataforma definitiva para nutricionistas acompanharem a evolução de pacientes, criarem planos alimentares estruturados com precisão e gerenciarem consultas com facilidade.
          </p>

          <div className="home-features">
            <div className="feature-item">
              <CheckCircle className="feature-icon" size={18} style={{ color: 'var(--color-primary)' }} />
              <span>Criação manual e dinâmica de planos alimentares</span>
            </div>
            <div className="feature-item">
              <CheckCircle className="feature-icon" size={18} style={{ color: 'var(--color-primary)' }} />
              <span>Acompanhamento clínico e evolução biométrica do peso</span>
            </div>
            <div className="feature-item">
              <CheckCircle className="feature-icon" size={18} style={{ color: 'var(--color-primary)' }} />
              <span>Prontuário completo, hábitos e rotinas detalhadas</span>
            </div>
          </div>

          <div className="home-actions">
            <Link to="/login" className="btn-action btn-home-primary">
              <LogIn size={18} />
              Acessar o Sistema
            </Link>
            <Link to="/cadastro" className="btn-secondary btn-home-secondary">
              <UserPlus size={18} />
              Criar Conta Grátis
            </Link>
          </div>


        </div>

        <div className="home-footer">
          <p>&copy; {new Date().getFullYear()} Nutri Kathy. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  );
}
