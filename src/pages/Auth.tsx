import { FormEvent, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, ChefHat, Loader2, Sparkles, Shield, Zap, BarChart3 } from "lucide-react";
import { useAuth } from "@/contexts/useAuth";

function getAuthErrorMessage(error: Error) {
  const message = error.message.toLowerCase();
  if (message.includes("invalid login credentials")) return "El correo o la contraseña no coinciden con una cuenta registrada.";
  if (message.includes("email not confirmed")) return "Debes confirmar tu correo electrónico antes de iniciar sesión.";
  if (message.includes("user already registered")) return "Ya existe una cuenta con ese correo electrónico.";
  if (message.includes("password should be at least")) return "La contraseña debe tener al menos 6 caracteres.";
  if (message.includes("rate limit")) return "Demasiados intentos. Espera unos minutos y vuelve a intentar.";
  return error.message || "No se pudo completar la autenticación. Revisa los datos e inténtalo de nuevo.";
}

const features = [
  { icon: Zap, title: "Tiempo real", desc: "Órdenes y KOT sincronizados al instante" },
  { icon: BarChart3, title: "Reportes", desc: "Análisis completo de ventas y stock" },
  { icon: Shield, title: "Seguro", desc: "Acceso por roles con datos cifrados" },
];

export default function Auth() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isRegistering, setIsRegistering] = useState(false);
  const [fullName, setFullName] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [businessType, setBusinessType] = useState("Pizzería");
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

    const finalRestName = restaurantName.trim() || `${businessType} de ${fullName.trim().split(" ")[0] || "Mi Negocio"}`;

    const result = isRegistering
      ? await signUp(email, password, fullName, finalRestName)
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
    <main className="min-h-screen flex">
      {/* ── Panel izquierdo: branding ── */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 40%, #16213e 70%, #0f3460 100%)",
        }}
      >
        {/* Orbs decorativos */}
        <div
          style={{
            position: "absolute", top: "-80px", right: "-80px",
            width: "360px", height: "360px", borderRadius: "50%",
            background: "radial-gradient(circle, rgba(251,146,60,0.25) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute", bottom: "60px", left: "-60px",
            width: "280px", height: "280px", borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg"
              style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}
            >
              <ChefHat className="w-6 h-6 text-white" />
            </div>
            <span className="text-white font-bold text-xl tracking-tight">GastroFlowPy</span>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative z-10 space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 mb-6">
              <Sparkles className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-orange-400 text-xs font-semibold tracking-wide uppercase">Sistema todo-en-uno</span>
            </div>
            <h2 className="text-4xl font-bold text-white leading-tight">
              Gestiona tu restaurante{" "}
              <span style={{ background: "linear-gradient(90deg, #f97316, #fb923c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                sin límites
              </span>
            </h2>
            <p className="text-slate-400 mt-4 text-base leading-relaxed">
              Desde el pedido hasta el cierre de caja — todo conectado, todo en tiempo real.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.3)" }}
                >
                  <Icon className="w-4 h-4 text-orange-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{title}</p>
                  <p className="text-slate-500 text-sm">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-slate-600 text-xs">
          © 2026 GastroFlowPy · Todos los derechos reservados
        </p>
      </div>

      {/* ── Panel derecho: formulario ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-[400px] space-y-8">

          {/* Logo mobile */}
          <div className="flex lg:hidden items-center gap-3 justify-center">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}
            >
              <ChefHat className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight text-foreground">GastroFlowPy</span>
          </div>

          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              {isRegistering ? "Crear cuenta" : "Iniciar sesión"}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              {isRegistering
                ? "Registra tu restaurante y empieza gratis."
                : "Accede a tu panel operativo."}
            </p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegistering && (
              <>
                <div className="space-y-1.5">
                  <label htmlFor="full-name" className="text-sm font-medium text-foreground">
                    Tu nombre y apellido *
                  </label>
                  <input
                    id="full-name"
                    required
                    placeholder="Juan Pérez"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="restaurant-name" className="text-sm font-medium text-foreground flex items-center justify-between">
                    <span>Nombre de tu Empresa / Restaurante *</span>
                    <span className="text-xs text-orange-500 font-normal">SaaS Privado</span>
                  </label>
                  <input
                    id="restaurant-name"
                    required
                    placeholder="Ej: Pizzería Roma, Smash Burger..."
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground block">
                    Rubro gastronómico principal
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    {["🍕 Pizzería", "🍔 Burger", "☕ Cafetería", "🍹 Bar", "🍣 Sushi", "🍽️ Restó"].map((cat) => (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => setBusinessType(cat.split(" ")[1])}
                        className={`py-1.5 px-2 rounded-lg border text-center transition-all ${
                          businessType === cat.split(" ")[1]
                            ? "border-orange-500 bg-orange-500/10 text-orange-600 dark:text-orange-400 font-semibold"
                            : "border-border bg-secondary/50 text-muted-foreground hover:bg-secondary"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Correo electrónico
              </label>
              <input
                id="email"
                required
                type="email"
                autoComplete="email"
                placeholder="tu@restaurante.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Contraseña
              </label>
              <input
                id="password"
                required
                minLength={6}
                type="password"
                autoComplete={isRegistering ? "new-password" : "current-password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
                <p role="alert" className="text-sm text-destructive">{error}</p>
              </div>
            )}
            {message && (
              <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">{message}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold text-white shadow-lg transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}
            >
              {isSubmitting
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <ArrowRight className="w-4 h-4" />}
              {isRegistering ? "Crear mi cuenta" : "Entrar al panel"}
            </button>
          </form>

          {/* Toggle */}
          <div className="text-center">
            <button
              onClick={() => { setIsRegistering((v) => !v); setError(""); setMessage(""); }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isRegistering ? (
                <>¿Ya tienes cuenta? <span className="font-semibold text-orange-500">Inicia sesión</span></>
              ) : (
                <>¿Aún no tienes cuenta? <span className="font-semibold text-orange-500">Regístrate gratis</span></>
              )}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
