import Logo from '../components/Logo';
import ForgotPasswordForm from '../components/ForgotPasswordForm';
import '../styles/login.css';

const ForgotPassword = () => {
  return (
    <div className="login-container">
      <div className="login-card">
        <Logo />
        <h1 className="login-title">Fondos VIE</h1>
        <p className="login-subtitle">Recuperación de contraseña</p>
        <ForgotPasswordForm />
      </div>
    </div>
  );
};

export default ForgotPassword;