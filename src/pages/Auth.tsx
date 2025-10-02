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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (pin.length !== 4) {
      toast({
        title: "Invalid PIN",
        description: "Please enter a 4-digit PIN.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Convert PIN to backend credentials
      const adminEmail = "admin@gym.internal";
      const adminPassword = pin;

      const { error } = await supabase.auth.signInWithPassword({
        email: adminEmail,
        password: adminPassword,
      });

      if (error) {
        toast({
          title: "Access Denied",
          description: "Invalid PIN code.",
          variant: "destructive",
        });
        setPin("");
        return;
      }

      toast({
        title: "Welcome back!",
        description: "Admin access granted.",
      });
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
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
            Admin PIN
          </CardTitle>
          <CardDescription className="text-center">
            Enter your 4-digit PIN to access admin tools
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <InputOTP
                maxLength={4}
                value={pin}
                onChange={(value) => setPin(value)}
                pattern="[0-9]*"
                inputMode="numeric"
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            
            <Button 
              type="submit" 
              className="w-full"
              disabled={loading || pin.length !== 4}
              style={{
                background: 'hsl(var(--brand-rose-gold))',
                color: 'white'
              }}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enter
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
