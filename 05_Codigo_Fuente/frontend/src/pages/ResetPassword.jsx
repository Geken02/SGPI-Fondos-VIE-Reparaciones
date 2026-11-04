import Logo from '../components/Logo';
import ResetPasswordForm from '../components/ResetPasswordForm';
import '../styles/login.css';

const ResetPassword = () => {
  return (
    <div className="login-container">
      <div className="login-card">
        <Logo />
        <h1 className="login-title">Fondos VIE</h1>
        <p className="login-subtitle">Establecer nueva contraseña</p>
        <ResetPasswordForm />
      </div>
    </div>
  );
};

export default ResetPassword;