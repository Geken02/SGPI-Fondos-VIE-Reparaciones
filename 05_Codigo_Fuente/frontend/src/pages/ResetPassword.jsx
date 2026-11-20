import Logo from '../components/Logo';
import ResetPasswordForm from '../components/ResetPasswordForm';
import '../styles/login.css';
import SiglaVie from '../components/SiglaVie';

const ResetPassword = () => {
  return (
    <div className="login-container">
      <div className="login-card">
        <Logo />
        <h1 className="login-title">Fondos <SiglaVie /></h1>
        <p className="login-subtitle">Establecer nueva contraseña</p>
        <ResetPasswordForm />
      </div>
    </div>
  );
};

export default ResetPassword;