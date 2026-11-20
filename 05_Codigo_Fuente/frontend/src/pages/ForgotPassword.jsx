import Logo from '../components/Logo';
import ForgotPasswordForm from '../components/ForgotPasswordForm';
import '../styles/login.css';
import SiglaVie from '../components/SiglaVie';

const ForgotPassword = () => {
  return (
    <div className="login-container">
      <div className="login-card">
        <Logo />
        <h1 className="login-title">Fondos <SiglaVie /></h1>
        <p className="login-subtitle">Recuperación de contraseña</p>
        <ForgotPasswordForm />
      </div>
    </div>
  );
};

export default ForgotPassword;