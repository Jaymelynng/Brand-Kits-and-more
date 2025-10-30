import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const Auth = () => {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });
  }, [navigate]);

  const handlePinComplete = async (value: string) => {
    if (value.length !== 4 || loading) return;

    setLoading(true);

    try {
      // Call the verify-pin edge function
      const { data, error } = await supabase.functions.invoke('verify-pin', {
        body: { pin: value },
      });

      if (error) {
        console.error('Edge function error:', error);
        toast({
          title: "Access Denied",
          description: "Invalid PIN. Please try again.",
          variant: "destructive",
        });
        setPin("");
        setLoading(false);
        return;
      }

      if (data.error) {
        toast({
          title: "Access Denied",
          description: "Invalid PIN. Please try again.",
          variant: "destructive",
        });
        setPin("");
        setLoading(false);
        return;
      }

      // Use the magic link to sign in
      if (data.session?.hashed_token) {
        const { error: signInError } = await supabase.auth.verifyOtp({
          token_hash: data.session.hashed_token,
          type: 'magiclink',
        });

        if (signInError) {
          console.error('Sign in error:', signInError);
          toast({
            title: "Error",
            description: "Failed to sign in. Please try again.",
            variant: "destructive",
          });
          setPin("");
          setLoading(false);
          return;
        }
      }

      toast({
        title: "Welcome back!",
        description: "Access granted.",
      });
      navigate("/");
    } catch (error: any) {
      console.error('Unexpected error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, hsl(var(--brand-blue-gray-dark)) 0%, hsl(var(--brand-blue-gray)) 50%, hsl(var(--brand-rose-gold) / 0.1) 100%)',
      }}
    >
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center" style={{ color: 'hsl(var(--brand-rose-gold))' }}>
            Admin Access
          </CardTitle>
          <CardDescription className="text-center">
            Enter your 4-digit PIN
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center space-y-6 py-4">
            <InputOTP
              maxLength={4}
              value={pin}
              onChange={(value) => {
                setPin(value);
                if (value.length === 4) {
                  handlePinComplete(value);
                }
              }}
              disabled={loading}
              pattern="[0-9]*"
            >
              <InputOTPGroup className="gap-3">
                <InputOTPSlot 
                  index={0} 
                  className="w-14 h-14 text-2xl border-2"
                  style={{ borderColor: 'hsl(var(--brand-rose-gold))' }}
                />
                <InputOTPSlot 
                  index={1} 
                  className="w-14 h-14 text-2xl border-2"
                  style={{ borderColor: 'hsl(var(--brand-rose-gold))' }}
                />
                <InputOTPSlot 
                  index={2} 
                  className="w-14 h-14 text-2xl border-2"
                  style={{ borderColor: 'hsl(var(--brand-rose-gold))' }}
                />
                <InputOTPSlot 
                  index={3} 
                  className="w-14 h-14 text-2xl border-2"
                  style={{ borderColor: 'hsl(var(--brand-rose-gold))' }}
                />
              </InputOTPGroup>
            </InputOTP>
            
            {loading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Verifying...</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
