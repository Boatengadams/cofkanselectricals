import { useEffect, useRef, useState } from 'react';
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Phone, ArrowLeft, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Phone-number sign-in with SMS OTP via Firebase Auth.
 * Useful in Ghana where many users don't keep an email account.
 */
export function PhoneSignIn({ onDone }: { onDone?: () => void }) {
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    if (recaptchaRef.current) return;
    recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
    return () => { recaptchaRef.current?.clear(); recaptchaRef.current = null; };
  }, []);

  const normalised = phone.replace(/\s/g, '').replace(/^0/, '+233');

  const sendCode = async () => {
    if (!/^\+\d{10,15}$/.test(normalised)) {
      toast.error('Enter a valid phone (e.g. 024 123 4567).');
      return;
    }
    if (!recaptchaRef.current) return;
    setBusy(true);
    try {
      confirmationRef.current = await signInWithPhoneNumber(auth, normalised, recaptchaRef.current);
      setStep('code');
      toast.success(`Code sent to ${normalised}`);
    } catch (e: any) {
      toast.error(e?.message || 'Could not send SMS.');
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!confirmationRef.current) return;
    if (!/^\d{6}$/.test(code)) { toast.error('Code must be 6 digits.'); return; }
    setBusy(true);
    try {
      await confirmationRef.current.confirm(code);
      toast.success('Signed in.');
      onDone?.();
    } catch {
      toast.error('Invalid or expired code.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Secured by Firebase Phone Auth
      </div>

      {step === 'phone' ? (
        <>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Phone number</span>
            <div className="mt-1 flex items-center gap-2 px-4 py-3 bg-muted rounded-xl border-2 border-border focus-within:border-primary">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/[^\d\s+]/g, ''))}
                placeholder="024 123 4567"
                className="flex-1 bg-transparent focus:outline-none font-semibold"
              />
            </div>
          </label>
          <button
            onClick={sendCode}
            disabled={busy}
            className="w-full py-3 rounded-xl bg-foreground text-background font-bold disabled:opacity-50"
          >
            {busy ? 'Sending…' : 'Send code'}
          </button>
        </>
      ) : (
        <>
          <button onClick={() => setStep('phone')} className="text-xs font-bold text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> Change number
          </button>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">6-digit code</span>
            <input
              inputMode="numeric"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••••"
              className="mt-1 w-full text-center text-2xl tracking-[0.5em] font-mono font-bold px-4 py-3 bg-muted rounded-xl border-2 border-border focus:border-primary focus:outline-none"
            />
          </label>
          <button
            onClick={verify}
            disabled={busy}
            className="w-full py-3 rounded-xl bg-foreground text-background font-bold disabled:opacity-50"
          >
            {busy ? 'Verifying…' : 'Verify & sign in'}
          </button>
        </>
      )}

      <div id="recaptcha-container" />
    </div>
  );
}
