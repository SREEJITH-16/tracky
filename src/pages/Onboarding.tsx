import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [currency, setCurrency] = useState('USD');
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  const progress = (step / 3) * 100;

  const handleComplete = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        await supabase.from('profiles').update({
          currency,
        }).eq('id', user.id);

        if (monthlyBudget) {
          const amount = parseFloat(monthlyBudget);
          if (!isNaN(amount)) {
            await supabase.from('budgets').insert({
              user_id: user.id,
              amount,
              period: 'monthly',
              start_date: new Date().toISOString(),
            });
          }
        }
      }

      toast({
        title: 'Welcome to Tracky!',
        description: 'Your account is set up and ready to go',
      });
      
      navigate('/');
    } catch (error) {
      toast({
        title: 'Setup failed',
        description: 'There was an error setting up your account',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to Tracky!</CardTitle>
          <CardDescription>Let's set up your account</CardDescription>
          <Progress value={progress} className="mt-4" />
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold">Track your expenses effortlessly</h3>
                <p className="text-muted-foreground">
                  Tracky helps you understand your spending and achieve your financial goals
                </p>
              </div>
              <Button onClick={() => setStep(2)} className="w-full">
                Get Started
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Preferred Currency</Label>
                <Input
                  id="currency"
                  placeholder="USD"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="w-full">
                  Back
                </Button>
                <Button onClick={() => setStep(3)} className="w-full">
                  Next
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="budget">Monthly Budget (Optional)</Label>
                <Input
                  id="budget"
                  type="number"
                  placeholder="2000"
                  value={monthlyBudget}
                  onChange={(e) => setMonthlyBudget(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)} className="w-full">
                  Back
                </Button>
                <Button onClick={handleComplete} className="w-full">
                  Complete Setup
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;
