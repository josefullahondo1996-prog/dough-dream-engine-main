import { FormEvent, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, ChefHat, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/useAuth";

function getAuthErrorMessage(error: Error) {
  const message = error.message.toLowerCase();
  if (message.includes("invalid login credentials")) return "El correo o la contraseña no son correctos.";
  if (message.includes("email not confirmed")) return "Debes confirmar tu correo electrónico antes de iniciar sesión.";
  if (message.includes("user already registered")) return "Ya existe una cuenta con ese correo electrónico.";
  if (message.includes("password should be at least")) return "La contraseña debe tener al menos 6 caracteres.";
  if (message.includes("rate limit")) return "Demasiados intentos. Espera unos minutos y vuelve a intentar.";
  return "No se pudo completar la autenticación. Revisa los datos e inténtalo de nuevo.";
}

export default function Auth() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isRegistering, setIsRegistering] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const destination = (location.state as { from?: string } | null)?.from ?? "/";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    const result = isRegistering
      ? await signUp(email, password, fullName)
      : await signIn(email, password);

    setIsSubmitting(false);
    if (result.error) {
      setError(getAuthErrorMessage(result.error));
      return;
    }

    if (isRegistering && result.needsEmailConfirmation) {
      setMessage("Cuenta creada. Revisa tu correo para confirmar el acceso.");
      return;
    }

    navigate(destination, { replace: true });
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-lg">
            <ChefHat className="w-7 h-7 text-primary-foreground" />
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Dough Dream</p>
          <h1 className="text-3xl font-bold text-foreground mt-2">{isRegistering ? "Crea tu cuenta" : "Bienvenido de vuelta"}</h1>
          <p className="text-sm text-muted-foreground mt-2">Accede al panel operativo de tu restaurante</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 shadow-elevated space-y-4">
          {isRegistering && (
            <label htmlFor="full-name" className="block text-sm font-medium text-card-foreground">
              Nombre completo
              <input id="full-name" required value={fullName} onChange={(event) => setFullName(event.target.value)} className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-ring" />
            </label>
          )}
          <label htmlFor="email" className="block text-sm font-medium text-card-foreground">
            Correo electrónico
            <input id="email" required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-ring" />
          </label>
          <label htmlFor="password" className="block text-sm font-medium text-card-foreground">
            Contraseña
            <input id="password" required minLength={6} type="password" autoComplete={isRegistering ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-ring" />
          </label>

          {error && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          {message && <p role="status" className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">{message}</p>}

          <button disabled={isSubmitting} className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            {isRegistering ? "Registrarme" : "Iniciar sesión"}
          </button>
        </form>

        <button onClick={() => { setIsRegistering((value) => !value); setError(""); setMessage(""); }} className="w-full mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors">
          {isRegistering ? "¿Ya tienes una cuenta? Inicia sesión" : "¿Primera vez aquí? Crea una cuenta"}
        </button>
      </div>
    </main>
  );
}
