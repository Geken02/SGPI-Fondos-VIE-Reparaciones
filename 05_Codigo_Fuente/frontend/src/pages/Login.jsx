import Logo from '../components/Logo';
import LoginForm from '../components/LoginForm';
import '../styles/login.css';

const Login = () => {
  return (
    <div className="login-container">
      <div className="login-card">
        <Logo />
        <h1 className="login-title">Fondos VIE</h1>
        <p className="login-subtitle">Sistema de Gestión de Propuestas</p>
        <LoginForm />
      </div>
    </div>
  );
};

export default Login;